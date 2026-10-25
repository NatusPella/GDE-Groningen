// Dedicated server (#450): de koploze gastheer van scripts/coop/nodehost.mjs als echt proces, zonder venster en zonder
// Electron. Twee nep-gasten (scripts/coop/mockclient.mjs) verbinden over ECHTE TCP met dezelfde coopcore.cjs en dezelfde
// hub als de app. Dekt: de wereld zonder speler (geen plek 0 in de snapshot, elke gast een eigen figuur), de klok die
// doorloopt, kicken, verbieden (het token komt er niet meer in) en een wachtwoord per sessie.
//   node scripts/nodehost_test.mjs
import assert from 'node:assert/strict';
import { startKoplozeHost } from './coop/nodehost.mjs';
import { startMockGuest } from './coop/mockclient.mjs';

let n = 0;
const t = async (name, f) => { const r = await f(); n++; if (r) console.log(`  ${name}: ${r}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, what) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(50); } throw new Error('time-out: ' + what); };

const host = await startKoplozeHost({ max: 4, localIp: '127.0.0.1', upnp: false });
const gasten = [];
let klaar = false;
const gast = async (opts = {}) => { const g = await startMockGuest({ code: host.code, net: { latency: 0.02 }, ...opts }); gasten.push(g); return g; };

try {
  await t('de koploze gastheer start zonder venster en twee nep-gasten spelen mee', async () => {
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

  klaar = true;
} finally {
  for (const g of gasten) { try { await g.stop(); } catch (e) { /* al weg */ } }
  await host.stop();
}
assert.ok(klaar);
console.log(`nodehost_test: ${n}/${n} ok`);
process.exit(0);
