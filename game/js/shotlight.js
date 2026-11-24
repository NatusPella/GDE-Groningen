// Licht per shot (#1323): het licht van een cutscene is data in de scènedefinitie, net als de camera. Puur (geen THREE): de host
// (cutscenehost.js) legt het resultaat via world.lightMood op het wereldlicht van dit beeld en zet een geleende lamp als tegenlicht.
//
// Waar het staat (cutscript.js, missionScene in cutscenes_akte1.js):
//   def.light                       het licht van de hele scène (alle shots zonder eigen licht)
//   def.shots[i].light              het licht van dat ene shot (wint van def.light)
//   spec.light / spec.lights        in een missiespec: `light` voor de hele scène, `lights: [{ on, dt, light }]` vanaf die regel
//                                   (geldt vanaf de eerste snee op of na dat moment, tot de volgende ingang)
// Zonder licht blijft het wereldlicht (de klok en het weer) precies zoals het is: dat is de terugval.
//
// Een licht is een preset-naam ('gouden-uur') of een object; een object mag een preset uitbreiden:
//   { preset: 'avond-binnen',
//     key:  { kelvin: 3200, intensity: 0.8, azimuth: -40, elevation: 25 },  // de zon als hoofdlicht: kleurtemperatuur, maal de wereldzon,
//                                                                          // richting in graden t.o.v. de camera (+ = rechts in beeld, 0 = van achter de camera)
//     fill: { kelvin: 6500, intensity: 0.7 },                                // het hemellicht als vullicht: maal het wereldhemellicht
//     rim:  { kelvin: 4000, intensity: 1.2 },                                // tegenlicht achter het onderwerp (een geleende lamp, 0 = uit)
//     exposure: 1.0, saturation: 1.0, mix: 0.8 }                             // belichting en verzadiging (maal), hoeveel de kleuren het wereldlicht vervangen
// Elk veld is optioneel; een ontbrekend veld laat dat deel van het wereldlicht staan.
//
// Samen spelen: alleen data in de scènedefinitie; een gast speelt dezelfde def (cutPakket) en ziet hetzelfde licht.

export const LIGHT_PRESETS = {
  // het wereldlicht zoals het is (expliciet: een shot dat terug moet naar de dag in een scène met een eigen licht)
  dag: {},
  'gouden-uur': { key: { kelvin: 3300, intensity: 1.0, azimuth: 60, elevation: 12 }, fill: { kelvin: 6800, intensity: 0.75 }, rim: { kelvin: 3000, intensity: 1.6 }, exposure: 1.0, saturation: 1.08 },
  ochtend: { key: { kelvin: 4800, intensity: 0.9, azimuth: 70, elevation: 15 }, fill: { kelvin: 8000, intensity: 0.9 }, saturation: 0.95 },
  'avond-buiten': { key: { kelvin: 4200, intensity: 0.55, azimuth: 50, elevation: 8 }, fill: { kelvin: 9500, intensity: 0.9 }, rim: { kelvin: 2700, intensity: 1.2 }, exposure: 0.92, saturation: 0.95 },
  'avond-binnen': { key: { kelvin: 2900, intensity: 0.6, azimuth: -45, elevation: 30 }, fill: { kelvin: 3600, intensity: 0.85 }, rim: { kelvin: 2600, intensity: 1.0 }, exposure: 0.95 },
  'warm-intiem': { key: { kelvin: 3000, intensity: 0.8, azimuth: 35, elevation: 20 }, fill: { kelvin: 3800, intensity: 0.7 }, rim: { kelvin: 2800, intensity: 1.5 }, exposure: 0.97, saturation: 1.05 },
  'bewolkt-zacht': { key: { kelvin: 6500, intensity: 0.55 }, fill: { kelvin: 6800, intensity: 1.25 }, saturation: 0.9 },
  'tl-binnen': { key: { kelvin: 5600, intensity: 0.5, elevation: 70 }, fill: { kelvin: 5200, intensity: 1.2 }, saturation: 0.88 },
  spanning: { key: { kelvin: 5200, intensity: 1.2, azimuth: 85, elevation: 20 }, fill: { kelvin: 7500, intensity: 0.45 }, rim: { kelvin: 6500, intensity: 1.8 }, exposure: 0.9 },
  'nacht-straat': { key: { kelvin: 2400, intensity: 0.6, azimuth: 20, elevation: 45 }, fill: { kelvin: 12000, intensity: 0.7 }, rim: { kelvin: 7000, intensity: 1.6 } },
};
export const LIGHT_PRESET_NAMES = Object.keys(LIGHT_PRESETS);

const PARTS = { key: ['kelvin', 'intensity', 'azimuth', 'elevation'], fill: ['kelvin', 'intensity'], rim: ['kelvin', 'intensity'] };
const TOP = ['preset', 'key', 'fill', 'rim', 'exposure', 'saturation', 'mix'];
const RANGE = { kelvin: [1500, 15000], intensity: [0, 4], azimuth: [-180, 180], elevation: [-10, 90], exposure: [0.4, 1.8], saturation: [0, 2], mix: [0, 1] };
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

// Ontwikkelaarsmeldingen (leeg = goed) voor één lichtspec; `where` staat voor elke melding (validateScene).
export function lightIssues(spec, where = 'light') {
  const out = [];
  if (spec == null) return out;
  if (typeof spec === 'string') { if (!LIGHT_PRESETS[spec]) out.push(`${where}: unknown light preset ${spec}`); return out; }
  if (typeof spec !== 'object' || Array.isArray(spec)) return [`${where}: light must be a preset name or an object`];
  for (const k of Object.keys(spec)) if (!TOP.includes(k)) out.push(`${where}: unknown light field ${k}`);
  if (spec.preset !== undefined && !LIGHT_PRESETS[spec.preset]) out.push(`${where}: unknown light preset ${spec.preset}`);
  for (const k of ['exposure', 'saturation', 'mix']) {
    if (spec[k] === undefined) continue;
    if (!isNum(spec[k]) || spec[k] < RANGE[k][0] || spec[k] > RANGE[k][1]) out.push(`${where}: ${k} must be ${RANGE[k][0]}..${RANGE[k][1]}`);
  }
  for (const [part, fields] of Object.entries(PARTS)) {
    const p = spec[part];
    if (p === undefined || p === null) continue;
    if (typeof p !== 'object' || Array.isArray(p)) { out.push(`${where}: ${part} must be an object`); continue; }
    for (const k of Object.keys(p)) {
      if (!fields.includes(k)) { out.push(`${where}: unknown ${part} field ${k}`); continue; }
      if (!isNum(p[k]) || p[k] < RANGE[k][0] || p[k] > RANGE[k][1]) out.push(`${where}: ${part}.${k} must be ${RANGE[k][0]}..${RANGE[k][1]}`);
    }
  }
  return out;
}

// Het licht van een shot: het eigen licht van het shot, anders dat van de scène; een preset uitgevouwen en het object eroverheen.
// Geeft null als er geen licht is (het wereldlicht blijft), anders een vlak object { key, fill, rim, exposure, saturation, mix, name }.
export function resolveShotLight(sceneLight, shotLight) {
  const spec = shotLight ?? sceneLight ?? null;
  if (spec == null) return null;
  const obj = typeof spec === 'string' ? { preset: spec } : spec;
  const base = (obj.preset && LIGHT_PRESETS[obj.preset]) || {};
  const out = { name: obj.preset || 'eigen', mix: obj.mix ?? base.mix ?? 0.8 };
  for (const part of Object.keys(PARTS)) {
    const p = { ...(base[part] || {}), ...(obj[part] || {}) };
    if (Object.keys(p).length) out[part] = p;
  }
  for (const k of ['exposure', 'saturation']) { const v = obj[k] ?? base[k]; if (v !== undefined) out[k] = v; }
  return out;
}

// Kleurtemperatuur (K) naar sRGB 0..1 (de bekende benadering van Tanner Helland, goed genoeg voor licht van 1500 tot 15000 K).
export function kelvinToRgb(k, out = { r: 1, g: 1, b: 1 }) {
  const t = Math.max(1000, Math.min(40000, k)) / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  out.r = c(r); out.g = c(g); out.b = c(b);
  return out;
}

const _rgb = { r: 1, g: 1, b: 1 };
const lin = (v) => Math.pow(v, 2.2);
// Mengt een (lineaire) kleur met { r, g, b }-velden naar de kleurtemperatuur k; zonder allocaties.
function tintTo(color, k, mix) {
  if (!color || !isNum(k)) return;
  kelvinToRgb(k, _rgb);
  // de kleur van het licht, niet zijn helderheid: genormaliseerd op de helderste component, de wereld houdt zijn sterkte
  const m = Math.max(_rgb.r, _rgb.g, _rgb.b) || 1;
  const lum = Math.max(color.r, color.g, color.b) || 1;
  color.r += (lin(_rgb.r / m) * lum - color.r) * mix;
  color.g += (lin(_rgb.g / m) * lum - color.g) * mix;
  color.b += (lin(_rgb.b / m) * lum - color.b) * mix;
}

// De richting naar het hoofdlicht in wereldcoördinaten van het spel (x, y, z omhoog), uit de camerapose en de azimut/elevatie van
// het licht. azimuth 0 = het licht staat achter de camera (frontaal op het onderwerp), +90 = rechts in beeld, 180 = tegenlicht.
export function keyDirection(camera, azimuth = 30, elevation = 30, out = { x: 0, y: 0, z: 1 }) {
  const p = camera.position, q = camera.lookAt;
  const h = Math.atan2(q.y - p.y, q.x - p.x);
  // naar de camera toe (vanaf het onderwerp) en rechts in beeld (spelcoördinaten: x, y; de afbeelding naar THREE spiegelt y en z)
  const bx = -Math.cos(h), by = -Math.sin(h);
  const rx = -Math.sin(h), ry = Math.cos(h);
  const a = (azimuth * Math.PI) / 180, e = (elevation * Math.PI) / 180;
  const hx = bx * Math.cos(a) + rx * Math.sin(a), hy = by * Math.cos(a) + ry * Math.sin(a);
  out.x = hx * Math.cos(e); out.y = hy * Math.cos(e); out.z = Math.sin(e);
  return out;
}

// De plek van het tegenlicht: achter het onderwerp (van de camera af gezien) en wat hoger, in spelcoördinaten.
export function rimPosition(camera, out = { x: 0, y: 0, z: 0 }) {
  const p = camera.position, q = camera.lookAt;
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
  out.x = q.x + (dx / d) * 1.8; out.y = q.y + (dy / d) * 1.8; out.z = q.z + 1.2;
  return out;
}

const _dir = { x: 0, y: 0, z: 1 };
// Past een opgelost licht (resolveShotLight) toe op de lichtparameters van dit beeld (daynight.js computeLighting, na de wereldgrading):
// L.sun/L.sunI/L.lightDir (hoofdlicht), L.hemiSky/L.hemiI (vullicht), L.exp en L.sat. `camera` is de camerapose van de cutscene.
// lightDir is een THREE-vector (y omhoog): spel (x, y, z) -> THREE (x, z, y).
export function applyShotLight(L, light, camera) {
  if (!L || !light) return L;
  const mix = light.mix ?? 0.8;
  const k = light.key;
  if (k) {
    if (isNum(k.kelvin) && L.sun) tintTo(L.sun, k.kelvin, mix);
    if (isNum(k.intensity) && isNum(L.sunI)) L.sunI *= k.intensity;
    if ((isNum(k.azimuth) || isNum(k.elevation)) && camera && L.lightDir && !L.isMoon) {
      keyDirection(camera, k.azimuth ?? 30, k.elevation ?? 30, _dir);
      L.lightDir.set(_dir.x, _dir.z, _dir.y);
    }
  }
  const f = light.fill;
  if (f) {
    if (isNum(f.kelvin)) { tintTo(L.hemiSky, f.kelvin, mix); tintTo(L.hemiGnd, f.kelvin, mix * 0.5); }
    if (isNum(f.intensity) && isNum(L.hemiI)) L.hemiI *= f.intensity;
  }
  if (isNum(light.exposure) && isNum(L.exp)) L.exp *= light.exposure;
  if (isNum(light.saturation) && isNum(L.sat)) L.sat *= light.saturation;
  return L;
}

// De kleur (sRGB 0..1) en sterkte van het tegenlicht, of null als het uit is.
export function rimOf(light) {
  const r = light && light.rim;
  if (!r || !(r.intensity > 0)) return null;
  const c = kelvinToRgb(isNum(r.kelvin) ? r.kelvin : 5500, { r: 1, g: 1, b: 1 });
  return { r: c.r, g: c.g, b: c.b, intensity: r.intensity };
}

// Een korte tekst voor het contactvel: "gouden-uur (key 3300 K x1.0 60/12, fill 6800 K x0.75, rim 3000 K x1.6)" of "wereldlicht".
export function describeLight(light) {
  if (!light) return 'wereldlicht';
  const p = [];
  if (light.key) p.push(`key${light.key.kelvin ? ` ${light.key.kelvin} K` : ''}${light.key.intensity != null ? ` x${light.key.intensity}` : ''}${light.key.azimuth != null || light.key.elevation != null ? ` ${light.key.azimuth ?? 30}/${light.key.elevation ?? 30}` : ''}`);
  if (light.fill) p.push(`fill${light.fill.kelvin ? ` ${light.fill.kelvin} K` : ''}${light.fill.intensity != null ? ` x${light.fill.intensity}` : ''}`);
  if (light.rim) p.push(`rim${light.rim.kelvin ? ` ${light.rim.kelvin} K` : ''} x${light.rim.intensity ?? 0}`);
  if (light.exposure != null) p.push(`belichting x${light.exposure}`);
  return `${light.name}${p.length ? ` (${p.join(', ')})` : ''}`;
}
