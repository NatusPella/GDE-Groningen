// Page half of scripts/qa/ds_schermen_beeld.mjs (desktop --perf-script body; designsysteem fase 2, #980):
// opent de winkel, de beleidswinkel en de garage zoals een speler dat doet, neemt beelden ("[capture] naam") en meet.
// window.__ds = { settle, stap: ['winkel', 'beleid', 'garage'] }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tap = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code || k, bubbles: true })); } };
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tap(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const CFG = window.__ds || {};
const STAP = CFG.stap || ['winkel', 'beleid', 'garage'];
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const SH = await imp('shops');
const SU = await imp('shopui');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
await sleep(CFG.settle || 9000);
const out = { stappen: [], fouten: [] };
const fps = async (ms = 2000) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const geelNu = () => [...document.querySelectorAll('.ds-z-knop:not(.ds-z-knop--secundair):not(.ds-z-knop--ghost):not(.ds-z-knop--gevaar)')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.disabled).map((b) => b.textContent.trim().slice(0, 24)); // besluit eigenaar 20-11: één gele hoofdknop per scherm
const shot = async (name, wait = 900) => { await sleep(wait); out.geel = out.geel || {}; out.geel[name] = geelNu(); out.fps = out.fps || {}; out.fps[name] = await fps(700); console.log('[capture] ' + name); await sleep(700); };
const teleport = (x, y) => { if (p.inVehicle) p.exitVehicle(map, w); p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0; };
const hold = () => { /* de speler blijft staan */ };
// scrol alle scrolbare voorouders zodat het element bovenaan staat
const scrolNaar = (el) => { for (let a = el.parentElement; a; a = a.parentElement) { if (a.scrollHeight > a.clientHeight + 4) { const d = el.getBoundingClientRect().top - a.getBoundingClientRect().top - 8; a.scrollTop += d; } } };
// De Beleidswinkel staat in Veroverd onder een pane van ruim 5000 px en op 900p met 0 px hoogte: niet te bereiken.
// Voor het beeld halen we alleen dat blok uit het paneel en zetten het in een vlak over het menu (de opmaak blijft die van #pause-menu).
const isoleer = (el) => { const host = document.querySelector('#pause-menu'); host.appendChild(el); el.style.cssText = 'position:fixed;left:360px;top:60px;width:900px;max-height:790px;overflow:auto;padding:24px;background:#0f2417;border-radius:16px;z-index:99999'; };
const root = () => document.querySelector('#shop-menu');
const kleinste = (el) => { let min = 99, wie = ''; for (const n of el.querySelectorAll('*')) { if (!n.childNodes.length) continue; const heeftTekst = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); if (!heeftTekst) continue; const px = parseFloat(getComputedStyle(n).fontSize); const r = n.getBoundingClientRect(); if (r.width && px < min) { min = px; wie = (n.className || n.tagName) + ': ' + n.textContent.trim().slice(0, 30); } } return { px: min, wie }; };
const openWinkel = async (type) => {
  const lijst = SH.getShopsForRender();
  const s = lijst.find((x) => x.type === type);
  if (!s) { out.fouten.push('geen winkel van type ' + type); return false; }
  for (let i = 0; i < 12 && !SU.isShopOpen(); i++) { teleport(s.x, s.y); await sleep(250); tap('e', 'KeyE'); await sleep(700); }
  if (!SU.isShopOpen()) { out.fouten.push('winkel ' + type + ' ging niet open'); return false; }
  await sleep(900);
  return true;
};
const sluitWinkel = async () => { if (SU.isShopOpen()) { SU.closeShopMenu({ save: false }); await sleep(500); } };
out.types = [...new Set(SH.getShopsForRender().map((s) => s.type))];
out.fps0 = await fps();

if (STAP.includes('winkel')) {
  // 1: wapenwinkel of een andere winkel met duurdere dingen, ruim saldo: de bon met "na aankoop"
  const kies = ['wapen', 'wapens', 'gun', 'gunstore'].find((t) => out.types.includes(t)) || out.types.find((t) => /wap|gun/.test(t)) || out.types[0];
  out.winkelType = kies;
  w.money = 5000;
  if (await openWinkel(kies)) {
    const items = [...root().querySelectorAll('.sm-item')];
    out.items = items.length;
    await shot('winkel-ruim', 1200);
    // saldo laag: de duurste rij kiezen, de callout met de oplossing
    w.money = 60;
    SU.closeShopMenu({ save: false }); await sleep(300);
    await openWinkel(kies);
    const rijen = [...root().querySelectorAll('.sm-item')];
    const duur = rijen.find((r) => r.dataset.st !== 'koop' && r.querySelector('[data-st="duur"]')) || rijen[rijen.length - 1];
    if (duur) { duur.focus(); duur.click(); await sleep(500); }
    out.callout = !!root().querySelector('.sm-callout:not([hidden])');
    out.oplossing = (root().querySelector('.sm-oplossing') || {}).textContent || null;
    await shot('winkel-te-duur', 800);
    // de oplossing-knop: naar het voorgestelde item
    const op = root().querySelector('.sm-oplossing');
    if (op) { const doel = op.dataset.oplossing; op.click(); await sleep(500); out.naOplossing = (root().querySelector('.sm-item.sel') || {}).dataset ? root().querySelector('.sm-item.sel').dataset.id === doel : null; await shot('winkel-na-oplossing', 600); }
    // risicovol: tweede druk bij een dure aankoop
    w.money = 1000;
    SU.closeShopMenu({ save: false }); await sleep(300);
    await openWinkel(kies);
    const r2 = [...root().querySelectorAll('.sm-item')].filter((r) => r.getAttribute('aria-disabled') !== 'true');
    const dure = r2.sort((a, b) => (parseInt((b.textContent.match(/€([\d.]+)/) || [0, '0'])[1].replace(/\./g, ''), 10) || 0) - (parseInt((a.textContent.match(/€([\d.]+)/) || [0, '0'])[1].replace(/\./g, ''), 10) || 0))[0];
    if (dure) {
      dure.focus(); dure.click(); await sleep(500);
      await shot('winkel-risico', 500);
      const geld0 = w.money;
      root().querySelector('.sm-buy').click(); await sleep(500);
      out.risicoNaEerste = { geld: w.money === geld0, armed: root().querySelector('.sm-buy').classList.contains('armed'), gevaar: root().querySelector('.sm-buy').classList.contains('ds-knop--gevaar') };
      await shot('winkel-bevestigen', 300);
      root().querySelector('.sm-buy').click(); await sleep(600);
      out.risicoNaTweede = { geldGedaald: w.money < geld0, saldo: w.money };
      await shot('winkel-gekocht', 500);
    }
    out.winkelTekst = kleinste(root());
    // lege toestand
    await sluitWinkel();
  }
  // 2: een voertuigwinkel met draaiend voorbeeld, en de aankoop die in de garage terugkomt
  const vt = out.types.find((t) => /fiets|bike|dealer|auto|scoot/.test(t));
  out.voertuigType = vt;
  if (vt) {
    w.money = 8000;
    if (await openWinkel(vt)) {
      await shot('winkel-voertuig', 2500);
      const geld = w.money;
      const eerste = [...root().querySelectorAll('.sm-item')].find((r) => r.getAttribute('aria-disabled') !== 'true' && !/Heb ik al/.test(r.textContent));
      if (eerste) { eerste.focus(); eerste.click(); await sleep(600); root().querySelector('.sm-buy').click(); await sleep(500); if (root().querySelector('.sm-buy').classList.contains('armed')) { root().querySelector('.sm-buy').click(); await sleep(600); } }
      out.voertuigGekocht = w.money < geld;
      await sluitWinkel();
    }
  }
}

if (STAP.includes('beleid')) {
  for (const [naam, geld] of [['beleid-arm', 260], ['beleid-rijk', 6000]]) {
    w.money = geld;
    teleport(...[p.x, p.y]);
    PM.openPauseMenu('veroverd');
    await sleep(2000);
    const pane = document.querySelector('#pause-menu .bw-beleid');
    if (pane) isoleer(pane);
    if (pane) { const ketting = []; for (let a = pane.parentElement; a && ketting.length < 8; a = a.parentElement) ketting.push((a.className || a.tagName) + ' sh' + a.scrollHeight + ' ch' + a.clientHeight + ' ov' + getComputedStyle(a).overflowY + ' st' + a.scrollTop); out[naam + 'Geom'] = { top: Math.round(pane.getBoundingClientRect().top), ketting }; }
    out[naam] = { bonnen: document.querySelectorAll('#pause-menu .bw-rij').length, callouts: document.querySelectorAll('#pause-menu .bw-beleid .ds-callout').length, geel: [...document.querySelectorAll('#pause-menu .bw-beleid [data-beleid]')].filter((b) => !b.classList.contains('ds-knop--secundair')).length };
    await shot(naam, 700);
    if (naam === 'beleid-rijk') {
      const knop = document.querySelector('#pause-menu [data-beleid]:not([disabled])');
      const geld0 = w.money;
      if (knop) { knop.click(); await sleep(600); out.beleidGekocht = { geldGedaald: w.money < geld0, melding: (document.querySelector('#pause-menu .bw-melding') || {}).textContent || null }; const pane2 = document.querySelector('#pause-menu .bw-beleid'); if (pane2) isoleer(pane2); await shot('beleid-gekocht', 500); }
      out.beleidTekst = kleinste(document.querySelector('#pause-menu .bw-beleid'));
    }
    PM.closePauseMenu();
    await sleep(500);
  }
}

if (STAP.includes('garage')) {
  w.money = 5000;
  if (!STAP.includes('winkel')) {
    w.money = 8000;
    const vt2 = out.types.find((t) => /fiets|bike|dealer|auto|scoot/.test(t));
    if (vt2 && await openWinkel(vt2)) { const e1 = [...root().querySelectorAll('.sm-item')].find((r) => r.getAttribute('aria-disabled') !== 'true'); if (e1) { e1.focus(); e1.click(); await sleep(600); root().querySelector('.sm-buy').click(); await sleep(500); if (root().querySelector('.sm-buy').classList.contains('armed')) { root().querySelector('.sm-buy').click(); await sleep(600); } } await sluitWinkel(); }
    w.money = 5000;
  }
  PM.openPauseMenu('garage');
  await sleep(2500);
  const pm = () => document.querySelector('#pause-menu [data-panel="garage"] .pm-inner');
  const kaarten = () => [...pm().querySelectorAll('.gar-card')];
  { const alle = pm() && pm().querySelector('[data-garage-cat="all"]'); if (alle) { alle.click(); await sleep(1200); } }
  out.garageKaarten = kaarten().length;
  const eigen = kaarten().filter((c) => c.dataset.group === 'owned');
  out.eigen = eigen.length;
  // de Escapade (hero) heeft schade en een lekke band voor de chips
  const hero = (w.vehicles || []).find((v) => v.isHeroCar);
  if (hero) { hero.health = 55; hero.flat = true; }
  if (eigen[0]) { eigen[0].click(); await sleep(1800); }
  out.chips = [...pm().querySelectorAll('.gar-chips .ds-z-chip')].map((c) => c.textContent.trim());
  await shot('garage-hero', 1200);
  // verkopen of slopen: een eigen voertuig dat niet de Escapade is, twee keer
  const ander = eigen.find((c) => c.dataset.garageSelect !== 'hero');
  if (ander) {
    ander.click(); await sleep(1500);
    await shot('garage-ander', 600);
    const sell = pm().querySelector('[data-garage-sell]');
    out.sellKnop = !!sell;
    if (sell) {
      const geld0 = w.money;
      sell.click(); await sleep(800);
      out.vraag = !!pm().querySelector('.gar-msg.ds-callout');
      out.vraagTekst = (pm().querySelector('.gar-msg') || {}).textContent || null;
      out.sellGevaar = !!(pm().querySelector('[data-garage-sell]') || {}).classList && pm().querySelector('[data-garage-sell]').classList.contains('ds-knop--gevaar');
      out.geldNaEerste = w.money === geld0;
      await shot('garage-verkoopvraag', 500);
      const sell2 = pm().querySelector('[data-garage-sell]');
      if (sell2) { sell2.click(); await sleep(900); out.verkocht = w.money > geld0; await shot('garage-verkocht', 500); }
    }
  }
  // lege selectie
  const bt = pm().querySelector('[data-garage-filter]');
  if (bt) { for (let i = 0; i < 4; i++) { bt.click(); await sleep(150); if (pm().querySelector('.gar-leeg')) break; } }
  out.leeg = !!pm().querySelector('.gar-leeg');
  if (out.leeg) await shot('garage-leeg', 500);
  out.garageTekst = kleinste(pm());
  PM.closePauseMenu();
}
clearInterval(skipper);
return JSON.stringify(out);
