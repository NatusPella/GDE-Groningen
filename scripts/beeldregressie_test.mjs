// Beeldregressie (#994), puur: PNG heen en terug, pixelverschil met tolerantie en drempel, mappen vergelijken, verversen.
// Raakt alleen een tijdelijke map binnen de repo-map .beeldregressie/test-<pid>; geen Electron, geen echte opslag.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng, vergelijk } from './lib/pngdiff.mjs';
import { GROEPEN, SCHERMEN, FORMATEN, ROOT, bestandsnaam, vergelijkMappen, ververs } from './ui/beeldregressie.mjs';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const beeld = (w, h, f) => { const data = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++) { const [r, g, b] = f(i % w, Math.floor(i / w)); data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255; } return { w, h, data }; };

// PNG heen en terug
const a = beeld(40, 30, (x, y) => [x * 6, y * 8, (x + y) & 255]);
const terug = decodePng(encodePng(a));
ok(terug.w === 40 && terug.h === 30 && terug.data.equals(a.data), 'encode en decode geven dezelfde pixels');

// vergelijken
ok(vergelijk(a, a).afwijkend === 0, 'gelijke beelden: geen afwijking');
const b = beeld(40, 30, (x, y) => [x * 6 + 4, y * 8, (x + y) & 255]);
ok(vergelijk(a, b, { tolerantie: 8 }).afwijkend === 0, 'een verschil binnen de tolerantie telt niet');
ok(vergelijk(a, b, { tolerantie: 2 }).afwijkend === 1200, 'een verschil boven de tolerantie telt alle pixels');
const c = beeld(40, 30, (x, y) => (x < 4 ? [255, 0, 0] : [x * 6, y * 8, (x + y) & 255]));
const rc = vergelijk(a, c, { tolerantie: 8, maakDiff: true });
ok(rc.afwijkend > 0 && rc.aandeel < 0.2 && rc.diff && rc.diff.w === 40, 'een deel afwijkend geeft een aandeel en een diffbeeld');
ok(vergelijk(a, beeld(41, 30, () => [0, 0, 0])).aandeel === 1, 'een ander formaat telt als volledig afwijkend');

// mappen
const tmp = path.join(ROOT, '.beeldregressie', 'test-' + process.pid);
const uit = path.join(tmp, 'uit'); const ref = path.join(tmp, 'ref');
fs.mkdirSync(uit, { recursive: true });
const schrijf = (map, naam, img) => { fs.mkdirSync(map, { recursive: true }); fs.writeFileSync(path.join(map, naam), encodePng(img)); };
try {
  schrijf(uit, '1280x720-menu-garage.png', a); schrijf(uit, '1280x720-menu-todo.png', c); schrijf(uit, '1280x720-nieuw.png', a);
  ok(vergelijkMappen(uit, ref).nieuw === 3, 'zonder referentiemap is alles nieuw, niets faalt');
  ok(vergelijkMappen(uit, ref).afwijkend === 0, 'nieuw is geen afwijking');
  ok(ververs(uit, ref, ['menu-garage']).length === 1 && fs.existsSync(path.join(ref, '1280x720-menu-garage.png')), 'verversen met --only zet alleen dat scherm');
  ververs(uit, ref);
  ok(vergelijkMappen(uit, ref).afwijkend === 0, 'na verversen is alles gelijk');
  schrijf(uit, '1280x720-menu-todo.png', b);
  const r2 = vergelijkMappen(uit, ref, { tolerantie: 2, drempel: 0.01, diffMap: path.join(tmp, 'diff') });
  ok(r2.afwijkend === 1 && fs.existsSync(path.join(tmp, 'diff', '1280x720-menu-todo.png')), 'een afwijking boven de drempel wordt gemeld met een diffbeeld');
  ok(vergelijkMappen(uit, ref, { tolerantie: 2, drempel: 1 }).afwijkend === 0, 'een ruime drempel laat de afwijking door');
  fs.rmSync(path.join(uit, '1280x720-nieuw.png'));
  ok(vergelijkMappen(uit, ref).ontbreekt.length === 1, 'een referentie zonder nieuw beeld wordt als ontbrekend gemeld');
  ok(vergelijkMappen(uit, ref, { alleen: ['menu-garage'] }).ontbreekt.length === 0, '--only beperkt ook de ontbrekend-controle');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

// de lijst
ok(JSON.stringify(FORMATEN) === JSON.stringify(['1024x600', '1280x720', '1920x1080']), 'drie formaten: 1024x600, 1280x720 en 1920x1080');
ok(GROEPEN.filter((g) => g.eerste).length === 1 && GROEPEN.find((g) => g.eerste).schermen.length === 5, 'de eerste set heeft vijf schermen');
ok(new Set(SCHERMEN.map((s) => s.naam)).size === SCHERMEN.length, 'elke schermnaam komt een keer voor');
ok(bestandsnaam('1280x720', 'garage') === '1280x720-garage.png', 'bestandsnaam volgt ui_shots (<formaat>-<scherm>.png)');
for (const g of GROEPEN) ok(fs.existsSync(path.join(ROOT, g.scenes)), 'het scenebestand bestaat: ' + g.scenes);
// elk scherm komt als [capture]-naam in zijn scenebestand voor (letterlijk of als deel van een samengestelde naam)
for (const g of GROEPEN) {
  const src = fs.readFileSync(path.join(ROOT, g.scenes), 'utf8');
  for (const s of g.schermen) ok(src.includes("'" + s + "'") || src.includes("'" + s.split('-')[0] + "'") || src.includes("'" + s.replace(/^bord-/, '') + "'"), `scherm ${s} staat in ${g.scenes}`);
}
// de eerste set heeft een eigen scenebestand met --only
ok(/__shotsOnly/.test(fs.readFileSync(path.join(ROOT, 'scripts/ui/beeldregressie_scenes.js'), 'utf8')), 'de eerste set kiest scenes met --only');
console.log(`beeldregressie_test: ${n} controles ok`);
