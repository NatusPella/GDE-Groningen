// Binnensets (bouwsteen G0b): het tekenen van de kroeg, de woonkamer en de garage uit
// roomspec.js. Zelfde mechanisme als Oma's keuken (omakeuken3d.js): een gesloten kamer met
// alleen de binnenkant (BackSide), eigen verlichting en een eigen frame; buildRoom geeft
// { group, frame(t), dispose() } zoals de andere sets en wordt door stagesets.js (missiestap)
// en cutscenehost.js (def.set) gebouwd.
import * as THREE from 'three';
import { canvasTex } from './canvastex.js';
import { ROOMS } from './roomspec.js';

function signTex(text, bg, fg) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.font = 'bold 48px Georgia, serif'; g.textAlign = 'center'; g.fillText(text, w / 2, 84);
  }, { anisotropy: 4 });
}

function wallTex(base, band, bandAt) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = band; g.fillRect(0, h * bandAt, w, h * (1 - bandAt));
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
  }, { anisotropy: 4 });
}

function floorTex(a, b, repeat) {
  return canvasTex(128, 128, (g, w, h) => {
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = ((x + y) / 32) % 2 ? a : b; g.fillRect(x, y, 32, 32); }
  }, { anisotropy: 4, repeat });
}

const LOOK = {
  kroeg: { wall: ['#6a4a34', '#4d3524', 0.5], floor: ['#6b5038', '#5c4430', [4, 3]], ceil: 0x3a2a20, sign: ['DE VERDWAALDE KOE', '#2a1a12', '#e8c36a'], tint: 0xffd49a },
  woonkamer: { wall: ['#d8d0bc', '#c5bba2', 0.85], floor: ['#a08060', '#957454', [3, 2]], ceil: 0xeeeae0, sign: null, tint: 0xfff0d8 },
  garage: { wall: ['#b8bcc0', '#8e949a', 0.55], floor: ['#7a7e82', '#6e7276', [4, 3]], ceil: 0xa8acb0, sign: ['WERKPLAATS', '#2a2f35', '#f2c230'], tint: 0xf2f6ff },
};

export function buildRoom(kind, x, y, z) {
  const spec = ROOMS[kind];
  if (!spec) return null;
  const look = LOOK[kind];
  const group = new THREE.Group();
  group.position.set(x, z, y);
  const own = [];
  const keep = (o) => { own.push(o); return o; };
  const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const add = (geo, mat, u, h, v) => { const m = new THREE.Mesh(keep(geo), mat); m.position.set(u, h, v); group.add(m); return m; };
  const box = (w, h, d, mat, u, hh, v) => add(new THREE.BoxGeometry(w, h, d), mat, u, hh, v);
  const cyl = (r, h, mat, u, hh, v, seg = 12) => add(new THREE.CylinderGeometry(r, r, h, seg), mat, u, hh, v);
  const W = spec.w, D = spec.d, H = spec.h;

  const wall = keep(new THREE.MeshBasicMaterial({ map: keep(wallTex(look.wall[0], look.wall[1], look.wall[2])), side: THREE.BackSide, color: 0xf4ede0 }));
  const ceil = keep(new THREE.MeshBasicMaterial({ color: look.ceil, side: THREE.BackSide }));
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(floorTex(look.floor[0], look.floor[1], look.floor[2])), roughness: 0.9, side: THREE.BackSide }));
  const room = new THREE.Mesh(keep(new THREE.BoxGeometry(W, H, D)), [wall, wall, ceil, floorMat, wall, wall]);
  room.position.y = H / 2;
  group.add(room);

  const wood = std(0x7a5232), dark = std(0x2e2118), metal = std(0x8a9096, { metalness: 0.5, roughness: 0.4 });
  const fab = std(kind === 'woonkamer' ? 0x4f7a8a : 0x8a3a2a), glow = std(0xfff0c0, { emissive: 0xffe2a0, emissiveIntensity: 1.2 });
  const lights = [];
  const furniture = {};

  for (const f of spec.furniture) {
    const { u, v, w, d, h } = f;
    furniture[f.id] = { u, v };
    if (f.kind === 'bar') {
      box(w, h, d, wood, u, h / 2, v);
      box(w + 0.2, 0.06, d + 0.1, std(0x3a2a20, { roughness: 0.4 }), u, h + 0.03, v);
      // de planken met flessen achter de bar
      box(0.3, 0.05, d, wood, u + 1.0, 1.6, v);
      box(0.3, 0.05, d, wood, u + 1.0, 2.1, v);
      for (let k = 0; k < 10; k++) cyl(0.05, 0.3, std([0x3a7a3a, 0x7a3a2a, 0xd8c060, 0x3a5a8a][k % 4], { roughness: 0.3 }), u + 1.0, 1.78 + (k % 2) * 0.5, v - 2.2 + k * 0.48, 8);
    } else if (f.kind === 'kruk') {
      cyl(0.19, 0.06, fab, u, h, v, 10);
      cyl(0.03, h, metal, u, h / 2, v, 6);
    } else if (f.kind === 'tafel') {
      box(w, 0.05, d, wood, u, h, v);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.06, h, 0.06, dark, u + a * (w / 2 - 0.08), h / 2, v + b * (d / 2 - 0.08));
      if (kind === 'kroeg') { cyl(0.05, 0.12, std(0xd8c060, { roughness: 0.3 }), u - 0.2, h + 0.09, v, 8); cyl(0.07, 0.04, std(0xf2f0ea), u + 0.25, h + 0.05, v + 0.1, 8); }
      if (kind === 'woonkamer') box(0.4, 0.03, 0.3, std(0xd9cfba), u, h + 0.04, v);
    } else if (f.kind === 'jukebox') {
      box(w, h, d, std(0x8a2a3a, { roughness: 0.4 }), u, h / 2, v);
      const g = box(0.04, 0.7, d * 0.8, glow, u + w / 2 + 0.01, 1.0, v);
      lights.push(g);
    } else if (f.kind === 'bank') {
      box(w, 0.45, d, fab, u, 0.3, v);
      box(0.22, 0.55, d, fab, u + w / 2 - 0.11, 0.7, v);
      for (const s of [-1, 1]) box(w, 0.3, 0.2, fab, u, 0.55, v + s * (d / 2 - 0.1));
    } else if (f.kind === 'salontafel') {
      box(w, 0.05, d, wood, u, h, v);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.05, h, 0.05, dark, u + a * (w / 2 - 0.06), h / 2, v + b * (d / 2 - 0.06));
    } else if (f.kind === 'tvkast') {
      box(w, h, d, wood, u, h / 2, v);
      box(0.06, 0.7, 1.3, std(0x15171a, { roughness: 0.3 }), u, h + 0.5, v);
      lights.push(box(0.01, 0.6, 1.2, std(0x2a4a6a, { emissive: 0x2a4a6a, emissiveIntensity: 0.8 }), u + 0.04, h + 0.5, v));
    } else if (f.kind === 'plant') {
      cyl(0.22, 0.4, std(0xa0522d), u, 0.2, v, 8);
      for (let k = 0; k < 4; k++) box(0.5, 0.05, 0.5, std(0x3d7a3a), u + (k % 2 ? 0.05 : -0.05), 0.55 + k * 0.22, v);
    } else if (f.kind === 'hefbrug') {
      // een auto op de brug: een open carrosserie zonder merk
      for (const s of [-1, 1]) box(w, 0.12, 0.2, metal, u, 0.9, v + s * 0.7);
      box(w * 0.9, 0.4, d * 0.85, std(0x2f6fb0, { roughness: 0.4 }), u, 1.35, v);
      box(w * 0.45, 0.34, d * 0.78, std(0x9fd0e0, { roughness: 0.2 }), u - 0.2, 1.72, v);
      for (const s of [-1, 1]) { box(0.14, 0.9, 0.14, metal, u + s * (w / 2 - 0.2), 0.45, v - 0.9); box(0.14, 0.9, 0.14, metal, u + s * (w / 2 - 0.2), 0.45, v + 0.9); }
    } else if (f.kind === 'werkbank') {
      box(w, 0.08, d, wood, u, h, v);
      box(w, h - 0.08, 0.08, dark, u, (h - 0.08) / 2, v - d / 2 + 0.06);
      box(w, h - 0.08, 0.08, dark, u, (h - 0.08) / 2, v + d / 2 - 0.06);
      for (let k = 0; k < 5; k++) box(0.12, 0.05, 0.3, std([0xd93f3f, 0xe0b93a, 0x2f6fb0][k % 3]), u, h + 0.06, v - 1 + k * 0.5);
      // het gereedschapsbord boven de bank
      box(0.04, 1.0, d - 0.2, std(0xb8a888), u - w / 2 + 0.05, 1.7, v);
    } else if (f.kind === 'banden') {
      for (let k = 0; k < 4; k++) { const t = add(new THREE.TorusGeometry(0.3, 0.11, 8, 14), std(0x1d1f21, { roughness: 0.9 }), u, 0.12 + k * 0.24, v); t.rotation.x = Math.PI / 2; }
    } else if (f.kind === 'vaten') {
      cyl(0.36, h, std(0x2f5f8a, { roughness: 0.5 }), u, h / 2, v, 12);
      cyl(0.36, h, std(0x8a2f2f, { roughness: 0.5 }), u - 0.45, h / 2, v + 0.55, 12);
    }
  }

  // het bord boven de bar of de poort: een canvas met een verzonnen naam
  if (look.sign) {
    const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.4, 0.6)), keep(new THREE.MeshBasicMaterial({ map: keep(signTex(look.sign[0], look.sign[1], look.sign[2])) })));
    sign.position.set(kind === 'kroeg' ? W / 2 - 0.08 : -W / 2 + 0.08, H - 0.55, kind === 'kroeg' ? 0 : 1.4);
    sign.rotation.y = kind === 'kroeg' ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);
  }
  if (kind === 'kroeg') {
    // het dartbord aan de muur
    const dart = add(new THREE.CircleGeometry(0.25, 20), keep(new THREE.MeshBasicMaterial({ color: 0x1f3a2a })), -W / 2 + 0.06, 1.7, -2.5);
    dart.rotation.y = Math.PI / 2;
  } else if (kind === 'woonkamer') {
    // het raam aan de +v-muur: een zomerdag buiten
    const win = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.2, 1.3)), keep(new THREE.MeshBasicMaterial({ color: 0xbfe0ee })));
    win.position.set(0.2, 1.6, D / 2 - 0.06);
    win.rotation.y = Math.PI;
    group.add(win);
    box(2.3, 0.07, 0.08, std(0xf4efe2), 0.2, 2.28, D / 2 - 0.08);
    box(0.07, 1.4, 0.08, std(0xf4efe2), 0.2, 1.6, D / 2 - 0.08);
  } else {
    // de rolpoort aan de +u-muur
    box(0.06, 2.6, 3.6, std(0xc9ccd0, { metalness: 0.3, roughness: 0.5 }), W / 2 - 0.06, 1.3, 1.2);
  }

  // verlichting: warm in de kroeg en de woonkamer, koud in de garage
  const lamp = new THREE.PointLight(look.tint, kind === 'garage' ? 2.8 : 2.4, 9, 1.8);
  lamp.position.set(-0.5, H - 0.4, 0);
  group.add(lamp);
  const lamp2 = new THREE.PointLight(look.tint, 1.2, 7, 1.9);
  lamp2.position.set(W / 4, H - 0.5, -D / 4);
  group.add(lamp2);
  group.add(new THREE.AmbientLight(look.tint, 0.55));

  return {
    group, kind, furniture,
    frame(t) {
      // een lamp die zachtjes ademt en een jukebox of tv die flikkert; goedkoop en altijd in beeld
      lamp.intensity = (kind === 'garage' ? 2.8 : 2.4) + Math.sin(t * 3.1) * (kind === 'garage' ? 0.25 : 0.1);
      for (const m of lights) if (m.material && m.material.emissiveIntensity !== undefined) m.material.emissiveIntensity = 0.9 + Math.sin(t * 6 + m.position.z) * 0.3;
    },
    dispose() { for (const o of own) if (o && typeof o.dispose === 'function') o.dispose(); },
  };
}
