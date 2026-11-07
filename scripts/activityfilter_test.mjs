// #654: alleen actieve of nabije activiteiten ticken/promptten nog.
import fs from 'node:fs';
import { relevantActivities, activityRelevant, activityFilterStats, ACTIVITY_NEAR_M } from '../game/js/activityfilter.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const player = { x: 0, y: 0 };
const mk = (id, x, y, active = false) => ({ id, spots: () => [{ x, y }], active: () => active });
const list = Array.from({ length: 24 }, (_, i) => mk(i, 5000 + i * 100, 5000)); // ver weg
list.push(mk('dichtbij', 200, 0));           // binnen 400 m
list.push(mk('actief-ver', 9000, 9000, true)); // actief: telt mee
const kept = relevantActivities(list, player).map((a) => a.id);
ok(ACTIVITY_NEAR_M === 400, 'straal 400 m', ACTIVITY_NEAR_M);
ok(kept.length === 2 && kept.includes('dichtbij') && kept.includes('actief-ver'), '2 van 26 blijven over', kept.join());
ok(activityFilterStats.examined >= 26, 'de teller ziet alles', activityFilterStats.examined);
ok(activityRelevant(mk('rand', 400, 0), player), 'spot op precies 400 m telt mee');
ok(!activityRelevant(mk('ver', 401, 0), player), 'net erbuiten niet');
ok(activityRelevant(mk('actief', 9000, 9000, true), player), 'actieve verre activiteit telt mee');
ok(relevantActivities(list, null).length === list.length, 'zonder speler slaan we niets over');
console.log(`#654 meting: 26 activiteiten -> ${kept.length} getickt (was 26), {examined} teller`.replace('{examined}', activityFilterStats.examined));
const src = fs.readFileSync(new URL('../game/js/activities.js', import.meta.url), 'utf8');
ok((src.match(/relevantActivities\(LIST, hoofdspeler\(w\)\)/g) || []).length === 3, 'tick, prompt en secondary filteren', (src.match(/relevantActivities\(LIST/g) || []).length);
console.log(`${n - fails}/${n} activityfilter`);
process.exit(fails ? 1 : 0);
