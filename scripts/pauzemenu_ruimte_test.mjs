// Pauzemenu-ruimte (21-11): de omschrijving rechts van de kop is weg, de kop is compact (titel, datum en plek op één regel, de tabs direct eronder)
// en de inhoud gebruikt de ruimte: Loopbanen is een kaartenraster met een ruim detail zonder plakkende balk rechtsonder.
// Bronchecks plus een schatting van de hoogte op 1280x720; niets hiervan is in beeld gezien.
//   node scripts/pauzemenu_ruimte_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const pm = read('game/js/pausemenu.js');
const css = read('game/js/pausemenu.css');
const lb = read('game/js/loopbaanui.js');

// 1. geen omschrijving meer in de kop
ok(!/pm-sheet-sub/.test(pm), 'pausemenu.js kent geen pm-sheet-sub meer');
ok(!/pm-sheet-sub/.test(css), 'pausemenu.css kent geen pm-sheet-sub meer');
ok(/const \[, label\] = sectionOf\(name\)( \|\| sectionOf\('spel'\))?;/.test(pm), 'de kop leest alleen de titel van de sectie, niet de omschrijving');

// 2. compacte kop: één regel, de tabs er direct onder
const slot = css.slice(css.indexOf('pauzemenu-ruimte (21-11): een compacte kop'));
ok(/\.pm-sheet-head \{ display: flex; align-items: baseline;[^}]*padding-top: 18px/.test(slot), 'de kop is een regel met een kleine bovenrand');
ok(/\.pm-inner > \.m-tabs[^{]*\{ margin-top: 6px; \}/.test(slot), 'de tabs staan 6 px onder de kop');
ok(/\.pm-sheet-titles \{ display: flex; flex-wrap: wrap; align-items: baseline/.test(slot), 'titel en datum staan naast elkaar');

// 3. loopbanen: kaartenraster, ruim detail met containerquery, geen plakkende hoofdactie
ok(/\.m-list\.lb-list \{[^}]*display: grid; grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, 250px\), 1fr\)\)/.test(lb), 'de loopbanen staan in een responsief raster');
ok(/\.lb-list > \.lb-groep \{ grid-column: 1 \/ -1/.test(lb), 'een groepskop beslaat de hele rij');
ok(/container: lbp \/ inline-size/.test(lb) && /@container lbp \(min-width: 600px\)/.test(lb), 'het detail gaat op twee kolommen als er ruimte is');
ok(!/lb-pane > \.lb-vast \{ position: sticky/.test(lb), 'de hoofdknop plakt niet meer onderaan het detail');
ok(/lb-d-kop[\s\S]{0,900}actieHtml\(profiel, id\)[\s\S]{0,40}<\/div>/.test(lb), 'de hoofdknop staat in de kop van het detail, bij de selectie');
ok(/Wie is hier goed: \$\{esc\(FIT\[fit\.fit\]\)\}/.test(lb) && /function tourHtml/.test(lb), 'het detail toont wie goed is en de tour staat als tijdlijn (loopbaantour.js)');
ok(/class="m-li lb-li lb-kaart ds-m-knop/.test(lb) && /class="m-bp lb-hoofd ds-m-knop"/.test(lb), 'kaart en hoofdknop hebben de microbeweging');
ok(/data-vak-start/.test(lb) && /data-todo-goal="job:/.test(lb), 'de acties van het detail blijven (starten en als doel zetten)');
ok(/\.lb-kaart \{ min-height: 60px; \}/.test(lb), 'op een laag scherm worden de kaarten compact');

// 4. 13 px-vloer in alles wat hier nieuw is
for (const m of (slot + lb).matchAll(/font-size: (\d+)px/g)) ok(+m[1] >= 13, 'geen tekst onder 13 px', m[0]);
for (const m of lb.matchAll(/font-size: max\((\d+)px/g)) ok(+m[1] >= 13, 'max()-vloer minstens 13 px', m[0]);

// 5. schatting op 1280x720 (ui-schaal 1,0): de kern van Loopbanen past zonder scrollen
const H = 720, bladBoven = 30, bladOnder = 30;            // --mt/--mb ongeveer
const blad = H - bladBoven - bladOnder;
const kop = 18 + 52, balk = 44, mainPad = 14 + 16;
const detailKern = 44 /* band */ + 8 + 30 /* titel */ + 8 + 52 /* knop */ + 8 + 110 /* voortgang en feiten */;
const ruimte = blad - kop - balk - mainPad;
ok(detailKern <= ruimte, '1280x720: de kern van het detail past in het blad', detailKern + ' > ' + ruimte);
// 6. Tabs: zes tabbladen met een kleine kop laten meer dan 70% van het blad over voor de inhoud
ok((blad - kop - 6 - 44) / blad > 0.7, '1280x720: minstens 70% van het blad is inhoud', String((blad - kop - 50) / blad));

console.log(`pauzemenu_ruimte_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
