// Dedicated server (#450): de koploze gastheer van scripts/coop/nodehost.mjs als echt proces, zonder venster en zonder
// Electron. Twee nep-gasten (scripts/coop/mockclient.mjs) verbinden over ECHTE TCP met dezelfde coopcore.cjs en dezelfde
// hub als de app. Dekt: de wereld zonder speler (geen plek 0 in de snapshot, elke gast een eigen figuur), de klok die
// doorloopt, kicken, verbieden (het token komt er niet meer in), een wachtwoord per sessie, een vaste poort (en de nette
// fout als die bezet is), starten zonder document/window, een ontbrekende wereld of spelerslijst, de wereldstaat die een
// herstart overleeft (en een half geschreven bestand dat terugvalt), het beheer/CLI-scherm (status, spelers, kicken met
// vier gasten tegelijk) en het wachtwoordveld in de lobby (game/js/lobby.js): leeg is open, gevuld vraagt erom.
//   node scripts/nodehost_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startKoplozeHost, beheerTekst } from './coop/nodehost.mjs';
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

  await t('de wereldstaat overleeft een herstart: klok, tijd, weer en missie staan terug', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-wereldstaat-'));
    const staatPad = path.join(dir, 'wereldstaat.json');
    try {
      // eerste run: de wereld verstrijkt en de host bewaart de staat bij het stoppen
      const h1 = await startKoplozeHost({ port: await vrijePoort(), localIp: '127.0.0.1', upnp: false, staatPad, clock: 9 });
      h1.world.clock = 21.25; h1.world.time = 4321.5; h1.world.wanted = 3;
      h1.world.weatherState = { kind: 'regen', t: 7 };
      h1.world.mission = { phase: 'active', id: 'M01' };
      await h1.stop();
      assert.ok(fs.existsSync(staatPad), 'de staat staat in het bestand na het stoppen');
      const tekst = fs.readFileSync(staatPad, 'utf8');
      assert.match(tekst, /"clock": 21\.25/, 'het bestand noemt de klok: ' + tekst.slice(0, 80));
      // tweede run: dezelfde staat komt terug, met de klok en het weer zoals ze waren
      const h2 = await startKoplozeHost({ port: await vrijePoort(), localIp: '127.0.0.1', upnp: false, staatPad });
      try {
        assert.ok(Math.abs(h2.world.clock - 21.25) < 0.1, 'de klok staat terug: ' + h2.world.clock);
        assert.ok(Math.abs(h2.world.time - 4321.5) < 0.2, 'de speeltijd staat terug: ' + h2.world.time);
        assert.equal(h2.world.wanted, 3, 'de wanted-staat staat terug');
        assert.deepEqual(h2.world.weatherState, { kind: 'regen', t: 7 }, 'het weer staat terug');
        assert.equal(h2.world.mission.phase, 'active', 'de missiefase staat terug');
        assert.equal(h2.world.mission.id, 'M01', 'de missie-id staat terug');
        assert.equal(h2.world.player, null, 'de herstarte host heeft nog steeds geen speler');
      } finally { await h2.stop(); }
      // een half geschreven bestand: geen crash, de host begint met een nieuwe wereld
      fs.writeFileSync(staatPad, '{"clock": 1');
      const h3 = await startKoplozeHost({ port: await vrijePoort(), localIp: '127.0.0.1', upnp: false, staatPad, clock: 7 });
      try {
        assert.ok(h3.world.clock >= 7 && h3.world.clock < 8, 'een kapot bestand valt terug op de nieuwe wereld: ' + h3.world.clock);
        assert.notEqual(h3.world.mission && h3.world.mission.phase, 'active', 'geen missie uit het kapotte bestand');
      } finally { await h3.stop(); }
      return 'klok, tijd, weer en missie terug; kapot bestand valt terug';
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
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

  await t('vier gasten: de host telt ze, het beheer/CLI-scherm toont status en spelers, kicken houdt de rest over', async () => {
    const h = await startKoplozeHost({ port: await vrijePoort(), localIp: '127.0.0.1', upnp: false, max: 6 });
    const vier = [];
    try {
      for (let i = 0; i < 4; i++) {
        const g = await startMockGuest({ code: h.code, net: { latency: 0.02 }, seed: 11 + i });
        vier.push(g);
        await until(() => g.session.status === 'ok', 8000, 'gast ' + (i + 1));
      }
      const slots = h.spelers().map((r) => r.slot).sort((a, b) => a - b);
      assert.deepEqual(slots, [1, 2, 3, 4], 'vier plekken naast de server');
      const status = beheerTekst(h.beheer());
      assert.ok(status.includes('Spelers: 4 van 6'), status.join(' | '));
      assert.ok(status.some((regel) => /plek 4:/.test(regel)), 'het scherm noemt plek 4');
      assert.ok(status.some((regel) => /plek 1:/.test(regel)));
      assert.ok(status.some((regel) => regel.startsWith('Wereld: klok ')), 'en de wereldstand');
      // een gast wegsturen: de rest blijft en de telling zakt
      assert.equal(h.kick(4), true, 'plek 4 is weggestuurd');
      await until(() => h.spelers().length === 3, 5000, 'drie spelers over');
      assert.ok(beheerTekst(h.beheer()).includes('Spelers: 3 van 6'));
      assert.equal(h.spelers().some((r) => r.slot === 4), false);
      return 'vier gasten, status en kick';
    } finally {
      for (const g of vier) { try { await g.stop(); } catch (e) { /* al weg */ } }
      await h.stop();
    }
  });

  klaar = true;
} finally {
  for (const g of gasten) { try { await g.stop(); } catch (e) { /* al weg */ } }
  await host.stop();
}
assert.ok(klaar);
console.log(`nodehost_test: ${n}/${n} ok`);
process.exit(0);
