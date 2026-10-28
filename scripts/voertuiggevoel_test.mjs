// Voertuiggevoel (playtest 27-10): drie klachten in één test.
//   a) het voorwiel van de fiets draait dezelfde kant op als het achterwiel (en bij vooruit
//      rijden draait de bovenkant van beide wielen naar de neus, +x);
//   b) de bus hobbelt niet: de hoogte onder de wielen komt op een naad of brugrand per beeld
//      uit een andere bron (wegdek vs. terrein), en zo'n sprong mag de bak niet laten springen;
//   c) de fiets heeft trapgevoel: zolang je doortrapt loopt de snelheid op tot de top, laat je
//      de trappers los dan rolt hij uit (geen uithoudingsbalk).
//   node scripts/voertuiggevoel_test.mjs
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, updateVehicleWheelSpin } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS, settleVehicleHeight, speedCap } = await import('../game/js/vehicle.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const modellen = TRAFFIC_MODELS();

// --- a) de draairichting van het fietswiel ------------------------------------------------
{
  const model = modellen.find((m) => m.name === 'bike' && !m.cargo && !m.fat);
  const v = Object.assign(new Vehicle(0, 0, 0, model), { isBike: true });
  const mesh = buildVehicleMesh(v);
  mesh.position.set(0, 0, 0);
  const wheels = mesh.userData.wheels || [];
  ok(wheels.length === 2, 'fiets: twee wielen', String(wheels.length));
  const r = mesh.userData.wheelRadius;
  // het voorwiel staat vooraan (+x), het achterwiel achteraan
  const voor = wheels.reduce((a, b) => (b.position.x > a.position.x ? b : a));
  const achter = wheels.reduce((a, b) => (b.position.x < a.position.x ? b : a));
  ok(voor.position.x > achter.position.x, 'fiets: voorwiel staat voor het achterwiel');
  // het hoogste punt van elk wiel, wereldwijd: bij vooruit rijden gaat dat naar +x
  const top = () => {
    mesh.updateMatrixWorld(true);
    return [voor, achter].map((w) => {
      const p = new THREE.Vector3(0, r * 0.9, 0);
      w.localToWorld(p);
      return p.x;
    });
  };
  for (const w of wheels) w.rotation.z = 0;
  const a = top();
  const dt = 1 / 60;
  updateVehicleWheelSpin(mesh, 4, dt, 0);
  const b = top();
  const stap = [b[0] - a[0], b[1] - a[1]];
  ok(stap[0] > 0, 'fiets: voorwiel draait vooruit', stap[0].toFixed(4));
  ok(stap[1] > 0, 'fiets: achterwiel draait vooruit', stap[1].toFixed(4));
  // hetzelfde teken: de hoek van beide wielen verandert dezelfde kant op
  const dz = wheels.map((w) => w.rotation.z);
  ok(Math.sign(dz[0]) === Math.sign(dz[1]) && dz[0] !== 0, 'fiets: voor- en achterwiel hebben hetzelfde teken', dz.map((z) => z.toFixed(4)).join(' / '));
  // achteruit rijden: beide precies de andere kant op
  for (const w of wheels) w.rotation.z = 0;
  updateVehicleWheelSpin(mesh, -4, dt, 0);
  ok(wheels.every((w) => Math.sign(w.rotation.z) === -Math.sign(dz[0])), 'fiets: beide wielen draaien achteruit bij achteruit rijden');
}

// --- b) de bus hobbelt niet ---------------------------------------------------------------
{
  const bus = Object.assign(new Vehicle(0, 0, 0, modellen.find((m) => m.name === 'bus')), { driver: 'ai' });
  const dt = 1 / 60;
  bus.speed = 8; // ~29 km/h over een vlakke weg
  // twee bronnen die het op een naad oneens zijn: het wegdek zegt 0, de ribbon zegt 0,15 m.
  // Precies wat er op een brugrand of bij een busbaan gebeurt; per beeld wisselt het.
  let beurt = 0;
  const naad = { groundHeightAt: () => (beurt++ % 2 ? 0.15 : 0) };
  let maxSprong = 0, vorige = bus.z;
  for (let i = 0; i < 60; i++) {
    beurt = i; // elke twee beelden een andere bron
    bus.x += bus.speed * dt;
    settleVehicleHeight(bus, naad, dt);
    maxSprong = Math.max(maxSprong, Math.abs(bus.z - vorige));
    vorige = bus.z;
  }
  ok(maxSprong <= 0.03, 'bus: geen hobbels op een vlakke weg (max sprong per beeld)', `${(maxSprong * 100).toFixed(1)} cm`);
  ok(Math.abs(bus.z) < 0.2, 'bus: blijft op de weg liggen', bus.z.toFixed(3));
  // een echte helling wordt wel gevolgd: 20 cm omhoog over 3 m, in 1 s
  const helling = Object.assign(new Vehicle(0, 0, 0, modellen.find((m) => m.name === 'bus')), { driver: 'ai' });
  helling.speed = 3;
  const oprit = { groundHeightAt: (x) => Math.min(0.2, Math.max(0, (x - 1) * 0.2)) };
  for (let i = 0; i < 90; i++) { helling.x += helling.speed * dt; settleVehicleHeight(helling, oprit, dt); }
  ok(helling.z > 0.16, 'bus: volgt een helling wel', helling.z.toFixed(3));
}

// --- c) trapgevoel op de fiets ------------------------------------------------------------
{
  const model = modellen.find((m) => m.name === 'bike' && !m.cargo && !m.fat);
  const v = Object.assign(new Vehicle(0, 0, 0, model), { isBike: true, driver: 'player' });
  const dt = 1 / 60;
  const trap = (seconden, gas) => {
    for (let i = 0; i < Math.round(seconden / dt); i++) v.applyControls(dt, gas, 0, 0);
    return v.speed;
  };
  const na1 = trap(1, 1);
  const top1 = speedCap(v);
  const na3 = trap(2, 1);
  const top3 = speedCap(v);
  const na8 = trap(5, 1);
  const top8 = speedCap(v);
  ok(na3 > na1 + 0.2, 'fiets: trapt op snelheid (1 s -> 3 s)', `${na1.toFixed(2)} -> ${na3.toFixed(2)} m/s`);
  ok(na8 > na3, 'fiets: blijft oplopen tot de top', `${na3.toFixed(2)} -> ${na8.toFixed(2)} m/s`);
  // het trapgevoel zelf: de top loopt op met hoe lang je doortrapt (niet meteen de maximumsnelheid)
  ok(top1 < top8 - 0.3, 'fiets: de top loopt op zolang je trapt', `${top1.toFixed(2)} -> ${top8.toFixed(2)} m/s`);
  ok(na1 < top1 * 0.75, 'fiets: eerste seconde nog niet op de top', `${na1.toFixed(2)} van ${top1.toFixed(2)} m/s`);
  ok(top3 >= top1 && top8 >= top3, 'fiets: de top loopt alleen op, nooit terug');
  ok(na8 <= speedCap(v) + 1e-6, 'fiets: komt niet boven zijn top', `${na8.toFixed(2)} / ${speedCap(v).toFixed(2)}`);
  ok(na8 > 6.4, 'fiets: haalt met doortrappen de volle 25 km/h', `${(na8 * 3.6).toFixed(1)} km/h`);
  // trappers los: uitrollen, niet stilvallen
  const uit = trap(0.5, 0);
  ok(uit < na8 - 0.1, 'fiets: rolt uit als je stopt met trappen', `${na8.toFixed(2)} -> ${uit.toFixed(2)} m/s`);
  ok(uit > na8 * 0.8, 'fiets: rolt uit in plaats van stil te vallen', `${uit.toFixed(2)} m/s`);
  // na een tijdje niet trappen staat de trap weer laag: opnieuw opbouwen vanaf rustig toeren
  const uitgerold = trap(4, 0);
  ok(speedCap(v) < top8 - 0.3, 'fiets: zonder trappen zakt de top weer terug', `${speedCap(v).toFixed(2)} m/s`);
  ok(uitgerold < na8, 'fiets: uitgerold komt niet boven de oude top');
}

console.log(bad ? `${bad} van ${n} mislukt` : `voertuiggevoel_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
