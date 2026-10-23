// keuzewerk.js: de keuzebanen (Loket, StudieStaat, Vigilantia, Promotie, Kamerkoning, Wolkenhal, Helix, Niemeyer, Bernard, Energielabel).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as K from '../game/js/keuzewerk.js';

let n = 0, bad = 0;
const check = (name, ok, extra) => { n++; if (!ok) { bad++; console.log('FAIL', name, extra || ''); } };

check('ten jobs', K.KEUZE_IDS.join() === 'loket,studiestaat,vigilantia,promotie,kamerkoning,wolkenhal,helix,niemeyer,bernard,energielabel');
check('every job has its own building (two jobs on one spot start only the nearest)', new Set(K.KEUZE_IDS.map((id) => K.KEUZE_JOBS[id].building)).size === K.KEUZE_IDS.length);
const texts = [];
for (const id of K.KEUZE_IDS) {
  const j = K.KEUZE_JOBS[id];
  check(`${id}: enough cases`, j.cases.length >= 5);
  check(`${id}: three verdicts`, j.verdicts.length === 3);
  for (const c of j.cases) {
    check(`${id}: two wrong answers per case`, c.wrong.length === 2 && !c.wrong.includes(c.right), c.q);
    texts.push(c.q, c.right, ...c.wrong);
  }
  texts.push(j.name, j.boss, j.blurb, j.tagline, ...j.intro, ...Object.values(j.say), ...j.verdicts);
  for (let seed = 1; seed <= 20; seed++) {
    const r = K.pickKeuzeRound(id, seed);
    check(`${id}: round has 3 questions, one right each`, r.length === 3 && r.every((q) => q.options.length === 3 && q.options.filter((o) => o.ok).length === 1));
    check(`${id}: distinct questions`, new Set(r.map((q) => q.q)).size === 3);
  }
  const a = K.pickKeuzeRound(id, 7), b = K.pickKeuzeRound(id, 7, a.map((q) => q.q));
  check(`${id}: next round avoids last questions`, b.every((q) => !a.some((x) => x.q === q.q)));
  const p = [0, 1, 2, 3].map((r) => K.keuzePay(id, r));
  check(`${id}: pay rises with right answers`, p[0].base < p[1].base && p[1].base < p[2].base && p[2].base < p[3].base);
  check(`${id}: only a full round is flawless and tipped`, p[3].flawless && p[3].tip > 0 && !p[2].flawless && p[2].tip === 0);
  check(`${id}: a failed round still pays`, p[0].base > 0 && p[0].verdict.length > 5);
}
check('amounts in StudieStaat add up', K.KEUZE_JOBS.studiestaat.cases.some((c) => c.right === '€3.600') && 300 * 12 === 3600 && 2400 / 80 === 30 && 1500 + 2500 === 4000 && 45 * 3 === 135);
const brands = /swapfiets|mcdonald|febo|anwb|\bnam\b|\bduo\b|hanze|vindicat|gasunie|iwink|albert heijn|jumbo|\bnike\b|adidas|google|facebook|instagram/i;
check('no real brands or bodies in any text', !texts.some((t) => brands.test(t)), texts.filter((t) => brands.test(t)).join(' | '));
check('texts are bubble-length', texts.every((t) => t.length > 1 && t.length < 260));
check('no winter in the text', !/sneeuw|winter|ijs\b/i.test(texts.join(' ')));

const here = path.dirname(fileURLToPath(import.meta.url));
const { loadCityData } = await import('./lib/loadworld.mjs');
const map = await loadCityData({ extras: false });
const ex = JSON.parse(fs.readFileSync(path.join(here, '../game/mapextras.json'), 'utf8'));
const names = new Set([...map.buildings.map((b) => b.name), ...(ex.buildingPatches || []).map((p) => p.set && p.set.name)].filter(Boolean));
for (const id of K.KEUZE_IDS) check(`${K.KEUZE_JOBS[id].building} exists on the city map`, names.has(K.KEUZE_JOBS[id].building));
const src = fs.readFileSync(path.join(here, '../game/js/sidejobs.js'), 'utf8');
check('jobs are in the side-job list', K.KEUZE_IDS.every((id) => src.split('SIDE_JOBS = [')[1].split(']')[0].split(/[ ,]+/).includes(id)));
check('pay guess for each job', K.KEUZE_IDS.every((id) => src.includes(`${id}: [`)));

console.log(`keuzewerk: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
