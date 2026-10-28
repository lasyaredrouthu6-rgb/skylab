import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Download, FolderOpen, Trash2 } from 'lucide-react';
import { DEFAULT_CFG, Drone, ExportPlan, buildPlan } from '../lib/flight';
import { CATS, DRONES } from '../lib/drones';
import { Show, SimulationViewport } from './Sim';

export interface SavedPlan { id: number; name: string; savedAt: string; data: ExportPlan }

export function Landing({ onStart }: { onStart: () => void }) {
  const sim = useRef({ dist: 0, playing: true });
  const cfg = { ...DEFAULT_CFG, speed: 6, orbitRadius: 14, height: 9 };
  const plan = useMemo(() => buildPlan('orbit', cfg, []), []);
  const show: Show = { labels: false, arrows: false, geofence: false };
  return (
    <div className="hero">
      <div className="hero-t">
        <p className="eyebrow">Drone flight planning simulator</p>
        <h1>Your Drone. Your Flight. Your Perspective.</h1>
        <p className="lead">Choose your drone, design your flight, and visualize every movement in 3D.</p>
        <button className="btn pri big" onClick={onStart}>Start Planning <ArrowRight size={18} /></button>
        <p className="note">Simulation only. SkyLab does not connect to or control real drones.</p>
      </div>
      <div className="hero-v">
        <SimulationViewport demo plan={plan} drone={DRONES[0]} cfg={cfg} mode="orbit" wps={[]} sim={sim} camCmd={{ n: 0, type: '' }} followCam={false} show={show} onEnd={() => { sim.current.dist = 0; }} />
      </div>
    </div>
  );
}

const DroneIcon = ({ cat }: { cat: string }) => (
  <svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 20l24 24M44 20L20 44" /><circle cx="16" cy="16" r="8" /><circle cx="48" cy="16" r="8" /><circle cx="16" cy="48" r="8" /><circle cx="48" cy="48" r="8" />
    <rect x="26" y="26" width="12" height="12" rx="2" fill="currentColor" fillOpacity=".2" />
    {cat === 'agri' && <rect x="24" y="40" width="16" height="10" rx="3" />}{cat === 'delivery' && <rect x="25" y="41" width="14" height="10" />}
  </svg>
);

export function Library({ drones, selected, onSelect }: { drones: Drone[]; selected: string; onSelect: (id: string) => void }) {
  const [cat, setCat] = useState('all');
  return (
    <div className="page"><h2>Drone library</h2>
      <p className="note">All profiles are illustrative generic values, not verified manufacturer specifications. Use the Custom drone to enter your own.</p>
      <div className="chips">{CATS.map(([k, n]) => <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{n}</button>)}</div>
      <div className="grid">{drones.filter(d => cat === 'all' || d.category === cat).map(d => (
        <article key={d.id} className={'dcard' + (selected === d.id ? ' on' : '')}>
          <DroneIcon cat={d.category} /><h3>{d.name}</h3><small>{d.category} · illustrative</small>
          <dl className="kv">{([['Flight time', `${d.flightMin} min`], ['Rated range', `${d.ratedRange} m`], ['Max altitude', `${d.maxAlt} m`], ['Top speed', `${d.maxSpeed} m/s`], ['Camera', d.camera ? 'Yes' : 'No']] as [string, string][]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <button className="btn pri" onClick={() => onSelect(d.id)}>{d.category === 'custom' ? 'Select & edit specs' : selected === d.id ? 'Selected' : 'Select'}</button>
        </article>))}</div>
    </div>
  );
}

export function Saved({ plans, onLoad, onDelete, onExport }: { plans: SavedPlan[]; onLoad: (p: SavedPlan) => void; onDelete: (id: number) => void; onExport: (p: SavedPlan) => void }) {
  return (
    <div className="page"><h2>Saved flight plans</h2><p className="note">Stored in this browser only (localStorage). No account or cloud.</p>
      {!plans.length && <p>No saved plans yet. Generate one in the simulator and choose “Save locally”.</p>}
      {plans.map(p => (
        <div className="saved" key={p.id}><div><b>{p.name}</b><small>{p.data.drone.name} · {p.data.mode} · {p.data.routeLengthM} m · {new Date(p.savedAt).toLocaleString()}</small></div>
          <div className="chips"><button className="btn" onClick={() => onLoad(p)}><FolderOpen size={14} />Load</button><button className="btn" onClick={() => onExport(p)}><Download size={14} />JSON</button>
            <button className="btn" onClick={() => onDelete(p.id)} aria-label="Delete plan"><Trash2 size={14} /></button></div></div>))}
    </div>
  );
}

export function Settings({ show, setShow, onResetAll, onClearPlans }: { show: Show; setShow: (s: Show) => void; onResetAll: () => void; onClearPlans: () => void }) {
  const t = (k: keyof Show, l: string) => <label className="check"><input type="checkbox" checked={show[k]} onChange={e => setShow({ ...show, [k]: e.target.checked })} /> {l}</label>;
  return (
    <div className="page"><h2>Settings</h2>
      <h4>Scene overlays</h4>{t('labels', 'Distance, altitude and waypoint labels')}{t('arrows', 'Direction arrows along the path')}{t('geofence', 'Virtual geofence (operating radius and altitude)')}
      <h4>Data</h4><div className="chips"><button className="btn" onClick={onResetAll}>Reset simulator to defaults</button><button className="btn" onClick={onClearPlans}>Delete all saved plans</button></div>
      <h4>About</h4><p className="note">SkyLab is a simulator. It never connects to or controls drone hardware. Warnings are simulated checks, not legal or safety guarantees; follow local aviation rules, manufacturer instructions and privacy requirements.</p>
    </div>
  );
}
