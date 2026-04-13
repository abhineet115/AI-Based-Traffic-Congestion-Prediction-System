"""
Camera Blueprint — /api/analyze-camera with DB persistence and history.
"""
import json
import random
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone

from extensions import db
from models import CameraLog

camera_bp = Blueprint('camera', __name__)


def _determine_congestion(hour: int) -> tuple:
    """Determine congestion level, vehicle count, and detail based on time."""
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        level  = 'High'
        count  = random.randint(18, 35)
        detail = (
            'Rush hour detected. Dense vehicle clustering observed. '
            f'Estimated {count} vehicles in frame. Average speed ~15 km/h. '
            'Stop-and-go traffic pattern identified.'
        )
    elif 22 <= hour or hour <= 5:
        level  = 'Low'
        count  = random.randint(1, 6)
        detail = (
            f'Low vehicle density. {count} vehicles detected. '
            'Roads are clear. Average speed ~65 km/h. No congestion detected.'
        )
    elif 10 <= hour <= 15:
        level  = 'Medium'
        count  = random.randint(8, 17)
        detail = (
            f'Moderate traffic flow. {count} vehicles detected. '
            'Intermittent slow zones. Average speed ~35 km/h.'
        )
    else:
        level  = 'Medium'
        count  = random.randint(7, 18)
        detail = (
            f'Transitional traffic period. {count} vehicles detected. '
            'Variable flow conditions.'
        )
    return level, count, detail


def _build_recommendations(level: str, count: int) -> list:
    recs = []
    if level == 'High':
        recs.append('Consider using alternate routes to avoid detected congestion hotspot.')
        recs.append(f'Expected clearance in approximately {random.randint(15, 35)} minutes.')
        recs.append('Public transit recommended during peak congestion.')
    elif level == 'Medium':
        recs.append('Moderate traffic — allow extra travel time.')
        recs.append(f'Estimated delay: {random.randint(5, 15)} minutes above normal.')
    else:
        recs.append('Roads clear — optimal travel conditions.')
        recs.append('No delays expected on monitored routes.')
    return recs


@camera_bp.route('/api/analyze-camera', methods=['POST'])
def analyze_camera():
    """
    POST /api/analyze-camera
    Simulate AI analysis of a camera frame.
    Saves result to camera_logs table.

    Optional body (JSON): { "hour": int }  — defaults to current hour.
    """
    data = request.get_json(silent=True) or {}
    hour = int(data.get('hour', datetime.now().hour))
    hour = max(0, min(23, hour))

    level, count, detail  = _determine_congestion(hour)
    confidence            = round(random.uniform(0.87, 0.98), 4)
    recommendations       = _build_recommendations(level, count)

    # Persist to DB
    log = CameraLog(
        timestamp            = datetime.now(timezone.utc),
        congestion_level     = level,
        vehicle_count        = count,
        confidence           = confidence,
        detail               = detail,
        recommendations_json = json.dumps(recommendations),
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'congestion_level': level,
        'vehicle_count':    count,
        'detail':           detail,
        'confidence':       confidence,
        'recommendations':  recommendations,
        'log_id':           log.id,
        'timestamp':        log.timestamp.isoformat(),
    })


@camera_bp.route('/api/camera/history', methods=['GET'])
def camera_history():
    """GET /api/camera/history?limit=10 — recent camera analysis logs from DB."""
    limit = min(int(request.args.get('limit', 10)), 100)
    logs  = CameraLog.query.order_by(CameraLog.timestamp.desc()).limit(limit).all()
    return jsonify({
        'count':   len(logs),
        'records': [log.to_dict() for log in logs],
    })


@camera_bp.route('/api/camera/stats', methods=['GET'])
def camera_stats():
    """GET /api/camera/stats — aggregate camera analysis statistics."""
    all_logs = CameraLog.query.all()
    if not all_logs:
        return jsonify({
            'total_scans':      0,
            'level_breakdown':  {'Low': 0, 'Medium': 0, 'High': 0},
            'avg_vehicle_count': 0,
            'avg_confidence':   0,
        })

    level_counts = {'Low': 0, 'Medium': 0, 'High': 0}
    for log in all_logs:
        level_counts[log.congestion_level] = level_counts.get(log.congestion_level, 0) + 1

    return jsonify({
        'total_scans':       len(all_logs),
        'level_breakdown':   level_counts,
        'avg_vehicle_count': round(sum(l.vehicle_count for l in all_logs) / len(all_logs), 1),
        'avg_confidence':    round(sum(l.confidence for l in all_logs) / len(all_logs), 4),
    })
