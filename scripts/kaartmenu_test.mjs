// De kaart op de menusset (#602): de actiebalk, de eerste-keer-uitleg en de legenda.
//   node scripts/kaartmenu_test.mjs      (bronchecks: geen DOM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const kau = read('game/js/kaartactieui.js');
const mv = read('game/js/mapview.js');
const pcss = read('game/js/pausemenu.css');

// de actiebalk staat op menuformaat: 56 px rijen, 26 px Bebas, 18 px uitleg
ok(/\.mv-actie \{ display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px/.test(kau),
  'de actiebalk gebruikt 56 px hoge menurijen');
ok(/\.mv-actie \.mv-al \{ font: normal 26px/.test(kau) && /\.mv-actie small \{ font: 18px/.test(kau),
  'de actiebalk heeft 26 px Bebas en 18 px uitleg');
ok(!/font: 13px Arial|font: 11px|font-size: 11px|font-size: 12px/.test(kau), 'geen tekst onder 13 px in de actiebalk');
ok(!/#5dff7a|#ff9a8a|#9aa3ad|rgba\(95, 180, 217/.test(kau), 'de actiebalk heeft geen eigen groen, rood, grijs of blauw');

// de eerste-keer-uitleg staat in de kaartkolom onder het zoekveld, niet over de titel
ok(/querySelector\('\.mv-hl'\)[\s\S]{0,400}?insertAdjacentHTML\('beforeend', uitlegHtml/.test(mv),
  'de eerste-keer-uitleg staat in de kaartkolom onder het zoekveld');
ok(/\.mapview-overlay \.mv-uitleg \{ position: relative/.test(kau), 'de uitleg valt niet meer over de titel en het zoekveld');

// legenda en lagen: de knop Lagen en de legenda zijn weer bereikbaar, de reisbalk blijft weg
ok(/#pause-menu \.mapview-overlay\.embedded \.mv-goal \{ display: none !important; \}/.test(pcss),
  'de reisbalk blijft weg (#132)');
ok(!/\.mapview-legend, #pause-menu \.mapview-overlay\.embedded \.mv-layers/.test(pcss),
  'de legenda en de knop Lagen zijn niet meer verborgen');
ok(/else toggleLegend\(false\)/.test(mv), 'na de eerste keer opent de kaart rustig zonder legenda');
ok(/#pause-menu \.mapview-overlay\.embedded \.mapview-zoom \.m-bg \{ width: 56px; height: 56px/.test(pcss),
  'de zoemknoppen zijn 56 px, boven de 44 px touchmaat');
ok(/knop Lagen rechtsboven opent de legenda/i.test(read('game/js/helpoverview.js')), 'Besturing, Hulp noemt de knop Lagen');
ok(/\.mapview-zoom button \{\s*width: 44px; height: 44px/.test(mv), 'de zoemknoppen buiten het menu zijn 44 px');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
