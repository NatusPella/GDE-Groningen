// Page half of scripts/qa/terugkeer_beeld.mjs (desktop --perf-script body): de terugkeerscène (#986 #987) in het echte spel.
// Eerst een paar vignetten rechtstreeks (sleutelbeelden), dan de echte route: een geladen spel (loadCount omhoog) laat de
// scène vanzelf starten, en daarna controleert het script dat de speler, de klok en de telefoon ongemoeid zijn.
// Raakt geen echte opslag (wegwerpprofiel). window.__tk = { only }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__tk || {};
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const TK = await imp('terugkeerrun');
const TKS = await imp('terugkeerscenes');
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
// alle andere films (de opening van een nieuw spel) overslaan; de terugkeerscène niet
let skipAan = true;
const skipper = setInterval(() => { if (skipAan && cine.isCinematicActive() && !cine.isCinematicActive('terugkeer')) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
await sleep(6000);
const out = { beelden: [], fouten: [], route: {} };
const grab = async (naam) => { console.log('[capture] ' + naam); out.beelden.push(naam); await sleep(700); };
const wacht = async (fn, maxMs, stap = 100) => { for (let t = 0; t < maxMs; t += stap) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(stap); } return false; };

// ---- sleutelbeelden van vignetten ---------------------------------------------------------------------------
for (const id of ['f1-pan', 'f2-kruimel', 'f3-bank', 'f3-dansen', 'f4-vijf']) {
  if (ONLY && !ONLY.includes(id)) continue;
  try {
    await wacht(() => !cine.isCinematicActive(), 15000);
    await sleep(1500);
    const ok = TK.terugkeerTest(w, id);
    if (!ok) throw new Error('startte niet');
    await sleep(1800); await grab(id + '-a');
    await sleep(2600); await grab(id + '-b');
    await sleep(2600); await grab(id + '-c');
    await wacht(() => !cine.isCinematicActive('terugkeer'), 15000);
  } catch (e) { out.fouten.push(id + ': ' + (e && e.message || e)); }
}

// ---- de echte route: een geladen spel ---------------------------------------------------------------------------------
if (!ONLY || ONLY.includes('route')) {
  try {
    await wacht(() => !cine.isCinematicActive(), 15000);
    skipAan = true;
    const voor = { x: p.x, y: p.y, clock: w.clock, geld: w.money, tel: (w.phone && JSON.stringify(Object.keys(w.phone)).length) || 0 };
    // net geladen: een tweede load-teller en het geladen-vlag; de wachter wacht op rust en speelt dan
    w.loadedFromSave = true; w.loadCount = (w.loadCount || 0) + 1;
    const start = await wacht(() => cine.isCinematicActive('terugkeer'), 30000, 100);
    out.route.gestart = start;
    if (start) {
      await sleep(2500); await grab('route-midden');
      const klaar = await wacht(() => !cine.isCinematicActive('terugkeer'), 20000);
      out.route.klaar = klaar;
      await sleep(1500); await grab('route-terug-in-spel');
    }
    out.route.speler = { x0: voor.x, y0: voor.y, x1: p.x, y1: p.y, zelfde: Math.abs(p.x - voor.x) < 0.01 && Math.abs(p.y - voor.y) < 0.01 };
    out.route.klok = { voor: voor.clock, na: w.clock };
    out.route.geld = { voor: voor.geld, na: w.money };
    out.route.opslag = window.localStorage.getItem('gde-terugkeer-v1');
    out.route.paused = !!w.paused;
  } catch (e) { out.fouten.push('route: ' + (e && e.message || e)); }
}

clearInterval(skipper);
console.log(`[terugkeer] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
