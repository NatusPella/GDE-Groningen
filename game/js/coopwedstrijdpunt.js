// Samen spelen (#443): minigames met punten en beurten tegen elkaar (skatepark, hengelen), en wie het spel opende houdt het scorebord.
// Pure logica, zonder three.js en zonder DOM (scripts/coopwedstrijd_test.mjs). Zelfde kader als de golfronde (coopwedstrijdscore.js) en de
// poging op tijd (coopwedstrijdtijd.js): elke speler speelt zijn eigen beurt op zijn eigen scherm en meldt de punten van die beurt; de host
// controleert ze (de volgende beurt, een geldig aantal punten) en houdt de stand bij, ook voor spelers die wegvallen.
// Eerlijkheid: iedereen speelt hetzelfde spel met hetzelfde aantal beurten en dezelfde limiet; de hoogste som wint en gelijke sommen delen
// een plek. Wie wegvalt telt niet mee en krijgt niets; wie niet alle beurten afmaakte krijgt alleen punten voor de loopbaan.
import { clamp } from './minigamekit.js';

export const MAX_SPELERS_PUNT = 4;
export const MAX_BEURTEN_PUNT = 9;
export const MAX_PUNT = 999999;        // per beurt; de hele som blijft daar ruim onder
export const NA_EERSTE_PUNT_S = 90;    // zoveel tijd krijgen de anderen nadat de eerste zijn beurten af heeft
export const PUNT_CAP_S = 420;         // de hele wedstrijd duurt hooguit 7 minuten
export const PRIJZEN_PUNT = [0, 90, 55, 30, 15]; // geld per plek, in de eigen portemonnee van wie alle beurten afmaakte

// deeln: [{ slot, naam, char }]; beurten: hoeveel beurten iedere speler speelt; format: punten als tekst (bv. kg), alleen voor de host
export function maakPunt(id, deeln, { beurten = 1, naEerste = NA_EERSTE_PUNT_S, cap = PUNT_CAP_S, format = null } = {}) {
  const lijst = deeln.slice(0, MAX_SPELERS_PUNT);
  return {
    punt: true, id, deeln: lijst, beurten: clamp(beurten | 0, 1, MAX_BEURTEN_PUNT),
    kaart: Object.fromEntries(lijst.map((d) => [d.slot, []])), weg: {}, t: 0, eersteKlaar: null, fase: 'bezig', n: 0,
    naEerste, cap, format: typeof format === 'function' ? format : null,
  };
}
const speler = (sc, slot) => sc.deeln.find((d) => d.slot === slot) || null;
export const beurtenGespeeld = (sc, slot) => (sc.kaart[slot] || []).length;
const klaarMet = (sc, slot) => beurtenGespeeld(sc, slot) >= sc.beurten;

// Een speler meldt de punten van zijn volgende beurt; alleen de eerstvolgende beurt van die speler telt, met een geldig aantal punten.
export function meldPunt(sc, slot, beurt, punten) {
  if (sc.fase !== 'bezig' || !speler(sc, slot) || sc.weg[slot]) return false;
  const k = sc.kaart[slot];
  if (!Number.isInteger(beurt) || beurt !== k.length || beurt >= sc.beurten) return false;
  if (!Number.isInteger(punten) || punten < 0 || punten > MAX_PUNT) return false;
  k.push(punten);
  sc.n++;
  if (klaarMet(sc, slot) && sc.eersteKlaar == null) sc.eersteKlaar = sc.t;
  return true;
}
export function verlaatPunt(sc, slot) {
  if (!speler(sc, slot) || sc.weg[slot] || sc.fase !== 'bezig') return false;
  sc.weg[slot] = true; sc.n++;
  return true;
}
const actief = (sc) => sc.deeln.filter((d) => !sc.weg[d.slot] && !klaarMet(sc, d.slot));

// De klok loopt: geeft de gebeurtenissen van deze stap ({ type: 'klaar', reden }).
export function tikPunt(sc, dt) {
  if (sc.fase !== 'bezig') return [];
  sc.t += dt;
  let reden = null;
  if (!actief(sc).length) reden = 'allen klaar';
  else if (sc.eersteKlaar != null && sc.t - sc.eersteKlaar > sc.naEerste) reden = 'tijd na de eerste';
  else if (sc.t > sc.cap) reden = 'tijdslimiet';
  if (!reden) return [];
  sc.fase = 'klaar'; sc.n++;
  return [{ type: 'klaar', reden }];
}

// Het totaal van een speler over de beurten die hij speelde.
export const totaalVan = (sc, slot) => (sc.kaart[slot] || []).reduce((a, v) => a + v, 0);

// De punten als tekst: de eenheid van het spel (kg bij hengelen, punten bij skate) of anders gewoon punten.
export const puntTekst = (sc, punten) => (sc.format ? sc.format(punten) : `${punten.toLocaleString('nl-NL')} punten`);

// De live stand: de hoogste som bovenaan, dan wie meer beurten af had.
export function volgordePunt(a, b) { return (a.weg - b.weg) || (b.slagen - a.slagen) || (b.banen - a.banen); }
export function standPunt(sc) {
  return sc.deeln
    .map((d) => ({ slot: d.slot, naam: d.naam, banen: beurtenGespeeld(sc, d.slot), slagen: totaalVan(sc, d.slot), rel: 0, punten: totaalVan(sc, d.slot), klaar: klaarMet(sc, d.slot), weg: !!sc.weg[d.slot] }))
    .sort(volgordePunt);
}

// De uitslag: de hoogste som wint; gelijke sommen (en evenveel beurten) delen een plek; wie wegviel staat onderaan.
export function uitslagPunt(sc) {
  const rijen = sc.deeln.map((d) => {
    const k = sc.kaart[d.slot] || [];
    return { slot: d.slot, naam: d.naam, ai: false, weg: !!sc.weg[d.slot], fin: klaarMet(sc, d.slot), punten: totaalVan(sc, d.slot), banen: k.length, slagen: totaalVan(sc, d.slot), rel: 0 };
  });
  rijen.sort((a, b) => (a.weg - b.weg) || (b.punten - a.punten) || (b.banen - a.banen));
  rijen.forEach((r, i) => {
    r.plek = i > 0 && !r.weg && !rijen[i - 1].weg && rijen[i - 1].punten === r.punten && rijen[i - 1].banen === r.banen ? rijen[i - 1].plek : i + 1;
    r.tekst = r.weg ? 'niet meer erbij' : `${puntTekst(sc, r.punten)}${r.fin ? '' : ` (${r.banen} van ${sc.beurten} ${sc.beurten === 1 ? 'beurt' : 'beurten'})`}`;
  });
  return rijen;
}
export const winnaars = (rijen) => rijen.filter((r) => r.plek === 1 && !r.weg).map((r) => r.slot);

// Wat een speler krijgt: het bedrag van zijn plek en punten voor de loopbaan als hij alle beurten afmaakte; anders een paar punten; wie wegviel niets.
export function beloningPunt(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  if (!rij.fin) return { geld: 0, xp: 6 };
  return { geld: PRIJZEN_PUNT[rij.plek] | 0, xp: Math.max(4, 16 - rij.plek * 2) };
}

// Een spel met meer dan één beurt (skatepark: twee runs, de punten tellen op): de spelerskant houdt zelf bij welke beurt hij doet
// en meldt elke beurt apart aan de host (meldPunt met de beurt-index). Puur, zodat de beurtelling zonder DOM te testen is.
export function maakBeurten(beurten) {
  return { beurten: clamp(beurten | 0, 1, MAX_BEURTEN_PUNT), gehad: [] };
}
export const somVan = (st) => (st && Array.isArray(st.gehad) ? st.gehad.reduce((a, v) => a + v, 0) : 0);
export const beurtNu = (st) => (st && Array.isArray(st.gehad) ? st.gehad.length : 0);
// Deze beurt is klaar met `punten`: geef terug of er nog een beurt volgt en wat de som tot nu toe is. Na de laatste beurt telt niets meer.
export function beurtKlaar(st, punten) {
  if (!st || !Array.isArray(st.gehad) || st.gehad.length >= st.beurten) return { volgende: false, som: somVan(st) };
  const p = Number(punten);
  st.gehad.push(Number.isFinite(p) ? clamp(Math.round(p), 0, MAX_PUNT) : 0);
  return { volgende: st.gehad.length < st.beurten, som: somVan(st) };
}

// De berichten: de stand voor iedereen die meedoet (~2 keer per seconde als er iets veranderde). Zelfde vorm als golf en tijd:
// [slot, beurten af, punten, 0 (geen rel), weg], zodat leesStand en het bord bij een gast hetzelfde blijven lezen.
export function standEventPunt(sc) {
  return { k: 'wed', f: 'sc', n: sc.n, r: sc.deeln.map((d) => [d.slot, beurtenGespeeld(sc, d.slot), totaalVan(sc, d.slot), 0, sc.weg[d.slot] ? 1 : 0]), t: Math.round(sc.t) };
}
