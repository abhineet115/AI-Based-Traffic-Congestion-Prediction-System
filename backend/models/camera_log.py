"""
CameraLog model — stores every camera-based traffic analysis result.
"""
import json
from datetime import datetime, timezone
from extensions import db


class CameraLog(db.Model):
    __tablename__ = 'camera_logs'

    id               = db.Column(db.Integer, primary_key=True)
    timestamp        = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    congestion_level = db.Column(db.String(10), nullable=False)
    vehicle_count    = db.Column(db.Integer, nullable=False, default=0)
    confidence       = db.Column(db.Float, nullable=False, default=0.0)
    detail           = db.Column(db.Text, nullable=True)
    recommendations_json = db.Column(db.Text, nullable=True)  # JSON list of strings

    @property
    def recommendations(self):
        return json.loads(self.recommendations_json) if self.recommendations_json else []

    def to_dict(self):
        return {
            'id':               self.id,
            'timestamp':        self.timestamp.isoformat(),
            'congestion_level': self.congestion_level,
            'vehicle_count':    self.vehicle_count,
            'confidence':       round(self.confidence, 4),
            'detail':           self.detail,
            'recommendations':  self.recommendations,
        }
