// #1092: de polderbruggen over een maar bestaan niet meer (de maaren waren een verzonnen slotenrooster), dus ook hun leuningen niet.
// De regel voor leuningen die er wel zijn (#959) blijft getest met een eigen lijn.
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

// nergens in het veldraster is er nog een polderleuning (geen maaren, geen bruggen)
let aantal = 0;
for (let bx = -40; bx <= 40; bx++) for (let by = -40; by <= 40; by++) aantal += countryRailsNear(bx * 400, by * 400, 400).length;
ok(aantal === 0, 'er is geen polderleuning meer in het veld', String(aantal));
ok(countryRailAhead(0, 0, 1, 0, 50) === null && countryRailAhead(12345, 6789, 0, 1, 50) === null, 'en niets om tegenaan te lopen');
// de regel zelf: 1,15 m is over te stappen
ok(vaultDecision(COUNTRY_RAIL_H) === 'vault', '1,15 m is over te stappen, geen block', vaultDecision(COUNTRY_RAIL_H));

// bron: tryVault neemt de polderleuning mee
const src = fs.readFileSync(new URL('../game/js/player.js', import.meta.url), 'utf8');
ok(/import \{ countryRailAhead \} from '\.\/countryrails\.js'/.test(src), 'player.js importeert countryRailAhead');
ok(/const polderRail = this\.gz < 0\.5 \? countryRailAhead\(this\.x, this\.y, dx, dy, reach\) : null/.test(src), 'tryVault vraagt de polderleuning op');
ok(/if \(polderRail && \(!ob \|\| polderRail\.dist < ob\.dist\)\) ob = polderRail/.test(src), 'de leuning telt mee in de dichtstbijzijnde hindernis');

console.log(bad ? `${bad} van ${n} mislukt` : `polderrail_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
