// Eén framebudget voor al het streamingwerk op de hoofdthread (#1016, #1052, #1008).
// Puur: geen three.js, geen DOM, geen eigen timers (de aanroeper geeft `now`), zodat
// scripts/streamplanner_test.mjs en scripts/perf/streamsoepel.mjs elke regel zonder browser keuren.
//
// Waarom: tegelrijen (1,5 ms), gebouwen (4 of 9 ms), wegen (2,5 of 5 ms), water (3), voertuigen (3),
// voetgangers (2,5 + 6), gras (3), de verre laag (2,5), de gevelbatches (1 of 3) en het voorbouwen (1,5)
// hadden elk hun eigen tijdbudget en wisten niets van elkaar: in één slecht frame telden ze op tot 20 ms
// of meer, en bij een hoge frametijd gaf geen van hen toe. Nu is er één emmer (token bucket):
//  - de TOTALE tijd per frame (`beginFrame`) volgt de frametijd: veel ruimte = tot capMs, een trage frame
//    = tot floorMs, nooit meer dan capMs (4 ms) buiten een sprong en de laadsluier;
//  - elk systeem vraagt `grant(klasse, gewenst)` en meldt `spend(klasse, ms)`. De klasse die eerst aan de beurt
//    is, mag niet alles opmaken: de klassen die recent werk wilden houden hun aandeel (gewicht) vrij;
//  - een eenheid werk die duurder is dan zijn toegekende tijd (een gebouwmesh van 3 ms in een budget van 1)
//    mag wel af (anders komt hij nooit), maar de overschrijding wordt SCHULD: de volgende frames krijgen minder
//    tot hij is terugbetaald (schuld hoogstens 2 frames budget). Het gemiddelde blijft dus onder het budget;
//  - verhongering is uitgesloten: een klasse die STARVE_FRAMES frames niets kreeg terwijl ze werk wilde, krijgt
//    een eenheid (MIN_UNIT_MS), ook bij schuld of een trage frame. Er is geen toestand waarin niets meer mag.
// Daarnaast een gedeelde wachtrij voor werk dat de planner zelf uitvoert (`submit`/`runQueue`): prioriteit op
// rang (afstand minus wat er voor ligt, zie streambudget.js streamRank) met veroudering (een ver ding wordt
// uiteindelijk het eerste), werk in stukjes (`step` geeft true als het af is) en een "ding per frame"-regel voor
// dure objecten (`heavy`): hoogstens één per frame.

export const PLAN = {
  capMs: 4,          // nooit meer streamingwerk dan dit per frame (gemiddeld), buiten een sprong en de laadsluier
  pressureMs: 6,     // het plafond als er dichtbij werk te laat is (gebouwen die de speler al ziet, nog zonder detail) en de frames het toelaten
  urgentMs: 6,       // werk dat een nabije speler, een activiteit of een herstel nu nodig heeft: eigen budget, nooit vastgehouden
  boostMs: 8,        // de eerste seconden na een sprong (teleport, trein, respawn), als de frames het toelaten
  loadingMs: 20,     // achter de laadsluier of een zwart scherm: er wordt niet getekend, dus alles mag
  floorMs: 0.5,      // een trage frame: toch even doorwerken
  goodFrameMs: 14,   // tot deze frametijd (EMA) is het volle budget beschikbaar
  badFrameMs: 33,    // vanaf deze frametijd alleen de vloer
  maxDebtFrames: 2,  // een schuld is hoogstens zoveel frames budget
  starveFrames: 8,   // zoveel frames zonder toekenning (terwijl er werk was) en de klasse krijgt een eenheid
  minUnitMs: 1,      // de eenheid die een uitgehongerde klasse krijgt
  activeFrames: 30,  // een klasse telt zoveel frames na haar laatste aanvraag mee voor de reservering
  heavyMs: 2,        // een stuk werk waarvan de schatting hierboven ligt is "duur": één per frame
  ageMPerFrame: 3,   // een wachtend ding wordt per frame zoveel "meter" dichterbij (tegen verhongering)
  emaK: 0.2,         // het gewicht van een nieuwe frametijd in het gemiddelde
};

// De klassen met hun aandeel (som 1) en hun vaste volgorde in de frame. Een klasse die niets wil staat
// niet in de reservering; haar aandeel valt dan aan de anderen toe.
export const CLASSES = {
  tile: 0.20,      // tegelrijen naar de rasters (tileworld follow, bgQueue)
  building: 0.34,  // gebouwmeshes, het voorbouwen, de gevelbatches
  road: 0.16,      // weg-, water- en kustmeshes
  ground: 0.06,    // gras, struiken, bomen
  far: 0.10,       // de verre laag (farlod.js)
  actors: 0.14,    // voertuigen, voetgangers, chauffeurs
};

// Het totale budget (ms) van een frame uit de frametijd: veel ruimte = capMs, trage frame = floorMs, ertussen
// lineair. Een sprong (boost) tilt het plafond naar boostMs, maar alleen zolang de frames niet echt traag zijn;
// de laadsluier (loading) laat alles toe.
export function budgetFor(frameMs, { boost = false, loading = false, cine = false, pressure = 0 } = {}, p = PLAN) {
  if (loading) return p.loadingMs;
  const pr = Math.min(1, Math.max(0, Number.isFinite(pressure) ? pressure : 0));
  const ceiling = boost ? p.boostMs : p.capMs + (p.pressureMs - p.capMs) * pr;
  const f = Number.isFinite(frameMs) ? frameMs : p.goodFrameMs;
  let t;
  if (f <= p.goodFrameMs) t = ceiling;
  else if (f >= p.badFrameMs) t = p.floorMs;
  else t = p.floorMs + (ceiling - p.floorMs) * (p.badFrameMs - f) / (p.badFrameMs - p.goodFrameMs);
  if (cine) t = Math.min(t, p.capMs * 0.4); // een film of cutscene: weinig, en gelijkmatig
  return t;
}

export function createFramePlanner(opts = {}) {
  const p = { ...PLAN, ...opts };
  const weights = { ...CLASSES, ...(opts.classes || {}) };
  const st = {};
  for (const k of [...Object.keys(weights), 'urgent']) st[k] = { spent: 0, granted: 0, ran: false, hungry: 0, wanted: -1e9, total: 0, units: 0, over: 0 };
  let frame = 0, pool = p.capMs, allowance = p.capMs, lastTotal = p.capMs, debt = 0, frameEma = 12, spentTotal = 0, heavyThisFrame = false;
  const queue = [];
  let seq = 0;
  const frames = { n: 0, sumMs: 0, maxMs: 0, over: 0, overMs: 0, last: 0 };

  function beginFrame({ frameMs = frameEma, boost = false, loading = false, cine = false, hold = false, pressure = 0 } = {}) {
    // sluit de vorige frame af: wat boven de toelage is uitgegeven wordt schuld (begrensd); wat over is, vervalt
    if (frame > 0) {
      const left = allowance - spentTotal;
      debt = left < 0 ? Math.max(-p.maxDebtFrames * lastTotal, left) : 0;
      frames.n++; frames.sumMs += spentTotal; frames.maxMs = Math.max(frames.maxMs, spentTotal); frames.last = spentTotal;
      if (spentTotal > p.capMs + 1e-6) { frames.over++; frames.overMs += spentTotal - p.capMs; }
    }
    frame++;
    if (Number.isFinite(frameMs)) frameEma += (Math.min(200, frameMs) - frameEma) * p.emaK;
    const total = hold ? 0 : budgetFor(frameEma, { boost, loading, cine, pressure }, p);
    lastTotal = Math.max(total, p.floorMs);
    // schuld telt niet achter de laadsluier (er wordt niet getekend)
    allowance = loading ? total : total + debt;
    pool = Math.max(0, allowance);
    for (const k in st) { const c = st[k]; c.spent = 0; c.granted = 0; c.ran = false; }
    spentTotal = 0; heavyThisFrame = false;
    return pool;
  }

  function grant(cls, want = Infinity) {
    // URGENT: werk dat nu nodig is (windowmode.js): een eigen budget naast de pool, niet vastgehouden door hold (film,
    // cutscene) en niet onderhevig aan schuld; wel begrensd per frame (urgentMs)
    if (cls === 'urgent') {
      const u = st.urgent;
      u.wanted = frame;
      const g = Math.max(0, Math.min(want, p.urgentMs - u.spent));
      u.ran = true; u.granted = g;
      return g;
    }
    const c = st[cls];
    if (!c) return Math.min(want, p.floorMs);
    if (want > 0) c.wanted = frame;
    if (!(want > 0)) { c.ran = true; return 0; }
    // wat de nog niet aan de beurt geweest klassen met recent werk nodig hebben, blijft vrij
    let reserve = 0;
    for (const k in st) {
      if (k === cls || k === 'urgent') continue;
      const o = st[k];
      if (!o.ran && frame - o.wanted <= p.activeFrames) reserve += Math.max(0, pool * weights[k] - o.spent);
    }
    const share = pool * weights[cls];
    const free = pool - spentTotal - reserve;
    let g = Math.min(want, Math.max(share - c.spent, free));
    g = Math.max(0, g);
    // geen verhongering: een klasse die lang niets kreeg, krijgt een eenheid
    if (g < p.minUnitMs && c.hungry >= p.starveFrames) g = Math.min(want, p.minUnitMs);
    c.ran = true;
    c.granted = g;
    c.hungry = g > 0 ? 0 : c.hungry + 1;
    return g;
  }

  function spend(cls, ms) {
    const c = st[cls];
    if (!(ms > 0)) return;
    if (cls === 'urgent') { st.urgent.spent += ms; st.urgent.total += ms; st.urgent.units++; return; }
    spentTotal += ms;
    if (c) {
      c.spent += ms; c.total += ms; c.units++;
      if (ms > c.granted + 1e-6) c.over++;
    }
  }

  // Een gedeeld deadline-hulpmiddel: hoeveel ms van een toekenning is er nog, gegeven het begin (now0) en nu.
  function remaining(granted, now0, now) { return granted - (now - now0); }

  // ---- de gedeelde wachtrij (voor werk dat de planner uitvoert) ----
  // item: { cls, rank, est?, step(deadline, now) -> true als af, id? }; rank laag = eerst
  function submit(item) {
    const it = { ...item, born: frame, seq: seq++, heavy: (item.est || 0) > p.heavyMs };
    queue.push(it);
    return it;
  }
  function effective(it) { return (Number.isFinite(it.rank) ? it.rank : 0) - (frame - it.born) * p.ageMPerFrame; }

  // Werkt de wachtrij voor klasse `cls` af binnen zijn toekenning; `now` geeft de tijd. Geeft het aantal
  // uitgevoerde stukken terug. Altijd hooguit één duur stuk per frame (over alle klassen), en een duur stuk
  // pas als de pool niet leeg is of de klasse uitgehongerd (anders wacht hij tot er ruimte is).
  function runQueue(cls, now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), wantMs = Infinity) {
    const mine = [];
    for (const it of queue) if (!cls || it.cls === cls) mine.push(it);
    if (!mine.length) return 0;
    const g = grant(cls || 'tile', wantMs);
    if (g <= 0) return 0;
    mine.sort((a, b) => effective(a) - effective(b) || a.seq - b.seq);
    const t0 = now();
    const deadline = t0 + g;
    let n = 0;
    for (const it of mine) {
      if (n > 0 && now() >= deadline) break;
      if (it.heavy && heavyThisFrame) continue;
      if (it.heavy && n > 0 && deadline - now() < Math.min(it.est, g * 0.5)) continue;
      const t = now();
      const done = it.step(deadline, t);
      const cost = now() - t;
      spend(cls || 'tile', cost);
      if (it.heavy) heavyThisFrame = true;
      n++;
      if (done !== false) { const i = queue.indexOf(it); if (i >= 0) queue.splice(i, 1); }
      else it.born = it.born; // een volgend stuk blijft zijn leeftijd houden
    }
    return n;
  }

  function cancel(match) {
    for (let i = queue.length - 1; i >= 0; i--) if (match(queue[i])) queue.splice(i, 1);
  }

  function stats() {
    const by = {};
    for (const k in st) by[k] = { totalMs: +st[k].total.toFixed(2), units: st[k].units, over: st[k].over, hungry: st[k].hungry };
    return { frame, pool, debt, frameEma, queued: queue.length, frames: { ...frames }, by };
  }

  return { beginFrame, grant, spend, remaining, submit, runQueue, cancel, stats, queue, get pool() { return pool; }, get debt() { return debt; }, get frame() { return frame; }, params: p };
}

// de planner die het spel deelt (scene3d.js, main.js, grass.js, farlod.js lezen hem); tests maken er eigen
const shared = createFramePlanner();
export function streamPlanner() { return shared; }
