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

// De uitleg is een eenmalige popup over de kaart (herzien na spelersfeedback): hij verschijnt
// één keer, neemt de focus, en gaat weg met Begrepen, Escape of een klik ernaast. Daarna komt
// hij nooit meer vanzelf terug; hij blijft te vinden onder Instellingen > Besturing > Hulp.
ok(/body\.insertAdjacentHTML\('beforeend', uitlegHtml/.test(mv),
  'de uitleg wordt als popup over de kaart geplaatst');
ok(/(?:\.mapview-overlay|:is\(\.mapview-overlay, \.reis-hud\)) :is\(\.mv-help, \.mv-reispop\) \{ position: absolute; inset: 0;/.test(kau),
  'de uitleg dekt de kaart af als popup in plaats van in een kolom te staan');
ok(/role="dialog" aria-modal="true"/.test(kau) && /data-act="uitleg-sluit"/.test(kau) && !/aria-label="Sluiten"/.test(kau),
  'de popup is een dialoog met één sluitknop (Begrepen), geen kruisje');
ok(/knop\.focus\(\{ preventScroll: true \}\)/.test(mv), 'de popup zet de focus op Begrepen');

// legenda en lagen: de knop Lagen en de legenda zijn weer bereikbaar, de reisbalk blijft weg
ok(/#pause-menu \.mapview-overlay\.embedded \.mv-goal \{ display: none !important; \}/.test(pcss),
  'de reisbalk blijft weg (#132)');
ok(!/\.mapview-legend, #pause-menu \.mapview-overlay\.embedded \.mv-layers/.test(pcss),
  'de legenda en de knop Lagen zijn niet meer verborgen');
ok(/else \{ state\.legendGezien = true; toggleLegend\(false\); \}/.test(mv), 'na de eerste keer opent de kaart rustig zonder legenda');
ok(/#pause-menu \.mapview-overlay\.embedded \.mapview-zoom \.m-bg \{ width: 56px; height: 56px/.test(pcss),
  'de zoemknoppen zijn 56 px, boven de 44 px touchmaat');
ok(/knop Lagen rechtsboven opent de legenda/i.test(read('game/js/helpoverview.js')), 'Besturing, Hulp noemt de knop Lagen');
ok(/\.mapview-zoom button \{\s*width: 44px; height: 44px/.test(mv), 'de zoemknoppen buiten het menu zijn 44 px');

// QA 0.62.0: het laagjespaneel past op 720 px: de titel blijft staan en de laagjes
// scrollen in een eigen vak naast de zoomknoppen, met een zachte onderrand.
ok(mv.includes('<div class="mv-legend-body"></div>') && mv.includes('body.appendChild(box)'), 'de legenda heeft een eigen scrollvak onder de titel');
ok(/\.mapview-legend \.mv-legend-body \{ min-height: 0; overflow-y: auto/.test(mv), 'het scrollvak scrollt zelf');
ok(/\.mapview-legend \{[\s\S]*?overflow: hidden/.test(mv), 'de legenda zelf kapt niet hard af');
ok(/#pause-menu \.mapview-overlay\.embedded \.mapview-legend \{[\s\S]*?overflow: hidden/.test(pcss), 'het ingesloten paneel kapt niet hard af');
ok(/#pause-menu \.mapview-overlay\.embedded \.mapview-legend \.mv-legend-body \{[\s\S]*?overflow-y: auto/.test(pcss), 'de ingesloten laagjes scrollen in hun eigen vak');
ok(/max-height: calc\(100% - var\(--mt\) - 72px - 104px\)/.test(pcss), 'het paneel blijft binnen het scherm');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
