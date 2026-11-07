// #629: het heist-HUD — geen eigen fonts of losse hexen, sfeerband uit de tokens, rol- en
// skipchip in heist.css met een 44 px-aanraakvlak, en een zichtbare terugweg (Esc/B).
//   node scripts/heist_hud_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', naam, extra); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const js = lees('heistui.js'), css = lees('heist.css'), heist = lees('heist.js');

// Alleen de twee systeemfonts; geen handgeschreven stack en geen system-ui.
ok(!/Segoe Print|Bradley Hand|Comic Sans MS|system-ui/.test(js + css), 'geen font buiten Bebas Neue en Arial Narrow');
ok(/font-style: italic/.test(css) && /Arial Narrow/.test(css), 'de notitie is cursief Arial Narrow');

// Goud en canvasdonker uit de tokens/chroom, geen eigen hexen.
ok(!/#f2c14e|#0f1c13/.test(js), 'geen eigen goud of canvasdonker meer');
ok(/markerColors\(\)\.mission/.test(js), 'het goud komt uit de mission-token (markerColors)');
ok(/var\(--mk-mission|var\(--mk-job|var\(--mk-ok|var\(--mk-danger|var\(--gron-green/.test(css), 'de heistkleuren komen uit de tokens');
ok(/border-top: 3px solid var\(--mk-job/.test(css) && /repeating-linear-gradient/.test(css), 'de sfeerband (maat, nacht) staat op panelen en bouwtekening');

// Rolchip en skipchip in heist.css, 44 px op touch, met pad-glyph.
ok(/\.hx-rolechip \{[\s\S]*?min-height: 44px/.test(css), 'rolchip in de stylesheet met 44 px');
ok(/\.hx-skipchip \{/.test(css) && /pointer: coarse[\s\S]*?hx-skipchip \{ min-height: 44px/.test(css), 'skipchip 44 px op aanraking');
ok(/hx-pad/.test(css) && /pad\(\)/.test(js) && /key\('A'\)\}\$\{pad\(\)\}/.test(js), 'de kaarten en de skipchip hebben een pad-glyph');
ok(!/roleEl\.style\.cssText/.test(js), 'de rolchip heeft geen inline stijl meer');

// De aanpakkeuze heeft een zichtbare terugweg: Esc of B, met de hint erbij.
ok(/inp\.wasPressed\('escape'\) \|\| inp\.wasPressed\('b'\)/.test(heist), 'Esc of B gaat terug uit de aanpakkeuze');
ok(/planChoosing\(false\)/.test(heist) && /planFocus\('island'\)/.test(heist), 'terug naar de bouwtekening');
ok(/Esc of B: terug naar de tekening/.test(js), 'de hint noemt de terugweg');

console.log(fails ? `${fails} of ${n} heist-HUD checks failed` : `heist_hud_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
