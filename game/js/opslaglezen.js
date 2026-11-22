// Kleine, pure lezers voor bewaarde teksten uit localStorage (22-11). Een met de hand bewerkt of half geschreven bestand
// geeft nooit het verkeerde type terug: readList een array van teksten, readCounters een object met eindige getallen.
// scripts/opslaglezen_test.mjs draait ze.
export function readList(text, max = 500) {
  let d;
  try { d = JSON.parse(text || '[]'); } catch (e) { return []; }
  return Array.isArray(d) ? d.filter((x) => typeof x === 'string').slice(0, max) : [];
}

export function readCounters(text, max = 500) {
  let d;
  try { d = JSON.parse(text || '{}'); } catch (e) { return {}; }
  const out = {};
  if (!d || typeof d !== 'object' || Array.isArray(d)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(d)) {
    if (k === '__proto__' || !Number.isFinite(v) || v < 0) continue;
    out[k] = Math.floor(v);
    if (++n >= max) break;
  }
  return out;
}
