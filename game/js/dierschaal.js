// De grootste schaal die een diermodel mag hebben: de schaal van zijn eigen bouw (wildlife.js). Puur en
// Node-safe, zonder three.js, zodat de host (coopextra.js), de gast (coopextra3d.js) en de modelbouwer
// (wildlife.js) dezelfde grens gebruiken. Een ongeldige of dubbel toegepaste schaal gaf een reuzenvogel
// (#433); alleen de Reuzenduif-cheat van de speler zelf maakt een duif groter, en die is in scene3d.js
// op 6 begrensd.
//
// De eendensoort dekt alle varianten (drake, hen, gans, zwaan): de zwaan is met 3,1 de grootste. Sinds 23-11 volgen de
// schalen de echte maten uit het register (dierenregister.js maat; wildlife.js MODEL_SCALE): de reiger 1,56 (1 m hoog),
// de gans 1,95 (0,8 m), het schaap 0,8, de kat 0,85, de vis 0,96 en de zeehond 1,13 (1,6 m lang). Vogels zijn seagull, duck, gans, reiger en pigeon.
export const DIER_MAX_SCHAAL = Object.freeze({
  cow: 1, sheep: 0.8, seagull: 1, duck: 3.1, gans: 1.95, reiger: 1.56, zeehond: 1.13, vis: 0.96, pigeon: 1, cat: 0.85, dog: 1,
  ree: 1, vos: 1, wolf: 1, haas: 1, ezel: 1, alpaca: 1, varken: 1,   // the province animals: their size sits in the model (animalmodels.js)
});
export const VOGEL_SOORTEN = Object.freeze(['seagull', 'duck', 'gans', 'reiger', 'pigeon']);

export const maxDierSchaal = (soort) => DIER_MAX_SCHAAL[soort] ?? null;

// Een ongeldige schaal (NaN, 0, negatief) valt terug op de eigen bouw; een te grote wordt begrensd.
// Een onbekende soort geeft null: die wordt niet getekend (geen koe als terugval).
export const veiligeDierSchaal = (soort, schaal) => {
  const max = maxDierSchaal(soort);
  if (!(max > 0)) return null;
  return Number.isFinite(schaal) && schaal > 0 ? Math.min(schaal, max) : max;
};
