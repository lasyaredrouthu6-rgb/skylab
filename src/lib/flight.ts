export type Mode = 'front' | 'behind' | 'overhead' | 'left' | 'right' | 'orbit' | 'follow' | 'custom' | 'cinematic';
export type Vec = [number, number, number]; // [x, height(y), z]. The person faces +Z; their left is +X.
export type Category = 'camera' | 'fpv' | 'mini' | 'cinematic' | 'agri' | 'delivery' | 'custom';
export interface Drone { id: string; name: string; category: Category; flightMin: number; ratedRange: number; maxAlt: number; maxSpeed: number; camera: boolean; battery: number | null }
export interface Config {
  distance: number; height: number; routeLength: number; maxRadius: number; orbitRadius: number; followDistance: number;
  speed: number; rotations: number; clockwise: boolean; startAngle: number; offset: number; targetSpeed: number; followAngle: number;
  altLimit: number; minSep: number; sequence: Mode[];
}
export interface Waypoint { x: number; y: number; z: number }
export interface Plan { pts: Vec[]; person: Vec[] | null; cum: number[]; length: number; speed: number; duration: number; ext: number }
export interface Warning { level: 'error' | 'warn' | 'info'; text: string }

export const DISCLAIMER = "Simulation only. These checks do not establish that a flight is legal or safe. Follow applicable aviation regulations, the manufacturer's instructions and privacy requirements.";
export const DEFAULT_CFG: Config = { distance: 15, height: 12, routeLength: 60, maxRadius: 150, orbitRadius: 15, followDistance: 12, speed: 5, rotations: 1, clockwise: false, startAngle: 0, offset: 0, targetSpeed: 1.5, followAngle: 0, altLimit: 120, minSep: 5, sequence: ['front', 'orbit', 'overhead', 'behind'] };
export const DEFAULT_WPS: Waypoint[] = [{ x: -20, y: 8, z: -20 }, { x: 20, y: 12, z: -20 }, { x: 20, y: 18, z: 20 }, { x: -20, y: 10, z: 20 }];
export const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  front: { label: 'Front', desc: 'Dolly in from in front of the person to the set distance and height.' },
  behind: { label: 'Behind', desc: 'Approach from behind the person to the set distance and height.' },
  overhead: { label: 'Overhead', desc: 'Top-down pass over the person at the set height, with optional horizontal offset.' },
  left: { label: 'Left', desc: "Approach along the person's left side at the set distance and height." },
  right: { label: 'Right', desc: "Approach along the person's right side at the set distance and height." },
  orbit: { label: 'Orbit', desc: 'Circle the person at constant radius and altitude.' },
  follow: { label: 'Follow', desc: 'Keep a fixed offset from a walking target that moves along a curved path.' },
  custom: { label: 'Custom', desc: 'Fly through your own X / Y / Z waypoints in order.' },
  cinematic: { label: 'Sequence', desc: 'Chain several moves, e.g. Front → Orbit → Overhead → Behind.' },
};
export const SEQ_MODES: Mode[] = ['front', 'behind', 'overhead', 'left', 'right', 'orbit'];

const N = 120;
const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const line = (a: Vec, b: Vec): Vec[] => Array.from({ length: N + 1 }, (_, i) => lerp(a, b, i / N));
const rad = (d: number) => (d * Math.PI) / 180;
export const dist3 = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function segment(m: Mode, c: Config, wps: Waypoint[]): { pts: Vec[]; person: Vec[] | null } {
  const d = c.distance, h = c.height, L = c.routeLength;
  switch (m) {
    case 'front': return { pts: line([0, h, d + L], [0, h, d]), person: null };
    case 'behind': return { pts: line([0, h, -(d + L)], [0, h, -d]), person: null };
    case 'left': return { pts: line([d + L, h, 0], [d, h, 0]), person: null };
    case 'right': return { pts: line([-(d + L), h, 0], [-d, h, 0]), person: null };
    case 'overhead': return { pts: line([c.offset, h, -L / 2], [c.offset, h, L / 2]), person: null };
    case 'orbit': {
      const n = Math.max(2, Math.round(120 * c.rotations)), dir = c.clockwise ? -1 : 1; // clockwise as seen from above
      return { pts: Array.from({ length: n + 1 }, (_, i) => { const a = rad(c.startAngle) + dir * 2 * Math.PI * c.rotations * i / n; return [Math.sin(a) * c.orbitRadius, h, Math.cos(a) * c.orbitRadius] as Vec; }), person: null };
    }
    case 'follow': {
      const pp: Vec[] = Array.from({ length: N + 1 }, (_, i) => { const u = i / N; return [Math.sin(u * Math.PI * 3) * L * 0.08, 0, u * L] as Vec; });
      const th = rad(c.followAngle); // 0 = directly behind the target, 90 = side, 180 = in front
      const pts = pp.map((q, i) => {
        const a = pp[Math.max(0, i - 1)], b = pp[Math.min(N, i + 1)];
        const n = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1, ox = -(b[0] - a[0]) / n, oz = -(b[2] - a[2]) / n;
        return [q[0] + (ox * Math.cos(th) - oz * Math.sin(th)) * c.followDistance, h, q[2] + (ox * Math.sin(th) + oz * Math.cos(th)) * c.followDistance] as Vec;
      });
      return { pts, person: pp };
    }
    case 'custom': {
      let pts: Vec[] = wps.map(w => [w.x, w.y, w.z] as Vec);
      if (!pts.length) pts = [[0, h, 0]];
      if (pts.length === 1) pts = [pts[0], pts[0]];
      return { pts, person: null };
    }
    default: {
      const seq = c.sequence.length ? c.sequence : (['front'] as Mode[]);
      return { pts: seq.flatMap(s => segment(s, c, wps).pts), person: null };
    }
  }
}

export function buildPlan(mode: Mode, c: Config, wps: Waypoint[]): Plan {
  const { pts, person } = segment(mode, c, wps);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist3(pts[i], pts[i - 1]));
  const length = cum[cum.length - 1];
  const speed = mode === 'follow' ? c.targetSpeed : c.speed;
  let ext = 25;
  for (const p of pts.concat(person ?? [])) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
  return { pts, person, cum, length, speed, duration: length / speed, ext };
}

export function sample(p: Plan, dist: number) {
  const c = p.cum; let i = 1;
  while (i < c.length - 1 && c[i] < dist) i++;
  const s = c[i] - c[i - 1], f = s > 0 ? Math.min(1, Math.max(0, (dist - c[i - 1]) / s)) : 0;
  const a = p.pts[i - 1], b = p.pts[i];
  const person = p.person ? lerp(p.person[i - 1], p.person[i], f) : ([0, 0, 0] as Vec);
  const pdir = p.person ? [p.person[i][0] - p.person[i - 1][0], 0, p.person[i][2] - p.person[i - 1][2]] : null;
  return { pos: lerp(a, b, f), dir: [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as Vec, person, pdir, i };
}

export function validate(p: Plan, d: Drone, c: Config, mode: Mode, wps: Waypoint[]): Warning[] {
  const w: Warning[] = [];
  const maxH = Math.max(...p.pts.map(q => q[1])), minH = Math.min(...p.pts.map(q => q[1]));
  const maxR = Math.max(...p.pts.map(q => Math.hypot(q[0], q[2])));
  if (maxH > c.altLimit) w.push({ level: 'error', text: `Route reaches ${maxH.toFixed(0)} m, above your configured altitude limit of ${c.altLimit} m.` });
  if (maxH > d.maxAlt) w.push({ level: 'warn', text: `Route altitude ${maxH.toFixed(0)} m exceeds this profile's maximum altitude (${d.maxAlt} m).` });
  if (minH < 0) w.push({ level: 'error', text: 'A waypoint is below ground level.' });
  else if (minH < 2) w.push({ level: 'warn', text: `Route drops to ${minH.toFixed(1)} m above ground.` });
  if (maxR > c.maxRadius) w.push({ level: 'error', text: `Route reaches ${maxR.toFixed(0)} m from the person, outside your configured operating radius (${c.maxRadius} m).` });
  if (maxR > d.ratedRange) w.push({ level: 'warn', text: `Route distance from the person exceeds the profile's rated range (${d.ratedRange} m).` });
  if (c.maxRadius > d.ratedRange) w.push({ level: 'info', text: 'Your configured radius is larger than the rated range. Rated range is not a safe operating radius.' });
  if (p.speed > d.maxSpeed) w.push({ level: 'warn', text: `Speed ${p.speed} m/s exceeds this profile's top speed (${d.maxSpeed} m/s).` });
  const use = p.duration / (d.flightMin * 60);
  if (use > 1) w.push({ level: 'error', text: `Estimated ${Math.round(p.duration)} s exceeds the profile's flight time (${d.flightMin} min).` });
  else if (use > 0.8) w.push({ level: 'warn', text: `Uses ~${Math.round(use * 100)}% of flight time; little reserve.` });
  let minSep = Infinity;
  p.pts.forEach((q, i) => { minSep = Math.min(minSep, dist3(q, p.person ? [p.person[i][0], 0.9, p.person[i][2]] : [0, 0.9, 0])); });
  if (minSep < c.minSep) w.push({ level: 'error', text: `Closest approach to the person is ${minSep.toFixed(1)} m, below your minimum separation (${c.minSep} m).` });
  if (mode === 'custom') {
    if (wps.length < 2) w.push({ level: 'warn', text: 'Add at least two waypoints to define a route.' });
    if (wps.some(q => ![q.x, q.y, q.z].every(Number.isFinite))) w.push({ level: 'error', text: 'A waypoint has an invalid coordinate.' });
  }
  if (!w.some(x => x.level !== 'info')) w.unshift({ level: 'info', text: 'Within your configured limits (simulation check only).' });
  return w;
}

export function keyPoints(p: Plan, mode: Mode, wps: Waypoint[]): Vec[] {
  if (mode === 'custom') return wps.map(q => [q.x, q.y, q.z] as Vec);
  const n = Math.min(40, p.pts.length);
  return Array.from({ length: n }, (_, i) => p.pts[Math.round(i * (p.pts.length - 1) / (n - 1))].map(v => +v.toFixed(2)) as Vec);
}
export function buildExport(drone: Drone, mode: Mode, config: Config, wps: Waypoint[], plan: Plan, warnings: Warning[]) {
  return { app: 'SkyLab', version: 1, simulated: true, generatedAt: new Date().toISOString(), drone, mode, config, customWaypoints: wps,
    waypoints: keyPoints(plan, mode, wps), routeLengthM: +plan.length.toFixed(1), speedMps: plan.speed, estimatedDurationS: Math.round(plan.duration),
    durationIsApproximate: true, warnings, disclaimer: DISCLAIMER };
}
export type ExportPlan = ReturnType<typeof buildExport>;
export function download(name: string, data: unknown) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
