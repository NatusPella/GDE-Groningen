// node scripts/regattabots_test.mjs
import { maakBots, stepBots, speelPlaats, plaatsTekst } from '../game/js/regattabots.js';
import { rondBaan, createRegatta, windOp } from '../game/js/zeilrules.js';
let n = 0, bad = 0;
const check = (name, c) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const tonnen = rondBaan(0, 0, 55, 4, 0);
const bots = maakBots(tonnen, 3);
check('drie bots met namen', bots.length === 3 && bots.every((b) => b.naam));
const wind = { dir: 0.8, speed: 6 };
let t = 0;
for (let i = 0; i < 60 * 900 && !bots.every((b) => b.klaar); i++) { t += 1 / 20; stepBots(bots, tonnen, wind, 1 / 20, t); }
check('alle bots halen de finish', bots.every((b) => b.klaar));
check('snellere bot is eerder klaar', bots[2].tijd <= bots[0].tijd);
check('tijden eindig', bots.every((b) => Number.isFinite(b.tijd) && b.tijd > 20));
const reg = createRegatta(tonnen);
const vers = maakBots(tonnen, 3);
check('start: speler eerste of gelijk', speelPlaats(reg, tonnen[0].x - 25, tonnen[0].y, vers) >= 1);
reg.gerond = 5;
check('ver voor: eerste plaats', speelPlaats(reg, 0, 0, vers) === 1);
reg.gerond = 0;
vers[0].gerond = 3;
check('bot voor de speler telt', speelPlaats(reg, tonnen[0].x, tonnen[0].y, vers) === 2);
reg.klaar = true; reg.tijd = 9999;
check('na finish: klaarde bots eerder', speelPlaats(reg, 0, 0, bots) === 4);
check('tekst', plaatsTekst(2, 4) === '2e van 4');
console.log(`regattabots_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
