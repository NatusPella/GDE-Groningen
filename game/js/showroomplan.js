// De regels achter de showroom van de pimp-werkplaats (epic Autotuning, #1155, ronde 3): camerastanden, de sfeer per werkplaats,
// het gedrag van de draaitafel en welk effect bij welke wijziging hoort. Pure functies, Node-safe, zonder THREE:
// tuningshowroom.js tekent, dit bestand beslist en wordt getest (scripts/showroomplan_test.mjs).
import { CATEGORIES } from './vehiclelook.js';

export const TURNTABLE_SPEED = 0.28; // rad/s: een rustige draaitafel
export const TURNTABLE_AFTER = 3;    // s na de laatste aanraking
export const ZOOM_MIN = 0.55, ZOOM_MAX = 1.8;
export const EL_MIN = 0.02, EL_MAX = 1.25;

// De sfeer per soort werkplaats: wandkleur, neonlijnen, randlicht, vloer. Alleen getallen uit de inkten van het designsysteem
// (ds-tokens.css: glas #0c140e, bord #0e6b3c, geel #f9c80e, roze #e8505b, id-1 #4fb3ff, id-4 #ff9a62, papier #f5efe0).
export const ENVS = {
  garage: { wall: 0x17301f, neon: [0xf9c80e, 0x0e6b3c], rim: 0xf9c80e, floor: 0x0c140e, podium: 0x1f3a28, halogen: 0xfff2cc, label: 'Garage' },
  pomp: { wall: 0x2a1a17, neon: [0xf9c80e, 0xe8505b], rim: 0xe8505b, floor: 0x0c140e, podium: 0x1f3a28, halogen: 0xfff2cc, label: 'Pomp' },
  thuis: { wall: 0x2a3a2e, neon: [0xf9c80e, 0xf5efe0], rim: 0xf9c80e, floor: 0x1d1b17, podium: 0x4d483c, halogen: 0xffe2a8, label: 'Thuis' },
  werf: { wall: 0x10243a, neon: [0x4fb3ff, 0x6fd3e0], rim: 0x4fb3ff, floor: 0x0c140e, podium: 0x1d3a4f, halogen: 0xdff4ff, label: 'Werf' },
  fietsenmaker: { wall: 0x2e2417, neon: [0xff9a62, 0xf9c80e], rim: 0xff9a62, floor: 0x1d1b17, podium: 0x4d3a28, halogen: 0xfff2cc, label: 'Fietsenmaker' },
  tuning: { wall: 0x1d1233, neon: [0xe8505b, 0xb78cff], rim: 0xe8505b, floor: 0x0c140e, podium: 0x2a1f44, halogen: 0xf3ecff, label: 'Tuningwinkel' },
};
export const envFor = (kind) => ENVS[kind] || ENVS.garage;

// Camerastanden. size: { L, W, H } van het voertuig (m); wheel: { x, y, z } van het voorwiel of null. Een stand is
// { az, el, dist, target: [x, y, z] }: azimut om het voertuig (0 = van voren, pi/2 = zijkant rechts), elevatie, afstand.
export const VIEW_IDS = ['schuin', 'voor', 'zij', 'achter', 'wiel', 'detail', 'hoogte'];
export const VIEW_LABELS = { schuin: 'Schuin', voor: 'Voor', zij: 'Zij', achter: 'Achter', wiel: 'Wiel', detail: 'Detail', hoogte: 'Hoogte' };
export function viewPreset(id, size, wheel = null) {
  const L = Math.max(0.8, size.L || 4), W = size.W || 1.8, H = Math.max(0.6, size.H || 1.5);
  const fit = Math.max(L * 1.95, H * 4.6, 5);
  const mid = [0, H * 0.42, 0];
  switch (id) {
    case 'voor': return { az: 0.0, el: 0.1, dist: fit * 0.95, target: mid };
    case 'zij': return { az: Math.PI / 2, el: 0.07, dist: fit * 1.05, target: mid };
    case 'achter': return { az: Math.PI + 0.25, el: 0.12, dist: fit * 0.95, target: mid };
    case 'wiel': return { az: Math.PI / 2 - 0.45, el: 0.1, dist: Math.max(1.6, L * 0.42), target: wheel ? [wheel.x, wheel.y, wheel.z] : [L * 0.28, H * 0.22, W / 2] };
    case 'detail': return { az: 0.7, el: 0.22, dist: fit * 0.6, target: [L * 0.22, H * 0.5, 0] };
    case 'hoogte': return { az: 0.8, el: 1.1, dist: fit * 1.25, target: [0, H * 0.3, 0] };
    default: return { az: 0.62, el: 0.2, dist: fit, target: mid };
  }
}
export const nextView = (id, dir = 1) => VIEW_IDS[(VIEW_IDS.indexOf(id) + dir + VIEW_IDS.length) % VIEW_IDS.length] || VIEW_IDS[0];

// De camerapositie uit azimut, elevatie en afstand rond een doel.
export function orbitPosition(az, el, dist, target) {
  const ce = Math.cos(el);
  return [target[0] + dist * ce * Math.cos(az), target[1] + dist * Math.sin(el), target[2] + dist * ce * Math.sin(az)];
}

// De kortste weg van hoek a naar b (in -pi..pi) en een zachte stap daarheen.
export const angleDelta = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export const ease = (cur, goal, dt, rate = 6) => cur + (goal - cur) * (1 - Math.exp(-rate * dt));
export const easeAngle = (cur, goal, dt, rate = 6) => cur + angleDelta(cur, goal) * (1 - Math.exp(-rate * dt));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Eén stap van de camera naar zijn doel. cam en goal zijn { az, el, dist, target, zoom }. Geeft een nieuwe cam terug.
export function stepCamera(cam, goal, dt, rate = 6) {
  return {
    az: easeAngle(cam.az, goal.az, dt, rate), el: ease(cam.el, goal.el, dt, rate), dist: ease(cam.dist, goal.dist, dt, rate),
    target: cam.target.map((v, i) => ease(v, goal.target[i], dt, rate)),
  };
}

// De draaitafel: wacht TURNTABLE_AFTER s na een aanraking, draait dan zacht door; "Beweging beperken" draait nooit.
export function turntableAz(az, idle, dt, reduced = false) {
  if (reduced || idle < TURNTABLE_AFTER) return az;
  return az + TURNTABLE_SPEED * dt;
}

// Het effect bij een wijziging: lak = spuitbus, velgen = wieldraai, licht (underglow) = neon dat opkomt, de rest een korte flits.
export const EFFECT_OF_CATEGORY = { lak: 'spray', velgen: 'spin', licht: 'neon', strepen: 'flash', carrosserie: 'flash', details: 'flash', snack: 'flash', onderdelen: 'flash' };
export function categoryOfField(field) {
  if (field === 'body') return 'lak';
  const c = CATEGORIES.find((x) => x.fields.includes(field));
  return c ? c.id : 'onderdelen';
}
// De plek van de flits op het voertuig als deel van zijn maat (x vooruit, y omhoog, z opzij): { x, y, z } in -1..1 voor L, H, W.
const FLASH_SPOT = { spoiler: [-0.5, 0.75, 0], kit: [0.45, 0.1, 0.5], diffuser: [-0.5, 0.1, 0], roof: [0, 1, 0], exhaust: [-0.5, 0.1, 0.3], lamps: [0.5, 0.5, 0.3], decal: [0, 0.5, 0.5], stripe: [0.2, 0.9, 0], hanger: [0.2, 0.8, 0], awning: [0, 0.8, 0.8], display: [0, 0.1, 0.9], beacon: [0.3, 1, 0], air: [0, 1, 0] };
export const flashSpot = (field) => FLASH_SPOT[field] || [0, 0.5, 0];

// Een effect heeft een duur en een verloop 0..1 (1 = net begonnen, 0 = klaar). Zachte uitloop.
export const EFFECT_MS = { spray: 900, spin: 1400, neon: 800, flash: 420 };
export const effectLevel = (kind, ageMs) => { const d = EFFECT_MS[kind] || 400; return ageMs >= d ? 0 : (1 - ageMs / d) ** 2; };

// Gesplitste voor/na-weergave: de verdeling van het scherm. Geeft viewports { x, w } voor links (voor) en rechts (na).
export const splitViewports = (width, ratio = 0.5) => { const w = Math.round(width * clamp(ratio, 0.2, 0.8)); return [{ x: 0, w }, { x: w, w: width - w }]; };

// Het budget van de showroom: één renderer, pixelratio hoogstens 1,5, geen schaduwkaarten, hoogstens 4 lichten + 1 effectlicht.
export const SHOWROOM_BUDGET = { renderers: 1, maxPixelRatio: 1.5, shadowMaps: 0, lights: 5, particles: 64, neonStrips: 6 };

// De iconen (icons.js betekenisnamen, iconmap.js) per tabblad en per veld van de werkplaats.
export const TAB_ICON = { lak: 'tune_lak', strepen: 'tune_strepen', velgen: 'tune_velgen', carrosserie: 'tune_carrosserie', licht: 'tune_licht', details: 'tune_details', snack: 'tune_snack', onderdelen: 'tune_onderdelen', builds: 'tune_builds' };
export const FIELD_ICON = {
  body: 'tune_lak', finish: 'tune_afwerking', color2: 'tune_kleur2', stripe: 'tune_strepen', decal: 'tune_sticker', rimStyle: 'tune_velgen', rimColor: 'tune_velgen',
  rimSize: 'tune_velgmaat', tire: 'tune_banden', spoiler: 'tune_spoiler', kit: 'tune_kit', diffuser: 'tune_diffuser', roof: 'tune_dak', exhaust: 'tune_uitlaat',
  lamps: 'tune_koplampen', lampColor: 'tune_koplampen', glow: 'tune_underglow', tint: 'tune_tint', plate: 'tune_plaat', hanger: 'tune_hanger',
  awning: 'tune_luifel', display: 'tune_uitstalling', beacon: 'tune_bakkenlicht', air: 'tune_lucht', snackName: 'tune_belettering',
  banden: 'tune_banden', uitlaat: 'tune_uitlaat', stoel: 'tune_stoel', verlichting: 'tune_koplampen', geluid: 'tune_geluid', ophanging: 'tune_ophanging', motor: 'tune_motor',
};
export const iconOfField = (f) => FIELD_ICON[f] || 'tune_onderdelen';
// De kop boven de keuzes van een categorie: wat je hier kiest, in één zin (de showroom van ronde 4: elke categorie heeft zijn icoon en uitleg).
export const CATEGORY_BLURB = {
  lak: 'De kleur en de glans van je carrosserie. De spuitbus doet de rest.',
  strepen: 'Strepen en stickers: kies er één en draai de auto een kwartslag.',
  velgen: 'Velgen, banden en maat: het eerste wat iemand op het treffen bekijkt.',
  carrosserie: 'Spoiler, kit, diffuser, dakdrager en uitlaat: de vorm van je auto.',
  licht: 'Koplampen, lampkleur, underglow en raamfolie. Neon brandt alleen \'s nachts.',
  details: 'Een nummerbord met verzonnen tekst en een hanger aan de spiegel.',
  snack: 'De snackwagen: luifel, uitstalling, bakkenlicht, geur en je eigen belettering.',
  onderdelen: 'Banden, uitlaat, stoel, verlichting en geluid: wat je voelt en hoort.',
  builds: 'Bewaar je uiterlijk als build en haal het later terug.',
};
export const blurbOf = (tabId) => CATEGORY_BLURB[tabId] || '';
