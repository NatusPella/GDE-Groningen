// Busroute-audit (#322): elke echte buslijn (provincie-bus.json, 252 lijnen) tegen de wegen waar een bus mag rijden.
//   node scripts/bus_audit.mjs [--sim] [--lijnen=N] [--lijn=<ref>] [--verbose]
//
// Statisch (altijd):  per lijn alle 10 m de weg onder de lijn: geen voet- of fietspad, niet gesloten voor bussen (acc),
//                     geen voetgangersstraat of pad, breed genoeg, niet tegen de eenrichting in (tenzij busContra).
//                     Wegen buiten de stadskaart (de provincietegels) kent deze audit niet: die tellen als "buiten".
// Rit (--sim):        de bus-AI uit vehicle.js rijdt de lijn echt, per lijn de stukken die op de stadskaart liggen:
//                     tel de beelden waarop de bus op een weg staat waar hij niet hoort (busMagWeg) of meer dan
//                     AF_M van zijn lijn is. Dat zijn de bussen op het Wilgenpad en in de Oude Kijk in 't Jatstraat.
// Zonder game/world/provincie-bus.json of data/cache/province sluit hij af met SKIP.
// De lijn- en stadsdata komen uit loadworld.mjs; GDE_BUS_VEHICLE=_vehicle_oud.js zet een oude vehicle.js ernaast.
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { loadCityWorld } from './lib/loadworld.mjs';

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const SIM = process.argv.includes('--sim');
const VERBOSE = process.argv.includes('--verbose');
const MAX_LIJNEN = +(arg('lijnen', 0)) || Infinity;
const ENKEL = arg('lijn');
const AF_M = 35;           // zo ver van zijn lijn is een bus verdwaald
const STEP = 10;           // m tussen de steekproeven langs de lijn
const DT = 0.25;

const B = await import('../game/js/busroutes.js');
const binFile = new URL('../game/world/provincie-bus.json', import.meta.url);
if (!fs.existsSync(binFile)) { console.log('SKIP bus_audit: geen game/world/provincie-bus.json (bouw de wereld of kopieer hem)'); process.exit(0); }
const raw = JSON.parse(fs.readFileSync(binFile, 'utf8')).bus;
let lines = B.prepareLines(raw);
if (ENKEL) lines = lines.filter((l) => String(l.ref) === ENKEL);
const map = (await loadCityWorld()).map;

let bounds = [Infinity, Infinity, -Infinity, -Infinity];
for (const r of map.roads) for (const p of r.pts) bounds = [Math.min(bounds[0], p[0]), Math.min(bounds[1], p[1]), Math.max(bounds[2], p[0]), Math.max(bounds[3], p[1])];

const angDiff = (a, b) => { const d = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); return d; };

// de weg onder een punt van de lijn: dichtstbij, evenwijdig aan de lijn; null buiten de kaart
function roadUnder(p, reach = 12) {
  let best = null, bs = Infinity;
  for (const r of map.roadsNear(p.x, p.y, reach)) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], c = r.pts[i + 1];
      const vx = c[0] - a[0], vy = c[1] - a[1], l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a[0]) * vx + (p.y - a[1]) * vy) / l2));
      const d = Math.hypot(p.x - (a[0] + vx * t), p.y - (a[1] + vy * t));
      if (d > reach) continue;
      const hd = angDiff(Math.atan2(vy, vx), p.heading);
      const para = Math.min(hd, Math.PI - hd);
      const sc = d + (para > 0.6 ? 25 : 0) + (r.cat === 'foot' || r.cat === 'cycle' ? 15 : 0);
      if (sc < bs) { bs = sc; best = { road: r, seg: i, d, against: r.oneway && hd > Math.PI / 2 }; }
    }
  }
  return best;
}

// --- statisch --------------------------------------------------------------------------------
const fouten = new Map();       // "lijn|weg|reden" -> { n, x, y }
const perLijn = [];
let samples = 0, buiten = 0, op = 0;
for (const l of lines) {
  const inCity = [];
  let cur = null;
  for (let s = 0; s <= l.length; s += STEP) {
    const p = B.pointAt(l, s);
    samples++;
    const u = (p.x < bounds[0] || p.x > bounds[2] || p.y < bounds[1] || p.y > bounds[3]) ? null : roadUnder(p);
    if (!u) { buiten++; if (cur) { inCity.push(cur); cur = null; } continue; }
    op++;
    if (!cur) cur = { from: s, to: s };
    cur.to = s;
    const r = u.road;
    // een lijn is één polylijn die de bus heen en weer rijdt: tegen de eenrichting in op de ene kant is de terugrit, geen fout
    const reden = B.busWegFout(r);
    if (reden) {
      const k = `${l.ref}|${r.name || r.type || '?'}|${reden}`;
      const f = fouten.get(k) || { lijn: l.ref, weg: r.name || r.type || '?', reden, n: 0, x: Math.round(p.x), y: Math.round(p.y) };
      f.n++;
      fouten.set(k, f);
    }
  }
  if (cur) inCity.push(cur);
  perLijn.push({ l, inCity });
}
console.log(`${lines.length} lijnen, ${samples} steekproeven, ${op} op de stadskaart, ${buiten} buiten`);
const statisch = [...fouten.values()].sort((a, b) => b.n - a.n);
console.log(`statisch: ${statisch.length} wegstukken op de lijnen waar een bus niet mag rijden`);
for (const f of statisch.slice(0, VERBOSE ? 200 : 15)) console.log(`  lijn ${f.lijn}: ${f.weg} (${f.reden}), ${f.n * STEP} m bij ${f.x},${f.y}`);

// --- rit --------------------------------------------------------------------------------------
let ritFouten = 0, ritten = 0, ritStappen = 0, omwegBeelden = 0;
const vast = [];
const verdwaald = new Map();
if (SIM) {
  const V = await import('../game/js/' + (process.env.GDE_BUS_VEHICLE || 'vehicle.js'));
  const TL = await import('../game/js/trafficlights.js');
  const { SeededRng } = await import('../game/js/util.js');
  const world = { map, flitspaalen: [], player: { x: 0, y: 0 }, vehicles: [], props: [], particles: [], stats: {}, time: 0, clock: 12, addMessage() {}, audioEvents: [] };
  TL.initTrafficLights(world);
  let gedaan = 0;
  for (const { l, inCity } of perLijn) {
    if (gedaan >= MAX_LIJNEN) break;
    const stukken = inCity.filter((c) => c.to - c.from >= 300).sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 2);
    if (!stukken.length) continue;
    gedaan++;
    for (const st of stukken) {
      const rng = new SeededRng(7 + Math.round(st.from));
      const r01 = () => rng.next();
      const s0 = st.from + 20, s1 = Math.min(st.to, st.from + 1500);
      const at = B.startAt(l, s0, 1);
      // een bus op de weg onder de lijn, in de richting van de lijn
      let v = null;
      for (let t = 0; t < 30 && !v; t++) {
        const u = roadUnder({ ...at, heading: at.angle });
        if (!u || B.busWegFout(u.road)) break;
        const c = V.spawnVehicleOnRoad(map, u.road, false, r01, false, true, { x: at.x, y: at.y });
        if (angDiff(c.angle, at.angle) < Math.PI / 2) v = c;
      }
      if (!v) continue;
      v.busRun = B.makeRunner(l, B.project(l, v.x, v.y).s, 1);
      world.vehicles = [v];
      world.player.x = v.x; world.player.y = v.y;
      ritten++;
      let stil = 0, t = 0, laatste = null;
      const s0run = v.busRun.s;
      while (v.busRun.s < s1 && t < 900 && stil < 60) {
        world.time += DT; t += DT;
        TL.updateTrafficLights(DT, world);
        V.updateTrafficAI(v, DT, map, world, r01);
        world.player.x = v.x; world.player.y = v.y;
        ritStappen++;
        stil = Math.abs(v.speed) < 0.3 ? stil + DT : 0;
        if (!v.road) break;
        const pr = B.project(l, v.x, v.y, v.busRun.s - 150, v.busRun.s + 250);
        if (pr.d > AF_M) omwegBeelden++;
        const reden = B.busWegFout(v.road, v.model.wid) || (!B.busMagWeg(v.road, l, v.model.wid) ? 'niet voor deze bus (geen busnet, niet op zijn lijn)' : null);
        if (VERBOSE && !reden && t % 60 < DT) console.log(`    ${l.ref} t=${t.toFixed(0)} s=${v.busRun.s.toFixed(0)}/${l.length.toFixed(0)} ${v.road.name || v.road.type} v=${v.speed.toFixed(1)} afstand ${pr.d.toFixed(0)} pos ${v.x.toFixed(0)},${v.y.toFixed(0)} dwell ${v.busRun.dwell.toFixed(0)} wait ${(v.waitTimer || 0).toFixed(0)} dir ${v.busRun.dir} plan ${v.plan ? v.plan.length : '-'} sproj ${pr.s.toFixed(0)}`);
        if (reden) {
          ritFouten++;
          const k = `${l.ref}|${v.road.name || v.road.type}|${reden.replace(/\d+ m/, 'N m')}`;
          const f = verdwaald.get(k) || { lijn: l.ref, weg: v.road.name || v.road.type || '?', type: v.road.type, reden, n: 0, x: Math.round(v.x), y: Math.round(v.y) };
          f.n++;
          verdwaald.set(k, f);
          laatste = k;
        }
      }
      if (v.busRun.s < s1 - 30) vast.push(`lijn ${l.ref}: kwam niet voorbij boogafstand ${Math.round(v.busRun.s)} (start ${Math.round(s0run)}, doel ${Math.round(s1)}) bij ${Math.round(v.x)},${Math.round(v.y)} op ${v.road ? v.road.name || v.road.type : 'geen weg'}`);
    }
  }
  console.log(`rit: ${ritten} ritten over de lijnen, ${ritStappen} beelden, ${ritFouten} beelden op een weg waar de bus niet hoort`);
  console.log(`  ${omwegBeelden} beelden op meer dan ${AF_M} m van de lijn (een omweg over het busnet), ${vast.length} ritten komen niet aan`);
  for (const x of vast.slice(0, VERBOSE ? 200 : 10)) console.log('  ' + x);
  const lijst = [...verdwaald.values()].sort((a, b) => b.n - a.n);
  for (const f of lijst.slice(0, VERBOSE ? 200 : 20)) console.log(`  lijn ${f.lijn}: ${f.weg} [${f.type}] (${f.reden}), ${(f.n * DT).toFixed(0)} s bij ${f.x},${f.y}`);
}

// Streng: een bus op een weg waar hij niet hoort (rit) is altijd een fout; de statische bevindingen zijn de lijndata zelf
// (een lijn die over een fietspad of een te smal straatje loopt; de bus rijdt daar omheen) en tellen alleen mee met --strikt.
const slecht = verdwaald.size + (process.argv.includes('--strikt') ? statisch.length : 0);
console.log(`bus_audit: ${statisch.length} statische bevindingen${SIM ? `, ${verdwaald.size} stukken waar de bus in de rit niet hoort, ${vast.length} ritten komen niet aan` : ''}`);
process.exit(slecht ? 1 : 0);
