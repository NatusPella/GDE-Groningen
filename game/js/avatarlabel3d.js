// Het naamlabel boven de figuur van een speler bij Samen spelen: een kaartje met de online-naam in zijn kleur. Gebruikt door
// coopfigures3d.js (de medespelers) en scene3d.js (de gastheer bij een gast, #455). Een eigen module, zodat scene3d.js het label
// kan maken zonder coopfigures3d.js te importeren (die importeert scene3d.js zelf: geen kringverwijzing).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { LABEL_Y } from './coopfigures.js';
import { pasLabel } from './multiplayerlabels.js';

// #872: het naamlabel past op de vaste kaart. Een online-naam mag 16 tekens zijn en de
// spelerslijst leest er 24; zonder meten viel een lange naam buiten het tekstvlak.
const LABEL_B = 256, LABEL_H = 64, LABEL_VLAK = 236;
const KAARTJE = 'rgba(8,16,10,0.65)'; // het donkere kaartje achter de naam: textuur in de 3D-wereld, geen UI-kleur
export function makeLabel(spec) {
  const c = document.createElement('canvas'); c.width = LABEL_B; c.height = LABEL_H;
  const g = c.getContext('2d');
  const font = (px) => `bold ${px}px "Arial Narrow", Arial, sans-serif`;
  const past = pasLabel(spec.tekst, { maxBreedte: LABEL_VLAK, px: 34, minPx: 18, meet: (tekst, px) => { g.font = font(px); return g.measureText(tekst).width; } });
  g.font = font(past.px); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = KAARTJE; g.fillRect(8, 8, LABEL_B - 16, 48);
  g.fillStyle = spec.kleur; g.fillText(past.tekst, LABEL_B / 2, 33);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(1.8, 0.45, 1); spr.position.y = LABEL_Y; spr.renderOrder = 10;
  return spr;
}
