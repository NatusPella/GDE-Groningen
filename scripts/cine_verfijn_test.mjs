// Verfijnronde cutscenes en regie (22-11): kleine regressies die de speler voelt.
//   node scripts/cine_verfijn_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { poseIsFinite } from '../game/js/cinelimit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info !== '' ? ` (${info})` : ''}`); } };

// 1. een pose met een geen-getal bestaat niet voor de camera
const P = (o = {}) => ({ position: { x: 1, y: 2, z: 3 }, lookAt: { x: 4, y: 5, z: 1 }, fov: 50, ...o });
ok(poseIsFinite(P()), 'een gewone pose klopt');
ok(poseIsFinite(P({ fov: undefined })) && poseIsFinite({ position: { x: 1, y: 2 }, lookAt: { x: 3, y: 4 } }), 'fov en hoogte mogen ontbreken');
ok(!poseIsFinite(P({ position: { x: NaN, y: 2, z: 3 } })), 'NaN in de positie telt niet');
ok(!poseIsFinite(P({ lookAt: { x: 1, y: Infinity, z: 0 } })), 'Infinity in het kijkpunt telt niet');
ok(!poseIsFinite(P({ fov: NaN })) && !poseIsFinite(P({ position: { x: 1, y: 2, z: NaN } })), 'NaN in fov of hoogte telt niet');
ok(!poseIsFinite(null) && !poseIsFinite({}) && !poseIsFinite({ position: { x: 1, y: 2 } }), 'lege staten geven false');

const cine = lees('game/js/cinematics.js');
ok(/if \(poseIsFinite\(pose\)\) active\._goedePose = pose;\s*else \{ notePose\(active\.id, pose\); pose = active\._goedePose \|\| null; \}/.test(cine), 'cinematics.js houdt bij een kapotte pose de laatste goede stand vast');

// 2. de skip-ring is er meteen als de spatie wordt vastgehouden (de hint komt anders pas na 0,8 s)
const css = lees('game/js/hud_panel.css');
ok(/#cine\.show-skip\.active \.cine-skip\.holding \{ opacity: 1; transition: opacity 0\.1s; \}/.test(css), 'de overslaan-ring is direct zichtbaar bij vasthouden');
ok(css.indexOf('.cine-skip.holding { opacity: 1;') > css.indexOf('#cine.show-skip.active .cine-skip { opacity: 1; transition: opacity 0.4s 0.8s; }'), 'en de regel staat na de vertraagde hint');

// 3. een scène waarvan de set niet gebouwd kon worden eindigt meteen (geen lege scène met alleen ondertitels)
const host = lees('game/js/cutscenehost.js');
ok(/bouwFout = true;/.test(host) && /if \(bouwFout && !bouwFoutGemeld\)/.test(host) && /isCinematicActive\(cine\.id \|\| useDef\.id\)\) skipCinematic\(\)/.test(host), 'een mislukte setbouw slaat de scène over');
ok(/import \{[^}]*skipCinematic[^}]*isCinematicActive[^}]*\} from '\.\/cinematics\.js'/.test(host), 'cutscenehost importeert skipCinematic en isCinematicActive');

console.log(`cine_verfijn_test: ${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
