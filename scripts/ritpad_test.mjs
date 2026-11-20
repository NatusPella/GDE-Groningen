// De echte rit (#882 taxi, #926 trein): het tijdsplan met echt begin, tijdsprong en echt einde, de klok, de skip,
// de camera op de achterbank, het spoor van de trein en de terugval (game/js/ritpad.js).
//   node scripts/ritpad_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
import * as P from '../game/js/ritpad.js';
import { klokSprongMag, meerSpelers } from '../game/js/coopgroep.js';
import { landingsplek } from '../game/js/meerijden.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const stappen = (plan, dt = 0.05) => { const r = []; for (let x = 0; x <= plan.totaalS + 1e-9; x += dt) r.push(P.ritStand(plan, x)); return r; };

t('een lange taxirit: echt begin, tijdsprong, echt einde, samen ongeveer 20 tot 30 seconden', () => {
  const plan = P.ritTijdplan(12000, { mode: 'taxi', etaS: 1200 });
  assert.equal(plan.kort, false);
  assert.ok(plan.totaalS >= 18 && plan.totaalS <= 30, `totaal ${plan.totaalS}`);
  assert.ok(plan.openS >= 8 && plan.openS <= 10 && plan.sluitS >= 8 && plan.sluitS <= 10, 'begin en einde rijden 8 tot 10 s');
  assert.ok(plan.sprongM > 11000 - plan.daM, 'het midden wordt overgeslagen');
  const fases = stappen(plan).map((s) => s.fase);
  assert.deepEqual([...new Set(fases)], ['open', 'sprong', 'sluit', 'aankomst']);
});

t('de rit begint bij 0 m, eindigt op de lengte van het pad en loopt nooit achteruit', () => {
  const plan = P.ritTijdplan(9000, { mode: 'taxi', etaS: 900 });
  const s = stappen(plan);
  assert.equal(s[0].s, 0);
  assert.equal(s[s.length - 1].s, 9000);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].s >= s[i - 1].s - 1e-9, `achteruit bij ${s[i].t}`);
  // de enige sprong in afstand zit in het zwarte midden
  for (let i = 1; i < s.length; i++) if (s[i].s - s[i - 1].s > 8) assert.equal(s[i].fase, 'sprong', `afstandssprong buiten het zwart bij t=${s[i].t}`);
});

t('de sprong is zwart: het beeld is volledig zwart op het moment dat de taxi verspringt', () => {
  const plan = P.ritTijdplan(9000, { mode: 'taxi', etaS: 900 });
  const s = stappen(plan, 0.02);
  for (let i = 1; i < s.length; i++) if (Math.abs(s[i].s - s[i - 1].s) > 40) assert.equal(s[i].fade, 1, 'zwart bij de sprong');
  assert.equal(P.ritStand(plan, 0).fade, 0);
  assert.equal(P.ritStand(plan, plan.openS + plan.houdS / 2).fade, 1);
  assert.equal(P.ritStand(plan, plan.totaalS).fade, 0);
  for (const x of s) assert.ok(x.fade >= 0 && x.fade <= 1, 'fade blijft tussen 0 en 1');
});

t('de taxi rolt weg uit stilstand en komt tot stilstand bij de bestemming', () => {
  const plan = P.ritTijdplan(9000, { mode: 'taxi', etaS: 900 });
  assert.ok(P.ritStand(plan, 0).v < 1, 'begint in stilstand');
  assert.ok(Math.abs(P.ritStand(plan, plan.openS - 0.01).v - plan.v) < 1.5, 'kruissnelheid aan het eind van het echte begin');
  const sluit = plan.openS + plan.houdS;
  assert.ok(Math.abs(P.ritStand(plan, sluit + 0.01).v - plan.v) < 1.5, 'kruissnelheid aan het begin van het echte einde');
  assert.ok(P.ritStand(plan, sluit + plan.sluitS - 0.01).v < 1, 'remt tot stilstand');
  for (const x of stappen(plan)) assert.ok(x.v >= 0 && x.v < 40, 'snelheid blijft redelijk');
});

t('een korte rit (onder het tijdsbudget) rijd je helemaal, zonder sprong of zwart', () => {
  const plan = P.ritTijdplan(400, { mode: 'taxi', etaS: 160 });
  assert.equal(plan.kort, true);
  assert.equal(plan.sprongM, 0);
  const s = stappen(plan);
  assert.ok(s.every((x) => x.fade === 0), 'geen zwart');
  assert.ok(s.every((x) => x.fase === 'rijden' || x.fase === 'aankomst'));
  assert.equal(s[s.length - 1].s, 400);
  assert.ok(plan.rijS >= 8 && plan.totaalS <= 40, `duur ${plan.totaalS}`);
  assert.equal(P.ritTijdplan(10, { mode: 'taxi' }).rijS, 8, 'ook een heel korte rit duurt minstens 8 s');
});

t('de grens tussen kort en lang volgt het tijdsbudget', () => {
  const kort = P.ritTijdplan(900, { mode: 'taxi', etaS: 200 }), lang = P.ritTijdplan(1100, { mode: 'taxi', etaS: 200 });
  assert.equal(kort.kort, true);
  assert.equal(lang.kort, false);
  assert.ok(kort.totaalS <= 40, 'ook de langste hele rit blijft binnen ~40 s');
  assert.ok(lang.sprongM >= P.RIT.minSprongM, 'een sprong slaat minstens 250 m over');
});

t('de klok loopt mee: aan het eind is de hele reistijd verstreken, en nooit achteruit', () => {
  const plan = P.ritTijdplan(15000, { mode: 'taxi', etaS: 1500 });
  assert.equal(plan.clockMin, 25);
  const s = stappen(plan);
  assert.equal(s[0].minuten, 0);
  assert.equal(s[s.length - 1].minuten, 25);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].minuten >= s[i - 1].minuten - 1e-9, `klok achteruit bij ${s[i].t}`);
  // het grootste deel van de speeltijd zit in de sprong
  const voor = P.ritStand(plan, plan.openS).minuten, na = P.ritStand(plan, plan.openS + plan.houdS).minuten;
  assert.ok(na - voor > 20, `de sprong slaat ${na - voor} van de 25 minuten over`);
  assert.equal(P.ritTijdplan(100, { mode: 'taxi', etaS: 5 }).clockMin, 1, 'minstens een minuut');
});

t('de tekst van de sprong in goed Nederlands', () => {
  assert.equal(P.klokTekst(1), 'Even later');
  assert.equal(P.klokTekst(5), '5 minuten later');
  assert.equal(P.klokTekst(15), 'Een kwartier later');
  assert.equal(P.klokTekst(31), 'Een half uur later');
  assert.equal(P.klokTekst(44), 'Drie kwartier later');
  assert.equal(P.klokTekst(60), 'Een uur later');
  assert.equal(P.klokTekst(90), 'Anderhalf uur later');
  assert.equal(P.klokTekst(135), '2 uur en 15 minuten later');
  assert.equal(P.klokTekst(NaN), 'Even later');
  const plan = P.ritTijdplan(15000, { mode: 'taxi', etaS: 1500 });
  assert.ok(/later$/.test(P.ritStand(plan, plan.openS + 0.5).sprongTekst), 'de stand geeft de tekst in de sprong');
  assert.equal(P.ritStand(plan, 1).sprongTekst, '', 'buiten de sprong geen tekst');
  assert.equal(P.klokLabel(14.5), '14:30');
  assert.equal(P.klokLabel(25.25), '01:15');
  assert.equal(P.klokLabel(13.999), '14:00');
});

t('skippen: niet in de eerste moment, daarna wel, en nooit na het einde', () => {
  assert.equal(P.magSkippen(0.1, false), false);
  assert.equal(P.magSkippen(P.RIT.skipGuardS, false), true);
  assert.equal(P.magSkippen(5, true), false);
});

t('samen spelen: de klok springt alleen als je alleen speelt en de tekst past zich aan', () => {
  const solo = {}, duo = { coopNet: { role: 'host', hub: { roster: { spelers: [{ verbinding: 'ok' }, { verbinding: 'ok' }] } } } };
  assert.equal(meerSpelers(solo), false);
  assert.equal(klokSprongMag(solo), true);
  assert.equal(klokSprongMag(duo), false);
  const plan = P.ritTijdplan(15000, { mode: 'taxi', etaS: 1500 });
  const stand = P.ritStand(plan, plan.openS + 0.5);
  assert.equal(P.sprongTekstVoor(stand, true), stand.sprongTekst);
  assert.equal(P.sprongTekstVoor(stand, false), 'Even later', 'met meer spelers staat er geen klokuitspraak');
  // wie wegvalt of aansluit tijdens de rit: het plan hangt nergens aan de sessie, dus een tweede berekening is gelijk
  assert.deepEqual(P.ritStand(plan, 12), P.ritStand(plan, 12));
});

t('de landing na de rit blijft de bestaande landingsplek bij de bestemming (#932)', () => {
  const doel = { x: 500, y: 700 };
  assert.equal(landingsplek(doel, [{ x: 510, y: 700 }]).x, 510);
  assert.equal(landingsplek(doel, [{ x: 900, y: 700 }]).terugval, true);
});

t('rechts rijden: de taxi rijdt een stukje rechts van de wegas', () => {
  const r = P.rechterBaan({ x: 0, y: 0, a: 0 }, 1.3);
  assert.ok(Math.abs(r.x) < 1e-9 && Math.abs(r.y - 1.3) < 1e-9, 'bij rijrichting +x is rechts +y (kaart-y naar beneden)');
  const r2 = P.rechterBaan({ x: 10, y: 10, a: Math.PI / 2 }, 1);
  assert.ok(Math.abs(r2.x - 9) < 1e-9 && Math.abs(r2.y - 10) < 1e-9);
});

t('de camera zit op de bijrijdersstoel: rechts voorin, met de chauffeur links, kijkend langs de weg', () => {
  const oog = P.taxiOog({ x: 100, y: 50, z: 0, angle: 0 });
  assert.ok(oog.y > 50, 'rechts van het midden: de bijrijder (kaart-y wijst naar rechts bij rijrichting +x)');
  assert.ok(oog.x < 100, 'achter het midden van de taxi: de voorruit is ver genoeg weg');
  assert.ok(oog.z > 1 && oog.z < 1.6, 'op ooghoogte van een zittende');
  const cam = P.taxiCamera(oog, 3);
  assert.ok(cam.lookAt.x > oog.x + 20, 'kijkt vooruit');
  assert.ok(Math.abs(cam.lookAt.y - oog.y) < 30 * Math.sin(1), 'en niet dwars');
  assert.ok(cam.fov > 50 && cam.fov < 90);
  assert.equal(P.taxiOog(null), null);
  // draaien met de taxi: bij een koers van +y (a = 90 graden) zit rechts op de kaart links (-x)
  const o2 = P.taxiOog({ x: 0, y: 0, z: 0, angle: Math.PI / 2 });
  assert.ok(o2.x < -0.3 && o2.y < 0, 'de plek draait mee met de koers');
  assert.ok(Math.abs(o2.fy - 1) < 1e-9 && Math.abs(o2.fx) < 1e-9);
});

t('de passagier kijkt af en toe naar de chauffeur (links) en uit het raam (rechts)', () => {
  let min = 0, max = 0;
  for (let x = 0; x < 20; x += 0.1) { const h = P.kijkHoek(x); min = Math.min(min, h.yaw); max = Math.max(max, h.yaw); }
  assert.ok(min < -0.6, `een blik naar de chauffeur (${min.toFixed(2)})`);
  assert.ok(max > 0.5, `een blik uit het raam (${max.toFixed(2)})`);
  assert.ok(P.kijkHoek(3.0).yaw < -0.5, 'rond 3 s kijkt hij naar de chauffeur: dat valt in het echte begin van de rit');
  assert.ok(Math.abs(P.kijkHoek(0.2).yaw) < 0.15, 'in het begin kijkt hij recht vooruit');
});

t('de blik beweegt zacht en zonder sprongen', () => {
  let prev = P.kijkHoek(0);
  for (let x = 0.05; x < 40; x += 0.05) {
    const h = P.kijkHoek(x);
    assert.ok(Math.abs(h.yaw - prev.yaw) < 0.05 && Math.abs(h.pitch - prev.pitch) < 0.02, `ruk bij ${x}`);
    assert.ok(Math.abs(h.yaw) < 1 && Math.abs(h.pitch) < 0.2, 'blijft binnen een redelijke hoek');
    prev = h;
  }
});

// ---- de trein
const spoor = (naam, y0, trein = 'gtw') => {
  const pts = [[0, y0], [4000, y0], [9000, y0], [14000, y0]];
  return { name: naam, train: trein, pts, s: [0, 4000, 9000, 14000], len: 14000 };
};
const routes = [spoor('Noord', 0), spoor('Zuid', 500, 'virm')];

t('de treinreis vindt zijn spoor bij de punten van het treinstuk', () => {
  const leg = { kind: 'train', line: 'Zuid', pts: [[200, 500], [9000, 500], [12000, 500]], length: 11800 };
  const stuk = P.treinStuk(leg, routes);
  assert.equal(stuk.naam, 'Zuid');
  assert.equal(stuk.type, 'virm');
  assert.equal(stuk.dir, 1);
  assert.ok(Math.abs(stuk.s0 - 200) < 1e-6 && Math.abs(stuk.s1 - 12000) < 1e-6);
  const terug = P.treinStuk({ kind: 'train', line: 'Noord', pts: [[10000, 0], [1000, 0]], length: 9000 }, routes);
  assert.equal(terug.dir, -1, 'de andere kant op');
  assert.equal(P.treinStuk({ kind: 'train', pts: [[0, 9000], [100, 9000]], length: 100 }, routes), null, 'geen spoor in de buurt: geen echte rit');
  assert.equal(P.treinStuk(leg, []), null);
  assert.equal(P.treinStuk(null, routes), null);
});

t('een overstap geeft twee stukken: het eerste voor het begin, het laatste voor het einde', () => {
  const legs = [
    { kind: 'walk', pts: [[0, 0], [10, 0]], length: 10 },
    { kind: 'train', line: 'Noord', pts: [[10, 0], [9000, 0]], length: 8990 },
    { kind: 'train', line: 'Zuid', pts: [[300, 500], [12000, 500]], length: 11700 },
    { kind: 'walk', pts: [[12000, 500], [12050, 500]], length: 50 },
  ];
  const st = P.treinStukken(legs, routes);
  assert.equal(st.A.naam, 'Noord');
  assert.equal(st.C.naam, 'Zuid');
  assert.equal(st.enkel, false);
  assert.equal(st.lengthM, 8990 + 11700);
  assert.equal(P.treinStukken([legs[0]], routes), null, 'zonder treinstuk geen echte treinrit');
  const een = P.treinStukken([legs[1]], routes);
  assert.equal(een.enkel, true);
  assert.equal(een.A, een.C);
});

t('de boog op het spoor volgt de rijrichting en blijft op het spoor', () => {
  const heen = { s0: 1000, s1: 9000, dir: 1, route: { len: 14000 } }, terug = { s0: 9000, s1: 1000, dir: -1, route: { len: 14000 } };
  assert.equal(P.spoorBoog(heen, 250), 1250);
  assert.equal(P.spoorBoog(terug, 250), 8750);
  assert.equal(P.spoorBoog(terug, 99999), 0);
});

t('de treinrit gebruikt dezelfde tijdsplanning en wisselt de opnamen: zij, raam, zij', () => {
  const plan = P.ritTijdplan(11700, { mode: 'trein', etaS: 1100 });
  assert.equal(plan.kort, false);
  assert.ok(plan.totaalS >= 18 && plan.totaalS <= 30);
  assert.equal(P.treinBeeld(plan, P.ritStand(plan, 0.5)), 'zij', 'de trein rijdt weg: naast de trein');
  assert.equal(P.treinBeeld(plan, P.ritStand(plan, 6)), 'raam');
  assert.equal(P.treinBeeld(plan, P.ritStand(plan, plan.openS + plan.houdS + plan.sluitS - 0.5)), 'zij', 'de trein rolt binnen');
  assert.equal(P.treinBeeld(plan, P.ritStand(plan, plan.totaalS)), 'zij', 'bij de aankomst staat hij naast het perron');
  const car = { x: 100, y: 0, angle: 0, z: 0 };
  const raam = P.treinCamera(car, 1, 'raam'), zij = P.treinCamera(car, 1, 'zij');
  assert.ok(raam.position.y > 0 && raam.lookAt.y > raam.position.y + 30, 'het raam kijkt zijwaarts de polder in');
  assert.ok(zij.lookAt.x > car.x, 'de zijopname kijkt naar de trein en vooruit');
  const terug = P.treinCamera(car, -1, 'raam');
  assert.ok(terug.position.y < 0, 'de andere rijrichting zit aan de andere kant');
});

t('de terugval: zonder pad of spoor geen echte rit (dan de oude scène)', () => {
  assert.equal(P.ritKanEcht('taxi', { pad: null }), false);
  assert.equal(P.ritKanEcht('taxi', { pad: [[0, 0]] }), false);
  assert.equal(P.ritKanEcht('taxi', { pad: [[0, 0], [10, 0]] }), false, 'een pad van 10 m is te kort');
  assert.equal(P.ritKanEcht('taxi', { pad: [[0, 0], [500, 0]] }), true);
  assert.equal(P.ritKanEcht('taxi', { pad: [[0, 0], [NaN, 0]] }), false, 'een kapot punt telt niet');
  assert.equal(P.ritKanEcht('trein', { stukken: null }), false);
  assert.equal(P.ritKanEcht('trein', { stukken: { A: {}, C: {}, lengthM: 5000 } }), true);
  assert.equal(P.ritKanEcht('bus', { pad: [[0, 0], [500, 0]] }), false, 'bus en boot houden de oude scène');
});

t('ook een rare invoer geeft een geldig plan (geen NaN, geen nul)', () => {
  for (const l of [0, -5, NaN, undefined, 1e7]) {
    const plan = P.ritTijdplan(l, { mode: 'trein', etaS: NaN });
    assert.ok(Number.isFinite(plan.totaalS) && plan.totaalS > 0, `totaal bij ${l}`);
    const s = P.ritStand(plan, plan.totaalS / 2);
    assert.ok(Number.isFinite(s.s) && Number.isFinite(s.v) && Number.isFinite(s.minuten), `stand bij ${l}`);
  }
});

console.log(`ritpad_test: ${n}/${n} ok`);
