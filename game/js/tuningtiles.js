// De voorbeeldplaatjes op de keuzetegels van de pimp-werkplaats (epic Autotuning, #1155, ronde 3): een afwerking als bol,
// een velg als het echte ontwerp, een sticker als echte preview, strepen op een autootje. Alles getekend op een klein canvas en
// bewaard als dataURL (een plaatje per combinatie, begrensd), zodat de lijst geen WebGL en geen bestanden nodig heeft.
import { drawDecalPreview } from './vehiclelook3d.js';

const MAX_CACHE = 160;
const cache = new Map();
const hex = (c, fallback = '#9aa3ad') => (/^#[0-9a-f]{6}$/i.test(c) ? c : fallback);
const INK = '#1d1b17', PAPER = '#f5efe0';

function url(key, w, h, draw) {
  let u = cache.get(key);
  if (u) return u;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  u = c.toDataURL('image/png');
  cache.set(key, u);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return u;
}

function shade(color, k) {
  const n = parseInt(hex(color).slice(1), 16);
  const r = Math.min(255, Math.round((n >> 16 & 255) * k)), g = Math.min(255, Math.round((n >> 8 & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}

// Een afwerking als bol in de lakkleur: glans (scherp punt), metallic (glitterbanen), parelmoer (kleurverloop), mat (geen glans).
export function finishSphere(finish, color) {
  const col = hex(color, '#2e5f9e');
  return url(`f|${finish}|${col}`, 96, 96, (g, w, h) => {
    const cx = w / 2, cy = h / 2, r = 40;
    g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, r + 3, 0, Math.PI * 2); g.fill();
    const base = g.createRadialGradient(cx - 14, cy - 16, 4, cx, cy, r);
    if (finish === 'matte') { base.addColorStop(0, shade(col, 1.08)); base.addColorStop(1, shade(col, 0.72)); }
    else { base.addColorStop(0, shade(col, 1.35)); base.addColorStop(0.45, shade(col, 1)); base.addColorStop(1, shade(col, 0.5)); }
    g.fillStyle = base; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    if (finish === 'metallic') {
      for (let i = 0; i < 46; i++) { const a = (i * 2.399) % (Math.PI * 2), d = ((i * 37) % 100) / 100 * r * 0.95; g.fillStyle = i % 3 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.25)'; g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2); }
    } else if (finish === 'pearl') {
      const p = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      p.addColorStop(0, 'rgba(255,170,230,0.45)'); p.addColorStop(0.5, 'rgba(255,255,255,0.05)'); p.addColorStop(1, 'rgba(120,200,255,0.45)');
      g.fillStyle = p; g.fillRect(0, 0, w, h);
    }
    if (finish !== 'matte') { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(cx - 15, cy - 19, finish === 'gloss' ? 9 : 6, finish === 'gloss' ? 5 : 3, -0.7, 0, Math.PI * 2); g.fill(); }
    g.restore();
  });
}

// Een velg van voren: band, velg met de stijl (spaken, gaas, schijf, ster), naaf. size: s | m | l; tire: standard | lowprofile | whitewall | offroad.
export function rimPicture(style, color, size = 'm', tire = 'standard') {
  const col = hex(color, '#b9b7ad');
  return url(`r|${style}|${col}|${size}|${tire}`, 96, 96, (g, w, h) => {
    const cx = w / 2, cy = h / 2, R = 42;
    g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, R + 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = shade(INK, 1.6); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    if (tire === 'whitewall') { g.strokeStyle = PAPER; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R * 0.8, 0, Math.PI * 2); g.stroke(); }
    if (tire === 'offroad') { g.fillStyle = shade(PAPER, 0.35); for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; g.fillRect(cx + Math.cos(a) * (R - 3) - 2, cy + Math.sin(a) * (R - 3) - 2, 4, 4); } }
    const ratio = ({ s: 0.56, m: 0.66, l: 0.78 }[size] || 0.66) + (tire === 'lowprofile' ? 0.06 : 0);
    const rr = R * ratio;
    g.fillStyle = style === 'disc' ? col : shade(col, 0.45); g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col; g.lineCap = 'round';
    const spokes = (n, lw) => { g.lineWidth = lw; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rr * 0.95, cy + Math.sin(a) * rr * 0.95); g.stroke(); } };
    if (style === 'spoke') spokes(10, 2.5);
    else if (style === 'mesh') { spokes(10, 1.5); g.lineWidth = 1.5; for (const f of [0.55, 0.8]) { g.beginPath(); g.arc(cx, cy, rr * f, 0, Math.PI * 2); g.stroke(); } }
    else if (style === 'star') spokes(5, 7);
    else if (style === 'twist') { g.lineWidth = 3; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a + 0.6) * rr * 0.6, cy + Math.sin(a + 0.6) * rr * 0.6, cx + Math.cos(a) * rr * 0.95, cy + Math.sin(a) * rr * 0.95); g.stroke(); } }
    else if (style === 'dish') { g.fillStyle = shade(col, 0.85); g.beginPath(); g.arc(cx, cy, rr * 0.8, 0, Math.PI * 2); g.fill(); g.fillStyle = PAPER; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.fillRect(cx + Math.cos(a) * rr * 0.68 - 1.5, cy + Math.sin(a) * rr * 0.68 - 1.5, 3, 3); } }
    else if (style === 'stock') { g.strokeStyle = shade(col, 0.7); spokes(5, 5); }
    g.fillStyle = style === 'disc' ? shade(col, 0.6) : shade(PAPER, 0.45); g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
  });
}

// Een sticker als echte preview (dezelfde tekening als op de auto).
export function decalPicture(id) {
  return url(`d|${id}`, 128, 48, (g) => { g.fillStyle = PAPER; g.fillRect(0, 0, 128, 48); drawDecalPreview(g, id, 0, 0, 128, 48); });
}

// Een autootje van boven met de strepen erop (racestrepen, zijband, motorkap, dubbele band).
export function stripePicture(stripe, color, body = '#2e5f9e') {
  const col = hex(color, PAPER), b = hex(body, '#2e5f9e');
  return url(`s|${stripe}|${col}|${b}`, 128, 56, (g) => {
    g.fillStyle = b; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.roundRect ? g.roundRect(8, 10, 112, 36, 10) : g.rect(8, 10, 112, 36); g.fill(); g.stroke();
    g.fillStyle = shade(b, 0.55); g.fillRect(44, 14, 34, 28);
    g.fillStyle = col;
    if (stripe === 'racing') { g.fillRect(10, 24, 108, 3); g.fillRect(10, 30, 108, 3); }
    else if (stripe === 'flank') g.fillRect(14, 12, 100, 5);
    else if (stripe === 'duo') { g.fillRect(14, 12, 100, 2); g.fillRect(14, 16, 100, 2); }
    else if (stripe === 'hood') g.fillRect(80, 22, 38, 12);
    else if (stripe === 'checker') for (let k = 0; k < 14; k++) for (let j = 0; j < 2; j++) { g.fillStyle = (k + j) % 2 ? INK : col; g.fillRect(14 + k * 7, 12 + j * 4, 7, 4); }
  });
}
export const tileCacheSize = () => cache.size;
