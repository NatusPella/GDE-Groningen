// Balans-audit voor de UX-top100-punten 6 (moeilijkheidssprongen), 10 (dominante
// optie) en 13 (burden of optimal play). Geen test en geen wijziging: dit maakt de
// missiecurve en de replay-verhouding meetbaar voor ontwerp en playtest.
//   node scripts/missiebalans_audit.mjs
// Vereist de OSM-provinciecache (data/cache) zoals de andere wereldscripts; zonder
// cache slaat hij netjes over.
import '../scripts/node3d.mjs';
const { GameMap } = await import('../game/js/mapdata.js');
const { loadStadData } = await import('./lib/loadworld.mjs');
const M = await import('../game/js/missions.js');
const { stageCounts } = await import('../game/js/missioncurve.js');

let data;
try { data = await loadStadData({ extras: true }); }
catch (e) { console.log('SKIP missiebalans_audit: geen OSM-provinciecache (data/cache)'); process.exit(0); }
const map = new GameMap(data);
const world = { map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [] };
M.initMissions(world);
const defs = M.getMissionDefs();
const list = M.getMissionList();
const scenery = new Set(['scene', 'plan', 'shot', 'choice']);
const challenge = new Set(['hold', 'timing', 'chase', 'boatchase', 'escape', 'laser', 'crack', 'lock', 'fuse', 'bake', 'vault', 'pickpocket', 'heli']);
const codeNum = (c) => Number(String(c || '').replace(/\D/g, '')) || 999;
const rows = [];
for (const m of list) {
  const d = defs[m.index]; if (!d) continue;
  const c = stageCounts(d);
  rows.push({
    code: m.code || '', label: m.label, play: c.playable, branch: c.branch,
    challenge: c.challenge, timed: c.timed,
    reward: d.reward || 0, klus: m.klusloon || 0,
  });
}
for (const r of rows) r.perPlay = r.play ? +(r.klus / r.play).toFixed(1) : null;

const story = rows.filter((r) => /^M\d+$/.test(r.code)).sort((a, b) => codeNum(a.code) - codeNum(b.code));
console.log('=== verhaalvolgorde: speelbare en uitdagende stappen (>=8 of >=4 is lang/uitdagend) ===');
for (const r of story) {
  if (r.play >= 8 || r.challenge >= 4) console.log(`${r.code} ${r.label}: ${r.play} speelbaar, ${r.challenge} uitdagend, ${r.timed} met tijd`);
}
console.log('\n=== sprongen in speelbare stappen (>=5) ===');
for (let i = 1; i < story.length; i++) {
  const d = Math.abs(story[i].play - story[i - 1].play);
  if (d >= 5) console.log(`${story[i - 1].code} (${story[i - 1].play}) -> ${story[i].code} (${story[i].play}): sprong ${d}`);
}
console.log('\n=== klusloon per speelbare stap (hoog/laag) ===');
const betaald = rows.filter((r) => r.klus > 0 && r.play > 0).sort((a, b) => b.perPlay - a.perPlay);
for (const r of [...betaald.slice(0, 6), ...betaald.slice(-4)]) console.log(`${r.code || '?'} ${r.label}: €${r.klus} / ${r.play} speelbaar = €${r.perPlay}`);
console.log('\nLet op: één stap kan een lange activiteit zijn (heli, boatchase); gebruik dit als startpunt voor een playtest, niet als eindvonnis.');
