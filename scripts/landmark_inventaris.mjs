// Inventaris van de herkenbare stadsgebouwen: welke gebouwen in de stadsdata een naam dragen die op een landmark wijst,
// en of er een eigen model (landmarks3d.js) voor is. Puur, met de OSM-cache van de stadsbouw (zonder die: SKIP).
//   node scripts/landmark_inventaris.mjs [--alles] [--dump=<bestand.json>]
// --dump schrijft de voetafdrukken van de gebouwen met een eigen model weg, voor het beeldblad (scripts/landmarks_aaa_blad.mjs).
import './node3d.mjs';
import fs from 'node:fs';
import { loadCityData } from './lib/loadworld.mjs';

const L = await import('../game/js/landmarks3d.js');
const d = await loadCityData();
const alles = process.argv.includes('--alles');
const dumpArg = process.argv.find((a) => a.startsWith('--dump='));
const re = /kerk|museum|stadhuis|prinsenhof|academie|goudkantoor|station|forum|toren|waag|synagoge|schouwburg|oosterpoort|gasthuis|poort|bibliotheek|harmonie|korenbeurs|martini|kapel|kantoor|apenrots|universiteit|paleis|kathedraal/i;
let n = 0;
const dump = [];
for (const b of d.buildings) {
  if (!b.pts || b.pts.length < 3) continue;
  if (!(b.landmark || (b.name && (alles || re.test(b.name))))) continue;
  let cx = 0, cy = 0;
  for (const p of b.pts) { cx += p[0]; cy += p[1]; }
  cx /= b.pts.length; cy /= b.pts.length;
  n++;
  const model = L.hasLandmarkModel(b);
  console.log([b.name || '-', b.landmark || '', b.type, b.h, b.pts.length, Math.round(cx), Math.round(cy), model ? 'MODEL' : '-'].join(' | '));
  if (model || b.name === 'Synagoge') dump.push({ name: b.name, landmark: b.landmark, landmarkKind: b.landmarkKind, type: b.type, h: b.h, pts: b.pts, parts: b.parts, pitch: b.pitch });
}
console.log(`${n} gebouwen`);
if (dumpArg) { fs.writeFileSync(dumpArg.slice(7), JSON.stringify(dump)); console.log('voetafdrukken:', dump.length); }
