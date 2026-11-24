// Beeldpunten voor de milestone Voetbalcarrière (#1109 #1110 #1111 #1113 #1114 #1115 #1117 #1118): het Voetbal-scherm onder Loopbanen (dicht, uitnodiging,
// tabs), het tabblad Club, een trainingsoefening, trainende teams op het park, de kaart, en een carrièrewedstrijd op het sportpark (opstelling, spel, publiek,
// shirts, reclameborden, het veld op de plek van het echte park). Een scriptbody voor desktop --perf-script:
//   node .scr/run.mjs --scenes=scripts/ui/voetbal_scenes.js --only=menu,wedstrijd --out=.scr/out/<naam> --game=desktop/build/<stage>/game
// Uitvoer: '[capture] b<nr>-<naam>' (een beeld) en '[vb] <json>' (metingen) op stderr; de terugkeerwaarde is het rapport.
// Geen echte opslag: de carrière schrijft naar een opslag in het geheugen (useStorage), de poort gaat open met zetPoort (alleen in deze run).
// Samen spelen: alles draait lokaal in een spel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (nr) => !ONLY.length || ONLY.includes(String(nr));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const log = (o) => console.error('[vb] ' + JSON.stringify(o));
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive() && !cine.isCinematicActive('vb-view')) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
const PM = await imp('pausemenu'); const DN = await imp('daynight'); const BUSY = await imp('busy');
const CL = await imp('voetbalcarrierelive'); const VB = await imp('voetbal');
const C = await imp('voetbalcarriere'); const PK = await imp('voetbalparken');
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
let klok = 15;
const fix = () => { w.clock = klok; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
const houd = setInterval(fix, 400);
// de carrière in een opslag in het geheugen: nooit gde-voetbalcarriere-v1 in het profiel
const mem = new Map();
CL.useStorage({ getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) });
for (let i = 0; i < 40 && CL.getIndex().parkCount < 20; i++) await sleep(250);
// de geluiden die het spel vraagt (met --stil speelt er niets af; dit toont alleen dat de haak afgaat)
const gehoord = new Map();
const tapAudio = () => { const q = w.audioEvents || (w.audioEvents = []); if (q.__vb) return; const op = q.push; q.push = function (...a) { for (const e of a) if (e && e.kind === 'fx') gehoord.set(e.name, (gehoord.get(e.name) || 0) + 1); return op.apply(this, a); }; q.__vb = true; };
const audioTap = setInterval(tapAudio, 50);
let pose = null;
const camOff = () => { pose = null; if (cine.isCinematicActive('vb-view')) cine.skipCinematic(); w.cameraOverride = null; };
const ensureCam = () => { if (pose && !cine.isCinematicActive('vb-view')) cine.playCinematic({ id: 'vb-view', duration: 3600, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose }); };
const cam = (x, y, z, lx, ly, lz, fov = 60) => { pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true }; ensureCam(); };
const jump = async (x, y, settle = 5000) => {
  camOff(); if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
  for (let i = 0; i < 450 && loading(); i++) await sleep(100);
  await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
};
let cur = null;
const report = [];
const shot = async (name, wait = 1500) => {
  ensureCam(); await sleep(wait); ensureCam(); await sleep(150); fix();
  const was = window.__capAck || 0;
  console.log('[capture] b' + cur + '-' + name);
  for (let i = 0; i < 600 && (window.__capAck || 0) <= was; i++) await sleep(100);
  await sleep(200);
};
const reset = async () => {
  camOff();
  try { BUSY.quitRunningActivities(w); } catch (e) { log({ reset: 'activiteiten: ' + e.message }); }
  try { if (window.__voetbal) window.__voetbal.quit(); } catch (e) { /* geen wedstrijd */ }
  for (let i = 0; i < 20 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(150); }
  try { PM.closePauseMenu(); } catch (e) { /* niet open */ }
  w.cinematicHidePlayers = false; w.cinematicHideNav = false; w.cameraOverride = null; w.paused = false;
  for (const el of document.querySelectorAll('.bm-moment, .big-moment')) el.remove();
  await sleep(500);
};
const scene = async (nr, fn) => {
  if (!want(nr)) return;
  cur = nr; console.error('[vb] scene ' + nr);
  const ev = { nr, ok: true };
  try { await fn(ev); } catch (e) { ev.ok = false; ev.fout = String(e && e.stack || e).slice(0, 400); }
  log(ev); report.push(ev);
  await reset();
};
// de voetbalcarrière open zoals in een save van akte 4: de verhaalpoort (story.js) met 'voetbal' in gate.open; daarna volgen menu, poort en Te doen vanzelf
const ST = await imp('story');
const open = () => {
  const sv = ST.getStorySave(), g = sv.gate && sv.gate.v === 1 && Array.isArray(sv.gate.open) ? sv.gate : { v: 1, open: [] };
  if (!g.open.includes('voetbal')) { sv.gate = { v: 1, open: [...g.open, 'voetbal'] }; ST.applyStorySave(sv); }
};
const start = (char = 'tammo') => { if (!CL.hasCareer()) CL.createNew(w, char, 0); return CL.getCareer(); };
// een onderdeel van het menu openen: eerst dicht, anders blijft een open ouder (Loopbanen) staan
const menu = async (naam, wacht = 2000) => { try { PM.closePauseMenu(); } catch (e) { /* dicht */ } await sleep(400); PM.openPauseMenu(naam); await sleep(wacht); };
const klik = async (sel, wacht = 900) => { const b = document.querySelector(sel); if (b) b.click(); await sleep(wacht); return !!b; };
// het park van de volgende thuiswedstrijd en de plek van het veld (zoals launchCareerMatch hem uitrekent)
const siteOf = (m) => { const pp = PK.pitchPlacement(m.park); return { x: pp.x, y: pp.y, a: pp.angle - Math.PI / 2, fits: pp.fits }; };
const toWorld = (s, fx, fy) => { const lx = -fx, ca = Math.cos(s.a), sa = Math.sin(s.a); return { x: s.x + lx * ca - fy * sa, y: s.y + lx * sa + fy * ca }; };
const overlap = (sel) => { // per lijstregel: lopen de kinderen over elkaar heen?
  const out = [];
  for (const li of document.querySelectorAll(sel)) {
    const kids = [...li.children].map((k) => k.getBoundingClientRect());
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i], b = kids[j]; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left); if (ox > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) out.push({ tekst: li.textContent.slice(0, 40), ox: Math.round(ox) }); }
  }
  return out;
};

// Beelden van het vernieuwde Voetbal-scherm (Club-UI 24-11, docs/ontwerp/CLUB-UI-24-11.md): het Overzicht, Selectie, Tactiek, Stand, Kalender, Training en Club, en de wedstrijdintro met de HUD.
//   node .scr/run.mjs --scenes=scripts/ui/club_ui_scenes.js --only=1,2 --out=.scr/out/<naam> --game=desktop/build/<stage>/game --size=1280x720
// Draait ook op de oude code (tab-ids vandaag en trainer): de selectors proberen beide.
const tab = async (...ids) => { for (const id of ids) { if (await klik(`[data-vb="tab:${id}"]`, 1300)) return id; } return null; };
const volgende = (c, ronden) => { let k = c; for (let i = 0; i < ronden; i++) { k = C.advanceDays(k, 3, CL.getClub).career; k = C.simulateEvent(k, CL.getClub).career; } return k; };
await scene('1', async (ev) => { // een nieuw begin: het Overzicht zonder uitslagen
  open(); start('anita'); await menu('voetbal', 2600);
  await shot('overzicht', 800);
  for (const t of [['selectie'], ['tactiek', 'trainer'], ['stand'], ['kalender'], ['training'], ['club']]) { const id = await tab(...t); if (id) await shot(t[0], 600); }
});
await scene('2', async (ev) => { // midden in het seizoen: vorm, een tegenstander, sponsors, trainer en manager
  open(); const c0 = start('anita'); let c = volgende(c0, 3); c = C.advanceDays(c, 3, CL.getClub).career;
  CL.replaceCareer({ ...c, seasonNr: 4, roles: { ...c.roles, trainer: true, manager: true }, flags: { ...c.flags, captain: true, trainerSince: 3 }, stats: { ...c.stats, earned: 1500 } });
  await menu('voetbal', 2600);
  await shot('overzicht-seizoen', 800);
  await tab('selectie'); await shot('selectie-seizoen', 600);
  await klik('[data-vb="sel:' + (CL.getCareer().mate.id) + '"]', 800); await shot('selectie-teamgenoot', 400);
  await tab('tactiek', 'trainer'); await klik('[data-vb="slot:3"]', 700); await shot('tactiek-trainer', 600);
  await klik('[data-vb="tactic:formation:4-3-3"]', 800); await shot('tactiek-433', 400);
  await tab('stand'); await klik('[data-vb="liga:terp"]', 700); await shot('stand-terp', 400);
  await tab('club'); await shot('club-sponsors', 600);
  await tab('selectie'); await klik('[data-vb="deel:transfers"]', 900); await shot('transfers', 500);
});
await scene('3', async (ev) => { // het aandeel open
  open(); const c0 = start('anita'); CL.replaceCareer({ ...c0, flags: { ...c0.flags, shareReady: true } }); w.money = 20000;
  await menu('voetbal', 2600); await tab('club'); await shot('club-aandeel', 800);
});
await scene('4', async (ev) => { // de wedstrijdintro, de HUD tijdens het spel en de toetsregel in groepen
  open(); const c = start('anita'); const m = C.nextMatch(c, CL.getClub);
  const s = m && m.park ? siteOf(m) : null;
  if (s) await jump(s.x + 10, s.y + 10, 3000);
  ev.gestart = !!VB.launchCareerMatch(w);
  if (!ev.gestart) return;
  await shot('intro', 1800);
  ev.kop = (document.querySelector('.vbtv-introkop') || {}).textContent;
  tap('f', 'KeyF'); await sleep(7000); await shot('spel', 500);
  ev.ondertitel = (document.querySelector('.vbtv-ondertitel') || {}).textContent || null;
  await sleep(6000); await shot('spel-later', 500);
});
