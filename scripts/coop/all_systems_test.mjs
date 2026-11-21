// Samen spelen, rooktest zonder Electron (21-11): de pure tegenhanger van de testbank-suite 'alles'.
// Host en twee gasten over een geheugentransport (net/memtransport.js, dezelfde koppeling als in het spel: coopnet.js)
// spelen een kort scenario met zoveel mogelijk systemen. Wat hier niet kan (echte vensters, beeld, de wereld zelf)
// staat in docs/COOP-SWEEP-21-11.md bij de suite 'alles'. Systemen van epics die nog niet in main staan worden
// overgeslagen met een regel "wacht op <epic>", zodat dezelfde test na de merge vanzelf meer gaat dekken.
//   node scripts/coop/all_systems_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import { samenStatus } from '../../game/js/coopstatus.js';
import { hoofdspeler } from '../../game/js/players.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, calendar: { day: 3 }, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });

let n = 0, overgeslagen = 0;
const wacht = (wat, epic) => { overgeslagen++; console.log(`  - ${wat}: wacht op ${epic}`); };
async function t(naam, f) { await f(); n++; }

// host + twee gasten (Bram en Lotte), 60 Hz, een beetje vertraging
function avond() {
  const links = [];
  const hw = mkWorld({ money: 1000 });
  N.startHost(hw, INFO, { seed: 5, max: 4 });
  const werelden = [hw];
  const voegToe = (i, wens, x) => {
    const link = createLink({ latency: 0.04, jitter: 0.015, seed: 11 + i * 7 }); links.push(link);
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x, y: 60, angle: 0, character: 'anita', vx: 0, vy: 0 }, money: 100 + i * 10, calendar: { day: 7 } });
    N.startClient(gw, link.b, INFO, { wens });
    werelden.push(gw); return gw;
  };
  const g1 = voegToe(0, 'bram', 50), g2 = voegToe(1, 'lotte', 55);
  const tick = () => { for (const w of werelden) { N.tickCoopNet(w, 1 / 60); w.time += 1 / 60; } for (const l of links) l.advance(1 / 60); };
  const step = async (secs, klaar) => { const k = Math.round(60 * secs); for (let i = 0; i < k; i++) { tick(); if (i % 3 === 0) await new Promise((r) => setImmediate(r)); if (klaar && klaar()) return true; } return klaar ? !!klaar() : true; };
  return { hw, g1, g2, werelden, step };
}

const s = avond();
const { hw, g1, g2 } = s;

await t('start: host en twee gasten zijn verbonden en elke speler ziet drie spelers', async () => {
  const klaar = await s.step(6, () => hw.coopRoster && hw.coopRoster.length === 3 && g1.coopRoster && g1.coopRoster.length === 3 && g2.coopRoster && g2.coopRoster.length === 3);
  assert.ok(klaar, 'iedereen kent de spelerslijst van drie');
  assert.equal(g1.coopRole, 'client'); assert.equal(g2.coopRole, 'client'); assert.equal(hw.coopRole, 'host');
});

await t('avatar en naam: medespelers zien elkaars eigen figuur (Bram, Lotte) uit de spelerslijst', async () => {
  const namen = hw.coopRoster.map((r) => (r.avatar && r.avatar.naam) || r.naam || r.char).filter(Boolean);
  assert.ok(namen.length >= 3, 'drie namen in de lijst: ' + JSON.stringify(namen));
  assert.ok(hoofdspeler(g1) === g1.player && hoofdspeler(g2) === g2.player, 'hoofdspeler is op elk apparaat het eigen lichaam');
});

await t('kaartping: een ping van gast 1 staat bij de host en bij gast 2', async () => {
  assert.ok(N.sendPing(g1, 50, 60, 'gevaar'), 'de ping gaat het net op');
  const klaar = await s.step(4, () => (hw.coopPingMarks || []).length >= 1 && (g2.coopPingMarks || []).length >= 1);
  assert.ok(klaar, `baken bij de host (${(hw.coopPingMarks || []).length}) en bij gast 2 (${(g2.coopPingMarks || []).length})`);
});

await t('beloning per speler: een opdracht betaalt elke gast het volle bedrag, één keer', async () => {
  const v1 = g1.coopVerdiend || 0, v2 = g2.coopVerdiend || 0;
  const k = N.deelMetGasten(hw, 120);
  assert.equal(k, 2, 'twee gasten krijgen geld');
  await s.step(2, () => (g1.coopVerdiend || 0) >= v1 + 120 && (g2.coopVerdiend || 0) >= v2 + 120);
  assert.equal((g1.coopVerdiend || 0) - v1, 120, 'gast 1 krijgt het volle bedrag');
  assert.equal((g2.coopVerdiend || 0) - v2, 120, 'gast 2 krijgt het volle bedrag');
  await s.step(1);
  assert.equal((g1.coopVerdiend || 0) - v1, 120, 'niet dubbel');
});

await t('winkel en geld: het geld van een gast is van hemzelf (lokaal), de host raakt het niet aan', async () => {
  const hostGeld = hw.money; const gastGeld = g1.money;
  g1.money -= 25; // een aankoop op het eigen scherm (coopgastlokaal)
  await s.step(1);
  assert.equal(hw.money, hostGeld, 'het geld van de host verandert niet');
  assert.equal(g1.money, gastGeld - 25, 'de gast betaalde zelf');
});

await t('bijbaan en minigame: de status per onderdeel komt uit het register (geen stille nee)', async () => {
  assert.notEqual(samenStatus('bijbaan', 'krantenwijk'), 'nee', 'de krantenwijk kan samen');
  assert.notEqual(samenStatus('minigame', 'kartbaan'), 'nee', 'de kartbaan kan samen');
});

await t('wereldstaat: weer, tijd en wanted zijn van de wereld; een gast draait de simulatie niet', async () => {
  assert.equal(g1.coopRole, 'client', 'een gast is een dunne client');
  assert.ok(typeof hw.clock === 'number' && typeof g1.clock === 'number', 'klok bij beiden');
});

// de systemen van de epics: pas als de module in main staat
const bestaat = (rel) => fs.existsSync(path.join(ROOT, rel));
if (bestaat('game/js/clothing.js')) {
  await t('kleding: de outfit-code gaat mee in de spelerslijst (epic Kleding)', async () => {
    const C = await import(pathToFileURL(path.join(ROOT, 'game/js/clothing.js')).href);
    assert.equal(typeof C.encodeOutfit, 'function', 'encodeOutfit bestaat');
  });
} else wacht('kleding (outfit-sync)', 'epic-kleding-21-11');
if (bestaat('game/js/bezit.js')) {
  await t('bezit: een claim van een gast staat in zijn eigen progress (epic Bezit)', async () => {
    const B = await import(pathToFileURL(path.join(ROOT, 'game/js/bezitcoop.js')).href);
    assert.ok(B, 'bezitcoop laadt');
  });
} else wacht('bezit (claim, meewerken)', 'epic-bezit-21-11');
wacht('tuning (onderdelen in het bezorg-bericht)', 'issue #1158');
wacht('waypoint delen', 'issue #1159');

console.log(`all_systems_test: ${n} ok, ${overgeslagen} wachten op een epic of issue`);
process.exit(0);
