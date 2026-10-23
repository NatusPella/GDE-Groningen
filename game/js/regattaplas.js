// Zeilwedstrijd op de Hoornse Plas (#399): naast de regatta van de stad (regatta.js, regattabaan.js) een lange baan op het
// grote open water van het Hoornsemeer: vijf tonnen op een vijfhoek, twee ronden, vier tegenstanders. Puur: de plek, de baan,
// de beloning en welke plek het dichtst bij de speler ligt; regatta.js doet het spel. De plas is op de tegels gecontroleerd door
// scripts/regattaplas_wereld_test.mjs (genoeg diep water rond elke ton, geen gebouw, geen oever in de weg). Tests: scripts/regattaplas_test.mjs.
import { rondBaan } from './zeilrules.js';

// Het midden is het ruimste punt van het meer (260 m open water rondom), de straal van de vijfhoek laat ruim 100 m vrij water rond elke ton.
export const PLAS = {
  id: 'plas',
  naam: 'Zeilwedstrijd Hoornse Plas',
  korteNaam: 'Hoornse Plas',
  x: -300, y: 4360,
  straal: 130,        // m: de tonnen liggen op een cirkel van deze straal (zijde 153 m, 1,5 km over twee ronden)
  tonnen: 5,
  rondes: 2,
  bots: 4,
  snelheid: 3.6,      // m/s: de gemiddelde snelheid waar de richttijd van uitgaat (open water, geen gracht)
  reik: 330,          // m rond het midden: wie daarbinnen in een zeilboot zit kan starten
  beloning: [0, 35, 60, 100],  // per medaille (geen, brons, zilver, goud): de baan is 2,5 keer zo lang als die van de stad (15, 25, 40)
  xp: 30,
  record: 'regatta-plas',
};

// De vijf tonnen op een vijfhoek, de eerste aan de zuidkant; afgerond op een decimeter zodat de baan vast ligt.
export function plasBaan(p = PLAS) {
  return rondBaan(p.x, p.y, p.straal, p.tonnen, -Math.PI / 2).map((t) => ({ x: Math.round(t.x * 10) / 10, y: Math.round(t.y * 10) / 10 }));
}

// De omtrek van de baan (m) en de totale afstand van alle ronden.
export function baanLengte(tonnen, rondes = 1) {
  let l = 0;
  for (let i = 0; i < tonnen.length; i++) { const a = tonnen[i], b = tonnen[(i + 1) % tonnen.length]; l += Math.hypot(b.x - a.x, b.y - a.y); }
  return l * rondes;
}

// De beloning voor een medaille (0 = geen, 1 = brons, 2 = zilver, 3 = goud): geld en loopbaanpunten, 0 zonder medaille.
export const plasBeloning = (medal, p = PLAS) => ({ geld: p.beloning[Math.max(0, Math.min(3, medal | 0))] || 0, xp: p.xp + 5 * (medal | 0) });

// De plek waar de speler kan starten: de havens van de stad (marinas.json, 120 m rond de steiger) of de Hoornse Plas (`reik`
// rond het midden). Geeft { m, d } van de dichtstbijzijnde, of null. m is een haven of { ...PLAS, plas: true }.
export function kiesPlek(havens, px, py) {
  let best = null;
  for (const m of havens || []) {
    const d = Math.hypot(m.x - px, m.y - py);
    if (d < 120 && (!best || d < best.d)) best = { m, d };
  }
  const d = Math.hypot(PLAS.x - px, PLAS.y - py);
  if (d < PLAS.reik && (!best || d < best.d)) best = { m: { ...PLAS, plas: true }, d };
  return best;
}
