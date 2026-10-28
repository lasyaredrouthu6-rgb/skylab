import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, ChevronsUp, Download, FileCheck, Film, Info, MapPin, Navigation, Plus, RefreshCw, Save, Trash2, XCircle, X } from 'lucide-react';
import { Config, DISCLAIMER, Drone, ExportPlan, MODE_INFO, Mode, Plan, SEQ_MODES, Waypoint, Warning } from '../lib/flight';
import { CATS } from '../lib/drones';
import { NumField, Section } from './ui';

export function DroneSelector({ drones, cat, setCat, sel, onSelect }: { drones: Drone[]; cat: string; setCat: (c: string) => void; sel: string; onSelect: (id: string) => void }) {
  return (
    <Section title="Drone">
      <div className="chips">{CATS.map(([k, n]) => <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{n}</button>)}</div>
      <div className="list">
        {drones.filter(d => cat === 'all' || d.category === cat).map(d => (
          <button key={d.id} className={'row-btn' + (sel === d.id ? ' on' : '')} onClick={() => onSelect(d.id)}>
            <span>{d.name}</span><small>{d.flightMin} min · {d.maxSpeed} m/s</small>
          </button>))}
      </div>
    </Section>
  );
}

export function DroneSpecifications({ drone, cfg, onCustom }: { drone: Drone; cfg: Config; onCustom: (p: Partial<Drone>) => void }) {
  const custom = drone.category === 'custom';
  const kv = (rows: [string, string][]) => <dl className="kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
  return (
    <Section title="Specifications">
      <p className="note">{custom ? 'Your own values. Not verified.' : 'Illustrative generic profile, not a verified product specification.'}</p>
      <h4>Rated (profile)</h4>
      {kv([['Max flight time', `${drone.flightMin} min`], ['Rated range', `${drone.ratedRange} m`], ['Profile max altitude', `${drone.maxAlt} m`], ['Top speed', `${drone.maxSpeed} m/s`], ['Camera', drone.camera ? 'Yes' : 'No'], ['Battery', drone.battery ? `${drone.battery} Wh` : 'Not specified']])}
      <h4>Your configured limits</h4>
      {kv([['Operating radius', `${cfg.maxRadius} m`], ['Altitude limit', `${cfg.altLimit} m`], ['Min separation', `${cfg.minSep} m`], ['Flight speed', `${cfg.speed} m/s`]])}
      {custom && <>
        <h4>Edit custom drone</h4>
        <NumField label="Flight time" value={drone.flightMin} min={1} max={180} unit="min" onChange={v => onCustom({ flightMin: v })} />
        <NumField label="Rated range" value={drone.ratedRange} min={50} max={50000} step={50} unit="m" onChange={v => onCustom({ ratedRange: v })} />
        <NumField label="Max altitude" value={drone.maxAlt} min={5} max={1000} unit="m" onChange={v => onCustom({ maxAlt: v })} />
        <NumField label="Top speed" value={drone.maxSpeed} min={1} max={100} unit="m/s" onChange={v => onCustom({ maxSpeed: v })} />
        <NumField label="Battery (0 = unknown)" value={drone.battery ?? 0} min={0} max={2000} unit="Wh" onChange={v => onCustom({ battery: v || null })} />
        <label className="check"><input type="checkbox" checked={drone.camera} onChange={e => onCustom({ camera: e.target.checked })} /> Has camera</label>
      </>}
    </Section>
  );
}

const ICONS: Record<Mode, JSX.Element> = { front: <ArrowDown size={18} />, behind: <ArrowUp size={18} />, overhead: <ChevronsUp size={18} />, left: <ArrowLeft size={18} />, right: <ArrowRight size={18} />, orbit: <RefreshCw size={18} />, follow: <Navigation size={18} />, custom: <MapPin size={18} />, cinematic: <Film size={18} /> };
export function FlightModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <Section title="Flight mode">
      <div className="modes">{(Object.keys(MODE_INFO) as Mode[]).map(m => (
        <button key={m} className={'mode' + (mode === m ? ' on' : '')} onClick={() => onChange(m)}>{ICONS[m]}<span>{MODE_INFO[m].label}</span></button>))}</div>
      <p className="note">{MODE_INFO[mode].desc}</p>
    </Section>
  );
}

const REL: Record<Mode, string[]> = {
  front: ['distance', 'routeLength'], behind: ['distance', 'routeLength'], left: ['distance', 'routeLength'], right: ['distance', 'routeLength'],
  overhead: ['offset', 'routeLength'], orbit: ['orbitRadius', 'rotations', 'dir', 'startAngle'], follow: ['followDistance', 'followAngle', 'targetSpeed', 'routeLength'], custom: [],
  cinematic: ['distance', 'routeLength', 'offset', 'orbitRadius', 'rotations', 'dir', 'startAngle'],
};
export function FlightControls({ cfg, set, mode, plan }: { cfg: Config; set: (p: Partial<Config>) => void; mode: Mode; plan: Plan }) {
  const on = (k: keyof Config) => (v: number) => set({ [k]: v } as Partial<Config>);
  const off = (k: string) => !REL[mode].includes(k);
  const minDur = Math.ceil(plan.length / 60) || 1, maxDur = Math.max(minDur + 1, Math.floor(plan.length / 0.5));
  const [add, setAdd] = useState<Mode>('orbit');
  return (
    <Section title="Flight controls">
      <NumField label="Flight height" value={cfg.height} min={1} max={500} step={0.5} unit="m" onChange={on('height')} hint="Vertical height above ground" />
      <NumField label="Horizontal distance" value={cfg.distance} min={1} max={500} unit="m" onChange={on('distance')} disabled={off('distance')} hint="Distance from the person (ground plane)" />
      <NumField label="Overhead offset" value={cfg.offset} min={-100} max={100} unit="m" onChange={on('offset')} disabled={off('offset')} />
      <NumField label="Route distance" value={cfg.routeLength} min={5} max={5000} step={5} unit="m" onChange={on('routeLength')} disabled={off('routeLength')} hint="Approach / pass / walking-path length. Orbit and custom routes are derived." />
      <NumField label="Orbit radius" value={cfg.orbitRadius} min={2} max={500} unit="m" onChange={on('orbitRadius')} disabled={off('orbitRadius')} />
      <NumField label="Orbit rotations" value={cfg.rotations} min={0.25} max={10} step={0.25} unit="×" onChange={on('rotations')} disabled={off('rotations')} />
      <NumField label="Start angle" value={cfg.startAngle} min={0} max={359} unit="°" onChange={on('startAngle')} disabled={off('startAngle')} hint="0° = in front of the person" />
      <div className={'nf' + (off('dir') ? ' off' : '')}><div className="nf-top"><label>Orbit direction</label>
        <div className="chips"><button className={'chip' + (cfg.clockwise ? ' on' : '')} disabled={off('dir')} onClick={() => set({ clockwise: true })}>Clockwise</button>
          <button className={'chip' + (!cfg.clockwise ? ' on' : '')} disabled={off('dir')} onClick={() => set({ clockwise: false })}>Counter-clockwise</button></div></div></div>
      <NumField label="Follow distance" value={cfg.followDistance} min={2} max={200} unit="m" onChange={on('followDistance')} disabled={off('followDistance')} />
      <NumField label="Follow angle" value={cfg.followAngle} min={0} max={359} unit="°" onChange={on('followAngle')} disabled={off('followAngle')} hint="0° behind, 90° side, 180° in front of the target" />
      <NumField label="Target speed" value={cfg.targetSpeed} min={0.2} max={10} step={0.1} unit="m/s" onChange={on('targetSpeed')} disabled={off('targetSpeed')} hint="Follow mode flies at this speed" />
      <NumField label="Flight speed" value={cfg.speed} min={0.5} max={60} step={0.5} unit="m/s" onChange={on('speed')} disabled={mode === 'follow'} />
      <NumField label="Flight duration" value={Math.min(maxDur, Math.max(minDur, Math.round(plan.duration)))} min={minDur} max={maxDur} unit="s" disabled={mode === 'follow'}
        onChange={v => set({ speed: Math.min(60, Math.max(0.5, +(plan.length / v).toFixed(2))) })} hint="Approximate: route length ÷ speed. Editing it changes speed." />
      {mode === 'cinematic' && <div className="seq"><h4>Sequence</h4>
        <div className="chips">{cfg.sequence.map((m, i) => <span key={i} className="chip on">{MODE_INFO[m].label}<button aria-label="Remove step" onClick={() => set({ sequence: cfg.sequence.filter((_, j) => j !== i) })}><X size={12} /></button></span>)}</div>
        <div className="chips"><select value={add} onChange={e => setAdd(e.target.value as Mode)}>{SEQ_MODES.map(m => <option key={m} value={m}>{MODE_INFO[m].label}</option>)}</select>
          <button className="btn" onClick={() => set({ sequence: [...cfg.sequence, add] })}><Plus size={14} />Add step</button></div></div>}
      <h4>Safety limits</h4>
      <NumField label="Operating radius" value={cfg.maxRadius} min={10} max={5000} step={5} unit="m" onChange={on('maxRadius')} hint="Geofence around the person" />
      <NumField label="Altitude limit" value={cfg.altLimit} min={5} max={500} unit="m" onChange={on('altLimit')} />
      <NumField label="Min separation" value={cfg.minSep} min={0} max={50} step={0.5} unit="m" onChange={on('minSep')} hint="Closest allowed distance to the person" />
    </Section>
  );
}

export function WaypointEditor({ wps, setWps, addMode, setAddMode }: { wps: Waypoint[]; setWps: (w: Waypoint[]) => void; addMode: boolean; setAddMode: (b: boolean) => void }) {
  const cl = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const edit = (i: number, k: keyof Waypoint, raw: string) => { const n = Number(raw); if (raw === '' || !Number.isFinite(n)) return; setWps(wps.map((w, j) => j === i ? { ...w, [k]: cl(n, k === 'y' ? 0 : -1000, 1000) } : w)); };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= wps.length) return; const c = [...wps];[c[i], c[j]] = [c[j], c[i]]; setWps(c); };
  return (
    <Section title="Waypoints">
      <div className="chips">
        <button className="btn" onClick={() => { const l = wps[wps.length - 1] ?? { x: 0, y: 10, z: 0 }; setWps([...wps, { x: l.x + 5, y: l.y, z: l.z + 5 }]); }}><Plus size={14} />Add</button>
        <button className={'btn' + (addMode ? ' on' : '')} onClick={() => setAddMode(!addMode)}>{addMode ? 'Click ground: ON' : 'Click to place'}</button>
        <button className="btn" onClick={() => setWps([])}>Clear</button>
      </div>
      <p className="note">X / Z are horizontal metres from the person, Y is height (0 to 1000 m, X/Z ±1000 m).</p>
      {wps.map((w, i) => (
        <div className="wp" key={i}><b>{i + 1}</b>
          {(['x', 'y', 'z'] as const).map(k => <label key={k}>{k.toUpperCase()}<input type="number" value={w[k]} step={1} onChange={e => edit(i, k, e.target.value)} /></label>)}
          <button aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={14} /></button><button aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
          <button aria-label="Remove waypoint" onClick={() => setWps(wps.filter((_, j) => j !== i))}><Trash2 size={14} /></button></div>))}
    </Section>
  );
}

export function SafetyWarnings({ warnings }: { warnings: Warning[] }) {
  const ic = { error: <XCircle size={16} />, warn: <AlertTriangle size={16} />, info: <CheckCircle2 size={16} /> };
  return (
    <Section title="Safety & validation">
      {warnings.map((w, i) => <div key={i} className={'warn ' + w.level}>{w.level === 'info' && !/Within/.test(w.text) ? <Info size={16} /> : ic[w.level]}<span>{w.text}</span></div>)}
      <p className="note">{DISCLAIMER}</p>
    </Section>
  );
}

export function FlightPlanManager({ generated, onGenerate, onSave, onExport }: { generated: ExportPlan | null; onGenerate: () => void; onSave: (n: string) => void; onExport: () => void }) {
  const [name, setName] = useState('My flight plan');
  return (
    <Section title="Flight plan">
      <button className="btn pri wide" onClick={onGenerate}><FileCheck size={16} />Generate flight plan</button>
      {generated && <div className="gen"><p className="note">{generated.waypoints.length} waypoints · {generated.routeLengthM} m · ~{generated.estimatedDurationS} s · {generated.warnings.filter(w => w.level !== 'info').length} warnings</p>
        <div className="wlist">{generated.waypoints.map((p, i) => <span key={i}>{i + 1}: {p.map(v => v.toFixed(1)).join(', ')}</span>)}</div></div>}
      <input className="txt" value={name} maxLength={60} onChange={e => setName(e.target.value)} aria-label="Plan name" />
      <div className="chips"><button className="btn" onClick={() => onSave(name.trim() || 'Untitled plan')}><Save size={14} />Save locally</button><button className="btn" onClick={onExport}><Download size={14} />Export JSON</button></div>
    </Section>
  );
}
