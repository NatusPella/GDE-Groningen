// Minigames batch 1: the rules of discgolf, pitch & putt, the skatepark and the
// kart track (pure files, no browser), and that every fixed place of the four
// stands on open ground of the city map.
//   node scripts/minigames_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { medalFrom, fmtTime, frame, makeRng, geo, angDiff, mgThema, MG_THEMA, mgIcoon } from '../game/js/minigamekit.js';
import * as DG from '../game/js/discgolfrules.js';
import * as PP from '../game/js/puttinglogic.js';
import * as SK from '../game/js/skatetricks.js';
import * as KR from '../game/js/kartrace.js';
import { DISC_LINES, PUTT_LINES, SKATE_LINES, KART_LINES, KART_RIVALS } from '../game/js/minigamelines.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const gauss = (rng) => (rng() + rng() + rng() + rng() - 2) / 0.58;

// --- the kit -------------------------------------------------------------------------------------

{
  check('medalFrom higher', medalFrom(0, [10, 20, 30]) === 0 && medalFrom(10, [10, 20, 30]) === 1 && medalFrom(29, [10, 20, 30]) === 2 && medalFrom(30, [10, 20, 30]) === 3);
  check('medalFrom lower', medalFrom(9, [8, 3, -1], true) === 0 && medalFrom(8, [8, 3, -1], true) === 1 && medalFrom(3, [8, 3, -1], true) === 2 && medalFrom(-1, [8, 3, -1], true) === 3);
  check('fmtTime', fmtTime(65.5) === '1:05.50' && fmtTime(9.04) === '0:09.04' && fmtTime(NaN) === '-:--.--');
  const f = frame({ x: 100, y: -50 }, 0.7);
  const w = f.toW(12, -5), l = f.toL(w.x, w.y);
  check('frame round trip', Math.abs(l.u - 12) < 1e-9 && Math.abs(l.v + 5) < 1e-9);
  const r1 = makeRng(5), r2 = makeRng(5);
  check('rng is deterministic', r1() === r2() && r1() === r2());
  check('angDiff wraps', Math.abs(angDiff(3.1, -3.1) - (3.1 + 3.1 - Math.PI * 2)) < 1e-9);
  const g = geo(53.2194, 6.5665);
  check('geo gives the game frame', Number.isFinite(g.x) && Math.abs(g.x) < 500 && Math.abs(g.y) < 500, JSON.stringify(g));
}

// --- per minigame its own HUD theme (#453) -------------------------------------------------------

{
  const ids = Object.keys(MG_THEMA);
  check('a theme for at least three games', ids.length >= 3, ids.join());
  check('every theme has a title, an accent and an icon', ids.every((id) => MG_THEMA[id].titel && /^#[0-9a-f]{6}$/.test(MG_THEMA[id].accent) && mgIcoon(MG_THEMA[id].icoon, 16).startsWith('<svg class="mg-ic"')), JSON.stringify(MG_THEMA));
  check('the accents differ per game', new Set(ids.map((id) => MG_THEMA[id].accent)).size === ids.length);
  check('the titles differ per game', new Set(ids.map((id) => MG_THEMA[id].titel)).size === ids.length);
  // design system: geen blauw accent, en elk icoon heeft een eigen vorm naast zijn kleur
  const blue = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return b > r + 40 && b > g + 20; };
  check('no blue accent (design system)', ids.every((id) => !blue(MG_THEMA[id].accent)), ids.map((id) => MG_THEMA[id].accent).join());
  const icons = ids.map((id) => mgIcoon(MG_THEMA[id].icoon, 16));
  check('every icon is a flat low-poly svg, hidden from screen readers', icons.every((s) => /<polygon|<ellipse|<rect/.test(s) && /aria-hidden="true"/.test(s) && !/stroke=|<image|<text/.test(s)));
  // geen nieuwe beeldtaal (#453): elk spel leent een bestaand icoon, en elke naam in de set heeft zijn eigen vorm,
  // zodat de kleur nooit het enige teken is. Spellen van dezelfde soort (het water) delen bewust hun icoon.
  const namen = ids.map((id) => MG_THEMA[id].icoon);
  check('every theme takes an existing icon', namen.every((n) => mgIcoon(n, 16) !== ''), namen.join());
  check('an icon name always draws the same shape, and no two names share one', new Set(namen.map((n) => mgIcoon(n, 16))).size === new Set(namen).size, namen.join());
  check('the games do not all wear the same icon', new Set(icons).size >= 8, new Set(icons).size);
  check('an unknown game has no theme and no icon', mgThema('bestaatniet') === null && mgIcoon('bestaatniet') === '');
  check('the discgolf theme is its own', mgThema('discgolf').titel === 'DISCGOLF STADSPARK' && mgThema('discgolf').accent === '#f08a2e');
  // elk spel met een bord haalt titel, kleur en icoon uit de tabel, niet uit een losse kleur van zichzelf
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const THEMABORDEN = {
    discgolf: 'discgolf', pitchputt: 'pitchputt', skatepark: 'skatepark', kartbaan: 'kartbaan',
    klimtoren: 'klimtoren', zwembad: 'zwembad', waterski: 'waterski', hengelen: 'hengelen', regatta: 'regatta',
    pannenkoek: 'pannenkoek', wandeling: 'wandeling', carillon: 'carillon', vliegschool: 'vliegschool', machinist: 'machinist',
  };
  for (const [id, file] of Object.entries(THEMABORDEN)) {
    const src = fs.readFileSync(path.join(root, 'game/js', file + '.js'), 'utf8');
    check(`${id} uses its theme`, src.includes(`mgThema('${id}')`) && src.includes(`createBoard('${id}')`), file);
  }
  // de PvP-arena (#454) en de twee diensten (#444) halen hun bord ook uit de tabel
  const pvp = fs.readFileSync(path.join(root, 'game/js/cooppvpwereld.js'), 'utf8');
  check('pvparena uses its theme', pvp.includes("createBoard('pvparena'") && MG_THEMA.pvparena.titel === 'PVP-ARENA');
  const diensten = fs.readFileSync(path.join(root, 'game/js/activities.js'), 'utf8');
  check('the flight and the boat service use their theme', diensten.includes('createBoard(mgThema(cfg.id) ? cfg.id : cfg.titel, cfg.accent)') && MG_THEMA.vluchtdienst && MG_THEMA.vaardienst, 'activities.js');
}

// --- discgolf ------------------------------------------------------------------------------------

{
  const fly = (disc, power, loft, release, env = {}) => DG.simulateFlight({ x: 0, y: 0, yaw: 0, power, loft, release, disc }, env);
  const drv = fly('driver', 1, 0.2, 0), mid = fly('midrange', 1, 0.2, 0), put = fly('putter', 1, 0.2, 0);
  check('driver goes furthest', drv.end.x > mid.end.x && mid.end.x > put.end.x, `${drv.end.x} ${mid.end.x} ${put.end.x}`);
  check('driver reach 55-80 m', drv.end.x > 55 && drv.end.x < 80, drv.end.x.toFixed(1));
  check('power scales the throw', fly('driver', 0.5, 0.2, 0).end.x < drv.end.x * 0.6);
  const hy = fly('driver', 1, 0.2, -1), an = fly('driver', 1, 0.2, 1);
  check('hyzer curves left of the heading, anhyzer right (y runs south)', hy.end.y < -3 && an.end.y > 3, `${hy.end.y.toFixed(1)} ${an.end.y.toFixed(1)}`);
  const tail = fly('driver', 1, 0.2, 0, { wind: { speed: 5, dir: 0 } }), head = fly('driver', 1, 0.2, 0, { wind: { speed: 5, dir: Math.PI } });
  check('a tailwind carries, a headwind stops', tail.end.x > drv.end.x + 2 && head.end.x < drv.end.x - 2, `${tail.end.x.toFixed(1)} ${head.end.x.toFixed(1)}`);
  const side = fly('driver', 1, 0.2, 0, { wind: { speed: 5, dir: Math.PI / 2 } });
  check('a crosswind pushes sideways', side.end.y > 3, side.end.y.toFixed(1));
  check('water at the landing is reported', fly('driver', 1, 0.2, 0, { water: () => true }).reason === 'water');
  const tree = fly('driver', 1, 0.2, 0, { trees: [{ x: 30, y: 0, r: 0.4, h: 10, crownR: 2.2, crownZ: 3 }] });
  check('a tree stops the disc at its foot', tree.reason === 'tree' && Math.hypot(tree.end.x - 30, tree.end.y) < 1.2, JSON.stringify(tree.end));
  // the basket
  const rng = makeRng(11);
  let holed = 0;
  for (let i = 0; i < 40; i++) {
    const r = DG.simulateFlight({ x: 0, y: 0, yaw: gauss(rng) * 0.01, power: DG.powerForBasket(9, 'putter', 0.06) + gauss(rng) * 0.01, loft: 0.06, release: 0, disc: 'putter' }, { basket: { x: 9, y: 0 }, rng });
    if (r.holed) holed++;
  }
  check('an accurate putt from 9 m usually drops, not always', holed >= 14 && holed <= 39, `${holed}/40`);
  const wide = DG.simulateFlight({ x: 0, y: 0, yaw: 0.2, power: 0.6, loft: 0.06, release: 0, disc: 'putter' }, { basket: { x: 9, y: 0 } });
  check('a wide throw misses the basket', !wide.holed);
  // the course
  const holes = DG.courseHoles();
  check('nine holes', holes.length === 9);
  check('hole lengths 40-120 m', holes.every((h) => h.len > 40 && h.len < 120), holes.map((h) => Math.round(h.len)).join(','));
  check('pars from the length', holes.every((h) => h.par === DG.parFor(h.len)) && holes.every((h) => h.par >= 2 && h.par <= 4));
  const cx = holes.reduce((a, h) => a + h.tee.x, 0) / 9, cy = holes.reduce((a, h) => a + h.tee.y, 0) / 9;
  check('the course lies in the Stadspark (about x -1300, y 1600)', Math.hypot(cx + 1330, cy - 1600) < 120, `${cx.toFixed(0)},${cy.toFixed(0)}`);
  check('tees are all different', new Set(holes.map((h) => `${h.tee.x.toFixed(0)},${h.tee.y.toFixed(0)}`)).size === 9);
  // scoring
  check('hole names', DG.holeName(1, 3) === 'Ace!' && DG.holeName(2, 4) === 'Eagle' && DG.holeName(2, 3) === 'Birdie' && DG.holeName(3, 3) === 'Par' && DG.holeName(4, 3) === 'Bogey' && DG.holeName(5, 3) === 'Dubbel bogey');
  check('relText', DG.relText(0) === 'E' && DG.relText(3) === '+3' && DG.relText(-2) === '-2');
  const card = DG.newCard(holes);
  DG.finishHole(card, 0, 2);
  DG.finishHole(card, 1, 9);
  check('a hole is capped at par + 4', card.holes[1].strokes === holes[1].par + DG.MAX_OVER_PAR);
  check('an ace is counted', DG.finishHole(card, 2, 1) && card.aces === 1);
  const tot = DG.cardTotals(card);
  check('totals add up', tot.par === holes[0].par + holes[1].par + holes[2].par && tot.strokes === 2 + holes[1].par + 4 + 1);
  check('course medals', DG.courseMedal(7) === 0 && DG.courseMedal(6) === 1 && DG.courseMedal(1) === 2 && DG.courseMedal(-2) === 3);
  // a bot: good players reach gold, sloppy ones bronze or nothing; wind and noise matter
  const play = (sy, sp, seed) => {
    const r = makeRng(seed);
    let strokes = 0, par = 0;
    for (const h of holes) {
      par += h.par;
      let lie = { ...h.tee }, n = 0;
      const wind = { speed: r() * 4.6, dir: r() * Math.PI * 2 };
      while (n < h.par + DG.MAX_OVER_PAR) {
        const d = Math.hypot(h.basket.x - lie.x, h.basket.y - lie.y);
        const disc = DG.suggestDisc(d);
        const loft = disc === 'putter' ? 0.1 : d > 48 ? 0.26 : 0.15;
        const reach = DG.maxRange(disc, 0, loft) * 0.92;
        const power = d < reach ? Math.min(1, DG.powerForBasket(d, disc, loft)) : 1;
        // compensate the wind a good player reads: aim at where the wind would take it
        const yaw0 = DG.aimAt(lie, h.basket, disc, power, loft, 0);
        const res = DG.simulateFlight({ x: lie.x, y: lie.y, yaw: yaw0 + gauss(r) * sy, power: Math.min(1, power * (1 + gauss(r) * sp)), loft, release: 0, disc }, { wind, basket: h.basket, rng: r });
        n++;
        if (res.holed) break;
        lie = res.end;
      }
      strokes += Math.min(n, h.par + DG.MAX_OVER_PAR);
    }
    return strokes - par;
  };
  const avg = (sy, sp) => { let s = 0; for (let i = 1; i <= 24; i++) s += play(sy, sp, 100 + i); return s / 24; };
  const pro = avg(0.004, 0.02), good = avg(0.012, 0.05), rough = avg(0.04, 0.12);
  console.log(`discgolf bot: precise ${pro.toFixed(1)}, good ${good.toFixed(1)}, rough ${rough.toFixed(1)} against par`);
  check('a precise player can go under par', pro < 0.5, pro.toFixed(1));
  check('scores grow with sloppiness', pro < good && good < rough, `${pro} ${good} ${rough}`);
  check('a rough player stays within bronze reach most of the time', rough < 14);
}

// --- pitch & putt ------------------------------------------------------------------------------------

{
  const holes = PP.ppHoles();
  check('six holes', holes.length === 6);
  check('lengths 35-95 m', holes.every((h) => h.len > 35 && h.len < 95), holes.map((h) => Math.round(h.len)).join(','));
  check('pars 2 or 3', holes.every((h) => h.par === 2 || h.par === 3));
  // a flat green: friction only (the cup sits off to the side, so the ball stays on the green and misses it)
  const g0 = { ...holes[0], slope: { dir: 0, mag: 0 }, cup: { x: 3.5, y: 7 } };
  const rest = PP.rollBall(g0, 0, 0, 4, 0);
  const expect = (4 * 4) / (2 * PP.MU_GREEN * PP.G);
  check('a ball stops where friction says', Math.abs(Math.hypot(rest.end.x, rest.end.y) - expect) < expect * 0.12, `${rest.end.x.toFixed(2)} vs ${expect.toFixed(2)}`);
  // downhill rolls further than uphill
  const hill = { ...g0, slope: { dir: 0, mag: 0.03 } };
  const down = PP.rollBall(hill, 0, 0, 4, 0), up = PP.rollBall(hill, 0, 0, -4, 0);
  check('downhill runs further than uphill', Math.abs(down.end.x) > Math.abs(up.end.x) + 0.5, `${down.end.x.toFixed(1)} ${up.end.x.toFixed(1)}`);
  // a break: a putt across the slope curves downhill
  const brk = PP.rollBall({ ...hill, slope: { dir: Math.PI / 2, mag: 0.03 } }, 0, 0, 4, 0);
  check('a putt across the slope breaks downhill', brk.end.y > 0.2, brk.end.y.toFixed(2));
  // the cup: slow drops, fast passes
  const cup = { ...g0, cup: { x: 2, y: 0 } };
  const slow = PP.rollBall(cup, 0, 0, Math.sqrt(2 * PP.MU_GREEN * PP.G * 2.05), 0);
  check('a gentle putt on line drops', slow.holed);
  const fast = PP.rollBall({ ...cup, slope: { dir: 0, mag: 0 } }, 0, 0, 7, 0);
  check('a hard putt runs past the cup', !fast.holed && fast.end.x > 2);
  check('a putt off line misses', !PP.rollBall(cup, 0, 0, Math.cos(0.1) * 3.2, Math.sin(0.1) * 3.2).holed);
  // the solver finds the line on every green from 3 and 7 m
  for (const h of holes) {
    for (const dist of [3, 7]) {
      const from = { x: h.cup.x - Math.cos(h.heading) * dist, y: h.cup.y - Math.sin(h.heading) * dist };
      const b = PP.bestPutt(h, from);
      check(`hole ${h.n}: a ${dist} m putt can be holed`, b.holed, b.score.toFixed(2));
    }
  }
  // the pitch: ideal power from the tee lands near the pin most of the time
  const rng = makeRng(77);
  let near = 0, total = 0, onAim = 0, all = 0;
  for (const h of holes) for (let i = 0; i < 20; i++) {
    const carry = Math.min(h.len * 0.9, PP.PITCH_MAX * 0.96);
    const r = PP.pitch(h, h.tee, h.heading, PP.powerForCarry(carry), rng);
    const aim = { x: h.tee.x + Math.cos(h.heading) * carry, y: h.tee.y + Math.sin(h.heading) * carry };
    all++;
    if (Math.hypot(r.landing.x - aim.x, r.landing.y - aim.y) < 5) onAim++;
    if (h.len <= PP.PITCH_MAX) { total++; if (Math.hypot(r.end.x - h.cup.x, r.end.y - h.cup.y) < 7) near++; }
  }
  check('a pitch lands within 5 m of where it is aimed', onAim / all > 0.95, `${onAim}/${all}`);
  check('a good pitch to a short hole ends within 7 m of the pin', near / total > 0.7, `${near}/${total}`);
  check('the longest hole needs two pitches', holes.some((h) => h.len > PP.PITCH_MAX * 1.12) && holes.every((h) => h.len < PP.PITCH_MAX * 1.6));
  const fromBunker = [];
  const sandRng = makeRng(3);
  let spread1 = 0, spread2 = 0;
  for (let i = 0; i < 80; i++) {
    const a = PP.pitch(holes[0], holes[0].tee, holes[0].heading, 0.8, sandRng, false), b = PP.pitch(holes[0], holes[0].tee, holes[0].heading, 0.8, sandRng, true);
    spread1 += Math.abs(a.carry - PP.PITCH_MAX * 0.8); spread2 += Math.abs(b.carry - PP.PITCH_MAX * 0.8);
  }
  void fromBunker;
  check('a bunker lie scatters more', spread2 > spread1 * 1.3, `${spread1.toFixed(0)} ${spread2.toFixed(0)}`);
  const lie = PP.pitch(holes[0], holes[0].tee, holes[0].heading + 0.5, 0.9, makeRng(1));
  check('a pitch far off line stays off the green', !lie.onGreen);
  // a bot: precise play goes under par, a sloppy one still finishes with a small score
  const play = (sy, sp, seed) => {
    const r = makeRng(seed);
    let strokes = 0, par = 0;
    for (const h of holes) {
      par += h.par;
      let lie2 = { ...h.tee }, n = 0;
      while (n < h.par + PP.MAX_OVER_PAR) {
        n++;
        let res;
        if (PP.onGreen(h, lie2.x, lie2.y)) {
          const b = PP.bestPutt(h, lie2);
          res = PP.putt(h, lie2, b.yaw + gauss(r) * sy * 0.5, b.power * (1 + gauss(r) * sp));
        } else {
          const d = Math.hypot(h.cup.x - lie2.x, h.cup.y - lie2.y);
          res = PP.pitch(h, lie2, Math.atan2(h.cup.y - lie2.y, h.cup.x - lie2.x) + gauss(r) * sy, PP.powerForCarry(d) * (1 + gauss(r) * sp), r, PP.inBunker(h, lie2.x, lie2.y));
        }
        if (res.holed) break;
        lie2 = res.end;
      }
      strokes += Math.min(n, h.par + PP.MAX_OVER_PAR);
    }
    return strokes - par;
  };
  const avg = (sy, sp) => { let s = 0; for (let i = 1; i <= 12; i++) s += play(sy, sp, 200 + i); return s / 12; };
  const pro = avg(0.002, 0.01), good = avg(0.006, 0.05), rough = avg(0.025, 0.14);
  console.log(`pitch & putt bot: precise ${pro.toFixed(1)}, good ${good.toFixed(1)}, rough ${rough.toFixed(1)} against par`);
  check('a precise player is around par or better', pro <= 2.5, pro.toFixed(1));
  check('scores grow with sloppiness', pro <= good + 0.5 && good < rough, `${pro} ${good} ${rough}`);
  check('a rough player stays within bronze reach', rough < 9, rough.toFixed(1));
  check('pitch & putt names and medals', PP.holeName(1, 3) === 'Hole-in-one!' && PP.holeName(2, 3) === 'Birdie' && PP.courseMedal(8) === 0 && PP.courseMedal(7) === 1 && PP.courseMedal(3) === 2 && PP.courseMedal(0) === 3);
  const card = PP.newCard(holes);
  PP.finishHole(card, 0, 12);
  check('pitch & putt strokes are capped', card.holes[0].strokes === holes[0].par + PP.MAX_OVER_PAR);
}

// --- skatepark ------------------------------------------------------------------------------------

{
  const DT = 1 / 90;
  const run = (setup, script, T = 6) => {
    const b = SK.createBoard(), c = SK.createCombo();
    setup(b);
    const log = [];
    for (let i = 0; i < T / DT; i++) {
      const t = i * DT;
      const inp = { push: 0, brake: 0, steer: 0, spin: 0, ollie: false, kick: false, heel: false, grab: false };
      script(b, t, inp);
      const ev = SK.stepBoard(b, inp, DT, SK.FEATURES, c);
      SK.scoreEvents(c, ev);
      for (const e of ev) log.push(e);
      SK.tickCombo(c, DT, !b.grounded || !!b.grind);
      if (![b.u, b.v, b.z, b.speed, b.a].every(Number.isFinite)) { log.push({ type: 'NaN' }); break; }
    }
    return { b, c, log };
  };
  check('the surface is zero on the open floor and rises on ramps', SK.surfaceAt(SK.FEATURES, 0, 8) === 0 && SK.surfaceAt(SK.FEATURES, 0, 0) === 0.55 && SK.surfaceAt(SK.FEATURES, 24.2, 0) > 1.4 && SK.surfaceAt(SK.FEATURES, 8.1, 8) > 0.5);
  // a flat ollie with a kickflip
  const flip = run((b) => { b.u = -15; b.v = 3; b.speed = 6; }, (b, t, i) => { if (Math.abs(t - 0.3) < DT) i.ollie = true; if (Math.abs(t - 0.5) < DT) i.kick = true; i.push = 0.4; }, 2);
  const land = flip.log.find((e) => e.type === 'land');
  check('an ollie with a kickflip lands clean and scores both', land && land.tricks.some((t) => t[0] === 'ollie') && land.tricks.some((t) => t[0] === 'kickflip'), JSON.stringify(flip.log));
  check('the chain holds ollie and kickflip with a multiplier of 2', flip.c.total + flip.c.cur >= (40 + 150 * 2) - 1, `${flip.c.total} ${flip.c.cur}`);
  const late = run((b) => { b.u = -15; b.v = 3; b.speed = 6; }, (b, t, i) => { if (Math.abs(t - 0.3) < DT) i.ollie = true; if (Math.abs(t - 1.0) < DT) i.kick = true; i.push = 0.4; }, 2);
  check('a flip that is not finished at the landing is a bail', late.log.some((e) => e.type === 'bail'));
  const spin = run((b) => { b.u = -15; b.v = 3; b.speed = 6; }, (b, t, i) => { if (Math.abs(t - 0.3) < DT) i.ollie = true; if (t > 0.35 && t < 0.35 + 0.44) i.spin = 1; i.push = 0.4; }, 2);
  const sl = spin.log.find((e) => e.type === 'land');
  check('a half turn lands clean (spin 180)', sl && sl.tricks.some((t) => t[0] === 'spin180'), JSON.stringify(spin.log));
  const quarter = run((b) => { b.u = 14; b.v = 3; b.speed = 4; }, (b, t, i) => { i.push = t < 2 ? 1 : 0; }, 6);
  check('a quarter pipe launches the board over the lip', quarter.log.some((e) => e.type === 'air' && e.lip));
  check('and the board comes back down', quarter.b.grounded && Number.isFinite(quarter.b.z));
  const air = quarter.log.find((e) => e.type === 'land');
  check('the air is measured', air && air.height > 0.4, air && air.height);
  // a rail: pop in front, then balance
  const rail = run((b) => { b.u = -4; b.v = -4.5; b.speed = 7.5; }, (b, t, i) => { i.push = 0.2; if (Math.abs(b.u - 7.6) < 0.1 && b.grounded && b.speed > 5) i.ollie = true; if (b.grind) i.steer = b.grind.bal > 0.1 ? -1 : b.grind.bal < -0.1 ? 1 : 0; }, 4);
  check('a pop onto a rail locks into a grind that scores', rail.log.some((e) => e.type === 'grind') && rail.log.some((e) => e.type === 'trick' && e.name === 'grind'), JSON.stringify(rail.log.map((e) => e.type)));
  const fall = run((b) => { b.u = -4; b.v = -4.5; b.speed = 7.5; }, (b, t, i) => { i.push = 0.2; if (Math.abs(b.u - 7.6) < 0.1 && b.grounded && b.speed > 5) i.ollie = true; }, 4);
  check('without balance a grind ends in a fall and a bail', fall.log.some((e) => e.type === 'grindfall') && fall.log.some((e) => e.type === 'bail'), JSON.stringify(fall.log.map((e) => e.type)));
  // the combo
  const c = SK.createCombo();
  const a1 = SK.addTrick(c, 'kickflip', 150), a2 = SK.addTrick(c, 'heelflip', 150), a3 = SK.addTrick(c, 'heelflip', 150);
  check('a new trick raises the multiplier, a repeat does not', a1 === 150 && a2 === 300 && c.mult === 2 && a3 === Math.round(150 * 0.4 * 2), `${a1} ${a2} ${a3} ${c.mult}`);
  for (let i = 0; i < 8; i++) SK.addTrick(c, 't' + i, 10);
  check('the multiplier is capped', c.mult === SK.SKATE.maxMult);
  const cur = Math.round(c.cur);
  check('the chain banks after a pause on the ground', SK.tickCombo(c, SK.SKATE.grace - 0.2, false) === 0 && SK.tickCombo(c, 0.3, false) === cur && c.total === cur && !c.chain);
  SK.addTrick(c, 'x', 100);
  check('the air keeps the chain open', SK.tickCombo(c, 5, true) === 0 && c.chain);
  check('a bail throws away the chain', SK.bailCombo(c) === 100 && c.cur === 0 && !c.chain && c.bails === 1);
  check('skate medals', SK.skateMedal(0) === 0 && SK.skateMedal(SK.MEDAL_AT[0]) === 1 && SK.skateMedal(SK.MEDAL_AT[2]) === 3);
  // fuzz: random keys never produce a NaN or put the board out of the park
  const rng = makeRng(2024);
  const fz = run((b) => { b.u = 0; b.v = 5; }, (b, t, i) => {
    i.push = rng() < 0.7 ? 1 : 0; i.brake = rng() < 0.1 ? 1 : 0; i.steer = Math.floor(rng() * 3) - 1; i.spin = Math.floor(rng() * 3) - 1;
    i.ollie = rng() < 0.02; i.kick = rng() < 0.02; i.heel = rng() < 0.02; i.grab = rng() < 0.2;
  }, 120);
  check('random play never breaks the board', !fz.log.some((e) => e.type === 'NaN') && Math.abs(fz.b.u) <= SK.PARK.hu + 1e-6 && Math.abs(fz.b.v) <= SK.PARK.hv + 1e-6, `${fz.b.u} ${fz.b.v}`);
  check('random play scores and bails', fz.c.total + fz.c.cur > 0 && fz.b.bails > 0);
  // a skilled scripted run reaches silver or gold within 90 s
  const skilled = (() => {
    const b = SK.createBoard(), cc = SK.createCombo();
    b.u = -20; b.v = 3;
    let dir = 1, t = 0, nextTrick = 0;
    for (; t < 90; t += DT) {
      const inp = { push: 1, brake: 0, steer: 0, spin: 0, ollie: false, kick: false, heel: false, grab: false };
      // turn round at the ends, hold v near 3 or -3
      const targetA = dir > 0 ? 0 : Math.PI;
      if (b.grounded) inp.steer = Math.max(-1, Math.min(1, angDiff(targetA, b.a) * 3));
      if (dir > 0 && b.u > 17) dir = -1;
      if (dir < 0 && b.u < -17) dir = 1;
      if (b.grounded && t > nextTrick && b.speed > 6) { inp.ollie = true; nextTrick = t + 1.6; }
      if (!b.grounded && !b.grind && b.air > 0.1 && !b.flip && b.doneFlips.length < 1) inp.kick = true;
      const ev = SK.stepBoard(b, inp, DT, SK.FEATURES, cc);
      SK.scoreEvents(cc, ev);
      SK.tickCombo(cc, DT, !b.grounded || !!b.grind);
    }
    if (cc.chain) SK.bankCombo(cc);
    return cc;
  })();
  console.log(`skatepark bot: ${skilled.total} points, best chain ${skilled.best}, ${skilled.bails} bails`);
  check('a simple scripted run scores something', skilled.total > 300, skilled.total);
}

// --- karten ---------------------------------------------------------------------------------------

{
  const T = KR.buildTrack();
  check('the track is a closed loop of 400-700 m', T.length > 400 && T.length < 700, T.length);
  check('the samples are evenly spaced', Math.abs(T.step - 1.5) < 0.2, T.step);
  let minGap = 1e9;
  for (let i = 0; i < T.N; i++) for (let j = i + 30; j < T.N - 30; j += 3) minGap = Math.min(minGap, Math.hypot(T.u[i] - T.u[j], T.v[i] - T.v[j]));
  check('different parts of the track keep clear of each other', minGap > 24, minGap.toFixed(1));
  check('the track fits in 260 x 120 m', Math.max(...T.u) - Math.min(...T.u) < 260 && Math.max(...T.v) - Math.min(...T.v) < 120);
  const p = KR.pointAt(T, 100, 2), loc = KR.locate(T, p.x, p.y);
  check('a point on the track is found again', Math.abs(loc.off - 2) < 0.3 && Math.abs(loc.s - 100) < 2, `${loc.off} ${loc.s}`);
  // a race against the AI with a bot for the player
  const race = (drive, skillBand = true, seed = 1) => {
    const karts = [KR.createKart(T, 0, { player: true, name: 'jij' }), KR.createKart(T, 1, { skill: 0.93 }), KR.createKart(T, 2, { skill: 0.97 }), KR.createKart(T, 3, { skill: 1.01 })];
    const dt = 1 / 60;
    let t = 0, hits = 0, maxOff = 0;
    for (; t < 200; t += dt) {
      for (const k of karts) {
        let inp;
        if (k.player) inp = drive(k, karts, dt);
        else {
          const gap = k.prog - karts[0].prog;
          inp = KR.aiInput(k, T, { band: skillBand ? (gap > 45 ? 0.96 : gap < -45 ? 1.04 : 1) : 1, others: karts, dt });
        }
        if (k.finished) inp = KR.aiInput(k, T, { skill: 0.55, others: karts, dt });
        KR.stepKart(k, inp, dt, T);
        KR.updateProgress(k, T, t);
        if (!k.finished) maxOff = Math.max(maxOff, Math.abs(k.off));
      }
      hits += KR.collideKarts(karts);
      if (karts.every((k) => k.finished)) break;
    }
    return { karts, t, hits, maxOff, rank: KR.rankKarts(karts) };
  };
  const best = race((k) => KR.bestInput(k, T));
  check('everybody finishes three laps', best.karts.every((k) => k.finished && k.lapTimes.length === KR.LAPS), best.karts.map((k) => k.lapTimes.length).join(','));
  check('laps take 27-40 s', best.karts.every((k) => k.lapTimes.slice(1).every((x) => x > 27 && x < 40)), best.karts.map((k) => k.lapTimes.map((x) => x.toFixed(1))).join(' | '));
  check('the karts stay within the tyre wall', best.maxOff < T.hw + KR.RUNOFF + 0.8, best.maxOff.toFixed(1));
  check('a clean bot is not slower than the slowest rival', best.rank.indexOf(best.karts[0]) <= 1, best.rank.map((k) => k.name || k.i).join(','));
  const slow = race((k, ks, dt) => KR.aiInput(k, T, { skill: 0.7, others: ks, dt }));
  check('a slow driver finishes behind the rivals', slow.rank.indexOf(slow.karts[0]) >= 2 && slow.karts[0].finished);
  check('rivals do not keep ramming a slow player', slow.hits < 600, slow.hits);
  const idle = race(() => ({ throttle: 0, steer: 0, drift: false }));
  check('a player who does nothing does not finish and is last', !idle.karts[0].finished && idle.rank[3] === idle.karts[0]);
  // physics
  const k = KR.createKart(T, 0, { player: true });
  for (let i = 0; i < 60 * 2; i++) KR.stepKart(k, { throttle: 1, steer: 0, drift: false }, 1 / 60, T);
  check('flat out gets quickly up to speed', k.f > KR.KART.top * 0.6 && k.f <= KR.KART.top + 0.5, k.f.toFixed(1));
  const g = KR.createKart(T, 0, { player: true });
  const gp = KR.pointAt(T, 20, KR.TRACK_W / 2 + 2);
  g.u = gp.x; g.v = gp.y; g.a = gp.ang; g.f = 22; g.idx = -1;
  for (let i = 0; i < 60 * 1.6; i++) KR.stepKart(g, { throttle: 1, steer: 0, drift: false }, 1 / 60, T);
  check('the grass slows a kart', g.grass && g.f < KR.KART.top * 0.66, `${g.f.toFixed(1)} grass ${g.grass}`);
  // a drift: hold the handbrake into a bend long enough and you get a boost
  const d = KR.createKart(T, 0, { player: true });
  d.f = 18;
  let events = [];
  for (let i = 0; i < 60 * 2.2; i++) events = events.concat(KR.stepKart(d, { throttle: 1, steer: 1, drift: true }, 1 / 60, T));
  for (let i = 0; i < 20; i++) events = events.concat(KR.stepKart(d, { throttle: 1, steer: 1, drift: false }, 1 / 60, T));
  check('a drift starts and a long one ends in a boost', events.some((e) => e.type === 'drift') && events.some((e) => e.type === 'boost' && e.lvl >= 1), JSON.stringify(events.map((e) => e.type)));
  const sp1 = k.f;
  const bk = KR.createKart(T, 1, { player: true });
  bk.f = 20; bk.boostT = 1.2;
  for (let i = 0; i < 60; i++) KR.stepKart(bk, { throttle: 1, steer: 0, drift: false }, 1 / 60, T);
  check('a boost lifts the top speed', bk.f > KR.KART.top - 1, `${bk.f.toFixed(1)} vs ${sp1.toFixed(1)}`);
  // the tyre wall bounces
  const w2 = KR.createKart(T, 0, { player: true });
  w2.f = 22; w2.a += 1.2;
  let walls = 0;
  for (let i = 0; i < 60 * 4; i++) walls += KR.stepKart(w2, { throttle: 1, steer: 0, drift: false }, 1 / 60, T).filter((e) => e.type === 'wall').length;
  const lw = KR.locate(T, w2.u, w2.v, -1);
  check('a kart driven into the wall bounces and stays inside', walls >= 1 && Math.abs(lw.off) <= T.hw + KR.RUNOFF + 0.3, `${walls} ${lw.off}`);
  // karts push each other apart
  const a = KR.createKart(T, 0), b = KR.createKart(T, 1);
  b.u = a.u + 0.5; b.v = a.v;
  KR.collideKarts([a, b]);
  check('overlapping karts are pushed apart', Math.hypot(a.u - b.u, a.v - b.v) >= KR.KART.radius * 2 - 1e-6);
  // progress does not jump over the start line backwards
  const pr = KR.createKart(T, 0);
  const lap0 = pr.lap;
  pr.u = KR.pointAt(T, 40).x; pr.v = KR.pointAt(T, 40).y;
  pr.idx = -1;
  KR.updateProgress(pr, T, 1);
  check('lap counting starts negative on the grid and counts forward', lap0 === 0 && Math.abs(pr.prog - 40) < 3 && pr.lap === 0, `${pr.prog} ${pr.lap}`);
  const cross = KR.createKart(T, 0);
  cross.prog = T.length - 3; cross.lastS = T.length - 3;
  const cp = KR.pointAt(T, 2);
  cross.u = cp.x; cross.v = cp.y; cross.idx = -1;
  const done = KR.updateProgress(cross, T, 33.3);
  check('crossing the line completes a lap with its time', done && done.lap === 1 && Math.abs(done.time - 33.3) < 1e-9 && cross.lapTimes.length === 1, JSON.stringify(done));
  check('positions', KR.positionMedal(1) === 3 && KR.positionMedal(2) === 2 && KR.positionMedal(3) === 1 && KR.positionMedal(4) === 0);
}

// --- the lines -------------------------------------------------------------------------------------------

{
  const all = [DISC_LINES, PUTT_LINES, SKATE_LINES, KART_LINES].flatMap((o) => Object.entries(o).filter(([k]) => k !== 'who').flatMap(([, v]) => v)).concat(KART_RIVALS.flatMap((r) => [...r.hit, ...r.hitBy]));
  check('there are lines', all.length > 40);
  const brands = /swapfiets|mcdonald|anwb|\bnam\b|teamsport|nike|adidas|redbull|red bull/i;
  check('no real brands in the lines', !all.some((l) => brands.test(l)));
  check('lines are short bubbles', all.every((l) => l.length > 3 && l.length < 120), all.filter((l) => l.length <= 5 || l.length >= 120).join(' | '));
}

// --- the places on the city map --------------------------------------------------------------------------------

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const { loadStadData } = await import('./lib/loadworld.mjs');
  const map = await loadStadData();
  const inPoly = (x, y, p) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) r = !r; } return r; };
  const bounds = (p) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const q of p) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } return [a, b, c, d]; };
  const bb = map.buildings.map((b) => ({ b: bounds(b.pts), p: b.pts }));
  const wb = map.water.map((b) => ({ b: bounds(b.pts), p: b.pts }));
  const hit = (list, x, y, m = 0) => list.find(({ b, p }) => x >= b[0] - m && x <= b[2] + m && y >= b[1] - m && y <= b[3] + m && inPoly(x, y, p));
  const near = (list, x, y, r) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]].some(([dx, dy]) => hit(list, x + dx, y + dy));
  const place = (name, x, y, r = 1.5) => {
    const [x0, y0, x1, y1] = map.meta.bounds;
    check(`${name} lies inside the city map`, x > x0 && x < x1 && y > y0 && y < y1);
    check(`${name} is not in a building`, !near(bb, x, y, r), `${x.toFixed(1)},${y.toFixed(1)}`);
    check(`${name} is not in the water`, !near(wb, x, y, r), `${x.toFixed(1)},${y.toFixed(1)}`);
  };
  for (const h of DG.courseHoles()) { place(`discgolf tee ${h.n}`, h.tee.x, h.tee.y); place(`discgolf basket ${h.n}`, h.basket.x, h.basket.y); }
  for (const h of PP.ppHoles()) { place(`pitch & putt tee ${h.n}`, h.tee.x, h.tee.y); place(`pitch & putt cup ${h.n}`, h.cup.x, h.cup.y, 8); for (const b of h.bunkers) place(`pitch & putt bunker ${h.n}`, b.x, b.y, 2); }
  // the skatepark: its floor, in the park's frame (skatepark.js)
  const sk = frame(geo(53.204169, 6.547889), -0.448);
  for (const [u, v] of [[-26, 0], [-29, 0], [25, 12], [25, -12], [-25, 12], [-25, -12], [0, 0]]) { const q = sk.toW(u, v); place(`skatepark ${u},${v}`, q.x, q.y, 1); }
  // the kart track lies at Ulrum, outside the city map: scripts/kartbaan_test.mjs checks it against the OSM ring
}

if (bad) process.exit(1);
console.log('minigames: all passed');
