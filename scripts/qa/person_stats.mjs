// Meet de driehoeken, botten en bouwtijd van een mensmodel over een steekproef van zaden (personages AAA, 23-11), en de CPU-tijd per
// mens per frame van de animatielagen (epic 'Personages die leven'): de loopcyclus, voeten op de grond (plantFeet) en een acteur met
// lipsync en kijkrichting (actoranim.js). Geen GPU: alleen de rekentijd in JavaScript (de botten naar de GPU zijn hier niet meegeteld).
//   node scripts/qa/person_stats.mjs [aantal=300]
import '../node3d.mjs';
const P = await import('../../game/js/models3d_people.js');
const A = await import('../../game/js/actoranim.js');
const { buildPersonMesh } = P;
const N = +process.argv[2] || 300;
const SKINS = [0xf1c9a5, 0xd9a47a, 0xa8754f, 0x6e4a33, 0xf6d7bd];
const SHIRTS = [0x3f6ea8, 0x9e3027, 0x4a7a4a, 0xc9a227, 0x5c3f7a, 0xe3ddd0, 0x2b2f36];
let tris = 0, min = 1e9, max = 0, bones = 0, calls = 0, meshes = 0;
const people = [];
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  const m = buildPersonMesh(SHIRTS[i % SHIRTS.length], SKINS[(i * 3) % SKINS.length], { seed: 1000 + i });
  people.push(m);
  m.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { calls++; if (o.isSkinnedMesh) { meshes++; bones = o.skeleton.bones.length; const g = o.geometry; const t = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += t; min = Math.min(min, t); max = Math.max(max, t); } } });
}
const ms = performance.now() - t0;
console.log(`personen ${N}: gem ${(tris / meshes).toFixed(0)} driehoeken (min ${min}, max ${max}), ${bones} botten, ${(calls / N).toFixed(2)} meshes (drawcalls) per mens, ${(ms / N).toFixed(2)} ms bouwtijd per mens`);

// ---- CPU per mens per frame (µs) -------------------------------------------------------------------
const FRAMES = 240, DT = 1 / 60;
const crowd = people.slice(0, Math.min(60, N));
crowd.forEach((m, i) => { m.position.set(i * 2, 0, 0); m.rotation.y = -0.4; });
// een helling van 12% langs x: de voeten liggen elk frame op een andere hoogte dan het middelpunt
const slope = (x, y) => 0.12 * x;
const time = (fn) => {
  for (let f = 0; f < 30; f++) fn(f); // opwarmen (JIT)
  const s = performance.now();
  for (let f = 0; f < FRAMES; f++) fn(f);
  return ((performance.now() - s) * 1000) / (FRAMES * crowd.length);
};
const walk = time(() => { for (const m of crowd) P.animatePersonWalk(m, 1.4, DT); });
const walkIK = time(() => { for (const m of crowd) { m.position.y = slope(m.position.x, 0); P.animatePersonWalk(m, 1.4, DT); P.plantFeet(m, slope, 1); } });
const flatIK = time(() => { for (const m of crowd) { m.position.y = 0; P.animatePersonWalk(m, 1.4, DT); P.plantFeet(m, () => 0, 1); } });
// cutscene: iedereen praat om de beurt tegen zijn buurman (kijkrichting, gebaren, lipsync op de lettergreepcurve)
const stage = A.createStage({ seed: 1 });
crowd.forEach((m, i) => stage.add('a' + i, { x: i * 2, z: 0 }));
const actor = time((f) => {
  if (f % 90 === 0) crowd.forEach((m, i) => stage.cue('a' + i, 'praat', { duur: 1.4, tekst: 'Nou, zeg, wat dacht jij daarvan?', tot: 'a' + ((i + 1) % crowd.length) }));
  stage.update(DT);
  crowd.forEach((m, i) => stage.apply('a' + i, m));
});
const sound = { level: 0 };
A.setVoiceLevelSource(() => sound.level);
const actorVoice = time((f) => {
  sound.level = 0.05 + 0.1 * Math.abs(Math.sin(f * 0.7));
  if (f % 90 === 0) crowd.forEach((m, i) => stage.cue('a' + i, 'praat', { duur: 1.4, tekst: 'Ja.', tot: 'a' + ((i + 1) % crowd.length) }));
  stage.update(DT);
  crowd.forEach((m, i) => stage.apply('a' + i, m));
});
A.setVoiceLevelSource(null);
const d = P.buildPersonMesh(0x5a6470, 0xd9aa82, { seed: 31 });
P.seatPose(d, { ...P.SEAT_CAR, arms: 'wheel' });

const steerS = performance.now();
for (let f = 0; f < 20000; f++) P.steerHands(d, Math.sin(f * 0.01));
const steer = ((performance.now() - steerS) * 1000) / 20000;

console.log(`CPU per mens per frame: lopen ${walk.toFixed(1)} µs; lopen + voeten op een helling ${walkIK.toFixed(1)} µs (IK ${(walkIK - walk).toFixed(1)} µs, met 2 hoogtevragen naar een goedkope functie); vlakke grond ${flatIK.toFixed(1)} µs; acteur met kijkrichting en lipsync ${actor.toFixed(1)} µs (met stemniveau ${actorVoice.toFixed(1)} µs); handen aan het stuur ${steer.toFixed(1)} µs`);
