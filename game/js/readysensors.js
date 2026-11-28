// De sensoren achter de definitie van tegel-klaar (tileready.js, #1354): wat staat er per niveau nog open rond het streamfocus (de speler, of
// bij een cutscene het kijkpunt van de camera)? Puur: geen three.js, geen DOM; scene3d.js geeft de bronnen mee als functies (src), zodat
// scripts/readysensors_test.mjs elke regel met mocks keurt.
//
// src (alles optioneel; een ontbrekende bron telt als 0, behalve rigs):
//   tilesMissing(): tegels rond het focus die nog niet binnen zijn          (data)
//   tileQueue(): rijen die nog in de kaart moeten (FrameQueue 'add:'-stukken) (colliders)
//   buildings(), roads(), prewarm(), countryside(), water(): gebouwen, wegen, de vooruit-warm van een plek, het platteland, water (geometry)
//   programs(), compileQueue(), linkPending(), textures(): shaders en texturen (gpu)
//   far(): de verre laag (de verre kopie en de kroonlaag) in aanbouw         (lod)
//   rigsWaiting(): de modulaire rigs laden nog en de bevolking mag nog niet bouwen (population)
//   peopleMissing(), vehiclesMissing(), parkedPending(): wie binnen bereik nog geen eindmodel heeft (population)
import { emptyCounts, LEVELS } from './tileready.js';

const n0 = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
const call = (f) => { try { return typeof f === 'function' ? n0(f()) : 0; } catch (e) { return 0; } };

// -> { data, colliders, geometry, gpu, lod, population, total, detail: { naam: aantal } }
export function collectReady(src = {}) {
  const d = {
    tiles: call(src.tilesMissing), queue: call(src.tileQueue),
    buildings: call(src.buildings), roads: call(src.roads), prewarm: call(src.prewarm), country: call(src.countryside), water: call(src.water),
    programs: call(src.programs), compiles: call(src.compileQueue), links: call(src.linkPending), textures: call(src.textures),
    far: call(src.far),
    rigs: call(src.rigsWaiting), people: call(src.peopleMissing), vehicles: call(src.vehiclesMissing), parked: call(src.parkedPending),
  };
  const out = emptyCounts();
  out.data = d.tiles;
  out.colliders = d.queue;
  out.geometry = d.buildings + d.roads + d.prewarm + d.country + d.water;
  out.gpu = d.programs + d.compiles + d.links + d.textures;
  out.lod = d.far;
  out.population = d.rigs + d.people + d.vehicles + d.parked;
  out.total = LEVELS.reduce((s, l) => s + out[l], 0);
  out.detail = d;
  return out;
}

// De oude definitie (wat het laadscherm, de benchmark en de wachtpoort van een sprong tot nu toe "klaar" noemden): tegels, wachtrij,
// gebouwen, wegen en de vooruit-warm. Voor de vergelijking voor/na in de probe en de test.
export function legacyPending(c) { return c ? n0(c.data) + n0(c.colliders) + n0(c.detail && c.detail.buildings) + n0(c.detail && c.detail.roads) + n0(c.detail && c.detail.prewarm) : 0; }

// Een telling die cutscenewarm.readiness(q, deep) verstaat: het oude veld tilesMissing/prewarmPending/buildings/roads blijft, met de nieuwe
// niveaus erbij (gpu, lod, population), zodat de bestaande wachtpoort van een sprong ook op shaders, het verre LOD en de bevolking wacht.
export function toReadinessQuery(c) {
  if (!c) return null;
  const q = { tilesMissing: c.data + c.colliders, prewarmPending: n0(c.detail && c.detail.prewarm), buildings: n0(c.detail && c.detail.buildings), roads: n0(c.detail && c.detail.roads) };
  q.gpu = c.gpu; q.lod = c.lod; q.population = c.population;
  return q;
}
