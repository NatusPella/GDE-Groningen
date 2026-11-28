// Vooruit-warm en wachtpoort voor cutscenes die van plek wisselen (#1016, #1008).
// Puur: geen three.js, geen DOM, geen eigen timers (de aanroeper geeft `now`), zodat scripts/cutscenewarm_test.mjs elke regel
// zonder browser keurt.
//
// Het probleem: een film als de opening springt van de Grote Markt naar de Oosterparkwijk en weer naar Paddepoel. Tijdens een
// cutscene krijgt het streamen weinig tijd (streamplanner.js: cine = 40 % van het plafond) en het streamfocus staat tot de cut op de
// oude plek: tegels, gebouwen, wegen, gras, voertuigen en voetgangers van de nieuwe plek verschijnen dus pas ná de cut.
// Twee regels:
//  1. VOORUIT-WARM: `leadS` seconden vóór een sprong worden de tegels en gebouwen van de nieuwe plek al gevraagd (warmDue), met
//     iets meer cine-budget zolang dat loopt (de aanroeper zet world.cineWarming).
//  2. WACHT-TOT-KLAAR voor harde sprongen (verder dan hardM): is de nieuwe plek bij de cut nog niet klaar, dan duikt het beeld
//     in `dipOutMs` naar zwart (de kaart hoeft dan niets meer te tekenen en krijgt het laadbudget), wacht hoogstens `maxWaitMs`
//     (daarna terugval: de film gaat door) en komt in `dipInMs` terug. Is alles op tijd klaar, dan blijft de cut een gewone cut.
// Een zachte sprong (softM tot hardM) wordt alleen vooruit-gewarmd. Een korte afstand doet niets.

import { cameraFocus } from './tilefocus.js';

export const WARM = {
  softM: 60,        // vanaf deze afstand tussen het eind van het ene en het begin van het volgende shot: warmen
  hardM: 150,       // vanaf deze afstand: een harde sprong (zelfde drempel als tilefocus CUT_M)
  leadS: 3,         // zoveel seconden vóór de cut beginnen met warmen
  radiusM: 150,     // de straal waarin gebouwen vooraf worden gebouwd (scene3d prewarmStreamAt)
  tileRadiusM: 400, // de straal waarin tegels vooraf worden gevraagd
  lifeS: 8,         // zo lang blijft een warm-plek beschermd
  maxWaitMs: 1200,  // een harde sprong wacht hoogstens zo lang (vanaf de cut, uit- en induiken niet meegeteld)
  startWaitMs: 4000, // #1171: de sprong bij het begin van een film (nog niets gezien, het beeld begint zwart) mag langer wachten
  minWaitMs: 120,   // zo lang onder zwart wachten, zodat de streams hun focus gevolgd hebben voor "klaar" telt
  dipOutMs: 240,    // naar zwart (DS3-ritme: <= 300 ms)
  dipInMs: 260,     // terug uit zwart
  hold: 0.001,      // s: het oude shot blijft zoveel vóór de cut staan terwijl het beeld wegduikt
};

const finite = (v) => Number.isFinite(v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function classifyJump(d, p = WARM) {
  if (!(d >= p.softM)) return 'none';
  return d >= p.hardM ? 'hard' : 'soft';
}

// Het streamfocus van een camerastand (zoals tilefocus.js het kiest), of null.
export function focusOfPose(pose) {
  return cameraFocus(pose);
}

// Sprongen uit een lijst shots: [{ t, x, y, ex?, ey? }]; (x, y) is het focus aan het begin van het shot, (ex, ey) aan het eind
// (standaard hetzelfde). Een sprong is de afstand van het eind van het vorige naar het begin van dit shot; het eerste shot heeft
// er geen (de scène-prewarm dekt het begin). Geeft [{ idx, t, from, to, dist, kind }] voor alle shots met kind != 'none'.
export function jumpsFromStops(stops, p = WARM) {
  const out = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (!a || !b || !finite(a.x) || !finite(a.y) || !finite(b.x) || !finite(b.y) || !finite(b.t)) continue;
    const from = { x: finite(a.ex) ? a.ex : a.x, y: finite(a.ey) ? a.ey : a.y };
    const to = { x: b.x, y: b.y };
    const d = dist(from, to), kind = classifyJump(d, p);
    if (kind !== 'none') out.push({ idx: i, t: b.t, from, to, dist: d, kind });
  }
  return out;
}

// #1171 (hertest 24-11): de opening begon met een leeg grijsgroen beeld. Het eerste shot (de Martinitoren) ligt ver van waar de speler staat
// (het nieuwe thuis in Paddepoel), maar het eerste shot had geen sprong: de montage gooide de shots op t <= 0 weg en jumpsFromStops slaat
// het eerste over. Dit zet de plek van de speler vooraan (van daar springt de camera echt) en het shot dat bij de start in beeld is op een
// heel klein beetje na 0, zodat de wachtpoort bij de eerste stap meteen onder zwart wacht tot de toren er staat.
// stops: [{ t, x, y, ex?, ey? }] in filmtijd (t < 0: al voorbij); from: { x, y } of null. Puur.
export const FIRST_JUMP_T = 0.001; // net na 0: de eerste stap van de film (t 0 naar een frame verder) arm de poort al
export function stopsFromStart(stops, from) {
  const geldig = (stops || []).filter((q) => q && finite(q.t) && finite(q.x) && finite(q.y));
  const voorbij = geldig.filter((q) => q.t <= 0);
  const nu = voorbij.length ? voorbij[voorbij.length - 1] : null;
  const rest = geldig.filter((q) => q.t > 0);
  const out = [];
  if (from && finite(from.x) && finite(from.y)) out.push({ t: -1, x: from.x, y: from.y });
  if (nu) out.push({ ...nu, t: FIRST_JUMP_T });
  return out.concat(rest.map((q) => (q.t < FIRST_JUMP_T * 2 && nu ? { ...q, t: FIRST_JUMP_T * 2 } : q)));
}

// Sprongen uit een gecompileerde scène (cutscript.js compileScene: .shots[{ t }], .sample(t, anchor) -> camera): per cut het
// focus vlak vóór en vlak na de cut. Een scène die om één anker is geregisseerd heeft zelden een sprong; hij kan het wel (een
// opening die van de straat naar een andere wijk gaat).
export function jumpsFromScene(scene, anchor, duration, p = WARM) {
  const shots = (scene && scene.shots) || [];
  const stops = [];
  try {
    for (let i = 0; i < shots.length; i++) {
      const t = shots[i].t;
      if (!finite(t) || t > duration) continue;
      const after = focusOfPose(scene.sample(Math.min(duration, t + 0.05), anchor).camera);
      const before = i > 0 ? focusOfPose(scene.sample(Math.max(0, t - 0.05), anchor).camera) : null;
      if (!after) continue;
      stops.push({ t, x: after.x, y: after.y, ...(before ? { _before: before } : {}) });
    }
  } catch (e) { return []; } // een samplefout betekent alleen minder warm
  // het eind van het vorige shot is het focus vlak vóór deze cut
  for (let i = 1; i < stops.length; i++) if (stops[i]._before) { stops[i - 1].ex = stops[i]._before.x; stops[i - 1].ey = stops[i]._before.y; }
  return jumpsFromStops(stops, p);
}

// Een doorlopende camerabaan (de wijkintocht: sleutelbeelden met een easing) heeft geen cuts maar wel plekken die hij snel passeert (tot
// 190 m/s). Elk sleutelbeeld i is bereikt waar ease(u) * (n - 1) = i; de plek ervan (het kijkpunt) wordt als ZACHTE sprong vooruit
// gewarmd, nooit als poort (de film is één lopende beweging). keys: [{ look: { x, y } }]; seconds: de duur van de baan.
export function warmStopsFromKeys(keys, seconds, ease = (u) => u, p = WARM) {
  const n = (keys || []).length;
  if (n < 2 || !(seconds > 0)) return [];
  const uAt = (i) => { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (ease(mid) * (n - 1) < i) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  const stops = keys.map((k, i) => (k && k.look ? { t: uAt(i) * seconds, x: k.look.x, y: k.look.y } : null)).filter(Boolean);
  return jumpsFromStops(stops, p).map((j) => ({ ...j, kind: 'soft' }));
}

// Welke sprongen moeten nu worden gewarmd? `state.warmed` (Set van idx) onthoudt wat al gevraagd is. `nextT` is de scènetijd na
// deze frame. Alleen sprongen die nog moeten komen (j.t > t) of net komen.
export function warmDue(jumps, t, nextT, state, p = WARM) {
  const due = [];
  for (const j of jumps) {
    if (state.warmed.has(j.idx)) continue;
    if (nextT >= j.t - p.leadS && t < j.t + 1e-6) { state.warmed.add(j.idx); due.push(j); }
  }
  return due;
}

// Is de plek klaar genoeg om te tonen? q: { tilesMissing, prewarmPending, buildings?, roads? }. `deep` (onder zwart) eist ook dat
// de gebouwen en wegen in beeld hun detail hebben; de snelle check bij de cut kijkt alleen naar tegels en voorgebouwde gebouwen.
export function readiness(q, deep = false) {
  if (!q) return { ready: true, reason: 'geen meting' };
  const n = (v) => (finite(v) && v > 0 ? v : 0);
  if (n(q.tilesMissing)) return { ready: false, reason: 'tegels' };
  if (n(q.prewarmPending)) return { ready: false, reason: 'gebouwen' };
  // #1354: de strenge definitie (tileready.js): ook shaders en texturen, het verre LOD en de bevolking moeten er staan
  if (n(q.gpu)) return { ready: false, reason: 'gpu' };
  if (n(q.lod)) return { ready: false, reason: 'verre laag' };
  if (n(q.population)) return { ready: false, reason: 'bevolking' };
  if (deep && (n(q.buildings) || n(q.roads))) return { ready: false, reason: n(q.buildings) ? 'detail' : 'wegen' };
  return { ready: true, reason: 'klaar' };
}

// De wachtpoort van één harde sprong als toestandsmachine: idle -> out (duiken) -> wait (zwart, wachten) -> in (terugkomen) -> idle.
// `tick(now, ready)` geeft { phase, hold, fade, reason }:
//   hold: true zolang de scèneklok stil moet staan (out en wait); fade: { to, ms } als het zwart moet veranderen, anders null.
export function createJumpGate(p = WARM) {
  let phase = 'idle', t0 = 0, tPhase = 0, jump = null, reason = '';
  const stats = { gates: 0, timeouts: 0, waitedMs: 0, maxWaitedMs: 0 };
  return {
    get phase() { return phase; },
    get jump() { return jump; },
    get active() { return phase !== 'idle'; },
    stats,
    arm(j, now, { instant = false } = {}) {
      jump = j; t0 = tPhase = now; reason = '';
      phase = instant || !(p.dipOutMs > 0) ? 'wait' : 'out';
      stats.gates++;
      return { phase, hold: true, fade: { to: 1, ms: instant ? 0 : p.dipOutMs }, reason };
    },
    tick(now, ready) {
      if (phase === 'idle') return { phase, hold: false, fade: null, reason };
      if (phase === 'out') {
        if (now - tPhase >= p.dipOutMs) { phase = 'wait'; tPhase = now; return { phase, hold: true, fade: null, reason }; }
        return { phase, hold: true, fade: null, reason };
      }
      if (phase === 'wait') {
        const waited = now - t0;
        const quick = waited - Math.max(0, p.dipOutMs) < p.minWaitMs;
        if (!quick && ready) reason = 'klaar';
        else if (waited >= (jump && jump.t <= FIRST_JUMP_T && p.startWaitMs ? p.startWaitMs : p.maxWaitMs)) { reason = 'time-out'; stats.timeouts++; }
        if (reason) {
          stats.waitedMs += waited; stats.maxWaitedMs = Math.max(stats.maxWaitedMs, waited);
          phase = 'in'; tPhase = now;
          return { phase, hold: false, fade: { to: 0, ms: p.dipInMs }, reason };
        }
        return { phase, hold: true, fade: null, reason };
      }
      // in: de klok loopt weer; na de induik is de poort klaar
      if (now - tPhase >= p.dipInMs) { phase = 'idle'; jump = null; return { phase, hold: false, fade: null, reason }; }
      return { phase, hold: false, fade: null, reason };
    },
    reset() { phase = 'idle'; jump = null; },
  };
}

// De loper die warmen en poort aan een scène hangt. env (alles optioneel behalve now):
//   now(): ms; warm(j): vraag tegels en gebouwen van j.to; ready(j, deep): { tilesMissing, ... } of een readiness-uitslag;
//   fade(k, ms): zwart; voice(on): de stem pauzeren (true) of hervatten (false); flags(o): { warming, loading } voor het streambudget;
//   note(e): een meetpunt voor de Electron-run ({ ev: 'warm' | 'cut' | 'gate' | 'release', idx, t, dist, ... }).
// step(t, nextT) geeft de scènetijd die deze frame mag worden: nextT, of vastgehouden bij een poort. `skipGate` (een gast die de
// klok van de gastheer volgt) warmt wel maar houdt de klok nooit vast.
export function createJumpRunner(jumps, env, { p = WARM, skipGate = false } = {}) {
  const list = [...(jumps || [])].filter((j) => j && finite(j.t)).sort((a, b) => a.t - b.t);
  const state = { warmed: new Set() };
  const gate = createJumpGate(p);
  const passed = new Set();
  let warmUntil = -Infinity, holdVoice = false, gateAt = 0;
  const rd = (j, deep) => { const q = env.ready ? env.ready(j, deep) : null; return q && 'ready' in q ? q : readiness(q, deep); };
  const setFlags = (warming, loading) => { if (env.flags) env.flags({ warming, loading }); };
  const setVoice = (on) => { if (holdVoice !== on) { holdVoice = on; if (env.voice) env.voice(on); } };
  const note = (e) => { if (env.note) { try { env.note(e); } catch (err) { /* meten mag nooit hinderen */ } } };
  const apply = (r) => { if (r && r.fade && env.fade) env.fade(r.fade.to, r.fade.ms); };

  return {
    gate, jumps: list,
    get holding() { return gate.active && gate.phase !== 'in'; },
    step(t, nextT) {
      const now = env.now();
      for (const j of warmDue(list, t, nextT, state, p)) { if (env.warm) env.warm(j); note({ ev: 'warm', idx: j.idx, t: j.t, dist: Math.round(j.dist), kind: j.kind }); warmUntil = now + (p.leadS + 1) * 1000; }
      let allowed = nextT;
      if (gate.active) {
        const j = gate.jump;
        const r = gate.tick(now, gate.phase === 'wait' ? rd(j, true).ready : false);
        apply(r);
        if (r.reason && r.fade && r.fade.to === 0) note({ ev: 'release', idx: j.idx, t: j.t, reason: r.reason, waitedMs: Math.round(now - gateAt) });
        if (r.hold) allowed = gate.phase === 'out' ? Math.max(0, j.t - p.hold) : j.t; // uit: het oude shot; zwart: het nieuwe eerste frame
        else allowed = Math.max(nextT, j.t);
      } else if (!skipGate) {
        for (const j of list) {
          if (j.kind !== 'hard' || passed.has(j.idx)) continue;
          if (t < j.t && nextT >= j.t) {
            passed.add(j.idx);
            if (rd(j, false).ready) { note({ ev: 'cut', idx: j.idx, t: j.t, dist: Math.round(j.dist), ready: true }); break; } // op tijd klaar: een gewone cut
            gateAt = now;
            note({ ev: 'gate', idx: j.idx, t: j.t, dist: Math.round(j.dist), why: rd(j, false).reason });
            const r = gate.arm(j, now, { instant: j.t <= FIRST_JUMP_T }); // #1171: bij het begin meteen zwart, geen uitduik over een leeg beeld
            apply(r);
            allowed = Math.max(0, j.t - p.hold);
            break;
          }
        }
      }
      const loading = gate.active && gate.phase === 'wait';
      setFlags(now < warmUntil || gate.active, loading);
      setVoice(gate.active && gate.phase !== 'in');
      return { t: allowed, held: gate.active && gate.phase !== 'in', phase: gate.phase };
    },
    // de scène stopt: zwart weg, vlaggen en stem terug
    dispose() {
      if (gate.active && env.fade) env.fade(0, 0);
      gate.reset();
      setFlags(false, false); setVoice(false);
    },
    stats() { return { ...gate.stats, warmed: state.warmed.size, jumps: list.length, hard: list.filter((j) => j.kind === 'hard').length }; },
  };
}
