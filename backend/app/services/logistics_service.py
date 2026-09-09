"""Logistics / shared-transportation service — idea.txt sections 12-16.

Uses Google OR-Tools for vehicle routing so multiple farmer pickups can be
combined into one shared route to a buyer, instead of one truck per farmer.
"""

from dataclasses import dataclass, field

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from app.services.geo import haversine_km


@dataclass
class Stop:
    label: str
    lat: float
    lng: float
    quantity_kg: float = 0.0


@dataclass
class RouteResult:
    stops: list[Stop]
    order: list[int]
    distance_km: float
    duration_min: float
    transport_cost: float
    vehicle_utilization_pct: float
    estimated_savings_pct: float | None = None
    baseline_cost: float | None = None
    notes: list[str] = field(default_factory=list)


class LogisticsService:
    AVG_SPEED_KMPH = 35.0

    def _distance_matrix(self, stops: list[Stop]) -> list[list[float]]:
        n = len(stops)
        matrix = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = haversine_km(stops[i].lat, stops[i].lng, stops[j].lat, stops[j].lng)
        return matrix

    def optimize_route(
        self,
        pickup_locations: list[tuple[str, float, float]],
        pickup_quantities: list[float],
        vehicle_capacity: float,
        buyer_location: tuple[str, float, float],
        cost_per_km: float = 20.0,
        delivery_deadline_hours: float | None = None,
    ) -> RouteResult:
        """Single-vehicle pickup route ending at the buyer, optimized for
        total distance under a capacity constraint (OR-Tools routing solver).
        Depot = first pickup point; buyer is the final stop.
        """
        stops = [Stop(label, lat, lng, qty) for (label, lat, lng), qty in zip(pickup_locations, pickup_quantities)]
        buyer_stop = Stop(buyer_location[0], buyer_location[1], buyer_location[2], 0.0)
        all_stops = stops + [buyer_stop]
        n = len(all_stops)

        total_demand = sum(pickup_quantities)
        notes = []
        if total_demand > vehicle_capacity:
            notes.append(
                f"Total pickup quantity ({total_demand}kg) exceeds vehicle capacity "
                f"({vehicle_capacity}kg) — split across multiple vehicles in production."
            )

        if n <= 2:
            distance = haversine_km(all_stops[0].lat, all_stops[0].lng, all_stops[-1].lat, all_stops[-1].lng)
            order = list(range(n))
            return self._build_result(all_stops, order, distance, cost_per_km, vehicle_capacity, total_demand, notes)

        matrix = self._distance_matrix(all_stops)
        scaled = [[int(round(d * 1000)) for d in row] for row in matrix]

        # Open path, not a round trip: starts at the first pickup (proxy for
        # the vehicle's depot) and must END at the buyer (last node) — a
        # closed tour would double back through every stop and make shared
        # pickups look more expensive than separate trucks, defeating the
        # whole point of this feature.
        manager = pywrapcp.RoutingIndexManager(n, 1, [0], [n - 1])
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            return scaled[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        search_parameters.time_limit.FromSeconds(3)

        solution = routing.SolveWithParameters(search_parameters)

        if solution is None:
            order = list(range(n))
            distance = sum(matrix[order[i]][order[i + 1]] for i in range(n - 1))
            notes.append("OR-Tools solver found no improved solution — used input order as fallback.")
        else:
            order = []
            index = routing.Start(0)
            while not routing.IsEnd(index):
                order.append(manager.IndexToNode(index))
                index = solution.Value(routing.NextVar(index))
            order.append(manager.IndexToNode(index))
            distance = sum(matrix[order[i]][order[i + 1]] for i in range(len(order) - 1))

        return self._build_result(all_stops, order, distance, cost_per_km, vehicle_capacity, total_demand, notes)

    def _build_result(self, all_stops, order, distance_km, cost_per_km, vehicle_capacity, total_demand, notes) -> RouteResult:
        duration_min = round((distance_km / self.AVG_SPEED_KMPH) * 60, 1)
        transport_cost = round(distance_km * cost_per_km, 2)
        utilization = round(min(1.0, total_demand / vehicle_capacity) * 100, 1) if vehicle_capacity else 0.0

        baseline_cost = None
        savings_pct = None
        num_pickups = len(all_stops) - 1
        if num_pickups > 1:
            buyer = all_stops[order[-1]]
            individual_total = sum(
                haversine_km(s.lat, s.lng, buyer.lat, buyer.lng) * 2 * cost_per_km for s in all_stops[:-1]
            )
            baseline_cost = round(individual_total, 2)
            if baseline_cost > 0:
                savings_pct = round(((baseline_cost - transport_cost) / baseline_cost) * 100, 1)

        return RouteResult(
            stops=[all_stops[i] for i in order],
            order=order,
            distance_km=round(distance_km, 2),
            duration_min=duration_min,
            transport_cost=transport_cost,
            vehicle_utilization_pct=utilization,
            estimated_savings_pct=savings_pct,
            baseline_cost=baseline_cost,
            notes=notes,
        )


logistics_service = LogisticsService()
