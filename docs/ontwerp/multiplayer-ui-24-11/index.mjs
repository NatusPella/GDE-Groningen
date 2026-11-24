// Bouwt .scr/multiplayer-ontwerp/index.html: de review (nu) naast het ontwerp, in drie venstergroottes, met opener en gast naast elkaar waar ze verschillen. Geen spelcode.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let HERE = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(HERE, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(HERE); if (up === HERE) throw new Error('repo-root niet gevonden'); HERE = up; }
HERE = path.join(HERE, '.scr', 'multiplayer-ontwerp');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAAT = ['1920x1080', '1280x720', '1280x800'];
const ONT = (n, m = '1920x1080') => `shots/${m}-${n}.png`;
const EL = (n) => `huidig/r1/1920x1080-${n}.png`; // echt spel in Electron
const HL = (n) => `huidig/1920x1080-${n}.png`; // echte lobbycode en CSS in headless Chrome (menuvak nagebouwd)

const RIJEN = [
  { id: 'start', titel: 'Samen spelen starten', nu: [EL('A1-samen-stap0'), EL('A2-samen-wie-gast')], ont: ['a1-start'],
    review: 'Twee grote kaarten (Meedoen, Open je spel) laten de helft van het scherm leeg, en de kamercode typ je pas twee schermen later. “Samen spelen” staat drie keer in beeld (tab, kop, tweede tabrij) en onder de kaarten staan “Verbinding testen” en “Meer info” zonder dat te zien is wat ze doen. Wat er naar buiten gaat staat nergens.' },
  { id: 'toestemming', titel: 'Eerste keer en toestemming (#95)', nu: [EL('B1-eerste-start'), HL('gast-toestemming-toestemming'), EL('A7-instellingen-samen')], ont: ['b-eerste-keer', 'j-toestemming'],
    review: 'De eerste-keerkaart vraagt akkoord met één zin tussen haakjes; de uitleg zit achter “Meer info”. De melding bij het verbinden is één regel van 12 pixels en “Niet meer vragen” (met een schakelaar die over zijn eigen rand springt). Instellingen noemt “STUN-server” en “brokers”: woorden die een speler niet kent. Nergens staat dat er niets naar een server van ons gaat.' },
  { id: 'openen', titel: 'Je spel openen: privé of openbaar (#438), sessienamen', nu: [EL('A4-samen-host-kiezen'), EL('A5-samen-host-openbaar')], ont: ['c1-openen-prive', 'c2-openen-openbaar', 'c3-sessienaam'],
    review: 'Drie stappen (Wie ben jij, Kiezen, Verbinden) voor je de code ziet; stap 1 herhaalt wat Instellingen al weet. De stappenindicator is een rij pillen die op knoppen lijkt. Privé en Openbaar zijn twee kaarten in plaats van één keuze; wat er in de lijst komt staat in één regel naast een vinkje, de rest achter “Meer info”. Er is geen voorbeeld van hoe jouw sessie in de lijst staat, en een geweigerde naam krijgt de reden pas na “Open je spel”.' },
  { id: 'meedoen', titel: 'Meedoen via code of lijst, verbinden', nu: [EL('A3-samen-gast-kiezen'), HL('gast-lijst'), HL('verbinden'), HL('fout-vol')], ont: ['d1-lijst', 'd2-verbinden'],
    review: 'De lijst heeft tien pillen (filters en sortering), een zoekveld waarvan de toetsenbordknop het woord “Zoeken” afsnijdt en rijen als één zin (“Zomeravond · 3 van 8 spelers · versie 0.64.0 · net”). “Melden” staat naast elke rij en betekent “verberg voor mij”, maar leest als aanmelden. De versie wordt niet met de jouwe vergeleken. Een fout (vol, geweigerd) is één regel in een leeg scherm.' },
  { id: 'figuur', titel: 'Je figuur: naam, kleur, personage en kleding', nu: [HL('wie-gast'), HL('wie-host')], ont: ['e-figuur'],
    review: 'Naam en kleur staan in stap 1 met een voorbeeld van alleen een gekleurde vorm. Er is geen voorbeeld van je figuur in je kleding en niet te zien hoe de naamplaat boven je hoofd eruitziet.' },
  { id: 'wachtkamer', titel: 'De wachtkamer', nu: [HL('host-wacht'), HL('wachtkamer'), HL('wachtkamer-openbaar')], paar: [['Wie het spel opende', 'f1-wachtkamer-opener'], ['Gast', 'f2-wachtkamer-gast']],
    review: 'De code, een pil “Privé” en de spelers als pillen. Niet te zien wie klaar is of waarom starten niet kan, en de helft van het scherm is leeg. “Iedereen stoppen” staat links op de plek van de hoofdactie, even zwaar als “Spel starten”.' },
  { id: 'spelers', titel: 'Spelers: wie is waar en werkt het', nu: [EL('C3-spelers-host'), EL('C4-spelers-host-onder'), HL('spelers-gast')], paar: [['Wie het spel opende', 'g1-spelers-opener'], ['Gast', 'g2-spelers-gast']], extra: ['g3-spelers-verbinding'],
    review: 'Elke speler is een kaart van ruim 120 pixel met drie knoppen; bij vijf spelers past het niet meer. De verbinding staat als “Verbonden · 40 ms” en “Haperd · 420 ms”: getallen zonder uitleg of wat je kunt doen. “Passief” is een pil bij iedereen, “Eruit zetten” staat rood bij elke ander, dempen en blokkeren zijn twee pictogrammen zonder tekst. Een tweede tabrij (Sessie, Spelers) staat onder de eerste.' },
  { id: 'uitnodigen', titel: 'Uitnodigen', nu: [], paar: [['Wie het spel opende (privé)', 'h1-uitnodigen-opener'], ['Gast (openbare sessie)', 'h2-uitnodigen-gast-openbaar']],
    review: 'Bestaat niet als scherm. De code staat alleen in de wachtkamer; wie er later een vriend bij wil, vindt hem nergens terug.' },
  { id: 'sessie', titel: 'Sessie: instellingen en wat jullie samen deden', nu: [], paar: [['Wie het spel opende', 'i1-sessie-opener'], ['Gast', 'i2-sessie-gast']],
    review: 'Bestaat niet. Naam, zichtbaarheid en maximum stel je alleen in vóór het openen. Er is geen overzicht van wat jullie samen deden en geen plek die zegt hoe jullie samen kiezen.' },
  { id: 'hud', titel: 'In het spel: Tab, naamplaten, minikaart en kaart', nu: [EL('D1-tablijst')], ont: ['k1-hud-tab', 'k2-kaart'],
    review: 'De Tab-lijst toont reactietijd in milliseconden en “actief” als losse tekst. De naamplaat boven een figuur is een donker kaartje met alleen de naam (avatarlabel3d.js): geen vorm, geen verbinding, geen passief-teken. In de proefopname zijn de naamplaten en de minikaartmarkeringen niet te zien (een nepsessie heeft geen figuren); dat is op code beoordeeld, nog niet in beeld.' },
  { id: 'meedoenvraag', titel: 'Meedoen? bij een activiteit', nu: [EL('D2-meedoen')], paar: [['Gast (krijgt de vraag)', 'l1-meedoen-gast'], ['Wie het spel opende (startte hem)', 'l2-meedoen-opener']],
    review: 'De kaart breekt: “Nee” valt onder “Ja” omdat de titel alle breedte neemt. Geen aftelling, niet te zien wie al antwoordde en niet wat het oplevert.' },
  { id: 'stemmen', titel: 'Gezamenlijke keuzes: voorstel en stemming', nu: [], ont: ['m-stemming'],
    review: 'Een gast kan geen tijdvoorstel doen: “Vraag het aan wie het spel opende” (coopgroep.js, STEM_HOST.gast). Een ander spel laden is bij wie het spel opende een besluit dat de sessie voor iedereen stopt zonder stem (cooploadrules.js). Dat zijn hostrechten.' },
  { id: 'hostwissel', titel: 'Hostwissel en de melding daarvan', nu: [EL('E1-overdracht-vraag'), EL('E2-overdracht-wacht')], ont: ['n-hostwissel'],
    review: 'De vraag en het wachtscherm werken in goede woorden, maar zeggen niet wat er blijft. Wie niet gevraagd wordt, ziet na afloop vijf seconden een regel; een onverwachte overname heeft geen eigen melding.' },
  { id: 'weg', titel: 'Verbindingsverlies en hervatten', nu: [EL('E3-wegvallen-host'), HL('verbroken')], ont: ['o1-weg-jij', 'o2-weg-ander', 'p-hervat'],
    review: 'Eén kaart zonder titelband, drie knoppen zonder rangorde en “Verbinding testen” op een moment dat je dat niet wilt. “Dan verwijder je Liv” is een kick onder de naam “Niet wachten”. Niet te zien hoe lang het al duurt en wat er met je eigen voortgang gebeurt. Een hervatvenster bestaat niet.' },
  { id: 'beloning', titel: 'Beloning en voortgang na een gezamenlijke activiteit', nu: [], ont: ['q-beloning'],
    review: 'Bestaat niet. Een gezamenlijke opdracht eindigt met losse meldingen; nergens staat samengevat wat je verdiende, wat de groepsbonus deed en dat het in je eigen spel is bewaard.' },
  { id: 'bevestig', titel: 'Bevestigingen: uit het spel zetten, privé maken, intrekken, verlaten', nu: [], ont: ['v-bevestig'],
    review: 'Uit het spel zetten vraagt “Zeker weten?” op dezelfde knop en zegt niet wat er blijft. Akkoord intrekken en weer privé maken (een nieuwe code, de oude werkt niet meer) hebben geen bevestiging die uitlegt wat er gebeurt. Het Spel-ontwerp heeft hier één taal voor: wat je verliest, wat blijft, de veilige keuze geel met de focus en het onomkeerbare rood met vasthouden.' },
  { id: 'praten', titel: 'Praten: de gereserveerde plek (#451)', nu: [], ont: ['r-praten'],
    review: 'Bestaat niet. Alleen dempen en blokkeren (pictogrammen) en vaste zinnen (opt-in) zijn er; er is geen plek waar chat of voice later zonder herontwerp bij kan.' },
  { id: 'instellingen', titel: 'Instellingen, Samen spelen', nu: [EL('A7-instellingen-samen')], ont: ['s-instellingen'],
    review: 'Naam, “Naam bewaren” en “Akkoord intrekken” staan als grote knoppen onder elkaar, de uitleg noemt STUN en brokers, en er is geen voorbeeld van hoe anderen je zien.' },
  { id: 'toestanden', titel: 'Toestanden en bediening', nu: [], ont: ['t-toestanden', 'u-bediening'],
    review: 'Laden, leeg, fout, offline, andere versie, uit het spel gezet: nu verschillende lopende zinnen in een leeg scherm. Het ontwerp geeft elk een kaart met een volgende stap.' },
];

const img = (src, alt, cls = '') => `<a href="${src}"><img class="${cls}" src="${src}" alt="${esc(alt)}" loading="lazy"></a>`;
const body = RIJEN.map((r) => {
  const nu = r.nu.length ? r.nu.map((n) => img(n, 'Nu: ' + n)).join('') : '<p class="leeg">Bestaat nog niet.</p>';
  const ontNamen = r.ont || [];
  const ontHtml = ontNamen.map((n) => `<div class="ont"><div class="naam">${n} · <a href="scherm/${n}.html">live</a> · ${MAAT.map((m) => `<a href="${ONT(n, m)}">${m}</a>`).join(' · ')}</div>${img(ONT(n), 'Ontwerp: ' + n)}</div>`).join('');
  const paarHtml = r.paar ? `<h3>Ontwerp, naast elkaar (1920x1080)</h3><div class="naast">${r.paar.map(([l, n]) => `<div class="ont"><div class="naam"><b>${esc(l)}</b> · ${n} · <a href="scherm/${n}.html">live</a> · ${MAAT.map((m) => `<a href="${ONT(n, m)}">${m}</a>`).join(' · ')}</div>${img(ONT(n), 'Ontwerp: ' + n)}</div>`).join('')}</div>${(r.extra || []).map((n) => `<div class="ont"><div class="naam">${n} · <a href="scherm/${n}.html">live</a> · ${MAAT.map((m) => `<a href="${ONT(n, m)}">${m}</a>`).join(' · ')}</div>${img(ONT(n), 'Ontwerp: ' + n)}</div>`).join('')}` : '';
  const alle = [...ontNamen, ...(r.paar || []).map((p) => p[1]), ...(r.extra || [])];
  return `<section id="${r.id}"><h2>${esc(r.titel)}</h2>
<p class="review"><b>Review nu.</b> ${esc(r.review)}</p>
<div class="${r.paar ? 'bovenaan' : 'paar'}"><div><h3>Nu (1920x1080, in het spel of met de echte code)</h3><div class="${r.paar ? 'rij' : ''}">${nu}</div></div>${r.paar ? '' : `<div><h3>Ontwerp (1920x1080)</h3>${ontHtml}</div>`}</div>
${paarHtml}
<details><summary>Het ontwerp op 1280x720 en 1280x800</summary><div class="klein">${alle.map((n) => `<div>${img(ONT(n, '1280x720'), n + ' 1280x720')}${img(ONT(n, '1280x800'), n + ' 1280x800')}</div>`).join('')}</div></details></section>`;
}).join('\n');

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Samen spelen: ontwerp 24-11 (fase 1)</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { margin: 0; font: 17px/1.45 Arial, sans-serif; background: #f3ead3; color: #1d1b17; }
header { background: #0e6b3c; color: #fff; padding: 28px 40px; }
header h1 { margin: 0 0 6px; font-size: 34px; }
header p { margin: 4px 0; max-width: 1200px; }
nav { position: sticky; top: 0; z-index: 3; background: #1d1b17; padding: 8px 40px; display: flex; gap: 14px 18px; flex-wrap: wrap; }
nav a { color: #f3ead3; text-decoration: none; font-weight: bold; font-size: 14px; }
section { padding: 26px 40px; border-bottom: 3px solid #1d1b17; }
h2 { margin: 0 0 8px; font-size: 28px; }
h3 { margin: 12px 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: #0e6b3c; }
.review { max-width: 1300px; background: #fff; border: 2px solid #1d1b17; padding: 10px 14px; margin: 0 0 14px; }
.paar { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.paar img, .rij img, .naast img, .ont img { width: 100%; height: auto; border: 2px solid #1d1b17; margin-bottom: 12px; display: block; }
.rij { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 14px; }
.naast { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.ont .naam { font-size: 14px; margin-bottom: 4px; }
.leeg { font-style: italic; }
details { margin-top: 10px; }
summary { cursor: pointer; font-weight: bold; }
.klein { display: grid; gap: 14px; margin-top: 10px; }
.klein > div { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.klein img { width: 100%; border: 2px solid #1d1b17; }
a { color: #0e6b3c; }
@media (max-width: 1100px) { .paar, .naast { grid-template-columns: 1fr; } }
</style></head><body>
<header><h1>Samen spelen: ontwerp (fase 1, 24-11)</h1>
<p>Review van de huidige schermen naast statische mockups op de echte DS3-CSS (<code>game/js/ds-tokens.css</code>, <code>ds-components.css</code> met de gedeelde set van het club- en bezitontwerp, <code>ds-scroll.css</code>): geen nieuwe kleur of lettertype. Alle namen, codes en cijfers in de mockups zijn verzonnen voorbeelden. Er is geen spelcode gewijzigd.</p>
<p>De beelden onder “Nu” komen uit Electron (een wegwerpprofiel; de spelerslijst en het wachtscherm met een nepsessie, zonder netwerk) of uit de echte lobbycode en CSS in een nagebouwd menuvak (headless Chrome). Elk ontwerp staat op 1920x1080, 1280x720 en 1280x800; op 1280x720 krijgt de hulptekst de vloer van 13 echte pixels, dus dat is de strakste maat. Document: <code>docs/ontwerp/MULTIPLAYER-UI-24-11.md</code>.</p></header>
<nav>${RIJEN.map((r) => `<a href="#${r.id}">${esc(r.titel)}</a>`).join('')}</nav>
${body}
</body></html>`;
fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log('index.html klaar');
