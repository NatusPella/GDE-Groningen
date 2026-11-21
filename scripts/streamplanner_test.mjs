// Pure tests van de framebudget-planner (#1016, #1052, #1008): totaal budget, verdeling, schuld, verhongering, wachtrij.
//   node scripts/streamplanner_test.mjs
import assert from 'node:assert/strict';
import { PLAN, CLASSES, budgetFor, createFramePlanner } from '../game/js/streamplanner.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m}: ${a} ~ ${b}`);

// de gewichten tellen op tot 1
near(Object.values(CLASSES).reduce((a, b) => a + b, 0), 1, 1e-9, 'gewichten');

// het totale budget volgt de frametijd en is nooit meer dan het plafond
ok(budgetFor(10) === PLAN.capMs, 'snelle frame: volle budget');
ok(budgetFor(14) === PLAN.capMs, 'op de goede grens: nog vol');
ok(budgetFor(33) === PLAN.floorMs && budgetFor(100) === PLAN.floorMs, 'trage frame: vloer');
let prev = Infinity;
for (let f = 5; f <= 60; f += 1) { const b = budgetFor(f); ok(b <= prev + 1e-9, `monotoon dalend bij ${f} ms`); ok(b <= PLAN.capMs + 1e-9 && b >= PLAN.floorMs, 'binnen vloer en plafond'); prev = b; }
ok(budgetFor(10, { boost: true }) === PLAN.boostMs, 'sprong: boostplafond bij snelle frames');
ok(budgetFor(40, { boost: true }) === PLAN.floorMs, 'sprong maar trage frame: toch de vloer');
ok(budgetFor(20, { boost: true }) > budgetFor(20), 'sprong geeft in het midden meer');
ok(budgetFor(50, { loading: true }) === PLAN.loadingMs, 'achter de laadsluier mag alles');
ok(budgetFor(10, { cine: true }) < PLAN.capMs, 'een film: weinig');
ok(budgetFor(NaN) === PLAN.capMs, 'onbekende frametijd geeft geen NaN');

// één klasse in een leeg systeem krijgt het hele budget; met anderen met werk blijft hun aandeel vrij
{
  const pl = createFramePlanner();
  pl.beginFrame({ frameMs: 10 });
  near(pl.grant('building', 100), PLAN.capMs, 1e-9, 'alleen: alles');
  const pl2 = createFramePlanner();
  // alle klassen hebben recent hun aandeel gebruikt (de reservering volgt het gebruik, niet het aandeel)
  for (let i = 0; i < 80; i++) { pl2.beginFrame({ frameMs: 10 }); for (const k of Object.keys(CLASSES)) { const x = pl2.grant(k, 100); pl2.spend(k, x); } }
  pl2.beginFrame({ frameMs: 10 });
  const g = pl2.grant('tile', 100);
  ok(Math.abs(g - PLAN.capMs * CLASSES.tile) < 0.35, `met anderen die hun aandeel gebruiken: ongeveer zijn aandeel (${g.toFixed(2)} ms)`);
  // een klasse die weinig gebruikt laat ruimte vrij voor wie meer wil
  const pl3 = createFramePlanner();
  for (let i = 0; i < 80; i++) { pl3.beginFrame({ frameMs: 10 }); for (const k of Object.keys(CLASSES)) { const x = pl3.grant(k, k === 'actors' ? 0.2 : 100); pl3.spend(k, k === 'actors' ? Math.min(x, 0.2) : x); } }
  pl3.beginFrame({ frameMs: 10 });
  const gt = pl3.grant('tile', 0.8); pl3.spend('tile', gt); const gb = pl3.grant('building', 100);
  ok(gb > PLAN.capMs * CLASSES.building + 0.1, `de gebouwen krijgen meer dan hun aandeel als de actoren weinig gebruiken (${gb.toFixed(2)} ms)`);
  let sum = g; pl2.spend('tile', g);
  for (const k of Object.keys(CLASSES)) { if (k === 'tile') continue; const x = pl2.grant(k, 100); sum += x; pl2.spend(k, x); }
  ok(sum <= pl2.pool + 1e-9, `som toekenningen ${sum.toFixed(2)} <= pool ${pl2.pool.toFixed(2)}`);
  ok(sum >= pl2.pool * 0.95, 'en de pool wordt ook gebruikt');
}

// een klasse zonder werk laat zijn aandeel los (na activeFrames)
{
  const pl = createFramePlanner();
  for (let i = 0; i < PLAN.activeFrames + 2; i++) { pl.beginFrame({ frameMs: 10 }); pl.grant('building', 100); }
  pl.beginFrame({ frameMs: 10 });
  near(pl.grant('building', 100), PLAN.capMs, 1e-9, 'anderen zonder werk: het hele budget');
}

// schuld: een eenheid van 3 ms in een toekenning kleiner dan dat: het gemiddelde blijft rond het budget
{
  const pl = createFramePlanner();
  let total = 0, frames = 0, maxF = 0;
  for (let f = 0; f < 300; f++) {
    pl.beginFrame({ frameMs: 10 });
    const g = pl.grant('building', 100);
    let spent = 0;
    // een systeem dat altijd werk heeft; elke eenheid kost 3 ms; de eerste eenheid mag altijd, daarna alleen binnen g
    if (g > 0) { spent = 3; while (spent + 3 <= g) spent += 3; pl.spend('building', spent); }
    total += spent; frames++; maxF = Math.max(maxF, spent);
  }
  ok(total / frames <= PLAN.capMs + 0.3, `gemiddelde ${(total / frames).toFixed(2)} ms blijft rond het budget`);
  ok(maxF <= 3 * Math.ceil(PLAN.capMs / 3) + 3, 'en een frame is nooit meer dan een paar eenheden');
  ok(pl.stats().debt <= 0 && pl.stats().debt >= -PLAN.maxDebtFrames * PLAN.capMs - 1e-9, 'schuld begrensd');
}

// verhongering: een klasse zonder toekenning (pool 0 door een trage frame) krijgt toch een eenheid
{
  const pl = createFramePlanner({ capMs: 4, floorMs: 0 });
  let got = 0;
  for (let f = 0; f < 60; f++) {
    pl.beginFrame({ frameMs: 100 }); // altijd traag: pool 0
    const g = pl.grant('road', 5);
    if (g > 0) { got++; pl.spend('road', g); }
  }
  ok(got >= Math.floor(60 / (PLAN.starveFrames + 1)) - 1, `uitgehongerde klasse kreeg ${got}x een eenheid in 60 frames`);
  ok(got <= 60 / PLAN.starveFrames + 2, 'en niet elke frame (de vloer blijft laag)');
}

// geen deadlock: een klasse met schuld krijgt weer ruimte binnen maxDebtFrames + 2 frames
{
  const pl = createFramePlanner();
  pl.beginFrame({ frameMs: 10 }); pl.grant('building', 100); pl.spend('building', 40); // een gigantisch stuk
  let frames = 0, g = 0;
  do { pl.beginFrame({ frameMs: 10 }); g = pl.grant('building', 100); frames++; } while (g <= 0 && frames < 50);
  ok(frames <= PLAN.maxDebtFrames + 2, `schuld is binnen ${frames} frames afbetaald`);
  ok(pl.stats().debt >= -PLAN.maxDebtFrames * PLAN.capMs - 1e-9, 'schuld nooit dieper dan het maximum');
}

// hold (een film houdt het werk): alleen de verhongeringseenheid
{
  const pl = createFramePlanner();
  let got = 0;
  for (let f = 0; f < 40; f++) { pl.beginFrame({ frameMs: 10, hold: true }); const g = pl.grant('tile', 5); if (g > 0) got++; }
  ok(got <= 40 / PLAN.starveFrames + 1 && got >= 1, 'vasthouding: hooguit de verhongeringseenheid');
}

// laadsluier: ruim budget en geen schuld
{
  const pl = createFramePlanner();
  pl.beginFrame({ frameMs: 10 }); pl.grant('building', 100); pl.spend('building', 40);
  pl.beginFrame({ frameMs: 10, loading: true });
  near(pl.grant('building', 100), PLAN.loadingMs, 1e-9, 'laadsluier: het volle budget ondanks schuld');
}

// de wachtrij: prioriteit op rang, stukjes, een duur stuk per frame, annuleren
{
  let t = 0; const now = () => t;
  const pl = createFramePlanner();
  const order = [];
  const mk = (id, rank, cost) => ({ cls: 'building', rank, est: cost, id, step: () => { t += cost; order.push(id); return true; } });
  pl.beginFrame({ frameMs: 10 });
  pl.submit(mk('ver', 900, 0.5)); pl.submit(mk('dichtbij', 10, 0.5)); pl.submit(mk('midden', 200, 0.5));
  pl.runQueue('building', now);
  ok(order.join() === 'dichtbij,midden,ver', `volgorde op rang: ${order}`);
  ok(pl.queue.length === 0, 'wachtrij leeg');

  const heavy = []; const mkh = (id) => ({ cls: 'building', rank: 1, est: 3, id, step: () => { t += 3; heavy.push(id); return true; } });
  pl.beginFrame({ frameMs: 10, loading: true });
  pl.submit(mkh('a')); pl.submit(mkh('b')); pl.submit(mkh('c'));
  pl.runQueue('building', now);
  ok(heavy.length === 1, `een duur stuk per frame (${heavy.length})`);
  for (let f = 0; f < 5 && pl.queue.length; f++) { pl.beginFrame({ frameMs: 10, loading: true }); pl.runQueue('building', now); }
  ok(heavy.length === 3 && pl.queue.length === 0, 'de rest volgt in de volgende frames');

  let parts = 0;
  pl.beginFrame({ frameMs: 10 });
  pl.submit({ cls: 'building', rank: 5, est: 0.2, step: () => { t += 0.2; parts++; return parts >= 5; } });
  for (let f = 0; f < 30 && pl.queue.length; f++) { pl.beginFrame({ frameMs: 10 }); pl.runQueue('building', now); }
  ok(parts === 5 && pl.queue.length === 0, 'een werkstuk in vijf stukjes is af');

  pl.submit({ cls: 'building', rank: 1, id: 'x', step: () => true }); pl.submit({ cls: 'building', rank: 1, id: 'y', step: () => true });
  pl.cancel((it) => it.id === 'x');
  ok(pl.queue.length === 1 && pl.queue[0].id === 'y', 'cancel haalt alleen de gekozen weg');
  pl.queue.length = 0;
}

// geen verhongering van verre items: een stroom nieuwe dichte items houdt een ver item niet voor altijd tegen
{
  let t = 0; const now = () => t;
  const pl = createFramePlanner();
  let farDone = -1, f = 0;
  for (; f < 3000 && farDone < 0; f++) {
    pl.beginFrame({ frameMs: 10 });
    if (f === 0) pl.submit({ cls: 'building', rank: 1500, est: 0.8, step: () => { t += 0.8; farDone = f; return true; } });
    for (let k = 0; k < 6; k++) pl.submit({ cls: 'building', rank: 5, est: 0.8, step: () => { t += 0.8; return true; } }); // 6 per frame, er passen er ~5
    pl.runQueue('building', now);
  }
  ok(farDone >= 0, `het verre item kwam aan de beurt (frame ${farDone})`);
  ok(farDone <= 1500 / PLAN.ageMPerFrame * 1.5, `binnen anderhalf keer de verouderingstijd (overbelast: de achterstand veroudert mee) (${farDone} frames)`);
}

// spend telt per klasse en overschrijdingen
{
  const pl = createFramePlanner();
  pl.beginFrame({ frameMs: 10 });
  const g = pl.grant('road', 100); pl.spend('road', g + 2);
  const s = pl.stats();
  ok(s.by.road.over === 1 && s.by.road.units === 1, 'overschrijding geteld');
}

// zonder beginFrame (een los gereedschap) slibt de planner niet dicht: na autoFrameMs begint grant zelf een frame
{
  const pl = createFramePlanner({ autoFrameMs: 30 });
  pl.beginFrame({ frameMs: 10 });
  let g = pl.grant('building', 100); pl.spend('building', 50);
  ok(pl.grant('road', 100) <= 4, 'binnen dezelfde frame is het budget op');
  await new Promise((r) => setTimeout(r, 60));
  g = pl.grant('building', 100);
  ok(g > 0, `zonder beginFrame krijgt een systeem na een poos weer tijd (${g.toFixed(2)} ms)`);
}
// uitgezet (?perfoff=planner): grant geeft wat het systeem wil
{
  const pl = createFramePlanner();
  pl.setEnabled(false);
  pl.beginFrame({ frameMs: 100 });
  ok(pl.grant('building', 9) === 9 && pl.grant('road', 2.5) === 2.5, 'uitgezet: de oude constanten');
}

console.log(`streamplanner_test: ${n} controles groen`);
