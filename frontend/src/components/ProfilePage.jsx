import React, { useState } from 'react';
import { Settings, LogOut, Bell, Shield, Navigation, Star, Car, Map, ChevronRight, Edit2, Award, Clock, TrendingUp } from 'lucide-react';

const ACHIEVEMENTS = [
  { icon: '🏆', title: 'Top Saver', desc: 'Saved 5+ hours total', earned: true },
  { icon: '🌱', title: 'Eco Commuter', desc: 'Chose green routes 10 times', earned: true },
  { icon: '🚀', title: 'Speed Demon', desc: 'Beat ETA 20 times', earned: false },
  { icon: '🗺️', title: 'Explorer', desc: 'Tried 10 unique routes', earned: false },
];

const RECENT_TRIPS = [
  { from: 'Home', to: 'Office', time: '07:45', duration: '22 min', status: 'Low' },
  { from: 'Office', to: 'Mall', time: '13:10', duration: '18 min', status: 'Medium' },
  { from: 'Mall', to: 'Home', time: '18:30', duration: '35 min', status: 'High' },
];

const COLOR = { Low: '#4ade80', Medium: '#facc15', High: '#ef4444' };

const ProfilePage = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="page-scroll">
      {/* Header Profile Card */}
      <div style={{ padding: '28px 20px 16px' }}>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.06))' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', fontWeight: 800, color: '#000',
              margin: '0 auto'
            }}>AD</div>
            <div style={{
              position: 'absolute', bottom: 2, right: 2, width: 22, height: 22,
              borderRadius: '50%', background: 'var(--accent-green)',
              border: '2px solid var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />
            </div>
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 4 }}>Alex Driver</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>Smart City Commuter · Premium</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            {[
              { label: 'Trips', val: 142 },
              { label: 'Hours Saved', val: '8.4h' },
              { label: 'Green Score', val: 87 },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{s.val}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: Clock, label: 'Avg. Trip Time', val: '24 min', color: 'var(--accent-primary)' },
          { icon: TrendingUp, label: 'Streak Days', val: '12 Days', color: 'var(--accent-orange)' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card" style={{ padding: '14px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <Icon size={20} color={s.color} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <div style={{ padding: '0 20px 20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Achievements</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACHIEVEMENTS.map((a, i) => (
            <div key={i} className="glass-card" style={{ padding: '14px', opacity: a.earned ? 1 : 0.45, filter: a.earned ? 'none' : 'grayscale(1)' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{a.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.desc}</div>
              {a.earned && <Award size={12} color="var(--accent-orange)" style={{ marginTop: 8 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trips */}
      <div style={{ padding: '0 20px 20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Recent Trips</h2>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          {RECENT_TRIPS.map((t, i) => (
            <div key={i} style={{
              padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
              borderBottom: i < RECENT_TRIPS.length - 1 ? '1px solid var(--glass-border)' : 'none'
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${COLOR[t.status]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={18} color={COLOR[t.status]} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.from} → {t.to}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.time} · {t.duration}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: COLOR[t.status], fontWeight: 600 }}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '0 20px 20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Settings</h2>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          {[
            {
              icon: Bell, label: 'Push Notifications', desc: 'Get alerts for your routes',
              toggle: notifications, setToggle: setNotifications
            },
            {
              icon: Shield, label: 'Privacy Mode', desc: 'Anonymize trip data',
              toggle: false, setToggle: () => {}
            },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
                borderBottom: '1px solid var(--glass-border)'
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="var(--text-dim)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <div onClick={() => s.setToggle(!s.toggle)} style={{
                  width: 42, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                  background: s.toggle ? 'var(--accent-primary)' : 'rgba(255,255,255,0.12)',
                  position: 'relative'
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, left: s.toggle ? 21 : 3, transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            );
          })}
          {[
            { icon: Navigation, label: 'Default Route Type', val: 'Fastest' },
            { icon: Map, label: 'Map Theme', val: 'Dark' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
                borderBottom: i < 1 ? '1px solid var(--glass-border)' : 'none'
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="var(--text-dim)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.label}</div>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: 4 }}>{s.val}</span>
                <ChevronRight size={14} color="var(--text-muted)" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign Out */}
      <div style={{ padding: '0 20px 40px' }}>
        <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--traffic-high)', borderColor: 'rgba(239,68,68,0.2)', padding: '13px' }}>
          <LogOut size={16} /> Sign Out
        </button>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
          TrafficAI v1.2.0 · © 2026 Smart City Systems
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
