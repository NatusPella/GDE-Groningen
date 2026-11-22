// Gameplay- en inhoudsbugs uit de beeldrondes van 22-11 (#1194, #1196, #1202):  node scripts/ui_fix_bugs_22_11_test.mjs
import fs from 'node:fs';
import { registerSignKeepOut, inSignKeepOut, spotFreeOnMap } from '../game/js/streetfurniture.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const src = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// #1196: geen lantaarnpaal of ander meubilair in de kijkkegel van een gevelbord
ok(!inSignKeepOut(100, 100), 'zonder zone is alles vrij');
registerSignKeepOut(100, 100, 4.5);
registerSignKeepOut(100, 100, 4.5);
registerSignKeepOut(NaN, 0, 3);
ok(inSignKeepOut(102, 101) && !inSignKeepOut(106, 100), 'binnen de zone geblokkeerd, erbuiten vrij');
ok(spotFreeOnMap(null, 102, 101) === true && spotFreeOnMap({ buildingGrid: null, roadsNear: () => [], waterNear: () => [], railNear: () => [] }, 102, 101) === false, 'straatmeubilair mijdt de zone');
ok(/registerSignKeepOut\(d\.cx \+ d\.nx \* 4/.test(src('game/js/home.js')), 'home.js zet de zone voor het Privégarage-bord');
ok(/inSignKeepOut\(x, y\)\) return true/.test(src('game/js/nightlights3d.js')) && /inSignKeepOut\(x, y\)\) return null/.test(src('game/js/nightlights3d.js')), 'de stadslantaarns mijden de zone');

// #1194: het duivenspot is een ring, geen halfdoorzichtige schijf die als een plas leest
const ps = src('game/js/pigeonspots.js');
ok(/const padGeo = new THREE\.RingGeometry/.test(ps) && !/padMat = new THREE\.MeshLambertMaterial\([^)]*transparent/.test(ps), 'duivenspot: ring, geen doorzichtige schijf');

// #1192: de onderkant van dek en viaduct heeft eigen licht en is dus geen zwart vlak
const rs = src('game/js/roadstructures3d.js');
ok(/concrete: \{[^}]*emissive: 0x2a2825/.test(rs) && /wall: \{[^}]*emissive: 0x2a2825/.test(rs), 'beton en wand van civiele werken hebben eigen licht');

console.log(`${n - fails}/${n} ui_fix_bugs_22_11`);
process.exit(fails ? 1 : 0);
