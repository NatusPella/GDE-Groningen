// Technische beeldinfo (Ctrl+Shift+G): hoe vaak de beeldcontext verloren ging,
// wanneer de wereld voor het laatst opnieuw is opgebouwd en waarom. Dezelfde
// regels komen in het foutrapport, zodat een speler ons kan vertellen wat er
// gebeurde. Niets wordt verstuurd; de speler kopieert het zelf.
import { gpuState, describeGpu, veilForQualityChange } from './gpuherstel.js';
import { setReportExtra } from './errorlog.js';
import { onSettingsChange } from './settings.js';

const now = () => performance.now();
export const gpuDiagLines = () => describeGpu(gpuState, now());

let box = null, timer = 0;
function fill() {
  if (box) box.textContent = ['Technische beeldinfo (Ctrl+Shift+G sluit dit)', ...gpuDiagLines(), '', 'Zie je een flits of bouwt de wereld opnieuw op? Kopieer het Foutrapport bij Instellingen en stuur het mee.'].join('\n');
}
export function toggleGpuDiag() {
  if (box) { clearInterval(timer); box.remove(); box = null; return false; }
  box = document.createElement('pre');
  box.id = 'gpu-diag';
  box.style.cssText = 'position:fixed;left:12px;top:12px;z-index:95;margin:0;max-width:min(560px,92vw);white-space:pre-wrap;padding:10px 14px;border-radius:var(--ds-r,8px);background:var(--ds-zeef-bg,#f3ead2);color:var(--ds-zeef-tx,#1d1b17);border:var(--ds-lijn-zeef,3px) solid var(--ds-c-ink-inkt,#1d1b17);font:600 16px/1.35 Arial,sans-serif;pointer-events:none;';
  document.body.appendChild(box);
  fill();
  timer = setInterval(fill, 1000);
  return true;
}

export function initGpuDiag(hooks = {}) {
  setReportExtra(() => gpuDiagLines());
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && (e.code === 'KeyG' || e.key === 'G')) { e.preventDefault(); toggleGpuDiag(); }
  });
  // een kwaliteitswissel midden in het spel herbouwt de nabewerking: bedek dat zacht
  let last = null;
  onSettingsChange((st) => {
    if (last !== null && st.quality !== last) veilForQualityChange(hooks);
    last = st.quality;
  });
}
