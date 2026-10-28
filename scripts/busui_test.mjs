// Busmissie-UI (#502, playtest 27-10): wat de speler onderin ziet als hij een lijnbus of stadsbus rijdt.
//   kopje       het kaartje van de volgende halte heeft "Volgende halte" als kopje en de haltenaam
//               eronder, niet het algemene kopje "Tip(s)" boven een halve zin
//   aftelling   de dienstklok van de Streekbus tikt tussen twee tikken (stond vast op 5 s)
//   te vroeg    de melding zegt hoe veel seconden te vroeg en wat je had moeten doen
//   overlap     het doel staat boven het buskaartje, ook op 1280x720 (het kleinste formaat)
//   node scripts/busui_test.mjs
import './node3d.mjs';
import assert from 'node:assert';
import fs from 'node:fs';
import { prepareLine } from '../game/js/busroutes.js';
import { nextStopInfo, stopCard, stopAnnouncement } from '../game/js/busboard.js';
import { makeRide, startRide } from '../game/js/busride.js';
import { makeBediening, teVroegTekst } from '../game/js/busbestuur.js';

const lijn = prepareLine({
  id: 'ui', ref: '3', from: 'Groningen, Hoofdstation', to: 'Winsum, Busstation',
  pts: [[0, 0], [2000, 0]], stops: [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 1300, y: 0 }, { x: 2000, y: 0 }],
});

// --- 1. het kopje boven de haltenaam ---------------------------------------------
{
  const info = nextStopInfo(lijn, 1, 100);
  const kaart = stopCard(info);
  assert.ok(kaart, 'er is een kaartje voor de volgende halte');
  assert.strictEqual(kaart.kicker, 'Volgende halte', 'het kopje zegt waar het over gaat');
  assert.ok(!/tips?/i.test(kaart.kicker), 'het kopje is geen tip meer: ' + kaart.kicker);
  assert.strictEqual(kaart.text, info.name, 'de haltenaam staat onder dat kopje');
  // de volledige zin blijft bestaan (busboard_test.mjs leest hem); alleen het HUD-kaartje is anders
  assert.ok(stopAnnouncement(info).includes('Volgende halte'));
  // de eindhalte heeft een eigen kopje, want daar stappen alle reizigers uit
  const eind = stopCard(nextStopInfo(lijn, 1, 1980));
  assert.strictEqual(eind.kicker, 'Eindhalte');
  assert.ok(eind.text.startsWith('Winsum'));
  assert.strictEqual(stopCard(null), null);
}

// --- 2. de aftelling van de dienst tikt ------------------------------------------
{
  const job = (await import('../game/js/sidejob_lijn.js')).default;
  const ride = makeRide(lijn, { rng: () => 0.5 });
  startRide(ride);
  const bed = makeBediening();
  const bus = { x: -500, y: -500, speed: 0, busBediend: bed };
  // dezelfde volgorde als sidejobs.js: eerst de klok aftellen, dan de baan laten rekenen
  const c = { data: { ride, line: lijn }, vehicle: bus, world: { time: 0, vehicles: [], addMessage() {} }, msg() {}, timeLeft: 30 };
  const waarden = [];
  for (const dt of [1, 1]) { c.timeLeft -= dt; job.update(dt, c); waarden.push(c.timeLeft); }
  assert.ok(waarden[0] < 30 && waarden[1] < waarden[0], `de aftelling loopt door: ${waarden.join(' -> ')}`);
  // het HUD toont Math.ceil(timeLeft) + 's' (hud_panel.js), dus de zichtbare seconden veranderen ook
  assert.notStrictEqual(Math.ceil(waarden[1]), Math.ceil(30), 'de zichtbare seconden veranderen tussen twee tikken');
}

// --- 3. de melding bij te vroeg wegrijden -----------------------------------------
{
  const melding = teVroegTekst(18.4, 'Herebrug');
  assert.ok(melding.includes('18 s te vroeg'), melding);
  assert.ok(melding.includes('nog 18 s'), 'de melding zegt hoe lang je had moeten wachten: ' + melding);
  assert.ok(/wacht tot de dienstregeling/.test(melding), 'en wat je had moeten doen: ' + melding);
  assert.ok(teVroegTekst(0, 'Herebrug').includes('1 s te vroeg'), 'nooit "0 s te vroeg"');
}

// --- 4. geen twee panelen over elkaar op 1280x720 --------------------------------
// Het buskaartje staat op de hud-rand + 4 px en is met de bedieningsregel (deuren, kneel, sterren) tot
// ongeveer 96 px hoog. De doelregel begon op hud-rand + 56 px en lag dus over het kaartje heen. Deze check
// leest de twee afspraken uit busboard3d.js: het doel moet ruim boven de bovenkant van het kaartje staan.
{
  const bron = fs.readFileSync(new URL('../game/js/busboard3d.js', import.meta.url), 'utf8');
  const kaart = /#hud \.hud-busnext\{[^}]*bottom:calc\(var\(--hud-edge,46px\) \+ (\d+)px\)/.exec(bron);
  const doel = /body\.bus-driving #hud \.hud-mission\{[^}]*bottom:calc\(var\(--hud-edge,46px\) \+ (\d+)px\)/.exec(bron);
  assert.ok(kaart && doel, 'de plaats van het kaartje en het doel staan in busboard3d.js');
  assert.ok(+doel[1] >= +kaart[1] + 100, `het doel (${doel[1]} px) staat boven het buskaartje (${kaart[1]} px + ~96 px hoog)`);
  assert.ok(/stopCard\(/.test(bron), 'het HUD-kaartje komt uit stopCard (kopje + halte)');
  assert.ok(/kicker: kaart\.kicker/.test(bron), 'het kopje gaat mee met de melding');
}

console.log('busui_test ok');
