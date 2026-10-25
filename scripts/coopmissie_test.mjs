// Samen spelen (#452 punten 3 en 20): verhaalstappen kijken naar alle meespelers, niet alleen naar de gastheer; de opdrachtstand is
// per groep, zodat twee opdrachten die tegelijk lopen elkaars stap, doelen en keuzes niet overschrijven.
//   node scripts/coopmissie_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as G from '../game/js/coopmissie.js';
import * as M from '../game/js/coopmeedoen.js';
import { missieBericht, leesMissieBericht } from '../game/js/coopworld.js';
import { ververs, opdrachtSpelers, inVoertuig, dichtstbijzijndeMeespeler, afstandMeespeler, meespelerInVoertuig, iedereenBinnen } from '../game/js/spelersregister.js';
import { teamActor, doelStand, groepKlaar } from '../game/js/stagegroep.js';
import { registerMissionQueries } from '../game/js/missionquery.js';
import { missieGastE } from '../game/js/coopglue.js';

let n = 0;
const t = (name, f) => { f(); n++; };

// de modeOk van missions.js, zoals hij daar staat (te voet, boot, missievoertuig)
const missieAuto = { id: 'auto', x: 100, y: 0, speed: 0 };
const modeOk = (p, mode) => {
  if (mode === 'foot') return !p.inVehicle;
  if (mode === 'boat') return !!(p.inVehicle && p.inVehicle.isBoat);
  if (mode === 'vehicle') return p.inVehicle === missieAuto;
  return true;
};
// nepwereld: de gastheer op (0, 0), gast 1 en 2 uit world.coopPartners; slots = wie meedoet en staat (zoals coopnet.js coopMeespelers)
function wereld({ gasten = [], meedoen = null, vehicles = [] } = {}) {
  const w = { player: { x: 0, y: 0, inVehicle: null }, vehicles, coopPartners: gasten.map((g) => ({ status: 'voet', zichtbaar: true, ...g })) };
  w.coopMeespelers = meedoen ? () => meedoen : undefined;
  ververs(w, 0);
  return w;
}
const DOEL = { x: 500, y: 0 };

t('eenspeler: een register van één, exact als voorheen', () => {
  const w = wereld();
  assert.equal(opdrachtSpelers(w).length, 1);
  assert.equal(teamActor(w, DOEL), w.player, 'de hoofdspeler zelf, geen proxy');
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'buiten');
  w.player.x = 490;
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'binnen');
  w.player.inVehicle = { id: 'x' };
  assert.equal(doelStand(w, DOEL, 30, 'foot', modeOk).status, 'modus');
  // een sessie van één gast die geen J zei: niemand telt behalve de gastheer
  const w2 = wereld({ gasten: [{ slot: 1, x: 500, y: 0 }], meedoen: [] });
  assert.equal(opdrachtSpelers(w2).length, 1);
  assert.equal(doelStand(w2, DOEL, 30, undefined, modeOk).status, 'buiten', 'een toeschouwer in het doel telt niet');
});

t('goto: een gast alleen in het doel is genoeg, een toeschouwer niet', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 495, y: 5 }], meedoen: [1] });
  assert.equal(opdrachtSpelers(w).length, 2);
  const g = doelStand(w, DOEL, 30, undefined, modeOk);
  assert.equal(g.status, 'binnen');
  assert.equal(g.actor.gast, true);
  assert.equal(afstandMeespeler(w, DOEL.x, DOEL.y) < 10, true, 'afstand van de dichtstbijzijnde meespeler');
  assert.equal(dichtstbijzijndeMeespeler(w, DOEL.x, DOEL.y).slot, 1);
  w.coopMeespelers = () => []; // de gast zei nee
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'buiten');
});

t('goto met modus: de gast te voet of in de boot telt als de stap het vraagt', () => {
  const boot = { id: 'boot', isBoat: true, x: 505, y: 0 };
  const w = wereld({ gasten: [{ slot: 1, x: 505, y: 0, status: 'voertuig' }], meedoen: [1], vehicles: [boot] });
  assert.equal(inVoertuig(w, w.players[1]), boot);
  assert.equal(doelStand(w, DOEL, 30, 'boat', modeOk).status, 'binnen', 'de gast zit in de boot');
  assert.equal(doelStand(w, DOEL, 30, 'foot', modeOk).status, 'modus', 'de gast moet te voet');
  w.coopPartners[0].status = 'voet'; ververs(w, 0);
  assert.equal(doelStand(w, DOEL, 30, 'foot', modeOk).status, 'binnen');
});

t('hold: een meespeler bij het doel houdt de klok gaande; met iedereen moeten ze er allemaal zijn', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 0, y: 0 }], meedoen: [1] });
  w.player.x = 0; w.coopPartners[0].x = 10; w.coopPartners[0].y = 0;
  const DEUR = { x: 10, y: 0 };
  assert.equal(doelStand(w, DEUR, 5, undefined, modeOk).status, 'binnen', 'alleen de gast staat er: genoeg');
  assert.equal(doelStand(w, DEUR, 5, undefined, modeOk, true).status, 'wacht', 'met iedereen mist de gastheer');
  w.player.x = 9;
  assert.equal(doelStand(w, DEUR, 5, undefined, modeOk, true).status, 'binnen');
  assert.equal(iedereenBinnen(w, 10, 0, 5), true);
  assert.equal(iedereenBinnen(w, 500, 0, 5), false);
});

t('poort voor stappen zonder eigen logica (kluis): standaard een is genoeg, met de vlag iedereen', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 200, y: 0 }], meedoen: [1] });
  w.player.x = 1;
  const kluis = { x: 0, y: 0 };
  assert.equal(groepKlaar(w, { kind: 'crack' }, kluis), true, 'zonder vlag niets te wachten');
  assert.equal(groepKlaar(w, { kind: 'crack', iedereen: true }, kluis), false, 'de gast is nog onderweg');
  w.coopPartners[0].x = 5; ververs(w, 0);
  assert.equal(groepKlaar(w, { kind: 'crack', iedereen: true }, kluis), true);
  assert.equal(groepKlaar(wereld(), { iedereen: true }, kluis), true, 'alleen: de gastheer is de groep');
});

t('board: iemand stapt in het missievoertuig; een gast telt via zijn voertuig', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 100, y: 2, status: 'rijdt' }], meedoen: [1], vehicles: [missieAuto] });
  assert.equal(meespelerInVoertuig(w, missieAuto).slot, 1);
  const w2 = wereld({ gasten: [{ slot: 1, x: 100, y: 2, status: 'rijdt' }], meedoen: [], vehicles: [missieAuto] });
  assert.equal(meespelerInVoertuig(w2, missieAuto), null, 'een toeschouwer die instapt telt niet');
  w2.player.inVehicle = missieAuto;
  assert.equal(meespelerInVoertuig(w2, missieAuto).slot, 0, 'de gastheer zelf');
});

t('escape en chase: afstand van de dichtstbijzijnde meespeler', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 900, y: 0 }], meedoen: [1] });
  assert.equal(Math.round(afstandMeespeler(w, 880, 0)), 20, 'de gast zit er vlak achter, de gastheer is ver weg');
  w.coopPartners[0].status = 'neer'; ververs(w, 0);
  assert.equal(Math.round(afstandMeespeler(w, 880, 0)), 880, 'wie neer is telt niet meer mee');
  const boot = { id: 'b', isBoat: true, x: 510, y: 0 };
  const w2 = wereld({ gasten: [{ slot: 1, x: 510, y: 0, status: 'rijdt' }], meedoen: [1], vehicles: [boot] });
  const q = teamActor(w2, DOEL, (a, d) => d < 40 && !!a.inVehicle && !!a.inVehicle.isBoat);
  assert.equal(q.inVehicle, boot, 'de boot van de gast legt aan');
});

t('de gastheer is neergegaan of opgepakt: de gast houdt de stap gaande en alleen hij telt', () => {
  const w = wereld({ gasten: [{ slot: 1, x: 495, y: 0 }], meedoen: [1] });
  w.pendingRespawn = { busted: true }; // opgepakt op het politiebureau
  const l = opdrachtSpelers(w);
  assert.deepEqual(l.map((r) => r.slot), [1], 'de gastheer telt niet mee zolang hij wacht op zijn herstart');
  assert.equal(doelStand(w, DOEL, 30, undefined, modeOk).status, 'binnen');
  const w2 = wereld(); w2.pendingRespawn = { busted: false };
  assert.deepEqual(opdrachtSpelers(w2).map((r) => r.slot), [0], 'alleen: de gastheer blijft de enige');
});

// ---- falen: echte sessie (host + gast), zoals coopteam_test.mjs
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', state: 'alive' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function sessie(gasten = 1) {
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 3 });
  const gs = [];
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.02, seed: 7 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  }
  const step = (s) => { for (let k = 0; k < 60 * s; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  step(2);
  return { hw, gs, step };
}
const opdracht = (hw) => { hw.mission = { phase: 'active', label: 'Bezorgen', type: 'stages', index: 4, progressText: 'Naar de kerk' }; };
const druk = (gw, toets) => { let eens = true; gw.input.wasPressed = (k) => { if (k === toets && eens) { eens = false; return true; } return false; }; };

t('sessie: coopMeespelers geeft wie J zei, verbonden is en staat; de stap volgt hem', () => {
  const { hw, gs, step } = sessie(2);
  assert.equal(typeof hw.coopMeespelers, 'function');
  opdracht(hw); step(1);
  assert.deepEqual(hw.coopMeespelers(), [], 'niemand zei J');
  assert.equal(opdrachtSpelers(hw).length, 1);
  druk(gs[0].gw, 'j'); step(1);
  assert.deepEqual(hw.coopMeespelers(), [1]);
  hw.companion.state = 'dead'; step(1);
  assert.deepEqual(hw.coopMeespelers(), [], 'de meespeler is neer');
  assert.equal(hw.coopOpdrachtDoor(), false, 'de gastheer neer en de enige meespeler neer: de opdracht faalt');
  hw.companion.state = 'alive'; step(1);
  assert.deepEqual(hw.coopMeespelers(), [1]);
  assert.equal(hw.coopOpdrachtDoor(), true, 'de gastheer neer of opgepakt, een meespeler staat: de opdracht loopt door');
  druk(gs[1].gw, 'j'); step(1);
  hw.companion.state = 'dead'; step(1);
  assert.deepEqual(hw.coopMeespelers(), [2], 'een extra gast die staat telt');
  assert.equal(hw.coopOpdrachtDoor(), true);
  N.stopCoopNet(hw);
  assert.equal(hw.coopMeespelers, null, 'na het stoppen weg');
});

// ---- de opdrachtstand per groep (#452): twee opdrachten naast elkaar
const LOKET = { id: '3|Het Loket', label: 'Het Loket', index: 3, stap: 'Stap in de auto', deelnemers: [0, 1], doelen: [{ id: 0, soort: 'doel', x: 5, y: 5, label: 'Het Loket' }] };
const KLUIS = { id: '4|Kluisklus', label: 'Kluisklus', index: 4, stap: 'Kluis open', deelnemers: [2, 3], doelen: [{ id: 0, soort: 'inbraak', x: 90, y: 20, label: 'De kluis' }] };

t('twee groepen: elke speler ziet zijn eigen opdracht, stap en doelen; de een verandert de ander niet', () => {
  const st = G.maakGroepen();
  assert.equal(G.opdrachtId({ phase: 'active', index: 3, label: 'Het Loket' }), '3|Het Loket');
  assert.equal(G.opdrachtId({ phase: 'idle', index: 3, label: 'Het Loket' }), null, 'zonder lopende opdracht geen groep');
  G.begin(st, LOKET, 1); G.begin(st, KLUIS, 2);
  assert.equal(G.groepVan(st, 0).id, LOKET.id); assert.equal(G.groepVan(st, 1).id, LOKET.id);
  assert.equal(G.groepVan(st, 2).id, KLUIS.id);
  assert.equal(G.zichtbaar(st, 1).stap, 'Stap in de auto');
  assert.equal(G.zichtbaar(st, 2).label, 'Kluisklus');
  assert.deepEqual(G.doelenVoor(st, 1).map((d) => d.label), ['Het Loket']);
  assert.deepEqual(G.doelenVoor(st, 2).map((d) => d.label), ['De kluis']);
  // de volgende stap van de kluis raakt Het Loket niet
  G.zetStand(st, KLUIS.id, { stap: 'Rij naar de haven' }, 4);
  assert.equal(G.groep(st, LOKET.id).stap, 'Stap in de auto');
  assert.equal(G.zichtbaar(st, 2).stap, 'Rij naar de haven');
  assert.equal(G.groepVan(st, 9), null, 'wie niet meespeelt hoort bij geen groep');
  assert.equal(G.zichtbaar(st, 9), null, 'met twee groepen ziet een toeschouwer geen willekeurige opdracht');
});

t('een groep eindigen laat de andere staan; de deelnemerslijst bepaalt wie de stap telt', () => {
  const st = G.maakGroepen();
  G.begin(st, LOKET, 1); G.begin(st, KLUIS, 2);
  G.zetDeelnemers(st, LOKET.id, [0, 1, 2]); // een laatkomer doet mee met Het Loket
  assert.equal(G.deelnemer(st, LOKET.id, 2), true);
  assert.equal(G.beeindig(st, KLUIS.id), true);
  assert.equal(G.groep(st, KLUIS.id), null); assert.equal(G.groep(st, LOKET.id).stap, 'Stap in de auto');
  assert.deepEqual(G.groepen(st).map((g) => g.id), [LOKET.id]);
  assert.equal(G.ruimOp(st, [0, 1, 2]), 0, 'de gastheer en twee gasten zitten er nog');
  assert.equal(G.ruimOp(st, [7, 8]), 1, 'niemand van de groep is nog verbonden: de groep gaat weg');
  assert.equal(G.groepen(st).length, 0);
});

t('meedoen per opdracht-id: een nee bij de kluis geldt niet voor Het Loket', () => {
  const st = M.maakMeedoen();
  M.begin(st, LOKET.id, [1, 2]); // Het Loket: iedereen krijgt de vraag
  assert.deepEqual(M.meespelers(st), []);
  assert.equal(M.antwoord(st, 1, true), true); // gast 1 doet mee
  assert.equal(M.antwoord(st, 2, false), true); // gast 2 zegt nee
  assert.deepEqual(M.meespelers(st, LOKET.id), [1]);
  // een tweede groep begint: de keuzes van Het Loket blijven bewaard
  M.begin(st, KLUIS.id, [1, 2]);
  assert.deepEqual(M.meespelers(st), [], 'de kluis begint met een schone lei');
  assert.equal(M.antwoord(st, 2, true), true);
  assert.deepEqual(M.meespelers(st, KLUIS.id), [2]);
  assert.deepEqual(M.meespelers(st, LOKET.id), [1], 'Het Loket houdt zijn eigen keuze');
  assert.equal(M.krijgtDeel(st, 2, KLUIS.id), true);
  assert.equal(M.krijgtDeel(st, 2, LOKET.id), false, 'de nee bij Het Loket blijft een nee');
  assert.equal(M.loopVrij(st, 2, LOKET.id), true);
  // terug naar Het Loket: geen nieuwe vraag voor wie al antwoordde
  const u = M.begin(st, LOKET.id, [1, 2]);
  assert.deepEqual(u, [], 'wie al gekozen heeft, wordt niet opnieuw gevraagd');
  assert.deepEqual(M.meespelers(st), [1]);
  M.einde(st, LOKET.id);
  assert.equal(M.standVan(st, LOKET.id), null);
  assert.deepEqual(M.meespelers(st, KLUIS.id), [2], 'de kluis loopt door');
});

t('het missiebericht draagt de groep-id mee, ook bij het einde', () => {
  const pub = { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', lateInstap: true, id: LOKET.id };
  let r = missieBericht(null, pub);
  assert.equal(r.event.id, LOKET.id); assert.equal(r.event.stap, 'Stap in de auto');
  assert.equal(r.huidig.id, LOKET.id);
  r = missieBericht(r.huidig, { ...pub, phase: 'idle' });
  assert.deepEqual(r.event, { k: 'missie', actief: false, id: LOKET.id });
  assert.deepEqual(leesMissieBericht({ k: 'missie', actief: true, label: 'Het Loket', id: LOKET.id }).id, LOKET.id);
  assert.equal(leesMissieBericht({ k: 'missie', actief: true, label: 'Het Loket', id: 'x'.repeat(60) }).id, undefined, 'een veel te lange id telt niet');
});

t('sessie: de gastheer houdt per opdracht een groep bij met stap en deelnemers', () => {
  const { hw, gs, step } = sessie(1);
  hw.mission = { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', lateInstap: true, id: LOKET.id };
  step(1);
  let g = hw.coopGroepen && hw.coopGroepen.groepen[LOKET.id];
  assert.ok(g, 'de lopende opdracht heeft een groep');
  assert.deepEqual(g.deelnemers, [0], 'nog niemand zei ja');
  assert.equal(g.stap, 'Stap in de auto');
  druk(gs[0].gw, 'j'); step(1);
  g = hw.coopGroepen.groepen[LOKET.id];
  assert.deepEqual(g.deelnemers, [0, 1], 'de gast die ja zei hoort erbij');
  hw.mission.progressText = 'Rij naar het loket'; step(1);
  assert.equal(hw.coopGroepen.groepen[LOKET.id].stap, 'Rij naar het loket');
  // een andere opdracht: de oude groep gaat weg, de nieuwe komt met zijn eigen stap
  hw.mission = { phase: 'active', label: 'Kluisklus', type: 'stages', index: 4, progressText: 'Kluis open', lateInstap: false, id: KLUIS.id };
  step(1);
  assert.equal(hw.coopGroepen.groepen[LOKET.id], undefined);
  assert.equal(hw.coopGroepen.groepen[KLUIS.id].stap, 'Kluis open');
  hw.mission = { phase: 'idle', label: 'Kluisklus', index: 4 }; step(1);
  assert.deepEqual(Object.keys(hw.coopGroepen.groepen), [], 'zonder opdracht geen groep');
});

t('een gast die bij een andere groep hoort, ziet de stappen van deze opdracht niet', () => {
  const { hw, gs, step } = sessie(1);
  const gw = gs[0].gw;
  hw.mission = { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', lateInstap: true, id: LOKET.id };
  step(1);
  assert.equal(gw.coopMissie.id, LOKET.id);
  // de gast hoort inmiddels bij de kluis (een andere groep) en heeft die stap al
  gw.coopGroep = { id: KLUIS.id, label: 'Kluisklus', deelnemer: true };
  gw.coopHostMissie = { actief: true, id: KLUIS.id, label: 'Kluisklus', index: 4, stap: 'Kluis open', lateInstap: true };
  gw.coopMissie = { ...gw.coopHostMissie };
  hw.mission.progressText = 'Rij naar de kerk'; step(1);
  assert.equal(gw.coopMissie.stap, 'Kluis open', 'zijn eigen stap blijft staan');
  assert.equal(gw.coopHostMissie.id, KLUIS.id, 'de opdracht van de andere groep wordt geen eigen opdracht');
  assert.equal(gw.coopMissieAnder[LOKET.id].stap, 'Rij naar de kerk', 'de andere groep wordt apart onthouden');
  assert.equal(gw.messages.filter((m) => /Rij naar de kerk/.test(m)).length, 0, 'en levert geen melding op');
});

t('een gast stapt over naar een nieuwe groep: de stap die al binnenkwam, komt bij de uitnodiging mee', () => {
  const { gs, step } = sessie(1);
  const gw = gs[0].gw;
  gw.coopGroep = { id: LOKET.id, label: 'Het Loket', deelnemer: true };
  gw.coopMissie = gw.coopHostMissie = { actief: true, id: LOKET.id, label: 'Het Loket', index: 3, stap: 'Stap in de auto', lateInstap: true };
  // de gastheer begint meteen een andere opdracht: die stap komt binnen vóór de uitnodiging
  assert.equal(N.handleEvent(gw, { k: 'missie', actief: true, label: 'Kluisklus', index: 4, stap: 'Kluis open', id: KLUIS.id }, 0), true);
  assert.equal(gw.coopMissie.id, LOKET.id, 'zijn eigen opdracht blijft staan');
  assert.equal(gw.coopMissieAnder[KLUIS.id].stap, 'Kluis open');
  assert.equal(N.handleEvent(gw, { k: 'meedoen', label: 'Kluisklus', id: KLUIS.id }, 0), true);
  assert.equal(gw.coopGroep.id, KLUIS.id, 'de uitnodiging maakt de kluis zijn groep');
  assert.equal(gw.coopMissie.id, KLUIS.id);
  assert.equal(gw.coopMissie.stap, 'Kluis open', 'de stap van de nieuwe groep is niet verloren');
  assert.equal(gw.coopMissieAnder[KLUIS.id], undefined);
  step(1);
});

t('een gast die zelf een opdracht start: het verzoek is begrensd en alleen zijn eigen opdracht bij het startpunt telt', () => {
  const v = G.leesVerzoek({ k: 'missiegast', a: 'start', i: 4, label: 'Bezorgen' });
  assert.deepEqual(v, { i: 4, label: 'Bezorgen' });
  assert.equal(G.leesVerzoek({ k: 'missiegast', a: 'start', i: 4 }), null, 'zonder label');
  assert.equal(G.leesVerzoek({ k: 'missiegast', a: 'start', i: -1, label: 'x' }), null, 'geen geldige index');
  assert.equal(G.leesVerzoek({ k: 'wedgast', a: 'start', i: 4, label: 'x' }), null, 'een ander bericht');
  assert.deepEqual(G.verzoekEvent(4, 'Bezorgen'), { k: 'missiegast', a: 'start', i: 4, label: 'Bezorgen' });
  const DEF = { label: 'Bezorgen', type: 'stages', start: { x: 100, y: 0 } };
  assert.equal(G.startReden({ verzoek: v, def: DEF, eigen: { index: 4 }, lichaam: { x: 95, y: 0 } }), null, 'bij het startpunt en zijn eigen opdracht');
  assert.equal(G.startReden({ verzoek: v, def: DEF, lichaam: { x: 300, y: 0 } }), G.MISSIE_TEKST.nietBijStart);
  assert.equal(G.startReden({ verzoek: v, def: { ...DEF, solo: true }, lichaam: { x: 100, y: 0 } }), G.MISSIE_TEKST.alleen);
  assert.equal(G.startReden({ verzoek: v, def: DEF, eigen: { index: 3 }, lichaam: { x: 100, y: 0 } }), G.MISSIE_TEKST.nietJouwBeurt);
  assert.equal(G.startReden({ verzoek: { ...v, label: 'Kluisklus' }, def: DEF }), G.MISSIE_TEKST.onbekend, 'een andere opdracht dan hij noemde');
  assert.equal(G.startReden({ verzoek: v, def: null }), G.MISSIE_TEKST.onbekend);
});
t('de poort voor een verzoek is dezelfde playerBusy als elke start (#452)', () => {
  assert.equal(G.verzoekBlok({}), null, 'niets aan de hand');
  assert.equal(G.verzoekBlok({ mission: { phase: 'active' } }), G.MISSIE_TEKST.bezig, 'de gastheer speelt zelf een opdracht');
  assert.equal(G.verzoekBlok({ sideJob: { active: true } }), G.MISSIE_TEKST.bijbaan);
  assert.equal(G.verzoekBlok({ padelGame: {} }), G.MISSIE_TEKST.activiteit);
  assert.equal(G.verzoekBlok({ wanted: 2 }), G.MISSIE_TEKST.politie);
  assert.equal(G.verzoekBlok({ pendingRespawn: {} }), G.MISSIE_TEKST.wacht);
  assert.equal(G.verzoekBlok({ coopNet: { wed: { r: {} } } }), G.MISSIE_TEKST.wedstrijd, 'er loopt een wedstrijd');
  assert.equal(G.verzoekBlok(null), G.MISSIE_TEKST.wacht);
});
t('de groep van een gast die start: de lopende stand blijft leidend, de vrager komt erbij, een andere groep blijft staan', () => {
  const st = G.maakGroepen();
  G.begin(st, LOKET, 1);
  G.zetStand(st, LOKET.id, { stap: 'Rij naar de kerk' }, 4);
  const g = G.beginVerzoek(st, { index: 3, label: 'Het Loket', stap: '', doelen: [] }, 2, 5);
  assert.equal(g.id, LOKET.id);
  assert.equal(g.stap, 'Rij naar de kerk', 'een verzoek overschrijft de lopende stap niet');
  assert.deepEqual(g.doelen.map((d) => d.label), ['Het Loket'], 'de doelen blijven');
  assert.deepEqual(g.deelnemers, [0, 1, 2], 'de vrager hoort erbij');
  const k = G.beginVerzoek(st, { index: 4, label: 'Kluisklus', stap: 'Kluis open', doelen: [{ x: 1, y: 2, label: 'Kluis' }] }, 3, 6);
  assert.deepEqual(k.deelnemers, [3], 'een nieuwe groep begint met de vrager');
  assert.equal(k.stap, 'Kluis open');
  assert.deepEqual(G.groep(st, LOKET.id).deelnemers, [0, 1, 2], 'de andere groep houdt zijn deelnemers');
  assert.equal(G.beginVerzoek(null, { index: 4, label: 'Kluisklus' }, 1), null, 'zonder register geen groep');
});

t('sessie: een gast start zijn eigen verhaalopdracht; de andere gast krijgt Meedoen? en de vrager zit in de groep', () => {
  const { hw, gs, step } = sessie(2);
  registerMissionQueries({
    getMissionDefs: () => [{ label: 'Bezorgen', type: 'stages', start: { x: 10, y: 0 } }],
    getMissionList: () => [{ index: 0, label: 'Bezorgen', status: 'volgende', start: { x: 10, y: 0 } }],
  });
  hw.coopMissieStart = (i) => { hw.mission = { phase: 'active', label: 'Bezorgen', type: 'stages', index: i, id: `${i}|Bezorgen`, progressText: 'Naar de kerk', lateInstap: true }; return true; };
  for (const g of gs) { g.gw.player.x = 10; g.gw.player.y = 0; }
  hw.companion.x = 10; hw.companion.y = 0;
  assert.equal(missieGastE(gs[0].gw), true, 'E bij het startpunt van zijn eigen opdracht');
  assert.equal(missieGastE(gs[0].gw), true, 'een tweede E binnen twee seconden doet niets');
  step(1);
  assert.ok(hw.messages.some((m) => /start Bezorgen/.test(m)), 'de gastheer hoort wie de opdracht begon');
  assert.equal(hw.coopNet.meedoen.keuze[1], 'ja', 'de vrager doet mee');
  assert.equal(hw.coopNet.meedoen.keuze[2], 'wacht', 'de andere gast wordt gevraagd');
  assert.equal(hw.coopNet.meedoen.keuze[0], 'wacht', 'de gastheer krijgt dezelfde vraag (#452)');
  assert.ok(hw.coopGastVraag && hw.coopGastVraag.id === '0|Bezorgen', 'de vraag staat klaar voor de gastheer');
  assert.ok(hw.messages.some((m) => /Meedoen\? J = ja, N = nee/.test(m)), 'met J en N in de melding');
  assert.equal(G.gastheerMee(hw, '0|Bezorgen'), false, 'zonder antwoord doet de gastheer niet mee');
  assert.ok(gs[1].gw.messages.some((m) => /Meedoen met Bezorgen\? J = ja, N = nee/.test(m)));
  const gr = hw.coopGroepen.groepen['0|Bezorgen'];
  assert.ok(gr, 'de opdracht heeft een groep');
  assert.equal(gr.deelnemers.includes(1), true, 'de vrager hoort bij de groep');
  assert.equal(gs[0].gw.coopGroep && gs[0].gw.coopGroep.deelnemer, true, 'de vrager weet dat hij meedoet');
  assert.ok(gs[0].gw.messages.some((m) => /Bezorgen is begonnen: je doet mee/.test(m)));
  // de gastheer zegt N: hij kijkt toe, de opdracht loopt door zonder hem (coopnet.js uitslag en missions.js dempen zijn beloning)
  druk(hw, 'n');
  assert.equal(G.gastheerVraagTik(hw, 1 / 60), true, 'N van de gastheer telt');
  assert.equal(hw.coopNet.meedoen.keuze[0], 'nee');
  assert.equal(hw.coopGastVraag, null, 'de vraag is weg');
  assert.equal(G.gastheerMee(hw, '0|Bezorgen'), false, 'de gastheer deed niet mee');
  assert.ok(hw.messages.some((m) => /niet mee met Bezorgen/.test(m)));
});

t('de gastheer zegt J of laat de vraag verlopen: J doet mee, verlopen is nee (#452)', () => {
  // J: de gastheer doet mee via de gewone groep
  const hw = { messages: [], addMessage(m) { this.messages.push(m); }, input: { wasPressed: () => false }, coopNet: { role: 'host', meedoen: M.maakMeedoen() } };
  M.beginGast(hw.coopNet.meedoen, '4|Bezorgen', [0, 1], null, null, 1);
  assert.equal(G.gastheerVraag(hw, '4|Bezorgen', 'Bezorgen', 20), true);
  druk(hw, 'j');
  assert.equal(G.gastheerVraagTik(hw, 1 / 60), true);
  assert.equal(hw.coopNet.meedoen.keuze[0], 'ja');
  assert.equal(G.gastheerMee(hw, '4|Bezorgen'), true, 'de gastheer speelt mee');
  assert.ok(hw.messages.some((m) => /Je doet mee met Bezorgen/.test(m)));
  assert.deepEqual(M.meespelers(hw.coopNet.meedoen), [0, 1], 'hij telt bij de groep');
  // verlopen: geen antwoord is nee
  const hw2 = { messages: [], addMessage(m) { this.messages.push(m); }, input: { wasPressed: () => false }, coopNet: { role: 'host', meedoen: M.maakMeedoen() } };
  M.beginGast(hw2.coopNet.meedoen, '4|Bezorgen', [0, 1], null, null, 1);
  G.gastheerVraag(hw2, '4|Bezorgen', 'Bezorgen', 20);
  assert.equal(G.gastheerVraagTik(hw2, 5), false, 'de vraag loopt nog');
  assert.equal(G.gastheerMee(hw2, '4|Bezorgen'), false, 'nog geen antwoord: nog niet mee');
  assert.equal(G.gastheerVraagTik(hw2, 16), true, 'na de tijd telt het als nee');
  assert.equal(hw2.coopNet.meedoen.keuze[0], 'nee');
  // een vraag zonder sessie of zonder gastheerrol doet niets
  assert.equal(G.gastheerVraagTik({ messages: [], coopNet: null }, 1), false);
  assert.equal(G.gastheerMee({}, '4|Bezorgen'), true, 'zonder sessie het gewone pad');
  assert.equal(G.gastheerMee({ coopNet: { role: 'client', meedoen: M.maakMeedoen() } }, '4|Bezorgen'), true, 'een gast is geen gastheer');
});

t('de respawn-haak vraagt de sessie voor neer en voor opgepakt, en de stappen lopen via stagegroep.js', () => {
  const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  assert.match(src, /if \(w\.coopOpdrachtDoor && w\.coopOpdrachtDoor\(\)\) return;\s*\r?\n\s*failActiveMission\(w, busted/, 'busted en neer lopen door dezelfde check');
  for (const naam of ['doelStand(', 'teamActor(', 'groepKlaar(', 'meespelerInVoertuig(', 'afstandMeespeler(']) assert.ok(src.includes(naam), `missions.js gebruikt ${naam}`);
});

t('missions.js dempt beloning en voortgang van een gastheer die niet meedeed (#452)', () => {
  const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  // de gastStart onthoudt de eigen opdracht van de gastheer en de gastStartMee-haak vraagt de keuze aan coopmissie.js
  assert.match(src, /chain\.gastStart = \{ id: `\$\{i\}\|\$\{String\(def\.label \|\| ''\)\.slice\(0, 48\)\}`, eigenIndex \}/);
  assert.match(src, /const gastStartMee = \(world\) => !chain\.gastStart \|\| gastheerMee\(world, chain\.gastStart\.id\)/);
  assert.match(src, /function sluitGastStart\(world, mee\)[\s\S]{0,200}chain\.index = g\.eigenIndex; chain\.retry = null;/, 'zijn eigen keten springt terug');
  // geen geld, geen stap verder en geen medaille als hij toekeek; de gasten krijgen hun deel wel
  assert.match(src, /if \(mee\) \{ noteMoney\('Missies'\); world\.money \+= reward; \}/);
  assert.match(src, /if \(mee\) chain\.completed\.add\(chain\.index\)/);
  assert.match(src, /if \(mee\) \{\s*world\.stats\.missionsDone\+\+;/);
  assert.match(src, /if \(mee\) hooks\.passed\(world, i\)/);
  assert.match(src, /if \(world\.coopDeel\) world\.coopDeel\(reward\);/, 'de meespelende gasten worden altijd uitbetaald');
  // de gastheer krijgt dezelfde vraag, elke frame bijgehouden in updateMissions
  assert.match(src, /gastheerVraagTik\(world, dt\);/);
});

t('de marker bij een gast (#434): het doel gaat voor, een doel bij een garage krijgt het garageteken', () => {
  const st = G.maakGroepen();
  G.begin(st, LOKET, 1);
  assert.deepEqual(G.doelMarker(G.doelenVoor(st, 1)[0]), { x: 5, y: 5, soort: 'goal' });
  // een doel bij een garage of pomp (de spuitdienst): het garageteken, met dezelfde plek
  const bijGarage = (x, y, m) => Math.hypot(x - 30, y - 30) <= m;
  assert.deepEqual(G.doelMarker({ x: 30, y: 30 }, bijGarage), { x: 30, y: 30, soort: 'garage' });
  assert.equal(G.doelMarker({ x: 30, y: 90 }, bijGarage).soort, 'goal', 'verderop is het een gewoon doel');
  assert.equal(G.doelMarker({ x: 30, y: 90 }, bijGarage, 100).soort, 'garage', 'de afstand is instelbaar');
  // zonder doel (of met een half doel) geen marker: dan komt het beginpunt van de volgende opdracht
  assert.equal(G.doelMarker(null), null);
  assert.equal(G.doelMarker({ x: NaN, y: 5 }), null);
  assert.equal(G.doelMarker({ x: 5, y: Infinity }), null);
  assert.equal(G.GARAGE_MARKER_M > 0, true);
});

console.log(`coopmissie_test: ${n}/${n} ok`);
