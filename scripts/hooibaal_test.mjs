// #939: hooibalen zijn geen no-clip-decor meer. Deze test legt de botsingsregel
// vast (bales.js), de ronde vaste prop waarmee de velden hem registreren
// (countrywalls.js) en de balen op de erven (countryplan.js farmDetail).
//   node scripts/hooibaal_test.mjs
import './node3d.mjs';
import { BALE_HEIGHT, BALE_RADIUS, baleRadius, baleSolid } from '../game/js/bales.js';
import { setTileSolids, clearTileSolids, solidTileCount, pushOutOfSolids } from '../game/js/countrywalls.js';
// countryplan.js haalt three.js binnen via countryedge.js: pas na node3d.mjs laden.
const { farmDetail } = await import('../game/js/countryplan.js');

let n = 0, bad = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, m = 1e-6) => Math.abs(a - b) <= m;

// --- de maat van een baal -----------------------------------------------------
ok('een baal is 1,4 m hoog en 1,7 m breed: de botsingsstraal is 0,95 m', near(BALE_RADIUS, 0.95) && BALE_HEIGHT > 1.2);
ok('de botsingsstraal schaalt mee met het model', baleRadius(1, 1) === BALE_RADIUS && baleRadius(0.86, 0.86) < BALE_RADIUS);
ok('een rare schaal blijft binnen de perken', baleRadius(0, 0) > 0 && baleRadius(99, 99) <= BALE_RADIUS * 1.3);
ok('een baal levert een rond vast prop van het countrywalls-formaat', (() => {
  const s = baleSolid(12, -3, 1, 1);
  return s.length === 6 && s[0] === 12 && s[1] === -3 && s[2] === 12 && s[3] === -3 && s[4] === BALE_HEIGHT && s[5] === BALE_RADIUS;
})());

// --- de velden: een baal in de tegel is een echt obstakel ---------------------
const bale = baleSolid(5, 5);
setTileSolids(0, 0, [bale]);
ok('de tegel met de baal is geregistreerd', solidTileCount() === 1);
const binnen = { x: 5.4, y: 5.1 };
const geraakt = pushOutOfSolids(binnen, 0.35);
const afstand = Math.hypot(binnen.x - 5, binnen.y - 5);
ok('een voetganger in de baal wordt eruit geduwd', geraakt === true, String(geraakt));
ok('en staat op precies de straal van de baal plus zijn eigen dikte', near(afstand, BALE_RADIUS + 0.35, 0.01), afstand.toFixed(3));
const ver = { x: 5 + BALE_RADIUS + 0.35 + 0.2, y: 5 };
ok('buiten de baal gebeurt er niets', pushOutOfSolids(ver, 0.35) === false);
clearTileSolids(0, 0);
ok('na het opruimen van de tegel is de baal weg', solidTileCount() === 0 && pushOutOfSolids(binnen, 0.35) === false);

// --- de erven: de onderste rij balen van een stapel is vast -------------------
const f = { x: 0, y: 0, angle: 0, ca: 1, sa: 0, type: 'khr', front: 11, seed: 7, boxes: [], circles: [], items: null, yard: [-20, -60, 120, 60], full: [-30, -60, 120, 60] };
farmDetail(f);
const balen = (f.circles || []).filter((c) => Math.hypot(c.x - 30, c.y + 16) < 3);
ok('de stapel op het erf levert vier vaste balen (de onderste rij)', balen.length === 4, String(balen.length));
ok('de vaste baal heeft de botsingsstraal van bales.js', balen.every((c) => c.r > 0.6 && c.r < 1.1), JSON.stringify(balen.map((c) => c.r)));
ok('de balen op de stapel (boven de bumper) tellen niet mee', (f.circles || []).every((c) => !(Math.hypot(c.x - 30, c.y + 16) < 3 && c.r > 1.2)));

// --- en een auto stopt er ook op -------------------------------------------------
// Dezelfde push als vehicle.js voor een hoekpunt (straal 0,05 m).
setTileSolids(0, 0, [baleSolid(20, 20)]);
const hoek = { x: 20.2, y: 20.2 };
ok('een autohoek wordt uit de baal geduwd', pushOutOfSolids(hoek, 0.05) === true && Math.hypot(hoek.x - 20, hoek.y - 20) > BALE_RADIUS);
clearTileSolids(0, 0);

// --- de koppeling in de echte modules ---------------------------------------
import fs from 'node:fs';
const cs = fs.readFileSync(new URL('../game/js/countryside.js', import.meta.url), 'utf8');
ok('de velden registreren elke baal bij de geladen tegel', /type === 'bale'[^\n]*tile\.tx !== undefined/.test(cs) && /setTileSolids\(t\.tx, t\.ty, t\.solids\)/.test(cs) && /clearTileSolids\(t\.tx, t\.ty\)/.test(cs));
const vs = fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
ok('een auto en een voetganger lopen tegen de balen', /pushOutOfSolids\(_cp, reach\)/.test(vs) && /pushOutOfSolids\(_cp, 0\.05\)/.test(vs) && /pushOutOfSolids\(o, radius, hop\)/.test(fs.readFileSync(new URL('../game/js/collision.js', import.meta.url), 'utf8')));

console.log(`hooibaal_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
