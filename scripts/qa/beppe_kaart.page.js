// Page half of scripts/qa/beppe_zien.mjs --page=kaart (desktop --perf-script body; #916, #832): opent de kaart en Te doen
// zoals een speler dat doet (pauzemenu), met een vers profiel (geen streek ontdekt), en legt vast of het eerbetoon er staat:
// het kaarticoon (ingetekende iconen van de kaart) en de rij 'Beppes huis' in Te doen, met schermbeelden.
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
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const EX = await imp('explorationlive');
const TD = await imp('todo');
const grab = async (name) => { console.log('[capture] ' + name); await sleep(600); };
const out = { fps0: 0 };
let spots = null;
for (let i = 0; i < 60 && !spots; i++) { if (window.__beppe) { window.__beppe.place(); spots = window.__beppe.spots(); } if (!spots) await sleep(1000); }
if (!spots) { clearInterval(skipper); return JSON.stringify({ fout: 'geen plek bepaald' }); }
const mk = spots.marker;
out.marker = { x: Math.round(mk.x), y: Math.round(mk.y) };
out.verborgen = { huis: EX.isAreaHidden(spots.house.x, spots.house.y), bankje: EX.isAreaHidden(spots.bench.x, spots.bench.y) };
// Te doen: staat er een rij 'Beppes huis' (de lijst zelf, vóór het paneel)
const rij = TD.getTodoItems(w).find((r) => r.key === 'om:beppe');
out.todoRij = rij ? { title: rij.title, x: Math.round(rij.x), y: Math.round(rij.y), goal: !!rij.goal } : null;
// de kaart: het icoon bij drie zoomniveaus
PM.openPauseMenu('map');
await sleep(2500);
// de legenda van de eerste keer weg, zoals de speler op Begrepen klikt
for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent || '')) b.click();
await sleep(800);
const zooms = [1.2, 4, 10];
out.kaart = [];
for (const z of zooms) {
  MV.setMapView(mk.x, mk.y, z);
  await sleep(1800);
  out.kaart.push({ zoom: z, stats: MV.getMapViewStats() });
  await grab('kaart-zoom' + z);
}
PM.closePauseMenu();
await sleep(1500);
PM.openPauseMenu('todo');
await sleep(2500);
const txt = document.body.innerText || '';
out.todoTekst = { beppe: /Beppes huis/.test(txt), westgrens: /westgrens/.test(txt) };
await grab('todo');
const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /Beppes huis/.test(e.textContent || ''));
if (el) { el.scrollIntoView({ block: 'center' }); await sleep(800); await grab('todo-beppe'); }
PM.closePauseMenu();
clearInterval(skipper);
return JSON.stringify(out);
