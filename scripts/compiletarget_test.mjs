// De hele scène compileren telde elke licht dubbel (doelscène met alle lichten + de scène zelf): 2 zon- en 2 hemilampen,
// dus ~108 programma's die geen enkele echte draw gebruikt. compileTarget kiest de scène zelf als doel.
import fs from 'node:fs';
import { compileTarget } from '../game/js/compiletarget.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const scene = { id: 'scene' }, lights = { id: 'lights' }, building = { id: 'gebouw' };
ok(compileTarget(scene, scene, lights) === scene, 'hele scène: de scène zelf is het doel');
ok(compileTarget(building, scene, lights) === lights, 'klein object: de lichtscène is het doel');

// three r160 verzamelt de lichten van doel en object als ze verschillen: model van die telling
const gather = (obj, target) => (target === obj ? 1 : 2) * 2;
ok(gather(scene, compileTarget(scene, scene, lights)) === 2, 'zon + hemi worden één keer geteld');
ok(gather(scene, lights) === 4, 'oude route telde dubbel (model)');

const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/renderer\.compile\(obj, cam, perfOff\('compileklein'\) \? scene : compileTarget\(obj, scene, compileScene\(obj\)\)\)/.test(src), 'precompile gebruikt compileTarget');
console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
