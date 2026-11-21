// node sum.mjs <prefix>... : per run avg, warm fps, first four scenes, long frames, longtasks, heap, tile work; median per prefix
import fs from 'node:fs';
import { rd, perShot } from './an.mjs';
const med = (a) => { const b = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : NaN; };
for (const pre of process.argv.slice(2)) {
  const tags = fs.readdirSync('out').filter((f) => f.startsWith(pre) && f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  const rows = [];
  for (const t of tags) {
    const j = rd(t); if (!j.ok) continue;
    const p = perShot(j);
    const tq = j.tq ? JSON.parse(j.tq) : null;
    const sc = (i) => { const s = p.shots.find((x) => x.label.startsWith(['Zonsopgang', 'Terrassen', 'Noorderplantsoen', 'Tessa'][i])); return s ? s.fps : NaN; };
    rows.push({ t, avg: j.avg, warm: p.warm.fps, z: sc(0), v: sc(1), n: sc(2), te: sc(3), o50: p.warm.over50, o100: p.warm.over100, a50: p.all.over50, lt: j.longtasks, heap: j.heapPeak, addMs: tq ? tq.byKind.add.ms : NaN, adds: tq ? tq.byKind.add.n : NaN });
    const r = rows[rows.length - 1];
    console.log(t.padEnd(16), `avg ${r.avg.toFixed(1)} warm ${r.warm.toFixed(1)} | zon ${r.z.toFixed(1)} vis ${r.v.toFixed(1)} noord ${r.n.toFixed(1)} tessa ${r.te.toFixed(1)} | warm>50 ${r.o50} >100 ${r.o100} | all>50 ${r.a50} | lt ${r.lt} heap ${r.heap} | adds ${r.adds} ${Math.round(r.addMs)} ms`);
  }
  if (rows.length) console.log(`MEDIAAN ${pre} (n=${rows.length})`.padEnd(16), ['avg', 'warm', 'z', 'v', 'n', 'te', 'o50', 'o100', 'a50', 'lt', 'heap', 'addMs'].map((k) => `${k} ${med(rows.map((r) => r[k])).toFixed(1)}`).join(' | '));
}
