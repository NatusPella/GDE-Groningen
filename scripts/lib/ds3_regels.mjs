// De regels van "Microanimaties (DS3)" als code (DESIGN_SYSTEM.md, ui-taal.md): een kleine CSS-lezer en de controle
// die game/js/ds-micro.css moet doorstaan. Pure functies, geen bestanden lezen; scripts/ds3_dekking_test.mjs gebruikt
// dit voor de echte css en voor opzettelijk foute voorbeelden. Geen browser nodig.

// Wat een overgang of keyframe mag veranderen: compositor-eigenschappen. Verf (box-shadow) alleen op de knop.
export const TOEGESTAAN = ['opacity', 'transform', 'translate', 'scale', 'rotate'];
export const VERF_KNOP = ['box-shadow'];
export const VERBODEN = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'filter', 'font-size', 'all', 'blur'];
export const MAX_MICRO_MS = 250;
export const MAX_MOMENT_MS = 1600;

export const stripReacties = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Splitst op een teken dat niet tussen haakjes staat.
export function splitBuiten(tekst, teken) {
  const delen = [];
  let diepte = 0, deel = '';
  for (const ch of tekst) {
    if (ch === '(') diepte++;
    if (ch === ')') diepte--;
    if (ch === teken && diepte === 0) { delen.push(deel); deel = ''; } else deel += ch;
  }
  if (deel.trim()) delen.push(deel);
  return delen;
}

export function declaraties(body) {
  const uit = [];
  for (const d of splitBuiten(body, ';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    uit.push({ prop: d.slice(0, i).trim().toLowerCase(), waarde: d.slice(i + 1).trim() });
  }
  return uit;
}

// { regels: [{ selector, body, context: [] }], keyframes: [{ naam, frames: [{ selector, body }] }] }
export function leesCss(css, context = [], uit = { regels: [], keyframes: [] }) {
  const tekst = stripReacties(css);
  let i = 0;
  while (i < tekst.length) {
    const open = tekst.indexOf('{', i);
    if (open < 0) break;
    const prelude = tekst.slice(i, open).trim();
    let diepte = 1, j = open + 1;
    while (j < tekst.length && diepte > 0) { if (tekst[j] === '{') diepte++; else if (tekst[j] === '}') diepte--; j++; }
    const body = tekst.slice(open + 1, j - 1);
    if (/^@keyframes\s/.test(prelude)) {
      const frames = leesCss(body, [], { regels: [], keyframes: [] }).regels.map((r) => ({ selector: r.selector, body: r.body }));
      uit.keyframes.push({ naam: prelude.replace(/^@keyframes\s+/, '').trim(), frames });
    } else if (/^@(media|supports)/.test(prelude)) {
      leesCss(body, [...context, prelude.replace(/\s+/g, ' ')], uit);
    } else if (prelude) {
      uit.regels.push({ selector: prelude.replace(/\s+/g, ' '), body, context });
    }
    i = j;
  }
  return uit;
}

const klassenIn = (selector) => [...selector.matchAll(/\.(ds-(?:m|moment)-[a-z0-9_-]+)/g)].map((m) => m[1]);
const kaal = (waarde) => { let v = waarde; for (let k = 0; k < 6; k++) v = v.replace(/var\([^()]*\)/g, ' '); return v; };
const heeftBeweging = (body) => declaraties(body).some((d) => /^(transition|animation)/.test(d.prop) && !/^(transition|animation)(-duration|-delay)?$/.test(d.prop) === false);

export function microKlassen(css) {
  const { regels } = leesCss(css);
  const set = new Set();
  for (const r of regels) {
    if (r.context.length) continue;
    const beweging = declaraties(r.body).filter((d) => /^(transition|animation)/.test(d.prop));
    if (!beweging.length) continue;
    if (beweging.every((d) => d.prop === 'animation' && d.waarde === 'none')) continue; // een uit-regel (overslaan)
    for (const k of klassenIn(r.selector)) set.add(k);
  }
  return [...set].sort();
}

// Eén lijst met overtredingen: { regel, bericht }.
export function controleerMicroCss(css, { tokensCss = '' } = {}) {
  const f = [];
  const fout = (regel, bericht) => f.push({ regel, bericht });
  const { regels, keyframes } = leesCss(css);
  const kaalCss = stripReacties(css);

  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(kaalCss)) fout('kleur', 'een losse kleur: gebruik een inkt-token (var(--ds-c-ink-...))');

  for (const r of regels) {
    if (r.context.some((c) => /prefers-reduced-motion/.test(c)) || /^html\.(reduce-motion|rustig-drukwerk)/.test(r.selector)) continue; // de takken
    const decls = declaraties(r.body);
    const heeftKnop = /\.ds-m-knop\b/.test(r.selector);
    const microFamilie = /\.ds-m-/.test(r.selector) && !/\.ds-moment-/.test(r.selector);
    for (const d of decls) {
      if (d.prop === 'transition' || d.prop === 'transition-property') {
        const props = d.prop === 'transition'
          ? splitBuiten(d.waarde, ',').map((p) => p.trim().split(/\s+/)[0])
          : splitBuiten(d.waarde, ',').map((p) => p.trim());
        for (const p of props) {
          if (VERBODEN.includes(p)) fout(r.selector, `transition op ${p} (layout, filter of alles)`);
          else if (!TOEGESTAAN.includes(p) && !(VERF_KNOP.includes(p) && heeftKnop)) fout(r.selector, `transition op ${p}: alleen ${TOEGESTAAN.join(', ')} (box-shadow alleen op .ds-m-knop)`);
        }
      }
      if (/^(transition|animation)/.test(d.prop)) {
        const k = kaal(d.waarde);
        for (const m of k.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
          const ms = m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]);
          if (ms !== 0) fout(r.selector, `een letterlijke tijd (${m[0]}): gebruik een --ds-m-* of --ds-moment-* token`);
        }
        const tokens = [...d.waarde.matchAll(/var\(--ds-(m|moment)-([a-z]+)/g)].map((m) => `--ds-${m[1]}-${m[2]}`);
        if (microFamilie && !/stip--live/.test(r.selector) && tokens.some((t) => t.startsWith('--ds-moment-'))) fout(r.selector, 'een .ds-m-* regel gebruikt een --ds-moment-* tijd (boven 250 ms)');
        if (/\binfinite\b/.test(d.waarde) && !/stip--live/.test(r.selector)) fout(r.selector, 'een lus (infinite) buiten .ds-m-stip--live');
      }
      if (d.prop === 'animation-iteration-count' && !/^1$/.test(d.waarde) && !/stip--live/.test(r.selector)) fout(r.selector, 'animation-iteration-count is niet 1');
    }
  }
  for (const k of keyframes) {
    for (const fr of k.frames) for (const d of declaraties(fr.body)) {
      if (!TOEGESTAAN.includes(d.prop)) fout(`@keyframes ${k.naam}`, `animeert ${d.prop}: alleen ${TOEGESTAAN.join(', ')}`);
    }
  }

  // Reduced motion: elke klasse met beweging staat in alle drie de takken, en de tak zet alles uit.
  const klassen = microKlassen(css);
  const takken = {
    'html.reduce-motion': regels.filter((r) => !r.context.length && r.selector.startsWith('html.reduce-motion')),
    'html.rustig-drukwerk': regels.filter((r) => !r.context.length && r.selector.startsWith('html.rustig-drukwerk')),
    'prefers-reduced-motion': regels.filter((r) => r.context.some((c) => /prefers-reduced-motion:\s*reduce/.test(c))),
  };
  for (const [naam, lijst] of Object.entries(takken)) {
    if (!lijst.length) { fout(naam, 'de reduced-motion-tak ontbreekt'); continue; }
    const tekst = lijst.map((r) => r.selector).join(' ');
    const gedekt = new Set(klassenIn(tekst));
    for (const k of klassen) if (!gedekt.has(k)) fout(naam, `.${k} heeft geen reduced-motion-tegenhanger in deze tak`);
    for (const r of lijst) {
      const d = declaraties(r.body);
      const uit = d.some((x) => x.prop === 'animation' && x.waarde === 'none');
      const dur = d.some((x) => x.prop === 'transition-duration' && x.waarde === '0ms');
      const del = d.some((x) => x.prop === 'transition-delay' && x.waarde === '0ms');
      if (!uit || !dur || !del) fout(naam, `de regel voor ${r.selector.slice(0, 60)}... zet niet animation: none, transition-duration: 0ms en transition-delay: 0ms`);
      if (d.some((x) => x.prop === 'opacity' && x.waarde === '0')) fout(naam, 'een reduced-motion-regel verbergt iets');
    }
  }

  // De tokens: --ds-m-* hooguit 250 ms, --ds-moment-* hooguit 1,6 s (de ademhaling van de live-stip uitgezonderd).
  if (tokensCss) {
    for (const m of tokensCss.matchAll(/^\s*--ds-(m|moment)-([a-z-]+):\s*(\d+)ms/gm)) {
      const [, fam, naam, ms] = m;
      const max = fam === 'm' ? MAX_MICRO_MS : (naam === 'leven' ? 2000 : MAX_MOMENT_MS);
      // alleen de eerste definitie (:root) telt; de 0 ms-takken zijn altijd goed
      if (Number(ms) > max) fout(`--ds-${fam}-${naam}`, `${ms} ms is meer dan ${max} ms`);
    }
  }
  return f;
}

// Eén tijd in ms uit een token-waarde, of null.
export const tokenMs = (tokensCss, naam) => {
  const m = tokensCss.match(new RegExp(`^\\s*${naam.replace(/[-]/g, '\\-')}:\\s*(\\d+)ms`, 'm'));
  return m ? Number(m[1]) : null;
};

// ===== De ds3-telling (ratel voor alle UI via het designsysteem, #1006): zie scripts/ds3_ratel_test.mjs =====
// Pure kern van de ds3-telling (zonder fs of git), zodat ook de regelaudit (scripts/release/design_rules.mjs) hem per diffregel kan gebruiken.
// Zie ds3_telling.mjs voor het lezen van de bestanden en ds3_ratel_test.mjs voor de ratel.

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
  'desktop/vendor-fonts.css': 'de @font-face-bron die desktop/build.mjs bij het bouwen vastlegt (zelfde rol als game/fonts/fonts.css)',
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
  [/^game\/js\/voetbalpresentatie\.js$/, 'het verzonnen clubembleem (kleuren en patroon van de club) en de veldradar (posities van de spelers) hangen van data af: geometrie, geen icoon; het kruisje van de blessure hoort bij het scorebord'],
  [/^game\/js\/(?:voetbalwapen|voetbalcarriereui|clubui)\.js$/, 'het clubwapen en de kleurvlakken (de clubkleuren komen uit de clubdata), het formatieveld en de vormingsvoorbeelden (de plekken komen uit de vorming): geometrie uit data, geen icoon (Club-UI 24-11)'],
  [/^game\/js\/forsalecard\.js$/, 'de omtrek van een perceel op de Te koop-kaart is de echte vorm uit de data (#1233): geometrie, geen icoon'],
  [/^game\/js\/pigeonguide\.js$/, 'de richtingspijl naar de volgende plek draait mee met de hoek (data), met omtrek en schaduw: geometrie, geen icoon'],
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
    if (/(?<![\w-])ds-(?:kaart|knop|chip|papier|glas|streep)\b/.test(k)) oud++; // een eigenschap (--ds-kaart-rand) is een token, geen oude klasse
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

// ===== Toets in de knop (DS3, 21-11; DESIGN_SYSTEM.md "Toets in de knop", game/js/dsbutton.js) =====
// Een knop met een toets of controllerknop (data-key) toont die als keycap-glyph BINNEN de knop (.ds-z-knop__toets met data-gk, via glyphHtml), nooit
// als losse hint (.hint, .ds-toetsregel, .mv-help-toets) direct naast de knop. Pure controle op een stuk markup; geen browser nodig.
export function controleerToetsInKnop(html) {
  const f = [];
  const tekst = String(html);
  for (const m of tekst.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    if (!/\bdata-key=/.test(m[1]) && !/\bdata-gamepad=/.test(m[1])) continue;
    const naam = (m[1].match(/data-(?:card|act)="([^"]+)"/) || [null, m[1].trim().slice(0, 30)])[1];
    if (!/class="[^"]*\bds-z-knop__toets\b[^"]*"/.test(m[2]) || !/\bdata-gk=/.test(m[2])) f.push({ regel: naam, bericht: 'een knop met data-key heeft zijn glyph (.ds-z-knop__toets met data-gk) niet in de knop' });
  }
  const los = [...tekst.matchAll(/<\/button>\s*<(?:span|p|small|kbd)\b[^>]*class="[^"]*\b(?:hint|ds-toetsregel|mv-help-toets)\b[^"]*"/g)].length;
  if (los) f.push({ regel: 'toetshint', bericht: `${los}x een losse toetshint direct naast een knop: zet de toets in de knop (dsButtonKey)` });
  return f;
}
