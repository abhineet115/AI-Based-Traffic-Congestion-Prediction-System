"""
Predict Blueprint — /api/predict and /api/predictions/history
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone

from extensions import db
from models import Prediction
from ml.predictor import predictor

predict_bp = Blueprint('predict', __name__)


@predict_bp.route('/api/predict', methods=['POST'])
def predict():
    """
    Run ML congestion prediction.

    Request body (JSON):
    {
        "time_of_day":  int  (0-23),
        "day_of_week":  int  (0=Mon - 6=Sun),
        "weather":      int  (0=Clear, 1=Cloudy, 2=Rain, 3=Heavy Rain, 4=Fog, 5=Snow),
        "road_type":    int  (0=Local, 1=Highway, 2=Arterial),
        "location_zone": str  (optional)
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # Validate required fields
    required = ['time_of_day', 'day_of_week', 'weather', 'road_type']
    for field in required:
        if field not in data:
            return jsonify({'error': f"Missing required field: '{field}'"}), 400

    try:
        time_of_day = int(data['time_of_day'])
        day_of_week = int(data['day_of_week'])
        weather     = int(data['weather'])
        road_type   = int(data['road_type'])
        zone        = str(data.get('location_zone', '')).strip() or None
    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid input type: {e}'}), 400

    # Bounds check
    if not (0 <= time_of_day <= 23):
        return jsonify({'error': 'time_of_day must be 0-23'}), 400
    if not (0 <= day_of_week <= 6):
        return jsonify({'error': 'day_of_week must be 0-6'}), 400
    if not (0 <= weather <= 5):
        return jsonify({'error': 'weather must be 0-5'}), 400
    if not (0 <= road_type <= 2):
        return jsonify({'error': 'road_type must be 0-2'}), 400

    # Run inference
    try:
        result = predictor.predict(time_of_day, day_of_week, weather, road_type)
    except FileNotFoundError:
        result = predictor.fallback_predict(time_of_day, weather)
        result['model_used'] = 'fallback'
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

    # Persist to database
    probs = result['probabilities']
    record = Prediction(
        timestamp        = datetime.now(timezone.utc),
        time_of_day      = time_of_day,
        day_of_week      = day_of_week,
        weather          = weather,
        road_type        = road_type,
        location_zone    = zone,
        predicted_level  = result['level'],
        confidence       = result['confidence'],
        prob_low         = probs.get('Low', 0.0),
        prob_medium      = probs.get('Medium', 0.0),
        prob_high        = probs.get('High', 0.0),
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        'congestion_level': result['level'],
        'confidence':       result['confidence'],
        'probabilities':    result['probabilities'],
        'prediction_id':    record.id,
        'model_used':       result.get('model_used', 'gradient_boosting'),
    })


@predict_bp.route('/api/predictions/history', methods=['GET'])
def prediction_history():
    """
    GET /api/predictions/history?limit=50&level=High
    Returns recent prediction records from the database.
    """
    limit = min(int(request.args.get('limit', 50)), 200)
    level = request.args.get('level')  # optional filter

    query = Prediction.query.order_by(Prediction.timestamp.desc())
    if level and level in ('Low', 'Medium', 'High'):
        query = query.filter_by(predicted_level=level)

    records = query.limit(limit).all()
    return jsonify({
        'count':   len(records),
        'records': [r.to_dict() for r in records],
    })


@predict_bp.route('/api/model/info', methods=['GET'])
def model_info():
    """GET /api/model/info — returns model metadata."""
    try:
        meta = predictor.metadata
        return jsonify(meta)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
