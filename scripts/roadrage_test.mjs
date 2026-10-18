// Verkeersruzie en wapens oppakken (roadragerules.js): wanneer het gebeurt,
// hoe klein de klappen zijn, wat iemand bij zich kan hebben en wat oppakken doet.
// Geen bloed of leed in de tekst.
//   node scripts/roadrage_test.mjs
import * as R from '../game/js/roadragerules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

check('levels: uit is 0, veel is meer dan normaal', R.levelOf('uit') === 0 && R.levelOf('veel') > R.levelOf('normaal') && R.levelOf('weinig') < 1 && R.levelOf('onzin') === 1);
check('uit: nooit ruzie', R.rageChance('crash', 0, 12) === 0 && R.rageChance('horn', 0) === 0 && !R.mayRage({ level: 0, busy: false, wanted: 0, since: 1e9, time: 1e3 }));
check('een tikje geeft geen ruzie, een harde klap wel kans', R.rageChance('crash', 1, 2) === 0 && R.rageChance('crash', 1, 10) > 0);
check('harder is kans groter, veel > normaal > weinig', R.rageChance('crash', 1, 14) > R.rageChance('crash', 1, 5) && R.rageChance('crash', 1.8, 8) > R.rageChance('crash', 1, 8) && R.rageChance('crash', 1, 8) > R.rageChance('crash', 0.5, 8));
check('kans blijft een kans', R.rageChance('crash', 99, 99) <= 0.9 && R.rageChance('horn', 99) <= 0.9 && R.rageChance('x', 1) === 0);
const ok = { level: 1, busy: false, dead: false, wanted: 0, since: 1e9, time: 1e3 };
check('mag als alles rustig is', R.mayRage(ok));
for (const [k, v] of [['busy', true], ['dead', true], ['wanted', 1], ['since', 5], ['time', 10]]) check(`niet bij ${k}`, !R.mayRage({ ...ok, [k]: v }));

// wapens
const always = () => 0, never = () => 0.999;
check('rollWeapon: niets bij uit, soms bij normaal', R.rollWeapon(0, always) === null && R.rollWeapon(1, never) === null && R.rollWeapon(1, always) !== null);
const keys = new Set();
for (let i = 0; i < 400; i++) { const k = R.rollWeapon(1.8, Math.random); if (k) keys.add(k); }
check('alleen cartoon-spullen uit de lijst', [...keys].every((k) => R.RAGE_WEAPONS.some((w) => w.key === k) && R.DROP_INFO[k]) && keys.size >= 4, [...keys].join());
check('geen vuurwapens of explosieven in de lijst', R.RAGE_WEAPONS.every((w) => !['pistol', 'uzi', 'shotgun', 'jachtgeweer', 'carbidbus', 'vuurwerk'].includes(w.key)));

// klappen
check('klappen zijn klein', R.hitDamage(0, 1, 100) === R.RAGE.unarmedDamage && R.hitDamage(30, 1.8, 100) <= R.RAGE.armedDamageCap * 1.5 && R.hitDamage(95, 1, 100) <= R.RAGE.armedDamageCap * 1.5);
check('geen klap meer onder de genadegrens', R.hitDamage(30, 1, R.RAGE.mercyHealth) === 0 && R.hitDamage(30, 1, 10) === 0 && !R.canHurt(R.RAGE.mercyHealth));
check('een klap brengt je nooit onder de genadegrens', [26, 27, 30, 40, 100].every((h) => h - R.hitDamage(30, 1.8, h) >= R.RAGE.mercyHealth));
check('hij geeft het op als hij neergeslagen is of bijna uit', R.yields({ ragdoll: {} }) && R.yields({ state: 'dead' }) && R.yields({ health: 10 }) && !R.yields({ health: 30 }) && !R.yields(null));
check('hij geeft het op na een tijd of op afstand', R.givesUp(R.RAGE.giveUpAfter, 0) && R.givesUp(0, R.RAGE.giveUpDist) && !R.givesUp(3, 5));

// oppakken
const melee = R.pickupPlan('klomp', 0);
check('melee oppakken: eenmalig bezit', melee.ok && melee.ammo === 1 && !R.pickupPlan('klomp', 1).ok);
const wp = R.pickupPlan('waterpistool', 0);
check('waterpistool oppakken geeft water en telt op tot de rand', wp.ok && wp.ammo === 30 && R.pickupPlan('waterpistool', 30).ammo === 60 && R.pickupPlan('waterpistool', 590).ammo === 600 && !R.pickupPlan('waterpistool', 600).ok);
check('onbekend ding: niets', !R.pickupPlan('pistol', 0).ok && !R.pickupPlan('x', 0).ok);
check('elk drop-ding heeft een naam en label', Object.keys(R.DROP_INFO).every((k) => R.dropLabel(k).endsWith('oppakken') && R.dropLabel(k)[0] === R.dropLabel(k)[0].toUpperCase()));

// tekst: Nederlands, zonder leed
const texts = [...R.RAGE_TEXT.out, ...R.RAGE_TEXT.horn, ...R.RAGE_TEXT.armed, ...R.RAGE_TEXT.hit, ...R.RAGE_TEXT.yield, ...R.RAGE_TEXT.back, ...R.RAGE_TEXT.copStop,
  R.RAGE_TEXT.copCalm, R.RAGE_TEXT.bonk, R.RAGE_TEXT.squirt, R.RAGE_TEXT.arrested, R.RAGE_TEXT.start(true), R.RAGE_TEXT.start(false), ...Object.keys(R.DROP_INFO).map(R.RAGE_TEXT.drop), ...Object.keys(R.DROP_INFO).map((k) => R.pickupPlan(k, 0).msg)];
check('tekst is gevuld', texts.every((t) => typeof t === 'string' && t.length > 4));
check('geen bloed of leed in de tekst', texts.every((t) => !/bloed|dood|doden|steek|steken|\bschiet|schoot|pijn|gewond|\blijk/i.test(t)));
check('geen echte merken of de Grunn', texts.every((t) => !/de Grunn/.test(t)));

console.log(bad ? `${bad} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
