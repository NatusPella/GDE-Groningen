// Beeldherstel naast de technische info (gpudiag.js, Ctrl+Shift+G): hoe vaak de beeldcontext verloren ging, wanneer
// de wereld voor het laatst opnieuw is opgebouwd en waarom. Dezelfde regels komen in het foutrapport en in het blok
// Technische info, zodat een speler ons kan vertellen wat er gebeurde. Niets wordt verstuurd; de speler kopieert het zelf.
// Geen eigen venster of toets: gpudiag.js is de enige plek die de speler opent.
import { gpuState, describeGpu, veilForQualityChange } from './gpuherstel.js';
import { setReportExtra } from './errorlog.js';
import { onSettingsChange } from './settings.js';

export const gpuDiagLines = () => describeGpu(gpuState, performance.now());

export function initGpuHerstelInfo(hooks = {}) {
  setReportExtra(() => gpuDiagLines());
  // een kwaliteitswissel midden in het spel herbouwt de nabewerking: bedek dat zacht
  let last = null;
  onSettingsChange((st) => {
    if (last !== null && st.quality !== last) veilForQualityChange(hooks);
    last = st.quality;
  });
}
