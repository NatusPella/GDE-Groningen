// De metgezel wordt niet meer aangereden door het stadsverkeer (game/js/metgezelregels.js, companion.js; 23-11): alleen een auto
// waar een speler in rijdt telt als aanrijding, al het andere duwt haar opzij.
//   node scripts/metgezel_test.mjs
import fs from 'node:fs';
import { aanrijdingTelt, spelerAchterStuur, RAAK_SNELHEID } from '../game/js/metgezelregels.js';

let bad = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const auto = (o = {}) => ({ speed: 12, ...o });
ok(!aanrijdingTelt(auto(), false), 'stadsverkeer op snelheid: geen aanrijding, alleen duwen');
ok(aanrijdingTelt(auto(), true), 'de speler rijdt haar aan: dat telt');
ok(!aanrijdingTelt(auto({ speed: RAAK_SNELHEID - 0.5 }), true), 'langzaam: duwen');
ok(!aanrijdingTelt(auto({ wrecked: true }), true) && !aanrijdingTelt(auto({ isBike: true }), true) && !aanrijdingTelt(auto({ isScooter: true }), true), 'wrak, fiets en scooter: duwen');
ok(!aanrijdingTelt(null, true), 'geen voertuig: niets');
const eigen = auto();
ok(spelerAchterStuur({ driver: 'player' }, null) && spelerAchterStuur({ driver: 2 }, null) && spelerAchterStuur(eigen, eigen), 'de eigen speler, een meespeler of het voertuig van de hoofdspeler');
ok(!spelerAchterStuur({ driver: null }, null) && !spelerAchterStuur(auto(), auto()), 'het stadsverkeer zit niet achter het stuur van een speler');
const bron = fs.readFileSync(new URL('../game/js/companion.js', import.meta.url), 'utf8');
ok(/aanrijdingTelt\(v, spelerAchterStuur\(v, hoofdspeler\(world\)\.inVehicle\)\)/.test(bron), 'companion.js gebruikt de regel bij elke botsing met een voertuig');
console.log(bad ? `metgezel_test: ${bad} van ${n} fout` : `metgezel_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
