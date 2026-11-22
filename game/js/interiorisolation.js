// Binnenruimte-isolatie in het spel (eigenaar 22-11: "ik zie nog dingen uit de wereld door de interieurs heenkomen, los dat structureel
// op"). Eén plek waar elke binnenruimte zich aanmeldt (de hal van een pand in interiors.js, een binnenset in stagesets.js) en waar de
// wereld daarop reageert, in drie lagen:
//   1. de snede (interiorcut3d.js): de vaste wereldlagen (meubilair, bomen, stadsprops, lantaarns) tekenen niets binnen het volume;
//   2. de veegronde (hier): voetgangers, verkeer en losse props die er al stonden of er inlopen gaan eruit, zoals bij een clearzone;
//   3. het register (interiorvolume.js): spawners en plaatsers vragen inInteriorVolume en zetten er niets neer (pedgeom.js isInsideBuilding).
// Bij het weggooien van de ruimte gaat het volume uit en is alles weer zoals het was: de snede is alleen tekenen, er verdwijnt niets uit de
// wereldgegevens (een prop dat is weggeschopt komt terug zoals elke geschopte prop, een voetganger loopt gewoon weer verder).
//
// Samen spelen: elke speler bouwt zijn eigen interieurs (interiors.js) en dus ook zijn eigen volumes; de snede en de veegronde werken alleen
// in het eigen spel en sturen niets over het net. Wie binnen is verbergt de wereld dus alleen lokaal: een medespeler buiten ziet zijn eigen
// ongewijzigde wereld, en een gast die aansluit bouwt zijn eigen volumes zodra hij bij een pand komt. Opslaan en laden: er is niets om op te slaan, de
// volumes volgen de levende ruimten (een spel dat binnen laadt bouwt de ruimte, interiors.js binnenplekInPand, en meldt hem daarmee aan).
import { hoofdspeler } from './players.js';
import { findProps, breakProp } from './breakables.js';
import { addInteriorVolume, removeInteriorVolume, interiorVolumes, interiorVolumeAt, pushOutOfInteriorVolume } from './interiorvolume.js';
import { setInteriorCutVolumes } from './interiorcut3d.js';

let dirty = true;
let timer = 0;
let version = 0;

// Meld een binnenvolume aan (volume: interiorvolume.js volumeOfPlan / volumeOfRoom). Een zelfde id vervangt het vorige.
export function openInteriorVolume(id, volume) {
  if (!id || !volume) return;
  addInteriorVolume(id, volume);
  dirty = true; timer = 0; version++;
}

export function closeInteriorVolume(id) {
  if (removeInteriorVolume(id)) { dirty = true; version++; }
}

// Het versienummer van het register: een laag die zijn lijst bewaart (bomen, kaartcellen) bouwt opnieuw als het verandert.
export const interiorVolumeVersion = () => version;

// Elke frame: de snede bijwerken als er iets veranderde, en twee keer per seconde de wereld opruimen binnen de volumes.
export function updateInteriorIsolation(dt, world) {
  const p = world ? hoofdspeler(world) : null;
  if (dirty) { dirty = false; setInteriorCutVolumes(interiorVolumes(), p); }
  if (!world || world.paused || !p) return;
  timer -= dt;
  if (timer > 0) return;
  timer = 0.5;
  const zs = interiorVolumes();
  if (!zs.length) return;
  for (const ped of world.pedestrians || []) {
    if (ped.scene || ped.scripted || ped.jobPed || ped.missionCrowd || ped.state === 'dead' || ped.ragdoll || ped.pose) continue;
    if (!interiorVolumeAt(ped.x, ped.y, 0.25, null, 0)) continue;
    const o = pushOutOfInteriorVolume(ped.x, ped.y, 0.25, 0.4, 0);
    ped.x = o.x; ped.y = o.y;
    ped.waypoint = null;
  }
  const vs = world.vehicles || [];
  for (let i = vs.length - 1; i >= 0; i--) {
    const v = vs[i];
    if (v === p.inVehicle || v.driver === 'player' || v.isBoat || v.isHeli || v.missionCar || v.isHeroCar || v.playerOwned || v.scripted) continue;
    if (interiorVolumeAt(v.x, v.y, v.halfLen || 1, v.z || 0, 0)) vs.splice(i, 1);
  }
  for (const z of zs) {
    const r = z.rect ? Math.hypot(z.rect.hu, z.rect.hv) + 1.5 : 12;
    const cx = z.rect ? z.rect.cx : (z.bounds[0] + z.bounds[2]) / 2, cy = z.rect ? z.rect.cy : (z.bounds[1] + z.bounds[3]) / 2;
    if (Math.hypot(cx - p.x, cy - p.y) > 300) continue;
    for (const pr of findProps(cx, cy, r)) {
      if (pr.mass >= 1e5 || !pr.cell || !interiorVolumeAt(pr.x, pr.y, pr.r || 0.3, null, 0)) continue;
      const o = pushOutOfInteriorVolume(pr.x, pr.y, pr.r || 0.3, 1.2, 0);
      const nx = o.x - pr.x, ny = o.y - pr.y, l = Math.hypot(nx, ny) || 1;
      breakProp(pr, { vx: nx / l * 4, vy: ny / l * 4, speed: 4, lift: 0.4, nx: nx / l, ny: ny / l, byPlayer: false });
    }
  }
}

// Alles weer vrij (een nieuw spel, laden): de binnenruimten worden daarna opnieuw aangemeld.
export function resetInteriorIsolation() {
  for (const z of interiorVolumes()) removeInteriorVolume(z.id);
  dirty = true; version++;
}
