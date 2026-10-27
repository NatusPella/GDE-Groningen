// Per-groep wereldstaat voor bijbanen (#492): één register met een eigen dienst per speler (plek 0 = de host).
// Twee contexten voor twee eigenaren, elk met een eigen voertuig en doel; het einde van de een laat de ander lopen.
// De contexten zelf worden hier nagebootst met dezelfde stappen als sidejobs.js (zetten, per frame, wissen); de bron
// van sidejobs.js, coopbijbaan.js, sidejobkit.js en coopbestuur.js wordt gecontroleerd op de koppeling.
// Onderaan draait de echte sidejobs.js (met een nepbaan) tegen een echte host-sessie: de echte completeRound betaalt
// de host die meedoet aan de baan van een gast, de host die N zei krijgt niets, en een gast stopt zijn eigen baan.
// sidejobs.js laadt three van een CDN: met scripts/node3d.mjs is het in Node te importeren.
//   node scripts/sidejobcontext_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const S = await import('../game/js/sidejobs.js'); // het echte modulebestand laadt (en maakt zijn register)
const { maakContextregister, removeVehicle } = await import('../game/js/sidejobkit.js');
const CB = await import('../game/js/coopbestuur.js');
const N = await import('../game/js/coopnet.js');
const B = await import('../game/js/coopbijbaan.js');
const WED = await import('../game/js/coopwedstrijd.js');
const MISSIE = await import('../game/js/coopmissie.js');
const LL = await import('../game/js/loopbaanlive.js');
const MQ = await import('../game/js/missionquery.js');
const { vakVanBaan } = await import('../game/js/loopbaan.js');
const { createLink } = await import('../game/js/net/memtransport.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
// coopwedstrijd3d tekent een uitnodigingskaartje in de hud; in Node is er geen body, dus een lege.
if (!document.body) document.body = document.createElement('div');

// Precies wat sidejobs.js in endShift doet: de dienst is klaar en zijn eigen plek gaat uit het register.
const beeindig = (reg, c) => { c.ended = true; reg.wis(c); };
const maakContext = (owner, id, doel) => ({ owner, job: { id }, vehicle: { id: `voertuig-${owner}`, jobOwner: owner }, data: { goal: doel }, ended: false, round: 0 });

// ------------------------------------------------------------------ het register: twee eigenaren naast elkaar
t('twee contexten voor twee eigenaren: elk een eigen voertuig en doel, en de host op plek 0', () => {
  const reg = maakContextregister();
  const host = maakContext(0, 'krantenwijk', 'De eerste bushalte');
  const gast = maakContext(2, 'taxi', 'Klant bij de Poelestraat');
  reg.zet(host); reg.zet(gast);
  assert.equal(reg.size, 2);
  assert.equal(reg.van(0), host); assert.equal(reg.van(2), gast);
  assert.equal(reg.van(1), null, 'een plek zonder dienst is leeg');
  assert.notEqual(host.vehicle, gast.vehicle, 'elk een eigen voertuig');
  assert.equal(host.vehicle.id, 'voertuig-0'); assert.equal(gast.vehicle.id, 'voertuig-2');
  assert.equal(gast.vehicle.jobOwner, 2, 'het voertuig hoort bij de gast');
  assert.notEqual(host.data.goal, gast.data.goal, 'elk een eigen doel');
  assert.deepEqual(reg.lijst().map((c) => c.owner).sort(), [0, 2]);
});

t('het einde van de een laat de ander lopen: eigen voertuig, doel, ronde en timer blijven staan', () => {
  const reg = maakContextregister();
  const host = maakContext(0, 'krantenwijk', 'De eerste bushalte');
  const gast = maakContext(2, 'taxi', 'Klant bij de Poelestraat');
  host.timeLeft = 42; gast.timeLeft = 80; gast.round = 3;
  reg.zet(host); reg.zet(gast);
  beeindig(reg, host);
  assert.equal(host.ended, true);
  assert.equal(reg.van(0), null, 'de dienst van de host is weg');
  assert.equal(reg.van(2), gast, 'de gast staat er nog');
  assert.equal(gast.ended, false);
  assert.equal(gast.timeLeft, 80); assert.equal(gast.round, 3);
  assert.equal(gast.vehicle.id, 'voertuig-2'); assert.equal(gast.data.goal, 'Klant bij de Poelestraat');
  assert.equal(reg.size, 1);
});

t('een oude, al afgeronde dienst wist de nieuwe van dezelfde speler niet (opnieuw beginnen)', () => {
  const reg = maakContextregister();
  const oud = maakContext(2, 'taxi', 'oude klant');
  const nieuw = maakContext(2, 'taxi', 'nieuwe klant');
  reg.zet(oud); reg.zet(nieuw);
  assert.equal(reg.van(2), nieuw);
  reg.wis(oud); // een late afronding van de oude dienst
  assert.equal(reg.van(2), nieuw, 'de nieuwe dienst blijft staan');
  assert.equal(nieuw.ended, false);
});

t('een onbruikbare eigenaar telt niet mee en leegmaken ruimt alles op', () => {
  const reg = maakContextregister();
  assert.equal(reg.zet(null), null);
  assert.equal(reg.zet({ owner: -1 }), null);
  assert.equal(reg.zet({ owner: 1.5 }), null);
  assert.equal(reg.size, 0);
  reg.zet(maakContext(0, 'taxi', 'a')); reg.zet(maakContext(3, 'taxi', 'b'));
  assert.equal(reg.size, 2);
  reg.leeg();
  assert.equal(reg.size, 0); assert.equal(reg.van(0), null); assert.equal(reg.van(3), null);
});

// ------------------------------------------------------------------ het baanvoertuig
t('removeVehicle haalt een leenvoertuig weg, maar laat het voertuig van een besturende gast staan', () => {
  const vrij = { id: 'vrij' };
  const wereld = { vehicles: [vrij] };
  removeVehicle(wereld, vrij);
  assert.deepEqual(wereld.vehicles, [], 'zonder bestuurder gaat hij weg');
  const vanGast = { id: 'job-2', jobOwner: 2, coopBestuurder: 2 };
  const w2 = { vehicles: [vanGast] };
  removeVehicle(w2, vanGast);
  assert.deepEqual(w2.vehicles, [vanGast], 'de gast zit erin: niet onder hem vandaan halen');
});

t('een gast mag zijn eigen baanvoertuig besturen, een ander niet; de oude weigering van een opdrachtauto blijft', () => {
  const eigen = { missionCar: true, sideJob: true, jobOwner: 2 };
  assert.equal(CB.magBesturen(eigen, 2), true, 'de eigenaar bestuurt zijn eigen baanvoertuig');
  assert.equal(CB.magBesturen(eigen, 1), false, 'een ander komt er niet mee weg');
  assert.equal(CB.magBesturen({ missionCar: true, sideJob: true }, 1), false, 'zonder jobOwner blijft een opdrachtauto verboden');
  const bus = { missionCar: true, sideJob: true, jobOwner: 3, isBus: true };
  assert.equal(CB.magBesturen(bus, 3), true, 'de eigenaar mag ook zijn eigen busbaanvoertuig besturen');
  assert.equal(CB.weigerReden(eigen, 1), 'niet');
});

// ------------------------------------------------------------------ de koppeling in de bron
t('sidejobs.js: een register per eigenaar, een eigen wereld en invoer voor een gast, elke context per frame', () => {
  const sj = bron('sidejobs.js');
  assert.match(sj, /const contexts = maakContextregister\(\)/, 'het register in plaats van één ctx');
  assert.match(sj, /let ctx = null;/, 'de host blijft de alias');
  assert.match(sj, /contexts\.zet\(c\);[\s\S]*if \(owner === 0\) ctx = c;/, 'zetten en de alias voor de host');
  assert.match(sj, /contexts\.wis\(c\);[\s\S]*if \(owner === 0\) ctx = null;/, 'wissen en de alias leegmaken');
  assert.match(sj, /function makeCtx\(job, spot, owner = 0, cw = null\)/);
  assert.match(sj, /owner, world: w, job, spot,/, 'de context kent zijn eigenaar en wereld');
  assert.match(sj, /function startJob\(job, takeover = null, owner = 0, cw = null\)/);
  assert.match(sj, /const cw = Object\.create\(w\)/);
  assert.match(sj, /cw\.player = spelerBeeld\(lichaamVan\(w, slot\)\)/); assert.match(sj, /function spelerBeeld\(l\)/); assert.match(sj, /if \(k === 'inVehicle'\) return t\.inVehicle \|\| t\.inVeh \|\| null;/, 'een figuur (plek 2 en hoger) zit in inVeh; de baan vraagt naar inVehicle'); assert.match(sj, /cw\.input = invoerVoor\(w, slot\)/);
  assert.match(sj, /startJob\(job, null, slot, gastWereld\(world, slot\)\)/, 'een gast start zijn eigen baan');
  assert.match(sj, /function updateContext\(dt, w, c\)/); assert.match(sj, /if \(!checkVehicle\(dt, c\)\) return;/);
  assert.match(sj, /c\.timeLeft -= dt;[\s\S]*c\.job\.round\(c\)[\s\S]*c\.job\.update\(dt, c\)/, 'timer, ronde en update per context');
  assert.match(sj, /for \(const c of lijst\) \{[\s\S]*updateContext\(dt, w, c\)/, 'updateSideJobs loopt over alle contexten');
  assert.match(sj, /const p = hoofdspeler\(c\.world\)/, 'checkVehicle kijkt naar het lichaam van die speler');
  assert.match(sj, /world\.coopSideJobs/, 'de stand van een gastenbaan gaat naar coopbijbaan.js');
  assert.match(sj, /world\.coopBijbaanAantal\(owner\)/); assert.match(sj, /world\.coopBijbaanEind\(kind, owner\)/);
});

t('coopbijbaan.js: n.bijbanen per eigenaar, n.bijbaan als alias, een eigen doel en beloning per plek', () => {
  const b = bron('coopbijbaan.js');
  assert.match(b, /export function maakBijbaan\(owner = 0\)/);
  assert.match(b, /export function bijbaanStaat\(n, owner = 0\)/);
  assert.match(b, /if \(s === 0\) n\.bijbaan = n\.bijbanen\[0\];/, 'de host blijft de alias');
  assert.match(b, /export function staatVan\(n, owner = 0\)/);
  assert.match(b, /export function bijbaanStart\(world, id, label, starter = null, owner = null\)/);
  assert.match(b, /export function bijbaanBeloning\(world, id, basis, vak = null, xp = 0, ronde = null, owner = 0\)/);
  assert.match(b, /export function bijbaanEind\(world, kind = 'ok', owner = 0\)/);
  assert.match(b, /const e = eindEvent\(kind, st\.owner \| 0\);[\s\S]*if \(!owner\) for \(const s of verbondenGasten/, 'het einde van de host gaat naar iedereen, dat van een gast alleen naar hem');
  assert.match(b, /function doelPubliek\(world, st\)[\s\S]*return st\.owner > 0 \? \[st\.owner\] : \[\];/, 'een gast ziet alleen zijn eigen doel');
  assert.match(b, /if \(actief\(eigen\)\) \{[\s\S]*stopVoor\(slot\)/, 'wie wegvalt stopt zijn eigen baan');
});

t('sidejobkit.js en coopnet.js: het baanvoertuig weet van wie het is en de haken geven de eigenaar door', () => {
  const kit = bron('sidejobkit.js');
  assert.match(kit, /const car = kind !== 'bike';/);
  assert.match(kit, /v\.jobOwner = Number\.isInteger\(world\.sideJobOwner\)/, 'spawnJobVehicle zet jobOwner');
  assert.match(kit, /boat\.jobOwner = Number\.isInteger\(world\.sideJobOwner\)/, 'spawnJobBoat zet jobOwner');
  assert.match(kit, /Number\.isInteger\(v\.coopBestuurder\)/, 'removeVehicle beschermt de bestuurder');
  const cb = bron('coopbestuur.js');
  assert.match(cb, /if \(Number\.isInteger\(v\.jobOwner\)\) return v\.jobOwner === slot \? null : 'niet'/);
  assert.match(cb, /!Number\.isInteger\(v\.jobOwner\)/, 'het eigen baanvoertuig meenemen is geen diefstal');
  const net = bron('coopnet.js');
  assert.match(net, /world\.coopBijbaanStart = \(id, label, starter, owner\) => bijbaanStart/);
  assert.match(net, /world\.coopBijbaanBeloning = \(id, basis, vak, xp, ronde, owner\) => bijbaanBeloning/);
  assert.match(net, /world\.coopBijbaanEind = \(kind, owner\) => bijbaanEind/);
  assert.match(net, /world\.coopBijbaanHelpers = \(owner\) => bijbaanHelpers\(world, owner\)/, 'de helpers van de eigen baan van een gast');
  assert.match(net, /world\.sideJobActions\.stopGasten\(\)/, 'de banen van de gasten stoppen met de groep');
});

// ------------------------------------------------------------------ de echte sidejobs.js tegen een echte host-sessie
// Een nepbaan doet wat een baanmodule doet (starten, een ronde, een doel), maar haalt geen three van een CDN.
const NEPBAAN = {
  id: 'taxi', name: 'Grunn Taxi', color: '#ff9a3c', glyph: 'taxi', boss: 'Centrale', blurb: 'Testbaan.', tagline: 'Testrit',
  intro: ['Welkom'], noIntro: true,
  start: () => true, round: () => {}, update: () => {}, stop: () => {}, needsVehicle: () => false,
  view: () => ({ marker: { x: 3, y: 4 }, goal: { label: 'Testdoel', desc: 'test' } }),
};
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0], consume: (k) => s.delete(k) }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), vehicles: [], ...extra });
LL.zetProfielVoorTest(null, (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })()); // nooit naar de echte opslag

function sessie(gasten = 2) {
  const hw = mkWorld(), gs = [];
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  }
  const step = (secs) => { for (let k = 0; k < Math.round(60 * secs); k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step };
}

t('de echte completeRound betaalt de host die meedoet aan de baan van een gast, en de gast via de beloning', () => {
  const s = sessie(2); s.step(2);
  const hw = s.hw, g1 = s.gs[0].gw;
  S.updateSideJobs(0, hw); // de wereld van de echte sidejobs.js
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 1), true, 'de gast start zijn eigen baan');
  assert.equal(hw.coopSideJobs[1].active, true, 'de gast ziet zijn eigen doel');
  assert.equal(B.bijbaanHostAntwoord(hw, true, 1), true, 'de host doet mee');
  const voor = hw.money;
  assert.equal(S.rondSideJobVoorTest(1, { base: 60 }), true);
  assert.ok(hw.money > voor, 'de host kreeg zijn loon voor de ronde van de gast: ' + hw.money);
  assert.ok(LL.getProfiel().vakken[vakVanBaan('taxi')].xp >= 10, 'de host kreeg de loopbaanpunten');
  s.step(1);
  assert.ok(g1.money > 0, 'de gast kreeg zijn eigen beloning');
  assert.ok(hw.coopNet.betaald[1] > 0, 'de gast is betaald via de bestaande beloningsweg');
  assert.equal(S.quitSideJob(1), true);
  s.step(0.5);
  assert.equal(hw.coopSideJobs[1], undefined, 'na het einde is de stand van de gast weg');
  assert.equal(B.actief(hw.coopNet.bijbanen[1]), false);
});

t('de host die N zei krijgt geen loon; de baan van de andere gast blijft lopen', () => {
  const s = sessie(2); s.step(2); S.updateSideJobs(0, s.hw);
  const hw = s.hw;
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 1), true);
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 2), true);
  assert.equal(B.bijbaanHostAntwoord(hw, false, 1), true, 'de host doet niet mee aan de eerste baan');
  const voor = hw.money;
  assert.equal(S.rondSideJobVoorTest(1, { base: 60 }), true);
  assert.equal(hw.money, voor, 'geen loon voor de host bij N');
  assert.equal(S.quitSideJob(1), true);
  s.step(0.5);
  assert.equal(hw.coopSideJobs[1], undefined);
  assert.equal(hw.coopSideJobs[2] && hw.coopSideJobs[2].active, true, 'de tweede baan loopt door');
  assert.equal(B.actief(hw.coopNet.bijbanen[2]), true);
  assert.equal(hw.coopNet.bijbanen[1].id, null);
  S.quitSideJob(2);
});

t('de echte ronde van de host betaalt één keer (geen dubbel loon)', () => {
  const s = sessie(1); s.step(2); S.updateSideJobs(0, s.hw);
  const hw = s.hw;
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 0), true, 'de host start zelf');
  const voor = hw.money;
  assert.equal(S.rondSideJobVoorTest(0, { base: 60 }), true);
  const delta = hw.money - voor;
  assert.ok(delta >= 60 && delta < 150, 'ongeveer één ronde loon, niet twee: ' + delta);
  assert.equal(S.quitSideJob(0), true);
});

t('een gast stopt zijn eigen baan via de bestaande weg; de baan van de andere gast blijft lopen', () => {
  const s = sessie(2); s.step(2); S.updateSideJobs(0, s.hw);
  const hw = s.hw, g1 = s.gs[0].gw;
  hw.sideJobActions = { stopVoor: (slot) => S.quitSideJob(slot) }; // dezelfde haak als initSideJobs zet (#492)
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 1), true);
  s.step(0.5); // de uitnodiging van de eerste baan komt bij de tweede gast aan
  s.gs[1].gw.coopBijbaanGast = null; // hij laat die schieten (zoals E bij zijn eigen startpunt doet)
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 2), true);
  s.step(0.5);
  assert.equal(B.bijbaanGastStop(g1), true, 'de gast stuurt Stoppen');
  s.step(1);
  assert.equal(hw.coopSideJobs[1], undefined, 'zijn eigen baan is gestopt');
  assert.equal(B.actief(hw.coopNet.bijbanen[1]), false);
  assert.equal(hw.coopSideJobs[2] && hw.coopSideJobs[2].active, true, 'de andere baan loopt door');
  assert.equal(B.actief(hw.coopNet.bijbanen[2]), true);
  assert.equal(B.bijbaanGastStop(s.gs[1].gw), true, 'de tweede gast stopt daarna zijn eigen baan');
  s.step(0.5);
  assert.equal(hw.coopSideJobs[2], undefined);
});

t('een gastenbaan houdt een wedstrijd en een opdracht tegen (de bestaande poort)', () => {
  const s = sessie(1); s.step(2);
  const hw = s.hw;
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 1), true);
  assert.equal(WED.verzoekBlok(hw), WED.WED_TEKST.bijbaan, 'geen wedstrijd naast een gastenbaan');
  assert.equal(MISSIE.verzoekBlok(hw), MISSIE.MISSIE_TEKST.bijbaan, 'geen opdracht naast een gastenbaan');
  assert.equal(S.quitSideJob(1), true);
  assert.equal(WED.verzoekBlok(hw), null, 'zonder baan is de poort weer open');
  assert.equal(MISSIE.verzoekBlok(hw), null);
});

t('een opdracht die begint stopt de eigen baan van een gast, met een melding', () => {
  const s = sessie(1); s.step(2); S.updateSideJobs(0, s.hw);
  const hw = s.hw;
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 1), true);
  assert.ok(hw.coopSideJobs[1], 'de gastenbaan loopt');
  MQ.registerMissionQueries({ isMissionActive: () => true });
  try { S.updateSideJobs(0.1, hw); } finally { MQ.registerMissionQueries({ isMissionActive: () => false }); }
  assert.equal(hw.coopSideJobs[1], undefined, 'de gastenbaan is gestopt');
  assert.equal(B.actief(hw.coopNet.bijbanen[1]), false);
  s.step(0.5);
  assert.ok(s.gs[0].gw.messages.some((m) => /missie tussen/.test(m)), 'de gast hoort waarom: ' + JSON.stringify(s.gs[0].gw.messages));
});

t('de host wordt niet uitgenodigd voor een gastenbaan als hij zelf al werkt', () => {
  const s = sessie(1); s.step(2); S.updateSideJobs(0, s.hw);
  const hw = s.hw;
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 0), true, 'de host werkt al');
  assert.equal(S.startSideJobVoorTest(NEPBAAN, 1), true, 'de gast begint zijn eigen baan');
  assert.equal(hw.coopNet.bijbanen[1].keuze[0], 'nee', 'de host telt meteen als nee');
  assert.equal(Object.values(hw.coopNet.bijbanen[1].keuze).includes('wacht'), false, 'geen wachtende uitnodiging voor de host');
  assert.equal(B.bijbaanHostMee(hw, 1), false);
  S.quitSideJob(1); S.quitSideJob(0);
});

console.log(`sidejobcontext_test: ${n} tests ok`);
