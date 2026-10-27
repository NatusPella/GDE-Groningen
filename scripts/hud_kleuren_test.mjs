// De HUD gebruikt de statuskleuren uit de a11y-paletten en geen eigen hexen (#479). Dit is de
// statische kant van die afspraak: in de kaarten, het keuzepaneel en de minigamebalk mag een
// kleur alleen als `var(--mk-*)` met terugvalwaarde staan, zodat een kleurenblindmodus meedoet.
//
// Twee soorten kleuren mogen wel los staan, en ze staan allebei op één plek in het bestand:
// - de identiteitskleur per minigame (`accent: '#...'` in de MINIGAMES-tabel);
// - de vulling en lijnen van de SVG-pictogrammen (`fill="#..."` / `stroke="#..."`).
// Alles daarbuiten is tekst- of chroomkleur uit DESIGN_SYSTEM.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (v, wat) => { if (!v) { console.log('FAIL ' + wat); fails++; } };
const read = (f) => fs.readFileSync(path.join(ROOT, 'game', 'js', f), 'utf8');

const CHROOM = new Set(['#f0ede4', '#f2f2f2', '#0c140e', '#17301f', '#ffffff', '#fff', '#a9a69b', '#fbfaf5', '#12200f']);

// Wat overblijft nadat de toegestane soorten eruit zijn.
function strayHexes(file, allow = new Set()) {
  let text = read(file);
  text = text.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()');
  text = text.replace(/accent:\s*'#[0-9a-fA-F]{6}'/g, 'accent');
  text = text.replace(/(fill|stroke)="#[0-9a-fA-F]{3,6}"/g, '$1=""');
  const hexes = [...text.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
  return [...new Set(hexes.filter((h) => !CHROOM.has(h) && !allow.has(h)))];
}

const kaarten = read('hudcards.css');
for (const soort of ['missie', 'bijbaan', 'geld', 'politie', 'gevaar', 'prestatie']) {
  ok(new RegExp(`data-kind="${soort}"\\]\\s*\\{\\s*--hc:\\s*var\\(--mk-`).test(kaarten),
    `hudcards.css: kaart "${soort}" haalt zijn kleur uit --mk-*`);
}
const kaartStray = strayHexes('hudcards.css');
ok(kaartStray.length === 0, 'hudcards.css: kleuren buiten de tokens: ' + (kaartStray.join(', ') || 'geen'));

const keuze = read('choicepanel.js');
ok(/var\(--cw-acc,\s*var\(--mk-mission/.test(keuze), 'choicepanel.js: het accent komt uit de mission-token');
ok(!/#d9a441|#5dff7a|#ff9a3c|#ffd23f/.test(keuze.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')),
  'choicepanel.js: geen losse statushexen meer');
const keuzeStray = strayHexes('choicepanel.js');
ok(keuzeStray.length === 0, 'choicepanel.js: kleuren buiten de tokens: ' + (keuzeStray.join(', ') || 'geen'));

const mg = read('minigamekit.js');
ok(!/#6cc070|#5dff7a/.test(mg.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')),
  'minigamekit.js: geen losse statushexen meer in de balk');
const mgStray = strayHexes('minigamekit.js');
ok(mgStray.length === 0, 'minigamekit.js: kleuren buiten de tokens en de accenttabel: ' + (mgStray.join(', ') || 'geen'));

// De identiteitskleuren staan op één plek: de accenttabel. Zo kan niemand er stilletjes een
// statuskleur tussen schuiven zonder dat deze test het ziet.
const accenten = [...mg.matchAll(/accent:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1].toLowerCase());
ok(accenten.length >= 15, 'minigamekit.js: de accenttabel is gevonden (' + accenten.length + ' spellen)');
ok(new Set(accenten).size === accenten.length, 'minigamekit.js: elke minigame heeft een eigen accentkleur');

console.log((fails ? 'FAIL ' : '') + 'hud_kleuren_test: ' + (fails ? fails + ' fout' : 'ok — de HUD-kleuren komen uit de tokens, de accenten uit één tabel'));
process.exit(fails ? 1 : 0);
