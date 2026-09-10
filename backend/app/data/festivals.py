"""Approximate major-festival calendar — used only to compute the demand
forecast model's is_festival / days_to_nearest_festival input features.

Lunar/lunisolar festival dates shift every year and these are approximate
for 2026; verify against an official calendar before a live demo (same
caveat as mandi_prices.py's price snapshot — this is a labeled placeholder,
not an authoritative source).
"""

from datetime import date

FESTIVALS_2026: list[tuple[date, str]] = [
    (date(2026, 1, 14), "Makar Sankranti / Pongal"),
    (date(2026, 3, 3), "Holi"),
    (date(2026, 3, 19), "Ugadi / Gudi Padwa"),
    (date(2026, 3, 20), "Eid al-Fitr"),
    (date(2026, 8, 26), "Onam"),
    (date(2026, 9, 14), "Ganesh Chaturthi"),
    (date(2026, 10, 20), "Dussehra"),
    (date(2026, 11, 8), "Diwali"),
]

MAX_RELEVANT_DAYS = 60


def nearest_festival(target: date) -> tuple[int, str | None]:
    """Days to the nearest listed festival, and its name. Returns
    (MAX_RELEVANT_DAYS, None) if nothing is within that window — treated as
    "no festival nearby" for the model's purposes."""
    closest_days, closest_name = MAX_RELEVANT_DAYS, None
    for festival_date, name in FESTIVALS_2026:
        days = abs((festival_date - target).days)
        if days < closest_days:
            closest_days, closest_name = days, name
    return closest_days, closest_name
