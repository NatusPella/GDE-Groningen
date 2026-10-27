// Samen spelen (#492): twee gasten doen tegelijk een verschillende bijbaan, elk met een eigen wereldstaat
// (coopbijbaan.js n.bijbanen per plek). Twee gasten starten twee verschillende banen; twee staten, onafhankelijke
// doelen en beloningen, en het stoppen (of wegvallen) van de een laat de ander doorlopen.
// De banen zelf laden three van een CDN en zijn niet in Node te importeren: een nep-loper (nepBanen) doet wat
// sidejobs.js doet (starten per eigenaar, het doel publiceren in world.coopSideJobs, een ronde afronden met
// dezelfde beloningsregels, het einde per eigenaar) en de bron wordt gecontroleerd.
//   node scripts/coop/bijbaanparallel_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import * as B from '../../game/js/coopbijbaan.js';
import * as LL from '../../game/js/loopbaanlive.js';
import { vakVanBaan } from '../../game/js/loopbaan.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const bron = (p) => fs.readFileSync(new URL('../../game/js/' + p, import.meta.url), 'utf8');
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0], consume: (k) => s.delete(k) }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const tekstIn = (w, re) => w.messages.some((m) => re.test(m));
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
LL.zetProfielVoorTest(null, nepOpslag()); // nooit naar de echte opslag

// een sessie: host en `gasten` gasten, elk met eigen wereld en eigen link
function sessie(gasten = 1) {
  const hw = mkWorld(), gs = [];
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  const sluit = (i) => {
    const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    const g = { gw, link }; gs.push(g); return g;
  };
  for (let i = 0; i < gasten; i++) sluit(i);
  const step = (secs, f) => { for (let k = 0; k < Math.round(60 * secs); k++) { if (f) f(k); N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step, sluit };
}

// De nep-loper met een wereldstaat per eigenaar: dezelfde haken als sidejobs.js (start, doel publiceren,
// ronde afronden met de beloning per eigenaar, einde per eigenaar), met een eigen voertuig en doel per baan.
const NAMEN = { taxi: 'Grunn Taxi', krantenwijk: 'Krantenwijk', bezorger: 'Hap & Rap bezorger', vracht: 'Hunze Vrachtvervoer' };
const DOEL = { taxi: { x: 100, y: 0 }, krantenwijk: { x: 220, y: 40 }, bezorger: { x: 100, y: 0 }, vracht: { x: 10, y: 0 } };
const leeg = () => ({ active: false, id: null, label: '', marker: null, dots: [], progress: '', timeLeft: null, goal: null, help: false });

function nepBanen(w, { spot = null } = {}) {
  const ctxs = new Map(); // plek -> de eigen wereldstaat van die speler
  const pubs = w.coopSideJobs = {};
  const pub = w.sideJob = leeg();
  const publiceren = (c) => {
    const p = c.owner ? (pubs[c.owner] || (pubs[c.owner] = leeg())) : pub;
    Object.assign(p, { active: true, id: c.id, label: NAMEN[c.id], marker: DOEL[c.id], progress: `Klus ${c.streak + 1}`, timeLeft: 90, goal: { label: `Doel van ${NAMEN[c.id]}`, desc: 'test' }, help: false });
    return p;
  };
  const wissen = () => { Object.assign(pub, leeg()); for (const k of Object.keys(pubs)) if (!ctxs.has(+k)) delete pubs[k]; };
  const loper = {
    start(id, owner = 0) {
      if (ctxs.has(owner)) return false;
      const c = { owner, id, round: 0, streak: 0, verdiend: 0, vehicle: { id: `voertuig-${owner}-${id}`, jobOwner: owner } };
      ctxs.set(owner, c);
      if (w.coopBijbaanStart) w.coopBijbaanStart(id, NAMEN[id], owner > 0 ? owner : null, owner);
      publiceren(c);
      return true;
    },
    ctx: (owner = 0) => ctxs.get(owner) || null,
    aantal: () => ctxs.size,
    complete(owner, base = 60, xp = 10) { // = completeRound in sidejobs.js
      const c = ctxs.get(owner); if (!c) return false;
      const vak = vakVanBaan(c.id);
      if (!owner) w.money += base; // de eigenaar van de baan is de host; een gastenbaan betaalt via de beloning (#492)
      const gedeeld = w.coopBijbaanBeloning ? w.coopBijbaanBeloning(c.id, base, vak, xp, c.round, owner) : false;
      c.verdiend += base; c.streak++; c.round++; publiceren(c);
      return gedeeld;
    },
    eind(owner = 0, kind = 'quit') {
      const c = ctxs.get(owner); if (!c) return false;
      ctxs.delete(owner); wissen();
      if (w.coopBijbaanEind) w.coopBijbaanEind(kind, owner);
      return true;
    },
  };
  w.sideJobActions = {
    startVoor: (id, slot) => { const ok = loper.start(id, slot); return { ok, reden: ok ? '' : 'Je bent al aan het werk' }; },
    stopVoor: (slot) => loper.eind(slot, 'quit'),
    activeVoor: (slot) => !!loper.ctx(slot),
    pubVoor: (slot) => (slot ? pubs[slot] : pub) || null,
    spotBij: () => spot,
    helperActie: () => false,
  };
  return loper;
}

// bij beide partijen een nep-loper; elke gast ziet zijn eigen startpunt
const opzet = (gasten, spots) => {
  const s = sessie(gasten); s.step(2);
  const host = nepBanen(s.hw);
  const lopers = s.gs.map((g, i) => nepBanen(g.gw, { spot: spots[i] }));
  return { ...s, host, lopers };
};
const drukE = (g, A) => { g.input.s.add('e'); return A.bijbaanGastE(g); };
const geld = (s) => s.gs.map((g) => g.gw.money);

// ------------------------------------------------------------------ de pure toestand per eigenaar
t('twee staten naast elkaar: n.bijbanen per plek, n.bijbaan blijft de host, elke staat zijn eigen ronde en beloning', () => {
  const n2 = {};
  const a = B.bijbaanStaat(n2, 1), b = B.bijbaanStaat(n2, 2), h = B.bijbaanStaat(n2, 0);
  assert.notEqual(a, b); assert.notEqual(a, h); assert.equal(n2.bijbaan, h, 'de host blijft de alias voor plek 0');
  assert.equal(a.owner, 1); assert.equal(b.owner, 2); assert.equal(h.owner, 0);
  B.beginBijbaan(a, 'taxi', 'Grunn Taxi', [1, 2], 1, 'Tessa');
  B.beginBijbaan(b, 'krantenwijk', 'Krantenwijk', [1, 2], 2, 'Tessa');
  assert.equal(a.id, 'taxi'); assert.equal(b.id, 'krantenwijk');
  assert.equal(a.keuze[1], 'ja'); assert.equal(b.keuze[2], 'ja');
  assert.equal(B.actief(h), false, 'de host deed niet mee');
  const v = new Set([1, 2]);
  const ra = B.beloningBijbaan(a, v, { basis: 60, ronde: 0 });
  const rb = B.beloningBijbaan(b, v, { basis: 50, ronde: 0 });
  assert.deepEqual(ra.map((x) => [x.slot, x.geld]), [[1, 60]], 'alleen de eigenaar van baan A');
  assert.deepEqual(rb.map((x) => [x.slot, x.geld]), [[2, 50]], 'alleen de eigenaar van baan B');
  assert.notEqual(ra[0].id, rb[0].id, 'elke baan heeft zijn eigen gebeurtenis-id');
  B.eindeBijbaan(a);
  assert.equal(B.actief(a), false); assert.equal(B.actief(b), true, 'het einde van de een laat de ander lopen');
  B.eindeBijbaan(b);
});

// ------------------------------------------------------------------ twee gasten, twee banen
t('twee gasten starten twee verschillende banen: twee staten, twee eigen voertuigen en doelen, de host ziet zijn eigen (lege) baan', () => {
  const s = opzet(2, [{ id: 'taxi', name: 'Grunn Taxi' }, { id: 'krantenwijk', name: 'Krantenwijk' }]);
  const [a, b] = s.gs.map((g) => g.gw);
  assert.equal(drukE(a, B), true); s.step(1.5);
  assert.equal(s.host.ctx(1).id, 'taxi', 'de eerste gast doet de taxi');
  assert.equal(a.sideJob.active, true); assert.equal(a.sideJob.id, 'taxi');
  assert.deepEqual(a.sideJob.marker, DOEL.taxi, 'de gast ziet het doel van zijn eigen baan');
  assert.equal(b.sideJob.active, false, 'de tweede gast ziet de baan van de eerste niet als de zijne');
  assert.equal(drukE(b, B), true); s.step(1.5);
  assert.equal(s.host.ctx(2).id, 'krantenwijk', 'de tweede gast doet de krantenwijk');
  assert.equal(s.host.ctx(1).id, 'taxi', 'de eerste baan loopt door');
  assert.notEqual(s.host.ctx(1).vehicle, s.host.ctx(2).vehicle, 'elk een eigen voertuig');
  assert.equal(s.host.ctx(1).vehicle.jobOwner, 1); assert.equal(s.host.ctx(2).vehicle.jobOwner, 2);
  assert.equal(b.sideJob.active, true); assert.equal(b.sideJob.id, 'krantenwijk');
  assert.deepEqual(b.sideJob.marker, DOEL.krantenwijk, 'de tweede ziet zijn eigen doel');
  assert.deepEqual(a.sideJob.marker, DOEL.taxi, 'en de eerste houdt het zijne');
  assert.equal(a.sideJob.goal.label, 'Doel van Grunn Taxi'); assert.equal(b.sideJob.goal.label, 'Doel van Krantenwijk');
  const n2 = s.hw.coopNet;
  assert.equal(n2.bijbanen[1].id, 'taxi'); assert.equal(n2.bijbanen[2].id, 'krantenwijk');
  assert.equal(n2.bijbaan, n2.bijbanen[0]); assert.equal(B.actief(n2.bijbaan), false, 'de host deed zelf niet mee');
  assert.equal(s.hw.sideJob.active, false, 'de host ziet zijn eigen baan, niet die van een gast');
});

t('twee gasten: elke baan betaalt zijn eigen ronde aan zijn eigen speler, zonder de ander te raken', () => {
  const s = opzet(2, [{ id: 'taxi', name: 'Grunn Taxi' }, { id: 'krantenwijk', name: 'Krantenwijk' }]);
  const [a, b] = s.gs.map((g) => g.gw);
  drukE(a, B); s.step(1); drukE(b, B); s.step(1);
  assert.equal(s.host.complete(1, 60, 10), true, 'de baan van de eerste gast is gedeeld');
  s.step(1);
  const ea = geld(s)[0], eb = geld(s)[1];
  assert.ok(ea > 0, 'de eerste gast kreeg zijn loon: ' + ea);
  assert.equal(eb, 0, 'de tweede kreeg niets van de baan van de eerste');
  assert.equal(s.hw.money, 0, 'de host deed niet mee aan de baan van de gast');
  assert.ok(LL.getProfiel().vakken[vakVanBaan('taxi')].xp >= 10, 'de loopbaanpunten van de eerste gast');
  assert.equal(s.host.complete(2, 50, 8), true);
  s.step(1);
  const ebNa = geld(s)[1];
  assert.equal(geld(s)[0], ea, 'het loon van de eerste bleef staan');
  assert.ok(ebNa > 0, 'de tweede kreeg zijn eigen loon: ' + ebNa);
  assert.ok(ea !== ebNa, 'twee eigen bedragen, geen gedeelde pot');
  s.host.complete(1, 60, 10); s.step(1); // een volgende ronde van de eerste
  assert.equal(geld(s)[0], ea * 2, 'elke ronde opnieuw het volle bedrag, alleen voor de eerste');
  assert.equal(geld(s)[1], ebNa, 'de tweede bleef op zijn eigen bedrag');
});

t('stoppen: de een zet zijn dienst stop, de ander loopt gewoon door en houdt zijn doel, voertuig en loon', () => {
  const s = opzet(2, [{ id: 'taxi', name: 'Grunn Taxi' }, { id: 'krantenwijk', name: 'Krantenwijk' }]);
  const [a, b] = s.gs.map((g) => g.gw);
  drukE(a, B); s.step(1); drukE(b, B); s.step(1);
  s.host.complete(1, 60, 10); s.host.complete(2, 50, 8); s.step(1);
  const [ea, eb] = geld(s); assert.ok(ea > 0 && eb > 0);
  assert.equal(s.host.eind(1, 'quit'), true);
  s.step(1);
  assert.equal(a.sideJob.active, false, 'de baan van de eerste gast is klaar');
  assert.ok(tekstIn(a, /De baan is gestopt/), 'de eerste gast hoort het: ' + JSON.stringify(a.messages));
  assert.equal(s.host.ctx(1), null); assert.equal(s.hw.coopNet.bijbanen[1].id, null, 'zijn staat is opgeruimd');
  assert.equal(b.sideJob.active, true, 'de tweede ziet zijn baan nog');
  assert.deepEqual(b.sideJob.marker, DOEL.krantenwijk);
  assert.ok(s.host.ctx(2) && s.host.ctx(2).vehicle, 'het voertuig van de tweede staat er nog');
  assert.equal(s.host.complete(2, 50, 8), true); s.step(1);
  assert.ok(geld(s)[1] > eb, 'de tweede verdient gewoon door');
  assert.equal(geld(s)[0], ea, 'de eerste kreeg na het stoppen niets meer');
});

t('de host start zelf een baan terwijl een gast zijn eigen baan doet: twee doelen, en het einde van de host raakt de gast niet', () => {
  const s = opzet(1, [{ id: 'krantenwijk', name: 'Krantenwijk' }]);
  const g = s.gs[0].gw;
  assert.equal(s.host.start('taxi', 0), true, 'de host begint de taxi');
  s.step(1);
  assert.equal(g.sideJob.id, 'taxi', 'de gast kijkt mee met de baan van de host');
  assert.equal(drukE(g, B), true, 'de gast begint zijn eigen krantenwijk');
  s.step(1.5);
  assert.equal(s.host.ctx(1).id, 'krantenwijk');
  assert.equal(s.host.ctx(0).id, 'taxi', 'de baan van de host loopt door');
  assert.equal(s.hw.sideJob.id, 'taxi', 'de host ziet zijn eigen baan');
  assert.equal(g.sideJob.id, 'krantenwijk', 'de gast ziet nu zijn eigen baan, niet meer die van de host');
  s.host.complete(0, 70, 10); s.step(1);
  assert.equal(s.hw.money, 70, 'de host kreeg zijn eigen loon');
  assert.equal(g.money, 0, 'de gast kreeg niets van de baan van de host (hij deed niet mee)');
  s.host.complete(1, 50, 8); s.step(1);
  assert.ok(g.money > 0, 'de gast kreeg zijn eigen loon');
  const gm = g.money;
  s.host.eind(0, 'ok'); s.step(1);
  assert.equal(s.hw.sideJob.active, false, 'de baan van de host is klaar');
  assert.equal(g.sideJob.active, true, 'de gast houdt zijn eigen baan');
  assert.equal(g.sideJob.id, 'krantenwijk');
  assert.equal(g.money, gm, 'het einde van de host raakt het loon van de gast niet');
  assert.equal(s.host.complete(1, 50, 8), true); s.step(1);
  assert.ok(g.money > gm, 'de gast verdient door na het einde van de host');
});

t('wegvallen: de eigen baan van een gast stopt als hij weggaat, de baan van de ander loopt door', () => {
  const s = opzet(2, [{ id: 'taxi', name: 'Grunn Taxi' }, { id: 'krantenwijk', name: 'Krantenwijk' }]);
  const a = s.gs[0].gw;
  drukE(a, B); s.step(1); drukE(s.gs[1].gw, B); s.step(1);
  assert.ok(s.host.ctx(1) && s.host.ctx(2));
  s.gs[1].link.cut(); s.step(12);
  assert.equal(s.host.ctx(2), null, 'de eigen baan van wie wegviel is gestopt');
  assert.equal(s.hw.coopNet.bijbanen[2].id, null);
  assert.equal(s.host.ctx(1).id, 'taxi', 'de baan van de ander loopt door');
  assert.equal(s.hw.coopNet.bijbanen[1].id, 'taxi');
  assert.equal(s.host.complete(1, 60, 10), true); s.step(1);
  assert.ok(a.money > 0, 'de overgebleven gast wordt gewoon betaald');
});

t('een gast stopt zijn eigen baan via het net; de andere baan loopt door', () => {
  const s = opzet(2, [{ id: 'taxi', name: 'Grunn Taxi' }, { id: 'krantenwijk', name: 'Krantenwijk' }]);
  const [a, b] = s.gs.map((g) => g.gw);
  drukE(a, B); s.step(1); drukE(b, B); s.step(1);
  s.host.complete(1, 60, 10); s.host.complete(2, 50, 8); s.step(1);
  const [ea, eb] = geld(s); assert.ok(ea > 0 && eb > 0);
  assert.equal(B.bijbaanGastStop(a), true, 'de gast stuurt Stoppen');
  s.step(1);
  assert.equal(s.host.ctx(1), null, 'zijn eigen baan is gestopt');
  assert.equal(s.hw.coopNet.bijbanen[1].id, null);
  assert.equal(a.sideJob.active, false, 'en zijn scherm is leeg');
  assert.equal(s.host.ctx(2).id, 'krantenwijk', 'de baan van de ander loopt door');
  assert.equal(b.sideJob.active, true);
  assert.equal(s.host.complete(2, 50, 8), true); s.step(1);
  assert.ok(geld(s)[1] > eb, 'de ander verdient gewoon door');
  assert.equal(geld(s)[0], ea, 'de gestopte gast kreeg niets meer');
});

t('één J beantwoordt maar één wachtende gastenbaan', () => {
  const s = opzet(2, [{ id: 'taxi', name: 'Grunn Taxi' }, { id: 'krantenwijk', name: 'Krantenwijk' }]);
  drukE(s.gs[0].gw, B); s.step(1); drukE(s.gs[1].gw, B); s.step(1);
  const wacht = () => [s.hw.coopNet.bijbanen[1], s.hw.coopNet.bijbanen[2]].filter((st) => st.keuze[0] === 'wacht').length;
  const klaar = () => [s.hw.coopNet.bijbanen[1], s.hw.coopNet.bijbanen[2]].filter((st) => st.keuze[0] === 'ja').length;
  assert.equal(wacht(), 2, 'beide gastenbanen wachten op de host');
  s.hw.input.s.add('j'); s.step(0.2);
  assert.equal(wacht(), 1, 'één toets heeft één baan beantwoord');
  assert.equal(klaar(), 1);
  s.hw.input.s.add('j'); s.step(0.2);
  assert.equal(wacht(), 0, 'de tweede J beantwoordt de tweede baan');
  assert.equal(klaar(), 2);
});

// ------------------------------------------------------------------ de bron
t('de haken in de bron: een register per eigenaar in sidejobs.js, een eigen wereld en invoer voor een gast, een eigen baanvoertuig', () => {
  const sj = bron('sidejobs.js');
  assert.match(sj, /const contexts = maakContextregister\(\)/, 'een register in plaats van één ctx');
  assert.match(sj, /contexts\.zet\(c\)/); assert.match(sj, /contexts\.wis\(c\)/); assert.match(sj, /for \(const c of lijst\) \{/, 'elke context per frame');
  assert.match(sj, /function makeCtx\(job, spot, owner = 0, cw = null\)/);
  assert.match(sj, /function startJob\(job, takeover = null, owner = 0, cw = null\)/);
  assert.match(sj, /startJob\(job, null, slot, gastWereld\(world, slot\)\)/, 'een gast start zijn eigen baan');
  assert.match(sj, /const cw = Object\.create\(w\)/); assert.match(sj, /cw\.player = spelerBeeld\(lichaamVan\(w, slot\)\)/); assert.match(sj, /cw\.input = invoerVoor\(w, slot\)/);
  assert.match(sj, /world\.coopSideJobs/, 'de stand van een gastenbaan gaat naar coopbijbaan.js');
  assert.match(sj, /stopVoor: \(slot\) => quitSideJob\(slot\)/);
  const kit = bron('sidejobkit.js');
  assert.match(kit, /v\.jobOwner = Number\.isInteger\(world\.sideJobOwner\)/, 'een baanvoertuig weet van wie het is');
  assert.match(kit, /boat\.jobOwner = Number\.isInteger\(world\.sideJobOwner\)/);
  assert.match(kit, /Number\.isInteger\(v\.coopBestuurder\)/, 'removeVehicle laat het voertuig van een besturende gast staan');
  const cb = bron('coopbestuur.js');
  assert.match(cb, /if \(Number\.isInteger\(v\.jobOwner\)\) return v\.jobOwner === slot \? null : 'niet'/, 'je eigen baanvoertuig mag je besturen, andermans niet');
  const net = bron('coopnet.js');
  assert.match(net, /world\.coopBijbaanAantal = \(owner\) => bijbaanAantal\(world, owner\)/);
  assert.match(net, /world\.coopBijbaanHelpers = \(owner\) => bijbaanHelpers\(world, owner\)/);
});

console.log(`bijbaanparallel_test: ${n} tests ok`);
