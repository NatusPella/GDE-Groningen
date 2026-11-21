// De testbankstap 'bezit' (suite 'alles'), zonder Electron: de functie bezitAlles uit scripts/coop/coop.page.js draait voor host, gast en gast2 met nepmodules over een gedeelde
// nepbus en een virtuele klok; de keuring (bezitstap_check.mjs) moet nul fouten geven, en een kapotte uitkomst moet fouten geven. Daarnaast broncontroles van de haken.
//   node scripts/coop/bezitstap_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { keurBezitStap } from './bezitstap_check.mjs';

let n = 0, fails = 0;
const t = async (name, fn) => { n++; try { await fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const page = fs.readFileSync(new URL('./coop.page.js', import.meta.url), 'utf8');
const bank = fs.readFileSync(new URL('./testbank.mjs', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// de functie uit de paginascript halen
const a = page.indexOf('// BEZIT-STAP-BEGIN'), b = page.indexOf('// BEZIT-STAP-END');
assert.ok(a > 0 && b > a, 'markeringen in coop.page.js');
const bezitAlles = new Function(page.slice(a, b) + '\nreturn bezitAlles;')();

// ---- de nepwereld: drie vensters, een bus, een virtuele klok ----
function maakNepSessie({ stuk = null } = {}) {
  const bus = { spots: new Map(), work: [] };      // plek -> naam van de eigenaar; wie meewerkte bij wie
  const klok = { now: 0, wacht: [] };
  const sleep = (ms) => new Promise((r) => klok.wacht.push({ at: klok.now + ms, r }));
  const slot = { host: 0, gast: 1, gast2: 2 };
  const vensters = {};
  for (const me of ['host', 'gast', 'gast2']) {
    const S = { gw: { work: {} }, ev: { mods: [] } };
    const w = { money: 100, bezitNet: { net: { claims: {
      mineSpots: () => [...bus.spots].filter(([, o]) => o === me).map(([s]) => s),
      listSpots: () => [...bus.spots].filter(([, o]) => o !== me).map(([s, o]) => ({ spot: s, name: o })),
    } } } };
    const SL = {
      buyVan: () => ({ ok: true }),
      koopVergunning: (ww, spot) => { if (stuk === 'claim' && me === 'gast') return { ok: true }; bus.spots.set(spot, me); ww.money -= 500; return { ok: true }; },
      placeVan: () => ({ ok: true }),
      workAlong: (ww, spot, uren) => {
        const owner = bus.spots.get(spot); if (!owner || owner === me) return { ok: false, why: 'geen-claim' };
        ww.money += uren * 14; if (stuk !== 'werk') { vensters[owner].S.gw.work[spot] = 5; vensters[owner].S.ev.mods.push({ k: 'omzet', mult: 1.08 }); }
        return { ok: true };
      },
    };
    const mods = { snacklive: SL, bezitlive: { snackState: () => S, calToday: () => 5 }, bezitnet: { sessionTransport: () => ({}), ensureBezitNet: () => {} }, bezitgate: { setGateProgress() {} }, snackstory: { setSnackFlagProvider() {} } };
    vensters[me] = { w, S, mods, slot: slot[me] };
  }
  const draai = async (me) => bezitAlles({ me, imp: async (f) => vensters[me].mods[f], sleep, W: () => vensters[me].w, wait: 5000 });
  const loop = async (promises) => {
    let klaar = false; Promise.all(promises).then(() => { klaar = true; });
    for (let i = 0; i < 1000 && !klaar; i++) {
      await new Promise((r) => setImmediate(r));
      if (klaar) break;
      if (klok.wacht.length) { klok.wacht.sort((x, y) => x.at - y.at); const e = klok.wacht.shift(); klok.now = e.at; e.r(); }
    }
    assert.ok(klaar, 'de stap bleef hangen');
  };
  return { vensters, draai, loop, bus };
}
const speel = async (opts) => { const s = maakNepSessie(opts); const ps = ['host', 'gast', 'gast2'].map((me) => s.draai(me)); await s.loop(ps); const [host, gast, gast2] = await Promise.all(ps); return { E: { host, gast, gast2 }, s }; };

await t('de stap: host en gast kopen verschillend, zien elkaars plekken, gast2 werkt mee en de eigenaar krijgt de bonus; de keuring geeft nul fouten', async () => {
  const { E, s } = await speel();
  assert.deepEqual(E.host.claims.eigen, ['park']); assert.deepEqual(E.gast.claims.eigen, ['dorp']); assert.deepEqual(E.gast2.claims.eigen, []);
  assert.ok(E.host.claims.anderen.includes('dorp:gast')); assert.ok(E.gast.claims.anderen.includes('park:host'));
  assert.equal(E.gast2.werk.ok, true); assert.equal(E.gast2.loon, 84);
  assert.equal(E.host.bonus.werkDag, 5); assert.equal(E.host.bonus.mod, true);
  assert.deepEqual(keurBezitStap(E), []);
  assert.ok(s.vensters.gast.w.money < 60000, 'de gast betaalde zelf');
});
await t('de keuring ziet een gebroken uitkomst: geen claim van de gast, geen werk, geen bonus', async () => {
  let r = await speel({ stuk: 'claim' }); assert.ok(keurBezitStap(r.E).length >= 2, JSON.stringify(keurBezitStap(r.E)));
  r = await speel({ stuk: 'werk' }); assert.ok(keurBezitStap(r.E).some((x) => /verkoopbonus/.test(x)));
  assert.ok(keurBezitStap({ host: { claims: { eigen: [], anderen: [] }, bonus: null }, gast: null, gast2: null }).length >= 2);
  assert.deepEqual(keurBezitStap({ host: null, gast: null, gast2: null }), [], 'wat niet gelogd is, keurt de aanroeper');
  assert.deepEqual(keurBezitStap({ host: { skip: true }, gast: { fout: 'x' }, gast2: { skip: true } }), []);
});
await t('zonder sessie slaat de stap zich over en gooit niet', async () => {
  const r = await bezitAlles({ me: 'host', imp: async () => ({ setGateProgress() {}, setSnackFlagProvider() {}, sessionTransport: () => null, ensureBezitNet() {} }), sleep: async () => {}, W: () => ({ money: 1 }), wait: 1 });
  assert.equal(r.skip, true);
});
await t('de pagina-script is syntactisch een geldige asynchrone body en de stap hangt aan allesstap (broncontrole)', () => {
  assert.doesNotThrow(() => new AsyncFunction(page));
  assert.match(page, /stap === 'bezit'/); assert.match(page, /await bezitAlles\(\{ me: CFG\.name/);
  assert.ok(!/Object\.keys\(B\)\.slice/.test(page), 'de stap logt niet meer alleen exports');
});
await t('de testbank plant de langere stap in en keurt hem met keurBezitStap', () => {
  assert.match(bank, /stap: 'bezit', s: 14/); assert.match(bank, /import \{ keurBezitStap \} from '\.\/bezitstap_check\.mjs'/); assert.match(bank, /keurBezitStap\(E3\)/);
  // de volgende stappen staan achter de bezitstap: 40 + 14 + marge
  assert.match(bank, /\[58, 'gastwinkel'/);
});
await t('main.js, snacklive.js en bezitnet.js bieden wat de stap aanroept', () => {
  const sl = fs.readFileSync(new URL('../../game/js/snacklive.js', import.meta.url), 'utf8');
  for (const f of ['buyVan', 'koopVergunning', 'placeVan', 'workAlong']) assert.match(sl, new RegExp(`export function ${f}\\(`));
  const nt = fs.readFileSync(new URL('../../game/js/bezitnet.js', import.meta.url), 'utf8');
  for (const f of ['sessionTransport', 'ensureBezitNet', 'sendSnackWork']) assert.match(nt, new RegExp(`export function ${f}\\(`));
});
console.log(`bezitstap_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
