// De poort van een cutscene: de wereld rond het hele shotpad is klaar voordat het eerste beeld verschijnt (#1354). De cutscene is de strengste
// klant van de definitie van tegel-klaar (tileready.js): alle zes niveaus rond elk punt van het pad (begin, midden, eind, de baan ertussen en
// de plek van de acteurs), want een shot kijkt langer dan een seconde naar hetzelfde beeld en een cut verbergt niets.
//
//   ensureCutsceneReady(poses, { env, shot })  ->  { promise, cancel, regions, gate }
//   promise lost op met { ready, timedOut, waitedMs, text, black } zodra alles klaar is, of na de maximumtijd (terugval: de film gaat door).
//   Wordt het wachten voelbaar (CUT.blackAfterMs), dan duikt het beeld naar zwart: liever een korte zwarte duik dan pop-in in beeld.
//
// Puur op `env` na (geen DOM, geen three.js), zodat scripts/cutsceneready_test.mjs de poort met een nepwereld keurt:
//   env.now() ms; env.counts(regions) -> tellers per niveau (readysensors.js collectReady, plus de tegels rond elk gebied); env.warm(region);
//   env.fade(k, ms) naar zwart (1) of terug (0); env.flags({ loading }) geeft het streamen het laadbudget onder zwart; env.schedule(fn) = volgende frame.
import { shotRegions, createCutsceneGate, CUT } from './tileready.js';

// De camerastanden en acteursplekken uit de bestaande scènedata (cutscript.js compileScene: .sample(t, anchor) -> { camera, actors }); één per seconde,
// hoogstens maxN. Geen eigen scènedata nodig: dit leest alleen uit.
export function posesFromScene(scene, anchor, duration, { stepS = 1, maxN = 120 } = {}) {
  const out = [];
  if (!scene || typeof scene.sample !== 'function') return out;
  try {
    const dur = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const ts = [];
    for (let t = 0; t <= dur + 1e-6 && ts.length < maxN; t += stepS) ts.push(Math.min(t, dur));
    // de shotwissels zelf (vlak voor en na de cut): daar springt de camera
    for (const s of scene.shots || []) if (Number.isFinite(s.t) && s.t <= dur && ts.length < maxN + 20) ts.push(Math.max(0, s.t - 0.05), Math.min(dur, s.t + 0.05));
    ts.sort((a, b) => a - b);
    for (const t of ts) {
      const s = scene.sample(t, anchor), c = s && s.camera;
      if (!c) continue;
      const actors = s.actors ? Object.values(s.actors).filter((a) => a && Number.isFinite(a.x) && Number.isFinite(a.y)).map((a) => ({ x: a.x, y: a.y })) : [];
      out.push({ position: c.position, lookAt: c.lookAt, actors });
    }
  } catch (e) { /* een samplefout betekent alleen minder gebieden */ }
  return out;
}

export function ensureCutsceneReady(poses, { env, shot = false, p = CUT, black = true, regions: given = null } = {}) {
  const regions = given || shotRegions(poses, p);
  const cg = createCutsceneGate({ shot, p });
  let cancelled = false, blackOn = false, loadingOn = false, settled = false, res;
  const promise = new Promise((r) => { res = r; });
  const setLoading = (on) => { if (loadingOn !== on) { loadingOn = on; try { env.flags && env.flags({ loading: on }); } catch (e) { /* alleen een vlag */ } } };
  const finish = (out) => {
    if (settled) return;
    settled = true;
    setLoading(false);
    if (blackOn) { blackOn = false; try { env.fade && env.fade(0, p.fadeInMs ?? 260); } catch (e) { /* geen DOM */ } }
    res(out);
  };
  for (const g of regions) { try { env.warm && env.warm(g); } catch (e) { /* vooruit-warm is een hulpmiddel */ } }
  const tick = () => {
    if (cancelled || settled) return;
    let r;
    try { r = cg.tick(env.now(), env.counts(regions)); } catch (e) { finish({ ready: false, timedOut: true, waitedMs: 0, text: '', black: false, error: String(e && e.message || e) }); return; }
    if (black && r.black && !blackOn && !r.done) { blackOn = true; try { env.fade && env.fade(1, p.fadeOutMs ?? 240); } catch (e) { /* geen DOM */ } }
    if (r.black && !r.done) setLoading(true); // onder zwart wordt niet getekend: het streamen mag het laadbudget
    if (r.done) { finish({ ready: r.phase === 'ready', timedOut: r.phase === 'timeout', waitedMs: r.waitedMs, text: r.text || '', black: blackOn || r.black }); return; }
    env.schedule(tick);
  };
  env.schedule(tick);
  return { promise, regions, gate: cg, cancel() { if (settled) return; cancelled = true; finish({ ready: false, timedOut: false, cancelled: true, waitedMs: 0, text: '', black: false }); } };
}
