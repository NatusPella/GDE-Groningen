// Loopbaan landbouw (#972): de uitleg in het Loopbanen-scherm en de eigen percelen als
// vlak met een omtrek op de kaart (hover en klik).
//   node scripts/landbouw_test.mjs
import { readFileSync } from 'node:fs';
import { perceelVlak, veldBij, perceelDef, PERCELEN, START_PERCEEL, PERCEEL_MAP_SCALE } from '../game/js/percelen.js';
import { LANDBOUW_GIDS } from '../game/js/loopbaan.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// Een vlak per perceel: vier punten, een echte omtrek, in de buurt van het midden
const akker = perceelDef(START_PERCEEL);
const midden = { x: 1000, y: 2000 };
const vlak = perceelVlak(akker, midden);
ok(vlak.length === 4 && vlak.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), 'het vlak heeft vier eindige hoeken');
ok(new Set(vlak.map(([x, y]) => `${x},${y}`)).size === 4, 'de hoeken zijn verschillend');
const opp = Math.abs(vlak.reduce((s, [x, y], i) => { const [x2, y2] = vlak[(i + 1) % 4]; return s + x * y2 - x2 * y; }, 0) / 2);
ok(opp > 500 && opp < 20000, 'het vlak is een leesbare akker, geen stip en geen provincie', String(Math.round(opp)));
ok(vlak.every(([x, y]) => Math.abs(x - midden.x) < 200 && Math.abs(y - midden.y) < 200), 'het vlak blijft rond het perceel');
ok(JSON.stringify(perceelVlak(akker, midden)) === JSON.stringify(vlak), 'dezelfde akker geeft elk beeld hetzelfde vlak');
const groot = perceelVlak(perceelDef('hoge-akker'), midden);
const grootOpp = Math.abs(groot.reduce((s, [x, y], i) => { const [x2, y2] = groot[(i + 1) % 4]; return s + x * y2 - x2 * y; }, 0) / 2);
ok(grootOpp > opp, 'een groter perceel krijgt een groter vlak', `${Math.round(grootOpp)} > ${Math.round(opp)}`);
ok(perceelVlak(null, midden).length === 0 && perceelVlak(akker, null).length === 0 && perceelVlak(akker, { x: NaN, y: 1 }).length === 0, 'zonder perceel of plek geen vlak');
ok(PERCEEL_MAP_SCALE > 0 && PERCEEL_MAP_SCALE < 1 && PERCELEN.length > 5, 'de kaartschaal is een schets, niet de kadastrale maat');

// Hover en klik: wel in het vlak, niet ernaast
const velden = [{ id: 'x', naam: 'Testakker', punten: vlak, x: midden.x, y: midden.y }];
ok(veldBij(velden, midden.x, midden.y) === velden[0], 'het midden hoort bij het veld');
ok(veldBij(velden, midden.x + 400, midden.y) === null && veldBij([], 0, 0) === null && veldBij(null, 0, 0) === null, 'buiten het veld (of zonder velden) niets');

// De uitleg: wat is een missie, wat is je eigen boerderij, en waar staan je percelen
ok(LANDBOUW_GIDS && LANDBOUW_GIDS.titel && LANDBOUW_GIDS.stappen.length >= 4, 'de gids heeft een titel en stappen');
const tekst = [LANDBOUW_GIDS.titel, ...LANDBOUW_GIDS.stappen, LANDBOUW_GIDS.verschil].join(' ').toLowerCase();
ok(/missie|bijbaan/.test(tekst) && /eigen boerderij/.test(tekst), 'de gids noemt missies en je eigen boerderij');
ok(/kaart/.test(tekst) && /perceel|akker/.test(tekst), 'de gids wijst op de percelen op de kaart');
ok(/zaai|oogst|verkoop/.test(tekst), 'de gids zegt hoe je begint');
ok(LANDBOUW_GIDS.verschil.length > 40 && /missie/i.test(LANDBOUW_GIDS.verschil) && /eigen boerderij/i.test(LANDBOUW_GIDS.verschil), 'het verschil staat in één regel');

// De kaart tekent de vlakken en de hover, het Loopbanen-scherm toont de gids
const mv = read('game/js/mapview.js');
ok(mv.includes('eigenPerceelVlakken') && mv.includes('hoverVeldId') && mv.includes('veldBij('), 'de kaart tekent eigen velden met een hover');
const lb = read('game/js/loopbaanui.js');
ok(lb.includes('landbouwGidsHtml') && lb.includes('LANDBOUW_GIDS'), 'het Loopbanen-scherm toont de landbouwgids');

console.log(fails ? `${fails} of ${n} failed` : `landbouw_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
