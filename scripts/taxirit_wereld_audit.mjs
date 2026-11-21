// Audit van het taxipad op de echte tegels (#1020, playtest 0.64.0: "de taxi rijdt dwars door een gebouw heen").
// Per start-doelpaar (willekeurig, vaste zaad) de echte autoroute (routing.js planDriveRoute), daaruit het ritpad (ridepath.js
// ritRoute, zoals reisrit3d.js bouwTaxi het doet), en dan: hoeveel punten van het GEREDEN deel (begin en eind, 450 m) liggen in
// een gebouw op de rechterbaan? Daarnaast: hoeveel routes vielen terug op een lichtere spline of de wegpunten (mix < 1)?
//   node scripts/taxirit_wereld_audit.mjs [--paren=60] [--straal=1800]    (STRICT=1: elke schending is een fout)
// Slaat over zonder game/world (desktop stage). Alleen de ingeladen tegels rond het centrum: een provincie-brede audit past hier niet.
import './node3d.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const PAREN = arg('paren', 60), STRAAL = arg('straal', 1800);
let seed = 20201121;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
Math.random = rnd;
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP taxirit_wereld_audit: geen game/world'); process.exit(0); }
const map = T.world;
const { planDriveRoute, planLandRoute, insideBuilding } = await import('../game/js/routing.js');
const { ritRoute, maakPad, schendingen } = await import('../game/js/ridepath.js');
await loadArea(T, [-STRAAL, -STRAAL, STRAAL, STRAAL]);
planLandRoute(map, 'drive', [0, 0], [50, 50]); // bouwt de wegengraaf (ensureGraph) over de ingeladen tegels

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };

const world = { map, vehicles: [], pedestrians: [], time: 0, wanted: 0, addMessage() {}, stats: {} };
const punt = () => {
  for (let k = 0; k < 50; k++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * STRAAL;
    const q = map.nearestRoadPoint(Math.cos(a) * r, Math.sin(a) * r, 60, true);
    if (q) return q;
  }
  return null;
};
let oudMet = 0, pogingen = 0, geenRoute = 0, metSchending = 0, teruggevallen = 0, beginBinnen = 0, eindBinnen = 0, paren = 0;
const meldingen = [];
while (paren < PAREN && pogingen++ < PAREN * 20) {
  const a = punt(), b = punt();
  if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) < 300) continue;
  paren++;
  // de speler staat soms naast de weg, het doel soms in een gebouw: een kleine verschuiving, zoals een kaartprik
  const start = { x: a.x + (rnd() - 0.5) * 8, y: a.y + (rnd() - 0.5) * 8, inVehicle: null };
  const dest = { x: b.x + (rnd() - 0.5) * 8, y: b.y + (rnd() - 0.5) * 8 };
  world.player = start; world.lokaalLichaam = start;
  const r = planDriveRoute(world, dest, start);
  if (!r || r.noRoute) { geenRoute++; continue; }
  const rr = ritRoute(r.pts, { start: { x: start.x, y: start.y }, doel: dest, binnen: (x, y) => insideBuilding(map, x, y) });
  if (rr.begin) beginBinnen++;
  if (rr.eind) eindBinnen++;
  if (rr.mix < 1) teruggevallen++;
  // de oude werkwijze: de hele route (met aansluitstukken) als gewone spline
  const oud = schendingen(maakPad(r.pts, 1, 1), (x, y) => insideBuilding(map, x, y));
  if (oud > 0) oudMet++;
  if (rr.schendingen > 0) { metSchending++; if (meldingen.length < 6) meldingen.push(`(${start.x.toFixed(0)},${start.y.toFixed(0)}) naar (${dest.x.toFixed(0)},${dest.y.toFixed(0)}): ${rr.schendingen} punten, mix ${rr.mix}, ${r.pts.length} wegpunten`); }
}
const gedaan = paren - geenRoute;
console.log(`${paren} paren (${geenRoute} zonder route): ${metSchending} met punten in een gebouw, ${teruggevallen} met een lichtere spline, begin in gebouw ${beginBinnen}, doel in gebouw ${eindBinnen}; de oude gewone spline had er ${oudMet} met punten in een gebouw`);
for (const m of meldingen) console.log('  ' + m);
ok(gedaan >= PAREN * 0.5, 'de meeste paren hebben een autoroute', `${gedaan}/${PAREN}`);
const lim = process.env.STRICT ? 0 : Math.ceil(gedaan * 0.05);
ok(metSchending <= lim, 'het ritpad ligt (vrijwel) nooit in een gebouw', `${metSchending} van ${gedaan}`);
console.log(`taxirit_wereld_audit: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
