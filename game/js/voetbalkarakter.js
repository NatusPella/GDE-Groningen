// De aansluiting van de voetbalsim op het personage (#981, #1005): de speler voetbalt als TESSA (zij komt van het platteland en voetbalt al sinds het dorpsteam). Dit bestand is een
// dunne, ontkoppelde laag met standaard-implementaties: zonder haken doet het niets (geen bonus, geen wissel, geen extra teksten), zodat de sim ook zonder de tak van de Tessa-agent
// (karakterbonus.js, branch tessa-platteland-21-11) draait en test. Bij de merge zet één regel de haken (zie docs/VOETBAL-SIM-21-11.md):
//   zetVoetbalKarakterHaken({ bonus: (k) => ({ sprint: voetbalSprint(k), schot: voetbalSchot(k), aanname: voetbalAanname(k) }), voorActiviteit: karakterVoorActiviteit, regels: TESSA_REGELS.voetbal });
// De wissel is per speler: elke mens die meespeelt wisselt in zijn eigen spel (bij Samen spelen op zijn eigen scherm) en wisselt na afloop terug; de bonus geldt voor die speler.
// Puur: geen DOM, geen THREE, geen wereld buiten wat de haken zelf aanraken.

export const NEUTRALE_BONUS = Object.freeze({ sprint: 1, schot: 1, aanname: 1 });
export const KARAKTER_VOETBAL = 'anita'; // de id van Tessa in world.player.character (de speler ziet "Tessa")

const haken = { bonus: null, voorActiviteit: null, regels: null };
export function zetVoetbalKarakterHaken(h) { Object.assign(haken, h || {}); }
export function wisKarakterHaken() { haken.bonus = null; haken.voorActiviteit = null; haken.regels = null; }

const klem = (v) => (Number.isFinite(v) ? Math.min(1.25, Math.max(1, v)) : 1);
// De factoren voor een speler (alle >= 1; 1 is neutraal). Zonder haak: neutraal.
export function voetbalBonusVan(karakter = KARAKTER_VOETBAL) {
  const b = haken.bonus ? haken.bonus(karakter) : null;
  return b ? { sprint: klem(b.sprint), schot: klem(b.schot), aanname: klem(b.aanname) } : { ...NEUTRALE_BONUS };
}

// Bij de start van een wedstrijd of penaltyserie: wissel (kort, soepel) naar Tessa via het bestaande mechanisme; geeft een bon terug die bij het einde terugwisselt.
// Zonder haak (of zonder wissel) geeft dit null en gebeurt er niets.
export function karakterStart(w, id = 'voetbal') {
  try {
    const act = haken.voorActiviteit ? haken.voorActiviteit(id) : null;
    if (!act) return null;
    const bon = typeof act.start === 'function' ? act.start(w) : null;
    return { act, bon };
  } catch (e) { return null; }
}
export function karakterEind(w, bon) {
  try { if (bon && bon.act && typeof bon.act.eind === 'function') bon.act.eind(w, bon.bon); } catch (e) { /* de wissel terug mag het einde van de wedstrijd nooit stoppen */ }
}

// Teksten van Tessa (alleen tekst): een viering na een doelpunt, een sneer naar de keeper of de tegenstander, de uitleg. Zonder haak: null.
const kies = (lijst, rng) => (Array.isArray(lijst) && lijst.length ? lijst[Math.floor((rng ? rng() : Math.random()) * lijst.length) % lijst.length] : null);
export const tessaUitleg = () => (haken.regels && haken.regels.uitleg) || null;
export function tessaRegel(soort, rng) {
  const r = haken.regels;
  return r ? kies(r[soort], rng) : null;
}
