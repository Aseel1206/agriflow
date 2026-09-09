"""Rule-based shelf life defaults, per idea.txt section 5.

Not ML-derived. Kept isolated here so FreshnessService can later be swapped
for a trained model without touching callers.
"""

DEFAULT_SHELF_LIFE_DAYS: dict[str, int] = {
    "Tomato": 5,
    "Onion": 30,
    "Potato": 60,
    "Banana": 7,
    "Cabbage": 14,
}

CROPS = list(DEFAULT_SHELF_LIFE_DAYS.keys())


def get_default_shelf_life(crop: str) -> int:
    return DEFAULT_SHELF_LIFE_DAYS.get(crop, 10)
