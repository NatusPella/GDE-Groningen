// Glas en spijkers op de weg (#41): een auto die total loss gaat laat een
// strooiveld glasscherven achter; rijd je erdoorheen, dan kan een band lek
// gaan (v.flat, zie vehicle.js). Pure kant: geen scene, geen opslag; de
// velden verdwijnen vanzelf (de gemeente veegt). scripts/roadshards_test.mjs.

export const SHARD_RADIUS = 2.6; // m: grootte van het strooiveld
export const SHARD_LIFE = 150; // s: tot de veegwagen geweest is
export const SHARD_MIN_SPEED = 3; // m/s: stapvoets rij je er veilig doorheen
export const SHARD_CHANCE = 0.45; // kans per veld dat je er overheen rijdt
const MAX_FIELDS = 24;

export function createShards() { return { fields: [] }; }

export function dropShards(st, x, y, now, kind = 'glas') {
  st.fields.push({ x, y, until: now + SHARD_LIFE, kind, hit: false });
  if (st.fields.length > MAX_FIELDS) st.fields.shift();
}

// true als dit voertuig op dit moment een band lek rijdt. Elk veld raakt
// maar één keer (daarna ligt het glas al plat).
export function shardPuncture(st, v, now, rng = Math.random) {
  if (!v || v.flat || v.isBoat || v.isHeli || v.isBus || Math.abs(v.speed || 0) < SHARD_MIN_SPEED) return false;
  st.fields = st.fields.filter((f) => f.until > now);
  for (const f of st.fields) {
    if (f.hit) continue;
    const dx = v.x - f.x, dy = v.y - f.y;
    if (dx * dx + dy * dy > SHARD_RADIUS * SHARD_RADIUS) continue;
    f.hit = true;
    if (rng() < SHARD_CHANCE) return true;
  }
  return false;
}
