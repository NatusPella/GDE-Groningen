// Welke namen mogen op een wegwijzer, en hoe ver van het centrum (#436).
// De stadsdistricten (Centrum, Hoofdstation, Zernike, Noorderplantsoen) horen bij de stad: buiten
// de directe omgeving staan ze niet op een bord, want dan wijst een bord in de provincie naar het
// Hoofdstation. Haren en Hoogkerk zijn echte plaatsen en mogen ook aan de rand staan.
// Pure regels zonder THREE, zodat de test ze los kan lezen (streetclutter.js bouwt de borden).
//
//   signpostSetFor(centreD) -> 'city' | 'town' | null
//
// De afstanden zijn meters van het centrum van de stad (cityprops.js CITY_CENTRE, dezelfde maat
// die streetclutter al gebruikte).

export const CITY_SIGNPOST_MAX_D = 2500; // tot hier: de stadsdistricten mogen op het bord
export const SIGNPOST_MAX_D = 9000; // tot hier: alleen de echte plaatsen aan de rand

// de namen zoals ze in de bladtexturen staan (streetclutter.js BLADE_NAMES), met hun rol
export const BLADE_NAMES = ['Centrum', 'Hoofdstation', 'Zernike', 'Haren', 'Noorderplantsoen', 'Hoogkerk'];
export const CITY_BLADES = [0, 1, 2, 4];
export const TOWN_BLADES = [3, 5];

export function signpostSetFor(centreD) {
  if (!Number.isFinite(centreD) || centreD < 0) return null;
  if (centreD < CITY_SIGNPOST_MAX_D) return 'city';
  if (centreD < SIGNPOST_MAX_D) return 'town';
  return null;
}
