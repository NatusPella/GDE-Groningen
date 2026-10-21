// #249: de pure kant van de sprong naar een verhaalstap (game/js/storyjump.js), zonder spel:
//   node scripts/storyjump_test.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = await import(pathToFileURL(path.join(root, 'game', 'js', 'storyjump.js')).href);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

ok(J.jumpPrep({}).length === 0 && J.jumpPrep().length === 0, 'niets te stoppen: lege lijst');
ok(J.jumpPrep({ inVehicle: true }).join() === 'exitVehicle', 'alleen uit het voertuig');
ok(J.jumpPrep({ missionActive: true, pigeon: true, heliRun: true, inVehicle: true }).join() === 'abortMission,stopPigeon,abortHeli,exitVehicle', 'volgorde: missie, duif, heli, voertuig');
ok(J.jumpPrep({ missionActive: true, inVehicle: true })[0] === 'abortMission', 'de missie gaat eerst');

const def = { start: { x: 1000, y: -500 } };
const mid = () => 0; // hoek 0
const s1 = J.jumpSpot(def, { x: 5, y: 5 }, { dist: 12, rand: mid });
ok(s1 && s1.source === 'missie' && s1.x === 1012 && s1.y === -500, 'missie: op 12 m van de startplek');
const s2 = J.jumpSpot(def, null, { dist: 0, rand: mid });
ok(s2.x === 1000 && s2.y === -500, 'dist 0: precies op de startplek');
const s3 = J.jumpSpot(null, { x: 10, y: 20 }, { dist: 20, rand: mid });
ok(s3.source === 'gids' && s3.x === 30 && s3.y === 20, 'zonder missie: de gids van de stap');
ok(J.jumpSpot({ start: { x: NaN, y: 0 } }, { x: 1, y: 1 }).source === 'gids', 'NaN-startplek valt terug op de gids');
ok(J.jumpSpot(null, null) === null && J.jumpSpot({}, {}) === null, 'geen plek: null');
for (let i = 0; i < 20; i++) { const s = J.jumpSpot(def, null, { dist: 12, rand: Math.random }); ok(Math.abs(Math.hypot(s.x - 1000, s.y + 500) - 12) < 1e-6, 'afstand klopt op elke hoek'); }

// #261: een plek in een gebouw of in het water wordt overgeslagen
const s4 = J.jumpSpot(def, null, { dist: 12, rand: mid, vrij: (x) => x < 1005 });
ok(s4 && s4.x < 1005 && Math.hypot(s4.x - 1000, s4.y + 500) > 1, 'bezette plek: een vrije plek in de buurt');
const s5 = J.jumpSpot(def, null, { dist: 12, rand: mid, vrij: () => false });
ok(s5.x === 1012 && s5.y === -500, 'niets vrij: de eerste plek blijft');
const s6 = J.jumpSpot(def, null, { dist: 12, rand: mid, vrij: () => true });
ok(s6.x === 1012, 'vrije eerste plek blijft de eerste');

// de bron: devJumpTo gebruikt de plan-functies en sluit duif, heli en voertuig af
const story = readFileSync(path.join(root, 'game/js/story.js'), 'utf8');
const fn = story.slice(story.indexOf('export function devJumpTo'), story.indexOf('export function devCompleteStep'));
for (const part of ['jumpPrep(', 'jumpSpot(', 'buildingAt(', 'waterAt(', 'failActiveMission(', 'stopPigeonMode(', 'abortHeliRun(', 'exitVehicle(', 'opts.start']) ok(fn.includes(part), 'devJumpTo gebruikt ' + part);
ok(fn.indexOf('failActiveMission(') < fn.indexOf('if (isMissionActive()) return false'), 'de missie wordt afgebroken vóór de controle');

// #261: de ring rond de landingsplek
{
  const wall = (x) => x > 12.9; // een gevel op 3 m ten oosten van de plek (10, 0)
  ok(J.openRond(() => true, 0, 0), 'openRond: vrij veld is ruim');
  ok(!J.openRond(() => false, 0, 0), 'openRond: een geblokkeerd punt is niet ruim');
  ok(!J.openRond((x) => !wall(x), 10, 0), 'openRond: een gevel op 3 m binnen de ring van 4 m is niet ruim');
  ok(J.openRond((x) => !wall(x), 0, 0), 'openRond: een gevel op 13 m is ver genoeg');
  const s5 = J.jumpSpot({ start: { x: 0, y: 0 } }, null, { dist: 12, rand: () => 0, vrij: (x, y) => J.openRond((px) => px < 13.5, x, y) });
  ok(s5 && s5.x < 9.5, 'jumpSpot met een ring-eis kiest een plek met ruimte tot de gevel');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
