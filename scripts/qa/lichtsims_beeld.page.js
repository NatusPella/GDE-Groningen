// Pagina-helft van scripts/qa/lichtsims_beeld.mjs (desktop --perf-script; #985 light sims): de vijf sims in het echte spel, met beelden van de strook, de lichtkolom,
// het vlaggetje, het uitroepteken, het opspringende getal en de eerste-keer-uitleg, plus de frametijd met en zonder strook. Wegwerpprofiel; elke keydown krijgt een keyup.
// window.__ls = { prefix, only: ['hengelen', ...] }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.__debug && window.__debug.world && window.__debug.world.player && window.__debug.world.map); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const PRE = (window.__ls && window.__ls.prefix) || 'x';
const ONLY = (window.__ls && window.__ls.only) || ['hengelen', 'krantenwijk', 'bezorger', 'rondvaart', 'bakronde'];
const imp = (f) => import('/js/' + f + '.js');
const uit = { fouten: [], meldingen: [], venster: [innerWidth, innerHeight], sims: {} };
const origErr = console.error.bind(console);
console.error = (...a) => { uit.fouten.push(a.map(String).join(' ').slice(0, 220)); origErr(...a); };
window.addEventListener('error', (e) => uit.fouten.push('error: ' + e.message));
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SJ = await imp('sidejobs');
const SC = await imp('scene3d');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(300); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 90) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(120); };
const shot = async (naam, ms = 900) => { await sleep(ms); console.log('[capture] ' + PRE + '-' + naam); await sleep(900); };
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
const teleport = (x, y, a = 0) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.angle = a; w.camYaw = a;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const origAdd = w.addMessage ? w.addMessage.bind(w) : null;
if (origAdd) w.addMessage = (t, d) => { uit.meldingen.push(String(t).slice(0, 140)); return origAdd(t, d); };
let hold = null;
const houd = () => { if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; } requestAnimationFrame(houd); };
requestAnimationFrame(houd);
const vind = (naam) => { let m = null; const sc = SC.getScene(); if (sc) sc.traverse((o) => { if (o.name === naam && !m) m = o; }); return m; };
const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
// de strook: zichtbaar, binnen het beeld, en welke andere zichtbare vaste elementen erop liggen
const stookInfo = () => {
  const el = document.getElementById('sh-hud');
  if (!el) return { aanwezig: false };
  const r = el.getBoundingClientRect();
  const over = [];
  for (const n of document.querySelectorAll('body *')) {
    if (n === el || el.contains(n) || n.contains(el) || n.closest('#sh-hud')) continue;
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0 || (cs.position !== 'fixed' && cs.position !== 'absolute')) continue;
    const b = n.getBoundingClientRect();
    if (b.width < 8 || b.height < 8 || b.width > innerWidth * 0.9) continue;
    if (b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) over.push((n.id || n.className || n.tagName).toString().slice(0, 40) + ' ' + rect(n).join(','));
  }
  return { aanwezig: true, verborgen: el.hidden, rect: rect(el), venster: [innerWidth, innerHeight], binnenBeeld: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, over: over.slice(0, 8), tekst: el.innerText.replace(/\s+/g, ' ').slice(0, 260), pop: (document.querySelector('.sh-pop') || {}).textContent || '' };
};
const ftijd = async (n = 150) => { const t = []; let last = performance.now(); for (let i = 0; i < n; i++) { await new Promise((r) => requestAnimationFrame(r)); const nu = performance.now(); t.push(nu - last); last = nu; } t.sort((a, b) => a - b); return { med: +t[Math.floor(n / 2)].toFixed(1), p95: +t[Math.floor(n * 0.95)].toFixed(1), max: +t[n - 1].toFixed(1) }; };
const meetStrook = async (sim) => {
  const el = document.getElementById('sh-hud');
  const met = await ftijd();
  let zonder = null;
  if (el) { el.style.display = 'none'; zonder = await ftijd(); el.style.display = ''; }
  uit.sims[sim].frametijd = { met, zonder };
};
const laad = async () => { for (let i = 0; i < 60; i++) { const l = document.querySelector('.ls-card, #loadscreen, .ls-brand'); if (!l || getComputedStyle(l).visibility === 'hidden' || !l.getClientRects().length) break; await sleep(500); } await sleep(800); };
const stop = async () => { try { SJ.quitSideJob(0); } catch (e) { uit.fouten.push('quit: ' + e.message); } await sleep(600); };
const baan = async (id) => {
  const job = SJ.SIDE_JOBS.find((j) => j.id === id);
  if (!job) { uit.fouten.push('geen baan ' + id); return null; }
  const sp = (SJ.getSideJobSpotsForRender() || []).find((x) => x.job && x.job.id === id);
  if (sp) { teleport(sp.x, sp.y, 0); hold = { x: sp.x, y: sp.y, a: 0 }; }
  await sleep(3000); await laad();
  w.money = 1000;
  const ok = SJ.startSideJobVoorTest(job);
  uit.sims[id] = { gestart: ok, spot: sp ? [Math.round(sp.x), Math.round(sp.y)] : null };
  await sleep(2000);
  return job;
};

try {
  uit.begin = { x: Math.round(p.x), y: Math.round(p.y) };
  await sleep(3000);

  if (ONLY.includes('hengelen')) {
    const H = window.__hengelen; uit.sims.hengelen = {};
    const s = H.spot(); teleport(s.x, s.y, 0); hold = { x: s.x, y: s.y, a: 0 };
    await sleep(3000); await laad();
    uit.sims.hengelen.gestart = H.start();
    await shot('hengel-1-uitleg', 1500); uit.sims.hengelen.uitleg = stookInfo();
    await tap(' ', 'Space'); await sleep(2200);
    await shot('hengel-2-wacht', 300);
    let fase = ''; for (let i = 0; i < 60; i++) { const st = H.state(); fase = st && st.phase; if (fase === 'bite') break; await sleep(250); }
    uit.sims.hengelen.fase = fase;
    await shot('hengel-3-beet', 150); uit.sims.hengelen.beet = stookInfo();
    { const ha = vind('hengelanim'); uit.sims.hengelen.anim = ha ? ha.children.map((c, i) => [i, c.type, c.visible, [c.position.x, c.position.y, c.position.z].map((v) => +v.toFixed(1))]) : null; }
    await tap(' ', 'Space'); await sleep(250);
    await shot('hengel-4-vangst', 200); uit.sims.hengelen.vangst = stookInfo();
    await meetStrook('hengelen');
    H.quit(); await sleep(800); hold = null;
    uit.sims.hengelen.naQuit = stookInfo();
  }

  for (const [id, naam, kolom] of [['krantenwijk', 'krant', 'krantkolom'], ['bezorger', 'bezorger', 'bezorgkolom'], ['rondvaart', 'rondvaart', 'rondvaartkolom']]) {
    if (!ONLY.includes(id)) continue;
    await baan(id);
    if (!uit.sims[id] || !uit.sims[id].gestart) { await stop(); continue; }
    await sleep(2500);
    const k = vind(kolom); uit.sims[id].kolom = k ? { zichtbaar: k.visible, pos: [Math.round(k.position.x), Math.round(k.position.y), Math.round(k.position.z)] } : null;
    uit.sims[id].fase1 = stookInfo();
    await shot(naam + '-1-start', 600);
    // naar de kolom lopen (krant: naar het eerste huis; bezorger: naar de zaak; rondvaart: naar de steiger)
    if (k) {
      const dx = id === 'rondvaart' ? 0 : -6;
      teleport(k.position.x + dx, k.position.z, 0); hold = { x: k.position.x + dx, y: k.position.z, a: 0 };
      await sleep(2500);
      const k2 = vind(kolom); uit.sims[id].kolom2 = k2 ? { zichtbaar: k2.visible, pos: [Math.round(k2.position.x), Math.round(k2.position.y), Math.round(k2.position.z)] } : null;
      uit.sims[id].fase2 = stookInfo();
      await shot(naam + '-2-onderweg', 600);
      if (id === 'krantenwijk') { await tap('e', 'KeyE'); await sleep(1800); uit.sims[id].worp = stookInfo(); await shot(naam + '-3-worp', 200); }
      if (id === 'bezorger') { const k3 = vind(kolom); if (k3) { teleport(k3.position.x - 2, k3.position.z, 0); hold = { x: k3.position.x - 2, y: k3.position.z, a: 0 }; } await sleep(2200); uit.sims[id].fase3 = stookInfo(); await shot(naam + '-3-bezorgen', 300); }
    }
    await meetStrook(id);
    hold = null; await stop();
    uit.sims[id].naStop = stookInfo();
  }

  if (ONLY.includes('bakronde')) {
    const BK = await imp('bakeround'); uit.sims.bakronde = {};
    const b = BK.createBake({ order: BK.RECIPE_CONTEST, rounds: 3 });
    BK.showBake(b, "Oma's keuken: de oefenronde");
    await sleep(600); await shot('bak-1-start', 600);
    const inp = { _p: new Set(), wasPressed(k) { return this._p.has(k); }, consume(k) { this._p.delete(k); } };
    const druk = (k) => { inp._p.add(k); return BK.updateBake(b, inp, "Oma's keuken: de oefenronde"); };
    druk('1'); druk('2'); druk('3'); const r = druk('4'); uit.sims.bakronde.rondeRes = r;
    await shot('bak-2-bal-klaar', 500);
    druk('1'); druk('4'); // fout
    await shot('bak-3-fout', 500);
    uit.sims.bakronde.paneel = rect(document.getElementById('bakeround'));
    uit.sims.bakronde.melding = (document.querySelector('.bk-mis') || {}).textContent;
    BK.hideBake();
  }
} catch (e) { uit.fouten.push('script: ' + String((e && e.stack) || e).slice(0, 500)); }
clearInterval(skipper);
hold = null;
return JSON.stringify(uit);
