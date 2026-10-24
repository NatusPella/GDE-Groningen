// Coöp fase 2 (#95): rollen, missiestatus en cutscene-regie (game/js/cooproles.js).
import assert from 'node:assert/strict';
import * as R from '../game/js/cooproles.js';
import * as S from '../game/js/coopstate.js';
import { STEPS } from '../game/js/storyarc.js';
import { STEPS as NIEUW } from '../game/js/storyarc_nieuw.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('alle verhaalstappen hebben een geldige coöp-regel', () => {
  assert.deepEqual(R.auditSteps(STEPS), []);
});
t('alle akten hebben voor elke stap een geldige coöp-regel; nieuwe akten gaan zonder aanpassing mee', () => {
  assert.deepEqual(R.auditSteps(NIEUW), []);
  assert.ok(NIEUW.length > 0);
});
t('M21 is solo: Tessa speelt, Tammo kijkt; wisselcutscene geeft geen bestuurswissel', () => {
  const m21 = STEPS.find((s) => s.id === 'M21');
  const r = R.coopRule(m21, 2);
  assert.equal(r.presence, 'een'); assert.equal(r.activeSlot, 1); assert.deepEqual(r.spectators, [0]);
  assert.equal(r.swapControl, false);
});
t('missies vragen beiden; activiteiten dichtstbij', () => {
  assert.equal(R.coopRule(STEPS.find((s) => s.id === 'M03'), 2).presence, 'beide');
  assert.equal(R.coopRule(STEPS.find((s) => s.id === 'T1'), 2).presence, 'dichtstbij');
});
t('alleen spelen: metgezel volgt, wacht bij solo, neemt plek van tweede persoon', () => {
  const h6 = R.coopRule(STEPS.find((s) => s.id === 'M06'), 1);
  assert.equal(h6.needsTwo, true); assert.deepEqual(h6.companionSlots, [1]);
  assert.equal(R.companionMode(h6, 1), 'volg');
  assert.equal(R.companionMode(R.coopRule(STEPS.find((s) => s.id === 'M21'), 1), 1), 'wacht');
  assert.equal(R.companionMode(h6, 2), 'mens');
});
t('wie praat en wie beslist', () => {
  assert.equal(R.speakerSlot('tammo'), 0); assert.equal(R.speakerSlot('anita'), 1); assert.equal(R.speakerSlot('rikus'), null);
  const solo = R.coopRule(STEPS.find((s) => s.id === 'M21'), 2);
  assert.equal(R.decider(solo, 0), 1);
  assert.equal(R.decider(solo, 0, [true, false]), 0, 'valt weg: de ander');
  const both = R.coopRule(STEPS.find((s) => s.id === 'M03'), 2);
  assert.equal(R.decider(both, 1), 1);
});
t('missie: voortgang alleen vooruit, falen bij teamDown, medaille op teamresultaat', () => {
  const m = R.createMission('M03'), st = S.createCoopState();
  R.advance(m, 2); R.advance(m, 1); assert.equal(m.stage, 2);
  S.damage(st, 0, 999); assert.equal(R.checkFail(m, st), 'run');
  S.damage(st, 1, 999); assert.equal(R.checkFail(m, st), 'fail');
  const m2 = R.createMission('M04'); for (let i = 0; i < 6; i++) R.addKill(m2, 0); for (let i = 0; i < 5; i++) R.addKill(m2, 1);
  R.pass(m2); assert.equal(m2.medal, 'zilver');
  assert.equal(R.pass(m), 'fail', 'mislukt blijft mislukt');
});
t('aanwezigheid: beide, dichtstbij, een', () => {
  const both = { presence: 'beide' }, near = { presence: 'dichtstbij' }, one = { presence: 'een', activeSlot: 1 };
  assert.equal(R.mayProceed(both, [3, 40]), false);
  assert.equal(R.mayProceed(both, [3, 40], [true, false]), true, 'dode telt niet mee');
  assert.equal(R.mayProceed(near, [3, 40]), true);
  assert.equal(R.mayProceed(one, [3, 40]), false); assert.equal(R.mayProceed(one, [40, 3]), true);
});
t('cutscene: start bij beiden klaar of time-out, overslaan vraagt beide', () => {
  const rule = R.coopRule(STEPS[0], 2);
  const a = R.createCutscene('x', rule);
  R.tickCutscene(a, 1); assert.equal(a.started, false);
  R.markReady(a, 0); R.markReady(a, 1); R.tickCutscene(a, 0.1); assert.equal(a.started, true);
  const b = R.createCutscene('y', rule); R.tickCutscene(b, 9); assert.equal(b.started, true, 'time-out');
  assert.equal(R.holdSkip(a, 0, true), false); assert.equal(R.holdSkip(a, 1, true), true);
  const c = R.createCutscene('z', rule); assert.equal(R.holdSkip(c, 0, true, 1), true, 'alleen: één stem');
  assert.deepEqual(R.cutsceneCast(1, R.coopRule(STEPS[0], 1)), ['mens', 'npc']);
});
t('rollen per speler (#455): eigen verhaalrol, tijdelijk de rol van de stap, metgezel alleen als die nodig is', () => {
  const m03 = STEPS.find((s) => s.id === 'M03'), m21 = STEPS.find((s) => s.id === 'M21');
  assert.equal(R.eigenVerhaalrol({ character: 'anita' }), 'anita');
  assert.equal(R.eigenVerhaalrol({}), 'tammo');
  const tammoInTessa = R.rolVoorSpeler(m21, { character: 'tammo' });
  assert.deepEqual(tammoInTessa, { rol: 'anita', eigen: 'tammo', tijdelijk: true });
  assert.equal(R.metgezelVoorSpeler(m03, { character: 'anita' }), 'tammo', 'de andere verhaalrol is de metgezel');
  assert.equal(R.metgezelVoorSpeler(m21, { character: 'tammo' }), null, 'een solo-stap heeft geen metgezel');
  const cs = R.cutsceneRol(m03, { character: 'anita' });
  assert.equal(cs.rol, 'anita'); assert.equal(cs.metgezel, 'tammo'); assert.equal(cs.avatarsZichtbaar, false); assert.equal(cs.metgezelEenmalig, true);
});
t('registry: nieuwe functies registreren hun regel; onbekende krijgen een veilige standaard', () => {
  assert.deepEqual(R.coopRegel('scene', 'nog-niet-bestaand'), { spelers: 'een', wacht: false });
  assert.equal(R.isGeregistreerd('minigame', 'padel'), true);
  R.registerCoop('minigame', 'pg_nieuw', { spelers: 'twee' });
  assert.equal(R.coopRegel('minigame', 'pg_nieuw').spelers, 'twee');
  assert.deepEqual(R.minigameSpelers('pg_nieuw', 1), { spelers: [0, 1], kijkers: [] });
  assert.deepEqual(R.minigameSpelers('pg_nieuw', 1, 1), { spelers: [1], kijkers: [] });
  assert.deepEqual(R.minigameSpelers('carbid', 0), { spelers: [0], kijkers: [1] });
  assert.deepEqual(R.minigameSpelers('onbekend', 1), { spelers: [1], kijkers: [0] });
});
t('registry: ongeldige regels worden geweigerd', () => {
  assert.throws(() => R.registerCoop('rommel', 'x', {}));
  assert.throws(() => R.registerCoop('minigame', '', { spelers: 'een' }));
  assert.throws(() => R.registerCoop('minigame', 'x', { spelers: 'drie' }));
  assert.throws(() => R.registerCoop('voertuig', 'x', { stoelen: 0 }));
});
t('alle voertuigen: fiets en step hebben een stoel, de rest twee; de stoelen gelden bij het instappen', () => {
  assert.equal(R.coopRegel('voertuig', 'fiets').stoelen, 1);
  assert.equal(R.coopRegel('voertuig', 'heli').stoelen, 2);
  assert.equal(R.coopRegel('voertuig', 'nieuw-voertuig').stoelen, 2);
  const st = S.createCoopState(), v = {};
  assert.equal(S.enterVehicle(st, v, 0, 'f', null, R.coopRegel('voertuig', 'fiets').stoelen), 'driver');
  assert.equal(S.enterVehicle(st, v, 1, 'f', null, 1), null, 'op een fiets past er een');
  assert.equal(S.enterVehicle(st, v, 1, 'a', 'passenger', 1), 'driver', 'een eenzitter heeft geen bijrijdersplek: wie instapt stuurt');
});
console.log(`cooproles_test: ${n}/${n} ok`);
