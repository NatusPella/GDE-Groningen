import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { fitText as sharedFitText } from './canvastex.js';
import { markShared } from './pixelart3d.js';

// Blue Dutch road signs for the Ommelanden: place-name boards at the
// village ends and direction blades (name, km, arrow) at junctions. Text is
// drawn once per string into a small canvas texture, shared and ref-counted.

const BLUE = '#1f4e9a';
const texCache = new Map();

function texture(key, draw, w, h) {
  let e = texCache.get(key);
  if (!e) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = markShared(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    e = { tex, mat, refs: 0 };
    texCache.set(key, e);
  }
  e.refs++;
  return e.mat;
}

function release(key) {
  const e = texCache.get(key);
  if (!e) return;
  if (--e.refs > 0) return;
  // keep a few idle ones for the way back
  if (texCache.size < 48) return;
  e.tex.dispose();
  e.mat.dispose();
  texCache.delete(key);
}

const fitText = (g, text, maxW, size, weight = 'bold') => sharedFitText(g, text, maxW, size, weight, '"Arial Narrow", Arial, sans-serif');

// sub: a second, smaller line (the Gronings name)
function placeBoard(text, sub) {
  return (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, text, w - 50, sub ? 54 : 62);
    g.fillText(text, w / 2, sub ? h / 2 - 16 : h / 2 + 3);
    if (sub) {
      fitText(g, sub, w - 90, 36, 'italic bold');
      g.fillText(sub, w / 2, h / 2 + 34);
    }
  };
}

function bladeBoard(text, km, right) {
  return (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#fff';
    const tx = right ? w - 22 : 22, bx = right ? w - 58 : 58;
    g.beginPath(); g.moveTo(tx, h / 2); g.lineTo(bx, h / 2 - 22); g.lineTo(bx, h / 2 + 22); g.closePath(); g.fill();
    g.textBaseline = 'middle';
    fitText(g, text, w - 190, 44);
    g.textAlign = right ? 'left' : 'right';
    g.fillText(text, right ? 20 : w - 20, h / 2 + 2);
    g.font = 'bold 38px Arial, sans-serif';
    g.textAlign = right ? 'right' : 'left';
    g.fillText(String(km), right ? w - 70 : 70, h / 2 + 2);
  };
}

const POST_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.5, metalness: 0.3 }));
const BACK_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.7 }));
const POST_GEO = markShared(new THREE.CylinderGeometry(0.045, 0.045, 1, 6).translate(0, 0.5, 0));
const BOARD_GEO = markShared(new THREE.BoxGeometry(0.04, 1, 1));

// sign: { kind: 'place', text, x, y, rot } | { kind: 'junction', x, y, blades }
export function buildSign(sign) {
  const g = new THREE.Group();
  const keys = [];
  // Een bord zonder tekst is geen bord (#436): geen leeg, zwart vlak in de wereld.
  const tekst = (t) => (typeof t === 'string' ? t.trim() : '');
  if (sign.kind === 'place') {
    const text = tekst(sign.text);
    if (!text) return g;
    sign = { ...sign, text };
    const k = 'p:' + text + (sign.sub ? ':' + sign.sub : '');
    keys.push(k);
    const face = texture(k, placeBoard(text, sign.sub), 512, 160);
    for (const z of [-0.75, 0.75]) {
      const p = new THREE.Mesh(POST_GEO, POST_MAT);
      p.scale.y = 2.3;
      p.position.set(0, 0, z);
      g.add(p);
    }
    // text on the local +X face, turned towards oncoming traffic below
    const b = new THREE.Mesh(BOARD_GEO, [face, BACK_MAT, BACK_MAT, BACK_MAT, BACK_MAT, BACK_MAT]);
    b.scale.set(1, 0.62, 2.0);
    b.position.set(0, 1.85, 0);
    g.add(b);
    g.rotation.y = -(sign.rot || 0) + Math.PI / 2;
  } else {
    // blades zonder naam (een dorp dat nog niet in de lijst staat) slaan we over
    const blades = (sign.blades || []).filter((bl) => bl && tekst(bl.text));
    if (!blades.length) return g;
    const p = new THREE.Mesh(POST_GEO, POST_MAT);
    p.scale.y = 3.1;
    g.add(p);
    blades.forEach((bl, i) => {
      // blade along its arm, arrow tip pointing outwards from the post
      const ang = Math.atan2(bl.ay, bl.ax);
      const kR = 'b:' + bl.text + ':' + bl.km + ':r', kL = 'b:' + bl.text + ':' + bl.km + ':l';
      keys.push(kR, kL);
      const front = texture(kR, bladeBoard(bl.text, bl.km, true), 512, 96);
      const back = texture(kL, bladeBoard(bl.text, bl.km, false), 512, 96);
      const b = new THREE.Mesh(BOARD_GEO, [BACK_MAT, BACK_MAT, BACK_MAT, BACK_MAT, front, back]);
      b.scale.set(1.5 / 0.04, 0.3, 0.035);
      const holder = new THREE.Group();
      holder.rotation.y = -ang;
      b.position.set(0.82, 2.75 - i * 0.36, 0);
      holder.add(b);
      g.add(holder);
    });
  }
  g.position.set(sign.x, 0, sign.y);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.signKeys = keys;
  return g;
}

export function disposeSign(g) {
  for (const k of g.userData.signKeys || []) release(k);
}
