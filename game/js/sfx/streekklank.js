// Welke omgevingslaag hoort bij welke streek (SFX-GAPS, groep d). Puur: geen Web Audio, geen kaart. ambience.js
// geeft de feiten van de plek (zee, kust, streek, platteland, industrie) en krijgt het niveau per laag terug.
//   kust      brekende golven en wind: op zee, op de Waddenzee en aan de kust (dijk, Lauwerskust, Eemsdelta)
//   polder    wind door open gras met een enkele veldvogel: het open land buiten de dorpen
//   riet      ruisend riet en klotsend water: langs een sloot of maar op het platteland, vooral Lauwerskust
//   industrie een lage brom, ver gekletter en een stoomstoot: bij fabrieken en loodsen (Eemshaven, Delfzijl)
// De niveaus zijn de piek van de laag (0 tot 1); ambience.js vermenigvuldigt met het weer, de cabine en de pauze.

export const STREEK_LAGEN = ['kust', 'polder', 'riet', 'industrie'];

// het hoogste niveau van elke laag, in dezelfde eenheid als de lagen van ambience.js (het mixplan van de omgeving)
export const LAAG_NIVEAU = { kust: 0.2, polder: 0.12, riet: 0.1, industrie: 0.09 };

// streken waar het land open en weids is: de polderlaag klinkt er vol; in de rest iets zachter
const OPEN_STREKEN = new Set(['hogeland', 'hunsingo', 'oldambt', 'veenkolonien', 'westerwolde', 'westerkwartier', 'lauwerskust', 'eemsdelta']);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// feiten: { sea: bool (op zee), coast: 0..1 (hoeveel zee er in de buurt ligt), streek: id | null, rural: 0..1,
//   open: 0..1, industrial: 0..1 (loodsen en fabrieken dichtbij), waterD: afstand tot water in m, density: 0..1,
//   closed: bool (in een afgesloten voertuig), night: 0..1 }
// geeft { kust, polder, riet, industrie } als doelniveau (0 tot het laagmaximum, al in dezelfde eenheid als de lagen)
// out: een eigen object om in te schrijven (ambience.js vraagt dit elk beeld: geen nieuwe objecten per frame)
export function streekNiveaus(f, out = {}) {
  const rural = clamp01(f.rural || 0);
  const coast = f.sea ? 1 : clamp01(f.coast || 0) * 0.85;
  const cabin = f.closed ? 0.4 : 1;
  const streek = f.streek || null;

  const kust = coast;
  const poldersterkte = rural * (OPEN_STREKEN.has(streek) ? 1 : 0.6) * (1 - coast * 0.6) * (0.55 + 0.45 * clamp01(f.open ?? rural));
  const wd = Number.isFinite(f.waterD) ? f.waterD : Infinity;
  const dichtBijWater = wd < 40 ? 1 - wd / 40 : 0;
  const riet = rural * dichtBijWater * (streek === 'lauwerskust' ? 1 : 0.65) * (1 - coast * 0.7);
  const industrie = clamp01(f.industrial || 0) * (1 - 0.6 * rural) * (1 - 0.5 * clamp01(f.density || 0));

  out.kust = kust * LAAG_NIVEAU.kust * cabin;
  out.polder = poldersterkte * LAAG_NIVEAU.polder * cabin * (1 - 0.35 * clamp01(f.night || 0));
  out.riet = riet * LAAG_NIVEAU.riet * cabin;
  out.industrie = industrie * LAAG_NIVEAU.industrie * cabin;
  return out;
}
