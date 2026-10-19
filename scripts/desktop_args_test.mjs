// desktop/args.cjs: argValue, hasFlag, findArg
import { createRequire } from 'module';
import assert from 'assert';
const { argValue, hasFlag, findArg } = createRequire(import.meta.url)('../desktop/args.cjs');

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
console.log('desktop_args_test: harnas-guard ok');
