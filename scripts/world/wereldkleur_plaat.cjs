// Zet een HTML-bladzijde om in een PNG met Electron (offscreen, geen spelvenster): electron wereldkleur_plaat.cjs <in.html> <uit.png> <breedte>
// (wereldkleur 21-11). Alleen voor de kleurplaat en het overzicht van docs/beeld-21-11/wereldkleur; raakt geen profiel van de speler (eigen tijdelijke map).
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'gde-plaat-')));
const [inHtml, uitPng, breedte] = process.argv.slice(-3);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: Number(breedte) || 1900, height: 900, webPreferences: { offscreen: false, sandbox: true } });
  await win.loadFile(path.resolve(inHtml));
  await new Promise((r) => setTimeout(r, 1500));
  const h = await win.webContents.executeJavaScript('Math.ceil(document.documentElement.scrollHeight)');
  win.setContentSize(Number(breedte) || 1900, Math.min(h, 16000));
  await new Promise((r) => setTimeout(r, 800));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.resolve(uitPng), img.toPNG());
  console.log('geschreven', uitPng, img.getSize());
  app.quit();
});
