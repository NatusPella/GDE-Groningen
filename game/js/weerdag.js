// Weer en dagdeel aan elkaar (issue #19): pure regels die het weer van de
// provincie op dezelfde zon zetten als de nacht (sunrules.js, dezelfde
// definitie als dayState). Geen THREE, geen Math.random.
//
// - de zon staat per streek iets anders (4 minuten per 65 km oost-west), dus
//   zonsopgang en -ondergang komen in het oosten eerder dan in het westen;
// - ochtendmist en onweer hangen aan de zonshoogte, niet aan vaste uren, zodat
//   ze met de datum meeschuiven (kortere nachten in de zomer);
// - dagdeel(): het woord voor de overgang (nacht, dageraad, ochtend, dag,
//   avond, schemer) volgt de zonshoogte, de nacht de grens van dayState.

import { sunElevationDeg, nightFactor, NIGHT_ON } from './sunrules.js';

// Gemiddelde x (m, oost positief, stadscentrum = 0) per streek van weatherstate.js
export const STREEK_X = { stad: 0, noord: 0, oost: 22000, zuid: 0, west: -22000 };

const wrap = (h) => ((h % 24) + 24) % 24;

// Zonne-uur in een streek: oostelijker is eerder (x in m, 65 km = 4 min).
export const zonUur = (id, hour) => wrap(hour + ((STREEK_X[id] ?? 0) / 65000) * (4 / 60));

export const streekZonHoogte = (id, hour) => sunElevationDeg(zonUur(id, hour));
export const streekNacht = (id, hour) => nightFactor(streekZonHoogte(id, hour));

// Dagdeel op zonshoogte. De nachtgrens is die van dayState (nacht > NIGHT_ON).
export function dagdeel(id, hour) {
  const e = streekZonHoogte(id, hour);
  if (nightFactor(e) > NIGHT_ON) return 'nacht';
  const ochtend = wrap(hour) < 12;
  if (e < 4) return ochtend ? 'dageraad' : 'schemer';
  if (e < 18) return ochtend ? 'ochtend' : 'avond';
  return 'dag';
}

// Ochtendmist: vanaf de eerste schemering tot de zon hoog staat.
export const mistMag = (id, hour) => {
  const e = streekZonHoogte(id, hour);
  return wrap(hour) < 12 && e > -14 && e < 18;
};
// De zon brandt de mist weg
export const mistWeg = (id, hour) => wrap(hour) >= 12 || streekZonHoogte(id, hour) >= 25;
// Onweer: warme lucht na het middaguur, tot de zon ver onder is
export const onweerMag = (id, hour) => wrap(hour) >= 12 && streekZonHoogte(id, hour) > -6;
