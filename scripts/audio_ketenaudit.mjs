// Ketenaudit van alle runtime-audiopaden (#1084, #1021): puur, zonder Web Audio en zonder Electron.
// Leest de bron van game/js (audio.js, audio/*, sfx/*, theme.js, cutaudio.js, ...) en keurt de keten van bron naar luidspreker:
//   bypass      : niets gaat langs de limiter naar ctx.destination (alleen output() in audio.js)
//   limiter     : de laatste schakel knipt snel en vroeg genoeg (drempel, ratio, attack)
//   gainketen   : de vaste busversterkingen blijven netjes en de worstcase-keten van bus naar master klimt niet boven 1,5
//   lus         : elke lus (loop = true) heeft een stoppad in zijn bestand
//   oscillator  : elke oscillator die start, krijgt ook een stop (anders zoemt hij voor altijd)
//   ramp        : exponentialRamp naar 0 gooit een fout (waarde moet > 0 zijn); setTargetAtTime met tijdconstante 0 klikt
//   mediaelement: elk Audio-element dat een lus of een bus voedt, wordt ergens gepauzeerd
//   werklet     : de motor-werklet geeft true terug, controleert zijn uitvoer op NaN en alloceert niet in process()
//   stemmen     : de stemlimiet per categorie past in de globale limiet; wat de teller neemt, geeft hij terug
//   buffers     : de zware buffers worden maar op bekende (init-)plekken gebouwd, niet per frame
// Gebruik: node scripts/audio_ketenaudit.mjs [--json]    (exit 1 bij een fout)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game', 'js');

// ---- hulp ------------------------------------------------------------------------------------------------------------

export function listJs(dir = JS) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
// commentaar eruit, regelnummers blijven kloppen (regels blijven, inhoud niet)
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a);
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
const count = (src, re) => (src.match(re) || []).length;
// naam van de functie waarin positie idx valt (de laatste `function naam(` ervoor)
export function enclosingFn(src, idx) {
  const head = src.slice(0, idx);
  let last = null, m;
  const re = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
  while ((m = re.exec(head))) last = m[1];
  return last;
}

// de tekst van die functie (tot de volgende functie-kop)
export function fnBody(src, idx) {
  const re = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g;
  let start = 0, end = src.length, m;
  while ((m = re.exec(src))) { if (m.index <= idx) start = m.index; else { end = m.index; break; } }
  return src.slice(start, end);
}

// Gepoolde, blijvende stemmen: bouwfuncties die bij het opbouwen van de graaf een vast aantal stemmen maken (zie de
// Array.from({ length: N }) in audio.js) en die op gain 0 blijven staan. Dat is bewust, geen lek. Een nieuwe bouwfunctie met een
// oscillator of lus zonder stop moet hier bewust bij: zo blijft het totaal van altijd-lopende bronnen overzichtelijk.
export const BLIJVENDE_STEMMEN = new Set([
  'game/js/audio/vehiclevoices.js:buildEngineVoice', 'game/js/audio/vehiclevoices.js:buildHeliVoice',
  'game/js/audio/vehiclevoices.js:buildScrapeVoice', 'game/js/audio/vehiclevoices.js:buildSquealVoice',
  'game/js/audio/vehiclevoices.js:buildRumbleVoice',
  'game/js/audio.js:buildHornVoice', 'game/js/audiosirene.js:bouwSireneVoice',
  'game/js/sfx/sky.js:buildHeliVoice',
  // lui gebouwde losse stemmen (een keer, bij het eerste gebruik): alarm, bromfiets, putter, piep, heli-gezoem
  'game/js/sfx/foley.js:buildAlarm', 'game/js/sfx/foley.js:buildLoopVoice',
]);
export const persistent = { gezien: new Set() };

// Bestanden die geen speelruntime zijn: opnametool voor de trailer (eigen context, geen spel).
export const BUITEN_RUNTIME = new Set(['game/js/trailer.js']);

// ---- de controles (elk krijgt de bron en geeft een lijst bevindingen { check, file, line, msg }) -----------------------

// bypass: alleen output() in audio.js (en de botaudio-tap) mag aan ctx.destination hangen
export function checkBypass(file, src) {
  const f = [];
  const s = stripComments(src);
  const re = /\.connect\(\s*(?:\w+\.)?destination\s*\)/g;
  let m;
  while ((m = re.exec(s))) {
    const l = lineOf(s, m.index);
    const regel = s.split('\n')[l - 1];
    if (file === 'game/js/audio.js' && /outNode\.connect\(ctx\.destination\)/.test(regel)) continue;
    f.push({ check: 'bypass', file, line: l, msg: 'verbinding rechtstreeks met destination, langs de limiter' });
  }
  if (file === 'game/js/audio.js') {
    // in audio.js mag alleen de laatste schakel (limiter, clip, musicLp) aan output() hangen
    const re2 = /(\w+)\.connect\(\s*(?:limiter\s*\|\|\s*)?output\(\)\s*\)|\.connect\(\s*output\(\)\s*\)/g;
    while ((m = re2.exec(s))) {
      const l = lineOf(s, m.index);
      const regel = s.split('\n')[l - 1];
      if (!/(limiter|clip|musicLp|master)\b[^;]*connect\(\s*(limiter \|\| )?output\(\)/.test(regel) && !/connect\(clip\)\.connect\(output\(\)\)/.test(regel)) {
        f.push({ check: 'bypass', file, line: l, msg: 'iets anders dan limiter of clip hangt aan output()' });
      }
    }
  }
  return f;
}

// limiter: parameters van buildLimiter() in audio.js
export function checkLimiter(file, src) {
  const f = [];
  const m = /function buildLimiter\(\)\s*\{([\s\S]*?)\n\}/.exec(src);
  if (!m) return [{ check: 'limiter', file, line: 1, msg: 'buildLimiter() ontbreekt: geen limiter als laatste schakel' }];
  const v = (name) => { const r = new RegExp(`\\.${name}\\.value\\s*=\\s*(-?[0-9.]+)`).exec(m[1]); return r ? Number(r[1]) : null; };
  const thr = v('threshold'), ratio = v('ratio'), att = v('attack'), rel_ = v('release'), knee = v('knee');
  const l = lineOf(src, m.index);
  if (thr === null || thr > -1) f.push({ check: 'limiter', file, line: l, msg: `drempel ${thr} dB: te hoog, knippen blijft mogelijk (max -1)` });
  if (thr !== null && thr < -6) f.push({ check: 'limiter', file, line: l, msg: `drempel ${thr} dB: te laag, de mix pompt` });
  if (ratio === null || ratio < 10) f.push({ check: 'limiter', file, line: l, msg: `ratio ${ratio}: geen limiter (min 10)` });
  if (att === null || att > 0.005) f.push({ check: 'limiter', file, line: l, msg: `attack ${att} s: te traag voor pieken (max 0,005)` });
  if (rel_ === null || rel_ < 0.05 || rel_ > 0.5) f.push({ check: 'limiter', file, line: l, msg: `release ${rel_} s: buiten 0,05 tot 0,5 (pompen of brom)` });
  if (knee === null || knee > 6) f.push({ check: 'limiter', file, line: l, msg: `knee ${knee}: te zacht voor een limiter (max 6)` });
  return f;
}

// gainketen: de vaste bus-versterkingen uit buildGraph(). Elke bus hangt via een keten aan master; het product moet < 1,5 blijven.
export function parseBusGraph(src) {
  const m = /function buildGraph\(\)\s*\{([\s\S]*?)\n\}\n/.exec(src);
  if (!m) return null;
  const body = stripComments(m[1]);
  const gain = {}, edges = [];
  let r;
  const gRe = /(\w+)\.gain\.value\s*=\s*([^;]+);/g;
  while ((r = gRe.exec(body))) {
    // een vaste getal of een aanroep: bij een aanroep (muted ? 0 : masterLevel()) nemen we 1 als bovengrens
    const lit = /^-?[0-9.]+$/.exec(r[2].trim());
    gain[r[1]] = lit ? Number(lit[0]) : 1;
  }
  const cRe = /(\w+)\.connect\(\s*(\w+)\s*\)/g;
  while ((r = cRe.exec(body))) edges.push([r[1], r[2]]);
  // ketens als a.connect(b).connect(c): alleen de eerste schakel hier, de rest via een tweede patroon
  const chRe = /(\w+)\.connect\((\w+)\)\.connect\((\w+)\)/g;
  while ((r = chRe.exec(body))) edges.push([r[2], r[3]]);
  return { gain, edges };
}
export function worstChain(graph, from, to = 'master') {
  const { gain, edges } = graph;
  let best = 0;
  const walk = (n, prod, seen) => {
    const g = n in gain ? gain[n] : 1;
    const p = prod * g;
    if (n === to) { if (p > best) best = p; return; }
    for (const [a, b] of edges) if (a === n && !seen.has(b)) walk(b, p, new Set([...seen, b]));
  };
  walk(from, 1, new Set([from]));
  return best;
}
export function checkGainKeten(file, src) {
  const f = [];
  const g = parseBusGraph(src);
  if (!g) return [{ check: 'gainketen', file, line: 1, msg: 'buildGraph() niet gevonden' }];
  for (const [n, v] of Object.entries(g.gain)) {
    if (v > 1.5) f.push({ check: 'gainketen', file, line: 1, msg: `${n}.gain.value = ${v}: boven 1,5 (clipping voor de limiter)` });
  }
  for (const bus of ['worldBus', 'voiceBus', 'sfxBus', 'engineBus', 'sirenBus', 'trafficBus', 'ambBus', 'uiBus', 'stingBus', 'worldIn']) {
    if (!(bus in g.gain) && bus !== 'worldIn') continue;
    const w = worstChain(g, bus, 'master');
    if (w > 1.5) f.push({ check: 'gainketen', file, line: 1, msg: `keten ${bus} naar master = ${w.toFixed(2)}: gain-stapeling boven 1,5` });
  }
  return f;
}

// lus: een bestand met loop = true op een bron heeft minstens zoveel stoppaden (.stop( of onended-opruiming) als lussen
export function checkLussen(file, src) {
  const f = [];
  const s = stripComments(src);
  const re = /(\w+)\.loop\s*=\s*true/g;
  let m;
  while ((m = re.exec(s))) {
    const naam = m[1];
    // een Audio-element wordt gepauzeerd, een bron gestopt
    const gestopt = new RegExp(`\\b${naam}\\.(stop|pause)\\(`).test(fnBody(s, m.index))
      || new RegExp(`\\.${naam}\\.(stop|pause)\\(`).test(s) || /\.src\.stop\(/.test(s)
      || /if \((\w+)\.stop\) \1\.stop\(\)/.test(s);   // of een algemene dispose-hulp
    const fn = enclosingFn(s, m.index);
    if (!gestopt && BLIJVENDE_STEMMEN.has(`${file}:${fn}`)) { persistent.gezien.add(`${file}:${fn}`); continue; }
    if (!gestopt) f.push({ check: 'lus', file, line: lineOf(s, m.index), msg: `lus ${naam} heeft geen stoppad in zijn functie of als eigenschap (loopt tot de context sluit)` });
  }
  return f;
}

// oscillator: createOscillator() zonder stop in het bestand
export function checkOscillatoren(file, src) {
  const f = [];
  const s = stripComments(src);
  const re = /(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+\.)?createOscillator\(\)/g;
  let m;
  while ((m = re.exec(s))) {
    const naam = m[1];
    const gestopt = new RegExp(`\\b${naam}\\.stop\\(`).test(fnBody(s, m.index)) || new RegExp(`\\.${naam}\\.stop\\(`).test(s);
    const fn = enclosingFn(s, m.index);
    if (!gestopt && BLIJVENDE_STEMMEN.has(`${file}:${fn}`)) { persistent.gezien.add(`${file}:${fn}`); continue; }
    if (!gestopt) {
      f.push({ check: 'oscillator', file, line: lineOf(s, m.index), msg: `oscillator ${naam} krijgt geen stop(): zoemt tot de context sluit` });
    }
  }
  return f;
}

// ramp: exponentialRamp naar een letterlijke waarde <= 0; setTargetAtTime met tijdconstante 0
export function checkRamps(file, src) {
  const f = [];
  const s = stripComments(src);
  let m;
  const re = /exponentialRampToValueAtTime\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)\s*,/g;
  while ((m = re.exec(s))) {
    const a = m[1].trim();
    if (/^-?[0-9.]+(e-?\d+)?$/.test(a) && Number(a) <= 0) f.push({ check: 'ramp', file, line: lineOf(s, m.index), msg: `exponentialRamp naar ${a}: gooit een RangeError, het geluid blijft hangen` });
  }
  const re2 = /setTargetAtTime\(\s*[^,]+,\s*[^,]+,\s*(0|0\.0+)\s*\)/g;
  while ((m = re2.exec(s))) f.push({ check: 'ramp', file, line: lineOf(s, m.index), msg: 'setTargetAtTime met tijdconstante 0: een harde sprong (klik)' });
  return f;
}

// mediaelement: new Audio( zonder pause() in het bestand
export function checkMediaElementen(file, src) {
  const f = [];
  const s = stripComments(src);
  if (/new Audio\(/.test(s) && !/\.pause\(\)/.test(s)) f.push({ check: 'mediaelement', file, line: lineOf(s, s.search(/new Audio\(/)), msg: 'Audio-element zonder pause() in dit bestand' });
  return f;
}

// werklet: process() van de motor
export function checkWerklet(file, src) {
  const f = [];
  const m = /process\(inputs, outputs\)\s*\{([\s\S]*?)\n  \}\n\}/.exec(src);
  if (!m) return [{ check: 'werklet', file, line: 1, msg: 'process() niet gevonden' }];
  const body = m[1];
  const l = lineOf(src, m.index);
  if (!/return true;/.test(body)) f.push({ check: 'werklet', file, line: l, msg: 'process() geeft geen true terug: de node stopt na een keer (stilte)' });
  if (!/finiteOut\(/.test(body)) f.push({ check: 'werklet', file, line: l, msg: 'process() controleert zijn uitvoer niet op NaN' });
  const allocs = (body.match(/new (?!EngineVoice|RoadVoice)\w+/g) || []);
  if (allocs.length) f.push({ check: 'werklet', file, line: l, msg: `process() alloceert (${allocs.join(', ')}): GC-pauze geeft een glitch` });
  if (/(console\.|postMessage\()/.test(body)) f.push({ check: 'werklet', file, line: l, msg: 'process() logt of post per blok: dat is een buffer-underrun' });
  return f;
}

// buffers: createBuffer alleen op bekende plekken (init); een nieuwe plek moet bewust erbij
// flatgeluid.js (akte 1, #1306): één ruisbuffer van 2 s, eenmalig in bouw() (G wordt één keer gebouwd)
export const BUFFER_PLEKKEN = { 'game/js/audio.js': 1, 'game/js/sfx/dsp.js': 2, 'game/js/sfx/sky.js': 1, 'game/js/flatgeluid.js': 1 };
export function checkBuffers(file, src) {
  const n = count(stripComments(src), /\.createBuffer\(/g);
  const toegestaan = BUFFER_PLEKKEN[file] || 0;
  if (n > toegestaan) return [{ check: 'buffers', file, line: 1, msg: `${n} createBuffer-aanroepen (bekend: ${toegestaan}): nieuwe plek, controleer dat die niet per frame draait` }];
  return [];
}

// stemmen: capaciteit per categorie tegen de globale limiet en de teller
export function checkStemmen(caps, capVoor, voiceCaps, tellerFabriek) {
  const f = [];
  const file = 'game/js/sfx/stemlimiet.js';
  for (const [cat, c] of Object.entries(caps)) {
    if (!(c >= 1)) f.push({ check: 'stemmen', file, line: 1, msg: `categorie ${cat} heeft limiet ${c}` });
    if (capVoor(cat, 2) > voiceCaps[2]) f.push({ check: 'stemmen', file, line: 1, msg: `categorie ${cat} (prio 2) past niet in de globale limiet ${voiceCaps[2]}` });
    if (capVoor(cat, 0) > capVoor(cat, 1) || capVoor(cat, 1) > capVoor(cat, 2)) f.push({ check: 'stemmen', file, line: 1, msg: `categorie ${cat}: prioriteit 0 en 2 staan verkeerd om` });
  }
  // de teller: neem en geef gaan gelijk op, ook bij te veel geef-aanroepen (geen negatief)
  const t = tellerFabriek();
  for (let i = 0; i < 100; i++) { t.neem('voetstap', 1); }
  for (let i = 0; i < 100; i++) { t.geef('voetstap'); }
  t.geef('voetstap');
  if (t.aantal('voetstap') !== 0) f.push({ check: 'stemmen', file, line: 1, msg: 'teller loopt niet terug naar 0 na geef' });
  return f;
}

// ---- alles aan elkaar ------------------------------------------------------------------------------------------------

export async function auditAlles() {
  const found = [];
  const bestanden = listJs().map((p) => ({ file: rel(p), src: fs.readFileSync(p, 'utf8') }));
  const audioBestand = (f) => /^game\/js\/(audio|audio\/|sfx\/|theme|cutaudio|audiosirene|audiomute|botaudio|audiodiag)/.test(f) || /(cutscene|speech|radio)/.test(f);
  let loops = 0, oscs = 0, audioFiles = 0;
  for (const { file, src } of bestanden) {
    if (BUITEN_RUNTIME.has(file)) continue;
    if (!/AudioContext|createGain|createOscillator|createBufferSource|new Audio\(|createMediaElementSource/.test(src) && !audioBestand(file)) continue;
    audioFiles++;
    loops += count(stripComments(src), /\.loop\s*=\s*true/g);
    oscs += count(stripComments(src), /createOscillator\(\)/g);
    found.push(...checkBypass(file, src), ...checkLussen(file, src), ...checkOscillatoren(file, src), ...checkRamps(file, src), ...checkBuffers(file, src));
    if (file !== 'game/js/theme.js') found.push(...checkMediaElementen(file, src));
  }
  const audioJs = bestanden.find((b) => b.file === 'game/js/audio.js');
  found.push(...checkLimiter(audioJs.file, audioJs.src), ...checkGainKeten(audioJs.file, audioJs.src));
  const wl = bestanden.find((b) => b.file === 'game/js/sfx/engineworklet.js');
  found.push(...checkWerklet(wl.file, wl.src));
  const sl = await import('../game/js/sfx/stemlimiet.js');
  const vc = /const VOICE_CAPS\s*=\s*\[([^\]]+)\]/.exec(audioJs.src);
  const voiceCaps = vc ? vc[1].split(',').map(Number) : [26, 54, 76];
  found.push(...checkStemmen(sl.CAT_CAPS, sl.capVoor, voiceCaps, sl.createStemTeller));
  // een verouderde regel in de lijst van blijvende stemmen (functie bestaat niet meer of stopt nu wel) valt ook op
  for (const k of BLIJVENDE_STEMMEN) if (!persistent.gezien.has(k)) found.push({ check: 'blijvend', file: k.split(':')[0], line: 1, msg: `${k} staat in BLIJVENDE_STEMMEN maar komt niet meer voor` });
  return { found, stats: { bestanden: audioFiles, lussen: loops, oscillatoren: oscs } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { found, stats } = await auditAlles();
  if (process.argv.includes('--json')) console.log(JSON.stringify({ found, stats }, null, 1));
  else {
    for (const x of found) console.log(`FOUT [${x.check}] ${x.file}:${x.line} ${x.msg}`);
    console.log(`ketenaudit: ${stats.bestanden} audiobestanden, ${stats.lussen} lussen, ${stats.oscillatoren} oscillatoren, ${found.length} bevindingen`);
  }
  process.exit(found.length ? 1 : 0);
}
