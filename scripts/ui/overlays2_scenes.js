// Scenes voor overlappende meldingen (#292 #294): node scripts/ui_shots.mjs --sizes=1280x720,1920x1080 --scenes=scripts/ui/overlays2_scenes.js
// Basis: shots_scenes.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
// window size). Each scene opens a screen and logs "[capture] <name>", which
// devtools.js turns into <out>/<size>-<name>.png. Nothing here writes saves:
// the run uses a throwaway profile.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  // a touch run taps the menu instead: the news panel of a fresh profile closes, 'Nieuw spel' is tapped
  if (/[?&]touch=1/.test(location.search)) {
    const news = document.querySelector('#start-screen .ss-news');
    if (news && !news.hidden) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })); } await sleep(500); }
    const item = (window.__menuStart ? { click: () => window.__menuStart('doorgaan') } : null);
    if (item) item.click();
  }
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const VEH = await imp('vehicle');
const PM = await imp('pausemenu');
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];
const CIN = await imp('cinematics');
const CARDS = window.__cards;
const NC = await imp('namecard');
const SA = await imp('storyarc');
const CP = await imp('choicepanel');
const info = [];
const loaded = async () => { for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(2500); };
const ov = () => [...document.querySelectorAll('#cine .cine-banner:not([hidden]), #name-card.on, #wijk-card.on, #hud .hud-card.on, #hud .hud-cards-e .hud-card, #hud .cw-panel:not([hidden]), #hud .hud-place.on')].map((e) => (e.id || e.className.split(' ')[0]) + (e.classList.contains('ov-hold') ? '(wacht)' : ''));
// rects van alles wat de speler kan zien, en welke elkaar raken (in px van het venster)
const hits = () => {
  const sels = ['#hud .hud-minimap, #hud .hud-map', '#hud .mg-board:not([hidden])', '#hud .hud-location', '#name-card.on', '#wijk-card.on', '#hud .hud-cards .hud-card.on', '#hud .hud-cards-e .hud-card.on', '#hud .cw-panel:not([hidden])', '#hud .hud-mission', '#hud .hud-clock', '#hud .hud-place.on', '#hud .phonefeed .pf-card'];
  const boxes = [];
  for (const s of sels) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.2) boxes.push({ s: s.split(' ').pop(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }); }
  const out = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2) out.push(a.s + ' x ' + b.s);
  }
  return out;
};
if (want('combo')) {
  teleport(...P(100, 77));
  await loaded();
  w.devInvuln = true;
  CARDS.show({ kind: 'prestatie', title: 'Turbo-Escapade', kicker: 'Cheat vrijgespeeld', body: 'Pauzemenu › Cheats', duration: 12, key: 'qa-e' });
  CARDS.show({ kind: 'tip', title: 'Uitleg', body: 'Een korte uitleg over iets wat je nu kunt doen in het spel.', duration: 12, key: 'qa-a' });
  CIN.showWijkCard(w, { name: 'Metalenkwartier' });
  NC.showNameCard(Object.keys(SA.CHARACTERS)[0], { force: true });
  await sleep(1800);
  info.push('zonder paneel ' + JSON.stringify(ov()) + ' raakt ' + JSON.stringify(hits()));
  await shot('combo-kaarten', 400);
  const panel = CP.createChoicePanel('#d9a441');
  panel.set({ kicker: 'DE COLONNE', text: 'Tessa: alle vrienden rijden mee, maar één rijdt naast ons. Wie neemt Jelles limo voor zijn rekening?', options: [{ key: '1', label: 'Wubbo, met de bus.', cls: 'pick' }, { key: '2', label: 'Tinus, met de trekker.' }, { key: '3', label: 'Geesje, met de scooter.' }], help: '' });
  panel.show();
  await sleep(1800);
  info.push('met paneel ' + JSON.stringify(ov()) + ' raakt ' + JSON.stringify(hits()));
  await shot('combo-paneel', 400);
  panel.hide();
  done.push('combo');
}
if (want('titel')) {
  CIN.showBanner && CIN.showBanner({ kind: 'pass', title: 'MISSIE GESLAAGD', reason: 'Qa', reward: 100, stats: [['Tijd', '1:00']] });
  CIN.showWijkCard(w, { name: 'Oostergast' });
  NC.showNameCard(Object.keys(SA.CHARACTERS)[1], { force: true });
  await sleep(1800);
  info.push('banner+wijk ' + JSON.stringify(ov()));
  await shot('titel-banner', 400);
  done.push('titel');
}
if (want('minigames')) {
  // #294: de uitlegkaart, een geheimpje (zone E) en de spel-HUD tegelijk, per minigame
  for (const id of ['carillon', 'discgolf', 'hengelen', 'pannenkoek', 'zwembad', 'klimtoren']) {
    const a = window.__activities && window.__activities.get(id);
    const sp = a && a.spots && a.spots()[0];
    if (!sp) { info.push(id + ': geen plek'); continue; }
    teleport(sp.x, sp.y);
    await loaded();
    p.x = sp.x; p.y = sp.y; p.vx = p.vy = 0;
    CARDS.show({ kind: 'prestatie', kicker: 'Geheimpje 2/8', title: 'Het paard op de Martinitoren', body: 'Wat een vondst.', duration: 12, key: 'qa-e-' + id });
    CARDS.show({ kind: 'tip', kicker: 'Uitleg', title: id, body: 'De uitleg staat tijdens het spel in beeld.', duration: 12, key: 'qa-a-' + id });
    let ok = false;
    try { ok = a.interact(w); } catch (e) { info.push(id + ' fout ' + e.message); }
    await sleep(2500);
    info.push(id + ' start ' + ok + ' raakt ' + JSON.stringify(hits()));
    await shot('mg-' + id, 300);
    try { a.quit && a.quit(w); } catch (e) { /* ok */ }
    w.activityGame = null;
    done.push('mg-' + id);
  }
}
clearInterval(skipper);
return done.concat(info);
