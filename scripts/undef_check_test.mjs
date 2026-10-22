// Test voor scripts/undef_check.mjs:  node scripts/undef_check_test.mjs
// 1. de checker herkent een ontbrekende import (het geval GAME_PAD_CTX in gamepad.js, #363) en
//    laat geldige constructies met rust;
// 2. de echte gamepad-modules zijn schoon; haal de GAME_PAD_CTX-import uit de echte gamepad.js en
//    de checker moet rood worden;
// 3. de hele repo (game/js, desktop, scripts) heeft geen niet-gedefinieerde namen.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let acorn = null;
try { acorn = createRequire(import.meta.url)('internal/deps/acorn/acorn/dist/acorn'); } catch { /* hieronder */ }
if (!acorn) {
  if (process.execArgv.includes('--expose-internals')) { console.log('undef_check_test: acorn van Node niet te laden, overgeslagen'); process.exit(0); }
  const r = spawnSync(process.execPath, ['--expose-internals', '--no-warnings', fileURLToPath(import.meta.url)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
const { checkSource } = await import('./undef_check.mjs');

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FAAL:', msg); } };
const names = async (src, file) => (await checkSource(acorn, src, file)).map((p) => p.name).sort();

// ---- 1. synthetische gevallen ----
ok((await names("import { a } from './a.js';\nexport function f() { return a + b; }")).join() === 'b', 'ontbrekende naam b wordt gemeld');
ok((await names("import { PAD_MAPS } from './c.js';\nexport function poll(w) { if (GAME_PAD_CTX[w.x]) return 1; return PAD_MAPS; }")).join() === 'GAME_PAD_CTX', 'de GAME_PAD_CTX-situatie wordt gemeld');
ok((await names("export function f() { y = 1; }")).join() === 'y', 'toewijzing aan een ongedeclareerde naam wordt gemeld');
ok((await names("export const x = () => { try { q(); } catch (e) { return e; } };")).join() === 'q', 'alleen q ontbreekt, e (catch) niet');

const geldig = `
import * as THREE from 'three';
import def, { a as b } from './x.js';
export { b as c };
export default function () {}
const { p, q: [r, ...s], ...rest } = def;
let [t = p, u = r] = [1];
var hoisted = typeof later;
function later(x, { y = x, z } = {}, ...more) { return [y, z, more, s, rest, t, u, hoisted, arguments.length]; }
class K extends Object { static #n = 1; static z = K; static { const l = 1; } #m() { return K; } get g() { return this.#m(); } [Symbol.iterator]() { return b; } }
outer: for (let i = 0; i < 3; i++) { for (const k in { a: 1 }) { if (k) continue outer; else break outer; } }
for (const [m, o] of new Map()) { console.log(m, o, THREE); }
switch (1) { case 1: { let w = 1; w++; break; } default: { const w = 2; } }
const o2 = { a, b() { return super.toString; }, [p]: 1, get c() { return 1; } };
(function nm() { return nm; })();
export const ev = () => { const f = (m) => m?.x ?? import.meta.url; return f(globalThis.window?.document) || new URL('x', location.href); };
setTimeout(() => localStorage.getItem('x'), 0);
`;
ok((await names(geldig.replace('const o2 = { a,', 'const a = 1; const o2 = { a,'))).join() === '', 'geldige constructies geven geen fout: ' + (await names(geldig.replace('const o2 = { a,', 'const a = 1; const o2 = { a,'))).join());

// ---- 2. de echte gamepad-modules ----
for (const f of ['game/js/gamepad.js', 'game/js/touchlogic.js', 'game/js/controls.js', 'game/js/padlogic.js', 'game/js/padscreens.js', 'game/js/padtest.js', 'game/js/padkeyboard.js', 'game/js/padkeyslogic.js', 'game/js/inputdevice.js', 'game/js/glyphs.js']) {
  let src;
  try { src = readFileSync(path.join(REPO, f), 'utf8'); } catch { continue; }
  const got = await names(src, f);
  ok(got.length === 0, `${f} heeft ongedefinieerde namen: ${got.join(', ')}`);
}
const gp = readFileSync(path.join(REPO, 'game/js/gamepad.js'), 'utf8');
const kapot = gp.replace(/\bGAME_PAD_CTX,\s*/, '');
ok(kapot !== gp, 'testopzet: GAME_PAD_CTX stond in de importregel van gamepad.js');
ok((await names(kapot, 'game/js/gamepad.js')).includes('GAME_PAD_CTX'), 'zonder de import van GAME_PAD_CTX meldt de checker gamepad.js (de bug uit #363)');

// ---- 3. de hele repo ----
const r = spawnSync(process.execPath, ['--expose-internals', '--no-warnings', path.join(REPO, 'scripts/undef_check.mjs')], { encoding: 'utf8' });
ok(r.status === 0, 'undef_check over de hele repo is schoon:\n' + r.stdout.split('\n').slice(0, 15).join('\n'));

console.log(fails ? `undef_check_test: ${fails} van ${n} controles gefaald` : `undef_check_test: ${n} controles OK`);
process.exit(fails ? 1 : 0);
