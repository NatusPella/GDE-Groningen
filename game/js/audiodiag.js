// Audiodiagnose (0.64.1, Nikky: "audio glitches, soms een ruisgeluid"). Eén blok technische info over het geluid dat de
// speler met de rest van de diagnose (gpudiag.js, Ctrl+Shift+G) kopieert: de staat van de AudioContext, de latentie, hoeveel
// stemmen er klinken, de stand van master en limiter, en vooral een glitchdetector: loopt de audioklok achter op de
// werkelijke tijd, dan is de uitvoer gestopt of onderbroken (underrun) en dat hoor je als tik, gat of ruis.
// Niets gaat naar buiten. De pure delen draaien ook in Node: scripts/audio/ruis_test.mjs.
//
// Gebruik (audio.js): audioDiag.attach({ ctx, master, limiter, meter, voices }) bij het bouwen van de graaf, audioDiag.tick()
// elk beeld (goedkoop), audioDiag.note('nan' | 'clip' | 'fix', tekst) bij een noodgreep. De diagnose roept audioBlokTekst() aan.

const MAX_NOTES = 8;
const STORE_KEY = 'gde-audioglitch-v1';

export const DRIFT_MS = 50;        // zoveel loopt de audioklok achter voordat het een underrun heet
export const CLIP_LEVEL = 0.98;    // een uitvoermonster zo hard: de limiter hield het niet meer tegen (bijna 0 dBFS)
export const LIMITER_DB = -1;      // de limiter grijpt zo diep in: het optellen van de bronnen kwam boven zijn drempel
export const WINDOW_S = 60;        // de glitches per minuut: een glijdend venster
export const SLOW_RUNS_FOR_PLAYBACK = 5;   // zoveel glitches per minuut in de vorige sessie: kies nu de ruime buffer

// Een niet-eindige waarde in een AudioParam gooit een TypeError (Chrome) en laat de rest van de update liggen, of, via een
// filter of een eigen worklet, vergiftigt de hele mix met ruis of stilte. Eén helper voor alle plekken die een berekende
// waarde schrijven: niet-eindig wordt de terugvalwaarde (of overgeslagen) en geteld. tau > 0: setTargetAtTime, anders .value.
const guardStats = { gevangen: 0, laatste: null };
export function veiligWaarde(waarde, fallback) {
  if (typeof waarde === 'number' && Number.isFinite(waarde)) return waarde;
  guardStats.gevangen++;
  guardStats.laatste = String(waarde);
  return typeof fallback === 'number' && Number.isFinite(fallback) ? fallback : null;
}
export function veiligParam(param, waarde, fallback, t = 0, tau = 0) {
  const w = veiligWaarde(waarde, fallback);
  if (w === null || !param) return false;
  if (tau > 0) param.setTargetAtTime(w, t, tau); else param.value = w;
  return true;
}
export const guardStand = () => ({ ...guardStats });

// De glitchdetector. now(): werkelijke tijd in ms (performance.now); audio(): ctx.currentTime in s; running(): de context loopt.
// Elke tick() vergelijkt hoeveel werkelijke tijd er verstreek met hoeveel audiotijd: een hoofdthreadstall maakt beide even
// groot (de klok wordt dan achteraf gelezen), alleen een stilgevallen of onderbroken uitvoer laat de audioklok achter.
export function createGlitchDetector({ now, audio, running = () => true, driftMs = DRIFT_MS }) {
  let lastNow = null, lastAudio = null;
  const events = [];   // { at (s werkelijk), ms }
  let total = 0, worst = 0;
  return {
    tick() {
      const n = now(), a = audio();
      if (!running()) { lastNow = null; lastAudio = null; return 0; }
      if (lastNow === null || a < lastAudio) { lastNow = n; lastAudio = a; return 0; }
      const wall = n - lastNow, snd = (a - lastAudio) * 1000;
      lastNow = n; lastAudio = a;
      const lag = wall - snd;
      // een enorme sprong (tabblad op de achtergrond, slaapstand) is geen glitch
      if (lag > driftMs && wall < 5000) {
        events.push({ at: n / 1000, ms: lag });
        total++;
        worst = Math.max(worst, lag);
        return lag;
      }
      return 0;
    },
    perMinute() {
      const n = now() / 1000;
      while (events.length && events[0].at < n - WINDOW_S) events.shift();
      return events.length;
    },
    total: () => total,
    worst: () => worst,
  };
}

// Piek, niet-eindigheid en gelijkspanning van een stukje signaal (uit een AnalyserNode of uit een test).
export function meetBlok(x) {
  let pk = 0, nan = 0, som = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (!Number.isFinite(v)) { nan++; continue; }
    const a = Math.abs(v);
    if (a > pk) pk = a;
    som += v;
  }
  return { piek: pk, nan, dc: x.length ? som / x.length : 0 };
}

// De gekozen latencyHint voor de volgende sessie: had de vorige veel glitches per minuut, dan 'playback' (grotere buffers,
// ruim 30 ms extra vertraging, geen gaten); anders 'balanced'. prev is wat bewaarGlitches() schreef.
export function kiesLatencyHint(prev) {
  if (prev && Number(prev.perMin) >= SLOW_RUNS_FOR_PLAYBACK) return 'playback';
  return 'balanced';
}

export function leesVorige(storage) {
  try { return JSON.parse(storage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
}

export function formatAudioBlok(s) {
  const f = (x, d = 1) => (Number.isFinite(x) ? (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',') : '-');
  const out = ['[Geluid]'];
  const add = (k, v) => out.push(`${k}: ${v === undefined || v === null || v === '' ? '-' : v}`);
  if (!s || !s.ctx) { add('Audiocontext', 'nog niet gemaakt (of ?stil)'); return out.join('\n'); }
  add('Audiocontext', `${s.ctx}${s.suspendedSinds ? ` (${s.suspendedKeren}x gepauzeerd door de browser)` : ''}`);
  add('Samplefrequentie', `${s.sampleRate} Hz${s.sampleRate && s.sampleRate !== 48000 && s.sampleRate !== 44100 ? ' (ongewoon: de samples worden hierheen omgerekend)' : ''}`);
  add('Samples in de map', '44100 Hz mono (worden bij het laden omgerekend naar de samplefrequentie van het apparaat)');
  add('latencyHint', s.latencyHint);
  add('Basislatentie / uitvoerlatentie', `${f(s.baseLatency * 1000)} ms / ${f(s.outputLatency * 1000)} ms`);
  add('Uitvoerkanalen', s.channels);
  add('Actieve stemmen', `${s.voices}${s.engineVoices !== undefined ? `, motorstemmen ${s.engineVoices}` : ''}`);
  add('Master en limiter', `master ${f(s.master, 2)}, limiter ${s.limiter ? `${f(s.limiter.reduction, 1)} dB ingrijpen` : 'uit'}`);
  if (s.renderCapacity) add('Belasting audiodraad (browser)', `gemiddeld ${f(s.renderCapacity.gem * 100, 0)}%, piek ${f(s.renderCapacity.piek * 100, 0)}%, onderbrekingen ${f(s.renderCapacity.onderbroken * 100, 1)}%`);
  if (s.playout) add('Uitvoer (browser)', `${s.playout.events} gaten, samen ${f(s.playout.ms, 0)} ms (${f(s.playout.aandeel * 100, 2)}% van de speeltijd)`);
  add('Glitches (audioklok loopt achter, >50 ms)', `${s.glitchesPerMin} laatste minuut, ${s.glitchesTotaal} sinds het starten, langste ${f(s.glitchWorst, 0)} ms`);
  add('Limiter greep in (>1 dB) / uitvoer bij 0 dBFS', `${s.ingrepen}x / ${s.clips}x${s.piekNu !== undefined ? `, laatste piek ${f(20 * Math.log10((s.piekNu || 0) + 1e-9), 1)} dBFS` : ''}`);
  if (s.ruis) {
    const namen = Object.entries(s.ruis.perNaam || {}).map(([k, n]) => (n > 1 ? `${k} ${n}x` : k)).join(', ');
    add('Ruisbronnen (lussen)', `${s.ruis.lussen} levend${namen ? ` (${namen})` : ''}, ${s.ruis.bewaakt} doorlopende ruisstemmen bewaakt`);
    add('Ruis die bleef hangen', `${s.ruis.gecorrigeerd}x dichtgezet, ${s.ruis.stapeling}x te veel tegelijk${s.ruis.laatste ? ` (laatste: ${s.ruis.laatste})` : ''}`);
  }
  add('NaN in de mix', `${s.nans}x; niet-eindige parameterwaarden gevangen: ${s.guard.gevangen}${s.guard.laatste ? ` (laatste: ${s.guard.laatste})` : ''}`);
  if (s.vorige) add('Vorige sessie', `${s.vorige.perMin} glitches per minuut op het laatst${s.vorige.perMin >= SLOW_RUNS_FOR_PLAYBACK ? ' (daarom nu de ruime geluidsbuffer)' : ''}`);
  for (const n of s.notes || []) out.push(`  +${f(n.t, 0)} s ${n.kind}: ${n.text}`);
  return out.join('\n');
}

export function createAudioDiag() {
  let c = null;           // { ctx, master, limiter, meter, voices, engineVoices, latencyHint }
  let det = null, meterBuf = null;
  const st = { clips: 0, ingrepen: 0, nans: 0, piekNu: 0, suspendedKeren: 0, suspendedSinds: 0, notes: [], cap: null, vorige: null };
  let lastMeterAt = 0, lastCtxState = null, t0 = 0;
  const api = {
    attach(o) {
      c = o;
      const ctx = o.ctx;
      t0 = performance.now();
      det = createGlitchDetector({ now: () => performance.now(), audio: () => ctx.currentTime, running: () => ctx.state === 'running' && !(typeof document !== 'undefined' && document.hidden) });
      st.vorige = o.vorige || null;
      // Chrome 126+: de audiodraad meldt zelf zijn belasting en het aandeel onderbrekingen; elders ontbreekt dit
      try {
        if (ctx.renderCapacity && ctx.renderCapacity.start) {
          ctx.renderCapacity.addEventListener('update', (e) => { st.cap = { gem: e.averageLoad, piek: e.peakLoad, onderbroken: e.underrunRatio }; });
          ctx.renderCapacity.start({ updateInterval: 2 });
        }
      } catch (e) { /* niet beschikbaar */ }
    },
    setLimiter(l) { if (c) c.limiter = l; },
    note(kind, text) {
      if (kind === 'nan') st.nans++;
      st.notes.push({ t: (performance.now() - t0) / 1000, kind, text: String(text).slice(0, 80) });
      if (st.notes.length > MAX_NOTES) st.notes.shift();
    },
    // elk beeld: de klokvergelijking is twee getallen; de meter wordt hooguit vier keer per seconde gelezen
    tick() {
      if (!c || !det) return;
      const ctx = c.ctx;
      if (ctx.state !== lastCtxState) {
        if (lastCtxState === 'running' && ctx.state === 'suspended') st.suspendedKeren++;
        if (ctx.state === 'suspended') st.suspendedSinds = performance.now();
        lastCtxState = ctx.state;
      }
      const lag = det.tick();
      if (lag) api.note('glitch', `audioklok ${Math.round(lag)} ms achter`);
      const nu = performance.now();
      if (c.limiter && nu - lastMeterAt > 250 && Number(c.limiter.reduction) <= LIMITER_DB) st.ingrepen++;
      if ((c.meterOut || c.meter) && nu - lastMeterAt > 250) {
        lastMeterAt = nu;
        const mt = c.meterOut || c.meter;
        if (!meterBuf || meterBuf.length !== mt.fftSize) meterBuf = new Float32Array(mt.fftSize);
        mt.getFloatTimeDomainData(meterBuf);
        const m = meetBlok(meterBuf);
        st.piekNu = m.piek;
        if (m.piek >= CLIP_LEVEL) { st.clips++; api.note('clip', 'piek op 0 dBFS'); }
        if (m.nan) api.note('nan', `${m.nan} niet-eindige monsters`);
      }
    },
    // bij het afsluiten of elke minuut: bewaar de stand voor de volgende sessie (kiesLatencyHint)
    bewaar(storage) {
      if (!det) return;
      try { storage.setItem(STORE_KEY, JSON.stringify({ perMin: det.perMinute(), totaal: det.total(), at: Date.now() })); } catch (e) { /* geen opslag */ }
    },
    snapshot() {
      if (!c) return { ctx: null };
      const ctx = c.ctx;
      const lim = c.limiter ? { reduction: Number(c.limiter.reduction && c.limiter.reduction.value !== undefined ? c.limiter.reduction.value : c.limiter.reduction) || 0 } : null;
      let playout = null;
      try {
        const p = ctx.playoutStats;
        if (p && p.totalFramesDuration > 0) playout = { events: p.fallbackFramesEvents, ms: p.fallbackFramesDuration, aandeel: p.fallbackFramesDuration / p.totalFramesDuration };
      } catch (e) { /* niet beschikbaar */ }
      return {
        ctx: ctx.state, sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency, outputLatency: ctx.outputLatency, latencyHint: c.latencyHint,
        channels: ctx.destination.channelCount, voices: c.voices ? c.voices() : 0, engineVoices: c.engineVoices ? c.engineVoices() : undefined,
        master: c.master ? c.master.gain.value : NaN, limiter: lim,
        renderCapacity: st.cap, playout, suspendedKeren: st.suspendedKeren, suspendedSinds: st.suspendedSinds,
        glitchesPerMin: det ? det.perMinute() : 0, glitchesTotaal: det ? det.total() : 0, glitchWorst: det ? det.worst() : 0,
        ruis: c.ruis ? c.ruis() : null, clips: st.clips, ingrepen: st.ingrepen, nans: st.nans, piekNu: st.piekNu, guard: guardStand(), vorige: st.vorige, notes: st.notes.slice(),
      };
    },
  };
  return api;
}

export const audioDiag = createAudioDiag();
export const audioBlokTekst = () => formatAudioBlok(audioDiag.snapshot());
export const AUDIO_STORE_KEY = STORE_KEY;
