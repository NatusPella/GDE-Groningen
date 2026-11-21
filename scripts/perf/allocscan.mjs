// Statische allocatiescan van per-frame-code (#1008): zoekt in functies die elk beeld draaien (update*, tick*, step*,
// draw*, render*, sync*, frame*) naar patronen die per aanroep geheugen vragen: new, array- en objectliteralen,
// .map/.filter/.slice/.concat/spread, Object.entries/keys/values, Array.from, closures en stringplakwerk.
// Gebruik: node scripts/perf/allocscan.mjs [--top=40] [--min=3] [bestand ...]
// Zonder bestanden: de hot-path-modules uit HOT_FILES. Het is een richtlijn (regels binnen `if (zeldzaam)` tellen mee),
// geen meting: de echte maat is `node --expose-gc scripts/perf/allocbench.mjs` en in Electron de heap/GC-aandelen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const HOT_FILES = [
  'game/js/vehicle/traffic.js', 'game/js/pedestrians.js', 'game/js/hudgps.js', 'game/js/hudstapel.js', 'game/js/hudmoney.js',
  'game/js/hudcards.js', 'game/js/hud_panel.js', 'game/js/hudbus.js', 'game/js/hudtext.js', 'game/js/mapview.js',
  'game/js/routeribbon.js', 'game/js/fx3d.js', 'game/js/simhud.js', 'game/js/hudlook.js',
];
const HOT_NAME = /^(update|tick|step|draw|render|sync|frame|animate|refresh|pump|run)[A-Z_0-9]?/;
const PATTERNS = [
  ['new', /\bnew\s+[A-Z][\w.]*\s*\(/g],
  ['array', /(?<![\w\])])\[\s*[^\]\s][^\]]*,[^\]]*\]/g],
  ['object', /(?<![\w)\]])\{\s*\w+\s*[:,]/g],
  ['map/filter', /\.(map|filter|slice|concat|reduce|flatMap)\(/g],
  ['spread', /\[\s*\.\.\.|\{\s*\.\.\.|\(\.\.\./g],
  ['entries', /\b(Object\.(entries|keys|values)|Array\.from)\(/g],
  ['closure', /=>/g],
  ['string', /`[^`]*\$\{|\+\s*'[^']*'|'[^']*'\s*\+/g],
];

function stripNoise(src) {
  // strings en commentaar blijven staan als lengte, maar regelcommentaar telt niet mee
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

export function scanSource(src, file = '?') {
  const clean = stripNoise(src);
  const out = [];
  const re = /(?:^|\n)[ \t]*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(clean))) {
    const name = m[1];
    if (!HOT_NAME.test(name)) continue;
    let depth = 1, i = re.lastIndex;
    while (i < clean.length && depth) { const c = clean[i++]; if (c === '{') depth++; else if (c === '}') depth--; }
    const body = clean.slice(re.lastIndex, i);
    const line = clean.slice(0, m.index + 1).split('\n').length + 1;
    const counts = {};
    let total = 0;
    for (const [k, rx] of PATTERNS) { const n = (body.match(rx) || []).length; if (n) { counts[k] = n; total += n; } }
    out.push({ file, name, line, lines: body.split('\n').length, total, counts });
  }
  return out;
}

export function scanFiles(files) {
  const all = [];
  for (const f of files) {
    const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    all.push(...scanSource(fs.readFileSync(p, 'utf8'), path.relative(ROOT, p).replace(/\\/g, '/')));
  }
  return all.sort((a, b) => b.total - a.total);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const top = +((args.find((a) => a.startsWith('--top=')) || '--top=40').slice(6));
  const min = +((args.find((a) => a.startsWith('--min=')) || '--min=3').slice(6));
  const files = args.filter((a) => !a.startsWith('--'));
  const rows = scanFiles(files.length ? files : HOT_FILES).filter((r) => r.total >= min).slice(0, top);
  for (const r of rows) console.log(`${String(r.total).padStart(4)}  ${r.file}:${r.line} ${r.name} (${r.lines} r)  ${Object.entries(r.counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}
