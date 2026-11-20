// Hoekdetector van de QA-sweep (#985 #980): vindt vlakken met afgeronde hoeken waar toch een vierkant vlak doorheen of omheen steekt.
// Dit bestand is een bibliotheek van functiedeclaraties: schermen_sweep.mjs zet het vóór schermen_sweep.page.js (perf-script-body) en
// scripts/hoeken_test.mjs laadt de pure helpers (pointInRR, parseRadius) zonder DOM. Niets hier raakt spelstaat of opslag.
//
// Per zichtbaar element E met border-radius > 0 (>= 2 px) en per hoek nemen we een raster van punten in het hoekvierkant, alleen de punten buiten de boog (het stukje dat transparant hoort te zijn),
// en tellen welk aandeel (dekking, vanaf 0,4) een ander vlak verft:
//   kind     een afstammeling D (of een ::before/::after, met absolute positie) waarvan de box die punten bedekt, die verf heeft (achtergrondkleur, afbeelding of verloop,
//            rand, inset-schaduw, img/canvas/video), niet zelf rond genoeg is om ze weg te laten, en waarboven geen ouder (D tot de wortel) ze wegknipt
//            (overflow niet visible, clip-path, mask, contain:paint; allemaal met de eigen afronding van die ouder).
//   ouder    een voorouder A met verf (dekking vanaf 0,6) waarvan de eigen hoek op dezelfde plek (<= 1,5 px) ligt en niet rond genoeg is: het vierkante vlak erachter
//            steekt als hoek uit (het "icoon met een afgerond masker maar een vierkante achtergrond erachter"-geval).
// Beperkingen (zie docs/QA-SWEEP-20-11.md): statische pseudo's, hover/selected-vlakken die alleen bestaan na een muisbeweging en transform op de pseudo worden niet gezien.

// Een CSS-radius ("12px", "12px 8px", "50%", "0px") naar [rx, ry] in px, tegen breedte w en hoogte h.
function parseRadius(tekst, w, h) {
  const delen = String(tekst || '0').trim().split(/\s+/);
  const een = (d, ref) => { const v = parseFloat(d); if (!isFinite(v)) return 0; return /%$/.test(d) ? ref * v / 100 : v; };
  const rx = een(delen[0], w), ry = delen.length > 1 ? een(delen[1], h) : een(delen[0], h);
  return [Math.max(0, rx), Math.max(0, ry)];
}

// CSS schaalt alle radii met dezelfde factor als de som op een zijde groter is dan de zijde zelf.
function schaalRadii(r, w, h) {
  // r = { tl:[rx,ry], tr, br, bl }
  const f = Math.min(1,
    r.tl[0] + r.tr[0] > 0 ? w / (r.tl[0] + r.tr[0]) : 1, r.bl[0] + r.br[0] > 0 ? w / (r.bl[0] + r.br[0]) : 1,
    r.tl[1] + r.bl[1] > 0 ? h / (r.tl[1] + r.bl[1]) : 1, r.tr[1] + r.br[1] > 0 ? h / (r.tr[1] + r.br[1]) : 1);
  if (f >= 1) return r;
  const s = (a) => [a[0] * f, a[1] * f];
  return { tl: s(r.tl), tr: s(r.tr), br: s(r.br), bl: s(r.bl) };
}

// Ligt (x, y) binnen de afgeronde rechthoek rect = {left, top, right, bottom} met radii r (tl, tr, br, bl)?
function pointInRR(rect, r, x, y) {
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return false;
  const hoek = (cx, cy, rad, dx, dy) => { // (cx, cy): middelpunt van de boog; dx, dy: de kant van de hoek (-1 of 1)
    if (!rad || rad[0] <= 0 || rad[1] <= 0) return true;
    if ((x - cx) * dx <= 0 || (y - cy) * dy <= 0) return true; // niet in het hoekvierkant
    const a = (x - cx) / rad[0], b = (y - cy) / rad[1];
    return a * a + b * b <= 1;
  };
  return hoek(rect.left + r.tl[0], rect.top + r.tl[1], r.tl, -1, -1) && hoek(rect.right - r.tr[0], rect.top + r.tr[1], r.tr, 1, -1)
    && hoek(rect.right - r.br[0], rect.bottom - r.br[1], r.br, 1, 1) && hoek(rect.left + r.bl[0], rect.bottom - r.bl[1], r.bl, -1, 1);
}

const HOEK_NAMEN = { tl: 'linksboven', tr: 'rechtsboven', br: 'rechtsonder', bl: 'linksonder' };
// canvassen waarvan we weten dat ze transparant renderen (alpha: true): geen vlak in de hoek
const HOEK_NEGEER = ['.gar-stage canvas'];
const HOEK_CSS = { tl: 'border-top-left-radius', tr: 'border-top-right-radius', br: 'border-bottom-right-radius', bl: 'border-bottom-left-radius' };

// ---------- DOM-kant (alleen in de pagina) ----------
function hoekKleurAlpha(c) { const m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return String(c) === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; }

// Wat verft een box (uit een computed style)? bg: 0..1 (afbeelding of verloop telt als 1), w: de zichtbare randbreedtes, inset: een inset-schaduw.
// CSS `zoom` (de UI-schaal van het menu en de HUD) maakt getBoundingClientRect groter of kleiner dan de lengtes uit getComputedStyle: z is die verhouding.
function hoekZoom(s, rect) {
  const w = parseFloat(s.width); if (!isFinite(w) || w < 4 || !rect.width) return 1;
  const p = (k) => parseFloat(s[k]) || 0;
  const lw = s.boxSizing === 'border-box' ? w : w + p('paddingLeft') + p('paddingRight') + p('borderLeftWidth') + p('borderRightWidth');
  const z = rect.width / lw; return z > 0.2 && z < 5 ? z : 1;
}
// de vier radii van een computed style in schermpixels (z: hoekZoom), met de CSS-schaling bij een te grote som
function hoekRadii(s, w, h, z) {
  const rd = (t) => parseRadius(t, w / z, h / z).map((v) => v * z);
  return schaalRadii({ tl: rd(s.borderTopLeftRadius), tr: rd(s.borderTopRightRadius), br: rd(s.borderBottomRightRadius), bl: rd(s.borderBottomLeftRadius) }, w, h);
}
function hoekVerf(s, z = 1) {
  const bgImg = s.backgroundImage && s.backgroundImage !== 'none';
  const zijde = (k) => (parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && s['border' + k + 'Style'] !== 'hidden' && hoekKleurAlpha(s['border' + k + 'Color']) > 0.02 ? parseFloat(s['border' + k + 'Width']) * z : 0);
  return { bg: bgImg ? 1 : hoekKleurAlpha(s.backgroundColor), w: { t: zijde('Top'), r: zijde('Right'), b: zijde('Bottom'), l: zijde('Left') }, inset: /inset/.test(s.boxShadow || '') && s.boxShadow !== 'none' };
}
// Verft de box (v uit hoekVerf, rect zijn borderbox) het punt (x, y)? Een rand verft alleen langs zijn eigen zijde.
function hoekVerftPunt(v, rect, x, y, media) {
  if (v.bg > 0.02 || v.inset || media) return true;
  return x - rect.left < v.w.l || rect.right - x < v.w.r || y - rect.top < v.w.t || rect.bottom - y < v.w.b;
}

function hoekScan(root, opties = {}) {
  const gevonden = [];
  const cache = new WeakMap();
  const info = (el) => {
    let i = cache.get(el); if (i) return i;
    const s = getComputedStyle(el); const rect = el.getBoundingClientRect();
    const z = hoekZoom(s, rect);
    const rad = hoekRadii(s, rect.width, rect.height, z);
    const knipt = (s.overflowX !== 'visible' || s.overflowY !== 'visible') || (s.clipPath && s.clipPath !== 'none') || (s.maskImage && s.maskImage !== 'none') || (s.webkitMaskImage && s.webkitMaskImage !== 'none') || /paint|strict|content/.test(s.contain || '');
    // de paddingbox met zijn eigen (kleinere) afronding: daar knipt overflow en daar ligt het vlak van de ouder
    const bw = (k) => (parseFloat(s['border' + k + 'Width']) || 0) * z; const bt = bw('Top'), br = bw('Right'), bb = bw('Bottom'), bl = bw('Left');
    const kl = (a, b) => [Math.max(0, a[0] - b[0]), Math.max(0, a[1] - b[1])];
    const binnen = { rect: { left: rect.left + bl, top: rect.top + bt, right: rect.right - br, bottom: rect.bottom - bb }, rad: { tl: kl(rad.tl, [bl, bt]), tr: kl(rad.tr, [br, bt]), br: kl(rad.br, [br, bb]), bl: kl(rad.bl, [bl, bb]) } };
    i = { s, rect, rad, z, binnen, v: hoekVerf(s, z), media: ['IMG', 'CANVAS', 'VIDEO', 'PICTURE'].includes(el.tagName) && !(opties.negeer || HOEK_NEGEER).some((q) => el.matches(q)), knipt, onzichtbaar: s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05 };
    cache.set(el, i); return i;
  };
  // wordt (x, y) door een knippende voorouder (vanaf start omhoog) weggehaald?
  const weggeknipt = (start, x, y) => {
    for (let a = start; a && a.nodeType === 1; a = a.parentElement) {
      const i = info(a); if (!i.knipt) continue;
      if (!pointInRR(i.binnen.rect, i.binnen.rad, x, y)) return true;
    }
    return false;
  };
  const nm = (el) => { const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''; return el.tagName.toLowerCase() + id + c; };
  // de box van een absoluut gepositioneerde pseudo, relatief aan de containing block
  const pseudoCache = new WeakMap();
  const pseudoBox = (host, ps) => {
    let pc = pseudoCache.get(host); if (!pc) { pc = {}; pseudoCache.set(host, pc); }
    if (!(ps in pc)) pc[ps] = pseudoBox0(host, ps);
    return pc[ps];
  };
  const pseudoBox0 = (host, ps) => {
    const s = getComputedStyle(host, ps);
    if (!s || s.content === 'none' || s.content === 'normal' || s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return null;
    if (s.position !== 'absolute' && s.position !== 'fixed') return null;
    if (s.transform && s.transform !== 'none') return null;
    let cb = null;
    if (s.position === 'fixed') cb = { left: 0, top: 0 };
    else { for (let a = host; a && a.nodeType === 1; a = a.parentElement) { if (getComputedStyle(a).position !== 'static') { cb = a; break; } } }
    if (!cb) return null;
    const z = cb.left !== undefined ? 1 : info(cb).z;
    const v = hoekVerf(s, z);
    if (!(v.bg > 0.02 || v.inset || v.w.t || v.w.r || v.w.b || v.w.l)) return null;
    let bl, bt;
    if (cb.left !== undefined) { bl = 0; bt = 0; } else { const r = cb.getBoundingClientRect(); const cs = getComputedStyle(cb); bl = r.left + parseFloat(cs.borderLeftWidth) * z; bt = r.top + parseFloat(cs.borderTopWidth) * z; }
    const l = parseFloat(s.left) * z, t = parseFloat(s.top) * z, w = parseFloat(s.width) * z, h = parseFloat(s.height) * z;
    if (![l, t, w, h].every(isFinite) || w <= 0 || h <= 0) return null;
    const m = (k) => (parseFloat(s[k]) || 0) * z;
    const rect = { left: bl + l + m('marginLeft'), top: bt + t + m('marginTop') };
    // width/height zijn de contentbox (box-sizing: content-box) of de borderbox (border-box)
    const extraB = s.boxSizing === 'border-box' ? 0 : m('paddingLeft') + m('paddingRight') + m('borderLeftWidth') + m('borderRightWidth');
    const extraH = s.boxSizing === 'border-box' ? 0 : m('paddingTop') + m('paddingBottom') + m('borderTopWidth') + m('borderBottomWidth');
    rect.right = rect.left + w + extraB; rect.bottom = rect.top + h + extraH;
    const bw = rect.right - rect.left, bh = rect.bottom - rect.top;
    const rad = hoekRadii(s, bw, bh, z);
    return { rect, rad, v, naam: nm(host) + ps, alpha: v.bg };
  };

  const kandidaten = [...root.querySelectorAll('*')].filter((e) => {
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'BR'].includes(e.tagName.toUpperCase()) || !e.getClientRects().length) return false;
    const i = info(e); if (i.onzichtbaar) return false;
    const r = i.rect; if (r.width < 6 || r.height < 6) return false;
    if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
    return ['tl', 'tr', 'br', 'bl'].some((k) => i.rad[k][0] >= 2 && i.rad[k][1] >= 2);
  });
  const gezien = new Set();
  const meld = (E, k, soort, door, dekking, extra) => {
    const sl = nm(E) + k + soort + door; if (gezien.has(sl)) return; gezien.add(sl);
    const i = info(E); const r = i.rect;
    gevonden.push({ el: nm(E), tekst: (E.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24), hoek: HOEK_NAMEN[k], soort, door, dekking: +dekking.toFixed(2), radius: Math.round(i.rad[k][0]), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], ...extra });
  };
  const N = 6; // rooster per hoekvierkant
  const MIN_DEKKING = opties.minDekking || 0.4; // aandeel van het stukje tussen box-hoek en boog dat het kind bedekt
  for (const E of kandidaten) {
    const i = info(E); const r = i.rect;
    const kinderen = [...E.querySelectorAll('*')].filter((D) => !['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(D.tagName.toUpperCase()) && D.getClientRects().length && !info(D).onzichtbaar);
    for (const k of ['tl', 'tr', 'br', 'bl']) {
      const [rx, ry] = i.rad[k]; if (rx < 2 || ry < 2) continue;
      const sx = k[1] === 'l' ? 1 : -1, sy = k[0] === 't' ? 1 : -1; // richting vanaf de hoek naar binnen
      const hx = k[1] === 'l' ? r.left : r.right, hy = k[0] === 't' ? r.top : r.bottom;
      // de punten tussen de box-hoek en de boog
      const pts = [];
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
        const dx = (a + 0.5) / N * rx, dy = (b + 0.5) / N * ry;
        const u = (rx - dx) / rx, w = (ry - dy) / ry;
        if (u * u + w * w > 1) pts.push([hx + sx * dx, hy + sy * dy]); // buiten de boog
      }
      if (pts.length < 3) continue;
      const zichtbaar = pts.filter(([x, y]) => !weggeknipt(E.parentElement, x, y)); // de hoek van E zelf is soms al weggeknipt door een ouder
      if (zichtbaar.length < 3) continue;
      const dek = (rectP, radP, verfTest, knipStart) => { let n = 0; for (const [x, y] of zichtbaar) if (pointInRR(rectP, radP, x, y) && verfTest(x, y) && !weggeknipt(knipStart, x, y)) n++; return n / zichtbaar.length; };
      const raakt = (rc) => rc.right > Math.min(hx, hx + sx * rx) && rc.left < Math.max(hx, hx + sx * rx) && rc.bottom > Math.min(hy, hy + sy * ry) && rc.top < Math.max(hy, hy + sy * ry);
      for (const D of kinderen) {
        const di = info(D);
        if (raakt(di.rect) && (di.v.bg > 0.02 || di.v.inset || di.media || di.v.w.t || di.v.w.r || di.v.w.b || di.v.w.l)) {
          const f = dek(di.rect, di.rad, (x, y) => hoekVerftPunt(di.v, di.rect, x, y, di.media), D.parentElement);
          if (f >= MIN_DEKKING) meld(E, k, di.media && !(di.v.bg > 0.02) ? 'media' : 'kind', nm(D), f, { alpha: +Math.min(1, di.v.bg).toFixed(2) });
        }
        for (const ps of ['::before', '::after']) {
          const pb = pseudoBox(D, ps); if (!pb || !raakt(pb.rect)) continue;
          const f = dek(pb.rect, pb.rad, (x, y) => hoekVerftPunt(pb.v, pb.rect, x, y, false), D);
          if (f >= MIN_DEKKING) meld(E, k, 'kind', pb.naam, f, { alpha: +Math.min(1, pb.alpha).toFixed(2), box: [pb.rect.left, pb.rect.top, pb.rect.right, pb.rect.bottom].map(Math.round), boog: Math.round(pb.rad.tl[0]) });
        }
      }
      for (const ps of ['::before', '::after']) {
        const pb = pseudoBox(E, ps); if (!pb || !raakt(pb.rect)) continue;
        const f = dek(pb.rect, pb.rad, (x, y) => hoekVerftPunt(pb.v, pb.rect, x, y, false), E);
        if (f >= MIN_DEKKING) meld(E, k, 'kind', pb.naam, f, { alpha: +Math.min(1, pb.alpha).toFixed(2), box: [pb.rect.left, pb.rect.top, pb.rect.right, pb.rect.bottom].map(Math.round), boog: Math.round(pb.rad.tl[0]) });
      }
      // voorouders met een vierkante hoek op dezelfde plek (zonder verlies van de rand: ook hun randen tellen alleen langs hun eigen zijde)
      for (let A = E.parentElement; A && A !== document.body && A !== document.documentElement; A = A.parentElement) {
        const ai = info(A); if (ai.onzichtbaar) continue;
        const ar = ai.rect;
        const zelfde = Math.abs((k[1] === 'l' ? ar.left - r.left : ar.right - r.right)) <= 1.5 && Math.abs((k[0] === 't' ? ar.top - r.top : ar.bottom - r.bottom)) <= 1.5;
        if (!zelfde) continue;
        if (ar.width > innerWidth * 0.95 && ar.height > innerHeight * 0.95) continue; // het scherm zelf
        // alleen het vlak (achtergrond, inset-schaduw) binnen de rand van A telt: de rand zelf volgt de afronding van A
        const f = (ai.v.bg > 0.02) ? dek(ai.binnen.rect, ai.binnen.rad, () => true, A.parentElement) : 0;
        if (f >= 0.6) meld(E, k, 'ouder', nm(A), f, { alpha: +Math.min(1, ai.v.bg).toFixed(2) });
      }
    }
  }
  return gevonden;
}

// Tekent een felle markering op de hoeken van de bevindingen (voor een [capture]-beeld); geeft de opruimfunctie terug.
function hoekMarkeer(lijst) {
  const els = [];
  for (const f of lijst) {
    const [l, t, r, b] = f.rect; const z = Math.max(10, f.radius + 4);
    const x = f.hoek.startsWith('links') ? l : r - z; const y = f.hoek.endsWith('boven') ? t : b - z;
    const m = document.createElement('div'); m.className = 'qa-hoek-markering';
    m.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${z}px;height:${z}px;border:2px solid #f0f;box-sizing:border-box;z-index:2147483647;pointer-events:none;background:rgba(255,0,255,.15)`;
    document.body.appendChild(m); els.push(m);
  }
  return () => els.forEach((m) => m.remove());
}
