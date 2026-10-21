// De korte en de generieke scènes (#352): quickScene (game/js/cutscenes_akte1.js) voor de herhaalde vraag van een missie, de ene
// regel van een replay en het paar op het dek van een boot, plus de scènes die een knip van een scriptscène spelen.
//   node scripts/cutscenes_kort_test.mjs
import { readFileSync } from 'node:fs';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { quickScene, missionScene, MORE_SPECS } from '../game/js/cutscenes_akte1.js';
import '../game/js/cutscenes_akte4.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';
import { npcNamesFromSource, linesOf, sliceOf, sceneIdsFor } from '../game/js/cutpreview.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const looks = npcNamesFromSource(readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8'));
const anchor = { x: 500, y: -300, facing: 1.1, z: 0 };

function check(name, def, lines, total) {
  ok(def, name + ' bouwt');
  if (!def) return;
  const iss = validateScene(def, { lines, duration: total });
  ok(iss.length === 0, name + ' valideert', iss.join(' | '));
  if (iss.length) return;
  const sc = compileScene(def, { lines, duration: total });
  let finite = true, shots = new Set();
  for (let t = 0; t <= total; t += 0.1) {
    const s = sc.sample(t, anchor);
    const c = s.camera;
    for (const v of [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov]) if (!Number.isFinite(v)) finite = false;
    for (const a of Object.values(s.actors)) for (const v of [a.x, a.y, a.a, a.gaze]) if (!Number.isFinite(v)) finite = false;
    shots.add(c.shotIndex);
  }
  ok(finite, name + ' samplet eindig');
  return { sc, shots: shots.size };
}

// de herhaalde vraag (short intro): de NPC-regel van elke missie met een NPC
{
  let built = 0;
  for (const st of STEPS.filter((q) => q.kind === 'mission' && q.story && q.story.intro && q.story.intro.length)) {
    const sc = script.scenes.find((s) => s.id === st.story.intro[0]);
    const l0 = sc && sc.lines.find((l) => l.channel !== 'app-stil' && l.key !== 'A' && l.key !== 'T');
    if (!l0) continue;
    const key = Object.keys(looks).find((k) => looks[k].name === l0.speaker);
    if (!key) continue;
    const { lines, total } = linesOf(script, [sc.id], looks, [sc.lines.indexOf(l0), sc.lines.indexOf(l0) + 1]);
    const def = quickScene(lines, { npc: { key, look: looks[key] }, looks });
    check(st.id + ' korte vraag', def, lines, total);
    built++;
  }
  ok(built >= 15, 'de korte vraag bestaat voor minstens vijftien missies', String(built));
}

// de herhaling (short outro): de ene regel van elke replay
{
  let built = 0;
  for (const st of STEPS.filter((q) => q.kind === 'mission' && q.story && q.story.replay)) {
    const { lines, total } = linesOf(script, st.story.replay, looks);
    if (!lines.length) continue;
    const l0 = script.scenes.find((s) => s.id === st.story.replay[0]).lines[0];
    const key = Object.keys(looks).find((k) => looks[k].name === l0.speaker);
    const npc = key ? { key, look: looks[key] } : null;
    const def = quickScene(lines, { npc, looks });
    check(st.id + ' replay', def, lines, total);
    built++;
  }
  ok(built >= 20, 'de replay bestaat voor minstens twintig missies', String(built));
}

// het paar op het dek: de intro's en outro's van de bootmissies, zonder NPC
for (const id of ['M11.intro', 'M17.intro', 'M17.outro', 'M11.outro']) {
  const { lines, total } = linesOf(script, sceneIdsFor(id), looks);
  const r = check(id + ' op het dek', quickScene(lines, { deck: true, looks }), lines, total);
  ok(r && r.shots >= Math.min(3, lines.length), id + ' op het dek: de camera varieert', r ? String(r.shots) : '');
}
// een NPC die niet in de tabel staat bouwt niet (de speler ziet dan de oude scène)
ok(quickScene([{ speaker: 'X', text: 'y', at: 1, dur: 2 }], { npc: { key: 'bestaatniet' }, looks }) === null, 'een onbekende NPC geeft null');

// een knip van een scriptscène en de solo-rit
{
  ok(sliceOf('M26.4#7-14') && sliceOf('M26.4#7-14').from === 7 && sliceOf('M26.4') === null, 'sliceOf leest de knip');
  const keys = Object.keys(MORE_SPECS).filter((k) => sliceOf(k));
  ok(keys.includes('M26.4#7-14') && keys.includes('M06.3#0-4'), 'de knippen van missions_akte5.js en missions_nieuw.js zijn geregisseerd', keys.join(','));
  for (const key of keys) {
    const sl = sliceOf(key);
    const { lines, total } = linesOf(script, [sl.id], looks, [sl.from, sl.to]);
    ok(lines.length === sl.to - sl.from, key + ': het aantal regels klopt', String(lines.length));
    for (const b of MORE_SPECS[key].beats) if (typeof b.on === 'string') ok(lines.some((l) => l.text.startsWith(b.on)), key + ' beat vindt zijn regel', b.on);
    check(key, missionScene(key, lines, { looks }), lines, total);
  }
}
{
  const { lines, total } = linesOf(script, sceneIdsFor('M21.intro'), looks);
  const def = missionScene('M21.intro', lines, { looks });
  check('M21.intro (solo)', def, lines, total);
  const sc = compileScene(def, { lines, duration: total });
  const s0 = sc.sample(1, anchor), s1 = sc.sample(total - 1, anchor);
  ok(s0.actors.tammo.visible === false, 'M21.intro: Tammo is er niet bij');
  const moved = Math.hypot(s1.props.bakkie.x - s0.props.bakkie.x, s1.props.bakkie.y - s0.props.bakkie.y);
  ok(moved > 40, 'M21.intro: de bakkie rijdt', String(moved));
  ok(Math.hypot(s1.actors.berend.x - s1.props.bakkie.x, s1.actors.berend.y - s1.props.bakkie.y) < 0.5, 'M21.intro: de stemmen zitten in de bakkie');
}
ok(!!MORE_SPECS['M24.3'], 'M24.3 (de vlag valt) heeft een regie');

console.log(fails ? `${fails} of ${n} failed` : `cutscenes_kort_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
