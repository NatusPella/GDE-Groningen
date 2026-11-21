// Test van de wijkkeuze (game/js/wijkat.js) met de echte gebiedsdata: geen stadswijk buiten de stad, hysterese bij een grens,
// geen melding na een sprong (teleport, reizen, laden, film), vliegen en geen NaN. Puur, geen netwerk, geen Electron.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { ontvouw, grensVan } = await imp('game/js/grenzen.js');
const { districtAt, createDistrictTracker, CITY_LOCALITY, MAX_DISTRICT_DISTANCE, applyDistrictBounds } = await imp('game/js/wijkat.js');

let n = 0, f = 0;
const ok = (fn, naam) => { n++; try { fn(); } catch (e) { f++; console.log('FOUT', naam, '-', e.message); } };

const gr = ontvouw(JSON.parse(fs.readFileSync(path.join(root, 'game/grenzen.json'), 'utf8')));
const st = JSON.parse(fs.readFileSync(path.join(root, 'game/stad.json'), 'utf8'));
const pts = st.meta.neighbourhoodPoints;
const naamAt = (x, y, o = {}) => { const w = districtAt(pts, x, y, { grenzen: gr, ...o }); return w ? w.name : null; };

// 1. het raster: buiten de stad nooit een stadswijk (met en zonder grenzen)
const b = gr.provincie.b;
let buiten = 0, stadMet = 0, stadZonder = 0, fout = 0, foutZonder = 0, nan = 0;
for (let x = b[0]; x <= b[2]; x += 300) {
  for (let y = b[1]; y <= b[3]; y += 300) {
    const r = grensVan(gr, x, y);
    if (!r.provincie) continue;
    const stad = !!r.woonplaats && r.woonplaats.naam === CITY_LOCALITY;
    const m = districtAt(pts, x, y, { grenzen: gr });
    const z = districtAt(pts, x, y, { grenzen: null });
    if (m && !pts.includes(m)) nan++;
    if (!stad) { buiten++; if (m) fout++; if (z) { const d = Math.min(...pts.map((p) => Math.hypot(p.x - x, p.y - y))); if (!(d <= MAX_DISTRICT_DISTANCE)) foutZonder++; } }
    else { if (m) stadMet++; if (z) stadZonder++; }
  }
}
ok(() => assert.ok(buiten > 1000, `raster buiten de stad: ${buiten}`), 'het raster dekt de provincie');
ok(() => assert.equal(fout, 0), `met grenzen: ${fout} stadswijken buiten de stad`);
ok(() => assert.equal(foutZonder, 0), 'zonder grenzen: nooit verder dan de maximale afstand');
ok(() => assert.equal(nan, 0), 'altijd een bestaand wijkpunt');
ok(() => assert.ok(stadMet > 300), `in de stad krijgt een plek een wijk (${stadMet})`);

// 2. de plekken uit de melding van de eigenaar: ver buiten de stad
for (const [naam, x, y] of [['Winsum', -11000, 5000], ['Eemshaven', 21000, 28000], ['Ter Apel', 38000, -34000], ['de A7 bij Hoogezand', 17000, -9000], ['de Ommelanden', -4000, 9000]]) {
  const r = grensVan(gr, x, y);
  ok(() => assert.equal(naamAt(x, y), null), `${naam} (${x}, ${y}, ${r.woonplaats ? r.woonplaats.naam : 'buiten'}) heeft geen stadswijk`);
}

// 3. Paddepoel-Noord zelf blijft werken: een punt bij zijn wijkpunt geeft hem
const pn = pts.find((p) => p.name === 'Paddepoel-Noord');
ok(() => assert.ok(pn), 'Paddepoel-Noord is een wijkpunt');
ok(() => assert.equal(naamAt(pn.x, pn.y), 'Paddepoel-Noord'), 'op het wijkpunt: Paddepoel-Noord');
ok(() => assert.equal(naamAt(pn.x, pn.y + 9000), null), '9 km noordelijk (Ommelanden): geen wijk');
ok(() => assert.equal(districtAt(pts, pn.x, pn.y, { grenzen: null })?.name, 'Paddepoel-Noord'), 'zonder grenzen: ook op het wijkpunt');
ok(() => assert.equal(districtAt(pts, pn.x + 5000, pn.y, { grenzen: null }), null), 'zonder grenzen: 5 km verder geen wijk');

// 4. de gedeelde grenzen (applyDistrictBounds) worden gebruikt als niets wordt meegegeven
applyDistrictBounds(gr);
ok(() => assert.equal(districtAt(pts, 40000, -34000), null), 'gedeelde grenzen: Ter Apel geen wijk');
ok(() => assert.equal(districtAt(pts, pn.x, pn.y).name, 'Paddepoel-Noord'), 'gedeelde grenzen: binnen de stad wel');
applyDistrictBounds(null);

// 5. vliegen: hoog in de lucht geen wijk; laag wel
ok(() => assert.equal(districtAt(pts, pn.x, pn.y, { grenzen: gr, hoogte: 120 }), null), 'hoog in de lucht: geen wijk');
ok(() => assert.equal(districtAt(pts, pn.x, pn.y, { grenzen: gr, hoogte: 2 })?.name, 'Paddepoel-Noord'), 'laag: wel een wijk');

// 6. geen NaN of rommel
for (const [x, y] of [[NaN, 0], [0, NaN], [Infinity, 0], [undefined, undefined], [null, null]]) ok(() => assert.equal(districtAt(pts, x, y, { grenzen: gr }), null), `ongeldige plek ${x},${y}`);
ok(() => assert.equal(districtAt([], 0, 0), null), 'geen wijkpunten');
ok(() => assert.equal(districtAt(null, 0, 0), null), 'wijkpunten ontbreken');
ok(() => assert.equal(districtAt([{ name: 'X', x: NaN, y: 0 }], 0, 0, { grenzen: null }), null), 'een wijkpunt met NaN telt niet');

// 7. de volger: hysterese, geen melding na een sprong, geen melding voor een gebied zonder naam
{
  const v = createDistrictTracker({ dwell: 3, sprong: 400 });
  ok(() => assert.equal(v.tik(0.5, 'A', 0, 0), null), 'beginstand is geen melding');
  ok(() => assert.equal(v.stand(), 'A'), 'de stand is A');
  let m = null;
  for (let i = 0; i < 4; i++) m = v.tik(1, 'B', 10 + i * 10, 0) || m;   // 4 s in B: na 3 s de melding
  ok(() => assert.equal(m, 'B'), 'na het verblijf komt de melding');
  ok(() => assert.equal(v.tik(1, 'B', 60, 0), null), 'geen tweede melding voor dezelfde wijk');
  // flikkeren op een grens: B-A-B-A elke halve seconde meldt niets
  const w = createDistrictTracker({ dwell: 3 });
  w.tik(1, 'A', 0, 0);
  let veel = 0;
  for (let i = 0; i < 40; i++) if (w.tik(0.5, i % 2 ? 'A' : 'B', 5, 0)) veel++;
  ok(() => assert.equal(veel, 0), 'flikkeren op een grens geeft geen melding');
  // teleport: een sprong van 5 km geeft geen melding, ook niet na het verblijf in de nieuwe wijk
  const t = createDistrictTracker({ dwell: 3, sprong: 400 });
  t.tik(1, 'A', 0, 0);
  let teleportMeldingen = 0;
  for (let i = 0; i < 10; i++) if (t.tik(1, 'C', 5000 + i, 0)) teleportMeldingen++;
  ok(() => assert.equal(teleportMeldingen, 0), 'teleport meldt niets');
  ok(() => assert.equal(t.stand(), 'C'), 'na de sprong is C de stand');
  // buiten de stad (naam null): geen melding; terugkomen in dezelfde wijk meldt pas na het verblijf
  const u = createDistrictTracker({ dwell: 2 });
  u.tik(1, 'A', 0, 0);
  ok(() => assert.equal(u.tik(1, null, 50, 0), null), 'buiten de stad: geen melding');
  ok(() => assert.equal(u.stand(), null), 'buiten de stad: geen stand');
  assert.equal(u.tik(1, 'A', 100, 0), null);
  ok(() => assert.equal(u.tik(2.5, 'A', 120, 0), 'A'), 'terugkomen in de stad meldt na het verblijf');
  // NaN-invoer
  const g = createDistrictTracker();
  ok(() => { g.tik(NaN, 'A', NaN, NaN); g.tik(NaN, 'B', 0, NaN); g.tik(1, 'B', 0, 0); }, 'NaN laat de volger niet crashen');
}

console.log(`wijkat_test: ${n - f}/${n} geslaagd (raster: ${buiten} punten buiten de stad, ${stadMet} in de stad met wijk)`);
process.exit(f ? 1 : 0);
