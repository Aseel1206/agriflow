// Matches backend/app/seed.py VILLAGES + buyer hub, so demo data and new
// records drawn from this list land in the same Bengaluru-region bounding
// box the seed script and mandi price snapshot assume.

export type Location = { name: string; lat: number; lng: number };

export const LOCATIONS: Location[] = [
  { name: "Ramanagara", lat: 12.7217, lng: 77.2811 },
  { name: "Channapatna", lat: 12.6514, lng: 77.2064 },
  { name: "Magadi", lat: 12.9668, lng: 77.2261 },
  { name: "Kanakapura", lat: 12.5459, lng: 77.4189 },
  { name: "Devanahalli", lat: 13.2464, lng: 77.7154 },
  { name: "Doddaballapura", lat: 13.2947, lng: 77.5386 },
  { name: "Hoskote", lat: 13.0708, lng: 77.7975 },
  { name: "Nelamangala", lat: 13.1003, lng: 77.3953 },
  { name: "Anekal", lat: 12.7106, lng: 77.6955 },
  { name: "Bidadi", lat: 12.7967, lng: 77.3894 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
];

export function findLocation(name: string): Location | undefined {
  return LOCATIONS.find((l) => l.name === name);
}

export const CROPS = ["Tomato", "Onion", "Potato", "Banana", "Cabbage"];

export const QUALITY_GRADES = ["Grade A", "Grade B", "Grade C"];
