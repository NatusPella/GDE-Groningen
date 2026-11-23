// Wolkenruis: vast, naadloos en goed gespreid (AAA-wereld 23-11).
import { makeCloudNoise } from '../game/js/cloudnoise.js';
let fail = 0;
const check = (n, ok, x = '') => { if (!ok) { fail++; console.log('FAIL', n, x); } };
const S = 64;
const a = makeCloudNoise(S), b = makeCloudNoise(S);
check('lengte is S*S*4', a.length === S * S * 4);
check('zelfde zaad geeft dezelfde bytes', a.every((v, i) => v === b[i]));
check('ander zaad geeft een andere lucht', makeCloudNoise(S, 12).some((v, i) => v !== a[i]));
for (let ch = 0; ch < 4; ch++) {
  let lo = 255, hi = 0, sum = 0, edge = 0, inner = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = a[(y * S + x) * 4 + ch];
    lo = Math.min(lo, v); hi = Math.max(hi, v); sum += v;
    const r = a[(y * S + (x + 1) % S) * 4 + ch], d = a[(((y + 1) % S) * S + x) * 4 + ch];
    const e = Math.abs(v - r) + Math.abs(v - d);
    if (x === S - 1 || y === S - 1) edge += e; else inner += e;
  }
  const mean = sum / (S * S);
  check(`kanaal ${ch} is uitgerekt naar 0..255`, lo <= 2 && hi >= 253, `${lo}..${hi}`);
  check(`kanaal ${ch} heeft een middengemiddelde`, mean > 80 && mean < 175, mean);
  // naadloos: de sprong over de rand is niet groter dan een gewone stap (gemiddeld per pixel)
  const perEdge = edge / (2 * S - 1), perInner = inner / (S * S - 2 * S + 1);
  check(`kanaal ${ch} sluit naadloos aan`, perEdge < perInner * 1.8 + 2, `${perEdge} vs ${perInner}`);
}
console.log(fail ? `${fail} gefaald` : 'cloudnoise_test: alles groen');
process.exit(fail ? 1 : 0);
