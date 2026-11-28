// Doorlopend viaduct (#1339, besluit eigenaar 28-11): het hoogteprofiel van het spoor (railprofile.mjs) laat het spoor tussen twee kruisingen zo laag
// zakken als de regels toelaten ("least earthworks"). Tussen twee stukken dek (z >= DECK_Z) ontstaat zo een kuil van enkele honderden meters waarin het
// dek ophoudt en het spoor tegen maaiveld aan loopt (de Moesstraat: dek tot 100 m voorbij de straat, dan naar 0,7 m en weer omhoog). Een spoor in een
// stad zakt niet tussen twee viaducten: deze pass vult zo'n kuil op tot een doorlopend dek.
//
// PUUR (geen THREE, geen DOM). fillRailValleys(rails, opts) werkt op rijen { pts, z } en wijzigt z op zijn plaats.
// Per spoorketen (opeenvolgende rijen die een punt delen, zonder wissel): een stuk met z < DECK_Z tussen twee punten met z >= DECK_Z, hooguit MAX_KUIL m lang,
// krijgt de lijn tussen die twee hoogten. Niet gevuld wordt een kuil waar iets in de weg zit: een perron of overweg (pins), een weg op maaiveld of een gebouw
// onder het dek (obstacle(x, y) geeft een reden of null), of een wissel (een keten eindigt daar). Het resultaat meldt wat gevuld en wat geblokkeerd is.
export const DECK_Z = 2.6;      // railprofile.js RAIL_DECK_Z: vanaf deze hoogte tekent railway3d een dek met pijlers
export const MAX_KUIL = 600;    // m: een langere kuil is een echte dijk of een echt dal, geen onderbreking
const REIK_TOP = 250;           // m: zo ver voorbij de kuil zoeken we de top van het dek waar de lijn naartoe loopt
const KEY = 2;                  // punten binnen 0,5 m zijn hetzelfde punt

const sleutel = (x, y) => `${Math.round(x * KEY)},${Math.round(y * KEY)}`;

// De spoorketens van een lijst rijen: elke keten is [{ x, y, refs: [[rij, index]] }] van eindpunt tot eindpunt (een wissel of rijeinde is een eindpunt).
export function spoorKetens(rails) {
  const nodes = new Map();
  const node = (x, y) => { const k = sleutel(x, y); let n = nodes.get(k); if (!n) nodes.set(k, n = { k, x, y, refs: [], nb: new Set() }); return n; };
  for (const r of rails) {
    const P = r.pts, Z = r.z;
    if (!P || !Z || P.length < 2 || Z.length !== P.length) continue;
    let prev = null;
    for (let i = 0; i < P.length; i++) {
      const n = node(P[i][0], P[i][1]);
      n.refs.push([r, i]);
      if (prev && prev !== n) { prev.nb.add(n.k); n.nb.add(prev.k); }
      prev = n;
    }
  }
  // Een punt waar twee sporen samenkomen (een wissel van twee parallelle sporen) is geen eindpunt van de keten als alle buren in twee richtingen
  // liggen (binnen 35 graden): de keten loopt er dwars doorheen, naar de buur aan de overkant.
  const richting = (n, k) => { const m = nodes.get(k); return Math.atan2(m.y - n.y, m.x - n.x); };
  const hoek = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
  const groepen = (n) => {
    const g = [];
    for (const k of n.nb) { const r = richting(n, k); const hit = g.find((q) => hoek(q.r, r) < 0.61); if (hit) hit.ks.push(k); else g.push({ r, ks: [k] }); }
    return g;
  };
  const doorgang = (n) => n.nb.size === 2 || (n.nb.size > 2 && groepen(n).length === 2);
  const gezien = new Set();
  const edge = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const ketens = [];
  const loop = (start, eerste) => {
    const keten = [start];
    let vorig = start, nu = nodes.get(eerste);
    gezien.add(edge(start.k, nu.k));
    while (nu) {
      keten.push(nu);
      if (!doorgang(nu)) break;
      let volg;
      if (nu.nb.size === 2) { const [a, b] = [...nu.nb]; volg = a === vorig.k ? b : a; }
      else {   // dwars door de samenkomst: de buur het dichtst bij de rechtdoorgaande richting, uit de andere groep
        const r0 = richting(nu, vorig.k) + Math.PI;
        const andere = groepen(nu).filter((q) => hoek(q.r, richting(nu, vorig.k)) >= 0.61).flatMap((q) => q.ks);
        andere.sort((x, y) => hoek(richting(nu, x), r0) - hoek(richting(nu, y), r0) || (x < y ? -1 : 1));
        volg = andere.find((k) => !gezien.has(edge(nu.k, k))) || andere[0];
      }
      const e = edge(nu.k, volg);
      if (gezien.has(e)) break;
      gezien.add(e);
      vorig = nu; nu = nodes.get(volg);
    }
    return keten;
  };
  for (const n of nodes.values()) {              // eerst vanaf de echte eindpunten
    if (doorgang(n)) continue;
    for (const k of n.nb) if (!gezien.has(edge(n.k, k))) ketens.push(loop(n, k));
  }
  for (const n of nodes.values()) {              // de rest (de tweede tak van twee parallelle sporen): vanaf elk punt dat nog een ongelopen kant heeft
    for (const k of n.nb) if (!gezien.has(edge(n.k, k))) ketens.push(loop(n, k));
  }
  return ketens;
}

const zVan = (n) => { let z = -Infinity; for (const [r, i] of n.refs) z = Math.max(z, r.z[i]); return z; };

// De kuilen van een keten: [{ i, j }] met ketenindices van de punten tussen twee dekpunten (z < DECK_Z), plus de lengtes.
function kuilen(keten, z, s, deckZ) {
  const uit = [];
  let i = 1;
  while (i < keten.length - 1) {
    if (z[i] >= deckZ || z[i - 1] < deckZ) { i++; continue; }
    let j = i;
    while (j < keten.length - 1 && z[j] < deckZ) j++;
    if (z[j] >= deckZ) uit.push({ i, j: j - 1, van: i - 1, tot: j, lengte: s[j] - s[i - 1] });
    i = j + 1;
  }
  return uit;
}

// de audit zet de pass uit om het profiel van vóór de pass te lezen
let aan = true;
export const zetKuilVulling = (b) => { aan = !!b; };

export function fillRailValleys(rails, opts = {}) {
  if (!aan) return { ketens: 0, gevuld: [], geblokkeerd: [], dekMetersVoor: 0, dekMetersNa: 0, uit: true };
  // een tweede tak van twee parallelle sporen krijgt zijn hoge eindpunt pas als de eerste is opgehoogd: herhaal tot er niets meer verandert
  let rep = null;
  for (let ronde = 0; ronde < 4; ronde++) {
    const r = vulRonde(rails, opts);
    if (!rep) rep = r; else { rep.gevuld.push(...r.gevuld); rep.geblokkeerd = r.geblokkeerd; rep.dekMetersNa = r.dekMetersNa; }
    if (!r.gevuld.length || opts.droog) break;
  }
  return rep;
}

function vulRonde(rails, { deckZ = DECK_Z, maxKuil = MAX_KUIL, obstacle = null, pins = null, droog = false } = {}) {
  const rep = { ketens: 0, gevuld: [], geblokkeerd: [], dekMetersVoor: 0, dekMetersNa: 0 };
  const ketens = spoorKetens(rails);
  rep.ketens = ketens.length;
  for (const keten of ketens) {
    const z = keten.map(zVan);
    const s = [0];
    for (let q = 1; q < keten.length; q++) s.push(s[q - 1] + Math.hypot(keten[q].x - keten[q - 1].x, keten[q].y - keten[q - 1].y));
    for (let q = 1; q < keten.length; q++) if (z[q] >= deckZ && z[q - 1] >= deckZ) rep.dekMetersVoor += s[q] - s[q - 1];
    for (const k of kuilen(keten, z, s, deckZ)) {
      const info = { x: Math.round(keten[k.i].x), y: Math.round(keten[k.i].y), naarX: Math.round(keten[k.tot].x), naarY: Math.round(keten[k.tot].y), lengte: Math.round(k.lengte), minZ: +Math.min(...z.slice(k.i, k.j + 1)).toFixed(2), vanZ: +z[k.van].toFixed(2), totZ: +z[k.tot].toFixed(2) };
      if (k.lengte > maxKuil) { rep.geblokkeerd.push({ ...info, reden: 'te lang' }); continue; }
      let reden = null;
      // alleen het binnenste van de kuil: de randen zijn al dek (daar liggen de wegen die het dek al overspant)
      for (let q = k.i; q <= k.j && !reden; q++) {
        const n = keten[q];
        if (pins && pins.some((p) => Math.hypot(p[0] - n.x, p[1] - n.y) < p[2])) reden = 'perron of overweg';
        if (!reden && obstacle) {
          const m = Math.max(1, Math.ceil((s[q + 1] - s[q]) / 6));
          for (let u = 0; u < m && !reden; u++) {
            const t = u / m;
            reden = obstacle(n.x + (keten[q + 1].x - n.x) * t, n.y + (keten[q + 1].y - n.y) * t);
          }
        }
      }
      if (reden) { rep.geblokkeerd.push({ ...info, reden }); continue; }
      rep.gevuld.push(info);
      if (droog) continue;
      // de lijn loopt van de top aan de ene kant naar de top aan de andere kant (hooguit REIK_TOP m uit de kuil, zolang het spoor daar nog stijgt),
      // zodat het dek niet eerst naar de drempel zakt en dan vlak loopt: een glooiing in plaats van een knik
      let pl = k.van, pr = k.tot;
      while (pl > 0 && z[pl - 1] >= z[pl] && s[k.van] - s[pl - 1] <= REIK_TOP) pl--;
      while (pr < keten.length - 1 && z[pr + 1] >= z[pr] && s[pr + 1] - s[k.tot] <= REIK_TOP) pr++;
      for (let q = pl; q <= pr; q++) {
        const t = (s[q] - s[pl]) / (s[pr] - s[pl]);
        const nz = Math.round((z[pl] + (z[pr] - z[pl]) * t) * 100) / 100;
        if (nz <= z[q]) continue;
        for (const [r, idx] of keten[q].refs) r.z[idx] = Math.max(r.z[idx], nz);
        z[q] = nz;
      }
    }
    for (let q = 1; q < keten.length; q++) if (z[q] >= deckZ && z[q - 1] >= deckZ) rep.dekMetersNa += s[q] - s[q - 1];
  }
  rep.dekMetersVoor = Math.round(rep.dekMetersVoor); rep.dekMetersNa = Math.round(rep.dekMetersNa);
  return rep;
}

// De hindernissen van een kaart (GameMap of TileWorld) voor fillRailValleys: een weg op maaiveld of een gebouw op de hartlijn van het spoor, en de pins
// (stations en overwegen). onGroundRoad en inBuildingAt komen uit propfilter.js.
export function kaartHindernis(map, { onGroundRoad, inBuildingAt }) {
  const obstacle = (x, y) => {
    if (onGroundRoad(map, x, y, 0.5)) return 'weg op maaiveld onder het dek';
    if (inBuildingAt(map, x, y, 1)) return 'gebouw onder het dek';
    return null;
  };
  const pins = [];
  for (const c of map.levelCrossings || []) pins.push([c.x, c.y, 30]);
  for (const st of map.stations || []) if (Number.isFinite(st.x)) pins.push([st.x, st.y, 60]);
  // een laag perron (op maaiveld) heeft een aanloop op maaiveld: daar blijft het spoor laag; een hoog perron (Noord, 6,6 m) niet
  for (const row of map.perrons || []) (row.p || []).forEach((p, i) => { if (p[3] < 2 ? i % 4 === 0 : i % 2 === 0) pins.push([p[0], p[1], p[3] < 2 ? 220 : 12]); });
  return { obstacle, pins };
}
