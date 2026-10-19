// Spelbot (#186): de haken tussen verhaal en bot, zonder Electron of three:
//   node scripts/botstoryhaken_test.mjs
// - elke missiestap van het nieuwe verhaal (M02, ...) vindt zijn missie-index via missionIndexOf (stap-id en def-id)
// - MISSION_IDS blijft append-only (de indices staan in saves)
// - playerapi.js biedt de cheats die bot.page.js gebruikt; de redding loopt tot en met skip
// playerapi.js zelf importeert het spel (three) en draait hier niet; die checks lezen de bron.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const A = await imp('game/js/storyarc.js');
const N = await imp('game/js/storyarc_nieuw.js');
const B = await imp('game/js/storyarc_basis.js');
const L = await imp('game/js/botlogic.js');
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const missions = A.STEPS.filter((s) => s.kind === 'mission');
ok(missions.length >= 20, 'het verhaal heeft missiestappen');
for (const s of missions) {
  const byDef = A.MISSION_IDS.indexOf(s.mission);
  ok(byDef >= 0, `${s.id}: def-id ${s.mission} staat in MISSION_IDS`);
  ok(A.missionIndexOf(s.id) === byDef, `${s.id}: missionIndexOf(stap-id) = index van ${s.mission}`);
  ok(A.missionIndexOf(s.mission) === byDef, `${s.id}: missionIndexOf(def-id) werkt nog`);
  ok(A.missionCode(byDef) === s.id, `${s.id}: missionCode(index) geeft de stap terug`);
}
ok(A.missionIndexOf('M02') === A.MISSION_IDS.indexOf('pinautomaat') && A.missionIndexOf('M02') >= 0, 'M02 is niet meer -1');
ok(A.missionIndexOf('M09') === A.MISSION_IDS.indexOf('eieren') && A.missionIndexOf('M10') === A.MISSION_IDS.indexOf('wierde'), 'M09 en M10 vinden eieren en wierde');
ok(A.missionIndexOf('M00') === -1 && A.missionIndexOf('T1') === -1, 'activiteiten zijn geen missie');
ok(A.missionIndexOf('bestaat-niet') === -1 && A.missionIndexOf(undefined) === -1, 'onbekend is -1');

// append-only: de ids van het eerste verhaal staan voorop, de nieuwe erachter
ok(A.MISSION_IDS.slice(0, B.MISSION_IDS.length).join() === B.MISSION_IDS.join(), 'MISSION_IDS begint met de ids van het eerste verhaal');
ok(A.MISSION_IDS.slice(-N.NEW_MISSION_IDS.length).join() === N.NEW_MISSION_IDS.join(), 'MISSION_IDS eindigt met NEW_MISSION_IDS');
ok(new Set(A.MISSION_IDS).size === A.MISSION_IDS.length, 'geen id dubbel');

// de scenes van elke gebouwde missiestap zijn bereikbaar via een index (cutscene-preview: playStoryIntro(w, index))
for (const s of missions.filter((q) => q.built && q.story && q.story.intro)) ok(A.missionIndexOf(s.id) >= 0, `${s.id}: intro-preview heeft een index`);

// playerapi.js biedt wat bot.page.js nodig heeft
const api = readFileSync(path.join(root, 'game/js/playerapi.js'), 'utf8');
const page = readFileSync(path.join(root, 'scripts/bot/bot.page.js'), 'utf8');
const used = [...page.matchAll(/B\.cheat\.(\w+)/g)].map((m) => m[1]);
ok(used.length >= 3, 'bot.page.js gebruikt cheats');
for (const c of new Set(used)) ok(new RegExp('\\b' + c + ':').test(api.slice(api.indexOf('cheat:'))), `playerapi.js heeft cheat.${c}`);
for (const r of L.RESCUES.filter(L.isCheat)) ok(r === 'skip' || r === 'win' || page.includes(`'${r}'`), `bot.page.js kent de sport ${r}`);
ok(page.includes("B.cheat.skip()"), 'de laatste sport gebruikt skip');
// elke keydown van de api heeft een keyup (AGENTS.md): down() en up() gaan via dezelfde set
ok(/function down\(key\)[\s\S]*?held\.add\(key\)[\s\S]*?function up\(key\)[\s\S]*?held\.delete\(key\)/.test(api), 'playerapi: down/up houden een held-set bij');
ok(/function releaseAll\(\)[\s\S]*?up\(k\)/.test(api), 'playerapi: releaseAll laat alles los');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
