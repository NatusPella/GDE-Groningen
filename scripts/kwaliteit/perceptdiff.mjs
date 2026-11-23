// Perceptuele beeldvergelijking voor de beeldregressie van de kwaliteitsmachine (docs/KWALITEITSMACHINE.md). Puur: werkt op
// { w, h, data(RGBA) } zoals scripts/lib/pngdiff.mjs ze leest; geen I/O, zodat de drempels getest kunnen worden.
//
// Waarom niet per pixel: een 3D-beeld verschuift bij elke build een halve pixel (anti-aliasing, schaduwranden, een boom die
// net anders wiegt). Daarom:
//   1. beide beelden naar helderheid (en kleur) op 1/schaal (standaard 1/4: 1920x1080 wordt 480x270, gemiddeld per vak);
//   2. per blok van 8x8 (op die schaal: 32x32 echte pixels) de SSIM van de helderheid en het gemiddelde kleurverschil;
//   3. een blok is 'slecht' bij SSIM onder blokSsim of een kleurverschil boven blokKleur (0..255);
//   4. maskers (rechthoeken in fracties van het beeld) en een regio (alleen dat deel vergelijken) per camerapunt.
// Oordeel per punt: ssim (gemiddeld over de blokken) >= minSsim EN aandeel slechte blokken <= maxSlecht.
export const STANDAARD_DREMPEL = Object.freeze({ minSsim: 0.9, maxSlecht: 0.02, blokSsim: 0.75, blokKleur: 24 });
export const STANDAARD_OPTIES = Object.freeze({ schaal: 4, blok: 8 });

const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;

/** Snijdt een regio { x, y, w, h } (fracties 0..1) uit een beeld; zonder regio het beeld zelf. */
export function snij(img, regio) {
  if (!regio) return img;
  const x0 = Math.max(0, Math.round(regio.x * img.w)), y0 = Math.max(0, Math.round(regio.y * img.h));
  const w = Math.max(1, Math.min(img.w - x0, Math.round(regio.w * img.w))), h = Math.max(1, Math.min(img.h - y0, Math.round(regio.h * img.h)));
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) img.data.copy(data, y * w * 4, ((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x0 + w) * 4);
  return { w, h, data };
}

/** Verkleint met een gemiddelde per vak van s x s: { w, h, l (helderheid), r, g, b } als Float32Array. */
export function verklein(img, s = 4) {
  const w = Math.max(1, Math.floor(img.w / s)), h = Math.max(1, Math.floor(img.h / s));
  const l = new Float32Array(w * h), r = new Float32Array(w * h), g = new Float32Array(w * h), b = new Float32Array(w * h);
  const n = s * s;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sr = 0, sg = 0, sb = 0;
    for (let dy = 0; dy < s; dy++) {
      let o = ((y * s + dy) * img.w + x * s) * 4;
      for (let dx = 0; dx < s; dx++, o += 4) { sr += img.data[o]; sg += img.data[o + 1]; sb += img.data[o + 2]; }
    }
    const i = y * w + x;
    r[i] = sr / n; g[i] = sg / n; b[i] = sb / n;
    l[i] = 0.299 * r[i] + 0.587 * g[i] + 0.114 * b[i];
  }
  return { w, h, l, r, g, b };
}

const inMasker = (fx, fy, maskers) => (maskers || []).some((m) => fx >= m.x && fx <= m.x + m.w && fy >= m.y && fy <= m.y + m.h);

/**
 * Vergelijkt referentie `ref` met nieuw beeld `nieuw`. Geeft { gelijkMaat, ssim, slecht, blokken, aandeelSlecht, maxKleur, kaart }.
 * kaart: per blok { ssim, kleur, slecht, gemaskeerd } (voor het diffbeeld). Een andere maat: gelijkMaat false, ssim 0, alles slecht.
 */
export function vergelijkPerceptueel(ref, nieuw, { regio = null, maskers = [], schaal = STANDAARD_OPTIES.schaal, blok = STANDAARD_OPTIES.blok, blokSsim = STANDAARD_DREMPEL.blokSsim, blokKleur = STANDAARD_DREMPEL.blokKleur } = {}) {
  if (!ref || !nieuw || ref.w !== nieuw.w || ref.h !== nieuw.h) return { gelijkMaat: false, ssim: 0, slecht: 1, blokken: 1, aandeelSlecht: 1, maxKleur: 255, kaart: null };
  const a = verklein(snij(ref, regio), schaal), b = verklein(snij(nieuw, regio), schaal);
  const bw = Math.max(1, Math.floor(a.w / blok)), bh = Math.max(1, Math.floor(a.h / blok));
  const kaart = { bw, bh, w: a.w, h: a.h, blok, cellen: [] };
  let som = 0, geteld = 0, slecht = 0, maxKleur = 0;
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const fx = (bx + 0.5) / bw, fy = (by + 0.5) / bh;
    if (inMasker(fx, fy, regio ? [] : maskers)) { kaart.cellen.push({ gemaskeerd: true }); continue; }
    let mx = 0, my = 0, n = 0, kl = 0;
    const x0 = bx * blok, y0 = by * blok, x1 = bx === bw - 1 ? a.w : x0 + blok, y1 = by === bh - 1 ? a.h : y0 + blok;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * a.w + x; mx += a.l[i]; my += b.l[i]; kl += (Math.abs(a.r[i] - b.r[i]) + Math.abs(a.g[i] - b.g[i]) + Math.abs(a.b[i] - b.b[i])) / 3; n++; }
    mx /= n; my /= n; kl /= n;
    let vx = 0, vy = 0, cv = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * a.w + x; const dx = a.l[i] - mx, dy = b.l[i] - my; vx += dx * dx; vy += dy * dy; cv += dx * dy; }
    vx /= n; vy /= n; cv /= n;
    const s = ((2 * mx * my + C1) * (2 * cv + C2)) / ((mx * mx + my * my + C1) * (vx + vy + C2));
    const isSlecht = s < blokSsim || kl > blokKleur;
    som += s; geteld++; if (isSlecht) slecht++; maxKleur = Math.max(maxKleur, kl);
    kaart.cellen.push({ ssim: s, kleur: kl, slecht: isSlecht });
  }
  return { gelijkMaat: true, ssim: geteld ? som / geteld : 1, slecht, blokken: geteld, aandeelSlecht: geteld ? slecht / geteld : 0, maxKleur, kaart };
}

/** Puur oordeel met de drempel van een punt (overschrijft de standaard). Geeft { ok, redenen, drempel }. */
export function oordeel(r, drempel = {}) {
  const d = { ...STANDAARD_DREMPEL, ...drempel };
  const redenen = [];
  if (!r || !r.gelijkMaat) redenen.push('andere beeldmaat dan de referentie');
  else {
    if (r.ssim < d.minSsim) redenen.push(`SSIM ${r.ssim.toFixed(3)} < ${d.minSsim}`);
    if (r.aandeelSlecht > d.maxSlecht) redenen.push(`${(r.aandeelSlecht * 100).toFixed(1)}% slechte blokken > ${(d.maxSlecht * 100).toFixed(1)}%`);
  }
  return { ok: redenen.length === 0, redenen, drempel: d };
}

/**
 * Diffbeeld op de verkleinde maat: het nieuwe beeld in grijs, slechte blokken rood (sterker naarmate de SSIM lager is),
 * twijfelblokken oranje, gemaskeerde blokken blauw getint. Geeft { w, h, data(RGBA) } voor encodePng.
 */
export function diffBeeld(nieuw, r, { regio = null, schaal = STANDAARD_OPTIES.schaal } = {}) {
  const b = verklein(snij(nieuw, regio), schaal);
  const data = Buffer.alloc(b.w * b.h * 4);
  const k = r && r.kaart;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const i = y * b.w + x, o = i * 4;
    const grijs = 40 + b.l[i] * 0.55;
    let R = grijs, G = grijs, B = grijs;
    if (k) {
      const bx = Math.min(k.bw - 1, Math.floor(x / k.blok)), by = Math.min(k.bh - 1, Math.floor(y / k.blok));
      const c = k.cellen[by * k.bw + bx];
      if (c && c.gemaskeerd) { B = Math.min(255, B + 50); }
      else if (c && c.slecht) { const t = Math.min(1, Math.max(0.35, 1 - c.ssim)); R = R * (1 - t) + 255 * t; G *= 1 - t; B *= 1 - t; }
      else if (c && c.ssim < 0.9) { R = R * 0.6 + 255 * 0.4; G = G * 0.6 + 150 * 0.4; B *= 0.6; }
    }
    data[o] = R; data[o + 1] = G; data[o + 2] = B; data[o + 3] = 255;
  }
  return { w: b.w, h: b.h, data };
}
