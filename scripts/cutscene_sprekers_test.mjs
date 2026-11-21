// Regressietest #1145: in elke cutscene van de catalogus staat de spreker in de scène (acteur in de regie, niet verborgen,
// gespawnd binnen de plek) en in het kader van de camera zolang hij praat (behalve bij een bewuste offscreen- of insertshot).
// Los van de linter-regels (CS-V01, CS-R03) toetst deze test het zelf, zodat een versoepelde regel hem niet stilzwijgend laat slagen.
//   node scripts/cutscene_sprekers_test.mjs
import { loadUnits } from './lib/cutscene_data.mjs';
import { lintUnit, speakerActorId, inFrame } from './lib/cutscene_lint.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const AANKER = { x: 500, y: -300, facing: 1.1, z: 0 };
const KANAAL = /radio|telefoon|voicemail|app|nieuws|omroep|tv/i;
const isOff = (l) => KANAAL.test(l.channel || '') || l.key === 'V';

const data = await loadUnits();
const ctx = { speakers: data.speakers, npc: data.looks };
const eenheden = [...data.units, ...data.kaleUnits];
ok(eenheden.length > 100, 'catalogus is geladen', String(eenheden.length));

let sprekerRegels = 0, zonderActor = 0, nietInBeeld = 0;
for (const u of eenheden) {
  const v = lintUnit(u, ctx);
  const bad = v.filter((x) => x.regel === 'CS-V01' || (x.regel === 'CS-R03' && x.ernst === 'blokkerend'));
  ok(!bad.length, `${u.id}: geen blokkerende spreker-vondst`, bad.map((x) => x.regel + ' ' + (x.melding || x.tekst || '')).join('; '));
  if (!u.def || !u.scene) continue;
  const actors = u.def.actors || {};
  (u.lines || []).forEach((l, i) => {
    if (isOff(l)) return;
    sprekerRegels++;
    const id = speakerActorId(u, l.speaker);
    if (!id) { zonderActor++; ok(false, `${u.id} regel ${i}: ${l.speaker} heeft geen acteur`); return; }
    const a = actors[id];
    if (a.at) ok(Math.hypot(a.at[0], a.at[1]) <= 40, `${u.id}: ${id} gespawnd binnen 40 m van de plek`);
    // kader: op minstens één moment van de regel staat de spreker in beeld (offscreen-shots uitgezonderd)
    const t0 = l.at, t1 = l.at + Math.max(0.4, l.dur);
    let gezien = false, offToegestaan = false;
    for (let t = t0; t <= t1 + 1e-9 && !gezien; t += 0.25) {
      let s; try { s = u.scene.sample(Math.min(t, u.duration), AANKER); } catch { continue; }
      const sa = s.actors[id];
      if (!sa) continue;
      if (a.road !== undefined) { gezien = true; break; }
      if (sa.visible === false) continue;
      const sh = (u.def.shots || [])[s.shotIndex ?? -1];
      if (sh && (sh.offscreen || sh.shot === 'insert')) offToegestaan = true;
      if (inFrame(s.camera, { x: sa.x, y: sa.y, z: (sa.h || 1.7) * 0.8 + (sa.z || 0) })) gezien = true;
    }
    if (!gezien && !offToegestaan) { nietInBeeld++; ok(false, `${u.id} regel ${i}: ${l.speaker} nooit in beeld`, `${t0.toFixed(1)}-${t1.toFixed(1)} s`); }
  });
}
console.log(`${sprekerRegels} sprekerregels in ${eenheden.length} cutscenes; zonder acteur ${zonderActor}, nooit in beeld ${nietInBeeld}`);
console.log(fails ? `${fails} van ${n} spreker-controles falen` : `cutscene_sprekers_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
