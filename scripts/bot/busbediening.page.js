// Pagina-script voor `node scripts/bot/run.mjs --page=scripts/bot/busbediening.page.js --out=<map> --slot` (#444): de lijndienst met zelf bediende deuren (O), kneel (K), halteknop en tevredenheid in het HUD.
// Start de dienst op een lijnbus (als busdienst.page.js), rijdt de haltes af, drukt O en K met echte toetsen en kijkt of de rit en het HUD volgen.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt' });
const world = B.world, player = B.player;
const V = await imp('vehicle');
const BR = await imp('busroutes');
const RD = await imp('busride');
world.devInvuln = true;
const checks = [];
const check = (naam, ok, info = '') => { checks.push({ naam, ok: !!ok, info: String(info) }); B.log('busbed', { naam, ok: !!ok, info: String(info) }); };

async function settle() {
  for (let i = 0; i < 400; i++) {
    const s = B.status();
    if (s.blocking.pauseMenu) await B.press('escape');
    else if (s.blocking.cinematic || s.blocking.banner) { B.down(' '); await sleep(2300); B.up(' '); await sleep(500); }
    else if (!s.blocking.talk && !s.blocking.respawn && !s.blocking.loading && !s.blocking.paused) { if (i > 5) return true; }
    await sleep(250);
  }
  return false;
}
check("spel gestart (geen filmpje of pauze)", await settle());

const lines = V.getBusLines();
check('er zijn buslijnen', lines.length > 0, lines.length);
if (!lines.length) return JSON.stringify({ result: 'KLAAR', reason: 'geen buslijnen', checks });

// een lijn dicht bij de stad, in een rustig stuk: het midden van de lijn
const dist = (l) => Math.min(...l.pts.map((q) => Math.hypot(q[0] - 100, q[1] - 77)));
const line = lines.filter((l) => l.stops.length >= 4).sort((a, b) => dist(a) - dist(b))[0] || lines[0];
const s0 = line.stops[1].s + (line.stops[2].s - line.stops[1].s) * 0.4; // tussen halte 1 en 2, op 40 %
const at = BR.startAt(line, s0, 1);
function teleport(x, y) {
  if (player.inVehicle) player.exitVehicle(world.map, world);
  player.x = x; player.y = y; player.vx = player.vy = 0;
}
let rp = null;
for (let i = 0; i < 90 && !(rp && Math.hypot(rp.x - at.x, rp.y - at.y) <= 40); i++) {
  teleport(at.x, at.y);
  rp = world.map.nearestRoadPoint(at.x, at.y, 150, true);
  await sleep(1000);
}
check('weg bij de lijn geladen', rp && Math.hypot(rp.x - at.x, rp.y - at.y) <= 40, rp ? Math.round(Math.hypot(rp.x - at.x, rp.y - at.y)) + ' m' : 'geen weg');
if (!rp) return JSON.stringify({ result: 'KLAAR', reason: 'geen weg', checks });

const bus = V.spawnVehicleOnRoad(world.map, rp.road, false, Math.random, false, true, rp);
bus.x = rp.x; bus.y = rp.y; bus.angle = at.angle; bus.speed = 0;
bus.busRun = BR.makeRunner(line, s0, 1);
world.vehicles.push(bus);
await sleep(500);
player.x = bus.x; player.y = bus.y;
player.enterVehicle(bus, world);
await sleep(2500);
const card = () => document.querySelector('.hud-busnext');
check('in de bus', player.inVehicle === bus);
check('het HUD-kaartje heeft het aanbod', card() && card().classList.contains('offer') && /Dienst overnemen/.test(card().textContent), card() && card().textContent);
check('nog geen dienst', !(world.sideJob && world.sideJob.active));

// zonder G blijft het rondrijden: na een paar seconden nog geen dienst
await sleep(3000);
check('zonder G geen dienst', !(world.sideJob && world.sideJob.active));
for (let i = 0; i < 120 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); // het laadscherm na het verspringen
await sleep(2500);
B.shot('busbed-1-aanbod');

world.wanted = 0;
await B.press('g');
await sleep(1500);
const SJ = window.__debug && window.__debug.sidejobs;
const c = SJ && SJ.ctx();
check('dienst gestart op de lijn van de bus', c && c.job.id === 'lijn' && c.vehicle === bus && c.data.line === line, c ? c.job.id : 'geen ctx, berichten ' + JSON.stringify((world.messages || []).slice(-3).map((q) => q.text)) + ' status ' + JSON.stringify(B.status().blocking));
if (!c) return JSON.stringify({ result: 'KLAAR', reason: 'de dienst startte niet', checks });
await sleep(1000);
B.shot('busbed-2-dienst');
check('aanbod weg tijdens de dienst', !card() || !card().classList.contains('offer'));
const ride = c && c.data.ride;
check('rit loopt (dienst overgenomen)', ride && ride.phase === 'drive', ride && ride.phase);
const bed = bus.busBediend;
check('de bus heeft een bediening', !!bed);
ride.table.length = Math.min(ride.table.length, 3); // twee haltes: kort genoeg voor een headless run
const hudRow = () => document.querySelector('.hud-busbed');
check('HUD: de bedieningsrij staat onder het kaartje', !!hudRow() && /Deuren open/.test(hudRow().textContent) && /Kneel/.test(hudRow().textContent), hudRow() && hudRow().textContent);
check('HUD: prognose met afstand en tijd', hudRow() && /\d+ (m|km) · \d+ s/.test(hudRow().textContent), hudRow() && hudRow().textContent);

// rijdend: de deuren gaan niet open
bus.speed = 6;
await B.press('o');
await sleep(300);
check('rijdend gaan de deuren niet open', bed.doorWant === false, bed.doorWant);

// de halteknop: laat de bus een paar seconden staan, ver van de halte
bus.speed = 0;
for (let i = 0; i < 24 && !ride.request; i++) { bus.speed = 0; await sleep(500); }
await sleep(400);
const stopLamp = document.querySelector('.hud-busbed .bb-stop');
check('de halteknop-lamp volgt het verzoek', !ride.nextEx || ((ride.nextEx.alight > 0) === (!!ride.request && stopLamp.classList.contains('on'))), `alight ${ride.nextEx && ride.nextEx.alight}, request ${ride.request}`);
B.shot('busbed-3-halteknop');

// naar een halte (op het wegdek bij de halte) en stilstaan
async function naarHalte() {
  const n0 = ride.next, row = ride.table[n0];
  const p = RD.stopPos(ride, row);
  const wp = world.map.nearestRoadPoint(p.x, p.y, 40, true);
  const to = wp && Math.hypot(wp.x - p.x, wp.y - p.y) < 11 ? wp : p;
  for (let i = 0; i < 40 && ride.phase === 'drive' && ride.next === n0; i++) {
    bus.x = to.x; bus.y = to.y; bus.speed = 0; player.x = to.x; player.y = to.y;
    await sleep(400);
  }
  return row;
}
await naarHalte();
const aan0 = ride.onBoard;
check('aangekomen: wachten op de deuren', ride.phase === 'dwell' && !ride.doorsOpened, ride.phase);
check('deuren dicht: niemand stapt in of uit', ride.onBoard === aan0);
await sleep(1200);
B.shot('busbed-4-aankomst-deuren-dicht');
await B.press('k');
await sleep(1500);
check('K: de bus knielt', bed.kneelWant && bed.kneelAmt > 0.9, bed.kneelAmt);
await B.press('o');
await sleep(1200);
check('O: de deuren gaan open en reizigers stappen in en uit', ride.doorsOpened && bed.doorOpen === 1, `open ${bed.doorOpen}, opened ${ride.doorsOpened}`);
check('de schuifdeuren van de bus staan open (vehicledoors)', !!bus.doors && Object.values(bus.doors.open).some((x) => x > 0.9), bus.doors && JSON.stringify(bus.doors.open));
check('HUD: de deurknop zegt dicht', /Deuren dicht/.test(hudRow().textContent), hudRow().textContent);
B.shot('busbed-5-deuren-open-kneel');
// beelden met een eigen camera (lokale voertuigcoördinaten: x vooruit, z rechts = stoepkant): binnen in het gangpad
// kijkend naar achteren, en buiten bij de open voordeur. cinematics.js zet cameraOverride elk beeld terug: de eigenschap wordt vastgezet.
async function camShot(naam, van, naar, { interior = false, fov = 75 } = {}) {
  const c = Math.cos(bus.angle), s = Math.sin(bus.angle);
  const at = (p) => ({ x: bus.x + c * p[0] - s * p[1], y: bus.y + s * p[0] + c * p[1], z: (bus.z || 0) + p[2] });
  const eigen = { position: at(van), lookAt: at(naar), fov, cut: true, interior };
  Object.defineProperty(world, 'cameraOverride', { get: () => eigen, set: () => {}, configurable: true });
  await sleep(2500);
  B.shot(naam);
  delete world.cameraOverride;
  world.cameraOverride = null;
  await sleep(1200);
}
{
  const hl = bus.model.len / 2;
  await camShot('busbed-7-binnenzicht', [hl - 2.3, 0.1, 1.75], [-2, -0.2, 1.2], { interior: true, fov: 80 });
  await camShot('busbed-8-deur-buiten', [hl - 1.05, 6.5, 1.6], [hl - 1.2, 0, 1.0], { fov: 60 });
  const MV = await imp('models3d_vehicles');
  const mesh = MV.getVehicleMesh(bus.id);
  const ud = mesh && mesh.userData;
  check('de passagiersruimte is gebouwd (stoelen en reizigers)', !!(ud && ud.busInt && ud.busInt.visible && ud.busPas && ud.busPas.visible), ud && `int ${!!ud.busInt} pas ${ud.busPasN}`);
}
// de bus mag niet weg met open deuren: wacht de tijd uit, de fase blijft halteren
await sleep(9000);
check('open deuren houden de bus vast', ride.phase === 'dwell', ride.phase);
await B.press('o');
await sleep(1500);
await B.press('k');
for (let i = 0; i < 60 && ride.phase !== 'drive'; i++) await sleep(500); // de speeltijd loopt headless langzamer dan de echte tijd
check('deuren dicht: de bus vertrekt', ride.phase === 'drive', ride.phase);
await sleep(1500);
check('de bus staat weer op rijhoogte', bed.kneelAmt === 0, bed.kneelAmt);

// de laatste halte: deuren open, uitstappen, rit klaar
const money0 = world.money;
await naarHalte();
await sleep(500);
await B.press('o');
for (let i = 0; i < 20 && !ride.done; i++) await sleep(500);
check('eindhalte: de rit is klaar na het openen', ride.done, `phase ${ride.phase}, doorsOpened ${ride.doorsOpened}`);
await sleep(1500);
check('de dienst heeft betaald', world.money > money0, `+${world.money - money0}`);
check('tevredenheid in een redelijk bereik', ride.tevreden.sat > 40 && ride.tevreden.sat <= 100, Math.round(ride.tevreden.sat));
B.shot('busbed-6-klaar');
SJ.quit();
await sleep(500);
const bad = checks.filter((q) => !q.ok);
return JSON.stringify({ result: 'KLAAR', reason: `${checks.length - bad.length}/${checks.length} controles goed${bad.length ? ', mislukt: ' + bad.map((q) => q.naam).join('; ') : ''}`, checks, gameSeconds: Math.round(world.time) });
