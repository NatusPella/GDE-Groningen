// Kleurplaat en overzichtsplaat van de wereldkleuren (wereldkleur 21-11, game/js/worldpalette.js). Schrijft HTML; de PNG's maakt wereldkleur_plaat.cjs met Electron.
//   node scripts/world/wereldkleur_plaat.mjs kleurplaat <uitvoermap>
//   node scripts/world/wereldkleur_plaat.mjs overzicht <beeldmap> [--aanbeveling="tekst"]   (de beeldmap heeft <plek>-m0.png, -m25.png, -m50.png)
import fs from 'node:fs';
import path from 'node:path';
import { WERELD_KLEURPLAAT, WERELD_INKTEN, WERELD_ROLLEN, dsWereld, wereldRol, WERELD_DS_MENG } from '../../game/js/worldpalette.js';

const [modus, map, ...rest] = process.argv.slice(2);
if (!modus || !map) { console.error('gebruik: wereldkleur_plaat.mjs kleurplaat|overzicht <map>'); process.exit(2); }
fs.mkdirSync(map, { recursive: true });
const hx = (n) => '#' + n.toString(16).padStart(6, '0');
const lum = (n) => 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CSS = `body{margin:0;background:#f3ead3;color:#1d1b17;font:15px/1.35 'Atkinson Hyperlegible',Arial,sans-serif}h1{font:900 34px 'Barlow Condensed','Arial Narrow',Arial,sans-serif;margin:0;padding:22px 28px 6px;text-transform:uppercase;letter-spacing:.02em}
.sub{padding:0 28px 14px;color:#4d483c;max-width:1500px}h2{font:700 22px 'Barlow Condensed','Arial Narrow',Arial,sans-serif;margin:0;padding:14px 28px 6px;color:#0e6b3c;text-transform:uppercase}`;

if (modus === 'kleurplaat') {
  const MENGEN = [0, 0.25, 0.5, 1];
  let h = `<!doctype html><meta charset="utf-8"><title>Wereldkleuren 21-11</title><style>${CSS}
.rij{display:flex;gap:10px;padding:0 28px 6px;align-items:stretch}.naam{width:150px;font-weight:700;align-self:center}.vl{width:118px;height:54px;border:2px solid #1d1b17;display:flex;flex-direction:column;justify-content:flex-end;font:11px/1.2 monospace;color:#fff;padding:2px 4px;box-sizing:border-box}
.kop{display:flex;gap:10px;padding:0 28px;font:700 12px monospace}.kop span{width:118px}.kop span:first-child{width:150px}.ink{display:inline-block;width:90px;height:40px;border:2px solid #1d1b17;margin:0 8px 8px 0;font:11px monospace;color:#fff;padding:2px 4px;box-sizing:border-box}</style>
<h1>Wereldkleuren: oud en nieuw per categorie</h1>
<div class="sub">Per kleur vier vlakken: het oude palet (meng 0) en de wereldkleur bij meng 0,25, 0,5 en 1 (worldpalette.js). De standaard is ${WERELD_DS_MENG}. Onder elk vlak de hex en de afgeleide rol. De helderheid blijft gelijk voor alles behalve geel, roze en wit, dus het contrast van wegen en stoepen verandert niet.</div>
<h2>De inkten van het designsysteem en de wereld</h2><div style="padding:0 28px 8px">${Object.entries(WERELD_INKTEN).map(([k, v]) => `<span class="ink" style="background:${hx(v)};color:${lum(v) > 150 ? '#1d1b17' : '#fff'}">${k}<br>${hx(v)}</span>`).join('')}</div>`;
  h += `<div class="sub">Rollen: ${Object.entries(WERELD_ROLLEN).map(([k, v]) => `${k} (naar ${v.doel}, ${v.w}${v.luma ? ', helderheid behouden' : ''})`).join('; ')}.</div>`;
  for (const [cat, v] of Object.entries(WERELD_KLEURPLAAT)) {
    h += `<h2>${esc(cat)}</h2><div class="kop"><span></span>${MENGEN.map((m) => `<span>${m === 0 ? 'oud (0)' : m}</span>`).join('')}</div>`;
    for (const [naam, hex] of Object.entries(v.kleuren)) {
      h += `<div class="rij"><div class="naam">${esc(naam)} <small>${wereldRol(hex) || 'blijft'}</small></div>${MENGEN.map((m) => { const c = dsWereld(hex, 'auto', m); return `<div class="vl" style="background:${hx(c)};color:${lum(c) > 150 ? '#1d1b17' : '#fff'}">${hx(c)}</div>`; }).join('')}</div>`;
    }
  }
  fs.writeFileSync(path.join(map, 'kleurplaat.html'), h);
  console.log('kleurplaat.html geschreven in', map);
} else if (modus === 'overzicht') {
  const aanb = (rest.find((a) => a.startsWith('--aanbeveling=')) || '').slice(14);
  const plekken = JSON.parse(fs.readFileSync(path.join(map, 'plekken.json'), 'utf8')); // [{ naam, label }]
  const kol = [['m0', 'VOOR: oud palet (0)'], ['m25', 'NA: meng 0,25'], ['m50', 'NA: meng 0,5']];
  let h = `<!doctype html><meta charset="utf-8"><style>${CSS}
.plek{padding:0 28px 14px}.plek b{display:block;font:700 20px 'Barlow Condensed','Arial Narrow',Arial,sans-serif;text-transform:uppercase;padding:6px 0 4px}.r{display:flex;gap:8px}.r div{flex:1;position:relative;overflow:hidden;border:2px solid #1d1b17}.r img{width:100%;display:block;margin-bottom:-4.6%;clip-path:inset(0 0 9% 0)}.r span{position:absolute;left:0;top:0;background:#1d1b17;color:#f3ead3;font:700 13px monospace;padding:2px 7px}
.aanb{margin:6px 28px 18px;padding:12px 16px;border:3px solid #0e6b3c;background:#fbf4de;max-width:1700px;font-size:17px}</style>
<h1>Wereldkleur: voor en na (21-11)</h1><div class="sub">Zelfde plek, zelfde tijd en weer, 1280x720 uit het echte spel; links het oude palet, in het midden en rechts de wereldkleur van worldpalette.js (subtiel richting het designsysteem).</div>
<div class="aanb"><b>Aanbeveling:</b> ${esc(aanb || '(volgt)')}</div>`;
  for (const q of plekken) h += `<div class="plek"><b>${esc(q.label)}</b><div class="r">${kol.map(([k, t]) => `<div><span>${t}</span><img src="${q.naam}-${k}.png"></div>`).join('')}</div></div>`;
  fs.writeFileSync(path.join(map, 'overzicht.html'), h);
  console.log('overzicht.html geschreven in', map);
}
