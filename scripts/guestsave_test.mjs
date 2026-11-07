// #655: een gast met een mislukte save probeert het niet meer elke frame.
import fs from 'node:fs';
import { guestRetryDue, GUEST_RETRY_MS } from '../game/js/guestsave.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(GUEST_RETRY_MS === 5000, 'backoff 5 s', GUEST_RETRY_MS);
ok(guestRetryDue(1000, 0), 'eerste poging meteen');
ok(!guestRetryDue(1000, 6000), 'binnen de backoff niet');
ok(guestRetryDue(7000, 6000), 'na de backoff weer');
// meting: 60 frames in ~1 s na een mislukking
let retryAt = 0, tries = 0, now = 1000;
retryAt = now + GUEST_RETRY_MS; // net mislukt
for (let f = 0; f < 60; f++) { now += 1000 / 60; if (guestRetryDue(now, retryAt)) { tries++; retryAt = now + GUEST_RETRY_MS; } }
ok(tries === 0, '60 frames na een fout: geen nieuwe poging', tries);
now = 6100 + 1;
ok(guestRetryDue(now, retryAt), 'na 5 s weer een poging');
console.log('#655 meting: gast-save na een fout: 1 poging per 5 s i.p.v. 60/s (elke poging was readSlot + serialize + stringify)');
const src = fs.readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
ok(/guestRetryDue\(Date\.now\(\), guestRetryAt\)/.test(src), 'savegame gebruikt de backoff');
ok(/guestRetryAt = saveGuestEarnings\(w\) \? 0 : Date\.now\(\) \+ GUEST_RETRY_MS/.test(src), 'succes zet de teller op nul');
console.log(`${n - fails}/${n} guestsave`);
process.exit(fails ? 1 : 0);
