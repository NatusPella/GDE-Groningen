// Pure test van de busbron: Live of Rooster (#922): scripts/busbron_test.mjs
// busbron.js (de stand in woorden, het label, de melder) en busmap.js (de markers voor de kaarten, zonder THREE).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bronStand, busLabel, richtingTekst, leeftijdTekst, maakMelder, SOORT, VEROUDERD_MS } from '../game/js/busbron.js';
import { LIVE_BRON, VERZOEK } from '../game/js/livebussen.js';

const NU = 1_000_000;
const lijn = { name: 'Lijn 12 De Wadloper', ref: '12', from: 'Winsum', to: 'Grunn Hoofdstation' };

// de stand: live, rooster of uit, elk met een zin
assert.equal(bronStand({ instelling: false }).soort, SOORT.uit);
assert.match(bronStand({ instelling: false }).tekst, /rooster/i);
assert.equal(bronStand({ stand: null, nu: NU }).soort, SOORT.rooster);
assert.equal(bronStand({ stand: { aan: false }, nu: NU }).soort, SOORT.rooster);
assert.equal(bronStand({ stand: { aan: true, laatsteOk: 0, reden: null }, nu: NU }).reden, 'laden', 'nog niets opgehaald');
for (const r of ['netwerk', 'time-out', 'status', 'te-groot', 'ongeldig']) {
  const s = bronStand({ stand: { aan: true, laatsteOk: 0, reden: r, fouten: 1 }, nu: NU });
  assert.equal(s.soort, SOORT.rooster, r); assert.match(s.tekst, /rooster/i); assert.ok(!/\d{3}|error|http/i.test(s.tekst), 'nooit een foutcode in beeld');
}
const live = bronStand({ stand: { aan: true, laatsteOk: NU - 20000, aantal: 7 }, nu: NU });
assert.equal(live.soort, SOORT.live); assert.equal(live.aantal, 7); assert.equal(Math.round(live.leeftijdS), 20); assert.match(live.tekst, /7 echte bussen/); assert.equal(live.kort, 'Live');
assert.match(bronStand({ stand: { aan: true, laatsteOk: NU - 1000, aantal: 1 }, nu: NU }).tekst, /1 echte bus /);
assert.equal(bronStand({ stand: { aan: true, laatsteOk: NU - VEROUDERD_MS - 1000, aantal: 7 }, nu: NU }).soort, SOORT.rooster, 'te oude gegevens zijn geen live');
assert.equal(bronStand({ stand: { aan: true, laatsteOk: NU - 1000, aantal: 0 }, nu: NU }).reden, 'geen', 'een lege feed: geen live bussen, dus rooster');
assert.equal(VEROUDERD_MS, LIVE_BRON.verouderd, 'dezelfde grens als de bron');
assert.equal(leeftijdTekst(2), 'zojuist'); assert.equal(leeftijdTekst(30), '30 s geleden'); assert.equal(leeftijdTekst(240), '4 min geleden');

// het label: lijn, richting, en altijd het woord Live bus of Rooster
assert.equal(richtingTekst(lijn, 1), 'richting Grunn Hoofdstation'); assert.equal(richtingTekst(lijn, -1), 'richting Winsum'); assert.equal(richtingTekst({ ref: '3' }, 1), '', 'geen verzonnen richting');
const l = busLabel(lijn, 1, SOORT.live, 14);
assert.equal(l.label, 'Lijn 12 De Wadloper'); assert.match(l.sub, /Lijn 12/); assert.match(l.sub, /richting Grunn Hoofdstation/); assert.match(l.sub, /Live bus/); assert.match(l.sub, /positie 14 s geleden/);
const r = busLabel(lijn, -1, SOORT.rooster);
assert.match(r.sub, /Rooster \(eigen dienst\)/); assert.ok(!/Live/.test(r.sub), 'de terugval is nooit als live gemarkeerd');

// de melder: één rustige melding bij de eerste live bus, één bij een uitval, en nooit twee keer dezelfde
let gezien = false;
const m = maakMelder({ gezien: () => gezien, zetGezien: () => { gezien = true; } });
const stLive = { soort: SOORT.live }, stRooster = { soort: SOORT.rooster };
assert.equal(m.tik(stRooster, null), null, 'zonder live bus niets');
assert.equal(m.tik(stLive, null), null, 'live data maar geen bus in de buurt: nog niets');
const tekst = m.tik(stLive, { line: lijn, dir: 1 });
assert.match(tekst, /^Live bus: lijn 12 rijdt hier nu echt, richting Grunn Hoofdstation/); assert.ok(gezien, 'onthouden op dit apparaat');
assert.equal(m.tik(stLive, { line: lijn, dir: 1 }), null, 'de eerste live bus meldt je maar één keer');
assert.match(m.tik(stRooster, null), /even niet beschikbaar/, 'een uitval wordt rustig gemeld');
assert.equal(m.tik(stRooster, null), null, 'en maar één keer');
const m2 = maakMelder({ gezien: () => true });
assert.equal(m2.tik(stLive, { line: lijn, dir: 1 }), null, 'wie het al kent krijgt hem niet nog eens');
assert.match(m2.tik(stRooster, null), /even niet beschikbaar/, 'wel een uitvalmelding: er was in deze sessie live');
assert.equal(maakMelder({ gezien: () => true }).tik(stRooster, null), null, 'geen uitvalmelding als er nooit een live bus was');

// privacy: de opvraag bevat niets van de speler (vaste url, GET, geen cookies, geen referrer)
assert.equal(VERZOEK.method, 'GET'); assert.equal(VERZOEK.credentials, 'omit'); assert.equal(VERZOEK.referrerPolicy, 'no-referrer');
assert.ok(!/[?&]/.test(LIVE_BRON.url), 'geen queryparameters, dus geen plek voor een kenmerk van de speler');
assert.deepEqual(Object.keys(VERZOEK.headers).sort(), ['Accept', 'User-Agent']);
const bron = fs.readFileSync(new URL('../game/js/livebussen.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../game/js/buslive.js', import.meta.url), 'utf8');
assert.ok(!/localStorage|document\.cookie|navigator\.(userAgent|language)|world\.player|\.name\b.*fetch/.test(bron.replace(/\/\/.*$/gm, '')), 'de bronbestanden lezen niets van de speler');

// de kaarten: live of rooster, nooit allebei
const { setLiveBussen } = await import('../game/js/vehicle/buspop.js');
const M = await import('../game/js/busmap.js');
const echt = { id: 'live-1', line: lijn, dir: 1, s: 400, x: 150, y: -50, angle: 0.4, speed: 8, d: 160 };
const roosterBus = { isBus: true, busRun: { line: { name: 'Lijn 3 Stadsslinger', ref: '3', from: 'Zuiderpark', to: 'Emmaplein' }, dir: 1 }, x: 40, y: 20, angle: 0 };
const w = { player: { x: 0, y: 0 }, vehicles: [roosterBus, { isBus: true, busRun: { line: lijn, dir: -1 }, liveId: 'live-1', x: 10, y: 10 }, { isBus: true, driver: 'player', busRun: { line: lijn, dir: 1 }, x: 5, y: 5 }, { isBus: true, x: 3, y: 3 }] };
setLiveBussen({ kandidaten: () => [echt], stand: () => ({ aan: true, laatsteOk: Date.now() - 12000, aantal: 1 }) });
const marks = M.liveBusMarks(w.player);
assert.equal(marks.length, 1); assert.match(marks[0].sub, /richting Grunn Hoofdstation · Live bus/); assert.equal(marks[0].soort, 'live');
assert.deepEqual(M.roosterBusMarks(w), [], 'met live gegevens geen verzonnen rooster-bussen erbij');
setLiveBussen({ kandidaten: () => [], stand: () => ({ aan: true, laatsteOk: 0, reden: 'netwerk' }) });
assert.deepEqual(M.liveBusMarks(w.player), [], 'zonder live bussen geen live markers');
const rm = M.roosterBusMarks(w);
assert.equal(rm.length, 1, 'alleen een bus met een dienst, niet van de speler, niet los van een lijn'); assert.equal(rm[0].soort, 'rooster');
assert.match(rm[0].sub, /richting Emmaplein/); assert.match(rm[0].sub, /Rooster \(eigen dienst\)/);
assert.equal(M.roosterBusMarks({ ...w, vehicles: [{ ...roosterBus, x: 5000 }] }).length, 0, 'te ver weg');
setLiveBussen(null);
assert.deepEqual(M.liveBusMarks(w.player), []); assert.equal(M.roosterBusMarks(w).length, 1, 'zonder bron rijdt het rooster');
assert.equal(M.busBronNu().soort, SOORT.rooster);
// de tekenaar kent beide icoontjes en gooit niet
const calls = [];
const ctx = new Proxy({}, { get: (t, k) => (k === 'roundRect' ? undefined : (...a) => calls.push(k)), set: () => true });
M.drawLiveBusMapIcon(ctx, 1, 0); const live1 = calls.length; calls.length = 0;
M.drawLiveBusMapIcon(ctx, 1, 0, true); assert.ok(calls.length > 5 && live1 > 5);
console.log('busbron_test ok');
