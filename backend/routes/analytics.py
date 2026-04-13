"""
Analytics Blueprint — /api/analytics aggregated from the database.
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import func, extract
from datetime import datetime, timezone, timedelta

from extensions import db
from models import Prediction, RouteQuery, CameraLog

analytics_bp = Blueprint('analytics', __name__)


def _level_to_score(level: str) -> int:
    return {'Low': 30, 'Medium': 65, 'High': 95}.get(level, 50)


@analytics_bp.route('/api/analytics', methods=['GET'])
def get_analytics():
    """
    GET /api/analytics
    Returns aggregated traffic analytics from the database.
    Falls back to synthetic data when DB has insufficient records.
    """
    now = datetime.now(timezone.utc)

    # ── Hourly breakdown: avg congestion score per hour ──────────────────────
    hourly_data = _get_hourly_stats()

    # ── Weekly breakdown: avg congestion per day of week ─────────────────────
    weekly_data = _get_weekly_stats()

    # ── Zone breakdown from camera logs + predictions ─────────────────────────
    zone_data = _get_zone_stats()

    # ── Summary counts ────────────────────────────────────────────────────────
    total_predictions = Prediction.query.count()
    total_routes      = RouteQuery.query.count()
    total_cameras     = CameraLog.query.count()

    # Congestion level distribution (last 24h)
    cutoff = now - timedelta(hours=24)
    recent = Prediction.query.filter(Prediction.timestamp >= cutoff).all()
    level_counts = {'Low': 0, 'Medium': 0, 'High': 0}
    for p in recent:
        level_counts[p.predicted_level] = level_counts.get(p.predicted_level, 0) + 1

    # Average confidence of recent predictions
    avg_confidence = (
        sum(p.confidence for p in recent) / len(recent) if recent else 0.0
    )

    return jsonify({
        'hourly':            hourly_data,
        'weekly':            weekly_data,
        'zones':             zone_data,
        'summary': {
            'total_predictions':   total_predictions,
            'total_routes':        total_routes,
            'total_camera_scans':  total_cameras,
            'last_24h_counts':     level_counts,
            'avg_confidence_pct':  round(avg_confidence * 100, 1),
        },
    })


def _get_hourly_stats():
    """Return a list of 10 hourly congestion scores (representative hours)."""
    hours = [6, 8, 10, 12, 14, 16, 18, 20, 22, 0]
    result = []

    for h in hours:
        records = Prediction.query.filter(Prediction.time_of_day == h).all()
        if records:
            avg = sum(_level_to_score(r.predicted_level) for r in records) / len(records)
            result.append(round(avg))
        else:
            # Synthetic fallback based on typical patterns
            synthetic = {6: 55, 8: 95, 10: 60, 12: 50, 14: 45, 16: 90, 18: 100, 20: 40, 22: 20, 0: 15}
            result.append(synthetic.get(h, 50))

    return result


def _get_weekly_stats():
    """Return 7-element list of avg congestion by day (Mon-Sun)."""
    result = []
    synthetic = [85, 92, 88, 96, 115, 68, 55]

    for day in range(7):
        records = Prediction.query.filter(Prediction.day_of_week == day).all()
        if records:
            avg = sum(_level_to_score(r.predicted_level) for r in records) / len(records)
            result.append(round(avg))
        else:
            result.append(synthetic[day])

    return result


def _get_zone_stats():
    """Return zone-level congestion scores."""
    zones = {
        'Downtown Core': [],
        'Harbor Bridge': [],
        'West Highway':  [],
        'Business Dist.': [],
    }

    # Pull from predictions with location_zone set
    records = Prediction.query.filter(Prediction.location_zone.isnot(None)).all()
    for r in records:
        zone = r.location_zone
        if zone in zones:
            zones[zone].append(_level_to_score(r.predicted_level))

    result = {}
    synthetic_fallback = {
        'Downtown Core': 82, 'Harbor Bridge': 55, 'West Highway': 34, 'Business Dist.': 71
    }
    for zone, scores in zones.items():
        if scores:
            result[zone] = round(sum(scores) / len(scores))
        else:
            result[zone] = synthetic_fallback[zone]

    return result


@analytics_bp.route('/api/analytics/summary', methods=['GET'])
def analytics_summary():
    """
    GET /api/analytics/summary?days=7
    Daily summary: count of predictions by congestion level per day.
    """
    days  = min(int(request.args.get('days', 7)), 30)
    now   = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    records = Prediction.query.filter(Prediction.timestamp >= start).all()

    # Group by date
    daily = {}
    for r in records:
        date_str = r.timestamp.strftime('%Y-%m-%d')
        if date_str not in daily:
            daily[date_str] = {'Low': 0, 'Medium': 0, 'High': 0, 'total': 0}
        daily[date_str][r.predicted_level] += 1
        daily[date_str]['total'] += 1

    return jsonify({
        'period_days': days,
        'daily':       daily,
        'total':       len(records),
    })
