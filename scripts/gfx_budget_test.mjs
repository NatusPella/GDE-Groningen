// #1039: het renderbudget per preset (puur, geen GPU): zichtafstand, detailring, schaduwkaart, MSAA, pixelratio. De tabel in
// docs/PERF-GPU-21-11.md komt hieruit (`node scripts/gfx_budget_test.mjs --tabel`); de controles houden de volgorde
// Laag < Midden < Hoog < Ultra vast, zodat een preset niet stil zwaarder wordt.
import fs from 'node:fs';
import { GFX_PRESETS, PRESET_ORDER, presetLabel } from '../game/js/gfxprofile.js';
import { QUALITY_PRESETS } from '../game/js/settings.js';
import { VIEW_DISTANCES, viewDistanceFor, detailDistanceFor, DETAIL_BASE, DETAIL_AREA_MAX } from '../game/js/viewdist.js';
import { adaptedShadowLevel, SHADOW_SIZES, shadowTargetMB } from '../game/js/shadowlevel.js';
import { postSampleCount } from '../game/js/postsamples.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

export function budgetOf(name) {
  const p = GFX_PRESETS[name];
  const view = viewDistanceFor(p.drawDistance, 1, 0);
  const ring = detailDistanceFor(p.quality, view, 0);
  const level = p.shadows ? adaptedShadowLevel(p.quality, 1, 0, p.drawDistance) : null;
  return {
    name, label: presetLabel(name), view, ring, ringArea: +((ring / DETAIL_BASE) ** 2).toFixed(2),
    shadowSize: level ? SHADOW_SIZES[level] : 0, shadowMB: level ? +shadowTargetMB(SHADOW_SIZES[level]).toFixed(1) : 0,
    msaa: postSampleCount(p.quality), bloom: p.quality === 'hoog', grade: p.quality !== 'laag',
    pixelRatioCap: +(QUALITY_PRESETS[p.quality].pixelRatio * p.resolution).toFixed(2),
  };
}

const B = Object.fromEntries(PRESET_ORDER.map((n) => [n, budgetOf(n)]));
const [laag, middel, vlot, hoog] = PRESET_ORDER.map((n) => B[n]);

// de volgorde van de schaduwkaart: elke stap omhoog is nooit kleiner
for (let i = 1; i < PRESET_ORDER.length; i++) {
  const a = B[PRESET_ORDER[i - 1]], b = B[PRESET_ORDER[i]];
  // Hoog (vlot) heeft bewust een kortere zichtafstand dan Midden (de look van Ultra, de afstand van Laag): alleen de kaart en Ultra's zichtafstand lopen op
  ok(b.shadowSize >= a.shadowSize, `${b.label}: schaduwkaart niet kleiner dan ${a.label}`);
}
// de budgetten zelf
ok(vlot.ring <= hoog.ring && vlot.ringArea <= 1.5, 'Hoog: de detailring is nooit groter dan die van Ultra (23-11: Hoog kreeg zichtafstand normaal)');
ok(hoog.ringArea <= 1.5, `Ultra: de detailring is hoogstens 1,5x de oppervlakte van 140 m (${hoog.ringArea})`);
ok(hoog.ringArea <= DETAIL_AREA_MAX, 'Ultra: binnen het oude plafond van de ringoppervlakte');
ok(vlot.shadowSize <= 2048 && middel.shadowSize <= 2048 && laag.shadowSize <= 1024, 'alleen Ultra heeft een schaduwkaart van 4096');
ok(hoog.view >= middel.view && hoog.ring >= middel.ring, 'Ultra: zichtafstand en ring niet onder Midden');
ok(hoog.shadowSize === 4096 && hoog.shadowMB > 60, 'Ultra: 4096');
ok(vlot.view === VIEW_DISTANCES.normaal && hoog.view === VIEW_DISTANCES.heelver, 'Hoog normaal, Ultra heel ver');
ok(vlot.view >= middel.view && vlot.view < hoog.view, 'Hoog: zichtafstand minstens die van Midden en korter dan Ultra (duidelijk goedkoper)');
ok(laag.msaa === 4 && middel.msaa === 2 && vlot.msaa === 2 && hoog.msaa === 2, 'MSAA: Laag 4 (alleen de uitvoerpas), de rest 2 samples');
ok(hoog.bloom && vlot.bloom && !middel.bloom && !laag.bloom, 'bloom op Hoog en Ultra');
ok(laag.pixelRatioCap < 1 && vlot.pixelRatioCap <= 1.5, 'pixelratio per preset begrensd');
// de adaptieve trap neemt de zware dingen als eerste weg: heel ver zakt naar ver bij schaal < 0,9, de schaduwkaart naar 2048
ok(viewDistanceFor('heelver', 0.85, 0) === VIEW_DISTANCES.heelver && viewDistanceFor('heelver', 1, 2) === VIEW_DISTANCES.ver && adaptedShadowLevel('hoog', 0.85, 0, 'heelver') === 'hoog2048', 'adaptief: bij een lagere renderschaal blijft Ultra heel ver (de schaduwkaart en de resolutie zakken); alleen een CPU die het niet bijhoudt geeft ver');
ok(detailDistanceFor('hoog', 900, 3) < DETAIL_BASE, 'cpuLevel 3 verkleint de ring');

// de schaduwhaak (16 aanroepen per frame van de postketen, 2 tot 5 ms) blijft: render() zonder scène, zonder licht of zonder nieuwe kaart gaat meteen naar three
const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
const hook = "if ((sc !== scene || !lights.length || !shadowMap.enabled || (!shadowMap.autoUpdate && !shadowMap.needsUpdate)) && !perfOff('schaduwhaak')) { run(lights, sc, camera); return; }";
ok(src.includes(hook), 'de schaduwhaak slaat de postketen-aanroepen over');
const nl = (src.match(/\n/g) || []).length + 1;
ok(nl < 4500, 'scene3d.js blijft onder 4500 regels (' + nl + ')');
if (process.argv.includes('--tabel')) {
  console.log('| Preset | Zichtafstand | Detailring | Ring (opp. t.o.v. 140 m) | Schaduwkaart | MSAA | Bloom | Pixelratio (max) |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const n of PRESET_ORDER) { const b = B[n]; console.log(`| ${b.label} | ${b.view} m | ${b.ring} m | ${b.ringArea}x | ${b.shadowSize || 'uit'}${b.shadowSize ? ` (${b.shadowMB} MB)` : ''} | ${b.msaa}x | ${b.bloom ? 'ja' : 'nee'} | ${b.pixelRatioCap} |`); }
}
console.log(fails ? `${fails} FAILED` : 'gfx_budget_test ok');
process.exit(fails ? 1 : 0);
