import { Category, Drone } from './flight';
// ILLUSTRATIVE generic profiles. They are not verified manufacturer specifications.
export const DRONES: Drone[] = [
  { id: 'camera-compact', name: 'Camera Drone (compact)', category: 'camera', flightMin: 30, ratedRange: 8000, maxAlt: 120, maxSpeed: 16, camera: true, battery: null },
  { id: 'camera-endurance', name: 'Camera Drone (long endurance)', category: 'camera', flightMin: 40, ratedRange: 12000, maxAlt: 120, maxSpeed: 18, camera: true, battery: null },
  { id: 'fpv', name: 'FPV Racing Drone', category: 'fpv', flightMin: 6, ratedRange: 1500, maxAlt: 100, maxSpeed: 35, camera: true, battery: null },
  { id: 'mini', name: 'Mini Drone (sub-250 g class)', category: 'mini', flightMin: 18, ratedRange: 3000, maxAlt: 100, maxSpeed: 14, camera: true, battery: null },
  { id: 'cine', name: 'Cinematic Drone', category: 'cinematic', flightMin: 25, ratedRange: 10000, maxAlt: 120, maxSpeed: 20, camera: true, battery: null },
  { id: 'agri', name: 'Agricultural Drone', category: 'agri', flightMin: 15, ratedRange: 1000, maxAlt: 30, maxSpeed: 10, camera: false, battery: null },
  { id: 'delivery', name: 'Delivery Drone', category: 'delivery', flightMin: 35, ratedRange: 15000, maxAlt: 120, maxSpeed: 20, camera: false, battery: null },
  { id: 'custom', name: 'Custom Drone', category: 'custom', flightMin: 20, ratedRange: 5000, maxAlt: 120, maxSpeed: 15, camera: true, battery: null },
];
export const CATS: [Category | 'all', string][] = [['all', 'All'], ['camera', 'Camera'], ['fpv', 'FPV'], ['mini', 'Mini'], ['cinematic', 'Cinematic'], ['agri', 'Agricultural'], ['delivery', 'Delivery'], ['custom', 'Custom']];
