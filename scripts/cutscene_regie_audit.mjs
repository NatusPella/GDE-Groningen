// Regie-audit van alle geregisseerde scènes zonder wereld (docs/CUTSCENE-ISSUES-23-11.md): personages die in een voertuig of in
// elkaar staan, een camera binnen een figuur, sprekers die van hun gesprekspartner wegkijken en dekplekken op een boot die
// onder het dak of buiten de romp vallen.
//   node scripts/cutscene_regie_audit.mjs [--json] [--strict] [--top=30] [id-filter]
// --strict: uitgang 1 als er een vondst overblijft die niet in ALLOW staat.
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../game/js/cutpreview.js';
import { propFoot } from '../game/js/cutscenemodels.js';
import { deckPlan, spotIssues, canopyOf } from '../game/js/boatdeck.js';
import { quickScene } from '../game/js/cutscenes_akte1.js';
import { BOAT_KINDS } from '../game/js/boattypes.js';

const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
const ANCHOR = { x: 500, y: -300, facing: 1.1, z: 0 };
const args = process.argv.slice(2);
const top = Number((args.find((a) => a.startsWith('--top=')) || '--top=40').slice(6));
const filter = args.find((a) => !a.startsWith('--')) || '';
const STEP = 0.2;
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
// bewuste uitzonderingen: 'scene|soort|sleutel' met de reden
export const ALLOW = {
  // beoordeeld 23-11: bewust weg van de vorige spreker
  'M08.intro|spreker-wegkijkend': 'Tammo praat door de telefoon met oma Trijntje; zij staat niet in de scène',
  'M01.5|spreker-wegkijkend': 'Jelmer leest de chat van zijn stream voor van zijn telefoon',
  'M10.intro|spreker-wegkijkend': 'Tessa roept Tammo toe terwijl ze wegrent naar de quad ("Op de quad, Tammo. Nu.")',
  'M15.outro|spreker-wegkijkend': 'de jurylid zegt "Ik stap eruit" terwijl hij wegloopt',
};

// ligt (x, y) in de voetafdruk van een prop (lengte, breedte, +x naar voren, om het midden)?
function insideFoot(pr, x, y, margin = 0) {
  const f = propFoot(pr.kind);
  if (!f) return false;
  const dx = x - pr.x, dy = y - pr.y, c = Math.cos(-pr.a), s = Math.sin(-pr.a);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) < f[0] / 2 - margin && Math.abs(ly) < f[1] / 2 - margin && (pr.h || 0) < 0.3;
}
const VEHICLE = new Set(['auto', 'bestelbus', 'bakkie', 'trekker', 'politie', 'frituuraanhanger', 'snackwagen', 'tankwagen', 'limo', 'container', 'kantoorwagen', 'botsauto']);

const cat = buildCatalog({ script, npcSource }).filter((e) => e.scene && e.duration > 0 && (!filter || e.id.startsWith(filter)));
const found = [];
const add = (id, kind, severity, text) => found.push({ id, kind, severity, text });
for (const e of cat) {
  const sc = e.scene;
  const seen = {};
  const speakFacing = {};
  const ids = Object.keys(sc.sample(0, ANCHOR).actors);
  const sit = {}; // een acteur die ooit zit of rijdt hoort in een voertuig
  // wie spreekt wie aan: de acteur van een sprekernaam, en per regel de vorige (of volgende) andere spreker
  const actorOf = (name) => Object.entries((e.def && e.def.actors) || {}).find(([, d]) => [].concat(d.speaker || []).includes(name))?.[0] || null;
  const lineActors = e.lines.map((l) => actorOf(l.speaker));
  const addresseeAt = (t, me) => {
    let li = -1;
    e.lines.forEach((l, i) => { if (l.at <= t) li = i; });
    for (let i = li - 1; i >= 0; i--) if (lineActors[i] && lineActors[i] !== me) return lineActors[i];
    for (let i = li + 1; i < e.lines.length; i++) if (lineActors[i] && lineActors[i] !== me) return lineActors[i];
    return null;
  };
  for (let t = 0; t < e.duration; t += STEP) {
    const s = sc.sample(t, ANCHOR);
    const vis = ids.map((id) => [id, s.actors[id]]).filter(([, a]) => a && a.visible !== false);
    for (const [id, a] of vis) {
      if (a.sit > 0 || a.anim === 'ride') sit[id] = true;
      const nearest = vis.filter(([o]) => o !== id).map(([o, b]) => [o, b, Math.hypot(b.x - a.x, b.y - a.y)]).sort((p, q) => p[2] - q[2])[0];
      if (nearest && nearest[2] < 0.38 && !(a.sit > 0) && !(nearest[1].sit > 0) && !a.carrying && !nearest[1].carrying) {
        const key = `overlap:${[id, nearest[0]].sort().join('+')}`;
        (seen[key] ??= { n: 0, t0: t, d: nearest[2] }).n++;
      }
      // in een voertuig staan zonder erin te zitten of erop te rijden
      for (const [pid, pr] of Object.entries(s.props)) {
        if (!VEHICLE.has(pr.kind) || pr.visible === false || !insideFoot(pr, a.x, a.y, 0.25)) continue;
        if (a.sit > 0 || a.anim === 'ride' || (a.h || 0) > 0.5) continue;
        const key = `invehicle:${id}@${pid}`;
        (seen[key] ??= { n: 0, t0: t, kind: pr.kind }).n++;
      }
      // de spreker kijkt van zijn gesprekspartner weg: het hoofd (lijf plus blik) staat meer dan 75 graden van wie hij aanspreekt
      // (de vorige andere spreker, anders de volgende, anders de dichtstbijzijnde figuur)
      if (a.speaking) {
        const to = addresseeAt(t, id);
        const b = to && s.actors[to] && s.actors[to].visible !== false ? s.actors[to] : nearest && nearest[1];
        const toId = to && s.actors[to] && s.actors[to].visible !== false ? to : nearest && nearest[0];
        const d = b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
        if (b && d > 0.5 && d < 9) {
          const want = Math.atan2(b.y - a.y, b.x - a.x);
          const off = Math.abs(angDiff(a.a + (a.gaze || 0), want));
          const k = speakFacing[id] ??= { n: 0, away: 0, to: toId, t0: null };
          k.n++; if (off > 1.3) { k.away++; if (k.t0 == null) k.t0 = t; k.to = toId; }
        }
      }
    }
    // de camera in een figuur
    const c = s.camera.position;
    for (const [id, a] of vis) {
      if (Math.hypot(a.x - c.x, a.y - c.y) < 0.35 && c.z > (a.h || 0) + 0.1 && c.z < (a.h || 0) + 1.9 && !a.carrying) {
        const key = `camera-in-actor:${id}`;
        (seen[key] ??= { n: 0, t0: t }).n++;
      }
    }
    for (const [pid, pr] of Object.entries(s.props)) {
      if (pr.visible === false || !VEHICLE.has(pr.kind) || !insideFoot(pr, c.x, c.y, 0.1)) continue;
      if (c.z > (pr.h || 0) + (propFoot(pr.kind)[2] || 1.5) + 0.2) continue;
      (seen[`camera-in-prop:${pid}`] ??= { n: 0, t0: t, kind: pr.kind }).n++;
    }
  }
  for (const [k, v] of Object.entries(seen)) {
    const secs = v.n * STEP;
    if (k.startsWith('overlap') && secs >= 0.6) add(e.id, 'overlap', secs > 3 ? 3 : 2, `${k.slice(8)} staan ${secs.toFixed(1)} s in elkaar (vanaf ${v.t0.toFixed(1)} s, ${v.d.toFixed(2)} m)`);
    else if (k.startsWith('invehicle') && secs >= 0.4) add(e.id, 'in-voertuig', 3, `${k.slice(10)} (${v.kind}) staat ${secs.toFixed(1)} s binnen de romp (vanaf ${v.t0.toFixed(1)} s)`);
    else if (k.startsWith('camera-in-actor') && secs >= 0.2) add(e.id, 'camera-in-figuur', 3, `camera binnen ${k.slice(16)} ${secs.toFixed(1)} s (vanaf ${v.t0.toFixed(1)} s)`);
    else if (k.startsWith('camera-in-prop') && secs >= 0.2) add(e.id, 'camera-in-voertuig', 3, `camera in ${v.kind} ${k.slice(15)} ${secs.toFixed(1)} s (vanaf ${v.t0.toFixed(1)} s)`);
  }
  for (const [id, k] of Object.entries(speakFacing)) {
    const share = k.away / Math.max(1, k.n);
    if (k.away * STEP >= 1.2 && share > 0.45) add(e.id, 'spreker-wegkijkend', share > 0.8 ? 2 : 1, `${id} praat ${(k.away * STEP).toFixed(1)} s van ${k.to} af (vanaf ${k.t0.toFixed(1)} s, ${Math.round(share * 100)}% van zijn spreektijd)`);
  }
}

// de plekken van het paar op elke boot (quickScene, het dek van missionstory.js boatStage): onder het dak, buiten de romp, camera boven het dak
const boatFound = [];
const SAMPLE_LINES = [{ speaker: 'Tammo', text: 'Kijk, de toren.', at: 0.6, dur: 2.2 }, { speaker: 'Anita', text: 'Ik zie hem al.', at: 3.2, dur: 2.2 }, { speaker: 'Tammo', text: 'Mooi, hè?', at: 6, dur: 2 }, { speaker: 'Anita', text: 'Heel mooi.', at: 8.6, dur: 2 }];
for (const [kind, model] of Object.entries(BOAT_KINDS)) {
  const plan = deckPlan(model);
  const sc = quickScene(SAMPLE_LINES, { deck: plan.mode === 'stand' ? true : plan.mode, plan });
  const scene = sc && (await import('../game/js/cutscript.js')).compileScene(sc, { lines: SAMPLE_LINES, duration: 11 });
  if (!scene) { boatFound.push({ kind, issue: 'geen dekscène' }); continue; }
  // de scène in de boot-lokale ruimte: anker op het plan (x) met de blik naar de boeg (bank) of dwars (staand)
  const facing = plan.mode === 'stand' ? Math.PI / 2 : 0;
  const roof = canopyOf(model);
  const issues = new Set();
  for (let t = 0; t < 11; t += 0.25) {
    const s2 = scene.sample(t, { x: plan.x, y: 0, facing, z: 0 });
    const spots = Object.values(s2.actors).filter((a) => a.visible !== false).map((a) => ({ x: a.x, z: -a.y, h: a.h || 0, sit: a.sit || 0 }));
    for (const m of spotIssues(model, spots)) issues.add(m);
    const c = s2.camera.position;
    if (roof && c.x > roof.x0 && c.x < roof.x1 && c.z + plan.floor > roof.y - 0.05 && c.z + plan.floor < roof.y + 1.5) issues.add(`de camera hangt in het dak op x=${c.x.toFixed(1)}, hoogte ${(c.z + plan.floor).toFixed(2)} m`);
  }
  for (const m of issues) boatFound.push({ kind, issue: m });
}
const bad = found.filter((f) => !ALLOW[`${f.id}|${f.kind}`]);
bad.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
if (args.includes('--json')) console.log(JSON.stringify({ found: bad, boat: boatFound }, null, 1));
else {
  console.log(`cutscene_regie_audit: ${cat.length} scenes, ${bad.length} vondsten (${bad.filter((f) => f.severity >= 3).length} ernstig)`);
  const byKind = {};
  for (const f of bad) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
  console.log('  ' + Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(', '));
  for (const f of bad.slice(0, top)) console.log(`  [${f.severity}] ${f.id.padEnd(22)} ${f.kind.padEnd(20)} ${f.text}`);
  for (const b of boatFound) console.log(`  [boot] ${b.kind}: ${b.issue}`);
}
if (args.includes('--boot-strict') && boatFound.length) process.exit(1);
if (args.includes('--strict') && (bad.length || boatFound.length)) process.exit(1);
