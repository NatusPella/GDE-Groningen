// Vaste ruis voor de Bezit-modules (epic #1095, #1102 en #1103): een kleine FNV-hash met Math.imul uit tekst en getallen, 0 tot 1.
// Dezelfde invoer geeft altijd dezelfde uitkomst, ook na een herstart en op elke machine: nooit Math.random (scripts/business_test.mjs).
// Puur: geen DOM, geen THREE, geen klok, geen opslag.

const mix = (h) => {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};

// hashUnit('melk', 'hogeland', 12) -> 0..1 (nooit 1)
export function hashUnit(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = String(p) + '\u001f';
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  }
  return mix(h) / 4294967296;
}

// Een element uit een lijst, vast per invoer.
export const hashPick = (arr, ...parts) => arr[Math.floor(hashUnit(...parts) * arr.length) % arr.length];

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const finite = (x, d = 0) => (Number.isFinite(x) ? x : d);
