// Blokseinen (#492): een baanvak tussen twee seinen is bezet zolang er een trein in staat,
// dus krijgt de volgende trein rood. Puur: geen THREE, geen DOM, geen klok en geen opslag,
// zodat scripts/blokseinen_test.mjs het zonder wereld kan natrekken. railway.js bewaart de
// vakken en hun punten per route; machinistrules.js leest het seinbeeld en behandelt rood
// als de bestaande sein-storing.

export const SEIN_OP_ETAPPE = 900; // m: op een lange etappe komt er om de zoveel meter een bloksein
export const SEIN_STAP = 10;       // m: zo fijn liggen de punten van een vak (de bezetting toetsen)
export const SEIN_MARGE = 30;      // m: veiligheidsmarge voor en achter een trein, bovenop zijn halve lengte
export const SEIN_HALF_W = 2.2;    // m: zo breed is één spoor; een trein op een ander spoor valt erbuiten

// De blokgrenzen langs een route (booglengtes): bij elke halte een sein, en op een lange
// etappe daartussen nog seinen, zodat een baanvak nooit eindeloos lang is.
export function blokgrenzen(stops = [], len = 0, stap = SEIN_OP_ETAPPE) {
  if (!(len > 0)) return [];
  const basis = [0];
  for (const st of stops) if (st && Number.isFinite(st.s) && st.s > 0 && st.s < len) basis.push(st.s);
  basis.push(len);
  basis.sort((a, b) => a - b);
  const uit = [basis[0]];
  for (let i = 1; i < basis.length; i++) {
    const van = basis[i - 1], tot = basis[i], d = tot - van;
    const n = stap > 0 ? Math.floor(d / stap) : 0;
    for (let k = 1; k <= n; k++) uit.push(van + (d * k) / (n + 1));
    uit.push(tot);
  }
  return uit;
}

// Een baanvak: van de ene blokgrens tot de volgende. Het sein staat aan het begin (van).
export function baanvakken(stops = [], len = 0) {
  const g = blokgrenzen(stops, len);
  const uit = [];
  for (let i = 0; i + 1 < g.length; i++) uit.push({ van: g[i], tot: g[i + 1] });
  return uit;
}

// De punten van een vak, om de bezetting op te toetsen. routePoint(at) geeft [x, y] op de
// route (railway.js); de uiteinden doen mee, zodat een trein op de grens het vak ook raakt.
export function vakPunten(blok, routePoint, stap = SEIN_STAP) {
  const uit = [];
  const d = blok.tot - blok.van;
  const n = Math.max(1, Math.ceil(d / stap));
  for (let k = 0; k <= n; k++) uit.push(routePoint(blok.van + (d * k) / n));
  return uit;
}

// Raakt deze wagen (x, y, angle, len) het punt, met de marge voor en achter? Zijdelings telt
// alleen het eigen spoor: een trein op een ander spoor staat naast het vak, niet erin.
export function wagenOpPunt(car, x, y, marge = SEIN_MARGE, halfW = SEIN_HALF_W) {
  if (!car || !Number.isFinite(car.x) || !Number.isFinite(car.y)) return false;
  const dx = x - car.x, dy = y - car.y;
  const ca = Math.cos(car.angle || 0), sa = Math.sin(car.angle || 0);
  const lx = dx * ca + dy * sa;
  const ly = -dx * sa + dy * ca;
  const half = (Number.isFinite(car.len) ? car.len : 0) / 2 + Math.max(0, marge);
  return Math.abs(lx) <= half && Math.abs(ly) <= halfW;
}

// Welke trein bezet dit vak? `treinen` zijn de andere treinen (zonder de eigen); elk met
// zijn wagens (cars: x, y, angle, len). Geeft de eerste bezetter of null.
export function vakBezet(punten = [], treinen = [], marge = SEIN_MARGE) {
  for (const t of treinen) {
    const cars = (t && t.cars) || [];
    for (const car of cars) {
      for (const p of punten) if (wagenOpPunt(car, p[0], p[1], marge)) return t;
    }
  }
  return null;
}

// Is het sein op deze plek rood? Voor de passering: het vak achter dit sein is bezet.
export function seinRood({ vakken = [], punten = [], treinen = [], sein = null, dir = 1, marge = SEIN_MARGE } = {}) {
  if (!Number.isFinite(sein)) return false;
  const idx = vakken.findIndex((v) => (dir > 0 ? v.van : v.tot) === sein);
  return idx >= 0 ? !!vakBezet(punten[idx] || [], treinen, marge) : false;
}

// Het seinbeeld voor een trein: het eerstvolgende bloksein voor de neus (booglengte c, met
// halve treinlengte halfLen en rijrichting dir) en of het rood is omdat het vak erachter
// bezet is. `punten[i]` hoort bij `vakken[i]`. Achter de trein telt niet: een trein die
// achter je staat, laat je eigen sein groen.
export function seinBeeld({ vakken = [], punten = [], treinen = [], c = 0, halfLen = 0, dir = 1, marge = SEIN_MARGE } = {}) {
  const neus = c + dir * Math.max(0, halfLen);
  let idx = -1, afstand = Infinity;
  for (let i = 0; i < vakken.length; i++) {
    const sein = dir > 0 ? vakken[i].van : vakken[i].tot;
    const to = (sein - neus) * dir;
    if (to < 0) continue; // al voorbij: dat sein geef je niet meer
    if (to < afstand) { afstand = to; idx = i; }
  }
  if (idx < 0) return { sein: null, afstand: Infinity, rood: false, bezetter: null, vak: null };
  const bezetter = vakBezet(punten[idx] || [], treinen, marge);
  return { sein: dir > 0 ? vakken[idx].van : vakken[idx].tot, afstand, rood: !!bezetter, bezetter, vak: vakken[idx] };
}
