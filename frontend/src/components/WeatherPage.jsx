import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, Wind, Droplets, Thermometer, RefreshCw, AlertTriangle, Eye, ChevronRight, Gauge, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const IMPACT_COLOR = { Low: '#4ade80', Medium: '#facc15', High: '#ef4444' };

const DEFAULT_POS = { lat: 19.0760, lon: 72.8777 }; // Mumbai fallback

const WeatherPage = () => {
  const [weather, setWeather]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords]     = useState(null);
  const navigate = useNavigate();

  // ── Geolocation ──────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setCoords(DEFAULT_POS);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // On mount, auto-request location
  useEffect(() => { requestLocation(); }, [requestLocation]);

  // ── Fetch weather whenever coords are known ──────────────────────────────
  const fetchWeather = useCallback(async (pos) => {
    setLoading(true);
    const { lat, lon } = pos || coords || DEFAULT_POS;
    try {
      const res = await fetch(`http://localhost:5000/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error('API error');
      setWeather(await res.json());
    } catch {
      setWeather(null);
    }
    setLoading(false);
  }, [coords]);

  useEffect(() => {
    if (coords) fetchWeather(coords);
  }, [coords]);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (locating || (loading && !weather)) return (
    <div className="page-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
      <div style={{ width: 50, height: 50, borderRadius: '50%', border: '3px solid rgba(34,211,238,0.2)', borderTop: '3px solid var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: 'var(--text-muted)' }}>{locating ? 'Detecting your location…' : 'Fetching live weather…'}</p>
    </div>
  );

  // ── Fallback if fetch completely failed ───────────────────────────────────
  if (!weather) return (
    <div className="page-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '0 24px', textAlign: 'center' }}>
      <AlertTriangle size={40} color="#ef4444" />
      <p style={{ color: 'var(--text-dim)' }}>Could not fetch weather data. Add your OpenWeatherMap API key in <code>backend/config.py</code>.</p>
      <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => fetchWeather()}>Retry</button>
    </div>
  );

  const { current, location, forecast, hourly, source, last_updated } = weather;
  const impactColor = IMPACT_COLOR[current.traffic_impact] || 'var(--text-muted)';
  const isLive = source === 'OpenWeatherMap';

  // Format last updated time
  const lastUpdatedStr = last_updated
    ? new Date(last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="section-title">Weather</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <MapPin size={13} color="var(--accent-primary)" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{location}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#4ade80' : '#f59e0b', animation: isLive ? 'pulse 2s infinite' : 'none' }} />
            <p style={{ fontSize: '0.7rem', color: isLive ? '#4ade80' : '#f59e0b' }}>
              {isLive ? `Live · Updated ${lastUpdatedStr}` : 'Fallback data — add OWM API key'}
            </p>
          </div>
        </div>
        <button className="btn-ghost" style={{ padding: '8px 12px' }}
          onClick={requestLocation} disabled={locating}>
          <RefreshCw size={15} style={{ animation: locating ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Current Conditions Hero */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="glass-card" style={{ padding: '28px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,211,238,0.05), rgba(167,139,250,0.05))' }}>
          <div style={{ fontSize: '5rem', marginBottom: 8, lineHeight: 1 }}>{current.icon}</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: 4 }}>{current.temp}°C</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Feels like {current.feels_like}°C</div>
          <div style={{ fontSize: '1rem', color: 'var(--text-dim)', marginBottom: 20 }}>{current.label}</div>

          {/* Stat Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { icon: Droplets, label: 'Humidity',    val: `${current.humidity}%`,           color: '#60a5fa' },
              { icon: Wind,     label: 'Wind',         val: `${current.wind} km/h`,           color: 'var(--accent-primary)' },
              { icon: Eye,      label: 'Visibility',   val: `${current.visibility ?? '—'} km`, color: '#a78bfa' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} style={{ padding: '12px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                  <Icon size={18} color={s.color} style={{ margin: '0 auto 6px', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.val}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Pressure row */}
          {current.pressure && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Gauge size={14} color="var(--text-muted)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pressure: {current.pressure} hPa</span>
            </div>
          )}
        </div>
      </div>

      {/* Traffic Impact Banner */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ padding: '14px 18px', borderRadius: 14, background: `${impactColor}12`, border: `1px solid ${impactColor}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={20} color={impactColor} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: impactColor }}>Traffic Impact: {current.traffic_impact}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {current.traffic_impact === 'High'
                ? 'Severe weather. Allow extra 20–30 min. Use AI routing for safer paths.'
                : current.traffic_impact === 'Medium'
                ? 'Weather may cause minor slowdowns. Monitor alerts before commute.'
                : 'Ideal driving conditions. No weather-related delays expected.'}
            </div>
          </div>
          <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem', flexShrink: 0 }} onClick={() => navigate('/map')}>
            Map <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Hourly Forecast */}
      {hourly && hourly.length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Hourly Forecast</h2>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {hourly.map((h, i) => (
              <div key={i} style={{ flexShrink: 0, width: 68, padding: '12px 8px', textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 14 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>{h.hour}</div>
                <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>{h.icon || current.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{h.temp}°</div>
                <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: 4 }}>{h.precip_prob}%💧</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4-Day Forecast */}
      {forecast && forecast.length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>4-Day Forecast</h2>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {forecast.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                borderBottom: i < forecast.length - 1 ? '1px solid var(--glass-border)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
              }}>
                <span style={{ fontSize: '1.4rem', width: 32, textAlign: 'center' }}>{f.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.day}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.label}</div>
                  {f.precip_prob > 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: 2 }}>{f.precip_prob}% rain</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.temp}°C</div>
                  {f.temp_min !== undefined && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{f.temp_min}° / {f.temp_max}°</div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: IMPACT_COLOR[f.traffic_impact], marginTop: 2, fontWeight: 600 }}>{f.traffic_impact} impact</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driving Tips */}
      <div style={{ padding: '0 20px 32px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Driving Tips for Today</h2>
        <div className="glass-card" style={{ padding: '16px' }}>
          {[
            current.traffic_impact === 'High'
              ? { e: '⚠️', tip: 'Dangerous conditions detected. Reduce speed, increase following distance, and use AI rerouting.' }
              : { e: '🌡️', tip: 'Check tyre pressure before long drives. Extreme temps affect grip.' },
            { e: '🌬️', tip: `Wind speed is ${current.wind} km/h. High-sided vehicles should take extra care on bridges.` },
            current.visibility < 3
              ? { e: '🌫️', tip: `Low visibility (${current.visibility} km). Use fog lights and slow down significantly.` }
              : { e: '☀️', tip: 'Watch for sun glare at sunrise and sunset. Use your sun visor.' },
            { e: '🚗', tip: 'Stay alert for pedestrians and cyclists, especially in urban areas.' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--glass-border)' : 'none' }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{t.e}</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{t.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherPage;
