// Bewaakt dat spelertekst geen toets of muisknop als gewoon woord noemt (#1003, opdracht 21-11): een toets hoort als
// toetsplaatje te verschijnen ({E}, {SPACE}, {LMB} ... via keycap.js), zodat hij meebeweegt met herbinden
// en controller. Gevonden in een tekstliteral in game/js: Spatie, Esc, Enter, Shift, Tab, Ctrl, WASD,
// pijltjes/pijltoetsen, LMB/RMB, muiswiel, scrollwiel, linkermuis, rechtermuis, F1..F12.
// Er is geen toegestane lijst meer met bestanden die dit mogen: alleen (a) bestanden die nooit door de speler
// worden gelezen of de tokens zelf renderen (KEY_SKIP_FILES), (b) ingesproken regels en ondertitels, waar de tekst
// de clip moet volgen (KEY_SPOKEN_FILES, ADR 0041), (c) commentaar in een sjabloonstring (COMMENT_ONLY) en
// (d) een regel met `keywords-ok` (zoekwoorden voor het zoekveld van het pauzemenu). Een nieuwe hardcoded
// toetsnaam hoort hier NIET bij: gebruik {TOKEN}. Zie DESIGN_SYSTEM.md "Controls and key hints".
// Dezelfde regex en bestandslijsten gebruikt de releasegate (scripts/release/design_rules.mjs checkKeyLine).
//   node scripts/key_literals_test.mjs [--list]
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jsStrings } from './text_audit.mjs';
import { TEXT_KEY_RE, keyTextHtml, keyLabelHtml, plainKeyText } from '../game/js/keycap.js';
import { KEY_WORD_RE, KEY_SKIP_FILES, KEY_SPOKEN_FILES } from './release/design_rules.mjs';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };

// [bestand, reden]: de toetsnaam staat in een commentaar binnen een sjabloonstring, niet in tekst die de speler leest.
export const COMMENT_ONLY = [
  ['coopspelersui.js', 'CSS-commentaar'], ['hudbus.js', 'commentaar/bestandsomschrijving'], ['spullen.js', 'commentaar in een sjabloonstring'],
  ['testmenu.js', 'dev-testmenu, geen spelerstekst'],
];

const found = [];
for (const f of readdirSync(JS).filter((x) => x.endsWith('.js'))) {
  if (KEY_SKIP_FILES.test(f) || KEY_SPOKEN_FILES.test(f) || COMMENT_ONLY.some(([file]) => file === f)) continue;
  const code = readFileSync(JS + f, 'utf8');
  const lines = code.split(/\r?\n/);
  for (const s of jsStrings(code)) {
    const text = s.text;
    const ln = lines[s.line - 1] || '';
    if (/^\s*(\/\/|\*)/.test(ln) || ln.includes('keywords-ok')) continue;
    // wat de renderer al als toetsplaatje toont, telt niet mee
    // aria-keyshortcuts="Enter" is voor de schermlezer, geen spelertekst (toestemmingskaart, wensen-s 23-11)
    const rest = text.replace(/aria-keyshortcuts="[^"]*"/g, ' ').replace(new RegExp(TEXT_KEY_RE.source, 'g'), ' ');
    const m = rest.match(KEY_WORD_RE);
    if (!m) continue;
    // een losse toetsnaam of een combinatie ('CTRL+LMB') is een token voor key()/cap()/glyphHtml, geen zin
    if (new RegExp('^(?:' + KEY_WORD_RE.source + ')$').test(text.trim()) || /^[A-Z0-9+]+$/.test(text.trim())) continue;
    found.push({ f, line: s.line, text: text.slice(0, 90), term: [...new Set(m)].join(',') });
  }
}

if (process.argv.includes('--list')) for (const x of found) console.log(`${x.f}:${x.line} [${x.term}] ${x.text}`);
ok(found.length === 0, `${found.length} spelerstekst(en) noemen een toets als woord (zie --list): gebruik {TOKEN}`);
for (const x of found.slice(0, 12)) console.log(`  ${x.f}:${x.line} [${x.term}] ${x.text}`);

// elke uitzondering wijst naar een bestand dat echt bestaat
for (const [file, why] of COMMENT_ONLY) ok(why && readdirSync(JS).includes(file), 'COMMENT_ONLY: ' + file + ' bestaat niet of mist reden');

// een tekstkeycap met een toetsnaam in HTML (<kbd>Esc</kbd>, class="m-kc">Klik<) is ook een bevinding: gebruik een token of keyLabelHtml
const CAPS = /<kbd\b[^>]*>\s*(?:Spatie|Esc|Enter|Shift|Tab|Ctrl|Alt|Klik|Backspace|F\d{1,2}|[A-Za-z0-9]|[←-↓])\s*<\/kbd>|class="[^"]*\b(?:m-kc|hud-key)\b[^"]*"[^>]*>\s*(?:Spatie|Esc|Enter|Shift|Tab|Ctrl|Alt|Klik|Backspace|F\d{1,2}|[←-↓])\s*</g;
const caps = [];
for (const f of readdirSync(JS).filter((x) => x.endsWith('.js') && !KEY_SKIP_FILES.test(x))) {
  const lines = readFileSync(JS + f, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => { if (!/^\s*(\/\/|\*)/.test(l) && !l.includes('keywords-ok')) { CAPS.lastIndex = 0; if (CAPS.test(l)) caps.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`); } });
}
if (process.argv.includes('--list')) for (const c of caps) console.log('kap ' + c);
ok(caps.length === 0, `${caps.length} tekstkeycap(s) met een toetsnaam in HTML: gebruik glyphHtml, keyLabelHtml of een {TOKEN}`);
for (const c of caps.slice(0, 12)) console.log('  ' + c);

// de benchmark (opdracht 21-11): het overlay en het resultaatscherm tonen toetsen als icoon, niet als tekst in een eigen .key
const tr = readFileSync(JS + 'trailer.js', 'utf8');
ok(!/class="key">[A-Za-z]+<\/span>/.test(tr), 'trailer.js: een toets als tekst in een eigen .key (gebruik glyphHtml)');
ok(/data-act="back"/.test(tr) && /glyphHtml\('ESC'\)/.test(tr), 'trailer.js: het resultaatscherm heeft een Terug-knop en de toets staat als glyph (DS3-knoppen)');

// de renderer zelf
const html = keyTextHtml('Houd {SPACE} of druk op E. Klik met {LMB}. Daarna {F8}, {ALT} en {ARROWUP}.');
ok((html.match(/hud-key/g) || []).length >= 2, 'keyTextHtml maakt toetsplaatjes van {SPACE} en "druk op E"');
ok(html.includes('hud-mouse'), 'keyTextHtml maakt een muisplaatje van {LMB}');
ok(!/\{[A-Z0-9]+\}/.test(html), 'geen rauwe token over');
ok(keyTextHtml('Loop erheen, dan E.').includes('hud-key'), '"dan E" wordt een toetsplaatje');
ok(!keyTextHtml('Mooier dan G-Music.').includes('hud-key'), '"dan G-Music" blijft tekst');
ok(keyLabelHtml('Klik').includes('hud-mouse'), 'keyLabelHtml: Klik is een muisicoon');
ok(keyLabelHtml('F8').includes('pad-key'), 'keyLabelHtml: F8 is een toetsglyph');
ok(/hud-key/.test(keyLabelHtml('[')) && !keyLabelHtml('[').includes('pad-key'), 'keyLabelHtml: een toets zonder glyph is een nette tekstkeycap');
ok(plainKeyText('{ARROWLEFT} en {F8}').includes('pijl links'), 'plainKeyText: pijl links bij {ARROWLEFT}');

console.log(failed ? `key_literals_test: ${failed} mislukt` : 'key_literals_test: ok');
process.exit(failed ? 1 : 0);
