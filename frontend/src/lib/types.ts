export type ListingStatus = "active" | "reserved" | "sold" | "expired";
export type RequirementStatus = "active" | "fulfilled" | "expired";
export type OfferStatus = "pending" | "accepted" | "rejected" | "expired";
export type TransactionStatus =
  | "pending"
  | "confirmed"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled";
export type VehicleStatus = "available" | "assigned" | "in_transit" | "offline";

export type ProduceListing = {
  id: string;
  farmer_id: string;
  crop: string;
  variety: string | null;
  quantity_kg: number;
  remaining_quantity_kg: number;
  location: string;
  harvest_date: string;
  shelf_life_days: number;
  quality_grade: string;
  expected_price: number;
  ai_recommended_price: number | null;
  available_from: string;
  available_until: string;
  status: ListingStatus;
  created_at: string;
};

export type BuyerRequirement = {
  id: string;
  buyer_id: string;
  crop: string;
  quantity_kg: number;
  remaining_quantity_kg: number;
  max_price: number;
  quality_grade: string;
  required_by: string;
  delivery_location: string;
  status: RequirementStatus;
  created_at: string;
};

export type BestTrade = {
  listing_id: string;
  requirement_id: string;
  farmer_id: string;
  buyer_id: string;
  crop: string;
  quantity_kg: number;
  distance_km: number;
  sale_price_per_kg: number;
  transport_cost_per_kg: number;
  handling_cost_per_kg: number;
  spoilage_cost_per_kg: number;
  net_realization_per_kg: number;
  landed_cost_per_kg: number;
  freshness_score: number;
  match_score: number;
  confidence: number;
  delivery_estimate: string;
  why: string[];
  farmer_reliability_pct: number | null;
  farmer_completed_trades: number;
};

export type ProcurementPlan = {
  requirement_id: string;
  crop: string;
  requested_quantity_kg: number;
  fulfilled_quantity_kg: number;
  fully_fulfilled: boolean;
  contributions: {
    farmer_id: string;
    listing_id: string;
    crop: string;
    quantity_kg: number;
    price_per_kg: number;
    distance_km: number;
  }[];
  product_cost: number;
  transport_cost: number;
  handling_cost: number;
  expected_landed_cost: number;
};

export type Offer = {
  id: string;
  listing_id: string | null;
  requirement_id: string | null;
  farmer_id: string;
  buyer_id: string;
  crop: string;
  price_per_kg: number;
  quantity_kg: number;
  net_realization_per_kg: number;
  landed_cost_per_kg: number;
  freshness_score: number;
  confidence: number;
  status: OfferStatus;
  created_at: string;
};

export type Transaction = {
  id: string;
  offer_id: string;
  farmer_id: string;
  buyer_id: string;
  logistics_id: string | null;
  crop: string;
  quantity_kg: number;
  sale_price_per_kg: number;
  net_realization_per_kg: number;
  landed_cost_per_kg: number;
  status: TransactionStatus;
  created_at: string;
};

export type Vehicle = {
  id: string;
  logistics_id: string;
  vehicle_type: string;
  capacity_kg: number;
  current_location: string;
  lat: number;
  lng: number;
  cost_per_km: number;
  status: VehicleStatus;
};

export type RouteStatus = "planned" | "active" | "completed";

export type Route = {
  id: string;
  vehicle_id: string;
  status: RouteStatus;
  distance_km: number;
  transport_cost: number;
  estimated_savings_pct: number | null;
  stops: { label: string; lat: number; lng: number; stop_type: "pickup" | "dropoff" }[];
};

export type LogisticsLoad = {
  transaction_id: string;
  crop: string;
  quantity_kg: number;
  pickup_location: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_location: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
};

export type RouteResult = {
  id: string | null;
  stops: { label: string; lat: number; lng: number; quantity_kg: number }[];
  distance_km: number;
  duration_min: number;
  transport_cost: number;
  vehicle_utilization_pct: number;
  estimated_savings_pct: number | null;
  baseline_cost: number | null;
  notes: string[];
};

export type SupplyDemandRow = {
  crop: string;
  supply_kg: number;
  demand_kg: number;
  gap_kg: number;
  status: "SHORTAGE" | "SURPLUS" | "BALANCED";
  demand_trend_pct: number | null;
};

export type DemandForecast = {
  crop: string;
  state: string;
  date: string;
  predicted_arrivals_tonnes: number;
  is_festival: boolean;
  nearest_festival: string | null;
  days_to_nearest_festival: number;
  crop_recognized: boolean;
  note: string;
};

export type MandiPrice = {
  crop: string;
  market: string;
  state: string;
  district: string;
  price_per_kg: number;
  date: string;
  source: string;
};

export type MapPoint = {
  id: string;
  type: "farmer" | "buyer" | "logistics";
  label: string;
  lat: number;
  lng: number;
};

export type PriceRecommendation = {
  expected_price: number;
  ai_recommended_price: number;
  recommended_range_low: number;
  recommended_range_high: number;
  confidence: number;
};

export type FarmerDashboard = {
  my_produce: number;
  active_listings: number;
  buyer_offers: number;
  orders: number;
  expected_earnings: number;
  listings: { id: string; crop: string; quantity_kg: number; ai_recommended_price: number | null }[];
};

export type BuyerDashboard = {
  my_requirements: number;
  active_requirements: number;
  orders: number;
  expected_landed_cost: number;
  requirements: { id: string; crop: string; quantity_kg: number }[];
};

export type LogisticsDashboard = {
  available_vehicles: number;
  active_routes: number;
  earnings: number;
  vehicles: { id: string; vehicle_type: string; status: string }[];
};

export type AdminDashboard = {
  total_farmers: number;
  total_buyers: number;
  total_logistics_providers: number;
  active_produce: number;
  active_demand: number;
  active_transactions: number;
  total_produce_volume_kg: number;
  total_transaction_value: number;
  estimated_logistics_savings_pct: number;
  total_middleman_margin_saved: number;
};
