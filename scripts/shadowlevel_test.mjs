// #658: de schaduwmap gaat mee in de adaptieve trap. node scripts/shadowlevel_test.mjs (puur)
import fs from 'node:fs';
import { adaptedShadowLevel, SHADOW_SIZES, shadowTargetMB } from '../game/js/shadowlevel.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(adaptedShadowLevel('hoog', 1, 0) === 'hoog', 'gezonde machine: 4096');
ok(adaptedShadowLevel('hoog', 0.9, 0) === 'hoog2048', 'adaptieve schaal omlaag: 2048');
ok(adaptedShadowLevel('hoog', 1, 1) === 'hoog2048', 'cpuLevel 1: 2048');
ok(adaptedShadowLevel('middel', 0.7, 2) === 'middel', 'middel blijft middel');
ok(adaptedShadowLevel('laag', 1, 0) === 'laag', 'laag blijft laag');
const vol = shadowTargetMB(SHADOW_SIZES.hoog), zuinig = shadowTargetMB(SHADOW_SIZES.hoog2048);
ok(Math.abs(vol - 67.1) < 0.5 && Math.abs(zuinig - 16.8) < 0.5, 'targetgroottes kloppen', `${vol}/${zuinig} MB`);
console.log(`#658 meting: schaduwtarget ${vol.toFixed(1)} MB -> ${zuinig.toFixed(1)} MB (-${(vol - zuinig).toFixed(1)} MB, ${((1 - zuinig / vol) * 100).toFixed(0)}% minder texels)`);
const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/hoog2048: \{ size: 2048/.test(src), 'scene3d kent de zuinige hoog-variant');
ok(/applyShadowLevel\(adaptedShadowLevel\(/.test(src), 'de adaptieve trap past hem toe');
console.log(`${n - fails}/${n} shadowlevel`);
process.exit(fails ? 1 : 0);
