"""
Alerts Blueprint — full CRUD for traffic alerts stored in DB.
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone

from extensions import db
from models import Alert

alerts_bp = Blueprint('alerts', __name__)

VALID_SEVERITIES = ('Low', 'Medium', 'High', 'Critical')
VALID_SOURCES    = ('manual', 'camera', 'ml', 'system')


@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    """
    GET /api/alerts?active=true&severity=High&limit=20
    Returns traffic alerts from the database.
    """
    active_filter   = request.args.get('active', 'true').lower()
    severity_filter = request.args.get('severity')
    limit           = min(int(request.args.get('limit', 50)), 200)

    query = Alert.query.order_by(Alert.timestamp.desc())

    if active_filter == 'true':
        query = query.filter_by(is_active=True)
    elif active_filter == 'false':
        query = query.filter_by(is_active=False)
    # 'all' → no filter

    if severity_filter and severity_filter in VALID_SEVERITIES:
        query = query.filter_by(severity=severity_filter)

    alerts = query.limit(limit).all()
    return jsonify({
        'count':  len(alerts),
        'alerts': [a.to_dict() for a in alerts],
    })


@alerts_bp.route('/api/alerts', methods=['POST'])
def create_alert():
    """
    POST /api/alerts
    Create a new traffic alert.

    Body (JSON):
    {
        "zone":     str,
        "severity": "Low" | "Medium" | "High" | "Critical",
        "message":  str,
        "source":   str (optional, default "manual")
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    zone     = str(data.get('zone', '')).strip()
    severity = str(data.get('severity', 'Medium')).strip()
    message  = str(data.get('message', '')).strip()
    source   = str(data.get('source', 'manual')).strip()

    if not zone:
        return jsonify({'error': "'zone' is required"}), 400
    if not message:
        return jsonify({'error': "'message' is required"}), 400
    if severity not in VALID_SEVERITIES:
        return jsonify({'error': f"'severity' must be one of {VALID_SEVERITIES}"}), 400
    if source not in VALID_SOURCES:
        source = 'manual'

    alert = Alert(
        timestamp = datetime.now(timezone.utc),
        zone      = zone,
        severity  = severity,
        message   = message,
        source    = source,
        is_active = True,
    )
    db.session.add(alert)
    db.session.commit()

    return jsonify({'success': True, 'alert': alert.to_dict()}), 201


@alerts_bp.route('/api/alerts/<int:alert_id>/resolve', methods=['PATCH'])
def resolve_alert(alert_id: int):
    """PATCH /api/alerts/<id>/resolve — mark an alert as resolved."""
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': f'Alert {alert_id} not found'}), 404
    if not alert.is_active:
        return jsonify({'error': 'Alert is already resolved'}), 409

    alert.resolve()
    db.session.commit()
    return jsonify({'success': True, 'alert': alert.to_dict()})


@alerts_bp.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id: int):
    """DELETE /api/alerts/<id> — permanently delete an alert."""
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': f'Alert {alert_id} not found'}), 404

    db.session.delete(alert)
    db.session.commit()
    return jsonify({'success': True, 'deleted_id': alert_id})


@alerts_bp.route('/api/alerts/stats', methods=['GET'])
def alert_stats():
    """GET /api/alerts/stats — return counts by severity and status."""
    active   = Alert.query.filter_by(is_active=True).all()
    resolved = Alert.query.filter_by(is_active=False).all()

    def count_by_severity(records):
        counts = {'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0}
        for r in records:
            counts[r.severity] = counts.get(r.severity, 0) + 1
        return counts

    return jsonify({
        'total':            Alert.query.count(),
        'active_count':     len(active),
        'resolved_count':   len(resolved),
        'active_by_severity':   count_by_severity(active),
        'resolved_by_severity': count_by_severity(resolved),
    })
