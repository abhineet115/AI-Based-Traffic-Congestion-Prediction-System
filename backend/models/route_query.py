"""
RouteQuery model — stores every Dijkstra route optimization request.
"""
import json
from datetime import datetime, timezone
from extensions import db


class RouteQuery(db.Model):
    __tablename__ = 'route_queries'

    id                   = db.Column(db.Integer, primary_key=True)
    timestamp            = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    start_node           = db.Column(db.String(10), nullable=False)
    end_node             = db.Column(db.String(10), nullable=False)
    start_name           = db.Column(db.String(100), nullable=True)
    end_name             = db.Column(db.String(100), nullable=True)

    path_json            = db.Column(db.Text, nullable=True)    # JSON list of node IDs
    total_distance_km    = db.Column(db.Float, nullable=True)
    estimated_time_mins  = db.Column(db.Integer, nullable=True)
    total_cost_score     = db.Column(db.Float, nullable=True)
    congestion_at_query  = db.Column(db.String(10), nullable=True)  # Low/Medium/High

    @property
    def path(self):
        return json.loads(self.path_json) if self.path_json else []

    def to_dict(self):
        return {
            'id':                  self.id,
            'timestamp':           self.timestamp.isoformat(),
            'start_node':          self.start_node,
            'end_node':            self.end_node,
            'start_name':          self.start_name,
            'end_name':            self.end_name,
            'path':                self.path,
            'total_distance_km':   self.total_distance_km,
            'estimated_time_mins': self.estimated_time_mins,
            'total_cost_score':    self.total_cost_score,
            'congestion_at_query': self.congestion_at_query,
        }
