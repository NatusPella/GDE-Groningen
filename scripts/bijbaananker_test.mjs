// node scripts/bijbaananker_test.mjs
import { ankerMetWeg, STAD } from '../game/js/bijbaananker.js';
let n = 0, bad = 0;
const check = (name, c) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const kaart = (wegen) => ({ nearestRoadPoint: (x, y, r) => wegen.find((w) => Math.hypot(w.x - x, w.y - y) <= r) || null });
const p = { x: 20000, y: -15000 };
check('weg dichtbij: die wordt het', ankerMetWeg(kaart([{ x: 20100, y: -15000 }]), p).x === 20100);
check('weg verder weg: ruime straal', ankerMetWeg(kaart([{ x: 20900, y: -15000 }]), p).x === 20900);
const stad = ankerMetWeg(kaart([{ x: STAD.x + 5, y: STAD.y }]), p);
check('geen weg in de streek: valt terug op de stad', stad.x === STAD.x + 5);
const niets = ankerMetWeg(kaart([]), p);
check('helemaal niets: het punt zelf', niets.x === p.x && niets.y === p.y);
console.log(`bijbaananker_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
