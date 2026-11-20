// Animatie-audit van alle geregisseerde scènes zonder wereld (#955 #956):
//   node scripts/cutscenes_anim_audit.mjs [--json] [--top=15]
// Telt per standaardanimatie hoeveel seconden (over alle acteurs) en hoeveel cues eraan hangen, per pose-clip hetzelfde,
// en welke scènes het meest stil staan: de seconden dat een acteur alleen idle of praat en geen gebaar, clip of beweging heeft.
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../game/js/cutpreview.js';

const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
const ANCHOR = { x: 500, y: -300, facing: 1.1, z: 0 };
const args = process.argv.slice(2);
const top = Number((args.find((a) => a.startsWith('--top=')) || '--top=15').slice(6));
const STEP = 0.2;

const cat = buildCatalog({ script, npcSource }).filter((e) => e.scene && e.duration > 0);
const secs = {}, cues = {}, clipSecs = {}, clipCues = {};
const per = [];
let totalSecs = 0;
for (const e of cat) {
  const sc = e.scene;
  for (const c of sc.cues || []) if (c.actor && c.anim) { const m = (typeof c.anim === 'string' && /^[a-z-]+$/.test(c.anim)) ? c.anim : null; if (m) { cues[m] = (cues[m] || 0) + 1; } }
  let still = 0, actorSecs = 0, clipTime = 0, shots = new Set();
  const ids = Object.keys(sc.sample(0, ANCHOR).actors);
  for (let t = 0; t < e.duration; t += STEP) {
    const s = sc.sample(t, ANCHOR);
    shots.add(s.camera.shotIndex);
    for (const id of ids) {
      const a = s.actors[id];
      if (!a || a.visible === false) continue;
      actorSecs += STEP; totalSecs += STEP;
      secs[a.anim] = (secs[a.anim] || 0) + STEP;
      const cl = a.clips && a.clips[a.clips.length - 1];
      if (cl) { clipSecs[cl.name] = (clipSecs[cl.name] || 0) + STEP; clipTime += STEP; }
      // stil: alleen idle of talk, geen beweging, geen clip
      if ((a.anim === 'idle' || a.anim === 'talk' || a.anim === 'look') && !a.speed && !cl) still += STEP;
    }
  }
  per.push({ id: e.id, duration: +e.duration.toFixed(1), actors: ids.length, shots: shots.size, stilSecs: +still.toFixed(1), stilShare: actorSecs ? +(still / actorSecs).toFixed(2) : 0, clipSecs: +clipTime.toFixed(1), cat: Object.values(sc.sample(0, ANCHOR).props).some((p) => p.kind === 'kat') });
  for (const c of e.scene.cues || []) if (c.actor && c.anim && /^[a-z]+$/.test(String(c.anim)) && !['idle'].includes(c.anim)) { /* geteld hierboven */ }
}
for (const e of cat) for (const c of e.scene.cues || []) if (c.actor && typeof c.anim === 'string' && clipSecs[c.anim] !== undefined) clipCues[c.anim] = (clipCues[c.anim] || 0) + 1;
const sorted = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const out = {
  scenes: cat.length,
  actorSecs: +totalSecs.toFixed(0),
  anim: sorted(secs).map(([k, v]) => ({ anim: k, secs: +v.toFixed(0), share: +(v / totalSecs).toFixed(3), cues: cues[k] || 0 })),
  clips: sorted(clipSecs).map(([k, v]) => ({ clip: k, secs: +v.toFixed(0), cues: clipCues[k] || 0 })),
  stilst: per.filter((p) => p.actors > 0).sort((a, b) => b.stilSecs - a.stilSecs).slice(0, top),
  katScenes: per.filter((p) => p.cat).map((p) => p.id),
  totalStilSecs: +per.reduce((n, p) => n + p.stilSecs, 0).toFixed(0),
  totalClipSecs: +per.reduce((n, p) => n + p.clipSecs, 0).toFixed(0),
};
if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`scènes ${out.scenes}, acteur-seconden ${out.actorSecs}, daarvan stil ${out.totalStilSecs}, met clip ${out.totalClipSecs}`);
  for (const a of out.anim) console.log(`  ${a.anim.padEnd(8)} ${String(a.secs).padStart(6)} s  ${(a.share * 100).toFixed(1).padStart(5)} %  ${String(a.cues).padStart(4)} cues`);
  for (const c of out.clips) console.log(`  clip ${c.clip.padEnd(16)} ${String(c.secs).padStart(5)} s ${String(c.cues).padStart(3)} cues`);
  console.log('stilste scènes:');
  for (const p of out.stilst) console.log(`  ${p.id.padEnd(22)} ${String(p.duration).padStart(6)} s  stil ${String(p.stilSecs).padStart(6)} s (${Math.round(p.stilShare * 100)} %)  clip ${p.clipSecs} s`);
  console.log('scènes met de kat: ' + (out.katScenes.join(', ') || '-'));
}
