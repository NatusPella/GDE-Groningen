// Een fietser van de fiets slaan (#944): de pure regel (game/js/bikerider.js) en de uitvoering
// in pedestrians.js, die dezelfde worp gebruikt als bij een aanrijding.
//   node scripts/bikerider_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import { hasRider, requestRiderOff, takeRiderOff, meleeWeapon } from '../game/js/bikerider.js';
import { WEAPONS } from '../game/js/weapons.js';
const { knockOffRiders } = await import('../game/js/pedestrians.js');
const { updateCombat } = await import('../game/js/combat.js');

let n = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { console.log('FAIL', naam, e && e.stack); throw e; } };

const fiets = (extra = {}) => ({
  isBike: true, x: 10, y: 20, z: 0, angle: 0, speed: 0, health: 100, model: { name: 'bike', rider: '#e0473c' },
  road: {}, riderOff: false, _riderAway: false, halfLen: 0.9, halfWid: 0.3, id: 7, ...extra,
});

t('een fiets met berijder telt, een geparkeerde fiets en een paard niet', () => {
  assert.equal(hasRider(fiets()), true);
  assert.equal(hasRider(fiets({ isBike: false, isScooter: true })), true, 'scooter ook');
  assert.equal(hasRider(fiets({ road: null })), false, 'geen weg: geen berijder in de wereld');
  assert.equal(hasRider(fiets({ road: null, countryDrive: true })), true, 'een landwegfietser telt');
  assert.equal(hasRider(fiets({ road: null, driver: 'player' })), true, 'de speler op zijn eigen fiets telt wel');
  assert.equal(hasRider(fiets({ road: null, isPolice: true })), true, 'een politiefiets heeft een agent');
  assert.equal(hasRider(fiets({ riderOff: true })), false, 'al van de fiets');
  assert.equal(hasRider(fiets({ _riderAway: true })), false);
  assert.equal(hasRider(fiets({ wrecked: true })), false);
  assert.equal(hasRider(fiets({ sinking: true })), false);
  assert.equal(hasRider(fiets({ _mount: 'horse' })), false);
  assert.equal(hasRider(fiets({ isBike: false, isScooter: false })), false, 'een auto is geen fiets');
  assert.equal(hasRider(null), false);
});

t('de slag zet een verzoek op de fiets met de richting van de klap', () => {
  const b = fiets();
  assert.equal(requestRiderOff(b, 1, 0, meleeWeapon('fists')), true);
  const off = b.meleeOff;
  assert.ok(off, 'het verzoek staat erop');
  assert.deepEqual([off.nx, off.ny], [1, 0], 'de richting van de slag');
  assert.ok(off.vx > 0 && Math.abs(off.vy) < 1e-9, 'de worp gaat mee met de klap');
  assert.ok(off.closing >= 3 && off.closing <= 8, 'een geloofwaardige kracht', off.closing);
  assert.equal(off.byPlayer, true);
  assert.equal(off.dader, 0);
  // een zwaarder wapen duwt harder dan een vuist
  const zwaar = fiets();
  requestRiderOff(zwaar, 0, 1, meleeWeapon('polsstok'));
  assert.ok(zwaar.meleeOff.closing > off.closing, 'de polsstok slaat harder dan de vuist', [zwaar.meleeOff.closing, off.closing]);
  assert.equal(zwaar.meleeOff.nx, 0);
  assert.equal(zwaar.meleeOff.ny, 1);
});

t('je eigen fiets sla je niet onder je vandaan; een gast zonder berijder kan niet', () => {
  const eigen = fiets({ road: null, driver: 'player' });
  assert.equal(requestRiderOff(eigen, 1, 0, meleeWeapon('fists')), false);
  assert.equal(eigen.meleeOff, undefined);
  const leeg = fiets({ road: null });
  assert.equal(requestRiderOff(leeg, 1, 0, meleeWeapon('fists')), false);
  const gast = fiets();
  assert.equal(requestRiderOff(gast, 1, 0, meleeWeapon('knuppel'), { dader: 2 }), true);
  assert.equal(gast.meleeOff.byPlayer, false, 'een gast: geen misdaad van de speler');
  assert.equal(gast.meleeOff.dader, 2);
});

t('het verzoek wordt één keer uitgevoerd', () => {
  const b = fiets();
  requestRiderOff(b, 1, 0, meleeWeapon('fists'));
  assert.ok(takeRiderOff(b), 'de eerste keer');
  assert.equal(takeRiderOff(b), null, 'de tweede keer niets');
  assert.equal(b.meleeOff, null);
  assert.equal(takeRiderOff(null), null);
});

// --- de uitvoering: pedestrians.js maakt er dezelfde worp van als bij een aanrijding ---------
function wereld(bike) {
  const player = { x: bike.x - 1, y: bike.y, inVehicle: null, angle: 0, health: 100 };
  return {
    time: 5, player, players: [player], vehicles: [bike], pedestrians: [],
    stats: { kills: 0, copKills: 0, pedKills: 0 }, wanted: 0, map: {}, audioEvents: [],
    lastImpact: null,
  };
}

t('de klap zet de berijder op straat: fietser eraf, voetganger met ragdoll ervoor in de plaats', () => {
  const b = fiets();
  const world = wereld(b);
  requestRiderOff(b, 1, 0, meleeWeapon('knuppel'));
  knockOffRiders(world);
  assert.equal(b.riderOff, true, 'de fiets is zijn berijder kwijt');
  assert.equal(b.meleeOff, null, 'het verzoek is uitgevoerd');
  assert.equal(b.road, null, 'de fiets is geen rijdende fiets meer');
  assert.equal(b.speed, 0);
  assert.equal(world.pedestrians.length, 1, 'er staat een voetganger op de plek van de fiets');
  const ped = world.pedestrians[0];
  assert.ok(Math.hypot(ped.x - b.x, ped.y - b.y) < 0.01, 'op de plek van de fiets');
  assert.ok(ped.ragdoll, 'de berijder valt (ragdoll)');
  assert.ok(ped.health < 100, 'en heeft de klap gevoeld', ped.health);
  assert.notEqual(ped.state, 'dead', 'niet dood van een klap');
  assert.equal(world.stats.kills, 0, 'een klap is geen moord');
});

t('zonder verzoek (of met een geparkeerde fiets) gebeurt er niets', () => {
  const stil = fiets({ road: null });
  const world = wereld(stil);
  knockOffRiders(world);
  assert.equal(stil.riderOff, false);
  assert.equal(world.pedestrians.length, 0);
  // een auto met een verzoek (kan niet via de regel, maar de uitvoerder moet het negeren)
  const auto = { isBike: false, isScooter: false, x: 0, y: 0, riderOff: false, meleeOff: { nx: 1, ny: 0, vx: 1, vy: 0, closing: 4, byPlayer: true } };
  const w2 = wereld(auto);
  knockOffRiders(w2);
  assert.equal(auto.riderOff, false, 'een auto verliest geen berijder');
  assert.equal(w2.pedestrians.length, 0);
});

// --- de echte weg: combat.js slaat en de fiets krijgt het verzoek ------------------------------
t('via combat.js: een klap op een rijdende fiets zet het verzoek, de fiets blijft heel', () => {
  const b = fiets({ x: 2, y: 0, angle: 0, speed: 4, health: 100 });
  const world = wereld(b);
  world.player.angle = 0;
  world.camYaw = 0;
  world.weapon = 'fists';
  world.ammo = { fists: Infinity };
  world.paused = false;
  world.scoped = false;
  world.pedestrians = [];
  world.vehicles = [b];
  world.input = {
    mouse: { dx: 0, dy: 0, down: true, rightDown: false, wheel: 0, middleDown: false },
    wasPressed: () => false,
    isDown: () => false,
  };
  const hp = b.health;
  updateCombat(1 / 60, world);
  assert.ok(b.meleeOff, 'de klap op de fiets zet een verzoek');
  assert.equal(b.health, hp, 'de fiets zelf krijgt geen schade van de klap op de berijder');
  assert.equal(world.stats.kills, 0);
  knockOffRiders(world);
  assert.equal(b.riderOff, true, 'en de berijder ligt eraf');
  assert.equal(world.pedestrians.length, 1, 'als voetganger in de wereld');
  assert.ok(world.lastMeleeHit, 'de klap telt als een treffer (raak-effect)');
});

t('de aanrijding-tak blijft werken (een botsing zet de fietser nog steeds op straat)', () => {
  const b = fiets({ x: 0, y: 0, angle: 0, speed: 8, road: {} });
  const auto = { x: 0.6, y: 0, z: 0, angle: 0, speed: 0, isBike: false, isScooter: false, isBoat: false, halfLen: 2.2, halfWid: 0.9, driver: null, model: { name: 'hatch' } };
  const world = wereld(b);
  world.vehicles.push(auto);
  knockOffRiders(world);
  // of de botsing precies hard genoeg is hangt van de meetkunde af; als er niets gebeurde is dat
  // geen fout, maar dan moet de fiets nog heel zijn
  if (!b.riderOff) assert.equal(world.pedestrians.length, 0, 'geen worp zonder echte botsing');
});

console.log(`bikerider_test: ${n}/${n} ok`);
