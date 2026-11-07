// #654: het statische deel van syncPub wordt niet meer elke frame opgebouwd.
import fs from 'node:fs';
import { pubStaticKey } from '../game/js/pubstatic.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const def = { type: 'stages' };
const st = { index: 2, phase: 'active', stageIndex: 1, wpIndex: 0, armed: false, defs: [1, 2, 3, 4, 5], stuntPhase: false, race: null };
const k0 = pubStaticKey(st, def, null);
let builds = 1, key = k0;
for (let f = 0; f < 300; f++) { const k = pubStaticKey(st, def, null); if (k !== key) { key = k; builds++; } }
ok(builds === 1, '300 stilstaande frames: één statische opbouw', builds);
st.wpIndex = 1; ok(pubStaticKey(st, def, null) !== key, 'waypointwissel: nieuwe sleutel');
st.phase = 'done'; ok(pubStaticKey(st, def, null) !== pubStaticKey({ ...st, phase: 'active' }, def, null), 'fasewissel: nieuwe sleutel');
console.log(`#654 meting: 300 frames -> ${builds} statische syncPub-opbouw (was 300), met dezelfde sleutel gratis`);
const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok(/let pubStaticSig = ''/.test(src) && /staticKey !== pubStaticSig/.test(src), 'syncPub cachet op de sleutel');
ok(/if \(staticDue\) \{\n    pub\.remainingWaypoints/.test(src), 'remainingWaypoints alleen bij een wissel');
console.log(`${n - fails}/${n} pubstatic`);
process.exit(fails ? 1 : 0);
