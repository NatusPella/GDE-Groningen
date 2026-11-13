// Visuele releasegate: keurt een map met screenshots automatisch en maakt een compact pakket dat een
// AI-reviewer met beeldherkenning (DSH `read_image`) in weinig tokens kan beoordelen.
//
//   node scripts/release/visual_gate.mjs --images=<dir[,dir...]> [--baseline=<file>] [--out=<map>]
//        [--update] [--max-review=36] [--drempel=0.08]
//
// Per beeld: automatische checks (zwart/leeg/ongeldig) plus een fingerprint (32x18 helderheids-
// handtekening en een 64-bits dHash). Met een baseline erbij: gewijzigd als signatureDiff boven de
// drempel of de dHash-afstand boven 8 bits, nieuw als het beeld nog niet in de baseline staat en
// verdwenen als de baseline een beeld kent dat nu mist (informatie, geen oordeel).
// Auto-fout = blokkerende bevinding; gewijzigd/nieuw = belangrijk en in de reviewset. Zonder
// baseline doet de gate alleen de auto-checks: "geen baseline: eerste run stelt geen regressie vast".
// Uitvoer in <out>: manifest.json, visual-gate.json, vision/vision-pack.md, vision/vision-batches.json,
// vision/contact/blad-NN.png + bladen.txt en findings/auto-visual.json.
// Exitcodes: 0 groen, 1 auto-fout, 2 fout (geen leesbare map of onbruikbare baseline), 3 geen beelden.
// Geen Electron, geen netwerk: de gate werkt op PNG's die een eerdere QA-run al schreef.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, analyseImage, signature, signatureDiff } from '../lib/pngcheck.mjs';
import { writeContactSheets, toPosix, COLS, ROWS } from './contactsheet.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const DEFAULT_BASELINE = path.join(HERE, 'baselines', 'visual-baseline.json');
export const DEFAULT_MAX_REVIEW = 36;
export const DEFAULT_THRESHOLD = 0.08;
export const HAMMING_THRESHOLD = 8;
export const BATCH_SIZE = COLS * ROWS;
export const BASELINE_SCHEMA = 1;
export const FINDINGS_SCHEMA = path.join(HERE, 'findings-schema.json');
export const VISION_PROMPT = path.join(HERE, 'prompts', 'vision.md');

const STATUS_ORDER = { 'auto-fout': 0, gewijzigd: 1, nieuw: 2 };

export function usage() {
  return [
    'gebruik: node scripts/release/visual_gate.mjs --images=<dir[,dir...]> [--baseline=<file>] [--out=<map>] [--update] [--max-review=36] [--drempel=0.08]',
    '  --images     komma-lijst mappen met screenshots (recursief, *.png; bestanden met _ beginnen worden overgeslagen)',
    '  --baseline   baseline-JSON (standaard scripts/release/baselines/visual-baseline.json)',
    '  --out        uitvoermap voor manifest, reviewpakket en bevindingen (standaard een map in de temp)',
    '  --update     schrijft de baseline bij, maar alleen als er geen auto-fouten zijn',
    '  --max-review bovengrens voor de reviewset (standaard 36; alle auto-foute/gewijzigde/nieuwe beelden gaan altijd mee)',
    '  --drempel    drempel voor het handtekeningverschil (standaard 0.08)',
    'exitcodes: 0 groen, 1 auto-fout, 2 fout, 3 geen beelden',
  ].join('\n');
}

// ---- argumenten ----
export function parseArgs(argv = process.argv.slice(2)) {
  const value = (name, fallback) => {
    const hit = argv.find((v) => v === `--${name}` || v.startsWith(`--${name}=`));
    if (!hit) return fallback;
    const eq = hit.indexOf('=');
    return eq === -1 ? '' : hit.slice(eq + 1);
  };
  const flag = (name) => argv.includes(`--${name}`);
  const rawImages = value('images', null);
  if (rawImages === null) throw new Error('--images ontbreekt\n' + usage());
  const images = rawImages.split(',').map((s) => s.trim()).filter(Boolean);
  if (!images.length) throw new Error('--images is leeg\n' + usage());
  const maxReviewRaw = value('max-review', String(DEFAULT_MAX_REVIEW));
  const maxReview = Number(maxReviewRaw);
  if (!Number.isFinite(maxReview) || maxReview < 0) throw new Error(`--max-review is geen getal vanaf 0: ${maxReviewRaw}`);
  const thresholdRaw = value('drempel', String(DEFAULT_THRESHOLD));
  const threshold = Number(thresholdRaw);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error(`--drempel moet tussen 0 en 1 liggen: ${thresholdRaw}`);
  const baseline = value('baseline', DEFAULT_BASELINE);
  const out = value('out', path.join(os.tmpdir(), 'gde-visual-gate'));
  return {
    images: images.map((p) => path.resolve(p)),
    baseline: path.resolve(baseline),
    out: path.resolve(out),
    update: flag('update'),
    maxReview: Math.floor(maxReview),
    threshold,
    help: flag('help') || argv.includes('-h'),
  };
}

// ---- scannen ----
// Elke images-map krijgt een label voor de baselinesleutel: bij één map is de sleutel het pad vanaf
// die map, bij meerdere mappen komt de mapnaam ervoor (dubbel gebruik krijgt -2, -3, in CLI-volgorde).
export function labelRoots(dirs) {
  const seen = new Map();
  return dirs.map((abs) => {
    const base = path.basename(abs) || 'root';
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return { abs, label: n === 1 ? base : `${base}-${n}` };
  });
}

function walkPngs(dir, root, out, overgeslagen) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) { walkPngs(abs, root, out, overgeslagen); continue; }
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('_')) {
      overgeslagen.push({ pad: toPosix(path.relative(root.abs, abs)), reden: 'naam begint met _' });
      continue;
    }
    if (!/\.png$/i.test(entry.name)) continue;
    const rel = toPosix(path.relative(root.abs, abs));
    out.push({ bestand: abs, rel, root: root.label, key: root.multi ? `${root.label}/${rel}` : rel });
  }
}

export function scanImageDirs(dirs) {
  if (!Array.isArray(dirs) || !dirs.length) throw new Error('geen --images opgegeven');
  const roots = labelRoots(dirs).map((root) => ({ ...root, multi: dirs.length > 1 }));
  const images = [];
  const overgeslagen = [];
  for (const root of roots) {
    if (!fs.existsSync(root.abs)) throw new Error(`map bestaat niet: ${root.abs}`);
    let stat;
    try { stat = fs.statSync(root.abs); } catch (e) { throw new Error(`map niet leesbaar: ${root.abs} (${e.message})`); }
    if (!stat.isDirectory()) throw new Error(`geen map: ${root.abs}`);
    walkPngs(root.abs, root, images, overgeslagen);
  }
  images.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { roots: roots.map(({ abs, label }) => ({ abs, label })), images, overgeslagen };
}

// ---- fingerprint ----
export function fingerprintImage(image) {
  return { w: image.w, h: image.h, sig: signature(image), dhash: dHash(image) };
}

// 64-bits difference hash: 9x8 grijswaarden (box-gemiddelde), per rij 8 bits "links lichter dan
// rechts". Robuust voor kleine kleurverschillen, gevoelig voor structuur; 16 hex-tekens.
export function dHash(image) {
  const gw = 9, gh = 8;
  const sums = new Float64Array(gw * gh), cnt = new Uint32Array(gw * gh);
  for (let y = 0; y < image.h; y++) {
    const gy = Math.min(gh - 1, Math.floor((y * gh) / image.h));
    for (let x = 0; x < image.w; x++) {
      const gx = Math.min(gw - 1, Math.floor((x * gw) / image.w));
      const i = (y * image.w + x) * 4;
      const lum = 0.2126 * image.rgba[i] + 0.7152 * image.rgba[i + 1] + 0.0722 * image.rgba[i + 2];
      const k = gy * gw + gx;
      sums[k] += lum; cnt[k]++;
    }
  }
  const vals = Array.from(sums, (s, k) => (cnt[k] ? s / cnt[k] : 0));
  let bits = '';
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw - 1; x++) bits += vals[y * gw + x] > vals[y * gw + x + 1] ? '1' : '0';
  }
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex.padStart(16, '0').slice(0, 16);
}

// Aantal bits dat verschilt tussen twee gelijke-hexwaarden; null als ze niet te vergelijken zijn.
export function hammingHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a || !/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return null;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { distance += x & 1; x >>= 1; }
  }
  return distance;
}

// Vergelijkt het fingerprint van nu met dat uit de baseline. Zonder vorige waarde: null (nieuw).
export function compareFingerprints(current, previous, threshold = DEFAULT_THRESHOLD) {
  if (!current || !previous) return null;
  const sigDiff = signatureDiff(current.sig, previous.sig);
  const hamming = hammingHex(current.dhash, previous.dhash);
  const changed = sigDiff === null ? true : sigDiff > threshold || (hamming !== null && hamming > HAMMING_THRESHOLD);
  return {
    sigDiff,
    hamming,
    afmetingGewijzigd: current.w !== previous.w || current.h !== previous.h,
    gewijzigd: changed,
  };
}

// ---- beoordelen ----
export function baselineMessage(baselineActive) {
  return baselineActive ? null : 'geen baseline: eerste run stelt geen regressie vast';
}

// Pure beoordeling: de aanroeper geeft al ingelezen/gedecodeerde beelden mee.
export function evaluateImages(items, baselineImages, threshold = DEFAULT_THRESHOLD) {
  const active = !!(baselineImages && typeof baselineImages === 'object' && Object.keys(baselineImages).length > 0);
  const images = items.map((item) => {
    const fingerprint = item.fingerprint || null;
    const analysis = item.analysis || null;
    const state = {
      key: item.key,
      pad: toPosix(item.key),
      bestand: item.bestand,
      root: item.root,
      w: fingerprint ? fingerprint.w : null,
      h: fingerprint ? fingerprint.h : null,
      status: 'onbekend',
      automatisch: analysis ? {
        verdict: analysis.verdict,
        zwart: analysis.black,
        transparant: analysis.transparent,
        magenta: analysis.magenta,
        gemiddelde: analysis.mean,
        spreiding: analysis.std,
      } : null,
      decodeFout: item.decodeError || null,
      fingerprint,
      vergelijking: null,
    };
    const vorige = active && baselineImages[item.key] ? baselineImages[item.key] : null;
    if (vorige && fingerprint) state.vergelijking = compareFingerprints(fingerprint, vorige, threshold);
    const autoFout = !fingerprint || (analysis && analysis.verdict !== 'ok');
    if (autoFout) state.status = 'auto-fout';
    else if (!active) state.status = 'geen-baseline';
    else if (!vorige) state.status = 'nieuw';
    else state.status = state.vergelijking && state.vergelijking.gewijzigd ? 'gewijzigd' : 'ongewijzigd';
    return state;
  });
  const seen = new Set(images.map((image) => image.key));
  const disappeared = active
    ? Object.keys(baselineImages).filter((key) => !seen.has(key)).sort().map((key) => ({
      key,
      status: 'verdwenen',
      fingerprint: baselineImages[key],
    }))
    : [];
  const count = (status) => images.filter((image) => image.status === status).length;
  const counts = {
    beelden: images.length,
    ongewijzigd: count('ongewijzigd'),
    gewijzigd: count('gewijzigd'),
    nieuw: count('nieuw'),
    autoFout: count('auto-fout'),
    zonderBaseline: count('geen-baseline'),
    verdwenen: disappeared.length,
  };
  return { baselineActive: active, threshold, images, disappeared, counts, melding: baselineMessage(active) };
}

// ---- reviewset ----
function byKey(a, b) {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

function rankOf(status) {
  return Object.hasOwn(STATUS_ORDER, status) ? STATUS_ORDER[status] : -1;
}

// Deterministische, evenwichtig verdeelde steekproef over een gesorteerde lijst.
export function pickEvenlySpaced(list, count) {
  if (!Array.isArray(list) || count <= 0) return [];
  if (count >= list.length) return list.slice();
  const indices = new Set();
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(((i + 0.5) * list.length) / count);
    idx = Math.min(list.length - 1, Math.max(0, idx));
    while (indices.has(idx) && idx < list.length - 1) idx++;
    while (indices.has(idx) && idx > 0) idx--;
    indices.add(idx);
  }
  return list.filter((_, index) => indices.has(index));
}

// Alle auto-foute, gewijzigde en nieuwe beelden eerst (deterministisch op status en pad), daarna
// vaste dekking op de gesorteerde rest tot --max-review. De must-review-beelden gaan altijd mee,
// ook als ze samen boven --max-review uitkomen; dat staat dan in overschrijdtMaximum.
export function selectReview(images, maxReview = DEFAULT_MAX_REVIEW) {
  const limit = Number.isFinite(maxReview) && maxReview >= 0 ? Math.floor(maxReview) : DEFAULT_MAX_REVIEW;
  const sorted = images.slice().sort(byKey);
  const must = sorted
    .filter((image) => rankOf(image.status) >= 0)
    .sort((a, b) => rankOf(a.status) - rankOf(b.status) || byKey(a, b));
  const rest = sorted.filter((image) => rankOf(image.status) < 0);
  const room = Math.max(0, limit - must.length);
  const coverage = pickEvenlySpaced(rest, Math.min(room, rest.length));
  const reviewset = [
    ...must.map((image) => ({ ...image, reviewBron: 'must' })),
    ...coverage.map((image) => ({ ...image, reviewBron: 'dekking' })),
  ];
  return {
    reviewset,
    maximum: limit,
    verplicht: must.length,
    dekking: coverage.length,
    overschrijdtMaximum: must.length > limit,
  };
}

export function buildBatches(reviewset, size = BATCH_SIZE) {
  const batches = [];
  for (let i = 0; i < reviewset.length; i += size) {
    batches.push({ nummer: batches.length + 1, beelden: reviewset.slice(i, i + size) });
  }
  return batches;
}

export function reviewReason(image, threshold = DEFAULT_THRESHOLD) {
  if (image.status === 'auto-fout') {
    return image.decodeFout ? `automatische fout: PNG onleesbaar (${image.decodeFout})` : `automatische fout: ${verdictText(image.automatisch && image.automatisch.verdict)}`;
  }
  if (image.status === 'gewijzigd') {
    const v = image.vergelijking || {};
    const sig = v.sigDiff === null || v.sigDiff === undefined ? 'onbekend' : v.sigDiff.toFixed(3);
    const bits = v.hamming === null || v.hamming === undefined ? 'onbekend' : String(v.hamming);
    return `gewijzigd t.o.v. baseline (handtekeningverschil ${sig} > ${threshold}, dHash-afstand ${bits} bits > ${HAMMING_THRESHOLD})`;
  }
  if (image.status === 'nieuw') return 'nieuw t.o.v. baseline';
  if (image.status === 'geen-baseline') return 'vaste dekking (nog geen baseline)';
  return 'vaste dekking (steekproef)';
}

export function verdictText(verdict) {
  if (verdict === 'zwart') return 'zwart';
  if (verdict === 'leeg') return 'leeg (één kleur)';
  if (verdict === 'ongeldig') return 'ongeldig (doorzichtig of magenta)';
  return verdict || 'onbekend';
}

// ---- bevindingen ----
const kort = (text, max) => (String(text).length <= max ? String(text) : String(text).slice(0, max - 1) + '…');

function autoFinding(image) {
  const reason = image.decodeFout
    ? `niet te decoderen als PNG (${image.decodeFout})`
    : verdictText(image.automatisch && image.automatisch.verdict);
  const stats = image.automatisch
    ? ` Zwart: ${(image.automatisch.zwart * 100).toFixed(1)}%, doorzichtig: ${(image.automatisch.transparant * 100).toFixed(1)}%, magenta: ${(image.automatisch.magenta * 100).toFixed(1)}%, spreiding ${image.automatisch.spreiding.toFixed(1)}.`
    : '';
  return {
    bron: 'baseline',
    aspect: 'visual',
    ernst: 'blokkerend',
    categorie: 'graphics',
    titel: kort(`Automatische beeldfout (${reason}): ${image.key}`, 120),
    beschrijving: `Beeld ${image.key} is automatisch afgekeurd: ${reason}.${stats} Een release gaat niet door met een zwart, leeg of ongeldig beeld.`,
    bewijs: [image.key, `automatische check: ${reason}`],
    beeld: image.key,
    reviewer: 'visual_gate',
  };
}

function changedFinding(image, threshold) {
  const v = image.vergelijking || {};
  const sig = v.sigDiff === null || v.sigDiff === undefined ? 'onbekend' : v.sigDiff.toFixed(3);
  const bits = v.hamming === null || v.hamming === undefined ? 'onbekend' : String(v.hamming);
  return {
    bron: 'baseline',
    aspect: 'visual',
    ernst: 'belangrijk',
    categorie: 'baseline',
    titel: kort(`Beeld gewijzigd: ${image.key}`, 120),
    beschrijving: `Beeld ${image.key} wijkt af van de baseline: handtekeningverschil ${sig} (drempel ${threshold}) en dHash-afstand ${bits} van 64 bits (drempel ${HAMMING_THRESHOLD}).${v.afmetingGewijzigd ? ' Ook de afmeting is anders.' : ''} Beoordeel het beeld in de AI-review.`,
    bewijs: [image.key],
    beeld: image.key,
    reviewer: 'visual_gate',
  };
}

function newFinding(image) {
  return {
    bron: 'baseline',
    aspect: 'visual',
    ernst: 'belangrijk',
    categorie: 'baseline',
    titel: kort(`Nieuw beeld: ${image.key}`, 120),
    beschrijving: `Beeld ${image.key} staat niet in de baseline. Dit is geen fout maar een signaal: beoordeel het nieuwe beeld in de AI-review.`,
    bewijs: [image.key],
    beeld: image.key,
    reviewer: 'visual_gate',
  };
}

export function buildFindings(images, { baselineActive = false, threshold = DEFAULT_THRESHOLD } = {}) {
  const sorted = images.slice().sort(byKey);
  const findings = [];
  for (const image of sorted.filter((im) => im.status === 'auto-fout')) findings.push(autoFinding(image));
  for (const image of sorted.filter((im) => im.status === 'gewijzigd')) findings.push(changedFinding(image, threshold));
  if (baselineActive) {
    for (const image of sorted.filter((im) => im.status === 'nieuw')) findings.push(newFinding(image));
  }
  return findings;
}

// ---- baseline ----
export function baselineFromImages(images, gemaakt = new Date().toISOString()) {
  const entries = {};
  for (const image of images.slice().sort(byKey)) {
    if (!image.fingerprint) continue;
    entries[image.key] = {
      w: image.fingerprint.w,
      h: image.fingerprint.h,
      sig: image.fingerprint.sig,
      dhash: image.fingerprint.dhash,
    };
  }
  return { schema: BASELINE_SCHEMA, gemaakt, images: entries };
}

export function readBaselineFile(file) {
  if (!file || !fs.existsSync(file)) return { aanwezig: false, pad: file, baseline: null };
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { throw new Error(`baseline niet leesbaar: ${file} (${e.message})`); }
  let data;
  try { data = JSON.parse(raw); } catch (e) { throw new Error(`baseline is geen geldige JSON: ${file} (${e.message})`); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.schema !== BASELINE_SCHEMA || !data.images || typeof data.images !== 'object' || Array.isArray(data.images)) {
    throw new Error(`baseline heeft niet het verwachte schema (schema ${BASELINE_SCHEMA} en een object "images"): ${file}`);
  }
  return { aanwezig: true, pad: file, baseline: data };
}

export function writeBaselineFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// Schrijft de baseline alleen als er geen auto-fouten zijn; anders blijft het bestand ongemoeid.
export function updateBaselineFile({ file, images, hasAutoErrors, now = new Date().toISOString() }) {
  if (hasAutoErrors) return { gevraagd: true, geschreven: false, pad: file, reden: 'auto-fouten: baseline niet bijgewerkt' };
  const data = baselineFromImages(images, now);
  writeBaselineFile(file, data);
  return { gevraagd: true, geschreven: true, pad: file, aantal: Object.keys(data.images).length, gemaakt: now };
}

// ---- rapporten ----
function inspectImageFile(file) {
  try {
    const image = decodePng(fs.readFileSync(file));
    return { ok: true, fingerprint: fingerprintImage(image), analysis: analyseImage(image), decodeError: null };
  } catch (e) {
    return { ok: false, fingerprint: null, analysis: null, decodeError: e.message };
  }
}

function baselineInfo(read, baselineImages) {
  return {
    pad: read.pad ? toPosix(read.pad) : null,
    aanwezig: read.aanwezig,
    actief: !!(baselineImages && Object.keys(baselineImages).length > 0),
    aantal: baselineImages ? Object.keys(baselineImages).length : 0,
    gemaakt: read.baseline && read.baseline.gemaakt ? read.baseline.gemaakt : null,
  };
}

function displayPath(abs) {
  if (!abs) return '';
  const rel = path.relative(ROOT, abs);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? toPosix(rel) : toPosix(abs);
}

function gateReport({ run, review, batches, sheets, info, options, update, now }) {
  return {
    schema: 1,
    gemaakt: now,
    tool: 'scripts/release/visual_gate.mjs',
    verdict: run.counts.autoFout > 0 ? 'rood' : 'groen',
    melding: run.melding,
    baseline: info,
    instellingen: {
      drempel: run.threshold,
      hammingDrempel: HAMMING_THRESHOLD,
      maxReview: review.maximum,
      batchGrootte: BATCH_SIZE,
    },
    tellingen: {
      ...run.counts,
      reviewset: review.reviewset.length,
      batches: batches.length,
    },
    review: {
      maximum: review.maximum,
      verplicht: review.verplicht,
      dekking: review.dekking,
      overschrijdtMaximum: review.overschrijdtMaximum,
    },
    reviewset: review.reviewset.map((image) => ({
      sleutel: image.key,
      pad: image.pad,
      bestand: image.bestand,
      status: image.status,
      bron: image.reviewBron,
      reden: reviewReason(image, run.threshold),
    })),
    batches: batches.map((batch, index) => ({
      nummer: batch.nummer,
      contactblad: sheets[index] ? `vision/contact/${sheets[index].naam}` : null,
      contactbladBestand: sheets[index] ? toPosix(sheets[index].bestand) : null,
      beelden: batch.beelden.map((image) => ({
        sleutel: image.key,
        bestand: image.bestand,
        status: image.status,
        bron: image.reviewBron,
        volledigOpenen: image.reviewBron === 'must',
      })),
    })),
    verdwenen: run.disappeared.map((image) => ({ sleutel: image.key, fingerprint: image.fingerprint })),
    update,
  };
}

function batchNotes(batch) {
  const statuses = new Set(batch.beelden.map((image) => image.status));
  const notes = [];
  if (statuses.has('auto-fout')) notes.push('Bevestig de automatische afkeuring: is dit beeld echt zwart, leeg of ongeldig? Noem het als blokkerende bevinding.');
  if (statuses.has('gewijzigd')) notes.push('Vergelijk het gewijzigde beeld met wat je van deze schermen verwacht; noem elk zichtbaar verschil dat een speler zou opvallen.');
  if (statuses.has('nieuw')) notes.push('Beoordeel of het nieuwe beeld bij het spel en het designsysteem past.');
  if (statuses.has('geen-baseline') || statuses.has('ongewijzigd')) notes.push('Vaste steekproef: loop de volledige checklist langs en noem alleen wat je echt ziet.');
  notes.push('Let ook op de volgorde van HUD-elementen, de leesbaarheid van tekst over de 3D-wereld en of knoppen en hints bereikbaar en logisch zijn.');
  return notes;
}

export function buildVisionPack({ run, review, batches, sheets, info, options, update, now, out }) {
  const lines = [];
  const add = (...xs) => lines.push(...xs);
  add('# Beeldreview: pakket voor de visuele releasegate', '');
  add(`Gegenereerd door \`scripts/release/visual_gate.mjs\` op ${now}.`, '');
  add('## Samenvatting', '');
  add(`- Beelden: ${run.counts.beelden} uit ${options.images.map((dir) => displayPath(dir)).join(', ')}`);
  add(`- Baseline: ${info.aanwezig ? `aanwezig (${info.aantal} beelden, actief: ${info.actief ? 'ja' : 'nee'})` : 'niet aanwezig'}, \`${displayPath(info.pad)}\``);
  if (run.melding) add(`- **${run.melding}**`);
  add(`- Auto-fouten: ${run.counts.autoFout} · gewijzigd: ${run.counts.gewijzigd} · nieuw: ${run.counts.nieuw} · verdwenen: ${run.counts.verdwenen} (informatie, geen fout)`);
  add(`- Reviewset: ${review.reviewset.length} beelden in ${batches.length} batches (max-review ${review.maximum}, drempel ${run.threshold}, dHash-afstand meer dan ${HAMMING_THRESHOLD} bits).`);
  if (update && update.geschreven) add(`- Baseline bijgewerkt met ${update.aantal} beelden.`);
  add('');
  add('## Opdracht', '');
  add(`1. Lees \`${displayPath(VISION_PROMPT)}\` volledig; dat is de strikte opdracht met de checklist (designsysteem, constitutie en taal, UI/UX, wereld, verhaal en gameplay).`);
  add('2. Bekijk per batch het contactblad met `read_image`. De tegels staan in de genoemde volgorde: linksboven naar rechtsonder, rij voor rij.');
  add('3. Open daarnaast elk beeld met status auto-fout, gewijzigd of nieuw op volledige grootte met `read_image`; die staan per batch als "volledig openen" genoemd.');
  add(`4. Beoordeel tegen de checklist en tegen het schema \`${displayPath(FINDINGS_SCHEMA)}\` (\`$defs.reviewrapport\`).`);
  add(`5. Schrijf het rapport als exact één JSON-object naar \`${toPosix(path.join(out, 'vision', 'reviewrapport.json'))}\`; kun je niet schrijven, lever het dan als enige antwoord.`);
  add('');
  add('## Strikte uitvoer', '');
  add('- Je antwoord is exact één JSON-object volgens `$defs.reviewrapport`: geen markdown-fences, geen tekst eromheen.');
  add('- `onderwerp`: "vision-visual-gate"; `reviewer`: je eigen naam; `commit`: korte SHA van HEAD (`git rev-parse --short=12 HEAD`).');
  add('- `dekking.beelden`: alle sleutels uit dit pakket die je echt hebt bekeken; `dekking.bestanden`: dit pakket, de prompt en het schema; `dekking.aspecten`: design-system, taal, ui, wereld, gameplay.');
  add('- Elke bevinding heeft `bron: "vision"`, `aspect`, `ernst` (blokkerend/belangrijk/nit), `categorie`, `titel`, `beschrijving` en `bewijs` met ten minste de beeldnaam; zet het beeld ook in `beeld`.');
  add('- `bevindingen: []` mag alleen als je elk beeld uit dit pakket echt hebt bekeken; noem in `dekking.opmerking` wat je niet kon beoordelen (bijvoorbeeld een onleesbaar bestand).');
  add('- Verzin niets: noem alleen wat je in het beeld ziet. Twijfel je, maak er een `nit` van of noteer het in `dekking.opmerking`.');
  add('- Nederlands in `titel` en `beschrijving`; geen echte merken of personen in je tekst.');
  add('');
  add('## Checklist (samengevat; de volledige lijst staat in de prompt)', '');
  add('- **Designsysteem:** alleen de tokens uit DESIGN_SYSTEM.md; groen op donkergroen chroom, nooit plat zwart, één rood #d93f3f, geel alleen voor wanted-sterren, speciale dag en missiemarkering.');
  add('- **Typografie:** Bebas Neue voor titels en labels, Arial Narrow voor lopende tekst; geen zin onder 12 px, menu\'s 13 px en hoger.');
  add('- **HUD en menu\'s:** één ding per HUD-zone, witte toetsplaatjes, één primaire knop per scherm, zichtbare focusring, twee tot vier hints onderaan.');
  add('- **Constitutie en taal:** Nederlands in alles wat de speler ziet, altijd zomer, geen echte merken of personen, geen leed.');
  add('- **UI/UX:** overlappende of afgesneden tekst, onbereikbare knoppen, verkeerde staat, onzichtbare focus, contrast onder 4,5:1.');
  add('- **Wereld:** zwevende of verzonken props, gaten in de wereld, z-fighting, lege wereld, verkeerde LOD.');
  add('- **Verhaal en gameplay:** speler in een gebouw of het water, camera in een object, verkeerde missie- of spelstaat.');
  add('');
  batches.forEach((batch, index) => {
    const sheet = sheets[index];
    add(`## Batch ${batch.nummer} — \`vision/contact/${sheet ? sheet.naam : 'blad-??.png'}\``, '');
    if (sheet) {
      add(`Contactblad openen: \`${toPosix(sheet.bestand)}\``, '');
      if (sheet.fouten.length) add(`Onleesbaar als PNG (tegel is effen rood): ${sheet.fouten.map((label) => `\`${label}\``).join(', ')}.`, '');
    }
    add('| tegel | beeld | status | volledig openen |');
    add('|---|---|---|---|');
    batch.beelden.forEach((image, tile) => {
      add(`| ${tile + 1} | \`${image.key}\` | ${image.status}${image.reviewBron === 'dekking' ? ' (dekking)' : ''} | ${image.reviewBron === 'must' ? '`' + toPosix(image.bestand) + '`' : '—'} |`);
    });
    add('');
    add('Let op in deze batch:');
    for (const note of batchNotes(batch)) add(`- ${note}`);
    add('');
  });
  add('## Tot slot', '');
  add('Lever exact één reviewrapport-JSON met je dekking. Zeg alleen "geen bevindingen" (een lege `bevindingen`-lijst) als je elk beeld uit dit pakket echt hebt bekeken; anders benoem je in `dekking.opmerking` wat open bleef.', '');
  return lines.join('\n');
}

export function writeGateOutputs({ out, run, review, batches, sheets, scan, baselineRead, options, update, now }) {
  fs.mkdirSync(path.join(out, 'vision'), { recursive: true });
  fs.mkdirSync(path.join(out, 'findings'), { recursive: true });
  const findings = buildFindings(run.images, { baselineActive: run.baselineActive, threshold: run.threshold });
  const info = baselineInfo(baselineRead, baselineRead.baseline ? baselineRead.baseline.images : null);
  const manifest = {
    schema: 1,
    gemaakt: now,
    tool: 'scripts/release/visual_gate.mjs',
    roots: scan.roots.map((root) => ({ label: root.label, pad: toPosix(root.abs) })),
    images: run.images.map((image) => ({
      pad: image.pad,
      sleutel: image.key,
      bestand: toPosix(image.bestand),
      w: image.w,
      h: image.h,
      status: image.status,
      automatisch: image.automatisch,
      decodeFout: image.decodeFout,
      fingerprint: image.fingerprint,
      vergelijking: image.vergelijking,
    })),
    verdwenen: run.disappeared.map((image) => ({ sleutel: image.key, fingerprint: image.fingerprint })),
    overgeslagen: scan.overgeslagen,
    tellingen: run.counts,
    baseline: info,
  };
  const gate = gateReport({ run, review, batches, sheets, info, options, update, now });
  const batchesJson = {
    schema: 1,
    gemaakt: now,
    onderwerp: 'vision-visual-gate',
    maxReview: review.maximum,
    drempel: run.threshold,
    batches: gate.batches,
  };
  const pack = buildVisionPack({ run, review, batches, sheets, info, options, update, now, out });
  const files = {
    manifest: path.join(out, 'manifest.json'),
    gate: path.join(out, 'visual-gate.json'),
    batches: path.join(out, 'vision', 'vision-batches.json'),
    pack: path.join(out, 'vision', 'vision-pack.md'),
    findings: path.join(out, 'findings', 'auto-visual.json'),
  };
  fs.writeFileSync(files.manifest, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(files.gate, JSON.stringify(gate, null, 2) + '\n');
  fs.writeFileSync(files.batches, JSON.stringify(batchesJson, null, 2) + '\n');
  fs.writeFileSync(files.pack, pack);
  fs.writeFileSync(files.findings, JSON.stringify(findings, null, 2) + '\n');
  return { files, manifest, gate, batches: batchesJson, pack, findings, info };
}

// ---- CLI ----
export function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (e) {
    console.error('visual_gate: ' + e.message);
    return 2;
  }
  if (options.help) { console.log(usage()); return 0; }
  let scan;
  try {
    scan = scanImageDirs(options.images);
  } catch (e) {
    console.error('visual_gate: ' + e.message);
    return 2;
  }
  if (!scan.images.length) {
    console.error(`visual_gate: geen beelden gevonden in ${options.images.map((dir) => toPosix(dir)).join(', ')}`);
    return 3;
  }
  let baselineRead;
  try {
    baselineRead = readBaselineFile(options.baseline);
  } catch (e) {
    console.error('visual_gate: ' + e.message);
    return 2;
  }
  const baselineImages = baselineRead.baseline ? baselineRead.baseline.images : null;
  const inspected = scan.images.map((entry) => ({ ...entry, ...inspectImageFile(entry.bestand) }));
  const run = evaluateImages(inspected, baselineImages, options.threshold);
  const review = selectReview(run.images, options.maxReview);
  const batches = buildBatches(review.reviewset, BATCH_SIZE);
  const now = new Date().toISOString();

  let sheets;
  try {
    sheets = writeContactSheets(review.reviewset.map((image) => ({ pad: image.bestand, label: image.key })), options.out, { perSheet: BATCH_SIZE });
  } catch (e) {
    console.error('visual_gate: contactbladen schrijven mislukt: ' + e.message);
    return 2;
  }

  let update;
  if (!options.update) {
    update = { gevraagd: false, geschreven: false, pad: toPosix(options.baseline), reden: 'niet gevraagd (--update ontbreekt)' };
  } else {
    try {
      update = updateBaselineFile({ file: options.baseline, images: run.images, hasAutoErrors: run.counts.autoFout > 0, now });
    } catch (e) {
      console.error('visual_gate: baseline schrijven mislukt: ' + e.message);
      return 2;
    }
  }

  let written;
  try {
    written = writeGateOutputs({
      out: options.out,
      run,
      review,
      batches,
      sheets: sheets.sheets,
      scan,
      baselineRead,
      options,
      update,
      now,
    });
  } catch (e) {
    console.error('visual_gate: rapporten schrijven mislukt: ' + e.message);
    return 2;
  }

  const c = run.counts;
  console.log(`visual_gate: ${c.beelden} beelden (ongewijzigd ${c.ongewijzigd}, gewijzigd ${c.gewijzigd}, nieuw ${c.nieuw}, auto-fout ${c.autoFout}, verdwenen ${c.verdwenen})`);
  if (run.melding) console.log(run.melding);
  console.log(`reviewset: ${review.reviewset.length} beelden in ${batches.length} batches; contactbladen: ${toPosix(sheets.dir)}`);
  console.log(`uitvoer: ${toPosix(written.files.manifest)}, ${toPosix(written.files.gate)}, ${toPosix(written.files.pack)}, ${toPosix(written.files.findings)}`);
  console.log(update.geschreven ? `baseline bijgewerkt: ${toPosix(update.pad)} (${update.aantal} beelden)` : `baseline niet bijgewerkt: ${update.reden}`);
  console.log(`verdict: ${c.autoFout > 0 ? `rood (${c.autoFout} auto-fout${c.autoFout === 1 ? '' : 'en'})` : 'groen'}`);
  return c.autoFout > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli(process.argv.slice(2));
}
