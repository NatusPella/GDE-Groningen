// #959: de leuningen van de polderbruggen (countryrails.js) hielden een voetganger
// tegen, maar waren niet om overheen te springen: ze staan op 1,15 m en een gewone
// sprong haalt 0,6 m. Nu zijn ze, net als de leuningen van de stadsbruggen, met
// SPACE te nemen. Deze test controleert de regel en de bron:
//  - een leuning recht vooruit wordt gevonden, op de echte afstand;
//  - 1,15 m is een `vault` en geen `block`;
//  - naast de leuning of met de rug ernaartoe is er geen treffer;
//  - de speler gebruikt de regel in tryVault.
//   node scripts/polderrail_test.mjs
import fs from 'node:fs';
import { countryRailsNear, countryRailAhead, COUNTRY_RAIL_H } from '../game/js/countryrails.js';
import { vaultDecision } from '../game/js/vaultkit.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// zoek een polderblok met een brugleuning (de lijnen komen uit het echte veldraster)
let line = null;
for (let bx = -40; bx <= 40 && !line; bx++) {
  for (let by = -40; by <= 40 && !line; by++) {
    const L = countryRailsNear(bx * 400, by * 400, 400);
    if (L.length) line = L.slice(0, 4);
  }
}
ok(!!line, 'er is een polderleuning in het veld');
if (!line) { console.log(`${bad} van ${n} mislukt`); process.exit(1); }

const [ax, ay, bx, by] = line;
const ex = bx - ax, ey = by - ay, len = Math.hypot(ex, ey) || 1;
const ux = ex / len, uy = ey / len;          // langs de leuning
const nx = -uy, ny = ux;                      // dwars erop
const mx = (ax + bx) / 2, my = (ay + by) / 2;

const close = 2;                              // 2 m van de leuning
const px = mx + nx * close, py = my + ny * close;
const hit = countryRailAhead(px, py, -nx, -ny, 3);
ok(!!hit, 'de leuning recht vooruit wordt gevonden');
if (hit) {
  ok(Math.abs(hit.dist - close) < 0.01, 'op de echte afstand', hit.dist.toFixed(2));
  ok(hit.h === COUNTRY_RAIL_H, 'de hoogte is die van de polderleuning', String(hit.h));
  ok(vaultDecision(hit.h) === 'vault', '1,15 m is over te stappen, geen block', vaultDecision(hit.h));
}
ok(countryRailAhead(px, py, -nx, -ny, 1) === null, 'buiten bereik geen treffer');
ok(countryRailAhead(px, py, ux, uy, 3) === null, 'langs de leuning geen treffer');
ok(countryRailAhead(mx + nx * 9, my + ny * 9, -nx, -ny, 3) === null, '9 m ervandaan geen treffer');
ok(countryRailAhead(1e6, 1e6, 1, 0, 3) === null, 'zonder leuning in de buurt niets');

// bron: tryVault neemt de polderleuning mee
const src = fs.readFileSync(new URL('../game/js/player.js', import.meta.url), 'utf8');
ok(/import \{ countryRailAhead \} from '\.\/countryrails\.js'/.test(src), 'player.js importeert countryRailAhead');
ok(/const polderRail = this\.gz < 0\.5 \? countryRailAhead\(this\.x, this\.y, dx, dy, reach\) : null/.test(src), 'tryVault vraagt de polderleuning op');
ok(/if \(polderRail && \(!ob \|\| polderRail\.dist < ob\.dist\)\) ob = polderRail/.test(src), 'de leuning telt mee in de dichtstbijzijnde hindernis');

console.log(bad ? `${bad} van ${n} mislukt` : `polderrail_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
