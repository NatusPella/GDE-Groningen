// #655, #1298: configuratietest voor STATE_CHECK_S en bestaan van markDirty. Het gedrag
// (autosave werkt, geen performance-problemen) wordt gedekt door compat_saves_test.mjs,
// opslag_rondgang_test.mjs en de visuele tests. Een echte gedragstest zou serialize en
// markDirty moeten spioneren, maar die zijn niet geëxporteerd (terecht: interne details).
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const src = fs.readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
const m = src.match(/const STATE_CHECK_S = (\d+);/);
ok(!!m && m[1] === '2', 'interval 2 s', m && m[1]);
ok(/stateSignature[\s\S]{0,400}JSON\.stringify/.test(src), 'stateSignature is de dure JSON.stringify');
ok(/markDirty\(\);/.test(src), 'markDirty blijft de directe invalidatie');
console.log(`#655 meting: stateSignature 2 s -> ~30 signaturen/min i.p.v. 60; markDirty() blijft meteen`);
console.log(`OPMERKING: configuratietest; gedrag gedekt door compat_saves_test en opslag_rondgang_test`);
console.log(`${n - fails}/${n} statecheck`);
process.exit(fails ? 1 : 0);
