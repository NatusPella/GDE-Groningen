// Waar plaatst het spel boten, en is dat logisch? (boot-spawn 21-11, docs/BOOT-SPAWN-21-11.md)
// Loopt alle bootplekken af (liggers in jachthavens, verhuursteigers, bijbaan- en missieboten, AI-boten over meerdere seeds,
// decorboten op de maren en de missieboten van akte 2 en 4) en meet ze met de regel van game/js/vehicle/boatspots.js: waterbreedte,
// soort water (sloot/vijver), vaarnet, afstand tot kade of steiger. Rapporteert de afwijkers per categorie.
//   node scripts/world/boot_spawn_audit.mjs [--cat=marina,verhuur,bijbaan,race,missie,ai,sier] [--seeds=3] [--posities=24] [--max=0] [--lijst]
// Exit 1 bij meer dan --max afwijkers. Zonder game/world (provinciewereld) SKIP.
import { maakAudit, samenvatting } from '../lib/bootaudit.mjs';

const opt = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const cats = opt('cat', 'marina,verhuur,bijbaan,race,missie,ai,sier').split(',');
const MAX = Number(opt('max', 0));
const A = await maakAudit();
if (!A) { console.log('SKIP geen game/world met de provincielaag'); process.exit(0); }

const rijen = [];
for (const c of cats) {
  const t0 = Date.now();
  const r = await A.alle[c]({ seeds: Number(opt('seeds', 3)), posities: Number(opt('posities', 24)) });
  rijen.push(...r);
  console.log(`  ${c}: ${r.length} plekken in ${Date.now() - t0} ms`);
}
const per = samenvatting(rijen);
let fout = 0;
console.log('categorie   plekken  afwijkers  (sloot/vijver  te smal  geen vaarweg/kade  geen water  overig)');
for (const [c, s] of Object.entries(per)) {
  fout += s.fout;
  console.log(`${c.padEnd(11)} ${String(s.n).padStart(7)} ${String(s.fout).padStart(10)}   ${s.sloot} / ${s.smal} / ${s.geenVaarweg} / ${s.geenWater} / ${s.andere}${s.vervallen ? `   (${s.vervallen} kandidaten vervallen door de poort)` : ''}`);
  for (const v of s.voorbeelden) console.log('     - ' + v);
}
if (process.argv.includes('--lijst')) for (const r of rijen) if (!r.ok) console.log(JSON.stringify(r));
console.log(`afwijkers totaal: ${fout} (max ${MAX})`);
process.exit(fout > MAX ? 1 : 0);
