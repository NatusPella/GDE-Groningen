// #800: de medaille-eisen op de startkaart komen uit dezelfde geschaalde bron als het spel.
// Standaard geeft exact de bestaande teksten; de andere standen rekenen de drempels opnieuw uit
// met dezelfde tabellen en dezelfde richting (lager of hoger is beter, en bij golf ten opzichte
// van par). Alleen activiteiten die op de stand zijn aangesloten staan hier.
import { cleanDifficulty, scaleTarget, difficultyFactors } from './difficulty.js';

const nl = (v) => Math.round(v).toLocaleString('nl-NL');
const clock = (s) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const punten = (v) => `${nl(v)} punten`;
const kg = (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')} kg`;
const procent = (v) => `${Math.min(100, Math.round(v * 100))}% goed`;
const tijd = (v) => `binnen ${clock(v)}`;
const par = (v) => {
  const n = Math.round(v);
  return n === 0 ? 'op par of beter' : n > 0 ? `${n} boven par` : `${-n} onder par`;
};
const ORD = ['', 'eerste', 'tweede', 'derde', 'vierde', 'vijfde'];
const plek = (n) => ORD[n] || `${n}e`;

// signed: bij golf is de drempel een aantal slagen t.o.v. par; een negatief getal is een bonus
// onder par en moet bij een ruimere stand minder streng worden (richting nul), niet strenger.
const schaal = (v, mode, lower, signed = false) => {
  if (!Number.isFinite(v)) return v;
  if (!lower) return scaleTarget(v, mode, false);
  if (signed && v < 0) {
    const f = difficultyFactors(mode).target;
    const x = v / f;
    return f > 1 ? Math.ceil(x) : Math.floor(x);
  }
  return scaleTarget(v, mode, true);
};

// Per activiteit: de tabel, de richting, de opmaak en de bestaande standaardteksten.
export const MEDAILLE_BRON = {
  carbid: { t: [45, 80, 120], lower: false, fmt: punten, std: ['45 punten', '80 punten', '120 punten'] },
  kermis: { t: [60, 110, 160], lower: false, fmt: punten, std: ['60 punten', '110 punten', '160 punten'] },
  drift: { t: [2500, 5000, 9000], lower: false, fmt: punten, std: ['2.500 punten', '5.000 punten', '9.000 punten'] },
  skatepark: { t: [1200, 3200, 6500], lower: false, fmt: punten, std: ['1.200 punten', '3.200 punten', '6.500 punten'] },
  pannenkoek: { t: [400, 700, 1000], lower: false, fmt: punten, std: ['400 punten', '700 punten', '1.000 punten'] },
  waterski: { t: [650, 1300, 2200], lower: false, fmt: punten, std: ['650 punten', '1.300 punten', '2.200 punten'] },
  zwembad: { t: [100, 76, 64], lower: true, fmt: tijd, std: ['binnen 1:40', 'binnen 1:16', 'binnen 1:04'] },
  klimtoren: { t: [80, 48, 30], lower: true, fmt: tijd, std: ['binnen 1:20', 'binnen 0:48', 'binnen 0:30'] },
  hengelen: { t: [4, 7.5, 12], lower: false, fmt: kg, std: ['4 kg', '7,5 kg', '12 kg'] },
  carillon: { t: [0.5, 0.75, 0.92], lower: false, fmt: procent, std: ['50% goed', '75% goed', '92% goed'] },
  discgolf: { t: [6, 1, -2], lower: true, signed: true, fmt: par, std: ['6 boven par', '1 boven par', '2 onder par'] },
  pitchputt: { t: [7, 3, 0], lower: true, signed: true, fmt: par, std: ['7 boven par', '3 boven par', 'op par of beter'] },
  kartbaan: { place: [3, 2, 1], lower: true, fmt: plek, std: ['derde', 'tweede', 'eerste'] },
  ringrace: { place: [3, 2, 1], lower: true, fmt: plek, std: ['derde', 'tweede', 'eerste'] },
};

// De drie medaille-eisen als tekst; null voor een activiteit die nog niet is aangesloten.
export function medailleTeksten(id, mode = 'standaard') {
  const b = MEDAILLE_BRON[id];
  if (!b) return null;
  const m = cleanDifficulty(mode);
  if (m === 'standaard') return b.std.slice();
  if (b.place) {
    // ruimere stand: de bronzen plek schuift één op; strengere stand: alleen de eerste twee plekken.
    const at = m === 'ontspannen' ? [b.place[0] + 1, b.place[1] + 1, b.place[2] + 1] : [2, 2, 1];
    return at.map(b.fmt);
  }
  const at = b.t.map((v) => schaal(v, m, b.lower, b.signed));
  return at.map((v) => b.fmt(v));
}





