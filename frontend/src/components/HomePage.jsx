import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map, Navigation, Bell, Activity,
  ArrowRight, Zap, Shield, Clock, TrendingUp,
  CheckCircle, ChevronRight, Star, Users, Car, Radio
} from 'lucide-react';

const STATS = [
  { value: '2.4M', label: 'Routes Optimized', color: 'var(--accent-primary)' },
  { value: '98%', label: 'Prediction Accuracy', color: 'var(--accent-green)' },
  { value: '12min', label: 'Avg. Time Saved', color: 'var(--accent-orange)' },
  { value: '340+', label: 'Cities Covered', color: 'var(--accent-purple)' },
];

const FEATURES = [
  {
    icon: Map,
    color: 'var(--accent-primary)',
    bg: 'rgba(34,211,238,0.08)',
    title: 'AI Traffic Map',
    desc: 'Live heatmap overlays showing Low, Medium, and High congestion zones in real time using color-coded nodes.',
    path: '/map',
  },
  {
    icon: Navigation,
    color: 'var(--accent-green)',
    bg: 'rgba(74,222,128,0.08)',
    title: 'Smart Routing',
    desc: 'Get the fastest, least-congested route computed by our Dijkstra/A* engine that updates as conditions change.',
    path: '/routes',
  },
  {
    icon: Bell,
    color: 'var(--accent-orange)',
    bg: 'rgba(251,146,60,0.08)',
    title: 'Instant Alerts',
    desc: 'Push notifications for accidents, road closures, and severe traffic ahead of your commute path.',
    path: '/alerts',
  },
  {
    icon: Activity,
    color: 'var(--accent-purple)',
    bg: 'rgba(167,139,250,0.08)',
    title: 'Deep Analytics',
    desc: 'Interactive charts for vehicle density, congestion trends, and hour-by-hour pattern analysis.',
    path: '/analytics',
  },
];

const HOW_TO = [
  { n: '01', title: 'Open the Map', desc: 'Navigate to the Map tab to see the live traffic overlay for your city.' },
  { n: '02', title: 'Enter Conditions', desc: 'Set your time of day, weather, and road type to feed the AI predictor.' },
  { n: '03', title: 'Get Prediction', desc: 'Hit "Predict Condition" and our ML model returns a Low/Medium/High result instantly.' },
  { n: '04', title: 'Follow Smart Route', desc: 'Switch to Routes to get the optimized low-congestion path to your destination.' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Daily Commuter', text: 'I save nearly 20 minutes every morning. The AI predictions are scarily accurate.', stars: 5 },
  { name: 'Rahul Mehta', role: 'Logistics Manager', text: 'Our fleet routes at 30% lower fuel cost since integrating this system.', stars: 5 },
  { name: 'Ananya Iyer', role: 'Urban Planner', text: 'The analytics dashboard gives us insights we never had access to before.', stars: 4 },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [animStats, setAnimStats] = useState(false);
  const [liveTicker, setLiveTicker] = useState({ text: 'Traffic flowing normally on 87% of monitored routes', ok: true });

  useEffect(() => {
    const t = setTimeout(() => setAnimStats(true), 300);
    // Fetch live weather for ticker
    fetch('http://localhost:5000/api/weather')
      .then(r => r.json())
      .then(d => {
        const c = d.current;
        if (c) {
          const impact = c.traffic_impact;
          const txt =
            impact === 'High'
              ? `Weather alert: ${c.label} in ${d.location}. Expect delays. Use smart routing.`
              : impact === 'Medium'
              ? `Moderate weather in ${d.location}: ${c.label}, ${c.temp}°C. Minor traffic impact.`
              : `Clear conditions in ${d.location}: ${c.label}, ${c.temp}°C. Traffic flowing normally.`;
          setLiveTicker({ text: txt, ok: impact === 'Low' });
        }
      })
      .catch(() => {});
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="page-scroll">
      {/* ── HERO ── */}
      <div style={{ position: 'relative', padding: '48px 20px 32px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background orbs */}
        <div className="glow-orb" style={{
          position: 'absolute', top: '10%', left: '10%',
          width: 220, height: 220,
          background: 'var(--accent-primary)',
          filter: 'blur(90px)', opacity: 0.12, borderRadius: '50%', zIndex: 0
        }} />
        <div className="glow-orb" style={{
          position: 'absolute', top: '40%', right: '5%',
          width: 160, height: 160,
          background: 'var(--accent-purple)',
          filter: 'blur(80px)', opacity: 0.1, borderRadius: '50%', zIndex: 0,
          animationDelay: '2s'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="badge badge-info" style={{ margin: '0 auto 16px', display: 'inline-flex' }}>
            <Zap size={12} /> AI-Powered · Real-Time
          </div>

          <h1 style={{
            fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.15,
            background: 'linear-gradient(135deg, #fff 20%, var(--accent-primary) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 14
          }}>
            Smarter Routes.<br />Zero Congestion.
          </h1>

          <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 340, margin: '0 auto 28px' }}>
            Our AI analyses traffic patterns in real-time to predict congestion
            and guide you through the fastest, safest routes.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/map')} style={{ width: 'auto', padding: '12px 24px' }}>
              <Map size={18} /> Open Live Map <ArrowRight size={16} />
            </button>
            <button className="btn-ghost" onClick={() => navigate('/analytics')}>
              <Activity size={16} /> View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* ── LIVE STATUS TICKER ── */}
      <div style={{ padding: '0 20px 28px' }}>
        <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="animate-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: liveTicker.ok ? 'var(--traffic-low)' : 'var(--traffic-medium)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            <strong style={{ color: 'var(--text-light)' }}>Live:</strong> {liveTicker.text}
          </span>
          <Radio size={16} color="var(--accent-primary)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {STATS.map((s, i) => (
            <div key={i} className="glass-card stat-card">
              <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 className="section-title">Core Features</h2>
          <p className="section-subtitle">Everything you need to navigate smarter</p>
        </div>
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="glass-card card-hover" style={{ padding: '18px', marginBottom: 12, cursor: 'pointer' }} onClick={() => navigate(f.path)}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={f.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── HOW TO USE ── */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get started in 4 simple steps</p>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          {HOW_TO.map((s, i) => (
            <div key={i} className="step-item">
              <div className="step-number">{s.n}</div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>{s.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</p>
                {i < HOW_TO.length - 1 && <div style={{ width: 1, height: 12, background: 'var(--glass-border)', marginLeft: 0, marginTop: 12 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TECH STACK ── */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 className="section-title">Technology Stack</h2>
          <p className="section-subtitle">Built on enterprise-grade infrastructure</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Machine Learning', value: 'Gradient Boosting', icon: '🤖' },
            { label: 'Backend API',       value: 'Python Flask',       icon: '⚡' },
            { label: 'Frontend',          value: 'React + Vite',       icon: '⚛️' },
            { label: 'Mapping',           value: 'Leaflet.js',          icon: '🗺️' },
            { label: 'Routing Engine',    value: 'Dijkstra / A*',      icon: '🔄' },
            { label: 'Data Source',       value: 'OWM + TomTom APIs',  icon: '📡' },
          ].map((t, i) => (
            <div key={i} className="glass-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 className="section-title">What Users Say</h2>
          <p className="section-subtitle">Trusted by commuters and city planners</p>
        </div>
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="glass-card" style={{ padding: '18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {Array(t.stars).fill(0).map((_, si) => <Star key={si} size={14} fill="var(--accent-orange)" color="var(--accent-orange)" />)}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 14, fontStyle: 'italic' }}>
              "{t.text}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#000' }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CTA BOTTOM ── */}
      <div style={{ padding: '0 20px 40px' }}>
        <div className="glass-card" style={{ padding: '28px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(167,139,250,0.08))' }}>
          <Car size={40} color="var(--accent-primary)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Ready to Beat Traffic?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
            Join millions of smart commuters already saving time every day.
          </p>
          <button className="btn-primary" style={{ width: '100%', fontSize: '1rem' }} onClick={() => navigate('/map')}>
            <Map size={18} /> Start Navigating Free
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
