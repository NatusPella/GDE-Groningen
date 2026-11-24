// Bouwt .scr/bezit-ontwerp/index.html: de review (nu) naast het ontwerp, in drie venstergroottes. Geen spelcode.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let HERE = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(HERE, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(HERE); if (up === HERE) throw new Error('repo-root niet gevonden'); HERE = up; }
HERE = path.join(HERE, '.scr', 'bezit-ontwerp');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NU = (n) => `huidig/r1/1920x1080-${n}.png`;
const MAAT = ['1920x1080', '1280x720', '1280x800'];
const ONT = (n, m = '1920x1080') => `shots/${m}-${n}.png`;

const RIJEN = [
  { id: 'overzicht', titel: 'Overzicht, met bezit', nu: ['C-vol-overzicht'], ont: ['overzicht'], review: 'Een tegelrij met nullen (Percelen 5, Panden 0, Opbrengst €0, Loon €165), een regel "5 percelen liggen braak", een leeg nieuwsblok en dan een lange lijst met filters en negen knoppen die allemaal op slot staan. Waar moet ik klikken? Het scherm zegt "Land en bedrijf" drie keer (titel, eyebrow, tab).' },
  { id: 'leeg', titel: 'Overzicht, nog niets in bezit', nu: ['B-leeg-overzicht'], ont: ['leeg'], review: 'Eén smalle kaart links met een gele knop, de helft van het scherm leeg, en een nieuwsblok met "Geen nieuws". De eerste stap is er wel, maar er staat niet wat het kost, wat het oplevert en wat daarna komt.' },
  { id: 'boerderij', titel: 'Boerderij: velden, vee, team', nu: ['B-leeg-boerderij', 'B-leeg-boerderij-percelen', 'C-vol-overzicht-gekozen'], ont: ['velden', 'bulk', 'vee', 'team'], review: 'Zeven pillen (Werk, Percelen, Erf, Gewas, Machines, Kasboek, Bank) onder de tabs, en de stappen Ploegen, Zaaien en Groeien zijn óók pillen. Een grote knop "Uitleg percelen" is het opvallendste op het scherm. De veldnaam staat drie keer op één scherm. Acties als "Koop €4.600 Huur €55 per dag" lijken platte tekst. Het land zelf (de percelen) staat op twee plekken: Overzicht en Boerderij. De bulkknoppen (Zaai alles, Oogst alles, Verzeker...) staan op Overzicht, het werk op Boerderij.' },
  { id: 'bedrijven', titel: 'Bedrijven', nu: ['B-leeg-bedrijven'], ont: ['bedrijven'], review: 'Vier kaarten met dezelfde groene band: jouw bedrijven, een verwijzing naar Snackwagen, "In de buurt" en woningen. Eigen panden en panden die je kunt kopen staan door elkaar. Geen omzet, kosten, klanten of tevredenheid: alleen onderhoud en waarde.' },
  { id: 'tekoop', titel: 'Te koop en kopen', nu: ['C-vol-tekoop', 'C-vol-tekoop-bevestig'], ont: ['tekoop', 'bevestig'], review: 'Een lijst van tien percelen met kadastrale codes (K6899), geen kaart, geen vergelijking en op elke rij een gele knop. Een bevestiging is een zin in de rij die de lijn breekt ("Voor €5.450? Je houdt €12.550 over. Ja Nee"). Wat de koop oplevert staat nergens.' },
  { id: 'snack', titel: 'Snackwagen', nu: ['C-vol-snack', 'B-leeg-snack'], ont: ['snack'], review: 'Vier tegels met "Reputatie 50 van 100", "Snackimperium 5 van 100" en "Standplaatsen 0 tegen 4 van Us Mem", een muur van uitleg in vier alinea’s en daaronder twaalf knoppen met "Af:" en "Op:". Er is geen dagomzet, geen uren-balk en geen menu als raster. De wagen is een lijst met kleine knoppen.' },
  { id: 'club', titel: 'Club', nu: ['B-leeg-club'], ont: ['club'], review: 'Eén lange zin zonder iets om aan te klikken. Met een carrière komt er een shirt-editor onder de tegels; de rest van het clubwerk staat in het voetbalmenu. Het ontwerp van de club-agent is leidend; hier staat het in ons kader.' },
  { id: 'spullen', titel: 'Spullen en Garage', nu: ['D-spullen', 'D-garage'], ont: ['spullen', 'garage'], review: 'Het beste uit de sectie: een raster, een groot voorbeeld en één gele knop. Maar de kop wijkt af van Land en bedrijf: titel met een eyebrow die de cijfers draagt, filters als pillen, geen waardeplaatjes, geen tabs op dezelfde plek.' },
  { id: 'toestanden', titel: 'Toestanden', nu: [], ont: ['toestanden'], review: 'Laden, fout, dicht, leeg, gast bij Samen spelen en Rustig drukwerk. Nu bestaan alleen "Percelen laden" en "Niets te koop in de buurt"; een fout heeft geen scherm.' },
  { id: 'bediening', titel: 'Bediening', nu: [], ont: ['bediening'], review: 'De focusvolgorde met pijltoetsen, Q en E, Enter, Spatie en Esc. De controller doet hetzelfde met D-pad, LB en RB, A, X en B.' },
];

const img = (src, alt, cls = '') => `<a href="${src}"><img class="${cls}" src="${src}" alt="${esc(alt)}" loading="lazy"></a>`;
const body = RIJEN.map((r) => `<section id="${r.id}"><h2>${esc(r.titel)}</h2>
<p class="review"><b>Review nu.</b> ${esc(r.review)}</p>
<div class="paar"><div><h3>Nu (1920x1080, in het spel)</h3>${r.nu.length ? r.nu.map((n) => img(NU(n), 'Nu: ' + n)).join('') : '<p class="leeg">Bestaat nog niet.</p>'}</div>
<div><h3>Ontwerp (1920x1080)</h3>${r.ont.map((n) => `<div class="ont"><div class="naam">${n} <a href="scherm/${n}.html">live</a> · ${MAAT.map((m) => `<a href="${ONT(n, m)}">${m}</a>`).join(' · ')}</div>${img(ONT(n), 'Ontwerp: ' + n)}</div>`).join('')}</div></div>
<details><summary>Het ontwerp op 1280x720 en 1280x800</summary><div class="klein">${r.ont.map((n) => `<div>${img(ONT(n, '1280x720'), n + ' 1280x720')}${img(ONT(n, '1280x800'), n + ' 1280x800')}</div>`).join('')}</div></details></section>`).join('\n');

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Land en bedrijf: ontwerp 24-11 (fase 1)</title><meta name="viewport" content="width=device-width, initial-scale=1">
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
<header><h1>Land en bedrijf: ontwerp (fase 1, 24-11)</h1>
<p>Review van de huidige schermen naast statische mockups op de echte DS3-CSS (<code>game/js/ds-tokens.css</code>, <code>ds-components.css</code>, <code>ds-scroll.css</code>): geen nieuwe kleur of lettertype. Alle namen en cijfers in de mockups zijn verzonnen voorbeelden. Er is geen spelcode gewijzigd.</p>
<p>Elk ontwerp staat op 1920x1080, 1280x720 en 1280x800. De menustage is 1920 ontwerppixels breed; de hulptekst krijgt op 1280x720 de vloer van 13 echte pixels (19,5 stage-px), dus dat is de strakste maat. Document: <code>docs/ontwerp/BEZIT-UI-24-11.md</code>.</p></header>
<nav>${RIJEN.map((r) => `<a href="#${r.id}">${esc(r.titel)}</a>`).join('')}</nav>
${body}
</body></html>`;
fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log('index.html klaar');
