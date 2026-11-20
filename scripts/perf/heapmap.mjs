// Heap-samenstelling per categorie uit een sampling-heapprofiel (#1040): audio, textures en canvas, geometrie, tegeldata, scene-objecten,
// wegen-indexen, UI en overig. Levende bytes per allocatieplek, ingedeeld op bronbestand en functienaam.
//   node scripts/perf/heapmap.mjs <bestand.heapprofile> [--json] [--files=8]
// Een profiel komt uit de run: PERF_HEAPPROF=foot,ring node scripts/perf/run.mjs <naam> (GDE_PROFILE_OUT=<map> bewaart het ruwe profiel)
// of uit `--heapprof-load=<ms>`. De indeling is een heuristiek op bestandsnaam; "overig" laat zien wat nog nergens in past.
// Zuiver deel (classify, summarize) wordt door scripts/heapmap_test.mjs gedekt.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CATEGORIES = [
  ['audio', /(^|\/)(audio|sfx|scenario|radio|music|voice|samples|dsp|ambience|foley)[^/]*\.js|audio\//i],
  ['textures en canvas', /(texture|canvas|sprite|atlas|signs?|board|label|billboard|minimap|mapview|hud_panel|pixelart|kaartkleuren)[^/]*\.js/i],
  ['tegeldata', /(tilestore|tileworker|tileworld|gdt|terraincache|terrainraster|mapdata|tilegreenery|tileplace)\.js/i],
  ['wegen en routes', /(roadsurface|roadindex|routing|traffic|trafficlights|junctions|roadgraph|navgraph|roadbudget|roads?)[^/]*\.js/i],
  ['gras en groen', /(grass|trees|greenery|countryfield|countryplan|countrymap|countryside|farmcrops)[^/]*\.js/i],
  ['geometrie en meshes', /(models3d|geometry|geo|mesh|batch|staticbatch|buildings?|facade|shore|water)[^/]*\.js/i],
  ['scene en render', /(scene3d|three|renderer|postfx|lighting|shadow|sky)[^/]*\.js/i],
  ['simulatie en spelwereld', /(world|vehicle|ped|npc|actors?|wildlife|mission|story|narrative|game|sim)[^/]*\.js/i],
];

export function classify(url, fn = '') {
  const file = String(url || '').split('?')[0];
  if (!file && !fn) return 'native';
  if (/three(\.module)?(\.min)?\.js|\/three\//i.test(file)) return 'scene en render';
  if (!file) return /decodeAudio/i.test(fn) ? 'audio' : 'native';
  for (const [name, re] of CATEGORIES) if (re.test(file)) return name;
  return 'overig';
}

// profile: .heapprofile ({ head: node tree met selfSize }). Geeft { total, byCat: Map, byFile: Map }
export function summarize(profile) {
  const byCat = new Map(), byFile = new Map();
  let total = 0;
  const walk = (n) => {
    const self = n.selfSize || 0;
    if (self) {
      const cf = n.callFrame || {};
      const f = String(cf.url || '').split('/').pop().split('?')[0] || '(native)';
      const cat = classify(cf.url, cf.functionName);
      byCat.set(cat, (byCat.get(cat) || 0) + self);
      const key = cat + '\t' + f;
      byFile.set(key, (byFile.get(key) || 0) + self);
      total += self;
    }
    for (const c of n.children || []) walk(c);
  };
  if (profile && profile.head) walk(profile.head);
  return { total, byCat, byFile };
}

export function formatSummary(s, nFiles = 8) {
  const MB = (b) => (b / 1048576).toFixed(1).padStart(8) + ' MB';
  const pct = (b) => (s.total ? (b / s.total * 100).toFixed(1) : '0.0').padStart(5) + '%';
  const out = [`totaal levend: ${MB(s.total).trim()}`];
  for (const [cat, b] of [...s.byCat].sort((a, c) => c[1] - a[1])) {
    out.push(`${pct(b)} ${MB(b)}  ${cat}`);
    const files = [...s.byFile].filter(([k]) => k.startsWith(cat + '\t')).sort((a, c) => c[1] - a[1]).slice(0, nFiles);
    for (const [k, fb] of files) out.push(`         ${MB(fb)}    ${k.split('\t')[1]}`);
  }
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!file) { console.error('gebruik: node scripts/perf/heapmap.mjs <bestand.heapprofile> [--json] [--files=8]'); process.exit(2); }
  const nf = Number((process.argv.find((a) => a.startsWith('--files=')) || '--files=8').slice(8));
  const s = summarize(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (process.argv.includes('--json')) console.log(JSON.stringify({ totalMB: s.total / 1048576, cat: Object.fromEntries([...s.byCat].map(([k, v]) => [k, +(v / 1048576).toFixed(1)])) }));
  else console.log(formatSummary(s, nf));
}
