// GPU-status van het hoofdproces voor Technische info (game/js/gpudiag.js): wat Chromium over de videokaart
// weet, welke functies hardwarematig draaien en welke schermen er zijn. Alleen technische gegevens, geen
// gegevens van de speler; het spel toont ze en de speler kopieert ze zelf.
'use strict';

const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);
const AUX_KEYS = ['glRenderer', 'glVendor', 'glVersion', 'glImplementationParts', 'directComposition', 'supportsOverlays', 'hardwareSupportsOverlays', 'overlayCapabilities', 'subpixelFontRendering', 'initializationTime', 'sandboxed', 'optimus', 'amdSwitchable', 'passthroughCmdDecoder', 'oopRasterizationSupported'];

// pure: shapes the raw Electron answers into plain strings and numbers (scripts/gpudiag_test.mjs)
function shapeGpuInfo({ features, info, versions, argv, displays }) {
  const out = { versions: { electron: versions.electron, chrome: versions.chrome, node: versions.node }, features: features || {}, devices: [], aux: {}, switches: [], displays: [] };
  for (const d of (info && info.gpuDevice) || []) out.devices.push({ vendorId: d.vendorId, deviceId: d.deviceId, driverVendor: d.driverVendor, driverVersion: d.driverVersion, active: !!d.active });
  const aux = (info && info.auxAttributes) || {};
  for (const k of AUX_KEYS) if (aux[k] !== undefined && aux[k] !== null && aux[k] !== '') out.aux[k] = typeof aux[k] === 'object' ? JSON.stringify(aux[k]) : String(aux[k]);
  out.switches = (argv || []).filter((a) => /^--(use-angle|use-gl|ignore-gpu|disable-gpu|enable-gpu|force|in-process-gpu|no-sandbox|disable-renderer|disable-background|enable-features|disable-features|enable-unsafe|use-)/.test(a)).slice(0, 30);
  for (const d of displays || []) out.displays.push({ width: d.size && d.size.width, height: d.size && d.size.height, scale: d.scaleFactor, hz: d.displayFrequency, primary: !!d.primary });
  return out;
}

function registerGpuInfo({ ipcMain, app, screen, argv = process.argv }) {
  ipcMain.handle('gde:gpu-info', async () => {
    const features = (() => { try { return app.getGPUFeatureStatus(); } catch (e) { return {}; } })();
    let info = null;
    try { info = await withTimeout(app.getGPUInfo('complete'), 4000); } catch (e) { info = null; }
    if (!info) { try { info = await withTimeout(app.getGPUInfo('basic'), 2000); } catch (e) { info = null; } }
    let displays = [];
    try {
      const primary = screen.getPrimaryDisplay().id;
      displays = screen.getAllDisplays().map((d) => ({ size: d.size, scaleFactor: d.scaleFactor, displayFrequency: d.displayFrequency, primary: d.id === primary }));
    } catch (e) { displays = []; }
    return shapeGpuInfo({ features, info, versions: process.versions, argv, displays });
  });
}

module.exports = { registerGpuInfo, shapeGpuInfo };
