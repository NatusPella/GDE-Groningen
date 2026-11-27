// Ambient treinen (#1339, #1348): echte treinen die op elke spoorlijn rondrijden op WERELDTIJD (echte seconden), niet op de spelklok.
// De rooster-treinen (trainservice.js) staan vast op de 60x snelle spelklok en bestaan daardoor alleen bij een station; deze treinen laten
// het open spoor leven. Ze volgen ongeveer het rooster (een paar treinen per lijn, heen en weer, een halte van 30 tot 60 s), maar niet exact.
//
// PUUR en DETERMINISTISCH: de plek van een trein volgt uit (lijn, seed, wereldtijd) en niets anders, zodat host en gast zonder netwerkverkeer
// dezelfde trein op dezelfde plek zien. Een trein is alleen in de wereld (railway.js) binnen ZICHT_M van de speler; verder wordt hij niet gesimuleerd.
// De wereldtijd is de spelklok teruggerekend naar echte seconden (klokNaSeconden) en loopt rond na een speldag (1440 s): de cyclus van elke
// trein is daarom een deler van 1440 s, zodat er geen sprong zit in het rondlopen van de klok.

export const DAG_S = 1440;            // een speldag in echte seconden (daynight.js DAY_LENGTH_S)
export const ZICHT_M = 800;           // m: binnen deze afstand van de speler bestaat de trein
export const V_MAX = 30;              // m/s: nooit sneller dan dit
export const VERSNELLING = 0.8;       // m/s2 optrekken en remmen
export const HALTE_MIN = 30, HALTE_MAX = 60;   // s stilstaan op een halte

// de spelklok (uren) in echte seconden binnen de dag
export const klokNaSeconden = (uren) => ((((uren || 0) * 3600) / 60) % DAG_S + DAG_S) % DAG_S;

// kleine, vaste hasj (FNV-1a) naar [0, 1)
export function hasj01(tekst) {
  let h = 2166136261;
  for (let i = 0; i < tekst.length; i++) { h ^= tekst.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return ((h >>> 0) % 1000003) / 1000003;
}

// Tijd (s) om d meter af te leggen van stilstand naar stilstand: optrekken, kruisen, remmen (driehoek als de rit te kort is).
export function ritTijd(d, vmax = V_MAX, a = VERSNELLING) {
  const dAcc = (vmax * vmax) / (2 * a);
  return d >= 2 * dAcc ? (2 * vmax) / a + (d - 2 * dAcc) / vmax : 2 * Math.sqrt(d / a);
}
// afstand en snelheid na tau seconden van een rit van d meter (remmen is het spiegelbeeld van optrekken)
export function ritStand(tau, d, vmax = V_MAX, a = VERSNELLING) {
  const T = ritTijd(d, vmax, a);
  if (tau <= 0) return { x: 0, v: 0 };
  if (tau >= T) return { x: d, v: 0 };
  const vpiek = d >= (vmax * vmax) / a ? vmax : Math.sqrt(a * d);
  const tc = vpiek / a;
  const af = (t) => (t <= tc ? 0.5 * a * t * t : 0.5 * a * tc * tc + vpiek * (t - tc));   // afstand na t s optrekken
  const snel = (t) => Math.min(vpiek, a * t);
  return tau <= T / 2 ? { x: af(tau), v: snel(tau) } : { x: d - af(T - tau), v: snel(T - tau) };
}

export const CRUISE = 26;   // m/s: kruissnelheid van een ambient trein (93 km/u), onder V_MAX

// Een sectie van een lijn: de haltes idx (indices in route.stops, oplopend) met een cyclus heen en terug die in een speldag past.
// Geeft { idx, ev, periode } of null als de cyclus langer dan een speldag duurt.
function bouwSectie(route, idx, sleutel) {
  const m = idx.length;
  const volgorde = [];                                   // heen 0..m-1, terug m-2..1; daarna begint de cyclus opnieuw op 0
  for (let k = 0; k < m; k++) volgorde.push(k);
  for (let k = m - 2; k >= 1; k--) volgorde.push(k);
  const ev = [];
  let t = 0;
  volgorde.forEach((k, q) => {
    const dir = q < m - 1 ? 1 : -1;                      // de richting van de rit die hierna komt
    const dwell = HALTE_MIN + hasj01(`${sleutel}|h${idx[k]}|${dir}`) * (HALTE_MAX - HALTE_MIN);
    ev.push({ soort: 'halte', t0: t, t1: t + dwell, k, dir, eindpunt: k === 0 || k === m - 1 });
    t += dwell;
    const naar = volgorde[(q + 1) % volgorde.length];
    const d = Math.abs(route.stops[idx[naar]].s - route.stops[idx[k]].s);
    const T = ritTijd(d, CRUISE);
    ev.push({ soort: 'rit', t0: t, t1: t + T, van: k, naar, d, dir: naar > k ? 1 : -1, vm: CRUISE });
    t += T;
  });
  if (t > DAG_S) return null;
  const kk = Math.max(1, Math.floor(DAG_S / t));
  const periode = DAG_S / kk;                            // een deler van een speldag: de klok loopt zonder sprong rond
  // de rest van de periode staat de trein stil op de beide eindpunten
  const eind = ev.map((e, i) => (e.soort === 'halte' && e.eindpunt ? i : -1)).filter((i) => i >= 0);
  const toe = (periode - t) / eind.length;
  let verschuif = 0;
  const uit = ev.map((e, i) => {
    const o = { ...e, t0: e.t0 + verschuif, t1: e.t1 + verschuif };
    if (eind.includes(i)) { o.t1 += toe; verschuif += toe; }
    return o;
  });
  return { idx, ev: uit, periode };
}

// Het plan van een lijn: de haltes op de kaart, in secties waarvan de cyclus (heen en terug, een halte van 30 tot 60 s) in een speldag past
// (een lijn van 45 km past niet in een keer), en per sectie twee treinen in tegenfase. route: { name, len, stops: [{ s, offmap? }] }.
// seed: getal of tekst. Geeft null als er geen sectie uit komt.
export function ambientPlan(route, seed = 0, { perSectie = 2 } = {}) {
  const alle = [];
  route.stops.forEach((st, i) => { if (!st.offmap && st.s >= 0 && st.s <= route.len) alle.push(i); });
  if (alle.length < 2) return null;
  const sleutel = `${route.name}|${seed}`;
  const secties = [];
  let a = 0;
  while (a < alle.length - 1) {
    let b = a + 1, sec = bouwSectie(route, alle.slice(a, b + 1), sleutel);
    if (!sec) { a++; continue; }                          // een rit van twee haltes die al niet past: overslaan
    while (b + 1 < alle.length) {
      const grotere = bouwSectie(route, alle.slice(a, b + 2), sleutel);
      if (!grotere) break;
      sec = grotere; b++;
    }
    secties.push(sec);
    a = b;
  }
  if (!secties.length) return null;
  const treinen = [];
  secties.forEach((sec, si) => {
    for (let j = 0; j < perSectie; j++) treinen.push({ i: treinen.length, sectie: si, fase: ((j + hasj01(`${sleutel}|fase${si}`)) / perSectie) * sec.periode });
  });
  return { route, secties, treinen };
}

// De stand van een trein (uit plan.treinen) op wereldtijd R (echte seconden): { s, v, dir, state, target, timer }.
// target is de index in route.stops van de halte waar hij staat of heen rijdt.
export function ambientStand(plan, trein, R) {
  const sec = plan.secties[trein.sectie], { ev, idx, periode } = sec, route = plan.route;
  const ph = (((R + trein.fase) % periode) + periode) % periode;
  let e = ev[ev.length - 1];
  for (let i = 0; i < ev.length; i++) if (ph < ev[i].t1) { e = ev[i]; break; }
  if (e.soort === 'halte') {
    return { s: route.stops[idx[e.k]].s, v: 0, dir: e.dir, state: 'dwell', target: idx[e.k], timer: Math.max(0, e.t1 - ph) };
  }
  const a = route.stops[idx[e.van]];
  const q = ritStand(ph - e.t0, e.d, e.vm);
  return { s: a.s + e.dir * q.x, v: q.v, dir: e.dir, state: 'run', target: idx[e.naar], timer: 0 };
}
