// De dekkingsaudit van de interieurs (epic Interieurs, #1165): de typetabel, de recepttabel, het aggregeren en de vier fasen op
// synthetische metingen, de uitvoer, en dat de audit zonder wereld netjes overslaat. Puur, geen game/world nodig.
// Draai: node scripts/interieur_dekking_test.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { typeTable, recipeTable, aggregate, phases, render, KNOWN_TYPES } from './interieur_dekking_audit.mjs';
import { KIND_IDS, NOT_ENTERABLE, PUBLIEK_VARIANTS } from '../game/js/interiorkinds.js';
import { subsFor } from './interior_fixtures.mjs';
import { SHOP_KINDS } from '../game/js/winkelkit.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ' (' + info + ')' : '')); } };
const here = path.dirname(fileURLToPath(import.meta.url));

// --- de typetabel ---
const types = typeTable();
const by = (t) => types.find((r) => r.type === t);
ok(types.length >= KNOWN_TYPES.length, 'elk bekend type staat in de tabel', types.length + '/' + KNOWN_TYPES.length);
for (const t of NOT_ENTERABLE) ok(by(t) && !by(t).betreedbaar && /bewust/.test(by(t).reden), 'niet betreedbaar bewust: ' + t);
ok(by('house').kind === 'woning' && by('church').kind === 'kerk' && by('retail').kind === 'winkel' && by('library').kind === 'bibliotheek', 'de gewone typen worden hun soort');
ok(by('museum').sub === 'museum' && by('cinema').sub === 'bioscoop' && by('hospital').sub === 'ziekenhuis' && by('school').sub === 'school' && by('chapel').sub === 'kapel', 'museum, bioscoop, ziekenhuis, school en kapel hebben hun variant');
ok(by('sports_hall') && by('sports_hall').sub === 'sportschool', 'een sporthal is een sportschool');
ok(by('yes (3 m)').kind === 'woning' && by('yes (8 m)').kind === 'kantoor', 'yes: laag is een woning, hoog een kantoor');
for (const k of KIND_IDS) ok(types.some((r) => r.kind === k) || k === 'winkel' || k === 'horeca', 'soort ' + k + ' komt uit een bouwtype (winkel en horeca uit de plek)');

// --- de recepten ---
const rec = recipeTable();
const expected = KIND_IDS.reduce((s, k) => s + (k === 'winkel' ? SHOP_KINDS.filter((x) => x !== 'kermiskraam').length : subsFor(k).length), 0);
ok(rec.length === expected, 'een rij per variant', rec.length + '/' + expected);
ok(rec.every((r) => r.ok > 0), 'elk recept slaagt op een gewone hal', rec.filter((r) => !r.ok).map((r) => r.kind + '/' + r.sub).join(', '));
for (const v of PUBLIEK_VARIANTS) ok(rec.some((r) => r.kind === 'publiek' && r.sub === v), 'publiek/' + v + ' heeft een recept');
ok(rec.some((r) => r.kind === 'kerk' && r.sub === 'kapel'), 'kerk/kapel heeft een recept');
ok(rec.filter((r) => r.kind === 'publiek').every((r) => r.items > 4 && r.people >= 1), 'elk publiek recept heeft meubels en mensen');
ok(JSON.stringify(recipeTable()) === JSON.stringify(rec), 'de recepttabel is deterministisch');

// --- aggregeren op synthetische metingen ---
const totals = { house: { all: 1000, poi: 0 }, retail: { all: 100, poi: 100 }, shed: { all: 50, poi: 0 }, church: { all: 10, poi: 10 } };
const recs = [];
for (let i = 0; i < 100; i++) recs.push({ type: 'house', poi: false, ok: i < 60, why: i < 60 ? '' : (i < 90 ? 'small' : 'low'), kind: i < 60 ? 'woning' : null, sub: null, city: i % 10 === 0, levels: i < 20 ? 2 : 1 });
for (let i = 0; i < 100; i++) recs.push({ type: 'retail', poi: true, ok: i < 90, why: i < 90 ? '' : 'small', kind: i < 90 ? 'winkel' : null, sub: i < 90 ? 'bakker' : null, city: true, levels: 1 });
for (let i = 0; i < 5; i++) recs.push({ type: 'shed', poi: false, ok: false, why: 'type', kind: null, sub: null, city: false, levels: 0 });
for (let i = 0; i < 10; i++) recs.push({ type: 'church', poi: true, ok: i < 7, why: i < 7 ? '' : 'small', kind: i < 7 ? 'kerk' : null, sub: null, city: false, levels: 1 });
const agg = aggregate(recs, totals);
const row = (t) => agg.perType.find((r) => r.type === t);
ok(agg.panden === 1160, 'alle panden geteld', String(agg.panden));
ok(row('house').est === 600 && row('house').rate === 60, 'woningen: 60% van 1000 is 600 betreedbaar', JSON.stringify([row('house').est, row('house').rate]));
ok(row('retail').est === 90 && row('retail').notEst === 10, 'winkels met een plek zijn exact gemeten: 90 van 100', String(row('retail').est));
ok(row('shed').est === 0 && row('shed').why.type === 5, 'schuren: niet betreedbaar om het type');
ok(row('church').est === 7 && row('church').why.small === 3, 'kerken: 7 van 10, drie te klein');
ok(agg.geschatBetreedbaar === 600 + 90 + 0 + 7, 'het totaal klopt', String(agg.geschatBetreedbaar));
ok(agg.redenNiet.small === 43 && agg.redenNiet.low === 10 && agg.redenNiet.type === 5, 'de redenen zijn opgeteld', JSON.stringify(agg.redenNiet));
ok(agg.perType[0].type === 'house', 'gesorteerd op aantal');

// --- de fasen ---
const ph = phases(recs, agg, rec);
ok(ph.fase1.betreedbaar === 90 + 7, 'fase 1: winkels en kerken', String(ph.fase1.betreedbaar));
ok(ph.fase1.poiBetreedbaar === 97 && ph.fase1.poiNiet === 13, 'fase 1: panden met een plek, wel en niet', JSON.stringify([ph.fase1.poiBetreedbaar, ph.fase1.poiNiet]));
ok(ph.fase2.metRecept === ph.fase2.varianten && ph.fase2.zonderRecept.length === 0, 'fase 2: alle varianten hebben een recept');
ok(ph.fase3.betreedbaar === 600 && ph.fase3.openHuis === Math.round(600 * 0.22), 'fase 3: woningen en open huis', JSON.stringify(ph.fase3));
ok(ph.fase3.metEtage === 200, 'fase 3: etages opgeschaald (20 van 100 gemeten woningen is 200 van 1000)', String(ph.fase3.metEtage));
ok(ph.fase4.stadBetreedbaar > 0 && ph.fase4.buitenBetreedbaar > 0 && ph.fase4.buitenAandeel > 0 && ph.fase4.buitenAandeel <= 100, 'fase 4: stad en buiten de stad', JSON.stringify(ph.fase4));

// --- de uitvoer ---
const text = render(agg, ph, rec);
ok(/Fase 1/.test(text) && /Fase 2/.test(text) && /Fase 3/.test(text) && /Fase 4/.test(text), 'de uitvoer noemt de vier fasen');
ok(/house\s+1000/.test(text) && /reden dat een gemeten pand niet kan/.test(text) && /recepten/.test(text), 'de uitvoer heeft de tabel, de redenen en de recepten');

// --- de opdrachtregel ---
const run = (...a) => spawnSync(process.execPath, [path.join(here, 'interieur_dekking_audit.mjs'), ...a], { encoding: 'utf8' });
const skip = run('--world=' + path.join(here, 'bestaat-niet-r5'));
ok(skip.status === 0 && /SKIP/.test(skip.stdout), 'zonder wereld: SKIP met uitgang 0', skip.stdout + skip.stderr);
const typen = run('--typen');
ok(typen.status === 0 && /betreedbare typen: \d+ van \d+/.test(typen.stdout) && /bewust niet/.test(typen.stdout), '--typen draait zonder wereld');
const js = run('--typen', '--json');
let parsed = null;
try { parsed = JSON.parse(js.stdout); } catch (e) { /* hieronder */ }
ok(parsed && Array.isArray(parsed.types) && Array.isArray(parsed.recipes), '--typen --json geeft geldige JSON');

console.log(bad ? 'interieur_dekking_test: ' + bad + ' van ' + n + ' mislukt' : 'interieur_dekking_test: ' + n + ' controles ok');
process.exit(bad ? 1 : 0);
