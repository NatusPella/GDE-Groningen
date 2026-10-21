// Picknickers als mensmodellen in een pool bij de speler (picnicpeople.js, flavour3d.js, #342).
//   node scripts/picnicpeople_test.mjs
import fs from 'node:fs';
import { SIT_GROUND, POOL_SIZE, ASSIGN_R, RELEASE_R, picnicPeople, assignPool } from '../game/js/picnicpeople.js';

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const spots = Array.from({ length: 60 }, (_, i) => ({ x: (i % 10) * 12, y: Math.floor(i / 10) * 12, a: (i * 0.7) % 6.28, r: ((i * 37) % 100) / 100 }));
const people = picnicPeople(spots);
check('een of twee mensen per deken, op de deken', people.length > 60 && people.length <= 120 && people.every((p) => Math.hypot(p.x - spots[p.spot].x, p.y - spots[p.spot].y) < 0.51));
check('twee mensen op een deken zitten tegenover elkaar', (() => { const by = new Map(); for (const p of people) { if (!by.has(p.spot)) by.set(p.spot, []); by.get(p.spot).push(p); } return [...by.values()].filter((l) => l.length === 2).every(([a, b]) => Math.hypot(a.x - b.x, a.y - b.y) > 0.9 && Math.hypot(a.x - b.x, a.y - b.y) < 1.1); })());
check('elke houding bestaat', people.every((p) => SIT_GROUND[p.pose]) && SIT_GROUND.some((s) => s.arms === 'behind') && SIT_GROUND.some((s) => s.arms === 'hug'));
check('picknickers zijn gewone mensen: geen blok (de houdingen zijn seatPose-specs met been en armen)', SIT_GROUND.every((s) => Number.isFinite(s.recline) && Number.isFinite(s.footX) && s.arms));

const pool = Array.from({ length: POOL_SIZE }, () => ({ who: -1 }));
const px = 0, py = 0;
let ch = assignPool(people, pool, px, py);
check('de pool vult zich met de dichtstbijzijnden', ch.length === POOL_SIZE && pool.every((q) => q.who >= 0) && new Set(pool.map((q) => q.who)).size === POOL_SIZE);
const maxD = Math.max(...pool.map((q) => Math.hypot(people[q.who].x - px, people[q.who].y - py)));
check('alleen mensen binnen de toewijsstraal', maxD <= ASSIGN_R);
check('niets verandert als de speler blijft staan', assignPool(people, pool, px, py).length === 0);
// verder weg dan RELEASE_R: de pool laat los en neemt de nieuwe omgeving
const far = assignPool(people, pool, 5000, 5000);
check('ver weg: alles losgelaten en niets nieuws', far.length === POOL_SIZE && pool.every((q) => q.who === -1));
assignPool(people, pool, 40, 20);
const assigned = pool.map((q) => q.who);
assignPool(people, pool, 45, 22);
check('licht bewegen houdt dezelfde figuren (geen wisselspel)', pool.every((q, i) => q.who === assigned[i]));
check('straal-eigenschap: loslaten verder dan toewijzen', RELEASE_R > ASSIGN_R);

// flavour3d bouwt de pool uit buildPersonMesh en seatPose, geen torso- en hoofdblokken meer
const src = fs.readFileSync(new URL('../game/js/flavour3d.js', import.meta.url), 'utf8');
check('flavour3d gebruikt buildPersonMesh en seatPose voor de picknickers', /buildPersonMesh\(/.test(src) && /seatPose\(/.test(src));
check('flavour3d tekent geen torso/hoofd-blokken meer', !/const torso = instanced/.test(src) && !/const head = instanced/.test(src));

console.log(bad ? `${bad} van ${n} mislukt` : `picnicpeople_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
