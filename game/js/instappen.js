// In- en uitstappen bij halte en perron, één systeem voor bus en trein (wens eigenaar 23-11). Wachtenden staan bij
// de halte of op het perron; komt er een bus of trein, dan lopen zij naar de dichtstbijzijnde deur en verdwijnen
// erin, en uitstappers komen uit de deur en lopen weg. Alleen beeld: de gameplay telt reizigers zelf (busride.js,
// machinistrules.js). Puur: geen THREE, geen wereld (scripts/instappen_test.mjs); instappen3d.js tekent het, met
// mensen uit het bestaande mensen- en kledingsysteem.
//
// Een deur is { id, x, y, nx, ny }: de plek in de wereld aan de buitenkant van het voertuig en de richting naar buiten
// (naar de stoep of het perron).

export const INSTAP = {
  LOOP_V: 1.5,       // m/s
  START_M: 4.5,      // m van de deur waar een instapper zonder wachtplek begint
  WEGLOOP_M: 6,      // m die een uitstapper van de deur wegloopt
  GAP: 0.55,         // s tussen twee mensen bij dezelfde deur
  IN_NA: 1.2,        // s na het openen beginnen de instappers
  NA_S: 2.5,         // s blijft een uitstapper staan voor hij verdwijnt
  MAX_BUS: 5, MAX_UIT_BUS: 3,
  MAX_TREIN: 8, MAX_UIT_TREIN: 4,
  TREIN_HW: 1.45,    // m: halve breedte van een treinstel (railway.js HALF_WIDTH)
  PERRON_PROBE: 2.6, // m van het hart van het spoor: hier ligt een perron als het er is
};

// Klein deterministisch zaad uit een tekst, en een rng daaruit (mulberry32).
export function zaad(s) {
  let h = 2166136261;
  const t = String(s);
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function maakRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- deuren --------------------------------------------------------------------------------------------

// Deuren van een bus aan de stoepkant (rechts). lokaal: [{ id, x (vooruit), z (rechts) }] uit haltefiguren.js haltedeuren.
export function busDeurenWereld(v, lokaal) {
  const c = Math.cos(v.angle || 0), s = Math.sin(v.angle || 0);
  return lokaal.map((d) => ({ id: d.id, x: v.x + c * d.x - s * d.z, y: v.y + s * d.x + c * d.z, nx: -s, ny: c }));
}

// Deuren per rijtuig van een trein (railway.js: t.cars met { x, y, angle, len, seg }), aan kant `kant` (+1 = links van
// de +s-richting van de route, -1 = rechts). De plekken volgen de deurblokken van railway3d.js.
export function deurenLokaalRijtuig(car, dubbeldeks) {
  const L = car.len, seg = car.seg || {};
  if (seg.kind && seg.kind !== 'car') return [];
  if (dubbeldeks) return [-(L / 2 - 3.0), L / 2 - 3.0];
  const cab = seg.cab || 1;
  return [-cab * (L / 2 - 3.2), cab * (L / 2 - 6.5)];
}
export function treinDeuren(t, kant) {
  const out = [];
  const dd = !!(t.cfg && t.cfg.doubleDeck);
  const hw = INSTAP.TREIN_HW;
  t.cars.forEach((car, ci) => {
    const c = Math.cos(car.angle || 0), s = Math.sin(car.angle || 0);
    const nx = -s * kant, ny = c * kant;
    deurenLokaalRijtuig(car, dd).forEach((dx, di) => {
      out.push({ id: `r${ci}d${di}`, x: car.x + c * dx + nx * hw, y: car.y + s * dx + ny * hw, nx, ny });
    });
  });
  return out;
}

// Aan welke kant(en) van het spoor ligt een perron? probe(x, y) -> waar als daar perronvloer is. ang: richting van het
// spoor (de +s-richting van de route). Geeft een lijst met +1 en/of -1 (leeg: geen perron gevonden).
export function perronKanten(probe, x, y, ang, afstand = INSTAP.PERRON_PROBE) {
  const nx = -Math.sin(ang), ny = Math.cos(ang), ux = Math.cos(ang), uy = Math.sin(ang);
  const out = [];
  for (const k of [1, -1]) {
    // drie punten langs het spoor: een perron hoeft niet precies bij het midden te beginnen
    let hit = 0;
    for (const a of [-12, 0, 12]) if (probe(x + ux * a + nx * k * afstand, y + uy * a + ny * k * afstand)) hit++;
    if (hit >= 2) out.push(k);
  }
  return out;
}

// --- wachtenden ----------------------------------------------------------------------------------------

// Hoeveel mensen wachten er (bescheiden): seed is vast per halte en per kwartier, dus het aantal springt niet.
export function wachtAantal(seed, min, max) {
  const r = maakRng(seed)();
  return min + Math.floor(r * (max - min + 1));
}

// Wachtplekken rond een anker: { x, y, ux, uy (langs de weg/het spoor), nx, ny (van de rand af, de stoep of het
// perron op) }. langs: halve spreiding langs, van/tot: diepte vanaf het anker. Deterministisch per seed.
export function wachtplekken(anker, n, seed, { langs = 2.5, van = 0.3, tot = 1.4, minGat = 0.8 } = {}) {
  const rng = maakRng(seed);
  const out = [];
  for (let i = 0, poging = 0; out.length < n && poging < n * 12; poging++) {
    const a = (rng() * 2 - 1) * langs, d = van + rng() * (tot - van);
    const x = anker.x + anker.ux * a + anker.nx * d, y = anker.y + anker.uy * a + anker.ny * d;
    if (out.some((p) => Math.hypot(p.x - x, p.y - y) < minGat)) continue;
    // kijkt grofweg naar de weg of het spoor, met een beetje speling
    const ang = Math.atan2(-anker.ny, -anker.nx) + (rng() - 0.5) * 1.2;
    out.push({ x, y, ang, i: i++ });
  }
  return out;
}

// --- de uitwisseling -----------------------------------------------------------------------------------

// Plant de figuren van één uitwisseling. deuren: zie boven. ev: { board, alight } (board < 0: iedereen die wacht).
// opts: { rng, wachtenden: [{ x, y }] | null, max, maxUit, wegloop }. Figuur: { kind 'in' | 'uit', id (deur), w (index
// in wachtenden of -1), delay, from, to, duur }.
export function planInstappen(deuren, ev, opts = {}) {
  const rng = opts.rng || Math.random;
  const max = opts.max ?? INSTAP.MAX_BUS, maxUit = opts.maxUit ?? INSTAP.MAX_UIT_BUS;
  const weg = opts.wegloop ?? INSTAP.WEGLOOP_M;
  const wacht = opts.wachtenden || null;
  if (!deuren || !deuren.length) return [];
  const uit = Math.max(0, Math.min(ev.alight || 0, maxUit, max));
  const wil = (ev.board ?? 0) < 0 ? (wacht ? wacht.length : 0) : (ev.board || 0);
  const in_ = Math.max(0, Math.min(wil, max - uit));
  const out = [];
  const teller = deuren.map(() => 0);
  for (let i = 0; i < uit; i++) {
    const k = i % deuren.length, d = deuren[k];
    const zij = (rng() - 0.5) * 3;
    const delay = teller[k]++ * INSTAP.GAP + 0.3;
    const tx = d.x + d.nx * weg - d.ny * zij, ty = d.y + d.ny * weg + d.nx * zij;
    out.push({ kind: 'uit', id: d.id, w: -1, delay, from: { x: d.x, y: d.y }, to: { x: tx, y: ty }, duur: Math.hypot(tx - d.x, ty - d.y) / INSTAP.LOOP_V });
  }
  for (let i = 0; i < in_; i++) {
    let van, k;
    if (wacht && i < wacht.length) {
      van = { x: wacht[i].x, y: wacht[i].y };
      k = dichtsteDeur(deuren, van.x, van.y);
    } else {
      k = (i + uit) % deuren.length;
      const d = deuren[k], zij = (rng() - 0.5) * 3;
      van = { x: d.x + d.nx * INSTAP.START_M - d.ny * zij, y: d.y + d.ny * INSTAP.START_M + d.nx * zij };
    }
    const d = deuren[k];
    const naar = { x: d.x + d.nx * 0.15, y: d.y + d.ny * 0.15 };
    const delay = INSTAP.IN_NA + teller[k]++ * INSTAP.GAP;
    out.push({ kind: 'in', id: d.id, w: wacht && i < wacht.length ? i : -1, delay, from: van, to: naar, duur: Math.hypot(naar.x - van.x, naar.y - van.y) / INSTAP.LOOP_V });
  }
  return out;
}

export function dichtsteDeur(deuren, x, y) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < deuren.length; i++) {
    const d = (deuren[i].x - x) ** 2 + (deuren[i].y - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// Plek en zichtbaarheid van een figuur op tijd t (s sinds de uitwisseling begon), in `uit` geschreven (geen
// allocatie per beeld). Instappers staan tot hun beurt stil en verdwijnen bij de deur; uitstappers komen er uit en
// lopen weg.
export function figuurStand(f, t, uit) {
  const u = t - f.delay;
  if (u < 0) {
    uit.x = f.from.x; uit.y = f.from.y; uit.lopen = false; uit.klaar = false;
    uit.zichtbaar = f.kind !== 'uit';
    return uit;
  }
  const k = f.duur > 0 ? Math.min(1, u / f.duur) : 1;
  uit.x = f.from.x + (f.to.x - f.from.x) * k;
  uit.y = f.from.y + (f.to.y - f.from.y) * k;
  uit.lopen = k < 1;
  uit.zichtbaar = k < 1 || f.kind === 'uit';
  uit.klaar = u > f.duur + (f.kind === 'uit' ? INSTAP.NA_S : 0);
  return uit;
}

// --- wanneer staat een voertuig bij een halte -----------------------------------------------------------

// Een trein die stilstaat met zijn midden bij een halte van zijn route (niet een halte buiten de kaart): de index
// van die halte, anders -1. route.stops: [{ s, offmap }], t: { c (boogafstand van het midden), v }.
export function treinBijHalte(route, t, tol = 2.5) {
  if (!route || !route.stops || Math.abs(t.v || 0) > 0.05) return -1;
  for (let i = 0; i < route.stops.length; i++) {
    const st = route.stops[i];
    if (!st.offmap && Math.abs(st.s - t.c) < tol) return i;
  }
  return -1;
}

// Stilstand-teller per voertuig (voor wat alleen van buiten te zien is, zoals de bussen bij een gast): geeft één keer
// waar als het voertuig `drempel` seconden stilstaat, en pas weer nadat het gereden heeft.
export function makeStilteWacht(drempel = 1) {
  const staat = new Map();
  return {
    tik(id, stil, dt) {
      let s = staat.get(id);
      if (!s) { s = { t: 0, gemeld: false, gezien: 0 }; staat.set(id, s); }
      s.gezien = 0;
      if (!stil) { s.t = 0; s.gemeld = false; return false; }
      s.t += dt;
      if (!s.gemeld && s.t >= drempel) { s.gemeld = true; return true; }
      return false;
    },
    // na een ronde: wie al een paar rondes niet gezien is, gaat weg
    ruim() { for (const [id, s] of staat) if (++s.gezien > 3) staat.delete(id); },
    get grootte() { return staat.size; },
  };
}
