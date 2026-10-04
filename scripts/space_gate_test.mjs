// Space while playing (game/js/spacegate.js): a minigame camera (the fierljep
// aim, `passKeys`) lets the key through, a real cutscene swallows it, and a
// UI button left focused never turns Space/Enter into a click.
//   node scripts/space_gate_test.mjs
import { cutsceneTakesSpace, blurForGameKey } from '../game/js/spacegate.js';

let fails = 0;
const check = (name, ok) => { if (!ok) { fails++; console.log('FAIL', name); } else console.log('ok  ', name); };

check('a cutscene takes a fresh Space', cutsceneTakesSpace({ id: 'mission-intro', pause: true }));
check('the fierljep aim camera passes Space on', !cutsceneTakesSpace({ id: 'pg-aim', pause: false, passKeys: true }));
check('no cutscene: Space is the game\'s', !cutsceneTakesSpace(null));
check('a key repeat is never taken', !cutsceneTakesSpace({ id: 'x' }, { repeat: true }));
check('with the pause menu open the menu has it', !cutsceneTakesSpace({ id: 'x' }, { menuOpen: true }));

const el = (tagName, extra = {}) => ({ tagName, getAttribute: (k) => (extra.attrs || {})[k] ?? null, ...extra });
check('a focused button is blurred on Space while playing', blurForGameKey(' ', el('BUTTON'), true));
check('a focused card (role=button) is blurred on Enter', blurForGameKey('Enter', el('DIV', { attrs: { role: 'button' } }), true));
check('a checkbox is blurred', blurForGameKey(' ', el('INPUT', { type: 'checkbox' }), true));
check('a text field keeps its Space', !blurForGameKey(' ', el('INPUT', { type: 'text' }), true));
check('in a menu the button keeps the focus', !blurForGameKey(' ', el('BUTTON'), false));
check('other keys leave the focus alone', !blurForGameKey('w', el('BUTTON'), true));
check('the page body is not blurred', !blurForGameKey(' ', el('BODY'), true));

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
