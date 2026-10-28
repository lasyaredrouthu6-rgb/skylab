import { MutableRefObject, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Home, Locate, Pause, Play, Repeat, RotateCcw, Route, Square } from 'lucide-react';
import { Config, Drone, Mode, Plan, Waypoint, Warning, sample } from '../lib/flight';

export interface Tick { dist: number; alt: number; horiz: number }
export interface Show { labels: boolean; arrows: boolean; geofence: boolean }
export type SimRef = MutableRefObject<{ dist: number; playing: boolean }>;
interface VP {
  plan: Plan; drone: Drone; cfg: Config; mode: Mode; wps: Waypoint[]; sim: SimRef; camCmd: { n: number; type: string };
  followCam: boolean; show: Show; addMode?: boolean; onAdd?: (x: number, z: number) => void; onTick?: (t: Tick) => void; onEnd: () => void; demo?: boolean;
}
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function label(txt: string, size: number, color = '#9fd8ff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d')!; x.font = '600 30px ui-monospace,Menlo,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(8,10,13,.8)'; x.fillRect(0, 8, 256, 48); x.fillStyle = color; x.fillText(txt, 128, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(size * 4, size, 1); s.renderOrder = 10; return s;
}
function clear(g: THREE.Object3D) {
  g.traverse((o: any) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
  while (g.children.length) g.remove(g.children[0]);
}
function makeDrone(cat: string) {
  const g = new THREE.Group(), rotors: THREE.Group[] = [];
  const dark = new THREE.MeshStandardMaterial({ color: 0x20262f, metalness: 0.6, roughness: 0.4 });
  const led = (c: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 });
  const big = cat === 'agri' || cat === 'delivery' ? 1.5 : cat === 'mini' ? 0.7 : 1;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3 * big, 0.09, 0.3 * big), dark));
  [Math.PI / 4, -Math.PI / 4].forEach(a => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.62 * big, 0.02, 0.035), dark); m.rotation.y = a; g.add(m); });
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, z]) => {
    const r = new THREE.Group(); r.position.set(x * 0.22 * big, 0.03, z * 0.22 * big);
    r.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.004, 24), new THREE.MeshBasicMaterial({ color: 0x6fcaff, transparent: true, opacity: 0.28 })));
    r.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.005, 0.02), new THREE.MeshStandardMaterial({ color: 0xcfe9ff, emissive: 0x2ea8ff, emissiveIntensity: 0.5 })));
    g.add(r); rotors.push(r);
  });
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), led(0x2ee0ff)); f.position.set(0, 0, 0.16 * big); g.add(f);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), led(0xff3050)); b.position.set(0, 0, -0.16 * big); g.add(b);
  if (cat === 'agri') { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0x4a8a5a })); t.position.y = -0.12; g.add(t); }
  else if (cat === 'delivery') { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0xb98a4e })); p.position.y = -0.13; g.add(p); }
  else { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), dark); c.position.set(0, -0.07, 0.1); g.add(c); }
  g.rotation.order = 'YXZ'; g.userData.rotors = rotors; return g;
}
function makePerson() {
  const g = new THREE.Group();
  const mk = (geo: THREE.BufferGeometry, c: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })); m.position.set(x, y, z); g.add(m); return m; };
  const cy = (a: number, b: number, h: number) => new THREE.CylinderGeometry(a, b, h, 14);
  mk(cy(0.07, 0.07, 0.85), 0x2a3447, -0.1, 0.425, 0); mk(cy(0.07, 0.07, 0.85), 0x2a3447, 0.1, 0.425, 0);
  mk(cy(0.18, 0.16, 0.6), 0x2ea8ff, 0, 1.15, 0); mk(cy(0.05, 0.05, 0.6), 0xe8c9a8, -0.26, 1.15, 0); mk(cy(0.05, 0.05, 0.6), 0xe8c9a8, 0.26, 1.15, 0);
  mk(new THREE.SphereGeometry(0.12, 16, 16), 0xe8c9a8, 0, 1.6, 0);
  const n = mk(new THREE.ConeGeometry(0.03, 0.08, 8), 0xe8c9a8, 0, 1.6, 0.13); n.rotation.x = Math.PI / 2;
  const ring = (c: number, op: number) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: op })); r.rotation.x = -Math.PI / 2; r.position.y = 0.03; g.add(r); return r; };
  g.userData.ring = ring(0x2ea8ff, 0.9); g.userData.sep = ring(0xff7a45, 0.6); return g;
}

export function SimulationViewport(props: VP) {
  const host = useRef<HTMLDivElement>(null), S = useRef<any>({}), pr = useRef(props); pr.current = props;
  const [fail, setFail] = useState(false);

  useEffect(() => {
    const s = S.current; let ren: THREE.WebGLRenderer;
    try { ren = new THREE.WebGLRenderer({ antialias: true }); } catch { setFail(true); return; }
    ren.setPixelRatio(Math.min(devicePixelRatio, 2)); host.current!.appendChild(ren.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0c0f); scene.fog = new THREE.FogExp2(0x0a0c0f, 0.0008);
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 40000); cam.position.set(30, 22, 42);
    const ctl = new OrbitControls(cam, ren.domElement); ctl.enableDamping = true; ctl.maxDistance = 15000; ctl.maxPolarAngle = Math.PI * 0.495; ctl.target.set(0, 5, 0);
    if (pr.current.demo) { ctl.autoRotate = true; ctl.autoRotateSpeed = 1; ctl.enableZoom = false; }
    scene.add(new THREE.AmbientLight(0x8899aa, 0.9)); const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(50, 100, 40); scene.add(sun);
    scene.add(new THREE.GridHelper(4000, 400, 0x1b3a55, 0x14202c)); const g2 = new THREE.GridHelper(100, 100, 0x2a6a9c, 0x1b3347); g2.position.y = 0.01; scene.add(g2);
    const person = makePerson(), dyn = new THREE.Group(); scene.add(person, dyn);
    Object.assign(s, { ren, cam, ctl, person, dyn, scene, last: -1, acc: 0, yaw: 0, py: 0 });
    const size = () => { const w = host.current!.clientWidth, h = host.current!.clientHeight; ren.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(host.current!);
    const el = ren.domElement, ray = new THREE.Raycaster(), pl = new THREE.Plane(V(0, 1, 0), 0), hit = V(); let down: number[] | null = null;
    el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', e => {
      const p = pr.current; if (!down || !p.addMode || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = el.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      if (ray.ray.intersectPlane(pl, hit)) p.onAdd?.(Math.round(hit.x), Math.round(hit.z));
    });
    const clock = new THREE.Clock(); let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1), p = pr.current, P = p.plan, sm = p.sim.current;
      if (sm.playing && P.length > 0) { sm.dist += P.speed * dt; if (sm.dist >= P.length) { sm.dist = P.length; p.onEnd(); } }
      sm.dist = Math.min(Math.max(sm.dist, 0), P.length);
      const r = sample(P, sm.dist), d: THREE.Group = s.drone;
      d.position.set(...r.pos);
      if (Math.hypot(r.dir[0], r.dir[2]) > 1e-6) { const t = Math.atan2(r.dir[0], r.dir[2]), dy = ((t - s.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; s.yaw += dy * Math.min(1, dt * 6); d.rotation.y = s.yaw; }
      d.rotation.x += ((sm.playing ? 0.15 : 0) - d.rotation.x) * Math.min(1, dt * 5);
      d.userData.rotors.forEach((q: THREE.Group) => { q.rotation.y += dt * (sm.playing ? 55 : 10); });
      person.position.set(...r.person);
      if (r.pdir && Math.hypot(r.pdir[0], r.pdir[2]) > 1e-6) s.py = Math.atan2(r.pdir[0], r.pdir[2]);
      person.rotation.y = r.pdir ? s.py : 0;
      if (s.alt) { s.alt.position.set(r.pos[0], 0, r.pos[2]); s.alt.scale.y = Math.max(r.pos[1], 0.001); s.altL.position.set(r.pos[0], r.pos[1] / 2, r.pos[2]); }
      s.flown?.geometry.setDrawRange(0, r.i + 1);
      if (p.followCam) { const dl = d.position.clone().sub(ctl.target).multiplyScalar(0.12); ctl.target.add(dl); cam.position.add(dl); }
      s.acc += dt;
      if (p.onTick && s.acc > 0.08 && Math.abs(sm.dist - s.last) > 1e-6) { s.acc = 0; s.last = sm.dist; p.onTick({ dist: sm.dist, alt: r.pos[1], horiz: Math.hypot(r.pos[0] - r.person[0], r.pos[2] - r.person[2]) }); }
      ctl.update(); ren.render(scene, cam);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); clear(scene); ren.dispose(); el.remove(); };
  }, []);

  // drone model follows the selected category
  useEffect(() => {
    const s = S.current; if (!s.scene) return;
    if (s.drone) { s.scene.remove(s.drone); clear(s.drone); }
    s.drone = makeDrone(props.drone.category); s.drone.scale.setScalar(Math.max(1.5, props.plan.ext / 14)); s.scene.add(s.drone);
  }, [props.drone.category]);

  // path, markers, geofence, axes
  useEffect(() => {
    const s = S.current; if (!s.dyn) return;
    const P = props.plan, { dyn } = s, u = P.ext / 60, c = props.cfg, sh = props.show;
    clear(dyn); s.last = -1;
    const pts = P.pts.map(q => V(...q)), geo = new THREE.BufferGeometry().setFromPoints(pts);
    dyn.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2ea8ff })));
    s.flown = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff })); dyn.add(s.flown);
    dyn.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(q => V(q.x, 0.05, q.z))), new THREE.LineBasicMaterial({ color: 0x2ea8ff, transparent: true, opacity: 0.25 })));
    const dot = (p: THREE.Vector3, col: number, r: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(p); dyn.add(m); };
    const tag = (t: string, p: THREE.Vector3, up: number, sz: number, col?: string) => { if (!sh.labels) return; const l = label(t, sz, col); l.position.copy(p).add(V(0, up, 0)); dyn.add(l); };
    const steps = [10, 25, 50, 100, 250, 500, 1000, 2500], step = steps.find(x => P.length / x <= 10) ?? 5000;
    for (let d = step; d < P.length - step * 0.3; d += step) { const r = sample(P, d), p = V(...r.pos); dot(p, 0x7fd0ff, u * 0.3); tag(d + ' m', p, u * 1.6, u * 1.5); }
    if (sh.arrows) for (let k = 1; k < 10; k++) {
      const r = sample(P, P.length * k / 10), dir = V(...r.dir); if (dir.lengthSq() < 1e-9) continue;
      const m = new THREE.Mesh(new THREE.ConeGeometry(u * 0.5, u * 1.5, 8), new THREE.MeshBasicMaterial({ color: 0x2ea8ff }));
      m.position.set(...r.pos); m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize()); dyn.add(m);
    }
    dot(pts[0], 0x3ddc84, u * 0.7); dot(pts[pts.length - 1], 0xff8a3d, u * 0.7);
    tag('START', pts[0], u * 2.4, u * 1.7, '#7dffbd'); tag('END', pts[pts.length - 1], u * 2.4, u * 1.7, '#ffb27a');
    if (props.mode === 'custom') props.wps.forEach((w, i) => { const p = V(w.x, w.y, w.z); dot(p, 0xffffff, u * 0.45); tag('WP' + (i + 1), p, u * 1.4, u * 1.3, '#ffffff'); });
    if (sh.geofence) {
      const gh = Math.min(c.altLimit, props.drone.maxAlt);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(c.maxRadius, c.maxRadius, gh, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa23a, wireframe: true, transparent: true, opacity: 0.18 }));
      f.position.y = gh / 2; dyn.add(f);
    }
    const a = P.ext * 0.25, ax = new THREE.AxesHelper(a); ax.position.y = 0.03; dyn.add(ax);
    ([['X', V(a, 0, 0), '#ff6b6b'], ['Y', V(0, a, 0), '#6bff95'], ['Z', V(0, 0, a), '#6bb8ff']] as const).forEach(([t, p, col]) => { const l = label(t, u * 1.6, col); l.position.copy(p); dyn.add(l); });
    s.alt = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xffd24a })); dyn.add(s.alt);
    s.altL = label(`ALT ${Math.round(pts[0].y)} m`, u * 1.5, '#ffe08a'); dyn.add(s.altL);
    s.drone?.scale.setScalar(Math.max(1.5, P.ext / 14));
    s.person.userData.ring.scale.setScalar(Math.max(1, P.ext / 30)); s.person.userData.sep.scale.setScalar(Math.max(0.1, c.minSep));
  }, [props.plan, props.show, props.cfg.maxRadius, props.cfg.altLimit, props.cfg.minSep, props.drone.maxAlt, props.wps, props.mode]);

  // camera commands
  useEffect(() => {
    const s = S.current, c = props.camCmd; if (!s.cam || !c.type) return; const e = props.plan.ext;
    if (c.type === 'top') { s.cam.position.set(0, e * 2.4 + 20, 0.01); s.ctl.target.set(0, 0, 0); }
    else { s.cam.position.set(e * 0.9 + 8, e * 0.7 + 8, e * 1.5 + 15); s.ctl.target.set(0, Math.min(e, 10) / 2, 0); }
    s.ctl.update();
  }, [props.camCmd]);

  if (fail) { // 2D top-down fallback when WebGL is unavailable
    const e = props.plan.ext * 1.2;
    return (
      <div className="fallback"><p>WebGL is unavailable here, showing a 2D top-down view. Controls and statistics still work.</p>
        <svg viewBox={`${-e} ${-e} ${2 * e} ${2 * e}`}><circle r={props.cfg.maxRadius} className="fence" />
          <polyline fill="none" stroke="#2ea8ff" strokeWidth={e / 100} points={props.plan.pts.map(q => `${q[0]},${-q[2]}`).join(' ')} /><circle r={e / 50} fill="#fff" /></svg></div>
    );
  }
  return <div className="host" ref={host} />;
}

interface PB { playing: boolean; started: boolean; progress: number; followCam: boolean; onPlay: () => void; onPause: () => void; onRestart: () => void; onReset: () => void; onPreview: () => void; onFollow: () => void; onView: (t: string) => void }
export function SimulationPlayback(p: PB) {
  return (
    <div className="bar">
      {p.playing ? <button className="btn pri" onClick={p.onPause}><Pause size={16} />Pause</button>
        : <button className="btn pri" onClick={p.onPlay}><Play size={16} />{p.started ? 'Resume' : 'Play'}</button>}
      <button className="btn" onClick={p.onRestart}><Repeat size={16} /><span>Restart</span></button>
      <button className="btn" onClick={p.onReset} title="Restore default settings"><RotateCcw size={16} /><span>Reset</span></button>
      <button className="btn" onClick={p.onPreview}><Route size={16} /><span>Preview</span></button>
      <button className={'btn' + (p.followCam ? ' on' : '')} onClick={p.onFollow}><Locate size={16} /><span>Follow drone</span></button>
      <span className="sep" />
      <button className="btn" onClick={() => p.onView('persp')} title="Perspective view"><Box size={16} /></button>
      <button className="btn" onClick={() => p.onView('top')} title="Top-down view"><Square size={16} /></button>
      <button className="btn" onClick={() => p.onView('reset')} title="Reset camera"><Home size={16} /></button>
      <div className="prog"><i style={{ width: p.progress * 100 + '%' }} /></div>
    </div>
  );
}

export function FlightStatistics({ drone, mode, plan, tick, warnings, wpCount, playing }: { drone: Drone; mode: Mode; plan: Plan; tick: Tick | null; warnings: Warning[]; wpCount: number; playing: boolean }) {
  const problems = warnings.filter(w => w.level !== 'info').length, errs = warnings.some(w => w.level === 'error');
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const rows: [string, string][] = [
    ['Drone', drone.name], ['Mode', mode], ['Distance from person', `${(tick?.horiz ?? 0).toFixed(1)} m`], ['Altitude', `${(tick?.alt ?? plan.pts[0][1]).toFixed(1)} m`],
    ['Route length', `${plan.length.toFixed(0)} m`], ['Speed', `${playing ? plan.speed : 0} m/s`], ['Est. duration (approx.)', mm(plan.duration)],
    ['Elapsed', mm((tick?.dist ?? 0) / plan.speed)], ['Waypoints', String(wpCount)], ['Battery use (est.)', `${Math.round(plan.duration / (drone.flightMin * 60) * 100)}%`],
  ];
  return (
    <div className="stats">
      {rows.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
      <div className={errs ? 'bad' : problems ? 'warnc' : 'okc'}><small>Plan check</small><b>{errs ? 'Errors' : problems ? `${problems} warning${problems > 1 ? 's' : ''}` : 'OK (sim)'}</b></div>
    </div>
  );
}
