// Bouwt .scr/spel-ontwerp/voornana.html: de schermen van het huidige spel (voor, uit de review) naast de gebouwde schermen (na, uit Electron) op
// 1920x1080, 1280x720 en 1280x800. Geen spelcode. Beelden die er niet zijn, worden als "niet beschikbaar" getoond.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let HERE = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(HERE, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(HERE); if (up === HERE) throw new Error('repo-root niet gevonden'); HERE = up; }
HERE = path.join(HERE, '.scr', 'spel-ontwerp');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const heeft = (p) => fs.existsSync(path.join(HERE, p));
const MATEN = ['1920x1080', '1280x720', '1280x800'];
const voor = (m, n) => `huidig/r${m}/${m}-${n}.png`;
const na = (m, n) => (m === "1920x1080" && heeft(`na/e${m}/${m}-${n}.png`) ? `na/e${m}/${m}-${n}.png` : `na/d${m}/${m}-${n}.png`);
const start = (map, m, n) => `start2/${map}/${m}-${n}.png`;

const RIJEN = [
  { id: 'overzicht', titel: 'Spel > Overzicht', beeld: (m) => [voor(m, 'G-spel-overzicht'), na(m, 'G-spel-overzicht')] },
  { id: 'opslaan', titel: 'Spel > Opslaan en stoppen', beeld: (m) => [voor(m, 'G-spel-opslaan'), na(m, 'G-spel-opslaan')] },
  { id: 'terugzetten', titel: 'Laatste opslag terugzetten (vasthouden)', beeld: (m) => [voor(m, 'N-spel-herstart-vraag'), na(m, 'G-terugzetten')] },
  { id: 'nieuw', titel: 'Nieuw spel (bevestiging)', beeld: (m) => [voor(m, 'N-spel-herstart-vraag'), na(m, 'G-nieuw-bevestig')] },
  { id: 'slots', titel: 'Opgeslagen spellen', beeld: (m) => [voor(m, 'G-slots'), na(m, 'G-slots')] },
  { id: 'overschrijven', titel: 'Overschrijven: oud tegenover nieuw', beeld: (m) => [voor(m, 'G-slots-menu'), na(m, 'G-overschrijven')] },
  { id: 'verwijderen', titel: 'Verwijderen', beeld: (m) => [voor(m, 'G-slots-menu'), na(m, 'G-verwijderen')] },
  { id: 'laden', titel: 'Laden met niet-bewaarde voortgang', beeld: (m) => [voor(m, 'G-slots'), na(m, 'G-laden-ongeslagen')] },
  { id: 'hoofdmenu', titel: 'Hoofdmenu (met een save)', beeld: (m) => [m === '1920x1080' ? 'huidig/rstart/1920x1080-S-keuzekaart.png' : '', `start3/hm${m}/${m}-hm-hoofdmenu.png`] },
  { id: 'hoofdmenu-nieuw', titel: 'Hoofdmenu zonder save en de niveaukaart bij Nieuw spel', beeld: (m) => [m === '1920x1080' ? 'huidig/rstart/1920x1080-S-moeilijkheid.png' : '', m === '1920x1080' ? start('c1', m, 'c1-hoofdmenu') : ''] },
  { id: 'niveau', titel: 'Hoe pittig moet het zijn? (in de flow van Nieuw spel)', beeld: (m) => ['', m === '1920x1080' ? start('c1', m, 'c1-niveau') : ''] },
  { id: 'slots-start', titel: 'Opgeslagen spellen vanuit het hoofdmenu', beeld: (m) => ['', m === '1920x1080' ? start('c3', m, 'c3-slots') : ''] },
  { id: 'instellingen', titel: 'Instellingen vanuit het hoofdmenu (prestart)', beeld: (m) => ['', `start3/hm${m}/${m}-hm-instellingen.png`] },
  { id: 'opgepakt', titel: 'Opgepakt (bon)', beeld: (m) => [voor(m, 'M-opgepakt'), na(m, 'M-opgepakt')] },
  { id: 'buiten-westen', titel: 'Buiten westen (bon)', beeld: (m) => [voor(m, 'M-buiten-westen'), na(m, 'M-buiten-westen')] },
  { id: 'recap', titel: 'Waar waren we? (recap)', beeld: (m) => [voor(m, 'M-recap'), m === '1920x1080' ? start('c2', m, 'c2-recap') : na(m, 'M-recap')] },
];

const img = (src, alt) => (src && heeft(src) ? `<a href="${src}"><img src="${src}" alt="${esc(alt)}" loading="lazy"></a>` : `<p class="leeg">${src ? 'Niet beschikbaar: ' + esc(src) : 'Geen voor-beeld (nieuw scherm).'}</p>`);
const body = RIJEN.map((r) => `<section id="${r.id}"><h2>${esc(r.titel)}</h2>` + MATEN.map((m) => { const [v, n] = r.beeld(m); return `<h3>${m}</h3><div class="paar"><div><h4>Voor</h4>${img(v, 'voor ' + r.id + ' ' + m)}</div><div><h4>Na</h4>${img(n, 'na ' + r.id + ' ' + m)}</div></div>`; }).join('') + '</section>').join('\n');

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Spel: voor en na (bouw 24-11)</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { margin: 0; font: 17px/1.45 Arial, sans-serif; background: #f3ead3; color: #1d1b17; }
header { background: #0e6b3c; color: #fff; padding: 24px 40px; } header h1 { margin: 0 0 6px; font-size: 30px; } header p { margin: 4px 0; max-width: 1100px; }
nav { position: sticky; top: 0; z-index: 3; background: #1d1b17; padding: 8px 40px; display: flex; gap: 16px; flex-wrap: wrap; } nav a { color: #f3ead3; text-decoration: none; font-weight: bold; }
section { padding: 22px 40px; border-bottom: 3px solid #1d1b17; } h2 { margin: 0 0 8px; font-size: 26px; } h3 { margin: 14px 0 6px; font-size: 14px; text-transform: uppercase; letter-spacing: .06em; color: #0e6b3c; } h4 { margin: 0 0 4px; font-size: 13px; }
.paar { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; } .paar img { width: 100%; height: auto; border: 2px solid #1d1b17; display: block; } .leeg { font-style: italic; }
</style></head><body>
<header><h1>Spel: voor en na (fase 2, 24-11)</h1><p>Links het huidige spel (de review van fase 1), rechts het gebouwde scherm, beide uit Electron op een wegwerpprofiel. Elk scherm op 1920x1080, 1280x720 en 1280x800.</p></header>
<nav>${RIJEN.map((r) => `<a href="#${r.id}">${esc(r.titel)}</a>`).join('')}</nav>
${body}
</body></html>`;
fs.writeFileSync(path.join(HERE, 'voornana.html'), html);
console.log('voornana.html klaar');
