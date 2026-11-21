// De carrière-tour: elk vak van het Loopbaan-menu heeft een fit (Tammo, Tessa of samen) en een reden, de voortgang telt per speler, en
// er komt geen enkele eis op te staan. node scripts/careertour_test.mjs
import fs from 'node:fs';
import { CAREER_FIT, FIT, TOUR_ACHIEVEMENTS, tourProgress, tourRows } from '../game/js/careertour.js';
import { VAK_IDS } from '../game/js/loopbaan.js';
import { gateWorld } from '../game/js/unlockgate.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(VAK_IDS.every((v) => CAREER_FIT[v]) && Object.keys(CAREER_FIT).every((v) => VAK_IDS.includes(v)), 'elk vak van het Loopbaan-menu staat in de tour, en omgekeerd', VAK_IDS.filter((v) => !CAREER_FIT[v]).join());
ok(Object.values(CAREER_FIT).every((f) => FIT[f.fit] && typeof f.together === 'boolean' && f.why.length > 15 && f.why.length < 80), 'elk vak heeft een fit, een samen-vlag en een korte reden');
const aantal = (k) => Object.values(CAREER_FIT).filter((f) => f.fit === k).length;
ok(aantal('tammo') >= 6 && aantal('tessa') >= 6, 'beiden zijn in meerdere vakken goed (anders-zijn is de grap)', `${aantal('tammo')} / ${aantal('tessa')}`);
ok(Object.values(CAREER_FIT).filter((f) => !f.together).length >= 5 && Object.values(CAREER_FIT).filter((f) => f.together).length >= 8, 'in sommige vakken lukt samenwerken niet, in veel wel');
ok(VAK_IDS.every((v) => gateWorld(v)), 'elk vak staat ook in de ontgrendelpoort (per akte)');

const leeg = tourProgress(null, VAK_IDS);
ok(leeg.tried.length === 0 && leeg.earned.length === 0 && !leeg.done && leeg.total === 19, 'een nieuw profiel heeft niets geprobeerd');
const vijf = tourProgress({ gestart: ['klus', 'taxi', 'kantoor', 'landbouw', 'horeca', 'bestaat-niet'] }, VAK_IDS);
ok(vijf.tried.length === 5 && vijf.earned.join() === 'tour-5' && vijf.by.tammo === 2 && vijf.by.tessa === 3 && vijf.notTogether === 2, 'vijf geprobeerd: de eerste prestatie, per fit geteld');
const alles = tourProgress({ gestart: VAK_IDS }, VAK_IDS);
ok(alles.done && alles.earned.length === TOUR_ACHIEVEMENTS.length, 'alles geprobeerd: alle prestaties');
ok(tourProgress({ gestart: 'kapot' }, VAK_IDS).tried.length === 0, 'een kapot profiel leest als niets geprobeerd');
const rows = tourRows({ gestart: ['klus'] }, (v) => v.toUpperCase());
ok(rows.length === 19 && rows.find((r) => r.vak === 'klus').geprobeerd && !rows.find((r) => r.vak === 'golf').geprobeerd && rows[0].goed, 'het overzicht per vak');

const src = fs.readFileSync(new URL('../game/js/careertour.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
ok(!/world\.|localStorage|document\.|coopNet|fetch\(|markDone|money/.test(src), 'geen wereld, opslag, net, geld of voortgang');

console.log(`careertour_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
