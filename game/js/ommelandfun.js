import { updateEdgeGuard } from './edgeguard.js';
import { ensureWorldEnds, updateWorldEnds, worldEndSolids, getWorldEndSpots, worldEndDebug, worldEndCount } from './worldends.js';
import { setExtraEggs } from './furniture.js';
import { initVillages, updateVillages, villageSolids, getVillageEggs, villagePrompt, villageSecondary, tryVillageInteract, getVillageSpots, ensureVillages, prepareVillages, villageDebug, villageUse } from './dorpsuitjes.js';
import { getKoeSites, koeCowTo, prepareKoeSites } from './pg_koe.js';
import { updateTalk } from './ommelandtalk.js';
import { prepareCountryStations } from './stationtravel.js';
import { prepareShopDoors } from './shops.js';
import { setExtraSolids } from './countryplan.js';
import { updateStadsleven, townSolids, townDebug } from './stadsleven.js';

// The Ommeland extras in one place for main.js, prompts.js and spotcheck.js:
// the wereldeinden (worldends.js), the dorpsuitjes (dorpsuitjes.js), the street
// life of the profile towns (stadsleven.js, #67), the turn-back scenes at the edge
// of the world (edgeguard.js, #6) and the
// solid bits of their props. De Koe van Ome Jan runs as a post-game
// challenge (pg_koe.js). Debug: window.__ommeland.

let world = null;
const solids = [];

// The villages' uitjes and eierballen and the sites of De Koe are picked on the
// tiles round them: in the background after the start, one place at a time,
// each with its tiles loaded for that moment (tileplace.js withTiles).
async function prepareOmmeland(w = world) {
  if (!w || !w.map.store) return;
  await prepareKoeSites(w.map);
  await prepareCountryStations(w.map);
  await prepareShopDoors(w.map);
  await prepareVillages(w);
}

export function initOmmelandFun(w) {
  world = w;
  if (typeof setTimeout === 'function' && !(typeof window !== 'undefined' && window.__noPrepare)) setTimeout(() => prepareOmmeland(w).catch((e) => console.warn('ommeland placement', e && e.message)), 12000);
  setExtraSolids(solids);
  setExtraEggs(() => (w.map.store ? getVillageEggs(w) : []));
  initVillages(w);
  if (typeof window !== 'undefined') {
    window.__ommeland = {
      prepare: () => prepareOmmeland(world),
      ends: () => worldEndDebug(), endsFound: () => worldEndCount(),
      towns: () => townDebug(), villages: () => villageDebug(), use: (name, role) => villageUse(name, role),
      koe: () => { const s = getKoeSites(world.map); return s ? { farm: [Math.round(s.farm.x), Math.round(s.farm.y)], hide: [Math.round(s.hide.x), Math.round(s.hide.y)], dist: Math.round(s.dist) } : null; },
      koeCow: (x, y) => koeCowTo(x, y),
      go: (x, y) => { const p = world.player; if (p.inVehicle) p.exitVehicle(world.map, world); p.x = x; p.y = y; return true; },
    };
  }
}

// The props' solid circles join countryplan.js pushOutOfPlan: every vehicle
// (vehicle.js, damage and impact sound), the camera ray and every walker.
function refreshSolids() {
  solids.length = 0;
  worldEndSolids(solids);
  villageSolids(solids);
  townSolids(solids);
}

export function updateOmmelandFun(dt, w) {
  world = w;
  if (!w.map.store) return;
  ensureWorldEnds();
  updateWorldEnds(dt, w);
  updateVillages(dt, w);
  updateTalk(w);
  updateStadsleven(dt, w);
  updateEdgeGuard(dt, w);
  refreshSolids();
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
  if (!w || !w.map.store) return [];
  const out = [];
  for (const s of getWorldEndSpots()) out.push({ kind: 'wereldeinde', id: s.id, x: s.x, y: s.y });
  ensureVillages(w);
  out.push(...getVillageSpots());
  const k = getKoeSites(w.map);
  if (k) out.push({ kind: 'koe', id: 'schuur', x: k.hide.x, y: k.hide.y });
  return out;
}
