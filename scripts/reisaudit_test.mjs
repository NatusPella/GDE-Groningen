// Travel-jump audit over the whole new arc (#97, #219, #93):  node scripts/reisaudit_test.mjs
// For every mission step of acts 2-5 the start of the def is compared with the start of the step before it
// (the nearest thing to "where the last step ended" without driving it). A jump over 6.5 km needs a travel beat
// in reisbeats.js (or the step is a travel step T1-T4 itself). Report-only lines say which regions the acts use.
import './node3d.mjs';
import fs from 'node:fs';

const { STEPS, NEW_MISSION_IDS } = await import('../game/js/storyarc_nieuw.js');
const { REISBEATS } = await import('../game/js/reisbeats.js');
const { needsBeat } = await import('../game/js/reistijd.js');
const { MISSION_IDS } = await import('../game/js/storyarc.js');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');
const root = new URL('../game/', import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const data = await loadStadData({ extras: true });
const map = new GameMap(data);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const spot = (x, y) => ({ x, y, road: null });
const models = { tractor: { name: 'tractor' }, quad: { name: 'quad' } };
const all = buildNieuwDefs({ map, walk: spot, drive: spot, models });
const defs = all;
const byId = new Map(NEW_MISSION_IDS.map((id, i) => [id, all[i]]));

const startOf = (st) => {
  if (st.kind === 'mission') { const d = byId.get(st.mission); return d && d.start ? { x: d.start.x, y: d.start.y } : null; }
  return null;
};
const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / 1000;
let prev = null, checked = 0;
for (const st of STEPS) {
  if (!st.built) continue;
  const p = startOf(st);
  if (!p) { prev = null; continue; }
  if (prev && prev.p) {
    const d = km(prev.p, p);
    checked++;
    if (needsBeat(d * 1000)) ok(!!REISBEATS[st.id] || st.id.startsWith('T'), `${prev.id} -> ${st.id}: ${d.toFixed(1)} km jump has a travel beat`);
  }
  prev = { id: st.id, p };
}
ok(checked >= 1, 'at least one consecutive pair measured', checked);
console.log(`${n - fails}/${n} reisaudit (${checked} sprongen gemeten, ${defs.length} defs)`);
process.exit(fails ? 1 : 0);
