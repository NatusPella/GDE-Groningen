// De rekenregels van de haalbaarheidsaudit (scripts/lib/missie_haalbaarheid.mjs) en de doelen die ze afkeurden (moeilijkheid, besluit eigenaar 22-11).
// Puur: geen wereld. De audit met reistijd draait los (node scripts/missie_haalbaarheid_audit.mjs, vraagt de OSM-cache).
//   node scripts/missie_haalbaarheid_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as H from './lib/missie_haalbaarheid.mjs';
import { DIFFICULTY } from '../game/js/difficulty.js';
import { MISSION_GOALS } from '../game/js/achievements.js';

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// de marges horen bij de niveaus van difficulty.js
ok(H.UITDAGEND_TIME === DIFFICULTY.uitdagend.time && H.UITDAGEND_TARGET === DIFFICULTY.uitdagend.target, 'de marges kennen de factoren van Uitdagend');
ok(H.LIMIT_MARGIN * H.UITDAGEND_TIME >= 1.5, 'een tijdslimiet blijft op Uitdagend minstens 1,5 x het foutloze minimum');
ok(H.GOLD_MARGIN * H.UITDAGEND_TARGET >= 1, 'goud blijft op Uitdagend boven het foutloze minimum');

// de rekenregels
ok(H.readingSeconds('') === 2.2 && H.readingSeconds('x'.repeat(1000)) === 12, 'leestijd: ondergrens 2,2 s en bovengrens 12 s');
ok(Math.abs(H.lineSeconds({ text: 'x'.repeat(50) }) - (1.3 + 2.9 + 0.1)) < 1e-9, 'een regel zonder opname duurt de leestijd plus een pauze');
ok(H.lineSeconds({ text: 'kort' }, 9) === 9.35, 'een langere opname wint van de leestijd');
ok(H.lineSeconds({ text: 'stil', channel: 'app-stil' }) === 0, 'een stille regel kost niets');
ok(H.legSeconds(0) === 0 && H.legSeconds(-5) === 0 && H.legSeconds(NaN) === 0, 'een been zonder afstand kost niets');
ok(H.legSeconds(1400, 'vehicle') > H.legSeconds(1400, 'foot') * 0.4 && H.legSeconds(1400, 'vehicle') < H.legSeconds(1400, 'foot'), 'een auto is sneller dan lopen');

// het Loket: drie gesprekken van ruim twee minuten, dus 1:00 kon niet
const scenes = {
  a: { id: 'a', lines: Array.from({ length: 12 }, () => ({ text: 'x'.repeat(80) })) },
  b: { id: 'b', lines: Array.from({ length: 10 }, () => ({ text: 'x'.repeat(80) })) },
};
const loket = { stages: [{ kind: 'scene', script: { ids: ['a'] } }, { kind: 'hold', time: 8 }, { kind: 'scene', script: { ids: ['b'] } }], medalTime: 60, timeLimit: null };
const m = H.minSeconds(loket, { scenes });
ok(m.fixed > 100 && m.travel === 0, 'minSeconds telt scènes en wachten', m);
let q = H.judgeMission(loket, null, { scenes });
ok(q.length === 1 && q[0].soort === 'medalTime' && q[0].voorstel >= m.total * 1.25, 'een medaille van 1:00 boven twee minuten gesprek wordt afgekeurd, met een voorstel', q);
ok(H.judgeMission({ ...loket, medalTime: q[0].voorstel }, null, { scenes }).length === 0, 'het voorstel wordt zelf goedgekeurd');
ok(H.judgeMission({ ...loket, medalTime: 180 }, null, { scenes }).length === 0, 'drie minuten is genoeg voor dat Loket');

// een tijdslimiet krijgt ruimte, ook op Uitdagend
const rit = { stages: [], timeLimit: 100 };
const legs = [{ dist: 1000, mode: 'vehicle' }];
q = H.judgeMission(rit, null, { legs });
ok(q.some((x) => x.soort === 'timeLimit'), 'een limiet van 100 s voor 1 km rijden is te krap', q);
const ruim = H.judgeMission({ ...rit, timeLimit: q[0].voorstel }, null, { legs });
ok(ruim.length === 0, 'het voorstel is ruim genoeg');
ok(DIFFICULTY.uitdagend.time * q[0].voorstel >= H.minSeconds(rit, { legs }).total * 1.5, 'ook op Uitdagend blijft de limiet haalbaar');

// goud en zilver
q = H.judgeMission({ stages: [], timeLimit: null }, { gold: 20, silver: 25 }, { legs });
ok(q.some((x) => x.soort === 'gold') && q.some((x) => x.soort === 'silver'), 'goud en zilver onder het minimum worden afgekeurd', q);
ok(H.judgeMission({ stages: [] }, { gold: 20, silver: 25 }, {}).length === 0, 'zonder bekend minimum oordeelt de audit niet');
ok(H.judgeMission({ stages: [], timeLimit: null }, { gold: 20, silver: 25 }, { legs: [{ dist: 50, mode: 'vehicle' }] }).length === 0, 'een korte rit met strakke medailles mag');

// de echte data: elke vaste MISSION_GOALS heeft goud onder zilver en een positieve tijd
for (const [i, g] of MISSION_GOALS.entries()) ok(g.gold > 0 && g.silver > g.gold, `MISSION_GOALS ${i + 1}: goud ${g.gold} ligt onder zilver ${g.silver}`);

// het Loket (M03) in de bron: de medailletijd past bij de gesprekken, tekst en getal zeggen hetzelfde
{
  const script = JSON.parse(read('game/storydata/script.json'));
  const byId = Object.fromEntries(script.scenes.map((s) => [s.id, s]));
  const sec = ['M03.1', 'M03.2', 'M03.3', 'M03.4', 'M03.5'].reduce((t, id) => t + H.linesSeconds((byId[id] || { lines: [] }).lines), 0);
  ok(sec > 60, 'de gesprekken van het Loket duren langer dan een minuut (anders was 1:00 nooit het probleem)', sec);
  const src = read('game/js/missions_nieuw.js');
  const mt = [...src.matchAll(/medalTime:\s*(\d+)/g)].map((x) => Number(x[1]));
  ok(mt.length > 0 && mt.every((v) => v >= 120), 'geen medailletijd in missions_nieuw.js onder twee minuten', mt);
  ok(!/Binnen 1:00/.test(src) && !/binnen een minuut geeft een medaille/.test(src), 'de tekst op de kaart belooft geen minuut meer');
}

// de audit zelf, op ingelezen missies (--from): een Loket met 1:00 faalt, een met 3:00 en een ruime limiet slaagt
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-haalb-'));
  const run = (rows) => {
    const f = path.join(dir, 'in.json');
    fs.writeFileSync(f, JSON.stringify(rows));
    return spawnSync(process.execPath, [fileURLToPath(new URL('./missie_haalbaarheid_audit.mjs', import.meta.url)), '--from=' + f, '--quiet'], { encoding: 'utf8' });
  };
  const row = (def, legs = []) => ({ index: 2, id: 'loket', label: 'Het Loket', goals: null, def: { waypoints: [], stages: [], ...def }, legs });
  const stage = { kind: 'hold', time: 120 };
  const slecht = run([row({ medalTime: 60, stages: [stage] })]);
  ok(slecht.status === 1 && /PROBLEEM loket/.test(slecht.stdout), 'de audit faalt op een medaille van 1:00 boven twee minuten wachten', slecht.stdout + slecht.stderr);
  const goed = run([row({ medalTime: 180, timeLimit: 400, stages: [stage] })]);
  ok(goed.status === 0 && /0 afwijkingen/.test(goed.stdout), 'de audit slaagt met 3:00 en een ruime limiet', goed.stdout + goed.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
}

// de gerepareerde doelen staan in de bron
ok(/timeLimit: 1000, \/\/ haalbaarheidsaudit/.test(read('game/js/missions_akte4.js')), 'Open, dicht (M17): de limiet is ruim boven het foutloze minimum van ca. 550 s');

console.log(fails ? `${fails}/${n} FAIL` : `missie_haalbaarheid_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
