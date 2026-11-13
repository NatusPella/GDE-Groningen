// Klusloon naar inhoud (#830):  node scripts/klusloon_test.mjs
import { klusloon, contentEffort } from '../game/js/economy.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const def = (...stages) => ({ stages: stages.map((k) => (typeof k === 'string' ? { kind: k } : k)) });

ok(klusloon(1000) === 500, 'zonder def blijft het oude 50%-klusloon');
ok(klusloon(1000, def('goto', 'goto', 'scene')) === 250, 'korte missie zakt naar de 25%-vloer');
ok(klusloon(1000, def('goto', 'goto', 'goto', 'goto', 'goto', 'goto', 'goto', 'goto', 'goto', 'goto')) === 500, 'tien speelbare stappen houden 50%');
ok(klusloon(1500, def({ kind: 'heli' })) === 375, 'een heli-missie van één stap betaalt de vloer');
ok(klusloon(1000, def('scene', 'plan', 'choice', 'shot')) === 250, 'een pure filmmissie betaalt de vloer');
ok(klusloon(1000, def('goto', 'goto', 'goto', 'goto')) === 250, 'vier gewone stappen is nog de vloer');
const getimed = def('goto', { kind: 'goto', limit: 90 }, { kind: 'goto', limit: 90 }, { kind: 'goto', limit: 90 });
ok(contentEffort(getimed) > contentEffort(def('goto', 'goto', 'goto', 'goto')), 'getimede stappen tellen zwaarder');
ok(klusloon(1000, getimed) > klusloon(1000, def('goto', 'goto', 'goto', 'goto')), 'en betalen dus meer klusloon');
ok(contentEffort(def('scene', 'plan', 'choice')) === 1, 'alleen films telt als één eenheid');
ok(klusloon(1234, def('goto')) % 5 === 0, 'het bedrag blijft op vijfvouden');
ok(klusloon(1000, def('goto')) < 1000, 'een klus betaalt nooit het volle missiebedrag');

console.log(fails ? `${fails} FAIL` : 'klusloon_test ok');
process.exit(fails ? 1 : 0);
