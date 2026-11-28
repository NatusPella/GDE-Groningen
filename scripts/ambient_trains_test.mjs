// Ambient treinen (#1339, #1348): echte treinen op open spoor, op wereldtijd, nooit sneller dan V_MAX, een halte van 30 tot 60 s, deterministisch per seed,
// gast gelijk aan host.   node scripts/ambient_trains_test.mjs   (het deel op de echte kaart: zonder game/world met de provincie: SKIP)
import fs from 'node:fs';
import { ambientPlan, ambientStand, klokNaSeconden, ritTijd, V_MAX, CRUISE, DAG_S, HALTE_MIN, HALTE_MAX, ZICHT_M } from '../game/js/ambienttrains.js';

let n = 0, bad = 0;
const ok = (c, m, i = '') => { n++; if (!c) { bad++; console.log('FAIL', m, i); } };

// --- puur: een lijn van 6 km met vier haltes en een halte buiten de kaart ---
const route = { name: 'Proeflijn', len: 6000, stops: [{ s: 0, name: 'A' }, { s: 1500, name: 'B' }, { s: 3000, name: 'C' }, { s: 6000, name: 'D' }, { s: 6500, name: 'Buiten', offmap: true }] };
const plan = ambientPlan(route, 7);
ok(!!plan && plan.secties.length === 1 && plan.secties[0].idx.length === 4, 'het plan kent de vier haltes op de kaart (de halte buiten de kaart niet)');
ok(plan.secties.every((x) => DAG_S % x.periode < 1e-6), 'de periode van elke sectie is een deler van een speldag');
ok(plan.treinen.length >= 2, 'er rijden meer treinen op een sectie', String(plan.treinen.length));
ok(ambientPlan({ name: 'kort', len: 10, stops: [{ s: 0 }] }, 1) === null, 'een lijn met één halte heeft geen plan');

// snelheidsgrens bij elke beeldduur
for (const dt of [1 / 240, 1 / 60, 1 / 30, 0.1, 0.25, 1]) {
  let maxV = 0, maxGeo = 0, prev = null;
  for (let R = 0; R < DAG_S; R += dt) {
    for (const tr of plan.treinen) {
      const st = ambientStand(plan, tr, R);
      maxV = Math.max(maxV, st.v);
      const key = tr.i;
      if (prev && prev[key]) maxGeo = Math.max(maxGeo, Math.abs(st.s - prev[key].s) / dt);
      (prev || (prev = {}))[key] = st;
    }
    if (dt < 0.05 && R > 600) break;   // de fijne stappen: de eerste 600 s volstaan
  }
  ok(maxV <= V_MAX + 1e-9, `dt ${dt.toFixed(4)}: gemelde snelheid ${maxV.toFixed(2)} m/s onder ${V_MAX}`);
  ok(maxGeo <= V_MAX * 1.02, `dt ${dt.toFixed(4)}: verplaatsing per echte seconde ${maxGeo.toFixed(2)} m/s onder ${V_MAX}`);
}
// de klok: een speldag is 1440 s, een spelminuut een echte seconde
ok(Math.abs(klokNaSeconden(1) - 60) < 1e-9 && klokNaSeconden(24) === 0 && Math.abs(klokNaSeconden(23.999) - 1439.94) < 0.01, 'klokNaSeconden: 1 uur = 60 s');
// geen sprong bij het rondlopen van de klok en bij elke periode
for (const tr of plan.treinen) {
  const a = ambientStand(plan, tr, DAG_S - 0.01), b = ambientStand(plan, tr, 0), c = ambientStand(plan, tr, 123.4), d = ambientStand(plan, tr, 123.4 + DAG_S);
  ok(Math.abs(a.s - b.s) < 0.5, 'geen sprong bij middernacht', `${a.s} ${b.s}`);
  ok(c.s === d.s && c.state === d.state, 'een speldag later staat hij op dezelfde plek');
}
// stoppen bij stations: elke halte van de kaart 30 tot 60 s (de eindpunten langer), op de halteplek, stilstaand
{
  const sec0 = plan.secties[0];
  const haltes = sec0.ev.filter((e) => e.soort === 'halte');
  ok(haltes.length === 6, 'heen vier haltes, terug twee tussenhaltes', String(haltes.length));
  for (const e of haltes) {
    const dur = e.t1 - e.t0, stop = route.stops[sec0.idx[e.k]];
    if (e.eindpunt) ok(dur >= HALTE_MIN - 1e-9, `eindpunt ${stop.name}: minstens ${HALTE_MIN} s`, String(dur));
    else ok(dur >= HALTE_MIN - 1e-9 && dur <= HALTE_MAX + 1e-9, `halte ${stop.name}: ${dur.toFixed(1)} s ligt tussen ${HALTE_MIN} en ${HALTE_MAX}`);
    const tr = plan.treinen[0], R = e.t0 - tr.fase + (e.t1 - e.t0) / 2;
    const st = ambientStand(plan, tr, ((R % sec0.periode) + sec0.periode) % sec0.periode);
    ok(st.state === 'dwell' && st.v === 0 && st.s === stop.s && st.target === sec0.idx[e.k], `midden van de halte ${stop.name}: hij staat op de halteplek`, JSON.stringify(st));
  }
  // tussen twee haltes rijdt hij echt: optrekken en remmen, niet in een sprong
  const rit = sec0.ev.find((e) => e.soort === 'rit' && e.d > 1000);
  const tr = plan.treinen[0], R0 = rit.t0 - tr.fase;
  const mid = ambientStand(plan, tr, R0 + (rit.t1 - rit.t0) / 2);
  ok(mid.state === 'run' && mid.v > 20, 'midden in een lange rit kruist hij', JSON.stringify(mid));
  ok(Math.abs(ritTijd(1500, CRUISE) - (2 * CRUISE / 0.8 + (1500 - CRUISE * CRUISE / 0.8) / CRUISE)) < 1e-9, 'een rit van 1,5 km: optrekken, kruisen en remmen');
}
// deterministisch per seed
{
  const a = ambientPlan(route, 7), b = ambientPlan(route, 7), c = ambientPlan(route, 8);
  let gelijk = true, anders = false;
  for (let R = 0; R < 3000; R += 7.3) for (let i = 0; i < a.treinen.length; i++) {
    const x = ambientStand(a, a.treinen[i], R), y = ambientStand(b, b.treinen[i], R), z = ambientStand(c, c.treinen[i] || c.treinen[0], R);
    if (JSON.stringify(x) !== JSON.stringify(y)) gelijk = false;
    if (JSON.stringify(x) !== JSON.stringify(z)) anders = true;
  }
  ok(gelijk, 'dezelfde seed geeft overal dezelfde treinen');
  ok(anders, 'een andere seed geeft andere treinen');
}

// --- de echte kaart: host en gast, binnen zicht van de speler ---
const { heeftStationkaart, laadStationKaart } = await import('./lib/stationkaart.mjs');
if (!heeftStationkaart()) {
  console.log('SKIP ambient_trains_test (echte kaart): geen game/world met de provincie');
} else {
  const K = await laadStationKaart();
  const RW = K.RW;
  const { createServiceSource } = await import('../game/js/trainservice.js');
  const rooster = JSON.parse(fs.readFileSync(new URL('../game/trainschedule.json', import.meta.url), 'utf8'));
  const dienst = () => RW.setTreinDienst(createServiceSource({ rooster: () => rooster, routes: RW.getRoutes, dagsoort: () => 'werk', klok: (w) => w.clock || 0 }));
  const mkWorld = (x, y) => ({ map: K.map, vehicles: [], pedestrians: [], player: { x, y, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, companion: null, time: 0, clock: 10, money: 0, wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} }, onRespawn: [], audioEvents: [], particles: [], addMessage() {}, health: 100, armor: 0 });
  RW.initRailway(mkWorld(0, 0)); dienst();
  const w0 = mkWorld(0, 0);
  RW.updateRailway(0.016, w0);
  const lijn = RW.getRoutes().find((r) => r.pool && r.len > 5000 && ambientPlan(r, r.name));
  ok(!!lijn, 'een lijn met een rooster-pool');
  const pl = ambientPlan(lijn, lijn.name);
  ok(!!pl, 'die lijn heeft een ambient plan');
  // de speler staat midden op de lijn
  const [px, py] = RW.routePoint(lijn, lijn.len / 2);
  const reeks = (stap, uren0, secs, dt) => {
    const w = mkWorld(px + 5, py + 5);
    w.clock = uren0;
    const log = [];
    let maxV = 0, maxGeo = 0, open = 0, halte = 0, prev = new Map();
    for (let k = 0; k < Math.round(secs / dt); k++) {
      stap(dt, w);
      w.clock += (dt * 60) / 3600;
      const nu = new Map();
      const rij = [];
      for (const t of RW.getTrains()) {
        if (!t.ambient) continue;
        nu.set(t, t.c);
        rij.push([lijn.ambient ? lijn.ambient.indexOf(t) : -1, +t.c.toFixed(3), +t.v.toFixed(3), t.state]);
        maxV = Math.max(maxV, t.v);
        if (prev.has(t)) maxGeo = Math.max(maxGeo, Math.abs(t.c - prev.get(t)) / dt);
        const q = RW.routePoint(t.route, t.c);
        if (Math.hypot(q[0] - w.player.x, q[1] - w.player.y) > ZICHT_M + 1) ok(false, 'een ambient trein buiten het zicht is er niet');
        if (t.state === 'run' && t.v > 5) open++;
        if (t.state === 'dwell' && t.route.stops.some((s) => !s.offmap && Math.abs(s.s - t.c) < 0.01)) halte++;
      }
      prev = nu;
      log.push({ klok: +w.clock.toFixed(6), rij: rij.sort((a, b) => a[0] - b[0]) });
    }
    return { log, maxV, maxGeo, open, halte };
  };
  // host op verschillende beeldduren
  for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1, 0.25]) {
    RW.initRailway(mkWorld(0, 0)); dienst();
    const r = reeks((d, w) => RW.updateRailway(d, w), 10.0, 240, dt);
    ok(r.maxV <= V_MAX + 1e-9, `host dt ${dt.toFixed(4)}: gemelde snelheid ${r.maxV.toFixed(2)} m/s`);
    ok(r.maxGeo <= V_MAX * 1.05, `host dt ${dt.toFixed(4)}: verplaatsing ${r.maxGeo.toFixed(2)} m/s`);
  }
  // wat de speler ziet: treinen op open spoor en op een halte
  RW.initRailway(mkWorld(0, 0)); dienst();
  const host = reeks((d, w) => RW.updateRailway(d, w), 10.0, 600, 1 / 30);
  ok(host.log.some((f) => f.rij.length > 0), 'er rijden ambient treinen binnen zicht');
  ok(host.open > 100, 'treinen rijden op open spoor (snelheid > 5 m/s)', String(host.open));
  // de gast rekent hetzelfde uit dezelfde klok
  RW.initRailway(mkWorld(0, 0)); dienst();
  const gast = reeks((d, w) => RW.gastOverwegen(d, w), 10.0, 600, 1 / 30);
  ok(host.log.length === gast.log.length && host.log.every((f, i) => JSON.stringify(f.rij) === JSON.stringify(gast.log[i].rij)), 'gast: dezelfde ambient treinen op dezelfde plek als de host (elk beeld)');
  // stoppen bij een station op de echte lijn: de speler staat bij een halte
  const halteS = lijn.stops.find((s) => !s.offmap && s.s > 500 && s.s < lijn.len - 500);
  const [hx, hy] = RW.routePoint(lijn, halteS.s);
  RW.initRailway(mkWorld(0, 0)); dienst();
  const wh = mkWorld(hx, hy); wh.clock = 10;
  let stoptBij = 0, langste = 0, huidig = 0;
  for (let k = 0; k < 1440 * 4; k++) {
    RW.updateRailway(0.25, wh); wh.clock += (0.25 * 60) / 3600;
    const t = RW.getTrains().find((q) => q.ambient && q.state === 'dwell' && Math.abs(q.c - halteS.s) < 0.01);
    if (t) { huidig += 0.25; langste = Math.max(langste, huidig); stoptBij++; } else huidig = 0;
  }
  ok(stoptBij > 0, 'een ambient trein stopt bij het station', String(stoptBij));
  ok(langste >= HALTE_MIN - 1 && langste <= 1440, `de halte duurt ${langste.toFixed(0)} s (echte seconden)`);
}

console.log(bad ? `${bad} van ${n} mislukt` : `ambient_trains_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
