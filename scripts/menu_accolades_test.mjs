// #1257, #1259: no raw {TOKEN} in the pause-menu text; Overzicht starts at step 1, never "Stap 0 van n".
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { braceKeysHtml } from '../game/js/keycap.js';
let n = 0;
const t = (name, fn) => { n++; fn(); };
t('braceKeysHtml: toetsen als glyph, geen accolades, [E] en (E) blijven tekst', () => {
  for (const s of ['Aan of uit met {N}. {SHIFT}+{N} is de volgende zender', '{J}', '{ESC}, {ENTER}, {ARROWS} en de functietoetsen', '{F} filter · {T} weer', '{SHIFT}+{LMB} op de kaart']) {
    const h = braceKeysHtml(s);
    assert.ok(!/\{[A-Z0-9]+\}/.test(h), 'accolades over in: ' + h);
    assert.notEqual(h, s);
  }
  assert.equal(braceKeysHtml('geen toets (E) of [Q] hier'), 'geen toets (E) of [Q] hier');
  assert.equal(braceKeysHtml(null), '');
});
t('de rijbouwers van het menu en de fototips sturen tekst door braceKeysHtml', () => {
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  assert.match(pm, /const rowName = \(label, note\) => `<span class="nm">\$\{braceKeysHtml\(label\)\}/);
  assert.match(pm, /<b>\$\{braceKeysHtml\(title\)\}<\/b><span class="mut">\$\{braceKeysHtml\(hint\)\}/);
  assert.match(pm, /<p>\$\{braceKeysHtml\(note\)\}<\/p>/);
  const fm = fs.readFileSync(new URL('../game/js/fotomodusui.js', import.meta.url), 'utf8');
  assert.match(fm, /const FOTO_TIPS = braceKeysHtml\(/);
});
t('Overzicht: geen "Stap 0 van n" en geen tegel "0/0 Missies klaar"', () => {
  const td = fs.readFileSync(new URL('../game/js/todoui.js', import.meta.url), 'utf8');
  assert.match(td, /const stapNu = Math\.min\(done \+ 1, steps\.length\)/);
  assert.match(td, /\(ms\.length \? tile\(ICON\.flag, 'Missies klaar'/);
});
console.log(`menu_accolades_test: ${n}/${n} ok`);
