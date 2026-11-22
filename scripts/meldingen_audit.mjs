// Meldingenaudit (eigenaarsbesluit 22-11): welke code meldt nog buiten de ene wachtrij (game/js/notifyqueue.js) om?
// Drie controles, uitkomst = het aantal overtredingen (0 is goed, exit 1 anders):
//   1. elk meldingstype van noticetiming.js (NOTICE_TYPES) loopt via de wachtrij, is een blokkade (hold) of staat hieronder
//      met een reden als uitzondering (geen rustige melding: fout, einde van een missie, ondertitel, status);
//   2. elk bestand dat een melding tekent (de klasse ds-melding, noticeBar, runNoticeTimer) is zo'n bron of een uitzondering;
//   3. elke weergavefunctie van een bron wordt alleen binnen de show-functie van enqueueNotice aangeroepen (of in zichzelf).
// Verder: een lijst van wat er uitgezonderd is, zodat de eigenaar dat kan nalopen.
//   node scripts/meldingen_audit.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTICE_TYPES } from '../game/js/noticetiming.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game/js');
const read = (f) => fs.readFileSync(path.join(JS, f), 'utf8').replace(/\r\n/g, '\n');

// Uitzonderingen: het type of bestand is geen rustige melding of is de wachtrij zelf. De reden staat erbij.
export const EXEMPT_TYPES = Object.freeze({
  fout: 'kritiek: een script-fout blijft staan tot de speler Sluiten kiest; geen spelmelding',
  'groot-moment': 'het eindscherm van een missie, de dood of opgepakt: schermvullend en zelf de blokkade voor alle andere meldingen',
  ondertitel: 'de ondertitel is het gesprek zelf (de hold dialogue), geen melding',
  'stunt-uitleg': 'uitleg van de activiteit die het scherm al heeft overgenomen (de activiteit bepaalt wanneer)',
  opgeslagen: 'statuschip van 1,5 s zonder tekst om te lezen (het opslagicoon); geen melding',
});
export const BLOCKER_TYPES = Object.freeze({
  laadscherm: 'houdt de wachtrij vast (hold loading en startup)',
});
export const EXEMPT_FILES = Object.freeze({
  'melding.js': 'het balkje zelf (DOM-hulp van de bronnen)',
  'noticetiming.js': 'de tijdregels en het register van types, geen weergave',
  'notifyqueue.js': 'de wachtrij zelf',
  'bigmoment.js': 'het eindscherm (zie groot-moment)',
  'fouttoast.js': 'zie fout',
  'subtitles.js': 'zie ondertitel',
  'stunthud.js': 'zie stunt-uitleg',
  'savegame.js': 'zie opgeslagen',
  'cinematics.js': 'het mission-resultaat (showBanner) hoort bij groot-moment; de wijkkaart loopt wel via de wachtrij',
});

// Weergavefuncties per bronbestand: alleen binnen een enqueueNotice(...)-aanroep of in de eigen functie.
export const SINKS = Object.freeze({
  'hudcards.js': ['placeCard'],
  'phonefeed.js': ['showNote'],
  'namecard.js': ['display'],
  'cinematics.js': ['showWijkCard'],
  'hud_panel.js': ['restartClass(els.nowPlaying'],
  'menumelding.js': ['voegToe(rij'],
});

// Een bron: het bestand importeert de wachtrij en roept enqueueNotice aan.
const isQueued = (src) => /from '\.\/notifyqueue\.js'/.test(src) && /\benqueueNotice\(/.test(src);

// Bereiken [start, eind) van alle enqueueNotice( ... )-aanroepen (haakjes in elkaar, strings en commentaar buiten beschouwing).
export function callRanges(src, name = 'enqueueNotice') {
  const out = [];
  const re = new RegExp(`\\b${name}\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const from = m.index + m[0].length - 1;
    const to = matching(src, from, '(', ')');
    if (to > 0) out.push([m.index, to]);
  }
  return out;
}

// De sluitende haak bij de open haak op `i` (slaat strings, template-literals en regelcommentaar over).
export function matching(src, i, open, close) {
  let depth = 0;
  for (let p = i; p < src.length; p++) {
    const c = src[p];
    if (c === '/' && src[p + 1] === '/') { p = src.indexOf('\n', p); if (p < 0) return -1; continue; }
    if (c === '/' && src[p + 1] === '*') { p = src.indexOf('*/', p + 2); if (p < 0) return -1; p++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      for (p++; p < src.length && src[p] !== q; p++) if (src[p] === '\\') p++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return p;
  }
  return -1;
}

// De plekken in `src` waar `needle` als aanroep voorkomt, buiten commentaar en definities, met hun regelnummer.
function callSites(src, needle) {
  const out = [];
  const isCall = needle.includes('(');
  const re = new RegExp(isCall ? needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : `\\b${needle}\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const line = src.slice(lineStart, src.indexOf('\n', m.index) < 0 ? src.length : src.indexOf('\n', m.index));
    if (/^\s*\/\//.test(line)) continue;
    if (/function\s+$/.test(src.slice(lineStart, m.index))) continue; // de definitie zelf
    out.push({ index: m.index, line: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

// Het bereik van de functie `name` (van "function name(" tot de sluitende accolade), voor aanroepen binnen de eigen functie.
function ownRange(src, name) {
  const base = name.replace(/\(.*/, '');
  const m = new RegExp(`function\\s+${base}\\s*\\(`).exec(src);
  if (!m) return null;
  const brace = src.indexOf('{', m.index);
  const end = matching(src, brace, '{', '}');
  return end > 0 ? [m.index, end] : null;
}

// Weergavefuncties die buiten enqueueNotice worden aangeroepen: [{ line, sink }].
export function sinkViolations(src, sinks) {
  const out = [];
  const ranges = callRanges(src);
  for (const sink of sinks) {
    const own = ownRange(src, sink);
    for (const site of callSites(src, sink)) {
      const inside = ranges.some(([a, b]) => site.index > a && site.index < b);
      const inOwn = own && site.index > own[0] && site.index < own[1];
      if (!inside && !inOwn) out.push({ line: site.line, sink });
    }
  }
  return out;
}

export function audit() {
  const findings = [];
  const notes = [];
  const files = fs.readdirSync(JS).filter((f) => f.endsWith('.js'));

  // 1. de meldingstypen
  const typeRows = [];
  for (const t of NOTICE_TYPES) {
    let how;
    if (t.id in BLOCKER_TYPES) how = `blokkade: ${BLOCKER_TYPES[t.id]}`;
    else if (t.id in EXEMPT_TYPES) how = `uitzondering: ${EXEMPT_TYPES[t.id]}`;
    else if (fs.existsSync(path.join(JS, t.bestand)) && isQueued(read(t.bestand))) how = 'wachtrij';
    else { how = 'BUITEN DE WACHTRIJ'; findings.push({ soort: 'type', wat: `${t.id} (${t.bestand}) meldt buiten de wachtrij om` }); }
    typeRows.push({ id: t.id, bestand: t.bestand, how });
  }
  // het wijkkaart-type zit in cinematics.js dat hierboven als uitzondering voor het resultaat staat: het moet wel in de wachtrij
  if (!isQueued(read('cinematics.js'))) findings.push({ soort: 'type', wat: 'cinematics.js: de wijkkaart loopt niet via de wachtrij' });

  // 2. bestanden die een melding tekenen
  const drawers = files.filter((f) => /ds-melding|\bnoticeBar\(|\brunNoticeTimer\(/.test(read(f)));
  for (const f of drawers) {
    if (f in EXEMPT_FILES) { notes.push(`${f}: ${EXEMPT_FILES[f]}`); continue; }
    if (!isQueued(read(f))) findings.push({ soort: 'bestand', wat: `${f} tekent een melding maar roept enqueueNotice niet aan` });
  }

  // 3. weergavefuncties alleen binnen de wachtrij
  for (const [f, sinks] of Object.entries(SINKS)) {
    const src = read(f);
    if (!callRanges(src).length) findings.push({ soort: 'sink', wat: `${f} heeft geen enqueueNotice-aanroep` });
    for (const v of sinkViolations(src, sinks)) findings.push({ soort: 'sink', wat: `${f}:${v.line} roept ${v.sink} aan buiten enqueueNotice` });
  }

  // 4. de wachtrij mag nergens omheen worden getoond via de oude poort
  for (const f of files) if (/notifygate/.test(read(f)) && f !== 'notifyqueue.js') findings.push({ soort: 'oud', wat: `${f} verwijst nog naar notifygate` });

  return { findings, typeRows, notes, files: files.length, drawers };
}

const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const r = audit();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`Meldingenaudit: ${r.files} bestanden in game/js`);
    for (const t of r.typeRows) console.log(`  ${t.id.padEnd(16)} ${t.bestand.padEnd(18)} ${t.how}`);
    console.log(`Tekenaars van de klasse ds-melding: ${r.drawers.join(', ')}`);
    for (const n of r.notes) console.log(`  uitgezonderd ${n}`);
    for (const f of r.findings) console.log(`BUITEN DE WACHTRIJ [${f.soort}] ${f.wat}`);
    console.log(`Buiten de wachtrij: ${r.findings.length}`);
  }
  process.exit(r.findings.length ? 1 : 0);
}
