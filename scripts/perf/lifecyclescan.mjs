// Statische levensduurscan (#1065): zoekt in runtime-modules naar bronnen die ontstaan zonder dat er in hetzelfde bestand iets staat dat ze opruimt.
//   interval:   setInterval( zonder clearInterval in het bestand (en zonder unref)
//   luisteraar: addEventListener op window/document/body diep in een functie (4+ inspringing; een start-functie op bovenste niveau telt als eenmalig), zonder removeEventListener voor dezelfde gebeurtenis (of { once: true }, of een signal)
//   resource:   new THREE.<...>Geometry/Material/CanvasTexture/RenderTarget binnen een functie in een bestand dat dingen uit de scene haalt maar nergens dispose of disposeObject aanroept
// Het is een richtlijn voor de leesronde, geen bewijs: een treffer kan zijn opruiming in een ander bestand hebben. Een bestand dat een bewaking vrijstelt
// zet "// lifecycle-ok: reden" bovenaan (de reden is verplicht, anders telt het niet).
// Gebruik: node scripts/perf/lifecyclescan.mjs [--since=v0.64.0] [--all] [--top=40] [bestand ...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RESOURCE = /new\s+THREE\.(?:[A-Za-z]*Geometry|[A-Za-z]*Material|CanvasTexture|DataTexture|WebGLRenderTarget)\s*\(/;
const stripComment = (l) => l.replace(/\/\/.*$/, '');

export function scanSource(src, file = '?') {
  const out = [];
  if (/^\/\/ lifecycle-ok: \S/m.test(src.split('\n').slice(0, 8).join('\n'))) return out;
  const L = src.split('\n');
  const hasClearInterval = /clearInterval\s*\(/.test(src);
  const removesFromScene = /removeFromParent\s*\(|(?:scene|group|root|holder|world3d)\w*\.remove\s*\(/.test(src);
  const hasDispose = /\.dispose\s*\(|disposeObject|disposeWorldMarker|freeRoadGeometry/.test(src);
  const removed = new Set([...src.matchAll(/removeEventListener\s*\(\s*['"`]([a-z-]+)['"`]/g)].map((m) => m[1]));
  const hasGenericRemove = /removeEventListener\s*\(\s*[a-zA-Z_.]+\s*,/.test(src);
  let depth = 0;
  for (let i = 0; i < L.length; i++) {
    const line = stripComment(L[i]);
    const inFn = depth > 0 || /^\s{2,}\S/.test(line);
    const diep = /^\s{4,}\S/.test(line);
    if (!hasClearInterval && /\bsetInterval\s*\(/.test(line) && !/\.unref/.test(L.slice(i, i + 4).join(' '))) out.push({ file, line: i + 1, soort: 'interval', text: L[i].trim().slice(0, 110) });
    const m = /\b(window|document|document\.body|body)\.addEventListener\s*\(\s*['"`]([a-z-]+)['"`]/.exec(line);
    if (m && diep && !removed.has(m[2]) && !hasGenericRemove && !/once:\s*true|signal/.test(L.slice(i, i + 4).join(' '))) out.push({ file, line: i + 1, soort: 'luisteraar', text: L[i].trim().slice(0, 110) });
    if (!hasDispose && removesFromScene && inFn && RESOURCE.test(line)) out.push({ file, line: i + 1, soort: 'resource', text: L[i].trim().slice(0, 110) });
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (depth < 0) depth = 0;
  }
  return out;
}

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (p.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
  const top = Number(opt('top', 40));
  const files = args.filter((a) => !a.startsWith('--'));
  let list = files.map((f) => path.resolve(f));
  if (!list.length) {
    if (args.includes('--all')) list = walk(path.join(ROOT, 'game', 'js'));
    else {
      const since = opt('since', 'v0.64.0');
      const names = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', `${since}..HEAD`, '--', 'game/js'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((n) => n.endsWith('.js'));
      list = names.map((n) => path.join(ROOT, n));
    }
  }
  const all = [];
  for (const f of list) all.push(...scanSource(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f).split(path.sep).join('/')));
  const per = {};
  for (const x of all) per[x.soort] = (per[x.soort] || 0) + 1;
  console.log(`levensduurscan: ${list.length} bestanden, ${all.length} treffers`, JSON.stringify(per));
  for (const x of all.slice(0, top)) console.log(`  ${x.soort.padEnd(10)} ${x.file}:${x.line}  ${x.text}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
