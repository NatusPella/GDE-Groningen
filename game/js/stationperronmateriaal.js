import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { habboMaterial, createBrickDetailTexture } from './pixelart3d.js';

// Het materiaal van een perronvloer (#502). Een perron was tot nu toe één egale kleur: een
// MeshStandardMaterial (perrons3d.js) of een MeshLambertMaterial (de halte in de streek,
// stationtravel.js) zonder map. Zodra het nachtlicht er als enige op valt, is zo'n vlak niet
// meer dan één lavendel- of blauwveld: er zit geen voeg in die de maat verraadt, terwijl de
// straat ernaast wél betegeld is. Daarom draagt elk perronvlak nu dezelfde tegel als de gevels
// (createBrickDetailTexture in pixelart3d.js): een bijna-witte vermenigvuldiging met strekken
// en voegen. Dat is geen nieuwe tegel — hij bestaat al en wordt door models3d_buildings.js op
// elke bakstenen gevel gelegd; de perronkleur eronder bepaalt nog steeds de tint.

// Eén tegel = 0,5 m: de maat die createBrickDetailTexture zelf aanhoudt (8 strekken, 2 stenen
// per baan), dus een perron van 80 m krijgt 160 tegels in de lengte in plaats van één uitgerekt
// vlak. uv's komen uit de wereldmaat (perronTegelUV): de perronbak heeft er geen van zichzelf.
export const TEGEL_M = 0.5;

// De rand van het perron is een stoeprand, geen streep verf: een lichte betonband van ongeveer
// een stoeptegel breed. Het felle geel (0xe3b81f) lichtte 's nachts op als een neonstreep.
export const RAND_M = 0.2;
export const RAND_KLEUR = 0xc9c3b2;

let tegel = null;
// De ene tegel van alle perrons: één canvas en één texture voor de hele kaart, ook al heeft
// elk perron zijn eigen kleur.
export function perronTegel() {
  if (!tegel) tegel = createBrickDetailTexture();
  return tegel;
}

const mats = new Map();
// Een perronmateriaal in de huisstijl van de modellen (habboMaterial: mat, metalness 0, plat
// gearceerd), met de tegel erop. Dezelfde kleur geeft hetzelfde materiaal terug, zodat een
// perron van twintig stroken niet twintig materialen krijgt.
export function perronMateriaal(color, extra = {}) {
  const key = color + '|' + JSON.stringify(extra);
  const hit = mats.get(key);
  if (hit) return hit;
  const { map = perronTegel(), ...rest } = extra;
  const m = habboMaterial(color, { roughness: 0.92, side: THREE.DoubleSide, map, ...rest });
  mats.set(key, m);
  return m;
}

// Planair tegel-uv uit de wereldpositie (#502): elke driehoek krijgt de twee assen van zijn
// eigen vlak (vloer: x en y, muur: de breedte en de hoogte), zodat een tegel overal TEGEL_M
// groot is. Nodig omdat de perronbak in perrons3d.js alleen punten schrijft (geen uv's) en een
// BoxGeometry zijn uv 0..1 over de hele plaat legt — een plaat van 80 m werd zo één tegel.
// Verwacht de scènevolgorde van dit project: x = kaart-x, y = hoogte, z = kaart-y.
export function perronTegelUV(geo, tegelM = TEGEL_M) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // de vloer ligt plat (y overheerst); anders de muur loodrecht op x of op z
    const plat = ny >= nx && ny >= nz;
    const u = plat ? x : (nx >= nz ? z : x);
    const v = plat ? z : y;
    uv[i * 2] = u / tegelM;
    uv[i * 2 + 1] = v / tegelM;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
