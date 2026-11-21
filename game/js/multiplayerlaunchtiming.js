// Samen spelen (#1011): wat zet de gastheer stil na "Spel starten"? De start laat de gastheer 10 tot 57 s hakkelen (docs/BEKENDE-BEPERKINGEN-0.64.0.md).
// Deze module meet het zonder iets aan te passen: vanaf het moment van starten legt hij elke lange taak (PerformanceObserver 'longtask')
// en elke lange beeldsprong (rAF) vast, met de stap waarin hij viel, en vat het samen in de console (`[start-meting] {...}`) en op
// world.coopStartMeting. Stappen zet de code zelf met markeerStartStap('naam') op de plekken die er toe doen.
// Alleen metingen: geen netwerk, geen opslag, geen spelergegevens. Puur deel (samenvatting) is getest in scripts/multiplayerlaunchtiming_test.mjs.

const START_METING_MS = 70000;
const START_DREMPEL_MS = 120;

// Samenvatting van een lijst { at, dur, stap, bron }: totaal geblokkeerd, langste, en per stap de som en de langste. Let op: een lange taak komt
// ook als lange beeldsprong (raf) en als lange frame (loaf) voor, dus de totalen tellen tot drie keer; lees ze als ordegrootte en kijk naar top.
export function samenvatStartMeting(events, drempel = START_DREMPEL_MS) {
  const lijst = (Array.isArray(events) ? events : []).filter((e) => e && Number.isFinite(e.dur) && e.dur >= drempel);
  const perStap = {};
  let totaal = 0, langste = 0;
  for (const e of lijst) {
    const s = e.stap || '(geen stap)';
    const p = perStap[s] || (perStap[s] = { n: 0, som: 0, max: 0 });
    p.n++; p.som += e.dur; p.max = Math.max(p.max, e.dur);
    totaal += e.dur; langste = Math.max(langste, e.dur);
  }
  const rond = (x) => Math.round(x);
  for (const p of Object.values(perStap)) { p.som = rond(p.som); p.max = rond(p.max); }
  // wie kostte de tijd: de scripts uit de lange frames (loaf) opgeteld per bestand:functie, en hoeveel van die frames render of script waren
  const loaf = lijst.filter((e) => e.bron === 'loaf'), perScript = {};
  let scriptMs = 0, renderMs = 0;
  for (const e of loaf) { scriptMs += e.scriptMs || 0; renderMs += e.renderMs || 0; for (const x of e.sc || []) { const k = (x.u || '?') + ':' + (x.f || '?'); perScript[k] = (perScript[k] || 0) + x.d; } }
  const top = Object.entries(perScript).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, d]) => ({ k, ms: rond(d) }));
  return { aantal: lijst.length, totaalMs: rond(totaal), langsteMs: rond(langste), perStap, ...(loaf.length ? { frames: loaf.length, scriptMs: rond(scriptMs), renderMs: rond(renderMs), top } : {}) };
}

// Zet de stap waarin we nu zitten; wat daarna blokkeert wordt eraan toegeschreven.
export function markeerStartStap(world, stap) {
  const m = world && world.coopStartMeting;
  if (!m || m.klaar) return false;
  m.stap = String(stap);
  m.stappen.push({ at: Math.round(performance.now() - m.t0), stap: m.stap });
  return true;
}

// Begint te meten (eenmalig per start). Geeft de meting terug, of null zonder performance-API.
export function startStartMeting(world, { duur = START_METING_MS, drempel = START_DREMPEL_MS } = {}) {
  if (!world || typeof performance === 'undefined') return null;
  if (world.coopStartMeting && !world.coopStartMeting.klaar) return world.coopStartMeting;
  const m = { t0: performance.now(), stap: 'start-ingedrukt', stappen: [{ at: 0, stap: 'start-ingedrukt' }], events: [], klaar: false, samenvatting: null };
  world.coopStartMeting = m;
  let obs = null, raf = 0, laatste = performance.now();
  const noteer = (dur, bron, at) => { if (dur >= drempel) m.events.push({ at: Math.round(at - m.t0), dur: Math.round(dur), stap: m.stap, bron }); };
  try {
    if (typeof PerformanceObserver === 'function') {
      obs = new PerformanceObserver((lijst) => { for (const e of lijst.getEntries()) noteer(e.duration, 'longtask', e.startTime); });
      obs.observe({ entryTypes: ['longtask'] });
    }
  } catch (e) { obs = null; /* geen longtask in deze omgeving: de rAF-meting blijft */ }
  // Lange beeldframes met de scripts erin (Chromium 123+): zegt welke functie of welk bestand de tijd kostte, of dat het tekenen
  // (render) zelf was. Alleen de drie zwaarste scripts per frame, met de bestandsnaam zonder pad.
  let obsFrames = null;
  try {
    if (typeof PerformanceObserver === 'function' && (PerformanceObserver.supportedEntryTypes || []).includes('long-animation-frame')) {
      obsFrames = new PerformanceObserver((lijst) => {
        for (const e of lijst.getEntries()) {
          if (e.duration < drempel) continue;
          const sc = (e.scripts || []).map((x) => ({ f: x.sourceFunctionName || x.invoker || '', u: String(x.sourceURL || '').split('/').pop().slice(0, 40), d: Math.round(x.duration) })).sort((a, b) => b.d - a.d).slice(0, 3);
          const scriptMs = (e.scripts || []).reduce((t, x) => t + x.duration, 0);
          m.events.push({ at: Math.round(e.startTime - m.t0), dur: Math.round(e.duration), stap: m.stap, bron: 'loaf', scriptMs: Math.round(scriptMs), renderMs: Math.round(Math.max(0, e.duration - scriptMs)), sc });
        }
      });
      obsFrames.observe({ type: 'long-animation-frame', buffered: false });
    }
  } catch (e) { obsFrames = null; }
  const tik = (nu) => {
    if (m.klaar) return;
    noteer(nu - laatste, 'raf', laatste);
    laatste = nu;
    if (nu - m.t0 >= duur) { eind(); return; }
    raf = requestAnimationFrame(tik);
  };
  const eind = () => {
    if (m.klaar) return;
    m.klaar = true;
    try { if (obs) obs.disconnect(); } catch (e) { /* al weg */ }
    try { if (obsFrames) obsFrames.disconnect(); } catch (e) { /* al weg */ }
    try { if (raf) cancelAnimationFrame(raf); } catch (e) { /* al weg */ }
    m.samenvatting = samenvatStartMeting(m.events, drempel);
    try { console.info('[start-meting] ' + JSON.stringify({ samenvatting: m.samenvatting, stappen: m.stappen, events: m.events.slice(0, 60) })); } catch (e) { /* geen console */ }
  };
  m.stop = eind;
  if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tik);
  return m;
}
