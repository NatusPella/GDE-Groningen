// Scenes voor de beeldregressie (#994, #996): de vijf grote momenten (missie geslaagd en mislukt, opgepakt, nieuw gebied,
// wanted omhoog) als stilstaand beeld nadat de stempel op zijn plek is; in Rustig drukwerk zonder stempelbeweging. Namen: zie SCHERMEN in
// scripts/ui/beeldregressie.mjs. Raakt alleen het wegwerpprofiel; elke synthetische keydown krijgt een keyup.
// window.__shotsOnly (--only=a,b) kiest scenes.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
const done = [];
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
await sleep(3000);
const D = window.__debug; const w = D.world;
const cine = await imp('cinematics'); const BM = await imp('bigmoment');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const only = (window.__shotsOnly || '').split(',').filter(Boolean);
const wil = (n) => !only.length || only.includes(n);
const moment = async (naam, o) => {
  if (!wil(naam)) return;
  try {
    const r = BM.showBigMoment({ eigen: true, ...o });
    if (!r) { done.push(naam + ' NIET GETOOND'); return; }
    await shot(naam, 1800);
    await Promise.race([r.done, sleep((BM.bouwMoment(o).ms || 4200) + 3000)]);
    await sleep(600);
  } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); }
};
await moment('moment-geslaagd', { soort: 'geslaagd', titel: 'Mooi, dat gaait!', regelNl: 'Dat is gelukt. Netjes gedaan.', beloning: 450, tijd: 134 });
await moment('moment-mislukt', { soort: 'mislukt', titel: 'Nou, nait best.', regelNl: 'Dat ging mis. Probeer het nog eens.', tijd: 61 });
await moment('moment-opgepakt', { soort: 'opgepakt', beloning: -350 });
await moment('moment-gebied', { soort: 'gebied', titel: 'Selwerd', regelNl: 'Je bent hier voor het eerst.' });
await moment('moment-wanted', { soort: 'wanted', klein: 'Gezocht', titel: 'Pas op!', regelNl: 'De politie let op je.', sterren: 2 });
clearInterval(skipper);
return done;
