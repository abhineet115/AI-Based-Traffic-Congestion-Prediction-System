"""
Database initialization and seeding utilities.
"""
from datetime import datetime, timezone, timedelta
from extensions import db
from models import Alert


SEED_ALERTS = [
    {
        'zone': 'Downtown Core',
        'severity': 'High',
        'message': 'Heavy congestion detected near Main St & 5th Ave intersection due to road works.',
        'source': 'manual',
    },
    {
        'zone': 'Harbor Bridge',
        'severity': 'Medium',
        'message': 'Moderate traffic slowdown on Harbor Bridge northbound. Expected clearance in 20 minutes.',
        'source': 'camera',
    },
    {
        'zone': 'West Side Highway',
        'severity': 'Low',
        'message': 'Minor incident on West Side Highway. Right lane blocked. Use alternate routes.',
        'source': 'manual',
    },
    {
        'zone': 'Business District',
        'severity': 'Critical',
        'message': 'Multi-vehicle accident on Business District Blvd. Emergency services on scene. Road closed.',
        'source': 'camera',
    },
    {
        'zone': 'North Gate',
        'severity': 'Medium',
        'message': 'Rush hour congestion at North Gate tollbooth. Expect 15-minute delays.',
        'source': 'ml',
    },
]


def init_db(app):
    """Create all tables and optionally seed initial data."""
    with app.app_context():
        db.create_all()
        _seed_if_empty()


def _seed_if_empty():
    """Insert seed data only on first run (when tables are empty)."""
    if Alert.query.count() == 0:
        now = datetime.now(timezone.utc)
        for i, alert_data in enumerate(SEED_ALERTS):
            alert = Alert(
                timestamp=now - timedelta(hours=i * 2),
                **alert_data,
                is_active=(i != 2),  # Mark one as resolved for demo
            )
            if not alert.is_active:
                alert.resolved_at = now - timedelta(hours=1)
            db.session.add(alert)
        db.session.commit()
        print(f"[DB] Seeded {len(SEED_ALERTS)} sample alerts.")
    else:
        print(f"[DB] Database already populated — skipping seed.")
