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

// 1. Het Voetbal-scherm in een nieuw spel: de carrière is nog dicht (verhaalvolgorde)
await scene('dicht', async (ev) => {
  ev.open = CL.isUnlockedNow(w);
  PM.openPauseMenu('voetbal'); await shot('voetbal-dicht', 2500);
  ev.tekst = (document.querySelector('[data-panel="voetbal"] .pm-inner') || {}).textContent?.slice(0, 200);
});

// 2. De poort open (vlag, alleen in deze run): de uitnodiging, aannemen, dan de vijf tabs
await scene('menu', async (ev) => {
  open(); ev.open = CL.isUnlockedNow(w);
  PM.openPauseMenu('loopbaan'); await shot('loopbanen', 2500);
  await menu('voetbal'); await shot('uitnodiging', 800);
  ev.aangenomen = await klik('[data-vb="start"]', 1500);
  ev.carriere = CL.hasCareer();
  const c = CL.getCareer();
  ev.club = c && CL.getClub(c.club) && CL.getClub(c.club).naam; ev.parken = CL.getIndex().parkCount;
  ev.klasse = CL.hasCareer() ? C.leagueTable(c).rows.map((r) => C.nameOf(CL.getClub, r.id)) : null;
  await shot('vandaag', 1500);
  for (const t of ['selectie', 'kalender', 'stand', 'training']) { await klik(`[data-vb="tab:${t}"]`, 1200); await shot(t, 600); }
});

// 2b. Te doen: de rij van de voetbalcarrière (club, stand, volgende wedstrijd)
await scene('todo', async (ev) => {
  open(); start();
  await menu('todo');
  { const f = [...document.querySelectorAll('[data-panel="todo"] button, [data-panel="todo"] [role="tab"]')].find((b) => /^Loopbanen\s*\d/.test((b.textContent || '').trim())); ev.filter = !!f; if (f) { f.click(); await sleep(1000); } }
  const rij = [...document.querySelectorAll('[data-panel="todo"] *')].find((el) => el.children.length < 6 && /^Voetbal: /.test((el.textContent || '').trim()));
  ev.rij = rij ? rij.textContent.trim().slice(0, 120) : null;
  if (rij) { rij.scrollIntoView({ block: 'center' }); rij.click(); await sleep(800); }
  await shot('te-doen', 800);
});

// 3. Het tabblad Club onder Bezit (#1113): aandelen van de eigen club
await scene('club', async (ev) => {
  open(); start(); w.money = Math.max(w.money || 0, 9000);
  await menu('boerderij', 1500);
  const knoppen = [...document.querySelectorAll('[data-panel] button, [role="tab"]')].filter((b) => /club/i.test(b.textContent || '') && b.offsetParent);
  ev.knoppen = knoppen.map((b) => b.textContent.trim()).slice(0, 6);
  if (knoppen[0]) { knoppen[0].click(); await sleep(1200); }
  await shot('bezit-club', 800);
});

// 3b. De rollen Trainer en Manager (#1111) en de clubaandelen (#1113): een carrière in seizoen 4 met beide rollen (alleen in deze run)
await scene('rollen', async (ev) => {
  open(); const c = start(); w.money = Math.max(w.money || 0, 60000);
  CL.replaceCareer({ ...c, seasonNr: 4, roles: { ...c.roles, trainer: true, manager: true }, flags: { ...c.flags, captain: true, trainerSince: 3 } });
  await menu('voetbal', 1500);
  for (const t of ['trainer', 'manager']) { ev[t] = await klik(`[data-vb="tab:${t}"]`, 1200); await shot(t, 600); }
  await menu('boerderij', 1500);
  const k = [...document.querySelectorAll('[data-panel] button, [role="tab"]')].find((b) => /^club$/i.test((b.textContent || '').trim()) && b.offsetParent);
  if (k) { k.click(); await sleep(1500); }
  await shot('club-manager', 600);
});

// 3c. Controle 24-11 (coördinator): NaN in geometrie bij Land en bedrijf, de tabstreep onder Club en de gekozen vorming en stijl in Trainer.
// Een sonde op computeBoundingBox/Sphere telt geometrieën met NaN (zoals de waarschuwing van three.js); het foutlog zegt of de bewaking van
// vehiclepreview.js een voorbeeld weigerde. Daarna de plek van de tabstreep tegenover de gekozen tab.
await scene('nan', async (ev) => {
  open(); const c = start(); w.money = Math.max(w.money || 0, 60000);
  CL.replaceCareer({ ...c, roles: { ...c.roles, trainer: true, manager: true }, tactic: { formation: '4-3-3', style: 'aanvallend' } });
  const T = window.__scene3d.THREE, BG = T.BufferGeometry.prototype, oud = { box: BG.computeBoundingBox, bol: BG.computeBoundingSphere };
  ev.nan = 0;
  const kijk = (g) => { const a = g.attributes && g.attributes.position; if (!a || !a.array) return; for (let k = 0; k < a.array.length; k++) if (!Number.isFinite(a.array[k])) { ev.nan++; return; } };
  BG.computeBoundingBox = function () { kijk(this); return oud.box.call(this); };
  BG.computeBoundingSphere = function () { kijk(this); return oud.bol.call(this); };
  await menu('boerderij', 1500);
  await sleep(4000); await shot('boerderij-plaatjes', 300);   // de plaatjes (dier, gewas, trekker) komen lui in de rusttijd
  ev.plaatjes = [...document.querySelectorAll('[data-fp]')].map((x) => x.dataset.fp + ':' + (x.querySelector('img') ? 'beeld' : 'icoon'));
  const k = [...document.querySelectorAll('[data-panel] button, [role="tab"]')].find((b) => /^club$/i.test((b.textContent || '').trim()) && b.offsetParent);
  if (k) { k.click(); await sleep(3000); }
  const kader = k && k.closest('.ds-m-tabs'), lijn = kader && kader.querySelector('.ds-m-tabs__lijn');
  if (k && lijn) { const a = k.getBoundingClientRect(), b = lijn.getBoundingClientRect(); ev.tab = { club: [Math.round(a.left), Math.round(a.right)], streep: [Math.round(b.left), Math.round(b.right)] }; }
  await shot('club-tab', 500);
  BG.computeBoundingBox = oud.box; BG.computeBoundingSphere = oud.bol;
  try { const EL = await imp('errorlog'); ev.geweigerd = (String(EL.errorReport()).match(/Voorbeeld van [^\n]*/g) || []).slice(0, 3); } catch (e) { ev.geweigerd = 'fout ' + e.message; }
  await menu('voetbal', 1500); await klik('[data-vb="tab:trainer"]', 1200);
  ev.actief = [...document.querySelectorAll('.ds-z-tab--actief[data-vb^="tactic:"]')].map((b) => b.dataset.vb);
  await shot('trainer-keuze', 500);
});

// 4. Trainende teams op het thuispark (#1115) en het veld van de sim op de plek van het echte park (#1117)
await scene('park', async (ev) => {
  open(); const c = start(); const club = CL.getClub(c.club);
  ev.club = club.naam; ev.plaats = club.plaats; ev.park = club.park; ev.trainingsvelden = club.trainingsvelden.length;
  const pk = club.park;
  await jump(pk.x + 30, pk.y + 30, 6000);
  const z = gh(pk.x, pk.y);
  cam(pk.x + 70, pk.y + 70, z + 45, pk.x, pk.y, z, 55); await shot('park-schuin', 2500);
  cam(pk.x, pk.y + 0.1, z + 170, pk.x, pk.y, z, 55); await shot('park-boven', 1500);
  cam(pk.x + 22, pk.y + 14, z + 5, pk.x, pk.y, z + 1, 55); await shot('trainers', 1500);
});

// 5. De kaart met de laag Voetbal (thuispark, trainingsveld, volgende uitwedstrijd)
await scene('kaart', async (ev) => {
  open(); const c = start(); const club = CL.getClub(c.club);
  await jump(club.park.x + 40, club.park.y + 40, 3000);
  PM.openPauseMenu('map'); await shot('kaart', 3500);
  ev.markers = [...document.querySelectorAll('[class*="marker"], [data-spot], .mk')].map((m) => (m.getAttribute('aria-label') || m.title || m.textContent || '').trim()).filter((t) => /voetbal|club|training|uitwedstrijd/i.test(t)).slice(0, 10);
});

// 6. Een trainingsoefening (#1109) vanuit het tabblad Training
await scene('training', async (ev) => {
  open(); start();
  await menu('voetbal', 1500);
  await klik('[data-vb="tab:training"]', 1000);
  ev.train = await klik('[data-vb="train"]', 4000);
  ev.menuDicht = !document.querySelector('[data-panel="voetbal"]:not([hidden])');
  await shot('oefening', 1500);
  await sleep(5000); await shot('oefening-later', 500);
});

// 7. Een carrièrewedstrijd op het sportpark: opstelling bij de aftrap, het spel, publiek, shirts, borden, fluit
await scene('wedstrijd', async (ev) => {
  open(); const c = start();
  const m = C.nextMatch(c, CL.getClub);
  ev.wedstrijd = m && { tegen: m.opponentName, thuis: m.isHome, park: !!m.park, stadion: !!m.stadium };
  const s = m && m.park ? siteOf(m) : null; ev.site = s;
  if (s) await jump(s.x + 10, s.y + 10, 3000);
  // een sponsor aannemen (#1118): dan staan zijn borden langs de lijn
  try { const c0 = CL.getCareer(), sl = c0.sponsors && c0.sponsors.slots[0]; if (sl) { const r = C.acceptSponsor(c0, sl.id, CL.getSponsorPandIndex(), CL.clubPlace(c0.club)); if (r.ok) CL.replaceCareer(r.career); ev.sponsor = sl.naam + (r.ok ? '' : ' (niet aangenomen: ' + r.reason + ')'); } } catch (e) { ev.sponsor = 'fout ' + e.message; }
  gehoord.clear();
  ev.gestart = !!VB.launchCareerMatch(w);
  if (!ev.gestart) return;
  await shot('opstelling', 1800);
  ev.overlapThuis = overlap('.vbtv-kolom:not(.vbtv-kolom--uit) li');
  ev.overlapUit = overlap('.vbtv-kolom--uit li');
  ev.kop = (document.querySelector('.vbtv-kop') || {}).textContent;
  await sleep(9000); await shot('spel', 500);
  await sleep(6000); await shot('spel-later', 500);
  ev.ondertitel = (document.querySelector('.vbtv-ondertitel') || {}).textContent || null;
  ev.state = window.__voetbal.state();
  // de wedstrijd zet zelf de camera: met toets 3 door de standen (auto, speler, hoog, zijlijn, ...) voor het publiek en de borden langs de lijn
  ev.camera = [];
  for (let k = 0; k < 3; k++) { tap('3', 'Digit3'); await sleep(2500); ev.camera.push((document.querySelector('.mg-flash') || {}).textContent || ''); await shot('camera-' + (k + 1), 300); }
  ev.geluid = Object.fromEntries(gehoord);
  // het echte park zonder het veld van de sim: na de wedstrijd van boven (de velden uit de kaart)
  try { window.__voetbal.quit(); } catch (e) { /* al klaar */ }
  await sleep(1500);
  if (s) { const z = gh(s.x, s.y); cam(s.x, s.y + 0.1, z + 160, s.x, s.y, z, 55); await shot('park-van-boven', 2500); }
});

clearInterval(skipper); clearInterval(houd); clearInterval(audioTap);
return JSON.stringify(report);
