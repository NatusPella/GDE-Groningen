// Page half of scripts/qa/kaart_ontdekking.mjs --page=voor (desktop --perf-script body; #990): opent in een nieuw spel
// de kaart, legt vast wat mist, minimap, Te doen en zoeker doen, ontdekt een streek via het uitkijkpunt en grijpt beelden.
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
const grab = async (name) => { console.log('[capture] ' + name); await sleep(700); };
const fps = () => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); });
const out = { fps0: await fps() };
const p = w.player;
const pts = (w.map.meta.uitkijkpunten || []).map((u) => ({ id: u.id, x: Math.round(u.x), y: Math.round(u.y), naam: u.naam }));
out.punten = pts.length; out.stand0 = EX.getStrekenStand(w);
out.todo0 = TD.getTodoItems(w).filter((r) => /uitkijk|streek|verken|ontdek/i.test((r.title || '') + (r.key || ''))).map((r) => ({ key: r.key, title: r.title, group: r.group }));
PM.openPauseMenu('map'); await sleep(2500);
for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent || '')) b.click();
await sleep(800);
out.ratio0 = MV.getDiscoveredRatio();
MV.setMapView(p.x, p.y, 1.2); await sleep(1500); await grab('kaart-start-uit');
MV.setMapView(p.x, p.y, 0.35); await sleep(3500); for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent || '')) b.click(); await grab('kaart-start-provincie');
out.stats = MV.getMapViewStats();
PM.closePauseMenu(); await sleep(800);
// naar een uitkijkpunt, E, kaart open
const t = pts[1] || pts[0];
if (p.inVehicle) p.exitVehicle(w.map, w);
p.x = t.x; p.y = t.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
await sleep(4000);
out.prompt = EX.viewpointPrompt(w);
await grab('uitkijkpunt-straat');
tapKey('e', 'KeyE'); await sleep(600); await grab('uitkijkpunt-na-e');
out.stand1 = EX.getStrekenStand(w);
PM.openPauseMenu('map'); await sleep(500); await grab('kaart-direct-na-ontdekking');
await sleep(2500); await grab('kaart-na-ontdekking');
MV.setMapView(t.x, t.y, 0.8); await sleep(1500); await grab('kaart-streek');
PM.closePauseMenu(); await sleep(500);
PM.openPauseMenu('todo'); await sleep(2500); await grab('todo');
out.fps1 = await fps();
PM.closePauseMenu(); clearInterval(skipper);
return JSON.stringify(out);
