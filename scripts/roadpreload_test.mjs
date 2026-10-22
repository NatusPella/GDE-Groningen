// De geometrie-worker laadt zijn kaart al bij het opstarten (roadPreload) en roadInit snoeit die alleen nog (#247): de kaart wordt
// één keer geladen, ook als roadPreload en roadInit door elkaar lopen; een tweede roadInit laadt opnieuw (de eerste kaart is gesnoeid).
//   node scripts/roadpreload_test.mjs
import './node3d.mjs';
const { KERNELS, roadMapLoader } = await import('../game/js/geokernels.js');
const { roadKey } = await import('../game/js/roadsurface.js');
const { WORKER_ONLY_KINDS } = await import('../game/js/geojobs.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const road = (x) => ({ cat: 'minor', type: 'residential', width: 6, pts: [[x, 0], [x + 50, 0]], bounds: [x, -3, x + 50, 3] });
const fakeMap = () => {
  const roads = [road(0), road(100), road(200)];
  return { roads, roadGrid: { map: new Map([['0,0', roads.slice()]]) }, buildingGrid: { map: new Map() }, buildings: [], canopies: [], clippedWays: [], trees: [], treeGrid: null };
};
let loads = 0, delay = 0;
roadMapLoader.load = async (url) => { loads++; await new Promise((r) => setTimeout(r, delay)); return fakeMap(); };

// 1. preload, then init: één keer geladen, en init snoeit op de sleutels
let r = await KERNELS.roadPreload({ url: 'stad.json' });
ok(r.result === true && loads === 1, 'roadPreload laadt de kaart', String(loads));
const keep = fakeMap().roads.slice(0, 2).map(roadKey);
r = await KERNELS.roadInit({ url: 'stad.json', keys: keep });
ok(loads === 1, 'roadInit na roadPreload laadt niet opnieuw', String(loads));
ok(r.result.roads === 2 && r.result.missing === 0, 'roadInit snoeit de kaart tot de sleutels', JSON.stringify(r.result));

// 2. een tweede roadInit leest de bestanden opnieuw (de eerste kaart is gesnoeid)
r = await KERNELS.roadInit({ url: 'stad.json', keys: fakeMap().roads.map(roadKey) });
ok(loads === 2 && r.result.roads === 3, 'een tweede roadInit laadt opnieuw en ziet alle wegen', `${loads} ${JSON.stringify(r.result)}`);

// 3. preload en init door elkaar (init komt terwijl het laden nog loopt): nog steeds één keer laden
loads = 0; delay = 20;
const p = KERNELS.roadPreload({ url: 'stad.json' });
const i = KERNELS.roadInit({ url: 'stad.json', keys: fakeMap().roads.map(roadKey) });
await Promise.all([p, i]);
ok(loads === 1, 'roadInit tijdens een lopende roadPreload wacht op dezelfde lading', String(loads));

// 4. zonder preload gedraagt roadInit zich als eerst
loads = 0; delay = 0;
r = await KERNELS.roadInit({ url: 'stad.json', keys: fakeMap().roads.map(roadKey) });
ok(loads === 1 && r.result.roads === 3, 'roadInit zonder preload laadt zelf', String(loads));

// 5. de set-upjobs hoort in de worker te blijven (nooit op de hoofdthread herhaald)
ok(WORKER_ONLY_KINDS.has('roadPreload') && WORKER_ONLY_KINDS.has('roadInit'), 'roadPreload is een alleen-worker-job');

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
