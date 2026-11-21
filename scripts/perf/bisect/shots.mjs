import { rd, perShot } from './an.mjs';
const tags = process.argv.slice(2);
const ps = tags.map((t) => perShot(rd(t)));
const labels = ps[0].shots.map((s) => s.label);
console.log('| scène | ' + tags.join(' | ') + ' |');
console.log('|---|' + tags.map(() => '---|').join(''));
labels.forEach((l, i) => console.log(`| ${l} | ` + ps.map((p) => { const s = p.shots.find((x) => x.label === l); return s && s.n ? `${s.fps.toFixed(1)} (${s.over50}/${s.over100})` : '-'; }).join(' | ') + ' |'));
