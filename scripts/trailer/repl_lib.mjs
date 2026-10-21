// Laadt scripts/trailer/lib/clip.page.js opnieuw in de draaiende REPL (zonder de app of het slot los te laten).
//   node scripts/trailer/repl_lib.mjs --out=<repl-map>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = path.resolve((args.find((a) => a.startsWith('--out=')) || '--out=.').slice(6));
const lib = fs.readFileSync(path.join(HERE, 'lib', 'clip.page.js'), 'utf8');
const tmp = path.join(out, '_lib.js');
// de camera-accessor van de vorige versie wordt eerst weggehaald (de nieuwe zet hem zelf weer bij de eerste camera())
const prelude = `{ const wd = window.__debug.world; Object.defineProperty(wd, 'cameraOverride', { value: null, writable: true, configurable: true, enumerable: true }); }\n`;
fs.writeFileSync(tmp, `${prelude}${lib}\nawait loadModules();\ninstallVirtualTime();\nwindow.__clip = clipApi;\nreturn 'lib herladen klaar';\n`);
const r = spawnSync(process.execPath, [path.join(HERE, 'repl_send.mjs'), `--out=${out}`, tmp], { stdio: 'inherit' });
process.exit(r.status ?? 1);
