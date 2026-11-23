// Hoe urgent is een plaatsingsvenster (tileplace.js withTiles)? (#1052, #1016)
// Puur: geen three.js, geen DOM, zodat scripts/placementurgency_test.mjs elke regel zonder browser keurt.
//
// Sinds de tegelstroom-fix (PERF-TEGELSTREAM-21-11) is elk venster achtergrondwerk: laagste prioriteit, 3 ms per frame,
// vastgehouden tijdens een film, een cutscene en de benchmark. Dat is goed voor een venster dat de provincie rond plaatst
// (garages, cafés, winkels, kits, dorpjes), maar fout voor werk dat een nabije speler NU nodig heeft: een faciliteit
// 100 m verderop (discgolf, pitch & putt, zwembad), de koe-minigame onder de voeten, een savegame die herstelt. Dat werk
// is URGENT: prioriteit net als de tegels rond de speler, een eigen ruim budget per frame, en het wordt niet vastgehouden
// door een film of cutscene (alleen de benchmark mag het uitstellen, en dan alleen het niet-urgente werk).
//
// Drie standen:
//  - 'sync':       de speler koos het zelf (teleport) of de host draagt over: top-prioriteit, alles in één keer (zoals voorheen);
//  - 'urgent':     nabij, een lopende activiteit of een herstel: gewone prioriteit (afstand), URGENT_SLICE_MS per frame, nooit vastgehouden;
//  - 'background': de rest: BACKGROUND_PRIORITY, BG_SLICE_MS per frame, vastgehouden tijdens film en cutscene.

import { BACKGROUND_PRIORITY, BG_SLICE_MS } from './tilestream.js';

// een venster met een punt binnen deze afstand van de speler is urgent (een faciliteit die je ziet of bereikt)
export const URGENT_NEAR_M = 400;
// ms tegelwerk per frame voor een urgent venster (bovenop wat de stroom zelf doet): ruim, maar niet in één klap
export const URGENT_SLICE_MS = 6;

// na een geladen savegame staan de plaatsingsvensters van het hervatte spel (faciliteiten, winkels, het huis) niet meer
// achteraan: zo lang (ms) telt elk venster als 'restoring' (#1052; savegame.js meldt de lading met noteRestore)
export const RESTORE_MS = 20000;
let restoreUntil = 0;
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
export function noteRestore(now = clock()) { restoreUntil = now + RESTORE_MS; }
export function restoreActive(now = clock()) { return now < restoreUntil; }
export function resetRestore() { restoreUntil = 0; }

let activityProbe = null;
// main.js (of een minigame) zegt "er loopt een missie, minigame of activiteit die plaatsing nodig heeft"
export function installActivityProbe(fn) { activityProbe = typeof fn === 'function' ? fn : null; }
function activityActive() { try { return !!(activityProbe && activityProbe()); } catch (e) { return false; } }

// De kleinste afstand van de speler tot de punten van een venster (Infinity als de speler of de punten onbekend zijn).
export function nearestPointDist(points, focus) {
  if (!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.y) || !points || !points.length) return Infinity;
  // gekwadrateerd vergelijken en één wortel op het eind: geen hypot per punt (een venster kan honderden punten hebben)
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) continue;
    const dx = p[0] - focus.x, dy = p[1] - focus.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;   // NaN en Infinity vallen vanzelf af (NaN < x is onwaar; een oneindige afstand blijft Infinity)
  }
  return Math.sqrt(best);
}

// De stand van een venster. urgent: de speler koos het zelf (sync); near: afstand tot het dichtstbijzijnde punt (m);
// activity: er loopt een activiteit; restoring: een savegame wordt hersteld; slice: de eigen slice van de aanroeper (ms).
export function urgencyMode({ urgent = false, near = Infinity, activity = false, restoring = false, slice = 0 } = {}) {
  if (urgent) return { mode: 'sync', priority: -500, sliceMs: 0, held: false };
  if (restoring || activity || near <= URGENT_NEAR_M) {
    // dichtbij = dezelfde urgentie als de prefetch (afstand), een herstel of activiteit net zo hoog
    const priority = restoring || activity ? 0 : Math.max(0, near);
    return { mode: 'urgent', priority, sliceMs: Math.max(URGENT_SLICE_MS, slice > 0 ? slice : 0), held: false };
  }
  return { mode: 'background', priority: BACKGROUND_PRIORITY, sliceMs: slice > 0 ? slice : BG_SLICE_MS, held: true };
}

// Kortweg voor tileplace.js: de stand uit de punten, de focus en de vlaggen.
export function urgencyModeFor(points, focus, { urgent = false, slice = 0, restoring = false } = {}) {
  if (urgent) return urgencyMode({ urgent, slice });   // een teleport beslist alleen op zichzelf: geen afstand en geen activiteitsvraag nodig
  const near = nearestPointDist(points, focus);
  const restoringNow = restoring || restoreActive();
  // de activiteitsvraag (playerBusy loopt over de wereld) niet tijdens een herstel (dan staat de uitkomst al vast)
  return urgencyMode({ near, activity: restoringNow ? false : activityActive(), restoring: restoringNow, slice });
}
