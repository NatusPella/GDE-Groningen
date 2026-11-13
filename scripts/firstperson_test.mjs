// Eerste persoon (#833): de pure stand en meetkunde van firstperson.js, de bedrading in de
// game-modules en de kosten van het eigen-voertuiginterieur (carinterior.js), dat sinds #833
// als samengevoegde geometrie met vertexkleuren en één gedeeld materiaal gebouwd wordt.
//   node scripts/firstperson_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
import fs from 'node:fs';
import {
  PITCH_LIMIT, PITCH_LIMIT_DEG, EYE_STAND, EYE_CROUCH, EYE_SWIM,
  initFirstPerson, firstPersonOn, syncFirstPerson, setFirstPerson, toggleFirstPerson,
  addLookPitch, clampPitch, lookVector, firstPersonEye, eyeHeight,
} from '../game/js/firstperson.js';
import { getSettings, setSetting } from '../game/js/settings.js';

let n = 0, bad = 0;
const ok = (c, name, extra) => { n++; if (!c) { bad++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const degrees = (rad) => rad * 180 / Math.PI;

// --- de instelling en de stand ------------------------------------------------------------
ok(getSettings().firstPersoon === false, 'firstPersoon staat standaard uit');
const world = {};
const st = initFirstPerson(world);
ok(world.firstPersoon === st && st.on === false, 'initFirstPerson maakt de stand aan, uit volgens de instelling', st);
ok(firstPersonOn(world) === false, 'firstPersonOn leest de stand');
ok(near(st.pitch, 0), 'de stand begint recht vooruit', st.pitch);

ok(setFirstPerson(world, true) === true, 'setFirstPerson(true) geeft de nieuwe stand terug');
ok(firstPersonOn(world) === true && world.firstPersoon.on === true, 'de stand staat op de wereld');
ok(getSettings().firstPersoon === true, 'de keuze wordt bewaard als instelling firstPersoon');
ok(near(world.firstPersoon.pitch, 0), 'aanzetten begint recht vooruit');
world.firstPersoon.pitch = 0.7;
ok(toggleFirstPerson(world) === false, 'toggleFirstPerson zet hem uit');
ok(getSettings().firstPersoon === false && world.firstPersoon.pitch === 0, 'uitzetten bewaart de keuze en zet de kijkhoek op nul');

// het pauzemenu schrijft alleen de instelling; syncFirstPerson werkt hem door naar de stand
world.firstPersoon.on = false;
setSetting('firstPersoon', true);
ok(syncFirstPerson(world) === true && firstPersonOn(world), 'syncFirstPerson volgt een schakelaar in het pauzemenu');
ok(syncFirstPerson(world) === false, 'syncFirstPerson doet niets als de stand al klopt');
world.firstPersoon.on = true;
setSetting('firstPersoon', false);
ok(syncFirstPerson(world) === true && !firstPersonOn(world), 'syncFirstPerson zet hem ook weer uit');
ok(setFirstPerson({}, true) === true && getSettings().firstPersoon === true, 'setFirstPerson werkt ook zonder bestaande stand');
ok(setFirstPerson(null, true) === false, 'setFirstPerson zonder wereld doet niets');
setSetting('firstPersoon', false);

// --- kijkvector en kijkhoek ---------------------------------------------------------------
const v0 = lookVector(0, 0);
ok(near(v0.x, 1) && near(v0.y, 0) && near(v0.z, 0), 'kijkvector recht vooruit is +x (oost)', v0);
const vOost = lookVector(Math.PI / 2, 0);
ok(near(vOost.x, 0, 1e-12) && near(vOost.z, 1), 'yaw 90 graden kijkt naar +kaart-y', vOost);
const vZuid = lookVector(Math.PI, 0);
ok(near(vZuid.x, -1) && near(vZuid.z, 0, 1e-12), 'yaw 180 graden kijkt naar -x', vZuid);
const vUp = lookVector(0, Math.PI / 4);
ok(vUp.y > 0 && near(Math.hypot(vUp.x, vUp.y, vUp.z), 1), 'positieve pitch kijkt omhoog, vector blijft lengte 1', vUp);
const vDown = lookVector(0, -Math.PI / 4);
ok(vDown.y < 0 && vDown.y === -vUp.y, 'negatieve pitch kijkt omlaag', vDown);
ok(near(Math.hypot(lookVector(1.234, -0.5).x, lookVector(1.234, -0.5).y, lookVector(1.234, -0.5).z), 1),
  'elke yaw en pitch geeft een eenheidsvector');

ok(PITCH_LIMIT_DEG === 85 && near(degrees(PITCH_LIMIT), 85), 'de kijkhoek is begrensd op 85 graden');
ok(near(clampPitch(10), PITCH_LIMIT), 'clampPitch begrenst omhoog op 85 graden', degrees(clampPitch(10)));
ok(near(clampPitch(-10), -PITCH_LIMIT), 'clampPitch begrenst omlaag op -85 graden');
ok(near(clampPitch(0.5), 0.5) && clampPitch(NaN) === 0 && clampPitch(Infinity) === PITCH_LIMIT,
  'clampPitch laat geldige hoeken staan en vangt NaN/oneindig op');

// muisLOOK: net als de volgcam betekent muis omlaag (dy > 0) omlaag kijken; +pitch is omhoog,
// dus de pitch moet dan KLEINER worden. invertY draait dat om.
const wl = { firstPersoon: { on: true, pitch: 0 } };
const down = addLookPitch(wl, 40, 0.0025, false);
ok(down < 0, 'muis omlaag (dy > 0) laat de eerste-persoonblik omlaag kijken', degrees(down));
wl.firstPersoon.pitch = 0;
const up = addLookPitch(wl, -40, 0.0025, false);
ok(up > 0 && near(up, -down), 'muis omhoog kijkt even ver omhoog', degrees(up));
ok(addLookPitch(wl, 40, 0.0025, true) > (wl.firstPersoon.pitch - 1e-9), 'invertY keert de richting om');
ok(addLookPitch(wl, 40, 0.0025, true) > 0, 'invertY: muis omlaag kijkt omhoog');
ok(near(addLookPitch(wl, 1e6, 1e6, false), -PITCH_LIMIT), 'de muis begrenst op -85 graden');
ok(near(addLookPitch(wl, -1e6, 1e6, false), PITCH_LIMIT), 'de muis begrenst op +85 graden');
ok(addLookPitch(null, 10, 0.0025) === 0, 'addLookPitch zonder wereld doet niets');

// --- ooghoogte en terugval-oog ------------------------------------------------------------
ok(eyeHeight({}) === EYE_STAND && eyeHeight(null) === EYE_STAND, 'staand oog: 1,62 m', EYE_STAND);
ok(eyeHeight({ crouching: true }) === EYE_CROUCH, 'kruipend oog is lager', EYE_CROUCH);
ok(eyeHeight({ swimming: true }) === EYE_SWIM && eyeHeight({ water: 'swim' }) === EYE_SWIM, 'zwemmend oog boven het water', EYE_SWIM);
ok(EYE_STAND > EYE_CROUCH && EYE_CROUCH > EYE_SWIM, 'staan > kruipen > zwemmen');

const gewoon = firstPersonEye({ x: 100, y: 77, gz: 0, z: 0, wade: 0 });
ok(near(gewoon.x, 100) && near(gewoon.z, 77) && near(gewoon.y, EYE_STAND), 'terugval-oog op de spelerstand (kaart-x, hoogte, kaart-y)', gewoon);
const dek = firstPersonEye({ x: 1, y: 2, gz: 3, z: 1, wade: 0 });
ok(near(dek.y, 3 + 1 + EYE_STAND), 'de hoogte van het dek/de grond telt mee', dek);
const wadend = firstPersonEye({ x: 0, y: 0, gz: 0, z: 0, wade: 0.4 });
ok(near(wadend.y, EYE_STAND - 0.4), 'wadend door een sloot zakt het oog mee', wadend);
const zwemmend = firstPersonEye({ x: 0, y: 0, z: 0.3, swimming: true });
ok(near(zwemmend.y, 0.3 + EYE_SWIM), 'zwemmend oog boven de zwemhoogte', zwemmend);
ok(near(firstPersonEye(null).x, 0) && near(firstPersonEye(null).y, EYE_STAND), 'zonder speler een bruikbaar oog');

// --- de bedrading in de game-modules ------------------------------------------------------
const bron = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const scene = bron('scene3d.js');
ok(/from '\.\/firstperson\.js'/.test(scene), 'scene3d.js haalt de stand uit firstperson.js');
ok(/firstPersonView/.test(scene) && /addLookPitch\(world,/.test(scene), 'scene3d.js heeft de eerste-persooncamera met muisLOOK');
ok(/playerMesh\.userData\.head/.test(scene) && /getWorldPosition\(_fpEye\)/.test(scene), 'scene3d.js zet de camera op de hoofdbot van het eigen figuur');
ok(/firstPersonEye\(player, _fpAlt\)/.test(scene), 'scene3d.js heeft de terugval op de spelerstand, zonder allocatie per frame');
ok(/const showInterior = firstPersonView \|\|/.test(scene) && /updateCarInterior\(pvMesh, pv, showInterior\)/.test(scene),
  'scene3d.js toont het gedetailleerde interieur ook in eerste persoon');
ok(/if \(firstPersonView\) playerMesh\.visible = false/.test(scene), 'scene3d.js verbergt het eigen figuur in eerste persoon');
ok(/'3d:players'/.test(scene) && !/function updateFirstPerson/.test(scene), 'geen tweede updatepad: het blijft in update3D');
// prestatie (#804): in eerste persoon wordt het volgcamwerk (collisie, pull-in, camScale)
// overgeslagen en alloceert het pad niets; de kijkvector gaat in een module-tijdelijk object
const fpStart = scene.indexOf('if (firstPersonView) {');
const fpEind = scene.indexOf('// third-person follow:', fpStart);
const fpTak = fpStart >= 0 && fpEind > fpStart ? scene.slice(fpStart, fpEind) : '';
ok(fpTak.length > 200, 'de eerste-persoon-tak staat apart in update3D');
ok(!/nearbyCamTargets|propRayHit|camClearOfVehicle|camScale|followCameraPose/.test(fpTak),
  'eerste persoon slaat de volgcam-collisie, pull-in en camScale over');
ok(!/new THREE\.|lookVector\(camAngle, clampPitch\(fpState\.pitch\)\)/.test(fpTak),
  'geen nieuwe objecten in het eerste-persoon-pad (kijkvector in een tijdelijk object)');
ok(/from '\.\/firstperson\.js'/.test(bron('player.js')) && /firstPersonOn\(world\)/.test(bron('player.js')),
  'player.js laat het lichaam met de kijkrichting meedraaien');
const cine = bron('cinematics.js');
ok(/toggleFirstPerson/.test(cine), 'cinematics.js levert C aan de eerste-persooncamera');
ok(!/camMode === 5 \? 0 : 5/.test(cine), 'C hangt niet meer aan de BINNENIN-filmcamera');
ok(/cycleCinemaCam/.test(cine), 'V blijft de filmcamera’s cyclen');
ok(/Eerste persoon aan of uit/.test(bron('controls.js')), 'controls.js noemt C de eerste-persoontoets');
const pm = bron('pausemenu.js');
ok(/toggle\('firstPersoon'/.test(pm), 'pausemenu.js heeft de schakelaar firstPersoon onder Camera & richten');
ok(/\['C'\], 'Eerste persoon'/.test(pm), 'pausemenu.js noemt C bij Besturing de eerste-persoonstand');

// --- het interieur van de eigen auto: draw-objecten en driehoeken ---------------------------
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const { updateCarInterior, interiorEyePose } = await import('../game/js/carinterior.js');
const { doorTrims, interiorLayout } = await import('../game/js/carinteriorlayout.js');
const { doorsFor } = await import('../game/js/vehicledoors.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { carBodyFit } = await import('../game/js/models3d_vehicles.js');

const modellen = new Map();
for (const m of TRAFFIC_MODELS()) if (!modellen.has(m.name)) modellen.set(m.name, m);
const namen = ['hatch', 'sedan', 'wagon', 'van', 'sport', 'taxi'].filter((k) => modellen.has(k));
if (!namen.length) { bad++; console.log('FAIL geen voertuigmodellen gevonden om het interieur te meten'); }

const interieurVan = (v) => {
  const mesh = buildVehicleMesh(v);
  const zichtbaar = updateCarInterior(mesh, v, true);
  return { mesh, g: mesh.userData.interior, zichtbaar };
};
const meshesVan = (g) => { const out = []; g.traverse((o) => { if (o.isMesh) out.push(o); }); return out; };
const driehoekenVan = (mesh) => Math.floor((mesh.geometry.attributes.position.count || 0) / 3);

const metingen = [];
for (const naam of namen) {
  const model = modellen.get(naam);
  const v = new Vehicle(0, 0, 0, model);
  const { mesh, g, zichtbaar } = interieurVan(v);
  ok(zichtbaar === true && !!g, `${naam}: interieur gebouwd en zichtbaar`);
  if (!g) continue;
  const meshes = meshesVan(g);
  const deuren = doorTrims(doorsFor(v), v.model.len, v.model.wid).length;
  // één vast deel, één draaiend stuur en per portier één trim: 2 + deuren draw-objecten
  ok(meshes.length === 2 + deuren, `${naam}: hooguit 2 + portieren draw-objecten (${meshes.length} bij ${deuren} portieren)`, meshes.length);
  ok(deuren <= 4, `${naam}: hooguit vier portierbekledingen`, deuren);
  ok(meshes.filter((m) => m.name === 'interieur-vast').length === 1, `${naam}: alle stilstaande delen in één mesh`);
  ok(g.userData.wheel && g.userData.trims.length === deuren, `${naam}: stuur en portierbekleding zijn aparte delen`);
  let drie = 0, oneindig = false;
  for (const m of meshes) {
    drie += driehoekenVan(m);
    for (const c of Object.values(m.geometry.attributes)) {
      if (!c || !c.array) continue;
      for (let i = 0; i < c.array.length; i++) if (!Number.isFinite(c.array[i])) oneindig = true;
    }
    ok(m.castShadow === false, `${naam}: een interieurdeel werpt geen schaduw`);
  }
  ok(!oneindig, `${naam}: eindige meetkunde`);
  ok(drie > 0 && drie <= 4000, `${naam}: klein genoeg (<= 4000 driehoeken)`, drie);
  // de kooi van binnen (#833): de statische geometrie reikt tot de vloer en tot de zijwanden,
  // zodat je in eerste persoon niet door de achterkant van het plaatwerk heen kijkt
  const seat = vehicleSeat(v, true);
  const L = interiorLayout(seat, v.model.len, v.model.wid, carBodyFit(v));
  const floorY = Math.max(0.3, seat.y - 0.34);
  const box = new THREE.Box3().setFromObject(g);
  ok(box.min.y <= floorY + 0.02, `${naam}: de kooi reikt tot de vloer`, box.min.y);
  ok(box.min.z <= -(v.model.wid / 2 - 0.1) && box.max.z >= v.model.wid / 2 - 0.1, `${naam}: de zijwanden staan naast de stoelen`);
  ok(Number.isFinite(L.dash.x) && floorY > 0.25, `${naam}: de kooi heeft een bruikbare vloerhoogte`, floorY);
  // één gedeeld materiaal, geometrieën gedeeld tussen twee auto's van hetzelfde model
  const materialen = new Set(meshes.map((m) => m.material));
  ok(materialen.size === 1 && meshes[0].material.userData.shared === true, `${naam}: één gedeeld materiaal voor het hele interieur`);
  ok(meshes.every((m) => m.material.vertexColors === true), `${naam}: de kleuren zitten in de geometrie (vertexColors)`);
  const v2 = new Vehicle(0, 0, 0, model);
  const tweede = interieurVan(v2);
  ok(tweede.g && meshesVan(tweede.g)[0].geometry === meshes[0].geometry, `${naam}: geometrie gedeeld met een tweede auto van hetzelfde model`);
  // het stuur draait mee met de besturing, de portierbekleding verdwijnt bij een open deur
  v.steer = 0.5;
  updateCarInterior(mesh, v, true);
  ok(near(g.userData.wheel.rotation.x, -0.5 * 2.2, 1e-9), `${naam}: het stuur draait met v.steer mee`, g.userData.wheel.rotation.x);
  v.doors = { open: { [g.userData.trims[0].id]: 1 }, loose: {} };
  updateCarInterior(mesh, v, true);
  ok(g.userData.trims[0].group.visible === false, `${naam}: de portierbekleding verdwijnt bij een open deur`);
  v.doors = { open: {}, loose: {} };
  updateCarInterior(mesh, v, true);
  ok(g.userData.trims[0].group.visible === true, `${naam}: de portierbekleding komt terug bij een dichte deur`);
  metingen.push({ naam, objecten: meshes.length, driehoeken: drie });
  // uit: het interieur is weg (de binnenkant kost dan niets)
  ok(updateCarInterior(mesh, v, false) === false && g.visible === false, `${naam}: uit verbergt het interieur`);
}
const e = interiorEyePose(new Vehicle(0, 0, 0, modellen.get('sedan')));
ok(e && Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.z) && Number.isFinite(e.fx) && Number.isFinite(e.fy),
  'interiorEyePose van de BINNENIN-camera blijft werken', e);

if (metingen.length) console.log('interieur:', metingen.map((m) => `${m.naam} ${m.objecten} objecten/${m.driehoeken} driehoeken`).join(', '));
console.log(bad ? `firstperson_test: ${bad} van ${n} checks rood` : `firstperson_test: ${n} checks groen`);
process.exit(bad ? 1 : 0);
