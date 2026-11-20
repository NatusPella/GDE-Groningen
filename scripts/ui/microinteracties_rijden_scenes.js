// Beeldscenes voor de microinteracties (ds-motion.css, #985): per type melding en per einde-missie-scherm stills
// op t=0, 120 en 250 ms, daarna tijdens het verblijf en na het uitfaden. De overgangen draaien hier 10x
// vertraagd (de tokens --ds-m-snel, --ds-m en --ds-m-max staan inline op 10x), zodat een still op 1,2 s en 2,5 s
// echt 120 en 250 ms in de overgang laat zien; de timers van de componenten blijven echte tijd.
//   node scripts/ui_shots.mjs --scenes=scripts/ui/microinteracties_scenes.js --sizes=1280x720 --out=<map>
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
const D = window.__debug; const w = D.world;
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const root = document.documentElement;
const SLOW = 10;
const traag = (aan) => {
  for (const [n, ms] of [['--ds-m-snel', 120], ['--ds-m', 200], ['--ds-m-max', 250]]) {
    if (aan) root.style.setProperty(n, `${ms * SLOW}ms`); else root.style.removeProperty(n);
  }
};
const cap = async (name) => { console.log('[capture] ' + name); await sleep(700); };
const info = [];
await sleep(3000);

// een reeks: trigger, t0, t120, t250 (10x vertraagd), staan (echte tijd), weg
async function reeks(naam, trigger, { staan = 2500, weg = 4500 } = {}) {
  traag(true);
  await sleep(300);
  const t0 = performance.now();
  trigger();
  await sleep(30);
  await cap(`${naam}-1-t0`);
  await sleep(Math.max(0, 1200 - (performance.now() - t0)));
  await cap(`${naam}-2-t120`);
  await sleep(Math.max(0, 2500 - (performance.now() - t0)));
  await cap(`${naam}-3-t250`);
  traag(false);
  await sleep(Math.max(0, staan - (performance.now() - t0)));
  await cap(`${naam}-4-staan`);
  await sleep(Math.max(0, weg - (performance.now() - t0)));
  await cap(`${naam}-5-weg`);
  await sleep(1500);
}

try {
  const bm = await imp('bigmoment');
  const lijst = [
    ['geslaagd', { soort: 'geslaagd', titel: 'Mooi, dat gaait!', regelNl: 'Dat is gelukt. Netjes gedaan.', beloning: 450, tijd: 134 }],
    ['mislukt', { soort: 'mislukt', titel: 'Nou, nait best.', regelNl: 'Dat ging mis. Probeer het nog eens.', tijd: 61 }],
    ['opgepakt', { soort: 'opgepakt', beloning: -350 }],
    ['gebied', { soort: 'gebied', titel: 'Selwerd', regelNl: 'Je bent hier voor het eerst.' }],
    ['wanted', { soort: 'wanted', klein: 'Gezocht', titel: 'Pas op!', regelNl: 'De politie let op je.', sterren: 2 }],
  ];
  for (const rijdend of [false, true]) {
    for (const [naam, o] of lijst) {
      if (rijdend && !['gebied', 'wanted', 'opgepakt'].includes(naam)) continue;
      const opts = { eigen: true, ...o, rijdend };
      const ms = bm.bouwMoment(opts).ms || 4200;
      await reeks((rijdend ? 'rijd-' : 'voet-') + naam, () => bm.showBigMoment(opts), { staan: Math.min(ms - 300, 2600), weg: ms + 1500 });
    }
  }
} catch (e) { info.push('bigmoment: ' + e); }
clearInterval(skipper);
console.log('[capture] klaar');
return JSON.stringify(info);
