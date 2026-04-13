"""
Prediction model — stores every ML congestion prediction request and result.
"""
from datetime import datetime, timezone
from extensions import db


WEATHER_MAP = {0: 'Clear', 1: 'Cloudy', 2: 'Rain', 3: 'Heavy Rain', 4: 'Fog', 5: 'Snow'}
ROAD_MAP    = {0: 'Local', 1: 'Highway', 2: 'Arterial'}


class Prediction(db.Model):
    __tablename__ = 'predictions'

    id               = db.Column(db.Integer, primary_key=True)
    timestamp        = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Input features
    time_of_day      = db.Column(db.Integer, nullable=False)   # 0-23
    day_of_week      = db.Column(db.Integer, nullable=False)   # 0=Mon, 6=Sun
    weather          = db.Column(db.Integer, nullable=False)   # 0-5 encoded
    road_type        = db.Column(db.Integer, nullable=False)   # 0-2 encoded
    location_zone    = db.Column(db.String(100), nullable=True)

    # Output
    predicted_level  = db.Column(db.String(10), nullable=False)  # Low/Medium/High
    confidence       = db.Column(db.Float, nullable=False, default=0.0)
    prob_low         = db.Column(db.Float, nullable=True)
    prob_medium      = db.Column(db.Float, nullable=True)
    prob_high        = db.Column(db.Float, nullable=True)

    def to_dict(self):
        return {
            'id':              self.id,
            'timestamp':       self.timestamp.isoformat(),
            'time_of_day':     self.time_of_day,
            'day_of_week':     self.day_of_week,
            'weather':         self.weather,
            'weather_label':   WEATHER_MAP.get(self.weather, 'Unknown'),
            'road_type':       self.road_type,
            'road_label':      ROAD_MAP.get(self.road_type, 'Unknown'),
            'location_zone':   self.location_zone,
            'predicted_level': self.predicted_level,
            'confidence':      round(self.confidence, 4),
            'probabilities': {
                'Low':    round(self.prob_low   or 0, 4),
                'Medium': round(self.prob_medium or 0, 4),
                'High':   round(self.prob_high  or 0, 4),
            },
        }
