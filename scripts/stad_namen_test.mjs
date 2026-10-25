// Wat de speler als naam van een winkel, kroeg of garage ziet, is verzonnen (#488, constitutie 2).
// De ruwe OSM-namen staan wél in de kaartdata (game/stad.json: 470 horeca, 48 garages) en in de
// provincie; ze zijn de identiteit van een plek bij het matchen, niet de tekst op het scherm.
//
// Deze test bewaakt de twee plekken waar een naam vandaan komt, plus de data zelf. Faalt als iemand
// een OSM-naam doorgeeft aan het scherm.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game', 'js', f), 'utf8');
let fails = 0;
const ok = (voorwaarde, wat) => { if (!voorwaarde) { console.log('FAIL ' + wat); fails++; } };

// 1. Horeca: de getoonde naam komt uit CAFE_NAMES, nooit uit de OSM-rij.
const horeca = src('horeca.js');
ok(/name: cafeName\(h\)/.test(horeca), 'horeca.js: de getoonde naam komt uit cafeName()');
ok(!/name: [^,\n]*\bf\.own\b/.test(horeca), 'horeca.js: geen f.own als getoonde naam');
ok(/const CAFE_NAMES = \[/.test(horeca), 'horeca.js: de lijst met verzonnen namen bestaat');

// 2. Garages: idem via siteName() met de verzonnen keten.
const garages = src('garages.js');
ok(/name: siteName\(/.test(garages), 'garages.js: de getoonde naam komt uit siteName()');
ok(/const CHAIN = \{/.test(garages), 'garages.js: de verzonnen ketennamen bestaan');

// 3. Faciliteiten: alleen hulp- en overheidsdiensten mogen de OSM-naam tonen (beschrijvend, met een
//    echte plaats erin); een winkel, garage of pomp krijgt LABEL + buurt/plaats.
const fac = src('facilities.js');
ok(/const OWN_KINDS = new Set\(\[/.test(fac), 'facilities.js: er is een lijst soorten die de OSM-naam mogen tonen');
ok(/if \(f\.own && \(f\.sp \|\| OWN_KINDS\.has\(f\.kind\)\)\) return f\.own;/.test(fac), 'facilities.js: f.own alleen voor de provincielijst en de diensten');
ok(!/f\.name = f\.own/.test(fac), 'facilities.js: de naam komt uit nameOf(), niet rechtstreeks uit own');

// 4. De data: winkels dragen geen naam, en de namen die er zijn, zijn beschrijvend.
const stad = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'stad.json'), 'utf8'));
const meta = stad.meta || {};
const named = (lijst) => (meta[lijst] || []).filter((x) => x && typeof x.name === 'string' && x.name.trim());
ok(named('shops').length === 0, 'stad.json: geen winkels met een naam (' + named('shops').length + ')');
const horecaRows = named('horeca');
ok(horecaRows.length > 0, 'stad.json: de horecalijst is niet leeg (anders test dit niets)');
ok(!src('horeca.js').includes('h.name ||'), 'horeca.js: geen terugval op de OSM-naam in de HUD');

// 5. De faciliteitenlijst van de provincie: alleen beschrijvende namen (politie, brandweer, huisarts).
const facFile = path.join(ROOT, 'game', 'facilities.json');
if (fs.existsSync(facFile)) {
  const raw = JSON.parse(fs.readFileSync(facFile, 'utf8'));
  const verdacht = (raw.names || []).filter((n) => n && !/^(politie|brandweer|ziekenhuis|huisarts|ambulance|apotheek)/i.test(n));
  ok(verdacht.length === 0, 'facilities.json: alleen beschrijvende dienstnamen (' + verdacht.slice(0, 3).join(', ') + ')');
}

console.log((fails ? 'FAIL ' : '') + 'stad_namen_test: ' + (fails ? fails + ' fout' : 'ok — alle getoonde namen zijn verzonnen of beschrijvend'));
process.exit(fails ? 1 : 0);
