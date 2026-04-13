import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, Car, Zap, BarChart2, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'];
const WEEK_DATA = [85, 92, 88, 96, 115, 68, 55];
const HOUR_DATA = [20, 95, 55, 40, 45, 88, 100, 35];
const TREND_DATA = [82, 88, 79, 95, 91, 110, 104, 99, 90, 85, 80, 78];
const TREND_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ZONES = [
  { name: 'Downtown Core', level: 82, trend: 'up' },
  { name: 'Harbor Bridge', level: 61, trend: 'down' },
  { name: 'West Side Hwy', level: 45, trend: 'stable' },
  { name: 'Business Dist.', level: 73, trend: 'up' },
  { name: 'Coastal Route', level: 28, trend: 'down' },
];

const ZONE_COLOR = (l) => l >= 75 ? '#ef4444' : l >= 50 ? '#facc15' : '#4ade80';

const chartOptions = (label) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(13,21,38,0.95)',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.07)',
      borderWidth: 1,
    },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } }, beginAtZero: true },
  },
});

const BAR_COLORS = WEEK_DATA.map(v =>
  v >= 100 ? 'rgba(239,68,68,0.85)' : v >= 80 ? 'rgba(250,204,21,0.85)' : 'rgba(74,222,128,0.85)'
);

const AnalyticsPage = () => {
  const [metric, setMetric] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/analytics');
      setApiData(await res.json());
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const weekValues = apiData?.weekly || WEEK_DATA;
  const hourValues = apiData?.hourly?.slice(0, 8) || HOUR_DATA;

  const barData = {
    labels: metric === 'weekly' ? DAYS : HOURS,
    datasets: [{
      label: metric === 'weekly' ? 'Vehicle Density' : 'Congestion %',
      data: metric === 'weekly' ? weekValues : hourValues,
      backgroundColor: (metric === 'weekly' ? weekValues : hourValues).map(v =>
        v >= 100 ? 'rgba(239,68,68,0.8)' : v >= 70 ? 'rgba(250,204,21,0.8)' : 'rgba(74,222,128,0.8)'
      ),
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const lineData = {
    labels: TREND_LABELS,
    datasets: [{
      label: 'Congestion Index',
      data: TREND_DATA,
      borderColor: 'rgba(34,211,238,0.9)',
      backgroundColor: 'rgba(34,211,238,0.07)',
      borderWidth: 2.5,
      pointBackgroundColor: 'var(--accent-primary)',
      pointRadius: 4,
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="section-title">Analytics</h1>
          <p className="section-subtitle">Traffic trends, vehicle counts & insights</p>
        </div>
        <button className="btn-ghost" style={{ padding: '8px 12px' }} onClick={fetchAnalytics}>
          <RefreshCw size={15} className={loading ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Avg. Daily Vehicles', value: '48,200', icon: Car, color: 'var(--accent-primary)', delta: '+3.2%', up: true },
          { label: 'Peak Congestion Index', value: '92 / 100', icon: Zap, color: '#ef4444', delta: '-5.1%', up: false },
          { label: 'Mean Travel Time', value: '26 min', icon: Clock, color: 'var(--accent-orange)', delta: '-1.8 min', up: false },
          { label: 'Incidents Today', value: '7', icon: BarChart2, color: 'var(--accent-purple)', delta: '+2 vs avg.', up: true },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Icon size={18} color={c.color} />
                <span style={{ fontSize: '0.7rem', color: c.up ? '#ef4444' : '#4ade80', fontWeight: 600 }}>{c.delta}</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Toggle + Bar Chart */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="toggle-wrap">
          {[['weekly', 'Weekly'], ['hourly', 'Hourly']].map(([k, l]) => (
            <button key={k} className={`toggle-chip ${metric === k ? 'active' : ''}`} onClick={() => setMetric(k)}>{l}</button>
          ))}
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>
            {metric === 'weekly' ? 'Weekly Vehicle Count' : 'Hourly Congestion Level'}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            {metric === 'weekly' ? 'Avg. vehicles per hour per day' : 'Congestion index by hour today'}
          </p>
          <div style={{ height: 180 }}>
            <Bar data={barData} options={chartOptions(metric)} />
          </div>
        </div>
      </div>

      {/* Annual Trend Line */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>Annual Congestion Trend</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Monthly average congestion index</p>
          <div style={{ height: 160 }}>
            <Line data={lineData} options={chartOptions('trend')} />
          </div>
        </div>
      </div>

      {/* Zone Congestion */}
      <div style={{ padding: '0 20px 20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Zone Congestion Levels</h2>
        <div className="glass-card" style={{ padding: '16px' }}>
          {ZONES.map((z, i) => {
            const TIcon = z.trend === 'up' ? TrendingUp : z.trend === 'down' ? TrendingDown : Minus;
            const tc = z.trend === 'up' ? '#ef4444' : z.trend === 'down' ? '#4ade80' : 'var(--text-muted)';
            return (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < ZONES.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{z.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TIcon size={13} color={tc} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: ZONE_COLOR(z.level) }}>{z.level}%</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${z.level}%`, background: ZONE_COLOR(z.level) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Peak Hour Table */}
      <div style={{ padding: '0 20px 32px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Peak Hour Analysis</h2>
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {[
            { time: '07:00 – 09:00', type: 'Morning Rush', index: 'Very High', color: '#ef4444' },
            { time: '12:00 – 13:00', type: 'Lunch Hour', index: 'Medium', color: '#facc15' },
            { time: '17:00 – 19:00', type: 'Evening Rush', index: 'Extreme', color: '#ef4444' },
            { time: '22:00 – 06:00', type: 'Night Hours', index: 'Very Low', color: '#4ade80' },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderBottom: i < 3 ? '1px solid var(--glass-border)' : 'none'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{r.time}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.type}</div>
              </div>
              <span style={{ color: r.color, fontWeight: 700, fontSize: '0.85rem' }}>{r.index}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
