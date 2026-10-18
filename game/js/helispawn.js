// Vrije-ruimte-check voor de heli van de heli-missie (#166). Puur. De missie zet
// zijn heli op een helidek of -plek; stond daar al een heli (de eigen heli van de
// speler op de pad bij Eelde, of de stilstaande demoheli), dan spawnde de
// missieheli er dwars doorheen. Hier staat de keuze: eerst de plek zelf, dan
// (alleen op de grond) een plek eromheen, anders null: wacht of laat de speler
// eerst zijn eigen heli wegzetten. Tests: scripts/helispawn_test.mjs.

export const CLEAR = 13;   // m: de middens van twee helis mogen niet dichter bij (rotorschijf ~9 m)

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// pad: { x, y, deck?, angle? }; blockers: [{ x, y, z? }] andere helis (en voertuigen
// die in de weg staan); opts.deck: true als de plek een dak of dek is (geen ruimte ernaast).
export function findClearSpot(pad, blockers, { deck = false, clear = CLEAR } = {}) {
  const free = (p) => blockers.every((b) => d2(p, b) >= clear || (b.z != null && p.z != null && Math.abs(b.z - p.z) > 6));
  const base = { x: pad.x, y: pad.y, z: pad.deck ?? pad.z ?? 0 };
  if (free(base)) return { ...base, moved: false };
  if (deck) return null;
  for (const r of [clear + 2, clear * 1.6, clear * 2.2, clear * 3]) {
    for (let k = 0; k < 12; k++) {
      const a = (pad.angle || 0) + Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6);
      const p = { x: pad.x + Math.cos(a) * r, y: pad.y + Math.sin(a) * r, z: base.z };
      if (free(p)) return { ...p, moved: true };
    }
  }
  return null;
}
