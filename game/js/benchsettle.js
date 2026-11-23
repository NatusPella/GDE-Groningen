// De benchmark begint pas als de wereld rond de eerste plek "settled" is (eigenaar 22-11: "zieke popin bij de eerste benchmark run").
// De eerste meting (de huidige grafische stand) liep op een wereld die nog tegels, gebouwen en wegen aan het opbouwen was; de andere
// standen kwamen daarna op een warme wereld. Dat benadeelde de eerste (bij Ultra: 'Stabiliteit 15 fps, haperingen 8 %').
// Zuiver: geen DOM, geen timers (de aanroeper geeft `now` in ms), zodat scripts/benchsettle_test.mjs elke regel keurt.
// Dezelfde klaar-regel als de wachtpoort van de cutscenes (cutscenewarm.js readiness, diep): tegels rond de plek binnen, de wachtrij
// leeg, geen gebouwen en wegen meer in aanbouw, de plaatsingsring klaar; en dat een aaneengesloten tijd lang (geen nieuwe uitbarsting).
import { readiness } from './cutscenewarm.js';
import { tileOrigin, TILE_M } from './gdt.js';

// 24-11: hoeveel wachtende tegelstappen (FrameQueue-items met label 'add:i,j' of 'add:oi,j', tileworld.js) bij een tegel horen die binnen
// radiusM van (f.x, f.y) komt. De poort keek naar de HELE tegelrij, ook naar tegels op een kilometer afstand die de verre zichtafstand vooruit
// vraagt; die rij werd in de benchmark nooit leeg (68 tot 189 items) en elke poort liep vol. Een item zonder tegel ('drop:', onbekend) telt niet.
export function queueNear(items, f, radiusM) {
  if (!items || !f) return 0;
  let n = 0;
  const reach = radiusM + TILE_M * 0.71;
  for (const it of items) {
    const label = it && it.label;
    if (typeof label !== 'string' || !label.startsWith('add:')) continue;
    const [i, j] = label.slice(4).replace(/^o/, '').split(',').map(Number);
    if (!Number.isFinite(i) || !Number.isFinite(j)) continue;
    const [ox, oy] = tileOrigin(i, j);
    if (Math.hypot(ox + TILE_M / 2 - f.x, oy + TILE_M / 2 - f.y) <= reach) n++;
  }
  return n;
}

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
