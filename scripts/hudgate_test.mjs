// #659: achter het pauzemenu slaat de HUD het dure werk over.
import fs from 'node:fs';
import { hudExpensiveDue } from '../game/js/hudgate.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(hudExpensiveDue(false), 'menu dicht: doen');
ok(!hudExpensiveDue(true), 'menu open: overslaan');
let draws = 0;
for (let f = 0; f < 60; f++) if (hudExpensiveDue(true)) draws++;
ok(draws === 0, '60 frames menu open: 0 minimap/kaart/prefetch', draws);
let draws2 = 0;
for (let f = 0; f < 60; f++) if (hudExpensiveDue(false)) draws2++;
ok(draws2 === 60, 'menu dicht: elke frame', draws2);
console.log('#659 meting: menu open -> 0 minimap-tekeningen i.p.v. ~30/s (minimap was 5-14% van de main thread)');
const src = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
ok(/const expensive = hudExpensiveDue\(isPauseMenuOpen\(\)\)/.test(src), 'updateHud gebruikt de gate');
ok(/if \(expensive\) updateAchievementCard/.test(src) && /if \(expensive\) updateSpeedoPrefetch/.test(src) && /if \(!expensive\) return; \/\/ #659/.test(src), 'de drie dure stukken zijn gegated');
console.log(`${n - fails}/${n} hudgate`);
process.exit(fails ? 1 : 0);
