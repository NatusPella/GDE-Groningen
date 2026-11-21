// Eén offline vergelijkpagina voor de wereldkleur (21-11, eigenaar-feedback: "Drukwerk kan ik nog niet goed beoordelen via deze screenshots").
// Bouwt index.html + grading.js + bronnen.js in een map buiten git. De pagina rekent de BENADERDE voor-en-na-beelden in de browser op 2560x1440
// met dezelfde wiskunde als het spel (worldpalette.js en worldgrade.js, ongewijzigd ingepakt), per scène in drie standen (Uit, Subtiel, Drukwerk),
// met een vergelijkingsslider, tabs, pijltjes tussen scènes en een knop 'Crop 100%' (drie uitsneden van de diepste schaduw op 1:1 pixels).
//   node scripts/world/wereldkleur_feedback.mjs [uitvoermap]   (standaard C:\Users\abuis\GIT\GDE-Groningen\.work\wereldkleur-feedback)
// Eerlijk: de bronnen zijn echte spelbeelden van 1280x720 (geen Electron deze ronde); 2560x1440 is een 2x vergroting, het raster en de korrel zijn
// wel op echte 2560-pixels berekend. Zie docs/WERELDKLEUR-21-11.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(hier, '../..');
const uit = process.argv[2] || 'C:/Users/abuis/GIT/GDE-Groningen/.work/wereldkleur-feedback';
fs.mkdirSync(uit, { recursive: true });

// ---- de speltaal-modules in één bestand: elke module in een eigen functiescope, imports als destructuring
const MODULES = [
  ['worldcolormode', 'game/js/worldcolormode.js'],
  ['worldpalette', 'game/js/worldpalette.js'],
  ['worldgrade', 'game/js/worldgrade.js'],
];
const STUBS = { 'devflags': { FLAGS: '{}' }, 'storagekeys': { KEYS: "{ settings: 'gde-settings' }" } };
let bundle = '// Gegenereerd door scripts/world/wereldkleur_feedback.mjs uit game/js/worldcolormode.js, worldpalette.js en worldgrade.js (ongewijzigd ingepakt).\n';
for (const [id, file] of MODULES) {
  let src = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const names = [...src.matchAll(/^export (?:const|function|let) (\w+)/gm)].map((m) => m[1]);
  let pre = '';
  src = src.replace(/^import \{([^}]*)\} from '\.\/(\w+)\.js';\n/gm, (_, list, mod) => {
    pre += STUBS[mod] ? `const {${list}} = ${JSON.stringify(Object.fromEntries(Object.entries(STUBS[mod]).map(([k, v]) => [k, '@@' + v]))).replace(/"@@([^"]*)"/g, '$1').replace(/\\"/g, '"')};\n` : `const {${list}} = M_${mod};\n`;
    return '';
  });
  src = src.replace(/^export /gm, '');
  bundle += `const M_${id} = (() => {\n${pre}${src}\nreturn { ${names.join(', ')} };\n})();\n`;
}
bundle += 'window.GRADEMOD = { ...M_worldpalette, ...M_worldgrade, ...M_worldcolormode };\n';
fs.writeFileSync(path.join(uit, 'grading.js'), bundle);

// ---- de bronbeelden (echte spelbeelden, oude palet) als data-URI: een canvas van een file:// afbeelding is "tainted" en niet uitleesbaar
const B = path.join(root, 'docs/beeld-21-11/wereldkleur');
const BRON = {
  markt: '1-grotemarkt-dag-m0.png', avond: '3-grotemarkt-avond-m0.png', regen: '5-binnenstad-regen-m0.png',
  ommeland: '6-ommeland-m0.png', nacht: '4-grotemarkt-nacht-m0.png',
};
let js = '// Gegenereerd: de bronbeelden (docs/beeld-21-11/wereldkleur/*-m0.png, 1280x720, oud palet) als data-URI.\nwindow.BRONNEN = {\n';
for (const [k, f] of Object.entries(BRON)) js += `  ${k}: 'data:image/png;base64,${fs.readFileSync(path.join(B, f)).toString('base64')}',\n`;
js += '};\n';
fs.writeFileSync(path.join(uit, 'bronnen.js'), js);

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Wereldkleur: Uit, Subtiel en Drukwerk (benadering)</title>
<style>
:root { --papier:#f3ead3; --inkt:#1d1b17; --bord:#0e6b3c; --geel:#f9c80e; }
* { box-sizing: border-box; }
body { margin:0; background:var(--inkt); color:var(--papier); font:16px/1.4 system-ui, sans-serif; }
header { padding:12px 18px; display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; background:#0f0e0c; border-bottom:2px solid var(--bord); position:sticky; top:0; z-index:5; }
h1 { font-size:18px; margin:0 12px 0 0; }
button { font:inherit; color:var(--papier); background:#2a2822; border:2px solid #4d483c; padding:6px 12px; cursor:pointer; border-radius:4px; }
button[aria-pressed=true] { background:var(--bord); border-color:var(--papier); }
button:hover { border-color:var(--geel); }
.grp { display:flex; gap:6px; align-items:center; }
.note { padding:8px 18px; font-size:14px; color:#cfc7b0; max-width:1400px; }
#stage { position:relative; margin:10px auto; width:min(98vw, 1700px); }
#stage canvas { display:block; width:100%; height:auto; }
#over { position:absolute; inset:0; }
#over canvas { position:absolute; inset:0; }
#grip { position:absolute; top:0; bottom:0; width:4px; background:var(--geel); cursor:ew-resize; z-index:3; }
#grip::after { content:'<>'; position:absolute; top:50%; left:-14px; width:32px; text-align:center; background:var(--geel); color:var(--inkt); font-weight:700; border-radius:10px; }
.tag { position:absolute; top:10px; background:rgba(0,0,0,.65); padding:3px 10px; border-radius:4px; z-index:4; font-size:14px; }
#crops { display:none; margin:10px auto; width:fit-content; max-width:100%; overflow:auto; }
#crops .row { display:flex; gap:10px; }
#crops figure { margin:0; }
#crops canvas { display:block; image-rendering:pixelated; width:480px; height:360px; }
#crops figcaption { padding:4px 0; font-size:14px; }
#status { color:var(--geel); min-height:1.4em; padding:0 18px; }
</style></head><body>
<header>
  <h1>Wereldkleur (benadering)</h1>
  <div class="grp"><button id="prev" title="Vorige scène (pijl links)">&larr;</button><b id="scenenaam"></b><button id="next" title="Volgende scène (pijl rechts)">&rarr;</button></div>
  <div class="grp" id="modes" role="group" aria-label="Stand">
    <button data-m="uit">Uit</button><button data-m="subtiel">Subtiel</button><button data-m="drukwerk">Drukwerk</button>
  </div>
  <div class="grp"><button id="cmp" aria-pressed="true" title="Links Uit, rechts de gekozen stand">Vergelijk met Uit (slider)</button>
  <button id="crop" aria-pressed="false" title="Drie uitsneden van de schaduw op 100%">Crop 100%</button></div>
</header>
<div class="note" id="opm"></div><div id="status"></div>
<div id="stage"><canvas id="base" width="2560" height="1440"></canvas>
  <div id="over"><canvas id="top" width="2560" height="1440"></canvas></div>
  <div id="grip"></div><span class="tag" id="tagL" style="left:10px">Uit</span><span class="tag" id="tagR" style="right:10px"></span></div>
<div id="crops"><div class="row" id="croprow"></div><div class="note" id="cropnote"></div></div>
<script src="grading.js"></script><script src="bronnen.js"></script>
<script>
'use strict';
const G = window.GRADEMOD;
const W = 2560, H = 1440;
const SCENES = [
  { id: 'markt', naam: 'Grote Markt, dag', e: 55, hour: 13, weer: {}, opm: 'Echt spelbeeld (1280x720, oud palet), middag helder.' },
  { id: 'avond', naam: 'Grote Markt, avond', e: 2, hour: 20.5, weer: {}, opm: 'Echt spelbeeld, avond (zon op 2 graden). Het raster staat hier op de helft; de korrel op bijna vol.' },
  { id: 'regen', naam: 'Binnenstad, regen', e: 40, hour: 14, weer: { overcast: 0.8, storm: 0.5 }, opm: 'Echt spelbeeld, regenbui: warm papier in plaats van koud grijs.' },
  { id: 'ommeland', naam: 'Ommeland (polder), dag', e: 45, hour: 15, weer: {}, opm: 'Echt spelbeeld, Ommeland bij Usquert.' },
  { id: 'ommeland', naam: 'Polder, gouden-uurprofiel', e: 8, hour: 19, weer: {}, opm: 'STAND-IN: hetzelfde Ommeland-beeld (middaglicht) met het gouden-uurprofiel van de grading erop. Het echte licht van een gouden uur (laag, oranje zon, lange schaduwen) zit er niet in; dat vraagt een echte render in de Electron-sweep.' },
  { id: 'nacht', naam: 'Nacht (stand-in voor de snelweg)', e: -12, hour: 0.5, weer: {}, opm: 'STAND-IN: er is geen snelweg-nachtbeeld beschikbaar; dit is de Grote Markt bij nacht met het nachtprofiel (geen raster, alleen een zachte korrel en tint).' },
];
const MODES = { uit: null, subtiel: 'subtiel', drukwerk: 'drukwerk' };
const cache = {}; // sceneindex -> { uit, subtiel, drukwerk } als canvassen
let si = 0, mode = 'drukwerk', cmp = true, crop = false, split = 0.5;

const $ = (s) => document.querySelector(s);
const imgs = {};
function load(id) {
  return imgs[id] || (imgs[id] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = window.BRONNEN[id]; }));
}
// memo voor het palet op de 24-bits kleur
function paletteCanvas(img, meng) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  if (meng <= 0) return c;
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, memo = new Int32Array(1 << 24).fill(-1);
  for (let i = 0; i < p.length; i += 4) {
    const h = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
    let o = memo[h];
    // de rol 'blauw' (glas, schaduwtint) blijft hier ongemoeid: op een beeld na het licht zijn lucht en schaduwen blauw, in het spel is de lucht geen materiaal
    if (o < 0) { o = G.wereldRol(h) === 'blauw' ? h : G.dsWereld(h, 'auto', meng); memo[h] = o; }
    p[i] = (o >> 16) & 255; p[i + 1] = (o >> 8) & 255; p[i + 2] = o & 255;
  }
  x.putImageData(d, 0, 0);
  return c;
}
function upscale(src) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, W, H);
  return c;
}
function gradeCanvas(c, p) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, W, H), a = d.data, px = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const i = (y * W + xx) * 4;
    const g = G.gradePixel([a[i], a[i + 1], a[i + 2]], p, xx, y);
    a[i] = g[0]; a[i + 1] = g[1]; a[i + 2] = g[2];
  }
  x.putImageData(d, 0, 0);
}
async function build(i) {
  if (cache[i]) return cache[i];
  const sc = SCENES[i], img = await load(sc.id), out = {};
  out.uit = upscale(paletteCanvas(img, 0));
  for (const m of ['subtiel', 'drukwerk']) {
    $('#status').textContent = 'Rekent ' + sc.naam + ' (' + m + ')...';
    await new Promise((r) => setTimeout(r, 20));
    const meng = G.WORLD_COLOR_STRENGTH[m].meng;
    const c = upscale(paletteCanvas(img, meng));
    const p = G.gradeParams({ stand: m, niveau: 'hoog', elevation: sc.e, hour: sc.hour, overcast: 0, mist: 0, storm: 0, rustig: false, kleurenblind: false, ...sc.weer }, {});
    gradeCanvas(c, p);
    out[m] = c;
  }
  $('#status').textContent = '';
  return (cache[i] = out);
}
function darkest(c) { // het donkerste venster van 480x360 (stap 120) voor de crops
  const x = c.getContext('2d'); let best = null, bl = 1e9;
  for (let y = 0; y + 360 <= H; y += 120) for (let xx = 0; xx + 480 <= W; xx += 120) {
    const d = x.getImageData(xx, y, 480, 360).data; let s = 0;
    for (let i = 0; i < d.length; i += 64) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const l = s / (d.length / 64);
    // te zwart (< 12) is een leeg vlak zonder inhoud; het donkerste vlak met enige structuur wint
    if (l >= 22 && l < bl) { bl = l; best = [xx, y]; }
  }
  return best || [0, 0];
}
async function show() {
  const sc = SCENES[si]; $('#scenenaam').textContent = (si + 1) + '/' + SCENES.length + ' ' + sc.naam; $('#opm').textContent = sc.opm + ' BENADERING: dezelfde wiskunde als het spel op een 2x vergroot spelbeeld; geen echte render.';
  const set = await build(si);
  document.querySelectorAll('#modes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
  $('#cmp').setAttribute('aria-pressed', String(cmp)); $('#crop').setAttribute('aria-pressed', String(crop));
  $('#stage').style.display = crop ? 'none' : 'block'; $('#crops').style.display = crop ? 'block' : 'none';
  if (crop) {
    const [cx, cy] = darkest(set.uit), row = $('#croprow'); row.innerHTML = '';
    for (const m of ['uit', 'subtiel', 'drukwerk']) {
      const f = document.createElement('figure'), cv = document.createElement('canvas'); cv.width = 480; cv.height = 360;
      cv.getContext('2d').drawImage(set[m], cx, cy, 480, 360, 0, 0, 480, 360);
      const cap = document.createElement('figcaption'); cap.textContent = m[0].toUpperCase() + m.slice(1);
      f.append(cv, cap); row.append(f);
    }
    $('#cropnote').textContent = 'Uitsneden van 480x360 op 100% (1 beeldpunt = 1 schermpunt van de 2560x1440), het donkerste deel van de scène (x ' + cx + ', y ' + cy + '). Zet je browser op 100% zoom. Raster en korrel zijn alleen in Drukwerk (en zwakker in Subtiel) te zien.';
    return;
  }
  $('#base').getContext('2d').drawImage(set[cmp ? 'uit' : mode], 0, 0);
  const top = $('#top'), tx = top.getContext('2d');
  tx.clearRect(0, 0, W, H); tx.drawImage(set[mode], 0, 0);
  $('#over').style.clipPath = cmp ? 'inset(0 0 0 ' + split * 100 + '%)' : 'none';
  $('#grip').style.display = cmp ? 'block' : 'none'; $('#grip').style.left = 'calc(' + split * 100 + '% - 2px)';
  $('#tagL').style.display = cmp ? 'block' : 'none'; $('#tagR').textContent = mode[0].toUpperCase() + mode.slice(1);
}
document.querySelectorAll('#modes button').forEach((b) => b.onclick = () => { mode = b.dataset.m; show(); });
$('#prev').onclick = () => { si = (si + SCENES.length - 1) % SCENES.length; show(); };
$('#next').onclick = () => { si = (si + 1) % SCENES.length; show(); };
$('#cmp').onclick = () => { cmp = !cmp; show(); };
$('#crop').onclick = () => { crop = !crop; show(); };
addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') $('#prev').click(); else if (e.key === 'ArrowRight') $('#next').click(); });
let drag = false;
const move = (e) => { const r = $('#stage').getBoundingClientRect(); split = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); $('#over').style.clipPath = 'inset(0 0 0 ' + split * 100 + '%)'; $('#grip').style.left = 'calc(' + split * 100 + '% - 2px)'; };
$('#grip').onpointerdown = (e) => { drag = true; e.target.setPointerCapture(e.pointerId); };
$('#grip').onpointermove = (e) => { if (drag) move(e); };
$('#grip').onpointerup = () => { drag = false; };
$('#stage').addEventListener('click', (e) => { if (cmp && e.target !== $('#grip')) move(e); });
if (location.hash === '#crop') crop = true;
show();
</script></body></html>
`;
fs.writeFileSync(path.join(uit, 'index.html'), html);
let totaal = 0;
for (const f of fs.readdirSync(uit)) totaal += fs.statSync(path.join(uit, f)).size;
console.log('geschreven in', uit, (totaal / 1048576).toFixed(1) + ' MB');
