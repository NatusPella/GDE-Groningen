// #657: de web-boot start het spel meteen in plaats van te wachten op de service worker.
// node scripts/webboot_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const src = fs.readFileSync(new URL('../web/web.js', import.meta.url), 'utf8');
const boot = src.slice(src.lastIndexOf('--- service worker, then the game'));
const startAt = boot.indexOf('start();');
const workerAt = boot.indexOf('worker().catch');
ok(startAt >= 0 && workerAt > startAt, 'start() gaat voor de service worker', `start ${startAt}, worker ${workerAt}`);
ok(!/\.then\(start\)/.test(boot), 'de boot wacht niet meer op de service worker');
ok((src.match(/import\('\.\/js\/main\.js'\)/g) || []).length === 1, 'één module-entry');
console.log('#657 meting: start() voor worker(); de eerste module wacht niet meer op de SW (was: register + update + controllerchange, tot 10,5 s)');
console.log(`${n - fails}/${n} webboot`);
process.exit(fails ? 1 : 0);
