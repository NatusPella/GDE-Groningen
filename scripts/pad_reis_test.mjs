// De tweede helft van de gamepad-gaten (#151), zonder browser: de reispanelen en de
// reisscène lezen de knop van de pad van speler 1 met dezelfde herbinding en Nintendo-
// wissel als de rest van het spel, de hintglyphs volgen een omgewisselde A/B, de heli-
// run heeft een glyph-hulp met een stopknop, en de telefoon op het Verhaal-tabblad is
// weer te openen (ook op het gesprek van een bericht dat net binnenkwam).
//   node scripts/pad_reis_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as C from '../game/js/controls.js';
import { padButton, padButtonIndex, padGlyphInner, playerPad } from '../game/js/glyphs.js';
import { padCan } from '../game/js/padscreens.js';
import { setPauseMenuOpen, setPauseMenuTabState, isPhoneOpen } from '../game/js/pausestate.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (f) => readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// --- 1. de reispanelen: de pad van speler 1, met herbinding en wissel -----------------------
// padButton is de enige plek die "welke knop zit hier" berekent: physicalButton + nintendoSwap.
ok(padButton('a', 'xbox', {}) === 'a' && padButton('b', 'xbox', {}) === 'b', 'zonder herbinding blijft de knop waar hij is');
const swapAB = C.bindButton({}, 'a', 'b').binds;
ok(padButton('a', 'xbox', swapAB) === 'b' && padButton('b', 'xbox', swapAB) === 'a', 'na het omwisselen van A en B zit A op de rechterknop', swapAB);
ok(padButton('a', 'switch', {}) === 'b' && padButton('y', 'switch', {}) === 'x', 'Nintendo-indeling: bevestigen zit rechts');
ok(padButton('a', 'switch', swapAB) === 'a', 'Nintendo met eigen herbinding: de wissel wordt één keer toegepast');
ok(padButton('lt', 'xbox', swapAB) === 'lt', 'de triggers wisselen niet mee');
// de plek in Gamepad.buttons (W3C-volgorde): precies één, nooit -1
for (const fam of Object.keys(C.PAD_LAYOUTS)) {
  for (const binds of [{}, swapAB]) {
    const used = C.PAD_BUTTONS.map((s) => padButtonIndex(s, fam, binds));
    ok(used.every((i) => i >= 0), `elke knop heeft een plek (${fam}, ${JSON.stringify(binds)})`, used);
    ok(new Set(used).size === used.length, `geen twee plekken voor dezelfde knop (${fam})`, used);
  }
}
ok(padButtonIndex('a', 'xbox', {}) === C.PAD_BUTTONS.indexOf('a') && padButtonIndex('a', 'xbox', swapAB) === C.PAD_BUTTONS.indexOf('b'), 'de index volgt de knop, niet de plek');
// de padkeuze is die van gamepad.js (activePadIndex), niet "de eerste die verbonden is"
const g = src('glyphs.js');
ok(/export function playerPad\(\)[\s\S]{0,400}activePadIndex\(\)/.test(g), 'de pad van speler 1 komt uit activePadIndex (gamepad.js)');
ok(playerPad() === null, 'zonder browser/pad is er geen pad');
for (const f of ['reispanel.js', 'reisrit.js']) {
  const s = src(f);
  ok(!/navigator\.getGamepads/.test(s), `${f}: leest de padlijst niet zelf`);
  ok(!/dataset\.pad\b/.test(s), `${f}: geen eigen Nintendo-wissel via dataset.pad`);
  ok(/playerPad\(/.test(s) && /padButtonIndex\(/.test(s), `${f}: gebruikt de pad van speler 1 en de knop van die plek`);
  ok(/from '\.\/glyphs\.js'/.test(s), `${f}: haalt die twee uit de invoerlaag (glyphs.js)`);
}
ok(/playerPad\(\)/.test(src('reispanel.js')) && /pressed\('a'\)/.test(src('reispanel.js')) && /pressed\('b'\)/.test(src('reispanel.js')) && /padButtonIndex\(slot\)/.test(src('reispanel.js')), 'reispanel: A bevestigt, B sluit, met de knop van die plek');
ok(/padButtonIndex\('a'\)/.test(src('reisrit.js')), 'reisscène: A slaat over, met de knop van die plek');

// --- 2. de hintglyph volgt een omgewisselde A/B --------------------------------------------
const inner = (html) => (html.match(/([^<>]+)<\/span>$/) || [])[1];
// zo bouwt glyphs.js een hint: het spelknop-slot eerst door physicalButton, dan de glyph
const hint = (slot, fam, binds) => padGlyphInner(C.physicalButton(binds, slot), fam);
ok(inner(hint('a', 'xbox', {})) === 'A' && inner(hint('b', 'xbox', {})) === 'B', 'hint: zonder herbinding A en B');
ok(inner(hint('a', 'xbox', swapAB)) === 'B' && inner(hint('b', 'xbox', swapAB)) === 'A', 'hint na het omwisselen: de bevestigknop wijst de rechterknop (B) aan', hint('a', 'xbox', swapAB));
ok(hint('a', 'xbox', swapAB).includes('aria-label="rechter knop"'), 'hint na het omwisselen: ook de aria-label noemt de knop die je indrukt', hint('a', 'xbox', swapAB));
ok(inner(hint('a', 'switch', {})) === 'A' && inner(hint('b', 'switch', {})) === 'B', 'hint op een Switch-pad: bevestigen is de rechterknop (A)');
ok(inner(hint('a', 'switch', swapAB)) === 'B', 'hint op een Switch-pad met eigen herbinding: de onderste knop (B)');
ok(hint('a', 'ps', {}).includes('<svg') && hint('a', 'ps', {}).includes('data-slot="a"'), 'hint bij vormknoppen: het kruis');
ok(C.PAD_LAYOUTS.xbox[hint('a', 'xbox', {}).match(/data-slot="([a-z]+)"/)[1]] === 'A', 'de glyph noemt de knop die er echt zit');
ok(/padGlyphInner\(physicalButton\(getSettings\(\)\.padBinds, slot\)/.test(g), 'glyphs.js doet dat in de hint zelf (render)');
// de andere aanroepers (pauzemenu, winkel, titelscherm) geven de knop al: die verandert niet
ok(inner(padGlyphInner('a', 'xbox')) === 'A' && inner(padGlyphInner('b', 'xbox')) === 'B', 'padGlyphInner zelf blijft "deze knop"');

// --- 3. de heli-run: glyph-hulp en een stopknop die de pad kan maken -----------------------
const h = src('helirun.js');
ok(!/<kbd/.test(h), 'helirun: geen <kbd>-tekst meer in de HUD');
ok(/<span class="hud-key" data-gk="\$\{/.test(h), 'helirun: de hulp gebruikt keycaps met data-gk (glyphs.js wisselt ze)');
ok(/data-pad-ctx="heli"/.test(h), 'helirun: de hulp hangt in de heli-situatie');
ok(/const helpHtml = \(\) =>/.test(h) && /key\('backspace'\)\} stoppen/.test(h), 'helirun: de hulp noemt de stopknop als glyph');
for (const [token, slot] of [['SPATIE', 'a'], ['CTRL', 'b'], ['SHIFT', 'rb'], ['BACKSPACE', 'right'], ['WASD', 'lstick']]) {
  ok(C.padSlotFor(token, 'heli') === slot, `heli: ${token} is ${slot}`, C.padSlotFor(token, 'heli'));
  ok(padCan('heli', C.tokenKey(token)) || token === 'WASD', `heli: ${token} is met de pad te maken`, token);
}
ok(/wasPressed\('backspace'\)/.test(h) && /consume\('backspace'\)/.test(h), 'helirun: de stop leest Backspace via de invoerlaag');
ok(C.PAD_MAPS.heli.right === 'backspace' && padCan('heli', 'backspace'), 'de stopknop is met de pad te maken (D-pad rechts / ⌫)');
// B als stopknop kan pas als B in de heli niet meer daalt: dat is een keuze voor de speler (#151).
ok(C.PAD_MAPS.heli.b === 'control' ? !/padButtonIndex\('b'\)/.test(h) : /wasPressed\('backspace'\)/.test(h),
  'helirun stopt niet op een knop die ook iets anders doet (B daalt)');
if (C.PAD_MAPS.heli.b !== 'control') ok(C.padSlotFor('BACKSPACE', 'heli') === 'b', 'als B de stopknop is, wijst de hint hem ook aan');
else console.log('LET OP (blokkade): B is in de heli "dalen" (PAD_MAPS.heli.b, controls_test.mjs), dus de stopknop blijft D-pad rechts/⌫.');

// --- 4. de telefoon: het Verhaal-tabblad is de uitgeklapte telefoon -------------------------
setPauseMenuOpen(true); setPauseMenuTabState('verhaal');
ok(isPhoneOpen(), 'de telefoon is open op het Verhaal-tabblad');
setPauseMenuTabState('spel');
ok(!isPhoneOpen(), 'een ander tabblad is de telefoon niet');
setPauseMenuTabState('verhaal'); setPauseMenuOpen(false);
ok(!isPhoneOpen(), 'een dicht pauzemenu is nooit een open telefoon');
const ps = src('pausestate.js');
ok(/tabName === 'verhaal'/.test(ps) && !/tabName === 'telefoon'/.test(ps), 'pausestate.js kent alleen de tab die bestaat');
const pf = src('phonefeed.js');
ok(/export function takeNoticeThread\(now/.test(pf) && /noticeThread\(now\)/.test(pf), 'phonefeed.js geeft het gesprek van de melding door (en verbruikt het één keer)');
const pm = src('pausemenu.js');
ok(/takeNoticeThread/.test(pm) && /openPauseMenu\('telefoon', \{ thread \}\)/.test(pm), 'pausemenu.js opent de telefoon op dat gesprek (Esc)');
ok(/if \(opts\.thread\)/.test(pm) && /selectVerhaalCharacter\(characterForSender\(opts\.thread\)\)/.test(pm), 'pausemenu.js opent het personage van de melding (Esc)');
// de B-uitzondering in de menu's (gamepad.js) leeft weer nu isPhoneOpen klopt
ok(/phoneOpen/.test(src('gamepad.js')) && /hooks\.phoneOpen/.test(src('gamepad.js')), 'gamepad.js houdt de B-uitzondering');

console.log(fails ? `pad_reis_test: ${fails} FAILED` : 'pad_reis_test: ok');
process.exit(fails ? 1 : 0);
