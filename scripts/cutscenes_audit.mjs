// Kritische audit van alle geregisseerde scènes zonder wereld (#136, #209):
//   node scripts/cutscenes_audit.mjs [--strict] [id-filter]
// Per scène: spreker niet in beeld, camera in een acteur of prop, overlappende acteurs,
// camerahoogte. Botsing met gebouwen vraagt de wereld en staat hier niet in.
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../game/js/cutpreview.js';

const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
const ANCHOR = { x: 500, y: -300, facing: 1.1, z: 0 };
const args = process.argv.slice(2), strict = args.includes('--strict'), filter = args.find((a) => !a.startsWith('--'));

export function auditEntry(e) {
  const out = [];
  if (!e.scene) return out;
  const runs = [], cur = new Map();
  const note = (key, t, msg) => {
    const r = cur.get(key);
    if (r && t - r.t1 <= 0.45) r.t1 = t;
    else { const n = { t0: t, t1: t, msg }; cur.set(key, n); runs.push(n); }
  };
  let offSince = null, offActor = null;
  for (let t = 0; t <= e.duration; t += 0.2) {
    const s = e.scene.sample(t, ANCHOR), c = s.camera, p = c.position, l = c.lookAt;
    if (p.z - ANCHOR.z < 0.35 || p.z - ANCHOR.z > 9) note('hoogte', t, `camerahoogte ${(p.z - ANCHOR.z).toFixed(1)} m`);
    const fx = l.x - p.x, fy = l.y - p.y, fz = l.z - p.z, fl = Math.hypot(fx, fy, fz) || 1;
    const vis = Object.entries(s.actors).filter(([, a]) => a.visible !== false);
    for (const [id, a] of vis) {
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d < 0.55 && p.z - ANCHOR.z < 2.2) note('in-acteur:' + id, t, `camera zit in ${id}`);
    }
    for (const [id, q] of Object.entries(s.props)) {
      if (q.visible === false || vis.some(([, a]) => a.carrying === id)) continue;
      if (Math.hypot(q.x - p.x, q.y - p.y) < 0.5 && p.z - ANCHOR.z < (q.h || 0) + 1.2) note('in-prop:' + id, t, `camera zit in prop ${id}`);
    }
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const [ia, a] = vis[i], [ib, b] = vis[j];
      if (a.anim === 'ride' || b.anim === 'ride' || a.sit || b.sit) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 0.3) note('overlap:' + ia + ':' + ib, t, `${ia} en ${ib} staan in elkaar`);
    }
    const sp = s.speakerActor && s.actors[s.speakerActor];
    if (sp && sp.visible !== false) {
      const vx = sp.x - p.x, vy = sp.y - p.y, vz = 1.6 + (sp.h || 0) + ANCHOR.z - p.z, vl = Math.hypot(vx, vy, vz) || 1;
      const cos = (fx * vx + fy * vy + fz * vz) / (fl * vl);
      const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
      const half = Math.atan(Math.tan(c.fov * Math.PI / 360) * 16 / 9) * 180 / Math.PI;
      if (ang > half) { if (offSince == null) { offSince = t; offActor = s.speakerActor; } if (t - offSince >= 1.4) note('spreker-buiten:' + offActor + ':' + offSince, t, `spreker ${offActor} niet in beeld (${ang.toFixed(0)}° naast de as)`); }
      else offSince = null;
    } else offSince = null;
  }
  for (const r of runs) out.push(`${r.t0.toFixed(1)}-${r.t1.toFixed(1)} s: ${r.msg}`);
  return out;
}

const cat = buildCatalog({ script, npcSource }).filter((e) => !filter || e.id.includes(filter));
let total = 0;
for (const e of cat) {
  const f = auditEntry(e);
  total += f.length;
  if (f.length) console.log(`${e.id} (${e.duration.toFixed(0)} s)\n  ` + f.join('\n  '));
}
console.log(`cutscenes_audit: ${cat.length} scènes, ${total} bevindingen`);
process.exit(strict && total ? 1 : 0);
