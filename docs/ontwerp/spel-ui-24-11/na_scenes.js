// Beelden van het huidige Spel-menu (fase 1 review, 24-11). Draait als --perf-script (zie huidig_beeld.mjs).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const ONLY = (window.__dsOnly || []);
const fase = (n) => !ONLY.length || ONLY.includes(n);
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const out = [];
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const S = await imp('saveslots'); const SG = await imp('savegame'); const M = await imp('missions');
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
const sluit = async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(250); } try { PM.closePauseMenu(); } catch (e) {} await sleep(300); };
const open = async (sec, sub) => { await sluit(); PM.openPauseMenu(sec, sub ? { sub } : {}); await sleep(1600); };
const klik = async (sel, wacht = 700) => { const e = document.querySelector(sel); if (e) { e.click(); await sleep(wacht); } return !!e; };
for (let i = 0; i < 400 && loading(); i++) await sleep(100);
const stap = async (naam, fn) => { try { await fn(); } catch (e) { out.push(naam + ' FOUT ' + (e && e.message)); } };

if (fase('nieuw')) {
  w.money = 250;
  await stap('N1', async () => { await open('spel', 'overzicht'); await shot('N-spel-overzicht'); });
  await stap('N2', async () => { await open('spel', 'acties'); await shot('N-spel-opslaan'); await klik('[data-action="restart"]'); await shot('N-spel-herstart-vraag', 300); await klik('[data-action="cancel"]'); });
  await stap('N3', async () => { await open('spel', 'samen'); await shot('N-spel-samen'); const t = document.querySelector('#online-start [data-terug]'); if (t) { t.click(); await sleep(500); } for (const e of document.querySelectorAll('#online-start')) e.remove(); });
  await stap('N4', async () => { await open('spel', 'acties'); await klik('[data-action="saves"]', 1200); await shot('N-slots-leeg'); tap('Escape', 'Escape'); await sleep(500); });
  await stap('N5', async () => { await open('verhaal'); await shot('N-verhaal'); });
  await sluit();
}
if (fase('gevorderd')) {
  w.money = 12840;
  const defs = M.getMissionDefs ? M.getMissionDefs() : [];
  for (let i = 0; i < Math.min(14, defs.length); i++) M.markMissionCompleted(w, i);
  out.push('missies klaar gezet ' + Math.min(14, defs.length));
  await sleep(1500);
  await stap('G0', async () => { SG.saveGame(w, { manual: true, toast: false }); await sleep(2500); });
  await stap('G0b', async () => { const a = S.copySlot(null, SG.currentSlot()); if (a.ok) S.renameSlot(null, a.n, 'Proefrit Eemshaven'); const b = S.copySlot(null, SG.currentSlot()); if (b.ok) S.renameSlot(null, b.n, 'Voor de overval'); out.push('kopieen ' + JSON.stringify([a, b])); });
  await stap('G1', async () => { await open('spel', 'overzicht'); await shot('G-spel-overzicht'); });
  await stap('G2', async () => { await open('spel', 'acties'); await shot('G-spel-opslaan'); await klik('[data-action="save"]', 1500); await shot('G-spel-opgeslagen', 300); });
  await stap('G3', async () => { await open('spel', 'acties'); await klik('[data-action="saves"]', 1400); await shot('G-slots'); const m = document.querySelector('#saveslots [data-more]'); if (m) { m.click(); await sleep(600); await shot('G-slots-menu', 200); } tap('Escape', 'Escape'); await sleep(400); });
  await stap('G3b', async () => { const cards = document.querySelectorAll('#saveslots .ssl-main[data-do="load"]'); if (cards.length) { /* overschrijf of verwijder vraag */ const mores = document.querySelectorAll('#saveslots [data-more]'); if (mores[1]) { mores[1].click(); await sleep(500); const d = document.querySelector('#saveslots [data-do="delete"]'); if (d) { d.click(); await sleep(500); await shot('G-slots-verwijder', 200); } } } await sluit(); });
  await stap('G2b', async () => { await open('spel', 'acties'); await klik('[data-action="terugzetten-vraag"]', 900); await shot('G-terugzetten', 300); tap('Escape', 'Escape'); await sleep(500); await klik('[data-action="nieuw-vraag"]', 900); await shot('G-nieuw-bevestig', 300); tap('Escape', 'Escape'); await sleep(500); });
  await stap('G3c', async () => { await open('spel', 'acties'); await klik('[data-action="saves"]', 1400); const hs = [...document.querySelectorAll('#saveslots [data-do="save-here"]')]; if (hs[1]) { hs[1].click(); await sleep(900); await shot('G-overschrijven', 300); tap('Escape', 'Escape'); await sleep(500); } const mores = document.querySelectorAll('#saveslots [data-more]'); if (mores[2]) { mores[2].click(); await sleep(500); const d = document.querySelector('#saveslots [data-do="delete"]'); if (d) { d.click(); await sleep(900); await shot('G-verwijderen', 300); tap('Escape', 'Escape'); await sleep(500); } } w.money += 640; const ld = [...document.querySelectorAll('#saveslots [data-do="load"]')].filter((b) => !b.disabled); if (ld[0]) { ld[0].click(); await sleep(900); await shot('G-laden-ongeslagen', 300); tap('Escape', 'Escape'); await sleep(500); } tap('Escape', 'Escape'); await sleep(400); });
  await stap('G4', async () => { await open('verhaal'); await shot('G-verhaal'); });
  await sluit();
}
if (fase('momenten')) {
  const BM = await imp('bigmoment');
  await sluit();
  await stap('M1', async () => { BM.showBigMoment({ ...BM.momentVanOpgepakt({ busted: true, geld: 180, money: w.money, missie: 'Een middag op het terras' }), eigen: true }); await shot('M-opgepakt', 1200); await sleep(5000); });
  await stap('M2', async () => { BM.showBigMoment({ ...BM.momentVanOpgepakt({ busted: false, geld: 0, money: w.money, missie: 'Een middag op het terras' }), eigen: true }); await shot('M-buiten-westen', 1200); await sleep(5000); });
  await stap('M3', async () => { localStorage.removeItem('gde-recap-v1'); w.loadCount = (w.loadCount || 0) + 1; w.loadedFromSave = true; await sleep(9000); await shot('M-recap', 300); tap('Enter', 'Enter'); await sleep(500); });
  await stap('M4', async () => { w.addMessage('Je respawnt bij het politiebureau Grunn', 4); await shot('M-respawn-melding', 500); });
}
clearInterval(skipper);
return JSON.stringify(out);
