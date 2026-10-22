// Het hoofdmenu (#34 #92 #208): Alleen spelen en Samen spelen als de twee hoofdkeuzes, geen losse Nieuw spel / Hervatten;
// Alleen spelen opent Opgeslagen spellen met Doorgaan en Nieuw spel. Bronchecks (geen DOM):  node scripts/alleenspelen_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };

const start = read('game/js/startscreen.js');
const items = [...start.matchAll(/items\.push\(\{ act: '(\w+)', label: '([^']+)'/g)].map((m) => [m[1], m[2]]);
ok(items[0] && items[0][0] === 'solo' && items[0][1] === 'Alleen spelen', 'het eerste item is Alleen spelen');
ok(items[1] && items[1][0] === 'samen' && items[1][1] === 'Samen spelen', 'het tweede item is Samen spelen');
ok(!items.some(([a, l]) => /^(new|continue|saves)$/.test(a) || /Nieuw spel|Hervatten|Doorgaan|Opgeslagen spellen/.test(l)), 'Nieuw spel, Doorgaan, Hervatten en Opgeslagen spellen staan niet los in het hoofdmenu');
ok(items.map(([a]) => a).join() === 'solo,samen,news,settings,about,exit', 'verder alleen wat er was: nieuws, instellingen, over, afsluiten');
ok(/it\.act === 'solo'[\s\S]{0,500}openSaveSlots\(\{ mode: 'start', solo: true/.test(start), 'Alleen spelen opent Opgeslagen spellen met solo');
ok(/window\.__menuStart\s*=/.test(start), 'het QA-haakje __menuStart bestaat');

const ui = read('game/js/saveslotsui.js');
ok(/const solo = mode === 'start' && !!opts\.solo/.test(ui), 'saveslotsui kent solo');
ok(/ssl-hero/.test(ui) && /Doorgaan<\/span>|>Doorgaan</.test(ui) || /Doorgaan/.test(ui), 'Doorgaan staat boven het raster');
ok(/if \(solo\) tiles\.push\(newCard/.test(ui), 'Nieuw spel is de eerste kaart');
ok(/newfull/.test(ui) && /Dat spel wordt gewist/.test(ui), 'bij een volle opslag vraagt Nieuw spel eerst');

const pause = read('game/js/pausemenu.js');
ok(/data-action="menu"[^>]*>Naar het hoofdmenu</.test(pause), 'het pauzemenu heeft Naar het hoofdmenu');
ok(!/>Hoofdmenu<\/button>/.test(pause), 'het pauzemenu heeft geen kale Hoofdmenu-knop meer');

const words = read('docs/WOORDENLIJST.md');
ok(/\*\*Alleen spelen\*\*/.test(words) && /\*\*Naar het hoofdmenu\*\*/.test(words), 'de woordenlijst kent Alleen spelen en Naar het hoofdmenu');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
