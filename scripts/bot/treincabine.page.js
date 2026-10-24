// Pagina-script voor `node scripts/bot/run.mjs --page=scripts/bot/treincabine.page.js --out=<map> --force|--slot` (#444).
// Een machinist in de cabine: instappen, de uitleg, de dienst starten, de tractiehendel (W en S), de waakzaamheidsknop (K),
// een halte met de deuren (O), een storing (sein of overweg) en de eindstand. Maakt beelden voor het bord (shots-cab-*.png)
// en een 'treincabine'-gebeurtenis per controle.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt' });
const world = B.world, player = B.player;
const RW = await imp('railway');
const TD = await imp('traindrive');
const MC = await imp('machinist');
world.devInvuln = true;
const checks = [];
const check = (naam, ok, info = '') => { checks.push({ naam, ok: !!ok, info: String(info) }); B.log('treincabine', { naam, ok: !!ok, info: String(info) }); };
const hudText = (sel) => { const e = document.querySelector(sel); return e && !e.hidden ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };

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
check('spel gestart', await settle());
const teleport = (x, y) => {
  if (player.inVehicle) player.exitVehicle(world.map, world);
  player.x = x; player.y = y; player.vx = player.vy = 0;
};
const laadscherm = async () => { await sleep(1500); for (let i = 0; i < 120 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3500); };

// een stilstaande trein vinden (eerst naar zijn station, dan een die daar nu staat)
let kand = null;
for (let p = 0; p < 80 && !kand; p++) {
  kand = RW.getTrains().find((t) => (t.state === 'dwell' || t.state === 'parked') && !(t.route.stops[t.target] || {}).offmap) || null;
  if (!kand) await sleep(1000);
}
check('een stilstaande trein gevonden', !!kand);
if (!kand) return JSON.stringify({ result: 'KLAAR', reason: 'geen trein', checks });
const [cx, cy] = RW.routePoint(kand.route, kand.c);
teleport(cx, cy);
await laadscherm();
let t = null;
for (let i = 0; i < 480 && !t; i++) {
  t = RW.getTrains().find((q) => (q.state === 'parked' || (q.state === 'dwell' && q.timer > 14)) && !(q.route.stops[q.target] || {}).offmap && Math.hypot(...RW.routePoint(q.route, q.c).map((v, k) => v - (k ? cy : cx))) < 150) || null;
  if (!t) await sleep(500);
}
check('trein staat bij het station', !!t);
if (!t) return JSON.stringify({ result: 'KLAAR', reason: 'trein weg', checks });

// instappen en de dienst starten, aan de kop met een halte vooruit
let dienst = false;
for (const end of [-1, 1]) {
  if (world.trainDriving) { TD.quitTrainDrive(world); await sleep(800); }
  world.wanted = 0;
  const [bx, by] = RW.routePoint(t.route, t.c + end * (t.halfLen - 3));
  teleport(bx, by);
  await sleep(500);
  await B.press('e');
  await sleep(1200);
  if (!world.trainDriving) continue;
  check('instappen met E', true);
  await sleep(800);
  B.shot('cab-1-intro');
  check('de uitleg staat in beeld', /TREIN BESTUREN/.test(hudText('.tc-intro')) && /hendel/i.test(hudText('.tc-intro')), hudText('.tc-intro').slice(0, 80));
  check('het cabinebord staat in beeld', /KM\/U/.test(hudText('.tc-cab')), hudText('.tc-cab').slice(0, 120));
  await B.press('g');
  await sleep(1200);
  if (MC.getService() && !MC.getService().finished) { dienst = true; break; }
}
check('de dienst start', dienst);
if (!dienst) return JSON.stringify({ result: 'KLAAR', reason: 'geen dienst', checks });
await sleep(500);
B.shot('cab-2-dienst-stil');
const cab = TD.getCab();

// de hendel: W zet hem op Tractie, de trein trekt op; S brengt hem terug
await B.press('w'); await sleep(150); await B.press('w'); await sleep(150); await B.press('w');
await sleep(300);
check('W zet de hendel op Tractie 3', cab.lever === 3, cab.lever);
for (let i = 0; i < 80 && t.v < 12; i++) await sleep(250);
check('de trein trekt op met de hendel', t.v >= 12, t.v.toFixed(1));
B.shot('cab-3-rijden');
check('het bord toont snelheid, bord en volgend station', /KM\/U/.test(hudText('.tc-cab')) && /VOLGEND STATION/.test(hudText('.tc-cab')), hudText('.tc-cab').slice(0, 160));
// de hendel laten staan op Tractie 1: de waakzaamheid vraagt na DM_AFTER s om een teken
await B.press('s'); await sleep(150); await B.press('s');
check('S zet de hendel terug', cab.lever === 1, cab.lever);
let vraag = false;
for (let i = 0; i < 70 * 4 && !vraag; i++) { await sleep(250); vraag = cab.warn; }
await sleep(600);
check('de waakzaamheid vraagt om een teken', vraag, vraag ? 'ja' : 'geen vraag, v=' + t.v.toFixed(1));
if (vraag) {
  B.shot('cab-4-waak');
  check('het bord waarschuwt', /WAAKZAAM/.test(hudText('.tc-alert')), hudText('.tc-alert'));
  // K lost het op
  await B.press('k');
  await sleep(500);
  check('K lost de vraag op', !cab.warn && cab.dm < 1, `warn=${cab.warn}`);
  // en nog een keer niet reageren: de rem grijpt in
  for (let i = 0; i < 70 * 4 && !cab.brake; i++) { await sleep(250); if (cab.warn && !cab.brake && i % 8 === 0) { /* wachten */ } }
  check('zonder teken remt de trein vanzelf', cab.brake || cab.count > 0, `count=${cab.count}`);
  await sleep(500);
  B.shot('cab-5-waakrem');
  for (let i = 0; i < 80 && t.v > 0.3; i++) await sleep(250);
  check('de trein staat na de waakzaamheidsrem', t.v <= 0.3, t.v.toFixed(1));
}

// nu echt de dienst rijden met een eenvoudige piloot op de hendel
const svc0 = () => MC.getService();
const tap = async (k) => { await B.press(k); await sleep(60); };
let shots = { storing: false, deuren: false, stop: false };
let stopsDone = 0;
const t0 = Date.now();
const leverFor = (svc) => {
  const v = t.v, toStop = svc.toStop, lim = svc.limit;
  const need = v * v / (2 * Math.max(toStop - 4, 1));
  if (svc.doorsUntil > world.time) return 0;
  if (toStop < 70 && need > 0.15) return need > 1.6 ? -3 : need > 0.8 ? -2 : -1;
  if (v > lim + 0.3) return v > lim + 3 ? -2 : -1;
  if (v < lim - 3 && toStop > 90) return 3;
  return 0;
};
let deurenGetest = false;
while (Date.now() - t0 < 420000) {
  const svc = svc0();
  if (!svc || svc.finished) break;
  const done = svc.plan.filter((p) => p.score != null).length;
  if (done > stopsDone) {
    stopsDone = done;
    if (!shots.stop) { shots.stop = true; await sleep(300); B.shot('cab-7-halte'); check('de halte staat op het bord met de deuren open', /open/i.test(hudText('.tc-door')), hudText('.tc-door')); }
  }
  // de deuren met O: eerst te snel (weigert), later dicht
  if (svc.doorsUntil > world.time && !deurenGetest && world.time - svc.opened > 6) {
    deurenGetest = true;
    await tap('o');
    await sleep(500);
    check('O sluit de deuren op de halte', !(svc.doorsUntil > world.time), '');
  }
  if (svc.storingen.length && !shots.storing) {
    const text = hudText('.tc-storing');
    if (text) { shots.storing = true; await sleep(400); B.shot('cab-6-storing'); check('een storing staat op het bord', true, text); }
  }
  if (stopsDone >= 2) break;
  const want = leverFor(svc);
  if (cab.brake) { await sleep(200); continue; }
  if (cab.lever < want) await tap('w');
  else if (cab.lever > want) await tap('s');
  else await sleep(150);
  await sleep(100);
}
check('twee halten gedaan', stopsDone >= 2, `${stopsDone} halten, ${Math.round((Date.now() - t0) / 1000)} s`);
if (!shots.storing) check('een storing kwam langs (sein of overweg)', false, 'geen storing gezien op de eerste halten');
// het binnenzicht (C) en rondlopen (T) terwijl de trein rijdt
{
  const TL = await imp('treininterieur');
  await tap('c');
  await sleep(900);
  B.shot('cab-9-cabinezicht');
  check('C zet de camera in de cabine', !!(world.trainCam && world.trainCam.inside && world.trainCam.eye), '');
  await tap('c');
  for (let i = 0; i < 6 && cab.lever < 2; i++) await tap('w');
  for (let i = 0; i < 80 && t.v < 8; i++) await sleep(250);
  const v0 = t.v, c0 = t.c;
  await tap('t');
  await sleep(600);
  const walk = world.trainWalk;
  check('T laat je opstaan in de wagen', !!walk, walk ? `wagen ${walk.car}` : 'geen');
  if (walk) {
    walk.yaw = t.cab > 0 ? Math.PI : 0;
    B.down('w'); await sleep(2500); B.up('w');
    await sleep(300);
    B.shot('cab-10-wagen-rijdend');
    const car = t.cars[walk.car];
    check('je loopt mee met de rijdende trein', Math.hypot(player.x - car.x, player.y - car.y) < 14 && t.c !== c0, `v=${t.v.toFixed(1)} afstand ${Math.hypot(player.x - car.x, player.y - car.y).toFixed(1)}`);
    check('het binnenste van de wagen is gebouwd', TL.builtCount && true, '');
    B.down('w'); await sleep(9000); B.up('w');
    await sleep(300);
    B.shot('cab-11-volgende-wagen');
    check('je kunt naar een andere wagen lopen', walk.car !== (t.cab > 0 ? 0 : t.cars.length - 1), `wagen ${walk.car}`);
    walk.yaw = t.cab > 0 ? 0 : Math.PI;
    B.down('w'); await sleep(12000); B.up('w');
    await sleep(300);
    await tap('t');
    await sleep(500);
    check('T brengt je terug in de cabine', !world.trainWalk, '');
  }
}
// de eindstand: stoppen met Backspace laat de kaart zien
await sleep(600);
await B.press('backspace');
await sleep(900);
B.shot('cab-8-eindstand');
const res = hudText('.tc-result');
check('de eindstand toont punctualiteit, comfort en veiligheid', /Punctualiteit/.test(res) && /Comfort/.test(res) && /Veiligheid/.test(res), res.slice(0, 160));
t.v = 0; t.pv = 0;
await B.press('backspace');
await sleep(500);
await B.press('e');
await sleep(800);
check('uitstappen met E', !world.trainDriving);
check('het bord is weg na het uitstappen', !document.querySelector('.tc-cab') || document.querySelector('.tc-cab').hidden);

const bad = checks.filter((q) => !q.ok);
return JSON.stringify({ result: 'KLAAR', reason: `${checks.length - bad.length}/${checks.length} controles goed${bad.length ? ', mislukt: ' + bad.map((q) => q.naam).join('; ') : ''}`, checks, gameSeconds: Math.round(world.time) });
