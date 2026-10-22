// Zeeschepen (#398): de romp en de opbouw van de low-poly zeeschepen en de sleper. Eén samengevoegde geometrie per
// uitvoering (models3d_vehicles.js bewaart hem onder boatKind|lengte|breedte|kleur|soort), dus een heel scheepje kost
// één tekenaanroep, ook met honderd containers op het dek. Stuurboord is +z, de boeg +x, y is de hoogte boven de waterlijn.
// De vormen leven hier en niet in models3d_vehicles.js, dat al groot genoeg is; de hulpjes en kleuren van dat bestand
// komen als `K` binnen.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix } from './pixelart3d.js';

// Zeeschip (vracht, container, tanker): een lange romp met een rechte steven, een brede spiegel en een gesloten dek.
// t loopt van de spiegel (0) naar de boeg (1), zoals bij de andere rompen.
export const ZEESCHIP_SHAPE = {
  ts: [0, 0.03, 0.08, 0.16, 0.3, 0.5, 0.7, 0.8, 0.88, 0.95, 1],
  f: (t) => (t < 0.12 ? 0.72 + 0.28 * Math.sin((t / 0.12) * Math.PI / 2) : t < 0.7 ? 1 : Math.pow(Math.max(0, Math.cos(((t - 0.7) / 0.3) * Math.PI / 2)), 0.62)),
  top: (t) => 3.4 + 0.25 * Math.max(0, (0.1 - t) / 0.1) + 1.5 * Math.max(0, (t - 0.88) / 0.12) ** 2,
  rise: (t) => Math.max(0, (t - 0.78) / 0.22) * 0.8 + Math.max(0, (0.1 - t) / 0.1) * 0.3,
  chine: -3.3, keel: -4.1, floor: 0.2, deck: true, chineK: 0.9,
};

// Sleper: kort, breed en hoog opgebouwd, met een stompe boeg.
export const SLEPER_SHAPE = {
  ts: [0, 0.05, 0.14, 0.3, 0.55, 0.78, 0.9, 0.97, 1],
  f: (t) => (t < 0.14 ? 0.8 + 0.2 * Math.sin((t / 0.14) * Math.PI / 2) : t < 0.6 ? 1 : Math.pow(Math.max(0, Math.cos(((t - 0.6) / 0.4) * Math.PI / 2)), 0.5)),
  top: (t) => 1.9 + 0.5 * Math.max(0, (t - 0.85) / 0.15) ** 2,
  rise: (t) => Math.max(0, (t - 0.85) / 0.15) * 0.6,
  chine: -1.6, keel: -2.3, floor: 0.2, deck: true, chineK: 0.88,
};

const CONTAINERS = [0xb5412c, 0x2e6fa8, 0x3f8f5a, 0xd9a21b, 0x8a8f94, 0x7a3f8f, 0xc9c4b8, 0x2b4b7a];
const DEKGRIJS = 0x6a6d70, ZWART = 0x2a2a2b, GEEL = 0xd9a21b;
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

const cyl = (B, x, y, z, r, h, color, group = 0) => B.geo(new THREE.CylinderGeometry(r, r, h, 8), composeMatrix(x, y, z, 0, 0, 0), color, group);

// De opbouw achterop: drie lagen met een brug die breder is dan het schip, een schoorsteen en de mast.
function opbouw(B, K, top, L, W, hull, cabin, lengte = 13) {
  const { GLASS, G_GLASS, G_LAMP, NAV_WHITE, NAV_RED, NAV_GREEN, shadeHex } = K;
  const hl = L / 2, x0 = -hl + 2.4 + lengte / 2, wit = cabin;
  B.box(x0, top + 1.5, 0, lengte, 3.0, W * 0.84, wit);
  B.box(x0, top + 1.5, 0, lengte + 0.1, 0.2, W * 0.84 + 0.12, shadeHex(wit, 0.8));
  B.box(x0 + 0.4, top + 4.2, 0, lengte * 0.72, 2.4, W * 0.72, wit);
  for (const s of [1, -1]) B.box(x0 + 0.4, top + 4.4, s * (W * 0.36 + 0.02), lengte * 0.62, 0.8, 0.04, GLASS, G_GLASS);
  // de brug: een glazen band rondom, vleugels tot over de zijkant, een dak dat overhangt
  const bx = x0 + 1.4, bl = 5.4, by = top + 6.7;
  B.box(bx, by, 0, bl, 2.2, W * 0.62, wit);
  B.box(bx + bl / 2 + 0.02, by + 0.1, 0, 0.1, 0.9, W * 0.62 - 0.3, GLASS, G_GLASS);
  for (const s of [1, -1]) {
    B.box(bx + 0.4, by + 0.1, s * (W * 0.31 + 0.02), bl - 1.2, 0.9, 0.06, GLASS, G_GLASS);
    B.box(bx + 0.2, by - 0.6, s * (W * 0.5), 2.4, 0.2, W * 0.5 - W * 0.31 + 0.5, shadeHex(wit, 0.85)); // brugvleugel
    B.box(bx + 0.2, by - 0.15, s * (W * 0.5 + 0.2), 2.4, 0.9, 0.06, wit);
    B.box(bx + 0.2, by + 0.0, s * (W * 0.5 + 0.2), 0.16, 0.16, 0.16, s > 0 ? NAV_GREEN : NAV_RED, G_LAMP);
  }
  B.box(bx, by + 1.2, 0, bl + 0.8, 0.2, W * 0.62 + 0.6, shadeHex(wit, 0.75));
  // mast met radar en toplicht
  B.box(bx - 0.6, by + 2.3, 0, 0.16, 2.2, 0.16, ZWART);
  B.box(bx - 0.6, by + 3.2, 0, 0.6, 0.12, 1.8, ZWART);
  B.box(bx - 0.6, by + 3.5, 0, 0.14, 0.14, 0.14, NAV_WHITE, G_LAMP);
  // schoorsteen achter de brug, in de kleur van de rederij
  const fx = x0 - lengte * 0.28;
  B.box(fx, top + 6.2, 0, 2.8, 4.4, 2.6, shadeHex(hull, 1.0));
  B.box(fx, top + 7.9, 0, 2.9, 0.9, 2.7, 0xe8e6e0);
  B.box(fx, top + 8.55, 0, 2.9, 0.5, 2.7, ZWART);
  // reddingsboot aan stuurboord
  B.box(x0 - 1.2, top + 3.3, W * 0.43 + 0.3, 4.6, 1.0, 1.5, 0xd8572a);
}

// Het voordek: bolders, een lier, een voormast en een boeglicht.
function voordek(B, K, st, top, L, W, hull) {
  const { G_LAMP, NAV_WHITE, hullAt } = K;
  const hl = L / 2;
  B.box(hl - 6, top + 0.5, 0, 2.6, 1.0, 3.0, ZWART);
  for (const s of [1, -1]) {
    const h = hullAt(st, hl - 4);
    B.box(hl - 4, top + 0.35, s * (h.hw - 0.7), 0.5, 0.7, 0.5, ZWART);
    B.box(hl - 12, top + 0.35, s * (hullAt(st, hl - 12).hw - 0.5), 0.5, 0.7, 0.5, ZWART);
  }
  B.box(hl - 9, top + 3.2, 0, 0.2, 6.4, 0.2, ZWART);
  B.box(hl - 9, top + 6.45, 0, 0.18, 0.18, 0.18, NAV_WHITE, G_LAMP);
}

// Reling en randstrook rond het dek.
function rand(B, K, st, top, L, hull) {
  const { shadeHex, hullAt } = K, hl = L / 2;
  for (let x = -hl + 15; x < hl - 2; x += 3) {
    const xm = x + 3, h = hullAt(st, (x + xm) / 2);
    B.box((x + xm) / 2, top + 0.04, 0, 3, 0.08, Math.max(0.5, h.hw * 2 - 0.5), DEKGRIJS);
    for (const s of [1, -1]) B.box((x + xm) / 2, top + 0.45, s * (h.hw - 0.12), 3, 0.9, 0.1, shadeHex(hull, 0.85));
  }
}

function vracht(B, K, st, top, L, W, hull, cabin) {
  const { shadeHex } = K, hl = L / 2;
  const aft = -hl + 17, fore = hl - 15, n = 4, len = (fore - aft) / n;
  B.box((aft + fore) / 2, top + 0.5, 0, fore - aft, 1.0, W - 3.2, shadeHex(hull, 0.7));
  for (let i = 0; i < n; i++) {
    const x = aft + len * (i + 0.5);
    B.box(x, top + 1.1, 0, len - 0.4, 0.3, W - 3.6, shadeHex(hull, 1.25));
    B.box(x, top + 1.3, 0, len - 1.2, 0.12, W - 4.6, shadeHex(hull, 1.1));
  }
  // dekkraan tussen het laadruim en de opbouw
  const cx = aft - 2.2;
  B.box(cx, top + 4.0, W * 0.3, 1.6, 8.0, 1.6, GEEL);
  B.box(cx + 4.2, top + 8.3, W * 0.3, 11, 0.7, 0.9, GEEL, 0, 0, 0, -0.28);
  B.box(cx + 9.4, top + 6.2, W * 0.3, 0.2, 4.0, 0.2, ZWART);
}

function container(B, K, st, top, L, W, hull, cabin, seed) {
  const { hullAt } = K, hl = L / 2;
  const aft = -hl + 17, fore = hl - 6, baai = 6.4, rijen = Math.max(3, Math.floor((W - 2.6) / 2.6)), kolom = 2.6;
  for (let x = aft; x + baai <= fore; x += baai + 0.15) {
    const hw = hullAt(st, x + baai / 2).hw, kan = Math.min(rijen, Math.floor((hw * 2 - 1.4) / kolom));
    const lagen = 2 + Math.floor(hash(seed, x) * 3);
    for (let r = 0; r < kan; r++) {
      const z = (r - (kan - 1) / 2) * kolom, hoog = Math.max(1, lagen - (r === 0 || r === kan - 1 ? Math.floor(hash(x, r) * 2) : 0));
      for (let l = 0; l < hoog; l++) B.box(x + baai / 2, top + 0.2 + 1.3 + l * 2.65, z, baai - 0.15, 2.55, kolom - 0.12, CONTAINERS[Math.floor(hash(x + l * 3, r + seed) * CONTAINERS.length)]);
    }
  }
}

function tanker(B, K, st, top, L, W, hull, cabin) {
  const { shadeHex, hullAt } = K, hl = L / 2;
  const aft = -hl + 17, fore = hl - 10;
  // de lange leiding op steunen, een loopbrug en de domes van de tanks
  B.box((aft + fore) / 2, top + 1.0, 0, fore - aft, 0.5, 0.5, 0x9a9da0);
  B.box((aft + fore) / 2, top + 2.2, 0, fore - aft, 0.12, 1.4, GEEL);
  for (let x = aft + 2; x < fore; x += 6) {
    B.box(x, top + 1.5, 0, 0.3, 3.0, 0.3, ZWART);
    for (const s of [1, -1]) {
      const hw = hullAt(st, x).hw;
      cyl(B, x + 2, top + 0.55, s * (hw * 0.55), 1.15, 1.1, shadeHex(hull, 1.4));
      B.box(x + 2, top + 1.2, s * (hw * 0.55), 0.3, 0.2, 2.4, DEKGRIJS);
    }
  }
  B.box(hl - 16, top + 1.0, 0, 2.2, 2.0, W * 0.5, DEKGRIJS); // het verzamelstuk
}

// De zeeschepen: soort 'vracht', 'container' of 'tanker'.
export function zeeschipFit(B, st, L, W, hull, cabin, soort, K) {
  const { G_LAMP, NAV_WHITE, NAV_RED, NAV_GREEN, hullAt, shadeHex } = K;
  const hl = L / 2, top = hullAt(st, 0).top;
  rand(B, K, st, top, L, hull);
  if (soort === 'container') container(B, K, st, top, L, W, hull, cabin, Math.round(L * 10 + W));
  else if (soort === 'tanker') tanker(B, K, st, top, L, W, hull, cabin);
  else vracht(B, K, st, top, L, W, hull, cabin);
  opbouw(B, K, top, L, W, hull, cabin, soort === 'tanker' ? 15 : 13);
  voordek(B, K, st, top, L, W, hull);
  // de naam op de boeg en de witte rand langs het dek
  for (const s of [1, -1]) {
    const h = hullAt(st, hl * 0.55);
    B.box(hl * 0.55, top - 1.0, s * (h.hw + 0.01), 8, 0.8, 0.04, 0xe8e6e0);
    B.box(0, top - 0.12, s * (hullAt(st, 0).hw + 0.01), L * 0.72, 0.26, 0.04, shadeHex(cabin, 0.95));
    B.box(hl - 0.6, top + 1.2, s * (hullAt(st, hl - 0.6).hw * 0.8), 0.3, 0.16, 0.16, s > 0 ? NAV_GREEN : NAV_RED, G_LAMP);
  }
  B.box(-hl + 0.1, top + 1.0, 0, 0.1, 0.2, 0.2, NAV_WHITE, G_LAMP);
}

// De sleper: een hoge stuurhut midscheeps, de schoorsteen erachter, een sleeplier en fenders van autobanden.
export function sleperFit(B, st, L, W, hull, cabin, K) {
  const { GLASS, G_GLASS, G_LAMP, NAV_WHITE, NAV_RED, NAV_GREEN, hullAt, shadeHex } = K;
  const hl = L / 2, top = hullAt(st, 0).top, wit = cabin;
  B.box(-hl * 0.15, top + 1.2, 0, L * 0.34, 2.4, W * 0.7, wit);
  B.box(-hl * 0.15 + 0.6, top + 3.4, 0, L * 0.22, 2.0, W * 0.6, wit);
  B.box(-hl * 0.15 + 0.6 + L * 0.11 + 0.02, top + 3.5, 0, 0.08, 0.8, W * 0.6 - 0.2, GLASS, G_GLASS);
  for (const s of [1, -1]) B.box(-hl * 0.15 + 0.6, top + 3.5, s * (W * 0.3 + 0.02), L * 0.2, 0.8, 0.04, GLASS, G_GLASS);
  B.box(-hl * 0.15 + 0.6, top + 4.5, 0, L * 0.24, 0.16, W * 0.64, shadeHex(wit, 0.75));
  B.box(-hl * 0.15 - 2.4, top + 4.0, 0, 2.0, 3.2, 2.0, shadeHex(hull, 1.0));
  B.box(-hl * 0.15 - 2.4, top + 5.7, 0, 2.1, 0.5, 2.1, ZWART);
  B.box(-hl * 0.15 + 0.2, top + 5.4, 0, 0.12, 1.4, 0.12, ZWART);
  B.box(-hl * 0.15 + 0.2, top + 6.2, 0, 0.14, 0.14, 0.14, NAV_WHITE, G_LAMP);
  B.box(hl * 0.45, top + 0.6, 0, 2.2, 1.2, 2.0, DEKGRIJS); // de lier
  B.box(-hl + 2.6, top + 0.4, 0, 0.3, 0.8, W * 0.9, ZWART); // de sleephaak
  for (const s of [1, -1]) {
    for (let x = -hl * 0.6; x <= hl * 0.7; x += 2.4) {
      const h = hullAt(st, x);
      cyl(B, x, top - 0.4, s * (h.hw + 0.28), 0.42, 0.5, ZWART);
    }
    B.box(-hl * 0.15, top + 2.2, s * (W * 0.35 + 0.2), 0.16, 0.16, 0.16, s > 0 ? NAV_GREEN : NAV_RED, G_LAMP);
    B.box(0, top - 0.1, s * (hullAt(st, 0).hw + 0.01), L * 0.6, 0.22, 0.04, 0xe8e6e0);
  }
}
