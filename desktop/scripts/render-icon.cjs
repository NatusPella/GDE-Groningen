// Renders the app icons from resources/icon.svg (the GDE wordmark on the green
// place-name sign, see game/js/logo.js) with real transparency. Run with:
//   cd desktop && npx electron scripts/render-icon.cjs
// Writes: resources/icon.png (1024), icon.ico (16-256), icon.icns, window-icon.png (256)
// and the web icons in ../game/img/icons/ (favicon.ico, favicon-32.png,
// apple-touch-icon.png, icon-192.png, icon-512.png).
// At 16-48 px the "GRONINGEN" plate is unreadable, so those sizes use a
// simplified variant (only the GDE mark, bigger, on the same tile).
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { packIco, packIcns } = require('./iconpack.cjs');

const RES = path.join(__dirname, '..', 'resources');
const WEB = path.join(__dirname, '..', '..', 'game', 'img', 'icons');
const SRC = fs.readFileSync(path.join(RES, 'icon.svg'), 'utf8');

// small-size variant: no plate, a larger mark, a slightly larger tile
const SMALL = SRC
  .replace(/<g filter="url\(#plate\)"[\s\S]*?<\/g>\s*/, '')
  .replace(/x="100" y="100" width="824" height="824" rx="186"/g, 'x="48" y="48" width="928" height="928" rx="200"')
  .replace(/<text x="512" y="600" font-size="460"([^>]*?)letter-spacing="8"/, '<text x="512" y="684" font-size="600"$1letter-spacing="0"');
// full-bleed square tile for the iOS home screen (iOS rounds it itself)
const FULL = SRC
  .replace(/x="100" y="100" width="824" height="824" rx="186"/g, 'x="0" y="0" width="1024" height="1024" rx="0"')
  .replace(/<filter id="drop"[\s\S]*?<\/filter>/, '')
  .replace(/ filter="url\(#drop\)"/, '')
  .replace(/transform="translate\(0 -22\)"/, 'transform="translate(0 -22)"');

app.disableHardwareAcceleration();
async function render(win, svg) {
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 800));
  return win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
}
const png = (img, n) => (img.getSize().width === n ? img : img.resize({ width: n, height: n, quality: 'best' })).toPNG();

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, useContentSize: true });
  win.webContents.setZoomFactor(1);
  const big = await render(win, SRC);
  const small = await render(win, SMALL);
  const full = await render(win, FULL);
  const pick = (n) => (n <= 48 ? small : big);

  const write = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); console.log('wrote', path.relative(process.cwd(), file), buf.length); };
  write(path.join(RES, 'icon.png'), png(big, 1024));
  write(path.join(RES, 'window-icon.png'), png(big, 256));
  write(path.join(RES, 'icon.ico'), packIco([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: png(pick(size), size) }))));
  write(path.join(RES, 'icon.icns'), packIcns([['ic11', 32], ['ic12', 64], ['ic07', 128], ['ic13', 256], ['ic08', 256], ['ic09', 512], ['ic14', 512], ['ic10', 1024]]
    .map(([type, size]) => ({ type, png: png(big, size) }))));
  write(path.join(WEB, 'favicon.ico'), packIco([16, 32, 48].map((size) => ({ size, png: png(small, size) }))));
  write(path.join(WEB, 'favicon-32.png'), png(small, 32));
  write(path.join(WEB, 'apple-touch-icon.png'), png(full, 180));
  write(path.join(WEB, 'icon-192.png'), png(big, 192));
  write(path.join(WEB, 'icon-512.png'), png(big, 512));
  app.quit();
});
