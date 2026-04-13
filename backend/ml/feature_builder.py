"""
Feature engineering utilities shared by the trainer and predictor.

Raw API inputs → enriched feature vector used by the ML model.
"""
import math
import numpy as np


# Feature column order (must match training order)
FEATURE_COLUMNS = [
    'time_of_day',
    'hour_sin',
    'hour_cos',
    'day_of_week',
    'is_weekend',
    'is_rush_hour',
    'is_late_night',
    'weather',
    'weather_severity',
    'road_type',
    'road_capacity',
    'weather_rush_interaction',
]


def build_features(time_of_day: int, day_of_week: int, weather: int, road_type: int) -> np.ndarray:
    """
    Build the enriched feature vector from raw inputs.

    Parameters
    ----------
    time_of_day  : 0–23 (hour of day)
    day_of_week  : 0=Monday … 6=Sunday
    weather      : 0=Clear, 1=Cloudy, 2=Rain, 3=Heavy Rain, 4=Fog, 5=Snow
    road_type    : 0=Local, 1=Highway, 2=Arterial

    Returns
    -------
    np.ndarray of shape (1, n_features)
    """
    # ── Cyclic hour encoding (captures 23→0 hour continuity) ──
    hour_sin = math.sin(2 * math.pi * time_of_day / 24)
    hour_cos = math.cos(2 * math.pi * time_of_day / 24)

    # ── Time-based flags ──
    is_weekend    = 1 if day_of_week >= 5 else 0
    is_rush_hour  = 1 if (7 <= time_of_day <= 9 or 16 <= time_of_day <= 19) else 0
    is_late_night = 1 if (time_of_day >= 22 or time_of_day <= 5) else 0

    # ── Weather severity (ordinal: more severe = higher number) ──
    weather_severity_map = {0: 0, 1: 1, 2: 3, 3: 5, 4: 4, 5: 5}
    weather_severity = weather_severity_map.get(weather, 0)

    # ── Road capacity (higher = more capacity → lower congestion) ──
    road_capacity_map = {0: 1, 1: 3, 2: 2}
    road_capacity = road_capacity_map.get(road_type, 1)

    # ── Interaction feature: bad weather × rush hour ──
    weather_rush_interaction = weather_severity * is_rush_hour

    features = np.array([[
        time_of_day,
        hour_sin,
        hour_cos,
        day_of_week,
        is_weekend,
        is_rush_hour,
        is_late_night,
        weather,
        weather_severity,
        road_type,
        road_capacity,
        weather_rush_interaction,
    ]])

    return features


def build_features_batch(df):
    """
    Build the full feature matrix from a pandas DataFrame.
    Columns required: time_of_day, day_of_week, weather, road_type
    Returns a new DataFrame with all engineered features.
    """
    import pandas as pd

    df = df.copy()
    df['hour_sin'] = df['time_of_day'].apply(lambda h: math.sin(2 * math.pi * h / 24))
    df['hour_cos'] = df['time_of_day'].apply(lambda h: math.cos(2 * math.pi * h / 24))
    df['is_weekend']    = (df['day_of_week'] >= 5).astype(int)
    df['is_rush_hour']  = df['time_of_day'].apply(
        lambda h: 1 if (7 <= h <= 9 or 16 <= h <= 19) else 0
    )
    df['is_late_night'] = df['time_of_day'].apply(
        lambda h: 1 if (h >= 22 or h <= 5) else 0
    )

    weather_severity_map = {0: 0, 1: 1, 2: 3, 3: 5, 4: 4, 5: 5}
    df['weather_severity'] = df['weather'].map(weather_severity_map).fillna(0).astype(int)

    road_capacity_map = {0: 1, 1: 3, 2: 2}
    df['road_capacity'] = df['road_type'].map(road_capacity_map).fillna(1).astype(int)

    df['weather_rush_interaction'] = df['weather_severity'] * df['is_rush_hour']

    return df[FEATURE_COLUMNS]
