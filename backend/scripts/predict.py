import sys
import json
import joblib
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_DIR = os.path.join(BASE_DIR, "ai")

model = joblib.load(os.path.join(AI_DIR, "performance_model.pkl"))
encoders = joblib.load(os.path.join(AI_DIR, "feature_encoders.pkl"))
target_encoder = joblib.load(os.path.join(AI_DIR, "target_encoder.pkl"))

def predict(data):
    if isinstance(data, list):
        return [predict(d) for d in data]

    row = {}
    for col in ["center_id", "technician_id", "vehicle_type", "service_type"]:
        le = encoders[col]
        # Handle unseen labels by defaulting to the first class
        val = data[col] if data[col] in le.classes_ else le.classes_[0]
        row[col + "_enc"] = le.transform([val])[0]

    row["month"] = data["month"]
    row["experience_years"] = data["experience_years"]
    row["job_count"] = data.get("job_count", data.get("totalJobs", 0))
    row["work_success_rate"] = data.get("work_success_rate", data.get("successRate", 100))
    row["customer_rating"] = data.get("customer_rating", data.get("averageRating", 4.0))
    row["expected_time_hrs"] = data.get("expected_time_hrs", 2.0)

    X = pd.DataFrame([row])
    pred_enc = model.predict(X)[0]
    pred_label = target_encoder.inverse_transform([pred_enc])[0]
    return {"technician_id": data.get("technician_id"), "predicted_performance_level": pred_label}

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    result = predict(input_data)
    print(json.dumps(result))