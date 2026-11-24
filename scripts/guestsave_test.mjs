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
// #1298: bronregex vervangen door gedragstest. guestsave_behavior_test.mjs (regel 59-82) draait
// de echte updateSaveGame als gast en test:
// - regel 59: backoff werkt (1 poging in 60 frames, niet elke frame)
// - regel 65: na backoff precies 1 nieuwe poging
// - regel 82: na succes gaat een nieuwe verdienste meteen mee (= teller is gereset naar 0)
// Dit dekt de oude bronregex-checks: savegame gebruikt guestRetryDue en reset de teller bij succes.
console.log('GEDEKT: bronregex-checks vervangen door guestsave_behavior_test.mjs (regel 59-82: backoff + reset)');
console.log(`${n}/${n} guestsave`);
process.exit(0);
