"""Regional market-arrival forecasting.

Unlike every other "AI" service in this app (price/freshness/logistics are
rule-based math — see idea.txt section 29), this one wraps a REAL trained
LightGBM model: 748 trees, ~638k rows of historical mandi data (2001-2021).
Training script + notes live in /demand_model at the repo root; the trained
model file is vendored into app/data/demand_model.txt.

Two honesty caveats, load-bearing for how this is presented in the UI:

1. The model predicts *arrivals_tonnes* — how much produce shows up at a
   mandi (a market-activity/supply proxy) — not a literal count of
   AgriFlow buyer orders. It's a regional market outlook, not a substitute
   for /market/supply-demand's live platform data.

2. The model's single most influential feature is recent arrival history
   (lag_1_arrivals / rolling_7_avg / rolling_30_avg), which needs a real
   government arrivals feed we don't have. Passing NaN for it was tested
   and found to collapse predictions to near-zero regardless of every
   other input (i.e. it doesn't degrade gracefully) — so instead we seed
   it from AgriFlow's own current active listing volume for that crop.
   That's real data, but it's platform-scale, not government-mandi-scale,
   so treat the absolute tonnage as directional/illustrative, not a
   precise forecast. Weather (temp/precipitation) has no source either and
   IS passed as NaN — that feature degrades gracefully on its own.

The model was also trained on a specific 8-crop vocabulary (Cotton, Maize,
Onion, Potato, Rice, Soyabean, Tomato, Wheat) that doesn't include two of
AgriFlow's five seed crops (Banana, Cabbage) — predictions for those still
run (LightGBM treats the crop as a missing category) but crop-specific
signal is unavailable, surfaced via `crop_recognized`.
"""

import os
from datetime import date

import lightgbm as lgb
import numpy as np
import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.data.festivals import nearest_festival
from app.data.mandi_prices import get_price_band
from app.models import ListingStatus, ProduceListing

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "demand_model.txt")
DEFAULT_STATE = "Karnataka"

_booster: lgb.Booster | None = None
_CATEGORICAL_COLS = ["state", "crop", "season"]


def _get_booster() -> lgb.Booster:
    global _booster
    if _booster is None:
        _booster = lgb.Booster(model_file=MODEL_PATH)
    return _booster


def _is_crop_recognized(crop: str) -> bool:
    trained_crops = _get_booster().pandas_categorical[1]
    return crop in trained_crops


def _season_for_month(month: int) -> str:
    if month in (6, 7, 8, 9, 10):
        return "Kharif"
    if month in (11, 12, 1, 2, 3):
        return "Rabi"
    return "Zaid"


def _current_active_supply_kg(db: Session, crop: str) -> float:
    return db.execute(
        select(func.coalesce(func.sum(ProduceListing.remaining_quantity_kg), 0.0)).where(
            ProduceListing.crop == crop, ProduceListing.status == ListingStatus.active
        )
    ).scalar_one()


def predict_arrivals(db: Session, crop: str, state: str = DEFAULT_STATE, target_date: date | None = None) -> dict:
    target_date = target_date or date.today()
    booster = _get_booster()

    band = get_price_band(crop)
    avg_price_quintal = band.avg * 100  # model trained on Rs/quintal; our own data is Rs/kg

    days_to_festival, festival_name = nearest_festival(target_date)
    is_festival = days_to_festival == 0

    # Real recent-supply proxy — see module docstring caveat #2.
    supply_tonnes = _current_active_supply_kg(db, crop) / 1000.0

    row = {
        "state": state,
        "crop": crop,
        "season": _season_for_month(target_date.month),
        "avg_price": avg_price_quintal,
        "is_festival": int(is_festival),
        "days_to_nearest_festival": days_to_festival,
        "year": target_date.year,
        "month": target_date.month,
        "day": target_date.day,
        "day_of_week": target_date.weekday(),
        "is_weekend": int(target_date.weekday() >= 5),
        "week_of_year": target_date.isocalendar()[1],
        "day_of_year": target_date.timetuple().tm_yday,
        "temp_max": np.nan,
        "temp_min": np.nan,
        "precipitation_mm": np.nan,
        "lag_1_arrivals": supply_tonnes,
        "rolling_7_avg": supply_tonnes,
        "rolling_30_avg": supply_tonnes,
        "lag_1_price": avg_price_quintal,
        "days_since_last_record": 1,
    }

    df = pd.DataFrame([row])
    for col in _CATEGORICAL_COLS:
        df[col] = df[col].astype("category")

    pred_log = booster.predict(df[booster.feature_name()])[0]
    predicted_tonnes = round(float(np.expm1(pred_log)), 1)

    crop_recognized = _is_crop_recognized(crop)

    return {
        "crop": crop,
        "state": state,
        "date": target_date.isoformat(),
        "predicted_arrivals_tonnes": predicted_tonnes,
        "is_festival": is_festival,
        "nearest_festival": festival_name,
        "days_to_nearest_festival": days_to_festival,
        "crop_recognized": crop_recognized,
        "note": (
            "Regional mandi arrival forecast (market-activity proxy, not a count of AgriFlow buyer orders). "
            "Seeded from this platform's current listed supply in place of a live government arrivals feed — "
            "treat the trend (festival/seasonal effect) as more reliable than the absolute number."
            if crop_recognized
            else "This crop wasn't in the model's training data, so the forecast has no crop-specific signal — "
            "treat it as low-confidence."
        ),
        "model": "lightgbm-demand-v1",
    }
