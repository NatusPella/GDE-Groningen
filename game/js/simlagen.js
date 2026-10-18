// Simulatielagen voor verkeer en voetgangers (issue #18): per streek en afstand
// tot de speler hoeveel er echt gesimuleerd wordt. Zuivere logica, geen DOM en
// geen three.js: vehicle.js leest er achter ?simlagen de doelaantallen en
// afstanden uit; scripts/simlagen_test.mjs controleert het.
//
// Lagen, van dichtbij naar ver:
//   vol            echte voertuigen/voetgangers: alle botsingen, ogen, geluid
//   vereenvoudigd  bestaan wel, maar zonder dure stappen (grove botsingen,
//                  lagere updatefrequentie)
//   abstract       alleen een getal per cel; wordt bij het naderen weer echte
//                  entiteiten en bij het wegtrekken weer een getal (AbstractPool)
//   weg            buiten bereik: niets


// Randen in meter per soort: [vol, vereenvoudigd, abstract]
const RANDEN = {
  auto: [150, 260, 700],
  voetganger: [70, 150, 400],
};

// Dichtheid per streek, in entiteiten per vierkante kilometer
const DICHTHEID = {
  centrum: { auto: 260, voetganger: 600 },
  stad: { auto: 170, voetganger: 400 },
  industrie: { auto: 90, voetganger: 60 },
  dorp: { auto: 40, voetganger: 100 },
  platteland: { auto: 6, voetganger: 8 },
};

// De vollaag is het duurst: daar komt een plafond op.
const PLAFOND_VOL = { auto: 40, voetganger: 70 };

// koppeling aan trafficfleet.js: wijkprofiel -> streek
const PROFIEL_STREEK = {
  centrum: 'centrum', student: 'stad', chic: 'stad', bakfiets: 'stad', standaard: 'stad', industrie: 'industrie',
};
export const streekVanProfiel = (key) => PROFIEL_STREEK[key] || 'stad';

// 's Nachts rustiger, behalve voor voetgangers in het centrum.
export function tijdFactor(soort, uur, streek) {
  const h = ((uur % 24) + 24) % 24;
  if (soort === 'voetganger') {
    if (h >= 8 && h < 22) return 1;
    return streek === 'centrum' ? 0.7 : 0.25;
  }
  if (h >= 6 && h < 22) return 1;
  return 0.3;
}

export function randen(soort) {
  return (RANDEN[soort] || RANDEN.auto).slice();
}

export function laagVoorAfstand(soort, afstand) {
  const [a, b, c] = RANDEN[soort] || RANDEN.auto;
  if (!(afstand >= 0)) return 'weg';
  if (afstand < a) return 'vol';
  if (afstand < b) return 'vereenvoudigd';
  if (afstand < c) return 'abstract';
  return 'weg';
}

// oppervlak (m2) van de ring van een laag rond de speler
function ringOppervlak(soort, laag) {
  const [a, b, c] = RANDEN[soort] || RANDEN.auto;
  const r = laag === 'vol' ? [0, a] : laag === 'vereenvoudigd' ? [a, b] : [b, c];
  return Math.PI * (r[1] * r[1] - r[0] * r[0]);
}

// Doelaantal per laag voor een streek: dichtheid x ringoppervlak x tijdfactor.
export function doelPerLaag(soort, streek, uur = 12) {
  const d = (DICHTHEID[streek] || DICHTHEID.stad)[soort] ?? 0;
  const f = tijdFactor(soort, uur, streek);
  const uit = {};
  for (const laag of ['vol', 'vereenvoudigd', 'abstract']) {
    uit[laag] = Math.max(0, Math.round((d * f * ringOppervlak(soort, laag)) / 1e6));
  }
  uit.vol = Math.min(uit.vol, PLAFOND_VOL[soort] ?? 40);
  return uit;
}

// Plan voor een populatie: items = [{ x, y }], speler = { x, y }.
// Geeft per item de laag, wie weg moet (te ver) en hoeveel er per laag bij moet.
export function plan(soort, streek, speler, items, uur = 12) {
  const doel = doelPerLaag(soort, streek, uur);
  const aantal = { vol: 0, vereenvoudigd: 0, abstract: 0 };
  const lagen = [];
  const weg = [];
  items.forEach((it, i) => {
    const l = laagVoorAfstand(soort, Math.hypot(it.x - speler.x, it.y - speler.y));
    lagen.push(l);
    if (l === 'weg') weg.push(i);
    else aantal[l]++;
  });
  const bij = {};
  for (const l of ['vol', 'vereenvoudigd']) bij[l] = Math.max(0, doel[l] - aantal[l]);
  return { lagen, weg, doel, aantal, bij };
}

// Spawnring voor nieuwe echte entiteiten: buiten het directe zicht, binnen de
// vereenvoudigde laag, zodat ze er al zijn als de speler dichterbij komt.
export function spawnRing(soort) {
  const [a, b] = RANDEN[soort] || RANDEN.auto;
  return { min: Math.round(a * 0.5), max: b };
}

// Despawn-afstand: voorbij de abstracte rand, zodat niemand op de grens hapert.
export function despawnAfstand(soort) {
  return (RANDEN[soort] || RANDEN.auto)[2];
}

// Abstracte laag: een getal per cel (100 m). Wat de vereenvoudigde laag
// verlaat wordt hier opgeteld (afleggen); komt een cel dichterbij, dan worden
// het weer echte entiteiten (opnemen).
export class AbstractPool {
  constructor(cel = 100) {
    this.cel = cel;
    this.cellen = new Map();
  }
  sleutel(x, y) { return Math.floor(x / this.cel) + ',' + Math.floor(y / this.cel); }
  afleggen(x, y, n = 1) {
    const k = this.sleutel(x, y);
    this.cellen.set(k, (this.cellen.get(k) || 0) + n);
  }
  // haalt hooguit `max` uit cellen binnen straal r rond (x,y); geeft celmiddens terug
  opnemen(x, y, r, max) {
    const uit = [];
    for (const [k, n] of [...this.cellen]) {
      if (uit.length >= max) break;
      const [cx, cy] = k.split(',').map(Number);
      const mx = (cx + 0.5) * this.cel, my = (cy + 0.5) * this.cel;
      if (Math.hypot(mx - x, my - y) > r) continue;
      const neem = Math.min(n, max - uit.length);
      for (let i = 0; i < neem; i++) uit.push({ x: mx, y: my });
      if (neem >= n) this.cellen.delete(k); else this.cellen.set(k, n - neem);
    }
    return uit;
  }
  totaal() { let t = 0; for (const n of this.cellen.values()) t += n; return t; }
  // vergeet cellen voorbij straal r
  opruimen(x, y, r) {
    for (const k of [...this.cellen.keys()]) {
      const [cx, cy] = k.split(',').map(Number);
      if (Math.hypot((cx + 0.5) * this.cel - x, (cy + 0.5) * this.cel - y) > r) this.cellen.delete(k);
    }
  }
}

// Dunne koppeling voor vehicle.js: opties voor
// manageTrafficPopulation({ target, spawnMin, spawnMax, despawnDist }).
export function verkeerOpties(profielKey, uur) {
  const doel = doelPerLaag('auto', streekVanProfiel(profielKey), uur);
  const ring = spawnRing('auto');
  return { target: doel.vol + doel.vereenvoudigd, spawnMin: ring.min, spawnMax: ring.max, despawnDist: despawnAfstand('auto') };
}

// Voetgangers: dezelfde koppeling als verkeerOpties. De vol-laag blijft de
// echte kring; de vereenvoudigde laag telt mee voor het doel maar denkt
// minder vaak (zie stapSlaOver).
export function voetgangerOpties(profielKey, uur) {
  const doel = doelPerLaag('voetganger', streekVanProfiel(profielKey), uur);
  return { target: doel.vol + doel.vereenvoudigd, volTarget: doel.vol, despawnDist: despawnAfstand('voetganger'), ring: spawnRing('voetganger') };
}

// Vereenvoudigde updatestap: per laag hoeveel frames een entiteit overslaat
// (de overgeslagen dt wordt opgespaard door simload.takeDt). Vol = elk frame;
// ver weg blijft traag doorlopen, zodat niemand bevriest.
const STAP = { vol: 1, vereenvoudigd: 3, abstract: 6, weg: 6 };
export const stapInterval = (laag) => STAP[laag] ?? 1;

// true als dit item dit frame zijn stap overslaat. index + frame spreidt de
// lasten, zodat niet alles tegelijk denkt. Ver weg denkt zelden.
export function stapSlaOver(soort, afstand, index, frame) {
  const n = stapInterval(laagVoorAfstand(soort, afstand));
  if (n <= 1) return false;
  return (index + frame) % n !== 0;
}
