"""Static mandi (wholesale market) price reference snapshot.

Per idea.txt section 9: MockPriceTradeService must be grounded in real public
price data instead of fabricated numbers, so every number in the demo is
defensible.

Values below are a representative snapshot for Karnataka/Bengaluru-region
mandis (Aug-Sep 2026), sourced from Agmarknet-derived aggregators
(commodityonline.com district mandi price pages for Bangalore district).
Banana had no matching public reading at snapshot time, and the only Cabbage
figures found were a retail shortage-spike price, not a normal wholesale
band — both use a typical Karnataka wholesale range instead. These are
placeholders: before a real demo, refresh this table from
https://agmarknet.gov.in or
https://data.gov.in (search "Variety-wise Daily Market Prices") for the
actual demo date.

low/high = wholesale mandi price band (Rs/kg). avg is used as the baseline
for MockPriceTradeService recommendations.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class MandiPriceBand:
    crop: str
    market: str
    low: float
    high: float
    source: str

    @property
    def avg(self) -> float:
        return round((self.low + self.high) / 2, 2)


MANDI_PRICE_SNAPSHOT: dict[str, MandiPriceBand] = {
    "Tomato": MandiPriceBand("Tomato", "Bengaluru", 35.0, 40.0, "agmarknet_snapshot_2026_08"),
    "Onion": MandiPriceBand("Onion", "Bengaluru", 15.0, 20.0, "agmarknet_snapshot_2026_08"),
    "Potato": MandiPriceBand("Potato", "Bengaluru", 8.0, 20.0, "agmarknet_snapshot_2026_08"),
    "Banana": MandiPriceBand("Banana", "Bengaluru", 15.0, 25.0, "typical_karnataka_wholesale_range"),
    "Cabbage": MandiPriceBand("Cabbage", "Bengaluru", 10.0, 18.0, "typical_karnataka_wholesale_range"),
}


def get_price_band(crop: str) -> MandiPriceBand:
    return MANDI_PRICE_SNAPSHOT.get(
        crop, MandiPriceBand(crop, "Bengaluru", 10.0, 20.0, "fallback_default")
    )
