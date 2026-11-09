// #822: de vaarrichting en aanlegplaats van de vluchtboot. De kaart is (sinds #314/sparse) niet
// altijd overal geladen als de missie de boot neerzet; daarom kiezen we alleen een richting met
// echt vrij water voor de romp en bewaren we een keuze pas als de tegels onder die koers er zijn.
// Puur: de kaart komt van buiten (TileWorld), net als de bootgegevens.
import { boatDryPoints } from './util.js';
import { pointInPolygon } from './polygon.js';

const hullProbes = (v) => {
  const h = ((v && v.model && v.model.len) || 4) * 0.5;
  const bw = ((v && v.model && v.model.wid) || 1.6) * 0.5;
  return [[0, 0], [h, 0], [-h, 0], [0, bw], [0, -bw], [h * 0.6, bw], [h * 0.6, -bw], [-h * 0.6, bw], [-h * 0.6, -bw]];
};

// Ligt een punt van de romp in een gebouw? Een boot vaart op water; alleen een woonboot is een
// echt obstakel in het water, andere bebouwing hoort bij de kade en is geen muur in het water.
export function bootHullInBuilding(map, v, x, y, angle) {
  if (!map || typeof map.buildingsNear !== 'function') return false;
  const h = ((v && v.model && v.model.len) || 4) * 0.5;
  const list = map.buildingsNear(x, y, h + 1);
  if (!list || !list.length) return false;
  const vast = list.filter((b) => b && b.type !== 'houseboat');
  if (!vast.length) return false;
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const [lx, ly] of hullProbes(v)) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    for (const b of vast) if (b.pts && pointInPolygon(px, py, b.pts)) return true;
  }
  return false;
}

// Staat de romp hier helemaal vrij op het water (geen wal binnen 1 m en geen kadebebouwing)?
export function bootVaartVrij(map, v, x, y, angle) {
  if (boatDryPoints(map, v, x, y, angle) > 0) return false;
  return !bootHullInBuilding(map, v, x, y, angle);
}

function vrijeRun(map, v, x, y, angle, maxRun, stap = 2) {
  if (!bootVaartVrij(map, v, x, y, angle)) return 0;
  const c = Math.cos(angle), s = Math.sin(angle);
  let run = 0;
  for (let d = stap; d <= maxRun; d += stap) {
    // de romp moet op elke stap vrij liggen; niet "bijna" (de oude >1 liet één droog punt toe,
    // waardoor de boot net na de start alsnog tegen de wal hing)
    if (boatDryPoints(map, v, x + c * d, y + s * d, angle) > 0) break;
    if (map.isOnBridge && map.isOnBridge(x + c * d, y + s * d)) break;
    // kadebebouwing boven het water (het museum) is ook een muur voor de boeg
    if (d % 4 === 0 && bootHullInBuilding(map, v, x + c * d, y + s * d, angle)) break;
    run = d;
  }
  return run;
}

// Kies de vaarrichting met de meeste vrije ruimte; bij gelijke stand wint de richting die het
// dichtst bij `voorkeur` ligt, zodat de boot niet onnodig achterstevoren staat.
export function kiesVaarrichting(map, v, x, y, voorkeur = 0, { minRun = 12, maxRun = 60, stap = Math.PI / 12 } = {}) {
  if (!map) return null;
  let best = null;
  const n = Math.round((Math.PI * 2) / stap);
  for (let j = 0; j < n; j++) {
    const a = -Math.PI + j * stap;
    if (!bootVaartVrij(map, v, x, y, a)) continue;
    const run = vrijeRun(map, v, x, y, a, maxRun);
    if (run < minRun) continue;
    const verschil = Math.abs(Math.atan2(Math.sin(a - voorkeur), Math.cos(a - voorkeur)));
    if (!best || run > best.run || (run === best.run && verschil < best.verschil)) best = { a, run, verschil };
  }
  return best ? { a: best.a, run: best.run } : null;
}

// Hoeveel meter kan de boot in deze richting vooruit zonder de wal te raken?
export function bootVrijeRun(map, v, x, y, angle, maxRun = 60) {
  return vrijeRun(map, v, x, y, angle, maxRun);
}

// Zijn de tegels onder de aanlegplaats en de eerste meters koers geladen? Zonder die gegevens
// ziet de sparse wereld een gat als water en kiest de boot een richting die later een muur blijkt.
export function mooringDataVrij(map, x, y, angle, run = 60) {
  if (!map || !map.store || typeof map.store.keysAround !== 'function' || typeof map.store.missing !== 'function') return true;
  const keys = new Set();
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let d = 0; d <= run; d += 8) {
    for (const k of map.store.keysAround(x + c * d, y + s * d, 8) || []) keys.add(k);
  }
  return [...keys].every((k) => !map.store.missing([k]).length);
}

// Is het gebied rond (x, y) geladen? Voor een lege kaart mag de missie nog geen "geen plek"
// onthouden: dan komt de boot zodra de streamer de tegels heeft.
export function mooringDataRond(map, x, y, r = 40) {
  if (!map || !map.store || typeof map.store.keysAround !== 'function' || typeof map.store.missing !== 'function') return true;
  const keys = new Set();
  const n = Math.max(8, Math.round(r / 4));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    for (const key of map.store.keysAround(x + Math.cos(a) * r, y + Math.sin(a) * r, 8) || []) keys.add(key);
  }
  for (const key of map.store.keysAround(x, y, 8) || []) keys.add(key);
  return [...keys].every((k) => !map.store.missing([k]).length);
}

// Past de gevonden plek nog bij de (inmiddels misschien verder geladen) kaart? Zo nee, dan mag
// de missie de boot niet op deze koers neerzetten: de missielus probeert het volgende frame opnieuw.
export function mooringBruikbaar(map, v, mooring) {
  if (!mooring) return false;
  if (!bootVaartVrij(map, v, mooring.x, mooring.y, mooring.a)) return false;
  if (!mooringDataVrij(map, mooring.x, mooring.y, mooring.a, Math.max(20, mooring.run || 20))) return false;
  return true;
}
