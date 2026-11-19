// Page half of scripts/qa/bouwsteen_publiek_beeld.mjs (desktop --perf-script body). Galerij van bouwsteen G0b:
//  1. de vier dressingplannen met publiek (plein, stuntarena, kade, perron), 12 m voor de speler, met reactie op de speler;
//  2. een checkpointrace op een rechte route voor de speler: bogen, publiek en het startlicht (rood, rood, rood, groen);
//  3. de drie nieuwe binnensets (kroeg, woonkamer, garage) om de speler;
//  4. de finish-cinematic (raceFinishScene) via de echte playScript, drie stills.
// Raakt geen missie en geen opslag; alles gaat er na elke opname weer af. Beoordeel: staat het publiek op de grond en nooit in
// water, gebouw of op de weg; kijkt en juicht het mee als je langsloopt; zijn de kamers dicht en passen speler en figuren;
// blijft de finishwagen op de weg en loopt niemand erdoorheen.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const frames = async (secs, fn) => { let t = 0, last = performance.now(); while (t < secs) { await new Promise((r) => requestAnimationFrame(r)); const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt; if (fn) fn(dt, t); } };
const out = { fouten: [], standen: 0 };
const world = window.__debug && window.__debug.world;
const p = world && world.player;
if (!p) { out.fouten.push('geen speler'); return JSON.stringify({ results: { publiek: out } }); }
const M = await import('/js/missiedecor.js');
const RD = await import('/js/racedecor.js');
const SS = await import('/js/stagesets.js');
const CT = await import('/js/cinetemplates.js');
const CS = await import('/js/cutscenehost.js');
const ahead = (d) => ({ x: p.x + Math.cos(p.angle) * d, y: p.y + Math.sin(p.angle) * d });

// 1. de dressingplannen
for (const kind of ['plein', 'stuntarena', 'kade', 'perron']) {
  const a = ahead(12);
  const set = M.buildMissionDressing(world, kind, { x: a.x, y: a.y, a: p.angle }, null);
  if (!set) { out.fouten.push(`${kind}: geen aankleding`); continue; }
  if (!set.crowd || set.crowd.members.length < 8) out.fouten.push(`${kind}: geen publiek`);
  await frames(3, (dt) => M.updateMissionDressing(set, dt));
  out.standen++;
  console.log(`[capture] publiek-${kind}`);
  await sleep(500);
  M.disposeMissionDressing(set);
}

// 2. een checkpointrace: start en finish 90 m uit elkaar
{
  const s = ahead(10), e = ahead(100);
  const h = RD.buildCheckpointRaceDecor(world, [[s.x, s.y], [e.x, e.y]], { key: 'beeld:race' });
  if (!h) out.fouten.push('checkpointrace: geen decor');
  else {
    let t = 0;
    for (const stand of [1.0, 2.0, 9.0]) {
      RD.setStartLights(h.lights, stand);
      await frames(1.2, (dt) => { t += dt; RD.updateCheckpointRaceDecor(h, dt, p, null); });
      out.standen++;
      console.log(`[capture] race-startlicht-${stand}`);
      await sleep(400);
    }
    RD.disposeCheckpointRaceDecor(h);
  }
}

// 3. de binnensets (de speler blijft staan; de stap houdt hem vast)
for (const kind of ['kroeg', 'woonkamer', 'garage']) {
  const set = SS.buildStageSet(world, kind, p);
  if (!set) { out.fouten.push(`${kind}: geen kamer (past niet op deze plek?)`); continue; }
  await frames(3, (dt) => SS.updateStageSet(set, dt));
  out.standen++;
  console.log(`[capture] kamer-${kind}`);
  await sleep(500);
  SS.disposeStageSet(set);
}

// 4. de finish-cinematic op een route recht voor de speler (de weg-snap zet het voertuig op de echte weg als die er is)
{
  const s = ahead(20), e = ahead(110);
  const fin = CT.raceFinishScene([[s.x, s.y], [e.x, e.y]], { id: 'beeld.finish', speed: 14 });
  const ok = fin && CS.playScript(world, fin.def, { lines: [], duration: fin.def.duration, anchor: fin.anchor, cine: { id: 'beeld.finish' } });
  if (!ok) out.fouten.push('finishscene startte niet');
  else for (const t of [2.5, 5.0, 8.0]) {
    await sleep(2500);
    out.standen++;
    console.log(`[capture] finish-${t}`);
  }
  await sleep(Math.max(0, ((fin && fin.def.duration) || 0) * 1000 - 7500) + 800);
}
console.log(`[publiek] standen ${out.standen}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: { publiek: out } });
