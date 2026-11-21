import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { fieldsFor, lookKind, sanitizeLook } from './vehiclelook.js';
import { forgetWheelPool } from './wheelinstances3d.js';
import { glowBudget, MAX_GLOW_VISIBLE } from './tuningworld.js';

// Het beeld van de uiterlijk-tuning (epic Autotuning, #1155): vehiclelook.js zegt wat er op zit, dit bouwt
// het op een gebouwd voertuigmodel (models3d_vehicles.js roept applyVehicleLook aan aan het eind van buildVehicleMesh).
//
// Budget per gepimpte auto: HOOGSTENS 1 extra drawcall voor alles wat op de romp zit (spoiler, kit, strepen,
// stickers, dakdrager, uitlaat, hanger: één samengevoegde geometrie met vertexkleuren en één gedeelde atlas-
// textuur voor stickers), +1 voor de underglow (alleen 's nachts zichtbaar, emissief vlak zonder echte lichten),
// +1 voor een eigen nummerbord. Velgen en banden kosten niets: de wielen krijgen een andere gedeelde geometrie.
// De geometrieën zitten in een begrensde cache (LRU, 48) en zijn 'shared': scene3d.disposeObject laat ze staan;
// een verdrongen geometrie geeft alleen zijn GPU-buffer terug en wordt bij het volgende tekenen opnieuw geladen.

const SHARED = (o) => { o.userData = o.userData || {}; o.userData.shared = true; return o; };
const DARK = 0x1f2022, CHROME = 0xb9bcc0, TIRE = 0x1b1b1c;
const H = (n) => '#' + n.toString(16).padStart(6, '0'); // een kleurgetal als canvaskleur
const WHITE_PX = 16; // de effen witte hoek van de atlas: effen delen wijzen daarheen met hun uv

// --- de cache -------------------------------------------------------------------------------------
const CACHE_MAX = 48;
const cache = new Map();
function cached(key, build) {
  let g = cache.get(key);
  if (g) { cache.delete(key); cache.set(key, g); return g; }
  g = SHARED(build());
  cache.set(key, g);
  if (cache.size > CACHE_MAX) { const [k, old] = cache.entries().next().value; cache.delete(k); old.dispose(); forgetWheelPool(old); }
  return g;
}
export const lookCacheSize = () => cache.size;
export function clearLookCache() { for (const g of cache.values()) { g.dispose(); forgetWheelPool(g); } cache.clear(); }

// --- de atlas voor stickers -------------------------------------------------------------------------
// 512x640: links boven een effen wit blokje, daaronder 2x4 cellen van 256x96 met de stickers en onderaan de zes
// belettering-namen van de snackwagen (512x36 per naam).
export const DECAL_CELLS = { frituur: 0, kwark: 1, wiebel: 2, grunn: 3, rally: 4, vlam: 5, ster: 6 };
const CELL_W = 256, CELL_H = 96, CELL_Y0 = 32, ATLAS_W = 512, ATLAS_H = 704, NAME_Y0 = 416, NAME_H = 36;
export const SNACK_NAMES = { tamtes: ['TAM & TES', H(0xf9c80e), H(0x1d1b17)], zonnedijk: ['FRITUUR ZONNEDIJK', H(0xf9c80e), H(0xb3261e)], kwark: ['KWARKBAKKIE', H(0xf3ead3), H(0x2e5f9e)], eierbal: ['EIERBAL EXPRESS', H(0xd8641c), H(0xf3ead3)], vethap: ['DE VETTE HAP', H(0x1d1b17), H(0xf9c80e)], knabbel: ['KNABBEL EN BABBEL', H(0x0e6b3c), H(0xf3ead3)], tammo: ["TAMMO'S FRIET", H(0x4fb3ff), H(0x1d1b17)] };
let atlas = null;
function drawDecal(g, id, x, y) {
  const w = CELL_W, h = CELL_H;
  const band = (bg, fg, text, size = 34) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(x + 4, y + 6, w - 8, h - 12, 14) : g.rect(x + 4, y + 6, w - 8, h - 12); g.fill();
    g.fillStyle = fg; g.font = `bold ${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x + w / 2, y + h / 2 + 2, w - 28);
  };
  if (id === 'frituur') { band(H(0xf9c80e), H(0xb3261e), 'FRITUUR', 40); g.fillStyle = H(0x1d1b17); g.font = 'bold 18px sans-serif'; g.fillText('ZONNEDIJK', x + w / 2, y + h - 18); }
  else if (id === 'kwark') { band(H(0xf3ead3), H(0x2e5f9e), 'KWARK RACING', 32); g.fillStyle = H(0x1d1b17); for (let i = 0; i < 8; i++) g.fillRect(x + 12 + i * 29, y + 10, 14, 8); }
  else if (id === 'wiebel') band(H(0x1d1b17), H(0xf9c80e), 'WIEBELWERK', 34);
  else if (id === 'grunn') band(H(0x0e6b3c), H(0xf3ead3), 'GRUNN DRIFT', 36);
  else if (id === 'rally') band(H(0xd8641c), H(0xf3ead3), 'OMMELANDEN', 32);
  else if (id === 'vlam') {
    g.fillStyle = H(0xff9a62);
    g.beginPath(); g.moveTo(x + 4, y + h - 10);
    for (let i = 0; i < 6; i++) { g.lineTo(x + 4 + i * 42 + 20, y + 12 + (i % 2) * 18); g.lineTo(x + 4 + i * 42 + 42, y + h - 10); }
    g.closePath(); g.fill();
    g.fillStyle = H(0xf9c80e); g.beginPath(); g.moveTo(x + 24, y + h - 10);
    for (let i = 0; i < 5; i++) { g.lineTo(x + 24 + i * 42 + 18, y + 40 + (i % 2) * 10); g.lineTo(x + 24 + i * 42 + 40, y + h - 10); }
    g.closePath(); g.fill();
  } else if (id === 'ster') {
    g.fillStyle = H(0xf3ead3);
    for (let i = 0; i < 7; i++) {
      const cx = x + 20 + i * 36, cy = y + h / 2 + (i % 2 ? 8 : -8);
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 : 14; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fill();
    }
  }
}
function getAtlas() {
  if (atlas || typeof document === 'undefined') return atlas;
  const c = document.createElement('canvas');
  c.width = ATLAS_W; c.height = ATLAS_H;
  const g = c.getContext('2d');
  g.fillStyle = H(0xffffff); g.fillRect(0, 0, WHITE_PX, WHITE_PX);
  for (const [id, i] of Object.entries(DECAL_CELLS)) drawDecal(g, id, (i % 2) * CELL_W, CELL_Y0 + Math.floor(i / 2) * CELL_H);
  Object.values(SNACK_NAMES).forEach(([text, bg, fg], i) => {
    const y = NAME_Y0 + i * NAME_H;
    g.fillStyle = bg; g.fillRect(2, y + 2, ATLAS_W - 4, NAME_H - 4);
    g.fillStyle = fg; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, ATLAS_W / 2, y + NAME_H / 2 + 1, ATLAS_W - 24);
  });
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  atlas.userData = { shared: true };
  return atlas;
}
let addonMat = null;
function addonMaterial() {
  if (addonMat) return addonMat;
  addonMat = SHARED(new THREE.MeshLambertMaterial({ vertexColors: true, map: getAtlas(), alphaTest: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  return addonMat;
}
let glowMat = null, glowTex = null;
function glowMaterial() {
  if (glowMat) return glowMat;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
    glowTex.userData = { shared: true };
  }
  glowMat = SHARED(new THREE.MeshBasicMaterial({ vertexColors: true, map: glowTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
  return glowMat;
}

// --- een kleine geometrie-opbouwer: dozen en platte vlakken met vertexkleur --------------------------------
class Acc {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
  tri(a, b, c, nrm, col, ua, ub, uc) {
    for (const [v, uv] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(nrm[0], nrm[1], nrm[2]); this.c.push(col[0], col[1], col[2]); this.u.push(uv[0], uv[1]); }
  }
  quad(a, b, c, d, nrm, col, uv) { // a b c d tegen de klok in gezien van buiten
    const [u0, v0, u1, v1] = uv || [0, 0, 0, 0];
    this.tri(a, b, c, nrm, col, [u0, v0], [u1, v0], [u1, v1]);
    this.tri(a, c, d, nrm, col, [u0, v0], [u1, v1], [u0, v1]);
  }
  box(cx, cy, cz, sx, sy, sz, hex, uv) {
    const col = hexRgb(hex), x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const w = uv || WHITE_UV;
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, w);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, w);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], col, w);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col, w);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, w);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, w);
  }
  // een sticker op een zijvlak; side +1 = rechterflank (z positief), -1 = linkerflank; de tekst leest van buiten naar voren
  decal(cx, cy, z, w, h, side, cell, name = false) {
    const u0 = name ? 0 : (cell % 2) * CELL_W / ATLAS_W, u1 = name ? 1 : u0 + CELL_W / ATLAS_W;
    const top = name ? NAME_Y0 + cell * NAME_H : CELL_Y0 + Math.floor(cell / 2) * CELL_H, hh = name ? NAME_H : CELL_H;
    const vTop = 1 - top / ATLAS_H, vBot = vTop - hh / ATLAS_H;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, white = [1, 1, 1];
    if (side > 0) this.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1], white, [u0, vBot, u1, vTop]);
    else this.quad([x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], [0, 0, -1], white, [u0, vBot, u1, vTop]);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    return g;
  }
  get triangles() { return this.p.length / 9; }
}
const WHITE_UV = [4 / ATLAS_W, 1 - 4 / ATLAS_H, 4 / ATLAS_W, 1 - 4 / ATLAS_H];
function hexRgb(hex) {
  const n = typeof hex === 'string' ? parseInt(hex.slice(1), 16) : hex;
  const c = new THREE.Color(n); // sRGB naar de werkruimte, net als de wereldmaterialen
  return [c.r, c.g, c.b];
}
const hexNum = (s) => (typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s) ? parseInt(s.slice(1), 16) : null);
const shade = (hex, k) => { const r = (hex >> 16 & 255) * k, g = (hex >> 8 & 255) * k, b = (hex & 255) * k; return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b); };

// --- de plaats van de onderdelen op de romp ----------------------------------------------------------
// fit = carBodyFit(v) voor personenauto's; anders een schatting uit de afmetingen (frietwagen, bus, boot).
function fitOf(v, fit, H) {
  const L = v.model.len || 4;
  if (fit) return { ...fit, deck: fit.deck ?? fit.belt, hood: fit.hood ?? fit.belt - 0.1, fw: fit.fw ?? L / 2 - 0.85, rw: fit.rw ?? -L / 2 + 0.95, car: true };
  return { belt: H * 0.55, roof: H, hood: H * 0.55, deck: H * 0.55, xA: L / 2 - 0.5, xB: L / 4, xC: -L / 4, xD: -L / 2 + 0.3, fw: L / 2 - 0.9, rw: -L / 2 + 1.0, car: false };
}

// De bouwstenen van één look; geeft een Acc met dozen en stickers (alles in lokale voertuigcoördinaten, +x vooruit).
export function buildAddons(look, kind, v, fit, H = 1.6) {
  const L = v.model.len || 4, W = v.model.wid || 1.8, hl = L / 2, hw = W / 2;
  const f = fitOf(v, fit, H);
  const body = hexNum(v.model.color) ?? 0x9aa3ad;
  const c2 = hexNum(look.color2);
  const accent = c2 ?? DARK;
  const A = new Acc();
  const can = new Set(fieldsFor(kind));
  const has = (field) => can.has(field) && look[field];
  // strepen: banen die de ruiten overslaan, op 1 cm van het plaatwerk
  if (has('stripe')) {
    const col = c2 ?? 0xf3ead3, t = 0.014;
    if (look.stripe === 'racing' && f.car) {
      for (const z of [-0.17, 0.17]) {
        A.box((f.xA + hl) / 2, f.hood + t, z, hl - f.xA - 0.05, 0.012, 0.2, col);
        A.box((f.xB + f.xC) / 2, f.roof + t, z, f.xB - f.xC, 0.012, 0.2, col);
        A.box((f.xD - hl) / 2, f.deck + t, z, f.xD + hl - 0.05, 0.012, 0.2, col);
      }
    } else if (look.stripe === 'hood' && f.car) {
      A.box((f.xA + hl) / 2, f.hood + t, 0, hl - f.xA - 0.05, 0.012, 0.5, col);
    } else if (look.stripe === 'flank' || look.stripe === 'duo' || !f.car) {
      const y0 = f.belt * 0.55;
      const bands = look.stripe === 'duo' ? [[y0 - 0.1, 0.07], [y0 + 0.06, 0.07]] : [[y0, 0.16]];
      for (const s of [1, -1]) for (const [y, h] of bands) A.box(0, y, s * (hw + 0.006), L * 0.74, h, 0.012, col);
    }
  }
  if (has('decal')) {
    const cell = DECAL_CELLS[look.decal];
    if (cell !== undefined) { const w = Math.min(1.7, L * 0.4); for (const s of kind === 'snackwagen' ? [-1] : [1, -1]) A.decal(-L * 0.05, f.belt * 0.62, s * (hw + 0.012), w, w * CELL_H / CELL_W, s, cell); }
  }
  if (f.car && has('spoiler')) {
    const y = f.deck, x = -hl + 0.2;
    if (look.spoiler === 'lip') A.box(-hl + 0.08, y + 0.05, 0, 0.16, 0.05, W * 0.78, accent);
    else {
      const h = look.spoiler === 'gt' ? 0.42 : 0.26;
      for (const z of [-W * 0.3, W * 0.3]) A.box(x, y + h / 2, z, 0.06, h, 0.06, DARK);
      A.box(x, y + h + 0.02, 0, 0.34, 0.05, W * 0.92, accent);
      if (look.spoiler === 'gt') for (const z of [-W * 0.46, W * 0.46]) A.box(x, y + h, z, 0.34, 0.14, 0.03, accent);
    }
  }
  if (f.car && has('kit')) {
    const kit = look.kit === 'wide' ? body : accent;
    A.box(hl - 0.04, 0.2, 0, 0.3, 0.08, W * 0.96, DARK);
    for (const s of [1, -1]) A.box((f.fw + f.rw) / 2, 0.22, s * (hw + 0.012), (f.fw - f.rw) - 0.9, 0.12, 0.05, kit);
    if (look.kit === 'wide') for (const s of [1, -1]) for (const x of [f.fw, f.rw]) A.box(x, 0.56, s * (hw + 0.04), 1.05, 0.2, 0.1, shade(body, 0.85));
  }
  if (f.car && has('diffuser') && look.diffuser === 'on') {
    A.box(-hl + 0.12, 0.17, 0, 0.5, 0.05, W * 0.7, DARK);
    for (let k = -2; k <= 2; k++) A.box(-hl + 0.1, 0.2, k * W * 0.15, 0.4, 0.12, 0.03, DARK);
  }
  if (f.car && has('roof')) {
    const cx = (f.xB + f.xC) / 2, len = Math.max(0.8, (f.xB - f.xC) * 0.9);
    if (look.roof === 'rack') {
      for (const z of [-W * 0.38, W * 0.38]) A.box(cx, f.roof + 0.07, z, len, 0.04, 0.04, DARK);
      for (const x of [cx - len * 0.38, cx + len * 0.38]) A.box(x, f.roof + 0.1, 0, 0.05, 0.04, W * 0.82, DARK);
      for (const z of [-W * 0.38, W * 0.38]) for (const x of [cx - len * 0.38, cx + len * 0.38]) A.box(x, f.roof + 0.04, z, 0.06, 0.06, 0.06, DARK);
    } else if (look.roof === 'box') {
      A.box(cx, f.roof + 0.2, 0, len * 0.95, 0.26, W * 0.64, c2 ?? 0x2a2b2d);
      A.box(cx, f.roof + 0.04, 0, len * 0.6, 0.06, W * 0.5, DARK);
    }
  }
  if (has('exhaust')) {
    const x = -hl - 0.04, y = 0.3;
    if (look.exhaust === 'twin') for (const z of [-0.5, 0.5]) A.box(x, y, z, 0.14, 0.1, 0.1, CHROME);
    else if (look.exhaust === 'big') A.box(x, y, 0.55, 0.22, 0.15, 0.15, CHROME);
    else if (look.exhaust === 'side') for (const s of [1, -1]) A.box(0, 0.2, s * (hw + 0.03), (f.fw - f.rw) * 0.8, 0.07, 0.07, CHROME);
  }
  if (f.car && has('lamps')) {
    const col = hexNum(look.lampColor) ?? 0xf2efe4, y = f.hood - 0.12, x = hl + 0.018;
    for (const s of [1, -1]) {
      const z = s * hw * 0.62;
      if (look.lamps === 'halo') { A.box(x, y, z, 0.03, 0.2, 0.2, col); A.box(x + 0.01, y, z, 0.02, 0.12, 0.12, shade(col, 0.4)); }
      else if (look.lamps === 'slit') A.box(x, y + 0.03, z, 0.03, 0.06, 0.34, col);
      else A.box(x, y, z, 0.03, 0.14, 0.3, col);
    }
  } else if (f.car && has('lampColor')) {
    const col = hexNum(look.lampColor);
    for (const s of [1, -1]) A.box(hl + 0.016, f.hood - 0.12, s * hw * 0.62, 0.03, 0.1, 0.22, col);
  }
  if (f.car && has('hanger')) {
    const col = { dice: 0xf3ead3, tree: 0x3fc97a, flag: 0xd93f3f }[look.hanger] || 0xf3ead3;
    A.box(f.xA - 0.45, f.roof - 0.34, 0.1, 0.05, 0.14, 0.05, col);
  }
  if (kind === 'snackwagen') snackParts(A, look, v, f, c2);
  return A;
}

// De snackwagen: luifel (over de bestaande heen), uitstalling aan de serveerkant (+z), belettering aan de andere kant.
// De maten volgen buildFoodtruckMesh (models3d_vehicles.js): luifel van x0 tot x1 op 1,98 m, helling 0,5 rad om x.
function snackParts(A, look, v, f, c2) {
  const L = v.model.len || 5, W = v.model.wid || 2, hl = L / 2, hw = W / 2;
  const x0 = -hl + 0.55, x1 = hl - 1.45, cx = (x0 + x1) / 2, cl = x1 - x0;
  const AWN = { zon: [0xf9c80e, 0xf3ead3], bos: [0x0e6b3c, 0xf3ead3], roze: [0xe8505b, 0xf3ead3] };
  if (AWN[look.awning]) for (let i = 0; i < 6; i++) A.rotBox(x0 + (cl * (i + 0.5)) / 6, 2.0, hw + 0.42, cl / 6, 0.03, 0.9, AWN[look.awning][i % 2], 0.5, 'x');
  if (look.display === 'bord') {
    for (const s of [1, -1]) A.rotBox(cx + 0.3, 0.42, hw + 1.15 + s * 0.12, 0.6, 0.82, 0.03, s > 0 ? 0x1d1b17 : 0x8a5a2b, -s * 0.22, 'x');
    A.box(cx + 0.3, 0.55, hw + 1.265, 0.4, 0.04, 0.012, 0xf3ead3);
  } else if (look.display === 'tafel') {
    const z = hw + 1.5;
    A.box(cx, 0.74, z, 1.0, 0.04, 0.6, 0xd8c9a0);
    for (const dx of [-0.42, 0.42]) for (const dz of [-0.24, 0.24]) A.box(cx + dx, 0.36, z + dz, 0.04, 0.72, 0.04, 0x2a2b2d);
    for (const dx of [-0.3, 0.3]) { A.box(cx + dx, 0.45, z + 0.62, 0.3, 0.04, 0.3, 0xb8742c); A.box(cx + dx, 0.22, z + 0.62, 0.05, 0.44, 0.05, 0x2a2b2d); }
    A.box(cx - 0.15, 0.8, z, 0.2, 0.08, 0.15, 0xc9852e); A.box(cx + 0.2, 0.8, z, 0.18, 0.08, 0.14, 0xe8c24a);
  } else if (look.display === 'vlaggen') {
    const cols = [0xd93f3f, 0xf3ead3, 0x4fb3ff, 0xf9c80e];
    for (let i = 0; i < 12; i++) A.rotBox(x0 + (cl * (i + 0.5)) / 12, 1.62 - Math.sin((i / 11) * Math.PI) * 0.05, hw + 0.95, 0.12, 0.18, 0.01, cols[i % 4], 0.05, 'x');
  }
  const sname = look.snackName ?? 'tamtes'; // TAM & TES is de standaardbelettering van de snackwagen
  if (SNACK_ORDER.includes(sname)) {
    const w = Math.min(3.4, L * 0.62);
    A.decal(-0.2, f.belt * 0.62 + 0.15, -(hw + 0.016), w, w * NAME_H / ATLAS_W, -1, SNACK_ORDER.indexOf(sname), true);
  }
}
const SNACK_ORDER = Object.keys(SNACK_NAMES);

// De lampen die zelf licht geven (bakkenlicht en lampjesrand): ongeschaduwd, hun eigen drawcall, alleen bij een snackwagen met bakkenlicht.
export function buildLamps(look, kind, v, H = 2.1) {
  const A = new Acc();
  if (kind !== 'snackwagen' || !look.beacon) return A;
  const L = v.model.len || 5, W = v.model.wid || 2, hl = L / 2, hw = W / 2;
  const warm = hexNum(look.lampColor) ?? 0xffa63a;
  if (look.beacon === 'bak') {
    A.box(hl - 0.5, H + 0.12, 0, 0.55, 0.08, 0.45, 0x2a2b2d);
    A.box(hl - 0.5, H + 0.3, 0, 0.5, 0.28, 0.4, warm);
    A.box(hl - 0.5, H + 0.5, 0, 0.1, 0.1, 0.1, 0xffd27a);
  } else if (look.beacon === 'ring') {
    for (const s of [1, -1]) for (let i = 0; i < 10; i++) A.box(-hl + 0.4 + (i * (L - 1.4)) / 9, H + 0.04, s * (hw - 0.14), 0.08, 0.08, 0.08, warm);
  }
  return A;
}

// De wielen: een velg-geometrie per (stijl, maat, band, kleur) en wielgrootte, in dezelfde as als carWheelGeometry (z).
const RIM_RATIO = { s: 0.56, m: 0.64, l: 0.74 };
export function buildRimGeometry(r, w, look) {
  const A = new Acc();
  const ratio = (RIM_RATIO[look.rimSize || 'm'] ?? 0.64) + (look.tire === 'lowprofile' ? 0.06 : 0);
  const rimCol = hexNum(look.rimColor) ?? 0x9ea2a6;
  const ring = (rr, width, hex, seg = 12) => cylinderAcc(A, rr, width, hex, seg);
  ring(r, w, TIRE);
  if (look.tire === 'whitewall') ring(r * (ratio + 0.16), w + 0.004, 0xf3ead3, 14);
  if (look.tire === 'offroad') for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; A.rotBox(Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.96, 0, 0.07, 0.05, w + 0.01, 0x2f2c27, a); }
  const style = look.rimStyle || 'stock';
  ring(r * ratio, w + 0.02, style === 'disc' ? rimCol : shade(rimCol, 0.45), 12);
  const spokes = (n, len, thick, hex) => { for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; A.rotBox(Math.cos(a) * r * ratio * 0.5, Math.sin(a) * r * ratio * 0.5, 0, len, thick, w + 0.035, hex, a); } };
  if (style === 'spoke') spokes(10, r * ratio * 0.95, r * 0.05, rimCol);
  else if (style === 'mesh') { spokes(10, r * ratio * 0.95, r * 0.035, rimCol); ring(r * ratio * 0.97, w + 0.03, shade(rimCol, 0.8), 10); ring(r * ratio * 0.82, w + 0.035, shade(rimCol, 0.45), 10); spokes(10, r * ratio * 0.95, r * 0.035, rimCol); }
  else if (style === 'star') spokes(5, r * ratio * 0.98, r * 0.15, rimCol);
  else if (style === 'stock') spokes(5, r * ratio * 0.8, r * 0.13, shade(rimCol, 0.7));
  ring(r * 0.16, w + 0.05, style === 'disc' ? shade(rimCol, 0.6) : 0x6a6d70, 6);
  return A.geometry();
}
function cylinderAcc(A, r, w, hex, seg) { // schijf met de as langs z, naar dezelfde driehoeken als CylinderGeometry maar vlak geschaduwd
  const col = hexRgb(hex), z0 = -w / 2, z1 = w / 2;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
    const p0 = [Math.cos(a0) * r, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, Math.sin(a1) * r];
    A.quad([p0[0], p0[1], z0], [p1[0], p1[1], z0], [p1[0], p1[1], z1], [p0[0], p0[1], z1], [Math.cos(am), Math.sin(am), 0], col, WHITE_UV);
    A.tri([0, 0, z1], [p0[0], p0[1], z1], [p1[0], p1[1], z1], [0, 0, 1], col, [WHITE_UV[0], WHITE_UV[1]], [WHITE_UV[0], WHITE_UV[1]], [WHITE_UV[0], WHITE_UV[1]]);
    A.tri([0, 0, z0], [p1[0], p1[1], z0], [p0[0], p0[1], z0], [0, 0, -1], col, [WHITE_UV[0], WHITE_UV[1]], [WHITE_UV[0], WHITE_UV[1]], [WHITE_UV[0], WHITE_UV[1]]);
  }
}
// een doos gedraaid om z (voor spaken), lokaal langs x gelegd
Acc.prototype.rotBox = function rotBox(cx, cy, cz, sx, sy, sz, hex, a, axis = 'z') {
  const col = hexRgb(hex), ca = Math.cos(a), sa = Math.sin(a), hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const rot = axis === 'x' ? (x, y, z) => [x, y * ca - z * sa, y * sa + z * ca] : (x, y, z) => [x * ca - y * sa, x * sa + y * ca, z];
  const P = (x, y, z) => { const r = rot(x, y, z); return [cx + r[0], cy + r[1], cz + r[2]]; };
  const N = (x, y, z) => rot(x, y, z);
  const faces = [
    [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [1, 0, 0]], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-1, 0, 0]],
    [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], [0, 1, 0]], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [0, -1, 0]],
    [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1]], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [0, 0, -1]],
  ];
  for (const [a0, b, c, d, n] of faces) this.quad(P(...a0), P(...b), P(...c), P(...d), N(...n), col, WHITE_UV);
};

// --- het nummerbord ------------------------------------------------------------------------------------
const plateMats = new Map();
function plateMaterial(text) {
  let m = plateMats.get(text);
  if (m) return m;
  let map = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = H(0xe3bb1c); g.fillRect(0, 0, 256, 64);
    g.strokeStyle = H(0x1d1b17); g.lineWidth = 4; g.strokeRect(2, 2, 252, 60);
    g.fillStyle = H(0x1d1b17); g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 34, 236);
    map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.userData = { shared: true };
  }
  m = SHARED(new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : 0xe3bb1c, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
  if (plateMats.size >= 12) { const k = plateMats.keys().next().value; const old = plateMats.get(k); if (old.map) old.map.dispose(); old.dispose(); plateMats.delete(k); }
  plateMats.set(text, m);
  return m;
}

// --- de lucht rond de snackwagen: dampwolkjes, geur en bijtjes als puntjes (een drawcall, alleen als gekozen) -------------------
let lampMat = null;
function lampMaterial() { return lampMat || (lampMat = SHARED(new THREE.MeshBasicMaterial({ vertexColors: true }))); }
let dotTex = null;
const airMats = {};
function airMaterial(kind) {
  if (airMats[kind]) return airMats[kind];
  if (!dotTex && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = H(0xffffff); g.beginPath(); g.arc(16, 16, 15, 0, Math.PI * 2); g.fill();
    dotTex = new THREE.CanvasTexture(c);
    dotTex.userData = { shared: true };
  }
  const o = { damp: { color: 0xd6d6d0, size: 0.55, opacity: 0.45 }, geur: { color: 0xffb04a, size: 0.3, opacity: 0.5 }, bijtjes: { color: 0xf2c230, size: 0.09, opacity: 1 } }[kind];
  airMats[kind] = SHARED(new THREE.PointsMaterial({ ...o, map: dotTex, transparent: true, depthWrite: false, alphaTest: 0.02, sizeAttenuation: true }));
  return airMats[kind];
}
const AIR_COUNT = { damp: 6, geur: 8, bijtjes: 5 };
function buildAir(kind, v) {
  if (!AIR_COUNT[kind]) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(AIR_COUNT[kind] * 3), 3));
  const pts = new THREE.Points(g, airMaterial(kind));
  pts.frustumCulled = false;
  pts.userData = { air: kind, L: v.model.len || 5, W: v.model.wid || 2 };
  pts.name = 'lookAir';
  placeAir(pts, 0);
  return pts;
}
function placeAir(pts, t) {
  const { air, L, W } = pts.userData, a = pts.geometry.attributes.position, n = a.count, hw = W / 2, hl = L / 2;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.35 + i / n) % 1;
    if (air === 'damp') a.setXYZ(i, -hl + 0.7 + Math.sin(t + i) * 0.1, 2.35 + ph * 1.4, -hw * 0.45 + Math.cos(t * 0.7 + i) * 0.12);
    else if (air === 'geur') a.setXYZ(i, -0.3 + (i / n - 0.5) * 2.2, 1.4 + Math.sin(ph * Math.PI) * 0.5, hw + 0.4 + ph * 2.4);
    else a.setXYZ(i, Math.cos(t * 1.7 + i * 1.3) * 0.9, 0.9 + Math.sin(t * 2.3 + i) * 0.35, hw + 1.1 + Math.sin(t * 1.7 + i * 1.3) * 0.7);
  }
  a.needsUpdate = true;
}

// --- aanbrengen ------------------------------------------------------------------------------------------
// De afwerking: vlakke eigenschappen op de rompmaterialen van dit ene voertuig (de materialen zijn per voertuig).
const FINISH = {
  metallic: { metalness: 0.55, roughness: 0.3, envMapIntensity: 1.2 },
  pearl: { metalness: 0.4, roughness: 0.2, envMapIntensity: 1.5 },
  matte: { metalness: 0, roughness: 0.97, envMapIntensity: 0 },
};
const TINT = [0.62, 0.78, 0.9, 0.97];

function applyFinish(group, look) {
  const body = group.userData.body;
  const mats = body && Array.isArray(body.material) ? body.material : null;
  if (!mats) return;
  if (look.finish && FINISH[look.finish] && mats[0] && mats[0].isMeshStandardMaterial) {
    const base = mats[0];
    const rubberMat = base.clone(); // de banden delen de lakmaterialen: die houden hun matte rubber
    for (const w of group.userData.wheels || []) if (w.material === base) w.material = rubberMat;
    Object.assign(base, FINISH[look.finish]);
    if (look.finish === 'pearl') base.color.setRGB(0.96, 0.94, 1);
    base.needsUpdate = true;
  }
  const t = look.tint != null ? Number(look.tint) : 0;
  if (t > 0 && mats[1] && mats[1].transparent) {
    mats[1].opacity = TINT[t] ?? mats[1].opacity;
    mats[1].color.setScalar(1 - 0.22 * t);
    mats[1].needsUpdate = true;
  }
}

function applyRims(group, look, kind) {
  const rolls = group.userData.wheels, r = group.userData.wheelRadius;
  if (!rolls || !rolls.length || !r) return;
  const can = new Set(fieldsFor(kind));
  const wl = {};
  for (const f of ['rimStyle', 'rimColor', 'rimSize', 'tire']) if (can.has(f) && look[f]) wl[f] = look[f];
  if (!Object.keys(wl).length) return;
  const sig = [r.toFixed(3), wl.rimStyle || '', wl.rimColor || '', wl.rimSize || '', wl.tire || ''].join('|');
  for (const w of rolls) {
    const old = w.geometry;
    if (!old.boundingBox) old.computeBoundingBox();
    const width = Math.max(0.1, old.boundingBox.max.z - old.boundingBox.min.z - 0.04);
    w.geometry = cached('wheel|' + sig + '|' + width.toFixed(3), () => buildRimGeometry(r, width, wl));
  }
  const caps = group.userData.loose && group.userData.loose.sierdoppen;
  if (caps && wl.rimStyle && wl.rimStyle !== 'stock') caps.visible = false;
}

// Zet de look op een gebouwd voertuigmodel; geeft het aantal extra drawcalls. Het model blijft heel bij een fout.
export function applyVehicleLook(group, v, fit = null) {
  const kind = lookKind(v) || (v.isHeroCar ? 'auto' : null);
  if (!kind || (!v.look && kind !== 'snackwagen')) return 0;
  const look = sanitizeLook(v.look || {}, kind);
  if (!Object.keys(look).length && kind !== 'snackwagen') return 0;
  const ud = group.userData;
  let calls = 0;
  try {
    const body = ud.body || group;
    if (!body.geometry || !body.geometry.boundingBox) body.geometry && body.geometry.computeBoundingBox && body.geometry.computeBoundingBox();
    const bbMaxY = body.geometry && body.geometry.boundingBox && body.geometry.boundingBox.max ? body.geometry.boundingBox.max.y : NaN;
    const H = Number.isFinite(bbMaxY) && bbMaxY > 0 ? bbMaxY : 1.6; // nooit NaN in de belettering (ook niet bij een model zonder meetbare bounding box)
    applyFinish(group, look);
    applyRims(group, look, kind);
    const key = ['ov', kind, v.model.name || '', v.model.len, v.model.wid, v.model.color, look.finish ? '' : '', lookSig(look)].join('|');
    const geo = cached(key, () => buildAddons(look, kind, v, fit, H).geometry());
    if (geo.attributes.position.count) {
      const mesh = new THREE.Mesh(geo, addonMaterial());
      mesh.name = 'lookOverlay';
      mesh.frustumCulled = true;
      body.add(mesh);
      ud.lookOverlay = mesh;
      calls++;
    }
    const lamps = buildLamps(look, kind, v, H);
    if (lamps.triangles) {
      const lm = new THREE.Mesh(cached(['lm', v.model.len, v.model.wid, look.beacon, look.lampColor || ''].join('|'), () => lamps.geometry()), lampMaterial());
      lm.name = 'lookLamps';
      body.add(lm);
      ud.lookLamps = lm;
      calls++;
    }
    if (kind === 'snackwagen' && look.air) { const pts = buildAir(look.air, v); if (pts) { group.add(pts); ud.lookAir = pts; calls++; } }
    if (look.glow && fieldsFor(kind).includes('glow')) {
      const L = v.model.len || 4, W = v.model.wid || 1.8;
      const gk = ['gl', L, W, look.glow].join('|');
      const ggeo = cached(gk, () => {
        const A = new Acc(), c = hexRgb(look.glow), L2 = L * 0.62, W2 = W * 0.64, y = 0.05;
        A.quad([-L2, y, W2], [L2, y, W2], [L2, y, -W2], [-L2, y, -W2], [0, 1, 0], c, [0, 0, 1, 1]);
        return A.geometry();
      });
      const gm = new THREE.Mesh(ggeo, glowMaterial());
      gm.name = 'lookGlow';
      gm.renderOrder = 2;
      gm.visible = false; // alleen 's nachts: updateLookNight
      group.add(gm);
      ud.lookGlow = gm;
      calls++;
    }
    if (look.plate && fieldsFor(kind).includes('plate')) {
      const L = v.model.len || 4;
      const geo2 = cached('plate', () => new THREE.PlaneGeometry(0.5, 0.12));
      const pm = new THREE.Mesh(geo2, plateMaterial(look.plate));
      pm.name = 'lookPlate';
      pm.position.set(-L / 2 - 0.016, 0.42, 0);
      pm.rotation.y = -Math.PI / 2;
      body.add(pm);
      ud.lookPlate = pm;
      calls++;
    }
    ud.lookCalls = calls;
  } catch (e) { /* een fout in de tuning mag het voertuig zelf nooit kosten */ }
  return calls;
}
const lookSig = (l) => Object.keys(l).sort().map((k) => k + ':' + l[k]).join(',');

// Per frame voor een voertuig met een look: de underglow volgt de nacht en de lucht van de snackwagen drijft (alleen dichtbij aanroepen).
export function tickVehicleLook(group, t, night, near = true) {
  const ud = group && group.userData;
  if (!ud) return;
  if (ud.lookGlow) ud.lookGlow.visible = night > 0.3;
  if (ud.lookAir) { ud.lookAir.visible = near; if (near) placeAir(ud.lookAir, t); }
}
// 's nachts aan, overdag uit. Goedkoop genoeg voor elk frame (een vlag zetten).
export function updateLookNight(group, night) {
  const g = group && group.userData && group.userData.lookGlow;
  if (g) g.visible = night > 0.3;
}
// Het aantal driehoeken dat de look toevoegt (voor het budget en de test).
export function addonTriangles(look, kind, v, fit, H = 1.6) { return buildAddons(sanitizeLook(look, kind), kind, v, fit, H).triangles; }

// Elke frame voor alle getekende voertuigen (scene3d.js): de underglow volgt de nacht, hoogstens MAX_GLOW_VISIBLE tegelijk (de dichtstbij,
// het budget van tuningworld.js) en de lucht van een snackwagen alleen dichtbij. meshes: de Map id -> mesh; (fx, fz): het zwaartepunt van de camera.
const _glowList = [];
export function tickVehicleLooks(meshes, fx, fz, night, t) {
  _glowList.length = 0;
  for (const m of meshes.values()) {
    const ud = m.userData;
    if (!ud || (!ud.lookGlow && !ud.lookAir)) continue;
    const d = Math.hypot(m.position.x - fx, m.position.z - fz);
    if (ud.lookGlow) _glowList.push({ id: m, dist: d, glow: true });
    if (ud.lookAir) { const near = d < 45; ud.lookAir.visible = near; if (near) placeAir(ud.lookAir, t); }
  }
  if (!_glowList.length) return;
  const show = glowBudget(_glowList, MAX_GLOW_VISIBLE);
  for (const e of _glowList) e.id.userData.lookGlow.visible = night > 0.3 && show.has(e.id);
}

// Een sticker getekend in een rechthoek van het canvas (voor de keuzetegels, tuningtiles.js): de cel uit de atlas, geschaald.
export function drawDecalPreview(g, id, x, y, w, h) {
  const tmp = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!tmp) return;
  tmp.width = CELL_W; tmp.height = CELL_H;
  drawDecal(tmp.getContext('2d'), id, 0, 0);
  g.drawImage(tmp, x, y, w, h);
}
