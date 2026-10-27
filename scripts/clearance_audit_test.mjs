// De indelingsregel van clearance_audit (#494) zonder de wereld: een smal
// voetbrugdek naast een weg is geen doorgang boven die weg, boven de rijbaan is
// het er wel een; een breed viaduct houdt de oude regel (het dek boven de as).
// De twee sluimerende overspanningen van #501 zitten hier ook: een dek dat maar
// net boven een fietspad of laan ligt moet omhoog, een dek dat al hoog genoeg is
// blijft staan, en een fietspad onder een dek wordt niet zelf opgetild.
//   node scripts/clearance_audit_test.mjs
import { laneUnderDeck } from './lib/clearance.mjs';
import { buildNetwork } from '../game/js/roadprofile.js';
import { solve, apply, applyDeckFloors } from './world/profile.mjs';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const lane = (over = {}) => ({ ax: -20, ay: 0, bx: 20, by: 0, hs: 3.8, r: { width: 4, cat: 'minor' }, ...over });
const path = { ax: -20, ay: 0, bx: 20, by: 0, hs: 1.3, r: { width: 2, cat: 'cycle' } };

// Het gemelde punt (-252, 933): een voetbrug van 2,4 m breed naast een weg van
// 4 m. Het dek ligt 2,4 m van de as, dus boven de stoep/berm (hs 3,8) en niet
// boven de rijbaan (2,0).
ok(!laneUnderDeck(0, 2.4, lane(), 1.2), 'een voetbrug naast de weg telt niet als doorgang');
ok(laneUnderDeck(0, 1.9, lane(), 1.2), 'boven de rijbaan telt hij wel');
ok(laneUnderDeck(0, 2.0, lane(), 1.2), 'de rand van de rijbaan telt ook');
ok(!laneUnderDeck(0, 2.1, lane(), 1.2), 'net over de rand niet');

// Een breed viaduct houdt de oude regel: een laan die ernaast loopt (1,2 m van de
// as) is geen doorgang, ook al valt de berm onder het dek.
ok(laneUnderDeck(0, 0.4, lane(), 4.03), 'onder een breed viaduct telt de laan boven de as');
ok(!laneUnderDeck(0, 1.2, lane(), 4.03), 'een laan naast de as is geen doorgang');

// Een fietspad van 2 m onder een smal voetbrugdek.
ok(laneUnderDeck(0, 0.4, path, 1.2), 'een fietspad boven zijn as telt');
ok(!laneUnderDeck(0, 1.2, path, 1.2), 'en ernaast niet');

// Zonder breedte in de data valt de regel terug op de oude halve breedte.
ok(laneUnderDeck(0, 2.4, lane({ r: { cat: 'minor' } }), 1.2), 'zonder width telt de oude regel');

// ------------------------------------------------------------------ #501
// De N46-afrit en de Roeierspad kregen allebei een punt op (0,0) doordat ze
// gedicht zijn tot dezelfde centimeter. Zo'n punt is een kruising, geen knoop:
// de straat eronder mag niet aan het dek vast komen te zitten.
const deck = (z) => ({ pts: [[-120, 0], [-60, 0], [0, 0], [60, 0], [120, 0]], type: 'trunk_link', cat: 'major', width: 5, bridge: true, layer: 1, z });
const approach = () => ({ pts: [[-160, 0], [-120, 0]], type: 'trunk_link', cat: 'major', width: 5 });
const under = (over = {}) => ({ pts: [[0, -60], [0, 0], [0, 60]], type: 'cycleway', cat: 'cycle', width: 2, ...over });
const DECK_T = 1.0;
const solved = (d, l) => {
  const data = { roads: [approach(), d, l], water: [] };
  apply(data, solve(data));
  return data;
};

{
  const d = deck([0, 2, 1.5, 3, 6]), l = under();
  const net = buildNetwork([d, l]);
  ok(net.bumps.length === 1, 'dek en fietspad op hetzelfde punt: één bump', String(net.bumps.length));
  ok(net.of.get(d)[2] !== net.of.get(l)[1], 'dek en pad krijgen een eigen knoop');
  const data = solved(d, l);
  ok(d.z[2] >= 3.5 - 1e-6, 'fietspad onder een te laag dek: het dek gaat naar de vrije hoogte', String(d.z[2]));
  ok(d.z[2] - DECK_T >= 2.4, 'en de doorgang haalt de 2,4 m van clearance_audit', String(d.z[2] - DECK_T));
  ok(!l.z || l.z.every((v) => Math.abs(v) < 0.02), 'het fietspad zelf blijft op straatniveau (geen bult)', JSON.stringify(l.z));
  ok(Math.abs(d.z[0]) < 0.02, 'het dek blijft aan zijn oprit vast (knoop op 0 m)', String(d.z[0]));
}
{
  // Dezelfde kruising met een laan eronder: daar geldt de volle 4,2 m.
  const d = deck([0, 2, 1.5, 3, 6]), l = under({ cat: 'normal', type: 'unclassified', width: 6 });
  const data = solved(d, l);
  ok(d.z[2] >= 5.6 - 1e-6, 'laan onder een te laag dek: het dek gaat naar 5,6 m (4,6 + dek)', String(d.z[2]));
  ok(d.z[2] - DECK_T >= 4.2, 'en de doorgang haalt de 4,2 m van clearance_audit', String(d.z[2] - DECK_T));
  ok(!l.z || l.z.every((v) => Math.abs(v) < 0.02), 'de laan zelf blijft vlak', JSON.stringify(l.z));
}
{
  // Een dek dat al hoog genoeg ligt, wordt niet opgetild.
  const d = deck([0, 5, 5, 5, 6]), l = under();
  solved(d, l);
  ok(Math.abs(d.z[2] - 5) < 0.05, 'een dek op de juiste hoogte blijft staan', String(d.z[2]));
}
{
  // Een dek dat alleen met zijn eind op het punt ligt, landt erop: geen bump.
  const d = { pts: [[0, 0], [60, 0], [120, 0]], type: 'trunk_link', cat: 'major', width: 5, bridge: true, layer: 1, z: [0, 2, 6] };
  ok(buildNetwork([d, under()]).bumps.length === 0, 'een dek dat er eindigt is een aansluiting, geen overspanning');
}
{
  // De tweede plek van #501: het Emmaviaduct zakt tussen zijn spoorruimte en
  // zijn zuidelijke aanloop te ver door boven de dienstlaan langs zijn rand.
  const d = { pts: [[-40, 0], [0, 0], [40, 0]], type: 'secondary', cat: 'major', width: 4.46, bridge: true, layer: 1, z: [4.8, 3.8, 4.9] };
  const high = { ...d, z: [5.6, 5.5, 5.6] };
  const moved = applyDeckFloors([d, high], [[0, 0, 20, 5.2, 'major']]);
  ok(moved === 1 && Math.abs(d.z[1] - 5.2) < 1e-9, 'een te laag dek boven de dienstlaan komt op de vloer', `${moved} ${d.z[1]}`);
  ok(Math.abs(d.z[0] - 4.8) < 1e-9 && Math.abs(d.z[2] - 4.9) < 1e-9, 'de vloer dooft uit naar de randen (geen knik in de aanloop)');
  ok(high.z[1] === 5.5, 'een dek dat al hoog genoeg is blijft ongemoeid', String(high.z[1]));
  const other = { ...d, z: [4.8, 3.8, 4.9], cat: 'cycle' };
  ok(applyDeckFloors([other], [[0, 0, 20, 5.2, 'major']]) === 0, 'de vloer geldt alleen voor de wegklasse ervan');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
