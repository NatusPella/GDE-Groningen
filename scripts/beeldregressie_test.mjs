// Beeldregressie (#994), puur: PNG heen en terug, pixelverschil met tolerantie en drempel, mappen vergelijken, verversen.
// Raakt alleen een tijdelijke map binnen de repo-map .beeldregressie/test-<pid>; geen Electron, geen echte opslag.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decodePng, encodePng, vergelijk } from './lib/pngdiff.mjs';
import { GROEPEN, SCHERMEN, FORMATEN, MODI, ROOT, bestandsnaam, ontleed, zetRustigNaast, vergelijkMappen, ververs } from './ui/beeldregressie.mjs';

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
ok(JSON.stringify(FORMATEN) === JSON.stringify(['1280x800', '1920x1080', '3840x2160']), 'drie formaten: 1280x800, 1920x1080 en 4K (#994)');
ok(JSON.stringify(MODI) === JSON.stringify(['vol', 'rustig']), 'twee standen: vol en Rustig drukwerk');
ok(bestandsnaam('1920x1080', 'menu-garage', 'rustig') === '1920x1080-menu-garage--rustig.png', 'een rustig beeld krijgt het achtervoegsel --rustig');
ok(JSON.stringify(ontleed('3840x2160-menu-todo--rustig.png')) === JSON.stringify({ formaat: '3840x2160', scherm: 'menu-todo', modus: 'rustig' }), 'ontleed leest formaat, scherm en stand');
ok(ontleed('1280x800-samen-hub.png').modus === 'vol' && ontleed('readme.png') === null, 'ontleed: vol is de standaard, een vreemd bestand is geen beeld');

// Rustig drukwerk: de twee standen zijn aparte referenties, --only kiest op schermnaam voor beide
{
  const t2 = path.join(ROOT, '.beeldregressie', 'test-rustig-' + process.pid);
  const u2 = path.join(t2, 'uit'); const r2 = path.join(t2, 'ref'); const tijdelijk = path.join(u2, '_rustig');
  try {
    fs.mkdirSync(tijdelijk, { recursive: true });
    fs.writeFileSync(path.join(u2, '1280x800-menu-garage.png'), encodePng(a));
    fs.writeFileSync(path.join(tijdelijk, '1280x800-menu-garage.png'), encodePng(c));
    ok(zetRustigNaast(tijdelijk, u2).length === 1 && !fs.existsSync(tijdelijk), 'zetRustigNaast verplaatst de rustige beelden en ruimt de map op');
    ok(fs.existsSync(path.join(u2, '1280x800-menu-garage--rustig.png')), 'het rustige beeld staat naast het volle beeld');
    ververs(u2, r2, ['menu-garage']);
    ok(fs.readdirSync(r2).length === 2, '--only verversen zet vol en rustig');
    ok(vergelijkMappen(u2, r2).afwijkend === 0, 'beide standen gelijk aan hun eigen referentie');
    fs.writeFileSync(path.join(u2, '1280x800-menu-garage--rustig.png'), encodePng(b));
    const rr = vergelijkMappen(u2, r2, { tolerantie: 2, drempel: 0.01 });
    ok(rr.afwijkend === 1 && rr.rijen.find((x) => x.staat === 'afwijking').bestand === '1280x800-menu-garage--rustig.png', 'een afwijking in alleen de rustige stand wordt gemeld');
  } finally { fs.rmSync(t2, { recursive: true, force: true }); }
}
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
// de vier grote schermmomenten (#996) staan in de lijst, met de vijfde soort wanted
ok(GROEPEN.find((g) => g.id === 'momenten').schermen.length === 5, 'de groep momenten heeft geslaagd, mislukt, opgepakt, gebied en wanted');
// aansluiting: ui_shots kent --rustig, de releasegate draait de set en laat een afwijking falen
ok(/--rustig/.test(fs.readFileSync(path.join(ROOT, 'scripts/ui_shots.mjs'), 'utf8')) && /rustigDrukwerk/.test(fs.readFileSync(path.join(ROOT, 'scripts/ui_shots.mjs'), 'utf8')), 'ui_shots zet Rustig drukwerk aan met --rustig');
const sets = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/release/visual-sets.json'), 'utf8')).sets;
const set = sets.find((x) => x.naam === 'beeldregressie');
ok(set && set.streng === true && set.script === 'scripts/ui/beeldregressie.mjs' && set.args.some((x) => x.includes('3840x2160')) && set.args.some((x) => x.includes('rustig')), 'visual-sets.json draait de beeldregressie streng in drie formaten en beide standen');
ok(/set\.streng/.test(fs.readFileSync(path.join(ROOT, 'scripts/release_gate.mjs'), 'utf8')), 'release_gate laat een strenge set bij afwijking falen');
console.log(`beeldregressie_test: ${n} controles ok`);
