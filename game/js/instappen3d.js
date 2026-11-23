// Wachtenden en in- en uitstappers bij bushaltes en perrons, getekend (wens eigenaar 23-11). Eén systeem voor bus en
// trein: de planning staat in instappen.js (puur, getest), dit is de lijm met de scène.
//
// - Wachtgroepen: bij de haltes binnen BUS_R en de stations binnen TREIN_R van de speler staan een paar mensen
//   (bescheiden, vast per halte en kwartier). Verder weg: niemand in beeld; de bussen en treinen rijden en halteren
//   daar gewoon (halteren.js, railway.js), alleen zonder poppetjes.
// - Uitwisselingen: een bus meldt zich bij de halte (world.haltefx: de lijnbussen in het verkeer via
//   vehicle/halteai.js, de bijbaan via sidejob_lijn.js), een trein die bij een halte stilstaat wordt hier gezien. De
//   wachtenden lopen naar de dichtstbijzijnde deur en verdwijnen erin; uitstappers komen uit de deur en lopen weg.
//   Na een uitwisseling loopt de halte na een tijdje weer vol.
// - Mensen komen uit een vaste pool (POOL_MAX) van gewone NPC-figuren met kleding uit de rolpools (clothing.js), via
//   de bouwer van scene3d.js; ze worden nooit per uitwisseling gemaakt of weggegooid, en er komt er hoogstens één
//   per beeld bij.
//
// Samen spelen: alles is lokaal beeld. Bij de host komen de bussen uit de eigen verkeers-AI; een gast ziet de bussen
// van de host (snapshot) en tekent zelf reizigers zodra zo'n bus een seconde bij een halte stilstaat. Treinen ziet
// iedereen in zijn eigen spoorwegen (het rooster is dezelfde klok). Aantallen en gezichten kunnen per speler
// verschillen; de gameplay (busride.js, machinistrules.js) telt niet mee.

import { hoofdspeler } from './players.js';
import { animatePersonWalk } from './models3d_people.js';
import { getTrains, getRoutes, routePoint } from './railway.js';
import { perronHitAt } from './perrons.js';
import { currentStation } from './stationlife.js';
import { haltedeuren } from './haltefiguren.js';
import {
  INSTAP, zaad, maakRng, busDeurenWereld, treinDeuren, perronKanten, wachtAantal, wachtplekken, planInstappen,
  figuurStand, treinBijHalte, makeStilteWacht, haltesInBeeld, halteplek,
} from './instappen.js';

const POOL_MAX = 28;          // mensen tegelijk (wachtend en lopend samen)
const RESERVE = 8;            // daarvan blijven er zoveel vrij voor uitstappers
const BUS_R = 100;            // m: haltes met wachtenden
const TREIN_R = 220;          // m: perrons met wachtenden
const HYST = 30;              // m: pas verder weg gaat een groep weer weg
const VERVERS_S = 0.5;        // s tussen twee keer kijken welke groepen er moeten zijn
const BIJ_BUS_M = 16;         // m: zo ver mag de halte van een stilstaande bus liggen
const VOL_MIN = 35, VOL_MAX = 90; // s voor een halte na een bus weer vol is
const MAX_UITWISSELINGEN = 6;
const IDLE_ELKE = 4;          // wachtenden: de rusthouding één keer per zoveel beelden
const SHIRTS = [0xb5483a, 0x3f7a5a, 0xcaa46a, 0x5a62a8, 0x8a5aa0, 0x2f6f8f, 0x6d6d6d, 0xd8cfc0];
const SKINS = [0xe0b48a, 0xc68c63, 0x8d5a3b, 0xf0c8a0];
const ROLLEN = ['voetganger', 'voetganger', 'voetganger', 'student', 'zakenman', 'toerist', 'wandelaar', 'ambtenaar'];

const vrij = [];              // pool: klaar voor gebruik, onzichtbaar
let gebouwd = 0;
const groepen = new Map();    // sleutel -> { soort, x, y, z, ux, uy, nx, ny, plekken, mensen: [mesh|null], volOp, seed }
const wissels = [];           // lopende uitwisselingen: { t, z, figuren: [{ f, mesh }] }
const stilBus = makeStilteWacht(1);
const treinGemeld = new WeakMap(); // trein -> sleutel van de halte waar hij al gemeld is
const stationKant = new Map(); // route:halte -> { x, y, ang, kanten, z }
const _st = { x: 0, y: 0, zichtbaar: false, lopen: false, klaar: false };
let ververs = 0, frame = 0, klok = 0;

function pak(scene, bouw, budget) {
  let m = vrij.pop();
  if (!m) {
    if (gebouwd >= POOL_MAX || budget.n <= 0) return null;
    budget.n--;
    const i = gebouwd++;
    m = bouw(SHIRTS[(i * 5) % SHIRTS.length], SKINS[(i * 3) % SKINS.length], 17 + i * 37.7, ROLLEN[(i * 7) % ROLLEN.length]);
    scene.add(m);
  }
  m.visible = true;
  return m;
}
function laat(m) { if (m) { m.visible = false; vrij.push(m); } }

// --- groepen ---------------------------------------------------------------------------------------------

function kwartier() { return Math.floor(klok / 900); }

// plekken: zoveel als er hoogstens kunnen staan; doel: zoveel staan er nu (een perron wordt drukker voor de trein)
function maakGroep(sleutel, soort, anker, z, aantal, opts, max = aantal, P = null) {
  const seed = zaad(sleutel);
  const g = { soort, ...anker, z, seed, doel: aantal, max, plekken: null, mensen: [], volOp: 0, opts, P, d: 0 };
  g.plekken = opPerron(g, wachtplekken(anker, max, seed ^ kwartier(), opts));
  return g;
}

// Op een perron: alleen plekken met perronvloer eronder (een perron is niet overal even lang), elk op zijn eigen hoogte.
function opPerron(g, lijst) {
  if (!g.P) return lijst;
  const out = [];
  for (const pl of lijst) { const h = perronHitAt(g.P, pl.x, pl.y); if (h) { pl.z = h.z; out.push(pl); } }
  return out;
}

// De perrondrukte van het vertrekbord (stationlife.js, uit de dienstregeling) voor het station bij de speler, verdeeld
// over de perronkanten die daar wachtenden hebben; elders een vast bescheiden aantal.
const TREIN_GROEP_MAX = 6;
function treinDoel(sleutel, naam, kanten) {
  const cur = currentStation();
  if (cur && cur.station && cur.station.name === naam && cur.view) {
    const lijnen = Math.max(1, cur.station.lijnen ? cur.station.lijnen.length : 1);
    return Math.min(TREIN_GROEP_MAX, Math.ceil((cur.view.drukte || 0) / (lijnen * Math.max(1, kanten))));
  }
  return wachtAantal(zaad(sleutel) ^ kwartier(), 1, 3);
}

function busGroepen(world, p, gewenst) {
  for (const h of haltesInBeeld()) {
    const pl = halteplek(h);
    const d = Math.hypot(pl.x - p.x, pl.y - p.y);
    const sleutel = 'b' + h.id;
    if (d > BUS_R + (groepen.has(sleutel) ? HYST : 0)) continue;
    gewenst.add(sleutel);
    if (groepen.has(sleutel)) continue;
    const c = Math.cos(pl.ang), s = Math.sin(pl.ang);
    const z = world.map && world.map.spawnZ ? world.map.spawnZ(pl.x, pl.y) : 0;
    const anker = { x: pl.x, y: pl.y, ux: c, uy: s, nx: -s, ny: c };
    groepen.set(sleutel, maakGroep(sleutel, 'bus', anker, z, wachtAantal(zaad(sleutel) ^ kwartier(), 0, 3), { langs: 2.2, van: 0.2, tot: 1.0 }));
  }
}

function stationInfo(world, route, ri, si) {
  const k = ri + ':' + si;
  let inf = stationKant.get(k);
  if (inf !== undefined) return inf;
  const st = route.stops[si];
  const a = routePoint(route, st.s - 6), b = routePoint(route, st.s + 6);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const m = routePoint(route, st.s);
  const P = world.map && world.map.elev && world.map.elev.perrons;
  const probe = (x, y) => !!perronHitAt(P, x, y);
  inf = { x: m[0], y: m[1], ang, kanten: P ? perronKanten(probe, m[0], m[1], ang) : [] };
  stationKant.set(k, inf);
  return inf;
}

function treinGroepen(world, p, gewenst) {
  const routes = getRoutes();
  const P = world.map && world.map.elev && world.map.elev.perrons;
  for (let ri = 0; ri < routes.length; ri++) {
    const route = routes[ri];
    for (let si = 0; si < route.stops.length; si++) {
      const st = route.stops[si];
      if (st.offmap) continue;
      // grove eerste toets zonder routepunt: de halte ligt in de buurt van een eerder berekende plek
      const inf0 = stationKant.get(ri + ':' + si);
      if (inf0 && Math.hypot(inf0.x - p.x, inf0.y - p.y) > TREIN_R + HYST) continue;
      const inf = inf0 || stationInfo(world, route, ri, si);
      const d = Math.hypot(inf.x - p.x, inf.y - p.y);
      for (const k of inf.kanten) {
        const sleutel = `t${ri}:${si}:${k}`;
        if (d > TREIN_R + (groepen.has(sleutel) ? HYST : 0)) continue;
        gewenst.add(sleutel);
        const bestaand = groepen.get(sleutel);
        if (bestaand) { bestaand.doel = treinDoel(sleutel, st.name, inf.kanten.length); continue; }
        const c = Math.cos(inf.ang), s = Math.sin(inf.ang);
        const nx = -s * k, ny = c * k;
        const rand = INSTAP.TREIN_HW + 0.35; // de perronrand
        const anker = { x: inf.x + nx * rand, y: inf.y + ny * rand, ux: c, uy: s, nx, ny };
        const h = perronHitAt(P, anker.x + nx * 1.5, anker.y + ny * 1.5);
        const z = h ? h.z : (world.map && world.map.spawnZ ? world.map.spawnZ(anker.x, anker.y) : 0);
        const g = maakGroep(sleutel, 'trein', anker, z, treinDoel(sleutel, st.name, inf.kanten.length), { langs: 22, van: 1.2, tot: 2.8, minGat: 1.2 }, TREIN_GROEP_MAX, P);
        g.route = ri; g.halte = si; g.kant = k;
        groepen.set(sleutel, g);
      }
    }
  }
}

function ruimGroep(g) {
  for (const m of g.mensen) laat(m);
  g.mensen.length = 0;
}

const _gewenst = new Set();
const volgorde = [];          // de groepen, dichtstbij eerst (wie het eerst gevuld wordt)
let routesVan = null;
function verversGroepen(world, p) {
  // een nieuwe spoorwereld (laden, init): de perronkanten opnieuw zoeken
  if (getRoutes() !== routesVan) { routesVan = getRoutes(); stationKant.clear(); for (const [k, g] of groepen) if (g.soort === 'trein') { ruimGroep(g); groepen.delete(k); } }
  _gewenst.clear();
  busGroepen(world, p, _gewenst);
  treinGroepen(world, p, _gewenst);
  for (const [k, g] of groepen) if (!_gewenst.has(k)) { ruimGroep(g); groepen.delete(k); }
  volgorde.length = 0;
  for (const g of groepen.values()) { g.d = Math.hypot(g.x - p.x, g.y - p.y); volgorde.push(g); }
  volgorde.sort((a, b) => a.d - b.d);
}

// Wachtenden neerzetten (één nieuwe per beeld uit de pool) en de halte na een uitwisseling weer laten vollopen.
function vulGroepen(scene, bouw, budget) {
  for (const g of volgorde) {
    if (g.volOp > klok) continue;
    if (g.volOp) {
      // weer vol: nieuwe mensen op nieuwe plekken naast wie er nog staat; een bushalte kiest een nieuw aantal, een
      // perron volgt de drukte
      if (g.soort === 'bus') g.doel = g.max = Math.max(g.mensen.length, wachtAantal(g.seed ^ Math.floor(klok / 60), 0, 3));
      const nieuw = opPerron(g, wachtplekken(g, g.max, g.seed ^ Math.floor(klok), g.opts));
      for (let i = 0; i < g.mensen.length; i++) nieuw[i] = g.plekken[i];
      g.plekken = nieuw;
      g.volOp = 0;
    }
    const n = Math.min(g.doel, g.plekken.length);
    for (let i = g.mensen.length; i < n; i++) {
      if (gebouwd - vrij.length >= POOL_MAX - RESERVE) return; // de rest van de pool is voor uitstappers
      const m = pak(scene, bouw, budget);
      if (!m) return;
      const pl = g.plekken[i];
      m.position.set(pl.x, pl.z ?? g.z, pl.y);
      m.rotation.y = -pl.ang;
      animatePersonWalk(m, 0, 0.1);
      g.mensen.push(m);
    }
  }
}

// --- uitwisselingen --------------------------------------------------------------------------------------

function startWissel(g, deuren, ev, z, opts, rng) {
  if (wissels.length >= MAX_UITWISSELINGEN) return;
  const wacht = g ? g.plekken.slice(0, g.mensen.length) : null;
  const figuren = planInstappen(deuren, ev, { rng, wachtenden: wacht, ...opts });
  if (!figuren.length) return;
  const w = { t: 0, z, figuren: [] };
  for (const f of figuren) w.figuren.push({ f, mesh: f.w >= 0 && g ? g.mensen[f.w] : null });
  if (g) {
    // wie niet instapt (meer wachtenden dan plek) blijft gewoon staan
    const over = [];
    for (let i = 0; i < g.mensen.length; i++) if (!figuren.some((f) => f.w === i)) over.push(g.mensen[i]);
    g.plekken = g.plekken.filter((_, i) => i < g.mensen.length && !figuren.some((f) => f.w === i));
    g.mensen = over;
    g.volOp = klok + VOL_MIN + rng() * (VOL_MAX - VOL_MIN);
  }
  wissels.push(w);
}

// De groep bij een bus: aan zijn stoepkant (rechts), binnen BIJ_BUS_M.
function groepBijBus(v) {
  const rx = -Math.sin(v.angle || 0), ry = Math.cos(v.angle || 0);
  let best = null, bd = BIJ_BUS_M;
  for (const g of groepen.values()) {
    if (g.soort !== 'bus') continue;
    const dx = g.x - v.x, dy = g.y - v.y, d = Math.hypot(dx, dy);
    if (d < bd && dx * rx + dy * ry > 0.5) { bd = d; best = g; }
  }
  return best;
}

function busWissel(world, v, ev, rng) {
  const g = groepBijBus(v);
  const deuren = busDeurenWereld(v, haltedeuren(v));
  const z = g ? g.z : (world.map && world.map.spawnZ ? world.map.spawnZ(v.x, v.y) : v.z || 0);
  startWissel(g, deuren, ev, z, { max: INSTAP.MAX_BUS, maxUit: INSTAP.MAX_UIT_BUS }, rng);
}

const _treinStand = { c: 0, v: 0 };
function kijkTreinen(world, p, rng) {
  const P = world.map && world.map.elev && world.map.elev.perrons;
  if (!P) return;
  for (const t of getTrains()) {
    const car = t.cars[t.cars.length >> 1];
    if (!car || Math.hypot(car.x - p.x, car.y - p.y) > TREIN_R) continue;
    _treinStand.c = t.c;
    _treinStand.v = t.gastWeg === false && Number.isFinite(t.gastV) ? t.gastV : t.v; // een gevolgde trein bij een gast
    const idx = treinBijHalte(t.route, _treinStand, t.state === 'player' ? 30 : 2.5);
    if (idx < 0) { if (Math.abs(_treinStand.v) > 1) treinGemeld.delete(t); continue; }
    const ri = getRoutes().indexOf(t.route);
    const sleutel = ri + ':' + idx;
    if (treinGemeld.get(t) === sleutel) continue;
    treinGemeld.set(t, sleutel);
    const inf = stationInfo(world, t.route, ri, idx);
    for (const k of inf.kanten) {
      const g = groepen.get(`t${ri}:${idx}:${k}`) || null;
      const ev = { board: -1, alight: 1 + Math.floor(rng() * INSTAP.MAX_UIT_TREIN) };
      startWissel(g, treinDeuren(t, k), ev, g ? g.z : (perronHitAt(P, inf.x, inf.y) || { z: 0 }).z, { max: INSTAP.MAX_TREIN, maxUit: INSTAP.MAX_UIT_TREIN, wegloop: 3.5 }, rng); // het perron is smal: niet tot de overkant
    }
  }
}

// Een gast: de bussen van de host die bij een halte stilstaan (uit de snapshot).
function kijkGastBussen(world, dt, rng) {
  const host = world.coopHost;
  if (!host || !host.voertuigen) return;
  for (const hv of host.voertuigen) {
    if (hv.soort !== 'bus') continue;
    const stil = Math.abs(hv.snelheid || 0) < 0.3;
    if (!stilBus.tik(hv.id, stil, dt)) continue;
    const v = { x: hv.x, y: hv.y, angle: hv.angle || 0, isBus: true, model: { name: 'bus', len: hv.len || 12, wid: hv.wid || 2.55 } };
    const g = groepBijBus(v);
    if (!g) continue; // geen halte aan de stoepkant: een bus voor het rode licht
    busWissel(world, v, { board: -1, alight: zaad(hv.id + ':' + Math.floor(klok / 30)) % (INSTAP.MAX_UIT_BUS + 1) }, rng);
  }
  stilBus.ruim();
}

// --- per beeld -------------------------------------------------------------------------------------------

// bouw(shirt, skin, seed, rol) maakt een persoonsmesh (scene3d.js, het gewone NPC-figuur met kleding uit de rolpool).
export function syncInstappen(world, scene, bouw, dt, rng = Math.random) {
  if (!world || !scene) return;
  klok += dt;
  frame++;
  const p = hoofdspeler(world);
  if (!p) return;
  const budget = { n: 1 };
  if ((ververs -= dt) <= 0) { ververs = VERVERS_S; verversGroepen(world, p); }
  vulGroepen(scene, bouw, budget);

  const q = world.haltefx;
  if (q && q.length) for (const e of q.splice(0)) busWissel(world, e.v, e, rng);
  if (world.coopRole === 'client') kijkGastBussen(world, dt, rng);
  kijkTreinen(world, p, rng);

  for (let i = wissels.length - 1; i >= 0; i--) {
    const w = wissels[i];
    w.t += dt;
    let klaar = true;
    for (const fg of w.figuren) {
      const st = figuurStand(fg.f, w.t, _st);
      if (!st.klaar) klaar = false;
      const toon = st.zichtbaar && !st.klaar;
      if (toon && !fg.mesh) fg.mesh = pak(scene, bouw, budget);
      if (!fg.mesh) continue;
      if (!toon) { if (st.klaar || fg.f.kind === 'in') { laat(fg.mesh); fg.mesh = null; } continue; }
      fg.mesh.visible = true;
      fg.mesh.position.set(st.x, w.z, st.y);
      if (st.lopen) fg.mesh.rotation.y = -Math.atan2(fg.f.to.y - fg.f.from.y, fg.f.to.x - fg.f.from.x); // kijkt waar hij heen loopt
      animatePersonWalk(fg.mesh, st.lopen ? INSTAP.LOOP_V : 0, dt);
    }
    if (klaar) {
      for (const fg of w.figuren) { laat(fg.mesh); fg.mesh = null; }
      wissels.splice(i, 1);
    }
  }

  // de rusthouding van de wachtenden, gespreid over de beelden
  if (frame % IDLE_ELKE === 0) for (const g of groepen.values()) for (const m of g.mensen) animatePersonWalk(m, 0, dt * IDLE_ELKE);
}

// Voor tests en de prestatiemeting: hoeveel er nu in beeld en in de pool is.
export function instapStats() {
  let wachtend = 0;
  for (const g of groepen.values()) wachtend += g.mensen.length;
  return { groepen: groepen.size, wachtend, wissels: wissels.length, gebouwd, vrij: vrij.length };
}

// Bij een nieuwe wereld (laden): alles terug in de pool.
export function resetInstappen() {
  for (const g of groepen.values()) ruimGroep(g);
  groepen.clear();
  volgorde.length = 0;
  for (const w of wissels) for (const fg of w.figuren) laat(fg.mesh);
  wissels.length = 0;
  stationKant.clear();
}
