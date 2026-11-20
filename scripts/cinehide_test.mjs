// #964: voertuigen rijden niet meer door cutscenes heen. De regel kiest alleen
// rijdend gewoon verkeer dicht bij de filmcamera; de auto van de speler, de cast
// van de scène, missieauto's en geparkeerde auto's blijven staan.
//   node scripts/cinehide_test.mjs
import { vehiclesInShot, markVehiclesInShot, clearVehicleHiding, duplicateOfProps } from '../game/js/cinehide.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const cam = { x: 0, y: 0, z: 2 };
const auto = (over = {}) => ({ x: 10, y: 0, z: 0, speed: 8, ...over });
const eigen = auto({ playerOwned: true });
const cast = auto({ cineTemp: true });
const missie = auto({ missionCar: true });
const geparkeerd = auto({ speed: 0 });
const ver = auto({ x: 200 });
const dichtbij = auto();
const boot = auto({ isBoat: true });

let lijst = vehiclesInShot([dichtbij, ver, geparkeerd, eigen, cast, missie, boot], cam, { playerVehicle: eigen });
ok(lijst.length === 2 && lijst.includes(dichtbij) && lijst.includes(boot), 'rijdend verkeer dichtbij gaat uit beeld', String(lijst.length));
ok(!lijst.includes(eigen) && !lijst.includes(cast) && !lijst.includes(missie), 'de speler, de cast en de missieauto blijven');
ok(!lijst.includes(geparkeerd) && !lijst.includes(ver), 'een geparkeerde of verre auto blijft staan');

// de camera hoog boven de weg (een brug of een heli-shot): auto's onder de camera tellen niet mee
ok(vehiclesInShot([dichtbij], { x: 0, y: 0, z: 40 }).length === 0, 'ver boven de auto telt hij niet mee');
ok(vehiclesInShot([auto({ z: 60 })], cam).length === 0, 'een auto hoog boven de scène telt niet mee');

// markeren en opruimen: wie uit beeld gaat, komt terug; wie blijft, blijft uit
const hidden = new Set();
markVehiclesInShot([dichtbij, ver], cam, hidden);
ok(dichtbij.hideInScene === true && ver.hideInScene === undefined, 'alleen de auto in de opname wordt verborgen');
markVehiclesInShot([ver, auto({ x: 1 })], cam, hidden);
ok(dichtbij.hideInScene === false && hidden.size === 1, 'zodra hij uit beeld is komt hij terug');
clearVehicleHiding(hidden);
ok(hidden.size === 0 && [...hidden].every((v) => !v.hideInScene), 'na de scène is alles weer zichtbaar');

// geen camera of geen wereld: niets verbergen
ok(vehiclesInShot([dichtbij], null).length === 0 && vehiclesInShot(null, cam).length === 0, 'zonder camera of voertuigen doet de regel niets');

// #955 (M09): het echte missievoertuig dat het voertuigprop van de scène dubbelt, wordt tijdens de scène niet getekend
const anker = { x: 0, y: 0 };
const trekker = { missionCar: true, model: { name: 'tractor' }, x: 6, y: 3 };
ok(duplicateOfProps([trekker], anker, ['tractor']).length === 1, 'de missietrekker bij het anker dubbelt het trekkerprop');
ok(duplicateOfProps([trekker], anker, ['escort']).length === 0, 'een ander model blijft zichtbaar');
ok(duplicateOfProps([{ ...trekker, driver: 'player' }], anker, ['tractor']).length === 0, 'de trekker waar de speler in zit blijft zichtbaar');
ok(duplicateOfProps([{ ...trekker, x: 80 }], anker, ['tractor']).length === 0, 'een missietrekker ver weg blijft zichtbaar');
ok(duplicateOfProps([{ ...trekker, missionCar: false }], anker, ['tractor']).length === 0, 'gewoon verkeer blijft aan de cinehide-regel');
ok(duplicateOfProps([trekker], anker, []).length === 0, 'een scène zonder voertuigprops verbergt niets');

// de scène en de wereld gebruiken het
const fs = await import('node:fs');
const cine = fs.readFileSync(new URL('../game/js/cinematics.js', import.meta.url), 'utf8');
const scene = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/markVehiclesInShot\(w\.vehicles/.test(cine), 'cinematics.js verbergt het verkeer in de opname');
ok(/clearVehicleHiding\(shotVehicles\)/.test(cine), 'en zet het aan het einde van de scène terug');
ok(/mesh\.visible = !v\.hideInScene/.test(scene), 'scene3d.js laat het verborgen voertuig ook echt weg');

const host = fs.readFileSync(new URL('../game/js/cutscenehost.js', import.meta.url), 'utf8');
ok(/duplicateOfProps\(w\.vehicles/.test(host) && /v\.hideInScene = false/.test(host), 'cutscenehost.js verbergt het dubbele missievoertuig en zet het terug');

console.log(`${n - fails}/${n} cinehide`);
process.exit(fails ? 1 : 0);
