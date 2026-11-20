// Schrijft docs/beeld-20-11/iconen/galerij.html: alle betekenisnamen van icons.js op een
// papieren bon-kaart, in de maten 16/20/24/32. Statisch, geen wereld, geen netwerk.
// Gebruik: node scripts/ui/iconen_galerij.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_MAP } from '../../game/js/iconmap.js';
import { icoon } from '../../game/js/icons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cel = (n) => `<figure><div class="r">${icoon(n, { maat: 'xl' })}${icoon(n, { maat: 'l' })}${icoon(n, { maat: 'm' })}${icoon(n, { maat: 's' })}</div><figcaption>${n}</figcaption></figure>`;
const html = `<!doctype html><html lang="nl"><meta charset="utf-8"><title>Iconengalerij (Phosphor, ADR 0041)</title>
<style>
body { margin: 0; padding: 24px; background: #f2ede0; color: #1b1f1a; font: 14px/1.3 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; }
h1 { font-size: 28px; letter-spacing: 0.04em; text-transform: uppercase; margin: 0 0 12px; }
.g { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
figure { margin: 0; padding: 10px; background: #fffaf0; border: 2px solid #1b1f1a; }
.r { display: flex; gap: 10px; align-items: center; color: #1b1f1a; }
figcaption { margin-top: 6px; font-size: 13px; color: #3a4237; }
</style><h1>Iconen: ${Object.keys(ICON_MAP).length} betekenissen, maten 32, 24, 20 en 16 px</h1>
<div class="g">${Object.keys(ICON_MAP).map(cel).join('')}</div></html>`;
const out = path.join(root, 'docs/beeld-20-11/iconen/galerij.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out, html.length);
