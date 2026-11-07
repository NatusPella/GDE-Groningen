// #656: een geminimaliseerd/achtergrondvenster laat Chromium het spel afknijpen.
// node scripts/desktop_throttle_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const src = fs.readFileSync(new URL('../desktop/main.js', import.meta.url), 'utf8');
ok(/backgroundThrottling: true/.test(src), 'backgroundThrottling staat aan (default)');
ok(!/backgroundThrottling: false/.test(src), 'nergens meer uit');
console.log('#656 meting: achtergrondvenster wordt weer afgeknepen (was backgroundThrottling: false -> volle 60 fps doorrenderen)');
console.log(`${n - fails}/${n} desktopthrottle`);
process.exit(fails ? 1 : 0);
