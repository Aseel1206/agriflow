
import pandas as pd
import numpy as np
import lightgbm as lgb
import matplotlib.pyplot as plt

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# ============================================================
# CONFIG
# ============================================================

DATA_FILE = "/content/training_dataset.csv"

MODEL_FILE = "price_model.txt"
PREDICTIONS_FILE = "price_predictions.csv"
FEATURE_IMPORTANCE_FILE = "price_feature_importance.png"
CROP_METRICS_FILE = "price_metrics_by_crop.csv"
STATE_METRICS_FILE = "price_metrics_by_state.csv"

RANDOM_SEED = 42


# ============================================================
# 1. LOAD DATA
# ============================================================

print("=" * 60)
print("LOADING DATA")
print("=" * 60)

df = pd.read_csv(DATA_FILE)

print(f"Loaded {len(df):,} rows")


# ============================================================
# 2. BASIC CLEANING
# ============================================================

df["date"] = pd.to_datetime(
    df["date"],
    errors="coerce"
)

df = df.dropna(
    subset=[
        "date",
        "state",
        "crop",
        "avg_price"
    ]
)

# Remove negative prices
df = df[
    df["avg_price"] >= 0
].copy()

# Sort chronologically
df = df.sort_values(
    ["date", "state", "crop"]
).reset_index(drop=True)

print(
    f"Rows after basic cleaning: "
    f"{len(df):,}"
)


# ============================================================
# 3. CHECK DUPLICATES
# ============================================================

print("\n" + "=" * 60)
print("CHECKING DUPLICATES")
print("=" * 60)

duplicates = df.duplicated(
    subset=[
        "state",
        "crop",
        "date"
    ]
).sum()

print(
    f"Duplicate state/crop/date rows: "
    f"{duplicates:,}"
)

if duplicates > 0:

    print(
        "WARNING: Multiple records exist "
        "for the same state/crop/date."
    )

    print(
        "Keeping the first record."
    )

    df = df.drop_duplicates(
        subset=[
            "state",
            "crop",
            "date"
        ],
        keep="first"
    ).reset_index(drop=True)


# ============================================================
# 4. CREATE TIME CUTOFFS BEFORE FILTERING
# ============================================================

print("\n" + "=" * 60)
print("CREATING TIME SPLITS")
print("=" * 60)

# These dates are calculated from the original data.
# They are then kept fixed throughout the pipeline.

train_split_date = df["date"].quantile(0.80)

validation_split_date = df["date"].quantile(0.90)

print(
    f"Train split date:      "
    f"{train_split_date.date()}"
)

print(
    f"Validation split date: "
    f"{validation_split_date.date()}"
)


# ============================================================
# 5. TIME-SAFE OUTLIER & UNIT ERROR FILTERING
# ============================================================

print("\n" + "=" * 60)
print("TIME-SAFE OUTLIER & UNIT ERROR FILTERING")
print("=" * 60)

initial_rows = len(df)


# ------------------------------------------------------------
# PASS 1: GLOBAL CROP MEDIAN
#
# IMPORTANT:
# The median is calculated ONLY from TRAIN data.
#
# Validation and test prices cannot influence the global
# cleaning threshold.
# ------------------------------------------------------------

train_raw = df[
    df["date"] <= train_split_date
].copy()

crop_train_medians = (
    train_raw
    .groupby("crop")["avg_price"]
    .median()
)


df["crop_train_median"] = (
    df["crop"].map(
        crop_train_medians
    )
)


# Global acceptable bounds
GLOBAL_UPPER_MULTIPLIER = 5.0
GLOBAL_LOWER_MULTIPLIER = 0.2


# If a crop has no training median, keep its rows.
valid_global_mask = (
    df["crop_train_median"].isna()
    |
    (
        (df["avg_price"]
         <=
         df["crop_train_median"]
         * GLOBAL_UPPER_MULTIPLIER)
        &
        (df["avg_price"]
         >=
         df["crop_train_median"]
         * GLOBAL_LOWER_MULTIPLIER)
    )
)


global_removed = (
    ~valid_global_mask
).sum()

df = df[
    valid_global_mask
].copy()

df = df.drop(
    columns=["crop_train_median"]
)

print(
    f"Removed {global_removed:,} "
    f"global unit mismatches."
)


# ------------------------------------------------------------
# PASS 2: LOCALIZED SPIKE DETECTION
#
# IMPORTANT:
# shift(1) means today's price is compared against only
# PREVIOUS observations.
#
# The current price does not influence its own threshold.
# ------------------------------------------------------------

df = df.sort_values(
    [
        "state",
        "crop",
        "date"
    ]
).reset_index(drop=True)


df["previous_7_median"] = (
    df.groupby(
        [
            "state",
            "crop"
        ]
    )["avg_price"]
    .transform(
        lambda x:
        x.shift(1)
        .rolling(
            window=7,
            min_periods=1
        )
        .median()
    )
)


LOCAL_UPPER_MULTIPLIER = 3.0
LOCAL_LOWER_MULTIPLIER = 0.33


# Keep the row when there is no previous history.
valid_local_mask = (
    df["previous_7_median"].isna()
    |
    (
        (df["avg_price"]
         <=
         df["previous_7_median"]
         * LOCAL_UPPER_MULTIPLIER)
        &
        (df["avg_price"]
         >=
         df["previous_7_median"]
         * LOCAL_LOWER_MULTIPLIER)
    )
)


local_removed = (
    ~valid_local_mask
).sum()

df = df[
    valid_local_mask
].copy()

df = df.drop(
    columns=["previous_7_median"]
)

df = df.reset_index(
    drop=True
)


print(
    f"Removed {local_removed:,} "
    f"localized daily spikes."
)

print(
    f"Total anomalous rows removed: "
    f"{initial_rows - len(df):,}"
)

print(
    f"Rows remaining after filtering: "
    f"{len(df):,}"
)


# ============================================================
# 6. PRICE STATISTICS AFTER CLEANING
# ============================================================

print("\n" + "=" * 60)
print("CURRENT PRICE STATISTICS")
print("=" * 60)

print(
    df["avg_price"].describe()
)


# ============================================================
# 7. CREATE TRUE NEXT-CALENDAR-DAY TARGET
# ============================================================

print("\n" + "=" * 60)
print("CREATING NEXT-DAY PRICE TARGET")
print("=" * 60)

# IMPORTANT:
# Target is created AFTER outlier filtering.
#
# Therefore, if tomorrow's price was identified as an anomaly,
# tomorrow's row has already been removed and cannot become a
# bad future_price target.

target_df = df[
    [
        "state",
        "crop",
        "date",
        "avg_price"
    ]
].copy()


# Tomorrow's date becomes today's join date.
#
# Example:
#
# 2023-01-02
#     ↓
# future price for
# 2023-01-01

target_df["join_date"] = (
    target_df["date"]
    - pd.Timedelta(days=1)
)


target_df = target_df.rename(
    columns={
        "avg_price": "future_price"
    }
)


df = df.merge(
    target_df[
        [
            "state",
            "crop",
            "join_date",
            "future_price"
        ]
    ],
    left_on=[
        "state",
        "crop",
        "date"
    ],
    right_on=[
        "state",
        "crop",
        "join_date"
    ],
    how="left"
)


df = df.drop(
    columns=["join_date"]
)


# ============================================================
# 8. REMOVE ROWS WITHOUT NEXT-DAY TARGET
# ============================================================

before_target = len(df)

df = df.dropna(
    subset=[
        "future_price"
    ]
).reset_index(
    drop=True
)

after_target = len(df)


print(
    f"Rows before target creation: "
    f"{before_target:,}"
)

print(
    f"Rows with valid next-day target: "
    f"{after_target:,}"
)

print(
    f"Rows removed: "
    f"{before_target - after_target:,}"
)


# ============================================================
# 9. TARGET PRICE STATISTICS
# ============================================================

print("\n" + "=" * 60)
print("TARGET PRICE STATISTICS")
print("=" * 60)

print("\nCurrent price:")

print(
    df["avg_price"].describe()
)

print("\nFuture price:")

print(
    df["future_price"].describe()
)


# ============================================================
# 10. EXTREME PRICE CHECK
# ============================================================

print("\n" + "=" * 60)
print("PRICE OUTLIER CHECK")
print("=" * 60)

for threshold in [
    10000,
    20000,
    50000,
    100000
]:

    current_count = (
        df["avg_price"]
        > threshold
    ).sum()

    future_count = (
        df["future_price"]
        > threshold
    ).sum()

    print(
        f"Prices above ₹{threshold:,}: "
        f"current={current_count:,} "
        f"({current_count / len(df) * 100:.3f}%), "
        f"future={future_count:,} "
        f"({future_count / len(df) * 100:.3f}%)"
    )


# ============================================================
# 11. FEATURES
# ============================================================

categorical_features = [
    "state",
    "crop",
    "season"
]


features = [

    "state",
    "crop",
    "season",

    "avg_price",
    "arrivals_tonnes",

    "is_festival",
    "days_to_nearest_festival",

    "year",
    "month",
    "day",
    "day_of_week",
    "is_weekend",
    "week_of_year",
    "day_of_year",

    "temp_max",
    "temp_min",
    "precipitation_mm",

    "lag_1_arrivals",
    "rolling_7_avg",
    "rolling_30_avg",
    "lag_1_price",

    "days_since_last_record"
]


# ============================================================
# 12. CHECK REQUIRED COLUMNS
# ============================================================

missing_features = [
    col
    for col in features
    if col not in df.columns
]


if missing_features:

    print(
        "\nERROR: Missing feature columns:"
    )

    print(
        missing_features
    )

    raise ValueError(
        "Some required feature columns are missing."
    )


# ============================================================
# 13. CONVERT CATEGORICAL FEATURES
# ============================================================

for col in categorical_features:

    df[col] = df[col].astype(
        "category"
    )


# ============================================================
# 14. FEATURE MISSING VALUE CHECK
# ============================================================

print("\n" + "=" * 60)
print("FEATURE MISSING VALUE CHECK")
print("=" * 60)


missing_counts = (
    df[features]
    .isnull()
    .sum()
)


missing_counts = (
    missing_counts[
        missing_counts > 0
    ]
    .sort_values(
        ascending=False
    )
)


if missing_counts.empty:

    print(
        "No missing feature values."
    )

else:

    print(
        missing_counts
    )


# ============================================================
# 15. PREPARE X AND Y
# ============================================================

X = df[
    features
]

y = df[
    "future_price"
]


# ============================================================
# 16. REBUILD TIME MASKS AFTER FILTERING
# ============================================================

# IMPORTANT:
# Use the SAME cutoff dates created earlier.
# Do NOT calculate new quantiles after filtering.

train_mask = (
    df["date"] <= train_split_date
)


validation_mask = (
    (df["date"] > train_split_date)
    &
    (df["date"] <= validation_split_date)
)


test_mask = (
    df["date"] > validation_split_date
)


X_train = X.loc[
    train_mask
]

X_validation = X.loc[
    validation_mask
]

X_test = X.loc[
    test_mask
]


y_train = y.loc[
    train_mask
]

y_validation = y.loc[
    validation_mask
]

y_test = y.loc[
    test_mask
]


# ============================================================
# 17. FINAL SPLIT INFORMATION
# ============================================================

print("\n" + "=" * 60)
print("FINAL DATASET SPLIT")
print("=" * 60)


print(
    f"Train rows: "
    f"{len(X_train):,}"
)

print(
    f"Validation rows: "
    f"{len(X_validation):,}"
)

print(
    f"Test rows: "
    f"{len(X_test):,}"
)


print(
    f"Train dates: "
    f"{df.loc[train_mask, 'date'].min().date()} "
    f"-> "
    f"{df.loc[train_mask, 'date'].max().date()}"
)


print(
    f"Validation dates: "
    f"{df.loc[validation_mask, 'date'].min().date()} "
    f"-> "
    f"{df.loc[validation_mask, 'date'].max().date()}"
)


print(
    f"Test dates: "
    f"{df.loc[test_mask, 'date'].min().date()} "
    f"-> "
    f"{df.loc[test_mask, 'date'].max().date()}"
)


# ============================================================
# 18. LIGHTGBM DATASETS
# ============================================================

train_data = lgb.Dataset(
    X_train,
    label=y_train,
    categorical_feature=categorical_features,
    free_raw_data=False
)


validation_data = lgb.Dataset(
    X_validation,
    label=y_validation,
    categorical_feature=categorical_features,
    reference=train_data,
    free_raw_data=False
)


# ============================================================
# 19. LIGHTGBM PARAMETERS
# ============================================================

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

    "seed": RANDOM_SEED,

    "verbosity": -1
}


# ============================================================
# 20. TRAIN MODEL
# ============================================================

print("\n" + "=" * 60)
print("TRAINING LIGHTGBM")
print("=" * 60)


model = lgb.train(

    params,

    train_data,

    num_boost_round=3000,

    valid_sets=[
        train_data,
        validation_data
    ],

    valid_names=[
        "train",
        "validation"
    ],

    callbacks=[

        lgb.early_stopping(
            stopping_rounds=50
        ),

        lgb.log_evaluation(
            period=50
        )
    ]
)


# ============================================================
# 21. FINAL TEST PREDICTIONS
# ============================================================

print("\n" + "=" * 60)
print("RUNNING FINAL TEST")
print("=" * 60)


predictions = model.predict(

    X_test,

    num_iteration=model.best_iteration
)


# ============================================================
# 22. FINAL TEST PERFORMANCE
# ============================================================

mae = mean_absolute_error(
    y_test,
    predictions
)


rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)


r2 = r2_score(
    y_test,
    predictions
)


valid_mape = (
    y_test != 0
)


if valid_mape.any():

    mape = (
        np.mean(
            np.abs(
                (
                    y_test[valid_mape]
                    -
                    predictions[valid_mape]
                )
                /
                y_test[valid_mape]
            )
        )
        * 100
    )

else:

    mape = np.nan


print("\n" + "=" * 60)
print("FINAL TEST PERFORMANCE")
print("=" * 60)


print(
    f"MAE  : ₹{mae:,.2f}"
)

print(
    f"RMSE : ₹{rmse:,.2f}"
)

print(
    f"R²   : {r2:.3f}"
)

print(
    f"MAPE : {mape:.2f}%"
)


# ============================================================
# 23. CREATE RESULTS DATAFRAME
# ============================================================

results = df.loc[
    test_mask,
    [
        "date",
        "state",
        "crop",
        "avg_price",
        "future_price"
    ]
].copy()


results["predicted_price"] = (
    predictions
)


results["error"] = (
    results["predicted_price"]
    -
    results["future_price"]
)


results["absolute_error"] = (
    results["error"].abs()
)


results["percentage_error"] = (
    results["absolute_error"]
    /
    results["future_price"].replace(
        0,
        np.nan
    )
) * 100


# ============================================================
# 24. SAMPLE PREDICTIONS
# ============================================================

print("\n" + "=" * 60)
print("SAMPLE PREDICTIONS")
print("=" * 60)


print(
    results[
        [
            "date",
            "state",
            "crop",
            "avg_price",
            "future_price",
            "predicted_price",
            "error"
        ]
    ]
    .head(20)
    .to_string(
        index=False
    )
)


# ============================================================
# 25. PERFORMANCE BY CROP
# ============================================================

print("\n" + "=" * 60)
print("PERFORMANCE BY CROP")
print("=" * 60)


crop_results = []


for crop, group in results.groupby(
    "crop",
    observed=True
):

    if len(group) == 0:
        continue


    actual = group[
        "future_price"
    ]


    pred = group[
        "predicted_price"
    ]


    crop_mae = mean_absolute_error(
        actual,
        pred
    )


    crop_rmse = np.sqrt(
        mean_squared_error(
            actual,
            pred
        )
    )


    crop_r2 = (

        r2_score(
            actual,
            pred
        )

        if len(group) > 1

        else np.nan
    )


    valid = (
        actual != 0
    )


    if valid.any():

        crop_mape = (
            np.mean(
                np.abs(
                    (
                        actual[valid]
                        -
                        pred[valid]
                    )
                    /
                    actual[valid]
                )
            )
            * 100
        )

    else:

        crop_mape = np.nan


    crop_results.append(
        {
            "crop": crop,
            "rows": len(group),
            "MAE": crop_mae,
            "RMSE": crop_rmse,
            "R2": crop_r2,
            "MAPE": crop_mape
        }
    )


crop_metrics = pd.DataFrame(
    crop_results
)


if not crop_metrics.empty:

    print(
        crop_metrics
        .sort_values(
            "MAE",
            ascending=False
        )
        .to_string(
            index=False
        )
    )


# ============================================================
# 26. PERFORMANCE BY STATE
# ============================================================

print("\n" + "=" * 60)
print("PERFORMANCE BY STATE")
print("=" * 60)


state_results = []


for state, group in results.groupby(
    "state",
    observed=True
):

    if len(group) == 0:
        continue


    actual = group[
        "future_price"
    ]


    pred = group[
        "predicted_price"
    ]


    state_mae = mean_absolute_error(
        actual,
        pred
    )


    state_rmse = np.sqrt(
        mean_squared_error(
            actual,
            pred
        )
    )


    state_r2 = (

        r2_score(
            actual,
            pred
        )

        if len(group) > 1

        else np.nan
    )


    valid = (
        actual != 0
    )


    if valid.any():

        state_mape = (
            np.mean(
                np.abs(
                    (
                        actual[valid]
                        -
                        pred[valid]
                    )
                    /
                    actual[valid]
                )
            )
            * 100
        )

    else:

        state_mape = np.nan


    state_results.append(
        {
            "state": state,
            "rows": len(group),
            "MAE": state_mae,
            "RMSE": state_rmse,
            "R2": state_r2,
            "MAPE": state_mape
        }
    )


state_metrics = pd.DataFrame(
    state_results
)


if not state_metrics.empty:

    print(
        state_metrics
        .sort_values(
            "MAE",
            ascending=False
        )
        .to_string(
            index=False
        )
    )


# ============================================================
# 27. WORST PREDICTIONS
# ============================================================

print("\n" + "=" * 60)
print("TOP 20 WORST PREDICTIONS")
print("=" * 60)


worst_predictions = (

    results
    .sort_values(
        "absolute_error",
        ascending=False
    )
    .head(20)
)


print(
    worst_predictions[
        [
            "date",
            "state",
            "crop",
            "avg_price",
            "future_price",
            "predicted_price",
            "absolute_error",
            "percentage_error"
        ]
    ]
    .to_string(
        index=False
    )
)


# ============================================================
# 28. FEATURE IMPORTANCE
# ============================================================

print("\n" + "=" * 60)
print("FEATURE IMPORTANCE")
print("=" * 60)


importance = pd.DataFrame(
    {
        "feature": features,

        "importance":
        model.feature_importance(
            importance_type="gain"
        )
    }
)


importance = (
    importance
    .sort_values(
        "importance",
        ascending=False
    )
)


print(
    importance.to_string(
        index=False
    )
)


# ============================================================
# 29. FEATURE IMPORTANCE PLOT
# ============================================================

plt.figure(
    figsize=(10, 8)
)


top_features = (
    importance.head(20)
)


plt.barh(
    top_features["feature"][::-1],
    top_features["importance"][::-1]
)


plt.xlabel(
    "Gain Importance"
)


plt.title(
    "Future Price Prediction - Feature Importance"
)


plt.tight_layout()


plt.savefig(
    FEATURE_IMPORTANCE_FILE,
    dpi=150
)


plt.close()


print(
    f"\nFeature importance plot saved to: "
    f"{FEATURE_IMPORTANCE_FILE}"
)


# ============================================================
# 30. SAVE PREDICTIONS
# ============================================================

results.to_csv(
    PREDICTIONS_FILE,
    index=False
)


print(
    f"Prediction results saved to: "
    f"{PREDICTIONS_FILE}"
)


# ============================================================
# 31. SAVE MODEL
# ============================================================

model.save_model(
    MODEL_FILE
)


print(
    f"Model saved to: "
    f"{MODEL_FILE}"
)


# ============================================================
# 32. SAVE METRICS
# ============================================================

crop_metrics.to_csv(
    CROP_METRICS_FILE,
    index=False
)


state_metrics.to_csv(
    STATE_METRICS_FILE,
    index=False
)


print(
    f"Crop metrics saved to: "
    f"{CROP_METRICS_FILE}"
)


print(
    f"State metrics saved to: "
    f"{STATE_METRICS_FILE}"
)


# ============================================================
# 33. FINAL SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)


print(
    f"Best iteration: "
    f"{model.best_iteration}"
)


print(
    f"Test MAE: "
    f"₹{mae:,.2f}"
)


print(
    f"Test RMSE: "
    f"₹{rmse:,.2f}"
)


print(
    f"Test R²: "
    f"{r2:.3f}"
)


print(
    f"Test MAPE: "
    f"{mape:.2f}%"
)


print("\nFiles created:")

print(
    "1. price_model.txt"
)

print(
    "2. price_predictions.csv"
)

print(
    "3. price_feature_importance.png"
)

print(
    "4. price_metrics_by_crop.csv"
)

print(
    "5. price_metrics_by_state.csv"
)

print("\nDone.")

