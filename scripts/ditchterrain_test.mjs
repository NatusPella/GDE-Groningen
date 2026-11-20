// De rand van een sloot in het terrein was kartelig: het gat in de grond volgde de oever in stappen van
// 2,5 m. Smal water (gemiddelde breedte 2 A / P onder 6 m) wordt nu een halvering dieper uitgesneden
// (1,25 m). Deze test meet hoe breed het gat is dat een lint van 1,5 en 2,5 m in de grond laat, in drie
// richtingen, en dat een breed water (een meer) niet duurder wordt.
//   node scripts/ditchterrain_test.mjs
import './node3d.mjs';
const T = await import('../game/js/terrain3d.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

ok(T.isNarrowWater([[0, 0], [100, 0], [100, 1.5], [0, 1.5]]), 'een lint van 1,5 m is smal water');
ok(T.isNarrowWater([[0, 0], [100, 0], [100, 5], [0, 5]]), '5 m is nog smal');
ok(!T.isNarrowWater([[0, 0], [100, 0], [100, 30], [0, 30]]), '30 m is een vaart, niet smal');

// breedte (m) van de strook grond die ontbreekt rond een lint van breedte w, richting ang
function holeWidth(w, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), ox = 3.3, oy = 4.1;
  const P = [[-100, -w / 2], [100, -w / 2], [100, w / 2], [-100, w / 2]].map(([x, y]) => [x * c - y * s + ox, x * s + y * c + oy]);
  const arr = T.terrainArrays([-150, -150, 150, 150], [{ pts: P }], { cellSize: 10, pad: 10 });
  const pos = arr.positions;
  const tris = [];
  for (const t of arr.tiles) {
    for (let i = 0; i < t.index.length; i += 3) {
      tris.push([0, 1, 2].map((k) => [pos[t.index[i + k] * 3], pos[t.index[i + k] * 3 + 2]]));
    }
  }
  const inTri = (x, y, [A, B, C]) => {
    const d1 = (x - B[0]) * (A[1] - B[1]) - (A[0] - B[0]) * (y - B[1]);
    const d2 = (x - C[0]) * (B[1] - C[1]) - (B[0] - C[0]) * (y - C[1]);
    const d3 = (x - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (y - A[1]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  // loodrecht op de as, op 7 plaatsen langs het lint, in stapjes van 5 cm: waar ligt geen grond
  let worst = 0;
  for (let k = 0; k < 7; k++) {
    const along = -30 + k * 10 + k * 0.37;
    let gap = 0;
    for (let d = -6; d <= 6; d += 0.05) {
      const x = ox + along * c - d * s, y = oy + along * s + d * c;
      if (!tris.some((t) => inTri(x, y, t))) gap += 0.05;
    }
    worst = Math.max(worst, gap);
  }
  return worst;
}

for (const w of [1.5, 2.5]) {
  for (const ang of [0, 0.4, Math.PI / 4]) {
    const h = holeWidth(w, ang);
    if (process.env.VERBOSE) console.log(w, ang.toFixed(2), h.toFixed(2));
    // (het gat is breder dan het water: elk blad dat de oever raakt gaat weg; met bladen van 1,25 m blijft
    // dat binnen ruim de breedte plus twee bladen; met 2,5 m bladen was het rond 6 m)
    ok(h >= w - 0.01, `lint ${w} m, hoek ${ang.toFixed(2)}: het gat dekt het water`, h.toFixed(2));
    ok(h <= w + 2, `lint ${w} m, hoek ${ang.toFixed(2)}: het gat blijft dicht bij de oever`, h.toFixed(2));
  }
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} ditchterrain checks passed`);
process.exit(fails ? 1 : 0);
