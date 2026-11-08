import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { RIKUS_LOOK } from './storycast.js';

// The Radio Nachtstreek studio where Rikus (the narrator) tells the story:
// a small closed room built high above the city (like the intro's vitrine
// room), so a cutscene can cut to it without the world in view. Rikus stands
// at the desk facing +x with his headphones on; the window behind him shows
// Grunn by night with d'Olle Grieze. buildRadioStudio() -> { group, at, shot,
// tick, dispose }; the caller adds `group` to the scene and uses `shot` as a
// camera (world x/y/z, z up).

const SKY_Z = 320;

function mat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

function labelTexture(text, fg, bg, w = 256, h = 96) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `bold ${Math.round(h * 0.55)}px Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Grunn at night through the studio window: roofs, lit windows, the tower.
function nightTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, '#0b1230'); sky.addColorStop(1, '#27305a');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 128);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#0a0d18';
  for (let x = 0; x < 256; x += 14) g.fillRect(x, 78 + rnd() * 22, 15, 60);
  g.fillRect(150, 22, 16, 90); g.fillRect(154, 10, 8, 14); g.fillRect(157, 2, 2, 10);
  g.fillStyle = '#f2c96a';
  for (let k = 0; k < 60; k++) g.fillRect(Math.floor(rnd() * 250), 86 + Math.floor(rnd() * 38), 2, 2);
  g.fillRect(156, 30, 4, 3);
  g.fillStyle = '#e8ecff';
  for (let k = 0; k < 24; k++) g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 60), 1, 1);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function box(group, w, h, d, x, y, z, m) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  group.add(o);
  return o;
}

function addHeadphones(person) {
  const head = person.userData.head;
  if (!head) return;
  const m = mat(0x1b1d22);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.014, 6, 18, Math.PI), m);
  band.rotation.y = Math.PI / 2;
  band.position.y = 0.2;
  head.add(band);
  for (const s of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 12), mat(0x2a2d34));
    cup.rotation.x = Math.PI / 2;
    cup.position.set(0, 0.19, s * 0.125);
    head.add(cup);
  }
}

export function buildRadioStudio(x = 0, y = 0) {
  const group = new THREE.Group();
  const at = { x, y, z: SKY_Z };
  group.position.set(at.x, at.z, at.y);
  // the room, seen from inside
  const room = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), mat(0x2b2433, { side: THREE.BackSide }));
  room.position.set(0.4, 1.5, 0);
  group.add(room);
  // acoustic foam on the back wall, the floor rug
  const foam = mat(0x3d2f4a);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) box(group, 0.08, 0.5, 0.5, -2.52, 1.25 + j * 0.62, -1.9 + i * 0.62 + (i > 1 ? 1.3 : 0), foam);
  box(group, 3.2, 0.02, 2.6, 0.2, 0.01, 0, mat(0x5a2a2a));
  // window onto Grunn by night, behind Rikus
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), new THREE.MeshBasicMaterial({ map: nightTexture() }));
  win.position.set(-2.5, 1.7, 0.2);
  win.rotation.y = Math.PI / 2;
  group.add(win);
  box(group, 0.06, 0.9, 0.06, -2.48, 1.7, 0.98, mat(0x18141e));
  box(group, 0.06, 0.9, 0.06, -2.48, 1.7, -0.58, mat(0x18141e));
  // ON AIR sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.7), [
    mat(0x301010), mat(0x301010), mat(0x301010), mat(0x301010),
    new THREE.MeshBasicMaterial({ map: labelTexture('ON AIR', '#fff2f0', '#d22a2a') }), mat(0x301010),
  ]);
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(-2.45, 2.45, -1.2);
  group.add(sign);
  // desk with the mixing console, a mug and the microphone on a boom
  box(group, 0.9, 0.08, 2.0, 0.75, 1.02, 0, mat(0x6b4a2e));
  box(group, 0.8, 0.95, 0.06, 0.75, 0.5, -0.95, mat(0x4a3320));
  box(group, 0.8, 0.95, 0.06, 0.75, 0.5, 0.95, mat(0x4a3320));
  box(group, 0.5, 0.06, 0.9, 0.8, 1.09, -0.35, mat(0x22252b));
  const lit = [0x3fc97a, 0xe8c93a, 0xd93f3f, 0x7fd4ff];
  for (let k = 0; k < 10; k++) box(group, 0.03, 0.03, 0.03, 0.66 + (k % 2) * 0.12, 1.135, -0.72 + Math.floor(k / 2) * 0.17, new THREE.MeshBasicMaterial({ color: lit[k % lit.length] }));
  for (let k = 0; k < 6; k++) box(group, 0.12, 0.02, 0.025, 0.9, 1.13, -0.7 + k * 0.14, mat(0xcfcfcf));
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), mat(0x1f7a44));
  mug.position.set(0.85, 1.11, 0.55);
  group.add(mug);
  box(group, 0.02, 0.5, 0.02, 0.95, 1.3, 0.25, mat(0x2a2a2e));
  const arm = box(group, 0.5, 0.02, 0.02, 0.72, 1.55, 0.25, mat(0x2a2a2e));
  arm.rotation.z = 0.12;
  const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.12, 4, 10), mat(0x3a3a40));
  mic.rotation.z = Math.PI / 2;
  mic.position.set(0.45, 1.58, 0.22);
  group.add(mic);
  // warm lamp and the red of the sign
  const lamp = new THREE.PointLight(0xffd6a0, 6, 7, 1.6);
  lamp.position.set(1.4, 2.6, 0.6);
  group.add(lamp);
  const red = new THREE.PointLight(0xff4a4a, 1.2, 3, 2);
  red.position.set(-2.2, 2.4, -1.2);
  group.add(red);
  group.add(new THREE.AmbientLight(0x6a5a80, 0.9));
  // Rikus
  const rikus = buildPersonMesh(RIKUS_LOOK.shirt, RIKUS_LOOK.skin, RIKUS_LOOK);
  rikus.position.set(0, 0, 0.25);
  addHeadphones(rikus);
  group.add(rikus);

  const ud = rikus.userData;
  // talking: head bob, one hand at the headphones, the other on a fader
  function tick(t, talking = true) {
    if (!ud.armR) return;
    ud.armR.rotation.set(-0.2, 0, 0.9);
    if (ud.elbowR) ud.elbowR.rotation.z = 1.9;
    ud.armL.rotation.set(0.1, 0, 0.75 + (talking ? Math.sin(t * 2.1) * 0.05 : 0));
    if (ud.elbowL) ud.elbowL.rotation.z = 1.1;
    if (ud.head) ud.head.rotation.set(Math.sin(t * 0.7) * 0.06, 0, (talking ? Math.sin(t * 8.5) * 0.045 : 0) - 0.04);
  }
  tick(0, false);

  // close-up over the mic (k 0) or a wider two-thirds shot (k 1); u = 0..1 over the shot
  function shot(k = 0) {
    return (u) => {
      const e = u * u * (3 - 2 * u);
      const dist = k ? 2.7 - e * 0.25 : 1.75 - e * 0.2;
      const side = k ? -0.9 + e * 0.3 : 0.55 - e * 0.15;
      return {
        position: { x: at.x + dist, y: at.y + 0.25 + side, z: at.z + (k ? 1.75 : 1.62) },
        lookAt: { x: at.x, y: at.y + 0.25, z: at.z + (k ? 1.35 : 1.55) },
        fov: k ? 44 : 34,
      };
    };
  }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    // the person's materials are shared (models3d_people.js): only the skeleton goes and the
    // shared body geometry gets its ref back (#796)
    group.remove(rikus);
    rikus.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      releasePersonGeometry(o);
      if (o.skeleton) o.skeleton.dispose();
    });
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  return { group, at, shot, tick, dispose, rikus };
}
