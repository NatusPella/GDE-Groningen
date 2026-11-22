// De plaatjes van de boerderijschermen (22-11, docs/BOERDERIJ-VISUEEL-22-11.md): elke kaart krijgt een stilstaand 3D-plaatje van de dingen op het scherm
// (trekker, maaidorser, werktuig, dier, gebouw, gewasveld) en het gefocuste item een langzaam draaiend, live voorbeeld. Eén bron voor alle plaatjes: de gedeelde
// previewrenderer van vehiclepreview.js (één WebGL-context voor het hele menu, nooit een eigen per kaart). De lijsten krijgen alleen stilstaande plaatjes
// (renderSnapshot: lui in de rusttijd, gecached, begrensd); live 3D is er voor één item tegelijk. Tot het plaatje er is (of zonder WebGL) staat er een groot icoon.
// Alles is lokaal: previews raken geen spelerdata en gaan niet over het net. 'Minder beweging' zet het live voorbeeld stil.
import { MACHINE_MODELLEN } from './vehicle.js';
import { renderSnapshot, cancelSnapshots, releaseSnapshots, createSharedPreview } from './vehiclepreview.js';
import { fpMeta } from './farmpicshtml.js';
import { reducedMotion } from './motion.js';

export const FP_GROUP = 'boerderij';
export const FP_LIST_W = 256, FP_LIST_H = 160;   // de stilstaande plaatjes in lijsten (pixels, 2x voor scherpte via de renderer)
export const FP_MAX_PER_RONDE = 16;                // zo veel plaatjes vraagt één scherm hooguit aan (tijdsbudget: de rest komt bij het volgende scherm)
const ANGLE = 0.7;

// De 3D-spec per sleutel (de sleutels en de markup staan in farmpicshtml.js): machines gebruiken de echte voertuigbouwer, werktuigen werktuigen3d.js,
// de rest de procedurele modellen van farmmodels3d.js. Null voor een onbekende sleutel.
export function fpSpec(sleutel) {
  const i = fpMeta(sleutel);
  if (!i) return null;
  if (i.soort === 'm') { const model = MACHINE_MODELLEN[i.id]; return model ? { kind: 'car', model, color: model.color, nameIdx: 0 } : null; }
  if (i.soort === 'w') return { kind: 'farm', farm: 'werktuig:' + i.id };
  if (i.soort === 'gewas') return { kind: 'farm', farm: 'veld:' + i.id };
  return { kind: 'farm', farm: i.id };
}

// Tekent de stilstaande plaatjes van `root` in (lui: de renderer doet één plaatje per rustmoment en onthoudt ze). Hoogstens FP_MAX_PER_RONDE per aanroep.
// Geeft het aantal aangevraagde plaatjes terug. Zonder DOM (tests) gebeurt er niets.
export function vulPlaatjes(root) {
  if (!root || typeof root.querySelectorAll !== 'function' || typeof document === 'undefined') return 0;
  let n = 0;
  for (const slot of root.querySelectorAll('[data-fp]')) {
    if (slot.dataset.fpKlaar || n >= FP_MAX_PER_RONDE) continue;
    const spec = fpSpec(slot.dataset.fp);
    if (!spec) continue;
    slot.dataset.fpKlaar = '1';
    n++;
    renderSnapshot(spec, FP_LIST_W, FP_LIST_H, (url) => {
      if (!url || !slot.isConnected) return;
      let img = slot.querySelector('img');
      if (!img) { img = document.createElement('img'); img.alt = ''; img.decoding = 'async'; slot.appendChild(img); }
      img.src = url;
      slot.classList.add('is-klaar');
    }, { angle: ANGLE, zoom: 0.9, group: FP_GROUP });
  }
  return n;
}

// Het live voorbeeld: één draaiend model tegelijk, in het slot `.bd-live` van het scherm. Hergebruikt de gedeelde renderer (een 2D-canvas, geen eigen GL-context).
let live = null;
export function showLive(box, sleutel) {
  if (!box || typeof document === 'undefined') return false;
  const spec = fpSpec(sleutel);
  if (!spec) return false;
  if (live && (live.box !== box || !live.box.isConnected)) ruimLive();
  if (!live) {
    const canvas = document.createElement('canvas');
    canvas.className = 'bd-live__doek';
    canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);
    live = { box, canvas, p: createSharedPreview(canvas, { active: () => canvas.isConnected, angle: ANGLE, speed: reducedMotion() ? 0 : 0.6, fps: 30, zoom: 0.9 }) };
  }
  live.p.show(spec);
  box.dataset.fpLive = sleutel;
  return true;
}
export function ruimLive() {
  if (!live) return;
  live.p.dispose();
  if (live.canvas.parentNode) live.canvas.parentNode.removeChild(live.canvas);
  live = null;
}
export const liveActief = () => !!live;

// Het menuonderdeel sluit (of een ander onderdeel opent): wachtrij leeg, plaatjes terug, live voorbeeld weg.
export function ruimPlaatjes() {
  ruimLive();
  cancelSnapshots(FP_GROUP);
  return releaseSnapshots(FP_GROUP);
}
