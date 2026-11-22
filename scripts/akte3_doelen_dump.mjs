// Hulpscript voor akte3_plekken_test: schrijft de start, de doelen en de waypoints van de akte-3-missies als lat/lon naar een bestand.
//   node scripts/akte3_doelen_dump.mjs <uitvoer.json>
// Zwaar (laadt de stadsdata zoals akte3_test); de plekkentest zelf leest alleen het resultaat.
import fs from 'node:fs';
import './node3d.mjs';
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const M = await import('../game/js/missions.js');
const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const { MISSION_IDS } = await import('../game/js/storyarc.js');
const { worldToWgs } = await import('../game/js/rdnew.js');
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
const world = { map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [] };
M.initMissions(world);
const defs = M.getMissionDefs();
const out = [];
const put = (id, soort, p) => { if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { const [lat, lon] = worldToWgs(p.x, p.y); out.push({ id, soort, lat, lon }); } };
for (const s of STEPS.filter((q) => q.part === 'staart' && q.kind === 'mission' && q.built)) {
  const def = defs[MISSION_IDS.indexOf(s.mission)];
  if (!def) continue;
  put(s.id, 'start', def.start);
  for (const [j, st] of (def.stages || []).entries()) {
    if (st.target) put(s.id, `fase ${j} ${st.kind}`, M.resolveMissionTarget(world, st.target, def.start));
  }
  for (const [j, w] of (def.waypoints || []).entries()) put(s.id, `waypoint ${j}`, w);
  const heist = (def.stages || []).length;
  out.push({ id: s.id, soort: 'info', fasen: heist, voertuig: !!def.vehicle });
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(`akte3_doelen_dump: ${out.length} punten`);
