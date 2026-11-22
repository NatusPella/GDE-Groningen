// De klembordketen (game/js/clipwrite.js): desktop, dan navigator.clipboard, dan execCommand; en false als alles faalt.
import { writeClipboardText, CLIP_MAX } from '../game/js/clipwrite.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FOUT', m); } };
const doc = (res, log) => ({ createElement: () => ({ style: {}, setAttribute() {}, select() {}, remove() {} }), body: { appendChild() {} }, execCommand: (c) => { log.push(c); return res; } });
{ const got = []; const r = await writeClipboardText('abc', { win: { gdeDesktop: { clipboard: { writeText: async (t) => { got.push(t); return true; } } } }, nav: null, doc: null }); ok(r && got[0] === 'abc', 'desktop-klembord'); }
{ const got = []; const r = await writeClipboardText('x', { win: { gdeDesktop: { clipboard: { writeText: () => { throw new Error('geen klembord in sandbox'); } } } }, nav: { clipboard: { writeText: async (t) => { got.push(t); } } }, doc: null }); ok(r && got[0] === 'x', 'valt terug op navigator.clipboard'); }
{ const log = []; const r = await writeClipboardText('y', { win: {}, nav: { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } }, doc: doc(true, log) }); ok(r && log[0] === 'copy', 'valt terug op execCommand'); }
{ const log = []; const r = await writeClipboardText('z', { win: { gdeDesktop: { clipboard: { writeText: async () => false } } }, nav: null, doc: doc(true, log) }); ok(r && log.length === 1, 'desktop zegt false: volgende schakel'); }
{ const r = await writeClipboardText('q', { win: {}, nav: { clipboard: { writeText: async () => { throw new Error('x'); } } }, doc: doc(false, []) }); ok(r === false, 'alles faalt: false'); }
{ const r = await writeClipboardText('q', { win: null, nav: null, doc: null }); ok(r === false, 'geen omgeving: false'); }
{ const got = []; await writeClipboardText('a'.repeat(CLIP_MAX + 50), { win: { gdeDesktop: { clipboard: { writeText: async (t) => { got.push(t.length); return true; } } } } }); ok(got[0] === CLIP_MAX, 'lange tekst wordt begrensd'); }
if (fails) { console.error(fails + ' fout(en)'); process.exit(1); }
console.log('clipwrite_test: ok');
