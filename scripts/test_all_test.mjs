// Tests van de pure delen van scripts/test_all.mjs: rapportage, diff, logscans, issue-concepten en PNG-checks.
//   node scripts/test_all_test.mjs
import assert from 'node:assert/strict';
import * as R from './lib/testrapport.mjs';
import { decodePng, encodePng, analyseImage, signature, signatureDiff } from './lib/pngcheck.mjs';
import { statusVan } from './test_all.mjs';

const it = (id, status, detail = '', secs = 1, extra = {}) => R.maakItem('licht', id, id, status, secs, detail, extra);

// normalizeFoutregel: getallen, paden en hex-ids vallen weg
assert.equal(R.normalizeFoutregel('Fout op regel 42 in C:\\Users\\x\\a.js na 3.5s'), 'Fout op regel # in <pad> na #s');
assert.equal(R.normalizeFoutregel('\n\nAssertionError: 12 !== 13\nstack'), 'AssertionError: # !== #');
assert.equal(R.eersteFout('ok\nregel\nAssertionError: x\nlaatste'), 'AssertionError: x');

// fingerprint: stabiel bij andere getallen, anders bij een andere fout of id
const a = it('t1', 'FAIL', 'Error: 5 items'), b = it('t1', 'FAIL', 'Error: 9 items'), c = it('t1', 'FAIL', 'Error: iets anders'), d = it('t2', 'FAIL', 'Error: 5 items');
assert.equal(R.fingerprint(a), R.fingerprint(b));
assert.notEqual(R.fingerprint(a), R.fingerprint(c));
assert.notEqual(R.fingerprint(a), R.fingerprint(d));
assert.equal(R.fingerprint(it('t1', 'PASS', 'x')), R.fingerprint(it('t1', 'PASS', 'y')));

// diffRuns
const prev = [it('a', 'PASS'), it('b', 'FAIL', 'Error: kapot'), it('c', 'FAIL', 'Error: oud'), it('d', 'PASS', '', 10), it('weg', 'PASS')];
const cur = [it('a', 'FAIL', 'Error: nieuw'), it('b', 'FAIL', 'Error: kapot'), it('c', 'PASS'), it('d', 'PASS', '', 20), it('e', 'FAIL', 'Error: vers')];
const df = R.diffRuns(prev, cur);
assert.deepEqual(df.nieuweFouten.sort(), ['a', 'e']);
assert.deepEqual(df.blijftFout, ['b']);
assert.deepEqual(df.opgelost, ['c']);
assert.deepEqual(df.traag, [{ id: 'd', was: 10, nu: 20 }]);
assert.deepEqual(df.nieuw, ['e']);
assert.deepEqual(df.verdwenen, ['weg']);
// dezelfde fout met een andere melding telt als nieuw
assert.deepEqual(R.diffRuns([it('x', 'FAIL', 'Error: A')], [it('x', 'FAIL', 'Error: B')]).nieuweFouten, ['x']);
// geen vorige run: alles wat faalt is nieuw, niets is "nieuw item"
const eerste = R.diffRuns([], [it('x', 'FAIL', 'Error')]);
assert.deepEqual(eerste.nieuweFouten, ['x']); assert.deepEqual(eerste.nieuw, []);
// kleine tijdsverschillen zijn geen trend
assert.deepEqual(R.diffRuns([it('s', 'PASS', '', 1)], [it('s', 'PASS', '', 3)]).traag, []);

// scanLog
const gevonden = R.scanLog([
  '[renderer] Uncaught ReferenceError: x', "ReferenceError: Cannot access 'gameBusy' before initialization",
  "SyntaxError: The requested module './a.js' does not provide an export named 'zz'",
  'THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN.', '[load failed] -6 ERR', 'gewone regel',
  '[renderer] Uncaught ReferenceError: x',
].join('\n'));
assert.deepEqual(gevonden.map((g) => g.soort), ['renderer', 'tdz', 'import', 'nan', 'renderer']);
assert.deepEqual(R.scanLog('alles goed\n[story-test] PASS: 3 steps'), []);

// parseStoryLog
const sl = R.parseStoryLog('[story-test] FAIL: 120 steps, 2 failed checks, report in x\n[story-test] FAIL ring vrij ja\n[story-test] error boem\n[story-test] FAIL 4 NaN geometry warnings (computeBoundingSphere)');
assert.equal(sl.result, 'FAIL'); assert.equal(sl.steps, 120); assert.equal(sl.failedChecks, 2); assert.equal(sl.nanWaarschuwingen, 4); assert.equal(sl.fails.length, 3);
assert.equal(R.parseStoryLog('[story-test] PASS: 5 steps, 0 failed checks, report in x').result, 'PASS');
assert.equal(R.parseStoryLog('niets').gehaald, false);
assert.equal(R.parseStoryLog('[story-test] timeout').timeout, true);

// frametijd
assert.deepEqual(R.parseFrameStats('x\n[perf] {"exp":{"a":{"fps":42,"p50":23.1}},"b":1}'), { fps: 42, p50: 23.1, p95: null });
assert.equal(R.parseFrameStats('[perf] kapot{'), null);
assert.equal(R.beoordeelFrames(null).status, 'SKIP');
assert.equal(R.beoordeelFrames({ fps: 1 }).status, 'FAIL');
assert.equal(R.beoordeelFrames({ fps: 20, p50: 40 }, { fps: 60 }).warn, true);
assert.equal(R.beoordeelFrames({ fps: 50 }, { fps: 60 }).warn, false);

// beelden: PNG-rondreis en verdicts
const maak = (w, h, f) => { const px = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set(f(x, y), (y * w + x) * 4); return { w, h, px }; };
const dec = (o) => decodePng(encodePng(o.w, o.h, o.px));
const zwart = analyseImage(dec(maak(64, 36, () => [0, 0, 0, 255])));
assert.equal(zwart.verdict, 'zwart');
assert.equal(analyseImage(dec(maak(64, 36, () => [90, 120, 200, 255]))).verdict, 'leeg');
assert.equal(analyseImage(dec(maak(64, 36, () => [255, 0, 255, 255]))).verdict, 'ongeldig');
assert.equal(analyseImage(dec(maak(64, 36, () => [10, 10, 10, 0]))).verdict, 'ongeldig');
const lopend = maak(64, 36, (x, y) => [x * 4, y * 7, 80, 255]);
assert.equal(analyseImage(dec(lopend)).verdict, 'ok');
assert.deepEqual([...dec(lopend).rgba.slice(0, 8)], [...lopend.px.slice(0, 8)]);
assert.throws(() => decodePng(Buffer.from('geen png, wel lang genoeg om de lengtecontrole te halen')), /geen PNG/);
// handtekening: gelijk beeld -> 0, omgekeerd beeld -> groot, grootte maakt niet uit
const s1 = signature(dec(lopend)), s2 = signature(dec(maak(128, 72, (x, y) => [x * 2, y * 3.5, 80, 255])));
assert.equal(s1.length, 32 * 18);
assert.equal(signatureDiff(s1, s1), 0);
assert.ok(signatureDiff(s1, s2) < 0.02);
assert.ok(signatureDiff(s1, signature(dec(maak(64, 36, (x, y) => [255 - x * 4, 255 - y * 7, 80, 255])))) > 0.1);
assert.equal(signatureDiff(null, s1), null); assert.equal(signatureDiff([1], [1, 2]), null);
assert.equal(R.beoordeelBeeld(zwart, null).status, 'FAIL');
assert.equal(R.beoordeelBeeld({ verdict: 'ok', black: 0, transparent: 0, magenta: 0, std: 30 }, 0.2).warn, true);
assert.equal(R.beoordeelBeeld({ verdict: 'ok', black: 0, transparent: 0, magenta: 0, std: 30 }, 0.01).warn, false);

// samenvatting en Markdown: eerlijk over niet gedraaid en over mensen
const items = [it('a', 'PASS'), it('b', 'FAIL', 'Error: kapot'), it('c', 'SKIP', 'niet gedraaid: game/world ontbreekt'), it('d', 'TIMEOUT', 'tijdslimiet')];
const rapport = { stamp: '20260101-000000', fases: { licht: { gedraaid: true, items, secs: 12, diff: R.diffRuns([], items), vorige: null } } };
const sam = R.samenvatting(rapport).join('\n');
assert.match(sam, /2 items mislukt: 1 geslaagd, 1 mislukt, 1 over de tijdslimiet, 1 niet gedraaid/);
assert.match(sam, /Fasen niet gedraaid: zwaar, electron/);
assert.match(sam, /Niemand heeft/);
const md = R.renderMarkdown(rapport);
assert.ok(md.indexOf('## Samenvatting') < md.indexOf('## Licht'));
assert.match(md, /\*\*Niet gedraaid\*\* in deze run/);
assert.match(md, /game\/world ontbreekt/);
assert.match(md, /\| b \| FAIL \(nieuw\)/);
assert.match(R.samenvatting({ stamp: 'x', fases: {} }).join(' '), /Er is niets gedraaid/);
assert.ok(!R.samenvatting({ ...rapport, toon: ['licht'] }).join(' ').includes('niet gedraaid: zwaar'));

// issue-concepten: alleen nieuwe fouten, niet als er al een issue is
const concepten = R.issueConcepten(rapport);
assert.deepEqual(concepten.map((c) => c.fp), [R.fingerprint(items[1])]); // de timeout krijgt geen concept
assert.match(concepten[0].body, /testall-afdruk: [0-9a-f]{8}/);
assert.equal(R.issueConcepten(rapport, { [R.fingerprint(items[1])]: 7 }).length, 0);
const zonderNieuw = { ...rapport, fases: { licht: { ...rapport.fases.licht, diff: R.diffRuns(items, items) } } };
assert.equal(R.issueConcepten(zonderNieuw).length, 0);

// staat: laatste run per fase
const st = R.werkStaatBij(R.werkStaatBij({}, 'licht', 's1', [it('a', 'PASS')]), 'zwaar', 's2', []);
assert.equal(st.fases.licht.stamp, 's1'); assert.equal(st.fases.zwaar.stamp, 's2');

// statusVan: een script dat zelf SKIP meldt telt als niet gedraaid
assert.equal(statusVan({ code: 0, out: 'SKIP geen index', timedOut: false }), 'SKIP');
assert.equal(statusVan({ code: 1, out: 'Error', timedOut: false }), 'FAIL');
assert.equal(statusVan({ code: null, out: '', timedOut: true }), 'TIMEOUT');
assert.equal(statusVan({ code: 1, out: "Cannot find package 'three' imported", timedOut: false }), 'SKIP');
console.log('test_all_test: ok');
