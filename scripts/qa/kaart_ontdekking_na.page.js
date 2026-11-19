// Page half of scripts/qa/kaart_ontdekking.mjs --page=na (desktop --perf-script body; #990): in een nieuw spel de kaart met
// mist, daarna een streek ontdekken via het uitkijkpunt (E) en de onthulling bij het openen van de kaart (camera, mist die
// openrijdt, naamkaart), de teller en de Te-doen-rij. Metingen en beelden.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world;
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const MV = await imp('mapview'); const EX = await imp('explorationlive'); const TD = await imp('todo');
const grab = async (name, ms = 700) => { console.log('[capture] ' + name); await sleep(ms); };
const fps = () => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); });
const sluitUitleg = () => { for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent || '')) b.click(); const l = document.querySelector('.mapview-legend:not([hidden])'); const lb = document.querySelector('[data-act="layers"]'); if (l && lb) lb.click(); };
const openKaart = async () => { PM.openPauseMenu('map'); await sleep(1800); sluitUitleg(); await sleep(500); sluitUitleg(); };
const out = { fps0: await fps() };
const p = w.player;
const pts = (w.map.meta.uitkijkpunten || []).map((u) => ({ id: u.id, x: Math.round(u.x), y: Math.round(u.y), naam: u.naam, streek: u.streek }));
out.stand0 = (({ totaal, ontdekt, verkend }) => ({ totaal, ontdekt, verkend }))(EX.getStrekenStand(w));
out.todo0 = TD.getTodoItems(w).filter((r) => r.key === 'om:uitkijk').map((r) => ({ title: r.title, meta: r.meta, record: r.record }));
await openKaart();
out.ratio0 = MV.getDiscoveredRatio();
out.kop0 = (document.querySelector('.mv-eb') || {}).textContent;
MV.setMapView(p.x, p.y, 0.4); await sleep(3500); await grab('kaart-provincie-nieuw');
MV.setMapView(p.x, p.y, 1.2); await sleep(1500); await grab('kaart-stad-nieuw');
PM.closePauseMenu(); await sleep(800);
// de Te-doen-rij 'Ontdek een nieuwe streek'
PM.openPauseMenu('todo'); await sleep(2200); await grab('todo-ontdek-rij');
PM.closePauseMenu(); await sleep(600);
// naar het uitkijkpunt van de dichtstbijzijnde onbekende streek, E
const t = pts.find((q) => q.id === (TD.getTodoItems(w).find((r) => r.key === 'om:uitkijk') || {}).goal?.id) || pts[0];
out.doel = t;
if (p.inVehicle) p.exitVehicle(w.map, w);
p.x = t.x; p.y = t.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
await sleep(4000);
await grab('uitkijkpunt-straat');
tapKey('e', 'KeyE'); await sleep(500); await grab('uitkijkpunt-na-e', 900);
out.stand1 = (({ totaal, ontdekt, verkend }) => ({ totaal, ontdekt, verkend }))(EX.getStrekenStand(w));
// de kaart open: de onthulling speelt: een reeks beelden
PM.openPauseMenu('map'); await sleep(700); sluitUitleg();
const reeks = [['01', 500], ['02', 700], ['03', 700], ['04', 700], ['05', 700], ['06', 1000], ['07', 1500]];
out.frames = [];
for (const [naam, ms] of reeks) { sluitUitleg(); await grab('onthulling-' + naam, ms); out.frames.push({ naam, fps: await fps(), nk: (document.querySelector('.mv-naamkaart') || {}).className, stats: MV.getMapViewStats() && { zoom: MV.getMapViewStats().zoom, avgMs: Math.round(MV.getMapViewStats().avgMs * 10) / 10, maxMs: Math.round(MV.getMapViewStats().maxMs) } }); }
await sleep(3000); await grab('kaart-na-onthulling');
out.kop1 = (document.querySelector('.mv-eb') || {}).textContent;
PM.closePauseMenu(); await sleep(800);
PM.openPauseMenu('todo'); await sleep(2200); await grab('todo-na');
out.todo1 = TD.getTodoItems(w).filter((r) => r.key === 'om:uitkijk').map((r) => ({ title: r.title, meta: r.meta, record: r.record }));
out.fps1 = await fps();
PM.closePauseMenu(); clearInterval(skipper);
return JSON.stringify(out);
