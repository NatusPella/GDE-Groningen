// Water always wins over green: a green polygon's triangles that lie in
// water are dropped, so grass never covers a place you would swim in.

// `pos` is a flat xyz triple list (a Float32Array in the hot path, a plain
// number[] in the tests); `idx` a triangle index list.
export function dryIndices(
  pos: ArrayLike<number>,
  idx: ArrayLike<number>,
  inWater: (x: number, z: number) => boolean,
): number[] {
  const out: number[] = [];
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const x = (pos[a] + pos[b] + pos[c]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    if (!inWater(x, z)) out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  return out;
}
