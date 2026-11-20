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
  // 1. HUD-kaart: Nieuwe streek (kind prestatie) en een tip
  await reeks('kaart-streek', () => w.addMessage('Nieuwe streek: Selwerd. De naam staat nu op je kaart.', 5, { kind: 'prestatie', kicker: 'Verkend', key: 'mi-streek' }), { staan: 3000, weg: 9500 });
  await reeks('kaart-geplaatst', () => w.addMessage('Geplaatst: je pion staat op de kaart.', 5, { kind: 'tip', important: true, key: 'mi-geplaatst' }), { staan: 3000, weg: 9500 });
} catch (e) { info.push('kaart: ' + e); }
try {
  // 2. Telefoonmelding
  await reeks('telefoon', () => window.__phonefeed.notify({ from: 'Tessa', app: 'bericht', title: 'Nieuw bericht', text: 'Kom je nog naar de Grote Markt?', duration: 5 }), { staan: 3000, weg: 10500 });
} catch (e) { info.push('telefoon: ' + e); }
try {
  // 3. Prestatietoast
  const ach = await imp('achievements');
  const id = ach.ACHIEVEMENTS.find((a) => !ach.isUnlocked(a.id) && !a.hidden && a.id !== 'alle_goud');
  await reeks('prestatie', () => ach.unlockAchievement(w, id.id), { staan: 3000, weg: 10500 });
} catch (e) { info.push('prestatie: ' + e); }
try {
  // 4. Naamkaart
  const nc = await imp('namecard');
  await reeks('naamkaart', () => nc.showNameCard('tammo', { force: true }), { staan: 3000, weg: 9500 });
} catch (e) { info.push('naamkaart: ' + e); }
try {
  // 5. Geldteller: een bedrag komt bij; echte tijd, een still na ~100 ms (halverwege) en na 400 ms (vast)
  w.money = (w.money || 0) + 100; await sleep(2500);
  const m0 = w.money; w.money = m0 + 12500;
  await sleep(100); await cap('geld-1-100ms');
  await sleep(500); await cap('geld-2-vast');
  w.money = Math.max(0, w.money - 12500); await sleep(1500);
} catch (e) { info.push('geld: ' + e); }
try {
  // 6. Einde-missie-schermen en andere grote momenten
  const bm = await imp('bigmoment');
  const moment = (opts) => () => bm.showBigMoment({ eigen: true, ...opts });
  const duur = (o) => (bm.bouwMoment(o).ms || 4200);
  const lijst = [
    ['bm-geslaagd', { soort: 'geslaagd', titel: 'Mooi, dat gaait!', regelNl: 'Dat is gelukt. Netjes gedaan.', beloning: 450, tijd: 134 }],
    ['bm-mislukt', { soort: 'mislukt', titel: 'Nou, nait best.', regelNl: 'Dat ging mis. Probeer het nog eens.', tijd: 61 }],
    ['bm-opgepakt', { soort: 'opgepakt', beloning: -350 }],
    ['bm-gebied', { soort: 'gebied', titel: 'Selwerd', regelNl: 'Je bent hier voor het eerst.' }],
    ['bm-wanted', { soort: 'wanted', klein: 'Gezocht', titel: 'Pas op!', regelNl: 'De politie let op je.', sterren: 2 }],
  ];
  for (const [naam, o] of lijst) {
    const ms = duur(o);
    await reeks(naam, moment(o), { staan: Math.min(ms - 400, 3200), weg: ms + 1500 });
  }
} catch (e) { info.push('bigmoment: ' + e); }
clearInterval(skipper);
console.log('[capture] klaar');
return JSON.stringify(info);
