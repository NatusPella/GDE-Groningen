// Studentenfietsen (#402): niet elke fiets is nieuw. Een oude fiets (model.old, de 'Studentenbarrel' van trafficfleet.js)
// heeft kleine afwijkingen die van de fabriek niet kwamen: een scheef voorspatbord, geen voorlicht, blauwe banden (de goedkope
// blauwbandige leenfiets, in het spel zonder merknaam) en een rammelend geluid. Pure regels, geen DOM en geen THREE
// (scripts/studentenfiets_test.mjs); models3d_vehicles.js tekent ze, audio.js laat de rammel horen, vehicledamage.js
// rekent ze mee in het schademodel (fietsStaat).
//
// De staat staat in v.model.student = { spatbord, licht, blauw, rammel } (booleans: spatbord scheef, voorlicht weg,
// blauwe banden, rammelt). De kans per wijk zit in de kans dat een fiets oud is (PROFILES.oldBike in trafficfleet.js:
// 65% in een studentenwijk, 50% in het centrum, 20% gewoon, 5% chic); hier komt alleen bij welke afwijkingen zo'n fiets heeft.
// Alleen visueel en een beetje geluid: het rijgedrag verandert niet.

export const DEFECTEN = ['spatbord', 'licht', 'blauw', 'rammel'];
export const DEFECT_TEKST = { spatbord: 'scheef voorspatbord', licht: 'geen voorlicht', blauw: 'blauwe banden', rammel: 'rammelt' };

// Kans per afwijking op een oude fiets, per soort wijk; de studentenwijk is het meest verwaarloosd.
const KANS = {
  student: { spatbord: 0.6, licht: 0.55, blauw: 0.3, rammel: 0.65 },
  centrum: { spatbord: 0.5, licht: 0.45, blauw: 0.3, rammel: 0.55 },
  standaard: { spatbord: 0.4, licht: 0.35, blauw: 0.15, rammel: 0.45 },
};
export const kansenVoor = (profileKey) => KANS[profileKey] || KANS.standaard;

// De staat van één oude fiets: elke afwijking met zijn kans, en altijd minstens één (anders is het gewoon een fiets).
export function studentStaat(profileKey, rng = Math.random) {
  const k = kansenVoor(profileKey);
  const s = {};
  let n = 0;
  for (const d of DEFECTEN) { s[d] = rng() < k[d]; if (s[d]) n++; }
  if (!n) s[DEFECTEN[Math.floor(rng() * DEFECTEN.length)]] = true;
  return s;
}

// Een zin voor een label of de garage: "scheef voorspatbord en rammelt".
export function staatTekst(s) {
  const lijst = DEFECTEN.filter((d) => s && s[d]).map((d) => DEFECT_TEKST[d]);
  if (!lijst.length) return '';
  return lijst.length > 1 ? `${lijst.slice(0, -1).join(', ')} en ${lijst[lijst.length - 1]}` : lijst[0];
}

// Een sleutel voor de geometrie in de cache: SLB voor scheef spatbord, geen licht, blauwe banden.
export const staatSleutel = (s) => (s ? (s.spatbord ? 'S' : '') + (s.licht ? 'L' : '') + (s.blauw ? 'B' : '') : '');

// Hoe lang tussen twee rammels (s) bij deze snelheid (m/s); 0 als hij stil staat of te langzaam gaat om te rammelen.
export function rammelInterval(speed, rng = Math.random) {
  const v = Math.abs(speed || 0);
  if (!(v > 1.2)) return 0;
  return Math.max(0.28, 0.9 - v * 0.07) * (0.8 + rng() * 0.4);
}
