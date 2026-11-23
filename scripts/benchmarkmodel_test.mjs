// De benchmark-schermen: het model (keuze, courses, commentaar, rapportkaart, export), de courses (deterministisch, klassiek ongewijzigd)
// en de DS3-markup van het keuzescherm en de rapportkaart (benchmarkmodel.js, benchmarkui.js).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BENCH_ROUTE, FILM_ROUTE, BENCH_CATEGORIES, benchCategoryOf, packRun, HITCH_FRAME_MS } from '../game/js/benchstats.js';
import { COURSES, DEFAULT_CHOICE, courseFor, courseSeconds, normaliseChoice, choiceModel, COMMENTARY, commentaryFor, frameReport, fpsSeries, subjectGrades, toneOf, reportCard, cardSummary, exportText, exportName } from '../game/js/benchmarkmodel.js';
import { choiceHtml, reportHtml, graphHtml } from '../game/js/benchmarkui.js';
import { checkText } from './lib/cutscene_lint.mjs';

// 1. courses: de klassieke course is bevroren (oude metingen blijven vergelijkbaar), de filmroute is deterministisch en dekt alle belastingen
assert.deepEqual(BENCH_ROUTE.map((e) => e.slice(0, 2)), [['vismarkt', 4], ['escapade', 3.6], ['ommeland', 4], ['spoor', 3.6], ['aerial', 4], ['boat', 4], ['gH14', 3.6], ['kermis', 4], ['chase', 4], ['anita', 3], ['vitrine', 4]], 'klassieke course ongewijzigd');
assert.deepEqual(courseFor('classic', 'kort'), courseFor('classic', 'volledig'), 'klassiek kent één lengte');
assert.equal(courseFor('film', 'volledig').length, FILM_ROUTE.length);
assert.deepEqual(courseFor('film', 'kort').map((e) => e[0]), FILM_ROUTE.filter((e) => e[3]).map((e) => e[0]));
assert.deepEqual(courseFor('film'), courseFor('film'), 'dezelfde route elke keer');
const filmSec = courseSeconds('film', 'volledig'), kortSec = courseSeconds('film', 'kort');
assert.ok(filmSec > 45 && filmSec < 75 && kortSec > 20 && kortSec < 40, `${filmSec} s en ${kortSec} s`);
assert.equal(new Set(FILM_ROUTE.map((e) => e[0])).size, FILM_ROUTE.length, 'unieke shots');
const need = ['stad', 'provincie', 'water', 'spoor', 'drukte', 'nacht', 'weer', 'lucht'];
for (const c of need) assert.ok(FILM_ROUTE.some((e) => e[2] === c), `filmroute mist ${c}`);
assert.ok(FILM_ROUTE.every((e) => e[1] >= 3 && e[1] <= 6 && BENCH_CATEGORIES[e[2]] && benchCategoryOf(e[0]) === e[2]));
assert.ok(!FILM_ROUTE.some((e) => e[2] === 'cutscene'), 'geen cutscene-shots in de meting');
// alle shots bestaan in trailer.js en staan niet in de spoilerlijst
const src = fs.readFileSync(new URL('../game/js/trailer.js', import.meta.url), 'utf8');
const ids = /const all = \{([^}]+)\};/.exec(src)[1].split(',').map((x) => x.trim());
for (const [id] of FILM_ROUTE) assert.ok(ids.includes(id), `onbekende shot ${id}`);
assert.ok(!FILM_ROUTE.some(([id]) => id === 'vitrine'));
// de meting wordt niet vertekend: geen kaarten of namen in de filmroute (geen cutscene-, naam- of titelkaarten)
for (const [id] of FILM_ROUTE) assert.ok(!['radio', 'logo', 'steamLogo', 'tammo', 'anita'].includes(id), `kaartshot ${id}`);

// 2. keuze
assert.deepEqual(normaliseChoice(), DEFAULT_CHOICE);
assert.deepEqual(normaliseChoice({ course: 'classic', length: 'kort', commentary: true }), { course: 'classic', length: 'volledig', commentary: false }, 'klassiek: één lengte, geen commentaar');
assert.deepEqual(normaliseChoice({ course: 'x', length: 'y' }), DEFAULT_CHOICE);
const m = choiceModel(DEFAULT_CHOICE, { preset: 'vlot', presetLabel: 'Hoog' });
assert.equal(m.courses.length, 2);
assert.equal(m.courses.filter((r) => r.selected).length, 1);
assert.equal(m.lengths.filter((r) => r.selected).length, 1);
assert.equal(m.seconds, Math.round(filmSec));
assert.ok(choiceModel({ course: 'classic' }).lengths.find((l) => l.id === 'kort').disabled && choiceModel({ course: 'classic' }).lengthLocked);
assert.equal(choiceModel({ course: 'classic' }).commentary.available, false);

// 3. commentaar: in toon, kort, zonder merken, binnen de shot, uit te zetten
for (const [id, [who, text]] of Object.entries(COMMENTARY)) {
  assert.ok(['Tammo', 'Anita'].includes(who), id);
  assert.ok(text.split(/\s+/).length <= 9, `${id}: te lang`);
  const shot = FILM_ROUTE.find((e) => e[0] === id);
  assert.ok(shot && shot[1] >= 0.6 + 2.8, `${id}: commentaar past niet in de shot`);
}
for (const [id] of FILM_ROUTE) assert.ok(COMMENTARY[id], `commentaar mist voor ${id}`);
const unit = { id: 'bench', lines: Object.values(COMMENTARY).map(([who, text]) => ({ speaker: who, key: who, text, voiceDur: 2.55, hasVoice: false, textOnly: true })) };
assert.deepEqual(checkText(unit, {}).filter((f) => f.ernst === 'blokkerend'), []);
assert.ok(!/\bde Grunn\b/i.test(JSON.stringify(COMMENTARY)));
assert.deepEqual(Object.keys(commentaryFor({ course: 'film', length: 'kort', commentary: true })).sort(), courseFor('film', 'kort').map((e) => e[0]).sort());
assert.deepEqual(commentaryFor({ course: 'film', commentary: false }), {});
assert.deepEqual(commentaryFor({ course: 'classic' }), {});

// 4. statistiek en rapportcijfer
const smooth = Array(2000).fill(1000 / 75);
const rough = [...Array(1800).fill(1000 / 45), ...Array(200).fill(80)];
const rs = frameReport(smooth), rr = frameReport(rough);
assert.ok(Math.abs(rs.avg - 75) < 0.01 && rs.slow33 === 0 && Math.abs(rs.p50 - 13.333) < 0.01);
assert.ok(rr.low01 <= rr.low1 && rr.p99 >= rr.p95 && rr.p95 >= rr.p50, 'percentielen lopen op');
assert.ok(rr.slow33Share > 0.05 && rr.over100 === 0);
assert.equal(frameReport([]), null);
assert.equal(frameReport([NaN, -1, 0]), null);
const gs = subjectGrades(rs), gr = subjectGrades(rr);
assert.ok(gs.eind >= 9 && gr.eind < gs.eind && gr.haperingen < gs.haperingen);
assert.equal(toneOf(9.2).label, 'Uitmuntend');
assert.equal(toneOf(3).label, 'Onvoldoende');
assert.ok(subjectGrades(frameReport(Array(500).fill(1000 / 10))).eind < 4);
const ser = fpsSeries([{ id: 'a', label: 'A', ms: smooth.slice(0, 600) }, { id: 'b', label: 'B', ms: rough.slice(1700) }], { bucketS: 0.5 });
assert.ok(ser.length > 10 && ser.every((p) => p.fps > 0 && p.t >= 0) && ser.every((p, i) => i === 0 || p.t >= ser[i - 1].t));
assert.ok(fpsSeries([{ id: 'a', ms: smooth }], { bucketS: 0.1, maxPoints: 50 }).length <= 50);
assert.ok(HITCH_FRAME_MS > 33 && HITCH_FRAME_MS < 34);

// 5. rapportkaart: vorm, vergelijking alleen op dezelfde course, aanbeveling, export
const stats = { rep: rs, series: ser, avg: rs.avg, p95: rs.p95, low1: rs.low1, cats: { stad: { avg: 80 }, water: { avg: 52 } }, hitches: [{ id: 'boat', slow33: 3, share: 0.02 }], memory: 640 };
const prev = packRun({ stats: { avg: 60, p95: 20, low1: 40, slow33Share: 0 }, preset: 'vlot', at: 1, course: 'film' });
let card = reportCard({ stats, preset: 'vlot', course: 'film', length: 'volledig', prev, size: [1920, 1080], presetFps: { laag: 130, vlot: 75 } });
assert.equal(card.title, 'Rapportkaart');
assert.ok(card.cijfer >= 9 && card.label === 'Uitmuntend');
assert.equal(card.vakken.length, 3);
assert.deepEqual(card.feiten.map((f) => f.id).slice(0, 6), ['avg', 'low1', 'low01', 'p50', 'p95', 'p99']);
assert.equal(card.compare.verdict, 'sneller');
assert.equal(card.weakest, 'water');
assert.equal(card.hitches[0].id, 'boat');
assert.equal(card.presets.length, 2);
card = reportCard({ stats, preset: 'vlot', course: 'classic', prev });
assert.equal(card.compare.verdict, 'geen');
assert.match(card.compare.text, /andere route/, 'oude run zonder route telt als klassiek');
assert.equal(reportCard({ stats, preset: 'vlot', course: 'film', prev: { ...prev, course: undefined } }).compare.verdict, 'geen');
assert.equal(reportCard({ stats, course: 'film', prev: { ...prev, course: undefined } }).courseId, 'film');
assert.ok(reportCard({ stats: null }).empty);
assert.match(cardSummary(reportCard({ stats, preset: 'vlot', course: 'film' })), /^Rapportcijfer \d+(,\d)?: /);
const roughStats = { rep: rr, series: ser, avg: rr.avg, p95: rr.p95, low1: rr.low1, cats: {}, hitches: [] };
const rc = reportCard({ stats: roughStats, preset: 'hoog', course: 'film' });
assert.equal(rc.advice.change, 'down');
assert.ok(reportCard({ stats: { ...roughStats, rep: frameReport(Array(500).fill(150)) }, course: 'film' }).busy);
const txt = exportText(card, { date: new Date('2026-11-21T10:00:00Z') });
assert.match(txt, /Rapportcijfer/);
assert.match(txt, /laagste 0,1%/);
assert.ok(!/https?:|@|[A-Z]:\\/.test(txt), 'het exportbestand bevat niets persoonlijks of een link');
assert.equal(exportName(new Date('2026-11-21T10:00:00Z')), 'gde-benchmark-2026-11-21.txt');

// 6. DS3-markup: kaarten, toets in de knop, rollen voor schermlezer en pad, geen vaste kleuren of pixels
const ch = choiceHtml(choiceModel(DEFAULT_CHOICE, { preset: 'vlot', presetLabel: 'Hoog' }));
assert.match(ch, /role="radiogroup"/);
assert.equal((ch.match(/role="radio"/g) || []).length, 4);
assert.equal((ch.match(/aria-checked="true"/g) || []).length, 3, 'twee gekozen kaarten en de schakelaar aan');
assert.match(ch, /role="switch"/);
assert.ok(!/\{ESC\}|\{ENTER\}|\{ARROWS\}/.test(ch), 'toetsen zijn glyphs, geen losse tokens');
assert.match(ch, /data-act="start"/);
assert.match(ch, /data-act="cancel"/);
const rh = reportHtml(reportCard({ stats, preset: 'vlot', course: 'film', prev, presetFps: { vlot: 75, laag: 130 }, size: [1920, 1080] }));
for (const a of ['apply', 'again', 'export', 'settings', 'diag', 'back']) assert.match(rh, new RegExp(`data-act="${a}"`), a);
assert.match(rh, /<div class="bm-grafiek" role="img" aria-label=/);
assert.match(rh, /bm-cijferblok/);
assert.ok(!/\{ESC\}|\{ENTER\}/.test(rh));
assert.ok(!/(#[0-9a-fA-F]{3,6}\b|rgb\()/.test(ch + rh), 'kleuren komen uit tokens');
assert.ok((graphHtml(ser).match(/<i /g) || []).length >= 10 && !/<svg/.test(graphHtml(ser)), 'de grafiek is gewone elementen');
assert.equal(graphHtml([]), '');
assert.match(graphHtml([{ t: 0, fps: 20 }, { t: 1, fps: 90 }]), /bm-dip/, 'een stuk onder 30 fps is gemarkeerd');
assert.match(reportHtml(reportCard({ stats: null })), /Er is niets gemeten/);
// ontwerp: de stijlen staan op tokens
const css = fs.readFileSync(new URL('../game/js/ds-schermen.css', import.meta.url), 'utf8');
const bm = css.slice(css.indexOf('Benchmark, keuzescherm'));
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(bm), 'geen hexkleuren in de benchmark-stijlen');
console.log(`benchmarkmodel_test: ok (film ${filmSec.toFixed(1)} s, kort ${kortSec.toFixed(1)} s)`);
// #1230: Nederlandse titel, elke keuzegroep een kop, geen voetregel met dezelfde toetsen als de knoppen
{
  const model = choiceModel(DEFAULT_CHOICE, { preset: 'vlot', presetLabel: 'Hoog' });
  const html = choiceHtml(model);
  assert.equal(model.title, 'Prestatietest', 'de titel is Nederlands');
  assert.ok(!/Benchmark/.test(html.replace(/<[^>]+>/g, ' ')), 'het woord Benchmark staat niet op het keuzescherm');
  assert.ok(/<h3 class="bm-groepkop" id="bm-kop-route">Route<\/h3>/.test(html) && /<h3 class="bm-groepkop" id="bm-kop-lengte">Lengte<\/h3>/.test(html), 'Route en Lengte hebben een kop');
  assert.ok(/role="radiogroup" aria-labelledby="bm-kop-route"/.test(html) && /role="radiogroup" aria-labelledby="bm-kop-lengte"/.test(html), 'de groepen wijzen naar hun kop');
  assert.ok(!/tr-keys/.test(html), 'geen voetregel met toetsen: ze staan in de knoppen');
  assert.ok(/bm-meta, #bench-choice \.bm-duur \{ white-space: nowrap/.test(css), 'de duurchips breken niet over twee regels');
}

// #1230: ook de rij in Instellingen > Beeld en de bevestiging heten Prestatietest, niet Benchmark
{
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  assert.ok(/rowName\('Prestatietest', /.test(pm), 'de rij in Beeld heet Prestatietest');
  assert.ok(!/rowName\('Benchmark'/.test(pm) && !/>Benchmark draaien</.test(pm) && !/'Benchmark starten\?/.test(pm), 'geen Engels woord Benchmark in de rij of de bevestiging');
}
