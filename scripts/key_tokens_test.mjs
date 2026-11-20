// Elk {TOKEN} in een spelerszin is een bekende toets, en geen enkel weergavepad laat accolades staan (#1003):
// keyTextHtml (toets-iconen) en plainKeyText (aria-label, title, canvas, log) maken er een icoon of de toetsnaam van.
// Een {PLAATSHOUDER} die de code zelf invult staat in PLACEHOLDERS; elk ander onbekend token is een fout.
//   node scripts/key_tokens_test.mjs [--list]
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jsStrings } from './text_audit.mjs';
import { keyTextHtml, plainKeyText, BRACE_KEY_RE, keyLabelHtml, keyLabelIcon } from '../game/js/keycap.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };
const PLACEHOLDERS = new Set(['OPENER']); // door de code vervangen voor de tekst op het scherm komt (hintkit.js)
const KNOWN = ['SPATIE', 'SPACE', 'ESC', 'ENTER', 'SHIFT', 'CTRL', 'TAB', 'BACKSPACE', 'DELETE', 'ALT', 'WASD', 'ARROWS', 'ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'LMB', 'RMB', 'MOUSE', 'WHEEL', ...Array.from({ length: 12 }, (_, i) => 'F' + (i + 1)), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];

// 1. elk bekend token, op beide weergavepaden
for (const k of KNOWN) {
  const zin = `Druk op {${k}} om verder te gaan`;
  const h = keyTextHtml(zin), p = plainKeyText(zin);
  ok(!/[{}]/.test(h), `keyTextHtml({${k}}) laat accolades staan`);
  ok(!/[{}]/.test(p) && p.length > 10, `plainKeyText({${k}}) laat accolades staan: ${p}`);
  ok(/class="hud-(key|wasd|mouse-g)/.test(h), `{${k}} wordt een toets-icoon`);
}
ok(plainKeyText('{E} en {WASD}').includes('WASD'), 'plainKeyText noemt WASD');

// 1b. een toets zonder Kenney-glyph valt terug op een nette tekstkeycap in dezelfde stijl, nooit op niets of op accolades
for (const k of ['[', ']', '.', ',']) {
  const h = keyLabelHtml(k);
  ok(/class="hud-key"/.test(h) && h.includes('>' + k + '<'), `keyLabelHtml('${k}') geeft geen tekstkeycap`);
}
for (const l of ['Klik', 'Scroll', 'Muis', 'Pijltjes', 'Spatie', 'Esc', 'Enter', 'F8', '↑', 'Backspace']) ok(keyLabelIcon(l), `keyLabelIcon('${l}') mist een icoon`);

// 2. alle spelerszinnen in game/js
let zinnen = 0;
for (const f of readdirSync(JS)) {
  if (!f.endsWith('.js')) continue;
  for (const s of jsStrings(readFileSync(JS + f, 'utf8'))) {
    const t = typeof s === 'string' ? s : (s.text ?? s.value ?? '');
    if (!/[a-z]{3}/.test(t) || /\$\{/.test(t)) continue;
    const m = t.match(/\{[A-Z][A-Z0-9]*\}/g);
    if (!m) continue;
    for (const tok of m) {
      const naam = tok.slice(1, -1);
      BRACE_KEY_RE.lastIndex = 0;
      const bekend = BRACE_KEY_RE.test(tok) || PLACEHOLDERS.has(naam);
      // een tekst met veel hoofdletter-accolades is code (CSS, SVG-sjabloon): alleen zinnen tellen
      if (!bekend && /^[A-Za-z]/.test(t) && t.length < 200 && !/[;<]/.test(t)) ok(false, `${f}: onbekend token ${tok} in "${t.slice(0, 60)}"`);
    }
    if (m.every((x) => PLACEHOLDERS.has(x.slice(1, -1)))) continue;
    zinnen++;
    const h = keyTextHtml(t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))), p = plainKeyText(t);
    BRACE_KEY_RE.lastIndex = 0;
    ok(!BRACE_KEY_RE.test(h.replace(/data-gk="[^"]*"/g, '')), `${f}: keyTextHtml laat een toets-token staan in "${t.slice(0, 60)}"`);
    BRACE_KEY_RE.lastIndex = 0;
    ok(!BRACE_KEY_RE.test(p), `${f}: plainKeyText laat een toets-token staan in "${t.slice(0, 60)}"`);
  }
}
ok(zinnen > 100, `genoeg zinnen met toetsen gecontroleerd (${zinnen})`);
console.log(failed ? `key_tokens_test: ${failed} fouten` : `key_tokens_test: ok (${zinnen} zinnen)`);
process.exit(failed ? 1 : 0);
