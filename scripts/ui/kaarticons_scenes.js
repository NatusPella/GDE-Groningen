// Scenes voor de kaarticons (#180 #92): node scripts/ui_shots.mjs --scenes=scripts/ui/kaarticons_scenes.js
// Iconenblad plus minimap en grote kaart in stad, dorp en Ommeland, dag en nacht. Basis: shots_scenes.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
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
const HP = await imp('hud_panel');
const MV = await imp('mapview');
const MI = await imp('mapicons');
const SHP = await imp('shops');
const ACT = await imp('activities');
const info = [];
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const loaded = async () => { for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(5000); };
const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
const place = (n) => idx && idx.global.places.find((q) => q.name === n);
for (const mode of ['sheet', 'sheetraw', 'sheetbig']) if (want(mode)) {
  const kinds = ['player', 'companion', 'cash', 'userWaypoint', 'missionIdle', 'missionActive', 'home', 'homeGarage', 'homeMooring', 'homeHelipad', 'own', 'garage', 'horeca', 'flitspaal', 'hospital', 'politiebureau', 'landmark', 'police', 'policeFoot', 'policeBike', 'station', 'eierbalTip', 'waypoint', 'pigeon', 'heli', 'padel', 'dorp', 'dorpKlaar', 'wereldeinde',
    ...Object.keys(SHP.SHOP_TYPES).map((k) => 'shop-' + k), ...ACT.ACTIVITY_LEGEND.map((l) => l.kind), 'mm-gevaar', 'mm-rival', 'mm-halte', 'mm-subdoel', 'mm-hulp', 'sj-target', 'sj-dot'];
  info.push('kinds ' + kinds.length);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;grid-template-columns:1fr 1fr;background:#000';
  if (mode === 'sheetbig') {
    wrap.style.display = 'block';
    const c = document.createElement('canvas');
    c.width = 1904; c.height = 993; c.style.cssText = 'width:100%;height:100%';
    const g = c.getContext('2d');
    g.fillStyle = '#243528'; g.fillRect(0, 0, 1904, 993);
    g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.textAlign = 'center';
    kinds.forEach((k, n) => {
      const col = n % 12, row = Math.floor(n / 12), x = 80 + col * 150, y = 60 + row * 160;
      try { HP.drawMapIconHalo(g, k, x, y, 5); HP.drawMapIcon(g, k, x, y, 5, { t: 0 }); } catch (e) { info.push('fout ' + k + ' ' + e.message); }
      g.fillText(k, x, y + 48);
    });
    wrap.appendChild(c);
    document.body.appendChild(wrap);
    await shot('iconenblad-groot', 800);
    wrap.remove();
    done.push(mode);
    continue;
  }
  for (const [ground, bg] of [['donker', '#243528'], ['licht', '#a8ada2'], ['water', '#2d6a86'], ['gebouw', '#b98a6a']]) {
    const c = document.createElement('canvas');
    c.width = 960; c.height = 540; c.style.cssText = 'width:100%;height:100%';
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 960, 540);
    g.fillStyle = '#fff'; g.font = '11px sans-serif';
    g.fillText(ground + ' · 24 px boven, 18 px onder', 6, 12);
    kinds.forEach((k, n) => {
      const col = n % 14, row = Math.floor(n / 14);
      try { if (mode === 'sheet') HP.drawMapIconHalo(g, k, 34 + col * 66, 44 + row * 56, 2.4); HP.drawMapIcon(g, k, 34 + col * 66, 44 + row * 56, 2.4, { t: 0, raw: mode === 'sheetraw' }); } catch (e) { info.push('fout ' + k + ' ' + e.message); }
    });
    wrap.appendChild(c);
  }
  document.body.appendChild(wrap);
  await shot(mode === 'sheet' ? 'iconenblad' : 'iconenraw', 800);
  wrap.remove();
  done.push(mode);
}
const SPOTS = [['stad', null], ['dorp', 'Winsum'], ['ommeland', 'Garnwerd']];
for (const [tag, name] of SPOTS) {
  if (!want(tag)) continue;
  const pl = name ? place(name) : null;
  for (const [tt, clock] of [['dag', 14], ['nacht', 23]]) {
    w.clock = clock;
    if (pl) teleport(pl.x, pl.y); else teleport(...P(100, 77));
    const keep = setInterval(() => { w.clock = clock; if (pl) { p.x = pl.x; p.y = pl.y; } p.vx = p.vy = 0; }, 100);
    await loaded();
    await shot('mini-' + tag + '-' + tt, 600);
    MV.setMapView && MV.setMapView(p.x, p.y, 2.2);
    PM.openPauseMenu('map');
    await sleep(1500);
    MV.setMapView && MV.setMapView(p.x, p.y, 2.2);
    await shot('kaart-' + tag + '-' + tt, 1200);
    MV.setMapView && MV.setMapView(p.x, p.y, 5);
    await shot('kaartin-' + tag + '-' + tt, 1200);
    PM.closePauseMenu();
    clearInterval(keep);
    done.push(tag + '-' + tt);
  }
}
clearInterval(skipper);
return done.concat(info);
