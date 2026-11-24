// Gepaarde benchmarkmeting op een stille machine (perf-r3-24-11): twee of meer gestagede builds afwisselend, elk met de ingebouwde
// benchmark (--benchmark=1, de volle trailerroute), 1920x1080, een stand (standaard Ultra) en ?benchwacht=0. Elke run neemt het exclusieve
// Electron-slot en wacht op de stille-machinepoort van scripts/lib/electronrunner.cjs; wegwerpprofiel en TEMP in --out.
//   node scripts/perf/ultrabench.mjs --builds=base:<gamemap>,nieuw:<gamemap>[|perfoff=x+vlag] [--rounds=3] [--stand=ultra|hoog] [--flags=hitch]
//        [--out=.pb/ub] [--tag=r1] [--max-cpu=0.25] [--min-vrij-gb=3]
// Env: ELECTRON_EXE (anders de Electron van de hoofdmap). Uitvoer: <out>/<tag>-<build>-<ronde>.json en een tabel per build (mediaan).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const runner = require('../lib/electronrunner.cjs');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STANDS = {
  ultra: 'quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:true',
  hoog: 'quality:hoog,shadows:true,drawDistance:normaal,resolution:1,autoResolution:true',
};
// naam:<gamemap>[|vlag+vlag]: eigen url-vlaggen per build (bv. dezelfde build met en zonder ?perfoff=linkuitstel)
const builds = arg('builds', '').split(',').filter(Boolean).map((b) => { const i = b.indexOf(':'); const [dir, extra = ''] = b.slice(i + 1).split('|'); return { name: b.slice(0, i), dir: path.resolve(dir), flags: extra.split('+').filter(Boolean) }; });
if (!builds.length) { console.error('gebruik: --builds=naam:<gamemap>[,naam:<gamemap>]'); process.exit(2); }
const ROUNDS = Number(arg('rounds', 3));
const STAND = arg('stand', 'ultra');
const FLAGS = ['benchwacht=0', ...arg('flags', '').split(',').filter(Boolean)].join(',');
const OUT = path.resolve(arg('out', path.join(ROOT, '.pb', 'ub')));
const TAG = arg('tag', 'run');
const electron = process.env.ELECTRON_EXE || runner.findElectron(ROOT) || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe');
const quiet = { maxCpu: Number(arg('max-cpu', 0.25)), minFreeGB: Number(arg('min-vrij-gb', 3)), waitMin: Number(arg('wacht-min', 90)), required: true };
fs.mkdirSync(OUT, { recursive: true });
const log = runner.makeLog(OUT, `${TAG}.log`);

async function once(b, round) {
  const dir = path.join(OUT, `${TAG}-${b.name}-${round}`);
  const { profile, tmp } = runner.prepareRunDir(dir);
  let line = null;
  const args = ['.', '--benchmark=1', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1920x1080',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
    `--preset=${STANDS[STAND] || STAND}`, `--url-flags=${[FLAGS, ...b.flags].join(',')}`, `--bench-eval=${path.join(HERE, 'ultrabench.hook.js')}`];
  const env = runner.electronEnv({ profile, tmp, gameDir: b.dir });
  const res = await runner.runElectron({
    electron, args, cwd: path.join(ROOT, 'desktop'), env, out: dir, log, timeoutMin: 12, below: false,
    slot: { label: `ultrabench ${TAG}`, exclusive: true, waitMin: 240 }, quiet,
    onLine: (r) => { if (r.startsWith('[trailer] ubstats ')) { line = r.slice(18); setTimeout(() => runner.killTree(childOf(dir)), 0); } },
  }).catch((e) => ({ error: e.message }));
  runner.removeProfile(profile);
  // a long line can arrive in several stdout chunks: read it back from electron.log
  let j = null;
  try { const l = fs.readFileSync(path.join(dir, 'electron.log'), 'utf8').split('\n').map((x) => x.replace(/\r$/, '')).find((x) => x.startsWith('[trailer] ubstats ')); if (l) j = JSON.parse(l.slice(18)); } catch (e) { j = null; }
  if (!j && line) { try { j = JSON.parse(line); } catch (e) { /* afgekapt */ } }
  const rec = { build: b.name, round, stand: STAND, flags: [FLAGS, ...b.flags].join(','), machine: res && res.quiet ? res.quiet.last : null, error: res.error || (j ? null : 'geen ubstats'), ...(j || {}) };
  fs.writeFileSync(`${dir}.json`, JSON.stringify(rec));
  log(`${b.name} ronde ${round}: ${j ? `gem ${j.avg.toFixed(1)} fps, 1%-low ${j.low1.toFixed(1)}, >50 ms ${j.spikes[0]}/min, grootste ${j.raf.max} ms, prog ${j.info && j.info.prog}` : rec.error}`);
  return rec;
}
// runElectron owns the child; the run ends on its own once the benchmark is done (BENCH_RUNS quits), so nothing to kill here
function childOf() { return null; }

const all = [];
for (let r = 1; r <= ROUNDS; r++) {
  const order = r % 2 ? builds : builds.slice().reverse();
  for (const b of order) all.push(await once(b, r));
}
const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); const h = s.length >> 1; return !s.length ? NaN : s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; }; // even aantal: het gemiddelde van de middelste twee
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1).replace('.', ',') : '-');
console.log(`\n${TAG}, stand ${STAND}, ${ROUNDS} rondes, mediaan (vlaggen ${FLAGS})`);
console.log('build'.padEnd(10) + ['gem fps', '1%-low', '>50ms/min', 'grootste ms', 'prog'].map((h) => h.padStart(12)).join(''));
for (const b of builds) {
  const rs = all.filter((x) => x.build === b.name && !x.error);
  console.log(b.name.padEnd(10) + [med(rs.map((x) => x.avg)), med(rs.map((x) => x.low1)), med(rs.map((x) => x.spikes[0])), med(rs.map((x) => x.raf.max)), med(rs.map((x) => x.info && x.info.prog))].map((v) => f1(v).padStart(12)).join(''));
}
const cats = [...new Set(all.flatMap((x) => Object.keys(x.cats || {})))];
for (const c of cats) console.log(`  ${c.padEnd(10)}` + builds.map((b) => `${b.name} ${f1(med(all.filter((x) => x.build === b.name && x.cats && x.cats[c]).map((x) => x.cats[c].avg)))}/${f1(med(all.filter((x) => x.build === b.name && x.cats && x.cats[c]).map((x) => x.cats[c].low1)))}`).join('   '));
