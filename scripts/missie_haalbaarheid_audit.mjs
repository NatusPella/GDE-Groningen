// Haalbaarheidsaudit van de missies (moeilijkheid, besluit eigenaar 22-11): vergelijkt elke tijdslimiet en medailletijd met wat een
// foutloze run al kost: de scènes en gesprekken (duur uit script.json en de stem-manifesten), de wachttijden en de reistijd tussen
// de doelen. Het hoofdpad moet altijd haalbaar zijn, ook op Uitdagend; een strakke medaille mag, maar niet onder dat minimum.
// Aanleiding: het Loket (M03) eiste binnen 1:00 terwijl de gesprekken zelf ca. twee minuten duren.
//   node scripts/missie_haalbaarheid_audit.mjs [--json] [--quiet] [--dump=<bestand>] [--from=<bestand>]
// --dump schrijft de ingelezen missies (zonder wereld opnieuw te laden) weg; --from rekent daar opnieuw op (seconden in plaats van minuten).
// Regels en marges: scripts/lib/missie_haalbaarheid.mjs. Zonder OSM-provinciecache (de wereld voor de reistijd) sluit hij af met SKIP.
import fs from 'node:fs';
import './node3d.mjs';
import { judgeMission, minSeconds } from './lib/missie_haalbaarheid.mjs';

const { GameMap } = await import('../game/js/mapdata.js');
const { loadStadData } = await import('./lib/loadworld.mjs');
const M = await import('../game/js/missions.js');
const { MISSION_GOALS } = await import('../game/js/achievements.js');

const json = process.argv.includes('--json');
const quiet = process.argv.includes('--quiet');
const root = new URL('../', import.meta.url);

// scènes en stemduur
const script = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const scenes = Object.fromEntries(script.scenes.map((s) => [s.id, s]));
const manifests = {};
for (const m of ['story', 'lines', 'banter']) {
  const p = new URL(`game/audio/voicelines/${m}/manifest.json`, root);
  manifests[m] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}
const voiceOf = (l) => {
  const v = !l.textOnly && l.rec && manifests[l.rec] && manifests[l.rec][(l.voice || l.speaker) + '|' + l.text];
  return v && v.dur ? v.dur : 0;
};

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
let inputs;
if (arg('from')) inputs = JSON.parse(fs.readFileSync(arg('from'), 'utf8'));
else {
  const data = await loadStadData({ extras: true });
  const map = new GameMap(data);
  const world = { map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [] };
  M.initMissions(world);
  const defs = M.getMissionDefs();

  // de reisbenen: start -> doelen van de stappen (of waypoints en bestemming bij een rit)
  function legsOf(def) {
    const legs = [];
    let at = def.start;
    const car = def.vehicle === 'car' || def.type === 'deliver';
    const boat = def.type === 'boat';
    // het tempo van de hoofdlijn: een fiets, te voet, een boot of de auto van de missie
    const base = boat ? 'boat' : def.ride === 'bike' ? 'bike' : def.onFoot ? 'foot' : car ? 'vehicle' : 'foot';
    const go = (p, mode) => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !at) { if (p && Number.isFinite(p.x)) at = p; return; }
      legs.push({ dist: Math.hypot(p.x - at.x, p.y - at.y), mode });
      at = p;
    };
    const staged = (def.stages || []).some((s) => s.target);
    if (!staged) {
      for (const w of def.waypoints || []) go(w, base);
      if (def.dest) go(def.dest, base);
    }
    for (const st of def.stages || []) {
      if (!st.target || st.kind === 'scene') continue;
      if (st.target.storyBoat || st.target.skutsje || st.target.rental || st.target.route || st.target.shore || st.target.heistSpot) continue;
      let p = null;
      try { p = M.resolveMissionTarget(world, st.target, at || def.start); } catch (e) { p = null; }
      go(p, st.mode === 'vehicle' || st.kind === 'garage' ? 'vehicle' : base);
    }
    return legs;
  }

  inputs = [];
  for (const [i, def] of defs.entries()) {
    if (def.retired) continue; // gepensioneerde slots (de goals in achievements.js zijn verouderd)
    const hasClock = Number.isFinite(def.timeLimit) && def.timeLimit > 0;
    const goals = MISSION_GOALS[i] || null;
    if (!hasClock && !def.medalTime && !goals) continue;
    inputs.push({
      index: i, id: def.id || '', label: def.label, goals,
      def: { timeLimit: def.timeLimit ?? null, medalTime: def.medalTime ?? null, checkpointBonus: def.checkpointBonus ?? 0,
        waypoints: (def.waypoints || []).map((w) => ({ via: !!w.via, bonus: w.bonus })),
        stages: (def.stages || []).map((st) => ({ kind: st.kind, script: st.script ? { ids: st.script.ids, from: st.script.from, to: st.script.to } : undefined, time: st.time, lines: Array.isArray(st.lines) ? st.lines : undefined })) },
      legs: legsOf(def),
    });
  }
  if (arg('dump')) fs.writeFileSync(arg('dump'), JSON.stringify(inputs));
}

const rows = [];
for (const q of inputs) {
  const ctx = { scenes, voiceOf, legs: q.legs };
  const m = minSeconds(q.def, ctx);
  const issues = judgeMission(q.def, q.goals, ctx);
  rows.push({ index: q.index, id: q.id, label: q.label, timeLimit: q.def.timeLimit, medalTime: q.def.medalTime, gold: q.goals ? q.goals.gold : null, silver: q.goals ? q.goals.silver : null, min: Math.round(m.total), fixed: Math.round(m.fixed), travel: Math.round(m.travel), issues });
}

if (json) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
let bad = 0;
for (const r of rows) {
  if (!quiet) console.log(`${r.id || r.index} ${r.label}: minimum ${r.min} s (${r.fixed} scènes en wachten, ${r.travel} reizen); limiet ${r.timeLimit ?? '-'}, medailletijd ${r.medalTime ?? '-'}, goud/zilver ${r.gold ?? '-'}/${r.silver ?? '-'}`);
  for (const q of r.issues) { bad++; console.log(`PROBLEEM ${r.id || r.index} ${r.label}: ${q.tekst}; voorstel ${q.voorstel} s`); }
}
console.log(`missie_haalbaarheid_audit: ${rows.length} missies met een klok of medailletijd, ${bad} afwijkingen`);
process.exit(bad ? 1 : 0);
