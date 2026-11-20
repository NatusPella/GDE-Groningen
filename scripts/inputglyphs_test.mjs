// Behaviour test for the input glyphs: game/js/inputglyphs.js, the generated table and the Kenney fonts in game/fonts/input.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { keyGlyphName, keyGlyph, padGlyph, padSlotGlyph, glyph, glyphNames, GLYPH_FAMILY } from '../game/js/inputglyphs.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', m, extra); } };

ok(keyGlyphName('KeyW') === 'keyboard_w' && keyGlyphName('w') === 'keyboard_w', 'KeyW and w are the W key');
ok(keyGlyphName('Digit1') === 'keyboard_1' && keyGlyphName('Escape') === 'keyboard_escape' && keyGlyphName('ShiftLeft') === 'keyboard_shift', 'digits, Escape and Shift map');
ok(keyGlyphName('ArrowUp') === 'keyboard_arrow_up' && keyGlyphName('Space') === 'keyboard_space' && keyGlyphName('F5') === 'keyboard_f5', 'arrows, space and function keys map');
ok(keyGlyphName('') === null && keyGlyphName('NoSuchKey') === null, 'an unknown key has no glyph');
const w = keyGlyph('KeyW');
ok(w && w.family === GLYPH_FAMILY.keys && w.char.codePointAt(0) >= 0xE000, 'a key glyph is one private-use character of the keys font');
ok(padGlyph('xbox', 0).name === 'xbox_button_a' && padGlyph('xbox', 'lt').name === 'xbox_lt', 'controller button 0 is A, lt is the left trigger');
ok(padGlyph('ps', 0).name === 'playstation_button_cross' && padGlyph('ps', 3).name === 'playstation_button_triangle', 'the shape set names the buttons by shape');
ok(padGlyph('deck', 3).name === 'steamdeck_button_y', 'the Deck set maps Y');
ok(padGlyph('nope', 0) === null && padGlyph('xbox', 99) === null && glyph('keys', 'nope') === null, 'unknown set, button or name gives null');
ok(glyphNames('keys').some((k) => k.startsWith('mouse_')), 'the keys set has mouse glyphs');
ok(padSlotGlyph('a', 'xbox', 'A').name === 'xbox_button_a' && padSlotGlyph('a', 'switch', 'B').name === 'xbox_button_b', 'face slots follow the label of the family (Switch: the bottom button is B)');
ok(padSlotGlyph('b', 'ps', 'circle').name === 'playstation_button_circle' && padSlotGlyph('lt', 'ps').name === 'playstation_trigger_l2', 'the shape family names face buttons by shape and triggers L2/R2');
ok(padSlotGlyph('rb', 'deck').name === 'steamdeck_button_r1' && padSlotGlyph('start', 'deck').name === 'steamdeck_button_options', 'the Deck set maps shoulders and Options');
ok(padSlotGlyph('lstick', 'xbox').name === 'xbox_stick_l' && padSlotGlyph('rs', 'ps').name === 'playstation_stick_r_press' && padSlotGlyph('up', 'xbox').name === 'xbox_dpad_up', 'sticks, stick presses and the d-pad map');
ok(padSlotGlyph('lb', 'switch') === null && padSlotGlyph('view', 'ps') === null && padSlotGlyph('a', 'nope') === null, 'a family without that glyph gives null and the caller keeps its own cap');
for (const set of Object.keys(GLYPH_FAMILY)) {
  ok(glyphNames(set).length > 0, `set ${set} has glyphs`);
  const file = path.join(ROOT, 'game', 'fonts', 'input', `input-${set}.ttf`);
  ok(fs.existsSync(file) && fs.statSync(file).size > 1000, `font file for ${set} exists`);
  ok(fs.readFileSync(file).subarray(0, 4).toString('hex') === '00010000', `font file for ${set} is a TrueType font`);
}
const css = fs.readFileSync(path.join(ROOT, 'game', 'fonts', 'fonts.css'), 'utf8');
for (const fam of Object.values(GLYPH_FAMILY)) ok(css.includes(`'${fam}'`), `fonts.css declares ${fam}`);
ok(/CC0|Creative Commons Zero/.test(fs.readFileSync(path.join(ROOT, 'game', 'fonts', 'input', 'LICENSE-Kenney.txt'), 'utf8')), 'the Kenney licence (CC0) ships next to the fonts');
const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'input_glyph_map.mjs'), '--check'], { encoding: 'utf8' });
ok(r.status === 0, 'the generated table matches the font maps', r.stderr);
console.log(`inputglyphs_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
