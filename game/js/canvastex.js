import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// The one canvas-to-texture helper: a w x h canvas, drawn once by
// draw(ctx, w, h), as an sRGB texture. opts: anisotropy, repeat [u, v].
// Een bord met tekst aan twee kanten, zonder spiegelbeeld (#503): een dubbelzijdig vlak laat zijn
// achterkant gespiegeld zien. Dit zijn twee vlakken rug aan rug, elk met de voorkant naar buiten, dus
// de tekst leest van beide kanten goed. Gebruik dit voor elk vlak met tekst erop.
export function signBothSides(w, h, material) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), material));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  back.rotation.y = Math.PI;
  g.add(back);
  return g;
}

export function canvasTex(w, h, draw, { anisotropy = 0, repeat = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (anisotropy) t.anisotropy = anisotropy;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Sets g.font so that `text` fits maxW: starts at `size` px and steps down by 2
// until it fits or reaches `min`. Draw the text afterwards.
export function fitText(g, text, maxW, size, weight = 'bold', font = 'sans-serif', min = 10) {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 2; } while (g.measureText(text).width > maxW && s > min);
}
