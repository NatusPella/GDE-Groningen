// Spelbot (#186, de bordspellen en de kermis), zonder Electron:
//   node scripts/bot_bord_test.mjs
// De beslissingen zijn puur (game/js/botlogic.js); dit bestand laat ze tegen de *spelregels* lopen:
//  1. discgolf: de echte baan en het echte vliegmodel (discgolfrules.js courseHoles/simulateFlight). Een worp
//     komt bij de mand uit en een ronde van negen banen levert een medaille, met en zonder wind;
//  2. fierljep: de echte naald van het post-game-duel (pg_fierljep.js FIERLJEP.keys/update): twee keer drukken
//     op het midden, dertien tikken in de klim, en de sprong komt voorbij de overkant en voorbij Jelle;
//  3. de kermis: de echte tent en de echte autobotsing (kermis.js steer/aiDrive/collide, hier nagebouwd met een
//     vast zaadje omdat ze niet exporteert), de echte prijzen en medailles uit de bron, en de keuze welk spel
//     met welke inzet;
//  4. het reuzenrad: de echte regels (reuzenradrules.js nearestToBoarding/secondsToNextGondola/mayExit) naast
//     de instap- en uitstapregel van de bot, over een hele omwenteling en een hele rit;
//  5. padel: de echte wedstrijd (padelmatch.js tikPadel) met de bottik op een stoel.
// Geen THREE-scene, geen DOM, geen netwerk, geen Math.random in de proef: elke run is dezelfde.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import './node3d.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const src = (f) => readFileSync(path.join(root, f), 'utf8');
const num = (text, re) => Number((text.match(re) || [])[1]);

const L = await imp('game/js/botlogic.js');
const D = await imp('game/js/discgolfrules.js');
const PG = await imp('game/js/pg_fierljep.js');
const W = await imp('game/js/reuzenradrules.js');
const P = await imp('game/js/padelmatch.js');
const K = await imp('game/js/minigamekit.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// --- 1. discgolf: de hoek en de kracht op de echte baan en het echte vliegmodel --------------------------
{
  const holes = D.courseHoles();
  ok(holes.length === 9, 'de baan van het Stadspark heeft negen banen', String(holes.length));
  const WINDEN = [
    ['windstil', null],
    ['2,1 m/s', { speed: 2.1, dir: 1.3 }],
    ['4,4 m/s dwarswind', { speed: 4.4, dir: -2.0 }],
    ['4,6 m/s tegen', { speed: 4.6, dir: Math.PI }],
  ];
  for (const [naam, wind] of WINDEN) {
    let hoogste = 0, dichtbijGoed = 0, dichtbijN = 0;
    const card = D.newCard(holes);
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      // een eigen zaadje per worp: de kettingen loten of de schijf blijft hangen (simulateFlight env.rng)
      const mkEnv = () => ({ basket: h.basket, ...(wind ? { wind } : {}), rng: K.makeRng(1 + i) });
      let lig = { ...h.tee }, worpen = 0;
      while (worpen < h.par + D.MAX_OVER_PAR) {
        const plan = L.discgolfWorp(lig, h.basket, { simulate: D.simulateFlight, env: mkEnv() });
        ok(plan && plan.power >= 0.12 && plan.power <= 1, `${naam} baan ${h.n}: een kracht binnen het bereik`, plan && String(plan.power));
        ok(plan && plan.yaw >= -Math.PI && plan.yaw <= Math.PI, `${naam} baan ${h.n}: een hoek in het wereldvlak`);
        ok(plan && ['driver', 'midrange', 'putter'].includes(plan.disc), `${naam} baan ${h.n}: een schijf van het spel`);
        // dezelfde lig, dezelfde wind en hetzelfde zaadje geven altijd dezelfde worp (deterministisch)
        const nog = L.discgolfWorp(lig, h.basket, { simulate: D.simulateFlight, env: mkEnv() });
        ok(nog.yaw === plan.yaw && nog.power === plan.power && nog.release === plan.release, `${naam} baan ${h.n}: dezelfde worp bij dezelfde invoer`);
        const r = D.simulateFlight({ x: lig.x, y: lig.y, yaw: plan.yaw, power: plan.power, loft: plan.loft, release: plan.release, disc: plan.disc }, mkEnv());
        worpen++;
        const af = Math.hypot(r.end.x - h.basket.x, r.end.y - h.basket.y);
        if (worpen === 1) { hoogste = Math.max(hoogste, af); ok(af < D.CIRCLE_M || h.len > 55 || r.holed, `${naam} baan ${h.n}: de eerste worp komt in de buurt`, `${Math.round(af)} m`); }
        // elke worp vanaf de lig komt bij de mand uit (of erin): dat is het werk van de bot
        if (worpen > 1) { dichtbijN++; if (r.holed || af <= D.CIRCLE_M) dichtbijGoed++; else ok(false, `${naam} baan ${h.n}: worp ${worpen} komt bij de mand`, `${Math.round(af)} m`); }
        if (r.holed) break;
        ok(r.reason !== 'water', `${naam} baan ${h.n}: geen plons op het droge park`);
        lig = { ...r.end };
      }
      ok(worpen <= h.par + D.MAX_OVER_PAR, `${naam} baan ${h.n}: binnen de slagen van het spel`, String(worpen));
      D.finishHole(card, i, worpen);
    }
    const t = D.cardTotals(card);
    const medaille = D.courseMedal(t.rel);
    ok(medaille >= 1, `${naam}: de ronde levert een medaille`, `${D.relText(t.rel)} t.o.v. par, medaille ${medaille}`);
    ok(t.rel <= D.MEDAL_REL[1], `${naam}: netjes rond par`, D.relText(t.rel));
    ok(dichtbijN > 0 && dichtbijGoed === dichtbijN, `${naam}: elke vervolgworp komt bij de mand uit`, `${dichtbijGoed}/${dichtbijN}`);
    ok(hoogste < 45, `${naam}: de eerste worp is de verre worp, niet de wilde`, `${Math.round(hoogste)} m`);
  }
  // dichtbij (de closest-to-the-basket-ronde): drie worpen op de mand van de baan die er het dichtst bij 70 m ligt
  const ctp = holes.reduce((a, h) => (Math.abs(h.len - 70) < Math.abs(a.len - 70) ? h : a), holes[0]);
  const worpen = [];
  for (let i = 0; i < 3; i++) {
    const env = () => ({ basket: ctp.basket, wind: { speed: 1.5, dir: 0.4 }, rng: K.makeRng(5 + i) });
    const plan = L.discgolfWorp(ctp.tee, ctp.basket, { simulate: D.simulateFlight, env: env() });
    const r = D.simulateFlight({ x: ctp.tee.x, y: ctp.tee.y, yaw: plan.yaw, power: plan.power, loft: plan.loft, release: plan.release, disc: plan.disc }, env());
    worpen.push(r.holed ? 0 : Math.hypot(r.end.x - ctp.basket.x, r.end.y - ctp.basket.y));
  }
  const ext = await imp('game/js/discgolfext.js');
  const ronde = ext.ctpRound(worpen);
  ok(ronde.points > 100, 'dichtbij: drie worpen op dezelfde mand leveren punten', `${ronde.points} punten, ${worpen.map((d) => Math.round(d)).join('/')} m`);
  // zonder vliegmodel blijft er een schatting over (de pagina werkt ook zonder de regelmodule)
  const schat = L.discgolfWorp(ctp.tee, ctp.basket, {});
  ok(schat && schat.why === 'schatting' && schat.disc === 'driver', 'zonder model: een schatting met de afstandsschijf', schat && schat.why);
}

// --- 2. fierljep: de echte naald van het duel (pg_fierljep.js) -------------------------------------------
{
  // de getallen van het spel, uit de bron: ze staan in de kop van FIERLJEP in botlogic.js
  const pg = src('game/js/pg_fierljep.js');
  ok(num(pg, /const NEEDLE_HZ = \[(\d+(?:\.\d+)?)/) === L.FIERLJEP.hz[0], 'fierljep: de eerste naaldzwaai is die van het spel', String(num(pg, /const NEEDLE_HZ = \[(\d+(?:\.\d+)?)/)));
  ok(num(pg, /NEEDLE_HZ = \[[^\]]*,\s*(\d+(?:\.\d+)?)/) === L.FIERLJEP.hz[1], 'fierljep: de tweede naaldzwaai is die van het spel');
  ok(num(pg, /const CLIMB_S = (\d+(?:\.\d+)?)/) === L.FIERLJEP.klimS, 'fierljep: de klim duurt 2,2 s');
  ok(num(pg, /const CLIMB_TAPS = (\d+)/) === L.FIERLJEP.klimTik, 'fierljep: dertien tikken is een volle klim');
  ok(num(pg, /const BONUS_MAX = (\d+)/) === L.FIERLJEP.bonus && num(pg, /const GOLD_BONUS = (\d+(?:\.\d+)?)/) === L.FIERLJEP.goud, 'fierljep: 8 m bonus, 6,6 m voor goud');
  ok(/0\.35 \* q1 \+ 0\.35 \* q2 \+ 0\.3 \* q3/.test(pg), 'fierljep: de weging van de drie kwaliteiten is die van het spel');
  ok(/s\.width \+ 2\.2 \+ bonus/.test(pg), 'fierljep: de afstand is de sloot plus 2,2 m plus de bonus');

  // Een poging op de echte module: twee keer de naald, dan de klim. De naaldtijd en de naaldstand zetten we
  // zelf (pg_fierljep loot ze met Math.random), zodat elke run dezelfde is; de faseovergangen, de kwaliteit en
  // de klok komen uit het spel.
  const d3 = (q, tikken) => [...q, Math.min(1, tikken / L.FIERLJEP.klimTik)];
  function poging(breedte, startT) {
    const run = { world: {}, data: { phase: 'aim1', attempt: 0, best: 0, jbest: 0, jumps: [], width: breedte, needle: 0.5, needleT: startT, q: [], s: { runup: { x: 0, y: 0 }, from: { x: 0, y: 0 }, dir: { x: 1, y: 0 }, width: breedte }, vault: null, wait: 0.6, press: false }, ui: { setRows: () => {}, setSlot: () => {} } };
    const dt = 1 / 60;
    const mem = {};
    let vorigeFase = '', tikken = 0;
    const input = (hit) => ({ wasPressed: (k) => hit && k === ' ', consume: () => {} });
    for (let i = 0; i < 60 * 20; i++) {
      const d = run.data;
      if (d.phase !== vorigeFase) {
        // een nieuwe naald: een vaste stand per fase, zodat de proef niet van Math.random afhangt. De stand en
        // de tijd horen bij elkaar (aim rekent de naald uit de tijd), anders springt de naald bij de eerste tik
        if (d.phase === 'aim1' || d.phase === 'aim2') {
          d.needleT = startT + (d.phase === 'aim2' ? 0.37 : 0);
          d.needle = 0.5 + 0.5 * Math.sin(d.needleT * Math.PI * 2);
        }
        vorigeFase = d.phase;
      }
      let tik = { press: false };
      if (d.phase === 'aim1' || d.phase === 'aim2') tik = L.fierljepTik({ fase: d.phase, needle: d.needle, wacht: d.wait, dt }, mem);
      else if (d.phase === 'climb') { tik = L.fierljepKlim({ tikken: d.taps || 0, klimT: d.climbT }); tikken = d.taps || 0; }
      if (d.phase === 'climb' && d.climbT <= dt * 1.5) break;   // de sprong zelf (poleVault) heeft een scene nodig
      PG.FIERLJEP.keys(run, input(!!tik.press));
      PG.FIERLJEP.update(run, dt);
    }
    return { q: run.data.q, tikken, kwal: d3(run.data.q, tikken) };
  }
  let pogingen = 0;
  for (const breedte of [7, 12, 19]) {
    const uit = poging(breedte, 0.11);
    ok(uit.q.length === 2, `fierljep ${breedte} m: twee naalddrukken geteld`, String(uit.q.length));
    ok(uit.q.every((q) => q > 0.9), `fierljep ${breedte} m: beide drukken op het midden`, uit.q.map((q) => q.toFixed(2)).join('/'));
    ok(uit.tikken >= L.FIERLJEP.klimTik, `fierljep ${breedte} m: dertien tikken in de klim`, String(uit.tikken));
    const sprong = L.fierljepSpring(uit.kwal, breedte);
    ok(!sprong.faal, `fierljep ${breedte} m: geen plons`, JSON.stringify(sprong));
    ok(sprong.afstand > breedte + L.FIERLJEP.basis + 2, `fierljep ${breedte} m: over de overkant`, `${sprong.afstand.toFixed(1)} m over ${breedte} m water`);
    ok(sprong.goud, `fierljep ${breedte} m: goud (voorbij Jelle)`, sprong.bonus.toFixed(2));
    pogingen++;
  }
  ok(pogingen === 3, 'fierljep: drie sloten geprobeerd');
  // een druk in de pauze telt niet (de eerste proef drukte op de stilstaande naald en kreeg q 0,02)
  ok(L.fierljepTik({ fase: 'aim2', needle: 0.5, wacht: 0.2, dt: 1 / 60 }).press === false, 'fierljep: in de pauze drukt de bot niet');
  // een naald ver van het midden: wachten, geen druk
  ok(L.fierljepTik({ fase: 'aim1', needle: 0.12, wacht: 0, dt: 1 / 60 }).press === false, 'fierljep: ver van het midden wacht de bot');
  // na dertien tikken hamert hij niet door
  ok(L.fierljepKlim({ tikken: 13, klimT: 1 }).press === false, 'fierljep: na dertien tikken stopt het hameren');
  // een slechte greep is een plons en telt niet
  const mis = L.fierljepSpring([0.2, 0.9, 1], 12);
  ok(mis.faal && !mis.goud, 'fierljep: een greep onder 0,3 is een plons');
}

// --- 3. de kermis: de botsauto's in de echte tent, met de echte punten ------------------------------------
{
  const kermis = src('game/js/kermis.js');
  const road = src('game/js/roadaccess.js');
  ok(num(kermis, /const CAR_R = (\d+(?:\.\d+)?)/) === L.KERMIS.autoR, "kermis: de auto heeft de straal van het spel", String(num(kermis, /const CAR_R = (\d+(?:\.\d+)?)/)));
  ok(num(kermis, /const RIDE_S = (\d+)/) === L.KERMIS.ritS, 'kermis: een rit duurt 75 s');
  ok(num(kermis, /const PRICE = (\d+)/) === L.KERMIS.prijs, 'kermis: een ritje kost EUR 3');
  ok(JSON.stringify(JSON.parse((kermis.match(/const PRIZE = (\[[^\]]*\])/) || [])[1])) === JSON.stringify(L.KERMIS.prijzen), 'kermis: het prijzengeld is 0/5/12/25');
  ok(JSON.stringify(JSON.parse((kermis.match(/const MEDAL_AT = (\[[^\]]*\])/) || [])[1])) === JSON.stringify(L.KERMIS.medailles), 'kermis: de medailles liggen bij 60/110/160 punten');
  ok(new RegExp(`hu: ${L.KERMIS.hu}, hv: ${L.KERMIS.hv}`).test(road), 'kermis: de tent is 20 bij 12 m (roadaccess.js)', String(num(road, /hu: (\d+), hv: (\d+)/)));
  ok(/Math\.abs\(head\) < 0\.55 \? 'flank'/.test(kermis) && /\* 1\.3 \* \(flank === 'flank' \? 1\.8/.test(kermis), 'kermis: de flank is 0,55 van de kop en 1,8 keer de punten');
  ok(L.KERMIS.prijzen[3] === 25 && L.KERMIS.medailles[1] === 60, 'kermis: de hoogste prijs hoort bij de hoogste medaille');

  // de punten van een bots, zoals kermis.js ze telt
  ok(L.kermisPunten({ into: 2, hoek: 0, combo: 1 }) === 5, 'kermis: een bots in de flank van 2 m/s telt 5 punten', String(L.kermisPunten({ into: 2, hoek: 0, combo: 1 })));
  ok(L.kermisPunten({ into: 2, hoek: 1, combo: 1 }) < L.kermisPunten({ into: 2, hoek: 0, combo: 1 }), 'kermis: kop op kop telt minder dan de flank');
  ok(L.kermisPunten({ into: 2, hoek: 0, combo: 3 }) > L.kermisPunten({ into: 2, hoek: 0, combo: 1 }), 'kermis: een reeks telt meer');

  // welk spel, welke inzet
  ok(L.kermisKeuze({ verhaal: true, geld: 0 }).prijs === 0, 'kermis: in het verhaal is de rit gratis');
  ok(L.kermisKeuze({ geld: 3 }).speel === 'botsauto' && L.kermisKeuze({ geld: 3 }).prijs === 3, "kermis: met EUR 3 in de zak de botsauto's");
  ok(L.kermisKeuze({ geld: 5, avond: true }).bonus === true, 'kermis: op een kermisavond dubbel prijzengeld');
  ok(L.kermisKeuze({ geld: 2 }).speel === 'hoogvlieger', 'kermis: te weinig voor de auto, genoeg voor het rad');
  ok(L.kermisKeuze({ geld: 1 }).speel === null, 'kermis: met een euro doet de bot niets');

  // --- de tent en de auto's, nagebouwd uit kermis.js (steer, aiDrive, collide) ---------------------------
  const HU = L.KERMIS.hu, HV = L.KERMIS.hv, CAR_R = L.KERMIS.autoR, RIDE_S = L.KERMIS.ritS, DT = 1 / 60;
  const START = [[-6, 0, 0], [6, 0, Math.PI], [-2, -3.5, 0.6], [2, 3.5, -2.4], [-2, 3.5, -0.6], [2, -3.5, 2.4]];
  function tent(seed) {
    const rnd = L.seededRandom(seed);
    const cars = START.map(([u, v, a], i) => ({ u, v, a, vu: 0, vv: 0, va: 0, player: i === 0, mate: i === 1, hitT: -9, byMeT: -9, ai: { tx: rnd() * 2 * (HU - 2) - (HU - 2), ty: rnd() * 2 * (HV - 2) - (HV - 2), chase: 0, t: 1 + rnd() * 2 } }));
    return { cars, rnd };
  }
  function steer(car, thr, turn, dt, max = 5) {
    const ca = Math.cos(car.a), sa = Math.sin(car.a);
    car.va += (turn * 2.6 - car.va) * Math.min(1, dt * 6);
    car.a += car.va * dt;
    if (car.a > Math.PI) car.a -= Math.PI * 2; else if (car.a < -Math.PI) car.a += Math.PI * 2;
    car.vu += ca * thr * 7 * dt; car.vv += sa * thr * 7 * dt;
    const sp = Math.hypot(car.vu, car.vv);
    if (sp > max) { car.vu *= max / sp; car.vv *= max / sp; }
    const f = Math.exp(-dt * (thr ? 0.9 : 1.8));
    car.vu *= f; car.vv *= f;
  }
  function aiDrive(car, cars, dt, rnd) {
    const ai = car.ai;
    ai.t -= dt;
    const me = cars[0];
    if (ai.t <= 0) {
      ai.t = 1.5 + rnd() * 2;
      ai.chase = rnd() < (car.mate ? 0.55 : 0.4) ? 1 : 0;
      ai.tx = rnd() * 2 * (HU - 2) - (HU - 2); ai.ty = rnd() * 2 * (HV - 2) - (HV - 2);
      if (!ai.chase && rnd() < 0.5) { const o = cars[1 + Math.floor(rnd() * (cars.length - 1))]; if (o !== car) { ai.tx = o.u; ai.ty = o.v; } }
    }
    const tx = ai.chase ? me.u + me.vu * 0.4 : ai.tx, ty = ai.chase ? me.v + me.vv * 0.4 : ai.ty;
    const want = Math.atan2(ty - car.v, tx - car.u);
    let da = want - car.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const turn = Math.max(-1, Math.min(1, da * 1.6));
    const thr = Math.abs(da) > 2.2 ? -0.4 : Math.hypot(tx - car.u, ty - car.v) < 1.5 ? 0.2 : 0.85;
    steer(car, thr, turn, dt, car.mate ? 4.8 : 4.3);
  }
  function collide(g, cars, rnd) {
    for (const c of cars) {
      const lu = HU - CAR_R, lv = HV - CAR_R;
      if (Math.abs(c.u) > lu) { c.u = Math.sign(c.u) * lu; c.vu = -c.vu * 0.55; }
      if (Math.abs(c.v) > lv) { c.v = Math.sign(c.v) * lv; c.vv = -c.vv * 0.55; }
    }
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i], b = cars[j];
        const du = b.u - a.u, dv = b.v - a.v, d = Math.hypot(du, dv);
        if (d >= CAR_R * 2 || d < 1e-4) continue;
        const nu = du / d, nv = dv / d, push = (CAR_R * 2 - d) / 2;
        a.u -= nu * push; a.v -= nv * push; b.u += nu * push; b.v += nv * push;
        const rel = (a.vu - b.vu) * nu + (a.vv - b.vv) * nv;
        if (rel <= 0) continue;
        const me = a.player ? a : b.player ? b : null, other = me === a ? b : a;
        const n0 = me === a ? nu : -nu, n1 = me === a ? nv : -nv;
        const myV = me ? me.vu * n0 + me.vv * n1 : 0, theirV = me ? -(other.vu * n0 + other.vv * n1) : 0;
        const imp = rel * 0.9;
        a.vu -= imp * nu; a.vv -= imp * nv; b.vu += imp * nu; b.vv += imp * nv;
        a.va += (rnd() - 0.5) * rel; b.va += (rnd() - 0.5) * rel;
        if (!me) continue;
        const into = myV;
        if (into < 1.1 || into < theirV * 0.8 || g.t - me.hitT < 0.35 || g.t - (other.byMeT ?? -9) < 1.2) continue;
        me.hitT = g.t; other.byMeT = g.t;
        const head = Math.cos(other.a) * n0 + Math.sin(other.a) * n1;
        g.combo = g.t - g.comboT < 2.2 ? g.combo + 1 : 1;
        g.comboT = g.t;
        // de punten zoals kermis.js ze telt (lettend op de flank, de kop en de reeks), en ernaast de functie van de bot
        const pts = Math.max(1, Math.round(into * 1.3 * (Math.abs(head) < 0.55 ? 1.8 : head < 0 ? 1.4 : 0.7) * (1 + Math.min(4, g.combo - 1) * 0.25)));
        if (pts !== L.kermisPunten({ into, hoek: head, combo: g.combo })) g.puntenFout = (g.puntenFout || 0) + 1;
        g.score += pts;
        g.hits++;
      }
    }
  }
  // een hele rit: de bot rijdt, de vijf anderen rijden zelf
  function rit(seed) {
    const { cars, rnd } = tent(seed);
    const g = { t: 0, score: 0, hits: 0, combo: 0, comboT: 0 };
    const mem = {};
    let t = 0, langzaam = 0, rand = 0, houd = 0;
    while (t < RIDE_S) {
      g.t = t;
      const d = L.kermisStap({ u: cars[0].u, v: cars[0].v, a: cars[0].a, t, hu: HU, hv: HV }, mem);
      if (d.hold) houd++;
      if (!d.throttle) langzaam++;
      steer(cars[0], d.throttle, d.turn, DT, 5.2);
      for (let i = 1; i < cars.length; i++) aiDrive(cars[i], cars, DT, rnd);
      for (const c of cars) { c.u += c.vu * DT; c.v += c.vv * DT; }
      collide(g, cars, rnd);
      if (Math.abs(cars[0].u) > HU - CAR_R + 0.01 || Math.abs(cars[0].v) > HV - CAR_R + 0.01) rand++;
      t += DT;
    }
    return { g, langzaam, rand, houd, t };
  }
  const uit = [7, 11, 23].map((seed) => ({ seed, ...rit(seed) }));
  for (const u of uit) {
    ok(u.g.score >= L.KERMIS.medailles[1], `kermis ${u.seed}: de rit levert een medaille`, `${u.g.score} punten, ${u.g.hits} botsen`);
    ok(u.g.hits >= 8, `kermis ${u.seed}: hij botst echt`, String(u.g.hits));
    ok(u.langzaam === 0 && u.houd === 0, `kermis ${u.seed}: de bot staat nooit stil (geen wachttijd)`, `${u.langzaam} keer geen gas, ${u.houd} keer hold`);
    ok(u.rand <= 2, `kermis ${u.seed}: hij blijft van het elastiek`, `${u.rand} beelden op de rand`);
    ok(!u.g.puntenFout, `kermis ${u.seed}: de punten van de bot zijn de punten van het spel`, `${u.g.puntenFout || 0} afwijkend`);
    ok(u.t >= RIDE_S - 0.02 && u.t < RIDE_S + 0.2, `kermis ${u.seed}: de rit duurt 75 s en stopt zelf`, `${u.t.toFixed(1)} s`);
  }
  const beste = Math.max(...uit.map((u) => u.g.score));
  ok(beste >= L.KERMIS.medailles[3], 'kermis: in een goede rit haalt hij goud', `${beste} punten`);
  // de rit is langer dan het speelbudget van de minigame-run (40 s): zonder een eigen budget stopt de pagina
  // hem voortijdig en is er geen prijs. De pagina trekt het budget op (minigames.page.js, BUDGET.kermis).
  ok(RIDE_S > 40, 'kermis: de rit past niet in het standaardbudget van 40 s; de pagina moet hem laten uitspelen', `${RIDE_S} s`);
}

// --- 4. het reuzenrad: instappen en uitstappen volgens de echte regels ------------------------------------
{
  ok(W.N === L.WHEEL.N && W.OMEGA === L.WHEEL.omega && W.LAPS === L.WHEEL.rondes && W.BOARD_WINDOW === L.WHEEL.raam, 'reuzenrad: de getallen van het rad zijn die van reuzenradrules.js', `${W.N}/${W.OMEGA}/${W.LAPS}/${W.BOARD_WINDOW}`);
  ok(W.PRICE === L.WHEEL.prijs && L.WHEEL.prijs < L.KERMIS.prijs, 'reuzenrad: het rad is goedkoper dan de botsauto (EUR 2 tegen 3)');
  let verschil = 0, geprobeerd = 0;
  for (let rot = -3; rot < 3; rot += 0.017) {
    geprobeerd++;
    const s = L.hoogvliegerStap({ rot, inGondel: false });
    const nb = W.nearestToBoarding(rot);
    if ((s.wacht === 0) !== nb.ok) verschil++;
    if (nb.ok && s.index !== nb.index) verschil++;
    if (!nb.ok && Math.abs(s.wacht - W.secondsToNextGondola(rot)) > 1e-6) verschil++;
  }
  ok(verschil === 0, 'reuzenrad: de instapregel is die van het spel, over een hele omwenteling', `${geprobeerd} standen, ${verschil} verschillen`);
  // de rit: twee rondes, dan uitstappen op het laagste punt
  const plan = W.ridePlan(0.3, 4);
  let rot = 0.3, t = 0, stap = null, magUitFout = 0, uitT = null;
  while (t < 200) {
    stap = L.hoogvliegerStap({ rot, inGondel: true, plan });
    if (stap.hold && !stap.klaar) { /* de rit loopt: de pagina houdt de wachtteller vast */ }
    if (!stap.klaar && stap.magUit) { /* onderaan tijdens de rit: nog niet uit */ }
    if (stap.press) { uitT = t; if (!W.mayExit(plan, rot)) magUitFout++; break; }
    rot += W.OMEGA / 60;
    t += 1 / 60;
  }
  ok(uitT != null, 'reuzenrad: de bot stapt uit', uitT == null ? 'niet' : `${uitT.toFixed(0)} s`);
  ok(magUitFout === 0 && uitT != null && W.mayExit(plan, rot), 'reuzenrad: hij stapt alleen uit als het spel het toestaat');
  ok(uitT != null && Math.abs(uitT - (plan.endRot - plan.startRot) / W.OMEGA) < 25, 'reuzenrad: na de twee rondes van de rit', uitT == null ? '-' : `${uitT.toFixed(0)} s, rit ${Math.round((plan.endRot - plan.startRot) / W.OMEGA)} s`);
  ok(uitT != null && uitT > 40, 'reuzenrad: de rit duurt langer dan het standaardbudget van 40 s; de pagina moet hem uitzitten', uitT == null ? '-' : `${uitT.toFixed(0)} s`);
  ok(L.hoogvliegerStap({ rot: plan.endRot - 0.05, inGondel: true, plan }).hold === true, 'reuzenrad: vlak voor het eind wacht hij nog (hold, geen time-out)');
}

// --- 5. padel: de bottik op een stoel van de echte wedstrijd ---------------------------------------------
{
  const MENSEN = (k) => [{ slot: 0, naam: 'bot', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }, { slot: 2, naam: 'Rik' }, { slot: 3, naam: 'Sanne' }].slice(0, k);
  function wedstrijd(seed, mensen, bottik = () => true) {
    const m = P.maakPadel(mensen, { rng: K.makeRng(seed) });
    const mem = {};
    let t = 0, tikken = 0;
    const ev = [];
    while (m.fase !== 'klaar' && t < 900) {
      ev.push(...P.tikPadel(m, 1 / 60, (slot) => (bottik(slot) ? L.padelInvoer(m, slot, mem) : null)));
      tikken++;
      t += 1 / 60;
    }
    return { m, t, ev, tikken };
  }
  // de bot speelt zijn eigen stoel; de tegenstander doet niets (een standbeeld): de bot hoort te winnen
  const alleen = wedstrijd(7, MENSEN(2));
  ok(alleen.m.fase === 'klaar', 'padel: de wedstrijd komt af', `${alleen.m.phase} na ${Math.round(alleen.t)} s`);
  ok(alleen.m.games[0] > alleen.m.games[1], 'padel: de bot wint van een tegenstander die niets doet', alleen.m.games.join('-'));
  ok(alleen.m.games[0] + alleen.m.games[1] >= 2, 'padel: er zijn games gespeeld', alleen.m.games.join('-'));
  const punten = alleen.ev.filter((e) => e.type === 'punt').length;
  ok(punten >= 8, 'padel: er zijn punten gemaakt', String(punten));
  // de opslag komt in het vak: geen dubbele fouten door de stick van de bot
  const dubbel = alleen.ev.filter((e) => e.type === 'punt' && e.why === 'Dubbele fout').length;
  ok(dubbel === 0, 'padel: de opslag van de bot is geen dubbele fout', String(dubbel));
  // vier mensen (alle stoelen de bottik): de wedstrijd loopt af en er vallen punten
  const vol = wedstrijd(11, MENSEN(4));
  ok(vol.m.fase === 'klaar' && vol.m.games[0] + vol.m.games[1] >= 2, 'padel: 2 tegen 2 met vier bottikken speelt uit', vol.m.games.join('-'));
  ok(vol.ev.filter((e) => e.type === 'punt').length >= 6, 'padel: 2 tegen 2 levert punten op');
  // een stoel die wegvalt: de wedstrijd gaat door en de rest houdt zijn punten
  const m2 = P.maakPadel(MENSEN(4), { rng: K.makeRng(3) });
  const mem = {};
  let t2 = 0;
  while (m2.fase !== 'klaar' && t2 < 900) {
    if (t2 > 5) P.verlaatPadel(m2, 2);
    P.tikPadel(m2, 1 / 60, (slot) => L.padelInvoer(m2, slot, mem));
    t2 += 1 / 60;
  }
  ok(m2.fase === 'klaar', 'padel: ook als er iemand wegvalt komt de wedstrijd af');
  ok(m2.stoelen.filter((s) => s.slot !== null).length === 4, 'padel: de weggevallen stoel blijft in de uitslag staan');
  // zonder stoel geeft de bottik niets (een gast die niet meespeelt)
  const leeg = L.padelInvoer(m2, 9, {});
  ok(leeg.mx === 0 && leeg.my === 0 && leeg.buttons === 0, 'padel: zonder stoel geen invoer');
}

// --- 6. de paginascripts van de bot blijven parseerbaar ---------------------------------------------------
for (const f of ['scripts/bot/bot.page.js', 'scripts/bot/minigames.page.js']) {
  let goed = true, fout = '';
  try { new Function(`return (async () => {\n${src(f)}\n})`); } catch (e) { goed = false; fout = e.message; }
  ok(goed, `${f} is parseerbaar`, fout);
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
