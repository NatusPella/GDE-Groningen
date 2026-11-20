// De menu-, instellingen- en UI-ronde van 0.62.0: #889 (selecteerbare HUD-tekst), #890 (de
// camerastand blijft na in- en uitstappen), #891 (moeilijkheid vindbaar), #893 (de reeks
// voorinstellingen), #894 (Besturing gegroepeerd), #895 (cheats met uitleg), #896 (een rustig
// Overzicht), #897 (Spelen is een instelling), #909 (Prestaties), #910 (de lege staat van
// Foto's), #911 (de rail in groepen) en #915 (bevestiging bij afsluiten).
// Bronchecks op de JS/CSS die de schermen opbouwt, plus de pure regels van de camerastand.
//   node scripts/menu_issues_062_test.mjs
import fs from 'node:fs';
import { noteVehicleChange, initFirstPerson, syncFirstPerson, firstPersonOn, setFirstPerson } from '../game/js/firstperson.js';
import { getSettings, setSetting } from '../game/js/settings.js';
import { PRESET_ORDER, PRESET_HINTS, presetLabel } from '../game/js/gfxprofile.js';
import { contrastRatio, toRgb } from '../game/js/a11ylogic.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const leesHtml = () => fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
let n = 0, bad = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', naam, extra); } };
const okRegex = (src, re, naam) => ok(re.test(src), naam);

const pm = lees('pausemenu.js');
const css = lees('pausemenu.css');
const menuCss = lees('menu.css');
const html = leesHtml();

// --- #889: HUD- en menutekst is geen leesvoer ----------------------------------------------
{
  ok(/body, #hud, \.gm \{[^}]*user-select: none/.test(html), '#889: de pagina, de HUD en de menu’s zetten user-select uit');
  ok(/:is\(input, textarea, select, \[contenteditable="true"\]\) \{[^}]*user-select: text/.test(html), '#889: een echt invoerveld houdt zijn selectie');
  ok(/\.gm \{[^}]*user-select: none/.test(menuCss), '#889: menu.css doet hetzelfde voor elk menublad');
  ok(/\.gm :is\(input, textarea, select, \[contenteditable="true"\]\) \{[^}]*user-select: text/.test(menuCss), '#889: ook daar blijft het invoerveld selecteerbaar');
  ok(/\.pm-samen \.coop-code[^}]*user-select: all/.test(css), '#889: de code die je moet overschrijven blijft selecteerbaar');
  // het kopiëren van het foutrapport gaat via een tekstvak: dat moet selecteerbaar blijven
  ok(/document\.execCommand\('copy'\)/.test(pm), '#889: kopiëren via een tijdelijk tekstvak bestaat nog');
}

// --- #890: de camerastand is één voorkeur van de speler -----------------------------------
{
  const fp = lees('firstperson.js');
  const fpc = lees('firstpersoncam.js');
  const cin = lees('cinematics.js');
  ok(/export function noteVehicleChange/.test(fp), '#890: firstperson.js heeft één plek waar een voertuigwissel de stand hervat');
  ok(/noteVehicleChange\(world\)/.test(fpc) && /vehicleChanged/.test(fpc), '#890: de camera-glue roept hem aan bij in- en uitstappen');
  ok(/camMode === 5/.test(cin) && /setFirstPerson\(w, true\)/.test(cin), '#890: BINNENIN gaat bij het uitstappen over in de eerste-persoonstand');
  ok(/Eerste persoon aan/.test(cin), '#890: de speler hoort dat de stand is overgenomen');

  // gedrag: de stand blijft na een voertuigwissel, ook als er tussendoor iets anders keek
  const world = {};
  initFirstPerson(world);
  setSetting('firstPersoon', true);
  ok(noteVehicleChange(world) === true && firstPersonOn(world), '#890: uitstappen met de stand aan laat de camera in eerste persoon');
  world.firstPersoon.on = false; // bijvoorbeeld een filmcamera die de stand overnam
  ok(noteVehicleChange(world) === true && firstPersonOn(world), '#890: een voertuigwissel zet de voorkeur van de speler terug');
  setSetting('firstPersoon', false);
  world.firstPersoon.on = true;
  ok(noteVehicleChange(world) === false && !firstPersonOn(world), '#890: staat de voorkeur uit, dan blijft de camera achter het figuur');
  world.firstPersoon.pitch = 0.6;
  noteVehicleChange(world);
  ok(world.firstPersoon.pitch === 0, '#890: na een wissel kijkt de camera recht vooruit');
  ok(noteVehicleChange(null) === false, '#890: zonder wereld gebeurt er niets');
  // de instelling blijft de waarheid: syncFirstPerson werkt een schakelaar in het menu door
  setSetting('firstPersoon', true);
  ok(syncFirstPerson(world) === true && firstPersonOn(world), '#890: de schakelaar in het menu werkt nog');
  ok(getSettings().firstPersoon === true, '#890: de voorkeur staat in de instellingen, niet op het voertuig');
  setSetting('firstPersoon', false);
}

// --- #891: de moeilijkheid staat bovenaan Instellingen > Spel -------------------------------
{
  const spelTab = pm.slice(pm.indexOf("tab('spel'"), pm.indexOf("tab('besturing'"));
  ok(spelTab.indexOf("picker('difficulty'") >= 0, '#891: de moeilijkheid staat op het tabblad Spel van Instellingen');
  ok(spelTab.indexOf("picker('difficulty'") < spelTab.indexOf("picker('ruzie'"), '#891: bovenaan, niet tussen de rest verstopt');
  ok(/function difficultyRows\(\)/.test(pm) && /DIFFICULTY_MODES\.map\(rij\)/.test(pm), '#891: de drie standen worden uit difficulty.js opgehaald');
  okRegex(pm, /meer tijd|minder tijd/, '#891: de uitleg noemt de tijd');
  okRegex(pm, /ruimere medailles|strengere medailles/, '#891: de uitleg noemt de medailles');
  okRegex(pm, /meer schade|minder schade/, '#891: de uitleg noemt de schade');
  ok(/data-diff-now/.test(pm) && /data-on/.test(css), '#891: de gekozen stand licht op tussen de uitleg');
  ok(!/picker\('difficulty'/.test(pm.slice(pm.indexOf("tab('a11y'"), pm.indexOf('function spelHtml'))), '#891: de moeilijkheid staat niet meer onder Toegankelijkheid > Hulp');
}

// --- #893: één heldere reeks voorinstellingen ----------------------------------------------
{
  ok(PRESET_ORDER.join() === 'laag,middel,vlot,hoog', '#893: de vier standen houden hun sleutels (bestaande instellingen blijven werken)');
  const namen = PRESET_ORDER.map(presetLabel);
  ok(namen.join() === 'Laag,Midden,Hoog,Ultra', '#893: de namen lopen op van licht naar zwaar', namen.join());
  ok(namen.length === new Set(namen).size, '#893: geen twee standen met dezelfde naam');
  ok(PRESET_ORDER.every((p) => PRESET_HINTS[p] && PRESET_HINTS[p].length > 10), '#893: elke stand heeft een regel uitleg');
  ok(!/Vlot|Gemiddeld/.test(namen.join()), '#893: de verwarrende namen Gemiddeld en Vlot zijn weg');
  ok(/pm-seg/.test(pm) && /data-preset-btn/.test(pm), '#893: de standen staan als segmented control in het menu');
  ok(/data-preset-hint/.test(pm) && /PRESET_HINTS\[cur\]/.test(pm), '#893: onder de control staat wat de gekozen stand doet');
  ok(/#pause-menu \.pm-seg \{[^}]*border-radius: 999px/.test(css), '#893: de segmented control is één track met afgeronde stukken');
  ok(/#pause-menu \.pm-segbtn\[aria-pressed="true"\]/.test(css), '#893: het gekozen stuk is zichtbaar anders');
}

// --- #894: Instellingen > Besturing is gegroepeerd ----------------------------------------
{
  const besturing = pm.slice(pm.indexOf("tab('besturing'"), pm.indexOf("tab('camera'"));
  const koppen = [...besturing.matchAll(/m-gh"><span>([^<]+)<\/span>/g)].map((m) => m[1]);
  ok(koppen.join('|') === 'Muis|Toetsenbord|Controller|Aanraken|In het spel', '#894: vijf koppen in een vaste, leesbare volgorde', koppen.join('|'));
  ok(/\$\{keyChangedRow\(\)\}/.test(besturing) && /function keyChangedRow/.test(pm), '#894: één rij zegt hoeveel er aangepast is, met één knop terug');
  ok(/binds-reset-all/.test(pm) && /setSetting\('keyBinds', \{\}\)/.test(pm) && /setSetting\('padBinds', \{\}\)/.test(pm), '#894: die knop zet toetsen én knoppen terug');
  ok(/function fixedKeysHtml/.test(pm) && /{ESC}, {ENTER}, {ARROWS}/.test(besturing), '#894: de vaste toetsen staan er met hun uitleg');
  ok(/function keyReuseHtml/.test(pm) && /Dezelfde toets, meer taken/.test(pm), '#894: toetsen met meer taken staan op één rij');
  ok(/keyReuseHtml\(\)/.test(besturing), '#894: dat blok staat naast de besturing');
  ok(/zit een toets al op iets anders, dan ruilen ze/.test(besturing), '#894: de ruilregel staat bij de knop zelf');
  ok(!/Muis en toetsenbord/.test(besturing), '#894: de oude, samengepropte kop is weg');
}

// --- #895: een cheat zegt meteen wat hij doet ---------------------------------------------
{
  const cu = lees('cheatsui.js');
  ok(/const descOf = /.test(cu) && /descOf\(c\)/.test(cu), '#895: elke rij draait de uitleg direct mee');
  ok(/descOf\(c\)/.test(cu.slice(cu.indexOf('function toggleRow'), cu.indexOf('function paneHtml'))), '#895: ook de aan/uit-cheats');
  ok(/function introOf/.test(cu) && /cheat-rule/.test(cu), '#895: de prestatiesregel staat boven de lijst, niet alleen in het paneel');
  ok(/Prestaties uit|prestaties uit/.test(cu), '#895: bij een hinderlijke cheat staat het er in woorden bij');
  ok(/pending/.test(cu) && /Bevestig/.test(cu), '#895: een cheat die prestaties uitzet vraagt nog steeds om een tweede klik');
}

// --- #896: het Overzicht is rustig --------------------------------------------------------
{
  const ov = pm.slice(pm.indexOf('function renderOverviewPanel'), pm.indexOf('function renderTodoPanel'));
  ok(!/quick/.test(ov), '#896: het blok Snel instellen met de volumes staat niet meer op het Overzicht');
  ok(!/slider\('masterVolume'/.test(ov) && !/slider\('sfxVolume'/.test(ov), '#896: geen volumeschuiven op het Overzicht');
  ok(!/pm-mutehint/.test(ov), '#896: de losse luidsprekerhint is weg');
  ok(/slider\('masterVolume', 'Hoofdvolume'\)/.test(pm.slice(pm.indexOf("tab('sound'")), 'geluid staat onder Instellingen > Geluid'));
  ok(/pm-mute/.test(pm.slice(pm.indexOf("tab('sound'"), pm.indexOf("tab('spel'"))), '#896: de U-hint staat nu bij Geluid');
  ok(/reduceMotion/.test(pm.slice(pm.indexOf("tab('a11y'"))), '#896: beweging beperken staat onder Toegankelijkheid');
}

// --- #897: Spelen hoort bij Instellingen --------------------------------------------------
{
  ok(!/spel: \[[^\]]*'spelen'/.test(pm), '#897: Spel heeft geen tabblad Spelen meer');
  ok(/\['spel', 'Spelregels'\]/.test(pm), '#897/#985: Instellingen heeft een tabblad Spelregels (niet twee dingen die Spel heten)');
  ok(/\$\{tab\('spel', `/.test(pm) && /data-of="settings" data-sub="\$\{id\}"/.test(pm), '#897: dat tabblad heeft zijn eigen inhoud in Instellingen');
}

// --- #909: Prestaties zegt iets en laat iets zien -----------------------------------------
{
  const au = lees('achievementsui.js');
  ok(/function heroHtml\(sum, near, verborgen\)/.test(au), '#909: Prestaties heeft een kop met de stand van nu');
  ok(/ds-z-kaart pa-hero/.test(au) && /ds-z-waarde/.test(au), '#909/#980: die kop is een papieren kaart met cijfers, dezelfde taal als de andere vernieuwde schermen');
  ok(/const streep = /.test(au) && /pa-rowbar/.test(au), '#909/#980: een streep bovenaan en een balk per rij die bijna is');
  ok(/bijna binnen/.test(au) && /nog te gaan/.test(au) && /nog geheim/.test(au), '#909: de getallen betekenen iets (bijna, te gaan, geheim)');
  ok(/Alles gehaald/.test(au) && /Bijna binnen/.test(au) && /van \$\{c\.items\.length\}/.test(au), '#909/#980: een categorie zegt in woorden hoe ver hij is (chip en n van m)');
  ok(/pa-leeg/.test(au), '#909: een lege lijst nodigt uit in plaats van alleen "niks"');
  ok(!/export const (ACHIEVEMENTS|MEDALS|CATEGORIES)/.test(au), '#909: geen definitie of doel aangepast, alleen de weergave');
  ok(/#pause-menu \.pa-hero/.test(css) && /#pause-menu \.pa-rowbar/.test(css), '#909: de nieuwe onderdelen hebben hun eigen stijl');
}

// --- #910: de lege staat van Foto's -------------------------------------------------------
{
  const fu = lees('fotomodusui.js');
  ok(/function leegStateHtml/.test(fu) && /foto-leegstaat/.test(fu), '#910: Foto’s heeft een eigen lege staat');
  ok(/Nog geen foto/.test(fu), '#910: die zegt wat er nog niet is');
  ok(/foto-tips/.test(fu) && /foto-tip/.test(fu), '#910: de drie toetsen staan er meteen bij');
  ok(/data-foto-start/.test(fu), '#910: er is één duidelijke actie om te beginnen');
  ok(/\(leeg \? '' : `<button type="button" class="m-disc"/.test(fu) || /leeg \? '' :/.test(fu), '#910: het kale "Meer opties"-blok staat niet meer bij een lege galerij');
  ok(/#pause-menu \.foto-leegstaat \{/.test(fu), '#910/#980: de lege staat heeft een eigen, uitnodigende stijl (ds-z-leeg, in fotomodusui.js)');
}

// --- #911: de rail vertelt waar je bent ---------------------------------------------------
{
  ok(/pm-rail-h/.test(pm) && /pm-rail-group/.test(pm), '#911: de rail heeft groepen met een kop');
  ok(/function railPosition/.test(pm) && /pm-sheet-pos/.test(pm), '#911: de bladkop zegt in welke groep en op welke plek je bent');
  ok(/data-gcount/.test(pm) && /cnt\.textContent = shown > 1 \? String\(shown\) : ''/.test(pm), '#911: de kop telt wat er echt in de rail staat');
  ok(/#pause-menu \.pm-rail-h \{/.test(css), '#911: de groepskop is klein en stil');
  ok(/pm-sheet-pos:empty/.test(css), '#911: zonder plek (het hoofdmenu) blijft de regel weg');
  // elke sectie heeft één korte zin, en die zegt wat je er doet
  const secties = new Function('return ' + pm.slice(pm.indexOf('const SECTIONS = [') + 'const SECTIONS = '.length, pm.indexOf('];', pm.indexOf('const SECTIONS = [')) + 1))();
  ok(secties.every(([, , zin]) => zin && zin.split(/\s+/).length <= 8), '#911: elke sectie heeft een zin van hooguit acht woorden');
  ok(/ziet.*hoort.*bestuurt/.test(secties.find((s) => s[0] === 'settings')[2]), '#911/#979: de zin van Instellingen dekt beeld, geluid en besturing');
}

// --- #915: bevestiging bij het afsluiten --------------------------------------------------
{
  ok(/data-quit-confirm/.test(pm), '#915: er is een eigen vraag bij het afsluiten');
  const box = pm.slice(pm.indexOf('class="pm-quitbox"'), pm.indexOf('<footer class="pm-footer'));
  ok(/Weet je het zeker\?/.test(box), '#915: de vraag begint met "Weet je het zeker?"');
  ok(/Je voortgang wordt opgeslagen/.test(box), '#915: de melding zegt dat de voortgang bewaard wordt');
  ok(/data-action="exit-go"/.test(box) && /data-action="exit-cancel-ask"/.test(box), '#915: ja sluiten of annuleren, met een eigen knop');
  ok(/pm-quitbox/.test(box) && /role="alertdialog"/.test(box), '#915: de vraag hangt over het hele menu, dus ook boven de rail');
  ok(/#pause-menu \.pm-quitbox \{[^}]*position: absolute; inset: 0/.test(css), '#915: de vraag staat als laag over het menu');
  ok(/#pause-menu \.pm-quitbox\[hidden\]/.test(css), '#915: en verdwijnt met hidden');
  const exitTak = pm.slice(pm.indexOf("a === 'exit'"), pm.indexOf("a === 'exit-cancel-ask'"));
  ok(/hidden = false/.test(exitTak) && /data-action="exit-go"/.test(exitTak), '#915: Afsluiten opent eerst de vraag en zet de focus op ja');
  ok(/a === 'quit-now'/.test(pm) && /DESKTOP\.quit\(\)/.test(pm), '#915: pas "Ja, opslaan en sluiten" sluit het spel');
  ok(/quitBox && !quitBox\.hidden/.test(pm), '#915: Esc sluit alleen de vraag');
  ok(/data-quit-confirm/.test(pm.slice(pm.indexOf('function syncRail'))), '#915: een nieuwe opening begint zonder de vraag in beeld');
}

// --- #920: één menu, ook na navigeren tussen schermen --------------------------------
{
  // een tweede init mag geen tweede #pause-menu met een eigen toetsenlijst maken
  const init = pm.slice(pm.indexOf('export function initPauseMenu('), pm.indexOf('export function initPauseMenu(') + 700);
  ok(/if \(root \|\| document\.getElementById\('pause-menu'\)\) return;/.test(init), '#920: initPauseMenu bouwt maar één menu');
  ok((pm.match(/window\.addEventListener\('keydown', onKey, true\)/g) || []).length === 1, '#920: er luistert één keydown-handler naar Escape');
  // een tweede open-verzoek op een al open menu doet niets: geen tweede laag, geen sprong
  const setOpen = pm.slice(pm.indexOf('function setOpen('), pm.indexOf('// Opens a section from inside the menu') > 0 ? pm.indexOf('function setOpen(') + 1200 : pm.length);
  ok(/if \(open === value\) \{[\s\S]*?#920: een tweede open-verzoek[\s\S]*?return;/.test(setOpen), '#920: een dubbel open-verzoek is een no-op');
  ok(!/if \(open === value\) \{[\s\S]{0,120}showTab\(name, how\)/.test(setOpen), '#920: een dubbel open-verzoek navigeert niet opnieuw');
  // sluiten laat geen vraaglaag of oude herkomst achter
  ok(/for \(const box of root\.querySelectorAll\('\[data-exit-confirm\], \[data-quit-confirm\]'\)\) box\.hidden = true;/.test(pm), '#920: sluiten ruimt de vraaglagen op');
  ok(/origin = 'home';/.test(pm.slice(pm.indexOf('if (!value) {'), pm.indexOf('open = value;'))), '#920: sluiten zet de herkomst terug');
}

// --- #915: de afsluitvraag houdt de focus vast ---------------------------------------
{
  ok(/function visibleQuestion\(\)/.test(pm) && /querySelector\('\[data-quit-confirm\]:not\(\[hidden\]\)'\) \|\| root\.querySelector\('\[data-exit-confirm\]:not\(\[hidden\]\)'\)/.test(pm), '#915: er is één plek die de open vraag herkent');
  ok(/querySelectorAll\('\.pm-rail, \.pm-sheet'\)/.test(pm), '#915: de rest van het menu is inert zolang de vraag openstaat');
  ok(/function showQuestion\(box, on\)/.test(pm) && /syncQuestionLayers\(\)/.test(pm), '#915: openen en sluiten werken de inert-stand bij');
  ok(!/(?:exitBox|quitBox)\.hidden = /.test(pm), '#915: geen vraaglaag wordt buiten showQuestion om open of dicht gezet');
  const tab = pm.slice(pm.indexOf('function tabFocus('), pm.indexOf('function tabFocus(') + 700);
  ok(/const vraag = visibleQuestion\(\)/.test(tab) && /scopes = vraag \? \[vraag\]/.test(tab), '#915: Tab blijft binnen de open vraag');
  const move = pm.slice(pm.indexOf('function moveFocus('), pm.indexOf('function moveFocus(') + 600);
  ok(/const vraag = visibleQuestion\(\)/.test(move) && /list = visibleFocusables\(vraag\)/.test(move), '#915: de pijlen blijven binnen de open vraag');
  ok(/if \(vraag && !vraag\.contains\(e\.target\)\)/.test(pm), '#915: de focus kan niet achter de vraag belanden');
  ok(/#pause-menu\.pm-question \.pm-fold > \.pm-rail[\s\S]{0,120}pointer-events: none/.test(css), '#915: ook de muis komt niet achter de vraag');
  ok(/visibleQuestion\(\) && !\(k === 'Escape' \|\| k === 'Backspace' \|\| k === 'Tab' \|\| dir \|\| k === 'Enter' \|\| k === ' '\)/.test(pm), '#915: andere menutoetsen staan stil zolang de vraag openstaat');
}

// --- review 0.62: de railkoppen en de positieaanduiding halen 4,5:1 -------------------
{
  const kleur = (re) => { const m = css.match(re); return m ? m[1].trim() : ''; };
  const railH = kleur(/#pause-menu \.pm-rail-h \{[^}]*color: ([^;]+);/);
  const cnt = kleur(/#pause-menu \.pm-rail-h \.cnt \{[^}]*color: ([^;]+);/);
  const pos = kleur(/#pause-menu \.pm-sheet-pos \{[^}]*color: ([^;]+);/);
  ok(railH === 'var(--mut)' && cnt === 'var(--mut)' && pos === 'var(--mut)', 'review: de drie navigatielabels gebruiken de leesbare mut-token', `${railH}|${cnt}|${pos}`);
  // de token echt doorrekenen op de donkerste en de lichtste menukaart
  const m = menuCss.match(/--mut: rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  ok(!!m, 'review: --mut is een rgba-token');
  if (m) {
    const [r, g, b, a] = m.slice(1).map(Number);
    const mix = (bg) => toRgb(bg).map((v, i) => Math.round([r, g, b][i] * a + v * (1 - a)));
    for (const bg of ['#0c140e', '#17301f']) {
      const ratio = contrastRatio(mix(bg), bg);
      ok(ratio >= 4.5, `review: de railkoppen halen 4,5:1 op ${bg}`, ratio.toFixed(2));
    }
  }
}

// --- review 0.62: Terug naar standaard ververst de toetsenlijst ----------------------
{
  const tak = pm.slice(pm.indexOf("a === 'binds-reset-all'"), pm.indexOf("a === 'pigeon-stop'"));
  ok(/setBindMsg\('Alles staat weer op de standaard\.'\);[\s\S]*?renderBinds\(\);[\s\S]*?syncControls\(\);/.test(tak), 'review: de reset tekent de toetsen- en knoppenlijst opnieuw');
  ok(/if \(k\) k\.innerHTML = bindRowsKeys\(\);/.test(pm) && !/if \(k && !k\.hidden\)/.test(pm), 'review: renderBinds ververst ook een tabblad dat dicht is');
}

console.log(bad ? `menu_issues_062_test: ${bad} van ${n} checks rood` : `menu_issues_062_test: ${n} checks groen`);
process.exit(bad ? 1 : 0);
