"""
Alert model — traffic alerts that can be created, listed, and resolved via API.
"""
from datetime import datetime, timezone
from extensions import db


SEVERITY_LEVELS = ('Low', 'Medium', 'High', 'Critical')


class Alert(db.Model):
    __tablename__ = 'alerts'

    id          = db.Column(db.Integer, primary_key=True)
    timestamp   = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    zone        = db.Column(db.String(100), nullable=False)
    severity    = db.Column(db.String(20), nullable=False, default='Medium')
    message     = db.Column(db.Text, nullable=False)
    is_active   = db.Column(db.Boolean, nullable=False, default=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    source      = db.Column(db.String(50), nullable=True, default='manual')  # manual/camera/ml

    def resolve(self):
        self.is_active = False
        self.resolved_at = datetime.now(timezone.utc)

    def to_dict(self):
        return {
            'id':          self.id,
            'timestamp':   self.timestamp.isoformat(),
            'zone':        self.zone,
            'severity':    self.severity,
            'message':     self.message,
            'is_active':   self.is_active,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'source':      self.source,
        }
