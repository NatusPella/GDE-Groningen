// Zacht herstel na een verloren WebGL-context (GPU-driver-reset, geheugendruk,
// GPU-proces dat herstart). Zonder dit toonde het scherm de papierkleur van de
// pagina (een witte flits), bouwde three.js alle programma's, texturen en
// buffers in één frame opnieuw op en bleef de omgevingskaart (PMREM) leeg.
//
// Pure kern (geen DOM, geen klok): de toestand, de tellers, de sluier en de
// kijkafstandsramp. Daarna de koppeling aan de canvas (watchGpuRecovery) en
// aan de technische info (gpudiag.js).
import { logError } from './errorlog.js';

export const HOLD_MS = 500;       // sluier blijft volledig na het terugkomen van de context
export const FADE_OUT_MS = 1400;  // daarna zacht weg
export const RECOVER_MS = 6000;   // de kijkafstand groeit zo lang terug
export const RAMP_START = 0.4;    // aandeel van de kijkafstand direct na het herstel
export const STUCK_MS = 8000;     // zo lang verloren zonder herstel: raad de speler iets aan

export function createGpuState() {
  return { phase: 'ok', lost: 0, restored: 0, firstLostAt: 0, lastLostAt: 0, lastRestoredAt: 0, lastRebuildAt: 0, lastReason: '', lastExternal: '', external: 0, veilUntil: 0, veilNote: '' };
}

export function noteLost(s, now, reason = '') {
  s.lost++;
  s.phase = 'lost';
  if (!s.firstLostAt) s.firstLostAt = now;
  s.lastLostAt = now;
  s.lastReason = reason || 'onbekend (de browser gaf geen reden)';
  return s;
}

export function noteRestored(s, now) {
  // een herstel zonder voorafgaand verlies (dubbel bericht) telt niet
  if (s.phase !== 'lost') return s;
  s.restored++;
  s.phase = 'recovering';
  s.lastRestoredAt = now;
  s.lastRebuildAt = now;
  return s;
}

// De Electron-kant (GPU-proces weg, renderer weg) komt als aparte teller binnen.
export function noteExternal(s, text) {
  s.external++;
  s.lastExternal = String(text || '').slice(0, 120);
  return s;
}

// recovering wordt ok zodra de ramp af is
export function stepPhase(s, now) {
  if (s.phase === 'recovering' && now - s.lastRestoredAt >= RECOVER_MS) s.phase = 'ok';
  return s.phase;
}

const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// 1 = alles normaal; tijdens het herstel groeit de kijkafstand van RAMP_START naar 1.
export function rampAt(s, now) {
  if (s.phase === 'lost') return RAMP_START;
  if (s.phase !== 'recovering') return 1;
  return RAMP_START + (1 - RAMP_START) * smooth((now - s.lastRestoredAt) / RECOVER_MS);
}

// Dekking van de rustige sluier, 0..1.
export function veilAt(s, now) {
  if (s.phase === 'lost') return 1;
  if (s.phase === 'recovering') {
    const t = now - s.lastRestoredAt;
    return t <= HOLD_MS ? 1 : Math.max(0, 1 - (t - HOLD_MS) / FADE_OUT_MS);
  }
  return now < s.veilUntil ? 1 : 0;
}

// Een korte sluier voor een bewuste wissel (kwaliteit) midden in het spel.
export function noteVeil(s, now, ms, note = '') {
  s.veilUntil = Math.max(s.veilUntil, now + ms);
  s.veilNote = note;
  return s;
}

export function veilText(s, now) {
  if (s.phase === 'lost') return now - s.lastLostAt > STUCK_MS ? 'Het beeld komt niet vanzelf terug. Je voortgang is bewaard; sluit het spel en start het opnieuw.' : 'Het beeld is even weg. Een moment, Grunn komt terug.';
  if (s.phase === 'recovering') return 'Beeld hersteld. De omgeving bouwt zich weer op.';
  return s.veilNote || '';
}

export function sinceText(ms) {
  if (!(ms >= 0)) return 'nog niet';
  const sec = Math.round(ms / 1000);
  if (sec < 90) return `${sec} s geleden`;
  const min = Math.round(sec / 60);
  return min < 120 ? `${min} min geleden` : `${Math.round(min / 60)} u geleden`;
}

// Regels voor de technische info en het foutrapport (Nederlands).
export function describeGpu(s, now) {
  const rebuilt = s.lastRebuildAt ? sinceText(now - s.lastRebuildAt) : 'nog niet';
  return [
    `Beeldcontext verloren: ${s.lost}x, hersteld: ${s.restored}x`,
    `Laatste herbouw van de wereld: ${rebuilt}`,
    `Laatste reden: ${s.lastReason || 'geen verlies gezien'}`,
    `Stand nu: ${{ ok: 'normaal', lost: 'beeld weg', recovering: 'herstellend' }[s.phase] || s.phase}`,
    `Meldingen van de app (GPU- of renderproces): ${s.external}${s.lastExternal ? ', laatste: ' + s.lastExternal : ''}`,
  ];
}

// --- koppeling aan de pagina ---------------------------------------------

export const gpuState = createGpuState();
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// De ramp voor scene3d (kijkafstand): 1 buiten een herstel.
export const gpuRamp = () => rampAt(gpuState, clock());

let veilEl = null, textEl = null, rampTimer = 0;

function ensureVeil() {
  if (veilEl || typeof document === 'undefined') return;
  veilEl = document.createElement('div');
  veilEl.id = 'gpu-herstel';
  veilEl.setAttribute('role', 'status');
  veilEl.setAttribute('aria-live', 'polite');
  veilEl.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12vh;pointer-events:none;opacity:0;background:var(--ds-c-ink-inkt,#1d211f);transition:opacity 0.3s ease;';
  textEl = document.createElement('div');
  textEl.style.cssText = 'max-width:min(720px,90vw);padding:10px 18px;border-radius:var(--ds-r,8px);background:var(--ds-zeef-bg,#f3ead2);color:var(--ds-zeef-tx,#1d1b17);border:var(--ds-lijn-zeef,3px) solid var(--ds-c-ink-inkt,#1d1b17);font:800 22px var(--ds-font-kop-v3,"Arial Narrow"),Arial,sans-serif;text-align:center;';
  veilEl.appendChild(textEl);
  document.body.appendChild(veilEl);
}

function paint(now) {
  ensureVeil();
  if (!veilEl) return;
  const a = veilAt(gpuState, now);
  // de fade-out loopt in de overgang; de dekking volgt de toestand
  veilEl.style.transitionDuration = gpuState.phase === 'recovering' && a < 1 ? `${FADE_OUT_MS}ms` : '0.3s';
  veilEl.style.opacity = gpuState.phase === 'recovering' && a < 1 ? '0' : String(a);
  textEl.textContent = veilText(gpuState, now);
  textEl.style.display = a > 0 ? '' : 'none';
}

// Tijdens het herstel de kijkafstand een paar keer per seconde bijstellen (via
// refreshRenderScale) en de sluier laten verlopen.
function startRamp(hooks) {
  if (rampTimer) return;
  rampTimer = setInterval(() => {
    const now = clock();
    stepPhase(gpuState, now);
    try { hooks.ramp && hooks.ramp(); } catch (e) { /* geen beeld: volgende ronde */ }
    paint(now);
    if (gpuState.phase === 'ok' && now >= gpuState.veilUntil) { clearInterval(rampTimer); rampTimer = 0; paint(now); }
  }, 250);
}

// hooks.reset(): wat de GPU kwijt is en opnieuw getekend moet worden (omgevingskaart,
// schaduwkaart); hooks.ramp(): de kijkafstand opnieuw uitrekenen.
export function watchGpuRecovery(canvas, name, hooks = {}) {
  canvas.addEventListener('webglcontextlost', (e) => {
    const now = clock();
    noteLost(gpuState, now, e && e.statusMessage);
    if (hooks.note) hooks.note(`context verloren (${name})`);
    logError('error', `WebGL-context verloren (${name}); keer ${gpuState.lost}: ${gpuState.lastReason}`);
    try { hooks.ramp && hooks.ramp(); } catch (err) { /* ignore */ }
    paint(now);
    startRamp(hooks);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    const now = clock();
    noteRestored(gpuState, now);
    if (hooks.note) hooks.note(`context terug (${name})`);
    logError('warn', `WebGL-context hersteld (${name}); keer ${gpuState.restored}`);
    try { hooks.reset && hooks.reset(); hooks.ramp && hooks.ramp(); } catch (err) { logError('warn', `herstel na contextverlies: ${err && err.message}`); }
    paint(now);
    startRamp(hooks);
  });
  canvas.addEventListener('webglcontextcreationerror', (e) => {
    logError('error', `WebGL-context niet aangemaakt (${name})${e.statusMessage ? ': ' + e.statusMessage : ''}`);
  });
  // een app-melding (Electron: GPU-proces weg) telt mee en laat een korte sluier zien
  if (typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.onGpuEvent) {
    window.gdeDesktop.onGpuEvent((text) => { noteExternal(gpuState, text); logError('warn', `App-melding: ${text}`); });
  }
}

// Een bewuste kwaliteitswissel midden in het spel herbouwt de nabewerking en de
// schaduwkaart: bedek dat met dezelfde rustige sluier.
export function veilForQualityChange(hooks = {}) {
  if (typeof document === 'undefined' || !document.body.classList.contains('game-started')) return;
  const now = clock();
  noteVeil(gpuState, now, 700, 'Beeld wordt aangepast.');
  paint(now);
  startRamp(hooks);
}
