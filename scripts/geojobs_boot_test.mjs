// Boot-deadlock (#557): worker-resultaten worden sinds 918243dc over frames afgeleverd
// via klaarQueue, en die queue wordt alleen in geoFrame() geleegd. Tijdens de boot draait
// geoFrame() nog niet (de spellus start pas na het laadscherm), terwijl boot() op de
// terrain-done wacht: de worker moest zijn resultaat tijdens de boot dus direct afleveren.
// Dat is in e5e8b712 (#582) zo gebouwd; deze test bewaakt het: in de boot direct done,
// in het spel pas na geoFrame.
//   node scripts/geojobs_boot_test.mjs
const gemaakt = [];
class NepWorker {
  constructor(url) { this.url = url; this.onmessage = null; this.onerror = null; this.terminated = false; this.posts = []; gemaakt.push(this); }
  postMessage(m) { this.posts.push(m); }
  terminate() { this.terminated = true; }
}
globalThis.Worker = NepWorker;
// Een document zonder 'game-started' = de boot; de test zet de klasse later aan.
let gestart = false;
globalThis.document = { body: { classList: { contains: (c) => (c === 'game-started' ? gestart : false) } } };

const G = await import('../game/js/geojobs.js');
G.registerKernels({ terrain: (d) => ({ result: { ...d, op: 'terrain' } }) });

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const tick = () => new Promise((r) => setTimeout(r, 5));

ok(G.geoWorkerActive(), 'de worker-route is actief (nep-Worker), dus de queue wordt gebruikt');

// 1. tijdens de boot: het resultaat komt meteen bij done, ook zonder geoFrame()
{
  const gedaan = [];
  G.runGeo('terrain', { i: 1 }, (r) => gedaan.push(r));
  ok(gemaakt.length === 1 && gemaakt[0].posts.length === 1, 'de job is naar de worker gestuurd');
  const job = gemaakt[0].posts[0];
  gemaakt[0].onmessage({ data: { id: job.id, result: { i: 1, boot: true } } });
  ok(gedaan.length === 1 && gedaan[0] && gedaan[0].boot === true, 'tijdens de boot: done meteen (geen geoFrame nodig)', String(gedaan.length));
}

// 2. in het spel: het resultaat wacht op geoFrame(), zodat de boot van 918243dc niet terugkomt
{
  gestart = true;
  const gedaan = [];
  G.runGeo('terrain', { i: 2 }, (r) => gedaan.push(r));
  const job = gemaakt[0].posts[gemaakt[0].posts.length - 1];
  gemaakt[0].onmessage({ data: { id: job.id, result: { i: 2, spel: true } } });
  ok(gedaan.length === 0, 'in het spel wacht het resultaat op geoFrame()', String(gedaan.length));
  G.geoFrame();
  ok(gedaan.length === 1 && gedaan[0] && gedaan[0].spel === true, 'geoFrame() levert het resultaat alsnog', String(gedaan.length));
}

// 3. en de boot-tak staat in de bron (de guard die #557 voorkomt)
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const bron = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game/js/geojobs.js'), 'utf8');
  ok(/const inSpel = typeof document !== 'undefined' && document\.body && document\.body\.classList\.contains\('game-started'\)/.test(bron), 'de boot-tak toetst op game-started');
  ok(/if \(inSpel\) klaarQueue\.push\(\{ done: j\.done, result \}\);/.test(bron), 'in het spel gaat het resultaat in de queue');
  ok(/else \{ try \{ j\.done\(result\); \}/.test(bron), 'tijdens de boot gaat het resultaat direct naar done');
}

void (await tick());
console.log(fails ? `geojobs_boot_test: ${fails} van ${n} mislukt` : `geojobs_boot_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
