// Tekstkwaliteit van alle speltekst (aanvulling op text_audit.mjs, dat merken, namen, winter en leenwoorden bewaakt):
// leesbaarheid en vorm. Geen netwerk, geen game-imports.
//   node scripts/tekst_kwaliteit_audit.mjs           bevindingen die niet op de lijst staan (exit 1 bij elke)
//   node scripts/tekst_kwaliteit_audit.mjs --all     ook de toegestane, met reden
//   node scripts/tekst_kwaliteit_audit.mjs --json    machineleesbaar
// Regels (speltekst = wat collectTexts() uit text_audit.mjs oplevert en isProse() leesbaar noemt):
//   dubbele-spatie   twee spaties of een spatie voor een leesteken ("woord ,") in een zin
//   placeholder      ruwe accolades ({naam}, {0}, {{x}}), %s/%d, ${, undefined, null, NaN, [object Object]
//   toets-token      een {NAAM} die geen bekende toets is (blijft als ruwe accolades in beeld staan, #1257)
//   afgekapt         zin eindigt op een voegwoord/lidwoord/voorzetsel of een komma (afgekapte zin)
//   engels-restant   waypoint, LMB/RMB, "klik" in het Engels (click, press), Loading, Error, debug in de tekst
//   eenheid          km/h, kph, mph, miles, feet, "kilometers" met punt-decimaal, meter als "mtr"
//   getalformaat     Engelse getalnotatie: 1,000 (duizendtal met komma) of 3.5 km (decimaalpunt bij een eenheid), en een duizendtal zonder punt (€1000, 5000 punten)
//   datumtijd        12-uurs klok (AM/PM), ISO-datum of maand/dag/jaar in een zin, "14.30 uur" (punt als tijdscheiding)
//   leesteken        dubbel leesteken (!!, ,,) of geen spatie na een komma of punt (woord,woord)
//   hoofdletter      zin begint met een kleine letter na een punt ("Dag. morgen"), of "grunn" zonder hoofdletter
//   css-grootte      tekst kleiner dan 12 px (HUD-, ondertitel- en kaarttekst), niet in een DS3-token
//   css-leesbaar     HUD-tekst op wisselende achtergrond zonder halo of schaduw (text-shadow, -webkit-text-stroke of paint-order)
// Bewuste uitzonderingen staan in scripts/tekst_kwaliteit_allow.json, elk met een reden (why).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectTexts, isProse, REPO } from './text_audit.mjs';

const ALLOW_FILE = path.join(REPO, 'scripts', 'tekst_kwaliteit_allow.json');
export const ALLOW = fs.existsSync(ALLOW_FILE) ? JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).allow : [];
const isAllowed = (f) => ALLOW.find((a) => (a.rule === '*' || a.rule === f.rule) && (!a.term || a.term.toLowerCase() === String(f.term).toLowerCase()) && (!a.file || f.file.includes(a.file)) && (!a.ctx || f.text.includes(a.ctx)));

// ---------------------------------------------------------------- tekstregels

// Een toetstoken ({E}, {SPACE}, {LMB}) wordt bij het tonen een toetsplaatje; een onbekende naam ({ACCOLADES}) blijft als ruwe
// accolades in beeld staan (#1257). De lijst met bekende toetsen is de bron in keycap.js (BRACE_KEY_RE); {OPENER} en dergelijke
// zijn namen die de code zelf invult voordat de tekst getoond wordt.
const BRACE_KEYS = new RegExp('^' + /export const BRACE_KEY_RE = \/(.+)\/g;/.exec(fs.readFileSync(path.join(REPO, 'game', 'js', 'keycap.js'), 'utf8'))[1] + '$');
const INGEVULD = new Set(['OPENER']);
export function onbekendeTokens(text) {
  return [...text.matchAll(/\{([A-Z][A-Z0-9_+]{1,16})\}/g)].map((m) => m[0]).filter((t) => !BRACE_KEYS.test(t) && !INGEVULD.has(t.slice(1, -1)));
}

const L = '\\p{L}';
const woord = (src, flags = 'iu') => new RegExp(`(?<![${L}\\p{N}_])(?:${src})(?![${L}\\p{N}_])`, flags);

const REGELS = [
  // twee spaties achter elkaar of een spatie voor een leesteken
  { rule: 'dubbele-spatie', re: /\S {2,}\S|[\p{L}\p{N}] [,.;:!?](?![\p{L}\p{N}])/u, note: 'dubbele spatie of spatie voor een leesteken' },
  { rule: 'placeholder', re: /\{\{|\}\}|\$\{|\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b(?!\s*,)/u, note: 'ruwe placeholder of codewaarde in speltekst (%s en {naam} worden bij het tonen ingevuld en tellen niet)' },
  { rule: 'afgekapt', re: woord('en|of|de|het|een|van|voor|met|naar|dat|die|maar|want|te|tot|zonder|jouw|mijn'), note: 'zin eindigt op een los woord', atEnd: true },
  { rule: 'afgekapt', re: /,\s*$/, note: 'zin eindigt op een komma', atEndKomma: true },
  { rule: 'engels-restant', re: woord('waypoint|waypoints|LMB|RMB|MMB|left click|right click|click|clicks|clicked|press|pressed|tap to|loading|error|errors|debug|player|players|cooldown|respawn|checkpoints?|inventory|settings|menu bar|fullscreen|full screen|volume up|volume down|please|welcome|continue|cancel|retry|back to'), note: 'Engels restant; zeg het in het Nederlands' },
  { rule: 'eenheid', re: woord('km/h|kph|mph|miles?|feet|foot|inches|inch|yards?|mtr|kilometres?|kilometers? per hour|metres?'), note: 'geen Nederlandse eenheid: km/u, m, kilometer, meter' },
  { rule: 'getalformaat', re: /(?<![\d.,])\d{1,3},\d{3}(?![\d,])(?!\s*(?:en|of|-|tot)\s*\d)|(?<![\d.])\d+\.\d{1,2}\s?(?:km|m|kg|cm|mm|euro|%)(?![\p{L}])/u, note: 'Engelse getalnotatie: duizendtal met punt (1.000) en decimaal met komma (3,5 km)' },
  { rule: 'getalformaat', re: /€\s?\d{4,}(?![\d.,])|(?<![\d.,:/#-])\d{4,}(?![\d.,:/])(?=\s?(?:euro|punten|stuntpunten|meter|km|kg|liter|seconden)(?![\p{L}]))/u, note: 'duizendtal zonder punt: 1.000, 2.500 en 10.000 (zoals de rest van het spel)', skip: (t) => /\b(?:19|20)\d\d\b(?!\s?(?:euro|punten|stuntpunten|meter|km|kg|liter|seconden))/.test(t) && !/€\s?\d{4,}/.test(t) },
  { rule: 'datumtijd', re: /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}\.\d{2}\s?uur\b/i, note: 'datum en tijd: 24-uursklok met dubbele punt (14:30), dag-maand (22 november)' },
  { rule: 'leesteken', re: /,,|;;|!!|(?<![.\d])\.\.(?![.\d])|[a-zé]{3,}[,;][A-Za-zé]{2,}|[a-zé]{4,}[.!?][A-Z][a-zé]{2,}(?![\p{L}]*\.)/u, note: 'dubbel leesteken of geen spatie na een leesteken', skip: (t) => /\b(?:www|https?)\b|[\w-]+\.(?:js|json|png|mjs|nl|com)\b/.test(t) },
  { rule: 'hoofdletter', re: /[.!?] [a-zà-ÿ][a-zà-ÿ]+ [a-zà-ÿ]/u, note: 'zin begint met een kleine letter', skip: (t) => /\b(?:bijv|enz|etc|o\.a|d\.w\.z|m\.n|vs|nr|dr|ir|mr|st|ca|evt|resp|gem|t\.o\.v|a\.u\.b|bv)\.|\d\.\s|\.\.\.\s|\b[a-z]\.[a-z]\./i.test(t) },
  { rule: 'hoofdletter', re: /(?<![\p{L}-])de grunn(?![\p{L}])|(?<![\p{L}])grunn(?![\p{L}.])/u, note: "'Grunn' met hoofdletter (constitution: nooit 'de Grunn')" },
];

// opmaak is geen tekst: tags met hun attributen, toetstokens ({E}, {LMB}, {5}) en entiteiten tellen niet mee
const TAG = '\u0001';
export const kaal = (x) => x.replace(/<[^<>]*>/g, TAG).replace(/\{[A-Z0-9_+]{1,12}\}/g, 'X').replace(/&[a-z#0-9]+;/gi, 'X');
const MARKUPSTUK = /\d+px\b|sans-serif|\.(?:wav|mp3|ogg|js)\b|\bds-[\w-]+|[a-z]+:[a-z]+,[a-z]+:|\w="|="\s*$|^\s*"|[{;]\s*[\w-]+\s*:\s*[^\s]|\b(?:gradient|rgba?|translate|calc)\(|\btransparent\b|\bclass=|\bdata-[\w-]+/;

// de regels die op de hele tekst van het begin tot het eind kijken
export function checkKwaliteit(text, kind = 'js') {
  const found = onbekendeTokens(text).map((tok) => ({ rule: 'toets-token', term: tok, note: 'onbekende toets in accolades: blijft als ruwe code in beeld staan (bekende namen staan in keycap.js BRACE_KEY_RE)' }));
  const t = kaal(text.replace(/\u0000/g, ''));
  if (MARKUPSTUK.test(t) || (t !== text && !isProse(t.trim()))) return found;
  for (const r of REGELS) {
    if (r.skip && r.skip(t)) continue;
    const src = r.rule === 'dubbele-spatie' ? t.split(TAG).join('') : t.split(TAG).join(' ');
    if (r.atEnd) {
      // alleen het laatste woord van een zin van minstens 4 woorden, zonder opmaakteken
      const s = t.trim();
      if (kind === 'js' || kind === 'html-js') continue; // sjabloonstukken eindigen soms bewust midden in een zin
      if (s.split(/\s+/).length < 4 || /[.!?:)]"'”»…]$/.test(s)) continue;
      const m = new RegExp(`${r.re.source}\\s*$`, r.re.flags).exec(s);
      if (m) found.push({ rule: r.rule, term: m[0].trim(), note: r.note });
      continue;
    }
    if (r.rule === 'afgekapt' && (kind === 'js' || kind === 'html-js')) continue;
    const m = r.re.exec(src);
    if (m) found.push({ rule: r.rule, term: m[0].trim() || m[0], note: r.note });
  }
  return found;
}

// ---------------------------------------------------------------- css

function walkCss(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkCss(p, out); else if (e.name.endsWith('.css')) out.push(p);
  }
  return out;
}
const relp = (f) => path.relative(REPO, f).split(path.sep).join('/');

// alle CSS-regels (selector + body) met regelnummer, uit .css-bestanden en <style> in index.html
export function cssRegels() {
  const out = [];
  const lees = (naam, css, base) => {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, ' '));
    for (const m of bare.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)) {
      const line = base + bare.slice(0, m.index).split('\n').length - 1 + (m[1].match(/^\s*\n/) ? 0 : 0);
      out.push({ file: naam, line: base + bare.slice(0, m.index + m[1].search(/\S/)).split('\n').length - 1, sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] });
    }
  };
  for (const f of walkCss(path.join(REPO, 'game'))) lees(relp(f), fs.readFileSync(f, 'utf8'), 1);
  const html = fs.readFileSync(path.join(REPO, 'game', 'index.html'), 'utf8');
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) lees('game/index.html', m[1], html.slice(0, m.index + m[0].indexOf(m[1])).split('\n').length);
  return out;
}

const MIN_PX = 12;
// HUD-tekst die over de wereld heen staat: schaduw of halo nodig tegen wisselende achtergronden
const HUD_SEL = /#(?:hud|subtitle|subs?|ondertitel|captions?|toast|msg|messages|prompt|goal|objective|minimap-?label)\w*|\.(?:hud|subtitle|ondertitel|caption|toast|prompt|hint|ds-melding|ds-toast)\b/i;
const OVER_WERELD = /(?:^|;)\s*position\s*:\s*(?:fixed|absolute)/;
const HEEFT_RAND = /text-shadow\s*:\s*(?!none)|-webkit-text-stroke\s*:|paint-order\s*:|filter\s*:\s*drop-shadow|var\(--ds-(?:halo|schaduw|shadow|text-shadow)/i;
const HEEFT_VLAK = /(?:^|;)\s*background(?:-color)?\s*:\s*(?!none|transparent)[^;]*(?:rgba?\([^)]*,\s*0?\.(?:[4-9]\d*)|rgb\(|#[0-9a-f]{3,8}|var\(--ds-)/i;

export function checkCss(regels = cssRegels()) {
  const found = [];
  for (const r of regels) {
    for (const m of r.body.matchAll(/(?:^|;)\s*font-size\s*:\s*([^;]+)/g)) {
      const v = m[1].trim();
      if (/var\(/.test(v)) continue;
      const px = /^(\d+(?:\.\d+)?)px/.exec(v);
      const rem = /^(\d*\.?\d+)rem/.exec(v); // em is relatief aan een onbekende ouder (logo, filmtitel): niet te meten
      const size = px ? +px[1] : rem ? +rem[1] * 16 : null;
      if (size != null && size < MIN_PX) found.push({ rule: 'css-grootte', file: r.file, line: r.line, term: `${v}`, text: r.sel, note: `tekst kleiner dan ${MIN_PX} px (${r.sel})` });
    }
    if (HUD_SEL.test(r.sel) && r.sel !== '#hud' && /font-size|font-family|font\s*:/.test(r.body) && !/(?:^|;)\s*width\s*:\s*0\b/.test(r.body) && OVER_WERELD.test(';' + r.body) && !HEEFT_RAND.test(r.body) && !HEEFT_VLAK.test(r.body)) {
      found.push({ rule: 'css-leesbaar', file: r.file, line: r.line, term: r.sel, text: r.sel, note: 'HUD-tekst zonder vlak, schaduw of halo' });
    }
  }
  return found;
}

// ---------------------------------------------------------------- audit

export function audit() {
  const findings = [];
  for (const it of collectTexts()) {
    if (it.kind === 'changelog' ? false : !isProse(it.text)) continue;
    for (const f of checkKwaliteit(it.text, it.kind)) findings.push({ ...it, ...f });
  }
  findings.push(...checkCss());
  const seen = new Set();
  return findings.filter((f) => { const k = `${f.file}:${f.line}:${f.rule}:${f.term}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((f) => ({ ...f, allowed: isAllowed(f) || null }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const findings = audit();
  const open = findings.filter((f) => !f.allowed);
  if (args.includes('--json')) console.log(JSON.stringify(findings, null, 1));
  else {
    const show = args.includes('--all') ? findings : open;
    for (const f of show) console.log(`[${f.rule}] ${f.file}:${f.line}: ${f.term} | ${String(f.text).replace(/\s+/g, ' ').slice(0, 120)}${f.allowed ? `  -- toegestaan: ${f.allowed.why}` : ''}`);
    const per = {};
    for (const f of open) per[f.rule] = (per[f.rule] || 0) + 1;
    console.log(`${open.length} bevindingen (${findings.length - open.length} toegestaan)  ${Object.entries(per).map(([k, v]) => `${k}:${v}`).join(' ')}`);
  }
  process.exit(open.length ? 1 : 0);
}
