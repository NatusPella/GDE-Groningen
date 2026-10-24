// Samen spelen (#447): de passieve stand en spelers tegen elkaar. Pure regels (cooppvp.js), de treffers in de wereld van de host
// (cooppvpwereld.js, combat.js), neergaan zonder kosten, de berichten (coopnet.js) en de spelerslijst. Pure Node, geen netwerk.
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as P from '../game/js/cooppvp.js';
import * as PW from '../game/js/cooppvpwereld.js';
import * as N from '../game/js/coopnet.js';
import { spelersRijen, rijTekst } from '../game/js/coopspelers.js';
import { WEAPONS } from '../game/js/weapons.js';
const { gastAanvalUitvoeren, updateBullets } = await import('../game/js/combat.js');
const { CODEC_VERSION } = await import('../game/js/net/codec.js');
const { PROTO } = await import('../game/js/net/protocol.js');

let n = 0;
const t = (name, f) => { f(); n++; };

t('iedereen begint op passief: zoals nu, geen schade tussen spelers', () => {
  const st = P.maakPvp();
  for (const s of [0, 1, 2, 7]) assert.equal(P.isPassief(st, s), true);
  assert.equal(P.pvpInSpel(st), false);
  assert.equal(P.pvpMag(st, 0, 1, 10).ok, false);
  assert.equal(P.grijsBijPassief(st, 1), false, 'zonder PvP in het spel is niemand grijs');
});

t('schade alleen als beiden actief zijn, nooit aan jezelf, en nooit aan een beschermde', () => {
  const st = P.maakPvp();
  P.zetPassiefStand(st, 0, false);
  assert.equal(P.pvpMag(st, 0, 1, 10).reden, 'doel-passief');
  assert.equal(P.pvpMag(st, 1, 0, 10).reden, 'dader-passief');
  P.zetPassiefStand(st, 1, false);
  assert.equal(P.pvpMag(st, 0, 1, 10).ok, true); assert.equal(P.pvpMag(st, 1, 0, 10).ok, true);
  assert.equal(P.pvpMag(st, 0, 0, 10).reden, 'zelf');
  assert.equal(P.pvpMag(st, 0, 2, 10).ok, false, 'een derde speler die passief is blijft veilig');
  assert.equal(P.pvpMag(st, 0, 99, 10).ok, false, 'onbekende plek');
  P.geefBescherming(st, 1, 10);
  assert.equal(P.pvpSchade(st, 0, 1, 20, 12).reden, 'beschermd');
  assert.equal(P.pvpSchade(st, 0, 1, 20, 10 + P.PVP.BESCHERM_S + 0.1).ok, true, 'na de beschermingstijd weer te raken');
  assert.equal(P.pvpSchade(st, 0, 1, 0, 30).ok, false, 'schade nul telt niet');
  assert.equal(P.pvpSchade(st, 0, 1, 9999, 30).bedrag, P.PVP.MAX_SCHADE);
  // wie beschermd is en zelf aanvalt, is het niet meer
  P.geefBescherming(st, 0, 40); assert.equal(P.beschermd(st, 0, 41), true);
  P.pvpSchade(st, 0, 1, 5, 41); assert.equal(P.beschermd(st, 0, 41), false);
});

t('omschakelen heeft een afkoelperiode en dubbel vragen kost niets', () => {
  const st = P.maakPvp();
  let r = P.wisselPassief(st, 1, false, 100); assert.deepEqual([r.ok, r.passief], [true, false]);
  r = P.wisselPassief(st, 1, true, 103); assert.equal(r.ok, false); assert.ok(Math.abs(r.rest - (P.PVP.AFKOEL_S - 3)) < 1e-9); assert.equal(P.isPassief(st, 1), false, 'nog actief');
  r = P.wisselPassief(st, 1, false, 103); assert.equal(r.ok, true); assert.equal(r.zelfde, true, 'al actief: geen wachttijd, geen nieuwe afkoeling');
  assert.equal(P.wisselPassief(st, 1, true, 100 + P.PVP.AFKOEL_S).ok, true); assert.equal(P.isPassief(st, 1), true);
  assert.equal(P.wisselPassief(st, 1, false, 100 + P.PVP.AFKOEL_S + 1).ok, false, 'weer wachten na het terugschakelen');
  assert.equal(P.wisselPassief(st, 1, false, NaN).ok, false);
  assert.equal(P.wisselPassief(st, -1, false, 5).ok, false);
  P.verwijderSpeler(st, 1); assert.equal(P.isPassief(st, 1), true); assert.equal(P.afkoelRest(st, 1, 0), 0);
});

t('een passieve speler hoort één keer per paar seconden dat iemand hem wilde raken', () => {
  const st = P.maakPvp();
  assert.equal(P.pogingMelden(st, 0, 1, 10), true);
  assert.equal(P.pogingMelden(st, 0, 1, 10 + P.PVP.POGING_S - 1), false, 'een salvo is één melding');
  assert.equal(P.pogingMelden(st, 0, 1, 10 + P.PVP.POGING_S), true, 'na de wachttijd weer');
  assert.equal(P.pogingMelden(st, 1, 0, 12), true, 'de andere kant op telt apart');
  assert.equal(P.pogingMelden(st, 1, 1, 12), false, 'jezelf');
  assert.equal(P.pogingMelden(st, 1, 40, 12), false, 'onbekende plek');
  assert.equal(P.pogingMelden(st, 1, 2, NaN), false);
  assert.equal(P.pogingMelden(null, 1, 2, 12), false);
  P.verwijderSpeler(st, 1);
  assert.equal(P.pogingMelden(st, 0, 1, 100), true, 'na weggaan begint het schoon');
});

t('berichten: klein, gecontroleerd, en geen nieuw formaat (PROTO en CODEC_VERSION blijven 2)', () => {
  assert.deepEqual(P.leesPassief(P.passiefEvent(false)), { passief: false });
  assert.equal(P.leesPassief({ k: 'passief', a: 'ja' }), null); assert.equal(P.leesPassief({ k: 'x', a: true }), null); assert.equal(P.leesPassief(null), null);
  assert.deepEqual(P.leesPassiefVan(P.passiefVanEvent(3, true)), { slot: 3, passief: true });
  assert.equal(P.leesPassiefVan({ k: 'passiefvan', slot: 99, a: true }), null); assert.equal(P.leesPassiefVan({ k: 'passiefvan', slot: 1.5, a: true }), null);
  assert.deepEqual(P.leesPvpSchade(P.pvpSchadeEvent(12.4, 2)), { n: 12, door: 2 });
  assert.equal(P.leesPvpSchade({ k: 'schade', n: 7 }), null, 'schade van de politie heeft geen dader');
  assert.equal(P.leesPvpSchade(P.pvpSchadeEvent(5000, 1)).n, P.PVP.MAX_SCHADE);
  assert.equal(P.leesPvpSchade({ k: 'schade', n: NaN, door: 1 }), null);
  assert.deepEqual(P.leesPvpDood(P.pvpDoodEvent(2)), { door: 2 }); assert.equal(P.leesPvpDood({ k: 'pvpdood', door: -1 }), null);
  assert.ok(JSON.stringify(P.passiefVanEvent(15, false)).length < 40);
  assert.equal(CODEC_VERSION, 2); assert.equal(PROTO, 2);
  assert.ok(N.CAPS.includes('pvp'), 'een host zonder de mogelijkheid krijgt geen knop in het scherm van de gast');
});

// ---------------------------------------------------------------- de wereld van de host
const roster = [{ slot: 0, naam: 'Tammo' }, { slot: 1, naam: 'Tessa' }, { slot: 2, naam: 'Roos' }];
const hostWereld = (extra = {}) => {
  const w = {
    time: 10, coopRole: 'host', coopPvp: P.maakPvp(), coopRoster: roster, money: 500, health: 100, armor: 0,
    coop: { remote: true, remoteInput: null }, companion: { x: 60, y: 60, angle: 0, gz: 0, radius: 0.4 },
    coopFigures: { 2: { slot: 2, x: 10, y: 10, angle: 0, gz: 0, radius: 0.4, input: null, char: 'a' } },
    player: { x: 12, y: 10, angle: 0, gz: 0, radius: 0.4 }, pedestrians: [], vehicles: [], bullets: [], particles: [], stats: { kills: 0, copKills: 0, pedKills: 0 }, wanted: 0,
    map: { buildingsNear: () => [], wallsNear: () => [] }, messages: [], addMessage(m) { this.messages.push(m); }, ...extra,
  };
  w.gast = []; w.melds = [];
  w.coopPvpSchade = (slot, d, door) => w.gast.push([slot, d, door]);
  w.coopPvpMeld = (tekst, behalve) => w.melds.push([tekst, behalve]);
  return w;
};
const schiet = (w, dader, x = 10, vx = 40) => { w.bullets.length = 0; w.bullets.push({ x, y: 10, vx, vy: 0, damage: 15, owner: 'player', range: 30, traveled: 0, ...(dader ? { dader } : {}) }); for (let i = 0; i < 12 && w.bullets.length; i++) updateBullets(0.016, w); };

t('een kogel van een gast gaat dwars door een passieve host; als beiden actief zijn raakt hij', () => {
  const w = hostWereld();
  schiet(w, 2); assert.equal(w.health, 100); assert.equal(w.bullets.length, 1, 'de kogel vliegt door');
  P.zetPassiefStand(w.coopPvp, 2, false);
  schiet(w, 2); assert.equal(w.health, 100, 'de host staat nog op passief');
  assert.equal(w.messages.length, 1); assert.ok(w.messages[0].includes('Roos') && w.messages[0].includes('passief'), 'de host hoort dat iemand het probeerde (#447)');
  w.messages.length = 0;
  P.zetPassiefStand(w.coopPvp, 0, false);
  schiet(w, 2); assert.equal(w.health, 85); assert.deepEqual(w.messages, [], 'geen melding bij een gewone treffer');
  w.armor = 10; schiet(w, 2); assert.equal(w.armor, 0); assert.equal(w.health, 80, 'het pantser vangt het eerst op');
});

t('de melding bij een aanval: één keer, alleen bij een passief doel, en naar de gast die het doel is', () => {
  const w = hostWereld();
  P.zetPassiefStand(w.coopPvp, 2, false); // Roos actief, Tammo passief
  schiet(w, 2); assert.equal(w.messages.length, 1); assert.ok(w.messages[0].startsWith('Roos'));
  schiet(w, 2); assert.equal(w.messages.length, 1, 'niet bij elke kogel');
  w.time += P.PVP.POGING_S + 1; schiet(w, 2); assert.equal(w.messages.length, 2, 'na de wachttijd weer');
  w.messages.length = 0; P.zetPassiefStand(w.coopPvp, 0, false); schiet(w, 2); assert.equal(w.messages.length, 0, 'een actieve speler hoort niets');
  // een gast als doel krijgt de melding van de host
  const h = hostWereld(); h.coopMeld = (slot, tekst) => h.melds.push([tekst, slot]);
  P.zetPassiefStand(h.coopPvp, 0, false); h.player.x = 8;
  schiet(h, 0, 8.4); assert.equal(h.melds.length, 1); assert.deepEqual(h.melds[0][1], 2); assert.ok(h.melds[0][0].includes('Tammo') && h.melds[0][0].includes('passief'));
  // twee passieve spelers proberen niets
  const p = hostWereld(); p.player.x = 8; schiet(p, 0, 8.4); assert.deepEqual(p.messages, []);
});

t('een kogel van de host raakt een actieve gast (het bericht gaat naar die gast), een passieve niet, en nooit de schutter zelf', () => {
  const w = hostWereld(); const hostOp = { ...w.player };
  w.player.x = 8; w.player.y = 10;
  schiet(w, 0, 8.4); assert.deepEqual(w.gast, []);
  P.zetPassiefStand(w.coopPvp, 0, false); P.zetPassiefStand(w.coopPvp, 2, false);
  schiet(w, 0, 8.4); assert.deepEqual(w.gast, [[2, 15, 0]]);
  w.gast.length = 0; w.coopFigures[2].inVeh = {}; schiet(w, 0, 8.4); assert.deepEqual(w.gast, [], 'wie in een voertuig zit is geen persoon om te raken');
  w.coopFigures[2].inVeh = null; w.coopFigures[2].state = 'dead'; schiet(w, 0, 8.4); assert.deepEqual(w.gast, []);
  assert.ok(hostOp);
});

t('twee gasten tegen elkaar: de plek van de dader telt en de schutter raakt zichzelf niet', () => {
  const w = hostWereld(); w.player.x = -50; w.player.y = -50;
  w.coop.remote = true; w.companion.x = 14; w.companion.y = 10; // plek 1 staat op de baan
  P.zetPassiefStand(w.coopPvp, 1, false); P.zetPassiefStand(w.coopPvp, 2, false);
  schiet(w, 2, 10.5); assert.deepEqual(w.gast, [[1, 15, 2]]);
  w.gast.length = 0; schiet(w, 1, 13.5, -40); assert.deepEqual(w.gast, [[2, 15, 1]], 'ook de andere kant op');
});

t('een slag raakt een medespeler alleen als beiden actief zijn', () => {
  const w = hostWereld(); w.player.x = 10.8;
  const l = w.coopFigures[2];
  gastAanvalUitvoeren(w, 2, l, 'fists', 0); assert.equal(w.health, 100, 'passief: geen schade');
  P.zetPassiefStand(w.coopPvp, 0, false); P.zetPassiefStand(w.coopPvp, 2, false);
  gastAanvalUitvoeren(w, 2, l, 'fists', 0); assert.equal(w.health, 100 - WEAPONS.fists.damage);
  gastAanvalUitvoeren(w, 2, l, 'fists', Math.PI); assert.equal(w.health, 100 - WEAPONS.fists.damage, 'een klap de andere kant op mist');
  assert.equal(PW.pvpSlag(w, 0, () => false, 10), false, 'buiten bereik'); assert.equal(PW.pvpSlag(w, 0, () => true, 10), true, 'de host slaat de actieve gast'); assert.deepEqual(w.gast, [[2, 10, 0]], 'en nooit zichzelf');
});

t('de host gaat neer door een medespeler: zonder kosten weer op, even beschermd, geen respawn-reis', () => {
  const w = hostWereld({ pendingRespawn: null });
  P.zetPassiefStand(w.coopPvp, 0, false); P.zetPassiefStand(w.coopPvp, 2, false);
  w.health = 10; schiet(w, 2);
  assert.equal(w.health, 100); assert.equal(w.money, 500, 'geen geld kwijt'); assert.equal(w.pendingRespawn, null, 'geen respawn-reis, dus geen mislukte opdracht');
  assert.ok(w.messages.some((m) => m.includes('Roos') && m.includes('zonder kosten')));
  assert.equal(w.melds.length, 1); assert.deepEqual(w.melds[0][1], 0); assert.ok(w.melds[0][0].includes('Roos'));
  assert.equal(P.beschermd(w.coopPvp, 0, w.time + 1), true);
  schiet(w, 2); assert.equal(w.health, 100, 'beschermd tegen spawnkillen');
  w.time += P.PVP.BESCHERM_S + 1; schiet(w, 2); assert.equal(w.health, 85);
  // dood door de wereld blijft zoals het was: dat loopt niet langs dit pad
  w.coopPvp.actief = {}; w.health = 10; schiet(w, 2); assert.equal(w.health, 10);
});

t('de gast gaat neer: zijn eigen gezondheid is vol zonder kosten, de host hoort het en geeft hem bescherming', () => {
  const verstuurd = [];
  const g = { time: 5, coopRole: 'client', coopPvp: P.maakPvp(), coopRoster: roster, health: 20, armor: 0, money: 90, messages: [], addMessage(m) { this.messages.push(m); }, coopNet: { role: 'client', session: { slot: 2, sendEvent: (e) => verstuurd.push(e) } } };
  assert.equal(PW.pvpGastRaak(g, P.pvpSchadeEvent(15, 0), 2), true); assert.equal(g.health, 20, 'zelf nog passief: de host rekent dit niet, een verdwaald bericht doet niets');
  P.zetPassiefStand(g.coopPvp, 2, false);
  PW.pvpGastRaak(g, P.pvpSchadeEvent(15, 0), 2); assert.equal(g.health, 5);
  PW.pvpGastRaak(g, P.pvpSchadeEvent(15, 0), 2); assert.equal(g.health, 100); assert.equal(g.money, 90);
  assert.deepEqual(verstuurd, [{ k: 'pvpdood', door: 0 }]); assert.ok(g.messages.at(-1).includes('Tammo'));
  PW.pvpGastRaak(g, P.pvpSchadeEvent(50, 0), 2); assert.equal(g.health, 100, 'beschermd');
  assert.equal(PW.pvpGastRaak(g, { k: 'schade', n: 5 }, 2), false, 'politie-schade loopt het oude pad');
  // de host
  const h = hostWereld(); P.zetPassiefStand(h.coopPvp, 2, false);
  assert.equal(PW.pvpDoodVerwerk(h, { k: 'pvpdood', door: 0 }, 2), true); assert.equal(P.beschermd(h.coopPvp, 2, h.time + 1), true);
  assert.deepEqual(h.melds[0][1], 2); assert.ok(h.melds[0][0].includes('Tammo') && h.melds[0][0].includes('Roos'));
  assert.equal(PW.pvpDoodVerwerk(h, { k: 'pvpdood', door: 0 }, 0), false, 'van plek 0 komt dit nooit');
});

// ---------------------------------------------------------------- de berichten in coopnet.js
const nepHub = (spelers) => { const uit = []; return { uit, roster: { spelers }, announce: (b, slot) => { uit.push([slot, b]); return true; } }; };
t('handleEvent (host): een gast vraagt omschakelen, de host beslist en meldt de echte stand aan iedereen', () => {
  const hub = nepHub([{ slot: 0 }, { slot: 1, verbinding: 'ok' }, { slot: 2, verbinding: 'ok' }]);
  const melding = [];
  const w = { time: 100, coopRole: 'host', coopPvp: P.maakPvp(), coopNet: { role: 'host', hub }, coopMeld: (s, tekst) => melding.push([s, tekst]) };
  assert.equal(N.handleEvent(w, P.passiefEvent(false), 2), true);
  assert.equal(P.isPassief(w.coopPvp, 2), false);
  assert.deepEqual(hub.uit.map(([s, b]) => [s, b.k, b.slot, b.a]), [[1, 'passiefvan', 2, false], [2, 'passiefvan', 2, false]]);
  assert.equal(melding.length, 1, 'de gast hoort wat er gebeurd is');
  hub.uit.length = 0; melding.length = 0; w.time += 3;
  assert.equal(N.handleEvent(w, P.passiefEvent(true), 2), false, 'te snel terug');
  assert.ok(melding[0][1].startsWith('Even wachten')); assert.equal(P.isPassief(w.coopPvp, 2), false);
  assert.equal(hub.uit.every(([, b]) => b.a === false), true, 'de gast hoort de echte stand, ook bij een weigering');
  assert.equal(N.handleEvent(w, P.passiefEvent(true), 0), false, 'de host zelf stuurt dit niet als bericht');
  assert.equal(N.handleEvent(w, { k: 'passief', a: 'ja' }, 2), false);
  w.time += 10; assert.equal(N.handleEvent(w, P.passiefEvent(true), 2), true); assert.equal(P.isPassief(w.coopPvp, 2), true);
});

t('handleEvent (gast): de stand van de host komt binnen, een gast die niets gevraagd heeft blijft passief', () => {
  const w = { time: 1, coopRole: 'client', coopPvp: P.maakPvp(), coopNet: { role: 'client', session: { slot: 1, caps: ['pvp'] } } };
  assert.equal(N.handleEvent(w, P.passiefVanEvent(0, false), 0), true); assert.equal(P.isPassief(w.coopPvp, 0), false);
  assert.equal(N.handleEvent(w, P.passiefVanEvent(0, true), 0), true); assert.equal(P.isPassief(w.coopPvp, 0), true);
  assert.equal(N.handleEvent(w, { k: 'passiefvan', slot: 40, a: false }, 0), false);
  assert.equal(P.isPassief(w.coopPvp, 1), true);
  assert.equal(N.handleEvent({ coopPvp: P.maakPvp(), coopNet: { role: 'host', hub: nepHub([]) } }, P.passiefVanEvent(2, false), 0), false, 'een host luistert niet naar passiefvan');
});

t('zetPassiefGebaar: de host schakelt direct met afkoeling, de gast vraagt het alleen als de host het kent', () => {
  const hub = nepHub([{ slot: 0 }, { slot: 1, verbinding: 'ok' }]);
  const h = { time: 50, coopRole: 'host', coopPvp: P.maakPvp(), coopNet: { role: 'host', hub }, messages: [], addMessage(m) { this.messages.push(m); } };
  assert.equal(N.passiefStandVan(h), true); assert.equal(N.kanPassiefKiezen(h), true);
  assert.equal(N.zetPassiefGebaar(h, false).ok, true); assert.equal(N.passiefStandVan(h), false);
  assert.equal(hub.uit.length, 1); assert.deepEqual(hub.uit[0][1], { k: 'passiefvan', slot: 0, a: false });
  assert.equal(N.zetPassiefGebaar(h, true).ok, false); assert.ok(h.messages.at(-1).startsWith('Even wachten'));
  const stuur = [];
  const g = { time: 1, coopRole: 'client', coopPvp: P.maakPvp(), coopNet: { role: 'client', session: { slot: 2, caps: ['pvp'], sendEvent: (e) => stuur.push(e) } }, messages: [], addMessage(m) { this.messages.push(m); } };
  assert.equal(N.zetPassiefGebaar(g, false).gevraagd, true); assert.deepEqual(stuur, [{ k: 'passief', a: false }]);
  assert.equal(N.passiefStandVan(g), true, 'de stand verandert pas als de host antwoordt');
  const oud = { time: 1, coopRole: 'client', coopPvp: P.maakPvp(), coopNet: { role: 'client', session: { slot: 2, caps: [], sendEvent: (e) => stuur.push(e) } }, messages: [], addMessage(m) { this.messages.push(m); } };
  stuur.length = 0; assert.equal(N.kanPassiefKiezen(oud), false); assert.equal(N.zetPassiefGebaar(oud, false).ok, false); assert.deepEqual(stuur, [], 'een oudere host krijgt het bericht niet');
  assert.ok(oud.messages.at(-1).includes('kent de passieve stand nog niet'));
  assert.equal(N.kanPassiefKiezen({}), false);
});

t('de spelerslijst: pas als iemand actief is, zie je wie passief is (en de kaart wordt grijs)', () => {
  const rooster = [{ slot: 0, naam: 'Tammo' }, { slot: 1, naam: 'Tessa' }];
  const st = P.maakPvp();
  let rijen = spelersRijen({ mijnSlot: 0, roster: rooster, pvp: st });
  assert.ok(rijen.every((r) => r.passief === true && r.pvpInSpel === false)); assert.ok(!rijTekst(rijen[0]).includes('passief'));
  P.zetPassiefStand(st, 1, false);
  rijen = spelersRijen({ mijnSlot: 0, roster: rooster, pvp: st });
  assert.equal(rijTekst(rijen.find((r) => r.slot === 0)).endsWith('passief'), true); assert.equal(rijTekst(rijen.find((r) => r.slot === 1)).endsWith('actief'), true);
  assert.equal(P.grijsBijPassief(st, 0), true); assert.equal(P.grijsBijPassief(st, 1), false);
  assert.ok(spelersRijen({ mijnSlot: 0, roster: rooster }).length === 2, 'zonder pvp-gegevens werkt de lijst zoals eerder');
});

console.log(`cooppvp_test: ${n}/${n} ok`);
