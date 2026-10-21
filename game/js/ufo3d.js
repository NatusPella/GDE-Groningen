import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SCHOTEL_R, STRAAL_R, STRAAL_TOP } from './schaapontvoering.js';

// De schotel en de straal (#333). De schotel is dezelfde als die van het geheimpje boven Zernike (geheimen.js):
// een platte schijf met koepel en twaalf kleurende lampjes. De straal is een trechter die bij de schotel
// begint en bij het schaap eindigt; setStraal legt hem tussen die twee punten.

function add(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// r: straal van de schijf in m (7 bij Zernike)
export function buildUfoMesh(r = SCHOTEL_R) {
  const k = r / 7;
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.85, roughness: 0.25, emissive: 0x1a2028 });
  const disc = add(g, new THREE.SphereGeometry(7 * k, 28, 12), hull, 0, 0, 0);
  disc.scale.set(1, 0.22, 1);
  const dome = add(g, new THREE.SphereGeometry(2.6 * k, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9affc8, transparent: true, opacity: 0.85 }), 0, 0.9 * k, 0);
  dome.castShadow = false;
  const lights = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const m = add(g, new THREE.SphereGeometry(0.35 * k, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }), Math.cos(a) * 6.6 * k, -0.2 * k, Math.sin(a) * 6.6 * k);
    m.castShadow = false;
    lights.push(m);
  }
  return { g, lights };
}

export function kleurLampjes(lights, t) {
  lights.forEach((m, i) => m.material.color.setHSL(((t * 0.4 + i / 12) % 1), 0.9, 0.6));
}

// Een open trechter, de punt (smalle kant) op y = 0 en de brede kant op y = -1; schalen met setStraal.
export function buildStraal() {
  const geo = new THREE.CylinderGeometry(1, STRAAL_R / STRAAL_TOP, 1, 28, 1, true).translate(0, -0.5, 0);
  // zacht: helder langs de kern, doorzichtig aan de rand (kijkhoek) en onderaan, zodat er geen harde plaat in de lucht hangt
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0xb8ffd8) }, uOpacity: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
        float a = uOpacity * core * (0.55 + 0.45 * vY) * smoothstep(0.0, 0.12, vY);
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(geo, mat);
  m.visible = false;
  m.frustumCulled = false;
  m.renderOrder = 5;
  return m;
}

// s: schaapontvoering.js straalVan(...) of null. Wereldmeters: x, y (grond) en top, bodem (hoogte).
export function setStraal(mesh, s, t = 0) {
  if (!s) { mesh.visible = false; return; }
  mesh.visible = true;
  mesh.position.set(s.x, s.top, s.y);
  mesh.scale.set(s.rTop, s.lengte, s.rTop);
  mesh.material.uniforms.uOpacity.value = (0.35 + 0.65 * s.sterkte) * (0.92 + 0.08 * Math.sin(t * 9));
}
