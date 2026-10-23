// Een trein rijdt niet door je heen (#436): onder een spoorviaduct of bij een brug over het spoor werd alles in de
// brugzone overgeslagen, ook een auto die op het spoor zelf stond. Nu telt de hoogte: wat op de brug staat (hoger dan
// het spoor) blijft heel, wat op het spoor staat wordt geraakt.
//   node scripts/train_contact_test.mjs
import './node3d.mjs';
const { GameMap } = await import('../game/js/mapdata.js');
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
const F = await import('../game/js/countryfield.js');
F.setCountryBounds(map.meta.bounds);
const { applyCityRoutes } = await import('../game/js/corridorrail.js');
const { loadCityRouteSource } = await import('./world/cityroutes.mjs');
applyCityRoutes(map, loadCityRouteSource());
const RW = await import('../game/js/railway.js');
const world = {
  map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0 }, companion: null, time: 0, clock: 10, money: 200,
  wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} }, onRespawn: [], audioEvents: [], particles: [],
  addMessage() {}, health: 100, armor: 0,
};
RW.initRailway(world);
let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };

// een plek op het spoor in een brugzone, waar het spoor zelf vlak ligt
let spot = null;
for (const route of RW.getRoutes()) {
  for (let at = 200; at < route.len - 200 && !spot; at += 2) {
    const [x, y] = RW.routePoint(route, at);
    if (RW.inRailBridgeZone(x, y) && RW.railZ(x, y) < 0.5) spot = { route, at, x, y };
  }
  if (spot) break;
}
if (!spot) { console.log('SKIP: geen brugzone met vlak spoor'); process.exit(0); }
const t = RW.getTrains().find((q) => q.route === spot.route);
const mk = (id, z, dx) => ({ id, x: spot.x + dx, y: spot.y, angle: 0, halfLen: 2.2, halfWid: 0.9, z, speed: 0, driftX: 0, driftY: 0, health: 1e6, model: { len: 4.4 }, driver: 'ai' });
const onRail = mk(1, 0, 0), onDeck = mk(2, 4.5, 0);
// de trein staat met zijn midden op de plek en rijdt
t.state = 'run'; t.v = 12; t.dir = 1; t.c = spot.at; t.target = t.route.stops.length - 1;
world.vehicles.push(onRail, onDeck);
const start = { x: onRail.x, y: onRail.y }, startDeck = { x: onDeck.x, y: onDeck.y };
RW.updateRailway(1 / 60, world);
const moved = Math.hypot(onRail.x - start.x, onRail.y - start.y);
const movedDeck = Math.hypot(onDeck.x - startDeck.x, onDeck.y - startDeck.y);
if (moved < 0.2) fail(`een auto op het spoor in een brugzone werd niet geraakt (${moved.toFixed(2)} m)`);
if (movedDeck > 0.01) fail(`een auto op het viaduct boven het spoor werd wel geraakt (${movedDeck.toFixed(2)} m)`);
console.log(fails ? `${fails} fout(en)` : 'ok: trein raakt wat op het spoor staat, niet wat erboven rijdt');
process.exit(fails ? 1 : 0);
