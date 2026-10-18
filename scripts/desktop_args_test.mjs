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
