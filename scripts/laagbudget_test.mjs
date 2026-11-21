// Laag is nergens duurder dan Middel en Hoog (#1008):  node scripts/laagbudget_test.mjs
// De budgettabel per preset staat in docs/PERF-HITCHES-21-11.md; deze test bewaakt de getallen die uit de bron te lezen zijn,
// zodat een nieuwe waarde die Laag duurder maakt dan Hoog opvalt. Wat alleen in Electron te meten is staat in dat document.
import fs from 'node:fs';
import { QUALITY_PRESETS } from '../game/js/settings.js';
import { DETAIL_DIST } from '../game/js/viewdist.js';
import { QUALITY_LOOK } from '../game/js/weatherlook.js';
import { STAR_SHARE } from '../game/js/nightrules.js';
import { SHADOW_SIZES } from '../game/js/shadowlevel.js';
import { postSampleCount } from '../game/js/postsamples.js';
import { TOTAL_BUDGET } from '../game/js/dierenplan.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const L = ['laag', 'middel', 'hoog'];
// een tabel moet van laag naar hoog niet dalen (hoger = meer werk)
const mono = (name, t) => ok(t.laag <= t.middel && t.middel <= t.hoog, `${name}: laag <= middel <= hoog`, JSON.stringify(t));
const col = (o, k) => Object.fromEntries(L.map((q) => [q, o[q][k]]));

mono('pixelRatio', col(QUALITY_PRESETS, 'pixelRatio'));
mono('schaduwkaart (preset)', col(QUALITY_PRESETS, 'shadowMapSize'));
mono('schaduwkaart (shadowlevel)', SHADOW_SIZES);
mono('detailafstand', DETAIL_DIST);
mono('regen', col(QUALITY_LOOK, 'rain'));
mono('plassen', col(QUALITY_LOOK, 'puddles'));
mono('bliksemflitsen', col(QUALITY_LOOK, 'flashes'));
mono('sterren', STAR_SHARE);
mono('dierenbudget', TOTAL_BUDGET);

// uit de bron: nachtlichten (puntlampen en spots), gras, MSAA-samples tegenover pixels
const night = fs.readFileSync(new URL('../game/js/nightlights3d.js', import.meta.url), 'utf8');
ok(/nPoint = level === 'hoog' \? 6 : level === 'middel' \? 3 : 0/.test(night) && /nSpot = level === 'hoog' \? 2 : level === 'middel' \? 1 : 0/.test(night), 'nachtrig: 6/3/0 puntlampen, 2/1/0 spots');
const grass = fs.readFileSync(new URL('../game/js/grass.js', import.meta.url), 'utf8');
ok(/laag: null,/.test(grass), 'gras: Laag tekent geen grasbosjes');
// 4 samples op 1x tegenover 2 samples op 1,5x: samples x pixels mag op Laag niet boven Hoog uitkomen
const cost = (q) => postSampleCount(q) * QUALITY_PRESETS[q].pixelRatio ** 2;
ok(cost('laag') <= cost('hoog'), 'MSAA: samples x pixels op Laag niet boven Hoog', [cost('laag'), cost('hoog')]);
// Laag houdt wel een schaduwpas (1024); dat is een keuze, geen vergissing: de test legt het vast zodat een wijziging bewust gebeurt
ok(QUALITY_PRESETS.laag.shadows === true && QUALITY_PRESETS.laag.shadowMapSize === 1024, 'Laag: schaduwen aan op 1024 (zie het budgetdocument)');

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
