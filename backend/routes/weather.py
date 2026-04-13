"""
Weather Blueprint — /api/weather (simulation-based, unchanged from original).
"""
import random
from flask import Blueprint, jsonify

weather_bp = Blueprint('weather', __name__)

WEATHER_CONDITIONS = [
    {'code': 'clear',      'label': 'Clear Sky',     'icon': '☀️',  'temp': 24, 'humidity': 45, 'wind': 12, 'traffic_impact': 'Low',    'weather_code': 0},
    {'code': 'cloudy',     'label': 'Mostly Cloudy', 'icon': '⛅',  'temp': 20, 'humidity': 62, 'wind': 18, 'traffic_impact': 'Low',    'weather_code': 1},
    {'code': 'rain',       'label': 'Light Rain',    'icon': '🌧️', 'temp': 17, 'humidity': 84, 'wind': 22, 'traffic_impact': 'Medium', 'weather_code': 2},
    {'code': 'heavy_rain', 'label': 'Heavy Rain',    'icon': '⛈️', 'temp': 14, 'humidity': 95, 'wind': 35, 'traffic_impact': 'High',   'weather_code': 3},
    {'code': 'fog',        'label': 'Dense Fog',     'icon': '🌫️', 'temp': 12, 'humidity': 98, 'wind': 5,  'traffic_impact': 'High',   'weather_code': 4},
    {'code': 'snow',       'label': 'Light Snow',    'icon': '🌨️', 'temp': 1,  'humidity': 90, 'wind': 15, 'traffic_impact': 'High',   'weather_code': 5},
]


@weather_bp.route('/api/weather', methods=['GET'])
def get_weather():
    """GET /api/weather — returns simulated current conditions + forecast."""
    condition = random.choice(WEATHER_CONDITIONS)
    hourly = []
    for i in range(24):
        hourly.append({
            'hour':         f'{i:02d}:00',
            'temp':         condition['temp'] + random.randint(-3, 3),
            'precip_prob':  (
                random.randint(30, 100)
                if condition['code'] in ('rain', 'heavy_rain', 'snow')
                else random.randint(0, 20)
            ),
        })

    return jsonify({
        'current':      condition,
        'location':     'New York, NY',
        'last_updated': '2026-04-06T00:00:00Z',
        'forecast': [
            {**random.choice(WEATHER_CONDITIONS), 'day': d}
            for d in ['Tomorrow', 'Wed', 'Thu', 'Fri']
        ],
        'hourly': hourly[:8],
    })
