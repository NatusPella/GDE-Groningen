// Zet het rapport van de doorspeeltest (report.json van `--story-test` met GDE_STORY_KETEN=1) om in de stappentabel
// van docs/VERHAAL-DOORSPEELBAAR-22-11.md: stap, bereikt, afgerond, duur, bevinding. Alleen lezen en printen.
//   node scripts/verhaal_doorspeel_tabel.mjs <report.json> [--audit=<audit.json>] [--out=<tabel.md>]
import fs from 'node:fs';

const arg = (k) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const file = process.argv.slice(2).find((v) => !v.startsWith('--'));
if (!file) { console.error('gebruik: node scripts/verhaal_doorspeel_tabel.mjs <report.json> [--audit=<audit.json>] [--out=<md>]'); process.exit(2); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const audit = arg('audit') ? JSON.parse(fs.readFileSync(arg('audit'), 'utf8')) : null;
const rows = report.keten || [];
const perAkte = new Map();
const out = ['| stap | akte | bereikt | afgerond | via | duur (s) | scenes | bevinding |', '|---|---|---|---|---|---|---|---|'];
for (const r of rows) {
  const e = r.errors;
  const bev = [];
  if (e) { if (e.script.length) bev.push('scriptfout: ' + e.script[0]); if (e.file.length) bev.push('bestand: ' + e.file[0]); if (e.console.length) bev.push('console: ' + e.console[0]); }
  for (const n of r.notes || []) if (/GEEN|NaN|mislukt|startte niet/.test(n)) bev.push(n.slice(0, 160));
  out.push(`| ${r.id} | ${r.part} | ${r.reached ? 'ja' : 'nee'} | ${r.done ? 'ja' : 'nee'} | ${r.via} | ${r.secs} | ${r.scenes} | ${bev.join('; ').replace(/\|/g, '/') || '-'} |`);
  const a = perAkte.get(r.part) || { n: 0, secs: 0, haak: 0 };
  a.n++; a.secs += r.secs || 0; if (/haak/.test(r.via)) a.haak++;
  perAkte.set(r.part, a);
}
out.push('', '| akte | stappen | gespeeld zonder haak | rekentijd (s, scenes overgeslagen) |', '|---|---|---|---|');
for (const [p, a] of perAkte) out.push(`| ${p} | ${a.n} | ${a.n - a.haak}/${a.n} | ${Math.round(a.secs)} |`);
if (audit) out.push('', `Ketenaudit: ${audit.stappen} stappen, ${audit.findings.filter((f) => f.sev === 'blokkerend').length} blokkerend, ${audit.findings.filter((f) => f.sev !== 'blokkerend').length} let op.`);
const text = out.join('\n') + '\n';
if (arg('out')) fs.writeFileSync(arg('out'), text); else process.stdout.write(text);
