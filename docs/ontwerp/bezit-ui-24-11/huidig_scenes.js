// Beelden van het huidige Land en bedrijf (fase 1 review). Draait als --perf-script.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const ONLY = (window.__dsOnly || []);
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const out = [];
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const FR = await imp('featurereveal'); const BG = await imp('bezitgate'); const L = await imp('bezitlive'); const RD = await imp('rdnew');
FR.setRevealSource({ open: () => true, owns: () => true });
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
const sluit = async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(250); } try { PM.closePauseMenu(); } catch (e) {} await sleep(300); };
const open = async (sec, sub) => { await sluit(); PM.openPauseMenu(sec, sub ? { sub } : {}); await sleep(1600); if (sub) { const t = document.querySelector('[data-panel="boerderij"] [data-subtab="'+sub+'"]'); if (t && t.getAttribute('aria-selected') !== 'true') { t.click(); await sleep(900); } } };
const klik = async (sel) => { const e = document.querySelector(sel); if (e) { e.click(); await sleep(700); } return !!e; };
const tel = () => JSON.stringify({ bez: [...document.querySelectorAll('.pm-bezit-sub, .pm-boerderij')].length });
const tabs = ['overzicht', 'boerderij', 'bedrijven', 'tekoop', 'snack', 'club'];
const fase = (n) => !ONLY.length || ONLY.includes(n);
const [fx, fy] = RD.wgsToWorld(53.2336, 6.4977);
p.x = fx; p.y = fy; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
for (let i = 0; i < 400 && loading(); i++) await sleep(100);
await sleep(4000); p.x = fx; p.y = fy;
await L.ensureIndex(); await sleep(1500);
// ---- A: leeg, poort dicht
if (fase('leeg')) {
  BG.setUnlockGate(() => false);
  for (const t of ['tekoop', 'bedrijven', 'snack']) { await open('boerderij', t); await shot('A-dicht-' + t); }
  BG.setUnlockGate(() => true);
  w.money = 5000;
  for (const t of tabs) { await open('boerderij', t); await shot('B-leeg-' + t); }
  await open('boerderij', 'boerderij');
  for (const id of ['percelen', 'erf', 'gewas', 'machines', 'kas', 'bank']) { if (await klik('[data-bd="' + id + '"]')) await shot('B-leeg-boerderij-' + id, 500); }
  await sluit();
}
// ---- C: gevuld
if (fase('gevuld')) {
  BG.setUnlockGate(() => true);
  w.money = 60000;
  const BZ = await imp('bezitui');
  const offers = BZ.nearbyOffers(w, 12);
  out.push('aanbod ' + offers.length);
  let n = 0; for (const o of offers.slice(0, 5)) { const r = L.koopPerceel(w, o.id); if (r && r.ok) n++; }
  out.push('percelen gekocht ' + n);
  const bn = L.buildingsNear(p.x, p.y);
  let bk = 0; for (const o of bn.filter((o) => o.forSale).slice(0, 2)) { const r = L.koopPand(w, o.osm); if (r && r.ok) bk++; }
  out.push('panden gekocht ' + bk);
  try { L.schenkMobiel('frietwagen'); } catch (e) { out.push('mobiel ' + e.message); }
  try { for (const k of [1, 2]) L.huurArbeider(w, k); } catch (e) { out.push('arbeider ' + e.message); }
  w.money = 18000;
  for (const t of tabs) { await open('boerderij', t); await shot('C-vol-' + t); }
  await open('boerderij', 'boerderij');
  for (const id of ['percelen', 'erf', 'gewas', 'machines', 'kas', 'bank']) { if (await klik('[data-bd="' + id + '"]')) await shot('C-vol-boerderij-' + id, 500); }
  // aankoopbevestiging
  await open('boerderij', 'tekoop'); const kb = document.querySelector('[data-bz="koop-perceel"]'); if (kb) { kb.click(); await sleep(600); await shot('C-vol-tekoop-bevestig', 300); }
  await open('boerderij', 'overzicht'); const ck = document.querySelector('[data-bz-sel]'); if (ck) { ck.click(); await sleep(500); } await shot('C-vol-overzicht-gekozen', 300);
  await sluit();
  // spullen en garage
  for (const s of ['spullen', 'garage']) { await open(s); await shot('D-' + s); }
  await sluit();
}
clearInterval(skipper);
return JSON.stringify(out);
