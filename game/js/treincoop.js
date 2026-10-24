// Samen met de trein (#444, #442): de rollen en regels, puur (geen THREE, geen DOM, geen netwerk), zodat de coöp-laag ze
// kan aanroepen en scripts/coop/treincoop_test.mjs ze kan doorlopen. Alle spelers zijn gelijkwaardig; de rol hangt
// aan wie het eerst instapt, niet aan wie host is. Wie instapt kiest een slot (de spelersindex van de sessie).
//  - machinist: de hendel, de noodrem, de dienst starten en stoppen (één per trein);
//  - conducteur: de deuren (O) en de waakzaamheidsknop (K), en sluit de deuren voor het vertrek;
//  - passagier: loopt rond en zit in de wagen.
// Valt de machinist weg, dan neemt de conducteur het over, anders de eerste passagier, anders remt de trein veilig af.
// De beloning van een halte: iedereen aan boord krijgt het volle bedrag (visie van de eigenaar, #452).

export const ROLES = ['machinist', 'conducteur', 'passagier'];

export const newCrew = () => ({ machinist: null, conducteur: null, passagiers: [], service: false });

export const members = (c) => [c.machinist, c.conducteur, ...c.passagiers].filter((s) => s !== null);
export const roleOf = (c, slot) => (c.machinist === slot ? 'machinist' : c.conducteur === slot ? 'conducteur' : c.passagiers.includes(slot) ? 'passagier' : null);

// Instappen. want: de rol die de speler graag wil ('conducteur' of 'passagier'); de eerste is altijd machinist.
// Halverwege een dienst stapt niemand meer in (lateInstap): dan { ok: false }.
export function board(c, slot, want = 'passagier') {
  if (roleOf(c, slot)) return { ok: true, role: roleOf(c, slot) };
  if (c.service && members(c).length) return { ok: false, why: 'dienst bezig' };
  if (c.machinist === null) { c.machinist = slot; return { ok: true, role: 'machinist' }; }
  if (want === 'conducteur' && c.conducteur === null) { c.conducteur = slot; return { ok: true, role: 'conducteur' }; }
  c.passagiers.push(slot);
  return { ok: true, role: 'passagier' };
}

// Uitstappen of wegvallen. Geeft { takeover: slot of null, brake: bool }: brake betekent dat niemand meer bestuurt en de
// trein veilig afremt (de hendel op Rem 2, geen dienst verder).
export function leave(c, slot) {
  const was = roleOf(c, slot);
  if (!was) return { takeover: null, brake: false };
  if (was === 'passagier') { c.passagiers = c.passagiers.filter((s) => s !== slot); return { takeover: null, brake: false }; }
  if (was === 'conducteur') { c.conducteur = null; return { takeover: null, brake: false }; }
  c.machinist = null;
  const next = c.conducteur !== null ? 'conducteur' : c.passagiers.length ? 'passagier' : null;
  if (next === 'conducteur') { c.machinist = c.conducteur; c.conducteur = null; }
  else if (next === 'passagier') c.machinist = c.passagiers.shift();
  if (c.machinist === null) { c.service = false; return { takeover: null, brake: members(c).length === 0 ? false : true }; }
  return { takeover: c.machinist, brake: false };
}

// De rol is wisselbaar: de machinist geeft de hendel aan de conducteur (of een passagier) en neemt diens plek in.
export function swap(c, from, to) {
  if (c.machinist !== from || roleOf(c, to) === null || to === from) return false;
  const was = roleOf(c, to);
  c.machinist = to;
  if (was === 'conducteur') c.conducteur = from;
  else { c.passagiers = c.passagiers.filter((s) => s !== to); c.passagiers.push(from); }
  return true;
}

// Mag deze speler dit? action: 'hendel' | 'noodrem' | 'dienst' | 'deuren' | 'waak' | 'rondlopen'.
export function may(c, slot, action) {
  const r = roleOf(c, slot);
  if (!r) return false;
  if (action === 'hendel' || action === 'noodrem' || action === 'dienst') return r === 'machinist';
  if (action === 'deuren' || action === 'waak') return r === 'machinist' || r === 'conducteur';
  return true; // rondlopen
}

// De waakzaamheid: telt een teken van de machinist of de conducteur; de rem grijpt in als niemand reageert (treincabine.js).
export const ackFrom = (c, slot) => may(c, slot, 'waak');

// De beloning van één gebeurtenis (een halte): iedereen aan boord krijgt het volle bedrag, zonder verdeling of bonus. Geeft { slot: euro }.
export function splitReward(c, total) {
  const all = members(c);
  if (!all.length || total <= 0) return {};
  const out = {};
  for (const s of all) out[s] = Math.round(total);
  return out;
}

// De stand die een checkpoint na elke halte bewaart (voor een gast die tussendoor wegvalt of een host die wisselt).
export const snapshot = (c) => JSON.stringify({ m: c.machinist, c: c.conducteur, p: c.passagiers, s: c.service });
export function restore(json) {
  const o = JSON.parse(json);
  return { machinist: o.m, conducteur: o.c, passagiers: o.p || [], service: !!o.s };
}
