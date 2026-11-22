// Loopbaan landbouw (#972): de uitleg in het Loopbanen-scherm en de eigen percelen op de kaart. #1092: zonder verzonnen vlak of omtrek
// (een perceelrand komt alleen uit echte kaartdata): label en pin, geen rechthoek.
//   node scripts/landbouw_test.mjs
import { readFileSync } from 'node:fs';
import * as PC from '../game/js/percelen.js';
import { PERCELEN } from '../game/js/percelen.js';
import * as PMAP from '../game/js/perceelmap.js';
import { LANDBOUW_GIDS } from '../game/js/loopbaan.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// #1092: geen verzonnen perceelvlak meer: de schets-rechthoek, de klik erop en zijn schaal bestaan niet
ok(PC.perceelVlak === undefined && PC.veldBij === undefined && PC.PERCEEL_MAP_SCALE === undefined, 'geen verzonnen perceelvlak (perceelVlak, veldBij, PERCEEL_MAP_SCALE zijn weg)');
ok(PERCELEN.length > 5, 'de catalogus van percelen bestaat nog');
ok(typeof PMAP.eigenPerceelVlakken === 'function' && PMAP.eigenPerceelVlakken().every((v) => v.punten === undefined), 'een eigen veld heeft geen getekende punten');

// De uitleg: wat is een missie, wat is je eigen boerderij, en waar staan je percelen
ok(LANDBOUW_GIDS && LANDBOUW_GIDS.titel && LANDBOUW_GIDS.stappen.length >= 4, 'de gids heeft een titel en stappen');
const tekst = [LANDBOUW_GIDS.titel, ...LANDBOUW_GIDS.stappen, LANDBOUW_GIDS.verschil].join(' ').toLowerCase();
ok(/missie|bijbaan/.test(tekst) && /eigen boerderij/.test(tekst), 'de gids noemt missies en je eigen boerderij');
ok(/kaart/.test(tekst) && /perceel|akker/.test(tekst), 'de gids wijst op de percelen op de kaart');
ok(/zaai|oogst|verkoop/.test(tekst), 'de gids zegt hoe je begint');
ok(LANDBOUW_GIDS.verschil.length > 40 && /missie/i.test(LANDBOUW_GIDS.verschil) && /eigen boerderij/i.test(LANDBOUW_GIDS.verschil), 'het verschil staat in één regel');

// De kaart tekent geen vlak meer, het Loopbanen-scherm toont de gids
const mv = read('game/js/mapview.js');
ok(mv.includes('eigenPerceelVlakken') && !mv.includes('veldBij(') && !/v\.punten/.test(mv), 'de kaart tekent eigen velden als label, zonder vlak of omtrek');
const lb = read('game/js/loopbaanui.js');
ok(lb.includes('landbouwGidsHtml') && lb.includes('LANDBOUW_GIDS'), 'het Loopbanen-scherm toont de landbouwgids');

console.log(fails ? `${fails} of ${n} failed` : `landbouw_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
