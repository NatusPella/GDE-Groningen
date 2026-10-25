// Samen spelen, de gaten van het nalopen voor vrijdag 23-10 (#365, #367, #369, #371), zonder Electron:
//   node scripts/coopgaten_test.mjs
// - #365 beloning: elke plek waar de gastheer geld verdient deelt met de gasten (haken in de bron), de helft per gast,
//   afronding, maximum, wie weg is of later komt, en alleen de gastheer mag betalen
// - #369 neergeslagen en gepakt: de momentopname zegt wie neer is, de melding komt één keer per overgang
// - #371 gelukt of mislukt: ook bij knock-out, arrestatie en afbreken, met het deel van de gast in de tekst
// - #367 roepjes: toetsen, geluid bij de ontvanger, een afzender kan zich niet voor een ander uitgeven, een eigen
//   afkoeltijd per afzender, het maximum, en de tekenaars (wereld, minimap, kaart) lezen dezelfde markeringen
// - elke eis ook met 8 en 16 spelers (MAX_PLAYERS in net/codec.js), en een 17e speler wordt netjes geweigerd
// De meerspelertest met echte TCP-verbindingen staat in scripts/coop/gaten_tcp_test.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { PING_TOETSEN, PING_TEKST, pingRegel } from '../game/js/coopping.js';
import { PING_MAX, PING_COOLDOWN } from '../game/js/partnerhud.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });

function avond(gasten = 3, hostExtra, max) {
  const hw = mkWorld(hostExtra), gs = [];
  N.startHost(hw, INFO, { seed: 5, max });
  const sluit = (i, wens) => {
    const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 11 + i * 7 });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, { wens });
    const g = { gw, link }; gs.push(g); return g;
  };
  for (let i = 0; i < gasten; i++) sluit(i, i === 1 ? 'bram' : i === 2 ? 'lotte' : undefined);
  const step = (secs) => { for (let k = 0; k < Math.round(60 * secs); k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step, sluit };
}
const aantal = (w, re) => w.messages.filter((m) => re.test(m)).length;

// ------------------------------------------------------------------ #365
t('#365: elke plek waar de gastheer geld verdient deelt het met de gasten (haken in de bron)', () => {
  const eisen = { 'missions.js': 2, 'sidejobs.js': 1, 'carbid.js': 1, 'driftzone.js': 1, 'kermis.js': 1, 'padel.js': 1, 'postgame.js': 1, 'machinist.js': 1 };
  // een plek deelt via world.coopDeel(...) zelf, of via loopbaanVerdien(...) (loopbaanlive.js roept coopDeel aan, #381)
  for (const [f, min] of Object.entries(eisen)) assert.ok((bron(f).match(/world\.coopDeel\(|w\.coopDeel\(|loopbaanVerdien\(/g) || []).length >= min, `${f} roept coopDeel aan (${min}x)`);
  assert.match(bron('coopnet.js'), /world\.coopDeel = \(bedrag(, info)?\) => deelMetGasten/, 'de gastheer zet de haak bij startHost');
  assert.match(bron('coopnet.js'), /world\.coopDeel = null/, 'en haalt hem weg bij het stoppen');
});

t('#365, #452: het volle bedrag per meespelende gast; een bedrag van 1 geeft niets; het maximum geldt per uitbetaling', () => {
  const s = avond(3); s.step(3);
  assert.equal(N.deelMetGasten(s.hw, 5), 3, 'drie gasten betaald'); s.step(1);
  assert.deepEqual(s.gs.map((g) => g.gw.money), [5, 5, 5], 'elke gast het volle bedrag');
  assert.equal(N.deelMetGasten(s.hw, 0), 0); assert.equal(N.deelMetGasten(s.hw, -50), 0); assert.equal(N.deelMetGasten(s.hw, NaN), 0);
  N.deelMetGasten(s.hw, 5e6); s.step(1);
  assert.deepEqual(s.gs.map((g) => g.gw.money), [5 + N.MAX_REWARD, 5 + N.MAX_REWARD, 5 + N.MAX_REWARD], 'niet meer dan het maximum per keer');
  assert.deepEqual(s.gs.map((g) => g.gw.coopVerdiend), [5 + N.MAX_REWARD, 5 + N.MAX_REWARD, 5 + N.MAX_REWARD], 'bijgehouden voor de eigen save');
  assert.equal(aantal(s.gs[0].gw, /^Beloning: €5$/), 1, 'de gast leest wat hij kreeg');
});

t('#365: wie later aansluit krijgt het eerdere geld niet; wie vertrekt krijgt niets meer; zonder sessie is er geen haak', () => {
  const s = avond(2); s.step(3);
  s.hw.coopDeel(400); s.step(1);
  const laat = s.sluit(2, 'lotte'); s.step(3);
  assert.equal(laat.gw.money, 0, 'de late speler begint met zijn eigen geld');
  s.hw.coopDeel(400); s.step(1);
  assert.deepEqual([...s.gs.map((g) => g.gw.money)], [800, 800, 400], 'het volle bedrag, elke keer 400');
  N.stopCoopNet(s.gs[1].gw); s.step(3);
  s.hw.coopDeel(400); s.step(1);
  assert.equal(s.gs[1].gw.money, 800, 'wie vertrokken is houdt wat hij had');
  assert.equal(s.gs[0].gw.money, 1200);
  N.stopCoopNet(s.hw);
  assert.equal(s.hw.coopDeel, null, 'na het stoppen deelt de gastheer niets meer uit (solo spelen blijft gewoon)');
  assert.equal(N.deelMetGasten(s.hw, 100), 0);
});

t('#365: alleen de gastheer mag betalen; onzin in een beloning wordt genegeerd', () => {
  const s = avond(2); s.step(3);
  assert.equal(N.handleEvent(s.hw, { k: 'beloning', geld: 999 }), false, 'de gastheer luistert er niet naar');
  const g = s.gs[0].gw;
  for (const geld of [0, -5, NaN, 'veel', null, undefined, Infinity]) assert.equal(N.handleEvent(g, { k: 'beloning', geld }), false, 'geen geld: ' + geld);
  assert.equal(g.money, 0);
  assert.equal(N.payGuest(g, 100), false, 'een gast kan niemand betalen');
  assert.equal(N.deelMetGasten(g, 100), 0);
});

// ------------------------------------------------------------------ #369
t('#369: de momentopname zegt wie neer is (gastheer, Tessa), met echte gezondheid en een eigen down-vlag', () => {
  const s = avond(3); s.step(2);
  const sim = N.hostSim(s.hw, () => s.hw.coopNet.hub.roster);
  const rij = () => Object.fromEntries(sim.snapshot().players.map((p) => [p.slot, p]));
  const alive = () => Object.fromEntries(Object.entries(rij()).map(([k, p]) => [k, p.alive]));
  const down = () => Object.fromEntries(Object.entries(rij()).map(([k, p]) => [k, p.down]));
  assert.deepEqual(alive(), { 0: true, 1: true, 2: true, 3: true });
  assert.deepEqual(down(), { 0: false, 1: false, 2: false, 3: false }, 'niemand ligt neer');
  assert.equal(rij()[0].health, 100, 'zonder waarde is de gezondheid van de gastheer 100');
  s.hw.health = 40; s.hw.companion.health = 55; s.step(1);
  assert.equal(rij()[0].health, 40, 'de gastheer stuurt zijn echte gezondheid mee');
  assert.equal(rij()[1].health, 55, 'en die van Tessa');
  assert.equal(rij()[2].health, 100, 'een extra speler zonder gezondheid valt terug op 100');
  s.hw.pendingRespawn = { busted: false }; assert.equal(alive()[0], false, 'de gastheer is neergeslagen');
  s.hw.pendingRespawn = null; s.hw.player.ragdoll = { dead: false };
  assert.deepEqual([alive()[0], down()[0]], [true, true], 'een ragdoll is neer, maar niet dood');
  s.hw.player.ragdoll = null; assert.equal(down()[0], false, 'weer rechtop');
  s.hw.companion.ragdoll = { dead: false };
  assert.deepEqual([alive()[1], down()[1]], [true, true], 'Tessa ligt achterover');
  s.hw.companion.ragdoll = null; s.hw.companion.state = 'dead';
  assert.deepEqual([alive()[1], down()[1]], [false, false], 'dood of gepakt telt als alive:false, niet als down');
  assert.equal(alive()[0], true); assert.equal(alive()[2], true);
});

t('#369: één melding per overgang, voor iedereen; Tessa hoort alleen haar eigen; niets zolang de toestand gelijk blijft', () => {
  const s = avond(3); s.step(2);
  s.hw.pendingRespawn = { busted: true }; s.step(3);
  for (const g of s.gs) assert.equal(aantal(g.gw, /Tammo is door de politie gepakt/), 1, 'precies één keer, ook na 3 s');
  s.hw.pendingRespawn = null; s.step(1);
  s.hw.pendingRespawn = { busted: false }; s.step(2);
  for (const g of s.gs) assert.equal(aantal(g.gw, /Tammo is neergeslagen/), 1);
  s.hw.pendingRespawn = null; s.step(1);
  s.hw.companion.state = 'dead'; s.step(3);
  assert.equal(aantal(s.gs[0].gw, /Je bent geraakt\. Je staat zo weer op\./), 1);
  for (const i of [1, 2]) {
    assert.equal(aantal(s.gs[i].gw, /Je bent geraakt/), 0, 'de anderen krijgen Tessa\'s eigen regel niet');
    assert.equal(aantal(s.gs[i].gw, /Tessa is neergeslagen\./), 1, 'plek 2 en 3 horen dat Tessa neer is');
  }
  assert.equal(aantal(s.hw, /Tessa is neergeslagen\./), 1, 'de gastheer lokaal, ook maar één keer');
  assert.equal(s.hw.coopPartners.find((p) => p.naam === 'Tessa').status, 'neer', 'het label van de gastheer');
  for (const i of [1, 2]) assert.equal(s.gs[i].gw.coopPartners.find((p) => p.naam === 'Tessa').status, 'neer', 'en dat van de andere gasten');
  s.hw.companion.state = 'alive'; s.step(2);
  assert.equal(aantal(s.gs[0].gw, /Je staat weer\./), 1);
  assert.equal(aantal(s.gs[1].gw, /Tessa staat weer\./), 1);
  assert.equal(s.hw.coopPartners.find((p) => p.naam === 'Tessa').status, 'voet', 'het label toont weer de juiste status');
  assert.equal(aantal(s.hw, /Tammo is (neergeslagen|door de politie gepakt)/), 0, 'de gastheer krijgt geen netbericht over zichzelf');
});

t('#369: een ragdoll telt ook als neer; één regel per overgang, niet elke tik, en een late gast ziet de toestand', () => {
  const s = avond(3); s.step(2);
  s.hw.health = 65; s.hw.player.ragdoll = { dead: false }; s.step(2);
  for (const g of s.gs) assert.equal(aantal(g.gw, /Tammo is neergeslagen/), 1, 'de gasten horen het één keer, ook zonder arrestatie');
  for (const g of s.gs) assert.deepEqual([g.gw.companion.coopDown, g.gw.companion.health], [true, 65], 'de gast neemt down en de echte gezondheid over op het lichaam (#369)');
  assert.equal(aantal(s.hw, /Tammo is neergeslagen/), 0);
  s.hw.player.ragdoll = null; s.step(1);
  for (const g of s.gs) assert.equal(g.gw.companion.coopDown, false, 'opstaan: de figuur staat weer recht');
  s.hw.player.ragdoll = { dead: false }; s.step(1);
  for (const g of s.gs) assert.equal(aantal(g.gw, /Tammo is neergeslagen/), 2, 'opnieuw neer: weer precies één regel');
  s.hw.player.ragdoll = null; s.step(1);
  // Tessa's ragdoll: plek 1 hoort haar eigen regel, de rest de hare, de gastheer lokaal
  s.hw.companion.ragdoll = { dead: false }; s.step(2);
  assert.equal(aantal(s.gs[0].gw, /Je bent geraakt\. Je staat zo weer op\./), 1);
  for (const i of [1, 2]) assert.equal(aantal(s.gs[i].gw, /Tessa is neergeslagen\./), 1);
  assert.equal(aantal(s.hw, /Tessa is neergeslagen\./), 1);
  assert.equal(aantal(s.hw, /Tammo is neergeslagen/), 0, 'en de gastheer hoort niets over zichzelf');
  // een late gast ziet de toestand in de eerstvolgende snapshot, ook zonder de melding van de overgang
  const laat = s.sluit(2, 'lotte'); s.step(3);
  const p1 = laat.gw.coopPartners.find((p) => p.slot === 1);
  assert.equal(p1 && p1.status, 'neer', 'de late gast ziet de neergeslagen Tessa');
  assert.equal(aantal(laat.gw, /Tessa is neergeslagen\./), 0, 'zonder de melding van de overgang');
});

// ------------------------------------------------------------------ #371
t('#371: gelukt met het deel van de gast; zonder loon geen deel in de tekst; mislukt met reden; lange teksten worden afgekapt', () => {
  const s = avond(3); s.step(2);
  s.hw.coopUitslag(true, 'Het Loket', '', 401); s.step(1);
  for (const g of s.gs) assert.match(g.gw.messages.join(' '), /Het Loket gelukt! Tammo en jij hebben het samen gedaan\. Jouw deel: €401\./); // het volle bedrag (#452)
  s.hw.coopUitslag(true, 'De Proef', '', 0); s.step(1);
  assert.match(s.gs[0].gw.messages.join(' '), /De Proef gelukt! Tammo en jij hebben het samen gedaan\.$/m, 'zonder loon geen deel');
  s.hw.coopUitslag(false, 'De Kluis', 'Te laat', 900); s.step(1);
  for (const g of s.gs) { const m = g.gw.messages.find((x) => /De Kluis/.test(x)); assert.match(m, /^De Kluis mislukt: Te laat\. Tammo probeert het misschien opnieuw\.$/); assert.doesNotMatch(m, /deel/, 'bij mislukt geen deel'); }
  // een gast die N zei hoort een mislukking ook als mislukking, niet als "zonder jou gedaan" (#371)
  s.gs[0].gw.coopMeedoenNee = true;
  s.hw.coopUitslag(false, 'Het Proefbeleg', 'neergeslagen', 0); s.step(1);
  const nee = s.gs[0].gw.messages.filter((m) => /Het Proefbeleg/.test(m)).pop();
  assert.match(nee, /^Het Proefbeleg mislukt: neergeslagen\. Tammo deed het zonder jou\.$/);
  assert.doesNotMatch(nee, /zonder jou gedaan/);
  s.hw.coopUitslag(false, 'X'.repeat(300), 'y'.repeat(300)); s.step(1);
  assert.ok(s.gs[0].gw.messages.every((m) => m.length <= 160), 'korte meldingen');
  assert.equal(s.gs[0].gw.coopUitslag, undefined, 'een gast heeft de haak niet');
  assert.equal(N.uitslagMelden(s.gs[0].gw, true, 'x', '', 100), false, 'een gast meldt niets');
  assert.equal(N.handleEvent(s.gs[0].gw, { k: 'uitslag', ok: true }), false, 'zonder naam van de opdracht negeren');
});

t('#371: ook bij knock-out, arrestatie en afbreken horen de gasten het (failActiveMission in missions.js)', () => {
  const m = bron('missions.js');
  const f = m.slice(m.indexOf('export function failActiveMission'), m.indexOf('function speakerName'));
  assert.match(f, /world\.coopUitslag\(false, def\.label,/, 'failActiveMission meldt de uitslag');
  assert.ok(f.indexOf('coopUitslag') < f.indexOf('endInFailure'), 'voordat de opdracht wordt opgeruimd');
  assert.match(m, /busted \? 'opgepakt door de politie' : 'neergeslagen'/, 'de reden is voor de gasten leesbaar');
  assert.match(m, /world\.coopUitslag\(true, def\.label, '', reward\)/, 'gelukt');
  assert.match(m, /world\.coopUitslag\(false, def\.label, pretty\)/, 'mislukt');
  const s = avond(2); s.step(2);
  s.hw.coopUitslag(false, 'Het Loket', 'opgepakt door de politie'); s.step(1);
  assert.match(s.gs[0].gw.messages.join(' '), /Het Loket mislukt: opgepakt door de politie\./);
});

// ------------------------------------------------------------------ #390
t('#390: de gastheer stopt een missie, de gasten horen dat het gestopt is (geen mislukking), met 3, 8 en 16 spelers', () => {
  for (const gasten of [3, 7, 15]) {
    const s = avond(gasten, undefined, gasten + 1); s.step(2);
    assert.equal(s.hw.coopUitslag(false, 'Het proefbeleg', '', 0, true), true, 'de gastheer meldt het');
    s.step(1);
    for (const g of s.gs) {
      const m = g.gw.messages.find((x) => /Het proefbeleg/.test(x));
      assert.match(m, /^Tammo heeft Het proefbeleg gestopt, voor iedereen\. Tammo kan hem opnieuw starten\.$/, 'de gast hoort het');
      assert.doesNotMatch(m, /mislukt/, 'gestopt is geen mislukking');
    }
  }
  assert.equal(N.uitslagMelden(avond(1).gs[0].gw, false, 'x', '', 0, true), false, 'een gast kan niet voor iedereen stoppen');
});

t('#390: Missie stoppen (missions.js, safety.js, pausemenu.js, todoui.js): eerst de vraag, geen mislukking, opnieuw te starten', () => {
  const m = bron('missions.js');
  const f = m.slice(m.indexOf('export function cancelActiveMission'), m.indexOf('function speakerName'));
  assert.ok(f.length > 100, 'cancelActiveMission bestaat');
  assert.match(f, /chain\.phase !== 'active'\) return false/, 'alleen een lopende missie');
  assert.match(f, /chain\.checkpoints\.delete\(i\)/, 'een nieuwe poging begint bij de eerste stap (geen checkpoint)');
  assert.match(f, /world\.coopUitslag\(false, def\.label, '', 0, true\)/, 'de gasten horen het');
  assert.ok(f.indexOf('coopUitslag') < f.indexOf('endInFailure'), 'voordat de missie wordt opgeruimd');
  assert.match(f, /endInFailure\(world,/, 'alles wordt opgeruimd als bij een mislukking (voertuig, scène, duif, heli) en de nieuwe poging staat klaar');
  assert.doesNotMatch(f, /playMissionFailed|playStoryFail|hooks\.failed/, 'geen Sikkom-scherm, geen mislukking in het verhaal, geen hulpaanbod');
  assert.doesNotMatch(f, /reward|money|payMedal|markMissionCompleted/, 'geen beloning, geen geld, niet als gehaald gemarkeerd');
  const sf = bron('safety.js');
  assert.match(sf, /cancelMission: \(\) => cancelMission\(w\)/, 'world.safetyActions.cancelMission');
  assert.match(sf, /cancelActiveMission\(w\)/, 'safety roept cancelActiveMission aan');
  const pm = bron('pausemenu.js');
  assert.match(pm, /a === 'mission-stop-go'[\s\S]{0,120}cancelMission\(\)/, 'pas na Ja, stoppen wordt gestopt');
  assert.doesNotMatch(pm, /mission-abort|Missie afbreken/, 'de oude knop zonder vraag is weg');
  assert.match(pm, /a === 'mission-stop' \|\| a === 'mission-stop-no'/, 'de knop en Nee gaan naar de vraag');
  assert.match(pm, /if \(stop && !stop\.hidden\)/, 'Esc sluit eerst de vraag');
  const td = bron('todoui.js');
  for (const tekst of ['Missie stoppen', 'Missie stoppen?', 'Ja, stoppen', 'Nee, doorgaan', 'Missie bezig']) assert.ok(td.includes(tekst), tekst + ' in het menu');
  assert.match(td, /data-stop-confirm hidden/, 'de vraag staat dicht tot je op de knop drukt');
  assert.match(bron('helpoverview.js'), /Missie stoppen/, 'de uitleg noemt de nieuwe knop');
  const cn = bron('coopnet.js');
  assert.match(cn, /world\.coopUitslag = \(ok, label, reden, loon, gestopt, id\) => uitslagMelden\(world, ok, label, reden, loon, gestopt, /, 'de haak geeft gestopt en de groep door');
});

// ------------------------------------------------------------------ #492
t('#492: de machinist betaalt elk crewlid één keer; de conducteur bedient O en K via de host', () => {
  const m = bron('machinist.js');
  assert.ok(m.includes("import { loopbaanVerdien, loopbaanDeel } from './loopbaanlive.js'"), 'de gastheer verdient en deelt');
  assert.match(m, /deel: false/, 'de gastheer deelt niet via loopbaanVerdien: geen dubbele betaling');
  assert.match(m, /splitReward\(crew, pay\)/, 'de slots komen uit treincoop.splitReward');
  assert.match(m, /world\.coopDeel\(betaald, \{ \.\.\.loopbaanDeel\('trein', pay, xp\), slots \}\)/, 'één coopDeel met de crew-slots');
  assert.match(m, /world\.coopTreinDeur/, 'de deurvlag van de conducteur');
  const blok = m.slice(m.indexOf('if (!svc.paid)'));
  assert.equal((blok.match(/dienstBeloning\(/g) || []).length, 1, 'één betaling per dienst');
  const td = bron('traindrive.js');
  assert.match(td, /world\.coopTreinWaak/, 'de waakvlag van de conducteur');
  assert.match(td, /ack: input\.wasPressed\('k'\) \|\| waakGast/, 'K telt mee als de conducteur hem indrukt');
  const cg = bron('coopgastlokaal.js');
  assert.match(cg, /gastTrein\(world, 'deur'\)/);
  assert.match(cg, /gastTrein\(world, 'waak'\)/);
  const cn = bron('coopnet.js');
  assert.match(cn, /treinMay\(crew, van, body\.a === 'deur' \? 'deuren' : 'waak'\)/, 'de host controleert de rol');
  assert.match(cn, /world\.coopTreinDeur = true/, 'en zet de deurvlag');
});

// ------------------------------------------------------------------ #367
t('#367: drie toetsen, korte Nederlandse teksten, ook op de controller', () => {
  assert.deepEqual(PING_TOETSEN.map((k) => [k.toets, k.tekst]), [['7', 'Kom hier'], ['8', 'Help!'], ['9', 'Kijk daar']]);
  assert.ok(PING_TOETSEN.every((k) => k.tekst.length <= 12), 'kort');
  const c = bron('controls.js');
  for (const k of ['7', '8', '9']) assert.match(c, new RegExp(`\\['${k}', 'Samen spelen:`), 'in de lijst met toetsen: ' + k);
  assert.ok(c.includes("foot: { left: '7', down: '8', right: '9' }"), 'D-pad links, onder en rechts');
});

t('#367: de ontvanger hoort een bestaand geluidje en leest de regel; de afzender hoort niets extra; elke afzender heeft een eigen afkoeltijd', () => {
  const s = avond(3); s.step(3);
  const [tessa, bram, lotte] = s.gs.map((g) => g.gw);
  for (const w of [s.hw, tessa, bram, lotte]) w.audioEvents = [];
  bram.player.x = 20; bram.player.y = 5; bram.input.s.add('7'); s.step(1);
  assert.equal(bram.audioEvents.length, 0, 'wie roept, hoort zijn eigen geluidje niet');
  for (const w of [s.hw, tessa, lotte]) { assert.deepEqual(w.audioEvents.map((e) => e.kind), ['notify'], 'één geluidje bij ' + w.player.character); assert.match(w.messages.join(' '), /Bram: Kom hier/); }
  tessa.player.x = -10; tessa.input.s.add('8'); s.step(0.3);
  assert.equal(s.hw.coopPingMarks.length, 2, 'Bram en Tessa riepen samen: beide staan er (eigen afkoeltijd per afzender)');
  assert.deepEqual(s.hw.coopPingMarks.map((m) => m.naam).sort(), ['Bram', 'Tessa']);
  bram.input.s.add('9'); s.step(0.3);
  assert.equal(s.hw.coopPingMarks.length, 2, 'Bram riep te snel');
  assert.ok(PING_COOLDOWN > 0.3);
});

t('#367: een gast kan zich niet voor een ander uitgeven; onzin en een te volle lijst', () => {
  const s = avond(3); s.step(3);
  const [tessa, bram, lotte] = s.gs.map((g) => g.gw);
  bram.coopNet.session.sendEvent({ k: 'ping', x: 3, y: 4, soort: 'hier', van: 3 }); s.step(1);
  assert.equal(lotte.coopPingMarks.length, 1); assert.equal(lotte.coopPingMarks[0].naam, 'Bram', 'de gastheer zet de echte afzender erop');
  assert.equal(tessa.coopPingMarks[0].naam, 'Bram');
  for (const body of [{ k: 'ping', x: NaN, y: 0 }, { k: 'ping', x: 1e9, y: 0 }, { k: 'ping', x: 'a', y: 0 }, { k: 'ping' }]) assert.equal(N.handleEvent(s.hw, body, 2), false);
  assert.equal(pingRegel(2, 'onzin', [], 0), 'Kom hier', 'een onbekende soort wordt Kom hier');
  const w = mkWorld(); N.startHost(w, INFO, { seed: 1 });
  for (let i = 0; i < PING_MAX + 3; i++) { w.time = i * 2; N.handleEvent(w, { k: 'ping', x: i, y: 0, soort: 'hier' }, 1 + (i % 2)); w.time += 0.1; }
  assert.ok(w.coopPings.lijst.length <= PING_MAX, 'nooit meer dan ' + PING_MAX);
  assert.deepEqual(Object.keys(PING_TEKST).sort(), ['doel', 'gevaar', 'hier']);
});

t('#367: wereld, minimap en kaart tekenen dezelfde markeringen', () => {
  assert.match(bron('hud_panel.js'), /world\.coopPingMarks/, 'minimap');
  assert.match(bron('mapview.js'), /world\.coopPingMarks/, 'kaart');
  assert.match(bron('cooppings3d.js'), /world\.coopPingMarks/, 'baken in de wereld');
  assert.match(bron('main.js'), /syncPings\(world\)/, 'elke frame');
});

// ------------------------------------------------------------------ meer dan vier spelers
for (const spelers of [8, 16]) {
  t(`${spelers} spelers: beloning, neergaan, uitslag en roepjes werken voor iedereen`, () => {
    const s = avond(spelers - 1, undefined, spelers); s.step(4);
    const gw = s.gs.map((g) => g.gw);
    assert.equal(s.hw.coopRoster.length, spelers); assert.ok(gw.every((w) => w.coopRoster.length === spelers && w.coopPartners.length === spelers - 1 && w.coopNet.session.status === 'ok'), 'iedereen ziet iedereen');
    assert.equal(new Set(s.hw.coopRoster.map((r) => r.naam)).size, spelers, 'ieder een eigen naam');
    assert.equal(new Set(s.hw.coopRoster.map((r) => r.kleur)).size, spelers, 'en een eigen kleur');
    // #365
    assert.equal(N.deelMetGasten(s.hw, 1001), spelers - 1); s.step(1.5);
    assert.ok(gw.every((w) => w.money === 1001 && w.coopVerdiend === 1001), 'elke gast het volle bedrag (#452)');
    // #371
    s.hw.coopUitslag(true, 'Het Loket', '', 1000); s.hw.coopUitslag(false, 'De Kluis', 'neergeslagen', 0); s.step(1.5);
    for (const w of gw) { assert.match(w.messages.join(' '), new RegExp(`Het Loket gelukt! Tammo en jij hebben het samen gedaan. Jouw deel: €1.000.`)); assert.match(w.messages.join(' '), /De Kluis mislukt: neergeslagen/); }
    // #369
    s.hw.pendingRespawn = { busted: true }; s.step(1.5);
    for (const w of gw) { assert.equal(aantal(w, /Tammo is door de politie gepakt/), 1); assert.equal(w.coopPartners.find((p) => p.naam === 'Tammo').status, 'neer'); }
    s.hw.pendingRespawn = null; s.hw.companion.state = 'dead'; s.step(1.5);
    assert.equal(aantal(gw[0], /Je bent geraakt/), 1); assert.equal(gw.slice(1).filter((w) => aantal(w, /Je bent geraakt/)).length, 0, 'alleen Tessa hoort dat');
    assert.ok(gw.slice(1).every((w) => w.coopPartners.find((p) => p.naam === 'Tessa').status === 'neer'));
    s.hw.companion.state = 'alive'; s.step(1);
    // #367: iedereen roept tegelijk en elke speler ziet alle anderen (en zichzelf) terug op de kaart
    for (const w of [s.hw, ...gw]) { w.audioEvents = []; w.messages.length = 0; w.input.s.add('7'); }
    s.step(2);
    for (const w of [s.hw, ...gw]) {
      assert.equal(w.coopPingMarks.length, spelers, 'een baken per speler bij ' + w.player.character);
      assert.equal(new Set(w.coopPingMarks.map((m) => m.naam)).size, spelers, 'elk met een eigen naam');
      assert.equal(w.audioEvents.length, spelers - 1, 'een pling per ander, niet voor jezelf');
    }
    assert.equal(aantal(gw[spelers - 2], /^(?!Je riep)[^:]+: Kom hier$/), spelers - 1, 'en een regel per ander');
    s.step(10); assert.ok([s.hw, ...gw].every((w) => w.coopPingMarks.length === 0), 'na een tijdje weer weg');
  });
}

t('een 17e speler wordt netjes geweigerd en de rest merkt niets', () => {
  const s = avond(15, undefined, 16); s.step(4);
  assert.equal(s.hw.coopRoster.length, 16);
  const extra = s.sluit(15, 'daan'); s.step(4);
  assert.equal(s.hw.coopRoster.length, 16, 'de lijst blijft 16');
  assert.equal(extra.gw.coopNet, null, 'de 17e speelt weer in zijn eigen spel'); assert.ok(extra.gw.coopWeigering, 'met een reden: ' + extra.gw.coopWeigering);
  assert.ok(s.gs.slice(0, 15).every((g) => g.gw.coopNet && g.gw.coopNet.session.status === 'ok'));
  s.hw.coopDeel(100); s.step(1);
  assert.ok(s.gs.slice(0, 15).every((g) => g.gw.money === 100) && extra.gw.money === 0, 'wie geweigerd is krijgt niets');
  assert.equal(N.setMaxPlayers(s.hw, 99), 16, 'het maximum is 16');
});

console.log(`coopgaten_test: ${n}/${n} ok`);
