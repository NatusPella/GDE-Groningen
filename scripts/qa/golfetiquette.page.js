// Paginascript voor scripts/qa/menuplekken_shots.mjs --page=golfetiquette.page.js --nomenu (#394): Wolfie bij het hutje en Sir Cedric bij de tee
// van Pitch & putt, met hun tekstballonnen, en de twee spelregels (de eer niet omdraaien, stil staan bij zijn slag). Opnames: shots-<naam>.png.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 120 && !(window.__debug && window.__debug.world && window.__pitchputt); i++) await sleep(500);
const w = window.__debug.world;
const cine = await import('/js/cinematics.js');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
await sleep(3000);
const p = w.player;
const pp = window.__pitchputt;
const uit = { stappen: [] };
const stap = (naam, extra = {}) => uit.stappen.push({ naam, t: Math.round(w.time), spreker: (w.extraSpeakers || []).filter((e) => e.mgTag === 'pitchputt').map((e) => `${e.speechName}: ${e.speechText}`), ...extra });
w.devInvuln = true;
if (window.__debug.input) window.__debug.input.canLock = () => false;
// naar het hutje bij de eerste tee, te voet
const spot = pp.spot();
const ga = (x, y) => { if (p.inVehicle) p.exitVehicle(w.map, w); p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0; };
ga(spot.x + 6, spot.y + 4);
for (let i = 0; i < 30; i++) { await sleep(500); }
stap('hutje');
// de camera naar Wolfie: kijk vanaf de speler naar het hutje
w.cameraOverride = { position: { x: spot.x + 7, y: spot.y + 5, z: 2.2 }, lookAt: { x: spot.x, y: spot.y, z: 1.4 }, fov: 55, cut: true };
await sleep(9000);
stap('hutje-na');
console.log('[capture] golf-hutje');
w.cameraOverride = null;
// een ronde starten; de eerste baan: Sir Cedric heeft de eer
try { pp.start(true); } catch (e) { uit.fout = String(e && e.stack || e); }
await sleep(1500);
stap('baan1-begin', { etiquette: pp.etiquette() });
console.log('[capture] golf-baan1-begin');
await sleep(4500);
stap('baan1-na-intro', { etiquette: pp.etiquette() });
console.log('[capture] golf-baan1-intro');
// de volgorde omdraaien: Spatie vasthouden voor Sir Cedric heeft geslagen (nieuwe baan)
pp.skip();
await sleep(1200);
const key = (k, down) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, code: k === ' ' ? 'Space' : k, bubbles: true })); };
key(' ', true);
await sleep(1600);
stap('volgorde-omgedraaid', { etiquette: pp.etiquette() });
console.log('[capture] golf-volgorde');
key(' ', false);
await sleep(300);
pp.quit();
await sleep(500);
uit.slagenTelling = 'geen straf: zie etiquette()';
clearInterval(skipper);
return JSON.stringify({ ...uit, beelden: [{ naam: 'golfetiquette' }] });
