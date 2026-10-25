// Samen spelen (#429, #434): een gast die hengelt is zichtbaar voor de anderen, een late gast krijgt de uitnodiging, twee gezochte spelers,
// een gast met een wapen en het filmpje bij aansluiten (game/js/coopbezig.js, coopmeedoen.js, coopgezocht.js, coopbestuur.js, coopnet.js).
import assert from 'node:assert/strict';
import * as Z from '../game/js/coopbezig.js';
import * as M from '../game/js/coopmeedoen.js';
import * as G from '../game/js/coopgezocht.js';
import * as B from '../game/js/coopbestuur.js';
import * as N from '../game/js/coopnet.js';
import * as AR from '../game/js/pvparena.js';
import * as PW from '../game/js/cooppvpwereld.js';
import { createLink } from '../game/js/net/memtransport.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('bezig: alleen bekende activiteiten, een wisseling telt, null ruimt op', () => {
  const w = {};
  assert.equal(Z.zetBezig(w, 1, 'hengelen'), true); assert.equal(Z.zetBezig(w, 1, 'hengelen'), false, 'geen wisseling');
  assert.equal(Z.zetBezig(w, 2, 'discgolf'), false, 'onbekend telt als niets'); assert.deepEqual(Object.keys(w.coopBezigVan), ['1']);
  assert.equal(Z.zetBezig(w, 1, null), true); assert.deepEqual(w.coopBezigVan, {});
  assert.equal(Z.zetBezig(w, -1, 'hengelen'), false);
  assert.equal(Z.bezigId('boeren'), 'boeren'); assert.equal(Z.BEZIG_BEELD.boeren, 'hark');
  assert.deepEqual(Z.bezigVanEvent(3, 'boeren'), { k: 'bezigvan', slot: 3, a: 'boeren' });
  assert.deepEqual(Z.bezigVanEvent(2, 'pannenkoek'), { k: 'bezigvan', slot: 2, a: 'pannenkoek' });
  assert.deepEqual(Z.leesBezigVan({ k: 'bezigvan', slot: 2, a: 'carillon' }), { slot: 2, a: 'carillon' });
  assert.equal(Z.leesBezigVan({ k: 'bezigvan', slot: 'x', a: 'carillon' }), null);
  assert.ok(JSON.stringify(Z.bezigVanEvent(3, 'carillon')).length < 50);
});
t('bezigLijst: de figuur van de ander, niet je eigen, niet in een voertuig; hengel, pan en klepels', () => {
  const w = { player: { x: 0, y: 0 }, companion: { x: 3, y: 4, angle: 1 }, coop: { remote: true }, coopFigures: { 2: { slot: 2, x: 9, y: 9, angle: 0, char: 'a' }, 3: { slot: 3, x: 1, y: 1, char: 'b', coopVoertuig: true }, 4: { slot: 4, x: 6, y: 6, char: 'c' } } };
  Z.zetBezig(w, 1, 'hengelen'); Z.zetBezig(w, 2, 'pannenkoek'); Z.zetBezig(w, 3, 'carillon'); Z.zetBezig(w, 4, 'boeren');
  const host = Z.bezigLijst(w, 0);
  assert.deepEqual(host.map((b) => [b.slot, b.beeld]), [[1, 'hengel'], [2, 'pan'], [4, 'hark']], 'plek 3 zit in een voertuig');
  assert.equal(host[0].x, 3); assert.equal(host[0].angle, 1);
  const gast2 = Z.bezigLijst({ ...w, coopFigures: { ...w.coopFigures, 1: { slot: 1, x: 5, y: 5, char: 'anita' } } }, 2);
  assert.deepEqual(gast2.map((b) => b.slot), [1, 4], 'je eigen plek (2) tekent je eigen scherm, plek 3 zit in een voertuig');
  Z.tikBezig(w, 1.5); assert.equal(Z.bezigLijst(w, 0)[0].t, 1.5);
  assert.equal(Z.hengelFase(0.2), 'cast'); assert.equal(Z.hengelFase(2), 'wait');
  const p = Z.eenvoudigePose('klepels', 0.3); assert.ok(p.links >= 0 && p.rechts >= 0 && (p.links === 0 || p.rechts === 0), 'om en om');
  assert.ok(Number.isFinite(Z.eenvoudigePose('hark', 4).hark), 'de hark haalt heen en weer');
  assert.ok(Number.isFinite(Z.eenvoudigePose('pan', 5).pan));
});

// ---- over het net
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function host() {
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 3 });
  const links = [], gasten = [];
  const voegToe = () => { const link = createLink({ latency: 0.02, seed: 7 + links.length }); links.push(link); N.addGuest(hw, link.a); const gw = mkWorld(); N.startClient(gw, link.b, INFO, {}); gasten.push(gw); return gw; };
  const step = (s) => { for (let k = 0; k < 60 * s; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gasten) N.tickCoopNet(g, 1 / 60); for (const l of links) l.advance(1 / 60); hw.time += 1 / 60; for (const g of gasten) g.time += 1 / 60; } };
  return { hw, voegToe, step, gasten };
}

t('een hengelende gast: wie het spel opende en de andere gast zien hem; weggaan ruimt op; een late gast hoort het ook', () => {
  const { hw, voegToe, step } = host();
  const g1 = voegToe(), g2 = voegToe(); step(2);
  assert.equal(N.handleEvent(hw, { k: 'bezig', a: 'hengelen' }, 1), true);
  step(1);
  assert.equal(hw.coopBezigVan[1].a, 'hengelen', 'bij wie het spel opende');
  assert.equal(g2.coopBezigVan[1].a, 'hengelen', 'bij de andere gast');
  assert.equal(g1.coopBezigVan && g1.coopBezigVan[1], undefined, 'niet terug naar de gast zelf');
  assert.equal(N.handleEvent(g2, { k: 'bezig', a: 'hengelen' }, 0), false, 'een gast luistert er niet naar');
  assert.equal(N.handleEvent(hw, { k: 'bezig', a: 'hengelen' }, 0), false, 'de host meldt niet via dit bericht');
  const g3 = voegToe(); step(2);
  assert.equal(g3.coopBezigVan[1].a, 'hengelen', 'een late gast ziet wie al hengelt');
  N.handleEvent(hw, { k: 'bezig', a: null }, 1); step(1);
  assert.equal(hw.coopBezigVan[1], undefined); assert.equal(g2.coopBezigVan[1], undefined);
  N.handleEvent(hw, { k: 'bezig', a: 'carillon' }, 1); step(1); assert.ok(g2.coopBezigVan[1]);
  N.stopCoopNet(hw); assert.deepEqual(hw.coopBezigVan, {}, 'na het spel is er niets meer bezig');
});

t('een late gast krijgt de uitnodiging "Meedoen met X?" en weet wat er speelt', () => {
  const { hw, voegToe, step } = host();
  const g1 = voegToe(); step(2);
  hw.mission = { phase: 'active', label: 'Bezorgen', type: 'checkpoint', index: 4, progressText: 'Rij naar de kerk' }; step(1);
  assert.ok(g1.messages.some((m) => /Meedoen met Bezorgen\?/.test(m)));
  const g2 = voegToe(); step(2);
  assert.ok(g2.messages.some((m) => /Bezorgen/.test(m) && !/Meedoen met/.test(m)), 'melding wat er speelt: ' + JSON.stringify(g2.messages));
  assert.ok(g2.messages.some((m) => /Meedoen met Bezorgen\? J = ja, N = nee/.test(m)), 'uitnodiging voor de late gast: ' + JSON.stringify(g2.messages));
  assert.ok(g2.coopUitnodiging, 'J en N werken');
  assert.equal(hw.coopNet.meedoen.keuze[2], 'wacht');
  let eens = true; g2.input.wasPressed = (k) => { if (k === 'n' && eens) { eens = false; return true; } return false; }; step(1);
  assert.equal(hw.coopNet.meedoen.keuze[2], 'nee');
  hw.mission = null; step(1);
  const g3 = voegToe(); step(2); assert.ok(!g3.coopUitnodiging, 'zonder opdracht geen uitnodiging');
});
t('laat(): een gast die al koos wordt niet nogmaals gevraagd; een verplichte rol blijft verplicht', () => {
  const st = M.maakMeedoen();
  assert.equal(M.laat(st, 2), null, 'zonder opdracht');
  M.begin(st, 'x', [1]);
  assert.deepEqual(M.laat(st, 2), { slot: 2, verplicht: false, sec: 10 }); assert.equal(st.keuze[2], 'wacht');
  M.antwoord(st, 2, true); assert.equal(M.laat(st, 2), null);
  assert.equal(M.laat(st, 1) !== null, true, 'wie nog wacht krijgt de uitnodiging opnieuw (bijvoorbeeld na opnieuw aansluiten)');
  const v = M.laat(st, 1, { presence: 'beide' }); assert.equal(v.verplicht, true); assert.equal(st.keuze[1], 'verplicht'); assert.equal(M.laat(st, 1), null);
});

t('twee gezochte spelers: de politie kiest hoogste niveau, dan wie al gejaagd werd, dan de dichtstbijzijnde; verdwijnt het doelwit, dan de volgende', () => {
  const w = { wanted: 0, coopWanted: { 2: 2, 3: 2 }, coopFigures: { 2: { slot: 2, x: 100, y: 0 }, 3: { slot: 3, x: 10, y: 0 } }, vehicles: [{ isPolice: true, x: 0, y: 0 }], pedestrians: [], coopDoelwit: 0 };
  assert.equal(G.kiesDoelwit(w).slot, 3, 'gelijk niveau: het dichtst bij de politie');
  w.coopDoelwit = 2; assert.equal(G.kiesDoelwit(w).slot, 2, 'wie al gejaagd werd blijft doelwit');
  w.coopWanted[3] = 3; assert.equal(G.kiesDoelwit(w).slot, 3, 'hoger niveau wint');
  w.coopWanted[3] = 0; assert.equal(G.kiesDoelwit(w).slot, 2, 'doelwit weg: de ander');
  delete w.coopFigures[2]; assert.equal(G.kiesDoelwit(w), null, 'een gast die weg is telt niet meer');
  const e = { wanted: 2, coopWanted: { 2: 2 }, coopFigures: { 2: { slot: 2, x: 1, y: 0 } }, vehicles: [], pedestrians: [], coopDoelwit: 0 };
  assert.equal(G.kiesDoelwit(e).slot, 0, 'zonder politie in de buurt: de host');
});
t('sterren van een gezochte gast in het scherm van wie het spel opende', () => {
  const w = { wanted: 0, coopWanted: { 1: 3 }, companion: { x: 1, y: 1 }, coop: { remote: true }, coopFigures: {} };
  assert.equal(G.hudWanted(w), 3);
  w.wanted = 4; assert.equal(G.hudWanted(w), 0, 'de host zelf is het doelwit: eigen niveau');
  assert.equal(G.hudWanted({ wanted: 0 }), 0);
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 3 }); hw.coopWanted = { 1: 2 };
  const link = createLink({ latency: 0.02, seed: 7 }); N.addGuest(hw, link.a); const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
  for (let k = 0; k < 180; k++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); }
  assert.equal(hw.coopHudWanted, 2, 'de host ziet twee sterren'); assert.equal(gw.wanted, 2, 'de gast ook');
});

t('een gast met een wapen: zijn aanval is een misdaad van hem (niet van de host)', () => {
  const calls = [];
  B.zetBestuurHaken({ misdaad: (w, slot, kind) => calls.push([slot, kind]) });
  assert.equal(B.gastAanval({}, 2, { isCop: false }), true); assert.equal(B.gastAanval({}, 2, { isCop: false }, { gedood: true }), true);
  assert.equal(B.gastAanval({}, 2, { isCop: true }), true);
  assert.deepEqual(calls, [[2, 'pedHit'], [2, 'pedKill'], [2, 'copHit']]);
  assert.equal(B.gastAanval({}, 0, { isCop: false }), false, 'de host heeft zijn eigen misdaden'); assert.equal(B.gastAanval({}, 2, null), false);
  B.zetBestuurHaken({ misdaad: null });
});

t('canJoin: een filmpje van jezelf is te herkennen (overslaan), herstel niet', () => {
  const k = N.canJoin({ player: { x: 0, y: 0 }, cameraOverride: {} });
  assert.equal(k.ok, false); assert.equal(k.filmpje, true);
  assert.equal(N.canJoin({ player: { x: 0, y: 0 }, cameraOverride: {}, pendingRespawn: true }).filmpje, false);
  assert.equal(N.canJoin({ player: { x: 0, y: 0, ragdoll: true } }).filmpje, false);
  assert.equal(N.canJoin({ player: { x: 0, y: 0 } }).ok, true);
});

// ---- de PvP-arena (#454) laat de bezigheden met rust
t('de PvP-arena raakt de bezigheden van een gast niet: de hengel blijft staan als de arena tikt', () => {
  const w = { time: 10, player: { x: 0, y: 0 }, coopBezigVan: {} };
  Z.zetBezig(w, 2, 'hengelen');
  const ar = AR.maakArena({ x: 0, y: 0 });
  AR.arenaMeld(ar, 0, 'Tammo', false); AR.arenaMeld(ar, 1, 'Tessa', false); AR.arenaStart(ar, 0);
  w.pvpArena = ar;
  PW.pvpArenaTik(w, 0.5);
  assert.equal(w.coopBezigVan[2].a, 'hengelen', 'de hengel blijft');
  assert.equal(w.coopBezigVan[2].t, 0, 'de arena laat de klok van de hengel met rust');
  AR.arenaStop(ar, w.time);
  PW.pvpArenaTik(w, 0.5);
  assert.equal(w.coopBezigVan[2].a, 'hengelen', 'ook bij de uitslag');
  assert.equal(w.pvpArenaUitslag.winnaar, null, 'de stand is 0-0');
});

console.log(`coopbezig_test: ${n}/${n} ok`);
