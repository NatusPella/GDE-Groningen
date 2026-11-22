// Audit van de locatiewissels in cutscenes (#1016 pop-in, #1008): pure data, geen render, geen wereld.
//   node scripts/cutscene_locaties_audit.mjs [--json] [--strict] [--top=N] [id-filter]
// Per scène uit de catalogus (cutpreview.js: de geregisseerde scènes, de opening, de thuisavonden en de intochten) de reeks
// shot-locaties, de afstand tussen opeenvolgende shotlocaties (eind van het vorige shot naar begin van het volgende, het
// streamfocus zoals tilefocus.js het kiest) en of de streaming tijdig meeverhuist:
//   - tegels: de punten van de scène-prewarm (cutscript.js shotPoints, hoogstens 24, straal 350 m) pinnen de tegels bij de start;
//   - gebouwen/wegen: de scène-prewarm (scene3d prewarmStreamAt) leeft maar 4 s: een sprong later dan 4 s plus de straal is dus
//     NIET voorgebouwd (zonder cutscenewarm.js); met de vooruit-warm vraagt de loper hem leadS vóór de cut;
//   - poort: een harde sprong (>= hardM) wacht met cutscenewarm.js onder zwart tot de plek klaar is (hoogstens maxWaitMs).
// De opening (intromontage/openingfilm.js) is een film met plekken uit een tabel (hieronder) omdat zijn shots de wereld nodig hebben.
// --strict: exit 1 als een harde sprong zonder vooruit-warm overblijft (de loper dekt ze, dus dit bewaakt dat het zo blijft).
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../game/js/cutpreview.js';
import { shotPoints } from '../game/js/cutscript.js';
import { WARM, jumpsFromScene, jumpsFromStops, classifyJump, createJumpRunner, focusOfPose } from '../game/js/cutscenewarm.js';
import { SEQUENCE, timeline } from '../game/js/openingfilm.js';

const args = process.argv.slice(2);
const asJson = args.includes('--json'), strict = args.includes('--strict');
const top = Number((args.find((a) => a.startsWith('--top=')) || '--top=12').slice(6));
const filter = args.find((a) => !a.startsWith('--'));
const ANCHOR = { x: 500, y: -300, facing: 1.1, z: 0 };
const OLD_PREWARM_S = 4; // scene3d.js prewarmStreamAt(x, y, secs = 4) bij het begin van een scène
const TILE_PIN_R = 350;  // tileworld.js registerShots radius

const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');

const r0 = (v) => Math.round(v);
const pad = (s, n) => String(s).padEnd(n);

// de runner op een scène met een mock-omgeving: wordt elke sprong gewarmd en elke harde sprong bewaakt?
function runnerCoverage(jumps, duration) {
  if (!jumps.length) return { warmed: 0, gated: 0 };
  const warmed = new Set();
  let clock = 0, notReady = true;
  const env = { now: () => clock, warm: (j) => warmed.add(j.idx), ready: () => ({ ready: !notReady && false }), fade() {}, voice() {}, flags() {} };
  // niets is ooit klaar: elke harde sprong moet de poort in (en na maxWaitMs doorlaten)
  const runner = createJumpRunner(jumps, env);
  let t = 0;
  for (let i = 0; i < 100000 && t < duration; i++) { clock += 1000 / 60; const r = runner.step(t, t + 1 / 60); t = r.t; if (!r.held && t >= duration) break; }
  return { warmed: warmed.size, gated: runner.stats().gates };
}

// ---- scènes uit de catalogus (geregisseerd per anker, en de intochten) ----
function sceneRow(e) {
  const scene = e.scene;
  const shots = scene.shots || [];
  const stops = [];
  const focusAt = (t) => { try { return focusOfPose(scene.sample(Math.max(0, Math.min(e.duration, t)), ANCHOR).camera); } catch (err) { return null; } };
  for (let i = 0; i < shots.length; i++) {
    const t = shots[i].t;
    if (!Number.isFinite(t) || t > e.duration) continue;
    const a = focusAt(t + 0.05);
    if (!a) continue;
    const b = i > 0 ? focusAt(t - 0.05) : null;
    stops.push({ t, x: a.x, y: a.y, _b: b });
  }
  for (let i = 1; i < stops.length; i++) if (stops[i]._b) { stops[i - 1].ex = stops[i]._b.x; stops[i - 1].ey = stops[i]._b.y; }
  const cuts = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    const from = { x: Number.isFinite(a.ex) ? a.ex : a.x, y: Number.isFinite(a.ey) ? a.ey : a.y };
    cuts.push({ idx: i, t: b.t, dist: Math.hypot(b.x - from.x, b.y - from.y) });
  }
  const jumps = jumpsFromScene(scene, ANCHOR, e.duration);
  // wat de scène-prewarm dekt: de punten die cutscenehost.js zou meegeven
  const pts = shotPoints(scene, ANCHOR, e.duration);
  let uncoveredTiles = 0, samples = 0, maxFocusStep = 0, prev = null;
  for (let t = 0; t <= e.duration; t += 0.5) {
    const f = focusAt(t);
    if (!f) continue;
    samples++;
    if (!pts.some((p) => Math.hypot(p.x - f.x, p.y - f.y) <= TILE_PIN_R)) uncoveredTiles++;
    if (prev) maxFocusStep = Math.max(maxFocusStep, Math.hypot(f.x - prev.x, f.y - prev.y));
    prev = f;
  }
  const noBuildings = jumps.filter((j) => j.t - WARM.leadS > OLD_PREWARM_S || j.t > OLD_PREWARM_S + 1).length;
  const cov = runnerCoverage(jumps, e.duration);
  return {
    id: e.id, group: e.group, title: e.title, dur: e.duration, shots: shots.length,
    maxCut: cuts.reduce((m, c) => Math.max(m, c.dist), 0), maxFocusStep,
    jumps: jumps.map((j) => ({ t: +j.t.toFixed(1), dist: r0(j.dist), kind: j.kind })),
    soft: jumps.filter((j) => j.kind === 'soft').length, hard: jumps.filter((j) => j.kind === 'hard').length,
    uncoveredTilePct: samples ? Math.round((uncoveredTiles / samples) * 100) : 0,
    buildingsNotPrewarmedBefore: noBuildings, warmedNow: cov.warmed, gated: cov.gated,
    prewarmPoints: pts.length,
  };
}

// ---- de opening: plekken uit een tabel (de shots zelf vragen de wereld) ----
// Coördinaten (kaartmeters) uit intromontage.js buildShots; onbekend (null) = de plek hangt aan de gegenereerde wereld (de flat in
// Paddepoel): een plaatswissel naar of van zo'n plek telt als harde sprong (Paddepoel ligt kilometers van de Oosterparkwijk).
const OPENING_PLACES = {
  'Martinitoren': { x: 213.81, y: 9.9 },
  'Grote Markt': { x: 16.36, y: 255.74 }, // gebouwd bij de Vismarkt-straat (bikes), zie intromontage.js
  'Vismarkt': { x: 16.36, y: 255.74 },
  'Oosterparkwijk, Korenbloemstraat': { x: 1308.82, y: -805.45 },
  'Zolderkeuken': { x: 1308.82, y: -805.45 }, // de keuken hangt 345 m boven de straat op dezelfde x en y
  'Oosterparkwijk, zolder': { x: 1308.82, y: -805.45 },
  'Oosterparkwijk, kiosk': { x: 1308.82, y: -805.45 },
  'Pleiadenlaan': null,
  'Paddepoel': null,
};
const UNKNOWN_M = 3000; // aangenomen afstand voor een wissel naar een plek zonder vaste coördinaat

function openingRow() {
  const tl = timeline();
  const places = SEQUENCE.map((s, i) => ({ id: s.id, place: s.at || null, t: tl[i].t, dur: tl[i].dur, xy: s.at ? OPENING_PLACES[s.at] : undefined }));
  const seq = [];
  let last = null;
  for (const p of places) {
    if (!p.place) continue; // een zwart of titelshot: geen plek
    seq.push(p);
  }
  const jumps = [];
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    let d;
    if (a.place === b.place) d = 0;
    else if (a.xy && b.xy) d = Math.hypot(a.xy.x - b.xy.x, a.xy.y - b.xy.y);
    else d = UNKNOWN_M;
    if (classifyJump(d) !== 'none') jumps.push({ idx: i, t: b.t, from: a.place, to: b.place, dist: r0(d), kind: classifyJump(d), shot: b.id, estimated: !(a.xy && b.xy) });
  }
  return { id: 'opening-film', group: 'Opening', title: 'De openingsfilm (' + SEQUENCE.length + ' shots)', dur: tl[tl.length - 1].t + tl[tl.length - 1].dur, places: seq.map((p) => p.place), jumps };
}

// ---- playCinematic-aanroepen zonder prewarm (statisch: tekstzoeken) ----
function cinematicCallers() {
  const dir = new URL('../game/js/', import.meta.url);
  const files = ['cinematics.js', 'cutscenehost.js', 'fjordtrain.js', 'heist.js', 'intochten.js', 'intromontage.js', 'missions.js', 'missionstory.js', 'pg_koe.js', 'postgame.js', 'reisrit3d.js', 'respawn.js', 'rondvaartchase.js', 'stationtravel.js', 'story.js', 'storyeikea.js', 'storyfun.js', 'uitjescene.js'];
  const out = [];
  for (const f of files) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    const calls = (src.match(/playCinematic\(/g) || []).length;
    if (!calls) continue;
    out.push({ file: f, calls, prewarm: (src.match(/\bprewarm\b/g) || []).length, jumps: (src.match(/\bjumps\b/g) || []).length });
  }
  return out;
}

const cat = buildCatalog({ script, npcSource }).filter((e) => !filter || e.id.includes(filter));
const rows = cat.filter((e) => e.scene).map(sceneRow);
const opening = !filter || 'opening-film'.includes(filter) ? openingRow() : null;
const callers = cinematicCallers();

const withJump = rows.filter((r) => r.hard + r.soft > 0);
const withHard = rows.filter((r) => r.hard > 0);
const missing = [...rows.filter((r) => r.hard > r.gated), ...(opening ? [] : [])].map((r) => r.id);
const summary = {
  scenes: rows.length, withJump: withJump.length + (opening && opening.jumps.length ? 1 : 0), withHardJump: withHard.length + (opening && opening.jumps.some((j) => j.kind === 'hard') ? 1 : 0),
  openingJumps: opening ? opening.jumps.length : 0, openingHard: opening ? opening.jumps.filter((j) => j.kind === 'hard').length : 0,
  maxCutM: r0(rows.reduce((m, r) => Math.max(m, r.maxCut), 0)),
  tilesNotCoveredScenes: rows.filter((r) => r.uncoveredTilePct > 0).length,
  hardWithoutGate: missing,
};

if (asJson) {
  console.log(JSON.stringify({ summary, opening, scenes: rows, callers }, null, 2));
} else {
  console.log(`Cutscene-locaties: ${summary.scenes} scènes uit de catalogus plus de openingsfilm`);
  console.log(`  scènes met een sprong (>= ${WARM.softM} m tussen eind en begin van twee shots): ${summary.withJump}, waarvan hard (>= ${WARM.hardM} m): ${summary.withHardJump}`);
  console.log(`  grootste cut binnen een geregisseerde scène: ${summary.maxCutM} m (alles om één anker: de camera blijft ${45} m van het anker)`);
  console.log(`  scènes waarvan een deel van de baan buiten de gepinde tegels valt: ${summary.tilesNotCoveredScenes}`);
  if (opening) {
    console.log(`\nOpeningsfilm ${r0(opening.dur)} s, plekken: ${opening.places.filter((p, i, a) => a[i - 1] !== p).join(' > ')}`);
    for (const j of opening.jumps) console.log(`  t=${pad(j.t.toFixed(1), 6)} ${pad(j.shot, 12)} ${j.from} > ${j.to}: ${j.dist} m${j.estimated ? ' (aangenomen, plek hangt aan de wereld)' : ''} [${j.kind}]`);
  }
  console.log(`\nGrootste sprongen en banen (top ${top}):`);
  const rank = [...rows].sort((a, b) => Math.max(b.maxCut, b.maxFocusStep * 10) - Math.max(a.maxCut, a.maxFocusStep * 10)).slice(0, top);
  console.log('  ' + pad('scène', 26) + pad('s', 5) + pad('shots', 6) + pad('maxcut m', 9) + pad('vmax m/s', 9) + pad('sprongen z/h', 13) + pad('pin-gat %', 10) + 'gebouwen te laat');
  for (const r of rank) console.log('  ' + pad(r.id, 26) + pad(r0(r.dur), 5) + pad(r.shots, 6) + pad(r0(r.maxCut), 9) + pad(r0(r.maxFocusStep / 0.5), 9) + pad(`${r.soft}/${r.hard}`, 13) + pad(r.uncoveredTilePct, 10) + r.buildingsNotPrewarmedBefore);
  console.log('\nplayCinematic-aanroepen (statisch): bestand, aanroepen, "prewarm" in het bestand, "jumps" in het bestand');
  for (const c of callers) console.log(`  ${pad(c.file, 22)} ${pad(c.calls, 3)} ${pad(c.prewarm, 3)} ${c.jumps}`);
  console.log('\nOpmerking: cinematics.js bouwt zijn eigen momenten (landmerk, ommelanden, respawn) uit functies zonder vaste punten: die vragen de Electron-run.');
}
if (strict && summary.hardWithoutGate.length) { console.error('harde sprong zonder poort: ' + summary.hardWithoutGate.join(', ')); process.exit(1); }
