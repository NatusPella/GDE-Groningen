// Het kushartje: een camerawijzende sprite uit een canvas. Afgesplitst uit scene3d.js
// (#497), zonder inhoudelijke wijziging: dezelfde namen, dezelfde volgorde, dezelfde commentaren.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Kiss heart: a camera-facing sprite from a canvas heart (bezier outline,
// glossy gradient, white rim), so it reads as a heart from every angle.
let kissHeartTex = null;
function kissHeartTexture() {
  if (kissHeartTex) return kissHeartTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const heart = () => {
    g.beginPath();
    g.moveTo(64, 112);
    g.bezierCurveTo(36, 92, 10, 70, 10, 44);
    g.bezierCurveTo(10, 24, 25, 12, 41, 12);
    g.bezierCurveTo(52, 12, 60, 18, 64, 28);
    g.bezierCurveTo(68, 18, 76, 12, 87, 12);
    g.bezierCurveTo(103, 12, 118, 24, 118, 44);
    g.bezierCurveTo(118, 70, 92, 92, 64, 112);
    g.closePath();
  };
  g.shadowColor = 'rgba(0, 0, 0, 0.45)';
  g.shadowBlur = 6;
  heart();
  g.lineWidth = 10;
  g.strokeStyle = '#fff4f7';
  g.lineJoin = 'round';
  g.stroke();
  g.shadowColor = 'transparent';
  const grad = g.createLinearGradient(20, 12, 100, 112);
  grad.addColorStop(0, '#ff7aa8');
  grad.addColorStop(0.55, '#f02d63');
  grad.addColorStop(1, '#b3123f');
  heart();
  g.fillStyle = grad;
  g.fill();
  g.beginPath();
  g.ellipse(40, 38, 13, 8, -0.6, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255, 255, 255, 0.7)';
  g.fill();
  kissHeartTex = new THREE.CanvasTexture(c);
  kissHeartTex.colorSpace = THREE.SRGBColorSpace;
  return kissHeartTex;
}
export function buildKissHeartMesh() {
  const mat = new THREE.SpriteMaterial({ map: kissHeartTexture(), transparent: true, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(mat);
  sprite.geometry.userData.shared = true;
  sprite.renderOrder = 5;
  return sprite;
}
