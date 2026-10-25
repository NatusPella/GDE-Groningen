// Samen spelen (#434): een gast boert op zijn eigen akker in de wereld van wie het spel opende. De klus is een lokale minigame
// (game/js/boerderijgast.js): vier werkgangen, telkens op het juiste moment Spatie. Het materiaal gaat van zijn eigen geld af,
// de oogst en de loopbaanpunten gaan naar zijn eigen boerderij. Geen trekker in de wereld van de host.
import assert from 'node:assert/strict';

// Eigen opslag, nooit de echte (AGENTS.md): de boerderij staat in gde-boerderij-v1.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const { maakKlus, tikKlus, akkerPlek, volgendeKlus, BOEREN, RONDEN, TREFFER } = await import('../game/js/boerderijgast.js');
const { getBoerderij } = await import('../game/js/boerderijlive.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const midden = (k) => Math.abs(k.pos - 0.5) <= TREFFER;

function naarMidden(k) {
  for (let i = 0; i < 4000 && !midden(k); i++) tikKlus(k, 1 / 120, false);
  assert.ok(midden(k), 'de balk komt langs het midden');
}

t('de balk gaat heen en weer en telt alleen een slag in het midden', () => {
  const k = maakKlus('ploegen', () => 0);
  const p0 = k.pos;
  tikKlus(k, 0.1, false);
  assert.notEqual(k.pos, p0, 'zonder slag beweegt de balk');
  k.pos = 0.95; k.richt = 1;
  assert.equal(tikKlus(k, 0.001, true).raak, false, 'aan de rand is het naast de baan');
  assert.equal(k.ronde, 1); assert.equal(k.raak, 0);
  for (let w = 0; w < 40 && k.wacht > 0; w++) tikKlus(k, 1 / 120, false);
  naarMidden(k);
  const ev = tikKlus(k, 0.001, true);
  assert.equal(ev.raak, true); assert.equal(ev.klaar, false); assert.equal(k.raak, 1);
  assert.equal(k.ronde, 2); assert.equal(k.wacht > 0, true, 'even wachten voor de volgende werkgang');
  assert.equal(tikKlus(k, 0.01, true), null, 'tijdens de wacht telt een tweede druk niet');
});

t('vier werkgangen: alles raak geeft een volle klus, missen tellen mee', () => {
  const k = maakKlus('ploegen', () => 0);
  const uitslagen = [];
  for (let i = 0; i < RONDEN; i++) {
    naarMidden(k);
    uitslagen.push(tikKlus(k, 0.001, true));
    for (let w = 0; w < 40 && k.wacht > 0; w++) tikKlus(k, 1 / 120, false);
  }
  assert.equal(k.klaar, true); assert.equal(k.fractie, 1);
  assert.deepEqual(uitslagen.map((u) => u.raak), [true, true, true, true]);
  assert.equal(k.uitslag.length, RONDEN);

  const m = maakKlus('ploegen', () => 0);
  for (let i = 0; i < RONDEN; i++) {
    m.pos = i % 2 ? 0.5 : 0.02; // om en om raak en mis
    tikKlus(m, 0.001, true);
    for (let w = 0; w < 40 && m.wacht > 0; w++) tikKlus(m, 1 / 120, false);
  }
  assert.equal(m.klaar, true); assert.equal(m.fractie, 0.5);
});

t('de akker: het eigen perceel, anders de vaste akker bij Hoogkerk; de eerste klus is ploegen', () => {
  const p = akkerPlek({});
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.equal(volgendeKlus(), 'ploegen');
});

t('de gast ziet het prompt alleen bij zijn eigen akker en niet als host', () => {
  const p = akkerPlek({});
  const gast = { coopRole: 'client', player: { x: p.x, y: p.y }, money: 100, messages: [], addMessage(m) { this.messages.push(m); } };
  const pr = BOEREN.prompt(gast);
  assert.equal(pr && pr.id, 'boeren'); assert.match(pr.sub, /ploegen/i); assert.equal(pr.key, 'E');
  assert.equal(BOEREN.prompt({ ...gast, coopRole: 'host' }), null, 'de host heeft zijn eigen trekker');
  assert.equal(BOEREN.prompt({ ...gast, player: { x: p.x + 200, y: p.y } }), null, 'te ver van de akker');
  assert.equal(BOEREN.prompt({ ...gast, coopInVoertuig: true }), null, 'in een voertuig niet');
});

t('starten en stoppen: het werk is van de gast en de oogst gaat naar zijn eigen boerderij', () => {
  const p = akkerPlek({});
  const gast = { coopRole: 'client', player: { x: p.x, y: p.y }, money: 100, messages: [], addMessage(m) { this.messages.push(m); } };
  let druk = false;
  gast.input = {
    wasPressed: (k) => (k === ' ' ? druk : false),
    consume: () => { druk = false; },
  };
  assert.equal(BOEREN.interact(gast), true, 'E bij de akker start de klus');
  assert.equal(BOEREN.isActive(), true);
  for (let r = 0; r < RONDEN; r++) {
    const s = BOEREN.debug().state();
    for (let i = 0; i < 4000 && Math.abs(s.pos - 0.5) > 0.02; i++) BOEREN.update(1 / 240, gast);
    druk = true;
    BOEREN.update(1 / 240, gast);
    for (let w = 0; w < 60; w++) BOEREN.update(1 / 240, gast);
  }
  assert.equal(BOEREN.isActive(), false, 'na vier werkgangen is de klus klaar');
  assert.equal(getBoerderij().veld.fase, 'geploegd', 'zijn eigen akker is geploegd');
  assert.ok(gast.messages.some((m) => /Ploegen: klaar/.test(m)), JSON.stringify(gast.messages));

  assert.equal(BOEREN.interact(gast), true, 'de volgende klus');
  assert.equal(BOEREN.quit(gast), undefined);
  assert.equal(BOEREN.isActive(), false, 'stoppen laat niets hangen');
  assert.ok(gast.messages.some((m) => /Je stopt met de klus/.test(m)));
});

console.log(`boerderijgast_test: ${n}/${n} ok`);
process.exit(0);
