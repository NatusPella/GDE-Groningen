// Samen spelen (#449): een eigen voertuig meenemen naar de wereld van een ander
// (bezorgen en delen). De regel is puur (coopbezit.js); de host zet de kopie neer.
// Hier zonder Electron en zonder three.js:
//   node scripts/coopbezit_test.mjs
import assert from 'node:assert/strict';
import {
  RECHTEN, STANDAARD_RECHT, MAX_BEZORG, nieuweDeelStaat, rechtVan, zetDeelRecht, wisselRecht,
  magGebruiken, leesBezorg, bezorgEvent, bezorgVraag, bezorgControle, bezorgHost, bezorgWeg,
  bezorgAllesWeg, zetDeelHaken,
} from '../game/js/coopbezit.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok  ' + naam); };

const SPEC = {
  hero: { label: 'Fjord Escapade', kind: 'car', color: '#a11f1f', model: { name: 'escort', len: 4, wid: 1.65, maxSpeed: 50 } },
  mug: { label: 'Hunze Mug', kind: 'car', color: '#2e6b9e', model: { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 42 } },
  sloep: { label: 'Sloep Nait Soezen', kind: 'boat', color: '#e8e6e0', model: { name: 'boat', len: 5, wid: 1.9, maxSpeed: 7 } },
};
// De nepwereldhaken: dezelfde vorm die main.js zet, zonder de echte wereld.
zetDeelHaken({
  spec: (key) => SPEC[key] || null,
  plek: () => ({ x: 20, y: 30, angle: 0.5 }),
  maak: (world, g, x, y, angle) => {
    const v = { x, y, angle, model: { ...g.spec.model, color: g.color }, color: g.color, upgrades: g.upgrades, health: g.health, dentLog: g.dents || [], flat: g.flat };
    world.vehicles.push(v);
    return v;
  },
});

function mkWorld() {
  const w = {
    coop: { remote: true }, companion: { x: 12, y: 8, angle: 0 },
    coopFigures: { 2: { slot: 2, x: 40, y: 40, angle: 0 } },
    vehicles: [], berichten: [], meldingen: [], aan: [],
    coopRoster: [{ slot: 1, naam: 'Tessa' }, { slot: 2, naam: 'Sven' }],
    addMessage(t) { this.berichten.push(t); },
    coopMeld(slot, t) { this.meldingen.push([slot, t]); },
    coopNet: { role: 'host', hub: { roster: { spelers: [{ slot: 0 }, { slot: 1 }, { slot: 2 }] }, announce(b, s) { w.aan.push([b, s]); } } },
  };
  return w;
}
const vraag = (extra = {}) => ({ k: 'bezorg', id: 'hero', color: '#a11f1f', upgrades: ['tyres1'], dents: [], health: 100, recht: 'iedereen', ...extra });

t('rechten: standaard deelt iedereen, alleen ik houdt hem voor jezelf, onzin verandert niets', () => {
  const s = nieuweDeelStaat();
  assert.equal(rechtVan(s, 'hero'), STANDAARD_RECHT);
  assert.equal(RECHTEN.includes(STANDAARD_RECHT), true);
  assert.equal(zetDeelRecht(s, 'hero', 'ik'), 'ik');
  assert.equal(rechtVan(s, 'hero'), 'ik');
  assert.equal(zetDeelRecht(s, 'hero', 'vrienden'), null, 'nog geen vriendenlijst: geen recht');
  assert.equal(rechtVan(s, 'hero'), 'ik', 'een onbekend recht laat de keuze staan');
  assert.equal(wisselRecht('ik'), 'iedereen'); assert.equal(wisselRecht('iedereen'), 'ik');
  assert.equal(zetDeelRecht(null, 'hero', 'ik'), null);
});

t('magGebruiken: de eigenaar altijd, een ander alleen als de eigenaar deelt (de host rijdt in zijn eigen wereld)', () => {
  assert.equal(magGebruiken('iedereen', 2, 1), true);
  assert.equal(magGebruiken('ik', 2, 1), false);
  assert.equal(magGebruiken('ik', 1, 1), true, 'de eigenaar zelf');
  assert.equal(magGebruiken(undefined, 2, 1), true, 'zonder recht: standaard delen');
  assert.equal(magGebruiken('ik', 0, 1), false, 'de host is ook maar een speler');
});

t('leesBezorg: alleen gegevens, en wat de host leest is gecontroleerd (een gast kan niets forceren)', () => {
  assert.equal(leesBezorg(null), null);
  assert.equal(leesBezorg({ k: 'iets' }), null);
  assert.equal(leesBezorg(vraag({ id: 'hero drop table' })), null);
  assert.equal(leesBezorg(vraag({ id: '' })), null);
  const v = leesBezorg(vraag({
    color: 'rood', upgrades: ['tyres1', 5, 'x'.repeat(40), null], dents: [[1, 2, 3], [1, 2], ['a', 'b', 'c'], [9, -9, 0.5]], health: 500, recht: 'vrienden',
  }));
  assert.equal(v.color, null, 'geen hex: de fabriekskleur');
  assert.deepEqual(v.upgrades, ['tyres1'], 'alleen echte onderdeelnamen');
  assert.deepEqual(v.dents, [[1, 2, 2], [2, -2, 0.5]], 'drie getallen per deuk, binnen de maat');
  assert.equal(v.health, 100, 'de gezondheid blijft tussen 5 en 100');
  assert.equal(v.recht, STANDAARD_RECHT, 'een onbekend recht valt terug op de standaard');
  assert.equal(leesBezorg(vraag({ health: -20 })).health, 5);
});

t('een gast stuurt alleen een vraag: niets van zijn wereld of save gaat mee en er verschijnt niets bij hem', () => {
  const w = { player: { inVehicle: null }, vehicles: [], coopBezit: nieuweDeelStaat(), verstuurd: [] };
  w.coopNet = { role: 'client', session: { slot: 1, sendEvent(b) { w.verstuurd.push(b); return true; } } };
  zetDeelRecht(w.coopBezit, 'hero', 'ik');
  const g = { id: 'hero', kind: 'car', label: 'Fjord Escapade', model: 'Escapade', color: '#a11f1f', upgrades: ['tyres1'], dents: [], health: 88, flat: false };
  const r = bezorgVraag(w, g);
  assert.equal(r.ok, true);
  assert.equal(w.verstuurd.length, 1);
  assert.equal(w.verstuurd[0].k, 'bezorg');
  assert.equal(w.verstuurd[0].recht, 'ik', 'de gast stuurt zijn eigen recht mee');
  assert.equal(w.vehicles.length, 0, 'de gast zet niets in zijn eigen wereld');
  assert.equal(bezorgVraag(w, { ...g, kind: 'boat' }).ok, false, 'een boot gaat nog niet mee');
  w.player.inVehicle = {};
  assert.equal(bezorgVraag(w, g).ok, false, 'stap eerst uit');
  assert.deepEqual(bezorgEvent(g, 'iedereen'), { k: 'bezorg', id: 'hero', color: '#a11f1f', upgrades: ['tyres1'], dents: [], health: 88, flat: false, recht: 'iedereen' });
});

t('de host zet de kopie bij de gast neer, met kleur en schade, en vertelt het de anderen', () => {
  const w = mkWorld();
  assert.equal(bezorgHost(w, 1, vraag({ color: '#334455', health: 70, dents: [[0.1, 0.2, 0.3]] })), true);
  assert.equal(w.vehicles.length, 1);
  const v = w.vehicles[0];
  assert.deepEqual(v.coopBezit, { slot: 1, id: 'hero', recht: 'iedereen' });
  assert.equal(v.model.color, '#334455');
  assert.equal(v.health, 70);
  assert.deepEqual(v.dentLog, [[0.1, 0.2, 0.3]]);
  assert.deepEqual(v.upgrades, ['tyres1']);
  assert.equal(w.meldingen.length, 1);
  assert.equal(w.meldingen[0][0], 1);
  assert.match(w.meldingen[0][1], /staat klaar/);
  assert.equal(w.aan.length, 1, 'de andere gasten horen het');
  assert.equal(w.aan[0][1], 2);
  assert.match(w.aan[0][0].tekst, /Tessa/);
});

t('grenzen: geen tweede keer hetzelfde, hooguit twee per speler, en de host brengt niets mee', () => {
  const w = mkWorld();
  assert.equal(bezorgHost(w, 1, vraag()), true);
  assert.equal(bezorgHost(w, 1, vraag()), false, 'hetzelfde voertuig staat er al');
  assert.equal(w.vehicles.length, 1);
  assert.equal(bezorgHost(w, 1, vraag({ id: 'mug' })), true);
  assert.equal(bezorgHost(w, 1, vraag({ id: 'muis' })), false, 'boven het maximum');
  assert.equal(w.vehicles.length, MAX_BEZORG);
  assert.match(w.meldingen[w.meldingen.length - 1][1], new RegExp(String(MAX_BEZORG)));
  assert.equal(bezorgHost(w, 0, vraag({ id: 'mug' })), false, 'de host heeft zijn eigen voertuigen al');
  assert.equal(bezorgHost(w, 1, { k: 'bezorg', id: 'bestaatniet' }), false, 'een onbekend voertuig');
  assert.equal(w.vehicles.length, MAX_BEZORG);
});

t('weggaan: het voertuig van die gast gaat weg (ook als een ander erin rijdt), de rest blijft', () => {
  const w = mkWorld();
  bezorgHost(w, 1, vraag()); bezorgHost(w, 2, vraag({ id: 'mug' }));
  const [eigen, ander] = w.vehicles;
  let uit = 0;
  w.coopRijders = { 2: { slot: 2, v: eigen } };
  assert.equal(bezorgWeg(w, 1, () => { uit++; }), 1);
  assert.equal(uit, 1, 'de berijder stapt eerst uit');
  assert.deepEqual(w.vehicles, [ander]);
  assert.equal(bezorgControle(w.coopBezit, 1, { id: 'hero' }).ok, true, 'opnieuw bezorgen kan weer');
  assert.equal(bezorgAllesWeg(w), 1);
  assert.equal(w.vehicles.length, 0);
  assert.deepEqual(w.coopBezit.bezorgd, {});
});

t('geen plek of een boot: de host zegt het en zet niets neer', () => {
  const w = mkWorld();
  zetDeelHaken({ plek: () => null });
  assert.equal(bezorgHost(w, 1, vraag()), false);
  assert.match(w.meldingen[w.meldingen.length - 1][1], /past hij niet/);
  zetDeelHaken({ plek: () => ({ x: 20, y: 30, angle: 0 }) });
  assert.equal(bezorgHost(w, 1, vraag({ id: 'sloep' })), false, 'een boot gaat nog niet mee');
  assert.equal(w.vehicles.length, 0);
  assert.equal(bezorgHost(w, 1, vraag({ id: 'mug' })), true);
  assert.equal(w.vehicles.length, 1);
});

t('geen staat of geen gastheer: niets breekt', () => {
  assert.equal(bezorgWeg({}, 1), 0);
  assert.equal(bezorgAllesWeg({}), 0);
  assert.equal(bezorgControle(null, 1, { id: 'hero' }).ok, true);
  assert.equal(bezorgVraag({}, { id: 'hero', kind: 'car' }).ok, false, 'zonder sessie geen bezorging');
});

console.log(`coopbezit_test: ${n}/9 ok`);
