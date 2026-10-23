// Pagina-script voor `node scripts/bot/run.mjs --page=scripts/bot/machinist.page.js --out=<map> --force|--slot` (#424).
// Loopt end-to-end een treindienst als machinist, op meerdere stilstaande treinen (andere stations en lijnen): naar de
// kop van de trein lopen, de hint lezen, instappen (E), de dienst starten (G), de eerste halte aandoen, de volgende
// halten op de streep zetten, de dienst afmaken, de betaling zien en uitstappen (E). Per trein een 'machinist'-gebeurtenis.
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
const check = (naam, ok, info = '') => { checks.push({ naam, ok: !!ok, info: String(info) }); B.log('machinist', { naam, ok: !!ok, info: String(info) }); };

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

// treinen die stilstaan, op verschillende plekken (andere lijnen of stations): hooguit drie, elke keer vers gekozen
// (een trein die ondertussen is vertrokken doet niet mee)
const gedaan = [];
const kiesStil = async () => {
  for (let poging = 0; poging < 80; poging++) {
    for (const t of RW.getTrains()) {
      if ((t.state !== 'dwell' && t.state !== 'parked') || (t.route.stops[t.target] || {}).offmap) continue;
      const [x, y] = RW.routePoint(t.route, t.c);
      if (gedaan.every((g) => Math.hypot(g.x - x, g.y - y) > 1500)) { gedaan.push({ x, y }); return t; }
    }
    await sleep(1000);
  }
  return null;
};
for (let nr = 0; nr < 2; nr++) {
  const kand = await kiesStil();
  check('stilstaande trein ' + (nr + 1) + ' op een nieuwe plek gevonden', !!kand);
  if (!kand) break;
  // eerst naar het station (het laadscherm duurt langer dan een halte van 25 s), dan een trein kiezen die daar nu net staat
  const [cx, cy] = RW.routePoint(kand.route, kand.c);
  teleport(cx, cy);
  await laadscherm();
  let t = null;
  for (let i = 0; i < 480 && !t; i++) {
    t = RW.getTrains().find((q) => (q.state === 'parked' || (q.state === 'dwell' && q.timer > 14)) && !(q.route.stops[q.target] || {}).offmap && Math.hypot(...RW.routePoint(q.route, q.c).map((v, k) => v - (k ? cy : cx))) < 150) || null;
    if (!t) await sleep(500);
  }
  check('trein ' + (nr + 1) + ' staat bij het station als de speler er is', !!t);
  if (!t) continue;
  const tag = `trein ${nr + 1} (${t.cfg && t.cfg.label}, ${t.state})`;
  let dienst = null;
  // beide koppen proberen: aan één kant ligt soms geen halte meer vooruit (einde van de lijn)
  for (const end of [-1, 1]) {
    if (world.trainDriving) { TD.quitTrainDrive(world); await sleep(800); }
    world.wanted = 0;
    const [bx, by] = RW.routePoint(t.route, t.c + end * (t.halfLen - 3));
    teleport(bx, by);
    await sleep(400);
    const pr = TD.trainPrompt(world);
    if (nr === 0 && end === -1) { await sleep(1300); B.shot('machinist-1-hint'); await sleep(300); }
    check(`${tag} kop ${end}: de hint noemt G`, pr && /G/.test(pr.sub || ''), pr && `${pr.label}: ${pr.sub}`);
    await B.press('e');
    await sleep(1200);
    check(`${tag} kop ${end}: instappen met E`, !!world.trainDriving, world.trainDriving ? 'bestuurt' : 'niet ingestapt');
    if (!world.trainDriving) continue;
    const fresh = world.wanted > 0;
    await B.press('g');
    await sleep(1500);
    const staat = MC.getServiceMapState(world);
    if (staat) { dienst = { t, end, staat, fresh }; break; }
    check(`${tag} kop ${end}: einde van de lijn meldt het`, world.messages && world.messages.slice(-3).some((q) => /andere kant/.test(q.text)), JSON.stringify((world.messages || []).slice(-2).map((q) => q.text)));
  }
  check(`${tag}: de dienst start aan een van de koppen`, !!dienst);
  if (!dienst) continue;
  if (nr === 0) { await sleep(1500); B.shot('machinist-2-dienst'); }
  check(`${tag}: de sterren van de kaping zijn weg`, world.wanted === 0, world.wanted);
  check(`${tag}: de kaart kent de dienst (haltes en spoor)`, dienst.staat.stops.length >= 1 && dienst.staat.route.length > 2, dienst.staat.stops.length + ' haltes');
  // eerst echt wegrijden (de dienst telt een halte pas na bewegen), dan elke halte op de streep zetten
  const money0 = world.money;
  B.down('w');
  for (let i = 0; i < 60 && t.v < 2.5; i++) await sleep(250);
  B.up('w');
  check(`${tag}: de trein trekt op met W`, t.v >= 2.5, t.v);
  const haltes = dienst.staat.stops.map((q) => q.name);
  const ahead = t.route.stops.map((q) => q.s).filter((s) => (s - t.c) * t.cab > 0).sort((a, b) => (a - b) * t.cab).slice(0, haltes.length);
  const log = [];
  for (const s of ahead) {
    t.c = s - t.cab * 0.3; t.v = 0.2; t.pv = 0.2;
    await sleep(1800);
    t.v = 0.2; t.pv = 0.2;
    await sleep(1200);
    const stt = MC.getServiceMapState(world);
    log.push(`${Math.round(s)}:${stt ? stt.stops.map((q) => (q.done ? 'x' : q.next ? '>' : '.')).join('') : 'klaar'}/c${Math.round(t.c)}/v${t.v.toFixed(1)}`);
  }
  B.log('machinist', { naam: 'haltelog', ok: true, info: log.join(' ') });
  for (let i = 0; i < 40 && MC.getServiceMapState(world); i++) await sleep(500);
  await sleep(1500);
  check(`${tag}: de dienst is afgerond en betaalt`, world.money > money0, `+${world.money - money0}`);
  // uitstappen
  t.v = 0; t.pv = 0;
  await B.press('e');
  await sleep(1000);
  check(`${tag}: uitstappen met E`, !world.trainDriving, world.trainDriving ? 'nog aan het rijden' : '');
}

const bad = checks.filter((q) => !q.ok);
return JSON.stringify({ result: 'KLAAR', reason: `${checks.length - bad.length}/${checks.length} controles goed${bad.length ? ', mislukt: ' + bad.map((q) => q.naam).join('; ') : ''}`, checks, gameSeconds: Math.round(world.time) });
