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
// #1189: het blauwe duivenplaatje hangt niet meer in de cabine als je met een voertuig op de spot staat
{
  const m = ps.match(/function badgeShown\(p, s\) \{\n\s*return ([^\n]+);\n\}/);
  ok(!!m && /const BADGE_HIDE_NEAR_M = 8;/.test(ps), 'duivenspot: badgeShown en zijn grens bestaan');
  if (m) {
    const badgeShown = new Function('p', 's', 'BADGE_HIDE_NEAR_M', `return ${m[1]};`);
    const s = { x: 0, y: 0 };
    ok(badgeShown({ x: 2, y: 0, inVehicle: {} }, s, 8) === false, 'duivenspot: in een voertuig vlak bij de spot geen plaatje');
    ok(badgeShown({ x: 2, y: 0, inVehicle: null }, s, 8) === true, 'duivenspot: te voet blijft het plaatje');
    ok(badgeShown({ x: 30, y: 0, inVehicle: {} }, s, 8) === true, 'duivenspot: verder weg blijft het plaatje ook in een voertuig');
  }
  ok(/export const BADGE_SIZE_M = 0\.4;/.test(ps) && /badge\.scale\.set\(BADGE_SIZE_M, BADGE_SIZE_M, 1\)/.test(ps), 'duivenspot: het plaatje is 0,4 m, niet meer 0,52 m (#1189, beeld 24-11)');
  ok(/group\.userData\.badge = badge;/.test(ps) && /if \(badge\) badge\.visible = badgeShown\(p, s\);/.test(ps), 'duivenspot: de update-lus zet het plaatje per spot');
}

// #1192: de onderkant van dek en viaduct heeft eigen licht en is dus geen zwart vlak
const rs = src('game/js/roadstructures3d.js');
ok(/concrete: \{[^}]*emissive: 0x2a2825/.test(rs) && /wall: \{[^}]*emissive: 0x2a2825/.test(rs), 'beton en wand van civiele werken hebben eigen licht');

console.log(`${n - fails}/${n} ui_fix_bugs_22_11`);
process.exit(fails ? 1 : 0);
