// Het bijbanenpakket van 22-11 (vismarktkoerier, studentenfeest, marktkraam, toeristengids): de pure regels
// (sidejobpack_rules.js), de ontgrendelpoort, de beloning per speler, de Samen-regel en de bedrading in de bronnen.
// sidejob_pack.js laadt three van een CDN en is hier niet te importeren; de adapter wordt via de bron gecontroleerd.
//   node scripts/sidejobpack_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PACK_JOBS, PACK_IDS, packJob, gateReason, newRound, stepRound, roundResult, goalCount, goalIndex, ringPoints, judgeWeight,
  DRINKS, DRINK_KINDS, GUESTS, PRODUCTS, TOURISTS, STORIES, STORY_KINDS, HUMOR_PROPOSALS, FISH, PARTY, MARKET, TOUR, STEP_G, MAX_G,
} from '../game/js/sidejobpack_rules.js';
import { vakVanBaan, BAAN_IDS, VAK_IDS } from '../game/js/loopbaan.js';
import { familieVan, sidejobProfiel } from '../game/js/sidejobprofiel.js';
import { bijbaanKaart } from '../game/js/bijbaan_aaa.js';
import { gateWorld, worldOpen, gateHint, newGate, progressFrom } from '../game/js/unlockgate.js';
import { hulpStap, hulpTip, HULP_MAX } from '../game/js/bijbaanhulp.js';
import * as B from '../game/js/coopbijbaan.js';
import * as S from '../game/js/coopstatus.js';
import { SFX_MAP } from '../game/js/sfx/sfxmap.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
const doc = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0], (String(e.stack).split('\n').find((l) => l.includes('sidejobpack_test.mjs')) || '').replace(/^.*sidejobpack_test\.mjs/, 'regel')); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const run = (round, inputOf, { dt = 0.2, max = 4000 } = {}) => {
  let last = [];
  for (let k = 0; k < max; k++) {
    last = stepRound(round, inputOf(round, k), dt);
    if (last.some((e) => e.type === 'done' || e.type === 'fail')) return last;
  }
  return last;
};
const ok = (r) => Number.isFinite(r.base) && Number.isFinite(r.tip) && r.base >= 0 && r.tip >= 0 && typeof r.text === 'string' && r.text.length > 5;

t('vier banen, uniek, met een eigen vak, bedrijf en baas (verzonnen)', () => {
  assert.deepEqual(PACK_IDS, ['vismarktkoerier', 'studentenfeest', 'marktkraam', 'toeristengids']);
  assert.equal(new Set(PACK_IDS.map((id) => PACK_JOBS[id].firm)).size, 4);
  assert.equal(packJob('bestaatniet'), null);
  assert.equal(packJob('constructor'), null, 'geen prototype-sleutels');
  for (const id of PACK_IDS) {
    const j = PACK_JOBS[id];
    assert.equal(j.id, id);
    assert.ok(j.intro.length === 2 && j.blurb.length > 20 && j.tagline.length > 20 && j.boss1.includes(j.boss.split(' ').pop()) || j.boss1.includes(j.boss), id + ': teksten');
    assert.ok(j.boss1.length > 30 && j.bossStop.length > 30, id + ': baasregels');
  }
});

t('constitution: Nederlands, verzonnen namen, geen echte merken, geen winter en geen alcohol', () => {
  const alles = JSON.stringify([PACK_JOBS, DRINKS, GUESTS, PRODUCTS, TOURISTS, STORIES, HUMOR_PROPOSALS]);
  assert.ok(!/mcdonald|burger king|febo|kfc|albert heijn|jumbo|heineken|grolsch|coca|pepsi|red bull|starbucks|uber|google|facebook/i.test(alles), 'geen echte merken');
  assert.ok(!/winter|sneeuw|ijsbaan|schaatsen|natuurijs/i.test(alles.replace(/ijskoud|ijs\b|ijsthee/gi, '')), 'altijd zomer');
  assert.ok(!/\b(bier|wijn|whisky|jenever|cocktail|wodka|shot|dronken)\b/i.test(JSON.stringify(DRINKS) + JSON.stringify(GUESTS)), 'drankjes zonder alcohol');
  assert.ok(!/\bde Grunn\b/.test(alles), 'Grunn, nooit "de Grunn"');
  assert.ok(!/dood|bloed|gewond|wapen|schiet|steek/i.test(alles.replace(/steekproef/g, '')), 'geen leed');
  for (const id of PACK_IDS) assert.ok(PACK_JOBS[id].tagline.includes(PACK_JOBS[id].firm.split(' ').slice(0, 2).join(' ')), id + ': de tagline noemt het bedrijf');
});

t('vak, familie, profiel en kaart: elke baan hoort bij een bestaand vak en heeft een sfeer en een regelkaart', () => {
  const verwacht = { vismarktkoerier: ['bezorg', 'dienst'], studentenfeest: ['horeca', 'kantoorklus'], marktkraam: ['landbouw', 'kantoorklus'], toeristengids: ['podium', 'kantoorklus'] };
  for (const [id, [vak, fam]] of Object.entries(verwacht)) {
    assert.equal(PACK_JOBS[id].vak, vak, id + ': vak in de regels');
    assert.equal(vakVanBaan(id), vak, id + ': BAAN_VAK');
    assert.ok(VAK_IDS.includes(vak) && BAAN_IDS.includes(id), id + ': bekend vak en baan');
    assert.equal(familieVan(id), fam, id + ': familie');
    assert.equal(PACK_JOBS[id].family, fam);
    const pr = sidejobProfiel(id);
    assert.ok(pr.sfeer && pr.accent, id + ': sfeer en accent');
    const k = bijbaanKaart(id);
    assert.ok(k && k.doel.length > 20 && k.afloop.length > 10 && k.regels.length >= 1, id + ': regelkaart');
  }
});

t('vismarktkoerier: rustig fietsen levert de volle beloning, het ijs smelt en schudden kost ijs', () => {
  const r = newRound('vismarktkoerier', 1, seeded(4));
  assert.equal(goalCount(r), 3);
  let leg = 0;
  const ev = run(r, () => { leg++; return { decel: 0.5, lat: 1, dist: leg % 40 === 0 ? 2 : 90 }; });
  assert.ok(ev.some((e) => e.type === 'done'), 'klaar');
  const res = roundResult(r);
  assert.ok(ok(res) && !res.failed && res.base === FISH.base + 3 * FISH.perStop, JSON.stringify(res));
  assert.ok(res.tip > 0 && res.flawless, 'rustig: fooi en foutloos');
  assert.equal(goalIndex(r), 3);
  // nooit afleveren: het ijs smelt
  const smelt = newRound('vismarktkoerier', 1, seeded(4));
  const e2 = run(smelt, () => ({ dist: 99 }), { dt: 1 });
  assert.ok(e2.some((e) => e.type === 'fail' && /gesmolten/.test(e.why)));
  assert.equal(roundResult(smelt).failed, true);
  // keihard remmen: de kist schudt
  const schud = newRound('vismarktkoerier', 1, seeded(4));
  const e3 = run(schud, () => ({ decel: 6, lat: 7, dist: 99 }), { dt: 0.2 });
  assert.ok(e3.some((e) => e.type === 'fail' && /geschud/.test(e.why)));
  // een schep ijs terug bij elk adres, nooit boven vol
  const v = newRound('vismarktkoerier', 1, seeded(4));
  v.s.ice = 0.95;
  stepRound(v, { dist: 1 }, 0.1);
  assert.ok(v.s.ice <= 1 && v.s.ice > 0.95);
  assert.ok(newRound('vismarktkoerier', 5).s.stops > newRound('vismarktkoerier', 1).s.stops, 'hoger niveau, meer adressen');
});

t('studentenfeest: elke gast heeft een eigen goede keuze, de opties zijn drie verschillende soorten', () => {
  assert.equal(DRINKS.length, 8);
  for (const k of DRINK_KINDS) assert.ok(DRINKS.filter((d) => d.kind === k).length >= 2, k);
  for (const g of GUESTS) assert.ok(DRINK_KINDS.includes(g.kind) && g.ask.length > 20 && g.right.length > 10 && g.wrong.length > 10, g.id);
  for (let seed = 1; seed <= 80; seed++) {
    const r = newRound('studentenfeest', 1 + (seed % 5), seeded(seed));
    for (const o of r.s.orders) {
      assert.equal(o.options.length, 3);
      assert.equal(new Set(o.options.map((d) => d.kind)).size, 3, 'drie verschillende soorten');
      assert.equal(o.options[o.right].kind, o.guest.kind, 'de goede optie past bij de gast');
    }
    assert.ok(r.s.orders.length >= 5 && r.s.orders.length <= 8);
  }
});

t('studentenfeest: foutloos is de beste uitslag, te veel klachten is verlies, geld blokkeert niets anders', () => {
  const r = newRound('studentenfeest', 1, seeded(11));
  const ev = run(r, (rd) => ({ pick: rd.s.orders[rd.s.i].right }), { dt: 0.5 });
  assert.ok(ev.some((e) => e.type === 'done'));
  const res = roundResult(r);
  const nGuests = r.s.orders.length;
  assert.equal(res.base, PARTY.base + nGuests * PARTY.perGood);
  assert.equal(res.tip, nGuests * PARTY.tipFast + PARTY.tipClean, 'snel en foutloos');
  assert.ok(res.flawless && ok(res));
  // traag maar goed: geen snelheidsfooi
  const traag = newRound('studentenfeest', 1, seeded(11));
  for (let k = 0; k < traag.s.orders.length; k++) {
    stepRound(traag, {}, traag.s.time * 0.8);
    stepRound(traag, { pick: traag.s.orders[traag.s.i].right }, 0.01);
  }
  assert.equal(roundResult(traag).tip, PARTY.tipClean);
  // alles fout: drie klachten
  const fout = newRound('studentenfeest', 1, seeded(11));
  const e2 = run(fout, (rd) => ({ pick: (rd.s.orders[rd.s.i].right + 1) % 3 }), { dt: 0.5 });
  assert.ok(e2.some((e) => e.type === 'fail' && /klachten/.test(e.why)));
  assert.equal(roundResult(fout).failed, true);
  // nooit kiezen: de gast loopt door
  const stil = newRound('studentenfeest', 1, seeded(11));
  const e3 = run(stil, () => ({}), { dt: 1 });
  assert.ok(e3.some((e) => e.type === 'fail') && stil.s.late === PARTY.maxMiss);
  // één fout hoeft niet te falen
  const een = newRound('studentenfeest', 1, seeded(12));
  stepRound(een, { pick: (een.s.orders[0].right + 1) % 3 }, 0.1);
  const e4 = run(een, (rd) => ({ pick: rd.s.orders[rd.s.i].right }), { dt: 0.5 });
  assert.ok(e4.some((e) => e.type === 'done'));
  const r4 = roundResult(een);
  assert.ok(!r4.failed && !r4.flawless && r4.tip < nGuests * PARTY.tipFast + PARTY.tipClean);
  // een pick buiten 0..2 telt niet
  const buiten = newRound('studentenfeest', 1, seeded(11));
  assert.deepEqual(stepRound(buiten, { pick: 7 }, 0.1), []);
  assert.deepEqual(stepRound(buiten, { pick: -1 }, 0.1), []);
  assert.deepEqual(stepRound(buiten, { pick: 1.5 }, 0.1), []);
});

t('marktkraam: de weging oordeelt op gewicht, de kip springt op de weegschaal en een perfecte ronde krijgt de volle fooi', () => {
  assert.equal(judgeWeight(500, 500, 50), 'perfect');
  assert.equal(judgeWeight(500, 450, 50), 'perfect');
  assert.equal(judgeWeight(500, 650, 50), 'close');
  assert.equal(judgeWeight(500, 700, 50), 'over');
  assert.equal(judgeWeight(500, 300, 50), 'under');
  for (const p of PRODUCTS) for (const a of p.asks) assert.ok(a.g % STEP_G === 0 && a.g > 0 && a.g <= MAX_G && a.say.length > 3, p.id + ' ' + a.g);
  let hens = 0;
  for (const seed of [3, 5, 8]) {
    const r = newRound('marktkraam', 3, seeded(seed));
    const klantAantal = r.s.orders.length;
    const ev = [];
    for (let k = 0; k < 6000 && !ev.some((e) => e.type === 'done' || e.type === 'fail'); k++) {
      const o = r.s.orders[r.s.i];
      const diff = o.target - r.s.grams;
      const input = diff > 0 ? { dir: 1 } : diff < 0 ? { dir: -1 } : { confirm: true };
      const e = stepRound(r, input, 0.2);
      hens += e.filter((x) => x.type === 'hen').length;
      ev.push(...e);
    }
    assert.ok(ev.some((e) => e.type === 'done'), 'seed ' + seed + ' klaar');
    const res = roundResult(r);
    assert.ok(ok(res) && !res.failed);
    assert.equal(r.s.perfect, klantAantal, 'alles precies');
    assert.equal(res.tip, MARKET.tipAll);
    assert.ok(res.flawless);
  }
  // de kip: zodra de tijd erbij is en er iets op de weegschaal ligt, springt hij erop (honderd gram erbij), één keer per klant
  const kip = newRound('marktkraam', 1, seeded(2));
  kip.s.orders[0].henAt = 1;
  stepRound(kip, { dir: 1 }, 0.1);
  assert.equal(kip.s.grams, STEP_G);
  const ek = stepRound(kip, {}, 1.2);
  assert.ok(ek.some((e) => e.type === 'hen' && /kip/.test(e.text)), 'de kip springt');
  assert.equal(kip.s.grams, STEP_G + 100);
  assert.ok(!stepRound(kip, {}, 1).some((e) => e.type === 'hen'), 'maar één keer per klant');
  assert.ok(hens >= 0);
  // een kip bij een lege weegschaal wacht tot er iets op ligt
  const kip2 = newRound('marktkraam', 1, seeded(2));
  kip2.s.orders[0].henAt = 0.5;
  assert.ok(!stepRound(kip2, {}, 1).some((e) => e.type === 'hen'));
  // altijd bij 50 gram afrekenen: te weinig, drie klachten
  const weinig = newRound('marktkraam', 1, seeded(2));
  const e2 = run(weinig, (rd) => (rd.s.grams < 50 ? { dir: 1 } : { confirm: true }), { dt: 0.2 });
  assert.ok(e2.some((e) => e.type === 'fail') && weinig.s.under >= 1);
  // niets doen: de klant loopt weg
  const weg = newRound('marktkraam', 1, seeded(2));
  const e3 = run(weg, () => ({}), { dt: 1 });
  assert.ok(e3.some((e) => e.type === 'fail') && weg.s.complaints === MARKET.maxComplaints);
  // afrekenen zonder iets op de weegschaal telt niet
  const leeg = newRound('marktkraam', 1, seeded(2));
  assert.deepEqual(stepRound(leeg, { confirm: true }, 0.1), []);
  // het gewicht blijft tussen 0 en de bovengrens
  const grens = newRound('marktkraam', 1, seeded(2));
  stepRound(grens, { dir: -1 }, 0.1);
  assert.equal(grens.s.grams, 0);
  for (let k = 0; k < 80; k++) stepRound(grens, { dir: 1 }, 0.01);
  assert.equal(grens.s.grams, MAX_G);
  // te veel weggegeven betaalt, maar minder
  const veel = newRound('marktkraam', 1, seeded(2));
  veel.s.orders.forEach((o) => { o.henAt = null; });
  const per = run(veel, (rd) => (rd.s.grams < rd.s.orders[rd.s.i].target + 500 ? { dir: 1 } : { confirm: true }), { dt: 0.2, max: 8000 });
  assert.ok(per.some((e) => e.type === 'done'));
  const rv = roundResult(veel);
  assert.ok(!rv.failed && !rv.flawless && rv.base < MARKET.base + veel.s.orders.length * MARKET.perfect);
});

t('toeristengids: elke groep heeft een passend verhaal, stilte en verkeerde verhalen kosten aandacht', () => {
  assert.deepEqual([...STORY_KINDS].sort(), ['geschiedenis', 'grap', 'uitzicht']);
  for (const k of STORY_KINDS) assert.ok(STORIES[k].length >= 2);
  for (const g of TOURISTS) assert.ok(STORY_KINDS.includes(g.wish) && g.ask.length > 20, g.id);
  for (const k of STORY_KINDS) assert.ok(TOURISTS.some((g) => g.wish === k), k + ': er is een groep die het wil');
  for (let seed = 1; seed <= 60; seed++) {
    const r = newRound('toeristengids', seed % 6, seeded(seed));
    assert.ok(r.s.n === 3 || r.s.n === 4);
    for (const st of r.s.stopsOf) {
      assert.equal(new Set(st.options.map((o) => o.kind)).size, 3);
      assert.equal(st.options[st.right].kind, st.tourist.wish);
    }
  }
  // alles raak
  const r = newRound('toeristengids', 1, seeded(9));
  assert.equal(goalCount(r), 3);
  const ev = run(r, (rd) => (rd.s.phase === 'walk' ? { dist: 2 } : { pick: rd.s.stopsOf[rd.s.i].right }), { dt: 0.5 });
  assert.ok(ev.some((e) => e.type === 'done'));
  const res = roundResult(r);
  assert.ok(ok(res) && !res.failed && res.flawless && res.base === TOUR.base + 3 * TOUR.perStop);
  assert.ok(res.tip > TOUR.tipMax * 0.9, 'volle aandacht, volle fooi');
  // niet bij de stop aangekomen: niets gebeurt
  const ver = newRound('toeristengids', 1, seeded(9));
  assert.deepEqual(stepRound(ver, { dist: 30, pick: 0 }, 1), []);
  assert.equal(ver.s.phase, 'walk');
  // alles fout: de groep blijft, maar tevreden-loos (geen fail, minder fooi)
  const fout = newRound('toeristengids', 1, seeded(9));
  run(fout, (rd) => (rd.s.phase === 'walk' ? { dist: 2 } : { pick: (rd.s.stopsOf[rd.s.i].right + 1) % 3 }), { dt: 0.5 });
  const rf = roundResult(fout);
  assert.ok(!rf.failed && !rf.flawless && rf.tip < res.tip);
  // stilte: de aandacht is op, de groep haakt af
  const stil = newRound('toeristengids', 1, seeded(9));
  const e3 = run(stil, (rd) => (rd.s.phase === 'walk' ? { dist: 2 } : {}), { dt: 2 });
  assert.ok(e3.some((e) => e.type === 'fail' && /terras/.test(e.why)));
  assert.equal(roundResult(stil).failed, true);
  // een pick tijdens het lopen telt niet, een pick buiten bereik ook niet
  const lopen = newRound('toeristengids', 1, seeded(9));
  assert.deepEqual(stepRound(lopen, { dist: 40, pick: 0 }, 0.5), []);
  assert.equal(lopen.s.good + lopen.s.wrong, 0);
  assert.ok(newRound('toeristengids', 3).s.n > newRound('toeristengids', 1).s.n, 'hoger niveau, meer stops');
});

t('de stops liggen op een ring rond de plek en vallen niet op elkaar', () => {
  const p = ringPoints(100, 50, 4);
  assert.equal(p.length, 4);
  for (let a = 0; a < p.length; a++) for (let b = a + 1; b < p.length; b++) assert.ok(Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y) > 20, 'ver genoeg van elkaar');
  for (const q of p) { const d = Math.hypot(q.x - 100, q.y - 50); assert.ok(d >= 38 - 1e-6 && d <= 38 + 4 * 7, 'op de ring'); }
  assert.deepEqual(ringPoints(0, 0, 0), []);
  assert.deepEqual(ringPoints(0, 0, -3), []);
});

t('honderden willekeurige rondes: geen uitzondering, eindige uitbetaling, nooit negatief', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const rng = seeded(seed * 7);
    for (const id of PACK_IDS) {
      const r = newRound(id, 1 + (seed % 5), seeded(seed));
      for (let k = 0; k < 400; k++) {
        const input = { decel: rng() * 8, lat: rng() * 8, dist: rng() < 0.1 ? 1 : 60, pick: rng() < 0.4 ? Math.floor(rng() * 3) : undefined, dir: rng() < 0.5 ? (rng() < 0.5 ? -1 : 1) : 0, confirm: rng() < 0.15 };
        const ev = stepRound(r, input, rng() * 0.5);
        for (const e of ev) assert.ok(typeof e.type === 'string');
        if (ev.some((e) => e.type === 'done' || e.type === 'fail')) break;
      }
      const res = roundResult(r);
      assert.ok(Number.isFinite(res.base) && Number.isFinite(res.tip) && res.base >= 0 && res.tip >= 0 && typeof res.flawless === 'boolean', id);
    }
  }
  assert.throws(() => newRound('bestaatniet'), /onbekende/);
  // een rare dt (NaN, negatief) breekt niets
  const r = newRound('vismarktkoerier', 1, seeded(1));
  assert.doesNotThrow(() => { stepRound(r, { dist: 99 }, NaN); stepRound(r, { dist: 99 }, -5); stepRound(r, null, 0.1); });
});

t('dezelfde seed geeft dezelfde ronde (herhaalbaar); een andere seed een andere', () => {
  const a = JSON.stringify(newRound('studentenfeest', 2, seeded(21)).s.orders.map((o) => o.guest.id));
  const b = JSON.stringify(newRound('studentenfeest', 2, seeded(21)).s.orders.map((o) => o.guest.id));
  const c = JSON.stringify(newRound('studentenfeest', 2, seeded(22)).s.orders.map((o) => o.guest.id));
  assert.equal(a, b);
  assert.notEqual(a, c);
});

// --- de ontgrendelpoort -------------------------------------------------------------------------------------------------------
t('unlockgate: elke baan hoort bij een loopbaan die het verhaal opent, met een hint van het personage; oude saves blijven open', () => {
  for (const id of PACK_IDS) {
    const vak = PACK_JOBS[id].vak;
    const w = gateWorld(vak);
    assert.ok(w && w.kind === 'loopbaan' && w.by && w.hint.length > 10, id + ': ' + vak + ' is een poortwereld met een hint');
    // een nieuw spel: dicht, met de zachte hint
    const nieuw = progressFrom({ gate: newGate() });
    const gate = { open: (v) => worldOpen(v, nieuw), begun: () => false, hint: (v) => gateHint(v, nieuw) };
    const why = gateReason(id, gate);
    assert.equal(why, w.hint, id + ': dicht in een nieuw spel');
    // het verhaal heeft de akte bereikt: open
    const laat = progressFrom({ gate: newGate(), stepId: null, ended: true });
    assert.equal(gateReason(id, { open: (v) => worldOpen(v, laat), begun: () => false, hint: () => 'x' }), null, id + ': open na het verhaal');
    // al begonnen (een loopbaan die de speler zelf begon): nooit dicht
    assert.equal(gateReason(id, { open: () => false, begun: (v) => v === vak, hint: () => 'x' }), null, id + ': begonnen telt');
    // een oude save (geen gate-veld): alles open
    assert.equal(gateReason(id, { open: (v) => worldOpen(v, progressFrom({})), begun: () => false, hint: () => 'x' }), null, id + ': oude save open');
    // dev (spelbot, trailer): altijd open
    assert.equal(gateReason(id, { open: (v) => worldOpen(v, progressFrom({ gate: newGate(), dev: true })), begun: () => false, hint: () => 'x' }), null);
  }
  assert.equal(gateReason('bestaatniet', {}), 'Die bijbaan kennen we niet.');
  assert.equal(gateReason('marktkraam', null), null, 'zonder poort altijd open');
  assert.equal(gateReason('marktkraam', { open: () => false }), 'Dit komt later in het verhaal.', 'zonder hint de standaardzin');
});

// --- Samen spelen: de beloning per speler en de rollen ---------------------------------------------------------------------
t('Samen: de drie banen te voet hebben een helper-rol op werkt, de vismarktkoerier blijft in het eigen spel', () => {
  const rol = { studentenfeest: 'tweede barkeeper', marktkraam: 'kraamhulp', toeristengids: 'mede-gids' };
  for (const [id, r] of Object.entries(rol)) {
    assert.equal(B.bijbaanMetCoop(id), true, id);
    assert.equal(B.BIJBAAN_REGELS[id].rol, r);
    assert.equal(B.BIJBAAN_REGELS[id].actie, true);
    assert.equal(B.BIJBAAN_REGELS[id].positie, true);
    assert.ok(B.BIJBAAN_REGELS[id].hulp.includes('{E}') && B.BIJBAAN_REGELS[id].hulp.length > 40);
    assert.equal(S.samenStatus('bijbaan', id), S.WERKT, id);
  }
  assert.equal(B.bijbaanMetCoop('vismarktkoerier'), false);
  assert.equal(S.samenStatus('bijbaan', 'vismarktkoerier'), S.NEE);
  for (const l of ['het studentenfeest', 'de boerenmarktkraam', 'de toeristengids']) assert.ok(S.samenKan().includes(l), l);
  assert.ok(!S.samenKan().includes('vismarktkoerier'));
});

t('Samen: elke deelnemer krijgt de volle uitslag in eigen geld en punten (per speler, #429), wie wegvalt niets meer', () => {
  for (const id of ['studentenfeest', 'marktkraam', 'toeristengids']) {
    const rd = newRound(id, 1, seeded(31));
    run(rd, (r) => (r.id === 'studentenfeest' ? { pick: r.s.orders[r.s.i].right }
      : r.id === 'marktkraam' ? (() => { const o = r.s.orders[r.s.i]; const d = o.target - r.s.grams; return d > 0 ? { dir: 1 } : d < 0 ? { dir: -1 } : { confirm: true }; })()
        : (r.s.phase === 'walk' ? { dist: 1 } : { pick: r.s.stopsOf[r.s.i].right })), { dt: 0.3, max: 9000 });
    const uit = roundResult(rd);
    assert.ok(!uit.failed, id);
    const st = B.maakBijbaan();
    const v = new Set([1, 2, 3]);
    B.beginBijbaan(st, id, 'testbaan', [1, 2, 3], 1, 'Tessa');
    B.antwoordBijbaan(st, 2, true);
    B.antwoordBijbaan(st, 3, false);
    const basis = uit.base + uit.tip;
    const r = B.beloningBijbaan(st, v, { basis, vak: PACK_JOBS[id].vak, xp: 10, ronde: 0 });
    assert.deepEqual(r.map((x) => [x.slot, x.geld, x.xp]), [[1, basis, 10], [2, basis, 10]], id + ': ieder het volle bedrag');
    B.verlaatBijbaan(st, 2);
    assert.deepEqual(B.beloningBijbaan(st, new Set([1]), { basis, ronde: 1 }).map((x) => x.slot), [1], id + ': wie wegvalt krijgt niets meer');
  }
});

t('Samen: de hulp van een meespeler is begrensd en levert per hulp extra fooi', () => {
  for (const soort of ['bar', 'kraam', 'gids']) {
    assert.equal(hulpTip(soort, 0), 0);
    assert.ok(hulpTip(soort, 1) > 0, soort);
    assert.equal(hulpTip(soort, HULP_MAX + 5), hulpTip(soort, HULP_MAX), 'nooit boven het maximum');
    assert.ok(hulpTip(soort, HULP_MAX) > hulpTip(soort, 1));
  }
  assert.equal(hulpTip('koerier', 3), 0, 'de vismarktkoerier heeft geen hulp');
  let h = 0;
  for (let k = 0; k < 6; k++) h = hulpStap(h).help;
  assert.equal(h, HULP_MAX);
});

// --- de bedrading in de bronnen ----------------------------------------------------------------------------------------------
t('de adapter: staat in SIDE_JOBS en PAY_GUESS, gebruikt het DS3-paneel, sfxEvent met bestaande sleutels en de poort', () => {
  const sj = bron('sidejobs.js');
  const regel = sj.split(/\r?\n/).find((l) => l.startsWith('export const SIDE_JOBS'));
  assert.match(regel, /\.\.\.PACK_SIDE_JOBS/, 'in SIDE_JOBS');
  assert.match(regel, /boerderij, snackoverlast\]/, 'de staart van de lijst blijft zoals hij was');
  assert.match(sj, /from '\.\/sidejob_pack\.js'/);
  for (const id of PACK_IDS) assert.match(sj, new RegExp(id + ': \\[\\d+, \\d+\\]'), id + ': prijsschatting');
  const ad = bron('sidejob_pack.js');
  assert.match(ad, /createChoicePanel\(accentVan\(id\)\)/, 'DS3-paneel met het accent van het vak');
  assert.match(ad, /keycap\(/, 'toetsplaatjes in het paneel');
  assert.ok(!/document\.createElement|\.style\.|innerHTML|<style/.test(ad), 'geen eigen DOM of CSS: de HUD komt van het DS3-paneel');
  assert.match(ad, /gateReason\(id, gate\)/, 'de ontgrendelpoort');
  assert.match(ad, /storyWorldOpen, storyGateHint/);
  assert.match(ad, /isLoopbaanGestart/);
  const sleutels = [...ad.matchAll(/sfxEvent\(world, '([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(sleutels.length >= 12, 'geluid bij de belangrijke momenten: ' + sleutels.length);
  for (const k of new Set(sleutels)) assert.ok(SFX_MAP[k], 'sfxEvent-sleutel bestaat in sfxmap.js: ' + k);
  // een fout in een haak raakt het spel nooit, dus geen losse audio-aanroepen buiten sfxEvent
  assert.ok(!/playSample|new Audio|AudioContext/.test(ad));
  for (const id of PACK_IDS) assert.match(ad, new RegExp(`const id = '${id}'`), id + ': adapter');
  // elke baan met een helper-rol heeft helperActie; de koerier niet
  assert.equal((ad.match(/helperActie\(c\)/g) || []).length, 3);
  assert.match(ad, /hulpTip\(soort/);
  // de beloning loopt via het contract (c.complete), niet rechtstreeks in de portemonnee
  assert.ok(!/world\.money|\.money \+=|loopbaanVerdien/.test(ad), 'beloning alleen via c.complete (per speler, #429)');
  assert.match(ad, /c\.complete\(\{ base: r\.base, tip: r\.tip \+ hulpTip/);
  // een nieuw glyph is niet nodig: alleen bestaande kaartpictogrammen
  const glyphs = new Set([...sj.matchAll(/case '([\w]+)':/g)].map((m) => m[1]));
  for (const id of PACK_IDS) assert.ok(glyphs.has(PACK_JOBS[id].glyph), id + ': glyph ' + PACK_JOBS[id].glyph + ' bestaat');
});

t('de docs en de Samen-regel staan er: COOP-GAST.md, coopgast.js en het voorstel met humorregels', () => {
  const cg = doc('docs/COOP-GAST.md');
  for (const w of ['studentenfeest', 'boerenmarktkraam', 'toeristengids', 'vismarktkoerier', 'tweede barkeeper', 'kraamhulp', 'mede-gids']) assert.ok(cg.includes(w), w + ' in COOP-GAST.md');
  const g = bron('coopgast.js');
  for (const w of ['het studentenfeest', 'de boerenmarktkraam', 'de toeristengids']) assert.ok(g.includes(w), w + ' in coopgast.js');
  const man = JSON.parse(doc('scripts/coop_coverage.json'));
  const f = man.features.find((x) => x.id === 'bijbanen');
  assert.ok(f.test.includes('scripts/sidejobpack_test.mjs'), 'de test staat in de dekkingslijst');
  for (const id of PACK_IDS) assert.ok(Array.isArray(HUMOR_PROPOSALS[id]) && HUMOR_PROPOSALS[id].length >= 3, id + ': humorregels als voorstel');
  const voorstel = doc('docs/BIJBANENPAKKET-22-11.md');
  for (const id of PACK_IDS) for (const regel of HUMOR_PROPOSALS[id]) assert.ok(voorstel.includes(regel), id + ': de humorregel staat in het voorstel: ' + regel.slice(0, 40));
});

console.log(fails ? `sidejobpack_test: ${fails} van ${n} mislukt` : `sidejobpack_test: ${n} blokken ok`);
process.exit(fails ? 1 : 0);
