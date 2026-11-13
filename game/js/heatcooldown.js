// #838: na een spuiterij of nieuwe platen is de garage even geen plek om de politie
// van je af te schudden. Eén kleine, pure regel zodat garage en spuitbeurt dezelfde
// cooldown delen; kleding heeft al zijn eigen cooldown in shops.js.
export const WANTED_CLEAR_COOLDOWN = 120;

export function wantedClearCooldownLeft(world) {
  const at = world && Number.isFinite(world.wantedClearAt) ? world.wantedClearAt : -Infinity;
  const now = world && Number.isFinite(world.time) ? world.time : 0;
  return Math.max(0, WANTED_CLEAR_COOLDOWN - (now - at));
}

export function markWantedCleared(world) {
  if (world && Number.isFinite(world.time)) world.wantedClearAt = world.time;
}
