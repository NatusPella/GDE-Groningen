// De markering van een veld in de wereld (#985): een paal met een vlag in de kleur van de status op de hoek van het veld, een vorm bovenop (kleur is nooit
// de enige betekenis) en, als het gewas oogstklaar is, een zachte gele lichtkolom die rustig pulseert. Alles MeshBasic zonder licht of nieuwe shader;
// de kolom heeft depthWrite uit en een lichte lift, dus geen z-fighting met de grond. De kleuren komen uit boerderijstatus.js (zelfde taal als de kaart).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WERELD_KLEUR } from './boerderijstatus.js';

const TOP = {
  braak: () => new THREE.SphereGeometry(0.28, 6, 4),
  stoppel: () => new THREE.BoxGeometry(0.4, 0.2, 0.4),
  geploegd: () => new THREE.BoxGeometry(0.42, 0.42, 0.42),
  zaailing: () => new THREE.ConeGeometry(0.26, 0.5, 5),
  groeiend: () => new THREE.ConeGeometry(0.3, 0.6, 5),
  bijna: () => new THREE.ConeGeometry(0.34, 0.7, 5),
  rijp: () => new THREE.OctahedronGeometry(0.42, 0),
};

// De markering voor een status op plek (x, y, grondhoogte). Geeft { group, beam } (beam alleen bij oogstklaar).
export function maakVeldMarker(statusId, x, z, grond) {
  const kleur = WERELD_KLEUR[statusId] || WERELD_KLEUR.braak;
  const group = new THREE.Group();
  group.name = 'veldmarker';
  const paal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 5), new THREE.MeshBasicMaterial({ color: 0x3a2f22 }));
  paal.position.set(0, 1.6, 0);
  const vlag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ color: kleur, side: THREE.DoubleSide }));
  vlag.position.set(0.65, 2.7, 0);
  const top = new THREE.Mesh((TOP[statusId] || TOP.braak)(), new THREE.MeshBasicMaterial({ color: kleur }));
  top.position.set(0, 3.5, 0);
  group.add(paal, vlag, top);
  let beam = null;
  if (statusId === 'rijp') {
    beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 10, 1, true), new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.set(0, 8, 0);
    group.add(beam);
  }
  group.position.set(x, grond + 0.05, z);
  return { group, beam, top };
}

// Elk beeld: de lichtkolom ademt (dekking 0,14 tot 0,26) en de vorm bovenop draait rustig; beweging alleen als `rustig` uit staat.
export function tikVeldMarker(m, t, rustig = false) {
  if (!m) return;
  if (m.top && !rustig) m.top.rotation.y = t * 0.9;
  if (m.beam) m.beam.material.opacity = rustig ? 0.2 : 0.2 + 0.06 * Math.sin(t * 2.2);
}
