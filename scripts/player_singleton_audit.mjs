// Bewaakt de enkelspeler-aanname (#500): telt per bestand hoe vaak code de
// singleton world.player rechtstreeks aanraakt.
//
// Wat telt als een directe verwijzing: een eigenschap `player` op een naam die
// de wereld voorstelt, dus `world.player`, `w.player` (de vaste naam van de
// wereldparameter in dit project) en aliassen die direct uit de wereld komen
// (`const g = world; g.player`). Commentaar, gewone strings en de tekst van
// template-literals tellen niet mee; code binnen `${...}` wel. Zowel lezen als
// schrijven telt, want ook `world.player = ...` houdt de singleton in stand.
//
// Gebruik:
//   node scripts/player_singleton_audit.mjs            keurt tegen de basislijn
//   node scripts/player_singleton_audit.mjs --update   schrijft de huidige stand
//   node scripts/player_singleton_audit.mjs --dir=<map> --baseline=<bestand>
//   node scripts/player_singleton_audit.mjs --json     machineleesbare uitvoer
//
// Groei of een nieuw bestand is een fout (exit 1); een daling is goed en vraagt
// om --update. Zo kan de teller alleen maar naar beneden.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIR = path.join(ROOT, 'game', 'js');
export const DEFAULT_BASELINE = path.join(ROOT, 'scripts', 'player_singleton_baseline.json');
const WORLD_NAMES = ['world', 'w'];

// Vervangt commentaar, strings en de tekst van template-literals door spaties,
// zodat alleen echte code overblijft. Reguliere expressies worden als literal
// herkend aan het teken ervoor en ook leeggemaakt.
export function maskSource(src) {
  const out = src.split('');
  const n = src.length;
  const modes = ['code']; // 'code' of 'tpl'
  const braces = []; // diepte van een ${...} in een template
  let i = 0;
  const blank = (a, b) => { for (let k = a; k < b && k < n; k++) if (out[k] !== '\n') out[k] = ' '; };
  const prevSig = (at) => {
    for (let k = at - 1; k >= 0; k--) { const c = src[k]; if (!/\s/.test(c)) return c; }
    return '';
  };
  const regexStart = (at) => {
    const p = prevSig(at);
    return p === '' || '(,=:[!&|?{};+-*%<>~^'.includes(p);
  };
  while (i < n) {
    const c = src[i];
    if (modes[modes.length - 1] === 'tpl') {
      if (c === '\\') { blank(i, i + 2); i += 2; continue; }
      if (c === '`') { modes.pop(); i++; continue; }
      if (c === '$' && src[i + 1] === '{') { modes.push('code'); braces.push(0); i += 2; continue; }
      blank(i, i + 1); i++; continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i); if (j < 0) j = n;
      blank(i, j); i = j; continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      blank(i, j); i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') j += 2;
        else if (src[j] === c) { j++; break; }
        else j++;
      }
      blank(i + 1, j - 1); i = j; continue;
    }
    if (c === '/' && regexStart(i)) {
      let j = i + 1, inClass = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { j++; break; }
        else if (d === '\n') break;
        j++;
      }
      blank(i + 1, j - 1); i = j; continue;
    }
    if (c === '`') { modes.push('tpl'); i++; continue; }
    if (braces.length) {
      if (c === '{') braces[braces.length - 1]++;
      else if (c === '}') {
        if (braces[braces.length - 1] === 0) { braces.pop(); modes.pop(); i++; continue; }
        braces[braces.length - 1]--;
      }
    }
    i++;
  }
  return out.join('');
}

// Namen die in dit bestand naar de wereld wijzen: world, w en directe aliassen.
export function worldNames(masked) {
  const namen = new Set(WORLD_NAMES);
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:world|w)\s*(?=[;,)\n]|$)/g;
  let m;
  while ((m = re.exec(masked))) namen.add(m[1]);
  return [...namen];
}

// Aantal directe verwijzingen naar de singleton in één bronbestand.
export function countReferences(src) {
  const masked = maskSource(src);
  const namen = worldNames(masked).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\w$.])(?:${namen.join('|')})\\.player\\b`, 'g');
  return (masked.match(re) || []).length;
}

// Pad zoals het in de basislijn staat: vanaf de repo, of vanaf de meekregen map.
function keyFor(file, dir) {
  const rel = path.relative(ROOT, file);
  return (rel.startsWith('..') ? path.relative(dir, file) : rel).split(path.sep).join('/');
}

// Alle JS-bestanden onder een map met hun aantal verwijzingen (ook nul).
export function scanDir(dir) {
  return scanDetail(dir).files;
}

// Hetzelfde, plus per bestand en in totaal het aantal keren dat de code de
// letterlijke spelling `world.player` gebruikt (zonder de alias `w`). Dat is de
// maat die het issue op 25-10 gebruikte (696), handig om de teller te ijken.
// Mappen die nooit meedoen: gegenereerde wereld, gebouwde en gevendorde kopieën,
// en de worktrees van andere sessies onder .claude. Zonder deze lijst loopt de
// teller op de echte repo door honderdduizenden bestanden en duurt hij minuten.
const SKIP_DIRS = new Set(['.git', '.claude', 'node_modules', 'vendor-cache', 'build']);
const SKIP_PATHS = ['game/world/', 'data/', 'desktop/build/', 'desktop/vendor-cache/'];

export function scanDetail(dir) {
  const files = {};
  const literal = {};
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      if (SKIP_DIRS.has(name)) continue;
      const p = path.join(d, name);
      const rel = path.relative(dir, p).split(path.sep).join('/') + '/';
      if (SKIP_PATHS.some((s) => rel.startsWith(s))) continue;
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.js$/.test(name)) {
        const src = fs.readFileSync(p, 'utf8');
        const key = keyFor(p, dir);
        files[key] = countReferences(src);
        literal[key] = (maskSource(src).match(/(?<![\w$.])world\.player\b/g) || []).length;
      }
    }
  };
  walk(dir);
  return { files, literal, literalTotal: totalOf(literal) };
}

export const totalOf = (telling) => Object.values(telling).reduce((s, n) => s + n, 0);

// Vergelijkt een meting met de basislijn. Groei en nieuwe bestanden zijn fouten;
// een daling of een verdwenen bestand is winst en werkt de basislijn bij.
export function compare(scan, baseline) {
  const files = baseline.files || {};
  const fouten = [];
  const dalingen = [];
  for (const [file, n] of Object.entries(scan).sort(([a], [b]) => a.localeCompare(b))) {
    if (!(file in files)) { if (n > 0) fouten.push(`${file}: ${n} verwijzingen, staat niet in de basislijn`); continue; }
    const was = files[file];
    if (n > was) fouten.push(`${file}: ${n} verwijzingen, basislijn ${was} (+${n - was})`);
    else if (n < was) dalingen.push(`${file}: ${n} verwijzingen, basislijn ${was} (-${was - n})`);
  }
  for (const [file, was] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!(file in scan) && was > 0) dalingen.push(`${file}: weg, basislijn ${was} (-${was})`);
  }
  return { fouten, dalingen, totaal: totalOf(scan), basis: baseline.total ?? totalOf(files) };
}

function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const a = argv.find((v) => v.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
  const dir = path.resolve(opt('dir', DEFAULT_DIR));
  const baselineFile = path.resolve(opt('baseline', DEFAULT_BASELINE));
  const update = argv.includes('--update');
  const json = argv.includes('--json');
  if (!fs.existsSync(dir)) { console.error(`FOUT  map bestaat niet: ${dir}`); return 2; }

  const { files: telling, literalTotal } = scanDetail(dir);
  const totaal = totalOf(telling);
  const bestanden = Object.values(telling).filter((n) => n > 0).length;

  if (update) {
    const alleen = Object.fromEntries(Object.entries(telling).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)));
    const basis = { version: 1, note: 'Aantal directe verwijzingen naar world.player per bestand (#500), inclusief de alias w.player. Alleen omlaag; zie scripts/player_singleton_audit.mjs.', total: totaal, files: alleen };
    fs.writeFileSync(baselineFile, JSON.stringify(basis, null, 1) + '\n');
    console.log(`Basislijn bijgewerkt: ${totaal} verwijzingen in ${bestanden} bestanden (waarvan ${literalTotal} letterlijk world.player; ${path.relative(ROOT, baselineFile)}).`);
    return 0;
  }

  if (!fs.existsSync(baselineFile)) {
    console.error(`FOUT  basislijn ontbreekt: ${baselineFile}\nMaak hem met --update.`);
    return 2;
  }
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const { fouten, dalingen, totaal: nu, basis } = compare(telling, baseline);
  const verschil = nu - basis;

  if (json) console.log(JSON.stringify({ totaal: nu, letterlijk: literalTotal, basis, bestanden, fouten, dalingen }, null, 1));
  else {
    console.log(`player-singleton-audit: ${nu} directe verwijzingen naar world.player in ${bestanden} bestanden (basislijn ${basis}, ${verschil <= 0 ? verschil : '+' + verschil}); ${literalTotal} daarvan met de letterlijke spelling world.player, de rest via de vaste alias w.`);
    for (const regel of dalingen) console.log(`OK    ${regel}`);
    for (const regel of fouten) console.log(`FOUT  ${regel}`);
    if (dalingen.length) console.log('Werk de basislijn bij met --update.');
    if (fouten.length) console.log('Haal de nieuwe lezer(s) via game/js/players.js (hoofdspeler, medespelers, ...) in plaats van world.player.');
  }
  return fouten.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exit(main());
