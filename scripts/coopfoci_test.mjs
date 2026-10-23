// Samen spelen, spelers uit elkaar (#429): het focus-register (game/js/coopfoci.js), de tegels rond meer foci (tilestore.js prefetch),
// de band van de gastheer (coopnet.js bandFiguren, bandMetgezel) en het eerlijk delen van het snapshot (coopworld.js).
//   node scripts/coopfoci_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const F = await import('../game/js/coopfoci.js');
const { TileStore, MemorySource } = await import('../game/js/tilestore.js');
const { tileKey, tileIndexOf, tileOrigin } = await import('../game/js/gdt.js');
const N = await import('../game/js/coopnet.js');
const W = await import('../game/js/coopworld.js');

let n = 0;
const t = async (naam, f) => { await f(); n++; console.log('ok  ' + naam); };
const reg = (...p) => { const r = F.maakRegister(); p.forEach(([slot, x, y]) => F.zetPlek(r, slot, x, y)); return r; };

await t('spelers bij elkaar delen een focus; de gastheer blijft focus 0 op zijn plek', () => {
  const i = F.bouwFoci({ x: 0, y: 0 }, reg([1, 40, 0], [2, -60, 30]));
  assert.equal(i.foci.length, 1);
  assert.deepEqual(i.foci[0].slots, [0, 1, 2]);
  assert.deepEqual([i.foci[0].x, i.foci[0].y], [0, 0]);
  assert.deepEqual([...i.bediend].sort(), [0, 1, 2]);
});
await t('een groep ver weg krijgt een eigen focus op zijn midden', () => {
  const i = F.bouwFoci({ x: 0, y: 0 }, reg([1, 5000, 100], [2, 5100, 100], [3, 10, 0]));
  assert.equal(i.foci.length, 2);
  assert.ok(i.foci[0].host && !i.foci[1].host);
  assert.deepEqual(i.foci[1].slots, [1, 2]);
  assert.deepEqual([i.foci[1].x, i.foci[1].y], [5050, 100]);
});
await t('hoogstens FOCI_MAX foci: wie er niet meer bij kan valt buiten (oude band)', () => {
  const r = reg([1, 3000, 0], [2, 6000, 0], [3, 9000, 0], [4, 12000, 0]);
  const i = F.bouwFoci({ x: 0, y: 0 }, r, { max: 3 });
  assert.equal(i.foci.length, 3);
  assert.deepEqual([...i.buiten].sort(), [3, 4]);
  assert.ok(i.bediend.has(1) && i.bediend.has(2) && !i.bediend.has(3));
});
await t('verder dan de maximale afstand is buiten bereik', () => {
  const i = F.bouwFoci({ x: 0, y: 0 }, reg([1, 2500, 0], [2, 3500, 0]), { maxAfstand: 3000 });
  assert.ok(i.bediend.has(1) && i.buiten.has(2));
});
await t('zonder gastheerpositie geen foci; een slecht getal komt niet in het register', () => {
  assert.equal(F.bouwFoci(null, reg([1, 1, 1])).foci.length, 0);
  const r = F.maakRegister(); assert.equal(F.zetPlek(r, 1, NaN, 0), false); assert.equal(r.plekken.size, 0);
  F.zetPlek(r, 1, 1, 1); F.haalWeg(r, 1); assert.equal(r.plekken.size, 0);
});
await t('het totaalbudget: een speler alleen krijgt alles, meer foci delen anderhalf keer zoveel', () => {
  assert.equal(F.aandeel(1), 1);
  for (const k of [2, 3, 4]) assert.ok(Math.abs(k * F.aandeel(k) - F.TOTAAL_BEVOLKING) < 1e-9 || F.aandeel(k) === 1);
  assert.ok(F.aandeel(3) < F.aandeel(2));
});
await t('losBesluit: uit, geen focus, te ver, ongeladen, ok', () => {
  const bediend = new Set([0, 2]);
  assert.equal(F.losBesluit({ aan: false, slot: 2, bediend, dHost: 500 }).ok, false);
  assert.equal(F.losBesluit({ aan: true, slot: 3, bediend, dHost: 500 }).reden, 'geen-focus');
  assert.equal(F.losBesluit({ aan: true, slot: 2, bediend, dHost: 4000, maxAfstand: 3000 }).reden, 'te-ver');
  const w = F.losBesluit({ aan: true, slot: 2, bediend, dHost: 500, geladen: false });
  assert.ok(w.ok && w.wacht);
  const ok = F.losBesluit({ aan: true, slot: 2, bediend, dHost: 500 });
  assert.ok(ok.ok && !ok.wacht);
});
await t('minAfstand: de dichtstbijzijnde focus', () => {
  assert.equal(F.minAfstand([{ x: 0, y: 0 }, { x: 1000, y: 0 }], 900, 0), 100);
  assert.equal(F.minAfstand([], 3, 4, { x: 0, y: 0 }), 5);
});

// ---- de tegels
const TILES = 40, RAW = 1e5;
const index = { packs: { p: { file: 'p.gdp' } }, tiles: {}, pins: {} };
for (let i = 0; i < TILES; i++) for (let j = 0; j < 3; j++) index.tiles[tileKey(i, j)] = { i, j, pack: 'p', off: i, len: 1, raw: RAW };
const mkStore = () => new TileStore({ source: new MemorySource({ 'p.gdp': new Uint8Array(TILES + 1) }), index, decode: async (b, meta) => ({ i: meta.i, j: meta.j, sections: [] }) });
await t('prefetch met foci: de wensenlijst is de unie van de gastheer en de losse groep', () => {
  const [ox, oy] = tileOrigin(2, 1);
  const alleen = mkStore().prefetch(ox + 500, oy + 500, { radius: 600 });
  const [fx] = tileOrigin(30, 1);
  const unie = mkStore().prefetch(ox + 500, oy + 500, { radius: 600, foci: [{ x: fx + 500, y: oy + 500, radius: 600 }] });
  const dichtbij = [...unie.keys()].filter((k) => alleen.has(k));
  assert.equal(dichtbij.length, alleen.size, 'alles rond de gastheer blijft gewenst');
  const ver = [...unie.keys()].filter((k) => !alleen.has(k));
  assert.ok(ver.length >= 1, 'er komen tegels bij');
  assert.ok(unie.has(tileKey(30, 1)), 'de tegel van de losse groep staat erbij');
});
await t('het aantal tegels blijft begrensd: gastheer met straal 1500 en twee groepen met straal 800', () => {
  const s = mkStore();
  const [ox, oy] = tileOrigin(2, 1);
  const w1 = s.prefetch(ox + 500, oy + 500, { radius: 1500 }).size;
  const w3 = mkStore().prefetch(ox + 500, oy + 500, { radius: 1500, foci: [{ x: tileOrigin(15, 1)[0] + 500, y: oy + 500, radius: 800 }, { x: tileOrigin(30, 1)[0] + 500, y: oy + 500, radius: 800 }] }).size;
  assert.ok(w3 <= w1 + 2 * 9, `${w3} tegels bij ${w1} voor een speler`);
});
await t('een store zonder foci doet precies wat hij deed', () => {
  const a = mkStore().prefetch(2500, 1500, { radius: 900 }), b = mkStore().prefetch(2500, 1500, { radius: 900, foci: [] });
  assert.deepEqual([...a.entries()], [...b.entries()]);
});

// ---- de band
const { figuurVrij } = await import('../game/js/companion.js');
const mkHost = (figs, extra = {}) => ({
  player: { x: 0, y: 0, gz: 0 }, messages: [], coopFigures: figs, 
  coopMeld(slot, tekst) { this.messages.push([slot, tekst]); }, coopVrij: () => true, ...extra,
});
const zetFoci = (w) => { const r = F.maakRegister(); for (const f of Object.values(w.coopFigures)) F.zetPlek(r, f.slot, f.x, f.y); w.coopFociInfo = F.bouwFoci(w.player, r); };
const stap = (w, secs, dt = 0.1) => { for (let i = 0; i < secs / dt; i++) { zetFoci(w); N.bandFiguren(w, dt); } };

await t('een speler 900 m weg met een geladen wereld blijft staan en krijgt geen waarschuwing', () => {
  const f = { slot: 2, x: 900, y: 0, vx: 0, vy: 0 };
  const w = mkHost({ 2: f });
  stap(w, 3 * N.FIGUUR_TERUG_S);
  assert.equal(f.x, 900, 'niet teruggezet');
  const tekst = w.messages.map((m) => m[1]).join(' ');
  assert.ok(!/Blijf bij de groep/.test(tekst) && !/teruggezet/.test(tekst), tekst);
  assert.match(tekst, /Druk op B/, 'een keer: zo kom je bij de groep');
  assert.equal(w.messages.filter((m) => /Druk op B/.test(m[1])).length, 1);
});
await t('de wereld daar is nog niet geladen: hij wacht en wordt na ONGELADEN_S bij de groep gezet', () => {
  const f = { slot: 2, x: 900, y: 0, vx: 3, vy: 0 };
  const w = mkHost({ 2: f }, { map: { store: { index: { tiles: { [tileKey(...tileIndexOf(900, 0))]: {} } } }, resident: new Set() } });
  stap(w, 1);
  assert.equal(f.wacht, true); assert.equal(f.vx, 0);
  assert.match(w.messages.map((m) => m[1]).join(' '), /geladen/);
  stap(w, F.ONGELADEN_S + 1);
  assert.ok(Math.hypot(f.x, f.y) < 3, 'na te lang wachten terug: ' + f.x);
  assert.equal(f.wacht, false);
});
await t('met meer groepen dan FOCI_MAX: wie geen focus krijgt kan niet los en krijgt een duidelijke melding, daarna terug bij de groep', () => {
  const figs = {};
  for (let k = 2; k < F.FOCI_MAX + 4; k++) figs[k] = { slot: k, x: 3000 * k, y: 0, vx: 0, vy: 0 };
  const w = mkHost(figs);
  stap(w, 1);
  const laatste = figs[F.FOCI_MAX + 3];
  assert.ok(w.messages.some((m) => m[0] === laatste.slot && /Te veel groepen/.test(m[1])), JSON.stringify(w.messages.slice(-2)));
  stap(w, N.FIGUUR_TERUG_S + 1);
  assert.equal(figs[2].x, 6000); assert.ok(Math.hypot(laatste.x, laatste.y) < 3);
});
await t('de detailstraal per groep krimpt met het aantal foci', () => {
  assert.ok(F.tegelStraal(2) > F.tegelStraal(3) || F.tegelStraal(2) >= F.tegelStraal(3));
  assert.ok(F.tegelStraal(8) < F.tegelStraal(2));
  assert.equal(F.tegelFoci([{ host: true, x: 0, y: 0 }, { x: 5, y: 5 }]).length, 1);
});
await t('bandMetgezel (Tessa) volgt dezelfde regels', () => {
  const c = { x: 900, y: 0, vx: 0, vy: 0, state: 'ok' };
  const w = mkHost({}, { companion: c, coop: { remote: true } });
  const r = F.maakRegister(); F.zetPlek(r, 1, c.x, c.y); w.coopFociInfo = F.bouwFoci(w.player, r);
  for (let i = 0; i < 100; i++) N.bandMetgezel(w, 0.1);
  assert.equal(c.x, 900);
  w.coopFociInfo = null; // geen focus: de oude band
  for (let i = 0; i < 100; i++) N.bandMetgezel(w, 0.1);
  assert.ok(Math.hypot(c.x, c.y) < 3);
});
await t('B: bijGroepHost zet een gast naast de gastheer, ook met uitelkaar uit', () => {
  const f = { slot: 2, x: 900, y: 0, vx: 2, vy: 0 };
  const w = mkHost({ 2: f }, { coopNet: { role: 'host' } });
  assert.equal(N.bijGroepHost(w, 2), true);
  assert.ok(Math.hypot(f.x, f.y) < 3);
  assert.match(w.messages.at(-1)[1], /bij de groep/);
  assert.equal(N.bijGroepHost(w, 9), false);
});

// ---- het snapshot
await t('het snapshot deelt eerlijk: twee groepen ver uit elkaar krijgen elk een deel van de voertuigen', () => {
  const veh = (id, x, y) => ({ id, x, y, angle: 0, speed: 0, model: { len: 4 } });
  const world = { vehicles: [] };
  for (let i = 0; i < 100; i++) world.vehicles.push(veh(i + 1, i, 0)); // drukke stad bij (0, 0)
  for (let i = 0; i < 10; i++) world.vehicles.push(veh(1000 + i, 5000 + i * 3, 0)); // rustig Delfzijl
  const bij = [{ x: 0, y: 0 }, { x: 5000, y: 0 }];
  const e = W.verzamelEntiteiten(world, bij);
  assert.equal(e.length, W.MAX_ENTITEITEN);
  const stad = e.filter((x) => x.x < 1000).length, ver = e.filter((x) => x.x > 4000).length;
  assert.equal(ver, 10, 'alle voertuigen rond de tweede groep zijn er');
  assert.equal(stad, W.MAX_ENTITEITEN - 10);
  const een = W.verzamelEntiteiten(world, [{ x: 0, y: 0 }]);
  assert.deepEqual(een.map((x) => x.id), world.vehicles.slice(0, 60).map((v) => v.id), 'een groep: de volgorde van altijd');
  assert.equal(W.groepenVan([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 5000, y: 0 }]).n, 2);
});
await t('de snapshot-gegevens passen in de codec (PROTO en CODEC_VERSION blijven 2)', async () => {
  const { PROTO } = await import('../game/js/net/session.js');
  const { CODEC_VERSION } = await import('../game/js/net/codec.js');
  assert.equal(PROTO, 2); assert.equal(CODEC_VERSION, 2);
});

console.log(`coopfoci_test: ${n} ok`);
