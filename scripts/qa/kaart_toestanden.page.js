// Page half van scripts/qa/gebieden_shots.mjs --page=scripts/qa/kaart_toestanden.page.js (desktop --perf-script body; 20-11).
// Zet in een nieuw spel de vier gebiedstoestanden naast elkaar (een veroverde wijk, een wijk die bezig is, een bezochte wijk en de rest
// onbezocht) en neemt beelden van de grote kaart en de minikaart. Het profiel staat in de wegwerpopslag van het testprofiel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(200); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const GL = await imp('gebiedenlive');
const G = await imp('gebieden');
const GK = await imp('gebiedenkaart');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[gb-error] ' + e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); console.error('[gb-error] ' + e.reason); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
let hold = null, done = false;
const tick = () => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = 0; w.camYaw = 0; } w.clock = 13; if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const cap = async (name) => { await sleep(1200); console.log('[capture] ' + name); await sleep(1500); };

let o = null;
for (let i = 0; i < 300 && !o; i++) { o = GL.getOverzicht(); if (!o) await sleep(200); }
const results = { css: [innerWidth, innerHeight], shots: [], errors };
if (!o) { results.fout = 'geen indeling'; done = true; return JSON.stringify(results); }
const ind = o.ind;
const stad = ind.gebieden.find((g) => g.niveau === 'gemeente' && g.naam === 'Groningen') || ind.gebieden[0];
hold = { x: stad.x, y: stad.y };
const afstand = (g) => Math.hypot(g.x - stad.x, g.y - stad.y);
const wijken = ind.gebieden.filter((g) => g.niveau === 'wijk' && g.veroverbaar && g.taken.length >= 3).sort((a, b) => afstand(a) - afstand(b));
const [A, B, C] = [wijken[0], wijken[2], wijken[4]];
results.gekozen = { veroverd: A && A.naam, bezig: B && B.naam, zichtbaar: C && C.naam };
// A veroverd (alles gedaan, via het profiel: geen intocht en geen beloningsmelding), B de helft, C alleen bezocht
const profiel = o.profiel;
for (const id of A.taken) if (!profiel.gedaan.includes(id)) profiel.gedaan.push(id);
if (!profiel.beloond.includes(A.id)) profiel.beloond.push(A.id);
const helft = Math.max(1, Math.floor(B.taken.length / 2));
for (const id of B.taken.slice(0, helft)) if (!profiel.gedaan.includes(id)) profiel.gedaan.push(id);
const buurtVan = (wijk) => ind.gebieden.filter((g) => g.niveau === 'buurt' && g.ouder === wijk.id);
for (const wk of [A, B, C]) for (const b of buurtVan(wk)) if (!profiel.bezocht.includes(b.id)) profiel.bezocht.push(b.id);
GK.vernieuwKaartLaag();
await sleep(1500);
const lijst = GK.kaartLaag().lijst;
const tel = { onzichtbaar: 0, zichtbaar: 0, bezig: 0, veroverd: 0 };
for (const r of lijst) if (r.niveau.id === 'wijk') tel[r.toestand]++;
results.wijkToestanden = tel;
results.perWijk = [A, B, C].map((g) => (lijst.find((r) => r.gebied.id === g.id) || {}).toestand);

const mx = (A.x + B.x + C.x) / 3, my = (A.y + B.y + C.y) / 3;
PM.openPauseMenu('map'); await sleep(2500);
for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent)) { b.click(); await sleep(600); }
for (const [z, naam] of [[3, 'kaart-toestanden-z3'], [2, 'kaart-toestanden-z2'], [1, 'kaart-toestanden-z1']]) {
  MV.setMapView(mx, my, z); await sleep(3500); await cap(naam); results.shots.push(naam);
}
// de framekosten van de kaart op z2 (bestaande meting getMapViewStats), na een paar seconden tekenen
MV.setMapView(mx, my, 2); await sleep(6000);
results.kaartKosten = MV.getMapViewStats();
PM.closePauseMenu(); await sleep(2500);
// de minikaart: op de rand van een bezochte buurt (stippellijn) en een onbezochte buurt (waas en raster), zonder teleport door een laadscherm te wachten
const buurten = ind.gebieden.filter((g) => g.niveau === 'buurt' && g.grens);
const bezocht = new Set(profiel.bezocht);
let rand = null;
for (const V of buurten.filter((g) => bezocht.has(g.id))) {
  for (const pt of V.grens.p[0][0]) {
    for (const [dx, dy] of [[60, 0], [-60, 0], [0, 60], [0, -60]]) {
      const W = G.gebiedenVan(ind, pt[0] + dx, pt[1] + dy).buurt;
      if (W && W !== V.id && !bezocht.has(W)) { rand = { x: pt[0], y: pt[1], dx, dy, V: V.naam, W }; break; }
    }
    if (rand) break;
  }
  if (rand) break;
}
results.rand = rand;
if (rand) {
  const stappen = [['mini-rand', 0], ['mini-onbezocht', 140]];
  for (const [naam, af] of stappen) {
    const nx = rand.x + Math.sign(rand.dx) * af, ny = rand.y + Math.sign(rand.dy) * af;
    hold = { x: nx, y: ny }; p.x = nx; p.y = ny;
    await sleep(naam === 'mini-rand' ? 40000 : 6000);
    await cap(naam + '-0'); await cap(naam); results.shots.push(naam);
  }
}
const mm = document.querySelector('#minimap, canvas#minimap, .minimap canvas');
results.minimap = mm ? [mm.width, mm.height] : null;
done = true;
clearInterval(skipper);
return JSON.stringify(results);
