// Achtervolgers (eigenaar, 22-11: "de achtervolger is gewoon een auto"): welk uiterlijk, welk gedrag en welke kaartmarkering een
// achtervolgende wagen krijgt, per rol. Pure data en keuzes (geen THREE, geen DOM, geen wereld): missions.js en convoy.js zetten
// de rol op het voertuig, missionmaplive.js leest de markering. scripts/chaserlook_test.mjs.
//
// Uiterlijk: Jelles mannen rijden de trekker-limo (model 'trekkerlimo': trekker voorop, lange zwarte limousine erachter; een eigen
// mesh, ook voor de gast bekend in coopworld VOERTUIG_MODELLEN). Een los model 'limo' bestaat niet en werd een gewone hatchback:
// dat was de fout in de colonne-missie. Geen echte merken of emblemen; een zwaailicht is alleen voor politie (eigen model).
// Gedrag: de chase-AI van traffic.js met een eerlijke kruissnelheid (zie CRUISE_MAX en eerlijkeCruise).
// Afgrenzing: een achtervolger is geen ontdekbaar of bezitbaar spelervoertuig: geen stockKey (garageknown.js telt alleen voertuigen
// met een winkelsleutel) en `ontdekbaar(v)` is onwaar voor elke achtervolger.
// Samen spelen: de achtervolger hoort bij de wereld van wie het spel opende (de missiestap draait daar); een gast ziet hem als gewoon
// voertuig in de snapshot (model 'trekkerlimo') en de kaartmarkering volgt op elk apparaat uit de voertuigen die het kent.

// Markerrol van missionmap.js voor gevaar (icoon 'mm-gevaar', DS3-gevaarkleur).
export const GEVAAR_ROL = 'threat';

const LIMO = { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#1b1c1f' }; // lakkleur van het voertuigmodel (1:1 de oude kleur uit convoy.js), geen UI-kleur: chaserlook.js staat in ART_FILES van rules_audit

// maxSpeed/accel/brake/turnRate staan per rol zoals de missies ze al hadden (balans blijft gelijk).
export const CHASER_ROLES = {
  // M10: de limo achter je (goto-stap `pursuer`)
  limoAchter: { label: 'Trekker-limo van Jelle', model: { ...LIMO, maxSpeed: 40, accel: 7, brake: 14, turnRate: 2.1 }, cruise: 15, gevaar: true },
  // M23: Jelles limo die op de colonne afkomt
  limoColonne: { label: 'Jelles limo', model: { ...LIMO, maxSpeed: 30, accel: 7, brake: 14, turnRate: 2.1 }, cruise: 17, gevaar: true },
  // M14/M24: de vluchtende trekker-limo (jij haalt hem in; hij is het doel, geen aanvaller)
  limoVlucht: { label: 'Trekker-limo van Jelle', model: null, cruise: 15, gevaar: false },
  // de vluchtende tankwagen en Tessa's eigen Escapade: doelen, geen gevaar
  tankwagen: { label: 'Tankwagen', model: null, cruise: 15, gevaar: false },
  escapade: { label: 'De Escapade', model: null, cruise: 15, gevaar: false },
};

// Een rol uit de naam van het model dat een chase-stap vraagt (st.vehicle.name), voor de vluchtende wagens.
export function roleOfModelName(name) {
  if (name === 'trekkerlimo') return 'limoVlucht';
  if (name === 'truck') return 'tankwagen';
  if (name === 'escort') return 'escapade';
  return null;
}

// Hoogste kruissnelheid (m/s) en het deel van de topsnelheid dat de AI mag gebruiken: geen onmogelijke snelheid, een eerlijke kans.
export const CRUISE_MAX = 22;
const CRUISE_SHARE = 0.85;
export function eerlijkeCruise(cruise, maxSpeed) {
  const c = Number.isFinite(cruise) ? cruise : 14;
  const top = Number.isFinite(maxSpeed) ? maxSpeed * CRUISE_SHARE : CRUISE_MAX;
  return Math.max(6, Math.min(c, CRUISE_MAX, top));
}

export const roleSpec = (role) => CHASER_ROLES[role] || null;
export const isChaser = (v) => !!(v && v.chaserRole && CHASER_ROLES[v.chaserRole]);
// Wat een speler kan ontdekken of bezitten: een achtervolger nooit.
export const ontdekbaar = (v) => !isChaser(v);

// Zet de rol op een voertuig: de markeringsvlag en een eerlijke cruise in zijn AI-opties. Geeft het voertuig terug.
export function markChaser(v, role) {
  const spec = roleSpec(role);
  if (!v || !spec) return v;
  v.chaserRole = role;
  if (v.aiOpts && v.aiOpts.chase) v.aiOpts = { ...v.aiOpts, cruise: eerlijkeCruise(v.aiOpts.cruise ?? spec.cruise, v.model && v.model.maxSpeed) };
  return v;
}

// De kaartmarkering van de achtervolgers die nu rijden: alleen gevaarlijke rollen, niet wie jij zelf achtervolgt.
export function chaserMarkers(vehicles) {
  const out = [];
  for (const v of vehicles || []) {
    if (!isChaser(v) || v.wrecked || v.hijacked || v.driver === 'player') continue;
    const spec = CHASER_ROLES[v.chaserRole];
    if (!spec.gevaar) continue;
    out.push({ x: v.x, y: v.y, label: spec.label, role: GEVAAR_ROL });
  }
  return out;
}
