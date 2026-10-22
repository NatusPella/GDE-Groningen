// Schrijft de argumenten voor de slotkaart (shots/gameplay.page.js s99-titel): de eerlijke regel "Gebouwd met AI in N dagen. Gestuurd door mensen." met N uit het cijferblad.
//   node scripts/trailer/plans/titel_args.mjs --out=<sub.json>
import fs from 'node:fs';
import { loadCijfers } from './cijfers.mjs';
const out = (process.argv.find((a) => a.startsWith('--out=')) || '--out=sub.json').slice(6);
const dagen = loadCijfers().get('git.kalenderdagen').tekst;
fs.writeFileSync(out, JSON.stringify({ sub: `Gebouwd met AI in ${dagen} dagen. Gestuurd door mensen.` }));
console.log(out, dagen);
