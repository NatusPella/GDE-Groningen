// desktop/args.cjs: argValue, hasFlag, findArg, readArgFile
import { createRequire } from 'module';
import assert from 'assert';
const { argValue, hasFlag, findArg, readArgFile } = createRequire(import.meta.url)('../desktop/args.cjs');

const argv = ['electron', '.', '--stil', '--smoke-test=/tmp/a=b.png', '--benchmark', '--trailer=1920x1080', '--leeg=', '--smoke-eval=document.title === "x"'];

assert.strictEqual(hasFlag('--stil', argv), true);
assert.strictEqual(hasFlag('--benchmark', argv), true);
assert.strictEqual(hasFlag('--trailer', argv), true, 'met waarde telt ook als flag');
assert.strictEqual(hasFlag('--smoke-test', argv), true);
assert.strictEqual(hasFlag('--story-test', argv), false);
assert.strictEqual(hasFlag('--stil-x', argv), false, 'geen prefix-match zonder =');
assert.strictEqual(hasFlag('--trail', argv), false);

assert.strictEqual(argValue('--smoke-test', argv), '/tmp/a=b.png', 'waarde mag = bevatten');
assert.strictEqual(argValue('--trailer', argv), '1920x1080');
assert.strictEqual(argValue('--benchmark', argv), null, 'flag zonder = heeft geen waarde');
assert.strictEqual(argValue('--stil', argv), null);
assert.strictEqual(argValue('--nergens', argv), null);
assert.strictEqual(argValue('--leeg', argv), '', 'lege waarde blijft een lege string');
assert.strictEqual(argValue('--smoke-eval', argv), 'document.title === "x"');

assert.strictEqual(findArg('--trailer', argv), '--trailer=1920x1080');
assert.strictEqual(findArg('--benchmark', argv), '--benchmark');
assert.strictEqual(findArg('--nergens', argv), undefined);

// default: process.argv
process.argv.push('--args-test-flag=7');
assert.strictEqual(argValue('--args-test-flag'), '7');
assert.strictEqual(hasFlag('--args-test-flag'), true);
process.argv.pop();

console.log('desktop_args_test: ok');

// Bewaking #141: het debug-harnas (executeJavaScript, test-/bench-/perf-schakelaars)
// staat alleen in devtools.js; main.js laadt dat alleen bij !app.isPackaged of GDE_DEV=1,
// en geen enkel desktopbestand leest process.argv buiten args.cjs.
import fs from 'fs';
const dsk = (f) => fs.readFileSync(new URL('../desktop/' + f, import.meta.url), 'utf8');
const mainSrc = dsk('main.js').replace(/^\s*\/\/.*$/gm, '');
assert.ok(/!app\.isPackaged\s*\|\|\s*process\.env\.GDE_DEV\s*===\s*'1'\s*\?\s*require\('\.\/devtools\.js'\)\s*:\s*null/.test(mainSrc), 'main.js laadt devtools.js alleen achter de isPackaged/GDE_DEV-guard');
assert.ok(!/require\(['"]\.\/devtools(\.js)?['"]\)/.test(mainSrc.replace(/!app\.isPackaged[^\n]*require\('\.\/devtools\.js'\)[^\n]*/, '')), 'devtools.js wordt nergens anders in main.js geladen');
assert.ok(!/executeJavaScript/.test(mainSrc), 'main.js bevat geen executeJavaScript (alleen devtools.js)');
for (const flag of ['--bench-eval', '--smoke-eval', '--perf-script', '--story-test', '--trailer', '--cpu-throttle', '--profile']) assert.ok(!mainSrc.includes(flag), `main.js kent ${flag} niet (hoort in devtools.js)`);
for (const f of ['main.js', 'devtools.js', 'preload.js', 'userdata.js', 'envcompat.js', 'trailervideo.js', 'coopcore.cjs']) assert.ok(!/process\.argv/.test(dsk(f)), `${f} leest process.argv niet zelf: gebruik args.cjs`);
// readArgFile: een scriptbestand van een schakelaar. Een ontbrekend bestand is een waarschuwing en null, nooit een uitzondering
// (in het hoofdproces opent die een foutvenster waar niemand op kan klikken)
{
  const pth = createRequire(import.meta.url)('path');
  const files = new Map([[pth.resolve('/repo/scripts/qa/x.js'), 'X']]);
  const fakeFs = { existsSync: (f) => files.has(pth.resolve(f)), statSync: () => ({ isFile: () => true }), readFileSync: (f) => files.get(pth.resolve(f)) };
  const warns = [];
  const warn = (m) => warns.push(m);
  assert.strictEqual(readArgFile(pth.resolve('/repo/scripts/qa/x.js'), '--bench-eval', '/repo', fakeFs, warn), 'X', 'een bestaand absoluut pad wordt gelezen');
  assert.strictEqual(readArgFile('scripts/qa/x.js', '--bench-eval', '/repo', fakeFs, warn), 'X', 'een relatief pad wordt vanaf de repo-root gevonden (de schil draait in desktop/)');
  assert.strictEqual(readArgFile(pth.resolve('/repo/nergens.js'), '--bench-eval', '/repo', fakeFs, warn), null, 'een ontbrekend bestand geeft null');
  assert.ok(warns.length === 1 && /--bench-eval/.test(warns[0]) && /nergens/.test(warns[0]), 'met een waarschuwing die schakelaar en bestand noemt');
  assert.doesNotThrow(() => readArgFile('weg.js', '--perf-script', undefined, { existsSync: () => { throw new Error('schijf weg'); }, statSync: () => null, readFileSync: () => '' }, warn), 'ook een leesfout is geen uitzondering');
  assert.strictEqual(readArgFile('echt', 'x', '/', { existsSync: () => true, statSync: () => ({ isFile: () => false }), readFileSync: () => 'map' }, warn), null, 'een map is geen scriptbestand');
  const here = pth.resolve(pth.dirname(new URL(import.meta.url).pathname.replace(/^[/]([A-Za-z]:)/, '$1')), '..');
  assert.ok(readArgFile('scripts/qa/audiotap.js', '--bench-eval', here, undefined, () => {}), 'het echte scripts/qa/audiotap.js is vanaf de repo-root te lezen');
  assert.strictEqual(readArgFile('scripts/qa/bestaat-niet.js', '--bench-eval', here, undefined, () => {}), null);
}
const dtSrc = (await import('fs')).readFileSync(new URL('../desktop/devtools.js', import.meta.url), 'utf8');
assert.ok(/process[.]on[(]'uncaughtException'/.test(dtSrc), 'devtools.js vangt een uncaughtException af: een harnasrun toont nooit een foutvenster');
assert.ok(!/readFileSync\((evalFile|scriptArg|f)/.test(dtSrc), 'devtools.js leest een schakelaar-bestand alleen via readArgFile');

console.log('desktop_args_test: harnas-guard ok');
