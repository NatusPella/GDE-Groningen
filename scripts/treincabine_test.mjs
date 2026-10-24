// De cabine van de machinist (treincabine.js) en de dienstregeling met storingen (machinistrules.js), zonder wereld:
//  1. de tractiehendel: standen, begrenzing, herhaling bij vasthouden, wat de natuurkunde ervan leest;
//  2. de waakzaamheidsknop: vraag, antwoord, de rem die ingrijpt en weer loslaat;
//  3. de deurknop: te vroeg dicht, niet rijdend open, een keer terug open;
//  4. storingen: een rood sein (stoppen en wachten, of genegeerd) en een overweg (te hard);
//  5. de eindstand: punctualiteit, comfort en veiligheid, een rit zonder fouten, de beloning.
//   node scripts/treincabine_test.mjs
import * as C from '../game/js/treincabine.js';
import * as R from '../game/js/machinistrules.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const dt = 1 / 30;
const none = { up: false, down: false, upP: false, downP: false, ack: false, doorsOpen: false };

// --- 1. de hendel
{
  const cab = C.newCab();
  for (let i = 0; i < 10; i++) C.stepCab(cab, dt, { ...none, upP: true, up: true }, 0);
  ok(cab.lever === C.LEVER_MAX, `de hendel stopt bij ${C.LEVER_MAX}: ${cab.lever}`);
  for (let i = 0; i < 10; i++) C.stepCab(cab, dt, { ...none, downP: true }, 0);
  ok(cab.lever === C.LEVER_MIN, `de hendel stopt bij ${C.LEVER_MIN}: ${cab.lever}`);
  ok(C.leverCtl(0).power === 0 && C.leverCtl(0).brakeF === 0, 'nul is rollen');
  ok(C.leverCtl(C.LEVER_MAX).power === 1 && C.leverCtl(C.LEVER_MIN).brakeF === 1, 'de uiterste standen zijn vol');
  ok(C.leverCtl(2).power > C.leverCtl(1).power && C.leverCtl(-2).brakeF > C.leverCtl(-1).brakeF, 'standen lopen op');
  ok(C.leverLabel(0) === 'Rollen' && C.leverLabel(2) === 'Tractie 2' && C.leverLabel(-1) === 'Rem 1', 'hendelteksten');
  // vasthouden: een stand direct, daarna pas na REPEAT_FIRST en dan elke REPEAT
  const h = C.newCab();
  C.stepCab(h, dt, { ...none, up: true, upP: true }, 0);
  ok(h.lever === 1, 'een druk is een stand');
  for (let t = 0; t < C.REPEAT_FIRST - 0.1; t += dt) C.stepCab(h, dt, { ...none, up: true }, 0);
  ok(h.lever === 1, 'vasthouden schuift niet meteen verder');
  for (let t = 0; t < 0.3; t += dt) C.stepCab(h, dt, { ...none, up: true }, 0);
  ok(h.lever === 2, `na REPEAT_FIRST een stand verder: ${h.lever}`);
  // deuren open: geen tractie
  const d = C.newCab(); d.lever = 3;
  C.stepCab(d, dt, { ...none, doorsOpen: true }, 0);
  ok(d.lever === 0, 'deuren open zet de hendel op nul');
  ok(C.cabCtl(d, true).emergency && !C.cabCtl(d, false).emergency, 'de noodrem is de spatie');
}

// --- 2. de waakzaamheid
{
  const cab = C.newCab();
  cab.lever = 2;
  const evs = [];
  let t = 0;
  for (; t < C.DM_AFTER + 1; t += dt) evs.push(...C.stepCab(cab, dt, none, 20));
  ok(evs.some((e) => e.kind === 'waak-vraag') && cab.warn, 'na een tijd vraagt de trein om een teken');
  ok(C.dmLeft(cab) > 0, 'het bord telt af');
  evs.length = 0;
  C.stepCab(cab, dt, { ...none, ack: true }, 20);
  ok(!cab.warn && cab.dm === 0, 'K lost het op');
  // een hendelstand telt ook als teken
  for (t = 0; t < C.DM_AFTER + 1; t += dt) C.stepCab(cab, dt, none, 20);
  const w = cab.warn;
  C.stepCab(cab, dt, { ...none, upP: true }, 20);
  ok(w && !cab.warn, 'een hendelstand is ook een teken');
  // niet reageren: de rem grijpt in, de hendel gaat op nul, stilstand geeft hem vrij
  for (t = 0; t < C.DM_AFTER + C.DM_GRACE + 2; t += dt) evs.push(...C.stepCab(cab, dt, none, 20));
  ok(evs.some((e) => e.kind === 'waak-rem') && cab.brake && cab.count === 1 && cab.lever === 0, 'zonder teken remt de trein vanzelf');
  ok(C.cabCtl(cab, false).emergency && C.cabCtl(cab, false).power === 0, 'de rem is een noodrem zonder tractie');
  C.stepCab(cab, dt, { ...none, upP: true }, 20);
  ok(cab.lever === 0, 'de hendel zit vast tot de trein staat');
  C.stepCab(cab, dt, none, 0);
  ok(!cab.brake && !cab.warn, 'stilstaand komt de hendel vrij');
  // stilstaand vraagt niemand iets
  const s = C.newCab();
  for (t = 0; t < 200; t += dt) C.stepCab(s, dt, none, 0);
  ok(!s.warn && !s.brake, 'op het perron geen waakzaamheidsvraag');
}

// --- een dienst met halten (synthetisch, 4 halten op een recht spoor)
const stops = [0, 1500, 3200, 4300, 6000].map((s, i) => ({ s, name: `Halte ${i}` }));
const mk = (extra = {}) => R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, limit: 4, storingen: true, ...extra });
const frame = (svc, c, v, time, extra = {}) => R.stepService(svc, dt, { c, v, time, emergency: false, nose: c + 20, ...extra });

// --- 3. de deuren
{
  const svc = mk();
  const st = svc.plan[0];
  svc.i = 0;
  // een halte halen: bewegen en dan stilstaan op de streep, vroeg (voor de vertrektijd)
  let time = 10;
  frame(svc, st.s - 80, 5, time);
  frame(svc, st.s, 0, time + 1);
  ok(st.score != null && R.doorsOpen(svc, time + 1), 'halte gehaald: de deuren gaan open');
  ok(st.dep === st.due + 6, 'het vertrek staat in de dienstregeling');
  ok(R.pressDoors(svc, { time: time + 2, v: 0 }).ok === false, 'te snel dicht: er stappen nog reizigers in');
  const before = st.score;
  const r = R.pressDoors(svc, { time: time + 7, v: 0 });
  ok(r.ok && r.early && st.early && st.score === Math.max(0, before - R.EARLY_PEN), 'voor de vertrektijd dicht is te vroeg');
  ok(!R.doorsOpen(svc, time + 8), 'de deuren zijn dicht');
  ok(R.pressDoors(svc, { time: time + 9, v: 8 }).ok === false, 'rijdend gaan de deuren niet open');
  const re = R.pressDoors(svc, { time: time + 9, v: 0 });
  ok(re.ok && R.doorsOpen(svc, time + 10), 'stilstaand op het perron kan een keer weer open');
  ok(R.pressDoors(svc, { time: time + 20, v: 0 }).ok === false, 'daarna kan het niet nog eens open');
}

// --- 4. storingen
{
  const svc = mk();
  ok(svc.storingen.length >= 2, `lange etappes krijgen storingen: ${svc.storingen.length}`);
  ok(svc.storingen[0].kind === 'sein' && svc.storingen[1].kind === 'overweg', 'om en om een sein en een overweg');
  ok(R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, limit: 4 }).storingen.length === 0, 'zonder storingen is het de oude dienst');
  const sein = svc.storingen[0];
  // het sein springt op rood en begrenst de snelheid
  let c = sein.s - 400, time = 0;
  frame(svc, c, 20, time, { nose: c + 20 });
  c = sein.s - 100;
  const ev = frame(svc, c, 20, time += 1, { nose: c + 20 });
  ok(sein.state === 'rood' && ev.some((e) => e.kind === 'sein-rood'), 'het sein springt op rood');
  ok(svc.limit < 20 && svc.sein && /rood/.test(svc.sein), `rood sein houdt de snelheid laag: ${svc.limit}`);
  // stoppen voor het sein en wachten: groen, geen fout
  let green = false;
  for (let i = 0; i < 400 && !green; i++) {
    const e = frame(svc, sein.s - 60, 0, time += dt, { nose: sein.s - 40 });
    green = e.some((x) => x.kind === 'sein-groen');
  }
  ok(green && sein.state === 'groen', 'wachten voor het sein geeft groen');
  frame(svc, sein.s + 30, 15, time += 1, { nose: sein.s + 50 });
  ok(sein.passed && !sein.bad && svc.safetyPen === 0, 'groen sein passeren kost niets');
  // een tweede dienst: het sein negeren
  const bad = mk();
  const s2 = bad.storingen[0];
  frame(bad, s2.s - 250, 20, 0, { nose: s2.s - 230 });
  const e2 = frame(bad, s2.s + 30, 20, 1, { nose: s2.s + 50 });
  ok(s2.bad && e2.some((e) => e.kind === 'sein-genegeerd') && bad.safetyPen === R.SEIN_PEN, 'een rood sein negeren is een veiligheidsfout');
  // de overweg
  const ow = svc.storingen[1];
  const o = mk();
  const g = o.storingen[1];
  o.i = 1;
  frame(o, g.s - 150, 25, 5, { nose: g.s - 130 });
  ok(g.state === 'dicht' && o.limit === R.OVERWEG_LIMIT, 'de overweg gaat dicht en begrenst de snelheid');
  frame(o, g.s + 5, 25, 7, { nose: g.s + 25 });
  frame(o, g.s + 30, 25, 8, { nose: g.s + 50 });
  ok(g.bad && o.safetyPen === R.OVERWEG_PEN, 'te hard door de overweg is een veiligheidsfout');
  const o2 = mk();
  const g2 = o2.storingen[1];
  o2.i = 1;
  frame(o2, g2.s - 150, 12, 5, { nose: g2.s - 130 });
  frame(o2, g2.s + 5, 12, 7, { nose: g2.s + 25 });
  frame(o2, g2.s + 30, 12, 8, { nose: g2.s + 50 });
  ok(g2.passed && !g2.bad && o2.safetyPen === 0, 'rustig door de overweg kost niets');
  ok(!!ow, 'overweg bestaat');
}

// --- 5. de eindstand
{
  const mkRun = (opts) => {
    const svc = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, limit: 3, storingen: false });
    svc.plan.forEach((st, i) => {
      svc.i = i;
      svc.moved = true;
      R.stepService(svc, dt, { c: st.s - opts.err, v: 0, time: st.due + opts.late, emergency: false });
    });
    return svc;
  };
  const good = mkRun({ err: 0, late: 0 });
  ok(good.finished && good.result.punct === 100 && good.result.comfort === 100 && good.result.veilig === 100, `een schone rit: ${JSON.stringify(good.result)}`);
  ok(good.result.faultless && R.payFor(good.result) > R.payFor({ ...good.result, faultless: false }), 'een rit zonder fouten betaalt extra');
  const late = mkRun({ err: 0, late: 70 });
  ok(late.result.punct < good.result.punct && !late.result.faultless, 'te laat kost punctualiteit');
  const unsafe = mkRun({ err: 0, late: 0 });
  // een veiligheidsfout na afloop van de loop: opnieuw berekenen via een dienst met een fout
  const svc = R.startService({ stops, c: 0, dir: 1, vmax: 30, time: 0, limit: 2, storingen: false });
  R.deadmanFault(svc, 1);
  svc.plan.forEach((st, i) => { svc.i = i; svc.moved = true; R.stepService(svc, dt, { c: st.s, v: 0, time: st.due, emergency: false }); });
  ok(svc.result.veilig === 100 - R.DEADMAN_PEN && !svc.result.faultless && svc.result.score < good.result.score, 'de waakzaamheidsrem kost veiligheid en score');
  ok(svc.faults.length === 1 && svc.deadman === 1, 'de fout staat in het logboek');
  ok(unsafe.result.score === good.result.score, 'dezelfde rit geeft dezelfde score');
}

console.log(`${n - fails}/${n} treincabine ok`);
process.exit(fails ? 1 : 0);
