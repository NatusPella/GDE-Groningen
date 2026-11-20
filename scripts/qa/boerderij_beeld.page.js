// Pagina-helft van scripts/qa/boerderij_beeld.mjs (desktop --perf-script; #985 boerderij-UX): de boerderij zoals een speler hem ziet.
// Neemt beelden ("[capture] <prefix>-<naam>") van: het paneel (alle onderdelen), de kaart met de veldlaag, het erf, de trekker met de HUD-strook, het veld in
// elke fase en de oogstklaar-markering. Het wegwerpprofiel is het enige dat beschreven wordt. Elke synthetische keydown krijgt een keyup.
// window.__bd = { prefix: 'voor'|'na' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.__debug && window.__debug.world && window.__debug.world.player && window.__debug.world.map); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const PRE = (window.__bd && window.__bd.prefix) || 'x';
const imp = (f) => import('/js/' + f + '.js');
const uit = { controles: [], fouten: [], meldingen: [], venster: [innerWidth, innerHeight] };
const check = (naam, ok, info = '') => { uit.controles.push({ naam, ok: !!ok, info: String(info).slice(0, 240) }); };
const origErr = console.error.bind(console);
console.error = (...a) => { uit.fouten.push(a.map(String).join(' ').slice(0, 200)); origErr(...a); };
window.addEventListener('error', (e) => uit.fouten.push('error: ' + e.message));

const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const RD = await imp('rdnew');
const PC = await imp('percelen');
const B = await imp('boerderij');
const WW = await imp('boerderijwereld');
const Live = await imp('boerderijlive');
const WT = await imp('werktuigen');
const { akkerRijen } = await imp('bietenrules');
const MF = await imp('mapfilters');

const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(300); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 90) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(120); };
const shot = async (naam, ms = 1200) => { await sleep(ms); console.log('[capture] ' + PRE + '-' + naam); await sleep(900); };
const fix = (uur = 14) => {
  w.clock = uur;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const teleport = (x, y, a = 0) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.angle = a; w.camYaw = a;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null;
const houd = () => { if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; } requestAnimationFrame(houd); };
requestAnimationFrame(houd);
const origAdd = w.addMessage ? w.addMessage.bind(w) : null;
if (origAdd) w.addMessage = (t, d) => { uit.meldingen.push(String(t).slice(0, 160)); return origAdd(t, d); };
const kleinste = (el) => { let min = 99, wie = ''; for (const n of el.querySelectorAll('*')) { const heeftTekst = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); if (!heeftTekst) continue; const r = n.getBoundingClientRect(); if (!r.width || !r.height) continue; const px = parseFloat(getComputedStyle(n).fontSize); if (px < min) { min = px; wie = (n.className && n.className.baseVal === undefined ? n.className : n.tagName) + ': ' + n.textContent.trim().slice(0, 30); } } return { px: min, wie }; };
const geelNu = () => [...document.querySelectorAll('.ds-knop:not(.ds-knop--secundair):not(.ds-knop--tekst):not(.ds-knop--gevaar)')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.disabled).map((b) => b.textContent.trim().slice(0, 24));

fix(14);
const [ex, ey] = RD.wgsToWorld(PC.erfDef(PC.START_ERF).lat, PC.erfDef(PC.START_ERF).lon);
w.money = 500000;
await sleep(3000);

try {
  // --- het paneel: elk onderdeel ------------------------------------------------------------------------------
  PM.openPauseMenu('boerderij'); await sleep(1500);
  const menu = document.querySelector('#pause-menu');
  uit.paneel = { klein: kleinste(menu), geel: geelNu() };
  await shot('paneel-start', 500);
  for (const id of ['perceel', 'percelen', 'erf', 'gewas', 'machines', 'kas', 'bank']) {
    const bt = menu.querySelector(`[data-bd="${id}"]`);
    if (!bt) { uit.fouten.push('geen onderdeel ' + id); continue; }
    bt.click(); await sleep(500);
    await shot('paneel-' + id, 300);
  }
  PM.closePauseMenu(); await sleep(600);

  // --- de kaart met de percelen ----------------------------------------------------------------------------------
  try { MF.setLayer('percelen', true); } catch (e) { uit.fouten.push('laag: ' + e.message); }
  PM.openPauseMenu('map'); await sleep(2500);
  const begrepen = () => { const bt = [...document.querySelectorAll('button')].find((x) => /^begrepen$/i.test(x.textContent.trim()) && x.getClientRects().length); if (bt) { bt.click(); return true; } return false; };
  begrepen(); await sleep(800);
  await shot('kaart', 800);
  const mv = await imp('mapview');
  if (mv.setMapView) { mv.setMapView(ex, ey, 3); await sleep(1500); await shot('kaart-erf', 500); } else uit.kaartZoom = 'geen setMapView';
  PM.closePauseMenu(); await sleep(600);

  // --- het erf, de trekker, het veld ----------------------------------------------------------------------------
  const kopen = ['trekker-klein', 'ploeg-3', 'zaaimachine', 'aanhanger', 'cultivator', 'maaidorser'].map((t) => Live.koopMachineCat(w, t, PC.START_ERF));
  check('alles gekocht', kopen.every((r) => r.ok), JSON.stringify(kopen.map((r) => r.ok || r.reden)));
  teleport(ex, ey + 45, -Math.PI / 2); hold = { x: ex, y: ey + 45, a: -Math.PI / 2 };
  await sleep(9000);
  await shot('erf', 500);
  const trek = w.vehicles.find((v) => v.farm && v.model.name === 'tractor');
  check('trekker in de wereld', !!trek, '');
  hold = null;
  for (let poging = 0; poging < 6 && p.inVehicle !== trek; poging++) { teleport(trek.x + 2.0 + 0.2 * poging, trek.y + 0.8, Math.PI); await sleep(poging ? 2500 : 6000); await tap('e', 'KeyE'); await sleep(1500); }
  check('in de trekker', p.inVehicle === trek, '');
  const ploegRec = Live.getBedrijf().machinepark.werktuigen.find((m) => m.type === 'ploeg-3');
  const ploegImp = WW._staat().werktuigen.get(ploegRec.uid);
  trek.angle = Math.PI; trek.x = ploegImp.x - 3.55 - 0.6; trek.y = ploegImp.y; trek.speed = 0;
  await sleep(1200);
  await shot('trekker-bij-ploeg', 300);
  await tap('e', 'KeyE'); await sleep(900);
  await tap('t', 'KeyT'); await sleep(500);
  await shot('trekker-gekoppeld', 400);

  const b = Live.getBoerderij();
  teleport(ex, ey + 45, 0);
  let pos = null;
  for (let i = 0; i < 60 && !pos; i++) { pos = B.veldPositie(b, b.bedrijf.actief); if (!pos) await sleep(1000); }
  check('veld gevonden', !!pos, JSON.stringify(pos));
  if (pos) {
    const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
    const v = trek;
    if (!p.inVehicle) { teleport(v.x + 2.0, v.y + 0.8, 0); await sleep(800); await tap('e', 'KeyE'); await sleep(800); }
    const d = WT.WERKTUIG.ploeg;
    const af = v.model.len / 2 + d.achter;
    const zet = (r, l, speed) => { const ang = Math.atan2(r.uy, r.ux); const px = r.ax + r.ux * l, py = r.ay + r.uy * l; v.angle = ang; v.x = px + Math.cos(ang) * af; v.y = py + Math.sin(ang) * af; v.speed = speed; v.vx = 0; };
    zet(rijen[0], -8, 4); await sleep(2500);
    await shot('veld-voor-het-ploegen', 600);
    for (let ri = 0; ri < rijen.length; ri++) {
      for (let l = -6; l <= 106; l += 0.5) { zet(rijen[ri], l, 4); await sleep(100); if (ri === 1 && l === 50) { await shot('hud-tijdens-ploegen', 300); } }
    }
    await sleep(1500);
    check('ploegen klaar', B.fase(b) === 'geploegd', B.fase(b));
    if (B.fase(b) !== 'geploegd') Live.rondAf(w, 'ploegen', 0.9, { vrij: true });
    await shot('hud-na-ploegen', 300);
    const vantage = async (naam, wacht = 3000) => {
      const ux = Math.cos(pos.a), uy = Math.sin(pos.a), nx = -uy, ny = ux;
      const px = pos.x - ux * 30 + nx * 20, py = pos.y - uy * 30 + ny * 20;
      const hoek = Math.atan2(pos.y - py, pos.x - px);
      teleport(px, py, hoek); hold = { x: px, y: py, a: hoek };
      await sleep(wacht); await shot(naam, 300); hold = null;
    };
    await vantage('veld-geploegd', 4000);
    Live.rondAf(w, 'cultiveren', 0.9, { vrij: true });
    Live.rondAf(w, 'zaaien', 0.9, { vrij: true });
    await vantage('veld-gezaaid');
    B.tikUren(b, 18);
    await vantage('veld-groeit');
    B.tikUren(b, 40);
    await vantage('veld-rijp');
    PM.openPauseMenu('boerderij'); await sleep(1200);
    await shot('paneel-perceel-rijp', 300);
    PM.closePauseMenu(); await sleep(500);
    PM.openPauseMenu('map'); await sleep(2000); begrepen(); await sleep(500);
    if (mv.setMapView) { mv.setMapView(pos.x, pos.y, 4); await sleep(1500); }
    await shot('kaart-rijp', 600);
    PM.closePauseMenu(); await sleep(500);
    PM.closePauseMenu(); await sleep(400);
    Live.rondAf(w, 'oogsten', 0.9, { vrij: true });
    await vantage('veld-stoppel', 3500);
    PM.openPauseMenu('boerderij'); await sleep(1200);
    await shot('paneel-perceel-stoppel', 300);
    PM.closePauseMenu(); await sleep(400);
  }
} catch (e) { uit.fouten.push('script: ' + String((e && e.stack) || e).slice(0, 400)); }
clearInterval(skipper);
hold = null;
return JSON.stringify({ ...uit, mislukt: uit.controles.filter((c) => !c.ok).map((c) => c.naam) });
