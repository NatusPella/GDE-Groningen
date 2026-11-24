// Gebakken mensen voor het voetbaldecor (#1115, beeld 24-11): het publiek langs de lijn en de trainende ploegen waren kale cilinders. Nu dezelfde Quaternius-mensen als de
// verre menigte (farcrowd3d.js, ADR 0050): een houding uit een clip van de rig, gebakken tot een gewone geometrie met vertexkleuren, die een InstancedMesh vele keren tekent.
// Een bak per sleutel (shirtkleur, man of vrouw, clip en fase) en daarna gedeeld: de eerste wedstrijd betaalt het bakken, de volgende niet. Zonder geladen rig (node-tests, een
// trage start) geeft bake null en tekent voetbalpubliek.js zijn eenvoudige figuur. Samen spelen: puur beeld, lokaal per speler.
import { vcMaterial, markShared } from './pixelart3d.js';
import { bakeModularPose, modularReady } from './modularpeople.js';

const cache = new Map();
let mat = null;
const MAX_BAKES = 48;   // een vangnet: meer verschillende sleutels dan dit bakken we niet (dan de eenvoudige figuur)

// De gebakken geometrie voor een figuur: seed kiest gezicht, haar en broek; shirt is de kleur van het shirt (null = die van de seed); clip en u de houding.
export function bakeFigure({ seed = 1, shirt = null, female = false, clip = 'Idle', u = 0 } = {}) {
  if (!modularReady()) return null;
  const key = `${seed}|${shirt}|${female ? 1 : 0}|${clip}|${u}`;
  if (cache.has(key)) return cache.get(key);
  if (cache.size >= MAX_BAKES) return null;
  let g = null;
  try { g = bakeModularPose(seed, { female, ...(shirt != null ? { shirt } : {}), old: false }, clip, u, 2); } catch (e) { g = null; }
  if (g) markShared(g);
  cache.set(key, g);
  return g;
}
export const figureMaterial = () => mat || (mat = markShared(vcMaterial({ roughness: 0.85 })));
