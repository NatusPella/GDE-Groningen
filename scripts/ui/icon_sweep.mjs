// Statische iconen-sweep (opdracht 21-11, Kist Kees-melding): faalt als spelerzichtbare tekst een toets of knop als losse letter of
// woord noemt in plaats van een {TOKEN} (toetsplaatje, muis- of padicoon). Aanvulling op key_literals_test.mjs, die alleen
// toetsWOORDEN (Spatie, Esc, Enter, WASD ...) vangt; deze test vangt ook de losse LETTERS ("met E", "A en D", "W vooruit",
// "druk op B", "(of A)") en de muiswoorden ("klik om te schieten" naast een toets). Het runtime-tegenstuk staat in
// scripts/qa/icon_sweep.page.js (scant de DOM van een draaiend spel).
//   node scripts/ui/icon_sweep.mjs [--list]
// Regels:
//  - Een toets in spelertekst is {E}, {SPACE}, {LMB} ... (keycap.js): volgt herbinden en controller.
//  - Ingesproken regels en ondertitels (`say:`, KEY_SPOKEN_FILES) houden de woorden van de clip (ADR 0041); wat de speler ZIET
//    gaat door spokenKeyTokens (keycap.js, via subtitles.js dualHtml/setDualText) en wordt dan toch een icoon.
//  - Uitzonderingen staan in ALLOW, met reden. Een nieuwe uitzondering heeft een goede reden nodig.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jsStrings } from '../text_audit.mjs';
import { TEXT_KEY_RE, spokenKeyTokens } from '../../game/js/keycap.js';
import { KEY_WORD_RE, KEY_SKIP_FILES, KEY_SPOKEN_FILES } from '../release/design_rules.mjs';
import { scanKeycapPx, scanSkipHints } from './keycap_maat.mjs';

const JS = fileURLToPath(new URL('../../game/js/', import.meta.url));
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };

// [bestand, begin van de tekst, reden]
export const ALLOW = [
  ['coopgast.js', 'De eerste gast', 'GAST_REGELS: register dat docs/COOP-GAST.md woordelijk volgt, geen speler-UI'],
  ['coopgast.js', 'Met E bij een vrij', 'GAST_REGELS: register dat docs/COOP-GAST.md woordelijk volgt, geen speler-UI'],
  ['coopgast.js', 'Met Y (controller', 'GAST_REGELS: register dat docs/COOP-GAST.md woordelijk volgt, geen speler-UI'],
  ['coopgast.js', 'Taxi, bezorgen', 'GAST_REGELS: register dat docs/COOP-GAST.md woordelijk volgt, geen speler-UI'],
  ['coopgast.js', 'Pannenkoeken bakken', 'GAST_REGELS: register dat docs/COOP-GAST.md woordelijk volgt, geen speler-UI'],
  ['instrumenten.js', 'Linkerstick rollen', 'BEDIENING_PAD: ongebruikt, padknoppen als woord'],
  ['pausemenu.js', 'Rechterknop bevestigt', 'uitleg van de padindeling: noemt de letters die op de controller staan'],
  ['coopnet.js', 'Te veel groepen', 'noemt de D-pad als padknop naast het {B}-icoon'],
  ['coopnet.js', 'Je loopt los', 'noemt de D-pad als padknop naast het {B}-icoon'],
  ['missions_akte4.js', 'Zijdeur 00:03', 'D en D is een naam in de zin, geen toets'],
  ['storyarc_nieuw.js', 'In het logboek', 'D en D is een naam in de zin, geen toets'],
  ['mapview.js', 'een letter per stand', 'de letters B/S/P/Z/G/O staan op de kaart zelf, geen toetsen'],
  ['hudbus.js', 'de uitnodiging Meedoen', 'commentaar in een sjabloonstring (zelfde als COMMENT_ONLY in key_literals_test)'],
  ['pausemenu.js', '<input type="search"', 'placeholder van het zoekveld: een attribuut kan geen toetsplaatje tonen'],
  ['hudcards.js', 'Klik of druk op', 'hc-close: "Klik" is het werkwoord, Enter wordt door keyTextHtml een icoon'],
];

// losse letters die de speler als toets leest (de toetsen van het spel; geen U/B/N/J/L/P/M die in gewone zinnen staan)
const BEHIND = String.raw`(?<![\w{[(/.\-'’"+#])`;
const LETTER = 'WASDEFQRGKXCVZHOIT';
const PATTERNS = [
  ['woordtoets', new RegExp(KEY_WORD_RE.source.replace('|Del|', '|'), 'g')],
  ['druk/houd + letter', new RegExp(String.raw`\b(?:[Dd]ruk(?: nog eens)?(?: op)?|[Hh]oud|[Tt]ik|[Mm]et|[Vv]ia|[Ll]aat|rem met|duw met|[Dd]an|[Oo]f|[Ee]n) ([${LETTER}BNJ])(?![\w{}'’-])(?!\. [A-Z][a-z])(?! in de lucht)`, 'g')],
  ['letterpaar', new RegExp(BEHIND + String.raw`[WASDQEFZX]( en | of | ?/ ?|, )[WASDQEFZX](?![\w}\]/.'’-])`, 'g')],
  ['letter + werkwoord', new RegExp(BEHIND + String.raw`[${LETTER}](?= (?:vooruit|achteruit|remt|rem|gas|los|is gas|is rem|is de fluit|stuurt|hendel|deuren|dienst|omhoog|omlaag|hoger|lager|koppelt|lost|laat|zet|tankt|gooit|bij stilstand|bij de kop|om )\b)`, 'g')],
  ['letter + ,/:/)', new RegExp(BEHIND + String.raw`[WASDEFQRGKXCVZ](?=[:)] )`, 'g')],
  ['(of A)', /\(of [A-Z]\)/g],
  ['muis/klik als toets', /\b(?:met de muis|de muis (?:draait|sturen)|kijk rond met de muis|klik om te|en klikken|of scrollen|\(scrollen\)|muisknop|muiswiel|scrollwiel|linkermuis\w*|rechtermuis\w*|rechtsklik|linksklik|spatiebalk)\b/gi],
];

const SKIP_STRING = /uniform |varying |float |vec[234]|gl_|@media|\{[^}]*:[^}]*;|^\s*[.#][\w-]+[\s,{]|--ds-|px;/;
const found = [];
export function scanText(text) {
  if (SKIP_STRING.test(text)) return [];
  const rest = text.replace(new RegExp(TEXT_KEY_RE.source, 'g'), ' ').replace(/\{[A-Z0-9_]+\}/g, ' ');
  if (/^[A-Za-z0-9+]{1,12}$/.test(rest.trim()) || /^[A-Z] ?\/ ?[A-Z]$/.test(text.trim())) return []; // een los toetsnaam-token voor key()/cap()/K()
  const hits = [];
  for (const [name, re] of PATTERNS) { re.lastIndex = 0; const m = rest.match(re); if (m) hits.push(name + ': ' + [...new Set(m)].join(' | ')); }
  return hits;
}

for (const f of readdirSync(JS).filter((x) => x.endsWith('.js'))) {
  // bestanden die de tokens zelf renderen of nooit door de speler worden gelezen, en de volledig ingesproken bestanden
  if (KEY_SKIP_FILES.test(f) || /^(minigamelines2?3?|subtitles|heistrollen|banterlines\w*|padtest|padscreens|padkeyboard|touchlogic|touch|gamepad|inputdevice|storytest)\.js$/.test(f)) continue;
  const code = readFileSync(JS + f, 'utf8');
  const lines = code.split(/\r?\n/);
  for (const s of jsStrings(code)) {
    const ln = lines[s.line - 1] || '';
    if (/^\s*(\/\/|\*)/.test(ln) || ln.includes('keywords-ok')) continue;
    const sayAt = ln.search(/\b(?:say|sayHijacked):/);
    if (sayAt >= 0 && ln.indexOf(s.text.slice(0, 20)) > sayAt) continue; // de ingesproken regel zelf (ADR 0041)
    const hits = scanText(s.text);
    if (!hits.length) continue;
    if (ALLOW.some(([file, start]) => file === f && s.text.trimStart().startsWith(start))) continue;
    found.push({ f, line: s.line, hits, text: s.text.slice(0, 100).replace(/\n/g, ' ') });
  }
}
if (process.argv.includes('--list') || found.length) for (const x of found.slice(0, 40)) console.log(`  ${x.f}:${x.line} [${x.hits.join('; ')}] ${x.text}`);
ok(found.length === 0, `${found.length} spelertekst(en) noemen een toets of knop als losse letter of muiswoord: gebruik {TOKEN} (zie --list)`);

// elke uitzondering wijst naar een bestand dat bestaat en heeft een reden
for (const [file, start, why] of ALLOW) ok(readdirSync(JS).includes(file) && readFileSync(JS + file, 'utf8').includes(start) && why, 'ALLOW: ' + file + ' / ' + start + ' bestaat niet of mist reden');

// de detector zelf: wat er ooit is misgegaan moet gevonden worden, en tokens niet
for (const bad of ['Laad de oogst bij je erf met E.', 'Houd A en D vast', 'W vooruit, A en D draaien', 'Druk op B om mee te gaan', 'gas met W en recht door', 'Spatie omhoog', '{A} en D', 'Klik om uit te delen en klik om te schieten', 'Weet je het zeker? Druk nog eens {ENTER} (of A)', 'Landingsgestel uit met G!']) ok(scanText(bad).length > 0, 'detector mist: ' + bad);
for (const good of ['Laad de oogst met {E}.', 'Houd {A} en {D} vast', '{W} vooruit, {A}/{D} draaien', 'Plan B, Tammo. U kunt W als Wiebelwerk lezen.', 'Loket C is vandaag', 'De H van het UMCG', 'Druk op Enter', 'Hoge der A', 'Zeg dat met E. Huisman']) ok(scanText(good).length === 0, 'detector valse melding: ' + good + ' -> ' + scanText(good).join(','));

// gesproken regels: wat de speler ziet wordt toch een icoon (display-only; de clip houdt zijn woorden)
const sp = spokenKeyTokens('Instappen bij Roelf. Spatie omhoog, W vooruit, A/D draaien. Houd A en D vast. Plan B, loket C, U kunt.');
ok(sp.includes('{SPACE} omhoog') && sp.includes('{W} vooruit') && sp.includes('{A}/{D}') && sp.includes('Houd {A} en {D}'), 'spokenKeyTokens zet toetsen om: ' + sp);
ok(sp.includes('Plan B') && sp.includes('loket C') && sp.includes('U kunt'), 'spokenKeyTokens laat Plan B, loket C en U staan: ' + sp);
ok(spokenKeyTokens('Zijdeur 00:03, gast: D en D, tilwerk').includes('D en D'), 'spokenKeyTokens: D en D (een naam) blijft tekst');
ok(/spokenKeyTokens/.test(readFileSync(JS + 'subtitles.js', 'utf8')), 'subtitles.js zet ingesproken toetsen om (dualHtml, setDualText)');

// de maat van een toetsplaatje: geen vaste px-maat in de context-CSS (#1075, ds-keycap.css is de enige bron); de details staan in scripts/keycap_maat_test.mjs
const pxHits = scanKeycapPx();
for (const x of pxHits.slice(0, 20)) console.log(`  ${x.f}: ${x.sel} { ${x.prop}: ${x.value} }`);
ok(pxHits.length === 0, `${pxHits.length} toetsplaatje(s) met een vaste px-maat: laat ds-keycap.css de maat bepalen (een factor van de tekst, --ds-kc-*)`);

const skipHits = scanSkipHints();
for (const x of skipHits.slice(0, 20)) console.log(`  ${x.f}: ${x.sel} { ${x.prop}: ${x.value} }`);
ok(skipHits.length === 0, `${skipHits.length} overslaan-hint(s) met flex of een eigen uitlijning: de toets staat in de regel (ds-keycap.css)`);

console.log(failed ? `icon_sweep: ${failed} mislukt` : 'icon_sweep: ok');
process.exit(failed ? 1 : 0);
