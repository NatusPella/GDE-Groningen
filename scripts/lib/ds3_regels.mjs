// Pure kern van de ds3-telling (zonder fs of git), zodat ook de regelaudit (scripts/release/design_rules.mjs) hem per diffregel kan gebruiken.
// Zie ds3_telling.mjs voor het lezen van de bestanden en ds3_dekking_test.mjs voor de ratel.

export const SOORTEN = ['kleur', 'glas', 'oud', 'font', 'klein', 'lus', 'lang', 'emoji', 'svg'];
// Nieuwe soorten (ds3-vervolg 21-11, F5, F6, F15, F16): lus = een oneindige animatie, lang = een animatie of transitie boven 250 ms,
// emoji = een echte emoji in spelertekst (Phosphor, ADR 0041), svg = een eigen <svg> buiten icons.js. Een regel met `ds3-dwell` (een verblijftijd
// of wachttimer, geen beweging), `ds3-film` (een scène of cutscene: de speler kijkt, geen UI-beweging), `ds3-lus` (de bel en de live-stip, bewust) of `ds3-uitzondering` telt niet.

// Bestanden die bewust buiten de telling vallen: definitie, 3D, canvas in de wereld, debug.
// Elke regel heeft een reden; een bestand dat hier niet staat telt mee.
export const BEWUST = {
  'game/js/ds-tokens.css': 'de definitie van het palet (hex hoort hier, en alleen hier)',
  'game/js/ds-galerij.js': 'de galerij toont de oude set als referentie naast de zeefdruk',
  'game/ds-galerij.html': 'de galerij toont de oude set als referentie',
  'game/fonts/fonts.css': 'de @font-face-regels van de zelf gehoste lettertypen',
  'game/cutpreview.html': 'ontwikkelaarstool voor het bekijken van cutscenes, geen speler-UI',
  // Alleen met een URL-vlag of --dev geladen (main.js importeert ze dan pas): ontwikkelaarsgereedschap, geen speler-UI.
  'game/js/testmenu.js': 'ontwikkelaarsmenu (?testmenu, F10): alleen met de vlag geladen, eigen opslag',
  'game/js/storydev.js': 'ontwikkelaarspaneel (?dev, F9): alleen met de vlag geladen',
  'game/js/storytest.js': 'geautomatiseerde verhaaltest (?storytest): alleen met de vlag geladen',
  'game/js/sfx/sfxtest.js': 'geluidentestpaneel (?sfxtest, F8): alleen met de vlag geladen',
  'game/js/cutpreviewui.js': 'ontwikkelaarsvenster voor de cutscene-preview (cutpreview.html)',
};
// Kaartstijl op canvas en identiteitstabellen: data, geen UI-oppervlak. (3D-materialen en canvas tellen niet mee: de telling kijkt in JS alleen naar CSS-declaraties.)
export const BEWUST_PATROON = [
  [/^game\/js\/(?:mapstyle|kaartkleuren|minimap\w*|mapview|mapdraw\w*|mapicons?|kaarticons?)\.js$/, 'kaartstijl op canvas (eigen kaartpalet, ADR/WERELDKLEUREN)'],
  [/^game\/js\/(?:a11y|colorblind|kleurenblind)\.js$/, 'de kleurenblindpaletten zijn data'],
  [/^game\/js\/(?:coopidentiteit|ctxidentiteit|minigamekit)\.js$/, 'identiteitskleuren per speler en context (een tabel, bewust)'],
];

// Eigen <svg> die geen icoon is maar meetgeometrie of een toetsvorm (F6): Phosphor kent daar geen equivalent voor, en de vorm hangt van data af
// (voortgangsring, wijzerplaat, kompas- of windpijl, richtkijker, muis- en controllervormen). Alleen hier mag een bestand eigen <svg> houden
// zonder dat de ratel (soort svg) hem telt; een echt icoon hoort via icons.js (scripts/ui/phosphor_kies.mjs, ADR 0041).
export const SVG_GEOMETRIE = [
  [/^game\/js\/keycap\.js$/, 'toetsplaatjes: de muisvorm en de houdring zijn geometrie van het toetsplaatje'],
  [/^game\/js\/glyphs\.js$/, 'controllervormen (d-pad, PlayStation-symbolen) zijn toetsvormen, geen iconen'],
  [/^game\/js\/(?:heistui|trailer|cinematics)\.js$/, 'wijzerplaat en voortgangsring (skip-ring) zijn meetgeometrie met data-afhankelijke dash-lengte'],
  [/^game\/js\/(?:helirun|zeilvaren)\.js$/, 'richtings- en windpijl draait mee met de data: geometrie, geen icoon'],
  [/^game\/js\/aimassist\.js$/, 'richtkijker en richtcirkel zijn meetgeometrie'],
];
const svgGeometrie = (f) => SVG_GEOMETRIE.some(([re]) => re.test(f));

export function bewustReden(f) {
  if (BEWUST[f]) return BEWUST[f];
  for (const [re, reden] of BEWUST_PATROON) if (reden && re.test(f)) return reden;
  return null;
}

// Commentaar eruit; in JS blijven strings staan (daar zit de CSS in).
function zonderCommentaar(src, css) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  if (!css) s = s.replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
  s = s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  return s;
}

const KLEUR_CONTEXT = /(?:color|background(?:-color)?|border(?:-[a-z]+)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|--[\w-]+|stopColor|fillStyle|strokeStyle|\.style\b|cssText|style\s*=)\s*[:=(]?/i;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;
const RGB = /\brgba?\(\s*\d/g;

// Echte emoji: alles met emoji-presentatie, een teken uit 2190 tot 2BFF met FE0F erachter (bijvoorbeeld het hart), en de drie tekens uit F5 die
// zonder FE0F al als emoji getekend worden. Pijlen, sterren, vinkjes en andere tekstsymbolen zijn F7 en tellen hier niet mee.
// (De codepunten staan als getallen, zodat geen editor of harnas er een ander teken van maakt.)
const CH = (...c) => c.map((x) => String.fromCharCode(x)).join('');
const EMOJI = new RegExp('\\p{Emoji_Presentation}|[' + CH(0x2190) + '-' + CH(0x2BFF) + ']' + CH(0xFE0F) + '|[' + CH(0x2709, 0x263A, 0x26F4) + ']', 'u');

/** Telt per regel; `regel` geeft de regelnummers terug voor de lijst. */
export function telBestand(f, src) {
  const css = /\.css$/.test(f);
  const html = /\.html$/.test(f);
  const schoon = zonderCommentaar(src, css);
  const ruw = src.split('\n');
  const n = Object.fromEntries(SOORTEN.map((x) => [x, 0]));
  const regels = [];
  schoon.split('\n').forEach((l, i) => {
    if (!l.trim()) return;
    // een var(--x, #hex)-terugval is de token; die telt niet
    const k = l.replace(/var\(\s*--[\w-]+\s*,\s*[^)]*\)/g, 'var()');
    let kleur = 0;
    // CSS: elke regel. JS en HTML: alleen een echte CSS-declaratie (`color: #abc;`, ook in een sjabloon) of een
    // `.style.x = '#abc'`; een datatabel (`color: '#abc'`), 3D-materiaal of canvas (fillStyle) telt niet. Elke kleur telt één keer,
    // ook als hij in twee van die contexten tegelijk valt (een declaratie in een cssText-sjabloon).
    const bereiken = [];
    if (css) bereiken.push([0, k.length]);
    else {
      const voeg = (m, groep) => { const s = m.index + m[0].lastIndexOf(m[groep]); bereiken.push([s, s + m[groep].length]); };
      for (const m of k.matchAll(/(?:^|[\s;{"'`])(?:color|background(?:-color|-image)?|border(?:-[a-z]+)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|--[\w-]+)\s*:\s*([^'"`,;{}]*(?:\([^)]*\)[^'"`,;{}]*)*)/gi)) voeg(m, 1);
      for (const m of k.matchAll(/\.style(?:\.\w+|\[[^\]]+\])\s*=\s*(['"`])([^'"`]*)\1/g)) voeg(m, 2);
      for (const m of k.matchAll(/style\s*=\s*\\?["']([^"']*)["']/g)) voeg(m, 1);
    }
    const binnen = (i) => bereiken.some(([a, b]) => i >= a && i < b);
    for (const m of k.matchAll(HEX)) {
      if (!binnen(m.index)) continue;
      if (/^#(?:000|000000|fff|ffffff)$/i.test(m[0]) && /shadow|filter/i.test(k)) continue; // slagschaduw is chroom
      kleur++;
    }
    for (const m of k.matchAll(RGB)) {
      if (!binnen(m.index)) continue;
      const r = k.slice(m.index).match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (r && r[1] === '0' && r[2] === '0' && r[3] === '0' && /shadow|filter/i.test(k)) continue; // slagschaduw
      kleur++;
    }
    const stijl = css || html || bereiken.length > 0 || /\.style\b|cssText|<style/.test(k);
    let glas = 0;
    if (/--gron-green/.test(k)) glas++;
    // een echte blur of saturatie achter het paneel; `backdrop-filter: none` is juist de zeefdrukvariant
    if (/backdrop-filter\s*:\s*(?!none)/.test(k)) glas++;
    // een zacht verloop (glans of schaduwvlak); een rasterstip, een streeppatroon (repeating-) en een mask (alleen alfa) zijn geen glas
    if (/(?:radial|linear|conic)-gradient\(/.test(k) && stijl && !/repeating-|mask|--ds-raster|1\.1px/.test(k)) glas++;
    // het donkere glas (.gm); .gm-zeef is de zeefdrukvariant daarvan
    if (/(?:^|[\s"'`{,.>+~(])\.gm(?![\w-])|class\s*=\s*["'`][^"'`]*\bgm\b|classList\.(?:add|toggle)\(\s*['"]gm['"]/.test(k) && !/gm-zeef/.test(k)) glas++;
    let oud = 0;
    if (/\bds-(?:kaart|knop|chip|papier|glas|streep)\b/.test(k)) oud++;
    let font = 0;
    for (const m of k.matchAll(/font-family\s*:\s*([^;}`'"]+(?:['"][^;}]*)?)/gi)) {
      const v = m[1].trim();
      if (v && !/^var\(/.test(v) && !/^(?:inherit|initial|unset|revert|monospace)\b/.test(v)) font++;
    }
    for (const m of k.matchAll(/\bfont\s*:\s*[^;}]*?\d+(?:\.\d+)?px[^;}]*?['"]?[A-Za-z][A-Za-z ]+['"]?\s*(?:,|;|\}|$)/gi)) { if (!/var\(/.test(m[0])) font++; }
    let klein = 0;
    if (!/keycap|toetsplaatje|\.key\b|m-kc|\bkbd\b|key-chip|hud-key/i.test(k)) {
      for (const m of k.matchAll(/font-size\s*:\s*([^;}]{1,60})/gi)) {
        if (/max\(\s*1[3-9]|var\(/.test(m[1])) continue;
        const px = [...m[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
        if (px.some((v) => v < 13)) klein++;
      }
      for (const m of k.matchAll(/\bfont\s*:\s*(?:[a-z0-9 ]+\s)?(\d+(?:\.\d+)?)px/gi)) if (Number(m[1]) < 13) klein++;
    }
    // beweging: alleen declaraties (animation, transition); de tijd in een var(--x, 5s) is al weggehaald in k
    let lus = 0, lang = 0;
    if (stijl && /\banimation(?:-[a-z-]+)?\s*:|\btransition(?:-[a-z-]+)?\s*:/.test(k) && !/ds3-(?:dwell|film|uitzondering)/.test(ruw[i] || '')) {
      if (/\binfinite\b/.test(k) && !/ds3-lus/.test(ruw[i] || '')) lus++;
      const dec = k.match(/\b(?:animation|transition)(?:-duration)?\s*:[^;}]*/g) || [];
      if (dec.some((d) => [...d.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].some((m) => (m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1])) > 250))) lang++;
    }
    // echte emoji in spelertekst (geen tekstsymbolen als pijlen of sterren; die zijn F7)
    const emoji = EMOJI.test(k) && !/ds3-uitzondering/.test(ruw[i] || '') ? 1 : 0;
    // een eigen <svg> (icons.js en phosphordata.js zijn de ene bron)
    const svg = !css && !svgGeometrie(f) && !/(?:^|\/)(?:icons|phosphordata)\.js$/.test(f) && /<svg\b/.test(k) && !/ds3-uitzondering/.test(ruw[i] || '') ? 1 : 0;
    const tel = { kleur, glas, oud, font, klein, lus, lang, emoji, svg };
    for (const s of SOORTEN) n[s] += tel[s] || 0;
    if (SOORTEN.some((s) => tel[s])) regels.push({ r: i + 1, t: l.trim().slice(0, 150), ...tel });
  });
  return { n, regels };
}
