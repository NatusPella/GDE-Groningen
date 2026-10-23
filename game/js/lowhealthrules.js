// Zwaar gewond en doodgaan (#436): de pure regels van lowhealth.js (rode rand, wandelsnelheid, flits na een klap).
export const LOW_HEALTH = 25;
// the share of the normal walking pace left at the very lowest health
export const SLOWEST = 0.7;
export const FLASH_MIN_DROP = 8;

// 0 at the threshold and above, 1 at (almost) dead; health 0 or lower (you are dying): 1, the screen stays fully red
export function hurtLevel(health) {
  if (typeof health === 'number' && health <= 0) return 1;
  if (!(health > 0) || health >= LOW_HEALTH) return 0;
  return Math.min(1, 1 - health / LOW_HEALTH);
}

export function walkFactor(health) {
  return 1 - (1 - SLOWEST) * hurtLevel(health);
}

// De rode flits na een zware klap: 0 voor een klein verlies, tot 1 voor een verlies van 40 of meer.
export function flashFor(before, after) {
  return before - after > FLASH_MIN_DROP ? Math.min(1, (before - after) / 40) : 0;
}
