import { useMemo, useRef, useState } from 'react';
import { Library as LibIcon, Settings as SetIcon, FolderOpen, Plane } from 'lucide-react';
import { Config, DEFAULT_CFG, DEFAULT_WPS, Drone, ExportPlan, Mode, Waypoint, buildExport, buildPlan, download, validate } from './lib/flight';
import { DRONES } from './lib/drones';
import { DroneSelector, DroneSpecifications, FlightControls, FlightModeSelector, FlightPlanManager, SafetyWarnings, WaypointEditor } from './components/Panels';
import { FlightStatistics, Show, SimulationPlayback, SimulationViewport, Tick } from './components/Sim';
import { Landing, Library, SavedPlan, Saved, Settings } from './components/Pages';

type View = 'landing' | 'sim' | 'library' | 'plans' | 'settings';
function useLS<T>(k: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : init; } catch { return init; } });
  return [v, (n: T) => { setV(n); try { localStorage.setItem(k, JSON.stringify(n)); } catch { /* storage unavailable */ } }];
}

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [drones, setDrones] = useState<Drone[]>(DRONES), [droneId, setDroneId] = useState('camera-compact'), [cat, setCat] = useState('all');
  const [mode, setMode] = useState<Mode>('orbit'), [cfg, setCfg] = useState<Config>(DEFAULT_CFG), [wps, setWps] = useState<Waypoint[]>(DEFAULT_WPS);
  const sim = useRef({ dist: 0, playing: false });
  const [playing, setPlayingS] = useState(false), [tick, setTick] = useState<Tick | null>(null);
  const [camCmd, setCamCmd] = useState({ n: 0, type: '' }), [followCam, setFollowCam] = useState(false), [addMode, setAddMode] = useState(false);
  const [show, setShow] = useLS<Show>('skylab.show', { labels: true, arrows: true, geofence: true });
  const [plans, setPlans] = useLS<SavedPlan[]>('skylab.plans', []);
  const [generated, setGenerated] = useState<ExportPlan | null>(null);

  const drone = drones.find(d => d.id === droneId)!;
  const plan = useMemo(() => buildPlan(mode, cfg, wps), [mode, cfg, wps]);
  const warnings = useMemo(() => validate(plan, drone, cfg, mode, wps), [plan, drone, cfg, mode, wps]);
  const cam = (type: string) => setCamCmd(c => ({ n: c.n + 1, type }));
  const setPlaying = (v: boolean) => { sim.current.playing = v; setPlayingS(v); };
  const patch = (p: Partial<Config>) => setCfg(c => ({ ...c, ...p }));
  const snapshot = () => buildExport(drone, mode, cfg, wps, plan, warnings);

  const play = () => { if (sim.current.dist >= plan.length - 1e-6) sim.current.dist = 0; setPlaying(true); };
  const restart = () => { sim.current.dist = 0; setTick(null); setPlaying(true); };
  const preview = () => { setPlaying(false); sim.current.dist = 0; setTick(null); cam('frame'); };
  const resetAll = () => { setPlaying(false); sim.current.dist = 0; setTick(null); setCfg(DEFAULT_CFG); setWps(DEFAULT_WPS); setMode('orbit'); setDroneId('camera-compact'); setDrones(DRONES); setGenerated(null); setFollowCam(false); setAddMode(false); cam('reset'); };
  const pickMode = (m: Mode) => { setMode(m); setPlaying(false); sim.current.dist = 0; setTick(null); if (m !== 'custom') setAddMode(false); cam('frame'); };
  const generate = () => { setGenerated(snapshot()); preview(); };
  const loadPlan = (p: SavedPlan) => {
    const d = p.data; setDrones(ds => ds.map(x => (x.id === 'custom' && d.drone.id === 'custom' ? d.drone : x))); setDroneId(d.drone.id);
    setMode(d.mode); setCfg({ ...DEFAULT_CFG, ...d.config }); setWps(d.customWaypoints); setGenerated(d); setPlaying(false); sim.current.dist = 0; setTick(null); setView('sim'); cam('frame');
  };
  const nav = (v: View, l: string, icon: JSX.Element) => <button className={'nav-b' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{icon}<span>{l}</span></button>;

  return (
    <div className="shell">
      <header className="nav">
        <button className="logo" onClick={() => setView('landing')}>SKY<b>LAB</b></button>
        {nav('sim', 'Simulator', <Plane size={16} />)}{nav('library', 'Drone library', <LibIcon size={16} />)}{nav('plans', `Saved plans${plans.length ? ' (' + plans.length + ')' : ''}`, <FolderOpen size={16} />)}{nav('settings', 'Settings', <SetIcon size={16} />)}
      </header>
      {view === 'landing' && <Landing onStart={() => setView('sim')} />}
      {view === 'library' && <Library drones={drones} selected={droneId} onSelect={id => { setDroneId(id); setView('sim'); }} />}
      {view === 'plans' && <Saved plans={plans} onLoad={loadPlan} onDelete={id => setPlans(plans.filter(p => p.id !== id))} onExport={p => download(`skylab-${p.name.replace(/\W+/g, '-')}.json`, p.data)} />}
      {view === 'settings' && <Settings show={show} setShow={setShow} onResetAll={resetAll} onClearPlans={() => setPlans([])} />}
      {view === 'sim' && (
        <div className="main">
          <div className="vp-wrap">
            <div className="vp">
              <SimulationViewport plan={plan} drone={drone} cfg={cfg} mode={mode} wps={wps} sim={sim} camCmd={camCmd} followCam={followCam} show={show}
                addMode={addMode} onAdd={(x, z) => setWps([...wps, { x, y: cfg.height, z }])} onTick={setTick} onEnd={() => setPlaying(false)} />
              <SimulationPlayback playing={playing} started={(tick?.dist ?? 0) > 0} progress={plan.length ? (tick?.dist ?? 0) / plan.length : 0} followCam={followCam}
                onPlay={play} onPause={() => setPlaying(false)} onRestart={restart} onReset={resetAll} onPreview={preview} onFollow={() => setFollowCam(!followCam)} onView={cam} />
            </div>
            <FlightStatistics drone={drone} mode={mode} plan={plan} tick={tick} warnings={warnings} playing={playing} wpCount={mode === 'custom' ? wps.length : generated?.waypoints.length ?? Math.min(40, plan.pts.length)} />
          </div>
          <aside className="side">
            <DroneSelector drones={drones} cat={cat} setCat={setCat} sel={droneId} onSelect={setDroneId} />
            <DroneSpecifications drone={drone} cfg={cfg} onCustom={p => setDrones(ds => ds.map(d => (d.id === 'custom' ? { ...d, ...p } : d)))} />
            <FlightModeSelector mode={mode} onChange={pickMode} />
            <FlightControls cfg={cfg} set={patch} mode={mode} plan={plan} />
            {mode === 'custom' && <WaypointEditor wps={wps} setWps={setWps} addMode={addMode} setAddMode={setAddMode} />}
            <SafetyWarnings warnings={warnings} />
            <FlightPlanManager generated={generated} onGenerate={generate} onExport={() => download('skylab-flight-plan.json', snapshot())}
              onSave={name => setPlans([{ id: Date.now(), name, savedAt: new Date().toISOString(), data: snapshot() }, ...plans])} />
          </aside>
        </div>
      )}
    </div>
  );
}
