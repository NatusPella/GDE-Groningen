// Kiekdoar-regels (#812/#818): de pure selectie, de volgorde, de cooldowns en de
// nieuwe soorten (ontsnappen, snelheid, overval, race) zonder opname. Geen DOM, geen
// audio, geen wereld: alleen de functie uit game/js/kiekdoarregels.js en een broncontrole
// op de koppelingen in sikkomfeed/missions/races.
//   node scripts/kiekdoarregels_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const K = await import(pathToFileURL(path.join(ROOT, 'game/js/kiekdoarregels.js')).href);
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const P = (o = {}) => ({ wanted: 0, inRespawn: false, kills: 0, pedKills: 0, copKills: 0, missionsDone: 0, playerWrecks: 0, heistsDone: 0, racesWon: 0, topSpeed: 0, ...o });
const kies = (prev, cur, tijd, extra = {}) => K.kiesKiekdoar(prev, cur, tijd, { random: () => 0, ...extra });

ok(JSON.stringify(K.ORDER) === JSON.stringify(['wanted', 'escape', 'speed', 'heist', 'race', 'wrecked', 'copkill', 'pedkill', 'kill', 'mission']), 'de volgorde is sterren, ontsnappen, snelheid, overval, race, schade, kills, missie');
ok(K.SPEED_MIN_KMH === 120, 'de snelheidsdrempel is 120 km/u', String(K.SPEED_MIN_KMH));
ok(K.COOLDOWN === 90 && K.SAME_KIND_COOLDOWN === 300 && K.CHANCE === 0.5, 'de bestaande cooldowns en kans blijven');

// niets veranderd
ok(kies(P(), P(), 1000) === null, 'zonder verandering geen kop');

// sterren
{
  const k = kies(P(), P({ wanted: 2 }), 1000);
  ok(k && k.kind === 'wanted', 'een nieuwe ster is nieuws', k && k.kind);
  ok(k.voiced === true && !!k.audioKey, 'de sterrenkop houdt zijn bestaande opname', JSON.stringify(k));
  ok(k.text === K.KIEKDOAR.wanted.headlines[0], 'de kop komt uit de bestaande lijst');
}

// ontsnappen: alleen van minstens twee sterren naar nul, en maar één keer
{
  ok(kies(P({ wanted: 1 }), P({ wanted: 0 }), 1000) === null, 'van één ster naar nul is geen ontsnapping');
  ok(kies(P({ wanted: 3 }), P({ wanted: 0, inRespawn: true }), 1000) === null, 'een respawn (gepakt of neer) is geen ontsnapping');
  const k = kies(P({ wanted: 3 }), P({ wanted: 0 }), 1000);
  ok(k && k.kind === 'escape', 'ontsnappen aan de politie is nieuws', k && k.kind);
  ok(k.voiced === false && k.audioKey === null, 'de ontsnappingskop heeft geen opname', JSON.stringify(k));
  ok(/politie|dader/.test(k.text), 'de kop leest als Kiekdoar', k.text);
  const weer = kies(P({ wanted: 3 }), P({ wanted: 0 }), 1100, { lastToastAt: 1000, lastKindAt: { escape: 1000 } });
  ok(weer === null, 'niet bij elke ster-daling of tweede keer binnen de cooldown');
}

// topsnelheid: drempel, één kop per vijf minuten, met het aantal km/u
{
  ok(kies(P({ topSpeed: 119 }), P({ topSpeed: 119 }), 1000) === null, 'geen record, geen kop');
  ok(kies(P({ topSpeed: 100 }), P({ topSpeed: 119 }), 5000) === null, 'onder de drempel is geen nieuws');
  const k = kies(P({ topSpeed: 100 }), P({ topSpeed: 140 }), 1000);
  ok(k && k.kind === 'speed' && /140 km\/u/.test(k.text), 'een nieuw record boven de drempel noemt de snelheid', k && k.text);
  ok(k.voiced === false && k.audioKey === null, 'de snelheidskop heeft geen opname');
  const snel = kies(P({ topSpeed: 140 }), P({ topSpeed: 160 }), 1200, { lastToastAt: 1000, lastKindAt: { speed: 1000 } });
  ok(snel === null, 'binnen vijf minuten geen tweede snelheidskop');
  const later = kies(P({ topSpeed: 140 }), P({ topSpeed: 160 }), 1301, { lastToastAt: 1000, lastKindAt: { speed: 1000 } });
  ok(later && later.kind === 'speed', 'na vijf minuten mag het weer', later && later.kind);
}

// overval en race: na snelheid, vóór schade; geen opname
{
  ok(kies(P(), P({ heistsDone: 1 }), 1000).kind === 'heist', 'een geslaagde heist is nieuws');
  ok(kies(P(), P({ racesWon: 1 }), 1000).kind === 'race', 'een gewonnen race is nieuws');
  const h = kies(P(), P({ heistsDone: 1, playerWrecks: 1, kills: 1 }), 1000);
  ok(h.kind === 'heist', 'de overval gaat vóór schade en kills', h.kind);
  const r = kies(P({ heistsDone: 1 }), P({ heistsDone: 1, racesWon: 1, playerWrecks: 1 }), 1000);
  ok(r.kind === 'race', 'de race gaat vóór schade', r.kind);
  for (const soort of ['heist', 'race']) {
    const k = kies(P(), P(soort === 'heist' ? { heistsDone: 1 } : { racesWon: 1 }), 1000);
    ok(k.voiced === false && k.audioKey === null, `${soort} heeft geen opname`, JSON.stringify(k));
  }
}

// cooldowns en kans
{
  ok(kies(P(), P({ kills: 1 }), 1000, { lastToastAt: 950 }) === null, 'binnen de algemene cooldown geen kop');
  ok(kies(P(), P({ kills: 1 }), 1041, { lastToastAt: 950 }) !== null, 'na de algemene cooldown wel');
  ok(kies(P(), P({ kills: 1 }), 1000, { random: () => 0.9 }) === null, 'de kans gooit niet elke gebeurtenis in de krant');
  ok(kies(P(), P({ kills: 1 }), 1000, { lastKindAt: { kill: 900 } }) === null, 'dezelfde soort wacht vijf minuten');
}

// bestaande soorten houden hun opname; nieuwe hebben er geen
for (const soort of ['wanted', 'wrecked', 'copkill', 'pedkill', 'kill', 'mission']) {
  ok(K.KIEKDOAR[soort].audio.some(Boolean), `${soort} houdt een opname`);
}
for (const soort of ['escape', 'speed', 'heist', 'race']) {
  ok(K.KIEKDOAR[soort].audio.every((a) => a === null), `${soort} heeft geen opname`);
}

// de koppelingen in de bron
{
  const feed = lees('game/js/sikkomfeed.js');
  ok(/kiesKiekdoar/.test(feed), 'sikkomfeed gebruikt de pure selectie');
  ok(/topSpeed: getStat\('topSpeed'\)/.test(feed), 'de momentopname leest het topsnelheidsrecord');
  ok(/heistsDone: s\.heistsDone \| 0/.test(feed) && /racesWon: s\.racesWon \| 0/.test(feed), 'de momentopname leest de nieuwe tellers');
  ok(/voiced: keuze\.voiced/.test(feed) && /if \(keuze\.audioKey\) playSikkomLine/.test(feed), 'audio alleen als er een bestaande opname is');
  ok(/mayStart\('phone'\)/.test(feed), 'de mayStart-poort blijft');
  const world = lees('game/js/world.js');
  ok(/STAT_DEFAULTS = \{[^}]*heistsDone: 0[^}]*racesWon: 0/.test(world), 'de nieuwe tellers staan in STAT_DEFAULTS');
  ok(/def\.heist\) world\.stats\.heistsDone\+\+/.test(lees('game/js/missions.js')), 'een geslaagde heist verhoogt heistsDone');
  for (const f of ['kartbaan.js', 'ringrace.js', 'regatta.js']) ok(/w\.stats\.racesWon\+\+/.test(lees('game/js/' + f)), `${f} verhoogt racesWon bij een solo-overwinning`);
}

console.log(process.exitCode ? 'kiekdoarregels_test: FAIL' : `kiekdoarregels_test: ${n} controles ok`);
