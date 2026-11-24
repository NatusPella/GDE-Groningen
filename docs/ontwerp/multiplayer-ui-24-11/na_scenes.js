// Na-beelden van Samen spelen (fase 3), opener en gast, in het echte spel met een nepsessie (geen netwerk). Draait als --perf-script.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const out = [];
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const ST = await imp('settings'); const CS = await imp('coopsave'); const CH = await imp('coophud');
ST.setSetting('onlineMeedoen', true); ST.setSetting('onlineNaam', 'Sem'); ST.setSetting('onlineKleur', '#4fb3ff');
try { CS.writeSession(localStorage, CS.toSession(CS.readSession(localStorage), { code: 'K3J9D-8F2MN' })); } catch (e) { out.push('code ' + e.message); }
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
const sluit = async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(250); } try { PM.closePauseMenu(); } catch (e) {} await sleep(300); };
const open = async (sec, sub) => { await sluit(); PM.openPauseMenu(sec, sub ? { sub } : {}); await sleep(1600); };
const rij = (slot, naam, kleur, vorm, o = {}) => ({ slot, naam, kleur, vorm, doet: 'loopt', verbinding: 'ok', niveau: 'goed', ms: 40, afstandTekst: '120 m', afstand: 120, richting: { pijl: '→', woord: 'oost' }, jij: false, passief: true, groep: null, x: 10, y: 10, klaar: null, ...o });
const RIJEN = (jij) => [rij(0, 'Sem', '#4fb3ff', 'cirkel', { jij: jij === 0, afstandTekst: '', richting: null }), rij(1, 'Iris', '#5bd6a0', 'ster', { jij: jij === 1, doet: 'hengelt' }), rij(2, 'Tijn', '#f2b134', 'plus', { niveau: 'matig', verbinding: 'ok', ms: 220, doet: 'rijdt' }), rij(3, 'Liv', '#ff9a62', 'hart', { verbinding: 'lost', niveau: 'weg', doet: 'weg' }), rij(4, 'Gijs', '#ff7ab8', 'maan', { passief: false })];
for (const rol of ['host', 'gast']) {
  const host = rol === 'host';
  try {
    w.coopNet = host ? { role: 'host', hub: { roster: { max: 8, spelers: [0, 1, 2, 3, 4].map((s) => ({ slot: s, verbinding: s === 3 ? 'lost' : 'ok' })) }, openbaar: null }, route: 'kamer', session: null, joined: true }
      : { role: 'client', session: { slot: 1, sendEvent: () => true }, route: 'kamer', joined: true };
    w.coopRole = host ? 'host' : 'client'; w.coopSolo = false;
    w.coopRoster = [{ slot: 0, naam: 'Sem' }, { slot: 1, naam: 'Iris' }, { slot: 2, naam: 'Tijn' }, { slot: 3, naam: 'Liv' }, { slot: 4, naam: 'Gijs' }];
    w.coopSpelers = RIJEN(host ? 0 : 1);
    await open('spel', 'spelers'); await shot(rol + '-1-spelers');
    await open('spel', 'uitnodigen'); await shot(rol + '-2-uitnodigen');
    await open('spel', 'sessie'); await shot(rol + '-3-sessie');
    await sluit();
    w.coopUitnodiging = { label: 'Race naar het Hoofdstation', verplicht: false, start: false, rest: 8, stap: null, status: null }; CH.updatePartnerChip(w); await sleep(700); await shot(rol + '-4-meedoen', 300); w.coopUitnodiging = null; CH.updatePartnerChip(w);
    w.coopStem = { id: 1, soort: 'slapen', tekst: 'Iris wil slapen. De tijd springt dan voor iedereen vooruit.', rest: 10 }; CH.updatePartnerChip(w); await sleep(700); await shot(rol + '-5-stem', 300); w.coopStem = null; CH.updatePartnerChip(w);
    w.coopWachtOp = { slot: 3, naam: 'Liv' }; w.coopWachtVerder = () => {}; CH.updatePartnerChip(w); await sleep(700); await shot(rol + '-6-wacht', 300); w.coopWachtOp = null; CH.updatePartnerChip(w);
    const SB = await imp('samenbeloning');
    CH.toonBeloningKaart(SB.beloningGegevens({ titel: 'Race naar het Hoofdstation', uitslag: RIJEN(0).slice(0, 3).map((r) => ({ slot: r.slot, naam: r.naam, kleur: r.kleur, vorm: r.vorm, tijd: ['3:12', '3:20', '3:41'][r.slot] })), kijkers: ['Gijs', 'Liv'], mijnSlot: host ? 0 : 1, basis: 180, punten: 40 })); await sleep(700); await shot(rol + '-7-beloning', 300); tap('Enter', 'Enter'); await sleep(400);
    CH.toonHervatKaart({ seconden: 72, naam: 'Sem' }); await sleep(700); await shot(rol + '-8-hervat', 300); tap('Enter', 'Enter'); await sleep(400);
  } catch (e) { out.push(rol + ' ' + e.message); }
}
clearInterval(skipper);
return JSON.stringify(out);
