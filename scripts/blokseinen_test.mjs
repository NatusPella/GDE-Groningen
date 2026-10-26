// Blokseinen (#492): de pure regels van game/js/blokseinen.js. Een baanvak tussen twee seinen is
// bezet zolang er een trein in staat (met een marge voor zijn lengte); een trein op een ander
// spoor, achter de eigen trein of in een ander vak blokkeert niet. Beide rijrichtingen.
//   node scripts/blokseinen_test.mjs
import assert from 'node:assert/strict';
import {
  SEIN_OP_ETAPPE, SEIN_MARGE, SEIN_HALF_W, blokgrenzen, baanvakken, vakPunten, wagenOpPunt, vakBezet, seinBeeld,
} from '../game/js/blokseinen.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const bijna = (a, b, marge = 1e-6) => Math.abs(a - b) <= marge;

// Een recht spoor: booglengte == x, dus punten en wagens zijn eenvoudig na te rekenen.
const recht = (at) => [at, 0];
const stops = [{ name: 'A', s: 0 }, { name: 'B', s: 3000 }, { name: 'C', s: 6000 }];
const vakken = baanvakken(stops, 6000);
const punten = vakken.map((b) => vakPunten(b, recht));
const wagen = (x, len = 20, y = 0, angle = 0) => ({ x, y, angle, len });
const trein = (...cars) => ({ cars });

// --- 1. de grenzen: bij elke halte een sein, op een lange etappe daartussen nog seinen
{
  const g = blokgrenzen(stops, 6000);
  ok(g[0] === 0 && g[g.length - 1] === 6000, `de grenzen lopen van 0 tot 6000: ${g}`);
  ok(g.includes(3000), 'bij halte B staat een sein');
  ok(g.every((s, i) => i === 0 || s > g[i - 1]), 'de grenzen staan in volgorde en zijn uniek');
  ok(g.length > 5, `een etappe van 3000 m krijgt tussenliggende seinen: ${g.length - 1} vakken`);
  let langste = 0;
  for (let i = 1; i < g.length; i++) langste = Math.max(langste, g[i] - g[i - 1]);
  ok(langste <= SEIN_OP_ETAPPE, `geen baanvak langer dan ${SEIN_OP_ETAPPE} m: ${langste.toFixed(0)}`);
  ok(baanvakken([], 0).length === 0 && baanvakken([], -1).length === 0, 'zonder baan geen vakken');
  // de vakken sluiten op elkaar aan en bedekken de hele route
  ok(vakken.length === g.length - 1, 'elk paar grenzen is een vak');
  for (let i = 0; i < vakken.length; i++) {
    if (vakken[i].tot !== g[i + 1] || vakken[i].van !== g[i]) ok(false, `vak ${i} sluit niet aan`);
    if (i) ok(vakken[i].van === vakken[i - 1].tot, `vak ${i} begint niet waar het vorige eindigde`);
  }
}

// --- 2. de punten van een vak: de uiteinden doen mee, fijn genoeg om een trein te raken
{
  const b = { van: 100, tot: 400 };
  const p = vakPunten(b, recht, 10);
  ok(p[0][0] === 100 && p[p.length - 1][0] === 400, 'de punten lopen van het ene tot het andere uiteinde');
  ok(p.every((q, i) => i === 0 || q[0] > p[i - 1][0]), 'de punten staan op volgorde');
  ok(p.every((q, i) => i === 0 || q[0] - p[i - 1][0] <= 10 + 1e-9), 'de punten liggen hooguit 10 m uit elkaar');
}

// --- 3. een wagen raakt een punt binnen zijn lengte plus de marge, zijdelings alleen op zijn eigen spoor
{
  const w = wagen(0, 20);
  ok(wagenOpPunt(w, 0, 0), 'de wagen raakt zijn eigen midden');
  ok(wagenOpPunt(w, 10 + SEIN_MARGE - 0.01, 0), 'net binnen de marge telt mee');
  ok(!wagenOpPunt(w, 10 + SEIN_MARGE + 0.01, 0), 'net buiten de marge telt niet');
  ok(!wagenOpPunt(w, 10 + SEIN_MARGE, -SEIN_HALF_W - 0.01), 'naast het spoor blokkeert niet');
  ok(wagenOpPunt(w, 0, SEIN_HALF_W), 'de rand van het eigen spoor telt mee');
  ok(!wagenOpPunt(null, 0, 0) && !wagenOpPunt({ x: NaN, y: 0, angle: 0, len: 10 }, 0, 0), 'een wagen zonder plek raakt niets');
}

// --- 4. de bezetting: de trein in het vak bezet het, een trein in een ander vak of op een ander spoor niet
{
  // het tweede vak van de route, van 750 tot 1500
  const b = vakken[1];
  const p = punten[1];
  const midden = (b.van + b.tot) / 2;
  ok(!vakBezet(p, []), 'een leeg vak is vrij');
  ok(!vakBezet(p, [trein(wagen(vakken[0].van + (vakken[0].tot - vakken[0].van) / 2, 20))]), 'een trein in het vorige vak bezet dit vak niet');
  ok(!!vakBezet(p, [trein(wagen(midden, 20))]), 'een trein in het vak bezet het');
  ok(!vakBezet(p, [trein(wagen(midden, 20, 6))]), 'een trein op een ander spoor bezet het vak niet');
  // een lange trein met twee wagens die net over de grens steekt, bezet het vak ook
  ok(!!vakBezet(p, [trein(wagen(b.van - 20, 20), wagen(b.van + 5, 20))]), 'een trein die net over de grens steekt, bezet het vak');
  ok(!!vakBezet(p, [trein(wagen(b.tot + 10 + SEIN_MARGE - 0.5, 20))]), 'binnen de marge na het einde telt mee');
  ok(!vakBezet(p, [trein(wagen(b.tot + 10 + SEIN_MARGE + 1, 20))]), 'ver na het einde telt niet mee');
}

// --- 5. het seinbeeld: het eerstvolgende sein voor de neus, rood als het vak erachter bezet is
{
  const c = 1200; // midden in het tweede vak (750..1500); het volgende sein staat op 1500
  const sein = 1500;
  const leeg = seinBeeld({ vakken, punten, treinen: [], c, halfLen: 15, dir: 1 });
  ok(leeg.sein === sein, `het eerstvolgende sein staat op 1500: ${leeg.sein}`);
  ok(bijna(leeg.afstand, sein - (c + 15)), `de afstand telt vanaf de neus: ${leeg.afstand}`);
  ok(!leeg.rood, 'zonder treinen is het sein groen');
  // de trein in het derde vak (1500..2250) maakt het sein op 1500 rood
  const bezet = seinBeeld({ vakken, punten, treinen: [trein(wagen(1700, 20))], c, halfLen: 15, dir: 1 });
  ok(bezet.rood && bezet.bezetter, 'een trein in het vak achter het sein maakt het rood');
  // een trein achter de eigen trein (in het eigen vak) laat het groen
  ok(!seinBeeld({ vakken, punten, treinen: [trein(wagen(1100, 20))], c, halfLen: 15, dir: 1 }).rood, 'een trein achter je laat het sein groen');
  // een trein op een ander spoor naast het bezette vak maakt het niet rood
  ok(!seinBeeld({ vakken, punten, treinen: [trein(wagen(1700, 20, 6))], c, halfLen: 15, dir: 1 }).rood, 'een trein op een ander spoor laat het groen');

  // de andere richting: van 1200 terug naar beneden; het sein is de grens op 750 en het vak erachter is 0..750
  const terug = seinBeeld({ vakken, punten, treinen: [], c, halfLen: 15, dir: -1 });
  ok(terug.sein === 750, `terug is het eerstvolgende sein 750: ${terug.sein}`);
  ok(bijna(terug.afstand, 1200 - 15 - 750), `terug telt de afstand naar beneden: ${terug.afstand}`);
  ok(!terug.rood, 'terug is het sein groen zonder treinen');
  ok(seinBeeld({ vakken, punten, treinen: [trein(wagen(300, 20))], c, halfLen: 15, dir: -1 }).rood, 'terug maakt een trein in het vak onder het sein rood');
  ok(!seinBeeld({ vakken, punten, treinen: [trein(wagen(1700, 20))], c, halfLen: 15, dir: -1 }).rood, 'terug telt een trein boven je niet mee');

  // het einde van de lijn: voorbij het laatste sein is er geen sein meer
  const eind = seinBeeld({ vakken, punten, treinen: [trein(wagen(5000, 20))], c: 5990, halfLen: 15, dir: 1 });
  ok(eind.sein === null && !eind.rood, `na het laatste sein is er geen sein meer: ${eind.sein}`);
  // een trein precies op het sein bezet het vak erachter
  ok(seinBeeld({ vakken, punten, treinen: [trein(wagen(1510, 20))], c, halfLen: 15, dir: 1 }).rood, 'een trein vlak na het sein maakt het rood');
}

// --- 6. de halve treinlengte telt mee: een lange trein ziet het sein eerder
{
  const kort = seinBeeld({ vakken, punten, treinen: [], c: 1400, halfLen: 5, dir: 1 });
  const lang = seinBeeld({ vakken, punten, treinen: [], c: 1400, halfLen: 40, dir: 1 });
  ok(lang.afstand < kort.afstand && bijna(kort.afstand - lang.afstand, 35), `een langere trein staat dichter bij het sein: ${kort.afstand} tegen ${lang.afstand}`);
  // en de neus kan al in het volgende vak staan: dan telt het sein daarna
  const voorbij = seinBeeld({ vakken, punten, treinen: [], c: 1505, halfLen: 40, dir: 1 });
  ok(voorbij.sein === 2250, `met de neus in het volgende vak is het sein daarna aan de beurt: ${voorbij.sein}`);
}

console.log(fails ? `${fails} failure(s) van ${n}` : `blokseinen: ${n} checks ok`);
process.exit(fails ? 1 : 0);
