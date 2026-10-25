// Zeeschepen op de Waddenzee, de Eems en de Dollard (#398): af en toe vaart er een vrachtschip, een containerschip, een tanker of
// een sleper voorbij, met verschillende kleuren. Eén schip is één samengevoegde geometrie (zeeschip3d.js), dus dat kost per schip
// één tekenaanroep; er varen er hooguit ZEE_MAX tegelijk rond de speler en wie ver weg raakt wordt opgeruimd. Puur deel: de keuze van
// het schip (pickZeeschip, zeeModel); het beheer (manageSeaShips) gebruikt de spawner en de vlag van vehicle.js via `env`.
// Tests: scripts/zeeschepen_test.mjs.
import { BOAT_KINDS } from './boattypes.js';
import { speler } from './spelersregister.js';

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

// Een containerschip van 200 m past niet in een plas of een smalle geul (#436): alleen water dat in
// beide richtingen ruim groter is dan het schip zelf, met de kantlijn mee.
export const ZEE_RAND = 60; // m vrije ruimte aan elke kant
export function waterPast(model, poly) {
  if (!isZee(poly) || !(model && model.len > 0)) return false;
  let b = poly.bounds;
  // een waterpolygoon zonder grenzen (een patch): ze zelf uit de punten halen
  if (!b && Array.isArray(poly.pts) && poly.pts.length) {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of poly.pts) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  }
  if (!b || !b.every(Number.isFinite)) return false;
  const w = b[2] - b[0], h = b[3] - b[1];
  return Math.max(w, h) >= model.len + 2 * ZEE_RAND && Math.min(w, h) >= model.wid + 2 * ZEE_RAND;
}

// Ligt (x, y) in wat de speler ziet? Een schip dat binnen je blikveld uit het niets opduikt of
// verdwijnt valt op (#436); daarom komt er alleen een schip buiten beeld bij en ruimt een schip
// pas op als het ver weg én uit het zicht is. De kegel voor de boot volgt die van vehicle.js
// (spawnWouldPop): wat recht voor je vaart zie je aankomen.
export function inZicht(world, x, y) {
  const p = world && world.player;
  if (!p) return false;
  const pv = p.inVehicle;
  if (pv) {
    const ca = Math.cos(pv.angle), sa = Math.sin(pv.angle), dx = x - p.x, dy = y - p.y;
    const fwd = dx * ca + dy * sa, lat = Math.abs(dy * ca - dx * sa);
    if (fwd > -80 && fwd < 500 + Math.abs(pv.speed) * 12 && lat < 160 + Math.max(0, fwd) * 0.4) return true;
  }
  const view = world.pedView;
  return !!(view && typeof view.inView === 'function' && view.inView(x, y));
}

// Ligt het schip zelf in beeld, niet alleen zijn middelpunt? Een containerschip van 92 tot 98 m steekt
// met zijn boeg of achtersteven al in beeld terwijl het middelpunt erbuiten valt: dan kwam het met een
// halve romp uit het niets op of verdween het met een halve romp (#436). Boeg en achtersteven tellen mee.
export function schipInZicht(world, v) {
  if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return false;
  if (inZicht(world, v.x, v.y)) return true;
  const half = Math.max(0, (Number(v.model && v.model.len) || 0) / 2);
  if (!(half > 0)) return false;
  const a = Number.isFinite(v.angle) ? v.angle : 0, dx = Math.cos(a) * half, dy = Math.sin(a) * half;
  return inZicht(world, v.x + dx, v.y + dy) || inZicht(world, v.x - dx, v.y - dy);
}

let timer = 0;
// env: { spawnBoatOnWater, isShip } uit vehicle.js (main.js geeft ze mee)
export function manageSeaShips(world, dt, env, rng = Math.random) {
  const { map, player, vehicles } = world || {};
  if (!world || !player || !map || !env || world.paused) return;
  timer -= dt;
  if (timer > 0) return;
  timer = ZEE_TIK_S;
  let n = 0;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i];
    if (!v.zeeSchip) continue;
    const weg = Math.hypot(v.x - player.x, v.y - player.y);
    // Een schip dat je ziet verdwijnt nooit (#436): een wrak of een schip achter de horizon gaat pas weg
    // als het uit het zicht is. Alleen heel ver weg (buiten elke tekenafstand, ZEE_WEG * 4) ruimen we
    // altijd op, zodat een schip dat je nooit meer ziet niet in de lijst blijft staan.
    if (weg > ZEE_WEG * 4 || (weg > ZEE_WEG && !schipInZicht(world, v))) vehicles.splice(i, 1);
    else if (v.wrecked && !schipInZicht(world, v)) vehicles.splice(i, 1);
    else n++;
  }
  if (n >= ZEE_MAX || rng() > ZEE_KANS || !map.waterNear) return;
  const model = zeeModel(rng);
  for (const max of ZEE_SPAWN.stappen) {
    const kandidaten = map.waterNear(player.x, player.y, max).filter((poly) => waterPast(model, poly));
    if (!kandidaten.length) continue;
    const poly = kandidaten[Math.floor(rng() * kandidaten.length)];
    const v = env.spawnBoatOnWater(map, poly, rng, { model, near: [player.x, player.y], min: ZEE_SPAWN.min, max, budget: 4 });
    // hetzelfde schip van begin tot eind: een spawner die een ander model teruggeeft levert geen schip op (#436)
    if (!v || !v.model) continue;
    if (v.model !== model && (v.model.key !== model.key || v.model.len !== model.len || v.model.wid !== model.wid || v.model.color !== model.color)) continue;
    if (schipInZicht(world, v) || !ruimteVoor(model, v.x, v.y, vehicles.filter((o) => o.isBoat && env.isShip(o)))) continue;
    v.zeeSchip = true;
    vehicles.push(v);
    return;
  }
}

export function resetZeeschepen() { timer = 0; }
