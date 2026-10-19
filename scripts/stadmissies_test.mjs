// De zes stadmissies uit #26 (game/js/stadmissies.js): met goed spel een beloning, met
// slecht spel een mislukte ronde, geen NaN, alleen verzonnen namen, en ze staan bedraad in
// sidejobs.js (lijst, betaalschatting, kaartpictogram).
import fs from 'node:fs';
import {
  STAD_MISSIES, STAD_MISSIE_IDS, startStadRonde, stapStadRonde, stadRondeResultaat, raveBand, RAVE_LENGTH, RAVE_PHASES, STAD_DOELEN,
} from '../game/js/stadmissies.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

ok(STAD_MISSIES.length === 6 && new Set(STAD_MISSIE_IDS).size === 6, 'zes unieke missies');
const bestaand = ['loket', 'studiestaat', 'vigilantia', 'kamerkoning', 'wolkenhal', 'helix', 'niemeyer', 'bernard', 'rechtbank', 'boa', 'cabaret', 'bus', 'fietssoep', 'taxinacht', 'balenrit', 'berging', 'schoolrit', 'melkrit'];
ok(STAD_MISSIE_IDS.every((id) => !bestaand.includes(id)), 'geen botsing met bestaande ids');

for (const m of STAD_MISSIES) {
  const txt = [m.naam, m.bedrijf, m.blurb, m.tagline, ...m.intro].join(' ');
  ok(m.intro.length >= 2 && m.blurb && m.bedrijf && m.tagline, 'tekst', m.id);
  ok(!/\b(nam|kpn|vindicat|xior|suiker unie|cosun|arriva|ns|google|rtv noord|oogtv|duo)\b/i.test(txt.replace(/Oost[a-z]*/g, '')), 'geen echte merken in speltekst', m.id);
  ok(!/sneeuw|winter|vorst|bloed|dood|gewond|ziekenhuis|wraak/i.test(txt.replace(/geen wraak/i, '')), 'zomer en geen leed', m.id);
  ok(!/de Grunn/.test(txt), 'Grunn', m.id);
  ok(m.plek && (m.plek.wgs || m.plek.gebouw || m.plek.stad), 'plek', m.id);
  const ronde = startStadRonde(m.id, 1);
  ok(ronde && ronde.rule === m, 'startStadRonde', m.id);
}
ok(startStadRonde('bestaatniet') === null, 'onbekend id geeft null');
ok(new Set(STAD_MISSIES.map((m) => m.bedrijf)).size === 6, 'zes eigen organisaties');
ok(new Set(STAD_MISSIES.map((m) => m.regio)).size >= 3, 'spreiding over streken');

// Een speler spelen: input(t, r) geeft de invoer; stopt bij done/fail.
function speel(id, input, level = 1, maxT = 600) {
  const r = startStadRonde(id, level);
  const dt = 0.1;
  for (let t = 0; t < maxT && !r.over; t += dt) {
    stapStadRonde(r, input(t, r.s), dt);
    for (const v of Object.values(r.s)) if (typeof v === 'number') ok(Number.isFinite(v), 'geen NaN', id);
  }
  return { r, res: stadRondeResultaat(r) };
}

// Rustig rijdend naar een doel en daar stilstaan; levert per ronde-stand de juiste afstand.
const dichtbij = (s, key = 'at') => ({ speed: 0.1, decel: 0.3, lat: 0.5, dist: 1 });

// 1. museumbus
let g = speel('museumbus', () => dichtbij());
ok(g.r.over === 'done' && !g.res.failed && g.res.flawless && g.res.base + g.res.tip > 0, 'museumbus: rustig is vlekkeloos', JSON.stringify(g.res));
g = speel('museumbus', () => ({ speed: 14, decel: 5, lat: 6, dist: 50 }));
ok(g.r.over === 'fail', 'museumbus: hard rijden is mislukt');
g = speel('museumbus', () => ({ speed: 5, decel: 0, lat: 0, dist: 90 }));
ok(g.r.over === null, 'museumbus: nooit stilstaan telt niet als klaar');

// 6. Kliniek Van der Meden: zacht rijden, wachten bij de poort
g = speel('vandermeden', () => dichtbij());
ok(g.r.over === 'done' && !g.res.failed && g.res.flawless, 'vandermeden: zacht is vlekkeloos', JSON.stringify(g.res));
g = speel('vandermeden', () => ({ speed: 14, decel: 5, lat: 6, dist: 50 }));
ok(g.r.over === 'fail' && g.res.failed, 'vandermeden: knallen is mislukt');
g = speel('vandermeden', () => ({ speed: 5, decel: 0, lat: 0, dist: 90 }));
ok(g.r.over === null, 'vandermeden: nooit stilstaan telt niet als klaar');

// 2. suikerbieten: laden, dan rustig bezorgen
g = speel('suikerbieten', (t, s) => (s.phase === 'laden' ? { speed: 0.1, dist: 2 } : { speed: 0.2, decel: 0.2, lat: 0.4, dist: 2 }));
ok(g.r.over === 'done' && g.res.flawless, 'suikerbieten: laden en bezorgen', JSON.stringify(g.res));
g = speel('suikerbieten', (t, s) => (s.phase === 'laden' ? { speed: 0.1, dist: 2 } : { speed: 12, decel: 6, lat: 8, dist: 90 }));
ok(g.r.over === 'fail' && g.r.s.load < 35, 'suikerbieten: strooien is mislukt');
g = speel('suikerbieten', () => ({ speed: 8, dist: 80 }), 1, 400);
ok(g.r.over === 'fail', 'suikerbieten: de campagne loopt af zonder laden');
let r = startStadRonde('suikerbieten');
ok(r.s.fill === 0 && STAD_DOELEN.suikerbieten.at(r.s) === 0, 'suikerbieten: eerst de hoop');
stapStadRonde(r, { speed: 0, dist: 1 }, 5);
ok(STAD_DOELEN.suikerbieten.at(r.s) === 1, 'suikerbieten: daarna de fabriek');

// 3. herstelploeg
g = speel('herstelploeg', () => ({ speed: 0.1, dist: 1 }));
ok(g.r.over === 'done' && g.r.s.at === 3 && g.res.flawless, 'herstelploeg: drie dorpen', JSON.stringify(g.res));
g = speel('herstelploeg', () => ({ speed: 22, decel: 6, dist: 100 }));
ok(g.r.over === 'fail', 'herstelploeg: racen kost het vertrouwen');
r = startStadRonde('herstelploeg');
for (let i = 0; i < 20; i++) stapStadRonde(r, { speed: 0.1, dist: 1 }, 0.1);
ok(r.s.at === 0, 'herstelploeg: een praatje duurt langer dan twee seconden');

// 4. oogtv
g = speel('oogtv', () => ({ speed: 0.1, dist: 1 }));
ok(g.r.over === 'done' && g.r.s.at === 3 && g.res.flawless, 'oogtv: drie keer live', JSON.stringify(g.res));
g = speel('oogtv', () => ({ speed: 9, dist: 120 }));
ok(g.r.over === 'fail' && g.res.failed, 'oogtv: nooit op de plek is mislukt');
ok(g.res.base === 0 && g.res.tip === 0, 'oogtv: mislukt betaalt niets');
// een gemist venster, daarna twee gehaald: nog steeds klaar, maar zonder fooi
let first = true;
g = speel('oogtv', (t, s) => (s.missed === 0 && s.at === 0 && first ? ((first = t < 10), { speed: 9, dist: 100 }) : { speed: 9, dist: 100 }));
ok(g.r.over === 'fail', 'oogtv: te laat op de plek');
r = startStadRonde('oogtv', 5);
for (let t = 0; t < 400 && !r.over; t += 0.1) stapStadRonde(r, r.s.missed === 0 && r.s.at === 0 ? { speed: 9, dist: 100 } : { speed: 0.1, dist: 1 }, 0.1);
ok(r.over === 'done' && r.s.missed === 1 && stadRondeResultaat(r).tip === 0 && !stadRondeResultaat(r).flawless, 'oogtv: één gemist venster geeft geen fooi', JSON.stringify([r.over, r.s.missed, r.s.at]));
ok(r.s.window < startStadRonde('oogtv', 1).s.window, 'oogtv: hoger niveau, korter venster');

// 5. telefoonrave
ok(RAVE_PHASES.every((p) => p.lo < p.hi && p.hi <= 10), 'rave: banden kloppen');
ok(raveBand(0).name === 'binnenkomst' && raveBand(RAVE_LENGTH - 1).name === 'afbouw' && raveBand(1e6).name === 'afbouw', 'rave: band volgt de tijd');
const volger = (t, s) => {
  const b = raveBand(t);
  const mid = Math.round((b.lo + b.hi) / 2);
  return { dir: s.vol < mid ? 1 : s.vol > mid ? -1 : 0 };
};
g = speel('telefoonrave', volger);
ok(g.r.over === 'done' && g.res.flawless && !g.res.failed, 'rave: in de band blijven', JSON.stringify(g.res));
g = speel('telefoonrave', () => ({ dir: 1 }));
ok(g.r.over === 'fail' && g.res.failed, 'rave: altijd harder = buren bellen');
g = speel('telefoonrave', () => ({ dir: -1 }));
ok(g.r.over === 'fail' && g.res.failed, 'rave: altijd zachter = lege zaal');
g = speel('telefoonrave', () => ({}));
ok(g.r.over === 'fail' || g.r.over === 'done', 'rave: niets doen loopt af');
r = startStadRonde('telefoonrave');
stapStadRonde(r, { dir: 1 }, 0.1); stapStadRonde(r, { dir: 1 }, 0.1);
ok(r.s.vol === 7, 'rave: één stap per toets');
for (let i = 0; i < 30; i++) stapStadRonde(r, { dir: -1 }, 0.01);
ok(r.s.vol === 0, 'rave: volume zit tussen 0 en 10');

// stapStadRonde na het einde doet niets
ok(stapStadRonde(r.over ? r : Object.assign(r, { over: 'done' }), { dir: 1 }, 1).length === 0, 'na het einde geen events');

// bedrading in de spelcode
const read = (p) => fs.readFileSync(new URL(`../game/js/${p}`, import.meta.url), 'utf8');
const jobs = read('sidejobs.js'), adapter = read('sidejob_stad.js');
ok(/\.\.\.STAD_JOBS\]/.test(jobs) && /from '\.\/sidejob_stad\.js'/.test(jobs), 'STAD_JOBS staan in SIDE_JOBS');
for (const id of STAD_MISSIE_IDS) {
  ok(new RegExp(`${id}: \\[\\d+, \\d+\\]`).test(jobs), 'betaalschatting', id);
  ok(new RegExp(`case '${id}':`).test(jobs), 'kaartpictogram (glyph)', id);
}
ok(/export const STAD_JOBS = \[museumbus, suikerbieten, herstelploeg, oogtv, telefoonrave, vandermeden\]/.test(adapter), 'adapter exporteert zes banen');

console.log(`${n - fails}/${n} stadmissies_test`);
process.exit(fails ? 1 : 0);
