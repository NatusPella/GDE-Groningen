// Coöp-testbank (#95): een lichte "stage" voor een worktree zonder game/world en data/.
//   node scripts/coop/restage.mjs --base=<desktop/build/game van een volledige stage> [--out=<map>]
// Kopieert de gestagede build (met de wereldtegels) en legt de game/-bestanden van deze checkout erover, met
// dezelfde herschrijving van de CDN-adressen als desktop/build.mjs. Daarna: GDE_GAME_DIR=<out> voor Electron.
// version.js en world/ blijven die van de basis. Geen netwerk, geen bouw van de provincie.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const base = arg('base');
if (!base || !fs.existsSync(path.join(base, 'index.html'))) { console.error('--base=<gestagede game-map> ontbreekt of heeft geen index.html'); process.exit(2); }
const out = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-coop-stage')));
const CDN = 'https://cdn.jsdelivr.net/npm/';
const SRC = path.join(ROOT, 'game');
const SKIP = new Set(['world', 'tts.json']);

if (!fs.existsSync(out)) fs.cpSync(base, out, { recursive: true });
let changed = 0;
function walk(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p, r); continue; }
    if (r === 'js/version.js') continue;
    const dst = path.join(out, r);
    if (/\.(js|mjs|html)$/.test(e.name)) {
      let src = fs.readFileSync(p, 'utf8').split(CDN).join('/vendor/npm/');
      if (!fs.existsSync(dst) || fs.readFileSync(dst, 'utf8') !== src) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, src); changed++; }
    } else if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(p).size) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(p, dst); changed++; }
  }
}
walk(SRC);
console.log(`gestaged in ${out} (${changed} bestanden aangepast t.o.v. de basis)`);
