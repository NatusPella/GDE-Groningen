// Pure kant van de weer-, dag- en nachtcontrole (#19, #194, #195): de matrix van tijdstippen en weer, en de
// beeldcontroles op screenshots (zwart of overbelicht, banding in de lucht, flikker, hoogfrequente ruis
// van natte wegen, warme lichten op het juiste tijdstip, sterren, kleurverloop) plus een contactblad-PNG.
// Geen Electron, geen netwerk; scripts/weernacht_test.mjs test dit. decodePng komt uit scripts/bot/analysis.mjs.
import zlib from 'node:zlib';

// uur (zonnetijd in het spel) per tijdstip; de zon staat in de zomer op 53 graden noorderbreedte
export const TIJDEN = [
  { id: 'zonsopgang', hour: 5.3 }, { id: 'ochtend', hour: 8.5 }, { id: 'middag', hour: 13 }, { id: 'avond', hour: 19.5 },
  { id: 'schemering', hour: 21.8 }, { id: 'nacht', hour: 0.5 }, { id: 'diepe-nacht', hour: 2.5 },
];
// kind uit weatherstate.js; 'regen' bestaat daar niet apart: motregen en regenbui
export const WEER = [
  { id: 'helder', kind: 'helder', rain: 0, overcast: 0, mist: 0 }, { id: 'bewolkt', kind: 'bewolkt', rain: 0, overcast: 0.4, mist: 0 },
  { id: 'motregen', kind: 'motregen', rain: 0.3, overcast: 0.55, mist: 0 }, { id: 'regenbui', kind: 'regenbui', rain: 0.6, overcast: 0.75, mist: 0 },
  { id: 'onweer', kind: 'onweer', rain: 0.85, overcast: 0.95, mist: 0 }, { id: 'mist', kind: 'mist', rain: 0, overcast: 0.3, mist: 0.6 },
];
// De matrix: helder op alle tijdstippen, en elk weer op middag, avond en nacht.
export function matrix({ tijden = TIJDEN, weer = WEER } = {}) {
  const out = [];
  const full = new Set(['middag', 'avond', 'nacht']);
  for (const t of tijden) for (const w of weer) if (w.id === 'helder' || full.has(t.id)) out.push({ tijd: t.id, hour: t.hour, weer: w.id, ...w });
  return out;
}
export const shotName = (plek, c) => `wn-${plek}-${c.tijd}-${c.weer}`;

// --- beeldcontroles ---------------------------------------------------------------------------------
const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

// Gemiddelde helderheid, aandeel zwart en overbelicht over het hele beeld.
export function exposure(img) {
  const { w, h, bpp, data } = img;
  let sum = 0, black = 0, white = 0, n = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const l = luma(data, (y * w + x) * bpp); sum += l; n++; if (l < 6) black++; else if (l > 250) white++; }
  return { mean: sum / n, blackFrac: black / n, whiteFrac: white / n };
}

// Banding in de lucht: in de bovenste 30% van een paar kolommen komen lange stukken met precies dezelfde helderheid
// voor, met daartussen sprongen van minstens 2 niveaus (een vloeiend verloop zou om de paar pixels 1 niveau stappen).
export function skyBanding(img, { cols = 7, band = 0.3 } = {}) {
  const { w, h, bpp, data } = img;
  const rows = Math.floor(h * band);
  let bands = 0, jumps = 0, cells = 0;
  for (let c = 0; c < cols; c++) {
    const x = Math.floor(((c + 0.5) / cols) * w);
    let run = 1, prev = Math.round(luma(data, x * bpp));
    for (let y = 1; y < rows; y++) {
      const l = Math.round(luma(data, (y * w + x) * bpp));
      if (l === prev) run++;
      else { if (Math.abs(l - prev) >= 2 && run >= 8) bands++; if (Math.abs(l - prev) >= 2) jumps++; run = 1; prev = l; }
      cells++;
    }
  }
  return { bands, jumps, perThousand: Math.round((bands / Math.max(1, cells)) * 10000) / 10 };
}

// Gemiddelde absolute Laplace op de onderste helft: hoge waarden = veel hoogfrequente ruis (z-fighting van natte wegen).
export function highFreq(img) {
  const { w, h, bpp, data } = img;
  let sum = 0, n = 0;
  for (let y = Math.floor(h * 0.55) + 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
    const i = (y * w + x) * bpp;
    const l = luma(data, i);
    sum += Math.abs(4 * l - luma(data, i - bpp) - luma(data, i + bpp) - luma(data, i - w * bpp) - luma(data, i + w * bpp));
    n++;
  }
  return sum / n;
}

// Warme felle pixels (ramen, lantaarns, koplampen) in de onderste 70%, als aandeel.
export function warmLights(img) {
  const { w, h, bpp, data } = img;
  let hit = 0, n = 0;
  for (let y = Math.floor(h * 0.3); y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * bpp, r = data[i], g = data[i + 1], b = data[i + 2];
    n++;
    if (r > 215 && g > 150 && b < 150 && r - b > 70) hit++;
  }
  return hit / n;
}

// Sterren: losse felle puntjes in de bovenste 30% tegen een donkere omgeving; maan: de grootste felle vlek daar.
export function skyObjects(img) {
  const { w, h, bpp, data } = img;
  const rows = Math.floor(h * 0.3);
  let stars = 0, flux = 0, bright = 0, n = 0;
  for (let y = 2; y < rows - 2; y++) for (let x = 2; x < w - 2; x++) {
    const l = luma(data, (y * w + x) * bpp);
    n++;
    if (l > 200) bright++;
    if (l > 150) {
      const around = (luma(data, (y * w + x - 2) * bpp) + luma(data, (y * w + x + 2) * bpp) + luma(data, ((y - 2) * w + x) * bpp) + luma(data, ((y + 2) * w + x) * bpp)) / 4;
      if (around < 70) { stars++; flux += l; }
    }
  }
  return { stars, flux: Math.round(flux / 100), brightFrac: bright / n };
}

// Gemiddelde kleur van een horizontale band (fracties van de hoogte) als [r, g, b], voor het kleurverloop.
export function bandColor(img, y0, y1) {
  const { w, h, bpp, data } = img;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.floor(h * y0); y < Math.floor(h * y1); y += 2) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * bpp; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export function measure(img) {
  const e = exposure(img), s = skyObjects(img);
  return { ...e, banding: skyBanding(img).perThousand, highFreq: Math.round(highFreq(img) * 10) / 10, warm: Math.round(warmLights(img) * 100000) / 1000, stars: s.stars, starFlux: s.flux, skyBright: Math.round(s.brightFrac * 1000) / 10, zenith: bandColor(img, 0, 0.1), horizon: bandColor(img, 0.3, 0.4) };
}

// Verschil in gemiddelde helderheid tussen opeenvolgende beelden van dezelfde plek (flikker bij vaste instellingen).
export const flicker = (means) => Math.max(0, ...means.slice(1).map((m, i) => Math.abs(m - means[i])));

// --- oordeel ------------------------------------------------------------------------------------------------
// Verwachting per tijdstip: of de nachtverlichting aan hoort, en of er sterren horen te zijn.
const DONKER = new Set(['avond-late', 'schemering', 'nacht', 'diepe-nacht']);
export function judge(c, m, ref = null, plekSoort = 'stad') {
  const f = [];
  if (m.blackFrac > 0.9) f.push('zwart beeld');
  if (m.whiteFrac > 0.35) f.push('overbelicht');
  if (m.banding > 12) f.push(`banding in de lucht (${m.banding}/1000)`);
  const nachtelijk = DONKER.has(c.tijd);
  if (plekSoort === 'stad' && nachtelijk && m.warm < 0.02 && c.weer !== 'mist') f.push('geen verlichting zichtbaar op een nachtelijke stadsplek');
  if (['middag', 'ochtend'].includes(c.tijd) && m.warm > 0.8) f.push(`veel warm licht overdag (${m.warm}%)`);
  if ((c.tijd === 'nacht' || c.tijd === 'diepe-nacht') && c.weer === 'helder' && m.stars < 5) f.push('geen sterren bij heldere nacht');
  if (['nacht', 'diepe-nacht'].includes(c.tijd) && ['bewolkt', 'motregen', 'regenbui', 'onweer', 'mist'].includes(c.weer) && ref && ref.starFlux > 20 && m.starFlux > 0.6 * ref.starFlux) f.push(`sterren even helder als bij helder weer (${m.starFlux} tegen ${ref.starFlux}) onder ${c.weer}`);
  if (['middag'].includes(c.tijd) && m.mean < 55 && c.weer === 'helder') f.push(`te donker voor middag helder (gem. ${Math.round(m.mean)})`);
  if (['nacht', 'diepe-nacht'].includes(c.tijd) && m.mean > 110 && c.weer === 'helder') f.push(`te licht voor een nacht (gem. ${Math.round(m.mean)})`);
  if (ref && ['motregen', 'regenbui', 'onweer'].includes(c.weer) && m.highFreq / Math.max(ref.highFreq, 1) > 1.8 && m.highFreq - ref.highFreq > 4) f.push(`veel meer ruis in de onderste helft dan droog (${m.highFreq} tegen ${ref.highFreq}): z-fighting van natte weg of plassen?`);
  return f;
}

// --- contactblad (PNG, 8 bit RGB) --------------------------------------------------------------------------------
export function downscale(img, tw, th) {
  const { w, h, bpp, data } = img;
  const out = Buffer.alloc(tw * th * 3);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const x0 = Math.floor((tx * w) / tw), x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * w) / tw)), y0 = Math.floor((ty * h) / th), y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h) / th));
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * bpp; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    const o = (ty * tw + tx) * 3;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
  }
  return out;
}
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
export function encodePng(w, h, rgb) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// cells: rijen van kolommen met { rgb (tw*th*3) of null }; leeg = grijs
export function contactSheet(cells, tw, th, gap = 2) {
  const rows = cells.length, cols = Math.max(...cells.map((r) => r.length));
  const W = cols * (tw + gap) + gap, H = rows * (th + gap) + gap;
  const out = Buffer.alloc(W * H * 3, 40);
  cells.forEach((row, ry) => row.forEach((cell, cx) => {
    if (!cell) return;
    for (let y = 0; y < th; y++) cell.copy(out, ((gap + ry * (th + gap) + y) * W + gap + cx * (tw + gap)) * 3, y * tw * 3, (y + 1) * tw * 3);
  }));
  return encodePng(W, H, out);
}
