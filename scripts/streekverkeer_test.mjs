// streekverkeer.js: the verkeer streken as data, the die-out ramp and the 3D look. Pure.
//   node scripts/streekverkeer_test.mjs
import { TRAFFIC_STREKEN, TRAFFIC_KINDS, NORMAL_MIX, targetMix, stepFactor, stepMix, lookModel, FADE_SECONDS } from '../game/js/streekverkeer.js';
import { CHEATS } from '../game/js/cheatlist.js';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };

const ids = new Set(CHEATS.map((c) => c.id));
for (const s of TRAFFIC_STREKEN) {
  ok(ids.has(s.id), `${s.id} is in the cheat list`);
  ok(CHEATS.find((c) => c.id === s.id).group === 'verkeer', `${s.id} is in the verkeer group`);
  ok(TRAFFIC_KINDS.every((k) => Number.isFinite(s.mix[k]) && s.mix[k] >= 0 && s.mix[k] <= 5), `${s.id} has a sane mix`);
}
ok(TRAFFIC_STREKEN.length >= 9, 'seven new verkeer streken beside the two old ones');
ok(new Set(TRAFFIC_STREKEN.map((s) => s.id)).size === TRAFFIC_STREKEN.length, 'unique ids');
for (const c of CHEATS) {
  const text = `${c.name} ${c.desc}`;
  ok(!/\b(de Grunn)\b/.test(text) && !/winter|sneeuw/i.test(text), `${c.id}: text keeps the constitution`);
}

ok(targetMix(() => false).mix === NORMAL_MIX, 'nothing on: normal mix');
ok(targetMix((id) => id === 'geenverkeer').mix.cars === 0, 'geenverkeer: no cars');

// the ramp: gradual, monotone, ends exactly on the target, never overshoots
{
  const cur = { ...NORMAL_MIX };
  const target = TRAFFIC_STREKEN.find((s) => s.id === 'geenverkeer').mix;
  let mid = false, t = 0, prev = 1, mono = true;
  while (stepMix(cur, target, 1) && t < 500) { t++; if (cur.cars > 0 && cur.cars < 1) mid = true; if (cur.cars > prev) mono = false; prev = cur.cars; }
  ok(mid && mono, 'traffic dies out gradually and monotonically');
  ok(t >= FADE_SECONDS - 2 && t <= FADE_SECONDS + 2, `die-out takes about ${FADE_SECONDS}s (took ${t})`);
  ok(TRAFFIC_KINDS.every((k) => cur[k] === 0), 'ends exactly on zero');
  ok(stepMix(cur, NORMAL_MIX, 1) && cur.cars > 0 && cur.cars < 1, 'switching off ramps back up');
  ok(stepFactor(0.5, 1, 0) === 0.5 && stepFactor(0.5, 1, NaN) === 0.5, 'no time, no step');
  ok(stepFactor(0, 3, 1000) === 3, 'never overshoots');
}

// the look
{
  const m = { name: 'hatch', len: 4, wid: 2, color: '#fff' };
  const small = lookModel(m, { palette: ['#e8761c'], size: 0.5 });
  ok(small.color === '#e8761c' && small.len === 2 && small.wid === 1 && m.len === 4, 'recoloured and resized on a copy');
  ok(lookModel(m, null) === m, 'no look: the model itself');
  ok(lookModel(m, { palette: null, size: 1.35 }).color === '#fff', 'no palette keeps the colour');
  const rng = () => 0.999;
  ok(lookModel(m, { palette: ['#1', '#2'], size: 1 }, rng).color === '#2', 'palette pick stays in range');
}

// de wereldstreken van ronde 39 (#61): kliko is een verkeerstreek met een eigen look, de andere drie zijn schakelaars
const kl = TRAFFIC_STREKEN.find((s) => s.id === 'kliko');
ok(kl && kl.look && kl.look.size < 1 && kl.look.palette.length >= 3, 'kliko: kleine grijs-groen-blauwe auto\'s');
for (const id of ['kliko', 'kleinemensjes', 'reuzenduif', 'altijdgroen']) ok(CHEATS.some((c) => c.id === id && c.name && c.desc), id + ' staat in de cheatlijst');
ok(CHEATS.find((c) => c.id === 'kliko').group === 'verkeer', 'kliko hoort bij de verkeerstreken');

// Jelle's trekker-limo (#61): de auto's van het verkeer worden het model van de limo, de rijeigenschappen blijven
const tl = TRAFFIC_STREKEN.find((s) => s.id === 'trekkerlimo');
ok(tl && tl.look && tl.look.swap && tl.look.swap.name === 'trekkerlimo', 'trekkerlimo: een ander model');
const base = { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#2f3a52' };
const lm = lookModel(base, tl.look, () => 0.1);
ok(lm.name === 'trekkerlimo' && lm.len === 5.6 && lm.wid === 2.0 && lm.maxSpeed === 50 && /^#/.test(lm.color) && lm.color !== base.color, 'trekkerlimo: de auto wordt de limo, zwart, met de oude snelheid');
ok(base.name === 'sedan', 'het basismodel blijft heel');
for (const id of ['spiegelstad', 'disco', 'trekkerlimo']) ok(CHEATS.some((c) => c.id === id && c.name && c.desc && c.safe), id + ' staat in de cheatlijst als cosmetische streek');
ok(CHEATS.find((c) => c.id === 'trekkerlimo').group === 'verkeer', 'trekkerlimo hoort bij de verkeerstreken');

console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
