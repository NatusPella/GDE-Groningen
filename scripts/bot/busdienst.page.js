// Pagina-script voor `node scripts/bot/run.mjs --page=scripts/bot/busdienst.page.js --out=<map> --force|--slot` (desktop --perf-script body; #396).
// Zet een lijnbus op een lijn, laat de bot instappen, kijkt of het aanbod "Dienst overnemen" in het HUD staat,
// drukt G en volgt de rit: de bijbaan Streekbus loopt op de lijn en richting van die bus, de eerste doelhalte is de
// eerstvolgende halte vooruit, en na de laatste halte betaalt de dienst. Geeft per controle een 'busdienst'-gebeurtenis.
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
const check = (naam, ok, info = '') => { checks.push({ naam, ok: !!ok, info: String(info) }); B.log('busdienst', { naam, ok: !!ok, info: String(info) }); };

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

world.wanted = 0;
await B.press('g');
await sleep(1500);
const SJ = window.__debug && window.__debug.sidejobs;
const c = SJ && SJ.ctx();
check('dienst gestart op de lijn van de bus', c && c.job.id === 'lijn' && c.vehicle === bus && c.data.line === line, c ? c.job.id : 'geen ctx, berichten ' + JSON.stringify((world.messages || []).slice(-3).map((q) => q.text)) + ' status ' + JSON.stringify(B.status().blocking));
if (!c) return JSON.stringify({ result: 'KLAAR', reason: 'de dienst startte niet', checks });
check('aanbod weg tijdens de dienst', !card() || !card().classList.contains('offer'));
const ride = c && c.data.ride;
check('rit loopt al (geen start bij halte 1)', ride && ride.phase === 'drive' && ride.next === 1, ride && ride.phase);
check('de eerste doelhalte is de eerstvolgende vooruit', ride && ride.table[1].s === line.stops[2].s, ride && JSON.stringify(ride.table.slice(0, 2).map((r) => Math.round(r.s))));
check('reizigers aan boord, niet betaald', ride && ride.onBoard > 0 && ride.passengers === 0, ride && ride.onBoard);
check('het HUD-kaartje volgt de lijn van de rit', card() && card().textContent.includes('lijn ' + String(line.ref).slice(0, 4)), card() && card().textContent);

// de bus langs de haltes zetten: elke halte staat hij stil binnen de straal, de rit telt ze af
const money0 = world.money;
const t0 = Date.now();
let gehaald = 0;
let sterren = 0;
for (let i = 0; i < 400 && SJ.ctx() === c && c.data.ride === ride && !ride.done; i++) {
  const row = ride.phase === 'dwell' ? null : ride.table[ride.next];
  if (row) {
    const p = RD.stopPos(ride, row);
    // op het wegdek bij de halte, binnen de haltestraal (op het kerbpunt zelf telt het als fietspad of voetpad: sterren)
    const wp = world.map.nearestRoadPoint(p.x, p.y, 40, true);
    const to = wp && Math.hypot(wp.x - p.x, wp.y - p.y) < 11 ? wp : p;
    if (Math.hypot(to.x - bus.x, to.y - bus.y) > 8) { bus.x = to.x; bus.y = to.y; player.x = to.x; player.y = to.y; }
    bus.speed = 0;
  }
  await sleep(500);
  if (world.wanted > 0 && !sterren) { sterren = world.wanted; B.log('busdienst', { naam: 'sterren-reden', info: JSON.stringify((world.messages || []).slice(-4).map((q) => q.text)) }); }
  gehaald = ride.next;
  if (Date.now() - t0 > 240000) break;
}
check('geen sterren door de aangifte van de bestuurder (de bus is gekaapt)', sterren === 0, sterren);
check('de rit is afgemaakt', ride && ride.done, `halte ${gehaald}/${ride && ride.table.length - 1}, einde: ${JSON.stringify(SJ.last())}, reden ${world.stats && world.stats.lastWantedWhy}, ritfout ${ride && ride.failed}`);
await sleep(1500);
check('de dienst heeft betaald', world.money > money0, `+${world.money - money0}`);
check('dienst telt als ronde (reeks 1)', SJ.ctx() && SJ.ctx().streak === 1, SJ.ctx() && SJ.ctx().streak);
SJ.quit();
await sleep(1000);
check('na stoppen weer rondrijden: aanbod terug', card() && card().classList.contains('offer'), card() && card().className);

const bad = checks.filter((q) => !q.ok);
return JSON.stringify({ result: 'KLAAR', reason: `${checks.length - bad.length}/${checks.length} controles goed${bad.length ? ', mislukt: ' + bad.map((q) => q.naam).join('; ') : ''}`, checks, gameSeconds: Math.round(world.time) });
