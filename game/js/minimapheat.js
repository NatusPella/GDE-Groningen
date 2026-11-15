// #952: op de mini-map stond bij de politie een kaal cijfer (het aantal eenheden). Spelers
// lazen dat als een heat-niveau en snapten het niet. Deze module maakt van warmte een
// beeld: een ring om het politie-schild met één segment per ster, en kleine stippen voor
// extra eenheden in plaats van een getal. Puur (geen canvas, geen DOM), zodat
// scripts/minimapheat_test.mjs de regels kan natrekken; hud_panel.js tekent alleen.
export const HEAT_MAX = 5;
export const HEAT_RING = { r: 11.5, breed: 2.6, start: -Math.PI * 0.62, eind: Math.PI * 0.62, gat: 0.16 };
export const UNIT_DOTS = 3; // hoogstens drie stippen: meer eenheden lezen toch als "veel"

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const geheel = (v, d = 0) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : d);

// De ring: per ster een boogsegment, plus de kleur en de gloed van dit moment.
// `wanted` 0..5; searching = de politie zoekt (dan pulseert de ring zacht).
export function heatRing(wanted, { searching = false, time = 0, max = HEAT_MAX } = {}) {
  const sterren = clamp(geheel(wanted), 0, Math.max(1, max));
  const segmenten = [];
  for (let i = 0; i < max; i++) {
    const a0 = HEAT_RING.start + (i / max) * (HEAT_RING.eind - HEAT_RING.start) + HEAT_RING.gat / 2;
    const a1 = HEAT_RING.start + ((i + 1) / max) * (HEAT_RING.eind - HEAT_RING.start) - HEAT_RING.gat / 2;
    segmenten.push({ i, van: a0, tot: a1, aan: i < sterren });
  }
  // hoe heter, hoe feller; zoeken laat de ring ademen in plaats van knipperen
  const puls = searching ? 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(time * 4.2)) : 1;
  return {
    sterren, segmenten,
    kleur: sterren > 0 ? 'red' : 'policeBlue',
    alpha: (sterren > 0 ? 0.55 + 0.09 * sterren : 0.4) * puls,
    searching: !!searching && sterren > 0,
  };
}

// Eenheden bovenop de eerste: stippen in plaats van een cijfer (0 bij één eenheid).
export function unitDots(units) {
  return clamp(geheel(units) - 1, 0, UNIT_DOTS);
}

// Wat een schermlezer en de legendaregel zeggen. Leeg zonder politie in beeld.
export function heatUitleg(wanted, units = 0, { searching = false } = {}) {
  const n = geheel(units);
  if (n <= 0) return '';
  const warm = clamp(geheel(wanted), 0, HEAT_MAX);
  const eenheid = n === 1 ? 'politie-eenheid' : 'politie-eenheden';
  const heat = warm === 0 ? 'je bent niet gezocht' : `gezocht: ${warm} van ${HEAT_MAX} sterren${searching ? ', ze zoeken je' : ''}`;
  return `${n} ${eenheid} in beeld · ${heat}`;
}
