// Gedeelde hash- en ruishulpen. hash2 is de klassieke sin-hash (0..1) die
// eerder in elke module apart stond; de uitkomst is bitidentiek gebleven.
export function hash2(a, b) {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export const rand = (a, b) => a + Math.random() * (b - a);

// Seeded 0..1 generator (mulberry32).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
