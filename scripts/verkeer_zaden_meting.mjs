// Meet verkeer_wereld_test over meerdere zaden (de tellingen schommelen ruim 15% per zaad) en telt de totalen op (#1049, #1047).
//   node scripts/verkeer_zaden_meting.mjs [--zaden=24] [--eerste=7] [--par=3] [--secs=180]
// Draait scripts/verkeer_wereld_test.mjs per zaad (STRICT=1 zodat elke afwijking telt) en leest de regels per plek.
import { spawn } from 'node:child_process';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const N = arg('zaden', 24), FIRST = arg('eerste', 7), PAR = arg('par', 3), SECS = arg('secs', 180);
const keys = ['in gebouw', 'schaaf', 'water', 'naast weg', 'vast', 'blijvende overlap'];
const tot = Object.fromEntries(keys.map((k) => [k, 0]));
const perSeed = [];
let next = 0, running = 0;
function runOne(seed) {
  return new Promise((res) => {
    const p = spawn(process.execPath, ['scripts/verkeer_wereld_test.mjs', `--secs=${SECS}`], { env: { ...process.env, SEED: String(seed), STRICT: '1' }, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => p.kill(), 20 * 60 * 1000);
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => { clearTimeout(timer); res(out); });
  });
}
const sums = (out) => {
  const s = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const line of out.split('\n')) {
    if (!/voertuigen aan het eind/.test(line)) continue;
    for (const k of keys) { const m = line.match(new RegExp(k + ' ([0-9]+)')); if (m) s[k] += +m[1]; }
  }
  return s;
};
await new Promise((done) => {
  const pump = () => {
    while (running < PAR && next < N) {
      const seed = FIRST + next++; running++;
      runOne(seed).then((out) => {
        const s = sums(out); perSeed.push([seed, s]);
        for (const k of keys) tot[k] += s[k];
        running--; if (next >= N && running === 0) done(); else pump();
      });
    }
  };
  pump();
});
perSeed.sort((a, b) => a[0] - b[0]);
for (const [seed, s] of perSeed) console.log(`zaad ${seed}: ` + keys.map((k) => `${k} ${s[k]}`).join(', '));
console.log(`TOTAAL over ${N} zaden: ` + keys.map((k) => `${k} ${tot[k]}`).join(', '));
console.log(`GEMIDDELD per zaad: ` + keys.map((k) => `${k} ${(tot[k] / N).toFixed(2)}`).join(', '));
