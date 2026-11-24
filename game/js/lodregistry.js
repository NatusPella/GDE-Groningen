// Het centrale LOD-register (besluit eigenaar 23-11: alle modellen krijgen LOD's). Puur (geen three.js): de modelsoorten met hun
// LOD-opgave, de afstandstrap met crossfade en hysterese, het meeschalen met de grafische stand en het register van gebouwde modellen
// voor de audit (scripts/lod_audit_test.mjs). De three.js-kant (vereenvoudigen, crossfade, instancing) staat in lodkit3d.js.
//
// Eén systeem: de opgave en de regels zijn die van lodlevels.js (overgenomen van de tak vettruck-23-11, zelfde bestand): per model
// `lod: { grenzen, band, weg }` (niveau 0 tot grenzen[0], ... ; band: de breedte van de dither-overgang rond elke grens; weg: voorbij die
// afstand niets). Een model in het centrale propregister (propregister.js, PROP_REGISTER[id].lod) en een modelsoort hieronder gebruiken
// dezelfde vorm, dezelfde lodChoice en hetzelfde dither-patroon (lod3d.js DitherLOD voor een los model met eigen materialen; lodkit3d.js
// voor instanced en gedeelde materialen).
//
// Voor de andere agents (personen, voertuigen, dieren, interieur): kies een soort uit LOD_KINDS (of voeg er een toe met een regel uitleg)
// en gebruik lodkit3d.js: makeLodInstanced(kind, naam, geometrie, materiaal, cap) voor een instanced model, makeLodObject(kind, naam, mesh)
// voor een los model, en lodForSkinned(kind, naam, skinnedMesh) voor een gerigd model (LOD1+ in een bevroren pose). Elk model dat zo
// gebouwd wordt, komt vanzelf in dit register en dus in de audit. Een model met een eigen opgave in het propregister houdt die opgave.
import { lodError, lodChoice } from './lodlevels.js';

// Per soort: `lod` de opgave bij Ultra (lodlevels.js-vorm); `minCut` hoeveel driehoeken LOD1 en LOD2 minstens schelen ten opzichte van
// LOD0 (de audit); `wie` waar de modellen vandaan komen.
export const LOD_KINDS = {
  prop: { lod: { grenzen: [28, 60], band: 6, weg: 150 }, minCut: [0.35, 0.6], wie: 'klein straatmeubilair en losse props (streetfurniture3d.js): bankjes, afvalbakken, paaltjes' },
  propfar: { lod: { grenzen: [60, 160], band: 10, weg: 700 }, minCut: [0.35, 0.6], wie: 'lange of hoge straatelementen die je van ver ziet (vangrails, geluidsschermen, portalen, borden): hun eigen tekenafstand blijft de grens' },
  tree: { lod: { grenzen: [130, 170], band: 12 }, minCut: [0.35, 0.6], wie: 'bomen (scene3d.js): de hele boom, voorbij de nabije straal alleen de kroon, verder een grove kroon' },
  treecrown: { lod: { grenzen: [170, 260], band: 12, weg: 700 }, minCut: [0.6, 0.9], wie: 'de verre boomkroon van bossen en parken (scene3d.js): de fijne kroon, voorbij 170 m de grove, voorbij 260 m een billboard (impostor) tot de weg-afstand (begrensd door de zichtafstand)' },
  boat: { lod: { grenzen: [40, 120], band: 8, weg: 600 }, minCut: [0.3, 0.55], wie: 'boten (models3d_vehicles.js buildBoatMesh)' },
  train: { lod: { grenzen: [60, 160], band: 10, weg: 820 }, minCut: [0.35, 0.6], wie: 'treinen (railway3d.js): per wagen' },
  building: { lod: { grenzen: [170], band: 14 }, minCut: [0.5], wie: 'gebouwen: detail tot de detailring, daarna de verre laag (farlod.js); nog geen dither-overgang' },
  person: { lod: { grenzen: [25, 60], band: 5, weg: 140 }, minCut: [0.35, 0.6], wie: 'personen (agent personages): lodForSkinned' },
  animal: { lod: { grenzen: [25, 70], band: 6, weg: 160 }, minCut: [0.35, 0.6], wie: 'dieren (agent dieren): lodForSkinned of makeLodInstanced' },
  vehicle: { lod: { grenzen: [35, 90], band: 8, weg: 450 }, minCut: [0.35, 0.6], wie: 'auto\'s, bussen, de vet-truck (agent voertuigen): DitherLOD (lod3d.js) of makeLodObject' },
  interior: { lod: { grenzen: [10, 22], band: 3, weg: 40 }, minCut: [0.35, 0.6], wie: 'interieurprops (agent interieur): makeLodInstanced' },
};
// voor de audit en de afstandsfuncties: heeft de soort een weg-afstand (verdwijnt het model voorbij de laatste afstand)?
const culls = (kind) => LOD_KINDS[kind].lod.weg != null;

// Hoe ver de trap reikt per grafische stand (de sleutels van gfxprofile.js): een lichtere stand wisselt eerder naar een lichter niveau.
export const LOD_SCALE = { laag: 0.6, middel: 0.8, vlot: 0.9, hoog: 1 };
export const lodScaleFor = (preset) => LOD_SCALE[preset] || LOD_SCALE.vlot;

// De opgave (lodlevels.js-vorm) van een soort voor een model met n echte niveaus, geschaald met de stand. Een model met minder niveaus
// dan de soort (een al eenvoudig model) houdt zijn laatste niveau tot de weg-afstand: het verdwijnt niet al bij de afstand van LOD1.
// gecachet: lodLevelsForFade loopt per instance bij elke herbouw (straatmeubilair, bomen), en een nieuw object per aanroep was afval voor de GC.
// Het teruggegeven object is gedeeld: niet aanpassen.
const specCache = new Map();
export function lodSpec(kind, n = 3, scale = 1) {
  const key = `${kind}|${n}|${scale}`;
  let out = specCache.get(key);
  if (out) return out;
  const k = LOD_KINDS[kind];
  if (!k) throw new Error(`onbekende LOD-soort: ${kind}`);
  const { grenzen, band, weg } = k.lod;
  out = { grenzen: grenzen.slice(0, Math.max(0, n - 1)).map((g) => g * scale), band };
  if (weg != null) out.weg = weg * scale;
  specCache.set(key, Object.freeze(out));
  return out;
}
export const lodSpecError = (kind) => lodError(LOD_KINDS[kind].lod);
// de grenzen van een soort bij een stand (zonder weg)
export const lodDistances = (kind, scale = 1) => lodSpec(kind, 99, scale).grenzen;

// Waar elk niveau van een model met n niveaus ophoudt: het MIDDEN van de overgang naar het volgende niveau, of de weg-afstand, of nooit.
export function lodEdges(kind, n = 3, scale = 1) {
  const s = lodSpec(kind, n, scale);
  const out = s.grenzen.slice(0, n - 1);
  while (out.length < n - 1) out.push(Infinity);
  out.push(s.weg != null ? s.weg : Infinity);
  return out;
}

// Het niveau op afstand d (lodChoice: het niveau dat er staat), met hysterese: een model dat op niveau `prev` stond, stapt pas over als het
// `hyst` meter voorbij het midden van de overgang is. Geeft 0..levels-1, of `levels` voor 'weg'.
export function lodLevel(kind, d, { levels = 3, prev = -1, scale = 1, hyst = 4 } = {}) {
  const e = lodEdges(kind, levels, scale);
  let L = 0;
  for (let i = 0; i < e.length; i++) {
    const edge = e[i] + (prev > i ? -hyst : prev >= 0 && prev <= i ? hyst : 0);
    if (d >= edge) L = i + 1;
  }
  return L;
}

// Welke niveaus een instance op afstand d nodig heeft: dezelfde vensters als lodChoice (in de band rond een grens staan beide niveaus),
// met `slack` (m) aan beide kanten: de CPU deelt in op afstand tot de speler, de shader fadet op afstand tot de camera. Leeg: niets.
export function lodLevelsForFade(kind, d, { levels = 3, scale = 1, slack = 12 } = {}) {
  const s = lodSpec(kind, levels, scale);
  const h = s.band / 2, g = s.grenzen;
  const out = [];
  for (let L = 0; L < levels; L++) {
    const from = L === 0 ? -Infinity : g[L - 1] - h - slack;
    const to = L < g.length ? g[L] + h + slack : s.weg != null ? s.weg + h + slack : Infinity;
    if (d >= from && d <= to) out.push(L); // beide kanten erbij, zoals lodChoice
  }
  return out;
}
// zonder slack is lodLevelsForFade precies lodChoice: { a, b } van de opgave (scripts/lod_audit_test.mjs controleert dat)
export const lodChoiceFor = (kind, d, levels = 3, scale = 1) => lodChoice(d, lodSpec(kind, levels, scale));

// --- het register ----------------------------------------------------------------------------------------------------------------
// Elk gebouwd LOD-model: soort, naam en het aantal driehoeken per niveau (LOD0 eerst). 'cull' betekent: voorbij de laatste afstand niets.
const models = new Map();
export function registerLodModel(kind, name, tris, { cull = !!(LOD_KINDS[kind] && culls(kind)) } = {}) {
  models.set(`${kind}:${name}`, { kind, name, tris: [...tris], cull });
}
export const lodModels = () => [...models.values()];
export const clearLodModels = () => models.clear();

// Een model met hoogstens zoveel driehoeken is al minimaal: een kleiner niveau wint niets, de cull-afstand is dan zijn LOD.
export const LOD_MIN_TRIS = 48;

// De audit: wat er mis is met een geregistreerd model (lege lijst: in orde). Een model heeft LOD's als het minstens twee lichtere
// niveaus heeft (LOD1 en LOD2, of LOD1 en niets voorbij de cull-afstand), elk niveau minstens minCut minder driehoeken dan LOD0.
// Een minimaal model (LOD0 <= LOD_MIN_TRIS) mag met alleen de cull-afstand.
export function auditLodModel(m) {
  const k = LOD_KINDS[m.kind];
  if (!k) return [`${m.kind}:${m.name}: onbekende soort`];
  const t0 = m.tris[0];
  const issues = [];
  if (!(t0 > 0)) return [`${m.kind}:${m.name}: LOD0 heeft geen driehoeken`];
  const lighter = m.tris.length - 1 + (m.cull ? 1 : 0);
  if (t0 <= LOD_MIN_TRIS) {
    if (!m.cull && m.tris.length < 2) issues.push(`${m.kind}:${m.name}: minimaal model (${t0} driehoeken) zonder cull-afstand en zonder LOD1`);
    return issues;
  }
  if (lighter < 2) issues.push(`${m.kind}:${m.name}: ${m.tris.length - 1} lichtere niveaus${m.cull ? ' plus cull' : ''}, minstens 2 nodig`);
  for (let L = 1; L < m.tris.length; L++) {
    const cut = 1 - m.tris[L] / t0;
    const need = k.minCut[Math.min(L - 1, k.minCut.length - 1)];
    if (cut < need - 1e-9) issues.push(`${m.kind}:${m.name}: LOD${L} scheelt ${Math.round(cut * 100)}% driehoeken, minstens ${Math.round(need * 100)}% nodig`);
  }
  return issues;
}
export const auditLod = (list = lodModels()) => list.flatMap(auditLodModel);
