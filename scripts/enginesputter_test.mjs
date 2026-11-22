// Een beschadigde motor sputtert (game/js/enginesputter.js, 22-11).
import { makeSputter, sputterStep, sputterGap, SPUTTER_BELOW } from '../game/js/enginesputter.js';
import fs from 'node:fs';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const run = (v, secs, dt = 1 / 30) => { const s = makeSputter(); let c = 0; for (let t = 0; t < secs; t += dt) if (sputterStep(s, dt, v, 0.5)) c++; return c; };
const car = { health: 30, speed: 12, throttle: 1 };
ok(run({ ...car, health: 80 }, 60) === 0, 'gezonde motor hoest nooit');
ok(run({ ...car, health: SPUTTER_BELOW }, 60) === 0, 'precies op de grens nog niet');
ok(run(car, 60) > 3, 'beschadigd hoest wel', run(car, 60));
ok(run({ ...car, health: 5 }, 60) > run({ ...car, health: 38 }, 60), 'erger is vaker');
ok(run({ ...car, throttle: 0 }, 60) === 0, 'zonder gas geen hoest');
ok(run({ ...car, speed: 1 }, 60) === 0, 'stilstaand geen hoest');
for (const k of ['wrecked', 'isBoat', 'isBike', 'isHeli']) ok(run({ ...car, [k]: true }, 60) === 0, `niet bij ${k}`);
ok(run({ ...car, health: 0 }, 60) === 0, 'kapot is stil');
ok(sputterGap(39) > sputterGap(10) && sputterGap(10) > sputterGap(1), 'gat krimpt monotoon');
ok(run(car, 60) < 60 / 1.5, 'nooit een rammelende machinegeweer-hoest');
// bedraad: audio, ondertitel en player
const root = new URL('../game/js/', import.meta.url);
const rd = (f) => fs.readFileSync(new URL(f, root), 'utf8');
ok(/case 'engine_sputter'/.test(rd('audio.js')), 'audio.js speelt engine_sputter');
ok(/engine_sputter:/.test(rd('soundcaptions.js')), 'ondertitel voor engine_sputter');
ok(/sputterStep\(/.test(rd('player.js')), 'player.js roept sputterStep aan');
console.log(fails ? `${fails} van ${n} gefaald` : `OK: ${n} controles`);
process.exit(fails ? 1 : 0);
