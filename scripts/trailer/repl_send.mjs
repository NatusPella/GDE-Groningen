// Stuurt een script naar een draaiende `run.mjs --repl` en toont het resultaat.
//   node scripts/trailer/repl_send.mjs --out=<map> <bestand.js>       of      node scripts/trailer/repl_send.mjs --out=<map> -e "return window.__clip.world.clock"
//   node scripts/trailer/repl_send.mjs --out=<map> --quit              stopt de app (en geeft zo het slot vrij)
// Het script draait als async-functie in de pagina; window.__clip is de API van lib/clip.page.js.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.join(path.resolve(opt('out', '.')), '_repl');
fs.mkdirSync(dir, { recursive: true });
if (args.includes('--quit')) { fs.writeFileSync(path.join(dir, 'quit'), '1'); process.exit(0); }
const ei = args.indexOf('-e');
const src = ei >= 0 ? args[ei + 1] : fs.readFileSync(args.find((a) => !a.startsWith('--') && a !== args[ei + 1]), 'utf8');
const n = fs.readdirSync(dir).filter((f) => /^cmd-\d+\.js$/.test(f)).length + 1;
fs.writeFileSync(path.join(dir, `cmd-${n}.js`), src);
const res = path.join(dir, `res-${n}.json`);
const t0 = Date.now();
while (!fs.existsSync(res)) {
  if (Date.now() - t0 > (Number(opt('timeout', 600)) * 1000)) { console.error('geen antwoord (is run.mjs --repl actief?)'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 200));
}
await new Promise((r) => setTimeout(r, 100));
const r = JSON.parse(fs.readFileSync(res, 'utf8'));
console.log(typeof r.value === 'string' ? r.value : JSON.stringify(r.ok ? r.value : r.error, null, 1));
process.exit(r.ok ? 0 : 1);
