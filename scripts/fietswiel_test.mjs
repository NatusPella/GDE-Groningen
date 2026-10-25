// Fietswiel: de draairichting is af te lezen en voor- en achterwiel draaien dezelfde kant op (#436).
//   node scripts/fietswiel_test.mjs   (eenmalig: cd desktop && npm run stage; three in desktop/vendor-cache)
//
// Waarom: de band en de velg van een fietswiel hebben 16 vlakjes (elke 22,5°) en de vier spaken staan
// 45° uit elkaar. Het getekende stuk per beeld loopt bij fietsnelheid op tot 0,34 rad (19,5°): meer
// dan de helft van 22,5°, dus de velg liep achteruit terwijl de spaken vooruit gingen. Eén reflector
// per wiel (een asymmetrisch merkteken, zoals het moer-merkteken op een autowiel) maakt de richting
// ondubbelzinnig. Deze test bewaakt dat merkteken en de draairichting van beide wielen.
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, updateVehicleWheelSpin } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const V = await import('../game/js/voertuigbediening.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
// de kleuren in de geometrie staan lineair (pixelart3d.js linearRGB), net als de reflector 0xd8452f
const REFLECTOR = [new THREE.Color(0xd8452f)].map((c) => [c.r, c.g, c.b].map((v) => Math.round(v * 255)))[0];

const alle = TRAFFIC_MODELS();
const modellen = [
  ['fiets', alle.find((m) => m.name === 'bike' && !m.cargo && !m.fat)],
  ['bakfiets', alle.find((m) => m.name === 'bike' && m.cargo)],
  ['step', alle.find((m) => m.name === 'scooter' && !m.moped && !m.motorbike && !m.geared)],
].filter(([, m]) => m);

for (const [naam, model] of modellen) {
  const v = Object.assign(new Vehicle(0, 0, 0, model), { isBike: model.name === 'bike', isScooter: model.name === 'scooter' });
  const mesh = buildVehicleMesh(v);
  mesh.position.set(0, 0, 0);
  const wheels = mesh.userData.wheels || [];
  ok(wheels.length >= 2, `${naam}: twee wielen`, String(wheels.length));
  if (wheels.length < 2) continue;
  const r = mesh.userData.wheelRadius;
  // dezelfde geometrie en dezelfde overbrenging: de wielen kunnen dus nooit verschillend draaien
  ok(wheels.every((w) => w.geometry === wheels[0].geometry), `${naam}: voor- en achterwiel delen de geometrie`);
  ok(wheels.every((w) => (w.userData.spinK || 1) === (wheels[0].userData.spinK || 1)), `${naam}: voor- en achterwiel hebben dezelfde overbrenging`);

  // --- de reflector: precies één merkteken, op de velg ---
  const g = wheels[0].geometry;
  const pos = g.attributes.position.array, col = g.attributes.color.array;
  const hoeken = [];
  let buitenste = 0;
  const eigen = (i) => col[i] === REFLECTOR[0] && col[i + 1] === REFLECTOR[1] && col[i + 2] === REFLECTOR[2];
  for (let i = 0; i < pos.length; i += 3) {
    if (!eigen(i)) continue;
    hoeken.push(Math.atan2(pos[i + 1], pos[i]));
    buitenste = Math.max(buitenste, Math.hypot(pos[i], pos[i + 1]));
  }
  ok(hoeken.length > 0, `${naam}: de reflector zit op het wiel`);
  if (hoeken.length) {
    // één merkteken: alle reflectorpunten liggen binnen één smalle hoek, dus geen herhaling om de as
    const spreiding = Math.max(...hoeken) - Math.min(...hoeken);
    ok(spreiding < Math.PI / 2, `${naam}: één reflector, geen herhaald patroon`, spreiding.toFixed(3));
    ok(buitenste > r * 0.55 && buitenste < r * 1.01, `${naam}: de reflector zit op de velg, niet op de naaf`, `${buitenste.toFixed(3)} van ${r}`);
  }

  // --- de draairichting van beide wielen ---
  const meshes = new Map([[v.id, mesh]]), world = { vehicles: [v] };
  const top = () => {
    mesh.updateMatrixWorld(true);
    return wheels.map((w) => { const p = new THREE.Vector3(0, r * 0.9, 0); w.localToWorld(p); return p.x; });
  };
  for (const dt of [1 / 60, 1 / 30]) {
    for (const steer of [0, 1, -1]) {
      v.steer = steer;
      for (let i = 0; i < 60; i++) V.syncVoertuigBediening(world, meshes, 0, 0, dt); // het stuur tot rust
      const meet = (speed) => {
        for (const w of wheels) w.rotation.z = 0; // vaste stand: het bovenste punt van elk wiel
        const a = top();
        updateVehicleWheelSpin(mesh, speed, dt, steer);
        const b = top();
        return a.map((x, i) => b[i] - x);
      };
      const vooruit = meet(4), achteruit = meet(-4);
      for (let i = 0; i < wheels.length; i++) {
        ok(vooruit[i] > 0, `${naam}: wiel ${i} draait vooruit bij ${Math.round(1 / dt)} bps, stuur ${steer}`, vooruit[i].toFixed(4));
        ok(achteruit[i] < 0, `${naam}: wiel ${i} draait achteruit bij achteruit rijden (${Math.round(1 / dt)} bps, stuur ${steer})`, achteruit[i].toFixed(4));
      }
    }
  }

  // --- het getekende stuk per beeld blijft onder de halve spaakafstand ---
  for (const w of wheels) w.rotation.z = 0;
  updateVehicleWheelSpin(mesh, 14, 1 / 30, 0);
  const stap = Math.abs(wheels[0].rotation.z);
  ok(stap <= Math.PI / 8 + 1e-6, `${naam}: geen wiel dat bij topsnelheid achteruit stroboscoopt`, stap.toFixed(3));
}

console.log(bad ? `${bad} van ${n} mislukt` : `fietswiel_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
