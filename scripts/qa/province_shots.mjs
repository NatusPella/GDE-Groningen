// Zichtcontrole van de provincie (#5): loopt een plekkenlijst door in één
// Electron-instantie (wegwerpprofiel, geen echte opslag) en neemt per plek
// twee screenshots: shots-<naam>.png (straatniveau) en shots-<naam>-hoog.png.
//   node scripts/qa/province_shots.mjs [--ronde=1|2] [--out=<map>] [--only=a,b] [--settle=<ms>] [--drive=<ms>] [--list]
// Ronde 1: dorpen en stad (twee opnamen per plek). Ronde 2: spoor, A7, water en kust met de
// camera langs de lijn, plus een speelcheck (een stuk rijden met een auto en varen met een boot).
// ELECTRON_EXE=<pad naar electron.exe> als desktop/node_modules/electron/dist ontbreekt.
// Vereist `cd desktop && npm run stage` (de gestagede game/ met de provinciewereld).
// Uitvoer: <out>/shots-<naam>.png, spots.json (resultaat per plek), run.log.
// Plekken staan in SPOTS: wereldcoördinaten (x, y in meters, het wereldframe van
// game/world/index-provincie.json); plaatsen en stations komen uit die index.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-provincie')));
const ONLY = arg('only', '');
const SETTLE = Number(arg('settle', 9000));
const RONDE = Number(arg('ronde', 1));
const DRIVE = Number(arg('drive', 15000));

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'world', 'index-provincie.json'), 'utf8')).global;
const place = (name, kind) => {
  const p = index.places.find((q) => q.name === name && (!kind || q.kind === kind));
  if (!p) throw new Error(`plaats niet gevonden: ${name}`);
  return { x: p.x, y: p.y };
};
const station = (name, nth = 0) => {
  const s = index.stations.filter((q) => q.name === name)[nth];
  if (!s) throw new Error(`station niet gevonden: ${name}`);
  return { x: s.x, y: s.y };
};
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const off = (a, dx, dy) => ({ x: a.x + dx, y: a.y + dy });

const centrum = place('Groningen', 'city');
const SPOTS = [
  // stad (Noorderhaven en Martinitoren bij benadering; y wijst naar het zuiden)
  { name: 'stad-grotemarkt', ...centrum, snapR: 150 },
  { name: 'stad-martinitoren', ...off(centrum, -40, 40), snapR: 150 },
  { name: 'stad-station', ...station('Groningen', 0), snapR: 120 },
  { name: 'stad-noorderhaven', ...off(centrum, -250, -450), snapR: 200 },
  // dorpen en kleine steden
  { name: 'dorp-winsum', ...place('Winsum') },
  { name: 'dorp-zuidhorn', ...place('Zuidhorn') },
  { name: 'dorp-bedum', ...place('Bedum') },
  { name: 'dorp-tenboer', ...place('Ten Boer') },
  { name: 'dorp-haren', ...place('Haren', 'town') },
  { name: 'dorp-veendam', ...place('Veendam') },
  { name: 'dorp-winschoten', ...place('Winschoten') },
  { name: 'dorp-appingedam', ...place('Appingedam') },
  // snelweg en kust
  { name: 'a7-hoogkerk', ...off(place('Hoogkerk'), -1500, 0), road: 'A7', snapR: 4000 },
  { name: 'a7-veendam', ...off(place('Veendam'), -3000, -800), road: 'A7', snapR: 4000 },
  { name: 'kust-lauwersoog', ...place('Lauwersoog'), snapR: 800 },
  { name: 'kust-eemshaven', ...place('Eemshaven'), snapR: 1200 },
  { name: 'kust-delfzijl', ...place('Delfzijl'), snapR: 800 },
  { name: 'water-zoutkamp', ...place('Zoutkamp'), snapR: 600 },
  { name: 'water-reitdiep', ...mid(place('Zoutkamp'), place('Winsum')), snapR: 3000 },
  { name: 'grens-badnieuweschans', ...place('Bad Nieuweschans'), snapR: 800 },
  { name: 'water-dollard', ...off(place('Bad Nieuweschans'), -3000, -6500), snapR: 6000 },
  // spoor
  { name: 'spoor-groningen-bedum', ...mid(station('Groningen', 0), station('Bedum')), snap: false },
  { name: 'spoor-bedum', ...station('Bedum'), snapR: 100 },
  { name: 'spoor-appingedam', ...station('Appingedam'), snapR: 100 },
  { name: 'spoor-veendam', ...station('Veendam'), snapR: 100 },
  { name: 'spoor-winschoten', ...station('Winschoten'), snapR: 100 },
  { name: 'spoor-eemshaven', ...station('Eemshaven'), snapR: 100 },
];
if (arg('spots', '')) SPOTS.splice(0, SPOTS.length, ...JSON.parse(fs.readFileSync(arg('spots', ''), 'utf8')));
for (const s of SPOTS) { s.x = Math.round(s.x * 10) / 10; s.y = Math.round(s.y * 10) / 10; }


// ---- ronde 2: spoor, A7, water, kust ----
// spoor: het stationspunt gesnapt op de dichtstbijzijnde routepunt, kijkrichting langs de lijn
function railSpot(name, stationName, nth = 0) {
  const st = station(stationName, nth);
  let best = null;
  for (const r of index.routes) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - st.x, my - st.y);
    if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return { name, type: 'rail', x: best.x, y: best.y, a: best.a, stationDist: Math.round(best.d) };
}
const water = (name, p, R, nav) => ({ name, type: 'water', x: p.x, y: p.y, R, nav: !!nav });
const SPOTS2 = [
  railSpot('rail-sauwerd', 'Sauwerd'),
  railSpot('rail-winsum', 'Winsum'),
  railSpot('rail-eemshaven', 'Eemshaven'),
  railSpot('rail-delfzijl', 'Delfzijl'),
  railSpot('rail-zuidbroek', 'Zuidbroek'),
  { name: 'a7-hoogezand', type: 'motor', ...place('Hoogezand') },
  { name: 'a7-zuidbroek', type: 'motor', ...place('Zuidbroek') },
  { name: 'a7-scheemda', type: 'motor', ...place('Scheemda') },
  { name: 'a7-hoogkerk', type: 'motor', ...place('Hoogkerk') },
  water('water-reitdiep-garnwerd', place('Garnwerd'), 1500, true),
  water('water-reitdiep-electra', place('Electra'), 2000, true),
  water('water-lauwersmeer', off(place('Zoutkamp'), -3000, -2500), 3500),
  water('kust-lauwersoog', off(place('Lauwersoog'), 0, -1500), 3000),
  water('kust-eemshaven', off(place('Eemshaven'), 0, -1500), 3000),
  water('water-dollard', off(place('Termunterzijl'), 3000, 3000), 4500),
  water('water-eemskanaal-tenboer', place('Ten Boer'), 3000, true),
  water('water-eemskanaal-farmsum', place('Farmsum'), 2000, true),
  water('water-delfzijl-haven', place('Delfzijl'), 2500, true),
];

if (process.argv.includes('--list')) { console.log(JSON.stringify(RONDE === 2 ? SPOTS2 : SPOTS)); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-qa-${process.pid}`;
const script = path.join(OUT, '_page.js');
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };
for (let i = 0; i < 40; i++) { const s = document.querySelector('#start-screen'); if (!s || s.offsetParent === null || getComputedStyle(s).display === 'none' || getComputedStyle(s).opacity === '0') break; kEnter(); await new Promise((r) => setTimeout(r, 3000)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
fs.writeFileSync(script, WACHT + (RONDE === 2 ? `window.__qa2 = ${JSON.stringify({ spots: SPOTS2, settle: SETTLE, drive: DRIVE, only: ONLY })};
` + fs.readFileSync(path.join(HERE, 'province_shots2.page.js'), 'utf8') : `window.__qaSpots = ${JSON.stringify(SPOTS)}; window.__qaSettle = ${SETTLE}; window.__qaOnly = ${JSON.stringify(ONLY)};\n` + fs.readFileSync(path.join(HERE, 'province_shots.page.js'), 'utf8')));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt (Electron niet geïnstalleerd? zet ELECTRON_EXE):', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const lines = (r.stdout || '').split('\n');
let res = {}, full = {};
for (const l of lines) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); res = full.spots || {}; } catch {} }
if (RONDE === 2) fs.writeFileSync(path.join(OUT, "ronde2.json"), JSON.stringify(full, null, 1));
fs.writeFileSync(path.join(OUT, 'spots.json'), JSON.stringify(res, null, 1));
const geflagd = Object.entries(res).filter(([, v]) => v.check && v.check.flags.length);
const gechecked = Object.values(res).filter((v) => v.check).length;
if (gechecked) console.log(`automatische controle: ${gechecked} plekken, ${geflagd.length} met een vlag${geflagd.map(([k, v]) => `
  ${k}: ${v.check.flags.join(', ')}`).join('')}`);
const nan = lines.filter((l) => /NaN/i.test(l));
console.log(`plekken: ${Object.keys(res).length}/${(RONDE === 2 ? SPOTS2 : SPOTS).length}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}, NaN-regels in log: ${nan.length}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && Object.keys(res).length ? 0 : 1);
