// Laadsysteem-hangcheck (gate 0.65, 22-11): de wereld mag nooit achter een laadscherm blijven hangen.
// Page-script voor scripts/qa/menufoto.mjs --page=laadhang.page.js. Meet na elk scenario of world.loadHolds leeg raakt en of world.time weer loopt.
// Scenario's: nieuw spel (start), verre sprong (teleport via de cheatactie), een tweede sprong direct erna, een verhaalstap met cutscene (__story.jump), en een gooiende homeLaad.tick.
// Schrijft per scenario een regel "[hang] {json}" en ten slotte "[hang-klaar] {json}". Alleen het wegwerpprofiel wordt geraakt.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const resultaten = [];
const uit = (r) => { resultaten.push(r); console.log('[hang] ' + JSON.stringify(r)); };
const t0 = Date.now();
// A. nieuw spel: het menu-testpad kiest Nieuw spel zelf; wacht tot de wereld er is en meet tot de holds weg zijn
let w = null;
for (let i = 0; i < 240; i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.map) { w = window.__debug.world; if (document.body.classList.contains('game-started')) break; }
  await sleep(1000);
}
const holds = () => Object.keys((w && w.loadHolds) || {});
const meet = async (naam, maxS) => {
  const start = Date.now(); const tijd0 = w.time; let vrij = null;
  while ((Date.now() - start) / 1000 < maxS) {
    if (!holds().length && !document.querySelector('.ls.on:not(.out)')) { vrij = (Date.now() - start) / 1000; break; }
    await sleep(500);
  }
  const t1 = w.time; await sleep(3000); const t2 = w.time;
  uit({ naam, holdsLeeg: vrij !== null, naSeconden: vrij, holdsNu: holds(), tijdLoopt: t2 > t1, paused: !!w.paused, uiPaused: !!w.uiPaused, tijd: [tijd0, t1, t2] });
};
await meet('nieuw spel', 120);
const cine = await imp('cinematics');
for (let i = 0; i < 60 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(250); }
await sleep(1500);
w.devInvuln = true; window.__debug.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const plaats = (n) => index.places.find((x) => x.name === n) || index.places[5];
// B. verre sprong via de cheatactie (laadscherm)
try {
  const a = plaats('Winsum');
  w.cheatActions.teleport(a.x, a.y, 'Winsum', {});
  await sleep(1500);
  await meet('teleport verre sprong (Winsum)', 120);
  // C. direct een tweede sprong (retarget)
  const b = plaats('Zuidhorn');
  w.cheatActions.teleport(b.x, b.y, 'Zuidhorn', {});
  await sleep(300);
  const c = plaats('Bedum');
  w.cheatActions.teleport(c.x, c.y, 'Bedum', {});
  await sleep(1500);
  await meet('twee sprongen vlak na elkaar', 150);
} catch (e) { uit({ naam: 'teleport', fout: String(e && e.message) }); }
// D. een gooiende homeLaad.tick moet het scherm niet vasthouden (review 22-11)
try {
  const LS = await imp('loadscreen');
  const oud = w.homeLaad; w.homeLaad = { tick: () => { throw new Error('test'); }, pending: () => 1 };
  const act = LS.startLoadScreen(w, { kind: 'save', name: 'Test' });
  await Promise.race([act.done, sleep(40000)]);
  w.homeLaad = oud;
  await meet('gooiende homeLaad.tick', 30);
} catch (e) { uit({ naam: 'homeLaad', fout: String(e && e.message) }); }
// E. verhaalstap met cutscene via __story.jump
try {
  if (window.__story && window.__story.jump) {
    window.__story.jump('M02');
    await sleep(4000);
    for (let i = 0; i < 60 && cine.isCinematicActive(); i++) await sleep(1000);
    await meet('verhaalstap M02 met cutscene', 90);
  } else uit({ naam: 'verhaalstap', fout: 'geen __story.jump' });
} catch (e) { uit({ naam: 'verhaalstap', fout: String(e && e.message) }); }
return JSON.stringify({ secs: Math.round((Date.now() - t0) / 1000), ok: resultaten.every((r) => r.holdsLeeg && r.tijdLoopt), resultaten });
