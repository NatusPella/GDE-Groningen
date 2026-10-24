// Het binnenste van de trein (treinlayout.js, #442), puur: de indeling per treinsoort, lopen over de vloer van wagen
// naar wagen (door het gangpad, niet door de stoelen of de wand), de cabine met haar deurtje, reizigers en de plek in de wereld.
//   node scripts/treinlayout_test.mjs
import './node3d.mjs';
const L = await import('../game/js/treinlayout.js');
const { TRAIN_TYPES } = await import('../game/js/railway.js');

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

for (const [id, cfg] of Object.entries(TRAIN_TYPES)) {
  const lay = L.trainLayout(cfg);
  ok(lay.length === cfg.segments.length, `${id}: een indeling per wagen`);
  ok(L.trainLayout(cfg) === lay, `${id}: de indeling wordt gedeeld`);
  const cars = lay.filter((c) => c && c.kind === 'car');
  ok(cars.length >= 2, `${id}: wagens met een binnenste`);
  for (const [i, cl] of lay.entries()) {
    if (cl.kind !== 'car') { ok(cl.seats.length === 0, `${id}: de tussenwagen heeft geen stoelen`); continue; }
    ok(cl.doors.length === 2, `${id} wagen ${i}: twee deuren per kant`);
    ok(cl.seats.length >= 12, `${id} wagen ${i}: rijen stoelen (${cl.seats.length})`);
    ok(cl.seats.every((s) => cl.doors.every((d) => Math.abs(s.x - d) >= 1.1)), `${id} wagen ${i}: geen stoel in een deuropening`);
    ok(cl.seats.every((s) => Math.abs(s.z) > L.AISLE + 0.1), `${id} wagen ${i}: stoelen staan achter het gangpad`);
    ok(cl.poles.length >= 8 && cl.lamps.length >= 2 && cl.pillars.length >= 3, `${id} wagen ${i}: haltestangen, lampen en raampijlers`);
    ok(cl.doors.every((d) => d > cl.saloon[0] && d < cl.saloon[1]), `${id} wagen ${i}: de deuren liggen in de wagen`);
    if (cl.cab) ok(cl.hasDesk && cl.bulkhead !== null && Math.abs(cl.bulkhead) < cl.len / 2, `${id} wagen ${i}: een machinistencabine`);
    // de ogen van de machinist zitten in de cabine, boven het bureau
    if (cl.cab) { const e = L.driverEye(cl); ok(L.inCabZone(cl, e.x) && e.y > cl.floorY + 1.0 && e.y < cl.ceilY, `${id}: het oog zit in de cabine`); }
  }
  ok(cars.filter((c) => c.cab).length === 2, `${id}: een cabine aan elk eind`);

  // lopen: van de cabine van wagen 0 naar de achterste cabine, zonder een stoel of wand te raken
  const st = { car: 0, lx: 0, lz: 0 };
  const cab = lay[0];
  const spot = L.cabDoorSpot(cab);
  st.lx = spot.x; st.lz = spot.z;
  ok(L.canStand(cab, st.lx, st.lz), `${id}: de plek bij het deurtje is begaanbaar`);
  // in de cabine, voor het bureau: niet begaanbaar
  ok(!L.canStand(cab, cab.cab * (cab.len / 2 - 0.5), 0), `${id}: het bureau staat in de weg`);
  // door de wand van de cabine zonder het deurtje kan niet
  ok(!L.canStand(cab, cab.bulkhead, -0.8), `${id}: de cabinewand heeft maar een deurtje`);
  ok(L.canStand(cab, cab.bulkhead, 0),`${id}: het deurtje staat open`);
  const seen = new Set([0]);
  for (let step = 0; step < 4000 && st.car < lay.length - 1; step++) L.walkMove(lay, st, -0.05, 0) && seen.add(st.car);
  ok(st.car === lay.length - 1, `${id}: je loopt door alle wagens naar het andere eind (wagen ${st.car})`);
  // dat eind: de cabine aan de andere kant, daarachter is de trein afgelopen
  for (let step = 0; step < 400; step++) L.walkMove(lay, st, -0.05, 0);
  const last = lay[st.car];
  ok(st.lx > -last.len / 2 && L.inCabZone(last, st.lx) ? true : st.lx >= -last.len / 2 + 0.1, `${id}: aan het eind van de trein is het uit`);
  // en weer terug
  for (let step = 0; step < 4000 && st.car > 0; step++) L.walkMove(lay, st, 0.05, 0);
  ok(st.car === 0, `${id}: je loopt ook terug`);

  // de stoelen houden je tegen: opzij naar een stoel lukt niet in het gangpad
  const mid = lay.find((c) => c.kind === 'car');
  const s2 = { car: lay.indexOf(mid), lx: mid.seats[3].x, lz: 0 };
  for (let k = 0; k < 40; k++) L.walkMove(lay, s2, 0, 0.05);
  ok(Math.abs(s2.lz) <= L.AISLE + 1e-6, `${id}: in het gangpad kom je niet in een stoel (${s2.lz.toFixed(2)})`);
  // bij een deur wel tot de wand
  const d = mid.doors[0];
  const s3 = { car: lay.indexOf(mid), lx: d, lz: 0 };
  for (let k = 0; k < 60; k++) L.walkMove(lay, s3, 0, 0.05);
  ok(s3.lz > 1.0 && s3.lz <= L.HW - 0.3 + 1e-6, `${id}: bij de deur loop je tot de wand (${s3.lz.toFixed(2)})`);
  ok(L.doorNear(mid, d, s3.lz) && L.doorNear(mid, d, s3.lz).side === 1, `${id}: de deur is te vinden bij de wand`);
  ok(!L.doorNear(mid, d + 3.5, 0), `${id}: midden in de wagen is geen deur`);
}

// de wereld: een draaiende wagen, de speler staat waar het wagenframe zegt
{
  const car = { x: 100, y: 50, angle: Math.PI / 2 };
  const p = L.carPoint(car, 2, 0.5);
  ok(Math.abs(p.x - 99.5) < 1e-9 && Math.abs(p.y - 52) < 1e-9, `lokale +x volgt de kijkrichting van de wagen (${p.x}, ${p.y})`);
  const q = L.carPoint({ x: 0, y: 0, angle: 0 }, 1, 1);
  ok(q.x === 1 && q.y === 1, 'zonder draai is het gewoon optellen');
  ok(L.carHeading(car, 0.5) === Math.PI / 2 + 0.5, 'de kijkrichting is wagen plus draai');
}

// reizigers: deterministisch, gevuld naar rato, nooit in het gangpad
{
  const cl = L.trainLayout(TRAIN_TYPES.virm)[1];
  const a = L.passengers(cl, 7), b = L.passengers(cl, 7), c = L.passengers(cl, 8);
  ok(JSON.stringify(a) === JSON.stringify(b), 'dezelfde reizigers bij hetzelfde zaadje');
  ok(JSON.stringify(a) !== JSON.stringify(c), 'een nieuw zaadje geeft andere reizigers');
  ok(a.seated.length > 5 && a.seated.length < cl.seats.length, `de wagen is voor een deel bezet (${a.seated.length}/${cl.seats.length})`);
  ok(a.seated.every((s) => Math.abs(s.z) > L.AISLE) && a.standing.every((s) => Math.abs(s.z) > L.AISLE + 0.2), 'reizigers staan niet in het gangpad');
  ok(L.passengers(L.trainLayout(TRAIN_TYPES.gtw)[1], 1).seated.length === 0, 'in de tussenwagen zitten geen reizigers');
}

console.log(`${n - fails}/${n} treinlayout ok`);
process.exit(fails ? 1 : 0);
