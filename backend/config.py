"""
Application configuration classes for the Traffic Congestion System.
"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# ── External API Keys ──────────────────────────────────────────────────────
# Sign up free at https://home.openweathermap.org/users/sign_in
OWM_API_KEY = os.environ.get('OWM_API_KEY', 'aca29a7b152933ccaaf50d7f8d4f2092')

# Sign up free at https://developer.tomtom.com/user/register
TOMTOM_API_KEY = os.environ.get('TOMTOM_API_KEY', 'gQ0weCRElrlmukZ0Hh1YGgiStSMUILhE')

# Default city fallback (used when browser geolocation is unavailable)
# Coordinates: Mumbai, India
DEFAULT_LAT = 19.0760
DEFAULT_LON = 72.8777
DEFAULT_CITY = 'Mumbai, IN'

# Cache TTL in seconds (60s for weather, 30s for traffic)
WEATHER_CACHE_TTL = 60
TRAFFIC_CACHE_TTL = 30


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'traffic-system-dev-secret-2026')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ML_MODEL_PATH = os.path.join(BASE_DIR, 'model.pkl')
    ML_METADATA_PATH = os.path.join(BASE_DIR, 'model_metadata.json')
    JSON_SORT_KEYS = False


class DevelopmentConfig(Config):
    """Development configuration — SQLite file-based database."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'traffic.db')}"
    SQLALCHEMY_ECHO = False  # Set True to see SQL queries in console


class ProductionConfig(Config):
    """Production configuration — swap SQLALCHEMY_DATABASE_URI for PostgreSQL."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(BASE_DIR, 'traffic_prod.db')}"
    )


# Active config
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}

