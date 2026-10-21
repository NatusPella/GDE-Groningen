// Verkeerstreken (cheats): what each one does to the traffic, as pure data,
// and how the traffic dies out instead of vanishing. A profile gives the
// target factor per kind (cars, bikes, scooters, motors) and a 3D look for
// the cars that still spawn (a palette and a size factor). cheats.js sets
// MODS from it each frame; trafficfleet.js reads MODS.look. Node-safe.

export const TRAFFIC_KINDS = ['cars', 'bikes', 'scooters', 'motors'];
export const NORMAL_MIX = { cars: 1, bikes: 1, scooters: 1, motors: 1 };

// How long the traffic takes to die out (or fill up) when a streek goes on or off, seconds.
export const FADE_SECONDS = 45;

const ORANJE = ['#e8761c', '#f08a24', '#d9631a', '#f5a03c'];
const REGENBOOG = ['#d8352a', '#f0a020', '#f2d21c', '#2f9e4f', '#2a74c9', '#7a3fb5', '#e0589a'];
const TREKKER = ['#3f8f3a', '#c0392b', '#2a5fa8', '#d9a21c'];
const KLIKO = ['#7b8085', '#3f7f46', '#3a66a8', '#5a5f64'];
const KOEK = ['#c98a4b', '#e3b26e', '#a8662f', '#f0d29a'];

// look: { palette, size, swap } or null (swap: velden van een ander model, zoals de trekker-limo) (the normal cars). size scales length and width.
const LIMO = ['#141414', '#1b1c1f', '#26262b', '#2b1a1a'];

export const TRAFFIC_STREKEN = [
  { id: 'geenverkeer', mix: { cars: 0, bikes: 0, scooters: 0, motors: 0 }, look: null },
  { id: 'fietsenstad', mix: { cars: 0, bikes: 3, scooters: 0, motors: 0 }, look: null },
  { id: 'stilleweg', mix: { cars: 0.15, bikes: 0.3, scooters: 0.1, motors: 0.1 }, look: null },
  { id: 'brommerstad', mix: { cars: 0.2, bikes: 0.5, scooters: 4, motors: 3 }, look: null },
  { id: 'avondspits', mix: { cars: 2.5, bikes: 0.6, scooters: 1.5, motors: 1.5 }, look: null },
  { id: 'oranjekoorts', mix: { cars: 1, bikes: 1, scooters: 1, motors: 1 }, look: { palette: ORANJE, size: 1 } },
  { id: 'regenboogverkeer', mix: { cars: 1.2, bikes: 1, scooters: 1, motors: 1 }, look: { palette: REGENBOOG, size: 1 } },
  { id: 'minimobielen', mix: { cars: 1.6, bikes: 1, scooters: 1, motors: 1 }, look: { palette: KOEK, size: 0.7 } },
  { id: 'kliko', mix: { cars: 1.2, bikes: 1, scooters: 1, motors: 1 }, look: { palette: KLIKO, size: 0.6 } },
  { id: 'alleentrekkers', mix: { cars: 0.7, bikes: 0, scooters: 0, motors: 0 }, look: { palette: TREKKER, size: 1.25 } },
  { id: 'trekkerlimo', mix: { cars: 0.8, bikes: 1, scooters: 1, motors: 1 }, look: { palette: LIMO, size: 1, swap: { name: 'trekkerlimo', len: 5.6, wid: 2.0 } } },
  { id: 'reuzenwagens', mix: { cars: 0.6, bikes: 1, scooters: 1, motors: 1 }, look: { palette: null, size: 1.35 } },
];

// The target mix of whichever verkeer streek is on (the first one found), else normal.
export function targetMix(isOn) {
  for (const s of TRAFFIC_STREKEN) if (isOn(s.id)) return { mix: s.mix, look: s.look, id: s.id };
  return { mix: NORMAL_MIX, look: null, id: null };
}

// One step towards the target: a straight ramp, FADE_SECONDS for a change of 1.
export function stepFactor(cur, target, dt, seconds = FADE_SECONDS) {
  if (!(dt > 0)) return cur;
  const d = target - cur;
  const step = dt / seconds;
  return Math.abs(d) <= step ? target : cur + Math.sign(d) * step;
}

// Steps every kind of `cur` (mutated) to `mix`; true while anything is still on its way.
export function stepMix(cur, mix, dt, seconds = FADE_SECONDS) {
  let moving = false;
  for (const k of TRAFFIC_KINDS) {
    cur[k] = stepFactor(cur[k], mix[k], dt, seconds);
    if (cur[k] !== mix[k]) moving = true;
  }
  return moving;
}

// The model of a traffic car in a streek's look: recoloured and resized.
export function lookModel(model, look, rng = Math.random) {
  if (!look || !model) return model;
  const out = { ...model };
  if (look.swap) Object.assign(out, look.swap); // een ander model (Jelle's trekker-limo), de rijeigenschappen blijven
  if (look.palette && look.palette.length) out.color = look.palette[Math.floor(rng() * look.palette.length) % look.palette.length];
  if (look.size && look.size !== 1) { out.len = model.len * look.size; out.wid = model.wid * look.size; }
  return out;
}
