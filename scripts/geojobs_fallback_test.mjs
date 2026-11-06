// De geometrie-worker (#247) valt om: de jobs die al underweg waren worden op de hoofdthread
// opnieuw gedaan, en sinds #588 gaan ook de jobs die nog in de wachtrij stonden daar begrensd
// verder in plaats van stil te verdwijnen. Zonder dat bleef een stadscel zonder straatmeubels
// en een waterpolygoon zonder oever achter, zonder foutmelding en zonder retry.
//   node scripts/geojobs_fallback_test.mjs
//
// Een nep-Worker voor de global: de module kiest bij het laden de worker-route als Worker bestaat.
const gemaakt = [];
class NepWorker {
  constructor(url) { this.url = url; this.onmessage = null; this.onerror = null; this.onmessageerror = null; this.terminated = false; this.posts = []; gemaakt.push(this); }
  postMessage(m) { this.posts.push(m); }
  terminate() { this.terminated = true; }
}
globalThis.Worker = NepWorker;

const G = await import('../game/js/geojobs.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

let kernels = 0;
G.registerKernels({
  terrain: (d) => { kernels++; return { result: { ...d, op: 'terrain' } }; },
  roadGeo: (d) => { kernels++; return { result: { ...d, op: 'roadGeo' } }; },
  roadPreload: () => { kernels++; return { result: true }; },
});

ok(G.geoWorkerActive(), 'de worker-route is actief met een nep-Worker');
ok(gemaakt.length === 1, 'er is één worker voor de gewone jobs', String(gemaakt.length));

// Zes jobs gaan meteen de deur uit; de volgende twee wachten op een volgend frame.
const gedaan = [];
const vraag = (i) => G.runGeo('terrain', { i }, (r) => gedaan.push([i, r]), 0.5);
for (let i = 0; i < 6; i++) vraag(i);
for (let i = 6; i < 8; i++) vraag(i);
ok(gemaakt[0].posts.length === 6, 'zes jobs zijn naar de worker gestuurd', String(gemaakt[0].posts.length));

// De tweede worker (weggeometrie) heeft ook werk, plus een set-upjob die moet wachten.
const wegGedaan = [];
for (let i = 0; i < 6; i++) G.runGeo('roadGeo', { i }, (r) => wegGedaan.push(r), 0.5);
let preloadDone = null;
G.runGeo('roadPreload', {}, (r) => { preloadDone = { r }; }, 0);
ok(gemaakt.length >= 2, 'de weggeometrie heeft een eigen worker', String(gemaakt.length));
const w0 = gemaakt[0], w1 = gemaakt[1];

// De worker valt om. De in-flight jobs gaan meteen op de hoofdthread, de wachtende jobs volgen
// begrensd via de retry-wachtrij; de set-upjob hoort done(null) te krijgen in plaats van te verdwijnen.
const waarschuwingen = [];
const echteWarn = console.warn;
console.warn = (...a) => waarschuwingen.push(a.join(' '));
w0.onerror({ preventDefault() {}, message: 'nep-workerfout' });
console.warn = echteWarn;
ok(w0.terminated && w1.terminated, 'beide workers zijn gestopt');
ok(!G.geoWorkerActive(), 'na de fout bouwt alles op de hoofdthread');

for (let t = 0; t < 100 && gedaan.length < 8; t++) await tick(5);
ok(gedaan.length === 8, 'alle acht terrain-jobs hebben hun done gekregen, ook de wachtende', String(gedaan.length));
ok(gedaan.every(([, r]) => r && r.op === 'terrain'), 'ze kregen een echt resultaat van de kernel');
ok(gedaan.map(([i]) => i).sort((a, b) => a - b).join() === '0,1,2,3,4,5,6,7', 'geen job kwijt en geen dubbele', gedaan.map(([i]) => i).join());
ok(wegGedaan.length === 6 && wegGedaan.every((r) => r && r.op === 'roadGeo'), 'de weggeometrie is ook opnieuw gedaan', String(wegGedaan.length));
ok(preloadDone && preloadDone.r === null, 'de set-upjob kreeg done(null) in plaats van te verdwijnen');
ok(waarschuwingen.some((w) => /wachtende jobs/.test(w)), 'de fout wordt met het aantal wachtende jobs gemeld', waarschuwingen.join(' | '));
ok(waarschuwingen.some((w) => /worker unavailable/.test(w)), 'de workerfout zelf wordt ook gemeld');

// En een nieuwe aanvraag na de fout gaat direct op de hoofdthread.
const na = [];
G.runGeo('terrain', { i: 99 }, (r) => na.push(r));
ok(na.length === 1 && na[0] && na[0].i === 99, 'een nieuwe job draait meteen op de hoofdthread');
ok(kernels >= 15, 'de kernels deden het werk (geen lege resultaten)', String(kernels));

console.log(bad ? `geojobs_fallback_test: ${bad} van ${n} mislukt` : `geojobs_fallback_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
