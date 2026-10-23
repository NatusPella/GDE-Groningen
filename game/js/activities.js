// Free-roam activities outside the story: carbid schieten on a field in the
// Ommelanden (carbid.js), the botsautootjes on the kermis at the Grote Markt
// (kermis.js), the hidden little things around town (geheimen.js), the
// drift zones, and Minigames batch 1: discgolf and pitch & putt around the
// Stadspark, the skatepark there and the kart track at Kardinge; batch 2: the
// swimming pool, the climbing tower and the water-ski lake (standactivity.js); the flying school on Eelde (vliegschool.js). One
// list, so the prompts, the E key, the frame loop, the maps, Ubbo and the
// spot check each have a single hook here instead of one per activity.
//
// An activity: { id, init(w), spots() -> [{ x, y, name, id }], prompt(w),
// secondary(w), interact(w) -> handled, active() -> its minigame runs, quit(w),
// update(dt, w) while active (instead of the player update), tick(dt, w)
// every frame, camera(w) while active, and for the maps: layer, legend
// { kind, label, note }, icon(ctx, s), mapSub(spot, w), ubbo(w) }.
// While a minigame runs, `world.activityGame` is its id; it claims the
// mouse buttons, number keys and Space through `world.minigameUntil`.
import { CARBID } from './carbid.js';
import { KERMIS } from './kermis.js';
import { HOOGVLIEGER } from './reuzenrad.js';
import { GEHEIMEN } from './geheimen.js';
import { DRIFT_ZONE } from './driftzone.js';
import { DISCGOLF } from './discgolf.js';
import { PITCHPUTT } from './pitchputt.js';
import { SKATEPARK } from './skatepark.js';
import { KARTBAAN } from './kartbaan.js';
import { ZWEMBAD } from './zwembad.js';
import { KLIMTOREN } from './klimtoren.js';
import { WATERSKI } from './waterski.js';
import { CARILLON_GAME } from './carillon.js';
import { PANNENKOEK } from './pannenkoek.js';
import { HENGELEN } from './hengelen.js';
import { WANDELING } from './wandeling.js';
import { SNACKKETEN } from './snackketen.js';
import { EVENEMENTEN } from './evenementenact.js';
import { REGATTA_GAME } from './regatta.js';
import { VLIEGSCHOOL } from './vliegschool.js';
import { SAFEHUIS } from './safehuizen.js';
import { isShopOpen } from './shopui.js';
import { isCinematicActive, showBanner } from './cinematics.js';
import { getScene } from './scene3d.js';
import { showCard } from './hudcards.js';
import { gameUi } from './minigamekit.js';
import { registerBusyProbe, registerQuitHook } from './busy.js';
export { activityBlock, iconDisc } from './activitykit.js';

Object.assign(gameUi, { getScene, showBanner, showCard });

const LIST = [CARBID, KERMIS, HOOGVLIEGER, GEHEIMEN, DRIFT_ZONE, DISCGOLF, PITCHPUTT, SKATEPARK, KARTBAAN, ZWEMBAD, KLIMTOREN, WATERSKI, CARILLON_GAME, PANNENKOEK, HENGELEN, WANDELING, SNACKKETEN, EVENEMENTEN, REGATTA_GAME, VLIEGSCHOOL, SAFEHUIS];

export function initActivities(w) {
  for (const a of LIST) {
    try { a.init(w); } catch (e) { console.error('activity', a.id, e); }
  }
  window.__activities = {
    list: () => LIST.map((a) => ({ id: a.id, spots: a.spots().length, active: a.active() })),
    get: (id) => LIST.find((a) => a.id === id) || null,
  };
}

function current() {
  for (const a of LIST) if (a.active()) return a;
  return null;
}

export function isActivityActive() {
  return !!current();
}
registerBusyProbe('activity', isActivityActive);

// A loaded save ends a running minigame (savegame.js).
export function quitActivity(w) {
  for (const a of LIST) if (a.active() && a.quit) a.quit(w);
  w.activityGame = null;
}
registerQuitHook(quitActivity);

// main.js: instead of player.update while a minigame runs
export function updateActivityGame(dt, w) {
  const a = current();
  if (!a) { w.activityGame = null; return; }
  w.activityGame = a.id;
  w.minigameUntil = w.time + 0.25;
  a.update(dt, w);
}

// main.js: every frame, minigame or not
export function updateActivitiesWorld(dt, w) {
  for (const a of LIST) {
    try { a.tick(dt, w); } catch (e) { console.error('activity', a.id, e); }
  }
  if (!current()) w.activityGame = null;
}

export function activityCamera(w) {
  const a = current();
  if (a && a.camera) a.camera(w);
}

export function activityPrompt(w) {
  if (current()) return null;
  for (const a of LIST) {
    const p = a.prompt && a.prompt(w);
    if (p) return p;
  }
  return null;
}

export function activitySecondary(w) {
  if (current()) return [];
  const out = [];
  for (const a of LIST) if (a.secondary) out.push(...a.secondary(w));
  return out;
}

export function tryActivityInteract(w) {
  const input = w.input;
  if (!input || current() || isShopOpen() || isCinematicActive()) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  for (const a of LIST) {
    if (a.interact && a.interact(w)) {
      input.consume('e');
      input.consume('f');
      return true;
    }
  }
  return false;
}

// --- maps, Ubbo, spot check -----------------------------------------------------------

export const ACTIVITY_LEGEND = LIST.filter((a) => a.legend).map((a) => ({ ...a.legend, layer: a.layer }));

// [{ layer, kind, x, y, name, sub }] for the full map and the minimap
export function activityMapIcons(w) {
  const out = [];
  for (const a of LIST) {
    if (!a.legend) continue;
    for (const s of a.spots()) out.push({ layer: a.layer, kind: a.legend.kind, x: s.x, y: s.y, name: s.name, sub: a.mapSub ? a.mapSub(s, w) : a.legend.note });
  }
  return out;
}

export function drawActivityMapIcon(ctx, kind, s) {
  const a = LIST.find((q) => q.legend && q.legend.kind === kind);
  if (!a || !a.icon) return false;
  a.icon(ctx, s);
  return true;
}


// Fixed places the player walks to, for spotcheck.js.
export function activitySpots() {
  const out = [];
  for (const a of LIST) for (const s of a.spots(true)) out.push({ kind: a.id, id: s.name || s.id, x: s.x, y: s.y, mode: s.mode || 'walk' });
  return out;
}
