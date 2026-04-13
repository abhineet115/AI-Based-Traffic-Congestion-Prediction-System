import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import {
  Search, Locate, Layers, X, TrendingUp, Navigation, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, Zap, Activity, Clock, Car, Radio, Shield
} from 'lucide-react';

// ── TomTom API key (used only for map tile URLs — standard practice) ───────
const TOMTOM_KEY = 'gQ0weCRElrlmukZ0Hh1YGgiStSMUILhE';

// ── Constants ──────────────────────────────────────────────────────────────
const COLOR = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
const BG    = { Low: '#22c55e18', Medium: '#f59e0b18', High: '#ef444418' };

const INCIDENT_META = {
  0:  { emoji: '⚠️', color: '#f59e0b', label: 'Unknown' },
  1:  { emoji: '💥', color: '#ef4444', label: 'Accident' },
  2:  { emoji: '🌫️', color: '#94a3b8', label: 'Fog' },
  3:  { emoji: '⚠️', color: '#f97316', label: 'Dangerous' },
  4:  { emoji: '🌧️', color: '#60a5fa', label: 'Rain' },
  5:  { emoji: '🧊', color: '#7dd3fc', label: 'Ice' },
  6:  { emoji: '🚦', color: '#ef4444', label: 'Traffic Jam' },
  7:  { emoji: '🚧', color: '#f97316', label: 'Lane Closed' },
  8:  { emoji: '🚫', color: '#dc2626', label: 'Road Closed' },
  9:  { emoji: '🔨', color: '#f59e0b', label: 'Road Works' },
  10: { emoji: '💨', color: '#94a3b8', label: 'High Wind' },
  11: { emoji: '🌊', color: '#60a5fa', label: 'Flooding' },
  14: { emoji: '🚗', color: '#f59e0b', label: 'Breakdown' },
};
const MAG_COLOR = ['#64748b', '#22c55e', '#f59e0b', '#ef4444', '#64748b'];

const FALLBACK_ZONES = [
  { node:'A', name:'Downtown Terminal',  lat:40.7128, lng:-74.0060, level:'High',   speed_ratio:0.28, source:'fallback' },
  { node:'B', name:'Harbor Bridge',      lat:40.7168, lng:-74.0090, level:'Medium', speed_ratio:0.55, source:'fallback' },
  { node:'C', name:'West Side Highway',  lat:40.7190, lng:-74.0030, level:'Low',    speed_ratio:0.88, source:'fallback' },
  { node:'D', name:'Midtown Connector',  lat:40.7155, lng:-73.9970, level:'High',   speed_ratio:0.22, source:'fallback' },
  { node:'E', name:'Business District',  lat:40.7220, lng:-74.0000, level:'Medium', speed_ratio:0.60, source:'fallback' },
  { node:'F', name:'North Gate',         lat:40.7240, lng:-74.0060, level:'Low',    speed_ratio:0.85, source:'fallback' },
];

// ── Icons ──────────────────────────────────────────────────────────────────
const nodeIcon = (color) => L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
  className:'', iconAnchor:[9,9],
});
const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#4285f4;border:3px solid white;box-shadow:0 0 0 7px rgba(66,133,244,0.22)"></div>`,
  className:'', iconAnchor:[10,10],
});
const incidentIcon = (color, emoji) => L.divIcon({
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${color}22;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.18);backdrop-filter:blur(4px)">${emoji}</div>`,
  className:'', iconAnchor:[17,17],
});
const userFlowIcon = (color) => L.divIcon({
  html: `<div style="padding:6px 10px;border-radius:8px;background:white;border:2px solid ${color};font-size:11px;font-weight:700;color:${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);white-space:nowrap;font-family:Inter,sans-serif">📍 You</div>`,
  className:'', iconAnchor:[30,14],
});

function MapController({ flyTo }) {
  const map = useMap();
  useEffect(() => { if (flyTo) map.flyTo(flyTo, 15, { animate:true, duration:1.5 }); }, [flyTo]);
  return null;
}

async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`, { headers:{'Accept-Language':'en'} });
  return r.json();
}

// ── Main Component ─────────────────────────────────────────────────────────
const MapArea = () => {
  // Map state
  const [mapStyle, setMapStyle]           = useState('standard');
  const [trafficOn, setTrafficOn]         = useState(true);
  const [flyTo, setFlyTo]                 = useState(null);
  const [layerOpen, setLayerOpen]         = useState(false);

  // Search
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMarker, setSearchMarker]   = useState(null);

  // Location & flow
  const [userLocation, setUserLocation]   = useState(null);
  const [locating, setLocating]           = useState(false);
  const [userFlow, setUserFlow]           = useState(null);

  // Traffic
  const [trafficZones, setTrafficZones]   = useState(FALLBACK_ZONES);
  const [trafficSrc, setTrafficSrc]       = useState('fallback');
  const [trafficTime, setTrafficTime]     = useState(null);

  // Incidents
  const [incidents, setIncidents]         = useState([]);
  const [incLoading, setIncLoading]       = useState(false);
  const [incSrc, setIncSrc]               = useState(null);

  // Bottom panel
  const [panelOpen, setPanelOpen]         = useState(true);
  const [tab, setTab]                     = useState('predict');

  // Prediction / route
  const [route, setRoute]                 = useState([]);
  const [eta, setEta]                     = useState(null);
  const [prediction, setPrediction]       = useState(null);
  const [predLoading, setPredLoading]     = useState(false);
  const [timeOfDay, setTimeOfDay]         = useState(new Date().getHours());
  const [weather, setWeather]             = useState(0);
  const [roadType, setRoadType]           = useState(1);

  const debRef = useRef(null);

  const TILES = {
    standard:  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };

  // ── Search ───────────────────────────────────────────────────────────────
  const handleSearch = (val) => {
    setSearchQuery(val);
    clearTimeout(debRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try { setSearchResults((await geocode(val)).slice(0,5)); } catch { setSearchResults([]); }
      setSearchLoading(false);
    }, 500);
  };
  const [searchedLocation, setSearchedLocation] = useState(null); // { lat, lon, label }

  const selectResult = async (r) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    const label = r.display_name.split(',').slice(0, 2).join(', ');
    const ll = [lat, lon];
    setFlyTo(ll);
    setSearchMarker({ latlng: ll, label });
    setSearchQuery(label);
    setSearchResults([]);
    setSearchedLocation({ lat, lon, label });

    // Clear previous results so user sees loading state
    setIncidents([]);
    setUserFlow(null);

    // Fetch traffic data for the searched location
    setTab('incidents');
    setPanelOpen(true);
    await Promise.all([
      fetchIncidents(lat, lon),
      fetchUserFlow(lat, lon),
    ]);
  };

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchTrafficFlow = useCallback(async () => {
    try {
      const r = await fetch('http://localhost:5000/api/traffic-flow');
      if (!r.ok) return;
      const d = await r.json();
      const zones = Object.values(d.nodes || {});
      if (zones.length) { setTrafficZones(zones); setTrafficSrc(d.source); setTrafficTime(d.updated); }
    } catch {}
  }, []);

  const fetchIncidents = useCallback(async (lat, lon) => {
    setIncLoading(true);
    try {
      const r = await fetch(`http://localhost:5000/api/incidents?lat=${lat}&lon=${lon}`);
      if (!r.ok) return;
      const d = await r.json();
      setIncidents(d.incidents || []);
      setIncSrc(d.source);
    } catch {}
    setIncLoading(false);
  }, []);

  const fetchUserFlow = useCallback(async (lat, lon) => {
    try {
      const r = await fetch(`http://localhost:5000/api/traffic-flow?lat=${lat}&lon=${lon}`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.user_point) setUserFlow(d.user_point);
    } catch {}
  }, []);

  const fetchRoute = async () => {
    try {
      const r = await fetch('http://localhost:5000/api/route');
      const d = await r.json();
      setRoute(d.route || []); setEta(d.estimated_time_mins);
    } catch { setRoute(FALLBACK_ZONES.slice(0,3).map(z => ({ lat:z.lat, lng:z.lng }))); }
  };

  const predictCongestion = async () => {
    setPredLoading(true);
    try {
      const ll = userLocation || [0, 0];
      const r = await fetch('http://localhost:5000/api/predict', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ time_of_day:+timeOfDay, day_of_week:new Date().getDay(),
          weather:+weather, road_type:+roadType, lat:ll[0], lon:ll[1] }),
      });
      const d = await r.json();
      setPrediction(d.congestion_level);
    } catch {
      const h=+timeOfDay;
      setPrediction((h>=7&&h<=9)||(h>=17&&h<=19)?'High':h>=10&&h<=16?'Medium':'Low');
    }
    setPredLoading(false);
  };

  // ── Locate user & fetch real traffic ─────────────────────────────────────
  const locateUser = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      setUserLocation([lat, lon]);
      setFlyTo([lat, lon]);
      setLocating(false);
      // Fetch real traffic data for this location
      await Promise.all([fetchIncidents(lat, lon), fetchUserFlow(lat, lon)]);
      setTab('incidents');
      setPanelOpen(true);
    }, () => setLocating(false), { enableHighAccuracy:true, timeout:10000 });
  };

  useEffect(() => {
    fetchRoute();
    fetchTrafficFlow();
    // Auto-locate on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat=pos.coords.latitude, lon=pos.coords.longitude;
        setUserLocation([lat, lon]);
        setFlyTo([lat, lon]);
        fetchIncidents(lat, lon);
        fetchUserFlow(lat, lon);
      }, () => {}, { enableHighAccuracy:true, timeout:8000 });
    }
    const iv = setInterval(fetchTrafficFlow, 30000);
    return () => clearInterval(iv);
  }, [fetchTrafficFlow, fetchIncidents, fetchUserFlow]);

  const predColor = prediction ? COLOR[prediction] : '#22d3ee';
  const isLight   = mapStyle !== 'dark';
  const highInc   = incidents.filter(i => i.magnitude >= 3).length;

  // Stats derived from traffic zones
  const avgRatio = trafficZones.length ? (trafficZones.reduce((a,z) => a+(z.speed_ratio||0.5),0)/trafficZones.length) : 0.5;
  const congPct  = Math.round((1-avgRatio)*100);
  const congLevel = avgRatio>=0.75?'Low':avgRatio>=0.45?'Medium':'High';

  return (
    <div className="map-container" style={{ position:'relative' }}>

      {/* ── MAP ─────────────────────────────────────────────────────────── */}
      <MapContainer center={[40.7145,-74.0050]} zoom={14}
        style={{ height:'100%', width:'100%' }} zoomControl={false} attributionControl={false}>

        <TileLayer url={TILES[mapStyle]} maxZoom={20} />

        {/* TomTom Real Traffic Flow Tile Layer */}
        {trafficOn && (
          <TileLayer
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
            opacity={0.72} maxZoom={22} />
        )}
        {/* TomTom Incidents Tile Layer */}
        {trafficOn && incidents.length === 0 && (
          <TileLayer
            url={`https://api.tomtom.com/traffic/map/4/tile/incidents/s3/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
            opacity={0.85} maxZoom={22} />
        )}

        <ZoomControl position="bottomright" />
        <MapController flyTo={flyTo} />

        {/* Road node markers */}
        {trafficZones.map((z, i) => {
          const level=z.level||'Medium', pct=Math.round((z.speed_ratio||0.5)*100);
          return (
            <Marker key={z.node||i} position={[z.lat,z.lng]} icon={nodeIcon(COLOR[level])}>
              <Popup>
                <div style={{ fontFamily:'Inter,sans-serif', minWidth:190 }}>
                  <strong style={{ fontSize:'0.9rem' }}>{z.name}</strong>
                  <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
                    <span style={{ color:COLOR[level], fontWeight:700, fontSize:'0.85rem' }}>● {level} Congestion</span>
                    {z.currentSpeed && <span style={{ color:'#555', fontSize:'0.8rem' }}>Speed: {z.currentSpeed} km/h</span>}
                    {z.freeFlowSpeed && <span style={{ color:'#888', fontSize:'0.75rem' }}>Free-flow: {z.freeFlowSpeed} km/h</span>}
                    <div style={{ height:4, borderRadius:2, background:'#e5e7eb', marginTop:2 }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:COLOR[level], borderRadius:2 }} />
                    </div>
                    <span style={{ fontSize:'0.7rem', color:'#aaa' }}>
                      {pct}% of free-flow · {z.source==='tomtom'?'TomTom Live':'Heuristic'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Incident markers */}
        {incidents.map((inc, i) => {
          const m = INCIDENT_META[inc.category] || INCIDENT_META[0];
          return (
            <Marker key={inc.id||i} position={[inc.lat,inc.lon]} icon={incidentIcon(m.color, m.emoji)}>
              <Popup>
                <div style={{ fontFamily:'Inter,sans-serif', minWidth:210 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:'1.2rem' }}>{m.emoji}</span>
                    <strong style={{ color:m.color, fontSize:'0.9rem' }}>{m.label}</strong>
                    {inc.magnitude > 0 && (
                      <span style={{ marginLeft:'auto', fontSize:'0.7rem', padding:'2px 6px', borderRadius:4, background:MAG_COLOR[inc.magnitude]+'22', color:MAG_COLOR[inc.magnitude], fontWeight:700 }}>
                        {['','Minor','Moderate','Major',''][inc.magnitude]}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'#333', marginBottom:4 }}>{inc.description}</p>
                  {inc.from && <p style={{ fontSize:'0.75rem', color:'#666' }}>From: {inc.from}</p>}
                  {inc.to   && <p style={{ fontSize:'0.75rem', color:'#666' }}>To: {inc.to}</p>}
                  {inc.delay_minutes > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6, padding:'4px 8px', borderRadius:6,
                      background:'#ef444412', border:'1px solid #ef444440' }}>
                      <Clock size={11} color="#ef4444" />
                      <span style={{ fontSize:'0.8rem', color:'#ef4444', fontWeight:700 }}>+{inc.delay_minutes} min delay</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* User location */}
        {userLocation && (
          <Marker position={userLocation} icon={userFlow ? userFlowIcon(COLOR[userFlow.level||'Low']) : userIcon}>
            <Popup>
              <div style={{ fontFamily:'Inter,sans-serif', minWidth:180 }}>
                <strong>📍 Your Location</strong>
                {userFlow && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ color:COLOR[userFlow.level], fontWeight:700, fontSize:'0.9rem' }}>{userFlow.level} Traffic</span>
                      <span style={{ fontSize:'0.85rem', fontWeight:700 }}>{userFlow.currentSpeed} km/h</span>
                    </div>
                    <div style={{ height:5, borderRadius:3, background:'#e5e7eb' }}>
                      <div style={{ width:`${Math.round(userFlow.speed_ratio*100)}%`, height:'100%', background:COLOR[userFlow.level], borderRadius:3 }} />
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'#888', marginTop:4 }}>
                      Free-flow: {userFlow.freeFlowSpeed} km/h · {Math.round(userFlow.speed_ratio*100)}% speed maintained
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Search marker */}
        {searchMarker && (
          <Marker position={searchMarker.latlng} icon={L.divIcon({
            html:`<div style="width:26px;height:38px;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 36%22><path d=%22M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z%22 fill=%22%23ef4444%22/><circle cx=%2212%22 cy=%2212%22 r=%224%22 fill=%22white%22/></svg>') center/cover no-repeat"></div>`,
            className:'', iconAnchor:[13,38] })}>
            <Popup>{searchMarker.label}</Popup>
          </Marker>
        )}

        {/* Route */}
        {route.length > 1 && (
          <>
            <Polyline positions={route.map(r=>[r.lat,r.lng])} color="#1a73e8" weight={8} opacity={0.2} />
            <Polyline positions={route.map(r=>[r.lat,r.lng])} color="#1a73e8" weight={4} opacity={0.9} />
          </>
        )}
      </MapContainer>

      {/* ── Attribution ─────────────────────────────────────────────────── */}
      <div style={{ position:'absolute', bottom:panelOpen?252:78, right:48, zIndex:900,
        fontSize:'0.6rem', color:isLight?'#666':'rgba(255,255,255,0.4)',
        background:isLight?'rgba(255,255,255,0.7)':'rgba(0,0,0,0.4)', padding:'2px 6px', borderRadius:4 }}>
        © OpenStreetMap · CARTO · TomTom
      </div>

      {/* ── Live Stats Strip (top-left below legend) ─────────────────────── */}
      <div style={{ position:'absolute', top:76, left:16, zIndex:999, display:'flex', flexDirection:'column', gap:8 }}>
        {/* Traffic legend */}
        <div style={{ background:'rgba(255,255,255,0.93)', backdropFilter:'blur(8px)', borderRadius:10,
          padding:'8px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:700, color:'#333', marginBottom:5, letterSpacing:'0.06em' }}>TRAFFIC FLOW</div>
          {[['Low','#22c55e'],['Medium','#f59e0b'],['High','#ef4444']].map(([l,c])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, fontSize:'0.72rem', color:'#444' }}>
              <div style={{ width:26, height:5, borderRadius:4, background:c }} />{l}
            </div>
          ))}
        </div>

        {/* Live stats card */}
        <div style={{ background:'rgba(255,255,255,0.93)', backdropFilter:'blur(8px)', borderRadius:10,
          padding:'10px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', minWidth:120 }}>
          <div style={{ fontSize:'0.65rem', fontWeight:700, color:'#333', marginBottom:8, letterSpacing:'0.06em' }}>AREA STATUS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:COLOR[congLevel], animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:'0.78rem', fontWeight:700, color:COLOR[congLevel] }}>{congLevel} Congestion</span>
            </div>
            <div style={{ fontSize:'0.72rem', color:'#666' }}>
              <span style={{ fontWeight:600, color:'#333' }}>{congPct}%</span> congested
            </div>
            {incidents.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}
                onClick={() => { setTab('incidents'); setPanelOpen(true); }}>
                <AlertTriangle size={11} color="#ef4444" />
                <span style={{ fontSize:'0.72rem', color:'#ef4444', fontWeight:600 }}>
                  {incidents.length} incident{incidents.length>1?'s':''}
                </span>
              </div>
            )}
            <div style={{ fontSize:'0.65rem', color:'#aaa' }}>
              {trafficSrc === 'tomtom' ? '🟢 TomTom Live' : '🟡 Heuristic'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right-side badges ────────────────────────────────────────────── */}
      <div style={{ position:'absolute', top:76, right:16, zIndex:999 }}>
        <div style={{ background:'rgba(255,255,255,0.93)', backdropFilter:'blur(8px)', borderRadius:8,
          padding:'5px 10px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:trafficOn?'#22c55e':'#94a3b8',
            animation:trafficOn?'pulse 2s infinite':'none' }} />
          <span style={{ fontSize:'0.68rem', fontWeight:600, color:'#444' }}>
            {trafficOn ? 'Traffic Live' : 'Traffic Off'}
          </span>
        </div>
      </div>

      {/* ── User flow card (when user is located) ───────────────────────── */}
      {userFlow && (
        <div style={{ position:'absolute', bottom:panelOpen?262:80, left:16, zIndex:990,
          background:'rgba(255,255,255,0.97)', backdropFilter:'blur(12px)', borderRadius:14,
          padding:'12px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.18)', minWidth:180,
          borderLeft:`4px solid ${COLOR[userFlow.level]}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <Car size={14} color={COLOR[userFlow.level]} />
            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#333', letterSpacing:'0.04em' }}>
              {searchedLocation ? searchedLocation.label.toUpperCase().slice(0, 18) : 'YOUR ROAD'}
            </span>
          </div>
          <div style={{ fontSize:'1.6rem', fontWeight:800, color:COLOR[userFlow.level], lineHeight:1, marginBottom:2 }}>
            {userFlow.currentSpeed} <span style={{ fontSize:'0.8rem', fontWeight:500, color:'#888' }}>km/h</span>
          </div>
          <div style={{ fontSize:'0.72rem', color:'#888', marginBottom:8 }}>
            Free-flow: {userFlow.freeFlowSpeed} km/h
          </div>
          <div style={{ height:5, borderRadius:3, background:'#f1f5f9', overflow:'hidden' }}>
            <div style={{ width:`${Math.round(userFlow.speed_ratio*100)}%`, height:'100%',
              background:`linear-gradient(90deg, ${COLOR[userFlow.level]}, ${COLOR[userFlow.level]}aa)`,
              borderRadius:3, transition:'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize:'0.68rem', color:'#666', marginTop:4 }}>
            {Math.round(userFlow.speed_ratio*100)}% of normal speed
          </div>
          {userFlow.roadClosure && (
            <div style={{ marginTop:8, padding:'4px 8px', borderRadius:6,
              background:'#ef444412', border:'1px solid #ef444440' }}>
              <span style={{ fontSize:'0.75rem', color:'#ef4444', fontWeight:700 }}>🚫 Road Closure Ahead</span>
            </div>
          )}
        </div>
      )}

      {/* ── Search Bar ───────────────────────────────────────────────────── */}
      <div style={{ position:'absolute', top:16, left:16, right:60, zIndex:1000 }}>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 16px rgba(0,0,0,0.18)',
          display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
          <Search size={18} color="#666" style={{ flexShrink:0 }} />
          <input value={searchQuery} onChange={e=>handleSearch(e.target.value)}
            placeholder="Search anywhere — city, address, landmark…"
            style={{ flex:1, border:'none', outline:'none', fontSize:'0.92rem', color:'#222',
              background:'transparent', fontFamily:'Inter,sans-serif' }} />
          {searchQuery && <button onClick={()=>{
              setSearchQuery(''); setSearchResults([]); setSearchMarker(null);
              setSearchedLocation(null); setIncidents([]); setUserFlow(null);
              // Reload GPS-based data if we have location
              if (userLocation) {
                fetchIncidents(userLocation[0], userLocation[1]);
                fetchUserFlow(userLocation[0], userLocation[1]);
              }
            }}
            style={{ border:'none', background:'none', cursor:'pointer', padding:0 }}><X size={16} color="#999" /></button>}
          {searchLoading && <div style={{ width:16, height:16, border:'2px solid #e0e0e0', borderTop:'2px solid #1a73e8',
            borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />}
        </div>
        {searchResults.length > 0 && (
          <div style={{ background:'#fff', borderRadius:12, marginTop:6,
            boxShadow:'0 4px 24px rgba(0,0,0,0.14)', overflow:'hidden' }}>
            {searchResults.map((r,i) => (
              <div key={i} onClick={()=>selectResult(r)}
                style={{ padding:'11px 14px', cursor:'pointer', borderBottom:i<searchResults.length-1?'1px solid #f0f0f0':'none',
                  fontSize:'0.88rem', color:'#222', display:'flex', gap:10, alignItems:'flex-start' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <span style={{ fontSize:'1rem', flexShrink:0 }}>📍</span>
                <div>
                  <div style={{ fontWeight:500 }}>{r.display_name.split(',').slice(0,2).join(', ')}</div>
                  <div style={{ fontSize:'0.72rem', color:'#999', marginTop:2 }}>{r.display_name.split(',').slice(2,4).join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Top-right controls ───────────────────────────────────────────── */}
      <div style={{ position:'absolute', top:16, right:16, zIndex:1000, display:'flex', flexDirection:'column', gap:8 }}>
        {/* Layer picker */}
        <div style={{ position:'relative' }}>
          <button onClick={()=>setLayerOpen(o=>!o)}
            style={{ width:42, height:42, borderRadius:12, background:'#fff', border:'none', cursor:'pointer',
              boxShadow:'0 2px 10px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Layers size={18} color="#444" />
          </button>
          {layerOpen && (
            <div style={{ position:'absolute', top:50, right:0, background:'#fff', borderRadius:14,
              boxShadow:'0 8px 32px rgba(0,0,0,0.16)', padding:8, width:168 }}>
              <div style={{ fontSize:'0.68rem', color:'#aaa', fontWeight:700, padding:'4px 8px', letterSpacing:'0.06em' }}>MAP STYLE</div>
              {[['standard','🗺️ Standard'],['satellite','🛰️ Satellite'],['dark','🌙 Dark Mode']].map(([k,l])=>(
                <div key={k} onClick={()=>{setMapStyle(k);setLayerOpen(false);}}
                  style={{ padding:'8px 12px', borderRadius:8, cursor:'pointer', fontSize:'0.85rem',
                    fontWeight:mapStyle===k?700:400, color:mapStyle===k?'#1a73e8':'#333',
                    background:mapStyle===k?'#e8f0fe':'transparent' }}>{l}</div>
              ))}
              <div style={{ height:1, background:'#f0f0f0', margin:'6px 4px' }} />
              <div style={{ fontSize:'0.68rem', color:'#aaa', fontWeight:700, padding:'4px 8px', letterSpacing:'0.06em' }}>OVERLAYS</div>
              <div onClick={()=>{setTrafficOn(t=>!t);setLayerOpen(false);}}
                style={{ padding:'8px 12px', borderRadius:8, cursor:'pointer', fontSize:'0.85rem',
                  fontWeight:trafficOn?700:400, color:trafficOn?'#1a73e8':'#333',
                  background:trafficOn?'#e8f0fe':'transparent', display:'flex', alignItems:'center', gap:6 }}>
                <span>🚦</span> Traffic {trafficOn?'(On)':'(Off)'}
              </div>
            </div>
          )}
        </div>
        {/* Locate me */}
        <button onClick={locateUser}
          style={{ width:42, height:42, borderRadius:12, background:'#fff', border:'none', cursor:'pointer',
            boxShadow:'0 2px 10px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {locating
            ? <div style={{ width:16, height:16, border:'2px solid #ddd', borderTop:'2px solid #1a73e8', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            : <Locate size={18} color={userLocation?'#1a73e8':'#444'} />}
        </button>
        {/* Refresh */}
        <button onClick={()=>{ fetchTrafficFlow(); if(userLocation) { fetchIncidents(userLocation[0],userLocation[1]); fetchUserFlow(userLocation[0],userLocation[1]); }}}
          style={{ width:42, height:42, borderRadius:12, background:'#fff', border:'none', cursor:'pointer',
            boxShadow:'0 2px 10px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <RefreshCw size={16} color="#444" />
        </button>
      </div>

      {/* ── Panel Toggle ─────────────────────────────────────────────────── */}
      <button onClick={()=>setPanelOpen(o=>!o)}
        style={{ position:'absolute', bottom:panelOpen?255:82, left:'50%', transform:'translateX(-50%)',
          zIndex:1010, background:'#fff', border:'none', borderRadius:20, padding:'6px 18px',
          boxShadow:'0 2px 12px rgba(0,0,0,0.18)', cursor:'pointer', display:'flex', alignItems:'center',
          gap:6, fontSize:'0.8rem', color:'#333', fontWeight:600, transition:'bottom 0.3s ease' }}>
        {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        {panelOpen ? 'Hide Panel' : 'Show Panel'}
      </button>

      {/* ── Bottom Panel ─────────────────────────────────────────────────── */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:1000,
        background:'#fff', borderTop:'1px solid #e8eaed', borderRadius:'20px 20px 0 0',
        padding:'12px 16px 16px', transform:panelOpen?'translateY(0)':'translateY(100%)',
        transition:'transform 0.35s cubic-bezier(0.4,0,0.2,1)', maxHeight:265, overflowY:'auto' }}>

        <div style={{ width:40, height:4, borderRadius:2, background:'#e0e0e0', margin:'0 auto 14px' }} />

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[
            ['predict', <TrendingUp size={13}/>, 'Predict'],
            ['route',   <Navigation size={13}/>, 'Route'],
            ['incidents', <AlertTriangle size={13}/>, `Incidents${incidents.length?` · ${incidents.length}`:''}`],
          ].map(([key, icon, label]) => (
            <button key={key} onClick={()=>setTab(key)}
              style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'none', cursor:'pointer',
                fontSize:'0.78rem', fontWeight:600, fontFamily:'Inter,sans-serif',
                background:tab===key?'#e8f0fe':'#f5f5f5', color:tab===key?'#1a73e8':'#777',
                display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                transition:'all 0.15s' }}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── Predict Tab ──────────────────────────────────────────────── */}
        {tab === 'predict' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:'0.68rem', color:'#888', display:'block', marginBottom:3 }}>⏰ Hour (0–23)</label>
                <input type="number" min="0" max="23" value={timeOfDay} onChange={e=>setTimeOfDay(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e0e0e0', borderRadius:8,
                    fontSize:'0.9rem', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:'0.68rem', color:'#888', display:'block', marginBottom:3 }}>🌤️ Weather</label>
                <select value={weather} onChange={e=>setWeather(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e0e0e0', borderRadius:8,
                    fontSize:'0.9rem', outline:'none', fontFamily:'Inter,sans-serif' }}>
                  <option value={0}>Clear</option>
                  <option value={1}>Rain</option>
                  <option value={2}>Snow/Fog</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.68rem', color:'#888', display:'block', marginBottom:3 }}>🛣️ Road Type</label>
                <select value={roadType} onChange={e=>setRoadType(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e0e0e0', borderRadius:8,
                    fontSize:'0.9rem', outline:'none', fontFamily:'Inter,sans-serif' }}>
                  <option value={0}>Highway</option>
                  <option value={1}>Urban</option>
                  <option value={2}>Residential</option>
                </select>
              </div>
            </div>
            {prediction && (
              <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:10,
                background:`${predColor}12`, border:`1px solid ${predColor}35`,
                display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:predColor }} />
                <span style={{ fontSize:'0.88rem', fontWeight:600, color:'#222' }}>
                  AI Prediction: <span style={{ color:predColor }}>{prediction} Congestion</span>
                </span>
                {userFlow && (
                  <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#888' }}>
                    Live: {userFlow.currentSpeed} km/h
                  </span>
                )}
              </div>
            )}
            <button onClick={predictCongestion} disabled={predLoading}
              style={{ width:'100%', padding:'10px', borderRadius:10, border:'none',
                background:'linear-gradient(135deg,#1a73e8,#0d5cbf)', color:'#fff',
                fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:'Inter,sans-serif',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Zap size={15} /> {predLoading ? 'Analysing…' : 'Predict with AI'}
            </button>
          </div>
        )}

        {/* ── Route Tab ────────────────────────────────────────────────── */}
        {tab === 'route' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
              <div style={{ padding:'12px', borderRadius:12, background:'#e8f5e9', border:'1px solid #a5d6a7' }}>
                <div style={{ fontSize:'0.65rem', color:'#666', marginBottom:4, fontWeight:700 }}>FASTEST</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <strong style={{ fontSize:'0.88rem', color:'#1b5e20' }}>Via I-42 North</strong>
                  <span style={{ color:'#22c55e', fontWeight:800, fontSize:'0.95rem' }}>{eta??22} min</span>
                </div>
                <div style={{ fontSize:'0.72rem', color:'#666', marginTop:2 }}>3 congestion zones bypassed</div>
              </div>
              <div style={{ padding:'12px', borderRadius:12, background:'#fef3c7', border:'1px solid #fcd34d' }}>
                <div style={{ fontSize:'0.65rem', color:'#666', marginBottom:4, fontWeight:700 }}>ALTERNATE</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <strong style={{ fontSize:'0.88rem', color:'#78350f' }}>Via 5th Ave</strong>
                  <span style={{ color:'#f59e0b', fontWeight:800, fontSize:'0.95rem' }}>38 min</span>
                </div>
                <div style={{ fontSize:'0.72rem', color:'#666', marginTop:2 }}>High congestion detected</div>
              </div>
            </div>
            {userFlow && (
              <div style={{ padding:'10px 12px', borderRadius:10, marginBottom:10,
                background:`${COLOR[userFlow.level]}10`, border:`1px solid ${COLOR[userFlow.level]}30`,
                display:'flex', alignItems:'center', gap:8 }}>
                <Radio size={13} color={COLOR[userFlow.level]} />
                <span style={{ fontSize:'0.82rem', color:'#333' }}>
                  Your road: <strong style={{ color:COLOR[userFlow.level] }}>{userFlow.currentSpeed} km/h</strong>
                  {' '}({Math.round(userFlow.speed_ratio*100)}% of free-flow)
                </span>
              </div>
            )}
            <button onClick={fetchRoute}
              style={{ width:'100%', padding:'10px', borderRadius:10, border:'1px solid #e0e0e0',
                background:'#fff', color:'#444', fontWeight:600, fontSize:'0.9rem', cursor:'pointer',
                fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <RefreshCw size={14} /> Refresh Routes
            </button>
          </div>
        )}

        {/* ── Incidents Tab ─────────────────────────────────────────────── */}
        {tab === 'incidents' && (
          <div>
            {/* Location context pill */}
            {(searchedLocation || userLocation) && (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'6px 10px',
                borderRadius:20, background:'#e8f0fe', border:'1px solid #c5d8fb', width:'fit-content' }}>
                <span style={{ fontSize:'0.9rem' }}>{searchedLocation ? '🔍' : '📍'}</span>
                <span style={{ fontSize:'0.75rem', fontWeight:600, color:'#1a73e8' }}>
                  {searchedLocation ? searchedLocation.label : 'Your Location'}
                </span>
              </div>
            )}

            {incLoading ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'20px 0' }}>
                <div style={{ width:18, height:18, border:'2px solid #e0e0e0', borderTop:'2px solid #1a73e8', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                <span style={{ color:'#888', fontSize:'0.85rem' }}>Fetching live incidents…</span>
              </div>
            ) : incidents.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <Shield size={32} color="#22c55e" style={{ margin:'0 auto 8px' }} />
                <p style={{ color:'#444', fontSize:'0.88rem', marginBottom:4, fontWeight:600 }}>
                  No incidents found
                </p>
                <p style={{ color:'#aaa', fontSize:'0.75rem' }}>
                  {searchedLocation
                    ? `All clear near ${searchedLocation.label}`
                    : userLocation ? 'All clear in your area' : 'Search a place or tap locate'}
                </p>
                {!userLocation && !searchedLocation && (
                  <button onClick={locateUser} style={{ marginTop:10, padding:'8px 20px', borderRadius:20,
                    background:'#1a73e8', border:'none', color:'#fff', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                    Locate Me
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {/* Summary */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {highInc>0 && (
                    <div style={{ padding:'4px 10px', borderRadius:20, background:'#ef444412', border:'1px solid #ef444430',
                      fontSize:'0.72rem', fontWeight:700, color:'#ef4444' }}>
                      {highInc} Major
                    </div>
                  )}
                  <div style={{ padding:'4px 10px', borderRadius:20, background:'#f59e0b12', border:'1px solid #f59e0b30',
                    fontSize:'0.72rem', fontWeight:700, color:'#f59e0b' }}>
                    {incidents.length} Total
                  </div>
                  {incSrc === 'tomtom' && (
                    <div style={{ padding:'4px 10px', borderRadius:20, background:'#22c55e12', border:'1px solid #22c55e30',
                      fontSize:'0.72rem', fontWeight:700, color:'#22c55e' }}>
                      TomTom Live
                    </div>
                  )}
                </div>
                {/* Incident list */}
                {incidents.slice(0,6).map((inc,i) => {
                  const m = INCIDENT_META[inc.category] || INCIDENT_META[0];
                  return (
                    <div key={inc.id||i}
                      onClick={()=>setFlyTo([inc.lat,inc.lon])}
                      style={{ display:'flex', gap:10, padding:'10px 12px', borderRadius:10,
                        background:`${m.color}08`, border:`1px solid ${m.color}22`,
                        cursor:'pointer', alignItems:'flex-start' }}
                      onMouseEnter={e=>e.currentTarget.style.background=`${m.color}14`}
                      onMouseLeave={e=>e.currentTarget.style.background=`${m.color}08`}>
                      <span style={{ fontSize:'1.1rem', flexShrink:0, lineHeight:1.4 }}>{m.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight:700, fontSize:'0.82rem', color:m.color }}>{m.label}</span>
                          {inc.delay_minutes > 0 && (
                            <span style={{ fontSize:'0.72rem', color:'#ef4444', fontWeight:700 }}>+{inc.delay_minutes}m</span>
                          )}
                        </div>
                        <p style={{ fontSize:'0.78rem', color:'#555', margin:'2px 0', lineHeight:1.4,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {inc.description}
                        </p>
                        {inc.from && (
                          <span style={{ fontSize:'0.7rem', color:'#aaa' }}>{inc.from}{inc.to?` → ${inc.to}`:''}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
};

export default MapArea;
