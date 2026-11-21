// Waar mag een boot staan of varen? (#boot-spawn 21-11) Eén centrale regel voor ALLE bootspawns:
// een boot hoort aan een kade, steiger of haven, of op echt bevaarbaar water (het vaarnet, of
// een breed open water), nooit op een sloot, vijver of een stadsgrachtje onder de minimale breedte.
// Zie docs/BOOT-SPAWN-21-11.md. Puur (geen three.js, geen DOM): de kaart levert water en oevers
// (waterindex), het vaarnet en de kade-ankers komen binnen via configureBoatSource.
//
//   isBoatSpotValid(map, x, y, klasse, opts)       true/false: mag een boot van deze klasse hier varen of liggen?
//   assessBoatSpot(map, x, y, klasse, opts)    { ok, reden, breedte, kade, opNet, soort } met de reden van een nee
//   isMooringSpotValid(map, x, y, hoek, klasse, o)  idem voor een afgemeerde boot: aan de oever, langs de kade, bij een anker
//   findValidBoatSpot(map, x, y, klasse, opts)  de dichtstbijzijnde geldige plek { x, y, a, afstand } of null (dan vervalt de boot)
//   dichtstbijKade(x, y, maxD)                    het dichtstbijzijnde anker { x, y, soort, d } of null
//   lokaleBreedte(map, x, y)                      de waterbreedte (m) rond het punt, het minimum over vier assen
// Samen spelen: alles hier is deterministisch (geen willekeur, alleen de wereld van wie het spel opende).

import { isInWater, boatDryPoints } from '../util.js';
import { waterClearance, getWaterIndex } from '../waterindex.js';
import { waterPolyAt, BOAT_CLASS, DRAFT, WATER_KINDS } from '../waterlevels.js';
import { MIN_WIDTH, edgeOpen } from '../vaarnet.js';
import { BOAT_KINDS } from '../boattypes.js';

// De klasse van een boot: de `kind` van het model (sloepCabin telt als sloep). Een voertuig, een model of een string.
export function boatClass(b) {
  const k = typeof b === 'string' ? ((BOAT_KINDS[b] && BOAT_KINDS[b].kind) || b) : (b && b.model && b.model.kind) || (b && b.kind) || 'sloep';
  return k === 'sloepCabin' ? 'sloep' : k;
}

// De regels per klasse. minBreedte komt uit vaarnet.MIN_WIDTH (de smalste vaarweg die het net kent); een groter schip
// (zeeschip, sleper) vraagt net als de binnenvaart 24 m. `lengte` is de romplengte voor de onderlinge afstand.
export const BOAT_WIDTH = { ...MIN_WIDTH, zeeschip: 24, sleper: 24 };
export const breedteVan = (klasse) => BOAT_WIDTH[klasse] ?? 4;
// water waar een boot nooit zomaar staat: een sloot, een vijver (alleen een kano of sup bij een steiger mag)
const SMALL_CHANNEL = new Set(['sloot', 'vijver']);
// open water (meer, haven, zee) is bevaarbaar ook zonder vaarnet vanaf deze breedte (m)
export const OPEN_CHANNEL_WIDTH = 40;
// de afstand (m) tot de lijn van het vaarnet (de vaargeul) waar een boot nog "op de vaarweg" ligt, boven op de halve breedte
export const NET_MARGE = 6;
// de afstand (m) tot een anker (steiger, haven, sluis, bruggenwachtplek) waar een boot "bij de kade" telt
export const KADE_BIJ = 60;     // varend, in de buurt van een kade-POI
export const KADE_AFMEER = 30;  // afgemeerd: zo dichtbij ligt hij vast
export const BOAT_SEARCH_MAX = 150;

// ------------------------------------------------------------------ bronnen

let bron = { net: null, ankers: null, edgeIdx: null };

// De ankers: kade-POI's als { x, y, soort } (steiger, jachthaven, haven, helling, sluis, brugwachtplek, verhuursteiger).
// plekken: game/waterplekken.json (.plekken); marinas: game/marinas.json (.marinas); extra: eigen punten ({ x, y, soort });
// net: het vaarnet (createVaarNet); de havenknopen en sluizen van het net tellen ook als anker.
const ANCHOR_KIND = { pier: 'steiger', jachthaven: 'jachthaven', haven: 'haven', helling: 'helling', kolk: 'sluis' };
let brondata = {}, eigen = [];
export function configureBoatSource(o = {}) { brondata = o; bouw(); }
// Ankers erbij (de verhuursteigers van shops.js, een aanlegplek van een bijbaan); ze blijven na een nieuwe configureBoatSource staan.
export function voegAnkersToe(extra) { for (const e of extra) if (Number.isFinite(e.x) && Number.isFinite(e.y)) eigen.push(e); bouw(); }
function bouw() {
  const { net = null, plekken = null, marinas = null } = brondata;
  const ankers = [];
  for (const p of (plekken && (plekken.plekken || plekken)) || []) {
    const kind = p.t === 'pier' ? 'steiger' : p.t === 'sluis' && p.sub === 'kolk' ? 'sluis' : p.t === 'brug' && p.sub !== 'vast' ? 'brugwachtplek' : ANCHOR_KIND[p.t];
    if (kind && Number.isFinite(p.x) && Number.isFinite(p.y)) ankers.push({ x: p.x, y: p.y, soort: kind });
  }
  for (const m of (marinas && (marinas.marinas || marinas)) || []) {
    ankers.push({ x: m.x, y: m.y, soort: 'jachthaven' });
    for (const f of m.fingers || []) ankers.push({ x: (f[0] + f[2]) / 2, y: (f[1] + f[3]) / 2, soort: 'steiger' });
  }
  if (net) for (const n of net.nodes) if (n.type === 'haven' || n.type === 'sluis') ankers.push({ x: n.x, y: n.y, soort: n.type === 'haven' ? 'haven' : 'sluis' });
  for (const e of eigen) ankers.push({ x: e.x, y: e.y, soort: e.soort || 'steiger' });
  bron = { net, ankers: rooster(ankers, 100, (a) => [a.x, a.y]), edgeIdx: net ? netRooster(net) : null, aantalAnkers: ankers.length };
}

function rooster(items, cel, pos) {
  const g = { cel, m: new Map() };
  for (const it of items) { const [x, y] = pos(it); rasterIn(g, it, x, y); }
  return g;
}
function rasterIn(g, it, x, y) {
  const k = Math.floor(x / g.cel) * 100003 + Math.floor(y / g.cel);
  let a = g.m.get(k);
  if (!a) g.m.set(k, a = []);
  a.push(it);
}
function gridQuery(g, x, y, r, f) {
  const c = g.cel, i0 = Math.floor((x - r) / c), i1 = Math.floor((x + r) / c), j0 = Math.floor((y - r) / c), j1 = Math.floor((y + r) / c);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = g.m.get(i * 100003 + j); if (a) for (const it of a) f(it); }
}

// de segmenten van de netranden in een raster van 150 m: een vraag naar de dichtstbijzijnde vaargeul is dan een paar cellen
function netRooster(net) {
  const g = { cel: 150, m: new Map() };
  for (const e of net.edges) {
    if (!e.pts) continue;
    for (let i = 0; i + 1 < e.pts.length; i++) {
      const s = { e, ax: e.pts[i][0], ay: e.pts[i][1], bx: e.pts[i + 1][0], by: e.pts[i + 1][1] };
      const n = Math.max(1, Math.ceil(Math.hypot(s.bx - s.ax, s.by - s.ay) / g.cel));
      const seen = new Set();
      for (let t = 0; t <= n; t++) {
        const x = s.ax + (s.bx - s.ax) * t / n, y = s.ay + (s.by - s.ay) * t / n;
        const k = Math.floor(x / g.cel) * 100003 + Math.floor(y / g.cel);
        if (seen.has(k)) continue;
        seen.add(k);
        let a = g.m.get(k);
        if (!a) g.m.set(k, a = []);
        a.push(s);
      }
    }
  }
  return g;
}

// De dichtstbijzijnde vaargeul van het net die deze klasse kan varen: { d, x, y, a } (a: richting van de rand) of null binnen maxD.
export function dichtstbijNet(x, y, klasse, maxD = 60) {
  const g = bron.edgeIdx;
  if (!g) return null;
  let best = null;
  gridQuery(g, x, y, maxD + g.cel, (s) => {
    if (!edgeOpen(s.e, klasse)) return;
    const dx = s.bx - s.ax, dy = s.by - s.ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / L2)), px = s.ax + dx * t, py = s.ay + dy * t, d = Math.hypot(px - x, py - y);
    if (d <= maxD && (!best || d < best.d)) best = { d, x: px, y: py, a: Math.atan2(dy, dx) };
  });
  return best;
}

export function dichtstbijKade(x, y, maxD = KADE_BIJ) {
  if (!bron.ankers) return null;
  let best = null;
  gridQuery(bron.ankers, x, y, maxD, (a) => {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d <= maxD && (!best || d < best.d)) best = { x: a.x, y: a.y, soort: a.soort, d };
  });
  return best;
}

// ------------------------------------------------------------------ breedte

const AS = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071]];
const STEP = 2, BREEDTE_MAX = 60;
// Per kaart en cel (3 m) onthouden; leeg zodra het water van de kaart verandert (tegels erbij of eraf).
const caches = new WeakMap();
function cache(map) {
  const ver = map._waterVer || 0;
  let c = caches.get(map);
  if (!c || c.ver !== ver || c.bron !== bron) caches.set(map, c = { ver, bron, breedte: new Map(), plek: new Map() });
  return c;
}

// De breedte van het water rond (x, y) in m: per as de afstand naar beide oevers, het minimum over vier assen, begrensd op
// BREEDTE_MAX. Een punt op land of in een obstakel geeft 0. Gemeten tot de oever (isInWater) in stappen van 2 m.
export function lokaleBreedte(map, x, y) {
  const c = cache(map), key = Math.round(x / 3) * 100003 + Math.round(y / 3);
  const hit = c.breedte.get(key);
  if (hit !== undefined) return hit;
  let w = 0;
  if (isInWater(map, x, y)) {
    w = Infinity;
    for (const [ax, ay] of AS) {
      let tot = 0;
      for (const sgn of [1, -1]) {
        let d = 0;
        while (d < BREEDTE_MAX / 2 && isInWater(map, x + ax * sgn * (d + STEP), y + ay * sgn * (d + STEP))) d += STEP;
        tot += d + STEP / 2;
      }
      if (tot < w) w = tot;
      if (w < 1.5) break;
    }
  }
  if (c.breedte.size > 40000) c.breedte.clear();
  c.breedte.set(key, w);
  return w;
}

// ------------------------------------------------------------------ de regel

const probeDraft = (klasse) => DRAFT[klasse] ?? 0.6;

// Beoordeling van een plek voor een varende of ligplaats-boot. `net` uit configureBoatSource, tenzij opts.net.
//   opts.poly   het waterlichaam als je het al hebt (bespaart een zoekopdracht)
//   opts.eisNet false: het vaarnet of een kade is niet nodig (alleen breedte en soort water; voor tests)
export function assessBoatSpot(map, x, y, klasse, opts = {}) {
  klasse = boatClass(klasse);
  const c = cache(map), key = Math.round(x * 2) * 200003 + Math.round(y * 2) * 7 + klasseNr(klasse);
  const cachebaar = !opts.poly && opts.eisNet !== false;
  if (cachebaar) { const h = c.plek.get(key); if (h) return h; }
  const r = assess(map, x, y, klasse, opts);
  if (cachebaar) { if (c.plek.size > 40000) c.plek.clear(); c.plek.set(key, r); }
  return r;
}
const KLASSEN = Object.keys(BOAT_CLASS);
const klasseNr = (k) => Math.max(0, KLASSEN.indexOf(k));

function assess(map, x, y, klasse, opts) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reden: 'geen-getal' };
  if (!isInWater(map, x, y)) return { ok: false, reden: 'geen-water' };
  const poly = opts.poly || waterPolyAt(map, x, y);
  const eis = breedteVan(klasse);
  const breedte = lokaleBreedte(map, x, y);
  const kade = dichtstbijKade(x, y, KADE_BIJ);
  const uit = (ok, reden, extra) => ({ ok, reden, breedte, kade: kade ? kade.soort : null, ...extra });
  // een sloot of vijver: alleen een kano of sup die bij een steiger ligt
  if (poly && SMALL_CHANNEL.has(poly.kind)) {
    const klein = klasse === 'kano' || klasse === 'kajak' || klasse === 'sup';
    if (!(klein && kade && kade.d <= KADE_AFMEER)) return uit(false, poly.kind);
  }
  // (een groot schip, klasse 4: de diepte en klasse van het water zitten in de rand van het vaarnet, niet in de polygoon van de haven)
  if (poly && (BOAT_CLASS[klasse] ?? 2) < 4) {
    const k = WATER_KINDS[poly.kind] || WATER_KINDS.diep;
    if (!((poly.dp ?? k.depth) >= probeDraft(klasse) + 0.25)) return uit(false, 'ondiep');
    if (!((poly.nav ?? k.nav) >= (BOAT_CLASS[klasse] ?? 2)) && !(breedte >= OPEN_CHANNEL_WIDTH && poly.kind === 'meer')) return uit(false, 'klasse');
  }
  if (breedte < eis) return uit(false, 'smal');
  // zonder vaarnet (een build zonder vaarnet.json, een test zonder net) kan niemand de vaarweg beoordelen: dan telt breedte en soort water
  if (opts.eisNet === false || !bron.net) return uit(true, 'breed-genoeg');
  const net = dichtstbijNet(x, y, klasse, breedte / 2 + NET_MARGE);
  if (net) return uit(true, 'vaarnet', { opNet: true, soort: 'vaarweg' });
  if (kade) return uit(true, 'kade', { soort: kade.soort });
  if (breedte >= OPEN_CHANNEL_WIDTH) return uit(true, 'open-water', { soort: 'open-water' });
  return uit(false, 'geen-vaarweg');
}

export function isBoatSpotValid(map, x, y, klasse, opts) {
  return assessBoatSpot(map, x, y, klasse, opts).ok;
}

// ------------------------------------------------------------------ afmeren

// De richting van de dichtstbijzijnde oever bij (x, y), of null.
export function oeverRichting(map, x, y, maxR = 12) {
  const s = getWaterIndex(map).nearestShore(x, y, maxR);
  return s && s.i >= 0 ? { a: Math.atan2(s.ty, s.tx), d: s.d ?? null } : null;
}

const hoekVerschil = (a, b) => { let d = (a - b) % Math.PI; if (d > Math.PI / 2) d -= Math.PI; if (d < -Math.PI / 2) d += Math.PI; return Math.abs(d); };
export const AFMEER_HOEK = 0.35;     // rad: afwijking van de oeverlijn waarbinnen een boot "evenwijdig" ligt
export const AFMEER_OEVER = 4.5;     // m: de romp ligt hoogstens zo ver van de oever (hartlijn)

// Een ligplaats: de plek is geldig water (of een kade bij een anker), de boot ligt aan de oever (hartlijn <= AFMEER_OEVER),
// evenwijdig aan de oeverlijn, hoogstens KADE_AFMEER van een anker. Marinaligplaatsen (neus naar de steiger) tellen als
// opts.vinger = true: dan geldt alleen water, breedte en anker. opts.anderen: [{x, y, len}] bootjes die er al liggen.
export function isMooringSpotValid(map, x, y, hoek, klasse, opts = {}) {
  klasse = boatClass(klasse);
  const b = assessBoatSpot(map, x, y, klasse, { ...opts, eisNet: false });
  if (!b.ok) return { ok: false, reden: b.reden };
  const kade = dichtstbijKade(x, y, KADE_AFMEER);
  if (!kade) return { ok: false, reden: 'geen-kade' };
  if (!opts.vinger) {
    const c = waterClearance(map, x, y, AFMEER_OEVER + 1);
    if (!(c >= 0.3 && c <= AFMEER_OEVER)) return { ok: false, reden: 'midden-in-water' };
    const o = oeverRichting(map, x, y);
    if (o && Number.isFinite(hoek) && hoekVerschil(hoek, o.a) > AFMEER_HOEK + 0.2) return { ok: false, reden: 'niet-evenwijdig' };
  }
  if (map.isOnBridge && map.isOnBridge(x, y)) return { ok: false, reden: 'brug' };
  for (const o of opts.anderen || []) if (Math.hypot(o.x - x, o.y - y) < Math.max(o.len || 0, opts.len || 0) * 0.9) return { ok: false, reden: 'overlap' };
  return { ok: true, reden: 'kade', soort: kade.soort };
}

// ------------------------------------------------------------------ verplaatsen

// De dichtstbijzijnde geldige plek binnen maxD, in ringen van 6 m, plus de punten van de vaargeul in de buurt; a is de koers van
// de vaargeul of de oever. null: er is geen geldige plek in de buurt, dus de boot vervalt. Deterministisch.
export function findValidBoatSpot(map, x, y, klasse, opts = {}) {
  klasse = boatClass(klasse);
  const maxD = opts.maxD ?? BOAT_SEARCH_MAX, stap = opts.stap ?? 6;
  const geef = (px, py, d) => {
    const net = dichtstbijNet(px, py, klasse, 40), o = net ? null : oeverRichting(map, px, py, 14);
    return { x: px, y: py, a: net ? net.a : o ? o.a : 0, afstand: d };
  };
  if (isBoatSpotValid(map, x, y, klasse, opts)) return geef(x, y, 0);
  // eerst de vaargeul: de plek erop is al geldig (breedte erbij), dan de ringen
  const net = dichtstbijNet(x, y, klasse, maxD);
  let best = null;
  if (net && isBoatSpotValid(map, net.x, net.y, klasse, opts)) best = geef(net.x, net.y, net.d);
  for (let r = stap; r <= maxD && !(best && best.afstand <= r); r += stap) {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / stap));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (isBoatSpotValid(map, px, py, klasse, opts)) { if (!best || r < best.afstand) best = geef(px, py, r); break; }
    }
    if (best) break;
  }
  return best;
}

// Een boot die er al staat (een missie- of bijbaanboot, die nooit mag vervallen): ligt hij op een ongeldige plek, dan schuift
// hij naar de dichtstbijzijnde geldige plek waar de romp vrij ligt. Geeft 'ok', 'verplaatst' of 'blijft' (niets geldigs in de buurt).
export function ensureBoatValid(map, boot, maxD = 120) {
  if (!map || !boot) return 'ok';
  if (isBoatSpotValid(map, boot.x, boot.y, boot)) return 'ok';
  const klasse = boatClass(boot), probe = { model: boot.model };
  for (let r = 0; r <= maxD; r += 12) {
    const g = findValidBoatSpot(map, boot.x, boot.y, klasse, { maxD: Math.min(maxD, r + 12), stap: 6 });
    if (!g) continue;
    for (const da of [0, Math.PI, 0.4, -0.4]) {
      const a = g.a + da;
      let vrij = true;
      try { vrij = boatDryPoints(map, probe, g.x, g.y, a) === 0; } catch (e) { vrij = true; }
      if (vrij) { boot.x = g.x; boot.y = g.y; boot.angle = a; return 'verplaatst'; }
    }
  }
  return 'blijft';
}
