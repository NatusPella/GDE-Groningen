// Contactbladen voor de visuele releasegate: uit een lijst PNG-paden een of meer 3x3-bladen maken,
// zodat een beoordelaar met weinig tokens alle screenshots van een batch kan bekijken. Geen ffmpeg
// en geen nieuwe afhankelijkheid: decoderen, nearest-neighbour verkleinen en weer schrijven met
// scripts/lib/pngcheck.mjs.
//   node scripts/release/contactsheet.mjs <map[,map...]> [--out=<map>] [--tegel=480]
// De pure functies (planSheets, buildContactSheet, scaleNearest) doen geen I/O; writeContactSheets
// leest en schrijft en is de enige laag met bestanden. De visuele gate gebruikt dezelfde functies.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from '../lib/pngcheck.mjs';

export const COLS = 3;
export const ROWS = 3;
export const TILE_WIDTH = 480;
export const TILE_HEIGHT = 270; // 16:9, de vorm van de QA-screenshots
export const BACKGROUND = [12, 20, 14]; // #0c140e, het donkerste chroom uit DESIGN_SYSTEM.md
export const DANGER = [217, 63, 63]; // #d93f3f: tegel voor een bestand dat niet te decoderen is
export const PER_SHEET = COLS * ROWS;

// Naam met / als scheiding, ook op Windows: sleutels en paden in rapporten blijven overdraagbaar.
export const toPosix = (p) => String(p).split(path.sep).join('/');

// Nearest-neighbour verkleinen (of vergroten) naar tw x th. Geen smoothing: een contactblad is
// een overzicht, geen eindbeeld; scherpe blokjes zijn eerlijk en snel.
export function scaleNearest(image, tw, th) {
  if (!image || !image.w || !image.h) throw new Error('scaleNearest: ongeldig beeld');
  const w = Math.max(1, Math.round(tw)), h = Math.max(1, Math.round(th));
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(image.h - 1, Math.floor(((y + 0.5) * image.h) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(image.w - 1, Math.floor(((x + 0.5) * image.w) / w));
      const s = (sy * image.w + sx) * 4, d = (y * w + x) * 4;
      out[d] = image.rgba[s];
      out[d + 1] = image.rgba[s + 1];
      out[d + 2] = image.rgba[s + 2];
      out[d + 3] = 255;
    }
  }
  return out;
}

// Eén blad van cols x rows tegels. Elk beeld past binnen zijn tegel (aspect bewaard, gecentreerd)
// op de achtergrondkleur. Pure functie: krijgt al gedecodeerde beelden, schrijft niets.
export function buildContactSheet(images, {
  cols = COLS,
  rows = ROWS,
  tileWidth = TILE_WIDTH,
  tileHeight = TILE_HEIGHT,
  background = BACKGROUND,
} = {}) {
  if (!Array.isArray(images)) throw new Error('buildContactSheet: images moet een lijst zijn');
  const w = cols * tileWidth, h = rows * tileHeight;
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = background[0];
    rgba[i * 4 + 1] = background[1];
    rgba[i * 4 + 2] = background[2];
    rgba[i * 4 + 3] = 255;
  }
  const tiles = [];
  images.slice(0, cols * rows).forEach((image, index) => {
    const fit = Math.min(tileWidth / image.w, tileHeight / image.h);
    const tw = Math.max(1, Math.round(image.w * fit)), th = Math.max(1, Math.round(image.h * fit));
    const scaled = scaleNearest(image, tw, th);
    const ox = (index % cols) * tileWidth + Math.floor((tileWidth - tw) / 2);
    const oy = Math.floor(index / cols) * tileHeight + Math.floor((tileHeight - th) / 2);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const s = (y * tw + x) * 4, d = ((oy + y) * w + ox + x) * 4;
        rgba[d] = scaled[s];
        rgba[d + 1] = scaled[s + 1];
        rgba[d + 2] = scaled[s + 2];
        rgba[d + 3] = 255;
      }
    }
    tiles.push({ index, x: ox, y: oy, w: tw, h: th });
  });
  return { w, h, rgba, tiles };
}

// Vaste, deterministische indeling: 9 paden per blad, in de gegeven (gesorteerde) volgorde.
export function planSheets(items, perSheet = PER_SHEET) {
  if (!Array.isArray(items)) throw new Error('planSheets: items moet een lijst zijn');
  const size = Number.isFinite(perSheet) && perSheet > 0 ? Math.floor(perSheet) : PER_SHEET;
  const sheets = [];
  for (let i = 0; i < items.length; i += size) sheets.push(items.slice(i, i + size));
  return sheets;
}

// Normaliseert een lijst paden of {pad,label}-objecten naar {pad,label}.
export function normalizeItems(items) {
  return (items || []).map((item) => {
    if (typeof item === 'string') return { pad: item, label: path.basename(item) };
    const pad = item.pad || item.bestand || '';
    return { pad, label: item.label || item.sleutel || path.basename(pad) };
  });
}

// I/O-laag: leest de PNG's, maakt de bladen en schrijft <out>/vision/contact/blad-NN.png plus
// bladen.txt. Een bestand dat niet te decoderen is wordt een effen rode tegel (het gevaarteken uit
// DESIGN_SYSTEM.md) en staat als fout in de lijst; de tegelvolgorde blijft daardoor gelijk aan de
// lijst met paden, zodat de reviewer tegel N aan beeld N kan koppelen.
export function writeContactSheets(items, outDir, {
  cols = COLS,
  rows = ROWS,
  tileWidth = TILE_WIDTH,
  tileHeight = TILE_HEIGHT,
  background = BACKGROUND,
  errorColor = DANGER,
  perSheet = cols * rows,
} = {}) {
  const normalized = normalizeItems(items);
  const dir = path.join(outDir, 'vision', 'contact');
  fs.mkdirSync(dir, { recursive: true });
  const chunks = planSheets(normalized, perSheet);
  const sheets = [];
  const fouten = [];
  chunks.forEach((chunk, number) => {
    const decoded = [];
    const foutenHier = [];
    for (const item of chunk) {
      try {
        decoded.push(decodePng(fs.readFileSync(item.pad)));
      } catch (e) {
        fouten.push({ label: item.label, pad: item.pad, fout: e.message });
        foutenHier.push(item.label);
        decoded.push({ w: tileWidth, h: tileHeight, rgba: solidRgba(tileWidth, tileHeight, errorColor) });
      }
    }
    const sheet = buildContactSheet(decoded, { cols, rows, tileWidth, tileHeight, background });
    const naam = `blad-${String(number + 1).padStart(2, '0')}.png`;
    const bestand = path.join(dir, naam);
    fs.writeFileSync(bestand, encodePng(sheet.w, sheet.h, sheet.rgba));
    sheets.push({
      naam,
      bestand,
      paden: chunk.map((item) => item.pad),
      labels: chunk.map((item) => item.label),
      fouten: foutenHier,
      tegels: sheet.tiles.length,
    });
  });
  const regels = sheets.map((sheet) => `${sheet.naam}: ${sheet.labels.join(', ')}`);
  for (const fout of fouten) regels.push(`! ${fout.label}: onleesbaar (${fout.fout})`);
  const tekst = regels.length ? regels.join('\n') + '\n' : '';
  fs.writeFileSync(path.join(dir, 'bladen.txt'), tekst);
  return { dir, sheets, tekst, fouten };
}

function solidRgba(w, h, [r, g, b]) {
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

// ---- CLI (los van de gate, om zelf bladen van een bestaande map te maken) ----
function scanPngs(dir, out, skipped) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) { scanPngs(abs, out, skipped); continue; }
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('_')) { skipped.push(abs); continue; }
    if (/\.png$/i.test(entry.name)) out.push(abs);
  }
  return out;
}

export function runContactSheetCli(argv = process.argv.slice(2)) {
  const value = (name, fallback) => {
    const hit = argv.find((v) => v === `--${name}` || v.startsWith(`--${name}=`));
    if (!hit) return fallback;
    const eq = hit.indexOf('=');
    return eq === -1 ? '1' : hit.slice(eq + 1);
  };
  const dirs = argv.filter((v) => !v.startsWith('--')).map((v) => path.resolve(v));
  if (!dirs.length) {
    console.error('gebruik: node scripts/release/contactsheet.mjs <map[,map...]> [--out=<map>] [--tegel=480]');
    return 2;
  }
  let paden = [];
  const skipped = [];
  try {
    for (const dir of dirs) {
      if (!fs.statSync(dir).isDirectory()) throw new Error(`geen map: ${dir}`);
      scanPngs(dir, paden, skipped);
    }
  } catch (e) {
    console.error('contactsheet: ' + e.message);
    return 2;
  }
  paden = paden.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (!paden.length) {
    console.error('contactsheet: geen beelden gevonden');
    return 3;
  }
  const out = path.resolve(value('out', path.join(os.tmpdir(), 'gde-contactbladen')));
  const tileWidth = Number(value('tegel', TILE_WIDTH)) || TILE_WIDTH;
  const tileHeight = Math.round((tileWidth * TILE_HEIGHT) / TILE_WIDTH);
  const result = writeContactSheets(paden, out, { tileWidth, tileHeight });
  console.log(`${paden.length} beelden op ${result.sheets.length} bladen in ${result.dir}${skipped.length ? ` (${skipped.length} overgeslagen)` : ''}`);
  if (result.fouten.length) console.log(`${result.fouten.length} onleesbaar; zie bladen.txt`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runContactSheetCli(process.argv.slice(2));
}
