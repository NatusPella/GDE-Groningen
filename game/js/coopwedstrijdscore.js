// Samen spelen (#443): minigames waarin ieder op zijn eigen scherm zijn eigen ronde speelt (golf: pitch & putt, dezelfde baan voor iedereen, tegelijk)
// en wie het spel opende het scorebord houdt. Pure logica, zonder three.js en zonder DOM (scripts/coopwedstrijd_test.mjs).
// Elke speler meldt na elke baan zijn slagen; de host controleert ze (de volgende baan, een geldig aantal) en houdt de stand bij, ook voor spelers
// die wegvallen. Eerlijkheid: dezelfde banen, dezelfde par, een tijdslimiet voor de hele ronde en een kortere limiet zodra de eerste klaar is; banen
// die niet af zijn tellen als par + 4 slagen (zoals "opgepakt" in het spel zelf). Wie wegvalt telt niet mee en krijgt niets.
import { clamp } from './minigamekit.js';

export const SCORE_MAX_OVER = 4;      // een baan eindigt na par + 4 slagen (puttinglogic.js MAX_OVER_PAR)
export const NA_EERSTE_SCORE_S = 240; // zoveel tijd krijgen de anderen nadat de eerste de zes banen af heeft
export const SCORE_CAP_S = 1500;      // de hele ronde duurt hooguit 25 minuten
export const PRIJZEN_SCORE = [0, 100, 60, 40, 20]; // geld per plek, in de eigen portemonnee van wie de ronde uitspeelt
export const MAX_SPELERS_SCORE = 4;

// banen: [{ par }]; deeln: [{ slot, naam, char }]
export function maakScore(id, deeln, banen) {
  const lijst = deeln.slice(0, MAX_SPELERS_SCORE);
  return { id, deeln: lijst, banen: banen.map((b) => ({ par: Math.max(2, b.par | 0) })), kaart: Object.fromEntries(lijst.map((d) => [d.slot, []])), weg: {}, t: 0, eersteKlaar: null, fase: 'bezig', n: 0 };
}
const speler = (sc, slot) => sc.deeln.find((d) => d.slot === slot) || null;
export const banenGespeeld = (sc, slot) => (sc.kaart[slot] || []).length;
const klaarMet = (sc, slot) => banenGespeeld(sc, slot) >= sc.banen.length;

// Een speler meldt de slagen van zijn volgende baan; alleen de eerstvolgende baan van die speler telt, met een geldig aantal slagen.
export function meldBaan(sc, slot, baan, slagen) {
  if (sc.fase !== 'bezig' || !speler(sc, slot) || sc.weg[slot]) return false;
  const k = sc.kaart[slot];
  if (!Number.isInteger(baan) || baan !== k.length || baan >= sc.banen.length) return false;
  if (!Number.isInteger(slagen) || slagen < 1 || slagen > sc.banen[baan].par + SCORE_MAX_OVER) return false;
  k.push(slagen);
  sc.n++;
  if (klaarMet(sc, slot) && sc.eersteKlaar == null) sc.eersteKlaar = sc.t;
  return true;
}
export function verlaatScore(sc, slot) {
  if (!speler(sc, slot) || sc.weg[slot] || sc.fase !== 'bezig') return false;
  sc.weg[slot] = true; sc.n++;
  return true;
}
const actief = (sc) => sc.deeln.filter((d) => !sc.weg[d.slot] && !klaarMet(sc, d.slot));

// De klok loopt: geeft de gebeurtenissen van deze stap ({ type: 'klaar', reden }).
export function tikScore(sc, dt) {
  if (sc.fase !== 'bezig') return [];
  sc.t += dt;
  let reden = null;
  if (!actief(sc).length) reden = 'allen klaar';
  else if (sc.eersteKlaar != null && sc.t - sc.eersteKlaar > NA_EERSTE_SCORE_S) reden = 'tijd na de eerste';
  else if (sc.t > SCORE_CAP_S) reden = 'tijdslimiet';
  if (!reden) return [];
  sc.fase = 'klaar'; sc.n++;
  return [{ type: 'klaar', reden }];
}

// Het totaal van een speler: wat hij speelde, plus par + 4 voor elke baan die nog niet af is.
export function totaalVan(sc, slot, straf = true) {
  const k = sc.kaart[slot] || [];
  let slagen = 0, par = 0;
  sc.banen.forEach((b, i) => {
    if (i < k.length) { slagen += k[i]; par += b.par; }
    else if (straf) { slagen += b.par + SCORE_MAX_OVER; par += b.par; }
  });
  return { slagen, par, rel: slagen - par };
}
// De live stand: wie t.o.v. par over de gespeelde banen het best staat, met het aantal banen af.
export function standScore(sc) {
  return sc.deeln.map((d) => { const t = totaalVan(sc, d.slot, false); return { slot: d.slot, naam: d.naam, banen: banenGespeeld(sc, d.slot), slagen: t.slagen, rel: t.rel, klaar: klaarMet(sc, d.slot), weg: !!sc.weg[d.slot] }; })
    .sort((a, b) => (a.weg - b.weg) || (a.rel - b.rel) || (b.banen - a.banen));
}
export const relTekst = (rel) => (rel === 0 ? 'par' : rel > 0 ? `+${rel}` : `${rel}`);

// De uitslag: wie het minst slagen had (met de strafslagen voor wat niet af is) wint; gelijke totalen delen een plek; wie wegviel staat onderaan.
export function uitslagScore(sc) {
  const rijen = sc.deeln.map((d) => { const t = totaalVan(sc, d.slot, true); return { slot: d.slot, naam: d.naam, ai: false, weg: !!sc.weg[d.slot], fin: klaarMet(sc, d.slot), slagen: t.slagen, rel: t.rel, banen: banenGespeeld(sc, d.slot) }; })
    .sort((a, b) => (a.weg - b.weg) || (a.slagen - b.slagen) || (b.banen - a.banen));
  rijen.forEach((r, i) => { r.plek = i > 0 && !r.weg && !rijen[i - 1].weg && rijen[i - 1].slagen === r.slagen ? rijen[i - 1].plek : i + 1; r.tekst = r.weg ? 'niet meer erbij' : `${relTekst(r.rel)} (${r.slagen} slagen${r.fin ? '' : `, ${r.banen} van ${sc.banen.length} banen`})`; });
  return rijen;
}
export const winnaars = (rijen) => rijen.filter((r) => r.plek === 1 && !r.weg).map((r) => r.slot);
// Wat een speler krijgt: het bedrag van zijn plek en punten voor de loopbaan, ook als hij niet alle banen af had; wie wegviel niets.
export function beloningScore(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  if (!rij.fin) return { geld: 0, xp: 6 };
  return { geld: PRIJZEN_SCORE[rij.plek] | 0, xp: Math.max(4, 16 - rij.plek * 2) };
}

// De berichten: de stand voor iedereen die meedoet (~2 keer per seconde als er iets veranderde)
export function standEvent(sc) { return { k: 'wed', f: 'sc', n: sc.n, r: sc.deeln.map((d) => { const t = totaalVan(sc, d.slot, false); return [d.slot, banenGespeeld(sc, d.slot), t.slagen, t.rel, sc.weg[d.slot] ? 1 : 0]; }), t: Math.round(sc.t) }; }
export function leesStand(b) {
  if (!b || b.k !== 'wed' || b.f !== 'sc' || !Number.isInteger(b.n) || !Array.isArray(b.r) || b.r.length > MAX_SPELERS_SCORE) return null;
  const r = b.r.map((x) => (Array.isArray(x) && x.length === 5 && x.every(Number.isFinite) ? { slot: x[0] | 0, banen: clamp(x[1] | 0, 0, 30), slagen: x[2] | 0, rel: x[3] | 0, weg: !!x[4] } : null));
  return r.some((x) => !x) ? null : { f: 'sc', n: b.n, rijen: r, t: Number.isFinite(b.t) ? b.t : 0 };
}
