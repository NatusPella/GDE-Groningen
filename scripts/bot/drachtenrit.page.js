// Page half voor `scripts/bot/run.mjs --page=scripts/bot/drachtenrit.page.js --speed=4` (#411): de bot rijdt de zijmissie "De rit naar Tjalke".
// Test-setup (gelogd als 'setup'): teleport naar het café. Daarna zoals een speler: E voor de baan, in de auto, en rijden over de GPS-lijn van het spel
// (de marker van de baan staat aan het einde van de A7), de pionnen ontwijkend als een slalom en met de politie achter zich. Uitslag in result.json:
// fasen, omgetikte pionnen, sterren, geld, of de rit klaar is. Een kwartier speltijd; `--max-wall` ruim zetten.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt (?autoplay niet aan?)' });
const L = await imp('botlogic');
const R = await imp('routing');
const SJ = await imp('sidejobs');
const Br = await imp('breakables');
const V = await imp('vehicle');
const RIT = await imp('drachtenrit');
const RG = await imp('roadgraph');
const world = B.world, player = B.player;
const CFG = window.__botCfg || {};
B.speed(CFG.speed > 1 ? CFG.speed : 4);
world.devInvuln = true;   // de bot valt niet dood van een botsing (het gaat om het verloop)

const spot = SJ.getSideJobSpotsForRender().find((s) => s.job.id === 'tjalke');
if (!spot) return JSON.stringify({ result: 'FOUT', reason: 'geen startplek voor tjalke op de kaart' });
if (player.inVehicle) player.exitVehicle(world.map, world);
player.x = spot.x; player.y = spot.y; player.vx = player.vy = 0;
B.log('setup', { what: 'teleport', id: 'tjalke', x: Math.round(spot.x), y: Math.round(spot.y) });
await sleep(6000);
for (let i = 0; i < 40 && B.status().blocking.cinematic; i++) { B.down(' '); await sleep(1300); B.up(' '); }

const act = world.sideJobActions;
const money0 = world.money;
for (let k = 0; k < 6 && !act.active(); k++) { await B.press('e', 400); await sleep(2000); }
if (!act.active()) return JSON.stringify({ result: 'FOUT', reason: 'de baan startte niet na zes keer E', msgs: B.status().hud.messages });
B.log('bijbaan', { id: 'tjalke', gestart: true });
for (let i = 0; i < 40 && B.status().blocking.cinematic; i++) { B.down(' '); await sleep(1300); B.up(' '); }

// in de auto: de baan zet hem bij het café neer (world.vehicles, vlag sideJob)
const jobAuto = () => world.vehicles.find((q) => q.sideJob && q.missionCar && !q.wrecked) || null;
for (let k = 0; k < 14 && !player.inVehicle; k++) {
  const v = jobAuto();
  if (!v) { await sleep(500); continue; }
  if (Math.hypot(player.x - v.x, player.y - v.y) > 3) { player.x = v.x + 2.2; player.y = v.y; player.vx = player.vy = 0; await sleep(500); }
  await B.press('e', 500); await sleep(1200);
  if (k === 8 && !player.inVehicle) { B.log('setup', { what: 'instappen', waarom: 'E werkte niet na negen keer' }); player.enterVehicle(v, world); await sleep(500); }
}
if (!player.inVehicle) return JSON.stringify({ result: 'FOUT', reason: 'niet in de auto gekomen', auto: !!jobAuto(), x: Math.round(player.x), y: Math.round(player.y) });
B.log('instappen', { x: Math.round(player.x), y: Math.round(player.y) });

const ctx = () => (window.__debug && window.__debug.sidejobs && window.__debug.sidejobs.ctx ? window.__debug.sidejobs.ctx() : null);
const log = { fasen: [], sterren: 0, tikken: 0, politieTijd: 0 };
const wedge = new L.WedgeDetector();
let follower = null, planAt = -99, lastFase = '', lastStar = 0, t0 = performance.now(), wedges = 0;
const wall = (CFG.maxWallS || 1800) * 1000 - 90000;

function trafficAhead(me) {
  const out = [];
  for (const p of world.pedestrians || []) { if (p.state === 'dead' || Math.hypot(p.x - me.x, p.y - me.y) > 30) continue; out.push({ x: p.x, y: p.y, r: 0.45 }); }
  const own = player.inVehicle;
  for (const v of world.vehicles || []) {
    if (v === own || v.wrecked || v.sinking || Math.hypot(v.x - me.x, v.y - me.y) > 40) continue;
    if (v.isPolice && Math.hypot(v.x - me.x, v.y - me.y) < 8) continue;
    out.push({ x: v.x, y: v.y, r: Math.max(0.9, (v.halfWid || 1) * 0.9) });
  }
  // de pionnen van de afzetting: voor de bot een hindernis, zoals voor een speler die wil slalommen
  for (const q of Br.propsInRadius(me.x, me.y, 45)) if (String(q.key).startsWith('pion')) out.push({ x: q.x, y: q.y, r: 0.5 });
  return out;
}

while (act.active() && performance.now() - t0 < wall) {
  await sleep(100);
  const s = B.status();
  const c = ctx();
  const d = c && c.data && c.data.s;
  if (d && d.fase !== lastFase) { lastFase = d.fase; log.fasen.push([Math.round(s.t), d.fase]); B.log('fase', { fase: d.fase, t: Math.round(s.t), pionnen: d.pionnen, wanted: s.wanted }); }
  if (s.wanted > lastStar) { log.sterren = Math.max(log.sterren, s.wanted); lastStar = s.wanted; B.log('politie', { wanted: s.wanted, x: Math.round(s.player.x), y: Math.round(s.player.y), v: Math.round((s.player.vehicle ? s.player.vehicle.speed : 0) * 10) / 10, peds: s.nearby.peds, politie: s.nearby.police, msgs: s.hud.messages.slice(0, 3), dronken: Math.round((world.drunk || 0) * 100) / 100 }); }
  if (s.wanted === 0) lastStar = 0;
  if (s.blocking.cinematic || s.blocking.banner || s.blocking.talk) { B.stick(0, 0); B.down(' '); await sleep(300); B.up(' '); continue; }
  if (s.blocking.pauseMenu) { await B.press('escape'); continue; }
  const veh = player.inVehicle;
  if (!veh) {
    // uit de auto (gestopt door de politie, of een botsing): terug in
    const v2 = jobAuto();
    if (v2) { if (Math.hypot(player.x - v2.x, player.y - v2.y) > 3) { player.x = v2.x + 2.5; player.y = v2.y; } await B.press('e', 400); await sleep(800); }
    continue;
  }
  const me = { x: s.player.x, y: s.player.y };
  if (!follower || s.t - planAt > 10) {
    planAt = s.t;
    const end = RIT.RIT.einde;
    let pts = null, bron = '';
    try { pts = R.getRouteAhead(1e9); } catch (e) { pts = null; }
    const nearEnd = (p) => p && p.length > 1 && Math.hypot(p[p.length - 1][0] - end.x, p[p.length - 1][1] - end.y) < 800;
    if (nearEnd(pts)) bron = 'gps';
    else {
      // the game's own route does not reach the end (yet): the city streets to the A7 (the spot where the A7 enters the world data), then the province road net
      pts = null;
      try {
        const E0 = [-4102, 1978];
        const stad = Math.hypot(me.x - E0[0], me.y - E0[1]) > 600 ? R.planLandRoute(world.map, 'drive', [me.x, me.y], E0) : null;
        const a = RG.snapRoad(stad ? E0[0] : me.x, stad ? E0[1] : me.y, 600, false), b = RG.snapRoad(end.x, end.y, 600, false);
        const rest = a && b ? RG.roadPath(a, b, null) : null;
        if (rest) { pts = [...(stad && stad.pts ? stad.pts : []), ...rest]; bron = stad ? 'stad+provincie' : 'provincie'; }
      } catch (e) { B.log('routefout', { msg: String(e && e.message || e).slice(0, 160) }); }
    }
    B.log('route', { bron: bron || 'recht', punten: pts ? pts.length : 0, van: [Math.round(me.x), Math.round(me.y)] });
    if (pts && pts.length > 1) follower = new L.PathFollower(pts, { reach: 12 });
    else follower = new L.PathFollower([[me.x, me.y], [end.x, end.y]], { reach: 12 });
  }
  const aim = follower.next(me) || { x: RIT.RIT.einde.x, y: RIT.RIT.einde.y };
  const car = { x: me.x, y: me.y, angle: veh.angle, speed: veh.speed };
  const obst = trafficAhead(me);
  const curve = L.curveCap(follower.pts, follower.i, car);
  const ctl = L.carControls(car, aim, { top: 32, avoid: obst, curveCap: curve });
  B.stick(ctl.steer, ctl.throttle ? -ctl.throttle : 0);
  if (!ctl.reverse && wedge.update(s.t, veh.speed, ctl.throttle)) {
    wedge.reset(); wedges++; B.log('klem', { x: Math.round(me.x), y: Math.round(me.y) });
    B.stick(wedges % 2 ? 0.9 : -0.9, 1); await sleep(1500); B.stick(0, 0); follower = null;
  }
}
B.releaseAll();
const c = ctx();
log.tikken = c && c.data && c.data.s ? c.data.s.pionnen : null;
const klaar = !act.active();
const geld = Math.round(world.money - money0);
B.log('einde-rit', { klaar, geld, sterren: log.sterren, fasen: log.fasen, tikken: log.tikken, wedges, wallS: Math.round((performance.now() - t0) / 1000) });
const ok = klaar && geld >= RIT.PRIJS.basis;
return JSON.stringify({ result: ok ? 'KLAAR' : 'MISLUKT', reason: ok ? 'de rit is gereden' : `klaar ${klaar}, geld ${geld}, fasen ${log.fasen.map((f) => f[1]).join('>')}`, ...log, geld, wedges });
