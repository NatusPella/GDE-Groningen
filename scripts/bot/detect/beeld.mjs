// Detector (b): de beeldcontrole van de proefspeler, droog op PNG's (Node, na de run; geen Electron).
//   beeldStats(img)         histogram en egale vlakken van één beeld ({ w, h, rgba } uit scripts/lib/pngcheck.mjs decodePng)
//   beeldOordeel(stats)     blanco, mistig, zwart of een groot egaal vlak
//   flikkering(a, b, c)     de a/b/c-analyse van scripts/qa/brug_beeld_analyse.mjs (#235) als functie: a-b minus a-c in vlakke delen
//   beeldAudit(...)         alle oogmoment-beelden van een run
// 'Waar de camera naar de wereld kijkt': een filmpje, menu of laadscherm telt niet; een egaal beeld daar is bedoeld.
import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from '../../lib/pngcheck.mjs';

const lumAt = (rgba, i) => (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;

export function lumArray(img) {
  const o = new Uint8Array(img.w * img.h);
  for (let i = 0; i < o.length; i++) o[i] = lumAt(img.rgba, i);
  return o;
}

// Histogram (256 bakken), het smalste venster van `breed` niveaus met de meeste pixels, en het egale-vlakkenraster.
// Raster: kolommen x rijen cellen; een cel is egaal als haar helderheidsbereik (max - min) onder `celBereik` blijft.
// grootsteBlok: het grootste samenhangende blok egale cellen als fractie van het beeld (4 buren).
export function beeldStats(img, { breed = 16, kol = 32, rij = 18, celBereik = 6 } = {}) {
  const { w, h } = img, L = lumArray(img), n = w * h;
  const hist = new Uint32Array(256);
  let donker = 0, som = 0;
  for (let i = 0; i < n; i++) { hist[L[i]]++; som += L[i]; if (L[i] < 30) donker++; }
  let best = 0, bestAt = 0, win = 0;
  for (let v = 0; v < 256; v++) { win += hist[v]; if (v >= breed) win -= hist[v - breed]; if (win > best) { best = win; bestAt = v - breed + 1; } }
  const mn = new Uint8Array(kol * rij).fill(255), mx = new Uint8Array(kol * rij);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(rij - 1, Math.floor((y * rij) / h));
    for (let x = 0; x < w; x++) { const k = cy * kol + Math.min(kol - 1, Math.floor((x * kol) / w)), v = L[y * w + x]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
  }
  const egaal = new Uint8Array(kol * rij);
  let egaalCellen = 0;
  for (let k = 0; k < egaal.length; k++) if (mx[k] - mn[k] < celBereik) { egaal[k] = 1; egaalCellen++; }
  const gezien = new Uint8Array(egaal.length); let groot = 0, grootCel = -1;
  for (let k = 0; k < egaal.length; k++) {
    if (!egaal[k] || gezien[k]) continue;
    let tel = 0; const stack = [k]; gezien[k] = 1;
    while (stack.length) {
      const c = stack.pop(); tel++;
      const cx = c % kol, cy = (c / kol) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= kol || ny >= rij) continue;
        const q = ny * kol + nx;
        if (egaal[q] && !gezien[q]) { gezien[q] = 1; stack.push(q); }
      }
    }
    if (tel > groot) { groot = tel; grootCel = k; }
  }
  const r3 = (v) => Math.round(v * 1000) / 1000;
  return {
    w, h, gemLum: Math.round(som / n), donker: r3(donker / n), smalleBand: r3(best / n), bandLum: bestAt + (breed >> 1),
    egaalFractie: r3(egaalCellen / egaal.length), grootsteBlok: r3(groot / egaal.length), blokCel: grootCel >= 0 ? [grootCel % kol, (grootCel / kol) | 0] : null,
  };
}

// Het oordeel over één beeld. Drempels uit de opdracht: > 90% binnen een smalle band of > 95% donker.
//   zwart: > 95% donker; mistig: > 90% binnen een smalle band en helder (gemiddeld > 140); blanco: > 90% in een smalle band (donker of midden);
//   egaal-vlak: een samenhangend egaal blok van >= 45% van het beeld (de lucht of een muur voor de lens). Alleen als de camera naar de wereld kijkt.
export function beeldOordeel(st, { kijktNaarWereld = true, band = 0.9, donkerDrempel = 0.95, blok = 0.45 } = {}) {
  if (!kijktNaarWereld) return [];
  const uit = [];
  if (st.donker > donkerDrempel) uit.push({ type: 'beeld-zwart', ernst: 'blokkeert', bewijs: { donker: st.donker } });
  else if (st.smalleBand > band) uit.push({ type: st.gemLum > 140 ? 'beeld-mistig' : 'beeld-blanco', ernst: 'verwarrend', bewijs: { smalleBand: st.smalleBand, bandLum: st.bandLum } });
  else if (st.grootsteBlok >= blok) uit.push({ type: 'beeld-egaal-vlak', ernst: 'cosmetisch', bewijs: { grootsteBlok: st.grootsteBlok, cel: st.blokCel } });
  return uit;
}

const vlak = (L, w, h) => {
  const f = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, c = L[i];
    f[i] = Math.max(Math.abs(c - L[i - 1]), Math.abs(c - L[i + 1]), Math.abs(c - L[i - w]), Math.abs(c - L[i + w])) < 20 ? 1 : 0;
  }
  return f;
};

// De a/b/c-analyse van brug_beeld_analyse.mjs: a = beeld, b = camera een fractie verschoven, c = a nog eens. Pixels in vlakke delen die
// tussen a en b verschillen (flikkering: z-fighting of een LOD-wissel) min die tussen a en c (ruis van water en verkeer).
// Geeft { ab, ac, score } (pixels) of null als de beelden niet te vergelijken zijn. Rekent op decodePng-beelden.
export function flikkering(A, B, C, { drempel = 60 } = {}) {
  if (!A || !B || !C || A.w !== B.w || A.w !== C.w || A.h !== B.h || A.h !== C.h) return null;
  const La = lumArray(A), Lb = lumArray(B), Lc = lumArray(C), Fa = vlak(La, A.w, A.h), Fb = vlak(Lb, A.w, A.h);
  let ab = 0, ac = 0;
  for (let i = 0; i < La.length; i++) {
    if (Fa[i] && Fb[i] && Math.abs(La[i] - Lb[i]) > drempel / 3) ab++;
    if (Fa[i] && Math.abs(La[i] - Lc[i]) > drempel / 3) ac++;
  }
  return { ab, ac, score: Math.max(0, ab - ac) };
}

export const FLIKKER_MIN = 40;   // pixels: zoals --min in brug_beeld_analyse.mjs

// Alle beelden van een run. events: de events.jsonl-regels; map: waar de PNG's staan (shots-<naam>.png of de genummerde bundelbeelden).
// Per oogmoment met een beeld: stats en oordeel. Per set <naam>-a/-b/-c.png: de flikkeringsscore. Geeft { stats, bevindingen }.
export function beeldAudit(events, map, { leesPng = (p) => decodePng(fs.readFileSync(p)), bestaat = fs.existsSync, lijst = (d) => fs.readdirSync(d) } = {}) {
  const bevindingen = [], stats = [];
  for (const o of events.filter((e) => e.type === 'oog' && e.shot)) {
    const pad = [path.join(map, `shots-${o.shot}.png`), path.join(map, `${o.shot}.png`)].find((p) => bestaat(p));
    if (!pad) continue;
    let st;
    try { st = beeldStats(leesPng(pad)); } catch (e) { continue; }
    stats.push({ shot: o.shot, ...st });
    const kijkt = !o.filmpje && o.reden !== 'filmpje';
    for (const f of beeldOordeel(st, { kijktNaarWereld: kijkt })) bevindingen.push({ ...f, soort: 'beeld', t: o.t ?? o.tijd, stap: o.stap, plek: o.plek, shot: o.shot, tekst: o.doelTekst || '' });
  }
  let namen = [];
  try { namen = lijst(map); } catch (e) { namen = []; }
  for (const f of namen.filter((x) => /^shots-.+-a\.png$/.test(x))) {
    const naam = f.replace(/^shots-/, '').replace(/-a\.png$/, ''), pb = path.join(map, `shots-${naam}-b.png`), pc = path.join(map, `shots-${naam}-c.png`);
    if (!bestaat(pb) || !bestaat(pc)) continue;
    let r = null;
    try { r = flikkering(leesPng(path.join(map, f)), leesPng(pb), leesPng(pc)); } catch (e) { r = null; }
    if (r && r.score >= FLIKKER_MIN) {
      const ev = events.find((e) => e.type === 'flikker' && e.shot === naam) || {};
      bevindingen.push({ type: 'beeld-flikkering', soort: 'beeld', ernst: 'verwarrend', shot: naam, stap: ev.stap || '', plek: ev.plek || null, t: ev.t ?? null, tekst: '', bewijs: r });
    }
  }
  return { stats, bevindingen };
}
