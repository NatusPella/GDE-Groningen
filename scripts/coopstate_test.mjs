// Coöp fase 1 (#95): spelerstoestand (game/js/coopstate.js).
import assert from 'node:assert/strict';
import * as C from '../game/js/coopstate.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('twee spelers, Tammo en Tessa, gedeelde kas', () => {
  const s = C.createCoopState({ money: 100 });
  assert.deepEqual(s.players.map((p) => p.char), ['tammo', 'tessa']);
  C.earn(s, 50.7); assert.equal(s.shared.money, 150);
  assert.equal(C.spend(s, 500), false); assert.equal(C.spend(s, 50), true); assert.equal(s.shared.money, 100);
});
t('beroving kost een deel van de gedeelde kas', () => {
  const s = C.createCoopState({ money: 1000 });
  assert.equal(C.robbery(s), 200); assert.equal(s.shared.money, 800);
});
t('wanted gedeeld, begrensd, wist voor beiden', () => {
  const s = C.createCoopState();
  C.raiseWanted(s, 3); C.raiseWanted(s, 1); assert.equal(s.shared.wanted, 3);
  C.raiseWanted(s, 99); assert.equal(s.shared.wanted, C.MAX_WANTED);
  C.clearWanted(s); assert.equal(C.hudPanels(s)[1].wanted, 0);
});
t('pantser vangt eerst, gezondheid per speler', () => {
  const s = C.createCoopState(); s.players[0].armor = 30;
  assert.equal(C.damage(s, 0, 50).died, false);
  assert.equal(s.players[0].armor, 0); assert.equal(s.players[0].health, 80);
  assert.equal(s.players[1].health, 100);
});
t('dood: ander speelt door, respawn na vertraging naast de levende', () => {
  const s = C.createCoopState(); s.players[1].pos = { x: 10, y: 4 };
  const r = C.damage(s, 0, 500);
  assert.equal(r.died, true); assert.equal(r.teamDown, false);
  assert.deepEqual(C.respawnPoint(s, 0), { x: 11.5, y: 4 });
  assert.deepEqual(C.tickRespawn(s, 3), []);
  assert.deepEqual(C.tickRespawn(s, 3.1), [0]);
  assert.equal(s.players[0].health, C.MAX_HEALTH);
});
t('beiden dood: teamDown, geen respawn, reviveAll herstelt', () => {
  const s = C.createCoopState();
  C.damage(s, 0, 500); const r = C.damage(s, 1, 500);
  assert.equal(r.teamDown, true); assert.deepEqual(C.tickRespawn(s, 100), []);
  assert.equal(C.respawnPoint(s, 0), null);
  C.reviveAll(s); assert.ok(s.players.every((p) => p.alive)); assert.equal(s.teamDown, false);
});
t('voertuig delen: bestuurder, bijrijder, stuur overnemen', () => {
  const s = C.createCoopState(), v = {};
  assert.equal(C.enterVehicle(s, v, 0, 'a'), 'driver');
  assert.equal(C.enterVehicle(s, v, 1, 'a'), 'passenger');
  C.exitVehicle(s, v, 0);
  assert.equal(v.a.driver, null);
  assert.equal(C.takeWheel(s, v, 1), true); assert.equal(s.players[1].seat, 'driver');
  assert.equal(C.enterVehicle(s, v, 0, 'a'), 'passenger');
  assert.equal(C.enterVehicle(s, v, 0, 'b'), null, 'al ingestapt');
});
t('dode speler stapt niet in en valt uit het voertuig', () => {
  const s = C.createCoopState(), v = {};
  C.enterVehicle(s, v, 0, 'a'); C.damage(s, 0, 999);
  assert.equal(s.players[0].vehicle, null);
  assert.equal(C.enterVehicle(s, v, 0, 'a'), null);
});
t('minigames: padel voor twee, rest één speelt en één kijkt', () => {
  assert.deepEqual(C.minigameRoles('padel', 1), { players: [0, 1], spectators: [] });
  assert.deepEqual(C.minigameRoles('kermis', 1), { players: [1], spectators: [0] });
  assert.deepEqual(C.minigameRoles('padel', 0, 1), { players: [0], spectators: [] });
});
t('HUD: links Tammo, rechts Tessa, herstelteller', () => {
  const s = C.createCoopState({ money: 5 }); C.damage(s, 1, 999);
  const h = C.hudPanels(s);
  assert.equal(h[0].side, 'left'); assert.equal(h[1].side, 'right');
  assert.equal(h[1].down, true); assert.equal(h[1].respawnIn, 6); assert.equal(h[0].money, 5);
});
t('pauze: beide mogen, hervatten door pauzeerder of beide stemmen', () => {
  const s = C.createCoopState();
  C.pause(s, 1); assert.equal(C.isPaused(s), true);
  assert.equal(C.resume(s, 0), false); assert.equal(C.isPaused(s), true);
  assert.equal(C.resume(s, 1), true); assert.equal(C.isPaused(s), false);
  C.pause(s, 0); assert.equal(C.resume(s, 0), true);
});
console.log(`coopstate_test: ${n}/${n} ok`);
