// De planning van de snackwagens in de wereld (Snackimperium, epic #1095, #1102): welke wagens (de jouwe, die van je medewerkers en die van Us Mem Snacks) er nu in beeld zijn,
// hoogstens MAX_WAGONS (de dichtstbijzijnde) binnen de streamstraal met hysterese, met kleur, bord, richting en verkoper. Puur en deterministisch: geen THREE, geen klok, geen Math.random
// (snackvans3d.js tekent wat dit teruggeeft; scripts/snackvans3d_test.mjs).

import { hashUnit, hashPick } from './bezithash.js';
import { FIRST_NAMES } from './businessstaff.js';
import { INK } from './mapstyle.js';

export const SPAWN_R = 260, DESPAWN_R = 340;          // een wagen verschijnt binnen 260 m en verdwijnt pas voorbij 340 m: geen geflikker aan de rand
export const MAX_WAGONS = 5;                           // hoogstens vijf tegelijk (de dichtstbijzijnde): geheugen en tekenwerk blijven klein
export const PLAN_EVERY_S = 0.5;
export const COLORS = { own: INK.homeBlue, fleet: INK.green, rival: INK.red };
export const SIGNS = { own: 'TAM & TES', fleet: 'TAM & TES', rival: 'US MEM SNACKS' };
// De naam op de eigen wagen: de verhaal-lead kiest hem; standaard 'TAM & TES' (eigenaar 21-11). Alleen hoofdletters en spaties, hoogstens 18 tekens.
export const setOwnSign = (t) => { const s = String(t || '').toUpperCase().replace(/[^A-Z0-9 \u00C0-\u017F'-]/g, '').trim().slice(0, 18); SIGNS.own = s || 'TAM & TES'; return SIGNS.own; };
const SHIRTS = [0xe8c24a, 0xf4f1e6, 0x9bb8d3, 0xd98b5f];

// sites: [{ spot, x, y, kind: 'own' | 'fleet' | 'rival', staff? }] (snacklive.wagonSites); player: { x, y }; current: de sleutels die al in beeld zijn.
export function planWagons(sites, player, current = new Set(), max = MAX_WAGONS) {
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return [];
  const out = [];
  for (const s of sites || []) {
    if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
    const key = `${s.kind}:${s.spot}`, d = Math.hypot(s.x - player.x, s.y - player.y);
    if (d > (current.has(key) ? DESPAWN_R : SPAWN_R)) continue;
    out.push({ key, spot: s.spot, kind: s.kind, x: s.x, y: s.y, d, heading: Math.floor(hashUnit('snack-richting', s.spot) * 4) * (Math.PI / 2), color: COLORS[s.kind] || COLORS.fleet, sign: s.sign || SIGNS[s.kind] || SIGNS.fleet,
      seller: sellerLook(s) });
  }
  out.sort((a, b) => a.d - b.d || (a.key < b.key ? -1 : 1));
  return out.slice(0, Math.max(0, max));
}
// De verkoper achter het luik: een vaste naam en trui uit de plek; de medewerker van je wagen heeft zijn eigen naam.
export function sellerLook(s) {
  return { name: s.staff || (s.kind === 'own' ? 'Jij' : hashPick(FIRST_NAMES, 'snack-verkoper', s.spot)), shirt: s.kind === 'rival' ? 0xc0392b : hashPick(SHIRTS, 'snack-trui', s.spot), skin: hashPick([0xe8b48a, 0xcaa06f, 0x8a5a3c, 0xf0c9a0], 'snack-huid', s.spot) };
}
// Wat er veranderd is tussen twee plannen: { add: [plan], remove: [key], keep: [plan] }.
export function diffWagons(current, plan) {
  const want = new Set(plan.map((p) => p.key));
  return { add: plan.filter((p) => !current.has(p.key)), keep: plan.filter((p) => current.has(p.key)), remove: [...current].filter((k) => !want.has(k)) };
}
