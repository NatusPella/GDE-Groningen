// node scripts/bijbaananker_test.mjs
import { ankerMetWeg, ankerBijBrug, brugpost, BRUG_DELFZIJL, STAD } from '../game/js/bijbaananker.js';
let n = 0, bad = 0;
const check = (name, c) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const kaart = (wegen) => ({ nearestRoadPoint: (x, y, r) => wegen.find((w) => Math.hypot(w.x - x, w.y - y) <= r) || null });
const p = { x: 20000, y: -15000 };
check('weg dichtbij: die wordt het', ankerMetWeg(kaart([{ x: 20100, y: -15000 }]), p).x === 20100);
check('weg verder weg: ruime straal', ankerMetWeg(kaart([{ x: 20900, y: -15000 }]), p).x === 20900);
const stad = ankerMetWeg(kaart([{ x: STAD.x + 5, y: STAD.y }]), p);
check('geen weg in de streek: valt terug op de stad', stad.x === STAD.x + 5);
check('stadsfallback is gemarkeerd, een streekweg niet', stad.fallback === true && !ankerMetWeg(kaart([{ x: 20100, y: -15000 }]), p).fallback);
const niets = ankerMetWeg(kaart([]), p);
check('helemaal niets: het punt zelf', niets.x === p.x && niets.y === p.y);
// de brugwachter staat bij een echte beweegbare brug (#341)
{
  const post = brugpost(BRUG_DELFZIJL);
  check('brugpost ligt 10 m voor het dek, op de lijn van het dek', Math.abs(Math.hypot(post.x - BRUG_DELFZIJL.x, post.y - BRUG_DELFZIJL.y) - (BRUG_DELFZIJL.len / 2 + 10)) < 0.01);
  const a = ankerBijBrug(kaart([{ x: post.x + 3, y: post.y }]));
  check('weg bij de brug: de post staat daar, niet in het streekhart', Math.hypot(a.x - post.x, a.y - post.y) < 5 && !a.fallback);
  const b = ankerBijBrug(kaart([{ x: STAD.x + 5, y: STAD.y }]));
  check('streek nog niet geladen: stad als tijdelijke plek, gemarkeerd', b.fallback === true && b.x === STAD.x + 5);
  check('de post ligt niet in het streekhart van Eemsdelta (21455, -12366)', Math.hypot(post.x - 21455, post.y + 12366) > 1000);
}
console.log(`bijbaananker_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
