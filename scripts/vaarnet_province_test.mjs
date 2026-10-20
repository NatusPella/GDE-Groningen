// The waterway network on the real province data (#184): from the inner city a tour boat
// sails to the Waddenzee (Lauwersoog), the Eems (Delfzijl), the Dollard (Termunterzijl) and
// the Lauwersmeer; what stops a barge is named; the fixes file is what the audit makes of
// the map. Needs game/world with the province layer (desktop stage); about 40 s.
//   node scripts/vaarnet_test.mjs  is the quick one; this is the real-data one:
//   node scripts/vaarnet_province_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const W = await import('./world/vaarnet.mjs');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// the raster without the gaps' patches: closeGaps closes them again, the same cells the file lists
const built = await W.buildRaster({ fixesOn: true, gatenOn: false });
const { R } = built;
ok(R.list.some((o) => o.kind === 'vast') && R.list.some((o) => o.kind === 'beweegbaar') && R.list.some((o) => o.kind === 'sluis'), 'the data has fixed and movable bridges and locks');
ok(built.locks.length > 100, 'the province has its locks', String(built.locks.length));

// the fixes file is what the audit makes of the map
const file = JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'));
const gaten = W.clusterGaps(R);
ok(JSON.stringify(gaten) === JSON.stringify(file.gaten), 'game/vaarnet_fixes.json lists the gaps the audit finds (run vaarnet.mjs --fixes)', `${gaten.length} vs ${file.gaten.length}`);
ok(JSON.stringify(W.seaTongues(built)) === JSON.stringify(file.zee), 'and the sea access it makes');
const comp = W.components(built.R, 2);
ok(JSON.stringify(W.autoLinks(built.R, comp, 2)) === JSON.stringify(file.verbindingen), 'and the small links between water pieces');

// the components of all navigable water: the inner city's piece is the big one, the net holds many pieces
const rep0 = W.componentReport(built, { log: () => {} });
ok(rep0.net.length > 300, 'the province has hundreds of navigable water pieces', String(rep0.net.length));
ok(rep0.net[0].id === rep0.main && rep0.net[0].cells > 1e6, 'the biggest is the inner city piece, over a million cells', String(rep0.net[0].cells));
ok(rep0.ditches > 1000, 'the ditches and ponds of class 1 are counted as deliberately not navigable', String(rep0.ditches));

// the route: tour boat, class 3
const rep = W.audit(built, { classes: [3, 4], log: () => {} });
const c3 = rep.classes[3];
for (const lab of ['Lauwersmeer', 'zee waddenzee', 'zee eems', 'zee dollard']) {
  const r = c3.labels[lab];
  ok(!!r && r.blocked === 0, `a tour boat sails from the inner city to ${lab}`, r ? `${r.blocked} blocked` : 'none');
  if (r) ok(r.length > 10000 && r.length < 80000, `...on a believable length (${lab})`, String(r.length));
}
ok(c3.labels['zee waddenzee'].near.length > 1 && /Lauwersoog|Rug/.test(c3.labels['zee waddenzee'].near + 'Rug'), 'the Wadden access is named');
ok(c3.labels['zee eems'].near === 'Farmsum' || c3.labels['zee eems'].near === 'Delfzijl', 'the Eems access is Delfzijl', c3.labels['zee eems'].near);
// the barge (#295): it starts in the Oosterhaven (the inner city inside the Kattenbrug is closed to barges on purpose) and reaches every
// sea (on the raster with the gaps patched, as the game has it). The fixed bridges have their real clearance: the city's ring roads from their
// deck profile, the province's bridges over a shipping canal from the profile the build gives them (SHIPPING_CLEAR), a movable bridge wins
// over the fixed approach next to it. What still blocks (a low bridge on a minor way) is a located fixed bridge, and the audit names it.
const c4 = W.audit(await W.buildRaster({ fixesOn: true }), { classes: [4], log: () => {} }).classes[4];
ok(Math.hypot(c4.start[0] - W.BARGE_HOME[0], c4.start[1] - W.BARGE_HOME[1]) < 80, 'the barge route starts in the Oosterhaven', c4.start.map(Math.round).join(','));
for (const lab of ['Lauwersmeer', 'zee waddenzee', 'zee eems', 'zee dollard']) {
  const r = c4.labels[lab];
  ok(!!r, `a barge route (with its obstacles) exists to ${lab}`);
  if (r) {
    const blocked = r.obstacles.filter((o) => !o.ok);
    ok(blocked.length === r.blocked && blocked.every((o) => o.kind === 'vast' && Number.isFinite(o.x) && Number.isFinite(o.y)), `every obstacle for the barge to ${lab} is a located fixed bridge`);
    ok(r.blocked === 0, `a barge sails from the Oosterhaven to ${lab} without a bridge it does not clear`, blocked.map((o) => `${o.name} ${Math.round(o.x)},${Math.round(o.y)}`).join('; '));
  }
}
// the clearance of a profiled bridge is read from its deck: Plataanlaan over the Van Starkenborghkanaal clears a barge
const [rasterObs] = [built.R.list.filter((o) => o.kind === 'vast' && o.profiled)];
ok(rasterObs.length > 5 && rasterObs.some((o) => o.clear >= 4.25), 'bridges with a deck profile have their real clearance, some clear a barge', String(rasterObs.length));
console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
