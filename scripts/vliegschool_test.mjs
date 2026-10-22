// Vliegschool (#397): de regels (game/js/vliegschoolrules.js) en het gemeten plekkenbestand (game/vliegplekken.json).
// Het arcade-vliegtuig (arcadeplane.js, planecontrol.js) vliegt met de piloot uit de regels door elke vliegtuigles;
// de helikopterlessen krijgen een gesimuleerd toestel zonder natuurkunde (de echte vlucht komt in de Electron-bot).
//   node scripts/vliegschool_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePlane, stepPlane, PLANE } from '../game/js/arcadeplane.js';
import { planeInput, makeStrip } from '../game/js/planecontrol.js';
import * as R from '../game/js/vliegschoolrules.js';
import { shapeInputs } from '../game/js/helictl.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plekken = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/vliegplekken.json'), 'utf8'));
let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const strip = makeStrip({ x: 1700, y: 9900, heading: 0.4, length: 520, width: 34 });
const pad = { x: 1774.8, y: 9945.8, r: 6, z: 0 };
const env = { plekken, eelde: plekken.eelde, strip, pad, ground: () => 0 };

// --- de lessen ---------------------------------------------------------------------------------------------
check('13 lessen, unieke id\'s', R.LESSEN.length === 13 && new Set(R.LES_IDS).size === 13);
check('zes soorten voor het vliegtuig, zeven voor de helikopter', R.lessenVan('vliegtuig').length === 6 && R.lessenVan('heli').length === 7);
check('elke les heeft een titel, regel en drie grenzen', R.LESSEN.every((l) => l.titel && l.kort && l.grenzen.length === 3 && l.tijd > 0));
check('elke les heeft tekst van de instructeur', R.LESSEN.every((l) => R.LIJNEN[l.id] && R.LIJNEN[l.id].uitleg));
check('alleen Nederlands: geen Engelse stopwoorden in de teksten', !/\b(the|and|you|your|please|click)\b/i.test(JSON.stringify(R.LIJNEN)));
check('geen echte merken of personen in de teksten', !/google|amazon|nintendo|microsoft|tesla|boeing|airbus|cessna|piper/i.test(JSON.stringify([R.LIJNEN, R.LESSEN, R.INSTRUCTEUR, R.SCHOOL])));

// --- beloning --------------------------------------------------------------------------------------------------
check('beloning: nieuwe medaille geeft geld, dezelfde niet', R.beloning(1, 0).geld === 25 && R.beloning(3, 0).geld === 125 && R.beloning(3, 1).geld === 100 && R.beloning(2, 2).geld === 0 && R.beloning(2, 3).geld === 0);
check('beloning: opnieuw spelen geeft alleen een paar punten', R.beloning(2, 2).xp === R.OEFEN_XP && R.beloning(0, 0).xp === 0 && R.beloning(3, 0).xp === R.MEDAILLE_XP[3]);

// --- de baan --------------------------------------------------------------------------------------------------------
for (const les of R.LESSEN) {
  const why = R.beschikbaar(les, env);
  const baan = why ? null : R.bouwBaan(les, env);
  check(`${les.id}: beschikbaar en een baan`, !why && !!baan, why);
  if (!baan) continue;
  check(`${les.id}: een eindige start`, [baan.start.x, baan.start.y, baan.start.z, baan.start.heading, baan.start.speed].every(Number.isFinite));
  const d = R.doel(les, baan, R.nieuweStaat(les, baan), env);
  check(`${les.id}: een doel om heen te vliegen`, d && [d.x, d.y].every(Number.isFinite), JSON.stringify(d));
}
check('zonder baan geen landing voor het vliegtuig', R.beschikbaar(R.lesVan('vt-landen'), { ...env, strip: null }) !== '' && R.bouwBaan(R.lesVan('vt-landen'), { ...env, strip: null }) === null);
check('zonder plekken geen waterles', R.beschikbaar(R.lesVan('vt-water'), { ...env, plekken: { water: [] } }) !== '');

// --- kruising -----------------------------------------------------------------------------------------------
{
  const g = { x: 0, y: 0, z: 50, nx: 1, ny: 0 };
  const k = R.kruising({ x: -10, y: 4, z: 40, agl: 40 }, { x: 10, y: 4, z: 60, agl: 60 }, g);
  check('kruising: midden, opzij en omhoog', k && Math.abs(k.across - 4) < 1e-9 && Math.abs(k.dz) < 1e-9 && k.dir === 1, JSON.stringify(k));
  check('kruising: achteruit telt als dir -1', R.kruising({ x: 10, y: 0, z: 50, agl: 50 }, { x: -10, y: 0, z: 50, agl: 50 }, g).dir === -1);
  check('kruising: niets als hij ervoor blijft', R.kruising({ x: -10, y: 0, z: 50, agl: 0 }, { x: -2, y: 0, z: 50, agl: 0 }, g) === null && R.kruising(null, { x: 1, y: 1 }, g) === null);
}

// --- vliegen met het echte arcade-vliegtuig --------------------------------------------------------------------
function vlieg(les, { maxS = 330, dt = 1 / 30, opts = {} } = {}) {
  const baan = R.bouwBaan(les, env);
  const st = R.nieuweStaat(les, baan);
  const s = baan.start;
  const p = makePlane(s.x, s.y, s.z, s.heading);
  p.onGround = false; p.speed = s.speed; p.throttle = 0.6;
  const ctl = { thr: 0.6 };
  const gas = baan.gas || 1;
  const baanVoor = baan.soort === 'landen' ? baan.baan : baan.soort === 'nood' ? makeStrip({ x: baan.veld.x - Math.cos(baan.veld.heading) * baan.veld.lengte / 2, y: baan.veld.y - Math.sin(baan.veld.heading) * baan.veld.lengte / 2, heading: baan.veld.heading, length: baan.veld.lengte, width: baan.veld.breed }) : null;
  const onRunway = baanVoor ? (x, y) => baanVoor.contains(x, y) : () => false;
  const events = [];
  let td = null;
  const spoor = process.argv.includes('--spoor=' + les.id);
  let volgT = 0;
  for (let t = 0; t < maxS && st.fase === 'vlieg'; t += dt) {
    const c = { x: p.x, y: p.y, z: p.z, agl: p.z, speed: p.speed, vz: p.vz, heading: p.heading, onGround: p.onGround, touchdown: td, crashed: p.crashed, opBaan: baanVoor ? baanVoor.contains(p.x, p.y) : false };
    for (const e of R.stap(les, baan, st, c, dt, opts)) { events.push(e); if (spoor) console.log('  ev', t.toFixed(1), e.k, e.tekst); }
    if (spoor && c.agl < 20 && !c.onGround) console.log('  lage vlucht', t.toFixed(1), 'x', c.x.toFixed(0), 'y', c.y.toFixed(0), 'agl', c.agl.toFixed(1), 'v', c.speed.toFixed(1), 'vz', c.vz.toFixed(1), 'roll', p.roll.toFixed(2), 'pitch', p.pitch.toFixed(2), 'h', c.heading.toFixed(2), 'baan', c.opBaan);
    if (spoor && t >= volgT) { volgT += 4; console.log('  t', t.toFixed(0), 'x', c.x.toFixed(0), 'y', c.y.toFixed(0), 'agl', c.agl.toFixed(1), 'v', c.speed.toFixed(1), 'vz', c.vz.toFixed(1), 'h', c.heading.toFixed(2), 'thr', ctl.thr.toFixed(2), 'i', st.i); }
    if (st.fase !== 'vlieg') break;
    const k = R.piloot(les, baan, st, c, env);
    const keys = { w: k.w, s: k.s, a: k.a, d: k.d, ' ': k.spatie, control: k.ctrl, shift: k.shift };
    const inp = planeInput((key) => !!keys[key], ctl, dt);
    ctl.thr = Math.min(ctl.thr, gas);
    inp.throttle = ctl.thr;
    p.landing = null;
    stepPlane(p, inp, dt, () => 0, onRunway, PLANE);
    td = p.landing || null;
    if (!td && p.onGround && c.onGround === false) td = 'zacht';
  }
  const uit = R.beoordeel(les, baan, st);
  return { baan, st, uit, events, p };
}

const vt = {};
for (const les of R.lessenVan('vliegtuig')) {
  const r = vlieg(les);
  vt[les.id] = r;
  const lijst = r.events.filter((e) => e.k === 'goed' || e.k === 'fout').map((e) => `${e.k}:${e.tekst}`).join(' | ');
  check(`${les.id}: de piloot haalt goud (het is te halen)`, r.uit.medaille === 3, `${r.st.fase} ${r.st.reden} t=${r.st.t.toFixed(0)} ${JSON.stringify(r.uit)} ${lijst}`);
  if (process.argv.includes('--uitleg')) console.log(les.id, r.st.fase, r.st.reden, JSON.stringify(r.uit), lijst);
}

// --- een helikopter zonder wereld: de vliegregels van heliflight.js (flyHeli) op vlakke grond, zonder gebouwen ----
// Dezelfde constanten (kruissnelheid, optrekken, hoveren, stijgen en zakken, de landingshulp, de landing- en crashgrenzen) en
// dezelfde asvorming (helictl.js). Een afwijking van flyHeli zou deze test oneerlijk maken; de Electron-scene vliegt de echte.
function stapHeli(v, k, dt) {
  const CRUISE = 30, BOOST = 40, BACK = 9, SIDE = 11, CLIMB = 8, SINK = 7, ACC = 7, BOOST_ACC = 9.5, COAST = 3.5, HOVER = 13, V_ACC = 12, YAW_RATE = 1.45, YAW_ACC = 6;
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  let vx = ca * v.speed + v.driftX, vy = sa * v.speed + v.driftY, vz = v.vz;
  const raw = { up: (k.spatie ? 1 : 0) - (k.ctrl ? 1 : 0), yaw: (k.d ? 1 : 0) - (k.a ? 1 : 0), fwd: (k.w ? 1 : 0) - (k.s ? 1 : 0), side: 0 };
  const hover = raw.fwd < 0 && vx * ca + vy * sa > 2;
  const q = shapeInputs(v.ctl, raw, dt);
  const boost = !!k.shift;
  v.yawRate += (q.yaw * YAW_RATE - v.yawRate) * Math.min(1, dt * YAW_ACC);
  v.angle += v.yawRate * dt;
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const fwdSpeed = hover ? 0 : q.fwd > 0 ? q.fwd * (boost ? BOOST : CRUISE) : q.fwd * BACK;
  let tvx = c * fwdSpeed - s * q.side * SIDE, tvy = s * fwdSpeed + c * q.side * SIDE;
  const steering = q.fwd !== 0 || q.side !== 0;
  let rate = hover ? HOVER : steering ? (boost ? BOOST_ACC : ACC) : COAST;
  if (v.onGround) { tvx = 0; tvy = 0; rate = 10; }
  let dx = tvx - vx, dy = tvy - vy;
  const dl = Math.hypot(dx, dy), step = rate * dt;
  if (dl > step) { dx *= step / dl; dy *= step / dl; }
  vx += dx; vy += dy;
  let tvz = q.up > 0 ? CLIMB * q.up : q.up < 0 ? -SINK : 0;
  if (tvz < 0) tvz = Math.max(tvz, -(1.6 + Math.max(0, v.z) * 0.55));
  vz += Math.max(-V_ACC * dt * (hover ? 1.3 : 1), Math.min(V_ACC * dt * (hover ? 1.3 : 1), tvz - vz));
  if (v.onGround && q.up > 0) v.onGround = false;
  let nz = v.z + vz * dt;
  v.touch = null;
  if (nz <= 0.02 && !(vz > 0 && !v.onGround)) {
    const impact = -vz, hs = Math.hypot(vx, vy);
    nz = 0;
    if (!v.onGround) {
      if (impact > 11 || hs > 19) { v.touch = 'hard'; vz = Math.max(1.5, impact * 0.25); vx *= 0.3; vy *= 0.3; }
      else if (impact > 4.5 || hs > 7) { v.touch = 'hard'; vz = impact * 0.3; vx *= 0.4; vy *= 0.4; }
      else { v.onGround = true; v.touch = 'zacht'; vz = 0; }
    } else vz = Math.max(0, vz);
  } else if (nz > 0.35) v.onGround = false;
  if (v.onGround) { const fr = Math.max(0, 1 - dt * 6); vx *= fr; vy *= fr; nz = 0; }
  v.x += vx * dt; v.y += vy * dt; v.z = nz; v.vz = vz;
  v.speed = vx * c + vy * s; v.driftX = vx - c * v.speed; v.driftY = vy - s * v.speed;
  return v;
}

function vliegHeli(les, { maxS = 330, dt = 1 / 30, opts = {} } = {}) {
  const baan = R.bouwBaan(les, env);
  const st = R.nieuweStaat(les, baan);
  const sp = baan.start;
  const v = { x: sp.x, y: sp.y, z: sp.z, angle: sp.heading, speed: 0, driftX: 0, driftY: 0, vz: 0, yawRate: 0, onGround: false, ctl: {}, touch: null };
  const spoor = process.argv.includes('--spoor=' + les.id);
  let volgT = 0;
  const events = [];
  for (let t = 0; t < maxS && st.fase === 'vlieg'; t += dt) {
    const c = { x: v.x, y: v.y, z: v.z, agl: v.z, speed: Math.hypot(v.vx !== undefined ? v.vx : v.speed * Math.cos(v.angle) + v.driftX, v.speed * Math.sin(v.angle) + v.driftY), vz: v.vz, heading: v.angle, onGround: v.onGround, touchdown: v.touch, crashed: false };
    for (const e of R.stap(les, baan, st, c, dt, opts)) { events.push(e); if (spoor) console.log('  ev', t.toFixed(1), e.k, e.tekst); }
    if (spoor && t >= volgT) { volgT += 4; console.log('  t', t.toFixed(0), 'x', c.x.toFixed(0), 'y', c.y.toFixed(0), 'z', c.z.toFixed(1), 'v', c.speed.toFixed(1), 'vz', c.vz.toFixed(1), 'h', c.heading.toFixed(2), 'i', st.i, 'in', st.in.toFixed(1)); }
    if (st.fase !== 'vlieg') break;
    stapHeli(v, R.piloot(les, baan, st, c, env), dt);
  }
  return { baan, st, uit: R.beoordeel(les, baan, st), events };
}

for (const les of R.lessenVan('heli')) {
  const r = vliegHeli(les);
  const lijst = r.events.filter((e) => e.k === 'goed' || e.k === 'fout').map((e) => `${e.k}:${e.tekst}`).join(' | ');
  check(`${les.id}: de piloot haalt goud met de heli (het is te halen)`, r.uit.medaille === 3, `${r.st.fase} ${r.st.reden} t=${r.st.t.toFixed(0)} ${JSON.stringify(r.uit)} ${lijst}`);
  if (process.argv.includes('--uitleg')) console.log(les.id, r.st.fase, r.st.reden, JSON.stringify(r.uit), lijst);
}

// de strafbare dingen
{
  const les = R.lesVan('vt-ringen');
  const baan = R.bouwBaan(les, env), st = R.nieuweStaat(les, baan);
  // rechtuit vliegen zonder te sturen: de eerste ring gemist of niet, maar nooit een medaille
  const p = makePlane(baan.start.x, baan.start.y, baan.start.z, baan.start.heading + Math.PI); // de verkeerde kant op
  p.onGround = false; p.speed = 45;
  let t = 0;
  while (st.fase === 'vlieg' && t < 400) { R.stap(les, baan, st, { x: p.x, y: p.y, z: p.z, agl: p.z, speed: 45, vz: 0, heading: p.heading, onGround: false }, 0.5); p.x += Math.cos(p.heading) * 22; p.y += Math.sin(p.heading) * 22; t += 0.5; }
  check('de verkeerde kant op: tijd om, geen medaille', st.fase === 'klaar' && R.beoordeel(les, baan, st).medaille === 0, st.fase + ' ' + st.goed);
  const st2 = R.nieuweStaat(les, baan);
  R.stap(les, baan, st2, { x: 0, y: 0, z: 0, agl: 0, crashed: true, heading: 0 }, 0.1);
  check('neergestort: les mislukt, geen medaille', st2.fase === 'mislukt' && R.beoordeel(les, baan, st2).medaille === 0);
}

// --- de maten van de lessen ------------------------------------------------------------------------------------
{
  // Landen: afstand en zachtheid bepalen de medaille
  const les = R.lesVan('vt-landen'), baan = R.bouwBaan(les, env);
  const geland = (afstand, kw, opBaan = true) => {
    const st = R.nieuweStaat(les, baan);
    R.stap(les, baan, st, { x: baan.merk.x + afstand, y: baan.merk.y, z: 0, agl: 0, heading: 0, touchdown: kw, opBaan }, 0.1);
    st.fase = 'klaar';
    return R.beoordeel(les, baan, st).medaille;
  };
  check('landen: zacht en op de streep is goud', geland(10, 'zacht') === 3);
  check('landen: zacht maar ver is zilver, hard en dichtbij ook', geland(50, 'zacht') === 2 && geland(10, 'hard') === 2);
  check('landen: hard en ver op de baan is brons', geland(150, 'hard') === 1);
  check('landen: naast de baan is niets', geland(10, 'zacht', false) === 0);
  const hl = R.lesVan('hk-landen'), hb = R.bouwBaan(hl, env);
  const hland = (afstand, kw) => { const st = R.nieuweStaat(hl, hb); R.stap(hl, hb, st, { x: hb.merk.x + afstand, y: hb.merk.y, z: 0, agl: 0, heading: 0, touchdown: kw }, 0.1); st.fase = 'klaar'; return R.beoordeel(hl, hb, st).medaille; };
  check('helidek: midden zacht is goud, op het dek brons, ernaast niets', hland(1, 'zacht') === 3 && hland(5, 'zacht') === 2 && hland(7, 'hard') === 1 && hland(20, 'zacht') === 0);
}
{
  // Water: het aandeel binnen de lijnen
  const les = R.lesVan('vt-water'), baan = R.bouwBaan(les, env);
  const a = baan.corridor, ux = Math.cos(a.hoek), uy = Math.sin(a.hoek);
  const vlieg2 = (agl, over) => {
    const st = R.nieuweStaat(les, baan);
    for (let s = -300; s <= a.lengte + 50 && st.fase === 'vlieg'; s += 10) {
      const hier = over && s > over[0] && s < over[1] ? over[2] : agl;
      R.stap(les, baan, st, { x: a.a.x + ux * s, y: a.a.y + uy * s, z: hier, agl: hier, heading: a.hoek, speed: 40, vz: 0 }, 0.25);
    }
    return { st, uit: R.beoordeel(les, baan, st) };
  };
  check('water: de hele lengte binnen de lijnen is goud', vlieg2(12).uit.medaille === 3);
  check('water: een derde te hoog is brons of niets, geen goud', vlieg2(12, [300, 700, 40]).uit.medaille < 3 && vlieg2(12, [300, 700, 40]).uit.medaille >= 1);
  check('water: de hele lengte te hoog is niets', vlieg2(40).uit.medaille === 0);
  const nat = vlieg2(12, [500, 520, 0.5]);
  check('water: het water raken mislukt de les', nat.st.fase === 'mislukt' && nat.uit.medaille === 0);
  const zij = R.nieuweStaat(les, baan);
  R.stap(les, baan, zij, { x: a.a.x + ux * 50, y: a.a.y + uy * 50, z: 12, agl: 12, heading: a.hoek }, 0.1);
  R.stap(les, baan, zij, { x: a.a.x + ux * 60 - uy * (a.breed + 80), y: a.a.y + uy * 60 + ux * (a.breed + 80), z: 12, agl: 12, heading: a.hoek }, 0.1);
  check('water: ver uit de baan mislukt de les', zij.fase === 'mislukt');
}
{
  // Slalom: de kant en de afstand
  const les = R.lesVan('vt-slalom'), baan = R.bouwBaan(les, env), K = baan.regels;
  const langs = (zijde, d, agl = 60) => {
    const m = baan.molens[0], st = R.nieuweStaat(les, baan);
    // vlieg langs de molen in oostelijke richting: de molen ligt links (+y) of rechts (-y) van de neus
    const ev = [];
    for (let x = -400; x <= 400; x += 10) for (const e of R.stap(les, baan, st, { x: m.x + x, y: m.y - zijde * d, z: agl, agl, heading: 0, speed: 45, vz: 0 }, 0.2)) ev.push(e);
    return ev.filter((e) => e.i === 0).map((e) => e.k).join();
  };
  check('slalom: de goede kant en op afstand is goed (molen links)', langs(1, 80) === 'goed');
  check('slalom: de verkeerde kant is fout', langs(-1, 80) === 'fout');
  check('slalom: te dichtbij en te ver zijn fout', langs(1, K.dmin - 10) === 'fout' && langs(1, K.dmax + 60) === 'fout');
  check('slalom: te hoog is fout', langs(1, 80, K.hoog + 40) === 'fout');
}
{
  // Opening: de breedte met de vleugels, de hoogte
  const les = R.lesVan('vt-opening'), baan = R.bouwBaan(les, env), g = baan.poorten[2];
  const door = (across, agl, richting = 1) => {
    const st = R.nieuweStaat(les, baan);
    st.i = 2;
    const sx = (s) => ({ x: g.x + g.nx * s * richting - g.ny * across, y: g.y + g.ny * s * richting + g.nx * across, z: agl, agl, heading: Math.atan2(g.ny, g.nx), speed: 40, vz: 0 });
    const ev = [];
    for (let s = -150; s <= 150; s += 10) for (const e of R.stap(les, baan, st, sx(s), 0.25)) ev.push(e);
    return ev.filter((e) => e.i === 2).map((e) => e.k + ':' + e.tekst).join();
  };
  const mid = (g.lo + g.hi) / 2;
  check('opening: het midden is goed (ook van de andere kant)', door(0, mid).startsWith('goed') && door(0, mid, -1).startsWith('goed'));
  check('opening: met de vleugel tegen de gevel is fout', door(g.breedte / 2 - 2, mid).startsWith('fout'));
  check('opening: net binnen de marge is goed', door(g.breedte / 2 - baan.marge - 1, mid).startsWith('goed'));
  check('opening: te hoog en te laag zijn fout', door(0, g.hi + 3).includes('Te hoog') && door(0, g.lo - 1).includes('Te laag'));
  check('opening: ver naast het gebouw is fout', door(g.breedte / 2 + 10, mid).includes('Tegen het gebouw'));
  const w = R.nieuweStaat(les, baan);
  check('opening: de hulp (ruimere poort) maakt een scheve doorgang goed', (() => { const st = R.nieuweStaat(les, baan); st.i = 2; const across = g.breedte / 2 - baan.marge + 1.5; const p = { x: g.x - g.nx * 5 - g.ny * across, y: g.y - g.ny * 5 + g.nx * across, z: mid, agl: mid }; const q = { ...p, x: p.x + g.nx * 10, y: p.y + g.ny * 10 }; R.stap(les, baan, st, p, 0.1, { widen: 1.5 }); const ev = R.stap(les, baan, st, q, 0.1, { widen: 1.5 }); return ev.some((e) => e.k === 'goed'); })());
  void w;
}
{
  // Hoveren: stil in de cirkel, de tijd bepaalt de medaille
  const les = R.lesVan('hk-hoveren'), baan = R.bouwBaan(les, env);
  const hoover = (snelheid, nauw) => {
    const st = R.nieuweStaat(les, baan);
    for (let t = 0; t < 100 && st.fase === 'vlieg'; t += 0.1) R.stap(les, baan, st, { x: baan.cirkel.x + (nauw ? 2 : 20), y: baan.cirkel.y, z: 15, agl: 15, speed: snelheid, heading: 0, onGround: false }, 0.1);
    return { st, uit: R.beoordeel(les, baan, st) };
  };
  const goed = hoover(0.5, true);
  check('hoveren: stil in de cirkel haalt goud', goed.st.fase === 'klaar' && goed.uit.medaille === 3, goed.st.t);
  check('hoveren: te snel of buiten de cirkel haalt niets', hoover(6, true).st.fase === 'mislukt' && hoover(0.5, false).st.fase === 'mislukt');
}
{
  // Noodlanding: de medaille volgt de plek en de zachtheid
  const les = R.lesVan('hk-nood'), baan = R.bouwBaan(les, env);
  const neer = (dx, dy, kw) => { const st = R.nieuweStaat(les, baan); R.stap(les, baan, st, { x: baan.veld.x + dx, y: baan.veld.y + dy, z: 0, agl: 0, heading: 0, touchdown: kw }, 0.1); R.stap(les, baan, st, { x: baan.veld.x + dx, y: baan.veld.y + dy, z: 0, agl: 0, heading: 0, onGround: true }, 2); return R.beoordeel(les, baan, st).medaille; };
  check('nood: het midden zacht is goud, ergens in het veld zacht zilver, hard brons', neer(5, 0, 'zacht') === 3 && neer(100, 0, 'zacht') === 2 && neer(100, 0, 'hard') === 1);
  check('nood: naast het weiland is niets', neer(0, 300, 'zacht') === 0);
}
{
  // Ringen: de tijd telt, de ring ernaast is gemist
  const les = R.lesVan('hk-ringen'), baan = R.bouwBaan(les, env);
  const st = R.nieuweStaat(les, baan);
  let prev = baan.start;
  for (const g of baan.ringen) {
    const a = { x: g.x - g.nx * 20, y: g.y - g.ny * 20, z: g.z, agl: g.z, heading: Math.atan2(g.ny, g.nx) }, b = { x: g.x + g.nx * 20, y: g.y + g.ny * 20, z: g.z, agl: g.z, heading: a.heading };
    R.stap(les, baan, st, a, 0.5); R.stap(les, baan, st, b, 0.5);
  }
  void prev;
  check('ringen: door het midden van alle ringen is goud', st.fase === 'klaar' && R.beoordeel(les, baan, st).medaille === 3 && st.goed === baan.ringen.length);
  const st3 = R.nieuweStaat(les, baan), g0 = baan.ringen[0];
  R.stap(les, baan, st3, { x: g0.x - g0.nx * 20 - g0.ny * 50, y: g0.y - g0.ny * 20 + g0.nx * 50, z: g0.z, agl: g0.z, heading: 0 }, 0.5);
  const ev3 = R.stap(les, baan, st3, { x: g0.x + g0.nx * 20 - g0.ny * 50, y: g0.y + g0.ny * 20 + g0.nx * 50, z: g0.z, agl: g0.z, heading: 0 }, 0.5);
  check('ringen: 50 m ernaast is gemist (4 straal = 44 m)... of ver weg en niets', st3.goed === 0 && st3.i <= 1, JSON.stringify(ev3));
}

// --- het bestand met gemeten plekken ---------------------------------------------------------------------
{
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  check('plekken: versie en bron', plekken.v === 1 && /3D BAG/.test(plekken.bron));
  check('plekken: 1 tot 3 stukken water, ruim en breed genoeg', plekken.water.length >= 1 && plekken.water.every((w) => w.lengte === 1200 && w.vrij >= 1400 && w.halveBreedte >= 100 && Math.abs(d(w.a, w.b) - 1200) < 5), JSON.stringify(plekken.water));
  check('plekken: de velden zijn 420 x 80 en liggen buiten Eelde', plekken.velden.length >= 2 && plekken.velden.every((v) => v.lengte === 420 && v.breedte === 80 && d(v, plekken.eelde) >= 2500));
  check('plekken: vier molens, onderling 900 tot 3200 m', plekken.molens.length === 4 && plekken.molens.every((m, i) => i === 0 || (d(m, plekken.molens[i - 1]) >= 900 && d(m, plekken.molens[i - 1]) <= 3200)));
  const kl = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/landmarkkits.json'), 'utf8')).items;
  check('plekken: de molens zijn echte molens uit landmarkkits', plekken.molens.every((m) => kl.some((k) => k.k === 'mill' && k.n === m.naam && Math.abs(k.x - m.x) < 0.2 && Math.abs(k.y - m.y) < 0.2)));
  const o = plekken.openingen;
  check('plekken: drie openingen met oplopende moeilijkheid (breed, midden, krap)', o.length === 3 && o[0].breedte > o[1].breedte && o[1].breedte > o[2].breedte && o[0].breedte >= 54 && o[2].breedte >= 24 && o[2].breedte < 32);
  check('plekken: elke opening is hoog genoeg en heeft een eenheidsnormaal', o.every((g) => g.hoogte >= 10 && Math.abs(Math.hypot(g.nx, g.ny) - 1) < 0.01 && g.daken.length === 2 && g.daken.every((h) => h >= 14) && Math.abs(Math.min(...g.daken) - 3 - g.hoogte) < 0.2));
  check('plekken: de openingen liggen dicht bij elkaar (binnen 3 km)', o.every((g) => o.every((h) => d(g, h) < 3000)));
  const ruimVoorVleugels = o.map((g) => g.breedte / 2 - KISTMARGE(g));
  check('plekken: ook de krapste opening laat een vliegtuig met vleugels erdoor', ruimVoorVleugels.every((r) => r > 6), ruimVoorVleugels.join());
}
function KISTMARGE() { return R.KIST.vliegtuig.halveSpan; }

console.log(bad ? `${bad} van ${n} mislukt` : `vliegschool_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
