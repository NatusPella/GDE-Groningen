// De korte geluidjes (game/js/stings.js): nootdata (duur 2 tot 4 s, noten binnen bereik, geen stilte, elke sleutel aanwezig),
// de prioriteit en afkoeling, de uitslag voor jezelf en de momenten van een kaartje of een verbindende speler. Puur, zonder audio.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STINGS, STING_KEYS, STING_MIN_S, STING_MAX_S, NOOT_MIN, NOOT_MAX, MAX_STIL_S, COOLDOWN_S,
  midiHz, stingDuur, stingNoten, createStingGate, uitslagUitkomst, kaartSting, spelersVerbonden,
} from '../game/js/stings.js';

const VERPLICHT = ['kart_countdown', 'kart_finish', 'winnaar', 'verliezer', 'meedoen', 'speler_sluit_aan', 'trein_vertrek', 'halte'];
for (const k of VERPLICHT) assert.ok(STINGS[k], `sleutel ${k} ontbreekt`);
assert.deepEqual([...STING_KEYS].sort(), [...VERPLICHT].sort(), 'geen onverwachte sleutels');

for (const k of STING_KEYS) {
  const s = STINGS[k];
  const d = stingDuur(k);
  assert.ok(d >= STING_MIN_S && d <= STING_MAX_S, `${k}: duur ${d.toFixed(2)} s valt buiten ${STING_MIN_S} tot ${STING_MAX_S}`);
  assert.ok(Number.isInteger(s.prio) && s.prio > 0, `${k}: prioriteit`);
  assert.ok(s.noten.length >= 2, `${k}: te weinig noten`);
  for (const x of s.noten) {
    for (const v of [x.t, x.m, x.d, x.g]) assert.ok(Number.isFinite(v), `${k}: geen getal in een noot`);
    assert.ok(x.t >= 0 && x.d > 0.05, `${k}: tijd of duur van een noot`);
    assert.ok(x.m >= NOOT_MIN && x.m <= NOOT_MAX, `${k}: noot ${x.m} buiten bereik`);
    if (x.to !== undefined) assert.ok(x.to >= NOOT_MIN && x.to <= NOOT_MAX, `${k}: eindnoot ${x.to} buiten bereik`);
    assert.ok(x.g > 0 && x.g <= 0.2, `${k}: gain ${x.g} (stil of te hard)`);
    assert.ok(['sine', 'square', 'sawtooth', 'triangle'].includes(x.w), `${k}: golfvorm ${x.w}`);
  }
  // geen stilte: tussen het begin en het einde is er steeds een noot die klinkt (de gaten tussen noten blijven kort)
  const rij = [...s.noten].sort((a, b) => a.t - b.t);
  assert.ok(rij[0].t < 0.2, `${k}: begint niet meteen`);
  let tot = 0;
  for (const x of rij) { assert.ok(x.t - tot <= MAX_STIL_S, `${k}: stilte van ${(x.t - tot).toFixed(2)} s bij ${x.t}`); tot = Math.max(tot, x.t + x.d); }
  // de uitvoer in Hz klopt met de data
  const hz = stingNoten(k);
  assert.equal(hz.length, s.noten.length);
  for (const h of hz) assert.ok(h.freq > 60 && h.freq < 6000 && (h.freqEnd === undefined || (h.freqEnd > 60 && h.freqEnd < 6000)), `${k}: Hz`);
}
assert.ok(Math.abs(midiHz(69) - 440) < 1e-9 && Math.abs(midiHz(81) - 880) < 1e-9);

// de afteller sluit aan op de startlichten van de kartbaan (1,2,3 en go met een seconde ertussen)
{
  const t = STINGS.kart_countdown.noten.map((x) => x.t);
  for (const a of [0, 1, 2, 3]) assert.ok(t.includes(a), `afteller mist een toon op ${a} s`);
  const kart = readFileSync(new URL('../game/js/kartbaan.js', import.meta.url), 'utf8');
  assert.match(kart, /LIGHTS_AT = \[1\.2, 2\.2, 3\.2\], GO_AT = 4\.2/, 'de lichten van de kartbaan zijn verschoven: pas kart_countdown aan');
}

// prioriteit en afkoeling
{
  const g = createStingGate();
  assert.equal(g.request('onbekend', 0).ok, false);
  assert.equal(g.request('halte', NaN).ok, false);
  const a = g.request('halte', 10);
  assert.deepEqual(a, { ok: true, afbreken: false });
  assert.equal(g.actief(10.5), 'halte');
  assert.equal(g.request('halte', 10.5).ok, false, 'nooit twee tegelijk');
  assert.equal(g.request('speler_sluit_aan', 11).ok, false, 'lagere prioriteit moet wachten');
  const hoog = g.request('winnaar', 11);
  assert.deepEqual(hoog, { ok: true, afbreken: true }, 'de hoogste prioriteit wint en breekt af');
  assert.equal(g.request('trein_vertrek', 11.5).ok, false, 'lagere prioriteit dan winnaar');
  const eind = 11 + stingDuur('winnaar');
  assert.equal(g.actief(eind + 0.01), null);
  assert.equal(g.request('halte', eind + COOLDOWN_S / 2).ok, false, 'korte afkoeling na het einde');
  assert.equal(g.request('halte', eind + COOLDOWN_S + 0.01).ok, true, 'na de afkoeling mag het weer');
  // gelijke prioriteit breekt niet af: winnaar en verliezer botsen niet
  const h = createStingGate();
  assert.equal(h.request('winnaar', 0).ok, true);
  assert.equal(h.request('verliezer', 0.5).ok, false);
  assert.ok(Math.max(...STING_KEYS.map((k) => STINGS[k].prio)) > Math.min(...STING_KEYS.map((k) => STINGS[k].prio)));
  g.reset();
  assert.equal(g.request('halte', 0).ok, true);
}

// de uitslag voor jezelf
{
  const rijen = [{ plek: 1, fin: true }, { plek: 2, fin: true }, { plek: 3, fin: false }];
  assert.equal(uitslagUitkomst(rijen, { plek: 1, fin: true }), 'winnaar');
  assert.equal(uitslagUitkomst(rijen, { plek: 2, fin: true }), 'verliezer');
  assert.equal(uitslagUitkomst(rijen, { plek: 3, fin: false }), 'verliezer');
  assert.equal(uitslagUitkomst(rijen, { plek: 1, fin: false }), 'verliezer', 'niet gefinisht is geen winst');
  assert.equal(uitslagUitkomst(rijen, { plek: 4, weg: true }), null, 'wie wegviel hoort niets');
  assert.equal(uitslagUitkomst(rijen, null), null, 'wie niet meedeed hoort niets');
  assert.equal(uitslagUitkomst([], { plek: 1, fin: true }), null);
  // een teamuitslag: het eigen team telt
  const teams = [{ plek: 1, fin: true, team: 'a' }, { plek: 2, fin: true, team: 'b' }, { plek: 3, fin: true, team: 'a' }];
  assert.equal(uitslagUitkomst(teams, { plek: 3, fin: true, team: 'a' }), 'winnaar');
  assert.equal(uitslagUitkomst(teams, { plek: 2, fin: true, team: 'b' }), 'verliezer');
}

// wanneer een kaartje een sting geeft: alleen bij een nieuwe uitnodiging of uitslag
{
  const meedoen = { soort: 'uitnodiging', titel: 'Meedoen?', regels: [], voet: '' };
  const verstuurd = { soort: 'uitnodiging', titel: 'Kartbaan: uitnodiging verstuurd', regels: [], voet: '' };
  const uitslag = { soort: 'uitslag', titel: 'Uitslag', regels: [], voet: '' };
  const data = { rijen: [{ plek: 1, fin: true }], jij: { plek: 1, fin: true } };
  assert.equal(kaartSting(null, meedoen), 'meedoen');
  assert.equal(kaartSting(meedoen, { ...meedoen, voet: 'Nog 9 seconden' }), null, 'een tellende voet is geen nieuwe uitnodiging');
  assert.equal(kaartSting(null, verstuurd), null, 'de host die zelf uitnodigt hoort geen Meedoen?');
  assert.equal(kaartSting(null, uitslag, data), 'winnaar');
  assert.equal(kaartSting(uitslag, uitslag, data), null);
  assert.equal(kaartSting(meedoen, uitslag, { rijen: data.rijen, jij: { plek: 2, fin: true } }), 'verliezer');
  assert.equal(kaartSting(null, uitslag, null), null);
  assert.equal(kaartSting(meedoen, null), null);
}

// een speler die verbindt: de eerste stand is alleen een beginstand
{
  let r = spelersVerbonden(null, [{ slot: 0 }, { slot: 1 }]);
  assert.equal(r.nieuw, false);
  r = spelersVerbonden(r.slots, [{ slot: 0 }, { slot: 1 }]);
  assert.equal(r.nieuw, false);
  r = spelersVerbonden(r.slots, [{ slot: 0 }, { slot: 1 }, { slot: 2 }]);
  assert.equal(r.nieuw, true);
  const na = spelersVerbonden(r.slots, [{ slot: 0 }, { slot: 1 }, { slot: 2, verbinding: 'lost' }]);
  assert.equal(na.nieuw, false);
  assert.deepEqual(na.slots, [0, 1]);
  assert.equal(spelersVerbonden([0], undefined).nieuw, false);
}

console.log('stings_test: ok');
