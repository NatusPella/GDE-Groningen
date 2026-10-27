// Game feel (game/js/gamefeel.js, #216): snelheids-FOV, timescale-dip, sprongbuffer, rakelings.
import { fovTarget, stepFov, FOV_MAX_BONUS, makeDip, triggerDip, dipScale, DIP_SCALE, makeJumpAssist, jumpStep, JUMP_BUFFER_S, COYOTE_S, makeNearMiss, nearMissBonus, NEAR_COOLDOWN_S } from '../game/js/gamefeel.js';
import { effectsFor } from '../game/js/a11ylogic.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const FX = effectsFor({}), RM = effectsFor({ reduceMotion: true });

// FOV: 0 onder 12 m/s, maximaal 8 graden vanaf 36 m/s, monotoon, uit bij bewegingsreductie
ok(fovTarget(0, FX) === 0 && fovTarget(12, FX) === 0, 'geen toeslag stilstaand');
ok(fovTarget(36, FX) === FOV_MAX_BONUS && fovTarget(120, FX) === FOV_MAX_BONUS, 'maximaal 8 graden');
ok(fovTarget(-50, FX) === fovTarget(50, FX), 'achteruit telt ook');
let prev = -1;
for (let v = 0; v <= 80; v += 2) { const t = fovTarget(v, FX); ok(t >= prev, 'monotoon', v); prev = t; }
ok(fovTarget(60, RM) === 0, 'FOV uit bij bewegingsreductie');
{
  let f = 0;
  for (let i = 0; i < 600; i++) { f = stepFov(f, 36, 1 / 60, FX); ok(f <= FOV_MAX_BONUS + 1e-9, 'geen overshoot'); }
  ok(Math.abs(f - FOV_MAX_BONUS) < 0.05, 'komt bij het doel', f);
  const first = stepFov(0, 70, 1 / 60, FX);
  ok(first > 0 && first < 0.5, 'gedempt, geen sprong', first);
  for (let i = 0; i < 600; i++) f = stepFov(f, 0, 1 / 60, FX);
  ok(f < 0.05, 'zakt terug');
}

// dip: alleen zware klappen of melee, 60-90 ms, niet bij bewegingsreductie, niet direct opnieuw
{
  const d = makeDip();
  ok(triggerDip(d, 10, { strength: 0.6 }, FX) === 0, 'op de grens nog geen dip');
  const ms = triggerDip(d, 10, { strength: 0.8 }, FX);
  ok(ms >= 60 && ms <= 90, 'duur 60-90 ms', ms);
  ok(dipScale(d, 10.01) === DIP_SCALE && dipScale(d, 10.2) === 1, 'dip is kort');
  ok(triggerDip(d, 10.2, { strength: 1 }, FX) === 0, 'geen stapeling');
  ok(triggerDip(d, 12, { melee: true }, FX) >= 60, 'melee-raak geeft een dip');
  const d2 = makeDip();
  ok(triggerDip(d2, 1, { strength: 1 }, RM) === 0 && triggerDip(d2, 1, { melee: true }, RM) === 0 && dipScale(d2, 1.01) === 1, 'dip uit bij bewegingsreductie');
  ok(triggerDip(makeDip(), 1, {}, FX) === 0, 'zonder klap geen dip');
}

// sprongbuffer en coyote
{
  let a = makeJumpAssist();
  ok(jumpStep(a, 0, true, true) === true, 'gewone sprong');
  a = makeJumpAssist(); jumpStep(a, 0, false, true);
  ok(jumpStep(a, COYOTE_S - 0.01, true, false) === true, 'coyote: net van de rand toch springen');
  a = makeJumpAssist(); jumpStep(a, 0, false, true);
  ok(jumpStep(a, COYOTE_S + 0.05, true, false) === false, 'te laat voor coyote');
  a = makeJumpAssist();
  ok(jumpStep(a, 1, true, false) === false, 'in de lucht: nog niets');
  ok(jumpStep(a, 1 + JUMP_BUFFER_S - 0.02, false, true) === true, 'buffer: te vroeg gedrukt, landt, springt');
  a = makeJumpAssist(); jumpStep(a, 1, true, false);
  ok(jumpStep(a, 1 + JUMP_BUFFER_S + 0.05, false, true) === false, 'buffer verlopen');
  a = makeJumpAssist(); jumpStep(a, 0, true, true);
  ok(jumpStep(a, 0.02, false, false) === false && jumpStep(a, 0.05, true, false) === false, 'geen dubbele sprong via coyote');
}

// rakelings: snelheid, ruimte, richting, afkoeling per paar
{
  const nm = makeNearMiss();
  const base = { pair: 'a-b', speed: 25, gap: 0.6, sameDir: 0.95 };
  const b = nearMissBonus(nm, 100, base);
  ok(b >= 5 && b <= 15, 'kleine bonus', b);
  ok(nearMissBonus(nm, 100 + NEAR_COOLDOWN_S - 1, base) === 0, 'afkoeling per paar');
  ok(nearMissBonus(nm, 100 + NEAR_COOLDOWN_S + 1, base) > 0, 'na de afkoeling weer');
  ok(nearMissBonus(nm, 100, { ...base, pair: 'a-c' }) > 0, 'ander paar heeft eigen afkoeling');
  ok(nearMissBonus(makeNearMiss(), 1, { ...base, sameDir: -0.9 }) === 0, 'tegen het verkeer in: niets');
  ok(nearMissBonus(makeNearMiss(), 1, { ...base, speed: 8 }) === 0, 'te langzaam');
  ok(nearMissBonus(makeNearMiss(), 1, { ...base, gap: 0 }) === 0 && nearMissBonus(makeNearMiss(), 1, { ...base, gap: 3 }) === 0, 'geraakt of te ruim: niets');
  const fast = nearMissBonus(makeNearMiss(), 1, { ...base, speed: 50 }), slow = nearMissBonus(makeNearMiss(), 1, { ...base, speed: 15 });
  ok(fast > slow, 'sneller geeft iets meer');
  const m = makeNearMiss();
  for (let i = 0; i < 500; i++) nearMissBonus(m, i * 20, { ...base, pair: 'p' + i });
  ok(m.at.size <= 70, 'geheugen blijft klein', m.at.size);
}

// #502: de drempels moeten een gewone stadsweg halen (50 km/u). De bonus zelf blijft streng
// (maximaal 1,2 m ruimte, zie NEAR_MAX_GAP); de teller/detectie in achievementtracker.js is
// bewust ruimer (1,9 m), zodat een pass op een stadsweg de prestatie wél laat oplopen.
{
  const kmh = (v) => v / 3.6;
  const city = { pair: 'stad-a', gap: 0.9, sameDir: 0.95 };
  ok(nearMissBonus(makeNearMiss(), 1, { ...city, speed: kmh(50) }) > 0, '50 km/u telt');
  ok(nearMissBonus(makeNearMiss(), 1, { ...city, speed: kmh(30) }) === 0, '30 km/u telt niet');
  ok(nearMissBonus(makeNearMiss(), 1, { ...city, speed: 12 }) > 0 && nearMissBonus(makeNearMiss(), 1, { ...city, speed: 11.9 }) === 0, 'grens ligt op 12 m/s');
  ok(nearMissBonus(makeNearMiss(), 1, { ...city, speed: 0 }) === 0 && nearMissBonus(makeNearMiss(), 1, { ...city, speed: -0.4 }) === 0, 'stilstand telt niet');
  ok(nearMissBonus(makeNearMiss(), 1, { ...city, speed: kmh(50), gap: 0 }) === 0 && nearMissBonus(makeNearMiss(), 1, { ...city, speed: kmh(50), gap: -0.8 }) === 0, 'een botsing telt niet');
}

// #502: de detectie in achievementtracker.js zelf -- ruimer dan 0,9 m, en geen 12 m-binnen-3 s-regel meer
{
  const fs = await import('node:fs');
  const tr = fs.readFileSync(new URL('../game/js/achievementtracker.js', import.meta.url), 'utf8');
  const gap = Number((tr.match(/const NEAR_MISS_GAP = ([0-9.]+)/) || [])[1]);
  const speed = Number((tr.match(/const NEAR_MISS_SPEED = ([0-9.]+)/) || [])[1]);
  ok(gap >= 1.8 && gap <= 2.0, 'detectie: ruimte past bij een stadsweg', gap);
  ok(speed <= 13.9, 'detectie: 50 km/u valt binnen de snelheidsdrempel', speed);
  ok(/gap > 0 && gap < NEAR_MISS_GAP/.test(tr), 'detectie: ruimte vanaf de carrosserie, botsing valt af');
  ok(!/const far = Math\.hypot/.test(tr) && !/w\.time - cand\.t < 3/.test(tr), 'detectie: geen 12 m-binnen-3 s-regel meer');
  ok(/dist > cand\.dist \+ NEAR_MISS_PASS/.test(tr) && /if \(cand\.done\) continue/.test(tr), 'detectie: telt als de afstand toeneemt, eenmaal per paar');
}

console.log(`gamefeel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
