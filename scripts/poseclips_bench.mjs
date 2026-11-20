// Kosten van de pose-clips per frame (#955): node scripts/poseclips_bench.mjs
// Meet clipLayers + sampleClip + de botten voor 12 acteurs met een clip, zoals cutscenehost.js ze elk beeld doet.
import { clipLayers, applyClipsHuman, applyClipsCat, resetCat, CLIP_NAMES } from '../game/js/poseclips.js';

const bone = () => ({ rotation: { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }, position: { x: 0, y: 0.93, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } } });
const person = () => ({ head: bone(), chest: bone(), pelvis: bone(), armL: bone(), armR: bone(), elbowL: bone(), elbowR: bone(), legL: bone(), legR: bone(), kneeL: bone(), kneeR: bone() });
const people = Array.from({ length: 12 }, (_, i) => ({ ud: person(), ev: [{ t0: 0, name: CLIP_NAMES[i % CLIP_NAMES.length], dur: 100 }, { t0: 3, name: CLIP_NAMES[(i + 7) % CLIP_NAMES.length], dur: 100 }] }));
const N = 20000;
for (let w = 0; w < 2000; w++) for (const p of people) applyClipsHuman(p.ud, clipLayers(p.ev, 1 + (w % 400) * 0.01));
const t0 = process.hrtime.bigint();
for (let f = 0; f < N; f++) { const t = 1 + (f % 800) * 0.01; for (const p of people) applyClipsHuman(p.ud, clipLayers(p.ev, t)); }
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`poseclips_bench: ${(ms / N).toFixed(4)} ms per beeld voor 12 acteurs met een clip (${(ms / N / 12 * 1000).toFixed(1)} us per acteur), ${N} beelden`);
