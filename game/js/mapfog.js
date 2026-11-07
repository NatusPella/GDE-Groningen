// #661: de mistkaart uploadde bij elke nieuwe cel de complete ImageData (1 byte per
// cel, op volle kaartformaat) en serialiseerde elke 3 s alle bits. Alleen het
// geraakte venster uploaden en minder vaak opslaan scheelt haperingen bij het
// rijden. Pure rekenregels, zodat de maten los te testen zijn.
export const FOG_SAVE_MS = 15000;

// De cellen die het verkennen rond (cx, cy) raakt, als tekenrechthoek (incl. rand).
export function revealRect(cx, cy, reveal, w, h) {
  // putImageData eist gehele getallen; een zwevende of NaN-positie liet de canvas-upload crashen (#661).
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  cx = Math.round(cx); cy = Math.round(cy);
  const x0 = Math.max(0, cx - reveal), y0 = Math.max(0, cy - reveal);
  const x1 = Math.min(w - 1, cx + reveal), y1 = Math.min(h - 1, cy + reveal);
  if (x1 < x0 || y1 < y0) return null;
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Hoeveel van de kaart een upload raakt (voor de meting).
export function uploadFraction(rect, w, h) {
  return rect ? (rect.w * rect.h) / (w * h) : 0;
}

export function fogSaveDue(now, saveAt) { return now > saveAt; }
