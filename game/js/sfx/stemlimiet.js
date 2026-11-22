// Stemlimiet per categorie en declick van losse klanken (#1021, glitchonderzoek 21-11). Zuiver, zonder Web Audio
// (scripts/stemlimiet_test.mjs). audio.js playBuf telt per categorie mee en laat een klank vallen als zijn categorie vol is,
// zodat een menigte voetstappen, een zwerm dieren of een reeks deuren de globale stemlimiet (VOICE_CAPS) niet opeet.
// De prioriteit blijft die van audio.js: 0 omgeving en foley, 1 gewoon, 2 moet klinken (een knal, een sirene, een stem).

// maximum aantal gelijktijdige losse klanken per mixplan-categorie (sfx/mixplan.js); wat niet genoemd is, kent alleen de globale limiet
export const CAT_CAPS = {
  voetstap: 8,
  dier: 4,
  omgeving: 8,
  deur: 4,
  winkel: 4,
  water: 8,
  spoor: 4,
  brug: 3,
  kermis: 5,
  ui: 6,
  sting: 2,
  voertuig: 10,
  sport: 8,
  // een knal of een schot mag nooit door de limiet van anderen vallen: ruim, maar niet oneindig
  explosie: 10,
  wapen: 14,
};
// prioriteit 2 (moet klinken) mag 50 procent boven de categoriegrens; prioriteit 0 (omgeving, foley) krijgt 70 procent
export function capVoor(cat, prio = 1) {
  const c = Object.prototype.hasOwnProperty.call(CAT_CAPS, cat) ? CAT_CAPS[cat] : 0;
  if (!c) return Infinity;
  const f = prio >= 2 ? 1.5 : prio <= 0 ? 0.7 : 1;   // een onbruikbare prio (NaN) telt als gewoon
  return Math.max(1, Math.round(c * f));
}

// de globale limiet voor een prioriteit (0 omgeving, 1 gewoon, 2 moet klinken); een onbruikbare prioriteit (undefined, NaN, 3) telt als gewoon,
// want een ontbrekend getal liet voorheen elke klank van die aanroep stil vallen (activeVoices < undefined is nooit waar)
export function voiceCap(prio, caps) {
  const p = Number.isInteger(prio) && prio >= 0 && prio < caps.length ? prio : 1;
  return caps[p];
}

export function createStemTeller() {
  const n = new Map();
  const stats = { gelaten: 0, geweigerd: {} };
  return {
    // true = er is plek, en de teller telt de stem; false = categorie vol (geweigerd, geteld)
    neem(cat, prio = 1) {
      if (!cat) return true;
      const k = n.get(cat) || 0;
      if (k >= capVoor(cat, prio)) {
        stats.geweigerd[cat] = (stats.geweigerd[cat] || 0) + 1;
        return false;
      }
      n.set(cat, k + 1);
      stats.gelaten++;
      return true;
    },
    geef(cat) { if (cat) n.set(cat, Math.max(0, (n.get(cat) || 0) - 1)); },
    aantal(cat) { return n.get(cat) || 0; },
    totaal() { let t = 0; for (const v of n.values()) t += v; return t; },
    stats,
    leeg() { n.clear(); },
  };
}

// Declick: een klank die niet op nul begint of eindigt klikt. Een snelle fade (in 4 ms, uit 8 ms) haalt dat weg zonder de aanzet
// te slijpen. duur in s (van de buffer, gedeeld door de afspeelsnelheid), lus: geen fade uit (de lus eindigt niet).
export const FADE_IN_S = 0.004;
export const FADE_UIT_S = 0.008;
export function declick(duur, lus = false) {
  const d = Number.isFinite(duur) && duur > 0 ? duur : 0;
  const fadeIn = Math.min(FADE_IN_S, d * 0.25);
  const fadeUit = lus ? 0 : Math.min(FADE_UIT_S, d * 0.25);
  return { fadeIn, fadeUit, uitStart: Math.max(fadeIn, d - fadeUit) };
}
