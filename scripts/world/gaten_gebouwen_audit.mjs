// Liggen de watergaten van vaarnet_fixes.json over huizen? (#362, gevonden met de regatta: de baan lag in een woonblok)
// Elk stuk water dat het vaarnet toevoegt (links, gaten, verbindingen, sluisgaten, zee) is een rechthoek. Per rechthoek de
// gebouwen van de tegels (index.json en index-provincie.json) waarvan het grondvlak de rechthoek echt overlapt: water over een
// gebouw is een boot door een huis, een zwemmer in een woonkamer en een regattaton op een dak. Woonboten tellen niet mee.
// De lange zeestroken (zee, lengte boven 1000 m) staan niet als waterstuk in het spel (de zeetegels van seatiles.js dekken ze)
// en tellen niet mee.
//   node scripts/world/gaten_gebouwen_audit.mjs [--world=<map>] [--max=0] [--verbose]
// Leest de tegels van game/world, GAME_WORLD of --world. Zonder wereld: SKIP. Exit 1 boven --max rechthoeken.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { laadHuizen } from '../lib/huizenindex.mjs';
import { heeftTegels } from '../lib/tegelrijen.mjs';
import { gatPolygon, linkPolygon } from '../../game/js/vaarnet.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const verbose = process.argv.includes('--verbose');
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP gaten_gebouwen_audit: geen wereld in ' + dir); process.exit(0); }
const fixes = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'vaarnet_fixes.json'), 'utf8'));
const huizen = await laadHuizen(dir);

let totaal = 0, geraakt = 0, gebouwen = 0;
const perLijst = [], worst = [];
const lijsten = [
  ['links', fixes.links, linkPolygon],
  ['gaten', fixes.gaten, gatPolygon],
  ['verbindingen', fixes.verbindingen, gatPolygon],
  ['sluisgaten', fixes.sluisgaten, gatPolygon],
  ['zee', (fixes.zee || []).filter((g) => g[2] <= 1000), gatPolygon],
];
for (const [naam, lijst, poly] of lijsten) {
  let n = 0, hit = 0;
  (lijst || []).forEach((g, i) => {
    n++;
    const P = poly(g), hs = huizen.gebouwen(P);
    if (!hs.length) return;
    hit++; gebouwen += hs.length;
    worst.push({ lijst: naam, i, x: Math.round(P[0][0]), y: Math.round(P[0][1]), gebouwen: hs.length });
  });
  totaal += n; geraakt += hit;
  perLijst.push(`${naam} ${hit}/${n}`);
}
worst.sort((a, b) => b.gebouwen - a.gebouwen);
console.log(`gaten_gebouwen_audit: ${totaal} waterstukken, ${geraakt} overlappen minstens een gebouw (${gebouwen} gebouwen in totaal; ${huizen.aantalGebouwen} gebouwen getoetst) [${perLijst.join(', ')}]`);
for (const r of worst.slice(0, verbose ? 60 : 12)) console.log('  ', JSON.stringify(r));
process.exit(geraakt > Number(arg('max', 0)) ? 1 : 0);
