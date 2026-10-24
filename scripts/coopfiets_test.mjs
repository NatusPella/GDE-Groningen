// Samen spelen (#434): de bestuurder op een fiets trapt bij de gast mee. De kruk van het voertuig draait op de snelheid uit de
// snapshot, of, als de host er geen meldt (een voertuig waar hij zelf op rijdt), op de verplaatsing van het model
// (coopentities3d.js tekensnelheid); de zitter van coopzitten3d.js trapt met dezelfde zwaai als de verborgen fietser van het model.
//   node scripts/coopfiets_test.mjs
import './node3d.mjs';

const { buildVehicleMesh, updateVehicleWheelSpin } = await import('../game/js/models3d_vehicles.js');
const { tekensnelheid } = await import('../game/js/coopentities3d.js');
const { syncZitters, clearZitters } = await import('../game/js/coopzitten3d.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const fiets = { id: 199, isBike: true, model: { name: 'bike', len: 1.8, wid: 0.6 } };
const dt = 1 / 60;
// De zitter die coopzitten3d.js toevoegt: het nieuwe kind van het voertuigmodel (de fietser van het model zelf wordt verborgen).
const zitterVan = (mesh, v, stoel = 0) => {
  const was = new Set(mesh.children);
  syncZitters([{ slot: 1, char: 'anita', voertuig: 199, stoel }], (id) => (id === 199 ? { mesh, v } : null));
  return mesh.children.find((c) => !was.has(c)) || null;
};
// Eén beeld zoals de gast het tekent: de fiets schuift 6 m/s op, de host meldt geen snelheid.
const trapBeeld = (mesh, v) => {
  mesh.position.x += 6 * dt;
  updateVehicleWheelSpin(mesh, tekensnelheid(mesh.userData, mesh.position.x, mesh.position.z, 0, 0, dt), dt, 0);
  syncZitters([{ slot: 1, char: 'anita', voertuig: 199, stoel: 0 }], (id) => (id === 199 ? { mesh, v } : null));
};

// --- de snelheid voor de animatie ------------------------------------------------------------------------------------
{
  const ud = {};
  check('eerste beeld: de gemelde snelheid', tekensnelheid(ud, 10, 0, 0, 3, dt) === 3);
  check('een gemelde snelheid gaat altijd voor', tekensnelheid(ud, 10.5, 0, 0, 4, dt) === 4);
  check('stilstand is stilstand', tekensnelheid(ud, 10.5, 0, 0, 0, dt) === 0);
  // de host rijdt maar meldt niets (een voertuig waar hij zelf op rijdt): de verplaatsing sinds het vorige beeld telt
  const v = tekensnelheid(ud, 10.5 + 6 * dt, 0, 0, 0, dt);
  check('geen gemelde snelheid: de verplaatsing sinds het vorige beeld', Math.abs(v - 6) < 1e-9, v);
  // achteruit is een negatieve snelheid (de trappers draaien dan de andere kant op)
  const u2 = { spinX: 0, spinY: 0 };
  check('langs de fiets gemeten, met teken', Math.abs(tekensnelheid(u2, -6 * dt, 0, 0, 0, dt) + 6) < 1e-9);
  check('opzij schuiven is geen rijden', tekensnelheid({ spinX: 0, spinY: 0 }, 0, 5, 0, 0, dt) === 0);
  check('een sprong (teleport) is geen snelheid', tekensnelheid({ spinX: 0, spinY: 0 }, 500, 0, 0, 0, dt) === 0);
  check('geen dt: geen meting', tekensnelheid({ spinX: 0, spinY: 0 }, 5, 0, 0, 0, 0) === 0);
}

// --- de kruk en de benen van de zitter -------------------------------------------------------------------------------
{
  clearZitters();
  const mesh = buildVehicleMesh(fiets), rl = mesh.userData.riderLegs;
  check('een fiets heeft een kruk en een ingebouwde fietser', !!rl && !!mesh.userData.wheels && rl.legs.length === 2);
  const v = { ...fiets, speed: 6 };
  const zitter = zitterVan(mesh, v);
  check('de bestuurder zit op de fiets en de fietser van het model is verborgen', !!zitter && zitter.visible && mesh.children.some((c) => c !== zitter && c.userData.legL && !c.visible));
  // 60 beelden op 6 m/s zonder gemelde snelheid: de kruk draait en de zwaai is er
  let verschil = 0, vorige = null;
  for (let k = 0; k < 60; k++) { trapBeeld(mesh, v); const f = mesh.userData.pedalPhase || 0; if (vorige != null) verschil += Math.abs(f - vorige); vorige = f; }
  check('de kruk draait mee met een host die geen snelheid meldt', verschil > 0.5 && Math.abs(mesh.userData.pedalSwing) > 0.001, JSON.stringify({ verschil, sw: mesh.userData.pedalSwing }));
  // de benen van de zitter volgen de kruk: elk beeld een andere hoek (de trapper-IK zet de voeten op de trappers)
  const benen = [];
  for (let k = 0; k < 30; k++) { trapBeeld(mesh, v); benen.push(+zitter.userData.legL.rotation.z.toFixed(3)); }
  check('de benen van de zitter trappen mee met de kruk', new Set(benen).size > 5, JSON.stringify(benen.slice(0, 8)));
  // stilgezet: de kruk staat stil en de benen ook
  mesh.userData.pedalSwing = 0;
  const stil = mesh.userData.pedalPhase, rust = [];
  for (let k = 0; k < 10; k++) {
    updateVehicleWheelSpin(mesh, tekensnelheid(mesh.userData, mesh.position.x, mesh.position.z, 0, 0, dt), dt, 0);
    syncZitters([{ slot: 1, char: 'anita', voertuig: 199, stoel: 0 }], (id) => (id === 199 ? { mesh, v } : null));
    rust.push(+zitter.userData.legL.rotation.z.toFixed(3));
  }
  check('een stilstaande fiets trapt niet', mesh.userData.pedalPhase === stil && mesh.userData.pedalSwing === 0 && new Set(rust).size === 1, JSON.stringify([mesh.userData.pedalPhase === stil, new Set(rust).size]));
  // de bestuurder van een bakfiets trapt net zo goed mee (het kind in de bak niet)
  clearZitters();
  const achter = { ...fiets, model: { ...fiets.model, cargo: true, load: undefined } };
  const bak = buildVehicleMesh(achter);
  const bakZitter = zitterVan(bak, achter);
  const bakKnie = [];
  for (let k = 0; k < 20; k++) {
    updateVehicleWheelSpin(bak, 6, dt, 0);
    syncZitters([{ slot: 1, char: 'anita', voertuig: 199, stoel: 0 }], (id) => (id === 199 ? { mesh: bak, v: achter } : null));
    bakKnie.push(+bakZitter.userData.legL.rotation.z.toFixed(3));
  }
  check('de bestuurder van een bakfiets trapt ook mee', !!bakZitter && new Set(bakKnie).size > 4, JSON.stringify(bakKnie.slice(0, 6)));
  clearZitters();
}

console.log(bad ? `${bad} van ${n} mislukt` : `coopfiets_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
