// Sjablonen (bouwsteen G0b): startsein, finish-cinematic en camera- en voertuigsjablonen voor
// races en checkpointmissies (M05, M01, M15, M19, M26). Alles puur: een route van wereldpunten
// in, een cutscript-definitie (cutscript.js) en dressingplannen eruit, met node na te spelen.
//
//   const { def, anchor } = raceFinishScene(route, { id: 'M05.finish', speed: 14 });
//   playScript(world, def, { anchor, lines: [], duration: def.duration });
//
// De definitie is in het ankerframe (f vooruit, s links) met het anker op de finishlijn; het
// voertuig krijgt `road: true`, dus cutscenehost.js zet zijn pad bij de start op de echte weg
// (roadPathDef, #862) en het publiek (def.crowd) blijft uit de buurt van dat pad
// (roadPropPaths + pathClearCircles): niemand wordt overreden.
//
// Samen spelen: de scène is voor wie meedoet dezelfde (de gast speelt de definitie na met
// coopcut.js, de crowd komt uit spec en seed en wordt per apparaat maar één keer gebouwd).
import { crowdSpecIssue } from './crowdplan.js';

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const r2 = (n) => Math.round(n * 100) / 100;

export const RACE_VEHICLES = ['auto', 'bestelbus', 'politie', 'trekker', 'fiets'];
export const CAMERA_TEMPLATES = ['overzicht', 'volg', 'finishlijn', 'reactie'];

// --- de route ----------------------------------------------------------------

// Een route van [x, y]-punten: lengte, begin en eind met koers, en een sampler at(s).
export function routeInfo(pts) {
  if (!Array.isArray(pts) || pts.length < 2 || !pts.every((p) => Array.isArray(p) && isNum(p[0]) && isNum(p[1]))) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  if (len < 1) return null;
  const at = (s) => {
    s = Math.max(0, Math.min(len, s));
    let i = 1;
    while (i < pts.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1;
    const u = Math.max(0, Math.min(1, (s - cum[i - 1]) / seg));
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  // de koers aan de uiteinden over minstens 3 m, zodat een kort eerste of laatste stuk niet draait
  const head = (s0, dir) => { const p = at(s0), q = at(Math.max(0, Math.min(len, s0 + dir * 3))); return Math.atan2((q.y - p.y) * dir, (q.x - p.x) * dir); };
  const start = { ...at(0), a: head(0, 1) };
  const finish = { ...at(len), a: head(len, -1) };
  return { pts, len, at, start, finish };
}

export function toLocal(anchor, x, y) {
  const c = Math.cos(anchor.facing), s = Math.sin(anchor.facing);
  return [(x - anchor.x) * c + (y - anchor.y) * s, -(x - anchor.x) * s + (y - anchor.y) * c];
}

// Het stuk van de route tussen s0 en s1 in lokale maten van `anchor`, om de `step` m.
function localStretch(info, anchor, s0, s1, step = 5) {
  const out = [];
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  for (let i = 0; i <= n; i++) {
    const p = info.at(s0 + ((s1 - s0) * i) / n);
    const [f, s] = toLocal(anchor, p.x, p.y);
    out.push([r2(f), r2(s)]);
  }
  return out;
}

// --- dressing voor een checkpointrace ------------------------------------------

// Het plan voor een race zonder eigen start en finish (M05): een startboog, een finishboog en
// twee groepen publiek langs het begin en het eind. De spec's zijn wereldmaten voor buildCrowd.
// De posities zitten op de route; racedecor.js buildCheckpointRaceDecor tekent ze.
export function raceDressingPlan(route, { startCount = 24, finishCount = 40, title = 'FINISH', startTitle = 'START', seed = 1 } = {}) {
  const info = Array.isArray(route) ? routeInfo(route) : route;
  if (!info) return null;
  const stretch = (s0, s1) => Array.from({ length: 6 }, (_, i) => { const p = info.at(s0 + ((s1 - s0) * i) / 5); return [r2(p.x), r2(p.y)]; });
  const sLen = Math.min(30, info.len * 0.4);
  return {
    kind: 'checkpoint',
    start: { x: r2(info.start.x), y: r2(info.start.y), a: info.start.a, title: startTitle },
    finish: { x: r2(info.finish.x), y: r2(info.finish.y), a: info.finish.a, title },
    crowds: [
      { id: 'start', spec: { shape: 'line', pts: stretch(0, sLen), count: startCount, side: 8.5, spread: 3, seed } },
      { id: 'finish', spec: { shape: 'line', pts: stretch(info.len - Math.min(45, info.len * 0.5), info.len), count: finishCount, side: 8.5, spread: 3.5, seed: seed + 1 } },
    ],
  };
}

// --- het startsein -------------------------------------------------------------

// Drie rode lichten, om de `gap` seconden één erbij, dan groen. t < 0: nog niets. Puur, dus de
// scène, de missielus en de test lezen dezelfde klok.
export function startSignalState(t, { lights = 3, gap = 0.9, hold = 0.5 } = {}) {
  const goAt = lights * gap + hold;
  if (!isNum(t) || t < 0) return { lit: 0, go: false, goAt };
  if (t >= goAt) return { lit: lights, go: true, goAt };
  return { lit: Math.min(lights, Math.floor(t / gap) + 1), go: false, goAt };
}

// --- camerasjablonen -----------------------------------------------------------

// Een camerasjabloon als shots voor een cutscript-definitie, vanaf tijd t0. Alle maten zijn
// lokaal aan het anker op de finishlijn (f vooruit, s links, h omhoog), met `prop` het voertuig
// en `approach` de lengte van het aanrijpad vóór de lijn.
//   overzicht  hoog schuin boven het parcours, het voertuig komt in beeld
//   volg       laag naast het voertuig, het rijdt mee naar de lijn
//   finishlijn laag naast de lijn: het voertuig schiet door het beeld
//   reactie    handheld op het publiek dat juicht
export function cameraTemplate(kind, { t0 = 0, prop = 'wagen', approach = 70, crowdSide = 11, duration = 3 } = {}) {
  const t = r2(t0);
  switch (kind) {
    case 'overzicht':
      return [{ t, shot: 'crane', from: [r2(-approach * 0.55), 15, 9], to: [r2(-approach * 0.3), 13, 7], look: prop, fov: 46 }];
    case 'volg':
      return [{ t, shot: 'dolly', from: [-14, -6, 1.7], to: [-3, -6.5, 1.9], look: prop, fov: 42 }];
    case 'finishlijn':
      return [{ t, shot: 'cut', at: [6, 4.5, 0.9], look: [0, 0, 1.1], fov: 38 }];
    case 'reactie':
      return [{ t, shot: 'handheld', from: [3, -1, 1.5], to: [4, -1.5, 1.55], look: [1.5, crowdSide, 1.6], amount: 0.03, fov: 40 }];
    default:
      return [];
  }
}

// --- voertuigsjablonen ---------------------------------------------------------

// Een voertuig dat over een route rijdt: de prop (op de weg, `road: true`) en zijn pad-cue. De
// route is in lokale maten [f, s]; cutscenehost.js zet hem bij de start op de echte weg.
export function vehicleCues(id, localPath, { kind = 'auto', t = 0, speed = 14 } = {}) {
  if (!RACE_VEHICLES.includes(kind)) throw new Error(`voertuigsjabloon: onbekende soort ${kind}`);
  if (!Array.isArray(localPath) || localPath.length < 2) throw new Error('voertuigsjabloon: een pad heeft minstens twee punten nodig');
  return {
    props: { [id]: { kind, at: [localPath[0][0], localPath[0][1], 0], face: 0, road: kind === 'fiets' ? 'cycle' : true } },
    cues: [{ t, prop: id, path: localPath.map((p) => [p[0], p[1], 0]), speed }],
  };
}

// De paden (lokale [f, s]-lijsten) van alle voertuigen op de weg in een definitie, ook na
// roadPathDef. Een geparkeerd voertuig is een pad van één punt.
export function roadPropPaths(def) {
  const out = [];
  if (!def || !def.props) return out;
  for (const [id, p] of Object.entries(def.props)) {
    if (!p || !p.road) continue;
    let found = false;
    for (const key of ['cues', 'open', 'beats']) {
      for (const q of Array.isArray(def[key]) ? def[key] : []) {
        if (q && q.prop === id && Array.isArray(q.path) && q.path.length >= 2) { out.push(q.path.map((pt) => [pt[0], pt[1]])); found = true; }
      }
    }
    if (!found && Array.isArray(p.at)) out.push([[p.at[0], p.at[1]]]);
  }
  return out;
}

// Vrij te houden cirkels (straal r) langs wereldpaden: de crowd (crowdplan.js clear) blijft
// erbuiten. Om de 0,7 r een cirkel, zodat een pad geen gaten laat.
export function pathClearCircles(paths, r = 3.2) {
  const out = [];
  for (const pts of paths) {
    if (!pts.length) continue;
    out.push({ x: pts[0][0], y: pts[0][1], r });
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (r * 0.7)));
      for (let k = 1; k <= n; k++) out.push({ x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n, r });
    }
  }
  return out;
}

// Welke figuren staan te dicht bij een pad (lijst van { x, y }, zelfde stelsel als het pad)?
export function vehicleConflicts(path, figures, min = 2.4) {
  const dist = (f) => {
    let best = Infinity;
    for (let i = 0; i < Math.max(1, path.length - 1); i++) {
      const a = path[i], b = path[Math.min(path.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const u = l2 ? Math.max(0, Math.min(1, ((f.x - a[0]) * dx + (f.y - a[1]) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(f.x - (a[0] + dx * u), f.y - (a[1] + dy * u)));
    }
    return best;
  };
  return figures.filter((f) => dist(f) < min);
}

// --- de finish-cinematic en de start -------------------------------------------

const OFFICIAL = { shirt: 0xe0b93a, skin: 0xf1c9a5, seed: 7301, variant: 'male' };

function crowdFor(approach, ahead, count, seed, key) {
  return { shape: 'line', pts: [[-approach * 0.6, 0], [ahead, 0]], count, side: 8.5, spread: 3.5, seed, key };
}

// De finish van een race of checkpointmissie als cinematic. route: wereldpunten (de laatste
// is de finishlijn). Geeft { def, anchor } met het anker op de finishlijn; def.duration is de
// scèneduur. opts: id, vehicle, speed (m/s), approach (m aanrijpad), crowd (aantal, 0 = geen).
export function raceFinishScene(route, { id = 'race-finish', vehicle = 'auto', speed = 14, approach = 70, runout = 14, crowd = 36, duration = 0, seed = 1 } = {}) {
  const info = Array.isArray(route) ? routeInfo(route) : route;
  if (!info) return null;
  const app = Math.max(25, Math.min(approach, info.len));
  const anchor = { x: info.finish.x, y: info.finish.y, facing: info.finish.a, z: 0 };
  const local = localStretch(info, anchor, info.len - app, info.len, 5);
  local.push([r2(local[local.length - 1][0] + runout), local[local.length - 1][1]]);
  const v = vehicleCues('wagen', local, { kind: vehicle, speed });
  const arrival = app / speed;
  const tV = Math.max(1.2, arrival - 2.5), tF = Math.max(tV + 1, arrival - 0.6), tR = Math.max(tF + 1.5, arrival + 1.8);
  const dur = Math.max(duration || 0, r2(tR + 3.5));
  const def = {
    id,
    actors: { vlagger: { look: OFFICIAL, at: [2.5, 7.6], face: -90, anim: 'wave' } },
    props: v.props,
    cues: [...v.cues, { t: r2(arrival - 0.4), actor: 'vlagger', anim: 'cheer' }, { t: r2(arrival + 1.6), actor: 'vlagger', anim: 'wave' }],
    shots: [
      ...cameraTemplate('overzicht', { t0: 0, prop: 'wagen', approach: app }),
      ...cameraTemplate('volg', { t0: tV, prop: 'wagen' }),
      ...cameraTemplate('finishlijn', { t0: tF }),
      ...cameraTemplate('reactie', { t0: tR }),
    ],
    crowd: crowd > 0 ? [crowdFor(app, 18, crowd, seed, 'cut:' + id)] : undefined,
    duration: dur,
  };
  if (!def.crowd) delete def.crowd;
  return { def, anchor };
}

// Het vertrek: het voertuig wacht op de lijn, het startsein telt af (startSignalState) en het
// voertuig rijdt de eerste `runup` m van de route. Anker op de startlijn.
export function raceStartScene(route, { id = 'race-start', vehicle = 'auto', speed = 12, runup = 60, crowd = 24, seed = 1 } = {}) {
  const info = Array.isArray(route) ? routeInfo(route) : route;
  if (!info) return null;
  const anchor = { x: info.start.x, y: info.start.y, facing: info.start.a, z: 0 };
  const sig = startSignalState(0);
  const goT = r2(sig.goAt);
  const local = localStretch(info, anchor, 0, Math.min(runup, info.len), 5);
  const v = vehicleCues('wagen', local, { kind: vehicle, speed, t: goT });
  const def = {
    id,
    actors: { vlagger: { look: OFFICIAL, at: [3, 6.5], face: -90, anim: 'idle' } },
    props: v.props,
    cues: [{ t: r2(goT - 0.5), actor: 'vlagger', anim: 'wave' }, ...v.cues, { t: r2(goT + 1.5), actor: 'vlagger', anim: 'cheer' }],
    shots: [
      { t: 0, shot: 'cut', at: [-7, -3.5, 1.1], look: 'wagen', fov: 40 },
      ...cameraTemplate('volg', { t0: goT - 0.3, prop: 'wagen' }).map((s) => ({ ...s, from: [-10, -5, 1.2], to: [-3, -6, 1.4] })),
      { t: r2(goT + 2), shot: 'crane', from: [-10, 13, 7], to: [10, 11, 9], look: 'wagen', fov: 46 },
    ],
    crowd: crowd > 0 ? [{ shape: 'line', pts: [[-8, 0], [30, 0]], count: crowd, side: 8.5, spread: 3, seed, key: 'cut:' + id }] : undefined,
    duration: r2(goT + 2 + 4),
  };
  if (!def.crowd) delete def.crowd;
  return { def, anchor, signal: sig };
}

// Controle voor de tests en de scènes: de crowd-specs van een definitie zijn geldig.
export function crowdIssues(def) {
  const list = !def || !def.crowd ? [] : Array.isArray(def.crowd) ? def.crowd : [def.crowd];
  return list.map(crowdSpecIssue).filter(Boolean);
}
