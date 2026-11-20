// Audit van de toets- en knop-hints in het draaiende spel (docs/KEYS-AUDIT-20-11.md). Pagina-script voor scripts/ui_shots.mjs
// (--scenes=scripts/qa/keys.page.js, via slot.mjs naam 'keys'). Per scène en per invoer (toetsenbord, nep-controller) telt het
// elke zichtbare hint als: glyph (Kenney, .pad-kn), tekstkeycap (.hud-key/.m-kc/kbd met tekst), muis (SVG), pijltje-tekst (↑ ↓ ← →
// los in een voetregel) of zin ('druk op E', 'Esc', 'Spatie' als woord zonder plaatje). Het resultaat is de return-waarde (JSON).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const tapK = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !document.body.classList.contains('intro-montage') && !document.querySelector('#load-screen.on');
const cine0 = await imp('cinematics');
const skipper = setInterval(() => { if (cine0.isCinematicActive()) cine0.skipCinematic(); }, 100);
for (let i = 0; i < 240 && !klaar(); i++) { if (!document.body.classList.contains('game-started') && document.querySelector('#start-screen.visible')) tapK('Enter', 'Enter'); await sleep(1000); }
await sleep(3000);
await document.fonts.ready;
const D = window.__debug; const w = D.world; w.devInvuln = true; D.input.canLock = () => false;
const PM = await imp('pausemenu');
const shot = async (n) => { console.log('[capture] ' + n); await sleep(600); };

// nep-controller (zoals tester_padscreens.page.js)
const ORDER = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: ORDER.map(() => ({ pressed: false, touched: false, value: 0 })) };
let padOn = false;
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => (padOn ? [pad] : [null]) });
const tapPad = async (name) => { const b = pad.buttons[ORDER.indexOf(name)]; b.pressed = true; b.value = 1; await sleep(80); b.pressed = false; b.value = 0; await sleep(200); };

const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]') && Number(getComputedStyle(e).opacity) > 0.05;
function meet() {
  const t = { glyph: 0, tekstkeycap: 0, muis: 0, pijltjetekst: 0, zin: 0, kleinGlyph: 0 };
  const voorbeelden = { tekstkeycap: [], pijltjetekst: [], zin: [] };
  const seen = new Set();
  for (const e of document.querySelectorAll('.hud-key, .m-kc, kbd, .hud-wasd, .hud-mouse-g, .pad-g')) {
    if (!vis(e) || seen.has(e) || e.closest('#glyphmaat')) continue;
    const bin = e.closest('.hud-wasd, .hud-key, .m-kc, kbd') || e;
    if (seen.has(bin)) continue;
    seen.add(bin); seen.add(e);
    if (bin.querySelector('.hud-mouse') || bin.classList.contains('hud-mouse-g')) { t.muis++; continue; }
    const g = bin.matches('.pad-kn') ? bin : bin.querySelector('.pad-kn');
    if (g) {
      t.glyph++;
      const r = (g.querySelector && g.querySelector('.pad-key')) ? g.getBoundingClientRect() : g.getBoundingClientRect();
      if (r.height < 22 && r.width < 22) { t.kleinGlyph++; }
      continue;
    }
    if (bin.querySelector('.pad-g') || bin.matches('.pad-g')) { t.glyph++; continue; }
    t.tekstkeycap++; if (voorbeelden.tekstkeycap.length < 6) voorbeelden.tekstkeycap.push((bin.textContent || '').trim().slice(0, 14));
  }
  // lopende tekst buiten de plaatjes
  const wlk = document.createTreeWalker(document.body, 4);
  while (wlk.nextNode()) {
    const n = wlk.currentNode; const p = n.parentElement;
    if (!p || !vis(p) || p.closest('.hud-key, .m-kc, kbd, .pad-g, script, style, #glyphmaat, #cine, textarea, input, [data-g-raw]')) continue;
    const v = n.nodeValue;
    if (/(^|\s)[↑↓←→](\s|$)/.test(v)) { t.pijltjetekst++; if (voorbeelden.pijltjetekst.length < 4) voorbeelden.pijltjetekst.push(v.trim().slice(0, 40)); }
    if (/\b(Druk|Houd|druk|houd) (op )?[A-Z]\b|\b(Esc|Spatie|Enter|Shift|Ctrl|Tab)\b/.test(v)) { t.zin++; if (voorbeelden.zin.length < 4) voorbeelden.zin.push(v.trim().slice(0, 50)); }
  }
  return { ...t, voorbeelden };
}

const uit = [];
const meet1 = async (scene, modus, wacht = 600) => { await sleep(wacht); uit.push({ scene, modus, ...meet() }); };

async function reeks(modus) {
  // te voet
  await meet1('te voet', modus, 800);
  await shot('voet-' + modus);
  // pauzemenu-tabs
  for (const [naam, args] of [['pauze overzicht', ['overzicht']], ['pauze kaart', ['map']], ['pauze todo', ['todo']], ['pauze instellingen', ['instellingen']], ['pauze besturing', ['instellingen', { sub: 'besturing' }]], ['pauze garage', ['garage']]]) {
    try { PM.openPauseMenu(...args); await meet1(naam, modus, 1800); if (['pauze overzicht', 'pauze besturing', 'pauze kaart', 'pauze garage', 'pauze todo'].includes(naam)) await shot(naam.replace(' ', '-') + '-' + modus); PM.closePauseMenu(); await sleep(500); } catch (e) { uit.push({ scene: naam, modus, fout: String(e.message) }); try { PM.closePauseMenu(); } catch {} }
  }
  // stopvenster en minigamebord
  try {
    const K = await imp('minigamekit');
    const b = K.createBoard('discgolf'); b.set({ row: 'Worp 3 van 9', cells: [{ t: 'Hole 1', cls: 'good' }], help: K.key('SPATIE') + ' werpen · ' + K.key('ESC') + ' stoppen' }); b.show();
    await meet1('minigamebord', modus, 700); await shot('minigamebord-' + modus);
    K.stopPressed({ wasPressed: (k) => k === 'escape', consume() {} });
    await meet1('stopvenster', modus, 700); await shot('stopvenster-' + modus);
    document.querySelectorAll('.mg-stopask').forEach((e) => e.remove()); b.hide(); b.root.remove();
  } catch (e) { uit.push({ scene: 'bord/stop', modus, fout: String(e.message) }); }
  // uitjekaart en tip
  try { const U = await imp('uitjepaneel'); U.toonUitje(w, 'hoogvlieger', { titel: 'Reuzenrad', regel: 'Je zit in de gondel.', hint: '{SPACE} verder', secs: 6 }); await meet1('uitjekaart', modus, 900); await shot('uitjekaart-' + modus); U.verbergUitje(); } catch (e) { uit.push({ scene: 'uitje', modus, fout: String(e.message) }); }
  try { w.addMessage('Druk op {E} om in te stappen, {WASD} om te lopen', 6); await meet1('melding met toetsen', modus, 900); await shot('melding-' + modus); } catch (e) { uit.push({ scene: 'melding', modus, fout: String(e.message) }); }
}

padOn = false;
await reeks('toetsenbord');
padOn = true; await tapPad('a'); await sleep(600);
await reeks('controller-xbox');
padOn = false;
clearInterval(skipper);
return JSON.stringify(uit);
