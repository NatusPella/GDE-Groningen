// Main-thread time per category from raw CPU profiles (run.sh with
// GDE_PROFILE_OUT=<dir> PERF_PROFILE=<routes>). A sample belongs to the
// nearest game-code frame on its stack (three.js frames count for the game
// code that called them); files map to a category below, scene3d.js by
// function name.
//   node scripts/perf/categories.mjs <a.cpuprofile> [...] [--top]
import fs from 'fs';

const CATS = [
  ['gc', /^\(garbage collector\)$/],
  ['audio', /^(audio|ambience|radio|radiostudio|scenariomusic|speech|linevoice|smsvoice|sidejobvoice|speakers|banter|subtitles)\.js|^(dsp|foley|sky|ui|dspworker)\.js$/],
  ['hud/dom', /^countrymap\.js$/],
  ['hud/dom', /^(hud_panel|hudcards|mapview|mapfilters|prompts|phone|phonefeed|pausemenu|todoui|achievementsui|namecard|uiscale|startscreen|whatsnew|verhaalui|garageui|shopui|heistui|sikkomfeed|settings|credits)\.js$/],
  ['streaming/geometry', /^(country\w*|ommelandprops3d|staticbatch3d|models3d_buildings|landmarks3d|landmarkmodels|roadsurface|roadstructures3d|grass|streetclutter|streetsigns|cityprops|farlod|terrain3d|water3d|waterindex|quaywalls|bridgerails|canopies3d|treeprops|parked3d|railway3d|marktgebouwen|paddepoel3d|museum3d|thuis3d|home3d|interiorglass|portalcut3d|cutmask3d|pixelart3d|furniture|shopmodels3d|storyprops3d|skyprops3d|seating3d|elevation|worldends|junctions|mapdata|flavour3d)\.js$/],
  ['simulation/ai', /^(vehicle|pedestrians|pedroutes|police|policemounts|trafficfleet|trafficlights|collision|player|world|wildlife|racers|emergency|combat|crime|ragdoll|railway|traindrive|fjordtrain|heliflight|helirun|boattypes|parkedcars|routing|simload|weather|daynight|companion|breakables|throwables|aimassist|missions|missionstory|story\w*|sidejob\w*|activities|activitykit|economy|horeca|kermis|motion|swimmers3d|drunk|passages|ringroute|ownedvehicles|attention|flavour|ommeland\w*|dorpsuitjes|goal|todo|achievement\w*|calendar|safety|respawn|input|carbid|padel|fierljep|pg_\w+|stuntavond|heist|pigeonmode|geheimen|shops|garages|home|stationtravel|camerapath)\.js$/],
  ['actors 3d', /^(models3d_people|models3d_vehicles|heli3d|gore3d|fx3d|gunfx3d|boatwake3d|wheelinstances3d|skyprops|trailerprops|rideprops|characters|nightlights3d|sky3d)\.js$/],
  ['render', /^(postfx3d|hitchprobe)\.js$/],
];
// shared helpers count for their caller, like three.js
const HELPERS = /^(util|mapdata|pixelart3d|countryfield)\.js$/;
// scene3d.js: per-frame update/render vs streaming the city
const SCENE_STREAM = /build|stream|merge|batch|ensure|load|make|create|geom|warm|cell|road|water|tree|bldg|building|lod/i;

// the first sample's delta is the wait since the profiler started (seconds on a loaded machine) and would count as native: deltas over CAP us are capped (--cap=, default 5000)
const CAP = Number((process.argv.find((a) => a.startsWith('--cap=')) || '--cap=5000').slice(6));
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const top = process.argv.includes('--top');
// --incl=fnA,fnB: inclusive ms of those functions (by name)
const inclArg = process.argv.find((a) => a.startsWith('--incl='));
const inclNames = inclArg ? inclArg.slice(7).split(',') : [];
const incl = new Map();
const tot = new Map(); const unk = new Map(); const fns = new Map();
let all = 0;
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const memo = new Map();
  const classify = (id) => {
    if (memo.has(id)) return memo.get(id);
    let res = null, leafName = byId.get(id).callFrame.functionName;
    if (leafName === '(garbage collector)') res = ['gc', 'gc'];
    else if (leafName === '(idle)') res = ['idle', 'idle'];
    else if (leafName === '(program)') res = ['native/other', '(program)'];
    let sawThree = false;
    for (let cur = id; !res && cur !== undefined; cur = parent.get(cur)) {
      const cf = byId.get(cur).callFrame;
      const file = cf.url.split('/').pop().split('?')[0];
      if (!file) continue;
      if (HELPERS.test(file)) continue;
      if (file === 'three.module.js' || /^(EffectComposer|Pass|ShaderPass|RenderPass|OutputPass|UnrealBloomPass|BufferGeometryUtils)/.test(file)) { sawThree = true; continue; }
      const key = `${cf.functionName || '(anon)'} ${file}:${cf.lineNumber + 1}`;
      if (file === 'scene3d.js') res = [SCENE_STREAM.test(cf.functionName) ? 'streaming/geometry' : 'render', key];
      else if (file === 'main.js') res = [sawThree ? 'render' : 'main loop', key];
      else {
        for (const [c, re] of CATS) if (re.test(file)) { res = [c, key]; break; }
        if (!res) res = ['other game', key];
      }
    }
    if (!res) res = [sawThree ? 'render' : 'native/other', sawThree ? 'three' : leafName];
    memo.set(id, res);
    return res;
  };
  const per = new Map();
  p.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + Math.min(CAP, p.timeDeltas[i] || 0)));
  for (const [id, us] of per) {
    const [c, key] = classify(id);
    all += us;
    tot.set(c, (tot.get(c) || 0) + us);
    if (c === 'other game') unk.set(key, (unk.get(key) || 0) + us);
    fns.set(c + ' | ' + key, (fns.get(c + ' | ' + key) || 0) + us);
    if (inclNames.length) {
      const seen = new Set();
      for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
        const fn = byId.get(cur).callFrame.functionName;
        if (inclNames.includes(fn) && !seen.has(fn)) { seen.add(fn); incl.set(fn, (incl.get(fn) || 0) + us); }
      }
    }
  }
}
const busy = all - (tot.get('idle') || 0);
console.log(`profiles ${files.length}, ${(all / 1e3).toFixed(0)} ms sampled, ${(busy / 1e3).toFixed(0)} ms busy`);
for (const [c, us] of [...tot.entries()].sort((a, b) => b[1] - a[1])) console.log(c.padEnd(20), (us / 1e3).toFixed(0).padStart(7), 'ms', (c === 'idle' ? '' : (us / busy * 100).toFixed(1) + '% of busy').padStart(14));
if (inclNames.length) for (const n of inclNames) console.log('incl', n.padEnd(24), ((incl.get(n) || 0) / 1e3).toFixed(0).padStart(6), 'ms', ((incl.get(n) || 0) / busy * 100).toFixed(1).padStart(5) + '%');
if (top) {
  console.log('\ntop entry points');
  for (const [k, us] of [...fns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log((us / busy * 100).toFixed(1).padStart(5) + '%', k);
  if (unk.size) console.log('\nunclassified');
  for (const [k, us] of [...unk.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log((us / busy * 100).toFixed(1).padStart(5) + '%', k);
}
