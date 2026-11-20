// Designregels op één toegevoegde diffregel: kleuren, lettertypen, lettergroottes en
// `!important`. Puur: geen fs, geen git, geen netwerk, dus de releasegate kan dit per
// diffregel aanroepen en de test kan het met losse regels voeden.
//
// Bron van de toegestane waarden: .specs-fire/standards/ui-taal.md (Kleur, Typografie,
// Menu's) en DESIGN_SYSTEM.md (Color, Typography, Menus, New UI checklist). De kaartstijl
// en de marker-/kleurenblindpaletten staan in game/js/mapstyle.js (INK, MAP_PALETTE,
// MINI_PALETTE, EMPHASIS) en game/js/a11y.js (PALETTES); die waarden zijn hieronder
// overgenomen zodat bestaande kaartkleuren die als JS-stijl opduiken geen vals alarm geven.
//
// Alleen toegevoegde regels worden gekeurd: bestaande uitzonderingen (docs/DESIGN-SCHULD.md)
// blijven staan. Een `var(--token, #hex)`-terugval is per definitie een token en is dus
// toegestaan, ook als de terugvalwaarde zelf niet in de lijst staat.
//
// Bewust niet gedekt (zie ook het eindrapport): 3-cijferige hex alleen in een duidelijke
// stijlcontext (anders leest een issuenummer als `#602` als kleur), benoemde CSS-kleuren
// (`color: red`), hsl(), en de `font:`-shorthand. Commentaar over meerdere regels wordt niet
// als toestand gevolgd; regels die met `*`, `//` of `/*` beginnen worden wel overgeslagen.

export const ALLOWED_COLORS = new Set([
  // Tokens uit ui-taal.md en DESIGN_SYSTEM.md
  '#1e9e56', '#3fc97a', '#0f5c30', '#17301f', '#0c140e', '#f0ede4', '#f2f2f2',
  '#d93f3f', '#f08a8a', '#e55a5a', '#e8c93a', '#fbfaf5', '#a9a69b',
  // Statuskleuren uit PALETTES (a11y.js) en de Okabe-Ito-modi
  '#3fd0ff', '#c068ff', '#ff9a3c', '#ff5fb4', '#3f6fd9',
  '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#e69f00', '#ff7f0e',
  // Chroom en kaartstijl (mapstyle.js: INK, MAP_PALETTE, MINI_PALETTE, EMPHASIS)
  '#04080c', '#060c09', '#0a130d', '#10261a', '#14b8a6', '#1b1d22', '#1c1408', '#1d3a23',
  '#1f2a3a', '#243528', '#244a2c', '#2a2e28', '#2b4230', '#2d6a86', '#2f4f33', '#2f5c36',
  '#2f6fb0', '#333a36', '#34562c', '#38bdf8', '#3a86a8', '#3b82f6', '#3e4c39', '#3fae49',
  '#4a8fae', '#4b5c41', '#4fd6c4', '#55524c', '#55733f', '#5a8445', '#5a8bff', '#5aa0c0',
  '#5dff7a', '#5fb4d9', '#6d6f66', '#7fd0ff', '#8a8474', '#8a96a0', '#8b5cf6', '#8d9489',
  '#8f9095', '#9a7bff', '#9a8a7a', '#9a9a9a', '#a6e04f', '#a88a9a', '#a8ada2', '#b06a28',
  '#b8703a', '#b98a6a', '#bee1f5', '#c7c7c2', '#c8834a', '#c9603f', '#c9622a', '#c9a0e0',
  '#c9a876', '#cfd6dc', '#d6a05a', '#d8d4c8', '#d9d4c4', '#e86a5a', '#e8b04a', '#e8e4d8',
  '#e8eae8', '#ec4899', '#ef4444', '#f0f0ee', '#f59e0b', '#f5e04f', '#f5e2aa', '#f5f0e6',
  '#f97316', '#facc15', '#ff5a3c', '#ff5a5a', '#ff7ab6', '#ff8a5c', '#ff8ad0', '#ff9a4f',
  '#ffb23f', '#ffbe46', '#ffc21a', '#ffd84a', '#ffe9a0', '#fff8ea',
  // Gedocumenteerde paneelgradiënt (DESIGN_SYSTEM.md:80) en hooglichten (#fff is de
  // 3-cijferige vorm van #ffffff).
  '#14281b', '#ffffff', '#fff',
  // Designsysteem v2 (game/js/ds-tokens.css, #980): papier, inkt, bordgroen, kentekengeel en de
  // rolkleuren op papier en glas. Alleen de tokens zelf mogen deze hex dragen (zie checkDsLine).
  '#f5efe0', '#ebe2cb', '#1d1b17', '#4d483c', '#0e6b3c', '#f9c80e', '#ffd633', '#e0b000',
  '#fbe1dc', '#8c1d18', '#b3261e', '#dcefdc', '#14582f', '#dcebdd', '#fdebc8', '#7a4a00', '#a15c00',
  '#1f3a28', '#b9b7ad', '#3a1816', '#f5b5ad', '#3a2a0c',
  // Designsysteem v3 (ADR 0040): papier, roze en de Rustig-drukwerk-varianten; de rest staat hierboven.
  '#f3ead3', '#e8505b', '#9d1f2a', '#0b5530',
]);

// Dezelfde kleuren als RGB-triples, voor rgb()/rgba()-notatie.
const ALLOWED_RGB = new Set([...ALLOWED_COLORS].map((hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}));
// De kaart gebruikt deze twee doorzichtige tinten (mapstyle.js, building en church).
for (const triple of ['160,156,146', '214,205,180']) ALLOWED_RGB.add(triple);

// Lettertypen uit ui-taal.md/Typography: de vaste stack plus Big Shoulders voor het logo.
export const ALLOWED_FONTS = new Set([
  'bebas neue', 'arial narrow', 'arial', 'big shoulders display', 'big shoulders', 'barlow condensed', 'atkinson hyperlegible',
  'sans-serif', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
]);

// De leesnorm (ui-taal.md, "Leesnorm"): 13 px voor menu's en HUD, 12 px is de harde ondergrens voor een
// zin; alleen de binnenkant van een toetsplaatje mag kleiner. spec_check.mjs houdt de spec hierop vast.
export const TEXT_NORM_PX = 13;
export const TEXT_FLOOR_PX = 12;

// Designsysteem v2 (#980): de twee CSS-bestanden hebben strengere regels dan de rest van de UI.
const DS_COMPONENTS = /(?:^|\/)game\/js\/ds-components\.css$/;
const DS_TOKENS = /(?:^|\/)game\/js\/ds-tokens\.css$/;
export const DS_MAX_MOTION_MS = 250;
export const DS_TOETS_SELECTOR = '.ds-badge';

const UI_ROOTS = /^(?:game|web)\//;
const MENU_FILE = /(?:^|\/)(?:menu\.css|[^/]*menu[^/]*\.(?:css|js|mjs|html)|pausemenu\.js|shopui\.js|spullen\.js|hudcards\.css|prompts\.css)$/i;
const KEYCAP_CONTEXT = /keycap|toetsplaatje|keyspot|m-kc|\bkbd\b|key-chip/i;

const STYLE_LINE = /(?:^|[^\w])(?:style|cssText)\s*=|\.style\.|style\s*=\s*["'`]|(?:color|background(?:-color)?|border(?:-[a-z]+)?|outline(?:-color)?|box-shadow|text-shadow|font(?:-family|-size)?|fill|stroke)\s*:/i;
const FULL_LINE_COMMENT = /^\s*(?:\/\/|\/\*|\*|<!--)/;

/** Bestandsnaam of pad dat bij de UI hoort (CSS/HTML in game/ of web/, JS met een UI-naam). */
export function isUiFile(file) {
  const p = String(file || '').replaceAll('\\', '/');
  if (!UI_ROOTS.test(p)) return false;
  if (/\.(?:css|html?)$/i.test(p)) return true;
  if (!/\.(?:m?js|cjs)$/i.test(p)) return false;
  return /(?:^|\/)[^/]*(?:ui|hud|menu|prompt|hint|a11y|touch|kaart|panel|card|overlay)[^/]*\.(?:m?js|cjs)$/i.test(p);
}

/** Regel die een stijl zet (voor JS die UI-stijlen zet zonder UI-bestandsnaam). */
export function looksLikeStyleLine(text) {
  return STYLE_LINE.test(String(text || ''));
}

/**
 * Commentaar strippen zonder strings onnodig te slopen: `//` na een `:` blijft staan, zodat
 * `https://` een webadres blijft en geen commentaar wordt. Voor CSS/HTML alleen blokcommentaar
 * (CSS kent geen `//`).
 */
export function stripComments(text, file = '') {
  let s = String(text ?? '');
  const css = /\.(?:css|html?)$/i.test(String(file));
  if (!css) s = s.replace(/(?<!:)\/\/.*$/, ' ');
  s = s.replace(/\/\*.*?\*\//g, ' ');
  s = s.replace(/<!--.*?-->/g, ' ');
  return s;
}

/**
 * Welke designregels kunnen op deze regel van toepassing zijn? De CLI gebruikt dit om per
 * regelsoort te tellen hoeveel toegevoegde regels zijn bekeken. Buiten de UI (game/, web/)
 * is niets van toepassing: scripts en documentatie noemen `font-family` of `#hex` als
 * detectielijst, niet als stijl.
 */
export function designCandidates(file, text) {
  const scope = UI_ROOTS.test(String(file || '').replaceAll('\\', '/'));
  const line = String(text ?? '');
  if (!scope || FULL_LINE_COMMENT.test(line)) {
    return { kleur: false, typografie: false, fontgrootte: false, important: false };
  }
  const ui = isUiFile(file) || looksLikeStyleLine(line);
  return {
    kleur: ui,
    typografie: ui && /font-family|fontFamily/i.test(line),
    fontgrootte: ui && /font-size|fontSize/i.test(line),
    important: ui && /!important/i.test(line),
  };
}

export function isDsComponentsFile(file) { return DS_COMPONENTS.test(String(file || '').replaceAll('\\', '/')); }
export function isDsTokensFile(file) { return DS_TOKENS.test(String(file || '').replaceAll('\\', '/')); }

function durationsMs(text) {
  const out = [];
  for (const m of String(text).matchAll(/(?<![\w.-])(\d*\.?\d+)\s*(ms|s)\b/g)) out.push(m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]));
  return out;
}

/**
 * Strengere regels voor game/js/ds-components.css en ds-tokens.css, per toegevoegde regel.
 * Componenten: geen hex, rgb() of hsl(), geen verloop, geen losse px voor lettergrootte, ruimte of
 * radius (alleen var(--ds-...)), tekst niet onder 13 px en beweging hooguit 250 ms. Tokens: hex alleen
 * als palet (--ds-c-*), rgba alleen in een schaduw, lettergrootte-tokens niet onder 13 px (12 px alleen
 * --ds-t-toets), ruimte op de 4-px-basis en beweging hooguit 250 ms.
 */
export function checkDsLine({ file, line, text } = {}) {
  const filePath = String(file ?? '').replaceAll('\\', '/');
  const comp = isDsComponentsFile(filePath);
  const tok = isDsTokensFile(filePath);
  if (!comp && !tok) return [];
  const raw = String(text ?? '');
  if (!raw.trim() || FULL_LINE_COMMENT.test(raw)) return [];
  const clean = stripComments(raw, filePath);
  const out = [];
  const add = (ernst, titel, beschrijving, fix) => out.push(finding({ file: filePath, line, text: raw, ernst, categorie: 'design-system', titel, beschrijving, fix }));

  if (comp) {
    const colour = clean.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    if (colour) add('blokkerend', 'Losse kleur in ds-components.css', `Kleur ${colour[0]} in de componenten; die lezen alleen var(--ds-...) uit ds-tokens.css.`, 'Gebruik een token (een rol) en voeg zo nodig een token toe in ds-tokens.css en de contrasttabel in DESIGN_SYSTEM.md.');
    if (/(?:linear|radial|conic)-gradient\(/i.test(clean)) add('belangrijk', 'Verloop in ds-components.css', 'Het designsysteem kent geen glans of verloop; alleen vlakke kleur en een zachte schaduw.', 'Gebruik een vlak en --ds-schaduw.');
    for (const m of clean.matchAll(/font-size\s*:\s*([^;}]+)/gi)) {
      const px = [...m[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
      if (px.some((n) => n < TEXT_NORM_PX) && !/var\(\s*--ds-t-toets/.test(m[1])) add('blokkerend', 'Lettergrootte onder 13 px in ds-components.css', `Tekst op ${px.join(', ')} px; het systeem heeft een vloer van ${TEXT_NORM_PX} px.`, 'Gebruik een rol (--ds-t-body, --ds-t-hulp, ...).');
      else if (px.length && !/var\(/.test(m[1])) add('belangrijk', 'Losse lettergrootte in ds-components.css', `Lettergrootte ${m[1].trim()} buiten de typografieschaal.`, 'Gebruik een rol uit --ds-t-*.');
    }
    for (const m of clean.matchAll(/(?<![\w-])((?:padding|margin|gap|row-gap|column-gap|border-radius)[\w-]*)\s*:\s*([^;}]+)/gi)) {
      const literal = m[2].replace(/var\([^)]*\)/g, '').match(/-?\d*\.?\d+px/);
      if (literal) add('belangrijk', 'Losse px in ds-components.css', `${m[1]}: ${m[2].trim()}; ruimte en radius komen uit --ds-s-* en --ds-r.`, 'Gebruik var(--ds-s-n) of var(--ds-r).');
    }
    if (/(?:transition|animation)[\w-]*\s*:/i.test(clean) && durationsMs(clean.replace(/var\([^)]*\)/g, '')).some((ms) => ms > DS_MAX_MOTION_MS)) {
      add('blokkerend', 'Beweging langer dan 250 ms', `Duur boven ${DS_MAX_MOTION_MS} ms in ds-components.css.`, 'Gebruik --ds-m-snel, --ds-m of --ds-m-max (hooguit 250 ms).');
    }
  }

  if (tok) {
    const def = clean.match(/^\s*(--[\w-]+)\s*:\s*([^;]+)/);
    const name = def ? def[1] : '';
    const value = def ? def[2] : '';
    if (/#[0-9a-fA-F]{3,8}\b/.test(clean) && !/^--ds-c-/.test(name)) add('blokkerend', 'Hex buiten het palet in ds-tokens.css', `Hex in ${name || 'een regel'} die geen palettoken (--ds-c-*) is.`, 'Zet de kleur als --ds-c-* en verwijs ernaar met var().');
    if (/rgba?\(/.test(clean) && !/^--ds-schaduw/.test(name)) add('blokkerend', 'rgba buiten een schaduw in ds-tokens.css', `rgba() in ${name || 'een regel'}; doorzichtige kleur is alleen voor een schaduw.`, 'Gebruik een palettoken, of maak er een schaduwtoken van.');
    if (/^--ds-t-/.test(name)) {
      const px = [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
      if (px.some((n) => n < TEXT_NORM_PX) && name !== '--ds-t-toets') add('blokkerend', 'Lettergrootte-token onder 13 px', `${name}: ${value.trim()}; alleen --ds-t-toets (toetsplaatje) mag op 12 px.`, 'Maak het 13 px of groter.');
      if (name === '--ds-t-toets' && px.some((n) => n < TEXT_FLOOR_PX)) add('blokkerend', 'Toetsmaat onder 12 px', `${name}: ${value.trim()}.`, 'Houd de toets op 12 px.');
    }
    if (/^--ds-s-\d+$/.test(name) && value.trim().endsWith('px') && Number.parseFloat(value) % 4 !== 0) add('belangrijk', 'Ruimte-token buiten de 4-px-basis', `${name}: ${value.trim()}.`, 'Gebruik een veelvoud van 4 px.');
    if (/^--ds-m(?:-|$)/.test(name) && durationsMs(value).some((ms) => ms > DS_MAX_MOTION_MS)) add('blokkerend', 'Beweging-token langer dan 250 ms', `${name}: ${value.trim()}.`, 'Houd beweging op 250 ms of korter.');
  }
  return out;
}

/** Splitst platte CSS (ook binnen @media) in { selector, body, line }-regels. */
function cssRules(css) {
  const out = [];
  const stripped = String(css).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: m[1].trim(), body: m[2], line: stripped.slice(0, m.index + m[0].indexOf('{')).split('\n').length });
  }
  return out;
}

/**
 * Bestandsregels die een regel niet ziet: reduced-motion en focus aanwezig, het toetsplaatje als enige
 * met 12 px, en elke regel van beide bestanden door checkDsLine. Voor de gedragstest en de gate.
 */
export function checkDsFiles({ tokensCss = '', componentsCss = '', tokensFile = 'game/js/ds-tokens.css', componentsFile = 'game/js/ds-components.css' } = {}) {
  const out = [];
  const lines = (css, file) => String(css).split('\n').forEach((text, i) => out.push(...checkDsLine({ file, line: i + 1, text })));
  lines(tokensCss, tokensFile);
  lines(componentsCss, componentsFile);
  const bestandsfout = (file, titel, beschrijving, fix) => out.push(finding({ file, line: 1, text: titel, ernst: 'blokkerend', categorie: 'design-system', titel, beschrijving, fix }));
  if (!/prefers-reduced-motion\s*:\s*reduce/.test(componentsCss) || !/html\.reduce-motion/.test(componentsCss)) {
    bestandsfout(componentsFile, 'Reduced-motion ontbreekt in ds-components.css', 'Een van beide takken ontbreekt: @media (prefers-reduced-motion: reduce) en html.reduce-motion (de instelling van het spel).', 'Zet transitions en animaties uit in beide takken.');
  }
  if (!/prefers-reduced-motion\s*:\s*reduce/.test(tokensCss) || !/html\.reduce-motion/.test(tokensCss)) {
    bestandsfout(tokensFile, 'Reduced-motion ontbreekt in ds-tokens.css', 'De beweging-tokens worden niet nul bij "Beweging beperken".', 'Zet --ds-m* op 0ms in beide takken.');
  }
  if (!/:focus-visible/.test(componentsCss)) bestandsfout(componentsFile, 'Focusring ontbreekt in ds-components.css', 'Zonder :focus-visible is er geen zichtbare focus.', 'Voeg één focusring toe voor alle bedienbare componenten.');
  for (const rule of cssRules(componentsCss)) {
    if (/var\(\s*--ds-t-toets\b/.test(rule.body) && rule.selector !== DS_TOETS_SELECTOR) {
      out.push(finding({ file: componentsFile, line: rule.line, text: rule.selector, ernst: 'blokkerend', categorie: 'typografie', titel: 'Toetsmaat buiten het toetsplaatje', beschrijving: `${rule.selector} gebruikt --ds-t-toets; alleen ${DS_TOETS_SELECTOR} mag op 12 px.`, fix: 'Gebruik --ds-t-hulp of groter.' }));
    }
  }
  return out;
}

function quote(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
}

function evidence(file, line, text) {
  return `${file}:${line}: ${quote(text)}`;
}

function finding({ file, line, text, ernst, categorie, titel, beschrijving, fix }) {
  return {
    bron: 'design',
    aspect: 'design',
    ernst,
    categorie,
    titel,
    beschrijving,
    bewijs: [evidence(file, line, text)],
    bestanden: [String(file).replaceAll('\\', '/')],
    fix,
    reviewer: 'design_rules',
  };
}

/** Losse kleurwaarden op een regel, zonder commentaar en zonder var()-terugval. */
function strayColors(text, file) {
  let clean = stripComments(text, file);
  // De terugval van een token is de token zelf; die waarde keuren we niet.
  clean = clean.replace(/var\(\s*--[\w-]+\s*,\s*[^)]*\)/g, 'var()');
  const stray = [];

  for (const m of clean.matchAll(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?(?![0-9a-fA-F])/g)) {
    const hex = m[0].slice(0, 7).toLowerCase();
    if (!ALLOWED_COLORS.has(hex)) stray.push(m[0]);
  }
  // 3-cijferige hex alleen in een duidelijke stijlcontext: anders leest een issuenummer
  // als #602 of een anker als #top mee.
  const short = /(?:color|background(?:-color)?|border(?:-[a-z]+)?|outline|box-shadow|text-shadow|fill|stroke|--[\w-]+)\s*:\s*[^;{}]*?(#[0-9a-fA-F]{3})\b/gi;
  for (const m of clean.matchAll(short)) {
    const hex = m[1].toLowerCase();
    if (!ALLOWED_COLORS.has(hex)) stray.push(m[1]);
  }
  // Een zwarte slagschaduw is chroom, geen platte zwarte achtergrond.
  if (/shadow/i.test(clean)) {
    for (let i = stray.length - 1; i >= 0; i--) if (/^#(?:000|000000)$/i.test(stray[i])) stray.splice(i, 1);
  }

  for (const m of clean.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)/g)) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const triple = `${r},${g},${b}`;
    const alpha = m[4];
    if (ALLOWED_RGB.has(triple)) continue;
    if (triple === '255,255,255') continue; // hooglicht, net als #ffffff
    if (triple === '0,0,0' && alpha !== undefined) continue; // slagschaduw met doorzichtigheid
    stray.push(m[0]);
  }
  return [...new Set(stray)];
}

function fontFamilies(text, file) {
  const clean = stripComments(text, file);
  const values = [];
  for (const m of clean.matchAll(/font-family\s*:\s*([^;}]+)/gi)) values.push(m[1]);
  for (const m of clean.matchAll(/fontFamily\s*[:=]\s*(['"`])([^'"`]*)\1/g)) values.push(m[2]);
  const families = [];
  for (const value of values) {
    for (const part of value.split(',')) {
      const name = part.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (!name || name.startsWith('var(')) continue;
      families.push(name);
    }
  }
  return [...new Set(families)];
}

function fontSizeValues(text, file) {
  const clean = stripComments(text, file);
  const values = [];
  for (const m of clean.matchAll(/(?:font-size|fontSize)\s*[:=]\s*(['"`])([^'"`]{1,80})\1/g)) values.push(m[2]);
  for (const m of clean.matchAll(/font-size\s*:\s*([^;}]{1,80})/gi)) values.push(m[1]);
  const sizes = [];
  for (const value of values) {
    for (const m of value.matchAll(/(\d+(?:\.\d+)?)\s*px/gi)) sizes.push(Number(m[1]));
  }
  return [...new Set(sizes)];
}

// Een relatieve lettergrootte die krimpt (.78em, 85%) zonder vloer landt in een kleine ouder onder
// de 13 px (menu.css .foto-lbl, hud_panel.css .nl-gloss). Alleen `max(13px, ...)` of een px-waarde is veilig.
function shrinkingRelativeSizes(text, file) {
  const clean = stripComments(text, file);
  const out = [];
  for (const m of clean.matchAll(/font-size\s*:\s*([^;}]{1,80})/gi)) {
    const v = m[1];
    if (/max\(/i.test(v)) continue;
    for (const r of v.matchAll(/(?<![\w.])(\d*\.?\d+)\s*(r?em|%)/gi)) {
      const n = Number(r[1]);
      if (r[2] === '%' ? n < 100 : n < 1) out.push(r[0].replace(/\s+/g, ''));
    }
  }
  return [...new Set(out)];
}

/**
 * Keurt één toegevoegde regel. Geeft een array bevindingen volgens $defs.bevinding
 * (bron 'design', aspect 'design') en verder niets.
 *
 * @param {{file: string, line: number, text: string}} regel
 * @param {{allowed?: Set<string>}} [opts] extra toegestane kleuren (kleine letters, #rrggbb)
 * @returns {object[]}
 */
export function checkDesignLine({ file, line, text } = {}, opts = {}) {
  const filePath = String(file ?? '').replaceAll('\\', '/');
  const raw = String(text ?? '');
  if (!filePath || !raw.trim()) return [];
  const candidates = designCandidates(filePath, raw);
  const dsFindings = checkDsLine({ file: filePath, line, text: raw });
  if (!candidates.kleur && !candidates.typografie && !candidates.fontgrootte && !candidates.important) return dsFindings;

  const allowed = opts.allowed instanceof Set ? opts.allowed : null;
  const findings = [];

  // Kleur: losse hex of rgb() buiten de tokens, ook in een inline style.
  if (candidates.kleur) {
    let stray = strayColors(raw, filePath);
    if (allowed) stray = stray.filter((c) => !(c.startsWith('#') && allowed.has(c.slice(0, 7).toLowerCase())));
    if (stray.length) {
      const inline = /(?:style\s*=|\.style[.\[])/i.test(raw);
      findings.push(finding({
        file, line, text, ernst: 'blokkerend', categorie: 'design-system',
        titel: 'Kleur buiten de tokens',
        beschrijving: `Nieuwe kleur buiten de tokenlijst${inline ? ' in een inline stijl' : ''}: ${stray.join(', ')}. `
          + 'Gebruik een token (var(--...)) of een waarde uit DESIGN_SYSTEM.md; een nieuwe token hoort in de spec.',
        fix: 'Vervang de losse kleur door var(--token) of een gedocumenteerde tokenwaarde.',
      }));
    }
  }

  // Typografie: font-family buiten de vaste stack en font-size onder de vloer.
  if (candidates.typografie || candidates.fontgrootte) {
    const problems = [];
    let ernst = 'belangrijk';
    if (candidates.typografie) {
      const bad = fontFamilies(raw, filePath).filter((f) => !ALLOWED_FONTS.has(f));
      if (bad.length) problems.push(`lettertype buiten de vaste stack: ${bad.join(', ')}`);
    }
    if (candidates.fontgrootte) {
      const sizes = fontSizeValues(raw, filePath);
      const keycap = KEYCAP_CONTEXT.test(raw);
      const tiny = sizes.filter((s) => s < 12);
      if (tiny.length && !keycap) {
        ernst = 'blokkerend';
        problems.push(`lettergrootte onder 12 px: ${tiny.map((s) => `${s}px`).join(', ')}`);
      }
      const rel = keycap ? [] : shrinkingRelativeSizes(raw, filePath);
      if (rel.length) problems.push(`relatieve lettergrootte onder 1 (${rel.join(', ')}) zonder vloer; gebruik max(${TEXT_NORM_PX}px, ...)`);
      if (sizes.includes(12) && MENU_FILE.test(filePath) && !keycap) {
        problems.push('menu-tekst op 12 px; menu\'s zijn 13 px en hoger');
      }
    }
    if (problems.length) {
      findings.push(finding({
        file, line, text, ernst, categorie: 'typografie',
        titel: ernst === 'blokkerend' ? 'Lettergrootte onder de vloer' : 'Typografie buiten de afspraak',
        beschrijving: `Nieuwe typografie wijkt af: ${problems.join('; ')}. Zie ui-taal.md (Typografie) en DESIGN_SYSTEM.md (Typography).`,
        fix: "Gebruik de vaste stack ('Bebas Neue', 'Arial Narrow', Arial, sans-serif) en minimaal 12 px (menu's 13 px).",
      }));
    }
  }

  // Nieuwe !important is een nit, geen blokkade.
  if (candidates.important) {
    findings.push(finding({
      file, line, text, ernst: 'nit', categorie: 'design-system',
      titel: 'Nieuwe !important',
      beschrijving: 'Een nieuwe !important in de UI; meestal is een specifiekere selector of een token genoeg. '
        + 'Alleen voor reduce-motion/reduce-flash of een bewuste noodgreep laten staan.',
      fix: 'Verhoog de specificiteit of gebruik een token in plaats van !important.',
    }));
  }

  return [...findings, ...dsFindings];
}

export default { ALLOWED_COLORS, ALLOWED_FONTS, isUiFile, looksLikeStyleLine, stripComments, designCandidates, checkDesignLine, checkDsLine, checkDsFiles, isDsComponentsFile, isDsTokensFile };
