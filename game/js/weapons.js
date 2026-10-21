// Leaf: the weapon table and its predicates (pure data). combat.js re-exports them, so systems that only
// ask what a weapon is (pedestrians, HUD) do not import the combat code (#108).
// kind: melee (a swing that lands at the end of its wind-up), gun (bullets),
// water (harmless spray), throw (carbidbus) and rocket (firework); the last
// three fly in throwables.js. slot is the number key (1 melee, 2 handguns,
// 3 long guns, 4 explosives), pressing it again cycles within the slot.
// Melee weapons are owned with ammo 1, which is never used up.
export const WEAPONS = {
  fists: { kind: 'melee', slot: 1, damage: 12, range: 1.1, cooldown: 0.45, ammo: Infinity, swing: 'jab', knock: 0.4, push: 2.6, prop: 0.6, sound: 'flesh' },
  knuppel: { kind: 'melee', slot: 1, damage: 30, range: 1.7, cooldown: 0.7, windup: 0.14, swing: 'bat', knock: 0.75, push: 4, prop: 3, sound: 'wood' },
  hockeystick: { kind: 'melee', slot: 1, damage: 18, range: 1.9, cooldown: 0.55, windup: 0.12, swing: 'slap', knock: 0.9, push: 2.8, prop: 2, sound: 'wood' },
  bezem: { kind: 'melee', slot: 1, damage: 6, range: 2.0, cooldown: 0.5, windup: 0.1, swing: 'sweep', knock: 0.35, push: 3.4, prop: 1, sound: 'broom', cone: 1.3 },
  fietspomp: { kind: 'melee', slot: 1, damage: 14, range: 1.3, cooldown: 0.32, windup: 0.06, swing: 'stab', knock: 0.2, push: 1.6, prop: 1, sound: 'metal' },
  klomp: { kind: 'melee', slot: 1, damage: 24, range: 1.2, cooldown: 0.6, windup: 0.18, swing: 'overhead', knock: 0.65, push: 2.2, prop: 2.5, sound: 'klomp' },
  polsstok: { kind: 'melee', slot: 1, damage: 26, range: 3.4, cooldown: 1.3, windup: 0.34, swing: 'thrust', knock: 1, push: 5.5, prop: 3, sound: 'wood', cone: 0.6 },
  pistol: { kind: 'gun', slot: 2, damage: 20, range: 26, cooldown: 0.32, speed: 55 },
  uzi: { kind: 'gun', slot: 2, damage: 9, range: 20, cooldown: 0.08, speed: 60 },
  waterpistool: { kind: 'water', slot: 2, damage: 0, range: 9, cooldown: 0.07, speed: 13 },
  shotgun: { kind: 'gun', slot: 3, damage: 16, range: 11, cooldown: 0.85, speed: 48, pellets: 6, spread: 0.3 },
  jachtgeweer: { kind: 'gun', slot: 3, damage: 95, range: 110, cooldown: 1.5, speed: 140, scope: true },
  carbidbus: { kind: 'throw', slot: 4, range: 9, cooldown: 1.2, speed: 8 },
  vuurwerk: { kind: 'rocket', slot: 4, range: 45, cooldown: 0.9, speed: 24 },
};

export const WEAPON_KEYS = Object.keys(WEAPONS);
export const SLOTS = 4;

export function isMeleeWeapon(key) { return !!WEAPONS[key] && WEAPONS[key].kind === 'melee'; }
// aimed and fired (guns, water, explosives): right mouse aims these
export function isRangedWeapon(key) { return !!WEAPONS[key] && WEAPONS[key].kind !== 'melee'; }
export function isGunWeapon(key) { return !!WEAPONS[key] && WEAPONS[key].kind === 'gun'; }
