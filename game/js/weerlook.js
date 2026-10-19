// Visuele uitwerking van dag, nacht en weer over de provincie (issue #19).
// Zuivere logica, geen THREE en geen DOM: weatherstate.js zegt WAT het weer is,
// dit bestand zegt hoe het eruitziet per streek, tijd van de dag en
// kwaliteitsprofiel. weather.js, nightlights3d.js en sky3d.js lezen de getallen;
// scripts/weerlook_test.mjs controleert ze. Altijd zomer: geen sneeuw, ijs of vorst.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Per kwaliteitsprofiel (laag, middel, hoog uit gfxprofile.js): hoeveel van
// elk effect er getekend wordt. Alles instanced; de budgetten zijn plafonds.
export const LOOK_PROFIELEN = {
  laag: { regenDruppels: 900, plassen: false, natteWegen: true, bliksem: true, lampLichten: 4, lampenMax: 600, ramenLicht: 0.35, ramenMax: 800, koplampKegels: 24, sterren: 600, maan: true, mistLagen: 1 },
  middel: { regenDruppels: 1800, plassen: true, natteWegen: true, bliksem: true, lampLichten: 8, lampenMax: 1000, ramenLicht: 0.6, ramenMax: 2000, koplampKegels: 60, sterren: 1400, maan: true, mistLagen: 2 },
  hoog: { regenDruppels: 2500, plassen: true, natteWegen: true, bliksem: true, lampLichten: 11, lampenMax: 1400, ramenLicht: 0.85, ramenMax: 4000, koplampKegels: 96, sterren: 2600, maan: true, mistLagen: 3 },
};
export const lookProfiel = (naam) => LOOK_PROFIELEN[naam] || LOOK_PROFIELEN.hoog;

// --- zonsopgang en -ondergang per streek ------------------------------------
// Een graad lengte is op deze breedte ongeveer 65 km en kost 4 minuten zon:
// oostelijk (x > 0) loopt de zon voor op de klok (komt eerder op), westelijk later. x in meter vanaf
// het stadscentrum. Bij de kust (noord) hangt 's ochtends en 's avonds meer
// gloed aan de horizon, op de Veenkoloniën (oost) is de lucht droger en helderder.
export function zonUurOffset(x) { return (x / 65000) * (4 / 60); }
export function streekUur(x, uur) { return (((uur + zonUurOffset(x)) % 24) + 24) % 24; }

const GLOED = { stad: 1, noord: 1.25, oost: 0.9, zuid: 1, west: 1.1 };

// Horizongloed 0..1: sterkst als de zon laag staat (hoogte in graden), gedempt
// door bewolking, regen en mist.
export function horizonGloed(streek, zonHoogte, overcast = 0, rain = 0, mist = 0) {
  const laag = smooth(14, 2, Math.abs(zonHoogte)) * smooth(-9, -3, zonHoogte);
  const dempen = 1 - clamp01(overcast * 0.7 + rain * 0.5 + mist * 0.4);
  return clamp01(laag * (GLOED[streek] ?? 1) * dempen);
}

// --- natte wegen en plassen ---------------------------------------------------
// Natheid volgt de regen: snel nat (~6 s), langzaam droog (~40 s), net als de
// grondshaders en weather.js. Een zomerzon droogt sneller dan 's nachts.
export function natheidStap(nat, rain, dt, zon = 0.5) {
  const doel = clamp01(rain * 1.6);
  if (doel > nat) return Math.min(doel, nat + dt / 6);
  return Math.max(doel, nat - dt / (40 * (1.25 - 0.5 * clamp01(zon))));
}

// Wat het wegdek laat zien: glans (reflectie), donkerder wegdek en plasoppervlak.
export function wegLook(nat, profiel) {
  const p = lookProfiel(profiel);
  if (!p.natteWegen) return { glans: 0, donker: 0, plas: 0 };
  return {
    glans: clamp01(nat) * 0.7,
    donker: clamp01(nat) * 0.35,
    plas: p.plassen ? smooth(0.35, 1, nat) : 0,
  };
}

// --- regen, mist en onweer -----------------------------------------------------
export function regenDruppels(rain, profiel) {
  return Math.round(lookProfiel(profiel).regenDruppels * clamp01(rain));
}

// Zicht (afstandsfactor 0.2..1) door mist en regen, voor de mist in scene3d.
export function zichtFactor(mist, rain) {
  return Math.max(0.2, 1 - clamp01(mist) * 0.75 - clamp01(rain) * 0.3);
}

// Bliksemkans per seconde: alleen bij onweer, niet bij lichte regen.
export function bliksemKans(kind, rain, profiel) {
  if (kind !== 'onweer' || !lookProfiel(profiel).bliksem) return 0;
  return 0.04 + 0.12 * clamp01(rain);
}

// Donder volgt de flits: 3 seconden per kilometer.
export const donderVertraging = (afstandM) => Math.max(0, afstandM) / 340;

// --- nacht ---------------------------------------------------------------------
// nacht = 0..1 uit daynight.nightFactor. Lantaarns gaan aan in de schemering
// en uit bij daglicht; donkere bewolking zet ze iets eerder aan.
export function lantaarnAan(nacht, overcast = 0, rain = 0) {
  return smooth(0.25 - clamp01(overcast * 0.12 + rain * 0.08), 0.5, nacht);
}

// Een raam brandt als de huisgenoot thuis is: deterministisch per raam
// (hash 0..1) en afhankelijk van het uur (avond het meest, diep in de nacht weinig).
export function ramenBrandFractie(uur, nacht, profiel) {
  const h = ((uur % 24) + 24) % 24;
  const avond = h >= 12 ? smooth(17, 20, h) * (1 - smooth(23, 24.5, h)) : 0;
  const ochtend = h < 8.5 ? smooth(4.5, 6.5, h) * (1 - smooth(7, 8.5, h)) * 0.6 : 0;
  const nachtstil = h < 5 || h >= 23 ? 0.1 : 0;
  const fractie = clamp01(Math.max(avond, ochtend, nachtstil)) * clamp01(nacht * 1.4);
  return fractie * lookProfiel(profiel).ramenLicht;
}
export const raamBrandt = (hash01, fractie) => hash01 < fractie;

// Koplampen aan: nacht, maar ook bij regen en dichte mist overdag.
export function koplampenAan(nacht, rain, mist) {
  return nacht > 0.3 || rain > 0.35 || mist > 0.4;
}

// Hoe fel de koplampen branden (0..1): de nacht-ramp, maar ook overdag bij
// regen of mist (smooth, zodat ze niet aanspringen als een schakelaar).
export function koplampenFactor(nacht, rain, mist) {
  return Math.max(smooth(0.04, 0.3, nacht), smooth(0.2, 0.5, rain) * 0.8, smooth(0.25, 0.55, mist) * 0.9);
}

// Sterren zichtbaar: nacht en geen dikke bewolking of mist.
export function sterrenZicht(nacht, overcast, mist) {
  return clamp01(smooth(0.5, 0.95, nacht) * (1 - clamp01(overcast * 1.1 + mist * 0.5)));
}

// Maanfase 0..1 (0 nieuw, 0.5 vol) uit het spel-dagnummer; 29,53 dagen per maand.
export function maanFase(dag) {
  return (((dag % 29.53) + 29.53) % 29.53) / 29.53;
}
// Maanverlichting 0..1: vol is 1, nieuw is 0, gedempt door bewolking.
export function maanLicht(dag, overcast = 0) {
  const f = maanFase(dag);
  return clamp01(((1 - Math.cos(f * Math.PI * 2)) / 2) * (1 - overcast * 0.8));
}

// Alles in een keer voor een frame; velden die de renderers lezen.
export function nachtLook({ uur, nacht, overcast = 0, rain = 0, mist = 0, dag = 0, profiel = 'hoog' }) {
  const p = lookProfiel(profiel);
  return {
    lantaarns: lantaarnAan(nacht, overcast, rain),
    ramen: ramenBrandFractie(uur, nacht, profiel),
    koplampen: koplampenAan(nacht, rain, mist),
    sterren: p.sterren ? sterrenZicht(nacht, overcast, mist) : 0,
    maan: p.maan ? maanLicht(dag, overcast) : 0,
    maanFase: maanFase(dag),
  };
}
