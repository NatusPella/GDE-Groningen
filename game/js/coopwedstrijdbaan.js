// Samen spelen (#443): een baanwedstrijd in de wereld van wie het spel opende. Iedereen doet mee op zijn eigen voertuig
// (dezelfde boot of auto voor iedereen) over dezelfde vaste baan, tegelijk, met één gezamenlijke start en finish. Wie het
// spel opende houdt per deelnemer de voortgang bij (de baan zelf kent de route) en rekent de stand en de uitslag uit.
// Pure logica, zonder three.js en zonder DOM (scripts/coopwedstrijd_test.mjs).
//
// Voortgang: cp = gepasseerde punten op de baan (0 .. cps), s = meters op de baan sinds het laatste punt. Wie alle punten
// gehad heeft is klaar, met zijn eigen finishtijd. Achteruit telt nooit: de stand zakt niet als iemand even terugvaart.
// Wie wegvalt telt niet meer mee en krijgt niets; wie niet finisht krijgt alleen loopbaanpunten. De eerste die finisht start
// de korte klok voor de anderen, en na de tijdslimiet is de wedstrijd klaar (dan telt de stand op de baan).
import { clamp, fmtTime } from './minigamekit.js';

export const PRIJZEN_BAAN = [0, 100, 70, 45, 25]; // geld per plek, in de eigen portemonnee van wie finisht
export const NA_EERSTE_BAAN_S = 120; // zoveel tijd krijgen de anderen nadat de eerste finisht
export const BAAN_CAP_S = 900;       // de hele wedstrijd duurt hooguit een kwartier
export const MAX_SPELERS_BAAN = 4;
export const MAX_CP_BAAN = 30;       // het stand-bericht draagt de punten als klein getal (coopwedstrijdscore.leesStand)

// id: de wedstrijd (WEDSTRIJDEN), deeln: [{ slot, naam, char }], cps: het aantal punten tot de finish,
// cpNaam: hoe een punt heet in de uitslag ('bruggen', 'tonnen'), extra: { v } (waar het gespeeld wordt, voor de gast).
export function maakBaan(id, deeln, { cps = 11, cpNaam = 'punten', cap = BAAN_CAP_S, naEerste = NA_EERSTE_BAAN_S } = {}) {
  const lijst = deeln.slice(0, MAX_SPELERS_BAAN);
  return { baan: true, id, deeln: lijst, cps: clamp(cps | 0, 1, MAX_CP_BAAN), cpNaam: tekst(cpNaam, 12) || 'punten', cap, naEerste, v: {}, weg: {}, t: 0, fase: 'bezig', n: 0, eersteKlaar: null };
}
function tekst(s, n) { return typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').slice(0, n) : ''; }
const speler = (sc, slot) => sc.deeln.find((d) => d.slot === slot) || null;
export const baanVan = (sc, slot) => sc.v[slot] || null;
export const baanKlaar = (sc, slot) => !!(sc.v[slot] && sc.v[slot].klaar);

// De baan meldt de voortgang van een deelnemer. cp en s gaan nooit achteruit; klaar (of alle punten gehad) zet de finishtijd
// (tijd in seconden, anders de klok van de wedstrijd). Geeft true als er iets veranderde (voor de stand op het bord).
export function meldBaan(sc, slot, { cp = 0, s = 0, klaar = false, tijd = null } = {}) {
  if (!sc || sc.fase !== 'bezig' || !speler(sc, slot) || sc.weg[slot]) return false;
  const v = sc.v[slot] || (sc.v[slot] = { cp: 0, s: 0, klaar: false, tijd: null });
  if (v.klaar) return false;
  const c = clamp(Number.isFinite(cp) ? Math.floor(cp) : 0, 0, sc.cps);
  if (c < v.cp) return false;
  const pos = Number.isFinite(s) && s >= 0 ? s : 0;
  const oudeCp = v.cp, oudeS = v.s;
  v.cp = c;
  v.s = c === oudeCp ? Math.max(oudeS, pos) : pos;
  const nieuw = c !== oudeCp || v.s !== oudeS;
  if (klaar || c >= sc.cps) {
    v.klaar = true;
    v.tijd = Number.isFinite(tijd) && tijd > 0 ? tijd : sc.t;
    if (sc.eersteKlaar == null) sc.eersteKlaar = sc.t;
    sc.n++;
    return true;
  }
  if (nieuw) sc.n++;
  return nieuw;
}
export function verlaatBaan(sc, slot) {
  if (!sc || sc.fase !== 'bezig' || !speler(sc, slot) || sc.weg[slot]) return false;
  sc.weg[slot] = true; sc.n++;
  return true;
}
const actief = (sc) => sc.deeln.filter((d) => !sc.weg[d.slot] && !baanKlaar(sc, d.slot));

// De klok loopt: geeft de gebeurtenissen van deze stap ({ type: 'klaar', reden }).
export function tikBaan(sc, dt) {
  if (!sc || sc.fase !== 'bezig') return [];
  sc.t += dt;
  let reden = null;
  if (!actief(sc).length) reden = 'allen klaar';
  else if (sc.eersteKlaar != null && sc.t - sc.eersteKlaar > sc.naEerste) reden = 'tijd na de eerste';
  else if (sc.t > sc.cap) reden = 'tijdslimiet';
  if (!reden) return [];
  sc.fase = 'klaar'; sc.n++;
  return [{ type: 'klaar', reden }];
}

// De volgorde: wie wegviel onderaan, dan wie klaar is op tijd, dan wie nog op de baan is op punten en meters.
export function volgordeBaan(a, b) {
  return (a.weg - b.weg) || (b.klaar - a.klaar) || (a.klaar && b.klaar ? (a.tijd ?? 1e9) - (b.tijd ?? 1e9) : (b.cp - a.cp) || (b.s - a.s));
}
const rijVan = (sc, d) => {
  const v = sc.v[d.slot] || {};
  return { slot: d.slot, naam: d.naam, cp: v.cp | 0, s: v.s || 0, klaar: !!v.klaar, tijd: v.klaar ? v.tijd : null, weg: !!sc.weg[d.slot] };
};
// De tussenstand voor het bord, de eerste eerst, met dezelfde velden als de golfstand (banen = punten, slagen = finishtijd
// in honderdsten, rel = meters op de baan).
export function standBaan(sc) {
  return sc.deeln.map((d) => {
    const r = rijVan(sc, d);
    return { slot: r.slot, naam: r.naam, banen: r.cp, slagen: r.klaar ? Math.round(r.tijd * 100) : 0, rel: Math.round(r.s), weg: r.weg, klaar: r.klaar, cp: r.cp, s: r.s, tijd: r.tijd };
  }).sort(volgordeBaan).map((r, i) => ({ ...r, plek: i + 1 }));
}
// De stand als gewoon 'sc'-bericht (dezelfde vorm als bij golf, tijd en punten): [plek, punten, finishtijd, meters, weg],
// in de volgorde van de stand (de eerste eerst), zodat ook de gast het bord meteen goed leest.
export const standEventBaan = (sc) => ({
  k: 'wed', f: 'sc', n: sc.n,
  r: standBaan(sc).map((r) => [r.slot, r.banen, r.slagen, r.rel, r.weg ? 1 : 0]),
  t: Math.round(sc.t),
});

// De uitslag: de winnaar eerst, met zijn tijd; wie niet finishte staat met zijn punten erin, wie wegviel onderaan.
// Gelijke finishtijden (op een honderdste) delen een plek.
export function uitslagBaan(sc) {
  const rijen = sc.deeln.map((d) => {
    const r = rijVan(sc, d);
    return { slot: r.slot, naam: r.naam, ai: false, weg: r.weg, fin: r.klaar, klaar: r.klaar, cp: r.cp, s: r.s, tijd: r.klaar ? r.tijd : null, banen: r.cp, slagen: r.klaar ? Math.round(r.tijd * 100) : 0, rel: Math.round(r.s) };
  }).sort(volgordeBaan);
  const gelijk = (a, b) => a.fin && b.fin && a.slagen === b.slagen;
  rijen.forEach((r, i) => {
    r.plek = i > 0 && !r.weg && !rijen[i - 1].weg && gelijk(rijen[i - 1], r) ? rijen[i - 1].plek : i + 1;
    r.tekst = r.weg ? 'niet meer erbij' : r.fin ? fmtTime(r.tijd) : `${r.cp} van ${sc.cps} ${sc.cpNaam}`;
  });
  return rijen;
}
// Wat een speler krijgt: het bedrag van zijn plek en punten voor de loopbaan als hij finisht; wie niet finishte alleen een
// paar punten; wie wegviel niets.
export function beloningBaan(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  if (!rij.fin) return { geld: 0, xp: 6 };
  return { geld: PRIJZEN_BAAN[rij.plek] | 0, xp: Math.max(4, 18 - rij.plek * 3) };
}
