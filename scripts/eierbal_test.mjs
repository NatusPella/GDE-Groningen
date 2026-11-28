// De eierbal uit de vriezer van de flat (#1344): node scripts/eierbal_test.mjs
// Gedrag: eten geeft zichtbare winst, al vol of cooldown geeft een duidelijke reden en kost niets.
import { eierbalPlan } from '../game/js/eierbal_rules.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

let p = eierbalPlan({ health: 40, now: 100 });
ok(p.eat && p.heal === 60 && /\+60 gezondheid/.test(p.msg), 'gewond: eten geeft +60', p.msg);
p = eierbalPlan({ health: 100, now: 100 });
ok(!p.eat && /al vol/.test(p.msg), 'vol zonder Vetpot: duidelijke reden, niet eten', p.msg);
p = eierbalPlan({ health: 100, armor: 0, now: 100, perkArmor: 20, armorCap: 60 });
ok(p.eat && p.armor === 20 && /\+20 pantser/.test(p.msg), 'vol met Vetpot: wel pantser', p.msg);
p = eierbalPlan({ health: 100, armor: 60, now: 100, perkArmor: 20, armorCap: 60 });
ok(!p.eat, 'vol en pantser vol: niet eten');
p = eierbalPlan({ health: 30, now: 110, lastAt: 100, cooldown: 45 });
ok(!p.eat && /35 seconden/.test(p.msg), 'cooldown noemt de wachttijd', p.msg);
p = eierbalPlan({ health: 30, now: 150, lastAt: 100, cooldown: 45 });
ok(p.eat, 'na de cooldown weer eten');
p = eierbalPlan({ health: 40, armor: 50, now: 0, perkArmor: 20, armorCap: 60 });
ok(p.eat && p.armor === 10 && /\+60 gezondheid en \+10 pantser/.test(p.msg), 'pantser tot de limiet', p.msg);

console.log(`eierbal_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
