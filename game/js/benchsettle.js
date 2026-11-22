// De benchmark begint pas als de wereld rond de eerste plek "settled" is (eigenaar 22-11: "zieke popin bij de eerste benchmark run").
// De eerste meting (de huidige grafische stand) liep op een wereld die nog tegels, gebouwen en wegen aan het opbouwen was; de andere
// standen kwamen daarna op een warme wereld. Dat benadeelde de eerste (bij Ultra: 'Stabiliteit 15 fps, haperingen 8 %').
// Zuiver: geen DOM, geen timers (de aanroeper geeft `now` in ms), zodat scripts/benchsettle_test.mjs elke regel keurt.
// Dezelfde klaar-regel als de wachtpoort van de cutscenes (cutscenewarm.js readiness, diep): tegels rond de plek binnen, de wachtrij
// leeg, geen gebouwen en wegen meer in aanbouw, de plaatsingsring klaar; en dat een aaneengesloten tijd lang (geen nieuwe uitbarsting).
import { readiness } from './cutscenewarm.js';

export const SETTLE = {
  minMs: 2500,    // zo lang minstens onder zwart, zodat de streams hun focus gevolgd hebben
  calmMs: 1500,   // zo lang achter elkaar niets nieuws (geen tegel, gebouw, weg of plaatsing)
  maxMs: 20000,   // daarna begint de meting toch (een trage schijf mag de benchmark niet laten hangen); het rapport meldt het
};

export const createSettle = (p = SETTLE) => ({ p, t0: null, calmSince: null, done: false, timedOut: false });

// q: { tilesMissing, prewarmPending, buildings, roads, queue? }. Geeft { settled, timedOut, reason, waitedMs }.
export function settleTick(st, q, now) {
  if (st.t0 == null) st.t0 = now;
  const waitedMs = now - st.t0;
  if (st.done) return { settled: true, timedOut: st.timedOut, reason: 'klaar', waitedMs };
  const quiet = { ...q, tilesMissing: (Number(q && q.tilesMissing) || 0) + (Number(q && q.queue) || 0) };
  const r = readiness(quiet, true);
  if (r.ready) { if (st.calmSince == null) st.calmSince = now; } else st.calmSince = null;
  if (waitedMs >= st.p.minMs && st.calmSince != null && now - st.calmSince >= st.p.calmMs) { st.done = true; return { settled: true, timedOut: false, reason: 'klaar', waitedMs }; }
  if (waitedMs >= st.p.maxMs) { st.done = true; st.timedOut = true; return { settled: true, timedOut: true, reason: r.ready ? 'onrustig' : r.reason, waitedMs }; }
  return { settled: false, timedOut: false, reason: r.ready ? 'rust' : r.reason, waitedMs };
}
