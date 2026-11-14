// Eerste persoon (#833): de stand en de meetkunde van de speelcamera. Puur, zonder three.js
// of DOM, zodat scripts/firstperson_test.mjs het in gewone node kan narekenen. scene3d.js zet
// de camera op het oog, player.js draait het lichaam mee en cinematics.js levert de C-toets.
//
// De stand leeft op world.firstPersoon ({ on, pitch }); de speler bewaart zijn keuze als de
// instelling `firstPersoon` (settings.js, standaard uit). De instelling is de waarheid bij het
// laden en na een schakelaar in het pauzemenu; syncFirstPerson werkt hem door.
import { getSettings, setSetting } from './settings.js';

// De kijkhoek stopt vlak voor het zenit: op 90 graden klapt lookAt om en draait het beeld.
export const PITCH_LIMIT_DEG = 85;
export const PITCH_LIMIT = PITCH_LIMIT_DEG * Math.PI / 180;

// Ooghoogte boven de voeten, als het hoofd van het figuur niet te gebruiken is: staan,
// kruipen (bukken) en zwemmen.
export const EYE_STAND = 1.62;
export const EYE_CROUCH = 1.08;
export const EYE_SWIM = 0.55;

// Zet de stand klaar op de wereld; zonder bestaande stand leest hij de bewaarde instelling.
// De pitch is de eigen kijkhoek van de eerste-persooncamera (radialen, 0 = recht vooruit).
export function initFirstPerson(world) {
  if (!world) return null;
  const st = world.firstPersoon && typeof world.firstPersoon === 'object' ? world.firstPersoon : (world.firstPersoon = {});
  st.on = getSettings().firstPersoon === true;
  if (!Number.isFinite(st.pitch)) st.pitch = 0;
  return st;
}

export function firstPersonOn(world) {
  return !!(world && world.firstPersoon && world.firstPersoon.on);
}

// Wat de speler in het pauzemenu koos, doorwerken naar de stand. Geeft true terug als de
// stand daardoor veranderde (de camera moet dan een harde snee maken). Leest de instelling
// alleen: setSetting schrijft hem, net als de C-toets (setFirstPerson).
export function syncFirstPerson(world) {
  if (!world) return false;
  const st = world.firstPersoon || initFirstPerson(world);
  if (!st) return false;
  const want = getSettings().firstPersoon === true;
  if (st.on === want) return false;
  st.on = want;
  st.pitch = 0;
  return true;
}

// Aan of uit, en de keuze bewaren. Een nieuwe stand begint recht vooruit.
export function setFirstPerson(world, aan) {
  if (!world) return false;
  const st = world.firstPersoon || initFirstPerson(world);
  if (!st) return false;
  const want = !!aan;
  st.on = want;
  st.pitch = 0;
  setSetting('firstPersoon', want);
  return want;
}

export function toggleFirstPerson(world) {
  return setFirstPerson(world, !firstPersonOn(world));
}

// Kijkhoek van de muis erbij, met dezelfde gevoeligheid als de volgcam (dy in pixels).
// Muis omlaag (dy > 0) laat je omlaag kijken, net als bij de volgcam (daar gaat de baan dan
// omhoog); in pitch betekent dat een KLEINERE hoek, want +pitch is omhoog. invertY keert het
// om. Geeft de nieuwe, begrensde hoek terug.
export function addLookPitch(world, dyPx, radPerPx, invertY = false) {
  const st = world && (world.firstPersoon || initFirstPerson(world));
  if (!st) return 0;
  const d = Number.isFinite(dyPx) && Number.isFinite(radPerPx) ? dyPx * radPerPx : 0;
  st.pitch = clampPitch(st.pitch - d * (invertY ? -1 : 1));
  return st.pitch;
}

export function clampPitch(pitch) {
  if (Number.isNaN(pitch)) return 0;
  return Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));
}

// Kijkvector uit yaw en pitch in wereldtermen: x = oost, y = hoogte, z = de kaart-y (noord/zuid).
// Dezelfde yaw-conventie als de rest van het spel: cos op x, sin op kaart-y. `out` is er voor
// het heter pad: scene3d.js geeft een module-tijdelijk object mee, zodat een frame niets alloceert.
export function lookVector(yaw, pitch, out = null) {
  const cp = Math.cos(pitch);
  const v = out || {};
  v.x = Math.cos(yaw) * cp;
  v.y = Math.sin(pitch);
  v.z = Math.sin(yaw) * cp;
  return v;
}

// Terugval-oog boven de spelerpositie (kaart-x, hoogte, kaart-y), voor als het hoofd van het
// eigen figuur ontbreekt: hetzelfde grondvlak als scene3d.js voor het eigen figuur gebruikt.
// `out` werkt als bij lookVector.
export function firstPersonEye(player, out = null) {
  const p = player || {};
  const base = (p.gz || 0) + (p.z || 0) - (p.wade || 0);
  const e = out || {};
  e.x = p.x || 0;
  e.y = base + eyeHeight(p);
  e.z = p.y || 0;
  return e;
}

export function eyeHeight(player) {
  const p = player || {};
  if (p.swimming || p.water) return EYE_SWIM;
  if (p.crouching) return EYE_CROUCH;
  return EYE_STAND;
}
