// Bewaakt dat spelerstekst geen toets of muisknop als gewoon woord noemt (#1003): een toets hoort als
// toetsplaatje te verschijnen ({E}, {SPACE}, {LMB} ... via keycap.js), zodat hij meebeweegt met herbinden
// en controller. Gevonden in een tekstliteral in game/js: Spatie, Esc, Enter, Shift, Tab, Ctrl, WASD,
// pijltjes/pijltoetsen, LMB/RMB, muiswiel, scrollwiel, linkermuis, rechtermuis, F1..F12, en
// "druk (op) <letter>" buiten de renderers. Wat bewust tekst blijft staat in ALLOW met een reden.
//   node scripts/key_literals_test.mjs [--list]
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jsStrings, isProse } from './text_audit.mjs';
import { TEXT_KEY_RE, keyTextHtml } from '../game/js/keycap.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };

// de toetsnamen die als los woord in een spelerszin staan
const BARE = /\b(Spatie|Spatiebalk|Esc|Enter|Shift|Tab|Ctrl|WASD|LMB|RMB|F(?:[1-9]|1[0-2])|pijltjes|pijltoetsen|muiswiel|scrollwiel|linkermuis|rechtermuis|muisknop|Del|Backspace)\b/g;

// bestanden waarvan de tekst nooit door de speler wordt gelezen (dev, tools, protocol)
const SKIP_FILES = /^(devflags|storydev|gdt|botlogic|trailer|input|loadskip|assistlive|controls|inputglyphs|inputglyphs_data|keycap|glyphs|hintkit|pausemenu|lobbyui)\.js$/;

// [bestand, reden]: dit bestand mag toetsnamen als woord houden. Een nieuwe hardcoded toetsnaam hoort hier NIET bij: gebruik {TOKEN}.
// De redenen zijn de open punten van #1003: de tekst loopt nog niet door een renderer met tokens, of hij is ingesproken.
const SPOKEN = 'ingesproken regel of ondertitel: de tekst op het scherm moet de clip volgen (geen nieuwe TTS, #1003 vervolg)';
const OWN_CAP = 'tekst staat naast een eigen toetsplaatje (key()/cap()/K()/kbd data-gk) of in een toets-handler, geen zichtbare toetsnaam';
const PLAIN = 'plat-tekstvlak (doelregel, canvas-flash, titelattribuut of beschrijving): nog geen tokenrenderer; vervolg van #1003';
export const ALLOW = [
  ['minigamelines2.js', SPOKEN], ['minigamelines3.js', SPOKEN], ['minigamelines.js', SPOKEN], ['subtitles.js', SPOKEN],
  ['missions_defs.js', SPOKEN], ['missions_nieuw.js', SPOKEN], ['missions_akte3.js', SPOKEN], ['heistrollen.js', SPOKEN],
  ['padkeyboard.js', OWN_CAP], ['saveslotsui.js', OWN_CAP], ['samenkeuze.js', OWN_CAP], ['spacegate.js', OWN_CAP], ['storytest.js', 'testscript, geen spelerstekst'],
  ['testmenu.js', 'dev-testmenu, geen spelerstekst'], ['coopspelersui.js', 'CSS-commentaar'], ['spullen.js', OWN_CAP],
  ['reisrit.js', OWN_CAP], ['reisrit3d.js', OWN_CAP], ['fotomodusui.js', OWN_CAP], ['machinist.js', OWN_CAP], ['pigeonmode.js', OWN_CAP], ['shopui.js', OWN_CAP], ['cheatsui.js', OWN_CAP],
  ['todoui.js', 'm-kc is een eigen toetsplaatje in de donkere knop'], ['heistui.js', OWN_CAP], ['coopworld.js', OWN_CAP], ['meerijden.js', OWN_CAP], ['akte2_plan.js', OWN_CAP], ['bijbaan_aaa.js', OWN_CAP],
  ['achievements.js', PLAIN], ['coopgast.js', PLAIN], ['cooptrein.js', PLAIN], ['coopwedstrijd3d.js', PLAIN], ['garageui.js', PLAIN], ['heliflight.js', PLAIN], ['helpoverview.js', PLAIN],
  ['hengelen.js', PLAIN], ['home.js', PLAIN], ['hudbus.js', 'commentaar/bestandsomschrijving'], ['instrumenten.js', PLAIN], ['loadscreen.js', PLAIN], ['mapview.js', PLAIN],
  ['padel.js', PLAIN], ['pitchputt.js', PLAIN], ['planecontrol.js', PLAIN], ['reuzenrad.js', PLAIN], ['sidejob_boerderij.js', PLAIN], ['sidejob_paneel.js', PLAIN],
  ['sidejob_rechtbank.js', PLAIN], ['startscreen.js', PLAIN], ['stationtravel.js', PLAIN], ['todo.js', PLAIN], ['vliegbasis.js', PLAIN], ['vliegschoolrules.js', PLAIN], ['zwembad.js', PLAIN],
];

const found = [];
for (const f of readdirSync(JS).filter((x) => x.endsWith('.js') && !SKIP_FILES.test(x))) {
  if (ALLOW.some(([file]) => file === f)) continue;
  const code = readFileSync(JS + f, 'utf8');
  const lines = code.split(/\r?\n/);
  for (const s of jsStrings(code)) {
    const text = s.text;
    const ln = lines[s.line - 1] || '';
    if (/^\s*(\/\/|\*)/.test(ln)) continue;
    // wat de renderer al als toetsplaatje toont, telt niet mee
    const rest = text.replace(new RegExp(TEXT_KEY_RE.source, 'g'), ' ');
    const m = rest.match(BARE);
    if (!m) continue;
    // een losse toetsnaam is een token voor key()/cap()/glyphHtml, geen zin
    if (new RegExp('^(?:' + BARE.source + ')$').test(text.trim())) continue;
    found.push({ f, line: s.line, text: text.slice(0, 90), term: [...new Set(m)].join(',') });
  }
}

if (process.argv.includes('--list')) for (const x of found) console.log(`${x.f}:${x.line} [${x.term}] ${x.text}`);
ok(found.length === 0, `${found.length} spelerstekst(en) noemen een toets als woord (zie --list): gebruik {TOKEN}`);
for (const x of found.slice(0, 12)) console.log(`  ${x.f}:${x.line} [${x.term}] ${x.text}`);

// elke ALLOW-regel wijst naar een bestand dat echt bestaat en heeft een reden
for (const [file, why] of ALLOW) ok(why && readdirSync(JS).includes(file), 'ALLOW: ' + file + ' bestaat niet of mist reden');

// de renderer zelf
const html = keyTextHtml('Houd {SPACE} of druk op E. Klik met {LMB}.');
ok((html.match(/hud-key/g) || []).length >= 2, 'keyTextHtml maakt toetsplaatjes van {SPACE} en "druk op E"');
ok(html.includes('hud-mouse'), 'keyTextHtml maakt een muisplaatje van {LMB}');
ok(!/\{SPACE\}/.test(html), 'geen rauwe token over');

console.log(failed ? `key_literals_test: ${failed} mislukt` : 'key_literals_test: ok');
process.exit(failed ? 1 : 0);
