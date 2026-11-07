// Samen spelen (#291): wat een gast mag doen (game/js/coopgast.js) en hoe het stuur en E over het net gaan.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from '../game/js/coopgast.js';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { applyGuestChanges } from '../game/js/coopsave.js';
import { SHOP_TYPES } from '../game/js/shopdata.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('de regels: elke actie een regel; winkels voor jezelf mogen, voertuigen en wapens niet', () => {
  const acties = G.GAST_REGELS.map((r) => r.actie);
  assert.equal(new Set(acties).size, acties.length, 'geen dubbele acties');
  for (const r of G.GAST_REGELS) assert.ok(['ja', 'nee', 'deels'].includes(r.mag) && r.regel.length > 20, r.actie);
  for (const k of ['lopen', 'winkelen', 'eten', 'bijrijden', 'sturen', 'voertuig-kopen', 'gesprekken', 'bijbanen']) assert.ok(acties.includes(k), k);
  for (const type of ['kleding', 'kapper', 'tabak', 'super', 'snack', 'eikea']) assert.equal(G.winkelMagVoorGast(type), true, type);
  for (const type of ['wapens', 'pand', 'fietsen', 'fietsenmaker', 'auto', 'tuning', 'boot', 'spuit', 'heli']) assert.equal(G.winkelMagVoorGast(type), false, type);
  for (const type of G.WINKELS_GAST) assert.ok(SHOP_TYPES[type], 'bestaat in shopdata: ' + type);
  assert.match(G.MELDING_WINKEL('Pang & Zo'), /alleen in je eigen spel/);
});
t('een gast kijkt ook omhoog en omlaag (#434)', () => {
  // de camera van de gast leest de muis pas na input.endFrame: de gast telt de beweging van dit beeld zelf op
  const w = { input: { mouse: { dx: 0, dy: 0 } } };
  G.gastKijkHoogte(w, 0, 1);
  assert.equal(w.coopKijkPitch, undefined, 'geen beweging, geen stand');
  w.input.mouse.dy = 120;
  G.gastKijkHoogte(w, w.input.mouse.dy, 1);
  assert.ok(w.coopKijkPitch > G.KIJK_STANDAARD, 'naar beneden met de muis is omhoog kijken');
  assert.equal(w.input.mouse.dy, 0, 'de gast ruimt de beweging op, anders leest de camera hem twee keer');
  G.gastKijkHoogte(w, -120, 1);
  assert.ok(Math.abs(w.coopKijkPitch - G.KIJK_STANDAARD) < 1e-12, 'evenveel terug is weer de beginstand');
  for (let i = 0; i < 200; i++) G.gastKijkHoogte(w, 200, 1);
  assert.equal(w.coopKijkPitch, G.KIJK_MAX_RAD, 'de stand blijft binnen wat de camera aankan');
  for (let i = 0; i < 400; i++) G.gastKijkHoogte(w, -200, 1);
  assert.equal(w.coopKijkPitch, G.KIJK_MIN_RAD);
});

t('in een voertuig laat de gast de kijkhoogte aan de camera (#434)', () => {
  const w = { input: { mouse: { dy: 40 } }, coopInVoertuig: true };
  G.gastKijkHoogte(w, 40, 1);
  assert.equal(w.coopKijkPitch, undefined, 'de camera draait zelf om de auto heen');
  assert.equal(w.input.mouse.dy, 0, 'maar de beweging wordt wel opgeruimd, net als op de grond');
});

t('uitstappen kan bij bijna stilstaan; een vliegtuig of helikopter alleen op de grond (#492)', () => {
  assert.equal(G.kanUitstappen({ speed: 0 }), true); assert.equal(G.kanUitstappen({ speed: -1.5 }), true);
  assert.equal(G.kanUitstappen({ speed: G.UITSTAP_MAX_SNELHEID }), true, 'op de drempel');
  assert.equal(G.kanUitstappen({ speed: 8 }), false); assert.equal(G.kanUitstappen(null), false);
  assert.equal(G.kanUitstappen({ isBoat: true, speed: 0.5 }), true, 'boot blijft zoals het was');
  // vliegtuig en helikopter: op de grond en vrijwel stil mag, in de lucht nooit
  assert.equal(G.kanUitstappen({ isPlane: true, speed: 0, onGround: true }), true);
  assert.equal(G.kanUitstappen({ isPlane: true, speed: 0, onGround: false }), false, 'in de lucht blijft de gast aan boord');
  assert.equal(G.kanUitstappen({ isPlane: true, speed: 0 }), false, 'zonder grondstand geen uitstap');
  assert.equal(G.kanUitstappen({ isPlane: true, speed: 5, onGround: true }), false, 'op de baan maar te snel');
  assert.equal(G.kanUitstappen({ isHeli: true, speed: 0, onGround: true }), true);
  assert.equal(G.kanUitstappen({ isHeli: true, speed: 0, onGround: false }), false, 'zwevend');
  assert.equal(G.kanUitstappen({ isHeli: true, speed: 3, onGround: true }), false);
});
t('de regel zegt dat meerijden in een vliegtuig of helikopter mag en besturen niet (#492)', () => {
  const rij = G.GAST_REGELS.find((r) => r.actie === 'bijrijden');
  assert.match(rij.regel, /vliegtuig/); assert.match(rij.regel, /helikopter/);
  assert.match(rij.regel, /passagier/); assert.match(rij.regel, /nooit als piloot/);
  assert.match(rij.regel, /alleen op de grond/);
});
t('de invoer van de bijrijder als invoer van het voertuig: stick, handrem en sprint; niets raakt wasPressed', () => {
  const i = G.wielInvoer({ mx: 0.5, my: -1, buttons: 2 });
  assert.deepEqual(i.axis(), [0.5, -1]); assert.equal(i.isDown(' '), true); assert.equal(i.isDown('shift'), false); assert.equal(i.wasPressed('e'), false);
  assert.equal(G.wielInvoer({ mx: 0, my: 0, buttons: 1 }).isDown('shift'), true);
  assert.deepEqual(G.wielInvoer(null).axis(), [0, 0]); assert.deepEqual(G.wielInvoer({ mx: 9, my: NaN }).axis(), [1, 0], 'begrensd en veilig');
  assert.equal(G.knoppen(true, true), 3); assert.equal(G.knoppen(false, true), 2); assert.equal(G.knoppen(false, false), 0);
});
t('bewaren: wat de gast zelf kocht komt in zijn eigen save, de rest blijft; zonder verandering niets', () => {
  const data = { money: 500, moneyBackup: 500, health: 80, story: { a: 1 }, pos: { x: 1, y: 2 }, character: 'tammo', shops: { visits: 1 }, stats: { purchases: 0 } };
  const mine = { money: 430, health: 100, shops: { visits: 2 }, stats: { purchases: 1 }, story: { a: 99 }, pos: { x: 9, y: 9 }, character: 'anita' };
  const next = applyGuestChanges(data, mine, 0);
  assert.equal(next.money, 430); assert.equal(next.moneyBackup, 430); assert.equal(next.health, 100); assert.equal(next.shops.visits, 2); assert.equal(next.stats.purchases, 1);
  assert.deepEqual(next.story, { a: 1 }, 'het verhaal blijft van de gast'); assert.deepEqual(next.pos, { x: 1, y: 2 }); assert.equal(next.character, 'tammo', 'niet Tessa');
  assert.equal(applyGuestChanges(data, { money: 500, health: 80, shops: { visits: 1 }, stats: { purchases: 0 } }, 0), null, 'niets veranderd');
  assert.equal(applyGuestChanges(data, null, 250).money, 750, 'zonder eigen toestand: het oude geld plus wat hij verdiende');
  assert.equal(applyGuestChanges(data, { money: -5 }, 0).money, 0, 'geld nooit negatief'); assert.equal(applyGuestChanges(null, mine, 0), null);
});

t('een gast begint zijn opdracht niet vanuit de telefoon of het menu (#452)', () => {
  assert.equal(G.missieMagVanuitMenu(null), true);
  assert.equal(G.missieMagVanuitMenu({}), true);
  assert.equal(G.missieMagVanuitMenu({ coopRole: 'host' }), true);
  assert.equal(G.missieMagVanuitMenu({ coopRole: 'client' }), false, 'een gast is een dunne client');
  assert.match(G.MISSIE_VIA_STARTPUNT, /startpunt/);
  assert.doesNotMatch(G.MISSIE_VIA_STARTPUNT, /gastheer|host/i);
  const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
  assert.match(bron('todo.js'), /!missieMagVanuitMenu\(world\)[\s\S]{0,140}MISSIE_VIA_STARTPUNT/, 'het menu (Te doen) blokkeert');
  assert.match(bron('phone.js'), /missieMagVanuitMenu\(w\)[\s\S]{0,400}Wijs het startpunt/, 'de telefoon (Berend) verwijst naar het startpunt');
  assert.match(G.GAST_REGELS.find((r) => r.actie === 'missies').regel, /startpunt en druk daar op E/, 'de regel zegt hetzelfde');
});

// ---- over het net
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function sessie() {
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 3 });
  const link = createLink({ latency: 0.02, seed: 7 }); N.addGuest(hw, link.a);
  const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
  const step = (s) => { for (let k = 0; k < 60 * s; k++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); hw.time += 1 / 60; gw.time += 1 / 60; } };
  step(2);
  return { hw, gw, step };
}
t('E van de gast komt bij de host aan en een host kan het niet sturen', () => {
  const { hw, gw, step } = sessie();
  // (#516) plek 1 is de eigen figuur van de gast: E zet die figuur in het voertuig van de gastheer.
  const v = { x: 5, y: 5, speed: 0 };
  hw.player.inVehicle = v; hw.coopFigures[1].x = 5.5; hw.coopFigures[1].y = 5;
  assert.equal(N.gastGebruik(gw), true); step(1);
  assert.equal(hw.coopFigures[1].inVeh, v, 'de host weet dat de gast E drukte: hij zit in het voertuig');
  assert.equal(N.gastGebruik(hw), false, 'alleen een gast stuurt dit');
  assert.equal(N.handleEvent(gw, { k: 'gebruik' }, 0), false, 'een gast luistert er niet naar');
  assert.equal(N.handleEvent(hw, { k: 'gebruik' }, 2), false, 'een plek die niet meespeelt heeft geen lichaam');
});
t('het stuur: de host geeft het, de gast hoort het en geeft het terug; zonder voertuig of bij uitstappen niet', () => {
  const { hw, gw, step } = sessie();
  const naam1 = hw.coopRoster.find((r) => r.slot === 1).naam; // (#516) de avatar van de gast, geen Tessa
  assert.equal(N.wielGebaar(hw), false, 'zonder voertuig geen stuur');
  const v = { x: 5, y: 5, speed: 0 }; hw.player.inVehicle = v; hw.coopFigures[1].inVeh = v; step(1); // eerst weet de gast uit de snapshots dat hij in het voertuig zit
  assert.equal(gw.coopInVoertuig, true);
  assert.equal(N.wielGebaar(hw), true); step(1);
  assert.equal(hw.coopWielSlot, 1); assert.equal(gw.coopWiel, true); assert.match(gw.messages.join(' '), /Tammo geeft je het stuur/);
  assert.match(hw.messages.join(' '), new RegExp(`Je geeft ${naam1} het stuur`));
  N.wielGebaar(gw); step(1); // de gast heeft het stuur: Y geeft het terug
  assert.equal(hw.coopWielSlot, null); assert.equal(gw.coopWiel, false); assert.match(hw.messages.join(' '), new RegExp(`Je neemt het stuur terug van ${naam1}`));
  // vragen: de host ziet een verzoek en geeft met Y
  gw.messages.length = 0; hw.messages.length = 0;
  N.wielGebaar(gw); step(1);
  assert.match(gw.messages.join(' '), /Je vraagt om het stuur/); assert.match(hw.messages.join(' '), new RegExp(`${naam1} vraagt om het stuur`)); assert.ok(hw.coopWielVraag);
  N.wielGebaar(hw); step(1); assert.equal(gw.coopWiel, true); assert.equal(hw.coopWielVraag, null);
  // de gast stapt uit (of de host): het stuur is weer van de bestuurder
  hw.coopFigures[1].inVeh = null; step(1);
  assert.equal(hw.coopWielSlot, null, 'zonder bijrijder geen stuur'); assert.equal(gw.coopWiel, false);
  hw.coopFigures[1].inVeh = v; hw.coopWielSlot = 1; hw.player.inVehicle = null; step(1);
  assert.equal(hw.coopWielSlot, null, 'zonder bestuurder geen stuur');
  gw.coopInVoertuig = false; gw.messages.length = 0; N.wielGebaar(gw); assert.match(gw.messages.join(' '), /Alleen als bijrijder/, 'een gast te voet kan niet vragen');
});
t('een korte melding van de host komt bij de gast aan en een host krijgt er geen', () => {
  const { hw, gw, step } = sessie();
  hw.coopMeld(1, 'Stap uit als het voertuig bijna stilstaat.'); step(1);
  assert.match(gw.messages.join(' '), /Stap uit als het voertuig bijna stilstaat/);
  assert.equal(N.handleEvent(hw, { k: 'melding', tekst: 'x' }, 1), false);
  assert.equal(N.handleEvent(gw, { k: 'melding', tekst: 42 }, 0), false, 'alleen tekst');
  N.stopCoopNet(hw); assert.equal(hw.coopMeld, null); assert.equal(hw.coopWielSlot, null);
});
t('de knoppen van de gast: Spatie is alleen handrem als hij het stuur heeft', () => {
  const { hw, gw, step } = sessie();
  const v = { x: 5, y: 5, speed: 0 }; hw.player.inVehicle = v; hw.coopFigures[1].inVeh = v; step(1); // (#516) de gast is de figuur op plek 1
  gw.input = { axis: () => [0, -1], isDown: (k) => k === ' ', wasPressed: () => false };
  step(1); assert.equal(gw.coopNet.session.pendingInput.buttons & 2, 0, 'zonder stuur geen handrem (Spatie springt te voet)');
  gw.coopWiel = true; step(1); assert.equal(gw.coopNet.session.pendingInput.buttons & 2, 2);
});
t('lokale activiteiten van een gast: hengelen, pannenkoeken en de beiaard; de rest blijft bij wie het spel opende', () => {
  for (const id of ['hengelen', 'pannenkoek', 'carillon', 'boeren']) assert.equal(G.activiteitMagLokaal(id), true, id);
  for (const id of ['discgolf', 'pitchputt', 'skatepark', 'kartbaan', 'zwembad', 'klimtoren', 'waterski', 'vliegschool', 'kermis', 'carbid', 'snackketen']) assert.equal(G.activiteitMagLokaal(id), false, id);
  assert.equal(G.MELDING_ALLEEN_OPENER, 'Alleen bij wie het spel opende; doe intussen je eigen ding.');
  assert.doesNotMatch(G.MELDING_ALLEEN_OPENER, /gastheer|host/i);
});
t('het bezig-bericht is klein en zegt alleen een bekende activiteit; een onbekende telt als niets', () => {
  assert.deepEqual(G.bezigEvent('hengelen'), { k: 'bezig', a: 'hengelen' });
  assert.deepEqual(G.bezigEvent('boeren'), { k: 'bezig', a: 'boeren' });
  assert.deepEqual(G.bezigEvent(null), { k: 'bezig', a: null });
  assert.deepEqual(G.bezigEvent('discgolf'), { k: 'bezig', a: null });
  assert.ok(JSON.stringify(G.bezigEvent('pannenkoek')).length < 40);
});
t('de tabel kent hengelen, boerderij en minigames en noemt geen gastheer', () => {
  const ids = G.GAST_REGELS.map((r) => r.actie);
  for (const k of ['hengelen', 'boerderij', 'minigames']) assert.ok(ids.includes(k), k);
  assert.equal(G.GAST_REGELS.find((r) => r.actie === 'hengelen').mag, 'ja');
  assert.equal(G.GAST_REGELS.find((r) => r.actie === 'boerderij').mag, 'ja', 'de klus op je eigen akker kan lokaal');
  for (const r of G.GAST_REGELS) assert.doesNotMatch(r.regel, /gastheer|host/i, r.actie);
});
console.log(`coopgast_test: ${n}/${n} ok`);
