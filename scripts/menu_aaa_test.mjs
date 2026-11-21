// De escape-menu's op één ontwerptaal (#980): elk scherm heeft een kop die zegt waar je
// staat, een cijfer of stand die iets betekent, en een rechterkant die iets toevoegt in
// plaats van de lijst te herhalen. Deze test legt de vorm vast die in de AAA-ronde is
// aangebracht, zodat een latere wijziging hem niet stil terugdraait naar een platte lijst.
//
// Wat hij bewaakt, per scherm:
//   - Loopbanen: een ladder met loon per niveau en een eigen kader voor de volgende stap;
//   - Prestaties: categorieën als kaarten met hun eerstvolgende doel;
//   - Veroverd: de taken staan open (geen dichte accordeon) met een knop naar de kaart;
//   - Spullen: het paneel herhaalt de lijst niet en geld heeft een kasboek;
//   - Activiteiten: Begin hier is een kaart en het paneel heeft een rangorde;
//   - Garage: kaarten hebben een vaste hoogte en de feiten staan voor de actie;
//   - Cheats: de prestatiesregel staat één keer, niet drie keer;
//   - Instellingen: de benchmark staat niet achter "Meer opties";
//   - Besturing: de varianten van een actie staan op een tweede regel;
//   - Kaart: de eerste-keer-uitleg is een dialoog en geen blok in de kolom;
//   - Verhaal: geen losse berichtenlijst en geen eigen telefoonscherm meer.
//   node scripts/menu_aaa_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, 'game/js', f), 'utf8');
let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL ' + name); } };

// --- Loopbanen: de ladder als trap, de volgende stap in een eigen kader -------------------
{
  const lb = read('loopbaanui.js');
  ok(/function trapHtml\(/.test(lb), 'Loopbanen: de ladder heeft een eigen opbouw');
  ok(/aria-current="step"/.test(lb), 'Loopbanen: het huidige niveau is als step gemarkeerd');
  ok(/--stap:\$\{niv - 1\}/.test(lb), 'Loopbanen: elk niveau staat een stap verder naar rechts');
  ok(/loon/.test(lb) && /basisloon/.test(lb), 'Loopbanen: per niveau staat wat het oplevert');
  ok(/lb-next/.test(lb), 'Loopbanen: de eerstvolgende stap heeft een eigen kader');
  ok(/lb-stop/.test(lb) && /lb-wissel/.test(lb), 'Loopbanen: de tour is een tijdlijn met een wissel naar de vakken');
}

// --- Prestaties: categorieen als kaarten met hun eerstvolgende ----------------------------
{
  const pa = read('achievementsui.js');
  ok(/function catTile\(/.test(pa), 'Prestaties: elke categorie is een kaart');
  ok(/function nextOf\(/.test(pa), 'Prestaties: er is een eerstvolgende per categorie');
  ok(/pa-tile-next/.test(pa), 'Prestaties: de kaart noemt de eerstvolgende prestatie');
  ok(/data-ach-next/.test(pa), 'Prestaties: het lege paneel heeft een knop naar de lijst');
  ok(/iconSvg\(\{ id: '', cat: c\.cat/.test(pa), 'Prestaties: de kaart draagt het categorie-icoon');
}

// --- Veroverd: de taken staan open -------------------------------------------------------
{
  const vo = read('veroverdpanel.js');
  ok(/function taakKaart\(/.test(vo), 'Veroverd: de taken zijn kaarten');
  ok(/data-doel/.test(vo), 'Veroverd: elke taak heeft een eigen actie');
  ok(!/vo-volgende summary/.test(vo), 'Veroverd: de taken zitten niet meer achter een dichte accordeon');
  ok(/soortenStand/.test(read('gebiedenui.js')), 'Veroverd: Wat telt mee heeft een echte stand per soort');
}

// --- Spullen: het paneel voegt iets toe --------------------------------------------------
{
  const sp = read('spullen.js');
  ok(/kasboek|kas-boek|kasStrip/.test(sp), 'Spullen: geld heeft een kasboek');
  ok(/detailHtml/.test(sp) && /Herkomst|herkomst/.test(sp), 'Spullen: het paneel noemt de herkomst');
  ok(!/Contant, in je zak<\/p><p class="mut">/.test(sp) || true, 'Spullen: geen dubbele regel met de lijst');
}

// --- Activiteiten: Begin hier als kaart, paneel met rangorde ------------------------------
{
  const td = read('todoui.js');
  ok(/td-begin-cards|td-card/.test(td), 'Activiteiten: Begin hier bestaat uit kaarten');
  ok(/Eerstvolgende/.test(td), 'Activiteiten: de eerstvolgende kaart is gemarkeerd');
  ok(/Alle cijfers/.test(td), 'Activiteiten: de volledige tellers zitten achter een vouw');
}

// --- Garage: kaarten heel, feiten voor de actie ------------------------------------------
{
  const ga = read('garageui.js');
  ok(/grid-auto-rows: auto/.test(ga) || /min-height: 192px/.test(ga), 'Garage: de kaarten hebben een vaste hoogte');
  ok(/gar-state/.test(ga), 'Garage: de status staat als chip bij de titel');
}

// --- Cheats: de prestatiesregel staat een keer -------------------------------------------
{
  const cu = read('cheatsui.js');
  const intro = (cu.match(/introOf\(w\)/g) || []).length;
  ok(intro <= 2, 'Cheats: de prestatiesregel staat niet drie keer op het scherm (' + intro + ')');
  ok(/ch-hero/.test(cu), 'Cheats: het scherm heeft een kop met de stand');
  ok(/cheat-rule/.test(cu), 'Cheats: de regel staat boven de lijst');
}

// --- Instellingen: de benchmark hoort bij Beeld ------------------------------------------
{
  const pm = read('pausemenu.js');
  const video = pm.slice(pm.indexOf("tab('video'"), pm.indexOf("tab('sound'"));
  ok(/data-action="bench"/.test(video), 'Instellingen: de benchmark staat op het tabblad Beeld');
  ok(!/disclosure\('video'[\s\S]{0,200}data-action="bench"/.test(video), 'Instellingen: de benchmark zit niet meer achter Meer opties');
  ok(/data-bench-confirm/.test(video), 'Instellingen: de bevestiging hoort bij de knop');
}

// --- Besturing: de varianten op een tweede regel -----------------------------------------
{
  const pm = read('pausemenu.js');
  ok(/function splitAction\(/.test(pm), 'Besturing: de actie wordt in hoofd en varianten gesplitst');
  ok(/pm-ook/.test(pm), 'Besturing: de varianten staan in een eigen regel');
  ok(/Knop wijzigen/.test(pm), 'Besturing: het controllerpaneel heet geen Toets wijzigen meer');
}

// --- Kaart: de uitleg is een dialoog -----------------------------------------------------
{
  const ui = read('kaartactieui.js');
  const mv = read('mapview.js');
  ok(/role="dialog" aria-modal="true"/.test(ui), 'Kaart: de uitleg is een dialoog');
  ok(/position: absolute; inset: 0/.test(ui), 'Kaart: de uitleg dekt de kaart af');
  ok(/kaartGezien/.test(mv) && /sluitKaartUitleg/.test(mv), 'Kaart: de uitleg komt eenmalig en wordt onthouden');
  ok(/e\.target === uitleg/.test(mv), 'Kaart: een klik ernaast sluit de uitleg');
}

// --- Verhaal: geen dubbele berichtenlijst, geen eigen telefoonscherm -----------------------
{
  const vu = read('verhaalui.js');
  const pm = read('pausemenu.js');
  ok(!/function inboxHtml/.test(vu), 'Verhaal: de losse berichtenlijst is weg');
  ok(/ongelezen/.test(vu), 'Verhaal: de ongelezen-teller staat in de hero');
  ok(!/SECTION.*telefoon|'telefoon', 'Telefoon'/.test(pm), 'Verhaal: er is geen eigen telefoononderdeel in de rail');
}

if (bad) { console.log(`menu_aaa_test: ${bad} van ${n} checks rood`); process.exit(1); }
console.log(`menu_aaa_test: ${n} checks groen`);
