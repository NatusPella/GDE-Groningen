// Camerawrapper (#728): de polsstok-camera (fierljep.js) en de mik-camera van het
// postgame-duel (pg_fierljep.js) gebruikten playCinematic met een duur van 600 s of een
// schatting. Dat bezette het scèneslot (een scène met lagere prioriteit kon uren wachten),
// was niet skipbaar en een fout liet de camera tien minuten verkeerd staan. Ze gebruiken
// nu een eigen camerastand in cinematics.js: geen wachtrij, geen duur, geen skip; de
// minigame zet hem aan en weer uit, en een vergeten stand wordt opgeruimd.
//   node scripts/cine_camera_take_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, 'game/js/' + f), 'utf8');
const cin = lees('cinematics.js');
const pg = lees('pg_fierljep.js');
const fj = lees('fierljep.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const blok = (text, van, tot) => { const i = text.indexOf(van); if (i < 0) return ''; const j = text.indexOf(tot, i); return text.slice(i, j > i ? j : i + 1200); };

// 1. de camerastand in cinematics: geen duur, geen prioriteit, geen skip, wel opruimen
{
  ok(/let take = null;/.test(cin), 'cinematics heeft een eigen camerastand naast de scène');
  const api = blok(cin, 'export function startCameraTake(', 'export const cameraTakeActive');
  ok(/take = \{ id, shot, letterbox, hideHud, t: 0 \};/.test(api), 'startCameraTake zet een stand met een eigen klok');
  ok(!/duration|priority|skippable/.test(api), 'geen duur, prioriteit of skip: het is geen scène');
  const stop = blok(cin, 'export function stopCameraTake(', 'export const cameraTakeActive');
  ok(/take = null;/.test(stop) && /world\.cameraOverride = null;/.test(stop), 'stopCameraTake haalt de stand en de camera-override weg');
  ok(/cameraTakeActive = \(id\) => !!take/.test(cin), 'er is een vraag "loopt deze stand?"');
  // de update: de stand krijgt een eigen klok, en een fout stopt hem in plaats van te blijven hangen
  const upd = blok(cin, 'else if (!active && take) {', 'else if (!active && camMode');
  ok(/take\.t \+= dt;/.test(upd) && /pose = take\.shot\(take\.t, w\);/.test(upd), 'de update tekent de stand met zijn eigen tijd');
  ok(/catch \(err\) \{[^}]*stopCameraTake\(\)/.test(upd), 'een fout in de stand ruimt hem op (geen 10 minuten verkeerde camera)');
  // een echte scène gaat voor: begin() zet de stand uit
  const begin = blok(cin, 'function begin(spec) {', 'function finish(');
  ok(/take = null; \/\/ een scène neemt de camera over/.test(begin), 'een scène neemt de camera over van een camerastand');
}

// 2. de twee minigames gebruiken de stand, niet playCinematic
for (const [naam, src, id] of [['pg_fierljep.js', pg, 'pg-aim'], ['fierljep.js', fj, 'fierljep']]) {
  ok(new RegExp(`startCameraTake\\('${id}'`).test(src), `${naam} zet de camerastand aan`);
  ok(/stopCameraTake\(/.test(src), `${naam} zet hem weer uit`);
  ok(!/playCinematic\(/.test(src), `${naam} gebruikt geen playCinematic meer voor de camera`);
  ok(!/isCinematicActive|skipCinematic/.test(src), `${naam} hoeft geen scène te skippen of te pollen`);
  ok(!/duration: 600/.test(src) && !/duration: est/.test(src), `${naam} heeft geen lange scèneduur meer`);
}

// 3. de mik-camera's staan op vaste plekken: de stand levert elke frame dezelfde pose
{
  const aim = blok(pg, 'function aimCamera(run)', 'function jelleJump');
  ok(/startCameraTake\('pg-aim', \(\) => shot/.test(aim), 'de mik-camera geeft elke frame dezelfde pose');
  const cam = blok(fj, 'function startCamera(v)', 'function endCamera');
  ok(/startCameraTake\('fierljep', \(\) => v\.cam && v\.cam\.last/.test(cam), 'de polsstokcamera volgt de stand van de sprong');
}

console.log(fails ? `cine_camera_take_test: ${fails} van ${n} mislukt` : `cine_camera_take_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
