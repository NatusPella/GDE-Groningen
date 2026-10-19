// Pagina-kant van de coöp-testbank (scripts/coop/testbank.mjs, #95): lopende body van --perf-script.
// window.__coopCfg = { role: 'host'|'gast', route: 'direct'|'kamer', code, durationS, name } staat ervoor.
// Doet wat een speler doet: pauzemenu, 'Samen spelen', knoppen van de lobby, kamer-/koppelcode. Alles komt als
// [bot-log]-regels in het events-bestand van deze instantie; de testbank leest ze.
const CFG = window.__coopCfg || {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now();
const log = (type, data = {}) => console.log('[bot-log] ' + JSON.stringify({ t: Math.round(performance.now() - t0) / 1000, type, who: CFG.name, ...data }));
const W = () => window.__debug && window.__debug.world;
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const panel = () => document.querySelector('.pm-samen');
const title = () => { const p = panel(); const h = p && p.querySelector('.coop-title'); return h ? h.textContent.trim() : ''; };
const buttons = () => [...(panel() ? panel().querySelectorAll('[data-act]') : [])].map((b) => b.dataset.act);
async function until(fn, ms, what) {
  const end = performance.now() + ms;
  while (performance.now() < end) { try { const v = fn(); if (v) return v; } catch (e) { /* nog niet */ } await sleep(150); }
  throw new Error('time-out: ' + what + ' (scherm: ' + title() + ', fout: ' + ((panel() && panel().querySelector('.coop-error') || {}).textContent || '-') + ', knoppen: ' + buttons().join(',') + ')');
}
async function act(name, ms = 8000) {
  await until(() => panel() && panel().querySelector(`[data-act="${name}"]`), ms, 'knop ' + name);
  panel().querySelector(`[data-act="${name}"]`).click();
  await sleep(250);
}

try {
  await until(() => W() && W().player, 90000, 'world (spel geladen)');
  for (let i = 0; i < 25 && W().paused; i++) { key(' ', 'Space'); await sleep(700); }
  await sleep(1500);
  // de opening van een nieuw spel (cutscene, camera-override) houdt de gast tegen: eerst overslaan, zoals een speler
  for (let i = 0; i < 60 && (W().cameraOverride || W().pendingRespawn || document.getElementById('cine') && document.getElementById('cine').classList.contains('on')); i++) { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); await sleep(1300); for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); await sleep(300); }
  log('speelklaar', { cameraOverride: !!W().cameraOverride, respawn: !!W().pendingRespawn, ragdoll: !!W().player.ragdoll });
  log('start', { role: CFG.role, route: CFG.route });
  // 1. het pauzemenu en 'Samen spelen' (alleen met ?coop)
  key('Escape', 'Escape');
  await until(() => document.querySelector('.ra[data-goto="samen"]'), 8000, 'rail-knop Samen');
  document.querySelector('.ra[data-goto="samen"]').click();
  await until(() => panel() && !panel().closest('[hidden]'), 5000, 'paneel Samen');
  log('scherm', { titel: title(), knoppen: buttons() });
  if (CFG.role === 'host') {
    await act('kies-host');
    log('scherm', { titel: title(), knoppen: buttons() });
    await act(CFG.route === 'kamer' ? 'route-kamer' : 'route-direct');
    // toestemming: vóór akkoord is er niets verstuurd
    log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 300), knoppen: buttons() });
    await act('akkoord');
    const code = await until(() => { const c = panel().querySelector('.coop-code'); return c && c.textContent.trim(); }, 30000, 'code van de host');
    log('code', { code });
    await until(() => title() === 'Je speelt samen', CFG.waitS ? CFG.waitS * 1000 : 120000, 'een gast');
  } else {
    await act('kies-gast');
    const input = await until(() => panel().querySelector('.coop-input'), 5000, 'invoerveld');
    input.value = CFG.code; input.dispatchEvent(new Event('input', { bubbles: true }));
    await act('koppel');
    log('toestemming', { titel: title(), tekst: panel().innerText.slice(0, 300), knoppen: buttons() });
    await act('akkoord');
    await until(() => title() === 'Je speelt samen', 60000, 'verbinding met de host');
  }
  log('verbonden', { titel: title(), tekst: panel().innerText.slice(0, 400) });
  key('Escape', 'Escape'); // terug het spel in
  await sleep(1500);
  // 2. samen spelen: elke seconde een regel met wat deze instantie ziet
  const end = performance.now() + (CFG.durationS || 20) * 1000;
  let n = 0;
  while (performance.now() < end) {
    const x = W();
    const b = (o) => (o ? { x: Math.round(o.x * 10) / 10, y: Math.round(o.y * 10) / 10, char: o.character || '' } : null);
    log('sample', {
      n: n++, paused: !!x.paused, clock: x.time, uur: x.clock, slot: x.coopNet && x.coopNet.session ? x.coopNet.session.slot : 0, desync: x.coopDesync ? x.coopDesync.velden : null, money: x.money, wanted: x.wanted | 0, role: x.coopRole || null,
      me: b(x.player), companion: b(x.companion), partner: x.coopPartner ? { slot: x.coopPartner.slot, x: x.coopPartner.x, y: x.coopPartner.y } : null,
      roster: x.coopRoster ? x.coopRoster.map((s) => [s.slot, s.char, s.verbinding]) : null, figuren: Object.keys(x.coopFigures || {}).length,
    });
    await sleep(1000);
  }
  log('einde', { ok: true });
  return JSON.stringify({ result: 'KLAAR', role: CFG.role });
} catch (e) {
  log('fout', { msg: String(e && e.message || e) });
  return JSON.stringify({ result: 'FOUT', role: CFG.role, reason: String(e && e.message || e) });
}
