// Signalement (#43, steps 4 and 5): what the police are told about you. A
// witness' call (pedestrians.js) or a seen crime notes the vehicle you are in
// (which one, what colour) or, on foot, that you are on foot. When you are
// out of sight and in something else (another car, a new coat of paint, on
// foot), the units no longer know what to look for: the search gives up
// faster. Pure logic; police.js applies the factor.
export const MISMATCH_DECAY = 2.5;

export function profileOf(world) {
  const v = world && world.player && world.player.inVehicle;
  if (!v) return { vehicle: null, color: null };
  return { vehicle: v.id ?? v.uid ?? v.name ?? (v.model && v.model.name) ?? 'voertuig', color: v.color || (v.model && v.model.color) || null, ref: v };
}

// Does what you are in now still fit the description? No description: it fits.
export function fitsProfile(profile, world) {
  if (!profile) return true;
  const now = profileOf(world);
  if (profile.ref && now.ref && profile.ref !== now.ref) return false;
  if ((profile.vehicle === null) !== (now.vehicle === null)) return false;
  return profile.color === now.color;
}

// Multiplier on the search's decay timer while out of sight.
export function decayFactor(profile, world) {
  return fitsProfile(profile, world) ? 1 : MISMATCH_DECAY;
}

// The one-off hint while you hide in something that no longer fits the
// description (HUD feedback, #43 step 7): says what the police are looking for.
export const MISMATCH_HINT = 'De politie zoekt je oude voertuig. Dit is een andere: blijf uit het zicht.';
export const ON_FOOT_HINT = 'De politie zoekt je voertuig. Te voet ben je moeilijker te vinden: blijf uit het zicht.';
export const MATCH_HINT = 'Ze zoeken je nog steeds in dit voertuig.';
export function hintFor(profile, world, hinted) {
  if (!profile || hinted) return null;
  if (fitsProfile(profile, world)) return null;
  return profileOf(world).vehicle === null ? ON_FOOT_HINT : MISMATCH_HINT;
}
