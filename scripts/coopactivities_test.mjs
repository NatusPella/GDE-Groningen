// Samen spelen (#95): coöp-activiteiten voor 2 tot 8 spelers (game/js/coopactivities.js).
import assert from 'node:assert/strict';
import * as A from '../game/js/coopactivities.js';
import { registerCoop, coopRegel, isGeregistreerd, minigameSpelers, rolVoorSlot, coopRule, createCutscene, markReady, tickCutscene, holdSkip } from '../game/js/cooproles.js';
import { STEPS } from '../game/js/storyarc.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('alle gewenste soorten staan in het cooproles-model: achtervolging, overval, minigames, reuzenrad, padel dubbel', () => {
  for (const id of ['achtervolging', 'overval', 'reuzenrad', 'padel-dubbel', 'kartrace-duo']) {
    assert.equal(isGeregistreerd('activiteit', id), true, id);
    assert.equal(coopRegel('activiteit', id).spelers, 'twee');
    assert.ok(coopRegel('activiteit', id).max >= 4, 'minimaal 4 spelers per opdracht waar dat kan');
  }
  assert.equal(coopRegel('activiteit', 'kartrace-duo').max, 8);
});
t('namen en teksten zijn Nederlands, verzonnen, en tonen geen geweld', () => {
  for (const a of A.CATALOGUS) {
    assert.ok(a.naam.length > 3 && a.tekst.length > 10);
    assert.doesNotMatch(a.naam + a.tekst, /doden|vermoord|bloed|schiet|slachtoffer/i, a.id);
  }
});
t('starten: medespeler nodig, dichtbij, niet tijdens een andere opdracht; met N spelers doen de nabije mee', () => {
  assert.match(A.mayStart('padel-dubbel', { aanwezig: [0] }).reden, /medespeler/);
  assert.match(A.mayStart('padel-dubbel', { aanwezig: [0, 1], afstanden: { 1: 200 } }).reden, /te ver/);
  assert.match(A.mayStart('padel-dubbel', { aanwezig: [0, 1], afstanden: { 1: 5 }, actief: true }).reden, /lopende opdracht/);
  assert.deepEqual(A.mayStart('padel-dubbel', { aanwezig: [0, 1], afstanden: { 1: 5 } }), { ok: true, spelers: [0, 1] });
  const vier = A.mayStart('padel-dubbel', { aanwezig: [0, 1, 2, 3], afstanden: { 1: 5, 2: 400, 3: 8 } });
  assert.deepEqual(vier, { ok: true, spelers: [0, 1, 3] }, 'wie te ver weg is doet niet mee');
  const acht = A.mayStart('kartrace-duo', { aanwezig: [0, 1, 2, 3, 4, 5, 6, 7] });
  assert.equal(acht.spelers.length, 8);
  assert.equal(A.mayStart('padel-dubbel', { aanwezig: [0, 1, 2, 3, 4, 5], afstanden: {} }).spelers.length, 4, 'het maximum van de opdracht');
  assert.match(A.mayStart('bestaat-niet', { aanwezig: [0, 1] }).reden, /kennen we niet/);
  assert.deepEqual(A.mayStart('reuzenrad', { samen: true, afstand: 5 }), { ok: true, spelers: [0, 1] }, 'oude vorm werkt nog');
});
t('slagen met twee: samen precies de beloning, ieder naar zijn bijdrage, medaille op het totaal', () => {
  const a = A.createActivity('overval');
  A.addPoints(a, 0, 8); A.addPoints(a, 1, 12);
  const u = A.complete(a);
  assert.equal(u.geslaagd, true); assert.equal(a.state, 'geslaagd');
  assert.equal(u.geld[0] + u.geld[1], 600); assert.ok(u.geld[1] > u.geld[0]); assert.equal(u.medaille, 'goud');
  assert.equal(A.complete(a), u, 'tweede keer geeft hetzelfde');
});
t('slagen met vier en met acht: ieder zijn eigen deel, samen (bijna) de volledige beloning, extra spelers doen mee', () => {
  const a = A.createActivity('kartrace-duo', [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const s of a.spelers) A.addPoints(a, s, s + 1);
  const u = A.complete(a);
  const som = Object.values(u.geld).reduce((x, y) => x + y, 0);
  assert.ok(som <= 250 && som >= 250 - 8, `som ${som}`);
  assert.ok(u.geld[7] > u.geld[0], 'wie meer deed krijgt meer'); assert.ok(u.geld[0] > 0);
  assert.equal(Object.keys(u.geld).length, 8);
  const b = A.createActivity('padel-dubbel', [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(b.spelers, [0, 1, 2, 3], 'hoogstens het maximum van de opdracht');
});
t('zonder punten delen ze gelijk; negatieve punten tellen niet; onbekende speler telt niet mee', () => {
  const a = A.createActivity('reuzenrad'); A.addPoints(a, 0, -5); A.addPoints(a, 5, 100);
  const u = A.complete(a); assert.deepEqual(u.geld, { 0: 75, 1: 75 }); assert.equal(a.punten[0], 0); assert.equal(5 in a.punten, false);
});
t('tijd om: mislukt met een klein bedrag, geen medaille', () => {
  const a = A.createActivity('reuzenrad');
  assert.equal(A.tick(a, 100), 'bezig'); assert.equal(A.tick(a, 100), 'mislukt');
  assert.equal(a.uitkomst.geslaagd, false); assert.equal(Object.values(a.uitkomst.geld).reduce((x, y) => x + y, 0) <= 15, true); assert.equal(a.uitkomst.medaille, null);
});
t('een speler valt weg: de opdracht loopt door zolang er genoeg spelers zijn, zonder beloning voor wie weg is', () => {
  const a = A.createActivity('achtervolging', [0, 1, 2, 3]); A.addPoints(a, 3, 9);
  assert.equal(A.verlaat(a, 3), 'bezig'); assert.equal(A.verlaat(a, 3), 'bezig');
  const u = A.complete(a);
  assert.equal(3 in u.geld, false); assert.equal(Object.keys(u.geld).length, 3);
  const b = A.createActivity('achtervolging', [0, 1]);
  assert.equal(A.verlaat(b, 1), 'afgebroken'); assert.equal(A.complete(b), null); assert.equal(A.tick(b, 1000), 'afgebroken');
  assert.equal(A.cancel(A.createActivity('overval')), 'afgebroken');
});
t('de Kluisklus (#438): samen met een eigen rol en een gedeelde buit, of tegen elkaar', () => {
  // samen: elke speler heeft rollen, de buit is de hele beloning en de rollen tellen
  const samen = A.maakOverval([0, 1], 'samen');
  assert.deepEqual(samen.rollen.map((r) => r.slot), [0, 1]);
  assert.deepEqual(A.overvalRol(samen, 0), ['uitkijk', 'kluis']);
  assert.deepEqual(A.overvalRol(samen, 1), ['loper', 'schipper']);
  assert.equal(A.overvalRol(samen, 9).length, 0);
  assert.match(samen.modusTekst, /gedeeld/);
  A.addPoints(samen, 0, 4); A.addPoints(samen, 1, 1);
  const u = A.complete(samen);
  assert.equal(u.modus, 'samen'); assert.equal(u.winnaar, null);
  assert.equal(Object.values(u.geld).reduce((x, y) => x + y, 0), 600);
  assert.equal(u.geld[0], u.geld[1], 'eerlijk gedeeld; een oneven rest gaat naar wie het meest deed (heistrollen_test)');
  // tegen elkaar: ieder houdt wat hij zelf haalde, de grootste buit wint
  const tegen = A.maakOverval([0, 1, 2], 'tegen');
  assert.equal(tegen.modus, 'tegen');
  assert.equal(tegen.rollen.flatMap((r) => r.rollen).length, 4, 'met drie spelers zijn alle rollen bezet');
  A.addPoints(tegen, 0, 1); A.addPoints(tegen, 1, 9); A.addPoints(tegen, 2, 2);
  const v = A.complete(tegen);
  assert.equal(v.winnaar, 1);
  assert.equal(Object.values(v.geld).reduce((x, y) => x + y, 0), 600);
  assert.ok(v.geld[1] > v.geld[2] && v.geld[2] >= v.geld[0], 'de grootste buit wint');
  // een onbekende stand is samen delen; wie wegvalt verdeelt de rollen opnieuw
  const raar = A.maakOverval([0, 1], 'iets');
  assert.equal(raar.modus, 'samen');
  const weg = A.maakOverval([0, 1, 2], 'samen');
  assert.equal(A.verlaat(weg, 2), 'bezig');
  assert.equal(weg.rollen.flatMap((r) => r.rollen).length, 4, 'de rollen van de overgebleven spelers');
  assert.deepEqual(weg.rollen.map((r) => r.slot), [0, 1]);
  // de gewone activiteit houdt de oude verdeling (geen rollen)
  const oud = A.createActivity('overval');
  assert.equal(oud.rollen, undefined);
});
t('uitbetalen: ieder in zijn eigen portemonnee, precies een keer', () => {
  const a = A.createActivity('padel-dubbel', [0, 1, 2, 3]); for (const s of a.spelers) A.addPoints(a, s, 5); A.complete(a);
  const wallet = {};
  assert.equal(A.payOut(a, (slot, g) => { wallet[slot] = (wallet[slot] || 0) + g; }), true);
  assert.equal(Object.values(wallet).reduce((x, y) => x + y, 0), 200); assert.equal(new Set(Object.values(wallet)).size, 1);
  assert.equal(A.payOut(a, () => { throw new Error('dubbel'); }), false);
});
t('minigames voor N: padel dubbel met vier, kartrace met acht, de rest kijkt', () => {
  assert.deepEqual(minigameSpelers('padel', 2, [0, 1, 2, 3, 4]), { spelers: [0, 1, 2, 3], kijkers: [4] });
  assert.deepEqual(minigameSpelers('padel', 4, [0, 1, 2, 3, 4]), { spelers: [0, 1, 2, 4], kijkers: [3] }, 'de starter speelt altijd mee');
  assert.equal(minigameSpelers('kartrace', 0, [0, 1, 2, 3, 4, 5, 6, 7]).spelers.length, 8);
  assert.deepEqual(minigameSpelers('carbid', 2, [0, 1, 2, 3]), { spelers: [2], kijkers: [0, 1, 3] });
  assert.deepEqual(minigameSpelers('pg_koe', 1, 1), { spelers: [1], kijkers: [] });
});
t('hoofdverhaal: extra spelers doen niet mee en houden niets op; de hoofdpersonen volgen de regel', () => {
  const beide = coopRule(STEPS.find((s) => s.id === 'M03'), 2), solo = coopRule(STEPS.find((s) => s.id === 'M21'), 2);
  assert.deepEqual(rolVoorSlot(beide, 0), { rol: 'speelt', speelt: true, houdtOp: true });
  assert.deepEqual(rolVoorSlot(beide, 3), { rol: 'wereld', speelt: false, houdtOp: false });
  assert.deepEqual(rolVoorSlot(solo, 1), { rol: 'speelt', speelt: true, houdtOp: true });
  assert.deepEqual(rolVoorSlot(solo, 0), { rol: 'kijkt', speelt: false, houdtOp: false });
});
t('scènes: extra spelers houden de scène niet op en kunnen hem niet overslaan', () => {
  const rule = coopRule(STEPS[0], 2), cs = createCutscene('x', rule);
  markReady(cs, 2); markReady(cs, 3); assert.equal(cs.ready.length, 2);
  markReady(cs, 0); assert.equal(markReady(cs, 1), true);
  holdSkip(cs, 0, true); holdSkip(cs, 2, true); assert.equal(cs.done, false);
  assert.equal(holdSkip(cs, 1, true), true);
});
t('uitbreidbaar: een nieuwe activiteit registreren is genoeg; min en max worden gecontroleerd', () => {
  registerCoop('activiteit', 'reuzenrad-nacht', { spelers: 'twee', beloning: 99, tijd: 60, min: 2, max: 6 });
  assert.equal(A.mayStart('reuzenrad-nacht', { aanwezig: [0, 1] }).ok, true);
  assert.equal(A.complete(A.createActivity('reuzenrad-nacht')).geld[0], 49);
  assert.throws(() => registerCoop('activiteit', 'x', { spelers: 'twee', beloning: -1 }));
  assert.throws(() => registerCoop('activiteit', 'x', { spelers: 'twee', beloning: 1, min: 5, max: 2 }));
  assert.throws(() => registerCoop('activiteit', 'x', { spelers: 'twee', beloning: 1, max: 9 }));
});
console.log(`coopactivities_test: ${n}/${n} ok`);
