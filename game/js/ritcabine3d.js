import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { taxiCabine, treinKaderDelen, METER_AAN, METER_UIT, SEGMENTEN, METER_CIJFERS, meterSegmenten } from './ritcabine.js';

// De binnenkant van de rit in beeld (#882, #926): de taxicabine van "Gele Gans" en het raamkader van de trein. De maten en
// de onderdelen staan in ritcabine.js (puur, getest); hier worden ze één geometrie met vertexkleuren per soort, dus één
// of twee tekenaanroepen en geen nieuwe shaders (dezelfde Lambert- en Basic-materialen met vertexkleuren als carinterior.js
// en treininterieur.js). Het kader van de trein hangt aan de camera, de cabine van de taxi aan het voertuig van de rit.

let lambert = null, basic = null, kaderMat = null;
function materialen() {
  if (!lambert) {
    // zoals carinterior.js: één gedeeld materiaal dat de cabine uit de schaduw tilt
    lambert = markShared(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x30343c }));
    // het scherm van de meter brandt zelf: onverlicht, ook 's nachts leesbaar (zoals treininterieur.js)
    basic = markShared(new THREE.MeshBasicMaterial({ vertexColors: true }));
    // het treinkader staat voor de lens: geen diepte, als laatste getekend
    kaderMat = markShared(new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, transparent: true }));
  }
}

const lineair = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

function vulBouwer(B, delen) {
  for (const d of delen) B.box(d.at[0], d.at[1], d.at[2], d.b[0], d.b[1], d.b[2], d.c, d.g || 0, d.rot[0], d.rot[1], d.rot[2]);
}

// ---- de taxi -----------------------------------------------------------------------------------------------

let taxiGeo = null; // { geometry, cijferStart }
function taxiGeometrie() {
  if (taxiGeo) return taxiGeo;
  const cab = taxiCabine();
  const B = new GeoBuilder(2);
  vulBouwer(B, cab.vast);
  const voor = B.groups[1].p.length / 3; // hoekpunten van groep 1 vóór de cijfers
  vulBouwer(B, cab.cijfers);
  const g0 = B.groups[0].p.length / 3;
  taxiGeo = { geometry: markShared(B.build()), cijferStart: g0 + voor, cijfers: cab.cijfers.length };
  return taxiGeo;
}

// Zet de segmenten van de meter op de kleur van aan of uit. Elk segment is één doos van 36 hoekpunten, in de volgorde
// cijfer 0..3, segment a..g (meterDelen in ritcabine.js).
function zetMeter(g, mesh, bedrag) {
  const segs = meterSegmenten(bedrag);
  const sleutel = segs.join('|');
  if (mesh.userData.meterSleutel === sleutel) return;
  mesh.userData.meterSleutel = sleutel;
  const col = g.geometry.attributes.color, aan = lineair(METER_AAN), uit = lineair(METER_UIT);
  for (let i = 0; i < METER_CIJFERS; i++) {
    for (let s = 0; s < SEGMENTEN.length; s++) {
      const rgb = segs[i].includes(SEGMENTEN[s]) ? aan : uit, start = g.cijferStart + (i * SEGMENTEN.length + s) * 36;
      for (let k = 0; k < 36; k++) col.setXYZ(start + k, rgb[0], rgb[1], rgb[2]);
    }
  }
  col.needsUpdate = true;
}

// Per beeld voor de taxi van de rit (scene3d.js): hang de cabine aan het voertuig, verberg de buitenkant (de carrosserie, de
// chauffeursfiguur en de spiegels die bij het model horen: de cabine heeft zijn eigen) en zet de meter op het bedrag.
// De cabine hangt aan de groep van het voertuig, niet aan de carrosserie: die is verborgen.
export function updateRitCabine(mesh, bedrag) {
  if (!mesh) return false;
  materialen();
  let cab = mesh.userData.ritCabine;
  if (!cab) {
    const g = taxiGeometrie();
    // de geometrie is gedeeld, maar de kleuren van de meter zijn per rit: een eigen kopie van het kleurattribuut
    const geometry = g.geometry.clone();
    geometry.userData = { shared: false };
    const m = new THREE.Mesh(geometry, [lambert, basic]);
    m.name = 'ritcabine';
    m.castShadow = false;
    m.receiveShadow = false;
    m.renderOrder = 12;
    m.userData.noBatch = true;
    m.frustumCulled = false;
    mesh.add(m);
    cab = mesh.userData.ritCabine = { mesh: m, g: { geometry, cijferStart: g.cijferStart } };
  }
  for (const c of mesh.children) if (c !== cab.mesh) c.visible = false;
  zetMeter(cab.g, cab.mesh, bedrag);
  return true;
}

// ---- het treinraam -----------------------------------------------------------------------------------------

let kader = null;
function kaderMesh() {
  if (kader) return kader;
  materialen();
  const B = new GeoBuilder(1);
  vulBouwer(B, treinKaderDelen());
  const m = new THREE.Mesh(markShared(B.build()), kaderMat);
  m.name = 'treinkader';
  m.renderOrder = 1000;
  m.castShadow = false;
  m.receiveShadow = false;
  m.frustumCulled = false;
  m.userData.noBatch = true;
  // het kader staat vast voor de lens: bij het tekenen krijgt het de stand van de camera die kijkt
  m.onBeforeRender = (renderer, scene, camera) => { m.matrixWorld.copy(camera.matrixWorld); };
  kader = m;
  return m;
}

// Per beeld (scene3d.js): het kader van het treinraam aan of uit.
export function syncTreinKader(scene, aan) {
  if (!aan && !kader) return;
  const m = kaderMesh();
  if (aan && !m.parent) scene.add(m);
  else if (!aan && m.parent) m.parent.remove(m);
  m.visible = !!aan;
}
