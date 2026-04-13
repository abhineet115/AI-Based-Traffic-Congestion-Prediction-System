import React, { useState } from 'react';
import { Navigation, Clock, TrendingUp, CheckCircle, AlertTriangle, Shield, RefreshCw, Zap, ChevronRight } from 'lucide-react';

const ROUTES = [
  {
    id: 1,
    label: 'Fastest · Recommended',
    name: 'Via I-42 North',
    from: 'Downtown Terminal',
    to: 'Business District',
    time: 18,
    dist: '12.4 km',
    status: 'Low',
    saved: '14 min',
    recommended: true,
    segments: [
      { name: 'I-42 N Expressway', km: '6.2 km', status: 'Low' },
      { name: 'Harbor Bridge', km: '2.1 km', status: 'Low' },
      { name: 'Business District Ave', km: '4.1 km', status: 'Medium' },
    ]
  },
  {
    id: 2,
    label: 'Alternate',
    name: 'Via 5th Avenue',
    from: 'Downtown Terminal',
    to: 'Business District',
    time: 32,
    dist: '10.8 km',
    status: 'High',
    saved: null,
    recommended: false,
    segments: [
      { name: '5th Avenue Main', km: '4.5 km', status: 'High' },
      { name: 'Midtown Connector', km: '3.8 km', status: 'High' },
      { name: 'Park Side Road', km: '2.5 km', status: 'Medium' },
    ]
  },
  {
    id: 3,
    label: 'Scenic · Longer',
    name: 'Via Coastal Highway',
    from: 'Downtown Terminal',
    to: 'Business District',
    time: 25,
    dist: '16.2 km',
    status: 'Low',
    saved: '7 min vs Alt.',
    recommended: false,
    segments: [
      { name: 'Coastal Expressway', km: '9.1 km', status: 'Low' },
      { name: 'Waterfront Dr', km: '4.2 km', status: 'Low' },
      { name: 'North Entry Road', km: '2.9 km', status: 'Medium' },
    ]
  }
];

const COLOR = { Low: '#4ade80', Medium: '#facc15', High: '#ef4444' };

const RoutesPage = () => {
  const [selected, setSelected] = useState(1);

  const active = ROUTES.find(r => r.id === selected);

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="section-title">Smart Routes</h1>
        <p className="section-subtitle">AI-optimized paths based on live congestion data</p>
      </div>

      {/* Route Cards */}
      <div style={{ padding: '0 20px 20px' }}>
        {ROUTES.map(r => (
          <div key={r.id} className={`route-card ${r.recommended ? 'recommended' : ''}`}
            style={{ border: selected === r.id ? '1px solid var(--accent-primary)' : undefined }}
            onClick={() => setSelected(r.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: r.recommended ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                  {r.recommended && <CheckCircle size={11} style={{ marginRight: 4 }} />}{r.label}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{r.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.dist}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: COLOR[r.status] }}>{r.time}<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>m</span></div>
                {r.saved && <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', marginTop: 2 }}>Saves {r.saved}</div>}
              </div>
            </div>

            {/* Status bar */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ flex: 1, height: 6, borderRadius: 4, background: `${COLOR[r.status]}30`, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, width: r.status === 'Low' ? '25%' : r.status === 'Medium' ? '60%' : '95%', background: COLOR[r.status] }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: COLOR[r.status], fontWeight: 600 }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Route Detail */}
      {active && (
        <div style={{ padding: '0 20px 24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Route Breakdown</h2>
          <div className="glass-card" style={{ padding: '16px' }}>
            {active.segments.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR[s.status], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.km}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: COLOR[s.status], fontWeight: 600 }}>{s.status}</span>
                </div>
                {i < active.segments.length - 1 && <div className="divider" style={{ margin: '0' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={{ padding: '0 20px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Route Tips</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '🕐', tip: 'Leave 15 minutes earlier to avoid peak hour on I-42.' },
            { icon: '⛈️', tip: 'Rain expected at 14:00. Allow +10 minutes buffer.' },
            { icon: '🛣️', tip: 'Construction on 5th Ave until Apr 10. Use I-42 instead.' },
          ].map((t, i) => (
            <div key={i} className="glass-card" style={{ padding: '14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem' }}>{t.icon}</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{t.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Favourites */}
      <div style={{ padding: '0 20px 32px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Saved Favourites</h2>
        {[
          { label: 'Home → Office', summary: 'Daily via I-42 · 22 min avg.', icon: '🏠' },
          { label: 'Office → Mall', summary: 'Via 6th Street · 18 min avg.', icon: '🛍️' },
        ].map((f, i) => (
          <div key={i} className="glass-card card-hover" style={{ padding: '14px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>{f.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{f.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.summary}</div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutesPage;
