// Motorbike and geared-moped models as plain data (no imports, so vehicle.js,
// shops.js and the tests can all take them without an import cycle). They are
// isScooter two-wheelers with a gearbox (gearbox.js); made-up names live in
// vehiclenames.js. Keys are saved in the shop stock: only ever add.
export const MOTORBIKE_MODELS = {
  sport: { name: 'motor', motorbike: 'sport', len: 2.05, wid: 0.7, maxSpeed: 62, accel: 11.5, brake: 21, turnRate: 3.4, color: '#c9a227', rider: '#1c1c1e' },
  naked: { name: 'motor', motorbike: 'naked', len: 2.05, wid: 0.72, maxSpeed: 52, accel: 10, brake: 19, turnRate: 3.6, color: '#2f5a8f', rider: '#3a3c40' },
  old: { name: 'motor', motorbike: 'old', len: 2.1, wid: 0.74, maxSpeed: 36, accel: 6.5, brake: 14, turnRate: 3.4, color: '#2e4a34', rider: '#5a3d26' },
};

// 45 km/h as it leaves the shop; tuning lifts it, and then the police get interested
export const GEARED_MOPED_MODEL = { name: 'scooter', moped: true, geared: true, len: 1.7, wid: 0.62, maxSpeed: 12.5, accel: 3.8, brake: 7, turnRate: 4.2, color: '#c9541e', rider: '#2f5c8a' };
export const MOPED_LEGAL_SPEED = 12.5; // m/s
