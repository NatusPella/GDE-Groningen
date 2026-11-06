// Garage en Spullen (#610): de draaitafel is met elk apparaat te bedienen, de
// hint bij het model klopt, en een kaart in de lijst is nooit een leeg vlak.
// Daarnaast is vastgelegd waar het Spullen-scherm woont: het is een eigen
// pauzemenu-sectie op het gedeelde .gm-paneel (spullen.js), zonder eigen preview.
//   node scripts/garage_draaien_test.mjs
import fs from 'node:fs';
import * as B from '../game/js/hudbus.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const gu = read('garageui.js');
const pm = read('pausemenu.js');
const sp = read('spullen.js');

// --- de draaitafel: hint en bediening -----------------------------------------
ok(/export function turnGarageViewer\(dir\)/.test(gu), 'garageui.js heeft turnGarageViewer (de draairichting)');
ok(/viewer\.turn\(dir \* TURN_STEP\)/.test(gu), 'turnGarageViewer draait de gedeelde preview een stap');
ok(/canvas tabindex="0"/.test(gu), 'de canvas van het model is met de toetsen en de pad te bereiken');
ok(/aria-label="3D-model van \$\{model\}: sleep of gebruik de pijltjes om te draaien"/.test(gu), 'de canvas vertelt dat hij te draaien is');
// de hint noemt niet alleen slepen: de pijltjes (of de D-pad) staan er als toetsplaatje bij,
// en glyphs.js (data-gk) wisselt dat plaatje naar de controller als die het laatst gebruikt is
ok(/Sleep of draai met <kbd class="m-kc" data-gk="arrowleft">/.test(gu), 'de hint noemt de pijltjes als toetsplaatje');
ok(/data-gk="arrowright"/.test(gu), 'en de andere richting ook');
ok(!/Sleep om te draaien/.test(gu), 'de oude hint die alleen slepen beloofde is weg');
// een toets of pad op de draaitafel draait het model; de rest van het menu blijft werken
ok(/tab === 'garage' && \(dir === 'left' \|\| dir === 'right'\).*t\.closest\('\.gar-stage'\)/.test(pm), 'pausemenu.js laat links/rechts op de draaitafel het model draaien');
ok(/turnGarageViewer\(dir === 'left' \? -1 : 1\)/.test(pm), 'en stuurt de richting naar garageui.js');
ok(/import \{[^}]*turnGarageViewer[^}]*\} from '\.\/garageui\.js'/.test(pm), 'pausemenu.js importeert turnGarageViewer');

// --- geen leeg vlak in de lijst ----------------------------------------------
ok(/gar-ph[^`]*aria-hidden="true">\$\{vehicleGlyph\(/.test(gu), 'elke kaart begint met het silhouet van het voertuig');
ok(!/gar-sk/.test(gu), 'de lege skeleton-placeholder is weg');
ok(!/gar-sk/.test(read('pausemenu.css')), 'en de bijbehorende CSS ook, zodat er geen dood vlak achterblijft');
ok(/gar-ph[^`]*aria-hidden="true"/.test(gu), 'het plaatje is decoratief: de naam en de status ernaast dragen de tekst');

// --- waar woont Spullen -------------------------------------------------------
ok(B.SURFACES.menu.files.includes('spullen.js'), 'SURFACES.menu noemt spullen.js: het Spullen-scherm woont in het pauzemenu');
ok(B.SURFACES.menu.files.includes('garageui.js') && B.SURFACES.menu.files.includes('furniture.js'), 'de Garage en de in-wereld TV-overlay staan in dezelfde rij');
ok(/data-panel="spullen"/.test(pm), 'pausemenu.js heeft een eigen paneel voor Spullen');
ok(/its own pause-menu section/.test(sp) && /no 3D preview/.test(sp), 'spullen.js zegt zelf waar het scherm woont en dat de preview in de Garage zit');
ok(/\.m-\*/.test(sp), 'en dat het de gedeelde menu-set gebruikt');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
