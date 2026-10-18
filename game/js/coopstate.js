// Coöp fase 1 (#95): spelerstoestand voor twee spelers. Pure logica, geen DOM,
// geen netwerk. Gedeeld: geld en wanted (teamkas). Per speler: gezondheid,
// pantser, wapen, munitie. Voertuigen worden gedeeld (stoelen). Alleen actief
// met ?coop; zonder blijft world.* ongewijzigd.

export const CHARS = ['tammo', 'anita']; // 'anita' is het id van Tessa in storyarc
export const RESPAWN_DELAY = 6;      // seconden voordat een gevallen speler terugkeert
export const ROBBERY_FRACTION = 0.2; // berovingen kosten een deel van de gedeelde kas (constitution 6)
export const MAX_WANTED = 5;
export const MAX_HEALTH = 100;
export const SEATS = ['driver', 'passenger'];

export function createCoopState(opts = {}) {
  const chars = opts.chars || CHARS;
  const mk = (slot) => ({
    slot, char: chars[slot], health: MAX_HEALTH, armor: 0, weapon: null, ammo: 0,
    alive: true, respawnT: 0, vehicle: null, seat: null, pos: { x: 0, y: 0 },
    ai: !!(opts.ai && opts.ai[slot]),
  });
  return {
    players: [mk(0), mk(1)],
    shared: { money: opts.money || 0, wanted: 0 },
    pause: { by: null, votes: [] },
    teamDown: false,
  };
}

export const other = (slot) => (slot === 0 ? 1 : 0);

// --- gezondheid, dood, respawn ---
export function damage(st, slot, amount) {
  const p = st.players[slot];
  if (!p.alive || amount <= 0) return { died: false };
  let a = amount;
  if (p.armor > 0) { const take = Math.min(p.armor, a); p.armor -= take; a -= take; }
  p.health = Math.max(0, p.health - a);
  if (p.health > 0) return { died: false };
  p.alive = false; p.respawnT = RESPAWN_DELAY; p.vehicle = null; p.seat = null;
  st.teamDown = !st.players.some((q) => q.alive);
  return { died: true, teamDown: st.teamDown };
}

// Eén tik. Geeft slots die terugkeren. Zijn beiden dood, dan telt er geen
// respawn: de missie faalt voor beiden (teamDown) en de wereld herstelt.
export function tickRespawn(st, dt) {
  const back = [];
  if (st.teamDown) return back;
  for (const p of st.players) {
    if (p.alive) continue;
    p.respawnT -= dt;
    if (p.respawnT <= 0) {
      p.alive = true; p.health = MAX_HEALTH; p.armor = 0; p.respawnT = 0;
      back.push(p.slot);
    }
  }
  return back;
}

export function reviveAll(st) {
  for (const p of st.players) { p.alive = true; p.health = MAX_HEALTH; p.respawnT = 0; }
  st.teamDown = false;
}

// Plek waar een gevallen speler terugkomt: naast de levende, anders null (de wereld kiest).
export function respawnPoint(st, slot) {
  const o = st.players[other(slot)];
  return o.alive ? { x: o.pos.x + 1.5, y: o.pos.y } : null;
}

// --- gedeelde kas ---
export function earn(st, n) { st.shared.money += Math.max(0, Math.floor(n)); return st.shared.money; }
export function spend(st, n) {
  n = Math.max(0, Math.floor(n));
  if (n > st.shared.money) return false;
  st.shared.money -= n; return true;
}
export function robbery(st) {
  const loss = Math.floor(st.shared.money * ROBBERY_FRACTION);
  st.shared.money -= loss; return loss;
}

// --- wanted: één getal voor het duo ---
export function raiseWanted(st, level) { st.shared.wanted = Math.min(MAX_WANTED, Math.max(st.shared.wanted, level | 0)); return st.shared.wanted; }
export function clearWanted(st) { st.shared.wanted = 0; }

// --- voertuigen delen: wie het eerst instapt stuurt; de ander is bijrijder ---
// vehicles: { [id]: { driver: slot|null, passenger: slot|null } }
// stoelen: 1 = alleen een bestuurder (fiets, step), standaard 2 (zie cooproles.js coopRegel('voertuig'))
export function enterVehicle(st, vehicles, slot, id, want = null, stoelen = 2) {
  const p = st.players[slot];
  if (!p.alive || p.vehicle) return null;
  const v = vehicles[id] || (vehicles[id] = { driver: null, passenger: null });
  if (stoelen < 2 && v.driver != null) return null;
  let seat = want && v[want] == null && (want === 'driver' || stoelen >= 2) ? want : null;
  if (!seat) seat = v.driver == null ? 'driver' : v.passenger == null && stoelen >= 2 ? 'passenger' : null;
  if (!seat) return null;
  v[seat] = slot; p.vehicle = id; p.seat = seat;
  return seat;
}
export function exitVehicle(st, vehicles, slot) {
  const p = st.players[slot];
  const v = p.vehicle && vehicles[p.vehicle];
  if (v) {
    if (v.driver === slot) v.driver = null;
    if (v.passenger === slot) v.passenger = null;
  }
  p.vehicle = null; p.seat = null;
}
// Bijrijder neemt het stuur over als de bestuurder weg is.
export function takeWheel(st, vehicles, slot) {
  const p = st.players[slot], v = p.vehicle && vehicles[p.vehicle];
  if (!v || v.driver != null || p.seat !== 'passenger') return false;
  v.passenger = null; v.driver = slot; p.seat = 'driver'; return true;
}

// --- minigames: wie speelt, wie kijkt ---
const TWO_PLAYER = new Set(['padel', 'botsauto']);
export function minigameRoles(kind, starter, humans = 2) {
  if (TWO_PLAYER.has(kind) && humans === 2) return { players: [0, 1], spectators: [] };
  return { players: [starter], spectators: humans === 2 ? [other(starter)] : [] };
}

// --- HUD per speler ---
export function hudPanels(st) {
  return st.players.map((p) => ({
    slot: p.slot, side: p.slot === 0 ? 'left' : 'right', char: p.char,
    health: p.health, armor: p.armor, weapon: p.weapon, ammo: p.ammo,
    down: !p.alive, respawnIn: p.alive ? 0 : Math.ceil(Math.max(0, p.respawnT)),
    money: st.shared.money, wanted: st.shared.wanted,
    seat: p.seat,
  }));
}

// --- pauze: beide spelers mogen pauzeren; hervatten door wie pauzeerde, of
// als de ander vraagt om te hervatten (votes) beslist de pauzeerder. ---
export function pause(st, slot) { if (st.pause.by == null) { st.pause.by = slot; st.pause.votes = []; } return st.pause.by; }
export function resume(st, slot) {
  if (st.pause.by == null) return false;
  if (slot === st.pause.by) { st.pause = { by: null, votes: [] }; return true; }
  if (!st.pause.votes.includes(slot)) st.pause.votes.push(slot);
  return false;
}
export const isPaused = (st) => st.pause.by != null;
