// Test voor de visuele releasegate (scripts/release/visual_gate.mjs) en de contactbladen
// (scripts/release/contactsheet.mjs). Zonder Electron, netwerk of npm: alle beelden worden hier met
// encodePng gemaakt en in een tijdelijke map gezet, die aan het eind weer weg gaat.
//   node scripts/release_visual_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encodePng, decodePng, analyseImage } from './lib/pngcheck.mjs';
import * as gate from './release/visual_gate.mjs';
import * as sheet from './release/contactsheet.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-visual-test-'));
const GATE = path.join(HERE, 'release', 'visual_gate.mjs');

let checks = 0, fails = 0;
const ok = (cond, name, info = '') => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); }
};
const eq = (actual, expected, name) => ok(actual === expected, name, `${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);

// ---- testbeelden ----
const solid = (w, h, r, g, b, a = 255) => {
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a; }
  return rgba;
};
const gradient = (w, h, shift = 0) => {
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      rgba[i] = (x + shift) * 255 / w;
      rgba[i + 1] = y * 255 / h;
      rgba[i + 2] = ((x + y + shift) % 32) * 8;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
};
const barcode = (w, h) => {
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const light = Math.floor((x * 8) / w) % 2 === 0;
      rgba[i] = light ? 230 : 25;
      rgba[i + 1] = light ? 225 : 30;
      rgba[i + 2] = light ? 210 : 40;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
};
const writePng = (file, w, h, rgba) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePng(w, h, rgba));
};
const readPng = (file) => decodePng(fs.readFileSync(file));

// ---- hulpfuncties op de gate ----
const inspectDirs = (dirs) => {
  const scan = gate.scanImageDirs(dirs);
  const items = scan.images.map((entry) => {
    try {
      const image = decodePng(fs.readFileSync(entry.bestand));
      return { ...entry, fingerprint: gate.fingerprintImage(image), analysis: analyseImage(image), decodeError: null };
    } catch (e) {
      return { ...entry, fingerprint: null, analysis: null, decodeError: e.message };
    }
  });
  return { scan, items };
};
const byKey = (images, key) => images.find((image) => image.key === key);
const runGate = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const BEVINDING_KEYS = new Set(['bron', 'aspect', 'ernst', 'categorie', 'titel', 'beschrijving', 'bewijs', 'bestanden', 'beeld', 'fix', 'reviewer', 'issue']);
const ERNST = new Set(['blokkerend', 'belangrijk', 'nit']);
const findingIsValid = (f) => {
  if (!f || typeof f !== 'object') return false;
  if (!Object.keys(f).every((key) => BEVINDING_KEYS.has(key))) return false;
  if (!['bron', 'aspect', 'ernst', 'categorie', 'titel', 'beschrijving'].every((key) => typeof f[key] === 'string' && f[key].length)) return false;
  if (!ERNST.has(f.ernst)) return false;
  if (f.titel.length < 4 || f.titel.length > 120) return false;
  if (f.beschrijving.length < 10 || f.beschrijving.length > 2000) return false;
  if (f.categorie.length < 2 || f.categorie.length > 40) return false;
  if (f.ernst === 'blokkerend' && (!Array.isArray(f.bewijs) || f.bewijs.length === 0)) return false;
  if (f.bewijs !== undefined && (!Array.isArray(f.bewijs) || f.bewijs.some((b) => typeof b !== 'string' || !b))) return false;
  return true;
};

try {
  // ---- dHash en hamming ----
  const gradientImage = { w: 64, h: 36, rgba: gradient(64, 36) };
  const fp = gate.fingerprintImage(gradientImage);
  eq(fp.sig.length, 576, 'fingerprint: handtekening is 32x18');
  ok(/^[0-9a-f]{16}$/.test(fp.dhash), 'fingerprint: dHash is 16 hex-tekens', fp.dhash);
  eq(fp.w, 64, 'fingerprint: breedte');
  eq(gate.hammingHex('0000000000000000', '0000000000000000'), 0, 'hamming: gelijk is 0');
  eq(gate.hammingHex('0000000000000000', '0000000000000001'), 1, 'hamming: één bit');
  eq(gate.hammingHex('0000000000000000', 'ffffffffffffffff'), 64, 'hamming: alle 64 bits');
  eq(gate.hammingHex('abc', 'abcd'), null, 'hamming: ongelijke lengte is null');
  eq(gate.hammingHex('zzzz', '0000'), null, 'hamming: geen hex is null');

  // ---- vergelijken ----
  const zeroSig = Array(576).fill(0), fullSig = Array(576).fill(255);
  const unchanged = gate.compareFingerprints({ w: 10, h: 10, sig: zeroSig, dhash: '0000000000000000' }, { w: 10, h: 10, sig: zeroSig, dhash: '0000000000000000' }, 0.08);
  ok(unchanged && unchanged.gewijzigd === false, 'vergelijken: identiek is ongewijzigd');
  const bySig = gate.compareFingerprints({ w: 10, h: 10, sig: fullSig, dhash: '0000000000000000' }, { w: 10, h: 10, sig: zeroSig, dhash: '0000000000000000' }, 0.08);
  ok(bySig && bySig.gewijzigd === true, 'vergelijken: handtekeningverschil boven drempel is gewijzigd');
  const byHash = gate.compareFingerprints({ w: 10, h: 10, sig: zeroSig, dhash: 'ffffffffffffffff' }, { w: 10, h: 10, sig: zeroSig, dhash: '0000000000000000' }, 0.08);
  ok(byHash && byHash.gewijzigd === true, 'vergelijken: dHash-afstand boven 8 bits is gewijzigd');
  const netBelow = gate.compareFingerprints({ w: 10, h: 10, sig: zeroSig, dhash: '0'.repeat(14) + 'ff' }, { w: 10, h: 10, sig: zeroSig, dhash: '0'.repeat(16) }, 0.08);
  ok(netBelow && netBelow.gewijzigd === false, 'vergelijken: 8 bits verschil is nog niet gewijzigd');

  // ---- automatische checks en bevindingen ----
  const autoDir = path.join(TMP, 'auto');
  writePng(path.join(autoDir, 'ok.png'), 80, 45, gradient(80, 45));
  writePng(path.join(autoDir, 'zwart.png'), 80, 45, solid(80, 45, 0, 0, 0));
  writePng(path.join(autoDir, 'leeg.png'), 80, 45, solid(80, 45, 120, 120, 120));
  writePng(path.join(autoDir, 'magenta.png'), 80, 45, solid(80, 45, 255, 0, 255));
  writePng(path.join(autoDir, 'transparant.png'), 80, 45, solid(80, 45, 10, 200, 30, 0));
  fs.writeFileSync(path.join(autoDir, 'kapot.png'), 'dit is geen png');
  const auto = inspectDirs([autoDir]);
  eq(auto.scan.images.length, 6, 'scan: zes beelden');
  const autoRun = gate.evaluateImages(auto.items, {}, 0.08);
  ok(autoRun.baselineActive === false, 'geen baseline: niet actief');
  eq(autoRun.melding, 'geen baseline: eerste run stelt geen regressie vast', 'geen baseline: melding');
  eq(byKey(autoRun.images, 'ok.png').status, 'geen-baseline', 'gezond beeld zonder baseline');
  eq(byKey(autoRun.images, 'zwart.png').status, 'auto-fout', 'zwart beeld is auto-fout');
  eq(byKey(autoRun.images, 'leeg.png').status, 'auto-fout', 'leeg beeld is auto-fout');
  eq(byKey(autoRun.images, 'magenta.png').status, 'auto-fout', 'magenta beeld is auto-fout');
  eq(byKey(autoRun.images, 'transparant.png').status, 'auto-fout', 'transparant beeld is auto-fout');
  eq(byKey(autoRun.images, 'kapot.png').status, 'auto-fout', 'onleesbaar bestand is auto-fout');
  ok(/png/i.test(byKey(autoRun.images, 'kapot.png').decodeFout || ''), 'onleesbaar bestand: decodeerfout bewaard');
  const autoFindings = gate.buildFindings(autoRun.images, { baselineActive: false, threshold: 0.08 });
  eq(autoFindings.length, 5, 'auto-fouten: vijf blokkerende bevindingen');
  ok(autoFindings.every((f) => f.ernst === 'blokkerend' && f.bron === 'baseline' && f.aspect === 'visual'), 'auto-fouten: ernst, bron en aspect');
  ok(autoFindings.every(findingIsValid), 'auto-fouten: bevindingen volgens het schema');
  ok(autoFindings.every((f) => Array.isArray(f.bewijs) && f.bewijs.includes(f.beeld)), 'auto-fouten: bewijs noemt het beeld');
  ok(!autoFindings.some((f) => /ok\.png/.test(f.titel)), 'zonder baseline: geen bevinding voor een gezond beeld');

  // ---- baseline roundtrip ----
  const baseDir = path.join(TMP, 'base');
  writePng(path.join(baseDir, 'a.png'), 80, 45, gradient(80, 45));
  writePng(path.join(baseDir, 'b.png'), 80, 45, gradient(80, 45, 13));
  const baseScan = inspectDirs([baseDir]);
  const before = gate.evaluateImages(baseScan.items, {}, 0.08);
  const baseline = gate.baselineFromImages(before.images, '2026-01-02T03:04:05.000Z');
  eq(Object.keys(baseline.images).length, 2, 'baseline: twee beelden');
  eq(baseline.schema, 1, 'baseline: schema 1');
  eq(gate.baselineFromImages(before.images, 'x').gemaakt, 'x', 'baseline: gemaakt overgenomen');
  ok(baseline.images['a.png'].sig.length === 576 && /^[0-9a-f]{16}$/.test(baseline.images['a.png'].dhash), 'baseline: fingerprint per beeld');
  const baseFile = path.join(TMP, 'baselines', 'visual-baseline.json');
  gate.writeBaselineFile(baseFile, baseline);
  const readBack = gate.readBaselineFile(baseFile);
  ok(readBack.aanwezig && readBack.baseline.schema === 1, 'baseline: teruggelezen');
  eq(readBack.baseline.gemaakt, '2026-01-02T03:04:05.000Z', 'baseline: gemaakt bewaard');
  const after = gate.evaluateImages(baseScan.items, readBack.baseline.images, 0.08);
  ok(after.baselineActive, 'baseline: actief met twee beelden');
  ok(after.images.every((image) => image.status === 'ongewijzigd'), 'baseline: ongewijzigd na roundtrip');
  ok(after.images.every((image) => image.vergelijking && image.vergelijking.sigDiff === 0 && image.vergelijking.hamming === 0), 'baseline: vergelijking is nul');
  eq(after.counts.ongewijzigd, 2, 'baseline: telling ongewijzigd');
  eq(gate.buildFindings(after.images, { baselineActive: true, threshold: 0.08 }).length, 0, 'baseline: geen bevindingen bij gelijke beelden');
  eq(after.melding, null, 'baseline: geen melding als de baseline actief is');

  // ---- gewijzigd beeld ----
  writePng(path.join(baseDir, 'a.png'), 80, 45, barcode(80, 45));
  const changedScan = inspectDirs([baseDir]);
  const changedRun = gate.evaluateImages(changedScan.items, readBack.baseline.images, 0.08);
  const changed = byKey(changedRun.images, 'a.png');
  ok(changed.status === 'gewijzigd', 'gewijzigd: status', changed.status);
  ok(changed.vergelijking && changed.vergelijking.sigDiff > 0.08, 'gewijzigd: handtekeningverschil boven drempel');
  const changedFindings = gate.buildFindings(changedRun.images, { baselineActive: true, threshold: 0.08 });
  eq(changedFindings.length, 1, 'gewijzigd: één bevinding');
  ok(changedFindings[0].ernst === 'belangrijk' && findingIsValid(changedFindings[0]), 'gewijzigd: belangrijk en volgens schema');
  const changedReview = gate.selectReview(changedRun.images, 36);
  ok(changedReview.reviewset.some((image) => image.key === 'a.png' && image.reviewBron === 'must'), 'gewijzigd: in de reviewset als must');
  ok(changedReview.reviewset.some((image) => image.key === 'b.png' && image.reviewBron === 'dekking'), 'ongewijzigd: als dekking');

  // ---- nieuw en verdwenen ----
  const lifeDir = path.join(TMP, 'life');
  writePng(path.join(lifeDir, 'a.png'), 80, 45, gradient(80, 45));
  writePng(path.join(lifeDir, 'b.png'), 80, 45, gradient(80, 45, 7));
  const lifeBefore = inspectDirs([lifeDir]);
  const lifeBaseline = gate.baselineFromImages(gate.evaluateImages(lifeBefore.items, {}, 0.08).images);
  writePng(path.join(lifeDir, 'c.png'), 80, 45, gradient(80, 45, 21));
  const grown = inspectDirs([lifeDir]);
  const grownRun = gate.evaluateImages(grown.items, lifeBaseline.images, 0.08);
  eq(byKey(grownRun.images, 'c.png').status, 'nieuw', 'nieuw: onbekend beeld');
  const newFindings = gate.buildFindings(grownRun.images, { baselineActive: true, threshold: 0.08 });
  ok(newFindings.some((f) => f.ernst === 'belangrijk' && /c\.png/.test(f.beeld)), 'nieuw: belangrijke bevinding');
  fs.rmSync(path.join(lifeDir, 'b.png'));
  const shrunk = inspectDirs([lifeDir]);
  const shrunkRun = gate.evaluateImages(shrunk.items, lifeBaseline.images, 0.08);
  eq(shrunkRun.disappeared.length, 1, 'verdwenen: één beeld');
  eq(shrunkRun.disappeared[0].key, 'b.png', 'verdwenen: juiste sleutel');
  eq(shrunkRun.disappeared[0].status, 'verdwenen', 'verdwenen: status');
  ok(!gate.buildFindings(shrunkRun.images, { baselineActive: true, threshold: 0.08 }).some((f) => /b\.png/.test(f.beeld)), 'verdwenen: geen bevinding (informatie)');

  // ---- reviewset begrenzen en batchen ----
  const makeUnchanged = (count) => Array.from({ length: count }, (_, i) => ({ key: `img-${String(i).padStart(3, '0')}.png`, status: 'ongewijzigd' }));
  const many = makeUnchanged(60);
  const shuffled = many.slice().reverse();
  const review = gate.selectReview(shuffled, 36);
  eq(review.reviewset.length, 36, 'reviewset: begrensd op max-review');
  eq(review.maximum, 36, 'reviewset: maximum bewaard');
  eq(review.verplicht, 0, 'reviewset: geen must bij ongewijzigd');
  eq(review.overschrijdtMaximum, false, 'reviewset: maximum niet overschreden');
  const keys = review.reviewset.map((image) => image.key);
  eq(new Set(keys).size, 36, 'reviewset: geen dubbelen');
  const reviewAgain = gate.selectReview(many.slice().sort((a, b) => (b.key < a.key ? -1 : 1)), 36);
  ok(reviewAgain.reviewset.map((image) => image.key).join(',') === keys.join(','), 'reviewset: deterministisch');
  ok(keys[0] === 'img-000.png' && keys[keys.length - 1] === 'img-059.png', 'reviewset: dekking over het hele bereik', `${keys[0]} .. ${keys[keys.length - 1]}`);
  const batched = gate.buildBatches(review.reviewset, 9);
  eq(batched.length, 4, 'batches: 36 beelden in 4 batches');
  ok(batched.map((batch) => batch.beelden.length).join(',') === '9,9,9,9', 'batches: negen per batch');
  ok(batched.map((batch) => batch.nummer).join(',') === '1,2,3,4', 'batches: genummerd');
  const mixed = [
    { key: 'n.png', status: 'nieuw' }, { key: 'g.png', status: 'gewijzigd' }, { key: 'a.png', status: 'auto-fout' },
    ...Array.from({ length: 20 }, (_, i) => ({ key: `o-${String(i).padStart(3, '0')}.png`, status: 'ongewijzigd' })),
  ];
  const mixedReview = gate.selectReview(mixed, 10);
  eq(mixedReview.reviewset.length, 10, 'reviewset: must eerst, dan dekking');
  ok(mixedReview.reviewset.slice(0, 3).every((image) => image.reviewBron === 'must'), 'reviewset: must-review staat vooraan');
  ok(mixedReview.reviewset.slice(0, 3).map((image) => image.status).join(',') === 'auto-fout,gewijzigd,nieuw', 'reviewset: volgorde auto-fout, gewijzigd, nieuw');
  ok(mixedReview.reviewset.slice(3).every((image) => image.reviewBron === 'dekking'), 'reviewset: rest is dekking');
  const tight = gate.selectReview(mixed, 2);
  ok(tight.reviewset.length === 3 && tight.overschrijdtMaximum === true, 'reviewset: must gaat altijd mee en meldt overschrijding');

  // ---- contactbladen ----
  const sheetDir = path.join(TMP, 'sheet');
  const loose = [];
  for (let i = 0; i < 10; i++) {
    const file = path.join(sheetDir, `beeld-${String(i).padStart(2, '0')}.png`);
    writePng(file, 80, 45, gradient(80, 45, i));
    loose.push(file);
  }
  const pure = sheet.buildContactSheet([readPng(loose[0])]);
  eq(pure.w, 1440, 'contactblad: 3x3 breedte');
  eq(pure.h, 810, 'contactblad: 3x3 hoogte');
  eq(pure.tiles.length, 1, 'contactblad: één tegel');
  eq(pure.tiles[0].w, 480, 'contactblad: tegel 480 px breed');
  const bgIndex = ((809 * pure.w) + 1439) * 4;
  ok(pure.rgba[bgIndex] === sheet.BACKGROUND[0] && pure.rgba[bgIndex + 3] === 255, 'contactblad: achtergrond donker chroom');
  const tilePixel = ((135 * pure.w) + 240) * 4;
  ok(pure.rgba[tilePixel + 1] > 30, 'contactblad: tegel bevat beeld');
  const sheetOut = path.join(TMP, 'out-sheets');
  const written = sheet.writeContactSheets(loose, sheetOut);
  eq(written.sheets.length, 2, 'contactbladen: tien beelden op twee bladen');
  ok(fs.existsSync(path.join(sheetOut, 'vision', 'contact', 'blad-01.png')), 'contactbladen: blad-01 geschreven');
  ok(fs.existsSync(path.join(sheetOut, 'vision', 'contact', 'blad-02.png')), 'contactbladen: blad-02 geschreven');
  const sheetImage = readPng(path.join(sheetOut, 'vision', 'contact', 'blad-01.png'));
  eq(sheetImage.w, 1440, 'contactbladen: blad leesbaar en 1440 breed');
  eq(sheetImage.h, 810, 'contactbladen: blad leesbaar en 810 hoog');
  const bladenTekst = fs.readFileSync(path.join(sheetOut, 'vision', 'contact', 'bladen.txt'), 'utf8');
  ok(/^blad-01\.png: .*beeld-00\.png/m.test(bladenTekst), 'contactbladen: bladen.txt noemt de beelden');
  ok(bladenTekst.includes('beeld-09.png'), 'contactbladen: laatste beeld op blad 2 staat in bladen.txt');
  const kapotSheet = path.join(TMP, 'out-kapot');
  const corrupt = path.join(TMP, 'kapot.png');
  fs.writeFileSync(corrupt, 'geen png');
  const kapotResult = sheet.writeContactSheets([loose[0], corrupt, loose[1]], kapotSheet);
  eq(kapotResult.fouten.length, 1, 'contactbladen: onleesbaar bestand gemeld');
  eq(readPng(path.join(kapotSheet, 'vision', 'contact', 'blad-01.png')).w, 1440, 'contactbladen: blad met onleesbare tegel geschreven');

  // ---- scan: meerdere mappen, _-bestanden en geneste mappen ----
  const d1 = path.join(TMP, 'multi', 'd1'), d2 = path.join(TMP, 'multi', 'd2');
  writePng(path.join(d1, 'a.png'), 40, 30, gradient(40, 30));
  writePng(path.join(d1, 'sub', 'diep.png'), 40, 30, gradient(40, 30, 5));
  writePng(path.join(d1, '_over.png'), 40, 30, solid(40, 30, 0, 0, 0));
  writePng(path.join(d2, 'a.png'), 40, 30, gradient(40, 30, 9));
  const multi = gate.scanImageDirs([d1, d2]);
  eq(multi.images.map((image) => image.key).join(','), 'd1/a.png,d1/sub/diep.png,d2/a.png', 'scan: sleutels met mapnaam en geneste bestanden');
  eq(multi.overgeslagen.length, 1, 'scan: _-bestand overgeslagen');
  const single = gate.scanImageDirs([d1]);
  ok(single.images.some((image) => image.key === 'a.png'), 'scan: één map geeft sleutel zonder prefix');
  ok(single.images.some((image) => image.key === 'sub/diep.png'), 'scan: genest pad met / als scheiding');
  let scanFailed = false;
  try { gate.scanImageDirs([path.join(TMP, 'bestaat-niet')]); } catch { scanFailed = true; }
  ok(scanFailed, 'scan: ontbrekende map geeft een fout');

  // ---- --update weigert bij auto-fout ----
  const updateFile = path.join(TMP, 'update-baseline.json');
  gate.writeBaselineFile(updateFile, { schema: 1, gemaakt: null, images: {} });
  const refused = gate.updateBaselineFile({ file: updateFile, images: autoRun.images, hasAutoErrors: true, now: '2026-01-01T00:00:00.000Z' });
  eq(refused.geschreven, false, 'update: weigert bij auto-fout');
  eq(Object.keys(readJson(updateFile).images).length, 0, 'update: baseline ongemoeid bij auto-fout');
  const allowed = gate.updateBaselineFile({ file: path.join(TMP, 'update-ok.json'), images: before.images, hasAutoErrors: false, now: '2026-01-01T00:00:00.000Z' });
  ok(allowed.geschreven && allowed.aantal === 2, 'update: schrijft zonder auto-fout');

  // ---- CLI ----
  const cliGreenDir = path.join(TMP, 'cli-green');
  writePng(path.join(cliGreenDir, 'een.png'), 80, 45, gradient(80, 45));
  writePng(path.join(cliGreenDir, 'twee.png'), 80, 45, gradient(80, 45, 4));
  writePng(path.join(cliGreenDir, '_skip.png'), 80, 45, solid(80, 45, 0, 0, 0));
  fs.writeFileSync(path.join(cliGreenDir, 'notitie.txt'), 'geen png');
  const greenOut = path.join(TMP, 'out-green');
  const green = runGate([`--images=${cliGreenDir}`, `--baseline=${path.join(TMP, 'geen-baseline.json')}`, `--out=${greenOut}`]);
  eq(green.status, 0, 'CLI groen: exit 0', green.stderr);
  ok(fs.existsSync(path.join(greenOut, 'manifest.json')), 'CLI groen: manifest.json');
  ok(fs.existsSync(path.join(greenOut, 'visual-gate.json')), 'CLI groen: visual-gate.json');
  ok(fs.existsSync(path.join(greenOut, 'findings', 'auto-visual.json')), 'CLI groen: findings/auto-visual.json');
  ok(fs.existsSync(path.join(greenOut, 'vision', 'vision-pack.md')), 'CLI groen: vision-pack.md');
  ok(fs.existsSync(path.join(greenOut, 'vision', 'vision-batches.json')), 'CLI groen: vision-batches.json');
  ok(fs.existsSync(path.join(greenOut, 'vision', 'contact', 'blad-01.png')), 'CLI groen: contactblad');
  const greenGate = readJson(path.join(greenOut, 'visual-gate.json'));
  eq(greenGate.verdict, 'groen', 'CLI groen: verdict');
  eq(greenGate.tellingen.beelden, 2, 'CLI groen: _-bestand niet meegeteld');
  eq(greenGate.melding, 'geen baseline: eerste run stelt geen regressie vast', 'CLI groen: melding zonder baseline');
  ok(Array.isArray(greenGate.reviewset) && greenGate.reviewset.length === 2, 'CLI groen: reviewset array met dekking');
  ok(Array.isArray(greenGate.batches) && greenGate.batches.length === 1 && greenGate.batches[0].beelden.length === 2, 'CLI groen: batch met beelden');
  ok(!fs.existsSync(path.join(TMP, 'geen-baseline.json')), 'CLI groen: geen baseline geschreven zonder --update');
  const greenFindings = readJson(path.join(greenOut, 'findings', 'auto-visual.json'));
  ok(Array.isArray(greenFindings) && greenFindings.length === 0, 'CLI groen: geen auto-bevindingen zonder baseline');
  const greenPack = fs.readFileSync(path.join(greenOut, 'vision', 'vision-pack.md'), 'utf8');
  ok(greenPack.includes('Batch 1') && greenPack.includes('vision/contact/blad-01.png'), 'CLI groen: pack noemt batch en contactblad');
  ok(greenPack.includes('Strikte uitvoer') && greenPack.includes('reviewrapport'), 'CLI groen: pack heeft strikte uitvoer');
  const greenBatches = readJson(path.join(greenOut, 'vision', 'vision-batches.json'));
  ok(Array.isArray(greenBatches.batches) && greenBatches.batches.length === 1, 'CLI groen: vision-batches.json met batches');
  const greenManifest = readJson(path.join(greenOut, 'manifest.json'));
  eq(greenManifest.images.length, 2, 'CLI groen: manifest heeft twee beelden');
  ok(greenManifest.images.every((image) => image.fingerprint && image.fingerprint.sig.length === 576), 'CLI groen: manifest heeft fingerprints');
  ok(greenManifest.images.every((image) => image.status === 'geen-baseline' && image.vergelijking === null), 'CLI groen: manifest zonder baseline geen vergelijking');

  // CLI: --update legt de baseline vast en een tweede run is ongewijzigd
  const updateOut = path.join(TMP, 'out-update');
  const cliBaseline = path.join(TMP, 'cli-baseline.json');
  const update1 = runGate([`--images=${cliGreenDir}`, `--baseline=${cliBaseline}`, `--out=${updateOut}`, '--update']);
  eq(update1.status, 0, 'CLI update: exit 0', update1.stderr);
  ok(fs.existsSync(cliBaseline), 'CLI update: baseline geschreven');
  eq(Object.keys(readJson(cliBaseline).images).length, 2, 'CLI update: twee fingerprints in de baseline');
  const updateGate = readJson(path.join(updateOut, 'visual-gate.json'));
  eq(updateGate.update.geschreven, true, 'CLI update: update gerapporteerd');
  const update2 = runGate([`--images=${cliGreenDir}`, `--baseline=${cliBaseline}`, `--out=${path.join(TMP, 'out-update2')}`]);
  eq(update2.status, 0, 'CLI tweede run: exit 0', update2.stderr);
  const secondGate = readJson(path.join(TMP, 'out-update2', 'visual-gate.json'));
  eq(secondGate.tellingen.ongewijzigd, 2, 'CLI tweede run: alles ongewijzigd');
  eq(secondGate.tellingen.gewijzigd, 0, 'CLI tweede run: niets gewijzigd');
  eq(secondGate.melding, null, 'CLI tweede run: baseline actief');
  eq(secondGate.verdict, 'groen', 'CLI tweede run: groen');

  // CLI: auto-fout geeft exit 1 en --update weigert
  const cliBlackDir = path.join(TMP, 'cli-black');
  writePng(path.join(cliBlackDir, 'zwart.png'), 80, 45, solid(80, 45, 0, 0, 0));
  const blackBaseline = path.join(TMP, 'black-baseline.json');
  gate.writeBaselineFile(blackBaseline, { schema: 1, gemaakt: null, images: {} });
  const blackOut = path.join(TMP, 'out-black');
  const black = runGate([`--images=${cliBlackDir}`, `--baseline=${blackBaseline}`, `--out=${blackOut}`, '--update']);
  eq(black.status, 1, 'CLI auto-fout: exit 1', black.stderr);
  eq(Object.keys(readJson(blackBaseline).images).length, 0, 'CLI auto-fout: --update schreef de baseline niet');
  const blackGate = readJson(path.join(blackOut, 'visual-gate.json'));
  eq(blackGate.verdict, 'rood', 'CLI auto-fout: verdict rood');
  eq(blackGate.tellingen.autoFout, 1, 'CLI auto-fout: geteld');
  ok(blackGate.reviewset.length === 1 && blackGate.reviewset[0].status === 'auto-fout', 'CLI auto-fout: in de reviewset');
  const blackFindings = readJson(path.join(blackOut, 'findings', 'auto-visual.json'));
  ok(blackFindings.length === 1 && blackFindings[0].ernst === 'blokkerend' && findingIsValid(blackFindings[0]), 'CLI auto-fout: blokkerende bevinding volgens schema');

  // CLI: exit 3 zonder beelden, exit 2 bij een onleesbare map, ontbrekende --images of kapotte baseline
  const emptyDir = path.join(TMP, 'leeg');
  fs.mkdirSync(emptyDir, { recursive: true });
  eq(runGate([`--images=${emptyDir}`, `--out=${path.join(TMP, 'out-leeg')}`]).status, 3, 'CLI: exit 3 zonder beelden');
  eq(runGate([`--images=${path.join(TMP, 'bestaat-niet')}`, `--out=${path.join(TMP, 'out-fout')}`]).status, 2, 'CLI: exit 2 bij ontbrekende map');
  eq(runGate([`--out=${path.join(TMP, 'out-fout2')}`]).status, 2, 'CLI: exit 2 zonder --images');
  const corruptBase = path.join(TMP, 'corrupt-baseline.json');
  fs.writeFileSync(corruptBase, '{ niet json');
  eq(runGate([`--images=${cliGreenDir}`, `--baseline=${corruptBase}`, `--out=${path.join(TMP, 'out-fout3')}`]).status, 2, 'CLI: exit 2 bij kapotte baseline');
  eq(runGate([`--images=${cliGreenDir}`, `--out=${path.join(TMP, 'out-fout4')}`, '--drempel=abc']).status, 2, 'CLI: exit 2 bij ongeldige drempel');

  // ---- prompt en meegeleverde bestanden ----
  const prompt = fs.readFileSync(path.join(HERE, 'release', 'prompts', 'vision.md'), 'utf8');
  for (const term of ['reviewrapport', 'DESIGN_SYSTEM.md', 'AGENTS.md', 'read_image', 'geen bevindingen', 'zomer', 'merken']) {
    ok(prompt.includes(term), `prompt noemt ${term}`);
  }
  const committed = readJson(path.join(HERE, 'release', 'baselines', 'visual-baseline.json'));
  ok(committed.schema === 1 && committed.images && typeof committed.images === 'object' && Object.keys(committed.images).length === 0, 'meegeleverde baseline is leeg en geldig');
} catch (e) {
  fails++;
  console.log('FAIL onverwachte fout: ' + (e && e.stack ? e.stack : e));
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* opruimen mag niet de uitslag bepalen */ }
}

console.log(`${checks - fails}/${checks} visual-gate controles ok`);
process.exit(fails ? 1 : 0);
