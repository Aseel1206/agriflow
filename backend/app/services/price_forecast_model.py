"""Next-day mandi price forecasting.

The second genuinely-trained model in this app (alongside
demand_forecast_service.py): a LightGBM regressor (162 trees) trained on the
same ~638k-row historical mandi dataset, predicting *tomorrow's* average
mandi price for a crop from today's price plus calendar/festival/arrivals
features. Training script + notes live in /price_modal at the repo root;
the vendored model is app/data/price_model.txt.

This module only produces the raw next-day forecast. price_trade_service.py
is where that forecast gets blended with the platform's quality-grade
multiplier and farmer-expectation logic into the actual recommendation the
app shows — see LightGBMPriceTradeService there.

Same honesty caveats as the demand model, since the two share a feature
set and a data source:

1. Real day-over-day price history (lag_1_price) and real recent-arrivals
   history (lag_1_arrivals / rolling_7_avg / rolling_30_avg / arrivals_tonnes)
   aren't available from a live government feed here. Passing NaN for these
   was already shown (in demand_forecast_service.py) to collapse this model
   family's predictions, so instead: the arrivals-shaped features reuse
   AgriFlow's own current active-listing volume for that crop (platform-scale,
   not government-scale — directional, not precise), and lag_1_price reuses
   today's mandi average (i.e. we tell the model "no known price move
   yesterday" rather than fabricate a trend).
2. Trained on the same 8-crop vocabulary as the demand model (Cotton, Maize,
   Onion, Potato, Rice, Soyabean, Tomato, Wheat) — Banana and Cabbage aren't
   in it. Predictions for those crops still run but carry no crop-specific
   signal, surfaced via `crop_recognized`.
3. Price/quantity units in the trained model are Rs/quintal; AgriFlow stores
   Rs/kg, so every value crossing this boundary is multiplied/divided by 100.
"""

import os
from datetime import date

import lightgbm as lgb
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.data.festivals import nearest_festival
from app.data.mandi_prices import get_price_band
from app.services.demand_forecast_service import _current_active_supply_kg, _season_for_month

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "price_model.txt")
DEFAULT_STATE = "Karnataka"

_booster: lgb.Booster | None = None
_CATEGORICAL_COLS = ["state", "crop", "season"]


def _get_booster() -> lgb.Booster:
    global _booster
    if _booster is None:
        _booster = lgb.Booster(model_file=MODEL_PATH)
    return _booster


def is_crop_recognized(crop: str) -> bool:
    trained_crops = _get_booster().pandas_categorical[1]
    return crop in trained_crops


def predict_next_day_price(db: Session, crop: str, state: str = DEFAULT_STATE, target_date: date | None = None) -> dict:
    """Forecast tomorrow's mandi average price (Rs/kg) for `crop`."""
    target_date = target_date or date.today()
    booster = _get_booster()

    band = get_price_band(crop)
    current_avg_quintal = band.avg * 100  # model trained on Rs/quintal; our own data is Rs/kg

    days_to_festival, festival_name = nearest_festival(target_date)
    is_festival = days_to_festival == 0

    # Real recent-supply proxy — see module docstring caveat #1.
    supply_tonnes = _current_active_supply_kg(db, crop) / 1000.0

    row = {
        "state": state,
        "crop": crop,
        "season": _season_for_month(target_date.month),
        "avg_price": current_avg_quintal,
        "arrivals_tonnes": supply_tonnes,
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
        "lag_1_price": current_avg_quintal,
        "days_since_last_record": 1,
    }

    df = pd.DataFrame([row])
    for col in _CATEGORICAL_COLS:
        df[col] = df[col].astype("category")

    predicted_quintal = round(float(booster.predict(df[booster.feature_name()])[0]), 2)
    crop_recognized = is_crop_recognized(crop)

    return {
        "crop": crop,
        "state": state,
        "date": target_date.isoformat(),
        "current_avg_price_per_kg": round(current_avg_quintal / 100, 2),
        "predicted_price_per_kg": round(predicted_quintal / 100, 2),
        "is_festival": is_festival,
        "nearest_festival": festival_name,
        "days_to_nearest_festival": days_to_festival,
        "crop_recognized": crop_recognized,
        "model": "lightgbm-price-v1",
    }
