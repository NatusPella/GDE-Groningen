// Scenes for scripts/owner_review_pack.mjs (via scripts/ui_shots.mjs, one Electron, 1920x1080): in-game pictures of finished UI/UX work
// for the owner review (docs/RELEASEGATE.md, "Eigenaar-review"). Every shot has its own try/catch: one screen that breaks
// does not stop the rest. The run uses a throwaway profile; nothing writes real saves.
//   node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/owner_review_scenes.js --out=<map> [--only=a,b]
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const done = [];
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const attempt = async (name, fn) => { console.error('[owner] ' + name); try { await fn(); } catch (e) { done.push(name + ' FOUT ' + (e && e.message)); console.log('[scene] ' + name + ': ' + (e && e.message)); } };
const loading = () => document.querySelector('.ls.on:not(.out)');

// --- 1. the game is already running here (ui_shots starts it): wait for the world
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading()); i++) {
  if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter');
  await sleep(1000);
}
const cine = await imp('cinematics');
// --- 2. the opening film with its skip hint (the first cinematic of a new game)
if (want('opening')) await attempt('opening', async () => {
  for (let i = 0; i < 40 && !cine.isCinematicActive(); i++) await sleep(500);
  if (cine.isCinematicActive()) { await sleep(3500); await shot('03-opening', 200); } else done.push('opening: geen film actief');
});
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; if (!window.__shotsOnly || !/nodev/.test(window.__shotsOnly)) w.devJump = true;
const beat = setInterval(() => console.error('[owner] beat ' + Math.round(performance.now() / 1000)), 5000); D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu');
const SH = await imp('shops');
const SHUI = await imp('shopui');
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const settle = async () => { await sleep(1500); for (let i = 0; i < 60 && loading(); i++) await sleep(500); await sleep(1500); };
const sluit = async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(300); } try { PM.closePauseMenu(); } catch (e) { /* weg */ } try { SHUI.closeShopMenu({ save: false }); } catch (e) { /* weg */ } await sleep(400); };
const menu = (naam, tab, opts, wait = 1800) => attempt(naam, async () => { console.error('[owner] open ' + tab); PM.openPauseMenu(tab, opts || {}); console.error('[owner] opened'); await shot(naam, wait); console.error('[owner] shot'); await sluit(); });

// --- 3. the HUD on foot in the city: minimap with goal arrows, location card, police chip
if (want('hud')) await attempt('hud', async () => { teleport(...P(100, 77)); await settle(); w.wanted = 2; await shot('05-hud-minimap', 2500); w.wanted = 0; });
// --- 4. the start choice card ("Hoe wil je spelen?") and the Samen name card ("Hoe heet je?")
if (want('keuzekaart')) await attempt('01-keuzekaart', async () => {
  const LC = await imp('launchchoiceui');
  LC.openLaunchChoice({ index: 0 });
  await shot('01-keuzekaart', 1200);
  tap('Escape', 'Escape'); await sleep(600);
});
if (want('naamkaart')) await attempt('04-naamkaart', async () => {
  const OC = await imp('onlineconsentui');
  OC.openOnlineStart({ naam: '', terug: true });
  await shot('04-naamkaart', 1200);
  const terug = document.querySelector('[data-terug]'); if (terug) terug.click(); else tap('Escape', 'Escape');
  await sleep(600);
});
// --- 5. pause menu and its screens
if (want('pauze')) await menu('06-pauzemenu-spel', 'spel');
if (want('loopbaan')) await menu('07-loopbaan', 'loopbaan');
if (want('spullen')) await menu('08-spullen', 'spullen');
if (want('kaart')) await menu('09-kaart', 'map', {}, 2500);
if (want('bezit')) {
  await menu('10-bezit-overzicht', 'boerderij', { sub: 'overzicht' });
  await menu('11-bezit-tekoop', 'boerderij', { sub: 'tekoop' }, 2500);
}
if (want('voetbal')) {
  await attempt('voetbal-carriere-maken', async () => { const CL = await imp('voetbalcarrierelive'); CL.createNew(w, 'tammo', 0); });
  await attempt('12-voetbal-carriere', async () => {
    PM.openPauseMenu('voetbal', {}); await sleep(4500);
    const b = document.querySelector('.vb-body');
    console.error('[owner] vb-body ' + JSON.stringify(b ? { len: b.innerHTML.length, op: getComputedStyle(b).opacity, anim: getComputedStyle(b).animationName, h: Math.round(b.getBoundingClientRect().height) } : null));
    await shot('12-voetbal-carriere', 300); await sluit();
  });
}
if (want('instellingen')) await menu('13-instellingen-toegankelijkheid', 'settings', { sub: 'a11y' });
if (want('radio')) await menu('14-radiokeuze', 'settings', { sub: 'sound' });
if (want('prestaties')) await menu('15-prestaties', 'prestaties');
// --- 6. clothing: the fitting room, with 3D preview
if (want('pashokje')) await attempt('16-pashokje', async () => {
  teleport(...P(100, 77)); await settle(); await sleep(12000);
  SH.openFittingRoom(w, 'owner-review', p.x, p.y);
  await shot('16-pashokje', 2500);
  await sluit();
});
// --- 7. the tuning showroom (turntable): a player-owned car and the pimp-workshop entry of every workshop
if (want('tuning')) await attempt('17-tuning-showroom', async () => {
  const VEH = await imp('vehicle');
  teleport(...P(100, 77)); await settle(); await sleep(12000);
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, false, null);
  v.playerOwned = true; v.isHeroCar = true; v.perfTemp = true;
  w.vehicles.push(v);
  const item = SH.pimpEntryItem(w, v, {});
  if (!item) throw new Error('geen pimp-ingang voor dit voertuig');
  item.buy();
  await shot('17-tuning-showroom', 3500);
  await sluit();
  const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1);
});
// --- 8. a football match on TV (career match: line-up, score, commentary)
if (want('voetbal-tv')) await attempt('18-voetbal-uitzending', async () => {
  const CL = await imp('voetbalcarrierelive');
  const VB = await imp('voetbal');
  if (!CL.hasCareer || !CL.getCareer || !CL.createNew) throw new Error('geen carrière-API');
  CL.createNew(w, 'tammo', 0);
  const ok = VB.launchCareerMatch(w);
  if (!ok) throw new Error('wedstrijd startte niet');
  await sleep(6000);
  await shot('18-voetbal-uitzending', 8000);
  // out of the match: Escape asks "Stoppen?", the second Escape stops
  for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(1200); }
  await sleep(2000);
});
// --- 8b. an achievement toast
if (want('toast')) await attempt('21-prestatietoast', async () => {
  const A = await imp('achievements');
  const a = A.ACHIEVEMENTS.find((x) => x && x.id && !A.isUnlocked(x.id));
  if (!a) throw new Error('geen prestatie om te ontgrendelen');
  teleport(...P(100, 77)); await settle();
  A.unlockAchievement(w, a.id);
  await shot('21-prestatietoast', 1800);
});
// --- 9. summer-day variation and world colour: the same spot at two moments of the day
if (want('zomerdag')) await attempt('19-zomerdag', async () => {
  const DN = await imp('daynight');
  teleport(...P(100, 77)); await settle();
  const zet = (uur) => { w.clock = uur; DN.refreshDayNight(w); };
  zet(14); await shot('19-zomerdag-middag', 2500);
  zet(20.5); await shot('20-zomeravond', 2500);
  zet(12);
});
// --- 10. the loading screen after a far jump (last: the area stamp of the new place would otherwise hang over the other screens) (a long way across the province)
if (want('laadscherm')) await attempt('02-laadscherm', async () => {
  teleport(...P(100, 77)); await settle();
  teleport(...P(100 + 14000, 77 + 9000));
  for (let i = 0; i < 60 && !loading(); i++) await sleep(100);
  if (loading()) await shot('02-laadscherm', 900); else done.push('laadscherm: niet gezien');
  await settle();
});
await sluit();
clearInterval(skipper);
console.log('[owner-review] ' + JSON.stringify(done));
return done;
