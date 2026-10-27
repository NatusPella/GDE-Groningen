// Dedicated server (#450): de koploze gastheer van scripts/coop/nodehost.mjs als echt proces, zonder venster en zonder
// Electron. Twee nep-gasten (scripts/coop/mockclient.mjs) verbinden over ECHTE TCP met dezelfde coopcore.cjs en dezelfde
// hub als de app. Dekt: de wereld zonder speler (geen plek 0 in de snapshot, elke gast een eigen figuur), de klok die
// doorloopt, kicken, verbieden (het token komt er niet meer in), een wachtwoord per sessie, een vaste poort (en de nette
// fout als die bezet is), starten zonder document/window, een ontbrekende wereld of spelerslijst, en het wachtwoordveld
// in de lobby (game/js/lobby.js): leeg is open, gevuld vraagt erom.
//   node scripts/nodehost_test.mjs
import assert from 'node:assert/strict';
import net from 'node:net';
import { startKoplozeHost } from './coop/nodehost.mjs';
import { startMockGuest } from './coop/mockclient.mjs';
import * as L from '../game/js/lobby.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';

let n = 0;
const t = async (name, f) => { const r = await f(); n++; if (r) console.log(`  ${name}: ${r}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(50); } throw new Error('time-out: ' + what); };
// een poort die nu vrij is (de gastheer luistert op 0.0.0.0, dus we proberen het op dezelfde manier)
const vrijePoort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '0.0.0.0', () => { const p = s.address().port; s.close(() => res(p)); }); });

// De gastheer start zonder venster: deze omgeving heeft geen document en geen window, en de start maakt ze niet aan.
delete globalThis.document;
delete globalThis.window;
assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');

const poort = await vrijePoort();
const host = await startKoplozeHost({ max: 4, localIp: '127.0.0.1', upnp: false, port: poort });
const gasten = [];
let klaar = false;
const gast = async (opts = {}) => { const g = await startMockGuest({ code: host.code, net: { latency: 0.02 }, ...opts }); gasten.push(g); return g; };

try {
  await t('de koploze gastheer start zonder venster en twee nep-gasten spelen mee', async () => {
    assert.equal(typeof globalThis.document, 'undefined', 'geen document nodig op het startpad');
    assert.equal(typeof globalThis.window, 'undefined', 'geen window nodig op het startpad');
    assert.ok(/^GDE2-/.test(host.code), 'koppelcode: ' + host.code);
    assert.equal(host.world.player, null, 'de server heeft geen lokale speler');
    assert.equal(host.world.companion, null, 'en geen metgezel');
    const a = await gast({ seed: 1 }); a.input = () => ({ mx: 1, my: 0, run: false, yaw: 0 });
    await until(() => a.session.status === 'ok', 8000, 'gast 1');
    const b = await gast({ seed: 2 });
    await until(() => b.session.status === 'ok', 8000, 'gast 2');
    assert.deepEqual([a.session.slot, b.session.slot], [1, 2], 'de server wijst de plekken toe');
    await until(() => a.last(), 8000, 'snapshot bij gast 1');
    await until(() => a.last() && a.last().players.length === 2, 8000, 'beide spelers in de snapshot');
    const snap = a.last();
    assert.equal(snap.players.length, 2, 'geen plek 0 in de snapshot: plek 0 is leeg');
    assert.deepEqual(snap.players.map((p) => p.slot), [1, 2]);
    // de figuren zijn van de server: de invoer van gast 1 laat zijn figuur echt lopen
    const f1 = host.world.coopFigures[1], x0 = f1.x, y0 = f1.y;
    await until(() => Math.hypot(f1.x - x0, f1.y - y0) > 1, 5000, 'de figuur van gast 1 loopt');
    // de klok van de wereld loopt door zonder spelers aan tafel
    const klok = host.world.clock;
    await until(() => host.world.clock !== klok, 3000, 'de klok loopt');
    return `code ${host.code}, plekken ${host.spelers().map((s) => s.slot).join(',')}`;
  });

  await t('een vaste poort: de gastheer luistert daar, meldt hem, en een tweede op dezelfde poort geeft een nette fout', async () => {
    assert.equal(host.poort, poort, 'de gastheer luistert op de gevraagde poort');
    const m = /^GDE2-127\.0\.0\.1:(\d+)-/.exec(host.code);
    assert.ok(m, 'de koppelcode noemt het adres en de poort: ' + host.code);
    assert.equal(Number(m[1]), poort, 'geen willekeurige poort in de code');
    // een tweede gastheer op dezelfde poort: duidelijke melding, geen stille andere poort
    await assert.rejects(
      () => startKoplozeHost({ port: poort, localIp: '127.0.0.1', upnp: false }),
      (e) => new RegExp(`poort ${poort}`, 'i').test(e.message) && /bezet/i.test(e.message),
      'de bezette poort wordt bij naam genoemd',
    );
    assert.equal(host.gestopt, false, 'de bestaande gastheer draait gewoon door');
    assert.equal(host.poort, poort);
    return `poort ${poort}`;
  });

  await t('kicken: plek 2 gaat weg, plek 1 speelt door', async () => {
    const b = gasten[1];
    assert.equal(host.kick(2), true); assert.equal(host.kick(9), false);
    await until(() => b.session.status === 'verbroken', 6000, 'gast 2 weg');
    await until(() => host.spelers().every((s) => s.slot !== 2), 6000, 'plek 2 vrij');
    assert.equal(gasten[0].session.status, 'ok', 'gast 1 merkt niets');
    await b.stop();
  });

  await t('verbieden: dezelfde gast komt met zijn token niet terug', async () => {
    const a = gasten[0], token = a.session.token;
    assert.equal(host.verbied(1), true);
    await until(() => a.session.status === 'verbroken', 6000, 'gast 1 weg');
    await a.stop();
    const terug = await gast({ seed: 3, token });
    await until(() => terug.session.status === 'geweigerd', 8000, 'verbod');
    assert.equal(terug.session.rejected, 'verbod');
    await terug.stop();
  });

  await t('wachtwoord per sessie: zonder het woord geen plek, met het woord wel', async () => {
    assert.equal(host.zetWachtwoord('zomer'), true);
    const zonder = await gast({ seed: 4 });
    await until(() => zonder.session.status === 'geweigerd', 8000, 'wachtwoord');
    assert.equal(zonder.session.rejected, 'wachtwoord');
    await zonder.stop();
    const met = await gast({ seed: 5, wachtwoord: 'zomer' });
    await until(() => met.session.status === 'ok', 8000, 'met wachtwoord');
    assert.equal(met.session.slot, 1, 'de vrijgekomen plek');
    assert.equal(host.zetWachtwoord(''), false, 'het wachtwoord kan weer uit');
    await met.stop();
  });

  await t('een ontbrekende wereld of spelerslijst geeft een nette fout in plaats van een crash', async () => {
    await assert.rejects(() => startKoplozeHost({ maakWereld: () => null }), /geen wereld/i);
    await assert.rejects(() => startKoplozeHost({ maakWereld: () => ({ player: null, vehicles: [] }) }), /mist de lijst/i);
    const h = await startKoplozeHost({ localIp: '127.0.0.1', upnp: false });
    try {
      const bewaard = h.world.coopRoster;
      h.world.coopRoster = null;
      assert.throws(() => h.spelers(), /spelerslijst/i, 'zonder lijst een duidelijke melding, geen TypeError');
      h.world.coopRoster = bewaard;
      assert.deepEqual(h.spelers(), [], 'met de lijst gewoon weer werken');
    } finally { await h.stop(); }
  });

  await t('wachtwoord in de lobby: leeg is open, gevuld vraagt erom, en de host beheert het', async () => {
    const APP = { direct: true, rtc: true };
    const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));
    // de gastheer: het veld staat op het wachtscherm; leeg betekent open en Openbare sessie blijft werken
    let h = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' }, { t: 'code', code: 'K3J9D-8F2MN' });
    assert.equal(h.step, 'host-wacht');
    assert.ok(L.view(h).wachtwoord, 'de gastheer ziet het wachtwoordveld');
    assert.equal(L.view(h).wachtwoord.value, '');
    assert.match(L.view(h).lines.join(' '), /Deze sessie is open/);
    assert.ok(L.view(h).buttons.some((b) => b.act === 'openbaar'), 'Openbare sessie blijft werken');
    h = L.reduce(h, { t: 'wachtwoord', tekst: '  zomer\n' });
    assert.equal(h.wachtwoord, 'zomer', 'spaties eromheen en regeleinden vallen weg');
    assert.equal(L.view(h).wachtwoord.value, 'zomer');
    assert.match(L.view(h).lines.join(' '), /heeft een wachtwoord/);
    assert.ok(L.view(h).buttons.some((b) => b.act === 'openbaar'), 'ook met een wachtwoord kan de sessie openbaar');
    assert.equal(L.reduce(h, { t: 'wachtwoord', tekst: 'x'.repeat(50) }).wachtwoord.length, L.WACHTWOORD_MAX);
    assert.equal(L.reduce(h, { t: 'wachtwoord', tekst: '' }).wachtwoord, '', 'leeg maakt de sessie weer open');
    // de gast: het veld staat bij het invoeren, blijft bewaard en een verkeerd woord is opnieuw te proberen
    let g = run(APP, { t: 'kies', rol: 'gast' });
    assert.ok(L.view(g).wachtwoord, 'de gast ziet het wachtwoordveld');
    g = L.reduce(g, { t: 'wachtwoord', tekst: 'zomer' });
    g = L.reduce(g, { t: 'invoer', text: 'K3J9D-8F2MN' });
    assert.equal(g.wachtwoord, 'zomer', 'het wachtwoord gaat mee naar de toestemming');
    g = L.reduce(g, { t: 'akkoord' });
    g = L.reduce(g, { t: 'status', status: 'geweigerd', reason: 'wachtwoord' });
    assert.equal(L.view(g).lines[0], REASON_TEXT.wachtwoord);
    assert.ok(L.view(g).wachtwoord, 'een verkeerd wachtwoord: het veld staat er weer');
    assert.ok(L.view(g).buttons.some((b) => b.act === 'probeer'), 'opnieuw proberen');
    g = L.reduce(g, { t: 'probeer' });
    assert.equal(g.step, 'gast-typt'); assert.equal(g.wachtwoord, 'zomer', 'het woord blijft staan');
    return `max ${L.WACHTWOORD_MAX} tekens`;
  });

  klaar = true;
} finally {
  for (const g of gasten) { try { await g.stop(); } catch (e) { /* al weg */ } }
  await host.stop();
}
assert.ok(klaar);
console.log(`nodehost_test: ${n}/${n} ok`);
process.exit(0);
