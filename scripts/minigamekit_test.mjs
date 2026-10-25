// De cameravolger van de minigames (minigamekit.js, easeCamera/easeStep) rekent per seconde in plaats van per
// beeld (#436, dezelfde klasse als de treincamera): dezelfde verstreken tijd geeft op 30 en op 144 beelden per
// seconde dezelfde camerapose, en een hapering slaat niet in één keer door.
//   node scripts/minigamekit_test.mjs
import { easeStep, easeCamera } from '../game/js/minigamekit.js';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// op 60 beelden per seconde is de stap precies de oude fractie (bestaande aanroepen blijven zoals ze waren)
ok(near(easeStep(0.1, 1 / 60), 0.1), 'op 60 fps is de stap de oude fractie');
ok(near(easeStep(0.12), 0.12) && near(easeStep(0.12, 0), 0.12), 'zonder dt (of dt 0) is het 60 fps');
ok(easeStep(0.1, 1 / 30) > easeStep(0.1, 1 / 60) && easeStep(0.1, 1 / 120) < easeStep(0.1, 1 / 60), 'een langer beeld zet meer stappen');
ok(easeStep(0.1, 1 / 60) <= 1 && easeStep(1, 1 / 60) <= 1, 'de stap komt nooit voorbij het doel');
// een hapering telt hooguit een kwart seconde mee: geen sprong
ok(near(easeStep(0.1, 2), easeStep(0.1, 0.25)), 'een lange hapering wordt op een kwart seconde begrensd');

// dezelfde verstreken tijd, anders verdeeld: dezelfde pose (dat is het punt)
const pose = (fps, secs = 1) => {
  const st = { dt: 1 / fps };
  const pos = { x: 10, y: -4, z: 3 }, at = { x: 6, y: 2, z: 0.5 };
  for (let i = 0; i < Math.round(fps * secs); i++) easeCamera(st, pos, at, 0.1);
  return st.cam;
};
const p30 = pose(30), p120 = pose(120), p144 = pose(144);
for (const key of ['x', 'y', 'z']) {
  ok(near(p30.pos[key], p120.pos[key], 1e-6), `na 1 s dezelfde camerapositie (${key}: 30 vs 120 fps)`);
  ok(near(p30.pos[key], p144.pos[key], 1e-6), `na 1 s dezelfde camerapositie (${key}: 30 vs 144 fps)`);
  ok(near(p30.at[key], p144.at[key], 1e-6), `na 1 s hetzelfde mikpunt (${key})`);
}
// en hij komt wel degelijk bij het doel: na een seconde op 60 fps is 99,8% van de afstand gedaan
const st = { dt: 1 / 60 };
easeCamera(st, { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 0.1);
ok(st.cam.pos.x > 9.9, 'na 1 s staat de camera (bijna) op het doel: ' + st.cam.pos.x.toFixed(3));
// een nieuwe camera begint meteen op het doel (geen zwaai vanaf 0,0,0)
const first = easeCamera({}, { x: 3, y: 4, z: 5 }, { x: 0, y: 0, z: 0 }, 0.1);
ok(near(first.position.x, 3) && near(first.position.z, 5), 'de eerste pose staat meteen goed');

console.log(bad ? `${bad} van ${n} mislukt` : `minigamekit_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
