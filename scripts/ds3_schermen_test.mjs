// Per scherm een pure controle (geen Electron): de schermen van "Alle UI via het designsysteem" (21-11) halen hun kleuren en maten
// uit de tokens, hebben geen tekst onder 13 px, halen 4,5:1 voor tekst (ook bij Rustig drukwerk) en passen op 1280x720 en 1920x1080
// zover dat zonder browser te schatten is. De schatting rekent met de ontwerpmaten uit ds-tokens.css; een echt beeld volgt in
// de beeldverificatie (docs/DESIGN-AUDIT-UI-21-11.md, lijst "vraagt beeld").
//   node scripts/ds3_schermen_test.mjs
import fs from 'node:fs';
import { scopeTokens, resolveToken, contrastRatio, parseDsBlocks } from './release/ds_tokens_lib.mjs';
import { checkDs3Line } from './release/design_rules.mjs';

const lees = (f) => fs.readFileSync(f, 'utf8');
let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.error('FOUT: ' + w); } };

const tokensCss = lees('game/js/ds-tokens.css');
const schermen = lees('game/js/ds-schermen.css');
const componenten = lees('game/js/ds-components.css');
const trailer = lees('game/js/trailer.js');
const kaart = lees('game/js/benchmarkui.js'); // de rapportkaart (21-11): de markup staat in benchmarkui.js
const kaartModel = lees('game/js/benchmarkmodel.js');
const toast = lees('game/js/fouttoast.js');
const tok = scopeTokens(tokensCss, 'papier');
const rustig = { ...tok, ...(parseDsBlocks(tokensCss)['html.rustig-drukwerk, .ds-rustig'] || {}) };
const kleur = (t, naam) => resolveToken(t, naam);

// ---- 1. contrast van elk paar dat de nieuwe schermen gebruiken ----
const PAREN = [
  ['--ds-c-ink-inkt', '--ds-c-ink-papier', 4.5, 'tekst op papier (kaart, feit, tegel, knop secundair)'],
  ['--ds-c-ink-inkt', '--ds-c-ink-geel', 4.5, 'tekst op de gele hoofdknop'],
  ['--ds-c-inkt-zacht', '--ds-c-ink-papier', 4.5, 'meta- en toetsregel op papier'],
  ['--ds-c-wit', '--ds-c-ink-bord', 4.5, 'advies: wit op bordgroen'],
  ['--ds-c-wit', '--ds-c-rood', 4.5, 'foutmelding: titel op de rode kop'],
  ['--ds-c-rood-tx', '--ds-c-rood-vlak', 4.5, 'foutmelding: tekst op rood vlak'],
  ['--ds-c-groen-tx', '--ds-c-ink-papier', 4.5, 'benchmark: sneller dan de vorige'],
  ['--ds-c-amber-tx', '--ds-c-ink-papier', 4.5, 'benchmark: trager dan de vorige'],
  ['--ds-c-ink-inkt', '--ds-c-wit', 4.5, 'Details: tekst op wit'],
  ['--ds-c-rood-tx', '--ds-c-ink-papier', 4.5, 'zwakste categorie: chip op papier'],
];
for (const [soort, t] of [['vol', tok], ['Rustig drukwerk', rustig]]) {
  for (const [a, b, norm, wat] of PAREN) {
    const ra = kleur(t, a), rb = kleur(t, b);
    const c = ra && rb ? contrastRatio(ra, rb) : null;
    ok(c !== null && c >= norm, `${wat} (${soort}): ${a} op ${b} geeft ${c === null ? 'geen waarde' : c.toFixed(2)}, nodig ${norm}`);
  }
}

// ---- 2. de CSS van de schermen: alleen tokens, geen glas, tekst minstens 13 px ----
const zonderCommentaar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = zonderCommentaar(schermen);
ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), 'ds-schermen.css heeft geen hex');
ok(!/\brgba?\(/.test(css), 'ds-schermen.css heeft geen rgb()');
ok(!/(?:linear|radial|conic)-gradient|backdrop-filter/.test(css), 'ds-schermen.css heeft geen verloop of backdrop-filter');
for (const m of css.matchAll(/font-size\s*:\s*([^;}]+)/g)) ok(/var\(--ds-t-/.test(m[1]) || !/\d+px/.test(m[1]) || Math.min(...[...m[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => +x[1])) >= 13, `ds-schermen.css: font-size ${m[1].trim()} is minstens 13 px`);
for (const m of css.matchAll(/font\s*:\s*([^;}]+)/g)) ok(!/(?<![\w-])\d+(?:\.\d+)?px/.test(m[1]) || /var\(--ds-t-/.test(m[1]), `ds-schermen.css: font-shorthand ${m[1].trim()} gebruikt een token`);
for (const naam of ['--ds-t-hulp', '--ds-t-label', '--ds-t-body', '--ds-t-subkop', '--ds-t-cijfer', '--ds-t-kop']) {
  const w = tok[naam] || '';
  const px = [...w.matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => +x[1]);
  ok(px.length > 0 && Math.min(...px) >= 13, `${naam} is minstens 13 px (${w})`);
}
ok(/@media \(prefers-reduced-motion: reduce\)/.test(schermen) && /html\.reduce-motion/.test(schermen), 'ds-schermen.css kent Beweging beperken (beide takken)');
for (const m of css.matchAll(/(?:transition|animation)[\w-]*\s*:\s*([^;}]+)/g)) {
  const ms = [...m[1].replace(/var\([^)]*\)/g, '').matchAll(/(\d*\.?\d+)\s*(ms|s)\b/g)].map((x) => (x[2] === 's' ? +x[1] * 1000 : +x[1]));
  ok(ms.every((v) => v <= 250), `ds-schermen.css: beweging ${m[1].trim()} hooguit 250 ms`);
}

// ---- 3. de benchmark: de oude stijl is weg, het paneel gebruikt de componenten, één gele hoofdknop ----
ok(!/#trailer-result/.test(trailer), 'trailer.js heeft geen eigen CSS meer voor het resultaat (die staat in ds-schermen.css)');
ok(/#trailer-result/.test(schermen) && /\.tr-res/.test(schermen), 'ds-schermen.css stijlt het resultaat');
ok(/class="tr-res ds-zeef ds-z-kaart/.test(kaart), 'het resultaat is een zeefdrukkaart');
ok(/ds-z-feit/.test(kaart), 'de cijfers zijn feiten-tegels');
ok(/tr-advice ds-z-kaart ds-z-kaart--bord/.test(kaart), 'het advies staat in een bordgroene kaart');
ok(/class="ds-z-knop" data-act="apply"/.test(kaart), 'Toepassen is de gele hoofdknop');
for (const act of ['again', 'settings', 'diag']) ok(new RegExp(`class="ds-z-knop ds-z-knop--secundair" data-act="${act}"`).test(kaart), `${act} is een secundaire .ds-z-knop`);
ok(/data-act="back">Terug \{ESC\}/.test(kaart) && /ds-z-knop\$\{card\.advice\.apply && !card\.busy \? ' ds-z-knop--secundair' : ''\}" data-act="back"/.test(kaart), 'Terug is alleen de hoofdknop als Toepassen er niet is');
ok(/\{ARROWS\} kiezen · \{ENTER\} ok · \{ESC\} terug/.test(kaart), 'de hints zijn toetsplaatjes ({TOKEN})');
for (const t of ['Toepassen', 'Nog een keer', 'Instellingen', 'Technische info kopiëren', 'Terug']) ok(kaart.includes(t), `knoptekst "${t}" blijft`);
const subCss = lees('game/js/subtitle.css');
ok(/body\.tr-result-open[^{]*#cine/.test(schermen) && /body\.tr-result-open \.ds-sub/.test(subCss), 'ondertitels zwijgen tijdens het resultaat');
ok(/body\.trailer-on \.ds-sub/.test(subCss), 'ondertitels zwijgen tijdens de meting');
ok(/#trailer-result \{[^}]*z-index: 95/.test(schermen), 'het resultaat ligt boven de ondertitel-lagen (z-index 95)');
// de metingen zelf blijven ongewijzigd: de rekenfuncties worden nog aangeroepen op dezelfde plek
for (const stuk of ['computeStats(r)', 'setBenchResult(stats, res.preset', 'writeLastRun(packRun(', 'basis']) ok(trailer.includes(stuk), `meting ongewijzigd: ${stuk}`);

ok(kaartModel.includes('recommendStand(basis, run.preset, run.diag || null'), 'meting ongewijzigd: het advies rekent op wat de speler speelt (basis)');

// ---- 4. de foutmelding ----
ok(/frame-error ds-zeef ds-z-kaart ds-z-kaart--probleem/.test(toast), 'de foutmelding is een zeefdrukkaart met rode inktrand');
ok(/Kopieer foutrapport/.test(toast) && /<details|createElement\('details'\)/.test(toast), 'Kopieer foutrapport en Details staan erin');
ok(!/textContent = 'Er ging iets mis: '/.test(toast), 'de technische tekst staat niet meer in de zichtbare regel');
ok(!/\.frame-error\s*\{[^}]*rgba/.test(lees('game/index.html')), 'index.html heeft de oude rode balk niet meer');

// ---- 5. de regelaudit: nieuwe harde kleuren en oud glas blokkeren ----
const blok = (file, text) => checkDs3Line({ file, line: 1, text }).some((f) => f.ernst === 'blokkerend');
ok(blok('game/js/menu.css', '.x { color: #f0ede4; }'), 'audit: een harde hex in een CSS-bestand blokkeert');
ok(blok('game/js/menu.css', '.x { background: rgba(12, 20, 14, 0.8); }'), 'audit: een rgba in een CSS-bestand blokkeert');
ok(blok('game/js/menu.css', '.x { background: var(--gron-green); }'), 'audit: --gron-green blokkeert');
ok(blok('game/js/menu.css', '.x { backdrop-filter: blur(6px); }'), 'audit: backdrop-filter blokkeert');
ok(blok('game/js/hud_panel.css', '.x { background: linear-gradient(90deg, var(--ds-c-glas), var(--ds-c-glas-2)); }'), 'audit: een verloop blokkeert');
ok(blok('game/js/farm.css', '<div class="ds-kaart">'), 'audit: een oude componentklasse blokkeert');
ok(blok('game/js/menu.css', '.x { font-size: 11px; }'), 'audit: tekst onder 13 px blokkeert');
ok(blok('game/js/postgame.js', "el.style.cssText = 'color: #fff; background: #000';"), 'audit: een harde kleur in een JS-stijl blokkeert');
ok(!blok('game/js/menu.css', '.x { color: var(--ds-c-creme); background: color-mix(in srgb, var(--ds-c-glas) 50%, transparent); }'), 'audit: tokens mogen');
ok(!blok('game/js/menu.css', '.x { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }'), 'audit: een zwarte slagschaduw mag');
ok(!blok('game/js/menu.css', '.x { color: #f0ede4; } /* ds3-uitzondering: reden */'), 'audit: ds3-uitzondering met reden is vrij');
ok(!blok('game/js/ds-tokens.css', '  --ds-c-nieuw: #abcdef;'), 'audit: ds-tokens.css mag hex (het palet)');
ok(!blok('game/js/mapstyle.js', "  road: { color: '#d8d4c8' }"), 'audit: een datatabel in JS telt niet');
ok(!blok('game/js/scene3d.js', 'const m = new THREE.MeshBasicMaterial({ color: 0x336699 });'), 'audit: een 3D-materiaal telt niet');
ok(!blok('scripts/foo.mjs', '.x { color: #fff; }'), 'audit: buiten game/ telt niet');

// ---- 6. indeling op 1280x720 en 1920x1080 (schatting in ontwerp-px; de stage zoomt 1080p-maten) ----
const num = (naam, t = tok) => parseFloat(resolveToken(t, naam)) || 0;
const s = (k) => num(`--ds-s-${k}`);
function resultaatHoogte(h) {
  const compact = h <= 780;
  const cijfer = compact ? num('--ds-t-kop') : num('--ds-t-cijfer');
  const tegelH = s(2) * 2 + cijfer * 1.0 + num('--ds-t-hulp') * 1.4 + s(1) + 5; // padding + getal + label + gat + rand
  const paneelB = Math.min(s(8) * 9, 1280 - 2 * s(4));
  const tegelB = (compact ? s(8) * 1.25 : s(8) * 1.5) + 24; // min-breedte plus ruimte voor een tweecijferig getal
  const perRij = Math.max(1, Math.floor((paneelB - 2 * s(4) + s(3)) / (tegelB + s(3))));
  const rijen = Math.ceil(5 / perRij);
  const feiten = rijen * tegelH + (rijen - 1) * s(3);
  const knopH = compact ? num('--ds-hoogte-chip') : num('--ds-hoogte-knop');
  const knopB = (label, px) => label.length * px * 0.42 + 2 * (compact ? s(4) : s(5)) + 6;
  const px = compact ? num('--ds-t-label') : num('--ds-t-subkop');
  const knoppen = ['Toepassen', 'Nog een keer', 'Instellingen', 'Technische info kopiëren', 'Terug'].map((l) => knopB(l, px));
  let rij = 0, b = 0, rijenK = 1;
  for (const w of knoppen) { if (b && b + w + s(3) > paneelB - 2 * s(4)) { rijenK++; b = 0; } b += w + s(3); rij++; }
  const knopRijen = rijenK * knopH + (rijenK - 1) * s(3);
  const kop = s(2) * 2 + num('--ds-t-subkop') * 1.0;
  const advies = s(4) * 2 + num('--ds-t-subkop') + num('--ds-t-hulp') * 1.4 * 2 + s(1);
  const tekstregels = num('--ds-t-hulp') * 1.4 * 3; // meta, vergelijking, toetsregel
  const cats = num('--ds-hoogte-chip') * 2 + s(2);
  const gaten = 7 * (compact ? s(2) : s(3));
  return kop + feiten + advies + tekstregels + cats + knopRijen + gaten + 2 * s(4);
}
// de paneelhoogte is het venster min 32 px marge; het paneel scrolt zelf (overflow: auto), maar scrollen is een noodgreep
for (const [b, h] of [[1280, 720], [1920, 1080]]) {
  const nodig = resultaatHoogte(h);
  const ruimte = h - 2 * s(4);
  console.log(`  schatting benchmarkresultaat ${b}x${h}: ${Math.round(nodig)} van ${ruimte} px`);
  ok(nodig <= ruimte, `benchmarkresultaat op ${b}x${h}: geschat ${Math.round(nodig)} px hoog, beschikbaar ${ruimte} px`);
}
// de foutmelding: breedte past op 1280 en 1920, hoogte hooguit een derde van het scherm zonder Details
for (const [b, h] of [[1280, 720], [1920, 1080]]) {
  const breedte = Math.min(s(8) * 8, b - s(5));
  ok(breedte >= 320 && breedte <= b, `foutmelding op ${b}x${h}: ${breedte} px breed`);
  const hoogte = (s(2) * 2 + num('--ds-t-subkop')) + 2 * s(4) + 3 * num('--ds-t-body') * 1.4 + num('--ds-t-hulp') * 1.4 + num('--ds-hoogte-chip') + 3 * s(3);
  ok(hoogte <= h / 3, `foutmelding op ${b}x${h}: geschat ${Math.round(hoogte)} px hoog, hooguit een derde (${Math.round(h / 3)})`);
}

console.log(`ds3_schermen_test: ${n - fout}/${n} controles`);
process.exit(fout ? 1 : 0);
