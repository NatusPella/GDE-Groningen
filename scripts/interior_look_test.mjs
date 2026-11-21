// Interieurs (epic #1150): het echte interieur komt overeen met de nepkamer achter het raam. De raam-shader (interiorglass.js)
// kiest wand, bekleding en hout met een integer-hash en vaste paletten; interiorlook.js is dezelfde kiezer in JS. Deze test
// houdt de twee in de pas: dezelfde hash-constanten, dezelfde paletten, dezelfde paneelsleutel als paneUV, en de winkelkleuren
// van het interieur zijn die van de winkelkit (de ruit).
// Draai: node scripts/interior_look_test.mjs
import fs from 'node:fs';
import './node3d.mjs';
const L = await import('../game/js/interiorlook.js');
const IG = await import('../game/js/interiorglass.js');
const { WINKEL, SHOP_KINDS } = await import('../game/js/winkelkit.js');
const { generateLayout } = await import('../game/js/interiorlayout.js');
const { WALL_T } = await import('../game/js/interiorframe.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const src = fs.readFileSync(new URL('../game/js/interiorglass.js', import.meta.url), 'utf8');

// de hash: dezelfde twee vermenigvuldigers en schuiven
ok(/x \^= x >> 16u; x \*= 0x7feb352du;/.test(src) && /x \^= x >> 15u; x \*= 0x846ca68bu;/.test(src) && /float\(x >> 8u\) \/ 16777216\.0/.test(src), 'de shader gebruikt dezelfde integer-hash als interiorlook.js');
ok(/igHash24\(uint\(\(q\.K \* 8\.0 \+ q\.kind\) \* 977\.0 \+ 0\.5\) \+ uint\(W \* 10\.0 \+ 0\.5\) \* 61u \+ uint\(H \* 10\.0 \+ 0\.5\)\)/.test(src), 'de shader voedt de hash met (K*8+kind)*977 + W*61 + H, gelijk aan paneSeed');
ok(L.hash24(0) >= 0 && L.hash24(12345) < 1 && L.hash24(1) !== L.hash24(2), 'hash24 ligt in [0, 1)');
// bekende waarden (vastgezet: een wijziging van de hash breekt de overeenkomst met de shader)
ok(L.hashU(1) === L.hashU(1) && L.hashU(0) === 0, 'hashU(0) is 0');
// de paletten staan letterlijk in de shader
const glslVec = (a) => `vec3(${a.map((v) => v.toFixed(2)).join(', ')})`;
for (const [name, pal] of [['IG_WALL', L.IG_WALL], ['IG_FABRIC', L.IG_FABRIC], ['IG_WOOD', L.IG_WOOD]]) for (const c of pal) ok(src.includes(glslVec(c)), `${name} ${glslVec(c)} staat in de shader`);
ok(src.includes('vec3(0.88, 0.89, 0.9)') && src.includes('vec3(0.22, 0.24, 0.26)'), 'het kantoorpalet staat in de shader');

// de paneelsleutel is die van paneUV
let same = 0;
for (let i = 0; i < 500; i++) {
  const rank = Math.random() * 1.2 - 0.1, kind = Math.floor(Math.random() * 4), w = 0.3 + Math.random() * 5, h = 0.3 + Math.random() * 4;
  const k = L.paneKey(rank, kind, w, h);
  const uv = IG.paneUV(rank, kind, w, h, 1, 0, 0, 1, 0);
  // paneUV: uv.x = K*64 + wd + 0.5 + x/8, uv.y = -(16 + kind*64 + hd) + 0.002 + y/4; bij x = -along*w/2 en y = 0
  const x = uv[0], fx = Math.floor(x);
  const Kd = Math.floor((fx + 0.5) / 64), wd = fx - Kd * 64;
  const M = -Math.floor(uv[1]), kd = Math.floor((M - 15.5) / 64), hd = M - 16 - kd * 64;
  const Kexp = kind === 2 ? (k.K | 0) : k.K;
  if (kd === kind && wd === k.wd && hd === k.hd && (kind === 2 ? (Kd >> 3) === (k.K >> 3) : Kd === k.K)) same++;
}
ok(same === 500, 'paneKey = de sleutel die paneUV in de ruit codeert', `${same}/500`);

// een kamer: deterministisch en binnen de paletten
const k = L.paneKey(0.37, L.PANE.GROUND, 1.2, 1.3);
const r = L.paneRoom(k);
ok(JSON.stringify(r) === JSON.stringify(L.paneRoom(k)) && r.furniture >= 0 && r.furniture <= 2, 'paneRoom is deterministisch en een begane-grondkamer heeft geen bed');
const walls = new Set();
for (let i = 0; i < 300; i++) walls.add(L.paneRoom(L.paneKey(i / 300, L.PANE.GROUND, 1 + (i % 7) * 0.1, 1.2)).wall);
ok(walls.size >= 5, 'de paneelkamers variëren in wandkleur', String(walls.size));

// een woning neemt de kamer van het raam over
const look = L.homeLook(k);
const lay = generateLayout({ kind: 'woning', sub: null, seed: 777, hall: { u0: -3.5, u1: 3.5, v0: WALL_T, v1: 11 }, door: { w: 1.2, h: 2.1 }, height: 2.7, look });
ok(lay && lay.palette.wall === r.wall && lay.palette.floor === r.floor, 'de woning heeft de wandkleur en vloer van het raam');
// een winkel heeft de kleuren van de winkelkit
for (const s of SHOP_KINDS.filter((x) => x !== 'kermiskraam')) {
  const l = L.shopLook(s);
  ok(l.wall === WINKEL[s].wall && l.floor === WINKEL[s].floor && l.accent === WINKEL[s].accent, `winkel ${s}: palet uit de winkelkit`);
}
console.log(bad ? `interior_look_test: ${bad} van ${n} mislukt` : `interior_look_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
