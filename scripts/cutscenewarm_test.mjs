// Vooruit-warm en wachtpoort voor cutscenes (game/js/cutscenewarm.js, #1016): node scripts/cutscenewarm_test.mjs
// Puur, met mocks: sprongdetectie, de pin-planning voor de volgende plek, de poort met time-out, geen effect bij korte afstand.
import { readFileSync } from 'node:fs';
import { budgetFor, PLAN, createFramePlanner } from '../game/js/streamplanner.js';
import { WARM, classifyJump, jumpsFromStops, jumpsFromScene, warmStopsFromKeys, warmDue, readiness, createJumpGate, createJumpRunner } from '../game/js/cutscenewarm.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// 1. sprongdetectie
ok(classifyJump(10) === 'none' && classifyJump(WARM.softM - 1) === 'none', 'korte afstand: geen sprong');
ok(classifyJump(WARM.softM) === 'soft' && classifyJump(WARM.hardM - 1) === 'soft', 'middelafstand: zacht');
ok(classifyJump(WARM.hardM) === 'hard' && classifyJump(5000) === 'hard', 'ver: hard');
ok(classifyJump(NaN) === 'none', 'NaN is geen sprong');
const stops = [
  { t: 0, x: 0, y: 0 }, { t: 5, x: 20, y: 0 },            // 20 m: geen
  { t: 10, x: 1500, y: -800 },                              // ver: hard
  { t: 14, x: 1510, y: -790, ex: 1700, ey: -790 },          // 14 m na het begin van vorig shot: geen
  { t: 20, x: 300, y: 0 },                                  // het eind (1700) naar 300: hard
  { t: 25, x: 340, y: 0 }, { t: NaN, x: 1e6, y: 0 },        // 40 m: geen; een stop zonder tijd telt niet
];
const js = jumpsFromStops(stops);
ok(js.length === 2 && js[0].kind === 'hard' && js[0].idx === 2 && js[1].idx === 4, 'jumpsFromStops: twee harde sprongen', JSON.stringify(js.map((j) => [j.idx, j.kind])));
ok(Math.abs(js[1].dist - Math.hypot(1400, 790)) < 1e-6, 'de afstand loopt van het eind van het vorige shot', String(js[1].dist));
ok(jumpsFromStops([{ t: 0, x: 0, y: 0 }]).length === 0 && jumpsFromStops([]).length === 0, 'een shot of niets: geen sprongen');

// een gecompileerde scène (mock): twee cuts, de tweede ver weg
const scene = {
  shots: [{ t: 0 }, { t: 4 }, { t: 9 }],
  sample(t) { const far = t >= 9; const x = far ? 900 : 10; return { camera: { position: { x, y: 0, z: 5 }, lookAt: { x: x + 20, y: 0, z: 1 }, fov: 40 } }; },
};
const sj = jumpsFromScene(scene, { x: 0, y: 0 }, 12);
ok(sj.length === 1 && sj[0].t === 9 && sj[0].kind === 'hard', 'jumpsFromScene: de cut op 9 s is hard', JSON.stringify(sj));
ok(jumpsFromScene({ shots: [{ t: 0 }, { t: 3 }], sample() { throw new Error('x'); } }, {}, 5).length === 0, 'een samplefout geeft geen sprongen en geen uitzondering');
ok(jumpsFromScene(null, {}, 5).length === 0, 'geen scène: geen sprongen');

// 2. pin-planning: de volgende plek wordt LEAD_S voor de cut gevraagd, één keer, nooit te vroeg
{
  const st = { warmed: new Set() };
  ok(warmDue(js, 0, 0.1, st).length === 0, 'te vroeg: niets');
  ok(warmDue(js, 6.9, 7.0, st).length === 1 && st.warmed.has(2), 'leadS voor de cut: de plek wordt gevraagd');
  ok(warmDue(js, 7.0, 7.1, st).length === 0, 'een tweede keer niet');
  ok(warmDue(js, 16.9, 17.1, st).length === 1, 'de tweede sprong komt in zijn eigen venster');
  const st2 = { warmed: new Set() };
  ok(warmDue(js, 11, 11.1, st2).length === 0, 'een sprong die al voorbij is wordt niet meer gewarmd');
  const st3 = { warmed: new Set() };
  ok(warmDue(js, 0, 18, st3).length === 2, 'een grote tijdstap vraagt alles wat tussen ligt');
  const st4 = { warmed: new Set() };
  ok(warmDue(js, 25, 26, st4).length === 0, 'voorbije sprongen worden niet meer gewarmd');
}

// 3. klaar-meting
ok(readiness(null).ready && readiness({ tilesMissing: 0, prewarmPending: 0 }).ready, 'readiness: klaar');
ok(!readiness({ tilesMissing: 3 }).ready && readiness({ tilesMissing: 3 }).reason === 'tegels', 'readiness: tegels ontbreken');
ok(!readiness({ prewarmPending: 5 }).ready && readiness({ prewarmPending: 5 }).reason === 'gebouwen', 'readiness: gebouwen wachten');
ok(readiness({ buildings: 4 }, false).ready && !readiness({ buildings: 4 }, true).ready, 'readiness: detail telt alleen onder zwart');
ok(readiness({ tilesMissing: NaN, prewarmPending: -1 }).ready, 'readiness: onzin telt als klaar (nooit hangen)');

// 4. de poort: out -> wait -> in; klaar of time-out
function drive(gate, ready, step = 20) {
  const log = []; let now = 1000; let r = gate.arm({ idx: 1, t: 10 }, now);
  log.push(r.phase);
  for (let i = 0; i < 400; i++) { now += step; r = gate.tick(now, typeof ready === 'function' ? ready(now) : ready); if (log[log.length - 1] !== r.phase) log.push(r.phase); if (!gate.active) break; }
  return { log, now, r };
}
{
  const g = createJumpGate();
  const r = drive(g, true);
  ok(r.log.join('>') === 'out>wait>in>idle', 'poort: out, wait, in, idle', r.log.join('>'));
  const dur = r.now - 1000;
  ok(dur >= WARM.dipOutMs + WARM.minWaitMs && dur <= WARM.dipOutMs + WARM.minWaitMs + WARM.dipInMs + 80, 'poort: klaar na uitduiken en minimale wachttijd, daarna induiken', String(dur));
  ok(g.stats.timeouts === 0, 'poort: geen time-out als alles klaar is');
}
{
  const g = createJumpGate();
  const r = drive(g, false);
  ok(r.log.join('>') === 'out>wait>in>idle', 'poort time-out: dezelfde fases');
  ok(g.stats.timeouts === 1 && g.stats.maxWaitedMs >= WARM.maxWaitMs && g.stats.maxWaitedMs < WARM.maxWaitMs + 60, 'poort: time-out na maxWaitMs, niet later', String(g.stats.maxWaitedMs));
  ok(r.now - 1000 <= WARM.maxWaitMs + WARM.dipInMs + 60, 'poort: totaal hoogstens maxWait plus induiken');
}
{
  const g = createJumpGate();
  let now = 0; const a = g.arm({ idx: 1, t: 5 }, now);
  ok(a.hold && a.fade.to === 1 && a.fade.ms === WARM.dipOutMs, 'arm: meteen vasthouden en naar zwart');
  ok(WARM.dipOutMs <= 300 && WARM.dipInMs <= 300, 'duiken blijft binnen 300 ms (DS3-ritme)');
  const g2 = createJumpGate({ ...WARM, dipOutMs: 0, dipInMs: 0 });
  const b = g2.arm({ idx: 1, t: 5 }, 0);
  ok(b.phase === 'wait' && b.fade.ms === 0, 'zonder beweging (dip 0): meteen wachten, hard zwart');
}

// 5. de loper met mocks: geen effect bij korte afstand, wel bij een harde sprong
function mkEnv(opts = {}) {
  const calls = { warm: [], fade: [], voice: [], flags: [] };
  const clock = { ms: 0 };
  let tilesMissing = opts.tilesMissing ?? 0, prewarmPending = opts.prewarmPending ?? 0;
  const env = {
    now: () => clock.ms,
    warm: (j) => calls.warm.push(j.idx),
    ready: (j, deep) => ({ tilesMissing, prewarmPending, buildings: 0, roads: 0 }),
    fade: (k, ms) => calls.fade.push([k, ms]),
    voice: (on) => calls.voice.push(on),
    flags: (f) => calls.flags.push(f),
  };
  return { env, calls, clock, set: (o) => { if ('tilesMissing' in o) tilesMissing = o.tilesMissing; if ('prewarmPending' in o) prewarmPending = o.prewarmPending; } };
}
// speelt een scène af op 60 fps; geeft de tijden waarop de klok stond
function play(runner, clock, dur, { onFrame } = {}) {
  let t = 0, frames = 0, heldFrames = 0; const dt = 1 / 60;
  while (t < dur && frames < 20000) {
    clock.ms += dt * 1000; frames++;
    const r = runner.step(t, t + dt);
    if (r.held) heldFrames++;
    t = r.t;
    if (onFrame) onFrame(frames, t, r);
    if (!r.held && t >= dur) break;
  }
  return { t, frames, heldFrames };
}
{
  // korte afstand: nooit warm, nooit een poort, nooit zwart
  const m = mkEnv({ tilesMissing: 9 });
  const r = createJumpRunner(jumpsFromStops([{ t: 0, x: 0, y: 0 }, { t: 5, x: 30, y: 0 }, { t: 9, x: 60, y: 20 }]), m.env);
  const p = play(r, m.clock, 12);
  ok(m.calls.warm.length === 0 && m.calls.fade.length === 0 && p.heldFrames === 0, 'korte afstand: geen warm, geen zwart, geen vasthouden');
  ok(Math.abs(p.t - 12) < 0.02 && p.frames <= 12 * 60 + 2, 'korte afstand: de klok loopt op de gewone snelheid', `${p.frames}`);
}
{
  // harde sprong, alles op tijd klaar: warm LEAD_S eerder, een gewone cut, geen zwart
  const m = mkEnv();
  const r = createJumpRunner(js, m.env);
  let warmedAt = null;
  const p = play(r, m.clock, 24, { onFrame: (f, t) => { if (warmedAt == null && m.calls.warm.length) warmedAt = t; } });
  ok(m.calls.warm.join() === '2,4', 'harde sprongen: beide gewarmd, elk één keer', m.calls.warm.join());
  ok(warmedAt != null && warmedAt >= 10 - WARM.leadS - 0.05 && warmedAt <= 10 - WARM.leadS + 0.05, 'de plek wordt leadS voor de cut gewarmd', String(warmedAt));
  ok(m.calls.fade.length === 0 && p.heldFrames === 0, 'op tijd klaar: een gewone cut, geen zwart en geen wachten');
  ok(Math.abs(p.t - 24) < 0.02 && p.frames <= 24 * 60 + 2, 'op tijd klaar: voice- en ondertiteltijd verschuiven niet');
}
{
  // harde sprong, de plek is bij de cut nog niet klaar: duiken, wachten, doorgaan
  const m = mkEnv({ tilesMissing: 7 });
  const r = createJumpRunner(js, m.env);
  // de tegels komen 500 ms na het begin van de wacht binnen (de loper kijkt elke frame)
  let readyAt = null;
  const p = play(r, m.clock, 14, { onFrame: (f, t, st) => { if (st.phase === 'wait' && readyAt == null) readyAt = m.clock.ms + 500; if (readyAt != null && m.clock.ms >= readyAt) m.set({ tilesMissing: 0 }); } });
  ok(m.calls.fade[0] && m.calls.fade[0][0] === 1 && m.calls.fade[0][1] <= 300, 'niet klaar: het beeld duikt (<= 300 ms) naar zwart');
  ok(m.calls.fade.some(([k]) => k === 0), 'en komt terug uit zwart');
  ok(m.calls.voice[0] === true && m.calls.voice[m.calls.voice.length - 1] === false, 'de stem wordt vastgehouden en hervat');
  ok(m.calls.flags.some((f) => f.loading) && !m.calls.flags[m.calls.flags.length - 1].loading, 'onder zwart krijgt het streamen het laadbudget, daarna niet meer');
  const heldS = p.heldFrames / 60;
  ok(heldS >= (WARM.dipOutMs + 500) / 1000 - 0.1 && heldS <= (WARM.dipOutMs + 500 + 120) / 1000 + 0.1, 'de klok stond stil tot de plek klaar was en niet langer', String(heldS));
  ok(Math.abs(p.t - 14) < 0.05, 'de scène eindigt daarna gewoon (geen blijvende verschuiving van de klok)', String(p.t));
}
{
  // harde sprong, de plek wordt nooit klaar: terugval na maxWaitMs, de film gaat door
  const m = mkEnv({ tilesMissing: 99 });
  const r = createJumpRunner(js, m.env);
  const p = play(r, m.clock, 14);
  const heldMs = p.heldFrames * 1000 / 60;
  ok(r.gate.stats.timeouts >= 1, 'nooit klaar: time-out');
  ok(heldMs <= WARM.maxWaitMs + 40 && heldMs >= WARM.maxWaitMs - 60, 'nooit klaar: vastgehouden hoogstens maxWaitMs', String(heldMs));
  ok(Math.abs(p.t - 14) < 0.05, 'nooit klaar: de scène loopt na de time-out door tot het eind');
}
{
  // een gast (klok van de gastheer) warmt wel maar houdt nooit vast
  const m = mkEnv({ tilesMissing: 5 });
  const r = createJumpRunner(js, m.env, { skipGate: true });
  const p = play(r, m.clock, 14);
  ok(m.calls.warm.length >= 1 && p.heldFrames === 0 && m.calls.fade.length === 0, 'skipGate: wel warm, geen zwart en geen vasthouden');
}
{
  // dispose haalt het zwart weg en zet de vlaggen terug (een scene die midden in de poort stopt)
  const m = mkEnv({ tilesMissing: 5 });
  const r = createJumpRunner(js, m.env);
  let stoppedAt = null;
  let t = 0;
  for (let i = 0; i < 2000 && stoppedAt == null; i++) { m.clock.ms += 1000 / 60; const st = r.step(t, t + 1 / 60); t = st.t; if (st.phase === 'wait') stoppedAt = i; }
  ok(stoppedAt != null && r.holding, 'de poort staat in wait');
  r.dispose();
  ok(!r.gate.active && m.calls.fade[m.calls.fade.length - 1][0] === 0 && m.calls.voice[m.calls.voice.length - 1] === false && !m.calls.flags[m.calls.flags.length - 1].loading, 'dispose: zwart weg, stem en vlaggen terug');
}

// 6. het streambudget: een warmende cutscene krijgt iets meer, buiten een cutscene verandert er niets
ok(budgetFor(10, { cine: true, cineWarm: true }) > budgetFor(10, { cine: true }), 'cineWarm geeft een cutscene iets meer budget');
ok(budgetFor(10, { cine: true, cineWarm: true }) < PLAN.capMs, 'cineWarm blijft onder het gewone plafond');
ok(budgetFor(10, { cineWarm: true }) === budgetFor(10) && budgetFor(10, { boost: true, cineWarm: true }) === PLAN.boostMs, 'cineWarm doet niets buiten een cutscene (gewone gameplay-streaming ongewijzigd)');
ok(budgetFor(50, { loading: true, cine: true, cineWarm: true }) === PLAN.loadingMs, 'onder zwart (loading) mag alles, ook in een cutscene');
ok(budgetFor(40, { cine: true, cineWarm: true }) === PLAN.floorMs, 'een trage frame houdt de vloer, ook tijdens warmen');
{
  const pl = createFramePlanner();
  const a = pl.openFrame({ frameMs: 10, cine: true, cineWarm: true }), b = pl.openFrame({ frameMs: 10, cine: true });
  ok(a > b, 'openFrame geeft cineWarm door');
}

// 7. TileWorld.warmPoint met een nepstore: vraagt en pint de tegels, een tweede keer niet dubbel, releaseWarm geeft ze vrij
{
  await import('./node3d.mjs');
  const { TileWorld } = await import('../game/js/tileworld.js');
  const pins = new Map(), asked = [];
  const store = {
    keysAround: (x, y, r) => (Number.isFinite(x) ? ['0,0', '1,0'] : []),
    pin: (k) => pins.set(k, (pins.get(k) || 0) + 1), unpin: (k) => pins.set(k, (pins.get(k) || 0) - 1),
    request: (k, o) => { asked.push([k, o.priority, o.token]); return Promise.resolve(); },
  };
  const fake = { store, warmPoint: TileWorld.prototype.warmPoint, releaseWarm: TileWorld.prototype.releaseWarm };
  ok(fake.warmPoint(100, 200, { radius: 300 }) === 2 && asked.length === 2 && asked.every((a) => a[1] === -500 && a[2] === 'cutwarm'), 'warmPoint: vraagt de tegels rond de plek');
  ok([...pins.values()].every((v) => v === 1), 'warmPoint: pint elke tegel één keer');
  fake.warmPoint(100, 200);
  ok([...pins.values()].every((v) => v === 1), 'warmPoint: een tweede keer pint niet dubbel');
  fake.releaseWarm();
  ok([...pins.values()].every((v) => v === 0) && fake._warmPins === null, 'releaseWarm: alle pins weer los');
  ok(fake.warmPoint(NaN, 0) === 0 && fake.warmPoint.call({ store: null }, 0, 0) === 0, 'warmPoint: onzin of geen store geeft 0 zonder uitzondering');
  fake.releaseWarm(); // twee keer vrijgeven is veilig
}

// 8. de bedrading (tekst): de engine, de opening en de host gebruiken de loper; de stem pauzeert mee; een gast houdt zijn klok niet vast
{
  const rd = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const cine = rd('../game/js/cinematics.js'), im = rd('../game/js/intromontage.js'), host = rd('../game/js/cutscenehost.js'), main = rd('../game/js/main.js');
  ok(/createJumpRunner\(spec\.jumps, jumpEnv\(\), \{ skipGate: spec\.cutId != null \}\)/.test(cine), 'cinematics: de loper komt uit spec.jumps en een gast (cutId) houdt zijn klok niet vast');
  ok(/active\._jumps\.step\(active\.t, nextT\)/.test(cine) && /endJumps\(a\)/.test(cine), 'cinematics: de klok loopt via de loper en de loper ruimt bij het einde op');
  ok(/jumpHeld/.test(cine) && /\(frozen \|\| jumpHeld\) && !voicePaused/.test(cine), 'cinematics: de stem pauzeert zolang de wachtpoort vasthoudt (ondertitels en stem blijven gelijk)');
  ok(/jumpsFromStops\(/.test(im) && /id: 'intro', priority: 6, jumps,/.test(im), 'intromontage: de filmplekken gaan als sprongen mee');
  ok(/jumpsFromScene\(useScene, at, sceneDur\)/.test(host) && /prewarm, jumps,/.test(host), 'cutscenehost: sprongen uit de gecompileerde scène');
  ok(!/cutPakket\(\{[^}]*jumps/.test(host), 'Samen spelen: sprongen gaan niet in het netwerkpakket (alles lokaal per speler)');
  ok(/loading: !!world\.cineJumpLoading/.test(main) && /cineWarm: !!world\.cineWarming/.test(main), 'main: de planner kent de vlaggen van de loper');
  ok(WARM.maxWaitMs === 1200 && WARM.dipOutMs <= 300 && WARM.dipInMs <= 300, 'de grenzen: 1,2 s wachten, duiken <= 300 ms');
}

// 9. een doorlopende baan (wijkintocht): sleutelbeelden warmen zacht vooruit, nooit een poort
{
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  const keys = [{ look: { x: 0, y: 0 } }, { look: { x: 400, y: 0 } }, { look: { x: 420, y: 10 } }, { look: { x: 900, y: 300 } }];
  const w = warmStopsFromKeys(keys, 30, ease);
  ok(w.length === 2 && w.every((j) => j.kind === 'soft'), 'warmStopsFromKeys: alleen verre sleutelbeelden, allemaal zacht', JSON.stringify(w.map((j) => [j.idx, j.kind])));
  ok(w[0].t > 0 && w[0].t < w[1].t && w[1].t < 30, 'de tijden lopen op binnen de duur');
  ok(Math.abs(ease(w[0].t / 30) * 3 - 1) < 1e-6, 'sleutelbeeld 1 is bereikt waar ease(u) * (n-1) = 1 (de easing is meegenomen)');
  ok(warmStopsFromKeys([], 30).length === 0 && warmStopsFromKeys(keys, 0).length === 0 && warmStopsFromKeys([{}, {}], 5).length === 0, 'warmStopsFromKeys: lege of onzinnige invoer geeft niets');
  const m = mkEnv({ tilesMissing: 9 });
  const r = createJumpRunner(w, m.env);
  const p = play(r, m.clock, 30);
  ok(m.calls.warm.length === 2 && p.heldFrames === 0 && m.calls.fade.length === 0, 'doorlopende baan: wel vooruit-warm, nooit zwart en nooit vasthouden');
  ok(/jumps: warmStopsFromKeys\(tourKeys\(/.test(readFileSync(new URL('../game/js/intochten.js', import.meta.url), 'utf8')), 'intochten: de stops warmen vooruit');
}

// 10. meetpunten: elke stap van de loper meldt zich (warm, cut of gate, release) zodat de Electron-run ze kan tellen
{
  const evs = [];
  const m = mkEnv({ tilesMissing: 4 });
  m.env.note = (e) => evs.push(e);
  const r = createJumpRunner(js, m.env);
  let readyAt = null;
  play(r, m.clock, 18, { onFrame: (f, t, st) => { if (st.phase === 'wait' && readyAt == null) readyAt = m.clock.ms + 400; if (readyAt != null && m.clock.ms >= readyAt) m.set({ tilesMissing: 0 }); } });
  const kinds = evs.map((e) => e.ev + ':' + e.idx).join(',');
  ok(kinds === 'warm:2,gate:2,release:2,warm:4', 'meetpunten: warm, gate, release voor de eerste sprong en warm voor de tweede', kinds);
  const rel = evs.find((e) => e.ev === 'release');
  ok(rel && rel.reason === 'klaar' && rel.waitedMs >= WARM.dipOutMs + WARM.minWaitMs && rel.waitedMs < WARM.maxWaitMs, 'meetpunten: release meldt de reden en de wachttijd', JSON.stringify(rel));
  const evs2 = [];
  const m2 = mkEnv();
  m2.env.note = (e) => evs2.push(e);
  play(createJumpRunner(js, m2.env), m2.clock, 24);
  ok(evs2.filter((e) => e.ev === 'cut' && e.ready).length === 2 && !evs2.some((e) => e.ev === 'gate'), 'meetpunten: op tijd klaar meldt een gewone cut, geen gate');
  const m3 = mkEnv(); m3.env.note = () => { throw new Error('stuk'); };
  ok(play(createJumpRunner(js, m3.env), m3.clock, 24).frames > 0, 'een kapotte meetfunctie hindert de scene niet');
}

// #1171 (hertest 24-11): het eerste shot van de opening ligt ver van de speler; dat is ook een sprong, met een meteen zwart begin
{
  const { stopsFromStart, FIRST_JUMP_T } = await import('../game/js/cutscenewarm.js');
  const shots = [{ t: 0, x: 214, y: 10 }, { t: 5.2, x: 16, y: 256 }, null, { t: 9.6, x: 1309, y: -805 }];
  const st = stopsFromStart(shots, { x: 2400, y: -2600 });
  ok(st.length === 4 && st[0].t < 0 && st[1].t === FIRST_JUMP_T && st[1].x === 214, 'de speler vooraan, het eerste shot net na 0', JSON.stringify(st));
  const js0 = jumpsFromStops(st);
  ok(js0.length >= 1 && js0[0].idx === 1 && js0[0].kind === 'hard' && js0[0].t === FIRST_JUMP_T, 'de sprong van de speler naar de toren is hard', JSON.stringify(js0[0]));
  const oud = jumpsFromStops(shots.filter((q) => q && q.t > 0));
  ok(!oud.some((j) => j.to.x === 214), 'zonder stopsFromStart had de toren geen sprong (de oorzaak van het lege beeld)');
  const later = stopsFromStart([{ t: -3, x: 1, y: 1 }, { t: -0.5, x: 214, y: 10 }, { t: 2, x: 16, y: 256 }], { x: 214, y: 12 });
  ok(later[1].x === 214 && later[1].t === FIRST_JUMP_T && later.length === 3, 'midden in de film beginnen: het shot dat nu loopt telt, de eerdere niet');
  ok(stopsFromStart(null, null).length === 0 && stopsFromStart([{ t: 1, x: NaN, y: 0 }], { x: 0, y: 0 }).length === 1, 'kapotte invoer: niets of alleen de speler');
  // de poort: bij het begin meteen zwart (geen uitduik over het lege beeld) en hij mag langer wachten dan bij een gewone cut
  const m = mkEnv({ tilesMissing: 99 });
  const r = createJumpRunner(js0, m.env);
  const p = play(r, m.clock, 1);
  ok(m.calls.fade.length && m.calls.fade[0][0] === 1 && m.calls.fade[0][1] === 0, 'het begin gaat meteen op zwart', JSON.stringify(m.calls.fade[0]));
  const heldMs = p.heldFrames * 1000 / 60;
  ok(heldMs >= WARM.startWaitMs - 60 && heldMs <= WARM.startWaitMs + 60, 'nooit klaar: bij het begin hoogstens startWaitMs', String(heldMs));
  const m2 = mkEnv({ tilesMissing: 9 });
  const r2 = createJumpRunner(js0, m2.env);
  play(r2, m2.clock, 1, { onFrame: (f) => { if (f === 30) m2.set({ tilesMissing: 0 }); } });
  ok(r2.gate.stats.timeouts === 0 && r2.gate.stats.gates === 1, 'klaar: de film begint zodra de plek er staat');
}

console.log(`${n - fails}/${n} cutscenewarm-controles`);
process.exit(fails ? 1 : 0);
