// Start het spel opnieuw in de draaiende REPL, zonder het Electron-slot los te laten: de pagina wordt herladen, het
// hoofdmenu wordt voorbij gegaan en lib/clip.page.js wordt geladen (prepare). Handig na een fout in de bibliotheek.
//   node scripts/trailer/repl_boot.mjs --out=<repl-map>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = path.resolve((args.find((a) => a.startsWith('--out=')) || '--out=.').slice(6));
const send = (file, timeout = 600) => spawnSync(process.execPath, [path.join(HERE, 'repl_send.mjs'), `--out=${out}`, `--timeout=${timeout}`, file], { encoding: 'utf8' });
const w = (name, body) => { const f = path.join(out, name); fs.writeFileSync(f, body); return f; };

// 1. herladen (de opdracht zelf mag falen door het navigeren)
const add = (args.find((x) => x.startsWith('--url-add=')) || '').slice(10);
const reload = add ? `location.href = location.href + ${JSON.stringify('&' + add)}` : 'location.reload()';
const r0 = send(w('_boot0.js', `(window.__clipState ? window.__clipState.rt.setTimeout : setTimeout)(() => { ${reload}; }, 50); return "herladen";`), 20);
console.log(r0.stdout.trim() || r0.stderr.trim());
// 2. wachten tot het spel er weer is
const wait = w('_boot1.js', 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500)); return !!(window.__debug && window.__debug.world);');
let ok = false;
for (let i = 0; i < 40 && !ok; i++) { const r = send(wait, 150); ok = /true/.test(r.stdout); if (!ok) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},3000)']); }
if (!ok) { console.error('spel kwam niet terug'); process.exit(1); }
// 3. hoofdmenu voorbij, filmpjes weg
const boot = `
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
let seen = false;
for (let i = 0; i < 60; i++) { const up = !!ss && ss.classList.contains('visible'); if (up) { seen = true; key('Enter', 'Enter'); } await new Promise((r) => setTimeout(r, up ? 2500 : 1000)); if (seen && !ss.classList.contains('visible')) break; }
const wd = window.__debug.world;
for (let i = 0; i < 25 && wd.paused; i++) { key(' ', 'Space'); await new Promise((r) => setTimeout(r, 700)); }
`;
const lib = fs.readFileSync(path.join(HERE, 'lib', 'clip.page.js'), 'utf8');
const r3 = send(w('_boot2.js', `${boot}\n${lib}\nawait prepare();\nreturn 'spel opnieuw gestart';\n`), 400);
console.log(r3.stdout.trim() || r3.stderr.trim());
process.exit(r3.status ?? 1);
