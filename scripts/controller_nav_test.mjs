// Borging van "Controller soepel" (#985): de focusvolgorde en de lijst schermen die met een controller bedienbaar moeten zijn.
// Zonder Electron: de pure kant (padlogic.js, controls.js, padscreens.js) en de bronnen (pausemenu.js, gamepad.js, de QA-controllersweep).
//   node scripts/controller_nav_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spatialNext } from '../game/js/padlogic.js';
import { PAD_MAPS, PAD_BUTTONS } from '../game/js/controls.js';
import { bevindingen } from './qa/controller_sweep_logic.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + m + (info !== '' ? ' (' + (typeof info === 'string' ? info : JSON.stringify(info)) + ')' : '')); } };

// ---------- 1. de focusvolgorde: een raster van 3 x 3 en een lijst met een kolom ernaast ----------
const cel = (x, y) => ({ x: x * 110, y: y * 40, w: 100, h: 30 });
const raster = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) raster.push(cel(x, y)); // index = y * 3 + x
ok(spatialNext(raster, -1, 'down') === 0, 'zonder focus begint de D-pad linksboven');
ok(spatialNext(raster, 4, 'up') === 1 && spatialNext(raster, 4, 'down') === 7 && spatialNext(raster, 4, 'left') === 3 && spatialNext(raster, 4, 'right') === 5, 'vanuit het midden gaat elke richting naar de directe buur');
ok(spatialNext(raster, 0, 'up') === -1 && spatialNext(raster, 0, 'left') === -1, 'aan de rand is er geen buur (gamepad.js loopt dan door de lijst heen)');
ok(spatialNext(raster, 8, 'down') === -1 && spatialNext(raster, 8, 'right') === -1, 'rechtsonder: geen buur omlaag of naar rechts');
// een rail (smalle kolom links) naast een brede lijst: rechts vanuit de rail gaat naar de rij op gelijke hoogte, niet naar de bovenste
const rail = [0, 1, 2].map((i) => ({ x: 0, y: i * 40, w: 80, h: 30 }));
const lijst = [0, 1, 2, 3].map((i) => ({ x: 120, y: i * 40, w: 300, h: 30 }));
const beide = [...rail, ...lijst];
ok(spatialNext(beide, 2, 'right') === 5, 'rechts vanuit de derde railknop gaat naar de derde rij van de lijst', spatialNext(beide, 2, 'right'));
ok(spatialNext(beide, 5, 'left') === 2, 'links vanuit de lijst gaat terug naar de railknop op gelijke hoogte');
ok(spatialNext(beide, 5, 'down') === 6 && spatialNext(beide, 6, 'down') === -1, 'omlaag door de lijst en dan stoppen (de lijst loopt zelf door)');
// scheefstaande buren tellen mee, een element erachter niet
ok(spatialNext([cel(0, 0), { x: 5, y: 80, w: 100, h: 30 }, cel(0, 1)], 0, 'down') === 2, 'de dichtstbijzijnde buur wint, niet de eerste in de DOM');

// ---------- 2. de menu-indeling: elke knop die een menu nodig heeft ----------
const M = PAD_MAPS.menu;
ok(M.a === 'enter' && M.b === 'escape' && M.start === 'escape', 'menu: A bevestigt, B en Start gaan terug');
ok(M.up === 'arrowup' && M.down === 'arrowdown' && M.left === 'arrowleft' && M.right === 'arrowright', 'menu: de D-pad zijn de pijlen');
ok(M.stick === 'nav', 'menu: de linkerstick loopt door de focus (een richting tegelijk)');
ok(M.lb === 'q' && M.rb === 'e' && M.lt === '[' && M.rt === ']', 'menu: bumpers en triggers wisselen van tabblad en onderdeel');
ok(M.view === 'm', 'menu: Terug/View is de kaart');
ok(PAD_BUTTONS.length === 16, 'zestien knoppen in de standaardmapping');

// ---------- 3. de lijst schermen in de QA-controllersweep dekt elk tabblad van het pauzemenu ----------
const pm = read('game/js/pausemenu.js');
const nav = read('game/js/padmapnav.js');
const sweep = read('scripts/qa/controller_sweep.page.js');
const schermen = [...sweep.matchAll(/\['([a-z0-9-]+)', \['([a-z]+)'/g)].map((m) => m[2]);
const tabs = new Set([...pm.matchAll(/data-panel="([a-z]+)"/g)].map((m) => m[1]));
for (const t of ['spel', 'samen', 'todo', 'map', 'prestaties', 'settings', 'spullen', 'garage', 'telefoon', 'loopbaan', 'controls', 'veroverd', 'fotos']) ok(schermen.includes(t), `de controllersweep opent ${t}`);
ok(tabs.size > 5, 'pausemenu.js heeft panelen (data-panel)', [...tabs].length);
ok(/kaart-bediening/.test(sweep) && /tekstveld/.test(sweep) && /winkel/.test(sweep), 'de sweep meet ook kaartbediening, tekstveld en winkel');

// ---------- 4. gamepad.js: de gedeelde regels die elk scherm erft ----------
const pad = read('game/js/gamepad.js');
ok(/function menuFallback/.test(pad) && /el\.click\(\)/.test(pad), 'A klikt de gefocuste knop (menuFallback)');
ok(/spatialNext\(rects, i, a\.slice\(5\)\)/.test(pad), 'de pijlen kiezen de buur op het scherm');
ok(/el\.scrollBy\(0, ry/.test(pad), 'de rechterstick scrolt de lijst met focus');
ok(/slot === 'b' && open\) return 'backspace'/.test(pad), 'B is Backspace in de telefoon');
ok(/(lt|rt)' \|\| slot === 'rt'\) && hooks\.mapOpen/.test(pad.replace(/\s+/g, ' ')) || /hooks\.mapOpen/.test(pad), 'de triggers zoomen de kaart');
ok(/padkeyboard/.test(read('game/js/main.js')), 'het schermtoetsenbord is aangesloten');

// ---------- 4b. de kaart: pijlen panen, L3 gaat naar de knoppen op de kaart en de D-pad loopt er doorheen (#985) ----------
ok(M.ls === 'tab', 'menu: L3 is Tab (op de kaart: naar de kaartknoppen)');
ok(/export function stepMapControls/.test(nav) && /export function toggleMapControls/.test(nav) && /export function mapControlList/.test(nav), 'padmapnav.js heeft de kaartknoppen voor de controller');
ok(pm.includes("from './padmapnav.js'"), 'pausemenu.js haakt er dun op aan');
ok(pm.includes("e.__gde === 'pad' && mapControlList(root).includes(t)"), 'alleen een controller met focus op een kaartknop loopt langs de knoppen (de muis en het toetsenbord panen zoals eerst)');
ok(pm.includes("tab === 'map' && !inRail && e.__gde === 'pad') toggleMapControls"), 'Tab van de controller op de kaart wisselt tussen doek en knoppen; die van het toetsenbord wisselt van onderdeel');
// de kaartkaart: een kolom knoppen onder elkaar, de D-pad loopt er van boven naar beneden doorheen en niet eruit
const kaartkaart = [0, 1, 2, 3].map((i) => ({ x: 600, y: 300 + i * 44, w: 220, h: 36 }));
ok([0, 1, 2].every((i) => spatialNext(kaartkaart, i, 'down') === i + 1) && spatialNext(kaartkaart, 3, 'down') === -1, 'de kaartkaart: omlaag door Zet waypoint, Reis erheen, Info en Sluiten');

// ---------- 5. de beoordeling van een sweepresultaat ----------
ok(bevindingen({ onbereikbaar: [], aKlik: 'ok', bTerug: 'sluit', kbHint: [], woordHint: [] }).length === 0, 'een gaaf scherm heeft geen bevindingen');
const slecht = bevindingen({ onbereikbaar: ['x', 'y'], focusVal: 1, dubbeleRing: 1, aKlik: 'GEEN KLIK op x', bTerug: 'GEEN REACTIE', scroll: { bewogen: false }, kbHint: ['kbd "E"'], woordHint: ['Klik op'], opm: ['ook na D-pad omlaag geen focus in het scherm'] });
ok(slecht.length === 9, 'elk soort fout wordt gemeld', slecht);
ok(bevindingen(null).length === 0, 'geen resultaat geeft geen bevindingen');

if (fails) { console.log(`controller_nav_test: ${fails} van ${n} mislukt`); process.exit(1); }
console.log(`controller_nav_test: ${n} ok`);
