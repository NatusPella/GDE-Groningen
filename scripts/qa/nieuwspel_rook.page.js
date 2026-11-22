// Nieuw-spel-rooktest (gate 0.65, 22-11): een nieuw spel via het menu-testpad; wat ziet een nieuwe speler?
// Page-script voor scripts/qa/menufoto.mjs --page=nieuwspel_rook.page.js. Geeft een JSON terug (return) en maakt beelden.
// Meet: speelt de opening (cinematic), waar staat de speler, het Spel-overzicht (Verhaal x van 71), de kaartvoortgang, de garage, de menurail zonder boerderij/voetbal/snack.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const uit = { stappen: [] };
const note = (naam, data) => uit.stappen.push({ naam, ...data });
for (let i = 0; i < 240; i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map) break;
  await sleep(1000);
}
const w = window.__debug.world; const p = w.player;
const cine = await imp('cinematics'); const PM = await imp('pausemenu');
// 1. de opening: speelt hij (cinematic), en hoe lang?
let metCine = false; let t = 0;
for (; t < 40; t++) { if (cine.isCinematicActive()) { metCine = true; break; } await sleep(500); }
note('opening', { cinematicGezien: metCine, naSeconden: t / 2, positie: { x: Math.round(p.x), y: Math.round(p.y), binnen: !!(w.interior || w.inInterior || p.inside) }, stap: (window.__story && window.__story.state && JSON.stringify(window.__story.state()).slice(0, 200)) || null });
console.log('[capture] rook-01-opening-start');
await sleep(4000);
console.log('[capture] rook-02-opening-later');
for (let i = 0; i < 400 && cine.isCinematicActive(); i++) { await sleep(500); }
note('opening-klaar', { cinematicNog: cine.isCinematicActive(), positie: { x: Math.round(p.x), y: Math.round(p.y), binnen: !!(w.interior || w.inInterior || p.inside) } });
await sleep(3000);
console.log('[capture] rook-03-na-opening');
w.devInvuln = true; window.__debug.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const S = await imp('story');
note('poort', { gate: JSON.stringify(S.storyGateProgress()).slice(0, 200), farm: S.storyWorldOpen('farm'), voetbal: S.storyWorldOpen('voetbal'), snackwagen: S.storyWorldOpen('snackwagen'), bezit: S.storyWorldOpen('bezit') });
const FR = await imp('featurerevealrun'); const FV = await imp('featurereveal');
note('bezitsvraag', { ownsFarm: FR.owns('farm'), ownsBezit: FR.owns('bezit'), ownsVoetbal: FR.owns('voetbal'), openLand: FV.revealOpen('farm'), openPanden: FV.revealOpen('bezit'), openSnack: FV.revealOpen('snackwagen'), openVoetbal: FV.revealOpen('voetbal'), sectie: FV.sectionVisible('boerderij') });
// 2. menu: rail en overzicht
const tekst = (el) => ((el && el.innerText) || '').replace(/\s+/g, ' ').trim();
PM.openPauseMenu('spel', { sub: 'overzicht' }); await sleep(2500);
const rail = [...document.querySelectorAll('.pm-game [data-goto], .pm-rail [data-goto]')].filter((b) => !b.hidden && b.offsetParent).map((b) => b.dataset.goto);
const panel = document.querySelector('[data-panel="spel"]');
note('menu-spel', { rail, verhaalRegel: (tekst(panel).match(/Verhaal[^.]{0,60}\d+ van \d+[^.]{0,40}/) || [''])[0], stapRegel: (tekst(panel).match(/Stap \d+ van \d+/) || [''])[0], tekst: tekst(panel).slice(0, 500), boerderijRij: !!document.querySelector('.pm-row [data-goto="boerderij"]:not([hidden])') && !!document.querySelector('.pm-row [data-goto="boerderij"]').closest('.pm-row') && !document.querySelector('.pm-row [data-goto="boerderij"]').closest('.pm-row').hidden });
console.log('[capture] rook-04-menu-spel');
PM.openPauseMenu('verhaal'); await sleep(2000);
note('menu-verhaal', { tekst: tekst(document.querySelector('[data-panel="verhaal"]')).slice(0, 400) });
console.log('[capture] rook-05-menu-verhaal');
PM.openPauseMenu('map'); await sleep(3500);
for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent)) { b.click(); await sleep(500); }
note('menu-kaart', { tekst: tekst(document.querySelector('[data-panel="map"]')).slice(0, 400), strook: (tekst(document.querySelector('[data-panel="map"]')).match(/\d+ ?%[^.]{0,30}/) || [''])[0] });
console.log('[capture] rook-06-menu-kaart');
PM.openPauseMenu('garage'); await sleep(2500);
note('menu-garage', { tekst: tekst(document.querySelector('[data-panel="garage"]')).slice(0, 500) });
console.log('[capture] rook-07-menu-garage');
PM.closePauseMenu(); await sleep(800);
// 3. de wereld: opent en doet 'Doorgaan' het?
note('einde', { tijdLoopt: true, wanted: w.wanted, geld: w.money });
return JSON.stringify(uit);
