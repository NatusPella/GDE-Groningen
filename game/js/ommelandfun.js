import { REAL } from './countryreal.js';
import { ensureWorldEnds, updateWorldEnds, worldEndSolids, getWorldEndSpots, worldEndDebug, worldEndCount } from './worldends.js';
import { initVillages, updateVillages, villageSolids, villagePrompt, villageSecondary, tryVillageInteract, getVillageSpots, ensureVillages, villageDebug, villageUse } from './dorpsuitjes.js';
import { getKoeSites, koeCowTo } from './pg_koe.js';
import { updateTalk } from './ommelandtalk.js';

// The Ommeland extras in one place for main.js, prompts.js and spotcheck.js:
// the wereldeinden (worldends.js), the dorpsuitjes (dorpsuitjes.js) and the
// solid bits of their props. De Koe van Ome Jan runs as a post-game
// challenge (pg_koe.js). Debug: window.__ommeland.

const PUSH_R = 60;
let world = null;
const solids = [];

export function initOmmelandFun(w) {
  world = w;
  initVillages(w);
  if (typeof window !== 'undefined') {
    window.__ommeland = {
      ends: () => worldEndDebug(), endsFound: () => worldEndCount(),
      villages: () => villageDebug(), use: (name, role) => villageUse(name, role),
      koe: () => { const s = getKoeSites(world.map); return s ? { farm: [Math.round(s.farm.x), Math.round(s.farm.y)], hide: [Math.round(s.hide.x), Math.round(s.hide.y)], dist: Math.round(s.dist) } : null; },
      koeCow: (x, y) => koeCowTo(x, y),
      go: (x, y) => { const p = world.player; if (p.inVehicle) p.exitVehicle(world.map, world); p.x = x; p.y = y; return true; },
    };
  }
}

// Props block the player on foot and in a vehicle: a plain circle push-out.
function pushOut(w) {
  const p = w.player, v = p.inVehicle;
  if (v && v.isHeli && !v.onGround) return;
  const o = v || p;
  const R = v ? Math.max(0.9, v.halfWid || 0.9) : 0.35;
  solids.length = 0;
  worldEndSolids(solids);
  villageSolids(solids);
  for (const s of solids) {
    const dx = o.x - s.x, dy = o.y - s.y;
    if (Math.abs(dx) > PUSH_R || Math.abs(dy) > PUSH_R) continue;
    const d = Math.hypot(dx, dy), min = s.r + R;
    if (d >= min || d < 1e-4) continue;
    o.x = s.x + (dx / d) * min;
    o.y = s.y + (dy / d) * min;
    if (v) v.speed *= 0.6;
  }
}

export function updateOmmelandFun(dt, w) {
  world = w;
  if (!REAL.ready) return;
  ensureWorldEnds();
  updateWorldEnds(dt, w);
  updateVillages(dt, w);
  updateTalk(w);
  if (!w.pigeonMode) pushOut(w);
}

export function tryOmmelandInteract(w) {
  return tryVillageInteract(w);
}

export function ommelandPrompt(w) {
  return villagePrompt(w);
}

export function ommelandSecondary(w) {
  return villageSecondary(w);
}

// Every fixed point of the extras, for spotcheck.js (all walked to on foot).
export function getOmmelandSpots(w = world) {
  if (!REAL.ready || !w) return [];
  const out = [];
  for (const s of getWorldEndSpots()) out.push({ kind: 'wereldeinde', id: s.id, x: s.x, y: s.y });
  ensureVillages(w);
  out.push(...getVillageSpots());
  const k = getKoeSites(w.map);
  if (k) out.push({ kind: 'koe', id: 'schuur', x: k.hide.x, y: k.hide.y });
  return out;
}
