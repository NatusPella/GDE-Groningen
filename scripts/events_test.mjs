// Rules of the open-world events, batch 2 (eventrules.js): the earthquake, the
// blue-green algae, the Ontzet fireworks and the German tourists. Pure, no browser.
//   node scripts/events_test.mjs
import * as E from '../game/js/eventrules.js';
import { makeRng } from '../game/js/minigamekit.js';
import { day, specialsOn } from '../game/js/calendar.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- earthquake
{
  const rng = makeRng(3);
  const first = E.rollQuakeGap(rng, true), gap = E.rollQuakeGap(rng);
  check('first quake comes after a while', first >= E.QUAKE.first[0] && first <= E.QUAKE.first[1], first);
  check('gap between quakes', gap >= E.QUAKE.gap[0] && gap <= E.QUAKE.gap[1], gap);
  const q = E.rollQuake(rng);
  check('quake is short and light', q.dur >= 5 && q.dur <= 8 && q.mag >= 1.6 && q.mag <= 3.1, JSON.stringify(q));
  check('envelope: zero before and after', E.quakeEnvelope(-1, 6) === 0 && E.quakeEnvelope(6, 6) === 0 && E.quakeEnvelope(9, 6) === 0);
  let peak = 0, mono = true, prev = 0;
  for (let t = 0; t < 6; t += 0.05) {
    const v = E.quakeEnvelope(t, 6);
    peak = Math.max(peak, v);
    if (t > 3.2 && v > prev + 1e-9) mono = false;
    prev = v;
  }
  check('envelope peaks near 1, fades monotonically', peak > 0.95 && peak <= 1 && mono, peak);
  check('envelope rises quickly', E.quakeEnvelope(0.4, 6) > 0.4);
  let maxJ = 0;
  for (let t = 0; t < 20; t += 0.013) { const j = E.quakeJitter(t, 1); maxJ = Math.max(maxJ, Math.abs(j.x), Math.abs(j.y), Math.abs(j.z)); if (![j.x, j.y, j.z].every(Number.isFinite)) maxJ = Infinity; }
  check('shake is small and finite', maxJ > 0.02 && maxJ <= E.QUAKE.maxShake + 1e-9, maxJ);
  check('no shake without amplitude', E.quakeJitter(1, 0).x === 0);
  check('strength grows with magnitude', E.quakeStrength(3.1) > E.quakeStrength(1.6) && E.quakeStrength(1.6) >= 0.3 && E.quakeStrength(9) <= 1);
  check('bike wobble is small', Math.abs(E.bikeWobble(0.37, 1, 5)) <= 0.035 && E.bikeWobble(1, 0, 2) === 0);
  const calm = { wanted: 0 };
  check('quake may start when calm', E.mayQuake(calm));
  for (const k of ['cinematic', 'minigame', 'paused', 'dead', 'indoors', 'heliRun', 'pigeon', 'call', 'mission', 'sideJob']) check(`no quake during ${k}`, !E.mayQuake({ ...calm, [k]: true }));
  check('no quake while wanted', !E.mayQuake({ wanted: 2 }));
  const news = E.quakeNewsText(2.4, makeRng(1));
  check('news has the magnitude with a comma', /2,4/.test(news) && !news.includes('{m}'), news);
  const all = [...E.QUAKE_NEWS, ...E.QUAKE_BARKS].join(' ').toLowerCase();
  check('respectful: no damage jokes, no blame', !/(lol|haha|dood|doden|slachtoffer|ingestort|schuld|crimin|schurk|gasbedrijf)/.test(all), all);
  check('the company in the news is the fictional one', E.QUAKE_NEWS.some((t) => t.includes('Delfstof Noord')) && E.QUAKE_NEWS.filter((t) => /Delfstof/.test(t)).length === 1);
  check('no damage reported', E.QUAKE_NEWS.every((t) => /(geen schade|alles in orde)/i.test(t)));
}

// --- algae
{
  const lake = { id: 5, bounds: [0, 0, 400, 300], area: 90000 };
  const inWater = (x, y) => x > 20 && x < 380 && y > 20 && y < 280;
  let days = 0, withPatches = 0;
  for (let d = 1; d <= 60; d++) {
    if (E.algaeDay(d)) days++;
    const p = E.algaePatches(lake, d, inWater);
    if (p.length) withPatches++;
    check(`algae day ${d}: patches only on algae days`, E.algaeDay(d) === (p.length > 0));
  }
  check('some days have algae, some do not', days > 12 && days < 48, days);
  const d1 = [...Array(40).keys()].map((i) => i + 1).find((d) => E.algaeDay(d));
  const a = E.algaePatches(lake, d1, inWater), b = E.algaePatches(lake, d1, inWater);
  check('patches are deterministic', JSON.stringify(a) === JSON.stringify(b) && a.length > 0);
  check('patches stay in the water and apart', a.every((p) => inWater(p.x, p.y) && inWater(p.x + p.r * 0.8, p.y) && inWater(p.x, p.y - p.r * 0.8)) && a.every((p, i) => a.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) >= p.r + q.r)));
  check('a small pond gets none', E.algaePatches({ ...lake, area: 2000 }, d1, inWater).length === 0);
  check('no patches without water', E.algaePatches(lake, d1, () => false).length === 0);
  check('patchAt finds a patch', a.length > 0 && E.patchAt(a, a[0].x + 1, a[0].y) === a[0] && E.patchAt(a, -999, -999) === null);
  const on = E.algaeEffect(true), off = E.algaeEffect(false);
  check('algae slows and tires', on.speed < 0.8 && on.staminaDrain > 1 && off.speed === 1 && off.hurtPerS === 0);
  check('health drops slowly, never below the floor', E.algaeHurt(100, 1, on) < 100 && E.algaeHurt(100, 1, on) > 98 && E.algaeHurt(41, 5, on) === 40 && E.algaeHurt(30, 5, on) === 30 && E.algaeHurt(100, 1, off) === 100);
  check('the next algae day is an algae day and not before today', [1, 2, 3, 10, 33].every((d) => E.algaeDay(E.nextAlgaeDay(d)) && E.nextAlgaeDay(d) >= d));
  check('the sign says niet zwemmen', E.ALGAE_SIGN[0] === 'NIET ZWEMMEN');
}

// --- fireworks
{
  const ontzet = day(8, 28);
  check('Ontzet is a special day', specialsOn(ontzet).some((s) => s.id === 'ontzet'));
  check('no show by day', !E.showState(14, true).on && !E.showState(20, true).on);
  check('no show on other days', !E.showState(22.5, false).on);
  const mid = E.showState(22.5, true);
  check('show in the evening', mid.on && mid.progress > 0.3 && mid.progress < 0.7, JSON.stringify(mid));
  check('show runs past midnight edge', !E.showState(23.6, true).on && !E.showState(Number.NaN, true).on);
  check('finale at the end', E.showState(23.4, true).progress >= E.SHOW.finaleAt);
  const rng = makeRng(9);
  check('shells come faster in the finale', E.shellGap(0.95, rng) < 0.6 && E.shellGap(0.3, rng) >= 1.1);
  const centre = { x: 100, y: 76 };
  let ok = true, high = 0;
  for (let i = 0; i < 300; i++) {
    const s = E.makeShell(rng, centre, i % 3 ? 0.5 : 0.95);
    if (Math.hypot(s.x - centre.x, s.y - centre.y) > E.SHOW.launchSpread + 1e-9) ok = false;
    if (!(s.h >= E.SHOW.minH && s.h <= E.SHOW.maxH * 1.1 + 1e-9) || !(s.rise > 0.9) || !s.color.every((c) => c >= 0 && c <= 1) || !['peony', 'ring', 'willow'].includes(s.kind) || !(s.n > 10)) ok = false;
    if (s.h > 110) high++;
  }
  check('shells launch over the Grote Markt, burst high in the sky', ok && high > 10);
  check('sound lags with distance, capped', E.soundLag(0) === 0 && E.soundLag(343) === 1 && E.soundLag(5000) === 2.2);
}

// --- German tourists
{
  const mk = (o) => E.touristTarget({ market: true, hour: 13, nearCentre: true, ...o });
  check('tourists on the market day at noon', mk({}) === E.TOURISTS.max);
  check('fewer in the morning', mk({ hour: 9.5 }) > 0 && mk({ hour: 9.5 }) < E.TOURISTS.max);
  check('none at night, off the market or away from the centre', mk({ hour: 22 }) === 0 && mk({ market: false }) === 0 && mk({ nearCentre: false }) === 0);
  check('the bloemetjesmarkt is on 12 September', specialsOn(day(9, 12)).some((s) => s.id === 'bloemetjesmarkt') && !specialsOn(day(9, 11)).some((s) => s.id === 'bloemetjesmarkt'));
  const g = E.touristGroup(makeRng(4));
  check('groups of two or three', g.size >= 2 && g.size <= 3 && /^#[0-9a-f]{6}$/i.test(g.shirt));
  check('lines are German and short', E.GERMAN_LINES.length >= 10 && E.GERMAN_LINES.every((t) => t.length < 70 && /[a-zäöüß]/.test(t)) && E.GERMAN_LINES.some((t) => /Fahrr|Bus|Blume|Turm/.test(t)));
  const real = /(albert|lidl|aldi|bmw|vw|volkswagen|ikea)/i;
  check('no real brands', ![...E.GERMAN_LINES, ...E.GERMAN_HELLO, ...E.QUAKE_NEWS, ...E.ALGAE_SIGN, E.ALGAE_NEWS].some((t) => real.test(t)));
}

console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
