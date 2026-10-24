// Samen spelen (#443): minigames waarin ieder op zijn eigen scherm dezelfde poging doet, op tijd (klimtoren), en wie het spel opende het scorebord houdt.
// Pure logica, zonder three.js en zonder DOM (scripts/coopwedstrijd_test.mjs). Zelfde kader als de golfronde (coopwedstrijdscore.js): elke speler meldt zijn
// resultaat, de host controleert het en houdt de stand bij, ook voor spelers die wegvallen. Wie boven is wint op tijd (de straftijd voor een val zit er al in);
// wie niet boven kwam telt na wie boven kwam, op hoogte; wie niets meldde (tijdslimiet) staat onderaan. Wie wegvalt telt niet mee en krijgt niets.
import { clamp, fmtTime } from './minigamekit.js';

export const PRIJZEN_TIJD = [0, 80, 50, 30, 15]; // geld per plek, in de eigen portemonnee van wie de poging afmaakt
export const NA_EERSTE_TIJD_S = 90;  // zoveel tijd krijgen de anderen nadat de eerste boven is
export const TIJD_CAP_S = 420;       // de hele wedstrijd duurt hooguit 7 minuten
export const MAX_SPELERS_TIJD = 4;

// deeln: [{ slot, naam, char }]
export function maakTijd(id, deeln, { naEerste = NA_EERSTE_TIJD_S, cap = TIJD_CAP_S } = {}) {
  return { tijd: true, id, deeln: deeln.slice(0, MAX_SPELERS_TIJD), res: {}, weg: {}, t: 0, eersteKlaar: null, fase: 'bezig', n: 0, naEerste, cap };
}
const speler = (sc, slot) => sc.deeln.find((d) => d.slot === slot) || null;
const klaarMet = (sc, slot) => !!sc.res[slot];

// Een speler meldt zijn resultaat, één keer: de tijd (s), de hoogste greep (m) en of hij boven kwam.
export function meldTijd(sc, slot, { tijd, hoogte = 0, boven = false } = {}) {
  if (sc.fase !== 'bezig' || !speler(sc, slot) || sc.weg[slot] || sc.res[slot]) return false;
  if (!Number.isFinite(tijd) || tijd < 0.5 || tijd > sc.cap + 120 || !Number.isFinite(hoogte)) return false;
  sc.res[slot] = { tijd: Math.round(tijd * 100) / 100, hoogte: clamp(Math.round(hoogte * 10) / 10, 0, 99), boven: !!boven };
  sc.n++;
  if (boven && sc.eersteKlaar == null) sc.eersteKlaar = sc.t;
  return true;
}
export function verlaatTijd(sc, slot) {
  if (!speler(sc, slot) || sc.weg[slot] || sc.fase !== 'bezig') return false;
  sc.weg[slot] = true; sc.n++;
  return true;
}
const actief = (sc) => sc.deeln.filter((d) => !sc.weg[d.slot] && !klaarMet(sc, d.slot));

// De klok loopt: geeft de gebeurtenissen van deze stap ({ type: 'klaar', reden }).
export function tikTijd(sc, dt) {
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

// Volgorde voor het bord (rijen met weg, banen = 1 boven / 2 klaar maar niet boven / 0 nog bezig, slagen = tijd in tienden, rel = hoogte in decimeter): wie weg
// is onderaan, wie boven kwam op tijd, dan wie niet boven kwam op hoogte, en wie nog bezig is of niets meldde als laatste.
export function volgordeTijd(a, b) {
  const klaar = (r) => (r.banen === 1 ? 0 : r.banen === 2 ? 1 : 2);
  return (a.weg - b.weg) || (klaar(a) - klaar(b)) || (klaar(a) === 0 ? a.slagen - b.slagen : b.rel - a.rel);
}

// De live stand, in de vorm van de golfstand (banen: 1 boven, 2 klaar zonder top, 0 bezig; slagen: tijd in tienden; rel: hoogte in decimeter).
export function standTijd(sc) {
  return sc.deeln.map((d) => {
    const r = sc.res[d.slot];
    return { slot: d.slot, naam: d.naam, banen: r ? (r.boven ? 1 : 2) : 0, slagen: r ? Math.round(r.tijd * 10) : 0, rel: r ? Math.round(r.hoogte * 10) : 0, boven: r ? r.boven : false, klaar: !!r, weg: !!sc.weg[d.slot] };
  }).sort(volgordeTijd);
}
export const standEventTijd = (sc) => ({ k: 'wed', f: 'sc', n: sc.n, r: standTijd(sc).map((x) => [x.slot, x.banen, x.slagen, x.rel, x.weg ? 1 : 0]), t: Math.round(sc.t) });
export const hoogteTekst = (dm) => `${(dm / 10).toFixed(1).replace('.', ',')} m`;

// De uitslag: wie boven kwam op tijd (gelijke tijden delen een plek), dan op hoogte, dan wie niets meldde; wie wegviel staat onderaan.
export function uitslagTijd(sc) {
  const rijen = sc.deeln.map((d) => {
    const r = sc.res[d.slot];
    return { slot: d.slot, naam: d.naam, ai: false, weg: !!sc.weg[d.slot], fin: !!(r && r.boven), banen: r ? 1 : 0, slagen: r ? Math.round(r.tijd * 100) : 0, rel: r ? Math.round(r.hoogte * 10) : 0, boven: r ? r.boven : false, tijdS: r ? r.tijd : null };
  });
  rijen.sort((a, b) => (a.weg - b.weg) || (b.fin - a.fin) || (a.fin ? a.slagen - b.slagen : b.rel - a.rel));
  const gelijk = (a, b) => (a.fin && b.fin ? a.slagen === b.slagen : !a.fin && !b.fin && a.rel === b.rel && a.banen === b.banen);
  rijen.forEach((r, i) => {
    r.plek = i > 0 && !r.weg && !rijen[i - 1].weg && gelijk(rijen[i - 1], r) ? rijen[i - 1].plek : i + 1;
    r.tijd = r.tijdS;
    r.tekst = r.weg ? 'niet meer erbij' : r.fin ? fmtTime(r.tijdS) : r.banen ? `niet boven: hoogste greep ${hoogteTekst(r.rel)}` : 'niet af';
  });
  return rijen;
}
// Wat een speler krijgt: het bedrag van zijn plek en punten voor de loopbaan als hij boven kwam; anders een paar punten; wie wegviel niets.
export function beloningTijd(rij) {
  if (!rij || rij.weg || rij.ai) return { geld: 0, xp: 0 };
  if (!rij.fin) return { geld: 0, xp: 6 };
  return { geld: PRIJZEN_TIJD[rij.plek] | 0, xp: Math.max(4, 16 - rij.plek * 2) };
}
