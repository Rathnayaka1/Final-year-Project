# 🛠️ Technician Performance ML Engine

AI-powered Technician Performance Prediction and Resource Allocation module for Smart Service Center management.

## 📁 Directory Structure
```text
technician-ml/
  ├── data/
  │   └── prepared_technician_dataset.csv     # Historical technician training dataset (2,882 job records)
  ├── models/
  │   ├── performance_model.pkl               # Random Forest Classifier (100 Trees, 96% accuracy)
  │   ├── feature_encoders.pkl                # Categorical label encoders for vehicle_type & service_type
  │   └── target_encoder.pkl                 # Target label encoder (HIGH, MEDIUM, LOW)
  ├── notebooks/
  │   └── Employee_Performance.ipynb         # Model exploratory data analysis & training notebook
  ├── predict.py                              # Subprocess prediction runner
  ├── requirements.txt                        # Python dependencies
  └── README.md
```

## 🧠 Key Features & Inputs
The model evaluates seven continuous and categorical dimensions:
1. `vehicle_type` — Vehicle category (Car, Van, Cab)
2. `service_type` — Maintenance category (Interior, Full Body, Body Wash)
3. `experience_years` — Years of automotive mechanic experience
4. `job_count` — Total historical completed service appointments
5. `work_success_rate_num` — Service success & zero-rework percentage (0–100%)
6. `customer_rating` — Running average of 1–5 customer satisfaction ratings
7. `historical_speed_ratio` — Cumulative ratio of estimated service duration vs. actual duration taken

## 🚀 Execution
```bash
python predict.py '[{"vehicle_type":"Car","service_type":"Interior","experience_years":5,"job_count":50,"work_success_rate_num":98,"customer_rating":4.8,"historical_speed_ratio":1.1}]'
```
