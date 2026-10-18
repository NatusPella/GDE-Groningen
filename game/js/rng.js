// Gedeelde hash- en ruishulpen. hash2 is de klassieke sin-hash (0..1) die
// eerder in elke module apart stond; de uitkomst is bitidentiek gebleven.
export function hash2(a, b) {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export const rand = (a, b) => a + Math.random() * (b - a);
