// Zeeschepen op de Waddenzee, de Eems en de Dollard (#398): af en toe vaart er een vrachtschip, een containerschip, een tanker of
// een sleper voorbij, met verschillende kleuren. Eén schip is één samengevoegde geometrie (zeeschip3d.js), dus dat kost per schip
// één tekenaanroep; er varen er hooguit ZEE_MAX tegelijk rond de speler en wie ver weg raakt wordt opgeruimd. Puur deel: de keuze van
// het schip (pickZeeschip, zeeModel); het beheer (manageSeaShips) gebruikt de spawner en de vlag van vehicle.js via `env`.
// Tests: scripts/zeeschepen_test.mjs.
import { BOAT_KINDS } from './boattypes.js';

export const ZEE_MAX = 3;
// m rond de speler: eerst dichtbij proberen (van de kust is de zee vaak een kilometer weg), dan verder
export const ZEE_SPAWN = { min: 250, max: 1500, stappen: [600, 1000, 1500] };
export const ZEE_WEG = 2400;                      // m: verder weg wordt het schip opgeruimd
export const ZEE_TIK_S = 5;
export const ZEE_KANS = 0.4;                      // kans per tik dat er een bijkomt als er plek is

// (kind, gewicht)
const MIX = [['zeeVracht', 32], ['zeeContainer', 26], ['zeeTanker', 20], ['zeeSleper', 22]];
const MIX_TOTAAL = MIX.reduce((s, [, w]) => s + w, 0);
// rompkleuren per soort (de opbouw blijft wit): verzonnen rederijen hebben elk hun eigen kleur
const KLEUREN = {
  zeeVracht: ['#2d4a63', '#3a5f4a', '#6b2a24', '#2f3a44', '#8a6a2a'],
  zeeContainer: ['#8b2b24', '#1f4f9a', '#2f7d46', '#4a4d52', '#b4682a'],
  zeeTanker: ['#2a2d33', '#7a1f1f', '#1f3f5f', '#4a3a2a'],
  zeeSleper: ['#c5922b', '#b4372c', '#1f4f9a', '#2f7d46'],
};

export function pickZeeschip(rng = Math.random) {
  let r = rng() * MIX_TOTAAL;
  for (const [k, w] of MIX) { r -= w; if (r <= 0) return k; }
  return MIX[0][0];
}

// Het model van een nieuw schip: de soort uit de mix en een eigen kleur; lengte en breedte krijgen een beetje spreiding.
export function zeeModel(rng = Math.random) {
  const k = pickZeeschip(rng), basis = BOAT_KINDS[k], kleuren = KLEUREN[k];
  const f = k === 'zeeSleper' ? 1 : 0.92 + Math.round(rng() * 4) * 0.04; // vijf lengtes per soort: de geometrie wordt gedeeld
  return { ...basis, key: k, color: kleuren[Math.floor(rng() * kleuren.length)], len: Math.round(basis.len * f), wid: Math.round(basis.wid * f * 10) / 10 };
}

// Mag er hier een zeeschip komen? Alleen op de zee, niet op een vijver, en niet te dicht bij een ander schip.
export const isZee = (poly) => !!poly && poly.kind === 'zee';
export function ruimteVoor(model, x, y, schepen, extra = 60) {
  for (const o of schepen) if (Math.hypot(o.x - x, o.y - y) < model.len / 2 + o.model.len / 2 + extra) return false;
  return true;
}

let timer = 0;
// env: { spawnBoatOnWater, isShip } uit vehicle.js (main.js geeft ze mee)
export function manageSeaShips(world, dt, env, rng = Math.random) {
  if (!world || !world.player || !world.map || !env || world.paused) return;
  timer -= dt;
  if (timer > 0) return;
  timer = ZEE_TIK_S;
  const { map, player, vehicles } = world;
  let n = 0;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.zeeSchip) continue;
    if (Math.hypot(v.x - player.x, v.y - player.y) > ZEE_WEG || v.wrecked) vehicles.splice(i, 1);
    else n++;
  }
  if (n >= ZEE_MAX || rng() > ZEE_KANS || !map.waterNear) return;
  const model = zeeModel(rng);
  for (const max of ZEE_SPAWN.stappen) {
    const kandidaten = map.waterNear(player.x, player.y, max).filter(isZee);
    if (!kandidaten.length) continue;
    const poly = kandidaten[Math.floor(rng() * kandidaten.length)];
    const v = env.spawnBoatOnWater(map, poly, rng, { model, near: [player.x, player.y], min: ZEE_SPAWN.min, max, budget: 4 });
    if (!v || !ruimteVoor(model, v.x, v.y, vehicles.filter((o) => o.isBoat && env.isShip(o)))) continue;
    v.zeeSchip = true;
    vehicles.push(v);
    return;
  }
}

export function resetZeeschepen() { timer = 0; }
