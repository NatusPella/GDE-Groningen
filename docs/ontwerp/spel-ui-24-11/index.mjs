// Bouwt .scr/spel-ontwerp/index.html: de review (nu, uit Electron) naast het ontwerp, in drie venstergroottes. Geen spelcode.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let HERE = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(HERE, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(HERE); if (up === HERE) throw new Error('repo-root niet gevonden'); HERE = up; }
HERE = path.join(HERE, '.scr', 'spel-ontwerp');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NU = (n) => `huidig/r1920x1080/1920x1080-${n}.png`;
const NUS = (n) => `huidig/rstart/1920x1080-${n}.png`;
const heeft = (p) => fs.existsSync(path.join(HERE, p));
const MAAT = ['1920x1080', '1280x720', '1280x800'];
const ONT = (n, m = '1920x1080') => `shots/${m}-${n}.png`;

const RIJEN = [
  { id: 'overzicht', titel: 'Spel > Overzicht', nu: ['N-spel-overzicht', 'G-spel-overzicht'], ont: ['a-overzicht', 'a2-overzicht-nieuw', 'a3-overzicht-missie', 'a4-overzicht-gast'], review: 'Zie het document, hoofdstuk 2: zes tegels naast een heldkaart, getallen die elkaar herhalen, geen gele knop bij de volgende stap, "Vastgelopen?" achter een vouw.' },
  { id: 'opslaan', titel: 'Spel > Opslaan en stoppen en de bevestigingen', nu: ['N-spel-opslaan', 'N-spel-herstart-vraag', 'G-spel-opgeslagen'], ont: ['b-opslaan', 'b2-terugzetten', 'b3-nieuw-bevestig', 'b4-opslaan-fout'], review: 'Een lijst rijen waarin opslaan, stoppen en wissen even zwaar zijn; "Opnieuw beginnen" is twee dingen in één; geen woord over wat je verliest.' },
  { id: 'slots', titel: 'Opgeslagen spellen: laden, overschrijven, verwijderen', nu: ['N-slots-leeg', 'G-slots', 'G-slots-menu', 'G-slots-verwijder'], ont: ['c-slots', 'c2-overschrijven', 'c3-verwijderen', 'c4-laden-ongeslagen'], review: 'Hier staat het meeste dat al goed is (beeld, Doorgaan-held). Wat ontbreekt: een vergelijking bij overschrijven, een waarschuwing bij laden met niet-bewaarde voortgang, en de veelgebruikte acties staan achter het "…"-menu.' },
  { id: 'hoofdmenu', titel: 'Hoofdmenu en nieuw spel', nu: ['S-boot', 'S-keuzekaart', 'S-moeilijkheid'], nuS: true, ont: ['d-hoofdmenu', 'd2-hoofdmenu-nieuw', 'd3-nieuw-spel', 'd4-hoofdmenu-laden'], review: 'Er is geen hoofdmenu: na het opstartscherm komt een kaart met twee knoppen (Alleen spelen, Samen spelen) en gaat Alleen spelen zelf door met de laatste save. Het oude titelscherm bestaat alleen nog voor QA.' },
  { id: 'laad', titel: 'Laadscherm', nu: ['huidig/statisch/1920x1080-boot_kind_travel.png'], ont: ['e-laad-save', 'e2-laad-reis', 'e3-laad-lang', 'e4-laad-klaar'], review: 'Het laadscherm is rustig en beweegt; het mist alleen iets bij een lange wacht en bij het eerste spel.' },
  { id: 'uitslag', titel: 'Opgepakt en buiten westen', nu: ['M-opgepakt', 'M-buiten-westen', 'M-respawn-melding'], ont: ['f-opgepakt', 'f2-buiten-westen'], review: 'De stempelkaart bestaat (opgepakt, buiten westen) maar zegt alleen het bedrag; wat er verder gebeurt (zoekniveau, missie, auto) staat in een regel die na de rit komt.' },
  { id: 'recap', titel: 'Waar waren we? en aanwijzingen', nu: ['M-recap', 'N-verhaal', 'G-verhaal'], ont: ['g-recap', 'g2-aanwijzingen'], review: 'De recapkaart is een eigen stijl (eigen CSS in de JS) en heeft geen gele knop; de aanwijzingen zijn drie losse systemen met eigen toon.' },
  { id: 'rail', titel: 'De rail en de toestanden', nu: [], ont: ['h-rail', 'h2-toestanden', 'h3-bediening'], review: 'De rail loopt over op 1080p: Afsluiten, Terug en de versie vallen onder de vouw.' },
];

const img = (src, alt, cls = '') => (heeft(src) ? `<a href="${src}"><img class="${cls}" src="${src}" alt="${esc(alt)}" loading="lazy"></a>` : `<p class="leeg">Niet beschikbaar: ${esc(src)}</p>`);
const body = RIJEN.map((r) => `<section id="${r.id}"><h2>${esc(r.titel)}</h2>
<p class="review"><b>Review nu.</b> ${esc(r.review)}</p>
<div class="paar"><div><h3>Nu (1920x1080, in het spel)</h3>${r.nu.length ? r.nu.map((n) => img(n.startsWith('huidig/') ? n : r.nuS ? NUS(n) : NU(n), 'Nu: ' + n)).join('') : '<p class="leeg">Zie het ontwerp.</p>'}</div>
<div><h3>Ontwerp (1920x1080)</h3>${r.ont.map((n) => `<div class="ont"><div class="naam">${n} <a href="scherm/${n}.html">live</a> · ${MAAT.map((m) => `<a href="${ONT(n, m)}">${m}</a>`).join(' · ')}</div>${img(ONT(n), 'Ontwerp: ' + n)}</div>`).join('')}</div></div>
<details><summary>Het ontwerp op 1280x720 en 1280x800</summary><div class="klein">${r.ont.map((n) => `<div>${img(ONT(n, '1280x720'), n + ' 1280x720')}${img(ONT(n, '1280x800'), n + ' 1280x800')}</div>`).join('')}</div></details></section>`).join('\n');

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Spel: ontwerp 24-11 (fase 1)</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { margin: 0; font: 17px/1.45 Arial, sans-serif; background: #f3ead3; color: #1d1b17; }
header { background: #0e6b3c; color: #fff; padding: 28px 40px; }
header h1 { margin: 0 0 6px; font-size: 34px; }
header p { margin: 4px 0; max-width: 1100px; }
nav { position: sticky; top: 0; z-index: 3; background: #1d1b17; padding: 8px 40px; display: flex; gap: 18px; flex-wrap: wrap; }
nav a { color: #f3ead3; text-decoration: none; font-weight: bold; }
section { padding: 26px 40px; border-bottom: 3px solid #1d1b17; }
h2 { margin: 0 0 8px; font-size: 28px; }
h3 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: #0e6b3c; }
.review { max-width: 1250px; background: #fff; border: 2px solid #1d1b17; padding: 10px 14px; margin: 0 0 14px; }
.paar { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.paar img { width: 100%; height: auto; border: 2px solid #1d1b17; margin-bottom: 12px; display: block; }
.ont .naam { font-size: 14px; margin-bottom: 4px; }
.leeg { font-style: italic; }
details { margin-top: 10px; }
summary { cursor: pointer; font-weight: bold; }
.klein { display: grid; gap: 14px; margin-top: 10px; }
.klein > div { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.klein img { width: 100%; border: 2px solid #1d1b17; }
a { color: #0e6b3c; }
</style></head><body>
<header><h1>Spel: het pauzemenu-onderdeel Spel, hoofdmenu, laadscherm en uitslagen (ontwerp fase 1, 24-11)</h1>
<p>Review van de huidige schermen (Electron, wegwerpprofiel) naast statische mockups op de echte DS3-CSS (<code>game/js/ds-tokens.css</code>, <code>ds-components.css</code>, <code>ds-scroll.css</code>) en de gedeelde set van het club- en bezitontwerp: geen nieuwe kleur of lettertype. Alle namen, spelstanden en cijfers in de mockups zijn verzonnen voorbeelden of komen uit het verhaal. Er is geen spelcode gewijzigd.</p>
<p>Elk ontwerp staat op 1920x1080, 1280x720 en 1280x800. De menustage is 1920 ontwerppixels breed; de hulptekst krijgt op 1280x720 de vloer van 13 echte pixels, dus dat is de strakste maat. Document: <code>docs/ontwerp/SPEL-UI-24-11.md</code>.</p></header>
<nav>${RIJEN.map((r) => `<a href="#${r.id}">${esc(r.titel)}</a>`).join('')}</nav>
${body}
</body></html>`;
fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log('index.html klaar');
