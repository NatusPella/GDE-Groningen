// Draait één clip uit een shots-bestand in de draaiende REPL (run.mjs --repl), als voorbeeld (stills) of als echte opname.
//   node scripts/trailer/repl_shot.mjs --out=<repl-map> <shots/bestand.page.js> <clipnaam> [--preview] [--set k=v]
// Het bestand definieert shot('naam', async (c) => {...}); alleen die ene clip wordt uitgevoerd. In het voorbeeld komen stills
// pv-<clip>-<beeld>.png in de uitvoermap (4 per clip); zonder --preview wordt de clip als mp4 opgenomen.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const pos = args.filter((a) => !a.startsWith('--'));
const [file, name] = pos;
if (!file || !name) { console.error('gebruik: repl_shot.mjs --out=<map> <bestand> <clip> [--preview]'); process.exit(2); }
const src = fs.readFileSync(path.resolve(file), 'utf8');
const argsFile = opt('args', '');
const body = `window.__preview = ${args.includes('--preview')};
window.__args = ${argsFile ? fs.readFileSync(path.resolve(argsFile), 'utf8') : 'null'};
const SH = {}; const shot = (n, f) => { SH[n] = f; };
${src}
if (!SH[${JSON.stringify(name)}]) return 'clip onbekend: ' + ${JSON.stringify(name)} + ' (kies uit ' + Object.keys(SH).join(', ') + ')';
const out = await SH[${JSON.stringify(name)}](window.__clip);
return JSON.stringify(out === undefined ? 'klaar' : out);
`;
const outDir = path.resolve(opt('out', '.'));
// stills van een vorige voorbeeldrun van deze clip weg (alleen bestanden met dit voorvoegsel)
if (args.includes('--preview')) for (const f of fs.readdirSync(outDir)) if (f.startsWith(`pv-${name}-`) && f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f));
const tmp = path.join(outDir, `_shot-${name}.js`);
fs.writeFileSync(tmp, body);
const r = spawnSync(process.execPath, [path.join(HERE, 'repl_send.mjs'), `--out=${opt('out', '.')}`, tmp, ...(opt('timeout', '') ? [`--timeout=${opt('timeout', '')}`] : [])], { stdio: 'inherit' });
process.exit(r.status ?? 1);
