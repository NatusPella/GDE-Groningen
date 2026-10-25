// Samen spelen (#447): de passieve stand en spelers tegen elkaar. Pure regels (cooppvp.js), de treffers in de wereld van de host
// (cooppvpwereld.js, combat.js), neergaan zonder kosten, de berichten (coopnet.js) en de spelerslijst. Pure Node, geen netwerk.
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as P from '../game/js/cooppvp.js';
import * as PW from '../game/js/cooppvpwereld.js';
import * as AR from '../game/js/pvparena.js';
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

// ---------------------------------------------------------------- de PvP-minigame (#454)
// Dezelfde hub als hierboven: de arena gebruikt de gewone wedstrijdberichten ('wed' f 'uit' en 'wedgast') voor de J/N-uitnodiging.
const hubVoor = (slots) => nepHub(slots.map((s) => ({ slot: s, naam: s === 0 ? 'Tammo' : s === 2 ? 'Roos' : 'Bram', verbinding: 'ok' })));
const inVeld = (l, dx = 0, dy = 0) => { l.x = PW.PVP_ARENA_PLEK.x + dx; l.y = PW.PVP_ARENA_PLEK.y + dy; };

t('de PvP-arena: de host nodigt uit (J/N), wie ja zegt en in het veld staat speelt mee', () => {
  const hub = hubVoor([0, 2, 3]), geheim = [];
  const fig = (slot, dx) => ({ slot, x: PW.PVP_ARENA_PLEK.x + dx, y: PW.PVP_ARENA_PLEK.y, angle: 0, gz: 0, radius: 0.4 });
  const w = hostWereld({ coopNet: { role: 'host', hub }, coopMeld: (slot, tekst) => geheim.push([tekst, slot]), coopFigures: { 2: fig(2, 3), 3: fig(3, -3) } });
  inVeld(w.player);
  w.companion.x = 900; w.companion.y = 900; // plek 1 staat ver weg: doet niet mee
  // de arena-regel zelf: alleen buiten de passieve stand (#454)
  assert.equal(P.arenaToegestaan(w.coopPvp, 0), false);
  assert.equal(P.arenaToegestaan(null, 0), false); assert.equal(P.arenaToegestaan(w.coopPvp, 99), false);
  assert.equal(PW.pvpArenaStart(w), false, 'de host staat zelf nog op passief');
  assert.ok(w.messages.at(-1).includes('passieve stand'));
  P.zetPassiefStand(w.coopPvp, 0, false); P.zetPassiefStand(w.coopPvp, 2, false); P.zetPassiefStand(w.coopPvp, 3, false);
  assert.equal(P.arenaToegestaan(w.coopPvp, 0), true);
  // de uitnodiging: nog geen ronde, elke verbonden gast krijgt het gewone bericht van een wedstrijd
  assert.equal(PW.pvpArenaStart(w), true, 'de host vraagt wie meedoet');
  assert.equal(w.pvpArena, undefined, 'de ronde begint pas als de uitnodiging klaar is');
  const uit = hub.uit.filter(([, b]) => b.k === 'wed' && b.f === 'uit');
  assert.deepEqual(uit.map(([slot]) => slot), [2, 3]);
  assert.equal(uit[0][1].id, 'pvparena'); assert.equal(uit[0][1].label, AR.ARENA_TEKST.label);
  assert.equal(w.pvpArenaUitn.keuze[0], 'ja', 'E bij het veld is zelf meedoen');
  assert.equal(w.pvpArenaUitn.keuze[2], 'wacht');
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'ja' }, 2), true, 'de gast antwoordt met het gewone bericht');
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'ja' }, 3), true);
  assert.equal(w.pvpArenaUitn.keuze[2], 'ja');
  // de uitnodiging telt af en de ronde begint; de gasten horen hun eigen team in de gewone melding
  PW.pvpArenaTik(w, AR.ARENA.uitnS + 0.1);
  assert.equal(w.pvpArena && w.pvpArena.fase, 'bezig');
  assert.deepEqual(w.pvpArena.deeln.map((d) => [d.slot, d.team]), [[0, 0], [2, 1], [3, 0]]);
  assert.ok(w.messages.some((m) => m.includes('jij speelt in team Noord')));
  assert.ok(geheim.some(([t, slot]) => slot === 2 && t.includes('team Zuid')));
  assert.ok(geheim.some(([t, slot]) => slot === 3 && t.includes('team Noord')));
  assert.equal(PW.pvpArenaStart(w), false, 'geen tweede ronde midden in een ronde');
  assert.ok(w.messages.at(-1).includes('loopt al'));
  // een treffer van de gast op de host telt in de arena
  assert.equal(PW.pvpTreffer(w, 2, 0, 15), true);
  assert.equal(w.pvpArena.deeln.find((d) => d.slot === 2).punten, 1);
  // de gast schakelt de host uit: 5 punten erbij, geen geld kwijt, en de host staat bij zijn eigen team
  w.health = 10;
  assert.equal(PW.pvpTreffer(w, 2, 0, 15), true);
  assert.equal(w.health, 100); assert.equal(w.money, 500, 'dood door een medespeler kost niets');
  assert.equal(w.pvpArena.deeln.find((d) => d.slot === 2).punten, 1 + 5);
  assert.equal(w.pvpArena.deeln.find((d) => d.slot === 0).neer, 1);
  const thuis = w.pvpArena.spawns[0];
  assert.ok(thuis.some((s) => Math.hypot(w.player.x - s.x, w.player.y - s.y) < 1e-6), 'op de opstelplaats van team 0');
  assert.ok(w.messages.some((m) => m.includes('schakelde') && m.includes('Roos')));
  assert.ok(w.melds.some(([t]) => t.includes('schakelde')), 'de andere gasten horen het');
  // de zones: met de host in het midden loopt de teamstand op, en de gast hoort de wisseling
  const midden = w.pvpArena.zones.find((z) => z.id === 'midden');
  inVeld(w.player); w.player.x = midden.x; w.player.y = midden.y; w.coopFigures[2].x = 900; w.coopFigures[2].y = 900;
  w.time = 30; PW.pvpArenaTik(w, 1); PW.pvpArenaTik(w, 1);
  assert.deepEqual(w.pvpArena.score, [1, 0], 'na twee seconden een zonepunt');
  assert.equal(w.pvpArena.zones.find((z) => z.id === 'midden').eigenaar, 0);
  assert.ok(w.melds.some(([t]) => t.startsWith('Midden is van Noord')), 'de gasten zien dezelfde wisseling');
  // de beloning per team, één keer, via de coopdeel-laag (#448): gelijk per team, de winnaar een kleine bonus
  const betaald = [];
  w.coopDeel = (bedrag, info) => { betaald.push([bedrag, info && info.slots]); return (info && info.slots ? info.slots.length : 0); };
  w.pvpArena.score = [9, 3];
  w.pvpArena.t = AR.ARENA.rondeS - 1;
  w.time = 200; PW.pvpArenaTik(w, 2);
  assert.equal(w.pvpArena.fase, 'klaar');
  assert.ok(w.messages.some((m) => m.includes('Arena afgelopen')));
  assert.deepEqual(betaald, [[AR.ARENA_BELONING.geld + AR.ARENA_BELONING.winst, [3]], [AR.ARENA_BELONING.geld, [2]]], 'de gast in het winnende team krijgt de bonus, de andere het gewone bedrag');
  assert.ok(geheim.some(([t, slot]) => slot === 2 && t.startsWith('Arena afgelopen') && t.includes('€40')));
  assert.ok(geheim.some(([t, slot]) => slot === 3 && t.startsWith('Arena afgelopen') && t.includes('€55')));
  assert.equal(w.money, 500 + AR.ARENA_BELONING.geld + AR.ARENA_BELONING.winst, 'de host zit in het winnende team: hetzelfde bedrag plus de bonus');
  PW.pvpArenaTik(w, 2); assert.equal(betaald.length, 2, 'nooit twee keer betalen');
});

t('een gast start de PvP-arena zelf: het gewone verzoek aan de host, die ook J of N kiest', () => {
  const hub = hubVoor([0, 2]), geheim = [];
  const w = hostWereld({ coopNet: { role: 'host', hub }, coopMeld: (slot, tekst) => geheim.push([tekst, slot]) });
  inVeld(w.player, 200); inVeld(w.coopFigures[2]); P.zetPassiefStand(w.coopPvp, 2, false);
  // nog niet in het veld: geen verzoek
  inVeld(w.coopFigures[2], 200);
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'start', id: 'pvparena' }, 2), false);
  assert.ok(geheim.some(([t, slot]) => slot === 2 && t.includes('veld')));
  // in het veld: de host hoort de vraag en de starter doet mee
  inVeld(w.coopFigures[2]);
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'start', id: 'pvparena' }, 2), true);
  assert.equal(w.pvpArenaUitn.keuze[2], 'ja', 'de starter doet mee');
  assert.equal(w.pvpArenaUitn.keuze[0], 'wacht', 'ook de host kiest zelf');
  assert.ok(w.messages.some((m) => m.includes('Roos wil de PvP-arena starten')));
  // een andere id is geen arena: die gaat naar de wedstrijden
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'start', id: 'kart' }, 2), false);
  // de host zegt nee: met één gast is er te weinig voor een ronde, en dat hoort hij
  assert.equal(PW.pvpArenaAntwoord(w, 0, false), true);
  PW.pvpArenaTik(w, AR.ARENA.uitnS + 0.1);
  assert.equal(w.pvpArena, undefined, 'één speler is geen wedstrijd');
  assert.ok(w.messages.at(-1).includes('minstens twee'));
});

t('de gastenkant van de PvP-arena: eigen team, eigen bord en een eigen respawnpunt (#454)', () => {
  const verstuurd = [];
  const g = {
    time: 10, coopRole: 'client', coopPvp: P.maakPvp(), coopRoster: roster, health: 100, armor: 0, money: 90, messages: [],
    addMessage(m) { this.messages.push(m); }, player: { x: PW.PVP_ARENA_PLEK.x, y: PW.PVP_ARENA_PLEK.y, vx: 2, vy: 2 },
    coopNet: { role: 'client', joined: true, session: { slot: 2, sendEvent: (e) => verstuurd.push(e) } },
  };
  P.zetPassiefStand(g.coopPvp, 2, false);
  // E bij het veld: de gast vraagt een ronde, hij rekent niets zelf
  assert.equal(PW.pvpArenaStart(g), true);
  assert.deepEqual(verstuurd.at(-1), { k: 'wedgast', a: 'start', id: 'pvparena' }, 'het gewone bericht van een wedstrijd');
  assert.equal(g.pvpArena, undefined);
  assert.ok(g.messages.at(-1).includes('Je vraagt'));
  // de host meldt de start met het eigen team: het eigen bord begint bij de volle ronde
  PW.pvpArenaGastMelding(g, AR.ARENA_TEKST.startJij('Zuid'));
  assert.equal(g.pvpArenaGast.team, 1);
  assert.equal(g.pvpArenaGast.rest, AR.ARENA.rondeS);
  // de stand komt als gewone melding en de eigen klok loopt door
  PW.pvpArenaGastMelding(g, AR.arenaRegelVan([7, 4], 100));
  assert.deepEqual(g.pvpArenaGast.score, [7, 4]); assert.equal(g.pvpArenaGast.rest, 100);
  PW.pvpArenaGastTik(g, 2); assert.ok(Math.abs(g.pvpArenaGast.rest - 98) < 1e-9);
  PW.pvpArenaGastMelding(g, 'West is van Zuid');
  assert.equal(g.pvpArenaGast.flash, 'West is van Zuid');
  // de gast gaat neer: zonder kosten weer op, bij het eigen team (team Zuid)
  g.health = 10;
  assert.equal(PW.pvpGastRaak(g, P.pvpSchadeEvent(15, 0), 2), true);
  assert.equal(g.health, 100); assert.equal(g.money, 90, 'dood door een medespeler kost niets');
  const thuis = AR.maakArena({ x: PW.PVP_ARENA_PLEK.x, y: PW.PVP_ARENA_PLEK.y }).spawns[1];
  assert.ok(thuis.some((s) => Math.hypot(g.player.x - s.x, g.player.y - s.y) < 1e-6), 'op de opstelplaats van team Zuid');
  assert.equal(g.player.vx, 0, 'stil bij het opstaan');
  // de uitslag: het bord blijft nog even staan en ruimt daarna op
  PW.pvpArenaGastMelding(g, AR.ARENA_TEKST.einde('Arena afgelopen: Noord 7, Zuid 4.', 40, 'Zuid'));
  assert.equal(g.pvpArenaGast.klaar, true);
  assert.ok(g.pvpArenaGast.tekst.includes('Arena afgelopen'));
  g.time = 10 + AR.ARENA.klaarS + 0.1;
  PW.pvpArenaGastTik(g, 0.1);
  assert.equal(g.pvpArenaGast, null, 'na de uitslag is het bord weg');
  // de prompt zegt nu dat de gast zelf kan vragen, en de meldingen van een ronde zonder hem doen niets
  g.player.x = PW.PVP_ARENA_PLEK.x; g.player.y = PW.PVP_ARENA_PLEK.y;
  const prompt = PW.pvpArenaPrompt(g);
  assert.ok(prompt && prompt.sub.includes('druk op E'), 'een gast vraagt zelf een ronde');
  assert.equal(PW.pvpArenaGastMelding(g, AR.arenaRegelVan([1, 2], 30)), false, 'zonder eigen ronde geen bord');
});

t('de gastenlijst en de meldingen: geen nieuw bericht, en de arena laat zich niet met een andere wedstrijd mengen', () => {
  assert.equal(N.CAPS.includes('pvp'), true);
  // het antwoord op de uitnodiging is het gewone 'wedgast' ja/nee; zonder uitnodiging gebeurt er niets
  const hub = hubVoor([0, 2]);
  const w = hostWereld({ coopNet: { role: 'host', hub }, coopMeld: () => {} });
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'ja' }, 2), false);
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'ja' }, 0), false, 'van plek 0 komt dit nooit als bericht');
  // een lopende wedstrijd-uitnodiging houdt de arena tegen
  w.coopNet.wed = { u: { keuze: { 2: 'wacht' } } };
  inVeld(w.player); inVeld(w.coopFigures[2]); P.zetPassiefStand(w.coopPvp, 0, false); P.zetPassiefStand(w.coopPvp, 2, false);
  assert.equal(PW.pvpArenaStart(w), false);
  assert.ok(w.messages.at(-1).includes('wedstrijd'));
  // en een gast die de arena vraagt krijgt dezelfde uitleg
  assert.equal(PW.pvpArenaGastBericht(w, { k: 'wedgast', a: 'start', id: 'pvparena' }, 2), false);
  w.coopNet.wed = null;
  // de sessie stopt: geen ronde en geen bord meer
  PW.pvpArenaStart(w);
  assert.ok(w.pvpArenaUitn);
  PW.pvpArenaReset(w);
  assert.equal(w.pvpArenaUitn, null); assert.equal(w.pvpArena, null);
});

console.log(`cooppvp_test: ${n}/${n} ok`);
