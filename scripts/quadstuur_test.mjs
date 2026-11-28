// Quad (#1349): de handen van de berijder grijpen de stuurgrepen die het model tekent, niet een auto-stuurwiel voor de borst.
// Gedrag: stuurPositie(quad) geeft een stuur waarvan de grepen (c +- r in z) binnen 5 cm van de getekende rubberen handvatten liggen,
// en een auto houdt zijn eigen stuurwiel (niet het handvat van de quad).
//   node scripts/quadstuur_test.mjs
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, QUAD_MODEL, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { stuurPositie } = await import('../game/js/autointerieur.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const quad = new Vehicle(0, 0, 0, { ...QUAD_MODEL });
const mesh = buildVehicleMesh(quad);
const seat = vehicleSeat(quad, true);
const w = stuurPositie(quad, seat);
check('de quad geeft een stuurpositie', !!w);
// de getekende handvatten: de punten van de romp op grephoogte (1,2 tot 1,4 m), aan de zijkant (|z| > 0,25), voor de zitting
const g = mesh.userData.body.geometry, p = g.attributes.position;
const punten = [];
for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y > 1.22 && y < 1.38 && Math.abs(z) > 0.25 && p.getX(i) > 0.3 && p.getX(i) < 0.65) punten.push([p.getX(i), y, z]); }
check('de quad heeft getekende handvatten', punten.length > 8, String(punten.length));
const mid = (zs) => { const l = punten.filter((q) => zs * q[2] > 0); return [l.reduce((a, q) => a + q[0], 0) / l.length, l.reduce((a, q) => a + q[1], 0) / l.length, l.reduce((a, q) => a + q[2], 0) / l.length]; };
for (const s of [-1, 1]) {
  const m = mid(s), grip = [w.x, w.y, w.z + s * w.r];
  const d = Math.hypot(m[0] - grip[0], m[1] - grip[1], m[2] - grip[2]);
  check(`greep ${s < 0 ? 'links' : 'rechts'} ligt op het getekende handvat`, d < 0.08, `afstand ${d.toFixed(3)} m, handvat ${m.map((x) => x.toFixed(2))}, greep ${grip.map((x) => x.toFixed(2))}`);
}
// de berijder reikt er met gebogen armen bij: grepen binnen 0,8 m van de heup op de zitting
const afstand = Math.hypot(w.x - seat.x, w.y - (seat.y + 0.065), w.r);
check('de grepen liggen binnen armbereik van de heup', afstand < 0.85, afstand.toFixed(2));
// een auto houdt zijn eigen stuur
const hatch = new Vehicle(0, 0, 0, { ...TRAFFIC_MODELS().find((m) => m.name === 'hatch') });
const wh = stuurPositie(hatch, vehicleSeat(hatch, true));
check('een auto krijgt nog steeds zijn stuurwiel', wh && wh.r > 0.1 && wh.r < 0.3, JSON.stringify(wh));
if (process.env.QV) console.log(JSON.stringify({ w, seat: { x: seat.x, y: seat.y }, n: punten.length, afstand }));
console.log(bad ? `quadstuur_test: ${bad} mislukt` : 'quadstuur_test: ok');
process.exit(bad ? 1 : 0);
