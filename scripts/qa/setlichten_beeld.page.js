// Page half of scripts/qa/setlichten_beeld.mjs (desktop --perf-script body; #553): bouwt elke binnenset (keuken, loket, kantoor,
// serverkamer, oma-keuken, kamers) hoog boven de speler in de scène en neemt er twee beelden van, op dag en op nacht, zodat de
// verlichting van een build met geleende setlampen (setlights.js) naast een build zonder te leggen is. window.__sl = { klokken: [14, 22], settle }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__sl || {};
const cine = await imp('cinematics');
const DN = await imp('daynight');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
let klok = 14;
const fix = () => {
  w.clock = klok;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
let done = false, cur = null;
const tick = () => { fix(); if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
const keep = [S3.renderer.domElement];
for (const el of document.querySelectorAll('body *')) {
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || keep.some((k) => el.contains(k) || k.contains(el))) continue;
  if (el.parentElement && (el.parentElement === document.body || keep.some((k) => el.parentElement.contains(k)))) el.style.display = 'none';
}
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
w.cinematicHidePlayers = true;
const fps = async (ms = 1500) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });

const K = await imp('introkitchen3d'), L = await imp('loket3d'), O = await imp('office3d'), OM = await imp('omakeuken3d'), R = await imp('rooms3d'), RS = await imp('roomspec');
const sets = [
  { naam: 'keuken', bouw: (x, y, z) => K.buildKitchen(x, y, z), w: 5, d: 3.6 },
  { naam: 'loket', bouw: (x, y, z) => L.buildLoket(x, y, z), w: L.LOKET.w, d: L.LOKET.d },
  { naam: 'kantoor', bouw: (x, y, z) => O.buildOffice(x, y, z), w: O.OFFICE.w, d: O.OFFICE.d },
  { naam: 'serverkamer', bouw: (x, y, z) => O.buildServerRoom(x, y, z), w: O.SERVER.w, d: O.SERVER.d },
  { naam: 'omakeuken', bouw: (x, y, z) => OM.buildOmaKitchen(x, y, z), w: OM.OMA_KEUKEN.w, d: OM.OMA_KEUKEN.d },
  ...Object.keys(RS.ROOMS).map((k) => ({ naam: 'kamer-' + k, bouw: (x, y, z) => R.buildRoom(k, x, y, z), w: RS.ROOMS[k].w, d: RS.ROOMS[k].d })),
];
const out = { fps0: await fps(), sets: [] };
const px = p.x, py = p.y;
let n = 0;
for (const kl of CFG.klokken || [14, 22]) {
  klok = kl;
  for (const s of sets) {
    const ax = px + 40 * (n % 5), ay = py + 40, az = 120; // hoog in de lucht, ver van elk gebouw
    const kit = s.bouw(ax, ay, az);
    if (!kit) { out.sets.push({ naam: s.naam, klok: kl, fout: 'niet gebouwd' }); continue; }
    S3.scene.add(kit.group);
    if (kit.reset) kit.reset();
    const hoeken = [[-0.4, -0.38], [0.4, 0.38]];
    for (const [i, h] of hoeken.entries()) {
      cur = { position: { x: ax + s.w * h[0], y: ay + s.d * h[1], z: az + 1.6 }, lookAt: { x: ax, y: ay, z: az + 1.1 } };
      await sleep(CFG.settle || 1500);
      console.log('[capture] ' + s.naam + '-' + kl + '-' + (i + 1));
      await sleep(450);
    }
    out.sets.push({ naam: s.naam, klok: kl, fps: await fps(800), lampen: kit.group.children.filter((c) => c.isLight).length });
    S3.scene.remove(kit.group);
    cur = null;
    n++;
  }
}
clearInterval(skipper); done = true;
return JSON.stringify(out);
