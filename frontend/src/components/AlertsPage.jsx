import React, { useState } from 'react';
import { AlertTriangle, Construction, Info, CheckCircle, Clock, MapPin, ChevronDown, ChevronUp, Bell } from 'lucide-react';

const ALERTS = [
  { id: 1, severity: 'High', type: 'Accident', icon: '🚨', title: 'Multi-Vehicle Collision', location: 'I-42 Northbound, Mile 14', time: '5 min ago', detail: 'Three-vehicle pile-up blocking two lanes. Emergency services on scene. Expect 30–45 min delays. Use Exit 9 as a detour.', color: '#ef4444' },
  { id: 2, severity: 'Medium', type: 'Road Work', icon: '🚧', title: 'Lane Closure Ongoing', location: '5th Avenue, 10th–12th St', time: '2 hrs ago', detail: 'Right lane closed for water main repairs. Work continues until April 10, 18:00. Expect 10–15 min added delay.', color: '#facc15' },
  { id: 3, severity: 'Medium', type: 'Weather', icon: '🌧️', title: 'Heavy Rain Alert', location: 'North District Highways', time: '30 min ago', detail: 'Reduced visibility and wet roads on all north highways. Reduce speed. Allow extra buffer in travel time.', color: '#fb923c' },
  { id: 4, severity: 'Low', type: 'Event', icon: '🎪', title: 'Street Event – Road Closure', location: 'Central Park East Blvd', time: '1 hr ago', detail: 'Annual City Marathon closure from 07:00 to 14:00. Use south bypass routes to avoid affected area.', color: '#a78bfa' },
  { id: 5, severity: 'Low', type: 'Info', icon: 'ℹ️', title: 'School Zone Active', location: 'Maple Street & 3rd Ave', time: '45 min ago', detail: 'School pick-up hours (14:30–16:00). Reduced speed zone in effect. Expect minor delays.', color: '#22d3ee' },
];

const FILTER_OPTIONS = ['All', 'High', 'Medium', 'Low'];

const AlertsPage = () => {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const visible = filter === 'All' ? ALERTS : ALERTS.filter(a => a.severity === filter);

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="section-title">Live Alerts</h1>
        <p className="section-subtitle">Real-time incidents and traffic disruptions</p>
      </div>

      {/* Summary Cards */}
      <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Critical', count: ALERTS.filter(a => a.severity === 'High').length, color: '#ef4444' },
          { label: 'Warnings', count: ALERTS.filter(a => a.severity === 'Medium').length, color: '#facc15' },
          { label: 'Info', count: ALERTS.filter(a => a.severity === 'Low').length, color: '#22d3ee' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Chips */}
      <div style={{ padding: '0 20px 16px' }}>
        <div className="toggle-wrap">
          {FILTER_OPTIONS.map(f => (
            <button key={f} className={`toggle-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {/* Alert Feed */}
      <div style={{ padding: '0 20px 24px' }}>
        {visible.map(a => (
          <div key={a.id} style={{ marginBottom: 10 }}>
            <div onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              style={{
                padding: '16px', borderRadius: 16, cursor: 'pointer',
                background: 'var(--glass-bg)', border: `1px solid ${a.color}30`,
                borderLeft: `4px solid ${a.color}`,
                display: 'flex', gap: 14, alignItems: 'flex-start',
                transition: 'all 0.2s'
              }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: a.color, fontWeight: 600, marginBottom: 3 }}>{a.severity.toUpperCase()} · {a.type}</div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>{a.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={11} />{a.location}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.time}</span>
                    {expanded === a.id ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                  </div>
                </div>
              </div>
            </div>
            {expanded === a.id && (
              <div style={{
                padding: '14px 16px', margin: '2px 0 0',
                background: `${a.color}08`, border: `1px solid ${a.color}25`,
                borderRadius: '0 0 14px 14px', borderTop: 'none'
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>{a.detail}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alert Tips */}
      <div style={{ padding: '0 20px 32px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Stay Safe — Quick Tips</h2>
        <div className="glass-card" style={{ padding: '16px' }}>
          {[
            'Keep 3× stopping distance during rain or fog.',
            'Never use a mobile phone while driving near incident zones.',
            'Merge early when lanes close — emergency vehicles need space.',
            'Check this feed before departing during peak hours (07–09, 17–19).',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--glass-border)' : 'none' }}>
              <CheckCircle size={15} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
