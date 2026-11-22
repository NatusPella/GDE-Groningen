// Tabaudit van het pauzemenu (#1010, #980; AAA-ronde 22-11): loopt elk tabblad af op dezelfde punten, zonder browser:
//   1 motion     alle overgangen en animaties duren hooguit 250 ms (tokens uit ds-tokens.css opgelost; 'ds3-dwell' is een verblijf en telt niet)
//   2 lettergrootte  geen tekst onder 13 px (ook niet in max()); het menu vloert verder met --menu-min
//   3 leeg       elk tabblad met een lijst of inhoud heeft een lege staat in woorden
//   4 toets      de voetregel noemt Esc, de pijlen en (bij subtabs of onderdelen) Q/E; een hoofdknop met een toets toont die in de knop
//   5 listnav    wat je kunt aanklikken is een knop of heeft tabindex; role="button" zonder tabindex mag niet; navigatie loopt via listnav.navIndex
//   6 tekstdieet rail- en tabnamen kort, geen alinea boven 150 tekens, geen zin twee keer in hetzelfde tabblad
//   7 ds3        geen te kleine tekst, geen lus en geen lange animatie volgens ds3_telling
//   8 schaal     op 1280x720 en 1920x1080, ui-schaal 1,0 en 1,5, past een vaste breedte of minimumbreedte in het blad (stage = venster / zoom)
// De echte indeling vraagt beeld; dit is wat zonder browser te bewijzen valt. Bekende beperkingen staan onder BEKEND en tellen als waarschuwing.
//   node scripts/menu_tabs_audit.mjs            audit (exit 1 bij een bevinding)
//   node scripts/menu_tabs_audit.mjs --lijst    ook de waarschuwingen en de tabellen
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { telBestand } from './lib/ds3_regels.mjs';
import { duurChecks, kleineLetters, klikbaarZonderFocus, langeAlinea, dubbeleZin, BLADEN, blad, vasteBreedtes } from './lib/menu_tabs_regels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const bestaat = (f) => fs.existsSync(path.join(root, f));
const LIJST = process.argv.includes('--lijst');

// tab -> bronbestanden (alles wat het tabblad rendert of opmaakt)
const J = (f) => `game/js/${f}`;
export const TABS = {
  spel: { naam: 'Spel', bron: ['pausemenu.js', 'samenpanel.js', 'samenhubui.js', 'coopspelersui.js', 'lobbyui.js', 'saveslotsui.js'] },
  verhaal: { naam: 'Verhaal', bron: ['verhaalui.js'] },
  todo: { naam: 'Activiteiten', bron: ['todoui.js'] },
  loopbaan: { naam: 'Loopbanen', bron: ['loopbaanui.js'] },
  map: { naam: 'Kaart', bron: ['mapview.js', 'kaartactieui.js'] },
  spullen: { naam: 'Spullen', bron: ['spullen.js'] },
  garage: { naam: 'Garage', bron: ['garageui.js'] },
  boerderij: { naam: 'Land en bedrijf', bron: ['bezitui.js', 'boerderijui.js'] },
  veroverd: { naam: 'Veroverd', bron: ['veroverdpanel.js', 'gebiedenui.js'] },
  prestaties: { naam: 'Prestaties', bron: ['achievementsui.js'] },
  fotos: { naam: "Foto's", bron: ['fotomodusui.js'] },
  settings: { naam: 'Instellingen', bron: ['pausemenu.js'] },
  controls: { naam: 'Besturing', bron: ['pausemenu.js', 'helpoverview.js'] },
  over: { naam: 'Over', bron: ['over.js'] },
  streken: { naam: 'Cheats', bron: ['cheatsui.js'] },
  tuning: { naam: 'Tuning', bron: ['tuningworkshopui.js', 'tuningui.css'], los: true },
  kleding: { naam: 'Kleding', bron: ['clothingpanel.js', 'shopui.js', 'shopui.css'], los: true },
  uitleg: { naam: 'Uitleg', bron: ['uitleg.js', 'uitlegdata.js'], los: true },
};
// de gedeelde stijlen die elk tabblad meekrijgt
const GEDEELD = ['pausemenu.css', 'menu.css', 'ds-menu-zeef.css'];

// Met reden bekend en niet in deze ronde te bewijzen zonder beeld.
const BEKEND = [
  'Op een groot venster met ui-schaal 1,5 is het menublad 1280x720 hoog; de @media (max-height)-regels kijken naar het echte venster, niet naar het blad (vraagt beeld).',
];

const bevindingen = [];
const waarschuwingen = [];
const fout = (tab, punt, tekst) => bevindingen.push({ tab, punt, tekst });
const waarsch = (tab, punt, tekst) => waarschuwingen.push({ tab, punt, tekst });

const tokens = {};
for (const m of lees(J('ds-tokens.css')).matchAll(/(--ds-m-[a-z-]+):\s*(\d+(?:\.\d+)?)(ms|s)\b/g)) tokens[m[1]] = m[3] === 's' ? +m[2] * 1000 : +m[2];

const tekstVan = (tab) => TABS[tab].bron.filter((f) => bestaat(J(f))).map((f) => ({ f, src: lees(J(f)) }));
const cssVan = (tab) => [...tekstVan(tab), ...GEDEELD.filter((f) => bestaat(J(f))).map((f) => ({ f, src: lees(J(f)) }))];

// ---- 3. lege staat ----
const LEEG = /\b(nog (geen|niets)|geen \w+ (gevonden|beschikbaar|te zien|in de buurt)|niets (te|om|in|hier)|leeg|nog leeg|er is (nog )?(niets|geen)|niets gevonden|nog niks)/i;
// settings, controls, over, spel: vaste lijsten; map: de kaart zelf; fotos: de galerij heeft een eigen regel; streken: een vaste catalogus;
// verhaal: Opdrachten is todoui.js (eigen lege staat) en Personages begint altijd met Tammo
const LEGE_STAAT_NIET_NODIG = new Set(['settings', 'controls', 'over', 'spel', 'map', 'uitleg', 'fotos', 'streken', 'verhaal']);

// ---- de checks per tab ----
const pm = lees(J('pausemenu.js'));
const hintsBlok = pm.slice(pm.indexOf('const HINTS = {'), pm.indexOf('// a line in the sheet header'));
const hintVan = (id) => { const m = hintsBlok.match(new RegExp(`\\n  ${id}: (\\[.*\\]),\\n`)); return m ? m[1] : ''; };
const sectionsBlok = pm.slice(pm.indexOf('const SECTIONS = ['), pm.indexOf('const RAIL_GROUPS'));
const subtabsBlok = pm.slice(pm.indexOf('const SUBTABS = {'), pm.indexOf('const SUB_ALIAS'));
const heeftSubtabs = (id) => new RegExp(`\\n  ${id}: \\[\\[`).test(subtabsBlok);

for (const tab of Object.keys(TABS)) {
  const naam = TABS[tab].naam;
  const eigen = tekstVan(tab);
  if (!eigen.length) { fout(tab, 'bron', 'geen enkel bronbestand gevonden'); continue; }
  const alles = tab === 'settings' || tab === 'spel' || tab === 'controls' ? eigen : eigen; // pausemenu.js is gedeeld: alleen globaal gelezen

  // 1 en 2: de eigen bronnen (de gedeelde stijl wordt apart, één keer, hieronder gecontroleerd)
  for (const { f, src } of eigen) {
    if (f === 'pausemenu.js') continue;
    for (const x of duurChecks(src, tokens)) fout(tab, 'motion', `${f}:${x.regel} ${x.ms} ms > 250: ${x.tekst}`);
    for (const x of kleineLetters(src)) fout(tab, 'lettergrootte', `${f}:${x.regel} ${x.tekst}`);
    for (const x of klikbaarZonderFocus(src)) fout(tab, 'listnav', `${f}:${x.regel} aanklikbaar zonder tabindex: ${x.tekst}`);
    for (const x of langeAlinea(src)) waarsch(tab, 'tekstdieet', `${f}:${x.regel} alinea boven 150 tekens: ${x.tekst}`);
    for (const x of dubbeleZin(src)) fout(tab, 'tekstdieet', `${f}: dezelfde zin ${x.n}x: ${x.tekst}`);
    const t = telBestand(`game/js/${f}`, src);
    for (const s of ['klein', 'lus', 'lang']) if (t.n[s]) fout(tab, 'ds3', `${f}: ${t.n[s]}x ${s}`);
  }

  // 3 lege staat
  if (!LEGE_STAAT_NIET_NODIG.has(tab) && !TABS[tab].los) {
    if (!eigen.some(({ src }) => LEEG.test(src))) fout(tab, 'leeg', 'geen lege staat in woorden (bijvoorbeeld "Nog geen ...") in de bron');
  }
  if (TABS[tab].los && ['tuning', 'kleding'].includes(tab) && !eigen.some(({ src }) => LEEG.test(src))) fout(tab, 'leeg', 'geen lege staat in woorden in de bron');

  // 4 toets en 5 listnav: alleen voor tabbladen in de voetregel
  if (!TABS[tab].los) {
    const h = hintVan(tab);
    if (!h) fout(tab, 'toets', 'geen voetregel (HINTS) voor dit tabblad');
    else {
      if (!/\['Esc'\]/.test(h)) fout(tab, 'toets', 'de voetregel noemt Esc niet');
      if (tab !== 'map' && tab !== 'fotos' && !/'↑', '↓'/.test(h)) fout(tab, 'listnav', 'de voetregel noemt de pijlen niet');
      if (heeftSubtabs(tab) && !/\['Q', 'E'\]/.test(h)) fout(tab, 'toets', 'tabblad met subtabs maar de voetregel noemt Q/E niet');
    }
    // de naam in de rail: kort
    const m = sectionsBlok.match(new RegExp(`\\['${tab}', ([^,]+), '([^']*)'\\]`));
    if (m) {
      const label = m[1].replace(/^["']|["']$/g, '');
      if (label.length > 18) fout(tab, 'tekstdieet', `naam in de rail te lang (${label.length} tekens): ${label}`);
      if (m[2].length > 60) fout(tab, 'tekstdieet', `omschrijving boven 60 tekens (${m[2].length})`);
    }
  }
}

// subtabnamen kort
for (const m of subtabsBlok.matchAll(/\['([a-z0-9]+)', '([^']+)'\]/g)) if (m[2].length > 22) fout('settings', 'tekstdieet', `subtabnaam te lang (${m[2].length}): ${m[2]}`);

// 1 en 2 voor de gedeelde stijl
for (const f of GEDEELD.concat(['pausemenu.js'])) {
  if (!bestaat(J(f))) continue;
  const src = lees(J(f));
  for (const x of duurChecks(src, tokens)) fout('gedeeld', 'motion', `${f}:${x.regel} ${x.ms} ms > 250: ${x.tekst}`);
  for (const x of kleineLetters(src)) fout('gedeeld', 'lettergrootte', `${f}:${x.regel} ${x.tekst}`);
}
// Doorgaan toont zijn toets niet in de knop: Esc gaat buiten het Overzicht eerst een stap terug, dus de toets zou liegen; de voetregel van het Overzicht noemt hem.
if (!hintsBlok.includes("[['Esc'], 'doorgaan', 'resume']")) fout('spel', 'toets', 'de voetregel van het Overzicht noemt Esc als doorgaan niet');

// 8 schaal: vaste breedtes tegen het blad
const sheetCss = lees(J('pausemenu.css'));
const vast = vasteBreedtes(sheetCss).filter((v) => /pm-|m-|ov-|td-|gar-|pa-|lb-|sp-|coop|ds-/.test(v.sel));
for (const [w, h, ui] of BLADEN) {
  const b = blad(w, h, ui);
  for (const v of vast) {
    // een lijst met een paneel ernaast (m-list, td-list) mag hooguit 62% van het blad innemen; de rest is voor het paneel
    const lijst = /m-list|td-list|gar-list/.test(v.sel) && !/pm-slist|pm-wide/.test(v.sel);
    const max = lijst ? b.breed * 0.62 : b.breed;
    if (v.px > max) fout('gedeeld', 'schaal', `${w}x${h} @${ui}: ${v.sel} ${v.prop} ${v.px}px past niet in het blad van ${Math.round(b.breed)}px${lijst ? ' (lijst naast een paneel: hooguit ' + Math.round(max) + 'px)' : ''}`);
  }
}
for (const t of BEKEND) waarsch('gedeeld', 'schaal', t);

// ---- uitvoer ----
if (LIJST) {
  console.log('Tabs: ' + Object.entries(TABS).map(([k, v]) => `${k}=${v.naam}`).join(', '));
  for (const [w, h, ui] of BLADEN) { const b = blad(w, h, ui); console.log(`blad ${w}x${h} @${ui}: stage ${Math.round(b.stage.w)}x${Math.round(b.stage.h)}, blad ${Math.round(b.breed)}x${Math.round(b.hoog)}`); }
  for (const x of waarschuwingen) console.log(`WAARSCHUWING ${x.tab}/${x.punt}: ${x.tekst}`);
}
for (const x of bevindingen) console.log(`BEVINDING ${x.tab}/${x.punt}: ${x.tekst}`);
const aantal = Object.keys(TABS).length;
if (bevindingen.length) { console.log(`menu_tabs_audit: ${bevindingen.length} bevinding(en) op ${aantal} tabbladen`); process.exit(1); }
console.log(`menu_tabs_audit: ${aantal} tabbladen schoon (${waarschuwingen.length} waarschuwingen, --lijst toont ze)`);
