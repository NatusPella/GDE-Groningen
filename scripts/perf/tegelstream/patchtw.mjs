// harness only: expose the TileWorld as window.__tw in the staged copy
import fs from 'node:fs';
import path from 'node:path';
const B = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
for (const v of process.argv.slice(2)) {
  const f = path.join(B, 's' + v, 'game', 'js', 'tileworld.js');
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('__tw')) { console.log(v, 'tw already'); continue; }
  const m = '  attachStore(store) {\n    this.store = store;';
  if (!s.includes(m)) { console.log(v, 'tw NO MATCH'); continue; }
  fs.writeFileSync(f, s.replace(m, m + '\n    window.__tw = this;')); console.log(v, 'tw patched');
}
