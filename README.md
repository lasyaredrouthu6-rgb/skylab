# SkyLab — drone flight planning simulator

React + TypeScript + Three.js. Pick a drone profile, choose a flight mode around a person, tune distances and heights, and watch the computed 3D route play back. **Simulation only. It never connects to or controls real hardware.**

## Run locally
Requires Node.js 18+.
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview
```

## Structure
- `src/lib/flight.ts` — all geometry: path generation per mode, route length, duration, validation, JSON export
- `src/lib/drones.ts` — drone profiles (illustrative, generic)
- `src/components/Sim.tsx` — `SimulationViewport` (Three.js), `SimulationPlayback`, `FlightStatistics`
- `src/components/Panels.tsx` — `DroneSelector`, `DroneSpecifications`, `FlightModeSelector`, `FlightControls`, `WaypointEditor`, `SafetyWarnings`, `FlightPlanManager`
- `src/components/Pages.tsx` — landing, drone library, saved plans, settings
- `src/App.tsx` — shared state (drone, mode, config, waypoints, playback)

## Coordinates
Metres. `X` right, `Y` up (height), `Z` forward. The person faces `+Z`; their left is `+X`.

## What is simulated / not implemented
- Drone profiles are **illustrative generic values**, not verified manufacturer specs. Models are simple generated geometry (no real product models).
- Duration is route length ÷ speed (approximate); battery use is a linear estimate from the profile's flight time.
- Safety checks (altitude limit, operating radius, rated range, min separation, flight time) are simulated; they do not establish legality or safety. Obstacles are not implemented.
- Styling is plain CSS (no Tailwind); the 3D view uses plain Three.js (no React Three Fiber).
- Saved plans use browser localStorage only; no backend or accounts.
- Not yet run in a browser by the author of this scaffold. If `npm run build` reports a type error, please open an issue.
