// De lichtkolom van de light sims in de wereld (#985): een zachte gele kolom boven het volgende doel (een brievenbus, een zaak, een deur), zodat je het van een
// afstand ziet. Eén dunne open cilinder, MeshBasic zonder licht of nieuwe shader, depthWrite uit zodat hij niet met de grond vecht (zelfde taal als de
// oogstklaar-kolom van de boerderij, farmmarker3d.js). Bij verminderde beweging pulseert hij niet.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export const KOLOM_HOOGTE = 9;

export function maakSimKolom(naam = 'simkolom') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, KOLOM_HOOGTE, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xf4c430, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.name = naam;
  m.visible = false;
  return m;
}

// Zet de kolom op plek (x, y) met de grondhoogte, of verberg hem (doel is null). t: tijd in s voor het rustige ademen.
export function zetSimKolom(m, doel, grond, t = 0, rustig = false) {
  if (!m) return;
  m.visible = !!doel;
  if (!doel) return;
  m.position.set(doel.x, grond + KOLOM_HOOGTE / 2, doel.y);
  m.material.opacity = rustig ? 0.22 : 0.22 + 0.06 * Math.sin(t * 2.2);
}
