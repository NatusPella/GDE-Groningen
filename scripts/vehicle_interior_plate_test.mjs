// Geen plaat door het interieur (#923): van een personenauto wordt het koetswerk gebouwd en in
// horizontale vlakken gezocht. Een groot horizontaal vlak op de raamlijn dat de hele cabine breed
// is, is precies de plaat die door het interieur sneed: de bovenkant van de dichte extrusie van
// het koetswerk en de onderkant van de glasband. Die mogen er niet meer zijn; de vloer, het dak,
// de motorkap en de bagagedeur blijven. Ook de 'Knakker' (hatch) zelf, met de maten uit
// shopdata.js. Bestelbussen, vrachtwagens en bussen houden hun eigen (dichte) cabine: die hebben
// geen glasband rond de hele cabine en vallen onder scripts/cabin_test.mjs.
//   node scripts/vehicle_interior_plate_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
await import('../game/js/player.js');
const { buildVehicleMesh, carBodyFit } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');

let bad = 0, n = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { bad++; console.log('FAIL', name, info); } };

const PLATE_M2 = 1.0;      // kleiner dan dit is een onderdeel (bank, dashboard), geen plaat
const PLATE_FROM = 0.45;   // boven de vloer van de cabine (0,30 m) en onder het dak

// Horizontale driehoeken die de cabine in de breedte overspannen en tussen raamlijn en dak liggen.
function platesThroughCabin(geo, opt) {
  const pos = geo.attributes.position, idx = geo.index;
  const count = idx ? idx.count : pos.count;
  const out = [];
  for (let k = 0; k + 2 < count; k += 3) {
    const ia = idx ? idx.getX(k) : k, ib = idx ? idx.getX(k + 1) : k + 1, ic = idx ? idx.getX(k + 2) : k + 2;
    const a = [pos.getX(ia), pos.getY(ia), pos.getZ(ia)];
    const b = [pos.getX(ib), pos.getY(ib), pos.getZ(ib)];
    const c = [pos.getX(ic), pos.getY(ic), pos.getZ(ic)];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(...nr);
    if (len < 1e-9 || Math.abs(nr[1] / len) < 0.9) continue;
    const area = len / 2;
    if (area < PLATE_M2) continue;
    const y = (a[1] + b[1] + c[1]) / 3;
    if (y < PLATE_FROM || y > opt.roof - 0.12) continue;
    const zmin = Math.min(a[2], b[2], c[2]), zmax = Math.max(a[2], b[2], c[2]);
    if (zmax - zmin < opt.wid - 0.2) continue;
    // het vlak moet over de cabine liggen, niet over de motorkap of de bagagedeur
    const xs = [a[0], b[0], c[0]];
    const cx = (xs[0] + xs[1] + xs[2]) / 3;
    if (cx < opt.cabinX0 || cx > opt.cabinX1) continue;
    out.push({ y, area, zspan: zmax - zmin, up: nr[1] > 0 });
  }
  out.sort((p, q) => q.area - p.area);
  return out;
}

const models = new Map();
for (const m of TRAFFIC_MODELS()) if (!models.has(m.name)) models.set(m.name, m);
// De personenauto's (de families met een glasband rond de cabine), met de maten van het spel.
const cases = [['hatch', 3.8, 1.7], ['sedan', 4.3, 1.8], ['wagon', 4.5, 1.85], ['sport', 4.2, 1.85], ['suv', 4.5, 1.95]];
for (const [naam, len, wid] of cases) {
  const base = models.get(naam) || { name: naam, len, wid, color: '#888888' };
  const model = { ...base, len, wid };
  const v = new Vehicle(0, 0, 0, model);
  const romp = carBodyFit(v);
  ok(!!romp, `${naam}: heeft een carrosserieprofiel (raamlijn en dak)`);
  if (!romp) continue;
  const opt = { roof: romp.roof, wid, cabinX0: romp.xD, cabinX1: romp.xA };
  const grp = buildVehicleMesh(v);
  let hits = [];
  grp.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    hits = hits.concat(platesThroughCabin(o.geometry, opt));
  });
  hits.sort((p, q) => q.area - p.area);
  ok(hits.length === 0, `${naam}: geen plaat door de cabine tussen raamlijn en dak`, hits.length ? `${hits.length} vlakken, grootste ${hits[0].area.toFixed(2)} m2 op y=${hits[0].y.toFixed(2)}` : '');
}

// De Knakker (hatch) precies zoals in shopdata.js: op de raamlijn (0,93 m) en op de onderkant van
// de glasband (0,90 m) mag geen breed vlak meer liggen.
{
  // onze eigen bouwer (sinds 23-11 tekent het spel een gewone hatchback als hybride; die heeft geen raamlijnplaat, zie hybridecar_test)
  const model = { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42, accel: 9, brake: 23, turnRate: 3, color: '#c7c9cc', hybride: false };
  const v = new Vehicle(0, 0, 0, model);
  const romp = carBodyFit(v);
  ok(!!romp && Math.abs(romp.belt - 0.93) < 1e-6, 'Knakker: raamlijn op 0,93 m', String(romp && romp.belt));
  const grp = buildVehicleMesh(v);
  let found = 0, high = 0, roof = false, hood = false, floor = false, ymax = -Infinity;
  grp.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let k = 0; k + 2 < count; k += 3) {
      const ia = idx ? idx.getX(k) : k, ib = idx ? idx.getX(k + 1) : k + 1, ic = idx ? idx.getX(k + 2) : k + 2;
      const ys = [pos.getY(ia), pos.getY(ib), pos.getY(ic)];
      if (Math.max(...ys) - Math.min(...ys) > 1e-3) continue;
      if (Math.abs(ys[0] - romp.belt) > 1e-2 && Math.abs(ys[0] - (romp.belt - 0.03)) > 1e-2) continue;
      const xs = [pos.getX(ia), pos.getX(ib), pos.getX(ic)], zs = [pos.getZ(ia), pos.getZ(ib), pos.getZ(ic)];
      if (Math.max(...xs) - Math.min(...xs) > 1 && Math.max(...zs) - Math.min(...zs) > 1) found++;
    }
    for (let i = 1; i < pos.array.length; i += 3) {
      const y = pos.array[i];
      ymax = Math.max(ymax, y);
      if (y > romp.belt) high++;
      if (Math.abs(y - 0.86) < 0.08) hood = true;
      if (y > romp.roof - 0.12) roof = true;
      if (Math.abs(y - 0.30) < 0.05) floor = true;
    }
  });
  ok(found === 0, 'Knakker: geen vlak op de raamlijn of de glasband over de cabine', String(found));
  ok(hood && roof && floor, 'Knakker: motorkap, dak en bodem zijn er nog', `kap ${hood} dak ${roof} bodem ${floor}`);
  ok(ymax <= romp.roof + 0.05, 'Knakker: het dak blijft de hoogste geometrie', ymax.toFixed(2));
  ok(high > 200, 'Knakker: de glasband en het dak staan er nog boven de raamlijn', String(high));
}

console.log(bad ? `${bad} van ${n} mislukt` : `vehicle_interior_plate_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);

