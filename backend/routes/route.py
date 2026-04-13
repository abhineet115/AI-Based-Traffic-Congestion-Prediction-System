"""
Route Blueprint — /api/route and /api/route/history
Dijkstra-based route optimization with DB persistence.
"""
import json
import heapq
import random
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone

from extensions import db
from models import RouteQuery
from ml.predictor import predictor

route_bp = Blueprint('route', __name__)

# ── Road Network Graph ────────────────────────────────────────────────────────
NODES = {
    'A': {'name': 'Downtown Terminal',  'lat': 40.7128, 'lng': -74.0060},
    'B': {'name': 'Harbor Bridge',      'lat': 40.7168, 'lng': -74.0090},
    'C': {'name': 'West Side Highway',  'lat': 40.7190, 'lng': -74.0030},
    'D': {'name': 'Midtown Connector',  'lat': 40.7155, 'lng': -73.9970},
    'E': {'name': 'Business District',  'lat': 40.7220, 'lng': -74.0000},
    'F': {'name': 'North Gate',         'lat': 40.7240, 'lng': -74.0060},
}

# (from, to, distance_km, congestion_weight_factor)
EDGES = [
    ('A', 'B', 2.1, 1.0),
    ('A', 'D', 3.5, 1.8),
    ('B', 'C', 1.8, 0.5),
    ('B', 'D', 2.4, 1.5),
    ('C', 'E', 2.2, 0.6),
    ('C', 'F', 3.1, 0.4),
    ('D', 'E', 1.9, 1.4),
    ('E', 'F', 1.3, 0.8),
]


def build_graph(congestion_multiplier: float = 1.0) -> dict:
    graph = {n: [] for n in NODES}
    for f, t, dist, cw in EDGES:
        cost = dist + (cw * congestion_multiplier * random.uniform(0.8, 1.2))
        edge = {'to': t, 'cost': cost, 'dist': dist, 'congestion_weight': cw}
        graph[f].append(edge)
        graph[t].append({**edge, 'to': f})
    return graph


def dijkstra(graph: dict, start: str, end: str):
    dist  = {n: float('inf') for n in graph}
    prev  = {n: None for n in graph}
    dist[start] = 0
    pq = [(0.0, start)]
    visited = set()

    while pq:
        cost, node = heapq.heappop(pq)
        if node in visited:
            continue
        visited.add(node)
        if node == end:
            break
        for nb in graph[node]:
            nc = cost + nb['cost']
            if nc < dist[nb['to']]:
                dist[nb['to']] = nc
                prev[nb['to']] = node
                heapq.heappush(pq, (nc, nb['to']))

    path = []
    node = end
    while node:
        path.append(node)
        node = prev[node]
    path.reverse()
    return path, dist[end]


def compute_distance(path: list) -> float:
    """Sum of distances along a path."""
    total = 0.0
    for i in range(len(path) - 1):
        a, b = path[i], path[i + 1]
        for f, t, d, _ in EDGES:
            if (f == a and t == b) or (f == b and t == a):
                total += d
                break
    return round(total, 2)


@route_bp.route('/api/route', methods=['GET'])
def get_route():
    """
    GET /api/route?start=A&end=F
    Returns optimal and alternative routes via Dijkstra.
    """
    start = request.args.get('start', 'A').upper()
    end   = request.args.get('end', 'F').upper()

    if start not in NODES or end not in NODES:
        return jsonify({'error': f'Invalid node. Valid nodes: {list(NODES.keys())}'}), 400
    if start == end:
        return jsonify({'error': 'Start and end must be different nodes'}), 400

    # Get current congestion estimate for context
    from datetime import datetime
    now = datetime.now()
    try:
        congestion_result = predictor.predict(
            time_of_day=now.hour,
            day_of_week=now.weekday(),
            weather=0,
            road_type=1,
        )
        current_congestion = congestion_result['level']
        congestion_multiplier = {'Low': 0.6, 'Medium': 1.0, 'High': 1.8}.get(current_congestion, 1.0)
    except Exception:
        current_congestion = 'Medium'
        congestion_multiplier = 1.0

    # Compute optimal and alternative routes
    graph     = build_graph(congestion_multiplier)
    path, cost = dijkstra(graph, start, end)

    graph_alt      = build_graph(congestion_multiplier * 1.5)
    alt_path, alt_cost = dijkstra(graph_alt, start, end)

    distance      = compute_distance(path)
    alt_distance  = compute_distance(alt_path)
    time_mins     = max(5, int(cost * 4.5))
    alt_time_mins = max(5, int(alt_cost * 4.5))

    route_nodes = [{'node': n, **NODES[n]} for n in path if n in NODES]
    alt_nodes   = [{'node': n, **NODES[n]} for n in alt_path if n in NODES]

    # Persist query to DB
    record = RouteQuery(
        timestamp           = datetime.now(timezone.utc),
        start_node          = start,
        end_node            = end,
        start_name          = NODES[start]['name'],
        end_name            = NODES[end]['name'],
        path_json           = json.dumps(path),
        total_distance_km   = distance,
        estimated_time_mins = time_mins,
        total_cost_score    = round(cost, 2),
        congestion_at_query = current_congestion,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        'route':             route_nodes,
        'route_path_ids':    path,
        'total_score':       round(cost, 2),
        'estimated_time_mins': time_mins,
        'distance_km':       distance,
        'alternate':         alt_nodes,
        'alternate_path_ids': alt_path,
        'alt_distance_km':   alt_distance,
        'alt_time_mins':     alt_time_mins,
        'current_congestion': current_congestion,
        'query_id':          record.id,
        'nodes':             NODES,
        'edges': [
            {'from': e[0], 'to': e[1], 'dist': e[2], 'congestion': e[3]}
            for e in EDGES
        ],
    })


@route_bp.route('/api/route/history', methods=['GET'])
def route_history():
    """GET /api/route/history?limit=20 — recent route queries from DB."""
    limit = min(int(request.args.get('limit', 20)), 100)
    records = RouteQuery.query.order_by(RouteQuery.timestamp.desc()).limit(limit).all()
    return jsonify({
        'count':   len(records),
        'records': [r.to_dict() for r in records],
    })


@route_bp.route('/api/route/nodes', methods=['GET'])
def get_nodes():
    """GET /api/route/nodes — return the road network nodes and edges."""
    return jsonify({
        'nodes': NODES,
        'edges': [
            {'from': e[0], 'to': e[1], 'dist': e[2], 'congestion_weight': e[3]}
            for e in EDGES
        ],
    })
