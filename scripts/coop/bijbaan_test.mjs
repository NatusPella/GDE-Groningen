// Samen spelen (#452): bijbanen samen doen (game/js/coopbijbaan.js). Taxi, bezorgen, de krantenwijk en de vrachtrit einde-tot-einde met
// een host en gasten op een nep-wereld per speler, over een geheugentransport met de echte koppeling (coopnet.js, hub, sessies). De banen
// zelf laden three van een CDN en zijn niet in Node te importeren: een nep-loper (nepBanen) doet wat sidejobs.js doet (start, doel
// publiceren, ronde afronden met dezelfde regels voor de beloning, einde) en de vier banen gebruiken dezelfde haken; de bron wordt gecontroleerd.
//   node scripts/coop/bijbaan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import * as B from '../../game/js/coopbijbaan.js';
import * as G from '../../game/js/coopgast.js';
import * as CB from '../../game/js/coopbestuur.js';
import * as LL from '../../game/js/loopbaanlive.js';
import { vakVanBaan } from '../../game/js/loopbaan.js';
import { helpLaadTijd } from '../../game/js/vrachtmarkt.js';

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

// De nep-loper: dezelfde haken als sidejobs.js (startJob, completeRound, endShift, publish, sideJobActions), met de regels van de vier banen in het klein.
//  taxi: het ophalen en afzetten doet de host zelf. bezorger: ophalen en afgeven door wie bij de deur staat (afstandNaast). krantenwijk: de stapel is gedeeld.
//  vracht: de host rijdt; de bijrijder helpt met E bij laden en lossen (dezelfde pure stap als in vrachtmarkt.js), bij de truck.
const NAMEN = { taxi: 'Grunn Taxi', bezorger: 'Hap & Rap bezorger', krantenwijk: 'Krantenwijk', vracht: 'Hunze Vrachtvervoer', bus: 'Streekbus' };
const DEUR = { x: 100, y: 0 }, KLANT = { x: 200, y: 0 }, TRUCK = { x: 10, y: 0 };
function nepBanen(w, { spot = null } = {}) {
  let ctx = null, verzoek = null;
  const pub = w.sideJob = { active: false, id: null, label: '', color: '#ff9a3c', marker: null, dots: [], progress: '', timeLeft: null, goal: null, bus: null, help: false };
  const publish = () => {
    if (!ctx) { Object.assign(pub, { active: false, id: null, label: '', marker: null, progress: '', timeLeft: null, goal: null, help: false }); return; }
    const m = ctx.id === 'vracht' ? TRUCK : ctx.fase === 'ophalen' ? DEUR : KLANT;
    const doel = ctx.id === 'vracht' ? (ctx.fase === 'lossen' ? 'Lossen' : 'Laden bij de oplegger') : ctx.fase === 'ophalen' ? 'Ophalen' : 'Bezorgen';
    const progress = ctx.id === 'vracht' ? `${ctx.fase === 'lossen' ? 'Lossen' : 'Laden'} ${Math.ceil(ctx.fase === 'lossen' ? ctx.losLeft : ctx.laadLeft)} s` : `Klus ${ctx.streak + 1}`;
    Object.assign(pub, { active: true, id: ctx.id, label: NAMEN[ctx.id], marker: { x: m.x, y: m.y }, progress, timeLeft: 90, goal: { label: doel, desc: 'test' }, help: ctx.id === 'vracht' && (ctx.fase === 'laden' || ctx.fase === 'lossen') });
  };
  const loper = {
    start(id, van = null) {
      if (ctx) return false;
      ctx = { id, round: 0, streak: 0, fase: id === 'vracht' ? 'laden' : 'ophalen', stapel: 6, gegooid: [], verdiend: 0, opVerzoek: van != null, laadLeft: 6, losLeft: 4 };
      if (w.coopBijbaanStart) w.coopBijbaanStart(id, NAMEN[id], van);
      publish(); return true;
    },
    ctx: () => ctx,
    complete(base = 60, xp = 10) { // = completeRound in sidejobs.js
      const vak = vakVanBaan(ctx.id), total = base;
      w.money += total;
      const gedeeld = w.coopBijbaanBeloning ? w.coopBijbaanBeloning(ctx.id, base, vak, xp, ctx.round) : false;
      if (!gedeeld && w.coopDeel) w.coopDeel(total, { vak, basis: base, xp });
      ctx.verdiend += total; ctx.streak++; ctx.round++; ctx.fase = ctx.id === 'vracht' ? 'klaar' : 'ophalen'; publish(); // vracht: tussen twee ronden valt er niets te laden
    },
    eind(kind = 'quit') { if (!ctx) return; ctx = null; if (w.coopBijbaanEind) w.coopBijbaanEind(kind); publish(); },
    tik() { // de bezorger: wie bij de deur staat haalt op en geeft af
      if (!ctx || ctx.id !== 'bezorger') return;
      if (ctx.fase === 'ophalen' && B.afstandNaast(w, DEUR.x, DEUR.y) < 4.5) { ctx.fase = 'bezorgen'; publish(); }
      else if (ctx.fase === 'bezorgen' && B.afstandNaast(w, KLANT.x, KLANT.y) < 3.2) loper.complete(40, 8);
    },
  };
  w.sideJobActions = {
    startVoor: (id, slot) => { if (ctx) return { ok: false, reden: 'Je bent al aan het werk' }; verzoek = slot; const ok = loper.start(id, slot); verzoek = null; return { ok, reden: '' }; },
    helperNu: () => !!ctx && ctx.id === 'vracht' && (ctx.fase === 'laden' || ctx.fase === 'lossen'),
    helperActie: (slot, x, y) => { // de krant: elke worp haalt een krant van de gedeelde stapel; de vracht: de bijrijder helpt laden en lossen
      if (!ctx) return false;
      if (ctx.id === 'krantenwijk') {
        if (ctx.stapel <= 0) return false;
        ctx.stapel--; ctx.gegooid.push({ slot, x, y }); if (ctx.stapel === 0) loper.complete(50, 10); return true;
      }
      if (ctx.id === 'vracht') {
        if (ctx.fase !== 'laden' && ctx.fase !== 'lossen') return false;
        if (Math.hypot(x - TRUCK.x, y - TRUCK.y) > 20) return false; // alleen bij de truck
        if (ctx.fase === 'laden') {
          ctx.laadLeft = helpLaadTijd(ctx.laadLeft);
          if (ctx.laadLeft <= 0) ctx.fase = 'lossen';
        } else {
          ctx.losLeft = helpLaadTijd(ctx.losLeft);
          if (ctx.losLeft <= 0) { loper.complete(90, 12); return true; }
        }
        publish(); return true;
      }
      return false;
    },
    spotBij: () => spot,
  };
  return loper;
}

// bij beide partijen de nep-loper en een vaste plek bij het startpunt van de baan
const opzet = (gasten, id = 'taxi') => { const s = sessie(gasten); s.step(2); const lopers = nepBanen(s.hw); for (const g of s.gs) nepBanen(g.gw, { spot: { id, name: NAMEN[id] } }); return { ...s, lopers }; };
const druk = (w, k) => w.input.s.add(k);
const geld = (s) => s.gs.map((g) => g.gw.money);

// ------------------------------------------------------------------ het kader: de regels en de berichten
t('de tabel: taxi, bezorger, krantenwijk en vracht met een rol en een hulptekst; een andere baan is niet gedeeld', () => {
  assert.deepEqual(Object.keys(B.BIJBAAN_REGELS).sort(), ['bezorger', 'krantenwijk', 'taxi', 'vracht']);
  for (const [id, r] of Object.entries(B.BIJBAAN_REGELS)) assert.ok(r.rol.length > 3 && r.hulp.length > 20, id);
  assert.equal(B.bijbaanMetCoop('taxi'), true); assert.equal(B.bijbaanMetCoop('bus'), false); assert.equal(B.bijbaanMetCoop('constructor'), false);
  const alles = JSON.stringify(B.BIJBAAN_REGELS) + [B.BIJBAAN_TEKST.hostStart('A','B'), B.BIJBAAN_TEKST.laat('B'), B.BIJBAAN_TEKST.ja('B','h'), B.BIJBAAN_TEKST.gevraagd('B'), B.BIJBAAN_TEKST.bezig, B.BIJBAAN_TEKST.nee, B.BIJBAAN_TEKST.eindOk].join(' ');
  assert.ok(!/gastheer/i.test(alles), 'in het spel heet het "wie het spel opende", niet "gastheer"');
});
t('de berichten: onzin geeft null, een doel wordt begrensd en gezuiverd', () => {
  assert.equal(B.leesBijbaan(null), null); assert.equal(B.leesBijbaan({ k: 'bijbaan', f: 'rare' }), null); assert.equal(B.leesBijbaan({ k: 'bijbaan', f: 'uit', id: 5 }), null);
  const d = B.leesBijbaan({ k: 'bijbaan', f: 'doel', id: 'taxi', label: 'A<b>' + 'x'.repeat(200), m: [1, NaN], g: ['Goed', 'Desc'], t: -5, c: 'javascript:' });
  assert.equal(d.marker, null, 'een marker met rommel verdwijnt'); assert.ok(d.label.length <= 60 && !d.label.includes('<')); assert.equal(d.timeLeft, 0); assert.equal(d.color, '#ff9a3c');
  assert.equal(B.leesGast({ k: 'bijbaangast', a: 'start', id: 'bus' }), null, 'een gast kan alleen een gedeelde baan vragen');
  assert.deepEqual(B.leesGast({ k: 'bijbaangast', a: 'start', id: 'taxi' }), { a: 'start', id: 'taxi' });
  assert.equal(B.leesGast({ k: 'bijbaangast', a: 'weg' }), null);
});
t('de pure toestand: starter doet mee, geen antwoord is nee, geen late instap, volledige beloning, één keer per ronde', () => {
  const st = B.maakBijbaan(), v = new Set([1, 2, 3]);
  const uit = B.beginBijbaan(st, 'taxi', 'Grunn Taxi', [1, 2, 3], 1, 'Tessa');
  assert.deepEqual(uit.map((u) => u.slot), [2, 3], 'de starter wordt niet gevraagd');
  assert.equal(B.antwoordBijbaan(st, 2, true), true); assert.equal(B.antwoordBijbaan(st, 2, false), false, 'één antwoord per speler');
  B.tikBijbaan(st, B.UITNODIGING_S + 1, v);
  assert.equal(st.keuze[3], 'nee', 'geen antwoord is nee'); assert.equal(B.antwoordBijbaan(st, 3, true), false, 'na de tijd telt een J niet meer');
  assert.deepEqual(B.deelnemers(st, v), [1, 2]);
  const r = B.beloningBijbaan(st, v, { basis: 80, vak: 'vervoer', xp: 10, ronde: 0 });
  assert.deepEqual(r.map((x) => [x.slot, x.geld, x.xp]), [[1, 80, 10], [2, 80, 10]], 'elke meespeler het volle bedrag en alle punten');
  assert.deepEqual(B.beloningBijbaan(st, v, { basis: 80, vak: 'vervoer', xp: 10, ronde: 0 }), [], 'dezelfde ronde nogmaals geeft niets');
  assert.equal(B.beloningBijbaan(st, v, { basis: 80, ronde: 1 })[0].id !== r[0].id, true, 'een volgende ronde heeft een eigen id');
  B.verlaatBijbaan(st, 2);
  assert.deepEqual(B.beloningBijbaan(st, new Set([1]), { basis: 80, ronde: 2 }).map((x) => x.slot), [1], 'wie wegvalt krijgt niets meer');
  assert.deepEqual(B.beloningBijbaan(st, v, { basis: 0, ronde: 5 }), [], 'niets te betalen');
  assert.equal(B.laatBijbaan(st, 9), true, 'een laatkomer kijkt mee'); assert.equal(st.keuze[9], 'nee');
  B.eindeBijbaan(st); assert.deepEqual(B.beloningBijbaan(st, v, { basis: 80, ronde: 7 }), [], 'zonder baan geen beloning');
});

// ------------------------------------------------------------------ taxi: de host start, de gast doet mee als passagier
t('taxi: de host start, de gast krijgt Meedoen?, zegt J, ziet doel en marker en krijgt bij elke rit het volle bedrag in eigen geld en loopbaan', () => {
  const s = opzet(1), g = s.gs[0].gw;
  assert.equal(s.lopers.start('taxi'), true); s.step(1);
  assert.equal(B.bijbaanKaartModel(g).titel, 'Meedoen?', 'de uitnodiging staat op het scherm van de gast');
  assert.match(B.bijbaanKaartModel(g).regels[0], /Grunn Taxi.*passagier/);
  assert.equal(B.bijbaanKaartModel(s.hw).regels.length, 1, 'wie al antwoordde, ziet de host');
  druk(g, 'j'); s.step(1);
  assert.equal(B.bijbaanKaartModel(g), null, 'het kaartje is weg na het antwoord'); assert.ok(tekstIn(g, /Je doet mee met Grunn Taxi/));
  assert.equal(g.sideJob.active, true, 'de gast ziet de baan'); assert.deepEqual(g.sideJob.marker, { x: 100, y: 0 }); assert.equal(g.sideJob.goal.label, 'Ophalen'); assert.equal(g.sideJob.label, 'Grunn Taxi');
  s.lopers.complete(60, 10); s.step(1);
  assert.equal(g.money > 0, true, 'de gast kreeg geld'); const eerste = g.money;
  assert.equal(s.hw.money, 60, 'de host kreeg zijn eigen bedrag');
  assert.ok(eerste >= 60 * 0.5 && eerste <= 60 * 1.5, 'volledig bedrag volgens zijn eigen loonfactor, niet gedeeld door twee: ' + eerste);
  assert.ok(LL.getProfiel().vakken[vakVanBaan('taxi')].xp >= 10, 'alle loopbaanpunten voor de gast');
  assert.equal(g.coopVerdiend, eerste, 'bijgehouden voor de eigen save (checkpoint van de gast)');
  s.lopers.complete(60, 10); s.step(1);
  assert.equal(g.money, eerste * 2, 'elke ronde opnieuw het volle bedrag');
  assert.ok(!tekstIn(g, /Samenwerkbonus/), 'geen samenwerkingsbonus meer');
  s.lopers.eind('quit'); s.step(1);
  assert.equal(g.sideJob.active, false, 'na de baan is het doel weg'); assert.ok(tekstIn(g, /De baan is gestopt/));
});

t('taxi: de gast start zelf (E bij het startpunt): de host start de baan, de gast doet mee zonder te hoeven antwoorden', () => {
  const s = opzet(1), g = s.gs[0].gw, hw = s.hw;
  druk(g, 'e'); // updateGastLokaal draait in het spel; hier de E-tak zelf
  assert.equal(B.bijbaanGastE(g), true); s.step(1.5);
  assert.ok(tekstIn(g, /Je vraagt Grunn Taxi te starten/));
  assert.equal(s.lopers.ctx().id, 'taxi', 'de baan draait op de wereld van de host'); assert.equal(s.lopers.ctx().opVerzoek, true);
  assert.ok(tekstIn(hw, /begon Grunn Taxi/), 'de host leest wie de baan startte');
  assert.equal(g.coopBijbaanGast.deelt, true, 'wie de baan startte doet altijd mee'); assert.equal(B.bijbaanKaartModel(g), null);
  assert.equal(g.sideJob.active, true);
  s.lopers.complete(60, 10); s.step(1); assert.ok(g.money > 0);
  // een tweede verzoek terwijl de baan loopt
  assert.equal(B.bijbaanGastE(g), true); s.step(1); assert.ok(tekstIn(g, /Er loopt al een bijbaan/));
  s.lopers.eind('ok'); s.step(1);
});

t('een baan die niet gedeeld wordt (streekbus) blijft bij de host: geen verzoek, en de beloning loopt via het oude delen', () => {
  const s = sessie(1); s.step(2); const lopers = nepBanen(s.hw); nepBanen(s.gs[0].gw, { spot: { id: 'bus', name: 'Streekbus' } });
  assert.equal(B.bijbaanGastE(s.gs[0].gw), false, 'de gewone melding "Alleen bij wie het spel opende" blijft');
  assert.equal(s.hw.coopBijbaanStart('bus', 'Streekbus', null), false);
  lopers.start('bus'); s.step(1); assert.ok(!(s.gs[0].gw.coopBijbaanGast && s.gs[0].gw.coopBijbaanGast.uitn), 'geen uitnodiging');
  let delen = 0; const oud = s.hw.coopDeel; s.hw.coopDeel = (...a) => { delen++; return oud(...a); };
  lopers.complete(60, 10); assert.equal(delen, 1, 'het oude delen werkt nog voor andere banen');
  lopers.eind('ok');
});

// ------------------------------------------------------------------ meedoen: J, N en niets; geen late instap
t('twee gasten: J doet mee, N en geen antwoord niet; alleen wie meedoet krijgt de beloning', () => {
  const s = opzet(3), [a, b, c] = s.gs.map((x) => x.gw);
  s.lopers.start('taxi'); s.step(1);
  druk(a, 'j'); druk(b, 'n'); s.step(1);
  assert.ok(tekstIn(b, /Je doet niet mee/)); assert.equal(c.coopBijbaanGast.uitn !== null, true, 'wie niet antwoordt blijft de uitnodiging zien tot de tijd om is');
  s.step(B.UITNODIGING_S + 1);
  assert.equal(c.coopBijbaanGast.uitn, null);
  s.lopers.complete(60, 10); s.step(1);
  assert.equal(a.money > 0, true); assert.equal(b.money, 0, 'N: geen beloning'); assert.equal(c.money, 0, 'geen antwoord is nee');
  assert.equal(c.sideJob.active, true, 'wie meekijkt ziet wel waar de baan is');
  assert.equal(c.coopVerdiend || 0, 0);
  druk(c, 'j'); s.step(1); s.lopers.complete(60, 10); s.step(1);
  assert.equal(c.money, 0, 'een late J telt niet: geen late instap halverwege een baan');
  s.lopers.eind('ok'); s.step(1);
});

t('geen late instap: wie aansluit terwijl de baan loopt kijkt mee en krijgt niets; bij de volgende baan doet hij gewoon mee', () => {
  const s = opzet(1);
  s.lopers.start('taxi'); s.step(1); druk(s.gs[0].gw, 'j'); s.step(1);
  const laat = s.sluit(5); nepBanen(laat.gw); s.step(3);
  assert.ok(tekstIn(laat.gw, /loopt al, de volgende doe je mee/), 'een melding: ' + JSON.stringify(laat.gw.messages));
  assert.equal(laat.gw.sideJob.active, true, 'hij ziet wel waar de baan is');
  s.lopers.complete(60, 10); s.step(1);
  assert.ok(s.gs[0].gw.money > 0); assert.equal(laat.gw.money, 0, 'de laatkomer kreeg niets van deze baan');
  s.lopers.eind('ok'); s.step(1);
  s.lopers.start('taxi'); s.step(1); assert.equal(B.bijbaanKaartModel(laat.gw).titel, 'Meedoen?', 'de volgende baan: gewoon uitgenodigd');
  druk(laat.gw, 'j'); s.step(1); s.lopers.complete(60, 10); s.step(1);
  assert.ok(laat.gw.money > 0); s.lopers.eind('ok'); s.step(1);
});

// ------------------------------------------------------------------ wegvallen: niemand verliest iets
t('wegvallen: wat een gast al kreeg blijft van hem, na het wegvallen krijgt hij niets meer, de baan loopt door; dezelfde beloning komt nooit twee keer aan', () => {
  const s = opzet(2), [a, b] = s.gs.map((x) => x.gw);
  s.lopers.start('taxi'); s.step(1); druk(a, 'j'); druk(b, 'j'); s.step(1);
  s.lopers.complete(60, 10); s.step(1);
  const eerste = [a.money, b.money]; assert.ok(eerste[0] > 0 && eerste[1] > 0);
  s.gs[1].link.cut(); s.step(8);
  s.lopers.complete(60, 10); s.step(1);
  assert.equal(b.money, eerste[1], 'wie wegviel houdt wat hij kreeg en krijgt daarna niets'); assert.equal(a.money, eerste[0] * 2, 'de ander speelt gewoon door');
  assert.equal(s.lopers.ctx().streak, 2, 'de baan loopt door voor de host');
  // dezelfde gebeurtenis nogmaals aanbieden (bericht dat twee keer aankomt): één keer geld
  const id = [...s.hw.coopNet.bijbaan.boek.ids()].pop();
  assert.equal(N.handleEvent(a, { k: 'beloning', geld: 60, id }, 0), false, 'de boekhouding van de gast kent deze id al');
  assert.equal(B.bijbaanBeloning(s.hw, 'taxi', 60, 'vervoer', 10, 1), true, 'een ronde die al betaald is');
  s.step(1); assert.equal(a.money, eerste[0] * 2, 'dezelfde ronde nogmaals betaalt niet nogmaals');
  s.lopers.eind('ok');
});
t('een gast die zelf wegging (stopte) telt niet meer mee; de host stopt de baan: iedereen hoort het', () => {
  const s = opzet(2), [a, b] = s.gs.map((x) => x.gw);
  s.lopers.start('taxi'); s.step(1); druk(a, 'j'); druk(b, 'j'); s.step(1);
  N.stopCoopNet(b); s.step(4); assert.equal(b.sideJob.active, false, 'de baan is bij wie stopte opgeruimd');
  s.lopers.complete(60, 10); s.step(1); assert.ok(a.money > 0); assert.equal(b.money, 0);
  s.lopers.eind('fail'); s.step(1); assert.equal(a.sideJob.active, false); assert.ok(tekstIn(a, /De baan is gestopt/));
});

// ------------------------------------------------------------------ bezorgen: de gast als tweede bezorger
t('bezorgen: een gast die bij de zaak en bij de klant staat haalt op en geeft af terwijl de host nergens in de buurt is; beide krijgen het volle bedrag', () => {
  const s = opzet(1, 'bezorger'), g = s.gs[0].gw, hw = s.hw;
  assert.deepEqual(hw.coopHelpers(), []); // geen baan: niemand telt mee
  s.lopers.start('bezorger'); s.step(1); druk(g, 'j'); s.step(1);
  hw.companion.x = 0; hw.companion.y = 0; s.step(0.5);
  assert.equal(B.afstandNaast(hw, DEUR.x, DEUR.y), 100, 'zonder iemand bij de deur telt alleen de host');
  const l = hw.coopHelpers(); assert.equal(l.length, 1); assert.equal(l[0].slot, 1);
  hw.companion.x = DEUR.x + 1; hw.companion.y = 0; s.step(0.5); s.lopers.tik();
  assert.equal(s.lopers.ctx().fase, 'bezorgen', 'de gast haalt de bestelling op');
  assert.equal(g.sideJob.goal.label, 'Ophalen', 'het doel van de gast volgt de host (nog niet bijgewerkt of net)'); s.step(1);
  assert.equal(g.sideJob.goal.label, 'Bezorgen', 'de gast ziet het nieuwe doel');
  hw.companion.x = KLANT.x - 1; s.step(0.5); s.lopers.tik(); s.step(1);
  assert.equal(s.lopers.ctx().streak, 1, 'de gast geeft af: de baan telt de bezorging');
  assert.ok(g.money > 0 && hw.money === 40, 'beide verdienen'); const m1 = g.money;
  s.lopers.complete(40, 8); s.step(1); assert.equal(g.money, m1 * 2, 'volledig bedrag per bezorging');
  s.lopers.eind('ok');
});
t('bezorgen: een gast die de baan niet meedoet (nee) telt niet als bezorger en een gast zonder baan verandert niets', () => {
  const s = opzet(2, 'bezorger'), [a, b] = s.gs.map((x) => x.gw), hw = s.hw;
  s.lopers.start('bezorger'); s.step(1); druk(a, 'j'); druk(b, 'n'); s.step(1);
  hw.companion.x = DEUR.x; hw.companion.y = 0;
  const slots = hw.coopHelpers().map((h) => h.slot);
  assert.ok(!slots.includes(2), 'wie nee zei telt niet mee: ' + JSON.stringify(slots));
  s.lopers.eind('ok');
  assert.equal(hw.coopHelpers().length, 0, 'na de baan telt niemand meer');
});

// ------------------------------------------------------------------ krantenwijk: de gast gooit mee
t('krantenwijk: de gast gooit kranten met E vanaf zijn eigen plek, de stapel is gedeeld, niet te snel achter elkaar en niet zonder mee te doen', () => {
  const s = opzet(2, 'krantenwijk'), [a, b] = s.gs.map((x) => x.gw), hw = s.hw;
  s.lopers.start('krantenwijk'); s.step(1); druk(a, 'j'); druk(b, 'n'); s.step(1);
  hw.companion.x = 12; hw.companion.y = 34; s.step(0.5);
  assert.equal(B.bijbaanGastE(a), true); s.step(0.5);
  assert.equal(s.lopers.ctx().stapel, 5, 'een worp van de gedeelde stapel');
  assert.deepEqual([s.lopers.ctx().gegooid[0].x, s.lopers.ctx().gegooid[0].y], [12, 34], 'de host rekent vanaf de plek van de gast, niet vanaf wat de gast meldt');
  B.bijbaanGastE(a); B.bijbaanGastE(a); s.step(0.3); assert.equal(s.lopers.ctx().stapel, 4, 'twee keer vlak achter elkaar E geeft één worp');
  b.coopBijbaanGast.deelt = true; b.coopBijbaanGast.id = 'krantenwijk'; // een gast die nee zei probeert het toch (een rommelige of valse client)
  B.bijbaanGastE(b); s.step(0.5); assert.equal(s.lopers.ctx().stapel, 4, 'wie niet meedoet kan niet gooien');
  for (let i = 0; i < 4; i++) { s.step(0.5); B.bijbaanGastE(a); s.step(0.5); }
  assert.equal(s.lopers.ctx().streak, 1, 'de laatste krant rondt de ronde af');
  assert.ok(a.money > 0 && b.money === 0 && hw.money === 50, 'de gooier krijgt het volle bedrag, wie nee zei niets');
  s.lopers.eind('ok');
});
t('krantenwijk: bij een baan zonder actie (taxi) doet E van een deelnemer niets bijzonders', () => {
  const s = opzet(1), g = s.gs[0].gw;
  s.lopers.start('taxi'); s.step(1); druk(g, 'j'); s.step(1);
  g.sideJobActions.spotBij = () => null; // niet bij een startpunt
  assert.equal(B.bijbaanGastE(g), false, 'E gaat gewoon naar het gebruik (instappen als bijrijder)');
  s.lopers.eind('ok');
});

// ------------------------------------------------------------------ vracht: de bijrijder rijdt mee en helpt laden en lossen
t('vracht: de regel noemt de bijrijder, E helpt; de gast is passagier in de leen-truck en blijft van het stuur af', () => {
  const r = B.BIJBAAN_REGELS.vracht;
  assert.equal(r.rol, 'bijrijder'); assert.equal(r.actie, true); assert.equal(r.positie, false, 'de bijrijder zit in de truck, zijn plek telt niet apart mee');
  assert.match(r.hulp, /leen-truck/); assert.match(r.hulp, /laden en lossen/);
  assert.equal(B.bijbaanMetCoop('vracht'), true);
  // de leen-truck van de baan is een missionCar (sidejobkit.js): een gast bestuurt hem niet, maar meerijden als passagier mag al
  // (companion.js coopGastGebruik kent geen missionCar-weigering), dus coopbestuur.js blijft zoals het is.
  assert.equal(CB.magBesturen({ missionCar: true, sideJob: true }, 1), false, 'de gast wordt geen chauffeur van de leen-truck');
  const comp = bron('companion.js');
  const blok = (comp.match(/function coopGastGebruik[\s\S]*?\n}/) || [''])[0];
  assert.ok(blok && !/missionCar/.test(blok), 'een passagier in een missionCar is niet geweigerd');
  assert.match(blok, /v\.passenger = 'companion'/);
});

t('vracht: de host start, de gast krijgt Meedoen?, doet mee met J, helpt met E laden en lossen en elke deelnemer krijgt per ronde het volle bedrag', () => {
  const s = opzet(2, 'vracht'), [a, b] = s.gs.map((x) => x.gw), hw = s.hw;
  s.lopers.start('vracht'); s.step(1);
  assert.equal(B.bijbaanKaartModel(a).titel, 'Meedoen?', 'de uitnodiging noemt de bijrijder: ' + JSON.stringify(B.bijbaanKaartModel(a)));
  assert.match(B.bijbaanKaartModel(a).regels[0], /Jij bent bijrijder/);
  assert.match(B.bijbaanKaartModel(a).regels[0], /leen-truck/);
  druk(a, 'j'); druk(b, 'n'); s.step(1);
  assert.ok(tekstIn(a, /Je doet mee met Hunze Vrachtvervoer/));
  assert.equal(b.coopBijbaanGast.deelt, false, 'wie nee zei doet niet mee');
  assert.equal(a.sideJob.active, true); assert.equal(a.sideJob.label, 'Hunze Vrachtvervoer');
  assert.equal(a.sideJob.goal.label, 'Laden bij de oplegger', 'de gast ziet de laadfase');
  // zit de bijrijder er nog niet in, dan gaat E naar het instappen (coopgastlokaal.js → gastGebruik), niet naar de baan
  a.sideJobActions.spotBij = () => null; // hij staat bij de truck, niet meer bij het startpunt
  const voor = s.lopers.ctx().laadLeft;
  assert.equal(B.bijbaanGastE(a), false, 'E naast de truck is om in te stappen');
  s.step(0.5); assert.equal(s.lopers.ctx().laadLeft, voor, 'zonder meerijden geen hulpactie');
  // de gast zit als passagier in de leen-truck: de host rekent met de plek van de truck, niet met wat de gast meldt
  hw.companion.inVehicle = TRUCK; s.step(0.5);
  assert.equal(a.coopInVoertuig, true, 'de gast zit als passagier in de leen-truck');
  const laad0 = s.lopers.ctx().laadLeft;
  assert.equal(B.bijbaanGastE(a), true); s.step(0.6); s.step(0.6);
  assert.equal(s.lopers.ctx().laadLeft, helpLaadTijd(laad0), 'E van de bijrijder verkort het laden met de vaste stap');
  // tijdens de rit is E geen hulpactie: dan moet hij kunnen uitstappen (#492)
  s.lopers.ctx().fase = 'rijden'; a.sideJob.help = false;
  assert.equal(B.bijbaanGastE(a), false, 'tijdens de rit claimt de baan E niet');
  s.lopers.ctx().fase = 'laden'; a.sideJob.help = true;
  assert.match(a.sideJob.progress, /Laden 5 s/, 'de gast ziet de voortgang op het bord: ' + a.sideJob.progress);
  const na1 = s.lopers.ctx().laadLeft;
  B.bijbaanGastE(a); B.bijbaanGastE(a); s.step(0.1);
  assert.equal(s.lopers.ctx().laadLeft, helpLaadTijd(na1), 'twee keer E vlak achter elkaar geeft één stap');
  // buiten bereik van de truck helpt E niet (de gast zit dan in een voertuig dat ver van de laadplek staat)
  hw.companion.inVehicle = { x: TRUCK.x + 60, y: TRUCK.y }; s.step(0.5);
  const na2 = s.lopers.ctx().laadLeft;
  B.bijbaanGastE(a); s.step(0.6);
  assert.equal(s.lopers.ctx().laadLeft, na2, 'helpen kan alleen bij de truck');
  // terug bij de truck: het laden loopt leeg en gaat over in lossen
  hw.companion.inVehicle = TRUCK; s.step(0.5);
  for (let i = 0; i < 2; i++) { B.bijbaanGastE(a); s.step(0.5); }
  assert.equal(s.lopers.ctx().laadLeft, 0, 'nooit onder nul'); assert.equal(s.lopers.ctx().fase, 'lossen', 'daarna gaat het lossen');
  b.coopInVoertuig = true; // hij zit wel in de truck, maar deed niet mee
  b.coopBijbaanGast.deelt = true; b.coopBijbaanGast.id = 'vracht'; // een rommelige of valse client die nee zei maar toch probeert
  const los0 = s.lopers.ctx().losLeft;
  B.bijbaanGastE(b); s.step(0.5);
  assert.equal(s.lopers.ctx().losLeft, los0, 'wie niet meedoet kan niet helpen');
  // lossen: de laatste hulp rondt de ronde af en betaalt iedereen die meedoet
  for (let i = 0; i < 3; i++) { B.bijbaanGastE(a); s.step(0.5); }
  assert.equal(s.lopers.ctx().streak, 1, 'de bijrijder lost de lading');
  assert.equal(hw.money, 90, 'de host kreeg zijn eigen bedrag');
  assert.ok(a.money > 0, 'de bijrijder kreeg geld'); const eerste = a.money;
  assert.ok(a.money >= 90 * 0.5 && a.money <= 90 * 1.5, 'het volle bedrag volgens zijn eigen loonfactor, niet gedeeld: ' + a.money);
  assert.equal(b.money, 0, 'wie nee zei krijgt niets');
  assert.ok(LL.getProfiel().vakken[vakVanBaan('vracht')].xp >= 12, 'alle loopbaanpunten voor de bijrijder');
  B.bijbaanGastE(a); s.step(0.5);
  assert.equal(s.lopers.ctx().streak, 1, 'tussen twee ronden valt er niets te laden');
  // de volgende ronde: opnieuw het volle bedrag, en een betaalde ronde komt nooit twee keer aan
  s.lopers.complete(90, 12); s.step(1);
  assert.equal(a.money, eerste * 2, 'elke ronde opnieuw het volle bedrag');
  const id = [...s.hw.coopNet.bijbaan.boek.ids()].pop();
  assert.equal(N.handleEvent(a, { k: 'beloning', geld: 90, id }, 0), false, 'de boekhouding van de gast kent deze id al');
  assert.equal(B.bijbaanBeloning(hw, 'vracht', 90, 'vervoer', 12, 1), true);
  s.step(1); assert.equal(a.money, eerste * 2, 'dezelfde ronde nogmaals betaalt niet nogmaals');
  s.lopers.eind('ok'); s.step(1);
  assert.equal(a.sideJob.active, false); assert.ok(tekstIn(a, /De baan is klaar/));
});

t('vracht: een gast vraagt de baan bij het startpunt met E; de host start en de gast doet meteen mee als bijrijder', () => {
  const s = opzet(1, 'vracht'), g = s.gs[0].gw;
  druk(g, 'e');
  assert.equal(B.bijbaanGastE(g), true); s.step(1.5);
  assert.ok(tekstIn(g, /Je vraagt Hunze Vrachtvervoer te starten/));
  assert.equal(s.lopers.ctx().id, 'vracht'); assert.equal(s.lopers.ctx().opVerzoek, true, 'de baan draait op de wereld van de host');
  assert.equal(g.coopBijbaanGast.deelt, true, 'wie de baan startte doet altijd mee'); assert.equal(B.bijbaanKaartModel(g), null);
  assert.equal(g.sideJob.goal.label, 'Laden bij de oplegger', 'hij ziet meteen de laadfase');
  s.lopers.eind('ok'); s.step(1);
});

// ------------------------------------------------------------------ de regels en de bron
t('de regels voor een gast: bijbanen zijn deels; de teksten in het spel en in docs/COOP-GAST.md zeggen hetzelfde', () => {
  const r = G.GAST_REGELS.find((x) => x.actie === 'bijbanen');
  assert.equal(r.mag, 'deels'); assert.match(r.regel, /Taxi, bezorgen, de krantenwijk en de vrachtrit/); assert.match(r.regel, /bijrijder/); assert.match(r.regel, /volledige beloning/);
  const doc = bron('../../docs/COOP-GAST.md');
  assert.match(doc, /\| Bijbanen \| deels \|/); assert.match(doc, /coopbijbaan\.js/);
});
t('de haken in de bron: sidejobs.js, de drie banen, coopnet.js en het scherm van de gast', () => {
  const sj = bron('sidejobs.js');
  assert.match(sj, /world\.coopBijbaanStart\(job\.id, job\.name, verzoekVan\)/, 'startJob meldt de baan');
  assert.match(sj, /world\.coopBijbaanBeloning\(c\.job\.id, basisFor\(c, base\) \+ tip, vak, xp, c\.round\)/, 'completeRound betaalt de basis plus fooi, met het ronde-nummer');
  assert.equal((sj.match(/world\.coopDeel\(/g) || []).length, 1, 'het oude delen blijft één keer, voor de andere banen');
  assert.match(sj, /world\.coopBijbaanEind\(kind\)/, 'endShift meldt het einde');
  assert.match(sj, /startVoor: \(id, slot\) => startOpVerzoek\(id, slot\)/); assert.match(sj, /spotBij: \(x, y\) => spotBij\(x, y\)/);
  assert.match(bron('sidejob_bezorger.js'), /afstandNaast\(world, door\.x, door\.y\)[\s\S]*afstandNaast\(world, target\.x, target\.y\) < HANDOVER_R/, 'de bezorger: ophalen en afgeven door wie bij de deur staat');
  const kr = bron('sidejob_krantenwijk.js');
  assert.match(kr, /helperActie\(c, h\) \{/); assert.match(kr, /afstandNaast\(world, eerste\.x, eerste\.y\) < OVERNAME_R/);
  const net = bron('coopnet.js');
  for (const re of [/case 'bijbaan': return bijbaanHandleHost/, /case 'bijbaangast': return bijbaanHandleGast/, /world\.coopBijbaanStart = \(id, label, starter\) => bijbaanStart/, /zetBijbaanHaken\(\{ betaalGast/, /bijbaanGastReset\(world\)/, /bijbaanHostTik\(world, dt\)/]) assert.match(net, re);
  assert.match(bron('coopgastlokaal.js'), /bijbaanGastE\(world\)/); assert.match(bron('coopwedstrijd3d.js'), /bijbaanKaartModel\(world\)/);
});

console.log(`bijbaan_test: ${n} tests ok`);
