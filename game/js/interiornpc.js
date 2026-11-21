// The people in an interior (epic Interieurs, #1150): the look of each role as plain data (what buildPersonMesh wants),
// deterministic from the building seed and the place in the layout, so every player sees the same shopkeeper in the same
// shop. Pure. Clothes per role come from here until the outfit system (epic Kleding) sets a provider with assignRoleOutfit:
// one hook, so a role can wear a real outfit there without this file changing.
import { hash2 } from './rng.js';

const SKIN = [0xecc8a8, 0xd8a47c, 0xb9825c, 0x8a5a3c, 0xf1d6bd, 0x6a4430];
const HAIR = [0x1b1716, 0x3a2a20, 0x6a4a2e, 0xb08a5e, 0xd8d4cc, 0x8a8a8e, 0xc2423a];
const SHIRTS = [0x3f6ea8, 0x9e3027, 0x4f8a52, 0xd8a43a, 0x6a4a8a, 0x2f7a7a, 0xd8d4cc, 0x8a8a8e];
const PANTS = [0x2f3b52, 0x26262a, 0x4a3a2a, 0x5a6a7a];
const STYLES_F = ['long', 'bun', 'short', 'bob'];
const STYLES_M = ['short', 'bald', 'short', 'buzz'];

// per role: how it dresses; shirtFrom: 'accent' (the apron takes the shop colour), a fixed colour, or null (random)
export const ROLES = {
  winkelier: { top: 'cardigan', shirtFrom: 'accent' },
  serveerster: { top: 'blazer', shirt: 0x1f1f24 },
  klant: {},
  barman: { top: 'blazer', shirt: 0x1f1f24 },
  gast: {},
  receptionist: { top: 'blazer', shirt: 0x2a3f6a },
  medewerker: { top: 'blazer', shirt: null },
  bewoner: { top: 'cardigan' },
  koster: { top: 'coat', shirt: 0x2a2a2e },
  bezoeker: {},
  loketmedewerker: { top: 'blazer', shirt: 0x2f4f8a },
  reiziger: {},
  bibliothecaris: { top: 'cardigan', shirt: 0x6a8a5a, glasses: true },
  lezer: {},
  monteur: { top: 'jacket', shirt: 0x2f5aa8 },
  baliemedewerker: { top: 'blazer', shirt: 0x4a5a6a },
};

let provider = null;
// fn(role, seed) -> an opts object for buildPersonMesh (the outfit of epic Kleding) or null for the default
export function assignRoleOutfit(fn) { provider = typeof fn === 'function' ? fn : null; }

// who stands in place `i` of building seed `seed`: { shirt, skin, opts } for buildPersonMesh(shirt, skin, opts)
// The role pool of the outfit system (clothingdata.js ROLE_POOLS) that dresses each role of an interior; 'sub' (the shop type or
// the café type) can refine it: a baker wears the baker's pool.
const CLOTHING_ROLE = {
  serveerster: 'winkelier', winkelier: 'winkelier', klant: 'voetganger', barman: 'winkelier', gast: 'voetganger', receptionist: 'zakenman', medewerker: 'zakenman',
  bewoner: 'voetganger', koster: 'zakenman', bezoeker: 'voetganger', loketmedewerker: 'zakenman', reiziger: 'toerist', bibliothecaris: 'winkelier',
  lezer: 'student', monteur: 'bouwvakker', baliemedewerker: 'zakenman',
};
function clothingRole(role, sub = null) {
  if (role === 'winkelier' && sub === 'bakker') return 'bakker';
  if ((role === 'winkelier' || role === 'barman' || role === 'serveerster') && (sub === 'snackbar' || sub === 'restaurant')) return 'kok';
  if (role === 'gast' && sub === 'kroeg') return 'feestganger';
  return CLOTHING_ROLE[role] || 'voetganger';
}

export function npcLook(role, seed, i, accent = 0x3f6ea8, sub = null) {
  const R = ROLES[role] || {};
  const h = (k) => hash2((seed % 100003) * 0.013 + k * 3.7, i * 1.31 + k * 0.77);
  const female = h(1) < 0.5;
  const pick = (a, k) => a[Math.floor(h(k) * a.length)];
  const skin = pick(SKIN, 2);
  let shirt = R.shirtFrom === 'accent' ? accent : R.shirt != null ? R.shirt : pick(SHIRTS, 3);
  const opts = {
    variant: female ? 'female' : 'male', hair: pick(HAIR, 4), hairStyle: female ? pick(STYLES_F, 5) : pick(STYLES_M, 5),
    pants: pick(PANTS, 6), shoes: 0x2a1d14, seed: (seed + i * 97) % 9973,
  };
  // the outfit system dresses the person from the role pool (epic Kleding); the look of the role is the fallback
  opts.role = clothingRole(role, sub);
  const own = provider ? provider(role, seed, i) : null;
  if (own) return { shirt: own.shirt ?? shirt, skin: own.skin ?? skin, opts: { ...opts, ...(own.opts || {}) } };
  return { shirt, skin, opts };
}

// yaw (rotation.y of a figure, model front along +x) for a face of interiorlayout: 0 = looking at the door wall (-v) ...
export function yawOfFace(frame, face) {
  const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]][face & 3];
  const wx = frame.tx * dir[0] - frame.nx * dir[1], wy = frame.ty * dir[0] - frame.ny * dir[1];
  return -Math.atan2(wy, wx);
}
