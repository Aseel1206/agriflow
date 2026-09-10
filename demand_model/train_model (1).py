"""
Train a LightGBM model to predict crop demand (arrivals_tonnes) from
historical mandi data + weather + festival/season features.

Run in your venv:
    pip install lightgbm scikit-learn pandas numpy matplotlib
    python train_model.py

Input:  training_dataset.csv (crop, state, date, arrivals_tonnes, avg_price,
        is_festival, days_to_nearest_festival, date features, weather)
Output: demand_model.txt (trained LightGBM model)
        feature_importance.png
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt

# ---------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------
df = pd.read_csv("training_dataset_v2.csv", parse_dates=["date"])
print(f"Loaded {len(df):,} rows")

# ---------------------------------------------------------------
# 2. Clean outliers in the target
#    A few rows have extreme arrivals (data entry errors / national
#    aggregation glitches). Cap at the 99.5th percentile per crop so
#    the model isn't dominated by a handful of bad rows.
# ---------------------------------------------------------------
crop_caps = df.groupby("crop")["arrivals_tonnes"].transform(lambda s: s.quantile(0.995))
df["arrivals_tonnes"] = df["arrivals_tonnes"].clip(upper=crop_caps)

# Log-transform the target: arrivals are heavily right-skewed
# (a few huge market days vs many small ones). Training on log-space
# makes LightGBM's squared-error objective behave much better; we
# exp() the predictions back at evaluation/inference time.
df["log_arrivals"] = np.log1p(df["arrivals_tonnes"])

# ---------------------------------------------------------------
# 3. Encode categorical features
#    LightGBM handles categoricals natively if we mark the dtype.
# ---------------------------------------------------------------
categorical_cols = ["state", "crop", "season"]
for col in categorical_cols:
    df[col] = df[col].astype("category")

feature_cols = [
    "state", "crop", "season",
    "avg_price",
    "is_festival", "days_to_nearest_festival",
    "year", "month", "day", "day_of_week", "is_weekend",
    "week_of_year", "day_of_year",
    "temp_max", "temp_min", "precipitation_mm",
    "lag_1_arrivals", "rolling_7_avg", "rolling_30_avg",
    "lag_1_price", "days_since_last_record",
]
target_col = "log_arrivals"

X = df[feature_cols]
y = df[target_col]

# ---------------------------------------------------------------
# 4. Train/test split
#    Time-aware split: train on the earliest ~90% of dates, test on
#    the most recent ~10%. This is more realistic than a random split
#    for a forecasting model (you're always predicting the future),
#    and more robust than a calendar-year cutoff when the last year
#    in the data is only partially covered.
# ---------------------------------------------------------------
cutoff_date = df["date"].quantile(0.9)
train_mask = df["date"] < cutoff_date
test_mask = df["date"] >= cutoff_date

X_train, y_train = X[train_mask], y[train_mask]
X_test, y_test = X[test_mask], y[test_mask]

print(f"Train rows: {len(X_train):,} (dates < {cutoff_date.date()})")
print(f"Test rows:  {len(X_test):,} (dates >= {cutoff_date.date()})")

# ---------------------------------------------------------------
# 5. Train LightGBM
#    CPU training on this dataset size (~880K rows, 16 features)
#    will take well under a minute on your i5-13450HX. No GPU needed.
# ---------------------------------------------------------------
train_data = lgb.Dataset(X_train, label=y_train, categorical_feature=categorical_cols)
val_data = lgb.Dataset(X_test, label=y_test, categorical_feature=categorical_cols, reference=train_data)

params = {
    "objective": "regression",
    "metric": "mae",
    "boosting_type": "gbdt",
    "num_leaves": 63,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "min_data_in_leaf": 20,
    "verbose": -1,
}

model = lgb.train(
    params,
    train_data,
    num_boost_round=3000,
    valid_sets=[train_data, val_data],
    valid_names=["train", "valid"],
    callbacks=[
        lgb.early_stopping(stopping_rounds=50),
        lgb.log_evaluation(period=50),
    ],
)

# ---------------------------------------------------------------
# 6. Evaluate (back in real tonnes, not log space)
# ---------------------------------------------------------------
pred_log = model.predict(X_test, num_iteration=model.best_iteration)
pred_tonnes = np.expm1(pred_log)
actual_tonnes = np.expm1(y_test)

mae = mean_absolute_error(actual_tonnes, pred_tonnes)
rmse = np.sqrt(mean_squared_error(actual_tonnes, pred_tonnes))
r2 = r2_score(actual_tonnes, pred_tonnes)

print("\n--- Test set performance (real tonnes) ---")
print(f"MAE:  {mae:,.1f} tonnes")
print(f"RMSE: {rmse:,.1f} tonnes")
print(f"R^2:  {r2:.3f}")

# ---------------------------------------------------------------
# 7. Save model + feature importance plot
# ---------------------------------------------------------------
model.save_model("demand_model.txt")
print("\nModel saved to demand_model.txt")

importance = pd.DataFrame({
    "feature": feature_cols,
    "importance": model.feature_importance(importance_type="gain"),
}).sort_values("importance", ascending=True)

plt.figure(figsize=(8, 6))
plt.barh(importance["feature"], importance["importance"])
plt.xlabel("Importance (gain)")
plt.title("LightGBM Feature Importance - Crop Demand Forecasting")
plt.tight_layout()
plt.savefig("feature_importance.png", dpi=150)
print("Feature importance plot saved to feature_importance.png")

# ---------------------------------------------------------------
# 8. Example: predict demand for a single scenario
# ---------------------------------------------------------------
example = pd.DataFrame([{
    "state": "Maharashtra",
    "crop": "Onion",
    "season": "Kharif",
    "avg_price": 1500,
    "is_festival": 1,
    "days_to_nearest_festival": 0,
    "year": 2024,
    "month": 10,
    "day": 31,
    "day_of_week": 3,
    "is_weekend": 0,
    "week_of_year": 44,
    "day_of_year": 305,
    "temp_max": 32.0,
    "temp_min": 22.0,
    "precipitation_mm": 2.0,
    # In real inference, pull these from your latest known records for
    # this crop-state (e.g. from your live/most recent mandi data feed).
    "lag_1_arrivals": 1800,
    "rolling_7_avg": 1750,
    "rolling_30_avg": 1600,
    "lag_1_price": 1450,
    "days_since_last_record": 1,
}])
for col in categorical_cols:
    example[col] = example[col].astype("category")

pred = np.expm1(model.predict(example[feature_cols])[0])
print(f"\nExample prediction (Onion, Maharashtra, Diwali): {pred:,.0f} tonnes")
