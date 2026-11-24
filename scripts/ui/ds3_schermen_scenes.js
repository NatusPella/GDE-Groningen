// Scenes voor scripts/qa/ds3_schermen_beeld.mjs: de schermen van #999 (winkels, missies, loopbanen en andere v2-schermen),
// #1000 (minigames) en #1001 (Samen spelen) in één run, per scherm een [capture]. De sessie van Samen spelen is nagebootst
// (zonder netwerk): alleen de weergave telt. Raakt alleen het wegwerpprofiel; elke synthetische keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
const done = [];
const only = window.__dsOnly || [];
const wil = (n) => !only.length || only.includes(n);
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
if (window.__dsRustig) { const S = await imp('settings'); S.setSetting('rustigDrukwerk', true); await sleep(300); }
// de nagebootste sessie mist velden die de echte netlaag heeft: de foutkaart die dat geeft hoort niet bij het scherm
const shot = async (name, wait = 1200) => { await sleep(wait); for (const e of document.querySelectorAll('.frame-error')) e.remove(); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const sluit = async () => { tap('Escape', 'Escape'); await sleep(300); try { PM.closePauseMenu(); } catch (e) { /* niet open */ } await sleep(400); };
const probeer = async (naam, fn) => { if (!wil(naam)) return; try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); await sluit(); } };
w.money = 5000;

// ---- #999: pauzemenu-schermen ----
const tab = (naam, tabId, opts = {}, wacht = 1800, extra = null) => probeer(naam, async () => {
  PM.openPauseMenu(tabId, opts); await sleep(wacht);
  if (extra) await extra();
  await shot(naam, 600); PM.closePauseMenu(); await sleep(500);
});
await tab('spel', 'spel', {}, 1800);
await tab('todo', 'todo', {}, 1800);
await tab('loopbaan', 'loopbaan', {}, 1800);
await tab('loopbaan-detail', 'loopbaan', {}, 1800, async () => {
  const k = document.querySelector('#pause-menu [data-vak], #pause-menu .lb-kaart, #pause-menu [data-loopbaan]'); if (k) { k.click(); await sleep(900); }
});
await tab('verhaal', 'verhaal', {}, 1800);
await tab('veroverd', 'veroverd', {}, 1800);
await tab('garage', 'garage', {}, 6000);
await tab('prestaties', 'prestaties', {}, 1800);

// ---- #999: winkels (de eerste winkel van een paar soorten, direct geopend) ----
await probeer('winkel', async () => {
  const SH = await imp('shops'); const SU = await imp('shopui');
  const alle = SH.getShopsForRender(); const soorten = [];
  for (const s of alle) { if (!soorten.some((x) => x.type === s.type)) soorten.push(s); }
  const kies = soorten.filter((s) => /kleding|super|fiets|eikea|auto|wapen|kapper/i.test(s.type)).slice(0, 3);
  for (const s of (kies.length ? kies : soorten.slice(0, 2))) {
    w.wanted = 0;
    try { SH.openShopFromInterior(w, s); } catch (e) { done.push('winkel ' + s.type + ' FOUT ' + e.message); SU.closeShopMenu({ save: false }); continue; }
    await sleep(800);
    if (SU.isShopOpen()) { await shot('winkel-' + s.type, 1200); SU.closeShopMenu({ save: false }); await sleep(400); } else done.push('winkel ' + s.type + ': ging niet open');
  }
});

// ---- #999: activiteit- en missiekaart (startkaart in de HUD) ----
await probeer('startkaart', async () => {
  const SK = await imp('startkaart'); SK.toonStartkaart(w, 'kartbaan');
  // de kaart kan achter een uitlegkaart in de rij staan: wacht tot hij in beeld is
  for (let i = 0; i < 40 && !/Karten bij Kardinge/.test((document.getElementById('hud') || document.body).textContent); i++) await sleep(250);
  await shot('startkaart', 900);
});

// ---- #1000: minigamebord, stopvenster ----
const K = await imp('minigamekit');
const bord = async (naam, titel, set) => probeer(naam, async () => { const b = K.createBoard(titel); b.set(set); b.show(); await shot(naam, 1200); b.hide(); b.root.remove(); await sleep(300); });
const CELLEN = [{ t: '3', cls: 'good' }, { t: '5', cls: 'bad' }, { t: '·', cls: 'on' }, { t: '4' }, { t: '5' }, { t: '6' }];
for (const [id, row] of [['discgolf', 'Worp <b>3</b> van 9 · Par 3'], ['kartbaan', 'Ronde <b>2</b> van 3 · Plek 2 van 4'], ['klimtoren', 'Hoogte <b>34</b> m']]) {
  const extra = id === 'kartbaan' ? { extra: K.standTabel(['#', 'Naam', 'Ronde', 'Tijd'], [{ naam: 'Rik', cellen: ['3', '1:02,4'] }, { naam: 'Jij', cellen: ['2', '1:03,9'], eigen: true }, { naam: 'Sanne', cellen: ['2', '1:07,1'] }, { naam: 'Bram', cellen: ['1', '0:41,0'], weg: true }]) } : {};
  await bord('bord-' + id, id, { row, cells: id === 'discgolf' ? CELLEN : null, meter: { v: 0.55, text: '55%' }, flash: 'Mooie beurt!', help: K.key('SPATIE') + ' doen · ' + K.key('ESC') + ' stoppen', ...extra });
}
await probeer('bord-stop', async () => { const b = K.createBoard('discgolf'); b.set({ row: 'Worp 3 van 9' }); b.show(); await sleep(500); tap('Escape', 'Escape'); await shot('bord-stop', 1200); tap('Escape', 'Escape'); await sleep(300); b.hide(); b.root.remove(); });
await probeer('moment', async () => {
  const BM = await imp('bigmoment');
  BM.showBigMoment({ ...BM.momentVanBanner({ kind: 'pass', title: 'Kartbaan', reason: 'Eerste plek', reward: 120 }), eigen: true }); await shot('moment-gehaald', 900); await sleep(4500);
});

// ---- #1001: Samen spelen ----
const px = p.x, py = p.y;
const rooster = [
  { slot: 0, char: 'tammo', rol: 'host', verbinding: 'ok', avatar: { naam: 'Tammo', kleur: '#4fb3ff', char: 'tammo' } },
  { slot: 1, char: 'rik', rol: 'gast', verbinding: 'ok', avatar: { naam: 'Rik', kleur: '#f2b134', char: 'rik' } },
  { slot: 2, char: 'sanne', rol: 'gast', verbinding: 'lag', avatar: { naam: 'Sanne', kleur: '#5bd6a0', char: 'sanne' } },
  { slot: 3, char: 'bram', rol: 'gast', verbinding: 'lost', avatar: { naam: 'Bram', kleur: '#b78cff', char: 'bram' } },
];
const rijen = (rol) => rooster.map((r) => ({
  slot: r.slot, naam: r.avatar.naam, kleur: r.avatar.kleur, vorm: { 0: 'driehoek', 1: 'vierkant', 2: 'cirkel', 3: 'vijfhoek' }[r.slot], jij: rol === 'host' ? r.slot === 0 : r.slot === 1,
  verbinding: r.verbinding, verbindingTekst: { ok: 'goed', lag: 'hapert', lost: 'weg' }[r.verbinding], ms: { 0: null, 1: 34, 2: 180, 3: null }[r.slot],
  passief: r.slot !== 1, pvpInSpel: true, groep: r.slot === 0 ? 'leidt Het Loket' : '', leidt: r.slot === 0, doet: ['te voet', 'in een voertuig', 'aan het stuur', 'onbekend'][r.slot],
  afstand: [null, 40, 420, null][r.slot], afstandTekst: ['', '40 m', '420 m', ''][r.slot], x: r.slot === 3 ? null : px + 40 * r.slot, y: r.slot === 3 ? null : py - 30 * r.slot,
}));
const maakSessie = (rol) => {
  const hub = { roster: { max: 4, spelers: rooster }, cfg: {}, publiek: () => null, announce() {}, zetOpenbaar: () => ({ ok: true }), on() {}, off() {} };
  w.coopSolo = false; w.coopRole = rol; w.coopPvp = { aan: true, passief: {} };
  w.coopRoster = rooster; w.coopSpelers = rijen(rol);
  w.coopNet = rol === 'host' ? { role: 'host', hub, route: 'kamer', info: {} } : { role: 'client', route: 'kamer', session: { slot: 1, caps: ['pvp'], welcome: { max: 4, lijst: rooster }, sendEvent: () => true }, info: {} };
};
const weg = () => { w.coopNet = null; w.coopRole = null; w.coopSpelers = []; w.coopUitnodiging = null; };
await tab('samen-hub', 'spel', { sub: 'samen' }, 1800);
await probeer('samen-keuze', async () => {
  PM.openPauseMenu('spel', { sub: 'samen' }); await sleep(1500);
  const b = document.querySelector('[data-hub-keuze="meedoen"]'); if (b) { b.click(); await shot('samen-meedoen', 2000); }
  PM.closePauseMenu(); await sleep(500);
  PM.openPauseMenu('spel', { sub: 'samen' }); await sleep(1500);
  const h = document.querySelector('[data-hub-keuze="hosten"], [data-hub-keuze="host"]'); if (h) { h.click(); await shot('samen-hosten', 2500); }
  PM.closePauseMenu(); await sleep(500);
});
await probeer('samen-naam', async () => { const M = await imp('onlineconsentui'); M.openOnlineStart({ naam: '', terug: true }); await shot('samen-naam', 1500); const t = document.querySelector('[data-terug]'); if (t) t.click(); else tap('Escape', 'Escape'); await sleep(500); });
await probeer('samen-wachtkamer', async () => { maakSessie('host'); await sleep(300); PM.openPauseMenu('samen'); await shot('samen-wachtkamer', 1800); await sluit(); weg(); });
await probeer('samen-spelers', async () => { maakSessie('host'); await sleep(300); PM.openPauseMenu('spelers'); await shot('samen-spelers', 1800); await sluit(); weg(); });
await probeer('samen-tab', async () => {
  maakSessie('host'); await sleep(300);
  const U = await imp('coopspelersui'); w.paused = false;
  const oud = w.input.isDown; w.input.isDown = (k) => k === 'tab' || (oud && oud.call(w.input, k));
  U.updateSpelersOverlay(w); await sleep(300); U.updateSpelersOverlay(w); await shot('samen-tab', 800);
  w.input.isDown = oud; U.updateSpelersOverlay(w); weg();
});
await probeer('samen-vraag', async () => {
  maakSessie('gast'); const CM = await imp('coopmeedoen'); const CH = await imp('coophud');
  w.coopUitnodiging = CM.maakUitnodiging({ k: 'meedoen', label: 'de kartbaan', sec: 20 });
  CH.updatePartnerChip(w); await shot('samen-vraag', 900);
  weg(); CH.updatePartnerChip(w);
});
clearInterval(skipper);
return JSON.stringify(done);
