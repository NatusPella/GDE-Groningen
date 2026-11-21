import fs from 'node:fs';
import { rd, perShot } from './an.mjs';
const tags = fs.readdirSync('.pb/out').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
for (const t of tags) {
  let j; try { j = rd(t); } catch (e) { continue; }
  if (!j.ok) { console.log('|', t, '| geen resultaat |'); continue; }
  let w = '- | - | -';
  if (j.bfr) { const p = perShot(j); w = `${p.warm.fps.toFixed(1)} | ${p.warm.over50} | ${p.warm.over100}`; }
  console.log(`| ${t.slice(0, 40)} | ${j.avg.toFixed(1)} | ${w} | ${j.longtasks} | ${j.heapPeak} |`);
}
