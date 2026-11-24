// Controller-audit van het pauzemenu en alle pagina's (22-11, #1011 en #495): per scherm de bronnen lezen en meten of alles met een controller
// (en met alleen toetsenbord of aanraking) te bereiken is. Zonder Electron en zonder DOM: de HTML-sjablonen en de JS-bronnen worden gelezen en
// vertaald naar dezelfde vraag die de echte navigatie stelt. gamepad.js (menuFallback) en pausemenu.js (visibleFocusables) zien alleen
// `button`, `a[href]`, `input`, `select`, `textarea` en elementen met `tabindex >= 0`; een klikdoel daarbuiten bestaat voor de controller niet.
//   node scripts/controller_audit_menu.mjs [--json] [--scherm=kaart]
// De test (controller_menu_test.mjs) importeert auditMenu() en eist: geen bevinding buiten de lijst met onderbouwde uitzonderingen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { navIndex } from '../game/js/listnav.js';
import { spatialNext, PAD_TEXT_TYPES } from '../game/js/padlogic.js';
import { PAD_MAPS } from '../game/js/controls.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = (f) => 'game/js/' + f;
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const bestaat = (f) => fs.existsSync(path.join(ROOT, f));

// De schermen van het pauzemenu en wat erbij hoort. `bronnen` zijn de bestanden die het scherm bouwen of bedienen; `css` de stijl.
export const SCHERMEN = [
  { id: 'pauze-rail', naam: 'Pauzemenu: rail, tabbladen, Spel, Over, Besturing', bronnen: ['pausemenu.js', 'pausesearch.js', 'pausestate.js'], css: ['pausemenu.css', 'menu.css'] },
  { id: 'kaart', naam: 'Kaart (zoomniveaus, lagen, ping en pin, bezit te koop, Reis erheen)', bronnen: ['mapview.js', 'padmapnav.js', 'kaartactieui.js', 'reispanel.js', 'mapfilters.js'], css: [] },
  { id: 'loopbaan', naam: 'Loopbaan (Tour en Vakken)', bronnen: ['loopbaanui.js', 'loopbaankaarten.js'], css: [] },
  { id: 'bezit', naam: 'Bezit (Land en bedrijf)', bronnen: ['bezitui.js', 'bezitbeheer.js'], css: [] },
  { id: 'spullen', naam: 'Spullen (raster, wapens)', bronnen: ['spullen.js', 'spullenraster.js'], css: [] },
  { id: 'kleding', naam: 'Kleding (kast, pashokje, kapper)', bronnen: ['clothingpanel.js', 'kapperkeuze.js', 'shopui.js', 'shops.js'], css: [] },
  { id: 'tuning', naam: 'Tuning (showroom en werkplaats)', bronnen: ['tuningworkshopui.js', 'tuningshowroom.js'], css: ['tuningui.css'] },
  { id: 'prestaties', naam: 'Prestaties', bronnen: ['achievementsui.js'], css: [] },
  { id: 'instellingen', naam: 'Instellingen (toegankelijkheid, geluid, radio, moeilijkheid, herbinden)', bronnen: ['difficultypanel.js', 'difficultyui.js', 'radiokeuze.js', 'a11y.js'], css: ['a11y.css'] },
  { id: 'samen', naam: 'Spel en Samen spelen (sessielijst, lobby, spelerslijst)', bronnen: ['samenpanel.js', 'samenhubui.js', 'lobbyui.js', 'coopspelersui.js', 'samenkeuze.js'], css: ['samenspelen.css'] },
  { id: 'uitleg', naam: 'Uitleg, aanwijzingen en recap', bronnen: ['uitleg.js', 'recapcard.js', 'recapcardrun.js', 'ovhint.js'], css: [] },
  { id: 'saves', naam: 'Opgeslagen spellen en Nieuw spel', bronnen: ['saveslotsui.js', 'startscreen.js', 'startkaart.js', 'launchchoiceui.js'], css: ['saveslots.css', 'startscreen.css'] },
  { id: 'todo', naam: 'Te doen', bronnen: ['todoui.js'], css: [] },
  { id: 'overig', naam: "Veroverd, Visboek, Foto's", bronnen: ['veroverdpanel.js', 'visboekui.js', 'fotomodusui.js'], css: [] },
];

const NATIEF = new Set(['button', 'input', 'select', 'textarea', 'summary']);
const STATISCH = new Set(['div', 'span', 'li', 'p', 'td', 'tr', 'img', 'svg', 'section', 'article', 'label', 'canvas', 'ul', 'h1', 'h2', 'h3', 'h4', 'b', 'i', 'small']);
// Attributen die structuur dragen en geen klikdoel (closest('[data-sub]') zoekt een ouder, het element zelf is geen knop).
const STRUCTUUR = /^data-(panel|sub|of|search|fold-body|options|count|reset-confirm|reset-undo|bench-banner|bench-confirm|gpu-warn|gpu-help|keys-changed|keys-text|cam-now|hintprev|hintprev-row|g-raw|channels-wrap|sub-preview|online-instelling|preset-(now|hint|desc|fps|bars)|bench-note|reset-undo-text|bench-text|gpu-warn-text)$/;

// een $ hoort óf bij ${...} óf staat los: zonder die scheiding liep de regex exponentieel terug op een open tag met veel ${...}
// (bezitui.js na wensen-m 23-11: controller_menu_test hing)
const TAG = /<([a-zA-Z][\w-]*)((?:[^<>"'`$]|\$(?!\{)|"[^"]*"|'[^']*'|\$\{[^}]*\})*)>/g;

function regelVan(tekst, index) { return tekst.slice(0, index).split('\n').length; }

/** De klik-haken van een bronbestand: de data-attributen en klassen die een klikafhandelaar via closest() of matches() zoekt. */
export function klikHaken(src) {
  const attrs = new Set(), klassen = new Set();
  if (!/addEventListener\(\s*['"]click['"]|\.onclick\s*=|onclick=/.test(src)) return { attrs, klassen };
  for (const m of src.matchAll(/\.(?:closest|matches)\(\s*(['"`])((?:(?!\1).)+)\1\s*\)/g)) {
    for (const a of m[2].matchAll(/\[(data-[\w-]+)/g)) attrs.add(a[1]);
    for (const c of m[2].matchAll(/(?<![\w-])\.([\w-]+)/g)) klassen.add(c[1]);
  }
  return { attrs, klassen };
}

const attrVan = (s, naam) => { const m = s.match(new RegExp('(?:^|\\s)' + naam + '(?:=("[^"]*"|\'[^\']*\'|[^\\s>]+))?(?=\\s|$|/)')); return m ? (m[1] === undefined ? '' : m[1].replace(/^["']|["']$/g, '')) : null; };

function focusbaar(tag, attrs) {
  const ti = attrVan(attrs, 'tabindex');
  if (ti !== null) return /\$\{/.test(ti) || Number(ti) >= 0;
  if (tag === 'a') return attrVan(attrs, 'href') !== null;
  if (tag === 'input') return !/type=["']?hidden/.test(attrs);
  return NATIEF.has(tag);
}

/** Klikdoelen in HTML-sjablonen die de controller niet ziet: geen knop, geen tabindex, wel een klik-haak of onclick. */
export function onbereikbareInSjabloon(src, bestand) {
  const { attrs, klassen } = klikHaken(src);
  const uit = [];
  for (const m of src.matchAll(TAG)) {
    const tag = m[1].toLowerCase();
    if (!STATISCH.has(tag)) continue;
    const a = m[2];
    if (focusbaar(tag, a) || /\baria-hidden=["']true["']/.test(a)) continue; // een verborgen element is geen klikdoel
    // een omhullend element (dialoog, groep, lijst) is geen klikdoel: de knoppen erin zijn het
    if (/\brole=["'](?:dialog|alertdialog|group|list|listitem|listbox|region|tablist|status|alert|presentation|toolbar|radiogroup|img)["']/.test(a)) continue;
    let haak = null;
    if (/\sonclick=/.test(a)) haak = 'onclick';
    for (const d of attrs) if (!STRUCTUUR.test(d) && attrVan(a, d) !== null) { haak = d; break; }
    if (!haak) { const k = attrVan(a, 'class'); if (k) for (const c of k.split(/\s+/)) if (klassen.has(c) && !/^(m-pk|pm-)/.test(c)) { haak = '.' + c; break; } }
    if (!haak) continue;
    uit.push({ bestand, regel: regelVan(src, m.index), tag, haak, tekst: m[0].slice(0, 90) });
  }
  return uit;
}

/** Elementen die in JS worden gemaakt als div of span met een klikluisteraar maar zonder tabindex of knoprol. */
export function onbereikbareInJs(src, bestand) {
  const uit = [];
  const lijnen = src.split('\n');
  for (let i = 0; i < lijnen.length; i++) {
    const m = lijnen[i].match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:document\.)?createElement\(\s*['"](div|span|li|p|td|img|section|article|label)['"]/);
    if (!m) continue;
    const naam = m[1];
    const venster = lijnen.slice(i, i + 40).join('\n');
    const klik = new RegExp('\\b' + naam + '\\.(?:addEventListener\\(\\s*[\'"](?:click|pointerup|mouseup)[\'"]|onclick\\s*=)').test(venster);
    if (!klik) continue;
    const focus = new RegExp('\\b' + naam + '\\.(?:tabIndex|setAttribute\\(\\s*[\'"]tabindex[\'"])').test(venster);
    if (!focus) uit.push({ bestand, regel: i + 1, tag: m[2], haak: naam + ' (createElement + klik)', tekst: lijnen[i].trim().slice(0, 90) });
  }
  return uit;
}

/** tabindex groter dan 0 breekt de focusvolgorde van het beeld. */
export function positieveTabindex(src, bestand) {
  const uit = [];
  for (const m of src.matchAll(/tabindex=["']?([1-9]\d*)/gi)) uit.push({ bestand, regel: regelVan(src, m.index), tekst: m[0] });
  for (const m of src.matchAll(/\.tabIndex\s*=\s*([1-9]\d*)/g)) uit.push({ bestand, regel: regelVan(src, m.index), tekst: m[0] });
  return uit;
}

/** Een scherm met een modaal venster (role=dialog) heeft een Esc-pad (B komt als Escape binnen) en geeft de focus terug: gemeten over alle bronnen van het scherm. */
export function modalen(bronnen) {
  const alles = bronnen.map(([, s]) => s).join('\n');
  if (!/role=["']?(?:alert)?dialog|setAttribute\(\s*['"]role['"]\s*,\s*['"](?:alert)?dialog/.test(alles)) return [];
  const uit = [], bestand = bronnen.map(([p]) => p).join(' + ');
  if (!/['"](?:Escape|escape)['"]/.test(alles)) uit.push({ bestand, regel: 1, soort: 'geen-esc', tekst: 'dialoog zonder Esc-afhandeling (B komt als Escape binnen)' });
  if (!/\.focus\(/.test(alles)) uit.push({ bestand, regel: 1, soort: 'geen-focus', tekst: 'dialoog zonder focusbeheer' });
  else if (!/(prev|opener|terug|restore|last|vorige|invoker|trigger|bron|return|before)\w*\.focus\(|restoreFocus|focusTerug|onClose|lastFocus|prevFocus|canvas\)?\.focus\(/i.test(alles)) uit.push({ bestand, regel: 1, soort: 'geen-focus-terug', tekst: 'dialoog zonder zichtbare focusteruggave' });
  return uit;
}

/** De footerhints van het pauzemenu (HINTS) die een toets noemen zonder controllerknop (PAD_KEYS): bij een controller staat er dan een toetsenbordplaatje. */
export function hintsZonderPadToets(pausemenuSrc) {
  const uit = [];
  const hints = pausemenuSrc.match(/const HINTS = \{([\s\S]*?)\n\};/);
  const pk = pausemenuSrc.match(/const PAD_KEYS = \{([^}]*)\}/);
  if (!hints || !pk) return [{ bestand: 'game/js/pausemenu.js', regel: 0, tekst: 'HINTS of PAD_KEYS niet gevonden in pausemenu.js: werk de audit bij' }];
  const padSleutels = new Set([...pk[1].matchAll(/(?:'([^']+)'|(\w+))\s*:/g)].map((m) => m[1] || m[2]));
  for (const m of hints[1].matchAll(/^\s*(\w+):\s*(.*)$/gm)) {
    for (const k of m[2].matchAll(/\[\[((?:'[^']*'(?:,\s*)?)+)\]/g)) {
      for (const t of k[1].matchAll(/'([^']*)'/g)) if (!padSleutels.has(t[1])) uit.push({ bestand: 'game/js/pausemenu.js', regel: 0, tekst: `HINTS.${m[1]}: toets ${t[1]} heeft geen PAD_KEYS-regel` });
    }
  }
  return uit;
}

/** Een scherm dat zijn lijst opnieuw tekent na een klik (innerHTML) moet de focus bewaren, anders valt hij op body en begint de D-pad bovenaan. */
export function herrenderZonderFocus(src, bestand) {
  const klik = /addEventListener\(\s*['"]click['"]/.test(src);
  const tekent = /\.innerHTML\s*=/.test(src);
  const bewaart = /keepFocus|keepFocus|rerenderTodo|restoreFocus|\.focus\(/.test(src);
  return klik && tekent && !bewaart ? [{ bestand, regel: 1, tekst: 'klikafhandeling en innerHTML, geen focusbehoud' }] : [];
}

/** <select>: een nagebootste toets opent hem niet; gamepad.js moet A en X als stappen kennen (nextSelectIndex). */
export function selectElementen(src, bestand) {
  return [...src.matchAll(/<select\b/g)].map((m) => ({ bestand, regel: regelVan(src, m.index), tekst: '<select>' }));
}

/** Spelertekst die een klik of een toetsnaam als woord noemt zonder {TOKEN} (ui-taal.md). */
export function toetswoorden(src, bestand) {
  const uit = [];
  for (const m of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*?)\1/g)) {
    const s = m[2];
    if (s.length < 8) continue;
    if (/\b(?:druk op|klik op|klik met|Shift\s*\+\s*klik|Ctrl\s*\+\s*klik)\b/i.test(s) && !/druk op de controller/i.test(s) && !/\{[A-Z]+\}/.test(s) && /\s/.test(s)) uit.push({ bestand, regel: regelVan(src, m.index), tekst: s.slice(0, 100) });
  }
  return uit;
}

/** Dubbele sneltoets (data-key) binnen een en hetzelfde sjabloon. */
export function dubbeleToetsen(src, bestand) {
  const uit = [];
  for (const lit of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
    const toetsen = [...lit[1].matchAll(/\bdata-key=["']([^"'$]+)["']/g)].map((x) => x[1]);
    const gezien = new Set();
    for (const t of toetsen) { if (gezien.has(t)) uit.push({ bestand, regel: regelVan(src, lit.index), tekst: 'data-key ' + t }); gezien.add(t); }
  }
  return uit;
}

/** CSS: outline weghalen op :focus zonder vervangende focusring in dezelfde regel. */
export function focusringCss(css, bestand) {
  const uit = [];
  const heeftVisibleRing = /:focus-visible[^{}]*\{[^{}]*outline\s*:\s*(?!none|0\b)/.test(css);
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (!/outline\s*:\s*(?:none|0)\b/.test(body) || !/:focus/.test(sel)) continue;
    if (/\bbox-shadow\b|\bborder(?:-color)?\s*:|outline-offset|background/.test(body)) continue;
    if (/:focus-visible/.test(sel) || (/:focus\b(?!-)/.test(sel) && !heeftVisibleRing)) uit.push({ bestand, regel: regelVan(css, m.index), tekst: sel.slice(0, 80) });
  }
  return uit;
}

/** Tekstvelden van een type dat het schermtoetsenbord niet opent. */
export function tekstveldTypen(src, bestand) {
  const uit = [];
  for (const m of src.matchAll(/<input\b[^>]*\btype=["'](password|number|date|time|color|file|text|search|tel|url|email)["'][^>]*>/g)) if (m[1] !== 'text' && !PAD_TEXT_TYPES.includes(m[1])) uit.push({ bestand, regel: regelVan(src, m.index), type: m[1] });
  for (const m of src.matchAll(/\.type\s*=\s*['"](password|number)['"]/g)) if (!PAD_TEXT_TYPES.includes(m[1])) uit.push({ bestand, regel: regelVan(src, m.index), type: m[1] });
  return uit;
}

/** Vasthouden als bevestiging in spelertekst. */
export function vasthouden(src, bestand) {
  const uit = [];
  for (const m of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*?)\1/g)) if (/\b(houd .*ingedrukt|vasthouden|ingedrukt houden)\b/i.test(m[2]) && m[2].length < 200 && !/^Tikken in plaats van/.test(m[2])) uit.push({ bestand, regel: regelVan(src, m.index), tekst: m[2].slice(0, 100) });
  return uit;
}

/** Scrollt het bestand mee met de focus? Geeft het aantal .focus()-aanroepen en of er een scrollaanroep is. */
export function scrollMee(src) {
  return { nFocus: (src.match(/\.focus\(/g) || []).length, metScroll: /scrollIntoView|scrollTop\s*=|scrollBy|scrollTo|preventScroll:\s*false/.test(src) };
}

/** De menu-indeling van de controller (PAD_MAPS.menu): elke knop heeft zijn vaste toets. */
export function menuIndeling() {
  const M = PAD_MAPS.menu, f = [];
  const eis = { a: 'enter', b: 'escape', start: 'escape', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', lb: 'q', rb: 'e', lt: '[', rt: ']', view: 'm', stick: 'nav', ls: 'tab' };
  for (const [k, v] of Object.entries(eis)) if (M[k] !== v) f.push({ code: 'menu-indeling', tekst: `PAD_MAPS.menu.${k} is ${M[k]}, verwacht ${v}` });
  return f;
}

/** Simuleert listnav voor een kolom van n knoppen: elke knop met de pijlen bereikbaar, Tab loopt rond. Geeft de lijst gebreken. */
export function simuleerLijst(n) {
  const f = [];
  let i = navIndex(n, -1, 'ArrowDown');
  const heen = new Set([i]);
  for (let s = 0; s < n * 2 && i < n - 1; s++) { i = navIndex(n, i, 'ArrowDown'); heen.add(i); }
  if (heen.size !== n) f.push('omlaag bereikt niet elke knop');
  let j = navIndex(n, -1, 'ArrowUp'); const terug = new Set([j]);
  for (let s = 0; s < n * 2 && j > 0; s++) { j = navIndex(n, j, 'ArrowUp'); terug.add(j); }
  if (terug.size !== n) f.push('omhoog bereikt niet elke knop');
  if (navIndex(n, n - 1, 'Tab', { wrap: true }) !== 0 || navIndex(n, 0, 'Tab', { wrap: true, shift: true }) !== n - 1) f.push('Tab loopt niet rond (focusval)');
  return f;
}

/** Een raster van rijen x kolommen via spatialNext: het aantal cellen dat de D-pad vanaf de beginfocus niet bereikt (moet 0 zijn). */
export function simuleerRaster(rijen, kolommen) {
  const rects = [];
  for (let y = 0; y < rijen; y++) for (let x = 0; x < kolommen; x++) rects.push({ x: x * 110, y: y * 40, w: 100, h: 30 });
  const start = spatialNext(rects, -1, 'down');
  const bezocht = new Set([start]);
  const wacht = [start];
  while (wacht.length) { const c = wacht.pop(); for (const d of ['up', 'down', 'left', 'right']) { const nx = spatialNext(rects, c, d); if (nx >= 0 && !bezocht.has(nx)) { bezocht.add(nx); wacht.push(nx); } } }
  return rects.length - bezocht.size;
}

export function auditMenu({ scherm = null } = {}) {
  const resultaat = [];
  for (const s of SCHERMEN) {
    if (scherm && s.id !== scherm) continue;
    const r = { id: s.id, naam: s.naam, bestanden: [], bevindingen: [] };
    const stukken = [];
    for (const b of s.bronnen) {
      const p = JS(b);
      if (!bestaat(p)) { r.bevindingen.push({ code: 'bron-ontbreekt', bestand: p, tekst: 'bronbestand bestaat niet meer: werk SCHERMEN bij' }); continue; }
      r.bestanden.push(p); stukken.push([p, lees(p)]);
    }
    const css = s.css.map((c) => JS(c)).filter(bestaat).map((p) => [p, lees(p)]);
    const voeg = (code, lijst) => { for (const x of lijst) r.bevindingen.push({ code, ...x }); };
    for (const [p, src] of stukken) {
      voeg('onbereikbaar-sjabloon', onbereikbareInSjabloon(src, p));
      voeg('onbereikbaar-js', onbereikbareInJs(src, p));
      voeg('tabindex-positief', positieveTabindex(src, p));
      voeg('herrender-zonder-focus', herrenderZonderFocus(src, p));
      voeg('toetswoord', toetswoorden(src, p));
      voeg('dubbele-toets', dubbeleToetsen(src, p));
      voeg('tekstveld-type', tekstveldTypen(src, p));
      voeg('vasthouden', vasthouden(src, p));
    }
    // schermen in het pauzemenu erven de Esc- en focusafhandeling van pausemenu.js (goBack, lastFocus); kaart, tuning en het startscherm hebben hun eigen
    const hosted = !['kaart', 'tuning', 'saves', 'pauze-rail'].includes(s.id);
    for (const m of modalen(hosted ? [...stukken, [JS('pausemenu.js'), lees(JS('pausemenu.js'))]] : stukken)) r.bevindingen.push({ code: m.soort, ...m });
    if (s.id === 'pauze-rail') for (const m of hintsZonderPadToets(lees(JS('pausemenu.js')))) r.bevindingen.push({ code: 'hint-zonder-padknop', ...m });
    for (const [p, src] of css) voeg('focusring', focusringCss(src, p));
    resultaat.push(r);
  }
  return resultaat;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  const scherm = (arg.find((a) => a.startsWith('--scherm=')) || '').slice(9) || null;
  const res = auditMenu({ scherm });
  if (arg.includes('--json')) console.log(JSON.stringify(res, null, 1));
  else {
    let totaal = 0;
    for (const r of res) {
      console.log(`${r.id.padEnd(14)} ${String(r.bevindingen.length).padStart(3)} bevindingen  (${r.bestanden.length} bronnen)  ${r.naam}`);
      totaal += r.bevindingen.length;
      for (const b of r.bevindingen) console.log(`    [${b.code}] ${b.bestand || ''}:${b.regel || '-'} ${b.haak || b.type || ''} ${(b.tekst || '').replace(/\s+/g, ' ').slice(0, 110)}`);
    }
    console.log(`${res.length} schermen, ${totaal} bevindingen`);
  }
}
