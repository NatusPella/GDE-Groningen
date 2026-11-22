// Voertuigen die aan een prestatie hangen (politieauto na "Foetsie", politieboot na "Heel Grunn zoekt je"): prestaties gelden voor het
// hele profiel (gde-prestaties-v1), maar het vrijspelen hoort bij DEZE save. Zonder dit stond de politieauto bij een nieuw spel meteen in
// de garage en dus als ontdekt. De basislijn is wat het profiel al had toen deze save begon; alleen wat daarna komt, telt.
// Een oude save zonder basislijn krijgt een lege lijst: die behoudt wat hij al had (geen savebreuk).
// scripts/garageontdekt_nieuwspel_test.mjs.

// Alleen bekende ids, geen dubbelen; geen lijst (oude save) geeft een lege lijst.
export function cleanBase(list, ids) {
  if (!Array.isArray(list)) return [];
  const uit = [];
  for (const id of list) if (typeof id === 'string' && ids.includes(id) && !uit.includes(id)) uit.push(id);
  return uit;
}

// Nieuw spel: de basislijn is alles wat het profiel nu al heeft.
export const baselineNow = (ids, isUnlockedFn) => ids.filter((id) => !!isUnlockedFn(id));

// Telt de prestatie voor deze save? Alleen als hij er is en niet al in de basislijn stond.
export const earnedThisSave = (id, isUnlockedFn, base) => !!isUnlockedFn(id) && !(base || []).includes(id);
