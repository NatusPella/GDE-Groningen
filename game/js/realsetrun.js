// Echte-wereld-sets, de kant die aan het spel hangt (realsets.js is puur): kies het pand bij het anker van een scène, laat het interieursysteem
// de hal bouwen (interiors.js holdInterior) en geef de scène zijn nieuwe anker, zijn grenzen en een handvat om het pand weer los te laten.
// Elke mislukking is een terugval op de bestaande set (de kit in de open lucht of boven de straat), met één logregel in de console en in
// window.__realSets (de laatste 60 beslissingen, voor de hertest en de testbank). Zie docs/CUTSCENE-INTERIEURS-22-11.md.
import { planForScene, holdInterior, releaseSceneInterior } from './interiors.js';
import { pickRealSet, isRealSet, hallEnv, REAL_SETS } from './realsets.js';

const LOG_MAX = 60;
const note = (e) => {
  const list = (typeof window !== 'undefined' ? (window.__realSets || (window.__realSets = [])) : null);
  if (list) { list.push(e); if (list.length > LOG_MAX) list.shift(); }
  const text = `[echte set] ${e.key}: ${e.ok ? 'pand ' + e.gid + (e.place ? ' (' + e.place + ')' : '') + ' op ' + e.d + ' m' : 'terugval op de bestaande set (' + e.why + ')'}`;
  try { (e.ok ? console.info : console.warn)(text); } catch (err) { /* geen console */ }
};

// w: de wereld; key: de set (cutscript.js set, missions set); anchor: { x, y }; points: de punten die in de hal moeten passen (realsets.js)
// Geeft { ok: true, b, plan, base, anchor: { x, y, facing, z }, env, fit, gid, release() } of { ok: false, why, pending? }.
// deps (alleen voor de tests): { planOf, hold } in plaats van het interieursysteem van het spel
export function resolveRealSet(w, key, anchor, points = [], cams = [], deps = null) {
  const fail = (why, extra = {}) => { note({ key, ok: false, why }); return { ok: false, why, ...extra }; };
  if (!isRealSet(key)) return { ok: false, why: (REAL_SETS[key] && REAL_SETS[key].why) || 'geen echte set', quiet: true };
  if (!w || w.noRealSets) return fail('echte sets staan uit');
  const map = w.map;
  if (!map || typeof map.buildingsNear !== 'function') return fail('de wereld is er nog niet');
  let pick;
  try {
    pick = pickRealSet({ key, anchor, buildings: map.buildingsNear(anchor.x, anchor.y, REAL_SETS[key].r + 20), planOf: deps && deps.planOf ? deps.planOf : planForScene, points, cams });
  } catch (e) { return fail('pandkeuze mislukt: ' + (e && e.message)); }
  if (!pick.ok) return fail(pick.why, { pending: !!pick.pending });
  let held = null;
  try { held = deps && deps.hold ? deps.hold(w, pick.b) : holdInterior(w, pick.b); } catch (e) { held = null; }
  if (!held) return fail('het interieur van pand ' + pick.gid + ' is niet te bouwen');
  const base = held.ground;
  note({ key, ok: true, gid: pick.gid, place: pick.place, d: pick.d });
  let released = false;
  return {
    ok: true, b: pick.b, plan: held.plan, base, fit: pick.fit, gid: pick.gid, place: pick.place,
    anchor: { x: pick.fit.x, y: pick.fit.y, facing: pick.fit.facing, z: base },
    env: hallEnv(held.plan, base),
    release() { if (released) return; released = true; if (deps && deps.release) deps.release(pick.b); else releaseSceneInterior(pick.b); },
  };
}
