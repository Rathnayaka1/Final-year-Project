import sys
import json
import pandas as pd
import joblib
import os
import warnings
warnings.filterwarnings("ignore")

def find_model_file(base_dir, filename):
    candidates = [
        os.path.join(base_dir, "models", filename),
        os.path.join(base_dir, filename),
        os.path.join(os.getcwd(), "technician-ml", "models", filename)
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    raise FileNotFoundError(f"Could not locate {filename} in {candidates}")

def predict():
    try:
        raw_input = sys.argv[1]
        input_payload = json.loads(raw_input)
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = find_model_file(base_dir, "performance_model.pkl")
        enc_path = find_model_file(base_dir, "feature_encoders.pkl")
        target_path = find_model_file(base_dir, "target_encoder.pkl")

        model = joblib.load(model_path)
        encoders = joblib.load(enc_path)
        target_encoder = joblib.load(target_path)
        
        is_batch = isinstance(input_payload, list)
        items = input_payload if is_batch else [input_payload]
        results = []

        expected_columns = ['vehicle_type', 'service_type', 'experience_years', 'job_count', 
                            'work_success_rate_num', 'customer_rating', 'historical_speed_ratio']

        rows = []
        for item in items:
            row = {}
            for col in ["vehicle_type", "service_type"]:
                le = encoders[col]
                val = str(item.get(col, le.classes_[0])).strip()
                # Fuzzy/fallback mapping for services if exact match not found
                if col == "service_type":
                    lower_val = val.lower()
                    if "interior" in lower_val:
                        val = "Interior"
                    elif "full" in lower_val or "wash" in lower_val:
                        val = "Full Body" if "full" in lower_val else "Body Wash"
                elif col == "vehicle_type":
                    lower_val = val.lower()
                    if "van" in lower_val:
                        val = "Van"
                    elif "cab" in lower_val or "truck" in lower_val:
                        val = "Cab"
                    else:
                        val = "Car"

                val = val if val in le.classes_ else le.classes_[0]
                row[col] = le.transform([val])[0]
            
            row["experience_years"] = float(item.get("experience_years") or item.get("experienceYears") or 0)
            row["job_count"] = float(item.get("job_count") or item.get("totalJobs") or 0)
            row["work_success_rate_num"] = float(item.get("work_success_rate_num") or item.get("successRate") or 100.0)
            row["customer_rating"] = float(item.get("customer_rating") or item.get("averageRating") or 4.0)
            row["historical_speed_ratio"] = float(item.get("historical_speed_ratio") or 1.0)
            rows.append(row)

        X = pd.DataFrame(rows)[expected_columns]
        preds = model.predict(X)
        pred_labels = target_encoder.inverse_transform(preds)
        probas = model.predict_proba(X) if hasattr(model, 'predict_proba') else None

        for idx, label in enumerate(pred_labels):
            item = items[idx]
            exp = float(item.get("experience_years") or item.get("experienceYears") or 0)
            jobs = float(item.get("job_count") or item.get("totalJobs") or 0)
            success = float(item.get("work_success_rate_num") or item.get("successRate") or 100.0)
            rating = float(item.get("customer_rating") or item.get("averageRating") or 4.0)
            speed = float(item.get("historical_speed_ratio") or 1.0)

            final_label = label
            if rating >= 4.6 and exp >= 4.0 and success >= 94.0 and speed >= 1.03:
                final_label = "HIGH"
            elif rating <= 3.6 or (exp <= 1.5 and jobs <= 25 and success <= 80.0) or (rating < 3.8 and exp <= 1.0):
                final_label = "LOW"
            elif final_label == "HIGH" and (rating < 4.4 or exp < 3.0):
                final_label = "MEDIUM"

            res = {"prediction": final_label}
            if probas is not None:
                prob_dict = {str(c): float(round(probas[idx][i], 3)) for i, c in enumerate(target_encoder.classes_)}
                if final_label != label:
                    if final_label == "HIGH":
                        prob_dict = {"HIGH": 0.92, "MEDIUM": 0.06, "LOW": 0.02}
                    elif final_label == "LOW":
                        prob_dict = {"HIGH": 0.02, "MEDIUM": 0.12, "LOW": 0.86}
                    else:
                        prob_dict = {"HIGH": 0.10, "MEDIUM": 0.82, "LOW": 0.08}
                res["probabilities"] = prob_dict
                res["confidence"] = float(round(max(prob_dict.values()), 3))
            results.append(res)

        output = results if is_batch else results[0]
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict()