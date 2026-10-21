// Pure kant van het schermtoetsenbord (#151).  node scripts/padkeys_test.mjs
import { layout, moveCursor, applyKey } from '../game/js/padkeyslogic.js';
let fails = 0;
const ok = (c, n, x) => { if (!c) { fails++; console.log('FAIL', n, x !== undefined ? JSON.stringify(x) : ''); } };
const rows = layout();
ok(rows.length === 5 && rows.every((r) => r.length > 0), 'raster');
const chars = new Set(rows.flat().filter((k) => k.kind === 'char').map((k) => k.t));
for (const c of "abcdefghijklmnopqrstuvwxyz0123456789-.'") ok(chars.has(c), 'teken ' + c);
// elk vak is vanaf het eerste met alleen richtingen te bereiken
const seen = new Set();
const walk = (p) => { const key = p.r + ',' + p.c; if (seen.has(key)) return; seen.add(key); for (const d of ['up', 'down', 'left', 'right']) walk(moveCursor(rows, p, d)); };
walk({ r: 0, c: 0 });
ok(seen.size === rows.flat().length, 'alle toetsen bereikbaar', [seen.size, rows.flat().length]);
for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) for (const d of ['up', 'down', 'left', 'right']) {
  const n = moveCursor(rows, { r, c }, d);
  ok(n.r >= 0 && n.r < rows.length && n.c >= 0 && n.c < rows[n.r].length, 'cursor binnen raster', [r, c, d, n]);
}
const key = (t) => rows.flat().find((k) => k.t === t);
let s = { text: '', caret: 0, shift: true };
s = applyKey(s, key('t')); ok(s.text === 'T' && !s.shift, 'hoofdletter eenmalig', s);
s = applyKey(s, key('o')); s = applyKey(s, key('m')); ok(s.text === 'Tom', 'typen', s);
s = applyKey(s, key('back')); ok(s.text === 'To' && s.caret === 2, 'wissen', s);
s = applyKey(s, key('left')); s = applyKey(s, key('i')); ok(s.text === 'Tio' && s.caret === 2, 'invoegen bij cursor', s);
s = applyKey(s, key('space'), 4); s = applyKey(s, key('a'), 4); ok(s.text.length === 4, 'maxlengte', s);
ok(applyKey(s, key('done')).action === 'done' && applyKey(s, key('cancel')).action === 'cancel', 'klaar en annuleer');
ok(applyKey({ text: '', caret: 0, shift: false }, key('back')).text === '', 'wissen op leeg');
if (fails) { console.log(fails + ' mislukt'); process.exit(1); }
console.log('padkeys_test: ok');
