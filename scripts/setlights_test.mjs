// Setlichten lenen een lamp van de nachtrig (setlights.js): het aantal zichtbare puntlichten in de scène blijft gelijk,
// dus geen tweede programmaset per materiaal zodra een set verschijnt of verdwijnt.
import { adoptSetLight, syncSetLights, withBorrowedSetLightsHidden } from '../game/js/setlights.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const col = (v) => ({ v, copy(o) { this.v = o.v; return this; }, clone() { return col(this.v); } });
const vec = () => ({ x: 0, setFromMatrixPosition(m) { this.x = m.x; return this; } });
const node = (extra = {}) => ({ visible: true, parent: null, userData: {}, ...extra });
const light = (v, i, d, e, x, parent) => node({ color: col(v), intensity: i, distance: d, decay: e, matrixWorld: { x }, parent, updateWorldMatrix() {} });
const scene = node();
const pool = [0, 1, 2].map((i) => node({ color: col(0xffb66e), intensity: 0, distance: 22, decay: 1.7, position: vec(), parent: scene }));
const visiblePoints = (list) => list.filter((l) => l.visible).length;

const group = node({ parent: scene });
const lamp = adoptSetLight(light(0xffd6a0, 3.2, 6, 1.6, 7, group));
const dawn = adoptSetLight(light(0xffb27a, 5, 7, 1.4, 9, group));
const real = [lamp, dawn];
const total = () => visiblePoints(pool) + visiblePoints(real);

ok(syncSetLights(scene, pool) === 2, 'twee setlichten lenen twee poollampen');
ok(!lamp.visible && !dawn.visible, 'de eigen setlichten worden niet getekend');
ok(total() === 3, 'aantal getekende puntlichten blijft de pool (3)', total());
ok(pool[2].intensity === 3.2 && pool[2].distance === 6 && pool[2].decay === 1.6 && pool[2].position.x === 7 && pool[2].color.v === 0xffd6a0, 'bereik, verval, kleur, plek en sterkte gekopieerd (eerste lamp op de laatste poolplek)');
ok(pool[1].intensity === 5 && pool[1].position.x === 9, 'tweede lamp op de voorlaatste plek');

lamp.intensity = 2.5; // de set laat zijn lamp ademen
syncSetLights(scene, pool);
ok(pool[2].intensity === 2.5, 'animatie van de set komt door');

group.visible = false; // kitchen-shot voorbij: set verborgen
ok(syncSetLights(scene, pool) === 0, 'verborgen set leent niets');
ok(pool[2].intensity === 0 && pool[2].distance === 22 && pool[2].decay === 1.7 && pool[2].color.v === 0xffb66e, 'poollamp is weer een straatlamp (kleur, bereik, verval) met sterkte 0');
ok(total() === 3, 'aantal puntlichten blijft 3 ook zonder set', total());

group.visible = true;
const small = pool.slice(0, 1); // quality zonder genoeg poollampen
syncSetLights(scene, small);
ok(lamp.visible !== dawn.visible && visiblePoints(small) + visiblePoints(real) === 2, 'te kleine pool: de rest blijft een gewoon setlicht');

const none = [];
syncSetLights(scene, none);
ok(lamp.visible && dawn.visible, 'zonder pool (laag) blijven setlichten gewoon licht');

group.parent = null; // set weggehaald
for (let i = 0; i < 301; i++) syncSetLights(scene, pool);
ok(lamp.visible && dawn.visible, 'een set buiten de scène is een gewoon licht');
group.parent = scene;
ok(syncSetLights(scene, pool) === 0, 'na lang losgekoppeld te zijn is hij uit de lijst (nieuwe set moet zich opnieuw aanmelden)');

// compileren met de geleende lichten verborgen (#1008): bij het tekenen zijn ze verborgen, dus de compile telt ze niet mee
{
  const g2 = node({ parent: scene }), other = node({ parent: scene });
  const l1 = adoptSetLight(light(0xffffff, 1, 5, 2, 0, g2)), l2 = adoptSetLight(light(0xffffff, 1, 5, 2, 0, other));
  let tijdens = null;
  withBorrowedSetLightsHidden(g2, true, () => { tijdens = [l1.visible, l2.visible]; });
  ok(tijdens[0] === false && tijdens[1] === true && l1.visible && l2.visible, 'alleen de lichten in de groep zijn tijdens de compile verborgen, daarna weer zichtbaar');
  withBorrowedSetLightsHidden(g2, false, () => { tijdens = [l1.visible]; });
  ok(tijdens[0] === true, 'zonder pool (laag) blijven de setlichten tellen');
  let gooit = false;
  try { withBorrowedSetLightsHidden(g2, true, () => { throw new Error('x'); }); } catch (e) { gooit = true; }
  ok(gooit && l1.visible, 'bij een fout komt het licht terug');
  ok(withBorrowedSetLightsHidden(g2, true, () => 42) === 42, 'geeft de waarde van fn terug');
}

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
