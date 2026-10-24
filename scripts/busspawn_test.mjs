// Waar een bus verschijnt en wat hij daar mag (#322): manageBusPopulation uit vehicle.js op een kleine kaart.
//   een bus met lijn begint op de weg waar zijn lijn loopt, niet op het parallelle woonstraatje ernaast;
//   zonder lijn in de buurt rijden bussen alleen over het busnet (geen woonstraat, geen pad);
//   een bus die ver van zijn lijn is, verdwijnt als niemand kijkt.
//   node scripts/busspawn_test.mjs
import './node3d.mjs';

const V = await import('../game/js/vehicle.js');
const B = await import('../game/js/busroutes.js');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

const road = (name, y, o = {}) => ({ name, cat: 'normal', type: 'residential', width: 6.5, oneway: false, pts: [[-600, y], [0, y], [600, y]], ...o });
const near = (r, x, y, d) => r.pts.some((p, i) => i < r.pts.length - 1 && Math.abs(y - p[1]) < d && x > r.pts[i][0] - d && x < r.pts[i + 1][0] + d);
function kaart(roads) {
  return {
    roads, buildings: [],
    roadsNear: (x, y, d) => roads.filter((r) => near(r, x, y, d)),
    buildingsNear: () => [], waterNear: () => [], greenNear: () => [], treesNear: () => [],
    nearestRoadPoint(x, y, reach = 400) {
      let best = null;
      for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1], t = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0])) / ((b[0] - a[0]) ** 2 || 1)));
        const px = a[0] + (b[0] - a[0]) * t, py = a[1], d2 = (x - px) ** 2 + (y - py) ** 2;
        if (d2 < reach * reach && (!best || d2 < best.d2)) best = { x: px, y: py, road: r, d2, dist2: d2 };
      }
      return best;
    },
  };
}
const wereld = (map, extra = {}) => ({ map, time: 0, clock: 12, player: { x: 0, y: 0 }, vehicles: [], props: [], particles: [], stats: {}, addMessage() {}, audioEvents: [], ...extra });
const rondje = (w, n = 60) => { for (let i = 0; i < n; i++) V.manageBusPopulation(w); };

// 1. de lijn loopt over de tertiaire weg (y 0); ernaast, 20 m verder, ligt een woonstraatje dat dichter bij het spawnpunt kan zijn
{
  const hoofd = road('Hoofdweg', 0, { type: 'tertiary', width: 8 });
  const steegje = road('Wilgenpad', 4, { width: 6.5 });   // 4 m ernaast: ligt in de strook, maar is een woonstraat die de lijn niet volgt?
  const kaartje = kaart([hoofd, steegje]);
  const lijn = B.prepareLine({ id: 'a', ref: '1', pts: [[-600, 0], [600, 0]], stops: [] });
  V.setBusLines([lijn]);
  const w = wereld(kaartje);
  rondje(w);
  const bussen = w.vehicles.filter((v) => v.isBus);
  ok(bussen.length > 0, 'er verschijnen bussen op de lijn', String(bussen.length));
  ok(bussen.every((v) => v.road === hoofd || v.road === steegje), 'alleen op de twee wegen van de kaart');
  // het steegje ligt binnen 12 m van de lijn en loopt er helemaal naast: dat mag voor deze lijn; test hieronder met 40 m ernaast
}
{
  const hoofd = road('Hoofdweg', 0, { type: 'tertiary', width: 8 });
  const steegje = road('Wilgenpad', 40, { width: 6.5 });
  const smal = road('Kijkstraat', -30, { width: 3.2, type: 'tertiary' });
  const kaartje = kaart([hoofd, steegje, smal]);
  const lijn = B.prepareLine({ id: 'a', ref: '1', pts: [[-600, 0], [600, 0]], stops: [] });
  V.setBusLines([lijn]);
  const w = wereld(kaartje);
  rondje(w);
  const bussen = w.vehicles.filter((v) => v.isBus);
  ok(bussen.length > 0 && bussen.every((v) => v.road === hoofd), 'met een lijn begint elke bus op de weg van zijn lijn', bussen.map((v) => v.road.name).join());
  ok(bussen.every((v) => v.busRun && v.busRun.line === lijn), 'elke bus heeft zijn rit');
  // een bus die ver van de lijn is geraakt, verdwijnt als niemand kijkt
  const dwaal = bussen[0];
  dwaal.y = 400; dwaal.x = 300;
  w.player.x = 0; w.player.y = 0;
  V.manageBusPopulation(w);
  ok(!w.vehicles.includes(dwaal), 'een bus die 400 m van zijn lijn is, verdwijnt');
}
// 2. een lijn die over een woonstraat loopt: daar mag de bus wel
{
  const wilgen = road('Wilgenpad', 0, { width: 6.5 });
  const kaartje = kaart([wilgen]);
  const lijn = B.prepareLine({ id: 'w', ref: '7', pts: [[-600, 0], [600, 0]], stops: [] });
  V.setBusLines([lijn]);
  const w = wereld(kaartje);
  rondje(w);
  ok(w.vehicles.some((v) => v.isBus && v.road === wilgen), 'een lijn over een woonstraat: de bus rijdt daar (de lijndata is de echte route)');
}
// 3. zonder lijn in de buurt: alleen het busnet
{
  const wilgen = road('Wilgenpad', 0, { width: 6.5 });
  const pad = road('Fietspad', 30, { cat: 'cycle', type: 'cycleway', width: 2 });
  const kaartje = kaart([wilgen, pad]);
  V.setBusLines([]);
  const w = wereld(kaartje);
  rondje(w);
  ok(w.vehicles.filter((v) => v.isBus).length === 0, 'zonder lijn en zonder busnet: geen bussen op een woonstraat of pad');
  const hoofd = road('Hoofdweg', 60, { type: 'secondary', cat: 'major', width: 9 });
  const w2 = wereld(kaart([wilgen, pad, hoofd]));
  rondje(w2);
  const b2 = w2.vehicles.filter((v) => v.isBus);
  ok(b2.length > 0 && b2.every((v) => v.road === hoofd), 'zonder lijn rijdt een bus alleen over de hoofdweg', b2.map((v) => v.road.name).join());
}
// 4. live bussen (#395, livebussen.js): een echte bus op de lijn in bereik wordt een bus met liveId, één per id; de echte bus
//    bepaalt de snelheid; is de echte bus weg of keert hij om, dan rijdt hij zijn eigen dienst
{
  const hoofd = road('Hoofdweg', 0, { type: 'tertiary', width: 8 });
  const kaartje = kaart([hoofd]);
  const lijn = B.prepareLine({ id: 'a', ref: '1', pts: [[-600, 0], [600, 0]], stops: [] });
  V.setBusLines([lijn]);
  let echt = { id: 'live-1', line: lijn, dir: 1, s: 750, x: 150, y: 0, angle: 0, speed: 0 };
  V.setLiveBussen({ positie: (id) => (echt && id === echt.id ? echt : null), kandidaten: () => (echt ? [{ ...echt, d: 150 }] : []) });
  const w = wereld(kaartje);
  rondje(w, 20);
  const live = w.vehicles.filter((v) => v.liveId === 'live-1');
  ok(live.length === 1, 'één bus per live voertuig', String(live.length));
  ok(live[0] && live[0].busRun.line === lijn && live[0].busRun.dir === 1, 'de live bus rijdt zijn eigen lijn en richting');
  ok(live[0] && Math.abs(live[0].x - 150) < 40, 'hij begint bij de plek van de echte bus', live[0] && String(live[0].x));
  if (live[0]) {
    V.updateTrafficAI(live[0], 0.05, kaartje, w);
    ok(live[0].liveScale != null && live[0].liveScale < 0.5, 'een stilstaande echte bus: de live bus rijdt niet door', String(live[0].liveScale));
    echt = { ...echt, s: 900, x: 300, speed: 10 };
    V.updateTrafficAI(live[0], 0.05, kaartje, w);
    ok(live[0].liveScale > 0.5, 'een rijdende echte bus ver vooruit: hij rijdt door', String(live[0].liveScale));
    echt = null;
    V.updateTrafficAI(live[0], 0.05, kaartje, w);
    ok(live[0].liveId == null && live[0].liveScale == null, 'echte bus weg: terug naar de eigen dienst');
  }
  V.setLiveBussen(null);
}
V.setBusLines([]);
console.log(`busspawn_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
