// Statische scan op per-frame-allocaties (21-11, inefficientie C): zoekt update-/tick-/frame-
// functies in game/js en telt daarin patronen die elk frame afval maken of de DOM raken.
//   node scripts/perf/hotscan.mjs [--top=40] [--file=regex] [--json]
// Heuristiek (geen parser): functienaam begint met update/tick/frame/step/animate/render/draw/
// sync/refresh, lichaam via accolade-telling (strings en regex tellen mee: kleine ruis). Het is
// een zoeklicht, geen oordeel: kijk of de functie echt elk frame draait voor je iets wijzigt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const TOP = +arg('top', 40);
const FILE = new RegExp(arg('file', '.'));
const asJson = process.argv.includes('--json');

const PATTERNS = [
  ['new3d', /new THREE\.(Vector[234]|Color|Matrix[34]|Quaternion|Euler|Box3|Sphere|Plane|Ray)\(/g, 3],
  ['literal', /(?:=|\(|,|return)\s*\[[^\]\n]{0,40}\]|=\s*\{[^}\n]{0,60}\}/g, 1],
  ['iter', /\.(map|filter|reduce|flatMap|find|findIndex|some|every)\(/g, 2],
  ['forEach', /\.forEach\(/g, 1],
  ['spread', /\[\s*\.\.\.|\{\s*\.\.\./g, 2],
  ['objkeys', /Object\.(keys|entries|values|assign|fromEntries)\(/g, 3],
  ['json', /JSON\.(stringify|parse)\(/g, 5],
  ['dom', /(querySelector(All)?|getElementById|getElementsBy\w+|innerHTML|insertAdjacent\w+|createElement)\b/g, 4],
  ['toFixed', /\.toFixed\(|toLocale\w+\(/g, 2],
  ['includes', /\.(includes|indexOf)\(/g, 1],
  ['newColl', /new (Set|Map|Array|Float32Array|Uint8Array)\(/g, 3],
  ['sort', /\.sort\(/g, 3],
  ['concat', /\.concat\(|\.slice\(\)/g, 2],
  ['surfaceAt', /surfaceAt\(|groundAt\(|heightAt\(/g, 1],
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
const HEAD = /^(\s*)(?:export\s+)?(?:async\s+)?(?:function\s+(\w*(?:update|tick|frame|step|animate|render|draw|sync|refresh)\w*)\s*\(|(?:const|let)\s+(\w*(?:update|tick|frame|step|animate|render|draw|sync|refresh)\w*)\s*=\s*(?:async\s*)?(?:function\s*\w*\s*)?\([^)]*\)\s*(?:=>)?\s*\{)/i;
const res = [];
for (const f of walk(path.join(REPO, 'game', 'js'))) {
  const rel = path.relative(REPO, f).split(path.sep).join('/');
  if (!FILE.test(rel)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = HEAD.exec(lines[i]);
    if (!m) continue;
    const name = m[2] || m[3];
    let depth = 0, started = false, j = i;
    const body = [];
    for (; j < lines.length; j++) {
      const l = lines[j].replace(/\/\/.*$/, '');
      for (const ch of l) { if (ch === '{') { depth++; started = true; } else if (ch === '}') depth--; }
      body.push(l);
      if (started && depth <= 0) break;
    }
    if (body.length < 3 || body.length > 400) continue;
    const text = body.join('\n');
    const counts = {}; let score = 0;
    for (const [k, re, w] of PATTERNS) { const n = (text.match(re) || []).length; if (n) { counts[k] = n; score += n * w; } }
    // lussen in lussen: grove O(n^2)-aanwijzing
    const nested = (text.match(/for\s*\([^)]*\)\s*\{[^}]*for\s*\(/g) || []).length;
    if (nested) { counts.nestedFor = nested; score += nested * 4; }
    if (score >= 8) res.push({ file: rel, line: i + 1, name, lines: body.length, score, counts });
  }
}
res.sort((a, b) => b.score - a.score);
if (asJson) { console.log(JSON.stringify(res.slice(0, TOP), null, 1)); process.exit(0); }
console.log(`${res.length} functies met score >= 8; top ${TOP}:`);
for (const r of res.slice(0, TOP)) console.log(`${String(r.score).padStart(4)}  ${r.file}:${r.line} ${r.name} (${r.lines} r)  ${Object.entries(r.counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
