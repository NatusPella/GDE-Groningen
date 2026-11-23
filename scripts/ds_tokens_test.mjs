// Gedragstest voor het designsysteem (#980): game/js/ds-tokens.css, game/js/ds-components.css,
// game/ds-galerij.html en het hoofdstuk "Tokens and components in use" in DESIGN_SYSTEM.md.
//
//   node scripts/ds_tokens_test.mjs            controleren
//   node scripts/ds_tokens_test.mjs --write    de contrasttabel in DESIGN_SYSTEM.md opnieuw uit de tokens schrijven
//
// Controleert: (1) elk kleurpaar dat de componenten tekenen haalt zijn norm (4,5 tekst, 3 groot/rand/vulling),
// op papier en op glas; (2) de contrasttabel in DESIGN_SYSTEM.md is gelijk aan wat de tokens geven; (3) elke
// var(--ds-...) in ds-components.css bestaat in de tokens of in dat bestand zelf; (4) de lijst met
// componenten in DESIGN_SYSTEM.md is gelijk aan de klassen in de CSS en elke klasse staat in de galerij;
// (5) de lintregels van design_rules.mjs (checkDsLine, checkDsFiles) geven niets op de echte bestanden en
// vangen een synthetische overtreding; (6) typografie-, ruimte- en bewegingtokens houden hun grenzen.
// Geen netwerk, geen Electron, geen echte opslag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  scopeTokens, resolveToken, contrastRatio, ROLE_PAIRS, parseDsBlocks,
  contrastRows, contrastTableMarkdown, CONTRAST_START, CONTRAST_END,
} from './release/ds_tokens_lib.mjs';
import { checkDsLine, checkDsFiles, checkDesignLine, DS_MAX_MOTION_MS } from './release/design_rules.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const TOKENS = 'game/js/ds-tokens.css';
const COMPONENTS = 'game/js/ds-components.css';
const GALERIJ = 'game/ds-galerij.html';
const DOC = 'DESIGN_SYSTEM.md';

let controles = 0;
let fouten = 0;
function ok(cond, wat) {
  controles += 1;
  if (!cond) { fouten += 1; console.log(`FAIL ${wat}`); }
}

const tokensCss = rd(TOKENS);
const componentsCss = rd(COMPONENTS);
const galerij = rd(GALERIJ);
let doc = rd(DOC);

// ---------------------------------------------------------------- --write

if (process.argv.includes('--write')) {
  const start = doc.indexOf(CONTRAST_START);
  const end = doc.indexOf(CONTRAST_END);
  if (start < 0 || end < start) { console.log('markeringen voor de contrasttabel ontbreken in DESIGN_SYSTEM.md'); process.exit(1); }
  const crlf = fs.readFileSync(path.join(ROOT, DOC), 'utf8').includes('\r\n');
  let nieuw = `${doc.slice(0, start + CONTRAST_START.length)}\n${contrastTableMarkdown(tokensCss)}\n${doc.slice(end)}`;
  if (crlf) nieuw = nieuw.replace(/\n/g, '\r\n');
  fs.writeFileSync(path.join(ROOT, DOC), nieuw);
  console.log('contrasttabel in DESIGN_SYSTEM.md geschreven');
  doc = rd(DOC);
}

// ---------------------------------------------------------------- 1. contrast per oppervlak

for (const surface of ['papier', 'glas']) {
  const tokens = scopeTokens(tokensCss, surface);
  for (const [fg, bg, norm] of ROLE_PAIRS) {
    const a = resolveToken(tokens, fg);
    const b = resolveToken(tokens, bg);
    ok(a && b, `${surface}: ${fg} en ${bg} lossen op tot een kleur (kreeg ${a}, ${b})`);
    if (!a || !b) continue;
    const r = contrastRatio(a, b);
    ok(r !== null && r >= norm, `${surface}: ${fg} (${a}) op ${bg} (${b}) is ${r && r.toFixed(2)}:1, norm ${norm}`);
  }
}
// elk palettoken is een #rrggbb
for (const [naam, waarde] of Object.entries(parseDsBlocks(tokensCss)[':root'] || {})) {
  if (naam.startsWith('--ds-c-')) ok(/^#[0-9a-f]{6}$/.test(waarde), `${naam} is een #rrggbb (kreeg ${waarde})`);
}
// rolkleuren: elke rol bestaat op beide oppervlakken
{
  const rollen = ['--ds-bg', '--ds-bg-2', '--ds-tx', '--ds-tx-zacht', '--ds-rand', '--ds-focus', '--ds-kop-bg', '--ds-kop-tx', '--ds-primair', '--ds-primair-tx', '--ds-primair-rand',
    '--ds-probleem-vlak', '--ds-probleem-tx', '--ds-probleem', '--ds-selectie-vlak', '--ds-selectie', '--ds-selectie-tx', '--ds-succes-vlak', '--ds-succes-tx', '--ds-succes',
    '--ds-waarschuwing-vlak', '--ds-waarschuwing-tx', '--ds-waarschuwing', '--ds-toets-bg', '--ds-toets-tx', '--ds-tab-bg', '--ds-tab-tx', '--ds-tab-actief-bg', '--ds-tab-actief-tx'];
  for (const surface of ['papier', 'glas']) {
    const tokens = scopeTokens(tokensCss, surface);
    for (const r of rollen) ok(resolveToken(tokens, r), `${surface}: rol ${r} ontbreekt of lost niet op`);
  }
}

// ---------------------------------------------------------------- 2. de contrasttabel in het document

{
  const start = doc.indexOf(CONTRAST_START);
  const end = doc.indexOf(CONTRAST_END);
  ok(start >= 0 && end > start, 'DESIGN_SYSTEM.md heeft de markeringen voor de contrasttabel');
  if (start >= 0 && end > start) {
    const inDoc = doc.slice(start + CONTRAST_START.length, end).trim();
    const verwacht = contrastTableMarkdown(tokensCss).trim();
    ok(inDoc === verwacht, 'de contrasttabel in DESIGN_SYSTEM.md is gelijk aan de tokens (node scripts/ds_tokens_test.mjs --write)');
    // elke genoemde ratio haalt zijn norm
    for (const r of contrastRows(tokensCss)) ok(r.ratio !== null && r.ratio >= r.norm, `tabelrij ${r.surface} ${r.fg}/${r.bg}: ${r.ratio && r.ratio.toFixed(2)} haalt ${r.norm}`);
    for (const surface of ['papier', 'glas']) {
      const rijen = contrastRows(tokensCss).filter((r) => r.surface === surface);
      ok(rijen.length >= 15, `${surface}: de tabel heeft minstens 15 paren (heeft ${rijen.length})`);
    }
  }
}

// ---------------------------------------------------------------- 3. gebruikte variabelen bestaan

{
  const blocks = parseDsBlocks(tokensCss);
  const bekend = new Set();
  for (const map of Object.values(blocks)) for (const k of Object.keys(map)) bekend.add(k);
  // eigen, lokale eigenschappen die een component zelf definieert (--ds-kaart-rand: ...)
  for (const m of componentsCss.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/(--ds-[\w-]+)\s*:/g)) bekend.add(m[1]);
  const zonderCommentaar = componentsCss.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const gebruikt = new Set([...zonderCommentaar.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]));
  const buitenland = new Set(['--menu-min', '--ds-streep-w']); // --menu-min komt van .gm (menu.css), met terugval in het token
  for (const v of gebruikt) ok(bekend.has(v) || buitenland.has(v), `ds-components.css gebruikt ${v}, dat nergens is gedefinieerd`);
  // elk palettoken wordt door een rol gebruikt (geen weesjes)
  const rolTekst = tokensCss.slice(tokensCss.indexOf('/* ---- Rollen'));
  for (const naam of Object.keys(blocks[':root'] || {})) {
    if (!naam.startsWith('--ds-c-')) continue;
    ok(new RegExp(`var\\(${naam}\\)`).test(rolTekst), `palettoken ${naam} wordt door geen rol gebruikt`);
  }
}

// ---------------------------------------------------------------- 4. componentenlijst, klassen en galerij

const blokVan = (naam) => naam.split('__')[0].split('--')[0];
{
  const inCss = new Set();
  for (const m of componentsCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(ds-[a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
    const blok = blokVan(m[1]);
    if (!blok.startsWith('ds-t-')) inCss.add(blok);
  }
  const start = doc.indexOf('<!-- ds-componenten:start -->');
  const end = doc.indexOf('<!-- ds-componenten:end -->');
  ok(start >= 0 && end > start, 'DESIGN_SYSTEM.md heeft de markeringen voor de componentenlijst');
  const inDoc = new Set();
  if (start >= 0 && end > start) {
    for (const rij of doc.slice(start, end).split('\n')) {
      if (!rij.startsWith('| `')) continue;
      const eerste = rij.split('|')[1];
      for (const m of eerste.matchAll(/`\.(ds-[a-z0-9]+(?:-[a-z0-9]+)*)(\*)?`/g)) if (!m[1].startsWith('ds-t-') && !m[2]) inDoc.add(m[1]);
    }
  }
  for (const c of inCss) ok(inDoc.has(c), `klasse .${c} staat in de CSS maar niet in de componentenlijst van DESIGN_SYSTEM.md`);
  for (const c of inDoc) ok(inCss.has(c), `.${c} staat in de componentenlijst maar niet in ds-components.css`);
  ok(/`\.ds-t-\*`/.test(doc), 'de typografierollen (.ds-t-*) staan in de componentenlijst');
  // elke klasse staat in de galerij
  const galerijKlassen = new Set();
  for (const m of galerij.matchAll(/class="([^"]+)"/g)) for (const k of m[1].split(/\s+/)) galerijKlassen.add(blokVan(k));
  for (const c of inCss) {
    if (['ds-papier', 'ds-glas', 'ds-zeef', 'ds-rustig'].includes(c)) { ok(galerij.includes(c) || fs.readFileSync(path.join(ROOT, 'game/js/ds-galerij.js'), 'utf8').includes(c), `de galerij toont ${c}`); continue; }
    ok(galerijKlassen.has(c), `de galerij toont .${c} niet`);
  }
  // alle typografierollen en de toestanden staan in de galerij
  for (const t of ['display', 'kop', 'subkop', 'cijfer', 'body', 'label', 'hulp']) ok(galerij.includes(`ds-t-${t}`), `de galerij toont .ds-t-${t}`);
  for (const t of ['--uit', '--selectie', '--probleem', '--succes', '--waarschuwing', '--secundair', '--gevaar', '--tekst', '--tijd', '--laag', '--dik', '--op', '--neer', '--omgekeerd']) {
    if (new RegExp('\\.ds-[a-z0-9-]+' + t + '(?![\\w-])').test(componentsCss)) ok(galerij.includes(t) || t === '--omgekeerd' || t === '--dik' || t === '--laag' || galerij.includes(`ds-streep${t}`), `de galerij toont de variant ${t}`);
  }
  ok(/disabled/.test(galerij) && /aria-disabled/.test(galerij) && /aria-busy/.test(galerij), 'de galerij toont uitgeschakeld en bezig');
  ok(/lang="nl"/.test(galerij), 'de galerij is Nederlands (lang="nl")');
  ok(!/<link[^>]+href="https?:/i.test(galerij) && !/<script[^>]+src="https?:/i.test(galerij), 'de galerij haalt niets van het netwerk');
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(galerij.replace(/<!--[\s\S]*?-->/g, '').replace(/&#\d+;/g, '').replace(/href="#[\w-]+"/g, '').replace(/id="#?[\w-]+"/g, '')), 'de galerij gebruikt geen losse hex');
}

// ---------------------------------------------------------------- 5. lintregels

{
  const echt = checkDsFiles({ tokensCss, componentsCss });
  ok(echt.length === 0, `de lint geeft niets op de echte ds-bestanden (kreeg ${echt.map((f) => `${f.bewijs[0]} -> ${f.titel}`).join(' | ')})`);
  for (const [file, text] of [[TOKENS, tokensCss], [COMPONENTS, componentsCss], [GALERIJ, galerij]]) {
    text.split('\n').forEach((regel, i) => {
      const f = checkDesignLine({ file, line: i + 1, text: regel });
      if (f.length) ok(false, `${file}:${i + 1} geeft ${f.map((x) => x.titel).join(', ')}`);
    });
  }
  controles += 1; // de lus telt als één controle als alles schoon was

  const comp = (text) => checkDsLine({ file: COMPONENTS, line: 1, text });
  const tok = (text) => checkDsLine({ file: TOKENS, line: 1, text });
  const titels = (f) => f.map((x) => x.titel).join(' | ');
  ok(comp('  color: #ff00ff;').some((f) => f.titel.includes('Losse kleur')), 'hex in componenten wordt geweigerd');
  ok(comp('  background: rgba(0, 0, 0, 0.2);').some((f) => f.titel.includes('Losse kleur')), 'rgba in componenten wordt geweigerd');
  ok(comp('  color: var(--ds-tx, #000);').some((f) => f.titel.includes('Losse kleur')), 'een hex als var()-terugval wordt in componenten ook geweigerd');
  ok(comp('  font-size: 12px;').some((f) => f.titel.includes('onder 13 px')), '12 px in componenten wordt geweigerd');
  ok(comp('  font-size: var(--ds-t-toets);').length === 0, 'het toetstoken zelf geeft geen regelmelding (het bestandscontrole beperkt het tot .ds-badge)');
  ok(comp('  font-size: 16px;').some((f) => f.titel.includes('Losse lettergrootte')), 'een losse px-lettergrootte krijgt een waarschuwing');
  ok(comp('  padding: 10px 6px;').some((f) => f.titel.includes('Losse px')), 'losse px voor ruimte krijgt een waarschuwing');
  ok(comp('  padding: var(--ds-s-2) var(--ds-s-4);').length === 0, 'ruimte uit tokens is goed');
  ok(comp('  background: linear-gradient(red, blue);').some((f) => f.titel.includes('Verloop')), 'een verloop wordt gemeld');
  ok(comp('  transition: opacity 400ms;').some((f) => f.titel.includes('250')), 'beweging boven 250 ms wordt geweigerd');
  ok(comp('  transition: opacity var(--ds-m) var(--ds-ease);').length === 0, 'beweging uit tokens is goed');
  ok(tok('  --ds-x: #123456;').some((f) => f.titel.includes('Hex buiten het palet')), 'hex buiten --ds-c-* wordt geweigerd in de tokens');
  ok(tok('  --ds-c-x: #123456;').length === 0, 'hex als --ds-c-* palet is goed');
  ok(tok('  --ds-bg: rgba(0, 0, 0, 0.5);').some((f) => f.titel.includes('rgba')), 'rgba buiten een schaduw wordt geweigerd');
  ok(tok('  --ds-schaduw: 0 1px 2px rgba(0, 0, 0, 0.2);').length === 0, 'rgba in een schaduw is goed');
  ok(tok('  --ds-t-body: 12px;').some((f) => f.titel.includes('onder 13')), 'een lettergrootte-token onder 13 px wordt geweigerd');
  ok(tok('  --ds-t-toets: 12px;').length === 0, 'de toetsmaat 12 px is goed');
  ok(tok('  --ds-s-3: 10px;').some((f) => f.titel.includes('4-px')), 'ruimte buiten de 4-px-basis wordt gemeld');
  ok(tok('  --ds-m: 300ms;').some((f) => f.titel.includes('250')), 'een beweging-token boven 250 ms wordt geweigerd');
  ok(tok('  --ds-m-max: 250ms;').length === 0, `250 ms is de grens en is goed (${DS_MAX_MOTION_MS})`);
  ok(checkDsLine({ file: 'game/js/menu.css', line: 1, text: '  color: #ff00ff;' }).length === 0, 'de ds-regels raken andere bestanden niet');
  // bestandsregels: reduced-motion, focus, toetsmaat buiten het toetsplaatje
  const zonder = checkDsFiles({ tokensCss, componentsCss: componentsCss.replace(/prefers-reduced-motion/g, 'x').replace(/html\.reduce-motion/g, 'html.x') });
  ok(zonder.some((f) => f.titel.includes('Reduced-motion')), 'ontbrekende reduced-motion in de componenten wordt gemeld');
  const zonderFocus = checkDsFiles({ tokensCss, componentsCss: componentsCss.replace(/:focus-visible/g, ':hover') });
  ok(zonderFocus.some((f) => f.titel.includes('Focusring')), 'een ontbrekende focusring wordt gemeld');
  const toetsElders = checkDsFiles({ tokensCss, componentsCss: `${componentsCss}\n.ds-chip { font-size: var(--ds-t-toets); }\n` });
  ok(toetsElders.some((f) => f.titel.includes('Toetsmaat')), 'de toetsmaat op een ander element wordt geweigerd');
  ok(checkDsFiles({ tokensCss: tokensCss.replace(/html\.reduce-motion/g, 'html.x'), componentsCss }).some((f) => f.titel.includes('ds-tokens.css')), 'reduced-motion ontbreekt in de tokens wordt gemeld');
}

// ---------------------------------------------------------------- 6. tokengrenzen en vormtaal

{
  const root = parseDsBlocks(tokensCss)[':root'] || {};
  for (const [naam, waarde] of Object.entries(root)) {
    if (/^--ds-t-/.test(naam) && /px/.test(waarde)) {
      const min = Math.min(...[...waarde.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])));
      ok(naam === '--ds-t-toets' ? min === 12 : min >= 13, `${naam} (${waarde}): ${naam === '--ds-t-toets' ? 'precies 12' : 'minstens 13'} px`);
    }
    if (/^--ds-s-\d$/.test(naam)) ok(Number.parseFloat(waarde) % 4 === 0, `${naam} ${waarde} ligt op de 4-px-basis`);
    if (/^--ds-m(?:-|$)/.test(naam) && /ms/.test(waarde)) ok(Number.parseFloat(waarde) <= DS_MAX_MOTION_MS, `${naam} ${waarde} is hooguit ${DS_MAX_MOTION_MS} ms`);
  }
  ok(Object.keys(root).filter((k) => /^--ds-r(?:-|$)/.test(k)).length === 3, 'drie radiustokens: --ds-r, --ds-r-pil, --ds-r-toets');
  const radii = [...componentsCss.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  for (const r of radii) ok(/^(?:var\(--ds-r(?:-pil|-toets)?\)|calc\(var\(--ds-r\) - var\(--ds-lijn\)\)(?: calc\(var\(--ds-r\) - var\(--ds-lijn\)\))* 0 0)$/.test(r), `border-radius ${r} komt uit de radiustokens`);
  ok(!/gradient\(/.test(componentsCss), 'geen verloop in de componenten');
  // zeefdruk: alleen de harde misdruk (text-shadow: var(--ds-misdruk), zonder blur) mag een tekstschaduw zijn
  ok([...componentsCss.matchAll(/text-shadow\s*:\s*([^;}]+)/g)].every((m) => /^(?:var\(--ds-misdruk\)|none)$/.test(m[1].trim())) && !/filter\s*:/.test(componentsCss), 'geen glans (tekstschaduw buiten --ds-misdruk, of filter) in de componenten');
  ok(/prefers-reduced-motion/.test(tokensCss) && /html\.reduce-motion/.test(tokensCss), 'de beweging-tokens worden nul bij "Beweging beperken"');
  ok(/font-family:\s*'Bebas Neue', 'Arial Narrow', Arial, sans-serif/.test(tokensCss.replace('--ds-font-kop:', 'font-family:')), 'de kopletter is de vaste stack');
  // de 12 px-regel: hooguit één component gebruikt --ds-t-toets (het toetsplaatje)
  const toetsGebruik = [...componentsCss.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/([^{}]+)\{([^{}]*--ds-t-toets[^{}]*)\}/g)].map((m) => m[1].trim());
  ok(toetsGebruik.every((k) => /toets/.test(k)), `alleen een toetsplaatje gebruikt --ds-t-toets (kreeg ${toetsGebruik.join(', ')})`);
  // het spel laadt de tokens vóór de componenten, met precies één link per bestand
  const indexHtml = rd('game/index.html');
  ok(/<link rel="stylesheet" href="js\/ds-tokens\.css">/.test(indexHtml) && /<link rel="stylesheet" href="js\/ds-components\.css">/.test(indexHtml) && indexHtml.indexOf('ds-tokens.css') < indexHtml.indexOf('ds-components.css') && indexHtml.split('ds-tokens.css').length === 2 && indexHtml.split('ds-components.css').length === 2, 'game/index.html laadt ds-tokens.css en daarna ds-components.css, elk één keer (fase 2)');
  ok(/## Tokens and components in use/.test(doc) && /## The design system: summer screen print/.test(doc), 'DESIGN_SYSTEM.md heeft de hoofdstukken over de zeefdruk en over de tokens en componenten');
  ok(!/v[123]|Direction change/.test(doc), 'DESIGN_SYSTEM.md noemt geen versielabels meer: er is één designsysteem');
}

// ---------------------------------------------------------------- 4. besluit eigenaar 20-11: selectie is bordgroen, één gele knop per scherm

{
  for (const surface of ['papier', 'glas']) {
    const tokens = scopeTokens(tokensCss, surface);
    const hex = resolveToken(tokens, '--ds-selectie');
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex || '');
    const [r, g, b] = m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [0, 0, 0];
    ok(m && g > r && g > b, `${surface}: --ds-selectie is bordgroen, geen blauw (kreeg ${hex})`);
  }
  ok(/Selection is bordgroen, not blue/.test(doc), 'DESIGN_SYSTEM.md noemt het besluit: selectie is bordgroen');
  // een lijst met kaarten heeft omlijnde knoppen: de gele hoofdknop staat in het detail (todoui.js) of in de ene volgende stap
  const todo = rd('game/js/todoui.js');
  const kaart = todo.slice(todo.indexOf('function beginCard('), todo.indexOf('function beginHierHtml('));
  // #1267 (hertest 24-11): "Zet als doel" en "Op de kaart" staan op één plek, het detail; de lijstkaart zelf heeft geen knoppen meer
  ok(!kaart.includes('data-todo-goal') && !kaart.includes('data-todo-map') && !kaart.includes('td-card-acts'), 'Begin-hier-kaarten: geen eigen "Zet als doel" of "Op de kaart" (alleen in het detail)');
  const detail = todo.slice(todo.indexOf('function detailHtml('));
  ok(detail.includes('data-todo-goal') && detail.includes('data-todo-map'), 'het detail houdt "Zet als doel" en "Op de kaart"');
  ok(!/td-next-acts[^`]*class="ds-knop"/.test(todo), 'de knop in de kaart "Waar je nu bent" is omlijnd');
  ok(!/class="ds-knop sm-oplossing"/.test(rd('game/js/shopui.js')), 'de winkel: de oplossing in de callout is omlijnd naast de gele koopknop');
}

// ---------------------------------------------------------------- 7. zeefdrukcomponenten (#992)

{
  const root = parseDsBlocks(tokensCss);
  const basis = root[':root'] || {};
  const rustigSel = 'html.rustig-drukwerk, .ds-rustig';
  const rustig = { ...basis, ...(root[rustigSel] || {}) };
  ok(Object.keys(root).includes(rustigSel), 'ds-tokens.css heeft het blok html.rustig-drukwerk, .ds-rustig');
  const comp = componentsCss.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const blokken = ['knop', 'kaart', 'chip', 'tab', 'rij', 'toets', 'stempel', 'bon', 'leeg', 'balk', 'waarde'];
  for (const b of blokken) ok(new RegExp(`\\.ds-z-${b}\\b`).test(comp), `component .ds-z-${b} staat in ds-components.css`);
  // de staten die het plan noemt
  for (const staat of ['.ds-z-knop--secundair', '.ds-z-knop--ghost', '.ds-z-knop:active', '.ds-z-knop:disabled', '.ds-z-kaart__kop', '.ds-z-kaart--selectie', '.ds-z-kaart--uit', '.ds-z-chip--probleem', '.ds-z-tab[aria-selected="true"]', '.ds-z-rij--selectie', '.ds-z-toets--druk', '.ds-z-stempel--in', '.ds-z-bon__totaal', '.ds-z-leeg__beeld', '.ds-z-balk__vul', '.ds-z-waarde--wijzig']) {
    ok(comp.includes(staat), `ds-components.css heeft ${staat}`);
  }
  // alleen tokens: geen letterfamilie buiten var(--ds-font-*), geen losse hex, geen losse duur in het zeefdrukdeel
  const zeef = comp.slice(comp.indexOf(':where(.ds-zeef) *'));
  ok(zeef.length > 500, 'het zeefdrukdeel is te vinden in ds-components.css');
  ok(!/font-family\s*:\s*(?!\s|var\(--ds-font-)/.test(zeef), 'zeefdruk: elke font-family komt uit een --ds-font-* token');
  ok(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(zeef.replace(/content:\s*"[^"]*"/g, '')), 'zeefdruk: geen losse kleur');
  ok(!/\b\d+(?:\.\d+)?ms\b/.test(zeef), 'zeefdruk: elke duur komt uit een --ds-m* token');
  ok(/animation\s*:[^;]*var\(--ds-m(?:-max)?\)/.test(zeef), 'zeefdruk: animaties lopen op een --ds-m* token');
  // een ingedrukte knop schuift precies de schaduwverschuiving op
  ok(/\.ds-z-knop:active\s*\{[^}]*translate\(var\(--ds-hard-x\), var\(--ds-hard-y\)\)[^}]*box-shadow:\s*none/.test(zeef), 'een ingedrukte knop schuift de schaduwverschuiving op en verliest de schaduw');
  ok(basis['--ds-hard-x'] === '4px' && basis['--ds-hard-y'] === '4px' && /var\(--ds-hard-x\) var\(--ds-hard-y\)/.test(basis['--ds-schaduw-hard'] || ''), 'de harde schaduw gebruikt dezelfde verschuiving als de ingedrukte staat');
  // Rustig drukwerk: misdruk, schuinte, raster en beweging nul
  ok(rustig['--ds-misdruk-x'] === '0px' && rustig['--ds-misdruk-y'] === '0px', 'Rustig drukwerk: geen misdruk');
  ok(rustig['--ds-schuin'] === '0deg', 'Rustig drukwerk: geen schuinte');
  ok(rustig['--ds-raster'] === 'none' && rustig['--ds-raster-dekking'] === '0', 'Rustig drukwerk: geen raster');
  ok(['--ds-m-snel', '--ds-m', '--ds-m-max'].every((k) => rustig[k] === '0ms'), 'Rustig drukwerk: geen beweging');
  ok(/:is\(html\.rustig-drukwerk, \.ds-rustig\)/.test(comp), 'ds-components.css heeft de Rustig-drukwerk-regels voor de zeefdrukcomponenten');
  // de zeefdruktekstparen: 4,5 in gewone druk, 7 in Rustig drukwerk
  const tekstParen = [
    ['--ds-c-ink-inkt', '--ds-c-ink-papier', 'tekst op papier'],
    ['--ds-c-inkt-zacht', '--ds-c-ink-papier', 'zachte tekst op papier'],
    ['--ds-c-ink-inkt', '--ds-c-ink-geel', 'knoptekst op geel'],
    ['--ds-c-ink-inkt', '--ds-c-geel-hover', 'knoptekst op geel (hover)'],
    ['--ds-c-ink-inkt', '--ds-c-geel-druk', 'knoptekst op geel (ingedrukt)'],
    ['--ds-c-wit', '--ds-c-ink-bord', 'koptekst op bordgroen'],
    ['--ds-c-ink-papier', '--ds-c-ink-inkt', 'actieve tab: papier op inkt'],
    ['--ds-c-ink-inkt', '--ds-c-sel-vlak', 'tekst op selectie'],
    ['--ds-c-rood-tx', '--ds-c-rood-vlak', 'probleemtekst'],
    ['--ds-c-rood-tx', '--ds-c-ink-papier', 'gevaartekst op papier'],
    ['--ds-c-groen-tx', '--ds-c-groen-vlak', 'succestekst'],
    ['--ds-c-ink-bord', '--ds-c-ink-papier', 'stempeltekst in bordgroen'],
  ];
  for (const [fg, bg, wat] of tekstParen) {
    const n = contrastRatio(resolveToken(basis, fg), resolveToken(basis, bg));
    const r = contrastRatio(resolveToken(rustig, fg), resolveToken(rustig, bg));
    ok(n !== null && n >= 4.5, `zeefdruk ${wat}: ${n && n.toFixed(2)}:1 haalt 4,5`);
    ok(r !== null && r >= 7, `zeefdruk Rustig drukwerk ${wat}: ${r && r.toFixed(2)}:1 haalt 7`);
  }
  // randen en vullingen halen 3:1
  for (const [fg, bg, wat] of [['--ds-c-ink-inkt', '--ds-c-ink-papier', 'inktrand'], ['--ds-c-ink-bord', '--ds-c-ink-papier', 'bordgroene rand'], ['--ds-c-rood', '--ds-c-ink-papier', 'gevaarrand']]) {
    for (const [naam, map] of [['gewone druk', basis], ['Rustig drukwerk', rustig]]) {
      const r = contrastRatio(resolveToken(map, fg), resolveToken(map, bg));
      ok(r !== null && r >= 3, `zeefdruk ${naam} ${wat}: ${r && r.toFixed(2)}:1 haalt 3`);
    }
  }
  // roze is nooit tekst (alleen misdruk en schaduw)
  ok(!/[^-]color\s*:\s*var\(--ds-c-ink-roze\)/.test(zeef), 'zeefdruk: roze is nooit een tekstkleur');
  // de galerij toont elk zeefdrukonderdeel in Rustig drukwerk
  const js = rd('game/js/ds-galerij.js');
  ok(/data-demo-zeef/.test(galerij) && /ds-rustig/.test(js) && /rustig-drukwerk/.test(js), 'de galerij toont elk zeefdrukcomponent ook in Rustig drukwerk');
  for (const staat of ['g-druk', 'g-focus', 'disabled', 'aria-busy', 'ds-z-stempel--in', 'ds-z-kaart--uit', 'ds-z-waarde--wijzig']) ok(galerij.includes(staat), `de galerij toont de zeefdrukstaat ${staat}`);
}

console.log(`\nds_tokens_test: ${controles} controles, ${fouten} fout${fouten === 1 ? '' : 'en'}`);
process.exit(fouten ? 1 : 0);
