// Test van de leidingen van de gerenderde cutscene-controle (laag 3) zonder Electron: synthetische PNG's en records gaan door
// verwerk() (pixelmeting, vondsten, measure.json, contactbladen) en parseRecords() leest de [cs-rec]-regels van de pagina.
// De pagina zelf (scripts/ui/cutscene_render.page.js) draait alleen in Electron; hier wordt alleen de syntaxis ervan gecontroleerd.
//   node scripts/cutscene_render_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encodePng } from './lib/pngcheck.mjs';
import { verwerk, parseRecords } from './ui/cutscene_render.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };

const W = 160, H = 90;
const effen = (l) => { const b = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { b[i * 4] = b[i * 4 + 1] = b[i * 4 + 2] = l; b[i * 4 + 3] = 255; } return b; };
const verloop = () => { const b = new Uint8Array(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; b[i] = b[i + 1] = b[i + 2] = (x * 255) / W; b[i + 3] = 255; } return b; };
const png = (rgba) => Buffer.from(encodePng(W, H, rgba));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-csr-'));
try {
  const frames = path.join(tmp, 'run');
  const out = path.join(tmp, 'uit');
  fs.mkdirSync(frames, { recursive: true });
  const cam = { position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 6, y: 0, z: 1.4 }, fov: 40 };
  const rec = (n2, phase, t, extra = {}) => ({ cutscene: 'T.1', shot: n2, n: n2, phase, t, file: `T.1__s0${n2}${phase}`, camera: cam, speaker: null, subtitle: null, hud: [], near: { hits: 0, minD: 9 }, clip: false, ...extra });
  const records = [rec(0, 'b', 0.1), rec(0, 'm', 1.5), rec(0, 'e', 2.9), rec(1, 'b', 3.1, { clip: true }), rec(1, 'm', 4.5), rec(1, 'e', 5.9)];
  // shot 0: een verloop (gezond); shot 1: zwart beeld
  for (const r of records) fs.writeFileSync(path.join(frames, `shots-${r.file}.png`), png(r.shot === 0 ? verloop() : effen(0)));
  const rapport = verwerk({ 'T.1': records }, { frameDir: frames, outDir: out, w: W, h: H });
  const m = JSON.parse(fs.readFileSync(path.join(out, 'T.1', 'measure.json'), 'utf8'));
  ok(rapport.totaal.cutscenes === 1 && rapport.totaal.frames === 6, 'verwerk telt cutscenes en frames');
  ok(fs.existsSync(path.join(out, 'T.1', 's00b.png')) && fs.existsSync(path.join(out, 'T.1', 's01e.png')), 'de frames staan gesorteerd per cutscene');
  ok(m.vondsten.some((v) => v.regel === 'CS-R01' && v.ernst === 'blokkerend'), 'zwarte frames geven R01');
  ok(m.vondsten.some((v) => v.regel === 'CS-R02' && v.ernst === 'blokkerend'), 'een camera in de geometrie geeft R02');
  ok(!m.vondsten.some((v) => v.t < 3 && v.regel === 'CS-R01'), 'het gezonde shot geeft geen R01');
  ok(m.records.every((r) => r.pixels), 'elk record heeft pixelmetingen');
  ok(m.bladen.length >= 1 && fs.existsSync(path.join(out, 'T.1', 'vision', 'contact', 'blad-01.png')), 'het contactblad van de cutscene is gemaakt');
  ok(fs.existsSync(path.join(out, 'render-report.json')), 'het globale rapport is geschreven');
  // parseRecords
  const regels = `ruis\n[cs-rec] T.1 ${JSON.stringify(records[0])}\n[cs-rec] T.1 {kapot\n[cs-rec] T.2 ${JSON.stringify(records[1])}\n[capture] x`;
  const p = parseRecords(regels);
  ok(p['T.1'].length === 1 && p['T.2'].length === 1, 'parseRecords leest de pagina-uitvoer en slaat kapotte regels over');
  // de pagina compileert als asynchrone functie
  const pagina = fs.readFileSync(new URL('./ui/cutscene_render.page.js', import.meta.url), 'utf8');
  try { new Function(`return (async () => { ${pagina}\n})`); ok(true, 'de pagina heeft geldige syntaxis'); } catch (e) { ok(false, 'de pagina heeft geldige syntaxis', e.message); }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `${fails} van ${n} cutscene_render-controles falen` : `cutscene_render_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
