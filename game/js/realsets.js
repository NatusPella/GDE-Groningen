// Echte-wereld-sets (wens van de eigenaar, 22-11): een scène of binnenmissie die binnen speelt, speelt in een ECHT pand van de wereld
// (met zijn gevel, zijn deur en zijn ramen naar de straat) en niet in een los, onzichtbaar decor in de lucht of boven de straat.
// Ontwerp en tabel: docs/CUTSCENE-INTERIEURS-22-11.md. Deze module is puur (geen three, geen kaart, geen DOM): een tabel met per set
// het soort pand, de zoekstraal en de vaste verhaalplekken, de pandkeuze (deterministisch), de plek van de scène in de hal van dat pand,
// de camera- en acteursgrenzen en de terugvalreden. interiors.js bouwt de hal (holdInterior), realsetrun.js hangt het aan de wereld.
//
//   pickRealSet({ key, anchor, buildings, planOf, points })   -> { ok, b, plan, place, fit, why, pending }
//   fitSceneInHall(plan, points, opts)                         -> { x, y, facing, u, v } of null (past nergens)
//   hallEnv(plan, base)                                        -> { solid, clamp } voor cutscript (alles binnen de hal)
//   hallCameraPose(plan, layout, base, t)                      -> de vaste kamercamera van een binnenmissie, binnen de muren
//
// Samen spelen: de keuze hangt alleen af van de wereld (de gebouwen rond het anker), nooit van de speler of de host: bij host en gast
// geeft dezelfde wereld dezelfde pand-id (gid). De scène is lokaal per speler; er gaat niets over het net.
import { toWorld, toLocal, dirToWorld } from './interiorframe.js';
import { rectOf } from './interiorlayout.js';
import { kindOfBuilding } from './interiorkinds.js';
import { SET_DIMS, WALL_MARGIN, CEIL_MARGIN, CAM_BACK, CAM_HEIGHT, CAM_FOV_FROM, CAM_FOV_TO, CAM_ZOOM_S } from './binnenset.js';

export const ACTOR_MARGIN = 0.35;       // m: een figuur staat zo ver van een muur van de hal
export const FREE_R = 0.25;             // m: zo ver blijft een figuur van een meubel of een tussenmuur
export const SEAT_REACH = 0.9;          // m: een zittende figuur staat zo dicht bij een stoel, kruk, bank of zitplek
export const MATCH_R = 60;              // m: een scène die zo dicht bij een vaste verhaalplek begint, hoort bij die plek
export const MAX_CANDIDATES = 40;       // hoeveel panden de keuze per scène hoogstens bekijkt (een plan maken kost enkele ms, daarna staat het in de cache)
export const FIT_STEP = 0.5;            // m: raster waarop het anker in de hal wordt gezocht
export const CHECK_R = 6;               // m: het middelpunt van een vast pand mag hoogstens zo ver van het vastgelegde middelpunt liggen

// --- de tabel ------------------------------------------------------------------------------------------------------------------
// kinds: soorten pand in volgorde van voorkeur ({ kind, sub? } zoals interiorkinds.js ze kent; zonder sub: elke sub)
// r: de zoekstraal (m) om het anker van de scène; minHall: de kleinste hal (m, breed x diep, in een van beide standen)
// fixed: vaste verhaalplekken { place, at: [x, y] (het anker van de scène in de wereld), gid, c: [x, y] (middelpunt van het pand) }
// status 'echt': speelt in een echt pand; 'terugval': bewust niet (waarom staat erbij), de bestaande set blijft; 'geen-set': er
// bestaat nog geen binnenset voor (de scène speelt buiten); de rij is klaar voor als hij komt.
const hall = (k) => ({ w: Math.round(SET_DIMS[k].w * 0.7 * 10) / 10, d: Math.round(SET_DIMS[k].d * 0.7 * 10) / 10 });

export const REAL_SETS = {
  kantoor: {
    label: 'Kantoor van Wiebelwerk (M18)', status: 'echt', kinds: [{ kind: 'kantoor' }, { kind: 'publiek', sub: 'gemeente' }], r: 90, minHall: hall('kantoor'),
    fixed: [{ place: 'wiebelwerk', at: [21165.3, 12446.0], gid: 20271552, c: [21164.8, 12446.7] }],
  },
  serverkamer: {
    label: 'Serverkamer van Wiebelwerk (M18.3)', status: 'echt', kinds: [{ kind: 'kantoor' }, { kind: 'publiek', sub: 'gemeente' }], r: 90, minHall: hall('serverkamer'),
    fixed: [{ place: 'wiebelwerkServers', at: [21165.3, 12434.9], gid: 20271552, c: [21164.8, 12446.7] }],
  },
  loket: {
    label: 'Het Loket in het Stadhuis (M03)', status: 'echt', kinds: [{ kind: 'publiek', sub: 'gemeente' }, { kind: 'kantoor' }], r: 90, minHall: hall('loket'),
    // het Stadhuis zelf is een bezienswaardigheid met een eigen gebouw (geen interieur): het Loket speelt in het naastgelegen gemeentepand
    fixed: [{ place: 'stadhuis', at: [108, 108], gid: 26523, c: [132.2, 107.8] }],
  },
  omakeuken: {
    label: 'Oma Trijntje\'s keuken aan de Noorderhaven (M25)', status: 'echt', kinds: [{ kind: 'woning' }], r: 70, minHall: hall('omakeuken'),
    fixed: [{ place: 'omaKeuken', at: [-289.25, -106.7], gid: 13255, c: [-274.7, -91.3] }],
  },
  kroeg: {
    label: 'Kroeg (M16, de toast)', status: 'echt', kinds: [{ kind: 'horeca', sub: 'kroeg' }, { kind: 'horeca', sub: 'cafe' }, { kind: 'horeca' }], r: 150, minHall: hall('kroeg'), fixed: [],
  },
  woonkamer: {
    label: 'Woonkamer (M27, inpakken in Loppersum)', status: 'echt', kinds: [{ kind: 'woning' }], r: 90, minHall: hall('woonkamer'),
    fixed: [{ place: 'loppersum', at: [12039, -12622], gid: 20175680, c: [12013.4, -12618.5] }],
  },
  garage: {
    label: 'Werkplaats (garage, M02)', status: 'echt', kinds: [{ kind: 'garage', sub: 'werkplaats' }, { kind: 'garage' }], r: 150, minHall: hall('garage'), fixed: [],
  },
  keuken: {
    label: 'De keuken van de opening en de terugkeerscènes', status: 'terugval', kinds: [], r: 0, minHall: hall('omakeuken'), fixed: [],
    why: 'de keukenkit heeft eigen effecten (radio, deur, kopjes in de hand, tafelkopjes) en zitplekken aan een eigen tafel; de echte flat in Paddepoel heeft ze niet. De flat blijft de plek van de thuisavonden (flatScene) en de binnenspawn',
  },
  kruitkelder: {
    label: 'Kruitkelder onder Bourtange (M20)', status: 'terugval', kinds: [], r: 0, minHall: hall('kruitkelder'), fixed: [],
    why: 'een kelder onder de vesting is geen pand in de wereld (geen voetafdruk met deur en ramen); het gewelf blijft een binnenset',
  },
  // de plekken uit de wensenlijst waarvoor nog geen binnenset bestaat: de rij zegt welk pand ze straks krijgen
  kapper: { label: 'Kapper', status: 'geen-set', kinds: [{ kind: 'winkel', sub: 'kapper' }], r: 150, minHall: { w: 4, d: 4 }, fixed: [] },
  cafe: { label: 'Café en terras', status: 'geen-set', kinds: [{ kind: 'horeca', sub: 'cafe' }, { kind: 'horeca' }], r: 150, minHall: { w: 5, d: 5 }, fixed: [] },
  museum: { label: 'Museum', status: 'geen-set', kinds: [{ kind: 'publiek', sub: 'museum' }], r: 400, minHall: { w: 7, d: 7 }, fixed: [] },
  rechtbank: { label: 'Rechtbank', status: 'geen-set', kinds: [{ kind: 'publiek', sub: 'gemeente' }], r: 400, minHall: { w: 8, d: 7 }, fixed: [] },
  ziekenhuis: { label: 'Ziekenhuis', status: 'geen-set', kinds: [{ kind: 'publiek', sub: 'ziekenhuis' }], r: 600, minHall: { w: 7, d: 7 }, fixed: [] },
  kerk: { label: 'Kerk', status: 'geen-set', kinds: [{ kind: 'kerk' }], r: 400, minHall: { w: 7, d: 9 }, fixed: [] },
  schuur: { label: 'Schuur (Tinus)', status: 'geen-set', kinds: [{ kind: 'garage', sub: 'magazijn' }], r: 300, minHall: { w: 6, d: 7 }, fixed: [],
    why: 'schuren staan in NOT_ENTERABLE (interiorkinds.js): zonder interieur blijft de scène buiten' },
  cabaret: { label: 'Cabaret (de zaal)', status: 'geen-set', kinds: [{ kind: 'publiek', sub: 'bioscoop' }], r: 600, minHall: { w: 8, d: 8 }, fixed: [] },
  snackoverlast: { label: 'Snackoverlast (de snackbar)', status: 'geen-set', kinds: [{ kind: 'winkel', sub: 'snackbar' }], r: 200, minHall: { w: 4, d: 4 }, fixed: [] },
};
export const REAL_SET_KEYS = Object.keys(REAL_SETS);
// de sets die een cutscene of een binnenmissie nu speelt (cutscript.js set, missions: set / toastSet)
export const PLAYED_SETS = ['keuken', 'kantoor', 'serverkamer', 'loket', 'omakeuken', 'kroeg', 'woonkamer', 'garage', 'kruitkelder'];
export const isRealSet = (key) => !!REAL_SETS[key] && REAL_SETS[key].status === 'echt';

const num = (n) => typeof n === 'number' && Number.isFinite(n);

// --- de pandkeuze --------------------------------------------------------------------------------------------------------------

export const centreOf = (b) => (b && b.bounds ? [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2] : null);
const kindMatches = (spec, plan) => spec.kinds.some((k) => k.kind === plan.kind && (!k.sub || k.sub === plan.sub));
const kindRank = (spec, plan) => spec.kinds.findIndex((k) => k.kind === plan.kind && (!k.sub || k.sub === plan.sub));
export const hallOf = (plan) => ({ w: plan.hall.u1 - plan.hall.u0, d: plan.hall.v1 - plan.hall.v0 });
// past de hal in de minimale maat, in een van beide standen
export function hallBigEnough(plan, min) {
  const h = hallOf(plan);
  return (h.w >= min.w && h.d >= min.d) || (h.w >= min.d && h.d >= min.w);
}

// De vaste verhaalplek bij dit anker (hoogstens MATCH_R ernaast), of null.
export function fixedPlace(spec, anchor) {
  if (!spec || !anchor || !num(anchor.x) || !num(anchor.y)) return null;
  let best = null;
  for (const f of spec.fixed || []) {
    const d = Math.hypot(anchor.x - f.at[0], anchor.y - f.at[1]);
    if (d <= MATCH_R && (!best || d < best.d)) best = { ...f, d };
  }
  return best;
}

// Alle kandidaten in volgorde: de vaste keuze eerst (als het pand er is en zijn middelpunt klopt), daarna op afstand tot het anker
// (afgerond op 10 cm) en dan op gid. Dezelfde gebouwen geven altijd dezelfde volgorde, ook bij een gast.
export function orderCandidates(spec, anchor, buildings) {
  const place = fixedPlace(spec, anchor);
  const rows = [];
  for (const b of buildings || []) {
    const c = centreOf(b);
    if (!c || b.dropped) continue;
    const d = Math.hypot(c[0] - anchor.x, c[1] - anchor.y);
    if (d > spec.r) continue;
    rows.push({ b, d: Math.round(d * 10) / 10, gid: b.gid === undefined ? Infinity : b.gid, fixed: false });
  }
  rows.sort((p, q) => p.d - q.d || p.gid - q.gid);
  if (place) {
    const i = rows.findIndex((r) => r.gid === place.gid && Math.hypot(centreOf(r.b)[0] - place.c[0], centreOf(r.b)[1] - place.c[1]) <= CHECK_R);
    if (i > 0) rows.unshift(rows.splice(i, 1)[0]);
    if (i >= 0) rows[0].fixed = true;
  }
  return { rows: rows.slice(0, MAX_CANDIDATES), place: place && rows.length && rows[0].fixed ? place : null };
}

// De keuze. buildings: wat de kaart rond het anker heeft (map.buildingsNear); planOf(b): null als de gevel nog niet getekend is (dan
// weten we de deur niet: voor de vaste verhaalplek 'pending' (de aanroeper probeert het later of valt terug), anders telt het pand niet mee),
// anders { ok, plan, why }; points: de punten
// (lokaal t.o.v. het anker: [f, s] of { f, s, sit }) die in de hal moeten passen (sceneSamples of setLocalPoints).
// De vaste verhaalplek wacht op zijn gevel; een ander pand zonder gevel telt niet mee (sommige bouwers tekenen geen deur, dan komt hij nooit).
export function pickRealSet({ key, anchor, buildings, planOf, points = [], cams = [], fitOpts = {} }) {
  const spec = REAL_SETS[key];
  if (!spec) return { ok: false, why: 'onbekende set ' + key };
  if (spec.status !== 'echt') return { ok: false, why: spec.why || (spec.status === 'geen-set' ? 'er is nog geen binnenset' : 'bewuste terugval') };
  if (!anchor || !num(anchor.x) || !num(anchor.y)) return { ok: false, why: 'geen anker' };
  if (typeof planOf !== 'function') return { ok: false, why: 'geen planOf' };
  const { rows, place } = orderCandidates(spec, anchor, buildings);
  if (!rows.length) return { ok: false, why: 'geen pand binnen ' + spec.r + ' m' };
  const notes = [];
  for (const r of rows) {
    // een bezienswaardigheid, een pand met een eigen interieur of een bijgebouw wordt nooit een kamer (en krijgt dus nooit een deur): overslaan, niet wachten
    if (!kindOfBuilding(r.b)) { notes.push(r.gid + ':geen betreedbaar pand'); continue; }
    const rec = planOf(r.b);
    // een gevel die er niet is (nog niet getekend, of een bouwer die geen deur tekent): de vaste verhaalplek wacht erop, de rest telt niet mee
    if ((rec === null || rec === undefined) && !r.fixed) { notes.push(r.gid + ':gevel niet getekend'); continue; }
    if (rec === null || rec === undefined) return { ok: false, pending: true, why: 'de gevel van pand ' + r.b.gid + ' is nog niet getekend', gid: r.b.gid };
    if (!rec.ok || !rec.plan) { notes.push(r.gid + ':' + (rec.why || 'geen plan')); continue; }
    const plan = rec.plan;
    if (!kindMatches(spec, plan)) { notes.push(r.gid + ':soort ' + plan.kind); continue; }
    if (!hallBigEnough(plan, spec.minHall)) { notes.push(r.gid + ':hal te klein'); continue; }
    const fit = fitSceneInHall(plan, points, { cams, ...fitOpts });
    if (!fit) { notes.push(r.gid + ':scène past niet'); continue; }
    return { ok: true, b: r.b, plan, fit, gid: r.b.gid, place: place && r.fixed ? place.place : null, d: r.d, rank: kindRank(spec, plan), skipped: notes };
  }
  return { ok: false, why: 'geen geschikt pand: ' + notes.slice(0, 4).join(', '), skipped: notes };
}

// --- de scène in de hal --------------------------------------------------------------------------------------------------------

// De punten van een gecompileerde scène (cutscript.js compileScene), lokaal t.o.v. een anker op (0, 0) met kijkrichting 0: elke halve
// seconde de plek van elke figuur (f = vooruit, s = links) en of hij zit, en de plek van de camera. Zo telt een figuur die loopt mee.
export function sceneSamples(scene, step = 0.5) {
  const a = { x: 0, y: 0, facing: 0, z: 0 };
  const seen = new Set(), actors = [], cams = [];
  for (let t = 0; t <= scene.duration + 1e-9; t += step) {
    const s = scene.sample(t, a);
    for (const [id, o] of Object.entries(s.actors || {})) {
      if (o.visible === false) continue;
      const k = id + ':' + Math.round(o.x * 6) + ':' + Math.round(o.y * 6);
      if (seen.has(k)) continue;
      seen.add(k);
      actors.push({ id, f: o.x, s: o.y, sit: !!o.sit || (o.anim === 'sit') });
    }
    const c = s.camera && s.camera.position;
    const l = s.camera && s.camera.lookAt;
    if (c) cams.push({ f: c.x, s: c.y, h: c.z, lf: l ? l.x : null, ls: l ? l.y : null });
  }
  return { actors, cams };
}

// lokale punten ([f, s] of { f, s, sit }) naar een lijst { f, s, sit }
const asPoints = (pts) => (pts || []).map((p) => (Array.isArray(p) ? { f: p[0], s: p[1], sit: false } : { f: p.f, s: p.s, sit: !!p.sit })).filter((p) => num(p.f) && num(p.s));

// anker (x, y) en kijkrichting naar een wereldpunt van een lokaal punt
export const localToWorld = (anchor, f, s) => {
  const c = Math.cos(anchor.facing), sn = Math.sin(anchor.facing);
  return [anchor.x + f * c - s * sn, anchor.y + f * sn + s * c];
};

const blocksOf = (L) => [...L.walls, ...(L.rails || []), ...(L.blocks || []), ...L.items.filter((i) => i.solid).map(rectOf)];
const clearOf = (blocks, u, v) => {
  let m = Infinity;
  for (const b of blocks) { const du = Math.max(b.u0 - u, 0, u - b.u1), dv = Math.max(b.v0 - v, 0, v - b.v1); const d = Math.hypot(du, dv); if (d < m) m = d; if (m <= 0) return 0; }
  return m;
};
// loopt de lijn (u0, v0) - (u1, v1) door een tussenmuur? (hal-coördinaten, stappen van 20 cm)
function wallBetween(walls, u0, v0, u1, v1) {
  if (!walls.length) return false;
  const n = Math.max(2, Math.ceil(Math.hypot(u1 - u0, v1 - v0) / 0.2));
  for (let i = 1; i < n; i++) {
    const t = i / n, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t;
    for (const b of walls) if (u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1) return true;
  }
  return false;
}
// hoogstens n camerapunten, gelijkmatig uit de lijst
const camSubset = (cams, n) => {
  const list = (cams || []).filter((c) => c && num(c.f) && num(c.s));
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
};
const SEATS = new Set(['chair', 'stool', 'bench', 'sofa', 'bank', 'kruk', 'stoel']);

// Waar in de hal staat het anker (en met welke kijkrichting) zodat elk punt in de hal staat, vrij van meubels en tussenmuren, en elke
// zittende figuur bij een zitplek? Vier standen (de kijkrichting langs de assen van de hal), een raster van FIT_STEP; de beste is de
// dichtstbijzijnde bij het midden van de hal. null: er past niets (de aanroeper valt terug op de bestaande set).
// opts.cams: de camerapunten van de scène ([f, s] lokaal): geen daarvan staat na het drukken in de hal in een tussenmuur of ziet de figuren door een muur.
// opts.standing: ook zittende figuren mogen op de vrije vloer staan (alleen voor een proef).
export function fitSceneInHall(plan, points, opts = {}) {
  if (!plan || !plan.ok || !plan.hall || !plan.layout || !plan.frame) return null;
  const pts = asPoints(points);
  const H = plan.hall, L = plan.layout;
  const blocks = blocksOf(L);
  const cams = camSubset(opts.cams, 24);
  const seats = L.items.filter((i) => SEATS.has(i.type)).map((i) => [i.u, i.v]);
  const cu = (H.u0 + H.u1) / 2, cv = (H.v0 + H.v1) / 2;
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const angles = dirs.map(([du, dv]) => { const [dx, dy] = dirToWorld(plan.frame, du, dv); return Math.atan2(dy, dx); });
  let best = null;
  for (let a = 0; a < 4; a++) {
    const facing = angles[a];
    for (let v = H.v0 + ACTOR_MARGIN; v <= H.v1 - ACTOR_MARGIN + 1e-9; v += FIT_STEP) {
      for (let u = H.u0 + ACTOR_MARGIN; u <= H.u1 - ACTOR_MARGIN + 1e-9; u += FIT_STEP) {
        const score = Math.hypot(u - cu, v - cv);
        if (best && score >= best.score) continue;
        const [x, y] = toWorld(plan.frame, u, v);
        const anchor = { x, y, facing };
        let ok = true;
        for (const p of pts) {
          const [wx, wy] = localToWorld(anchor, p.f, p.s);
          const [pu, pv] = toLocal(plan.frame, wx, wy);
          if (pu < H.u0 + ACTOR_MARGIN || pu > H.u1 - ACTOR_MARGIN || pv < H.v0 + ACTOR_MARGIN || pv > H.v1 - ACTOR_MARGIN) { ok = false; break; }
          if (p.sit && !opts.standing) {
            if (!seats.some(([su, sv]) => Math.hypot(su - pu, sv - pv) <= SEAT_REACH)) { ok = false; break; }
          } else if (clearOf(blocks, pu, pv) < FREE_R) { ok = false; break; }
        }
        if (ok && cams.length) {
          // de camera (door de env in de hal gedrukt) staat niet in een tussenmuur en ziet de figuren: geen wand tussen de camera en het midden van de figuren
          let su = 0, sv = 0;
          const loc = pts.map((p) => toLocal(plan.frame, ...localToWorld(anchor, p.f, p.s)));
          for (const q of loc) { su += q[0]; sv += q[1]; }
          su /= loc.length; sv /= loc.length;
          for (const c of cams) {
            const [wx, wy] = localToWorld(anchor, c.f, c.s);
            const [cu0, cv0] = toLocal(plan.frame, wx, wy);
            const qu = Math.max(H.u0 + WALL_MARGIN, Math.min(H.u1 - WALL_MARGIN, cu0)), qv = Math.max(H.v0 + WALL_MARGIN, Math.min(H.v1 - WALL_MARGIN, cv0));
            if (L.walls.some((b) => qu >= b.u0 && qu <= b.u1 && qv >= b.v0 && qv <= b.v1) || wallBetween(L.walls, qu, qv, su, sv)) { ok = false; break; }
            if (num(c.lf) && num(c.ls)) {
              const [lu, lv] = toLocal(plan.frame, ...localToWorld(anchor, c.lf, c.ls));
              if (wallBetween(L.walls, qu, qv, lu, lv)) { ok = false; break; }
            }
          }
        }
        if (ok) best = { x, y, facing, u, v, score, orient: a };
      }
    }
  }
  return best;
}

// --- grenzen voor de regie -----------------------------------------------------------------------------------------------------

// De env van cutscript.js voor een scène in een echte hal: acteurs en props binnen de muren, de camera binnen de muren en onder het
// plafond; niets is 'solid' (de hal is leeg gemaakt voor de scène: geen eigen figuren, zie interiors.js holdInterior).
export function hallEnv(plan, base = 0) {
  const H = plan.hall, ceil = (plan.height || 2.8);
  const lim = (m) => ({ u0: H.u0 + m, u1: H.u1 - m, v0: H.v0 + m, v1: H.v1 - m });
  const A = lim(ACTOR_MARGIN), C = lim(WALL_MARGIN);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  return {
    solid: () => false,
    clamp: (x, y, z, kind) => {
      const [u, v] = toLocal(plan.frame, x, y);
      const r = kind === 'camera' ? C : A;
      const [nx, ny] = toWorld(plan.frame, cl(u, r.u0, r.u1), cl(v, r.v0, r.v1));
      return { x: nx, y: ny, z: kind === 'camera' ? cl(z, base + 0.3, base + ceil - CEIL_MARGIN) : z };
    },
  };
}

export const inHallXY = (plan, x, y, margin = 0) => {
  const [u, v] = toLocal(plan.frame, x, y);
  const H = plan.hall;
  return u >= H.u0 + margin - 1e-9 && u <= H.u1 - margin + 1e-9 && v >= H.v0 + margin - 1e-9 && v <= H.v1 - margin + 1e-9;
};

// Staat een punt (de camera) in een tussenmuur of een hoog meubel van de hal? (voor de test; items zonder h tellen 1 m)
export function pointInBlock(plan, x, y, z, base = 0) {
  const [u, v] = toLocal(plan.frame, x, y);
  for (const b of plan.layout.walls) if (u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1) return 'tussenmuur';
  for (const it of plan.layout.items) {
    if (!it.solid) continue;
    const r = rectOf(it);
    if (u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1 && z - base < (it.h || 1)) return 'meubel ' + it.type;
  }
  return null;
}

// Loopt de zichtlijn van (x0, y0) naar (x1, y1) door een tussenmuur van de hal? (stappen van 20 cm)
export function sightBlocked(plan, x0, y0, x1, y1) {
  const [u0, v0] = toLocal(plan.frame, x0, y0), [u1, v1] = toLocal(plan.frame, x1, y1);
  const n = Math.max(2, Math.ceil(Math.hypot(u1 - u0, v1 - v0) / 0.2));
  for (let i = 1; i < n; i++) {
    const t = i / n, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t;
    for (const b of plan.layout.walls) if (u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1) return true;
  }
  return false;
}

// --- de kamercamera van een binnenmissie in een echt pand ----------------------------------------------------------------------------

// Zoals binnenset.js roomCameraPose, maar langs de assen van de hal van het echte pand: achter de speler (hold, kijkrichting `facing`),
// een schouder opzij, onder het plafond, binnen de muren (WALL_MARGIN), een harde snee en een lichte inzoom. layout: { hold: { x, y }, facing }
export function hallCameraPose(plan, layout, base = 0, t = 0) {
  if (!plan || !layout || !layout.hold || !num(layout.hold.x) || !num(layout.hold.y) || !num(base)) return null;
  const H = plan.hall, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const [hu, hv] = toLocal(plan.frame, layout.hold.x, layout.hold.y);
  const fx = Math.cos(layout.facing || 0), fy = Math.sin(layout.facing || 0);
  const [fu, fv] = toLocal({ ...plan.frame, ox: 0, oy: 0 }, fx, fy);
  const lu = -fv, lv = fu; // links van de kijkrichting
  const m = WALL_MARGIN;
  const pu = cl(hu - fu * CAM_BACK + lu * 0.7, H.u0 + m, H.u1 - m), pv = cl(hv - fv * CAM_BACK + lv * 0.7, H.v0 + m, H.v1 - m);
  const qu = cl(hu + fu * 3, H.u0 + m, H.u1 - m), qv = cl(hv + fv * 3, H.v0 + m, H.v1 - m);
  const [px, py] = toWorld(plan.frame, pu, pv), [qx, qy] = toWorld(plan.frame, qu, qv);
  const k = Math.min(1, Math.max(0, t / CAM_ZOOM_S));
  return {
    position: { x: px, y: py, z: Math.min(base + CAM_HEIGHT, base + (plan.height || 2.8) - CEIL_MARGIN) }, lookAt: { x: qx, y: qy, z: base + 1.25 },
    fov: CAM_FOV_FROM + (CAM_FOV_TO - CAM_FOV_FROM) * k, cut: true, bron: 'binnenset',
  };
}

// --- de plek van de speler en terugzetten --------------------------------------------------------------------------------------------

// Waar de speler weer komt als de stap klaar is: de beginplek als die buiten de hal ligt, anders (het anker lag zelf in het pand) vlak
// buiten de deur. null als hij al buiten de hal staat. door: de deurplek buiten de gevel (v = -1,5 m).
export function restorePlace(plan, origin, player) {
  if (!plan || !player || !num(player.x) || !num(player.y)) return null;
  if (!inHallXY(plan, player.x, player.y, -0.3)) return null; // hij staat al buiten de hal: laat hem
  if (origin && num(origin.x) && num(origin.y) && !inHallXY(plan, origin.x, origin.y, -0.3)) return { x: origin.x, y: origin.y, bron: 'begin' };
  const [x, y] = toWorld(plan.frame, 0, -1.5);
  const [dx, dy] = dirToWorld(plan.frame, 0, 1);
  return { x, y, angle: Math.atan2(dy, dx), bron: 'deur' };
}

