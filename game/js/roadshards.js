// Glas en spijkers op de weg (#41): een auto die total loss gaat laat een
// strooiveld glasscherven achter; rijd je erdoorheen, dan kan een band lek
// gaan (v.flat, zie vehicle.js). Pure kant: geen scene, geen opslag; de
// velden verdwijnen vanzelf (de gemeente veegt). scripts/roadshards_test.mjs.

const SHARD_RADIUS = 2.6; // m: grootte van het strooiveld
export const SHARD_LIFE = 150; // s: tot de veegwagen geweest is
const SHARD_MIN_SPEED = 3; // m/s: stapvoets rij je er veilig doorheen
const SHARD_CHANCE = 0.45; // kans per veld dat je er overheen rijdt
const MAX_FIELDS = 24;

// De spijkermat van de politie (#204): een smalle strook dwars over de weg,
// vanaf 4 sterren achter een wegblokkade. Cartoon: een lekke band, verder
// niets (geen schade aan de bestuurder). Ligt een minuut, ook als je er stapvoets
// overheen gaat is de kans kleiner.
export const SPIKE_LIFE = 60;
export const SPIKE_SPAN = 7; // m dwars over de weg
export const SPIKE_DEPTH = 0.9; // m in de rijrichting (halve breedte van de strook)
const SPIKE_CHANCE = 0.9;
const SPIKE_MIN_SPEED = 1.5;
const MAX_SPIKES = 2;

export function createShards() { return { fields: [] }; }

export function dropShards(st, x, y, now, kind = 'glas') {
  st.fields.push({ x, y, until: now + SHARD_LIFE, kind, hit: false });
  if (st.fields.length > MAX_FIELDS) st.fields.shift();
}

// Een spijkermat op (x, y), de weg loopt langs `angle`; de strook ligt dwars erop.
export function dropSpikes(st, x, y, angle, now) {
  st.fields.push({ x, y, angle, until: now + SPIKE_LIFE, kind: 'spijkers', hit: false });
  const spikes = st.fields.filter((f) => f.kind === 'spijkers');
  if (spikes.length > MAX_SPIKES) st.fields.splice(st.fields.indexOf(spikes[0]), 1);
}

// true als dit voertuig op dit moment een band lek rijdt. Elk veld raakt
// maar één keer (daarna ligt het glas al plat).
export function shardPuncture(st, v, now, rng = Math.random) {
  if (!v || v.flat || v.isBoat || v.isHeli || v.isBus) return false;
  st.fields = st.fields.filter((f) => f.until > now);
  for (const f of st.fields) {
    if (f.hit) continue;
    const dx = v.x - f.x, dy = v.y - f.y;
    if (f.kind !== 'spijkers' && Math.abs(v.speed || 0) < SHARD_MIN_SPEED) continue;
    if (f.kind === 'spijkers') {
      if ((v.speed || 0) < SPIKE_MIN_SPEED && (v.speed || 0) > -SPIKE_MIN_SPEED) continue;
      const along = dx * Math.cos(f.angle) + dy * Math.sin(f.angle), lat = -dx * Math.sin(f.angle) + dy * Math.cos(f.angle);
      if (Math.abs(along) > SPIKE_DEPTH || Math.abs(lat) > SPIKE_SPAN / 2) continue;
      f.hit = true;
      st.lastKind = 'spijkers';
      if (rng() < SPIKE_CHANCE) return true;
      continue;
    }
    if (dx * dx + dy * dy > SHARD_RADIUS * SHARD_RADIUS) continue;
    f.hit = true;
    st.lastKind = 'glas';
    if (rng() < SHARD_CHANCE) return true;
  }
  return false;
}
