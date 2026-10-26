// The readable entry point for "the player" (#500).
//
// Why this exists: multiplayer.md says every local player is the main character
// of their own story and the opener is not the boss, yet the code reads
// world.player as a singleton in hundreds of places. Readers keep asking the
// same five questions (who plays on this device, is this device a guest, who
// are the others, which player has this id, what is the full list), so they get
// one named place to ask them instead of the bare property. New code uses this
// module; the player-singleton audit keeps the direct reads from growing.
//
// What it does NOT do: it keeps no state. The roster lives in
// spelersregister.js (world.players) and coopplayers.js (the lobby roster);
// world.player stays the storage of the local body and of nothing else. No
// second player list, no DOM, no Three.js, no network. A missing world returns
// null or an empty list instead of throwing, because update loops call this
// before a world exists.
import { hoofdspeler as eigenLichaam, spelers as registerSpelers, speler as registerSpeler } from './spelersregister.js';

// The body of the player on this device (slot 0 or the guest's own slot).
export function hoofdspeler(world) {
  return world ? eigenLichaam(world) || null : null;
}

// True when this device only draws snapshots and sends input (coopRole 'client').
export function isGast(world) {
  return !!world && world.coopRole === 'client';
}

// Every player of the session as a register record, the local one included.
export function elkeSpeler(world) {
  return world ? registerSpelers(world) : [];
}

// Only the other players, so a guest is never treated as one of them.
export function medespelers(world) {
  return elkeSpeler(world).filter((r) => r && !r.lokaal);
}

// One player by slot (0, 1, ...) or by character id ('tammo', 'anita', ...).
// Unknown or absent ids give null, never a fallback to the local player.
export function spelerMetId(world, id) {
  if (!world || id === null || id === undefined) return null;
  if (Number.isInteger(id)) return registerSpeler(world, id);
  const roster = world.coopRoster && Array.isArray(world.coopRoster.spelers) ? world.coopRoster.spelers : [];
  const rij = roster.find((s) => s && s.char === id);
  if (rij) return registerSpeler(world, rij.slot);
  const eigen = hoofdspeler(world);
  return eigen && eigen.character === id ? (elkeSpeler(world)[0] || null) : null;
}
