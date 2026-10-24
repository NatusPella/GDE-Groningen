// Test van het register world.players (#446): eenspeler is een register van één, samen spelen voegt records toe.
import assert from 'node:assert/strict';
import { ververs, spelers, voorElkeSpeler, dichtstbijzijndeSpeler, naasteSpeler, spelerVan, hoofdspeler } from '../game/js/spelersregister.js';

// eenspeler: geen partners
const auto = { id: 'auto' };
const world = { player: { x: 10, y: 20, inVehicle: auto } };
assert.equal(spelers(world).length, 1);
assert.equal(hoofdspeler(world), world.player);
assert.equal(dichtstbijzijndeSpeler(world, 500, 500).entiteit, world.player);
assert.equal(naasteSpeler(world, 0, 0).x, 10);
assert.equal(spelerVan(world, world.player).slot, 0);
assert.equal(spelerVan(world, auto).slot, 0, 'het voertuig hoort bij de bestuurder');
assert.equal(spelerVan(world, { id: 'ander' }), null);
let n = 0; voorElkeSpeler(world, () => n++); assert.equal(n, 1);

// world.player verwisselen (coopgezocht.js) wordt gevolgd door het lokale record
const echt = world.player; const proxy = { x: 1, y: 2 };
world.player = proxy; assert.equal(spelers(world)[0].entiteit, proxy); world.player = echt;

// samen spelen: twee partners; de host is speler 0
world.coopPartners = [{ slot: 2, x: 300, y: 0, zichtbaar: true }, { slot: 1, x: 12, y: 21, zichtbaar: true }];
ververs(world, 0);
assert.deepEqual(world.players.map((r) => r.slot), [0, 1, 2], 'volgorde op plek, lokaal eerst');
const rec1 = world.players[1];
assert.equal(dichtstbijzijndeSpeler(world, 290, 0).slot, 2);
assert.equal(dichtstbijzijndeSpeler(world, 11, 20).slot, 0);
assert.equal(naasteSpeler(world, 13, 22).slot, 1);
world.coopPartners = [{ slot: 1, x: 50, y: 50 }, { slot: 2, x: 300, y: 0 }]; // een nieuwe lijst: de records blijven dezelfde objecten
ververs(world, 0);
assert.equal(world.players[1], rec1, 'stabiele plek per speler');
assert.equal(rec1.x, 50);
assert.equal(spelerVan(world, { slot: 2 }).slot, 2);

// een partner zonder plek doet niet mee aan "dichtstbij"
world.coopPartners = [{ slot: 1, x: null, y: null, zichtbaar: false }];
assert.equal(dichtstbijzijndeSpeler(world, 0, 0).slot, 0);

// einde van de sessie
world.players = null; world.coopPartners = [];
assert.equal(spelers(world).length, 1);

// een gast (plek 3): lokaal record krijgt zijn eigen plek, de host staat tussen de partners
const gast = { player: { x: 0, y: 0 }, coopPartners: [{ slot: 0, x: 5, y: 5 }, { slot: 1, x: 9, y: 9 }] };
ververs(gast, 3);
assert.deepEqual(gast.players.map((r) => r.slot), [3, 0, 1]);
assert.equal(hoofdspeler(gast), gast.player);
console.log('spelersregister_test: ok');
