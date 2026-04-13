import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Play, RotateCcw, Zap, Clock, Route, ChevronRight, TrendingDown } from 'lucide-react';

// Same graph as the backend for visualization
const NODES = {
  A: { name: 'Downtown',    x: 30,  y: 140 },
  B: { name: 'Harbor Br.',  x: 110, y: 70  },
  C: { name: 'West Hwy',   x: 210, y: 40  },
  D: { name: 'Midtown',    x: 210, y: 140 },
  E: { name: 'Business',   x: 305, y: 90  },
  F: { name: 'North Gate', x: 305, y: 20  },
};

const EDGES = [
  { from: 'A', to: 'B', dist: 2.1, cw: 1.0 },
  { from: 'A', to: 'D', dist: 3.5, cw: 1.8 },
  { from: 'B', to: 'C', dist: 1.8, cw: 0.5 },
  { from: 'B', to: 'D', dist: 2.4, cw: 1.5 },
  { from: 'C', to: 'E', dist: 2.2, cw: 0.6 },
  { from: 'C', to: 'F', dist: 3.1, cw: 0.4 },
  { from: 'D', to: 'E', dist: 1.9, cw: 1.4 },
  { from: 'E', to: 'F', dist: 1.3, cw: 0.8 },
];

function dijkstra(start, end) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  Object.keys(NODES).forEach(n => { dist[n] = Infinity; prev[n] = null; });
  dist[start] = 0;
  const pq = [{ cost: 0, node: start }];
  const steps = [];

  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const { cost, node } = pq.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    steps.push({ visiting: node, dist: { ...dist }, visited: new Set(visited) });
    if (node === end) break;
    EDGES.forEach(e => {
      const neighbor = e.from === node ? e.to : e.to === node ? e.from : null;
      if (!neighbor || visited.has(neighbor)) return;
      const edgeCost = e.dist + e.cw;
      const nc = cost + edgeCost;
      if (nc < dist[neighbor]) {
        dist[neighbor] = nc;
        prev[neighbor] = node;
        pq.push({ cost: nc, node: neighbor });
      }
    });
  }

  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return { path, dist, steps };
}

const CONG_COLOR = (cw) => cw >= 1.5 ? '#ef4444' : cw >= 0.9 ? '#facc15' : '#4ade80';

const RouteOptimizerPage = () => {
  const [start, setStart] = useState('A');
  const [end, setEnd] = useState('F');
  const [result, setResult] = useState(null);
  const [animStep, setAnimStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const timerRef = useRef(null);

  const runDijkstra = () => {
    if (start === end) return;
    const res = dijkstra(start, end);
    setResult(res);
    setAnimStep(0);
    setRunning(true);
  };

  useEffect(() => {
    if (!running || !result) return;
    if (animStep >= result.steps.length) {
      setRunning(false);
      // Fetch backend route too
      fetch(`http://localhost:5000/api/route?start=${start}&end=${end}`)
        .then(r => r.json()).then(setApiResult).catch(() => {});
      return;
    }
    timerRef.current = setTimeout(() => setAnimStep(s => s + 1), 350);
    return () => clearTimeout(timerRef.current);
  }, [running, animStep, result]);

  const reset = () => {
    clearTimeout(timerRef.current);
    setResult(null);
    setAnimStep(-1);
    setRunning(false);
    setApiResult(null);
  };

  const currentStep = result && animStep > 0 ? result.steps[Math.min(animStep - 1, result.steps.length - 1)] : null;
  const visitedNodes = currentStep ? currentStep.visited : new Set();
  const finalPath = !running && result ? result.path : [];
  const W = 380, H = 200;

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="section-title">Route Optimizer</h1>
        <p className="section-subtitle">Dijkstra A* shortest-path with live congestion weights</p>
      </div>

      {/* Controls */}
      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Node</label>
          <select value={start} onChange={e => { setStart(e.target.value); reset(); }} className="input-field" style={{ padding: '10px 12px' }}>
            {Object.entries(NODES).map(([id, n]) => <option key={id} value={id}>{id} — {n.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End Node</label>
          <select value={end} onChange={e => { setEnd(e.target.value); reset(); }} className="input-field" style={{ padding: '10px 12px' }}>
            {Object.entries(NODES).map(([id, n]) => <option key={id} value={id}>{id} — {n.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={runDijkstra} disabled={running || start === end}>
          <Play size={16} /> {running ? 'Running...' : 'Run Dijkstra'}
        </button>
        <button className="btn-ghost" onClick={reset} style={{ padding: '10px 16px' }}><RotateCcw size={16} /></button>
      </div>

      {/* Graph Canvas */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Edge color = congestion level · Green (low) → Red (high)
          </p>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: 300 }}>
            {/* Edges */}
            {EDGES.map((e, i) => {
              const A = NODES[e.from], B = NODES[e.to];
              const inFinalPath = finalPath.includes(e.from) && finalPath.includes(e.to) &&
                Math.abs(finalPath.indexOf(e.from) - finalPath.indexOf(e.to)) === 1;
              return (
                <g key={i}>
                  <line
                    x1={A.x + 22} y1={A.y + 22} x2={B.x + 22} y2={B.y + 22}
                    stroke={inFinalPath ? 'var(--accent-primary)' : CONG_COLOR(e.cw)}
                    strokeWidth={inFinalPath ? 4 : 2}
                    strokeOpacity={inFinalPath ? 1 : 0.45}
                    strokeDasharray={inFinalPath ? 'none' : '5 3'}
                  />
                  <text
                    x={(A.x + B.x) / 2 + 22} y={(A.y + B.y) / 2 + 18}
                    fontSize="10" fill="rgba(255,255,255,0.5)" textAnchor="middle"
                  >{e.dist}km</text>
                </g>
              );
            })}
            {/* Nodes */}
            {Object.entries(NODES).map(([id, node]) => {
              const isVisited = visitedNodes.has(id);
              const inPath = finalPath.includes(id);
              const isStart = id === start, isEnd = id === end;
              const fill = inPath ? 'var(--accent-primary)' : isVisited ? 'var(--accent-purple)' : 'var(--bg-card)';
              return (
                <g key={id}>
                  <circle
                    cx={node.x + 22} cy={node.y + 22} r={20}
                    fill={fill} stroke={isStart || isEnd ? '#fff' : 'var(--glass-border)'}
                    strokeWidth={isStart || isEnd ? 2.5 : 1}
                    style={{ transition: 'fill 0.3s ease' }}
                  />
                  <text x={node.x + 22} y={node.y + 27} fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">{id}</text>
                  <text x={node.x + 22} y={node.y + 55} fontSize="9" fill="rgba(255,255,255,0.5)" textAnchor="middle">{node.name}</text>
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {[['Optimal Path', 'var(--accent-primary)'], ['Visited', 'var(--accent-purple)'], ['Unvisited', 'var(--bg-card)']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)' }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {!running && result && (
        <div style={{ padding: '0 20px 24px' }}>
          <div className="glass-card" style={{ padding: '18px', borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Zap size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Optimal Path Found</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {result.path.map((n, i) => (
                <React.Fragment key={n}>
                  <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(34,211,238,0.15)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem' }}>{n}</span>
                  {i < result.path.length - 1 && <ChevronRight size={14} color="var(--text-muted)" />}
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Cost Score', val: result.dist[end]?.toFixed(1) },
                { label: 'Est. Time', val: apiResult ? `${apiResult.estimated_time_mins} min` : '—' },
                { label: 'Distance', val: apiResult ? `${apiResult.distance_km} km` : '—' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{s.val}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ padding: '0 20px 32px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>How the Algorithm Works</h2>
        <div className="glass-card" style={{ padding: '16px' }}>
          {[
            { step: '1', title: 'Build Weighted Graph', desc: 'Each road segment gets a cost = distance + congestion penalty factor.' },
            { step: '2', title: 'Initialize Dijkstra', desc: 'Start node gets cost 0. All others get ∞. A priority queue explores cheapest nodes first.' },
            { step: '3', title: 'Relax Edges', desc: 'For each visited node, check if neighbors can be reached at lower cost and update.' },
            { step: '4', title: 'Backtrack Path', desc: 'Once the destination is reached, trace back through "previous" pointers to get the optimal route.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--glass-border)' : 'none' }}>
              <div className="step-number">{s.step}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizerPage;
