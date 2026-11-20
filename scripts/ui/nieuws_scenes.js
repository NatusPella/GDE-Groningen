// Beelden voor de afronding van het designsysteem (#998 telefoon, #999 winkels en menu's, #1000 minigames, #1001 Samen spelen, #1002 laadscherm):
// één run, per scherm een [capture]. Gebruik: bash desktop/build/ds-run.sh scripts/ui/ds_afronding_scenes.js <map> <formaten> [stage]
// Raakt alleen het wegwerpprofiel; elke synthetische keydown krijgt een keyup.
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
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); try { PM.closePauseMenu(); } catch (e2) { /* niet open */ } } };
const P = await imp('phonefeed'); const HC = await imp('hudcards');
const NIEUWS = 'Een snelle auto en drie politiewagens maken een rondje Groningen. Het verkeer vraagt vriendelijk om ruimte voor iedereen die vandaag onderweg is.';
const KIEZEL = 'Kiezelweek! Groepjes nieuwe Stadjers in de binnenstad en het Noorderplantsoen. Rustig rijden, ze kijken nog niet goed uit.';
const sub = (tekst) => { let s = document.getElementById('banter-sub'); if (!s) { s = document.createElement('div'); s.id = 'banter-sub'; s.innerHTML = '<span class="bt-speaker"></span><span class="bt-line"></span>'; document.body.appendChild(s); } s.querySelector('.bt-speaker').textContent = 'Tammo: '; s.querySelector('.bt-line').textContent = tekst; s.style.opacity = '1'; };
const weg = async () => { const s = document.getElementById('banter-sub'); if (s) s.style.opacity = '0'; await sleep(9500); };
await probeer('nieuws-telefoon', async () => { P.notifyPhone(w, { text: 'Kiekdoar: ' + NIEUWS, from: 'Kiekdoar', app: 'nieuws', duration: 8 }); await shot('nieuws-telefoon-lang', 2500); await sleep(9000); });
await probeer('nieuws-kiezelweek', async () => { P.notifyPhone(w, { text: 'Kiekdoar: ' + KIEZEL, from: 'Kiekdoar', app: 'nieuws', duration: 8 }); await shot('nieuws-telefoon-kiezelweek', 2500); await sleep(9000); });
await probeer('nieuws-tip', async () => { HC.showCard(w, { kind: 'tip', kicker: 'Kiekdoar Nieuws', title: 'Dikkie Dijkstra', body: NIEUWS, duration: 8, key: 'n1', voice: false }); await shot('nieuws-tipkaart', 2000); await sleep(9000); });
await probeer('nieuws-met-ondertitel', async () => { sub('Zeg, dit was niet de afslag naar de Ring, hè? Kijk even naar links.'); P.notifyPhone(w, { text: 'Kiekdoar: ' + KIEZEL, from: 'Kiekdoar', app: 'nieuws', duration: 8 }); HC.showCard(w, { kind: 'tip', kicker: 'Kiekdoar Nieuws', title: 'Marrit Meeuwsen', body: NIEUWS, duration: 8, key: 'n2', voice: false }); await shot('nieuws-met-ondertitel', 2500); await weg(); });
clearInterval(skipper);
return done;
