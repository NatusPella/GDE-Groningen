// Een heist samen (#438): rollen en de buit (game/js/heistrollen.js).
//   node scripts/heistrollen_test.mjs
import assert from 'node:assert/strict';
import { ROLLEN, ROL, isRol, rolVanFase, rollenVoor, rollenPerSpeler, wieDoet, rolNaam, rolZin, samenRegels, buitVerdelen, MODI, isModus } from '../game/js/heistrollen.js';

// --- de rollen ----------------------------------------------------------------------------
assert.deepEqual(ROLLEN, ['uitkijk', 'loper', 'kluis', 'schipper']);
for (const r of ROLLEN) {
  assert.ok(isRol(r) && ROL[r].naam && ROL[r].taak && ROL[r].fasen.length, `${r}: naam, taak en stappen`);
  assert.ok(ROL[r].fasen.every((f) => rolVanFase(f) === r), `${r}: elke stap wijst terug naar de rol`);
}
assert.equal(isRol('buit'), false);
assert.equal(rolVanFase('crack'), 'kluis');
assert.equal(rolVanFase('getaway'), 'schipper');
assert.equal(rolVanFase('pickpocket'), 'loper');
assert.equal(rolVanFase('plan'), 'uitkijk');
assert.equal(rolVanFase('onbekend'), null);

// --- de verdeling: iedereen een eigen rol ------------------------------------------------
{
  const v = rollenVoor([0, 1]);
  assert.equal(v.length, ROLLEN.length, 'elke rol is bezet');
  assert.deepEqual(v.map((x) => x.slot), [0, 1, 0, 1]);
  const per = rollenPerSpeler([0, 1]);
  assert.deepEqual(per.map((x) => x.slot), [0, 1]);
  assert.deepEqual(per[0].rollen, ['uitkijk', 'kluis'], 'Tammo houdt de wacht en kraakt de kluis');
  assert.deepEqual(per[1].rollen, ['loper', 'schipper'], 'de tweede speler loopt en houdt de boot klaar');

  const vier = rollenPerSpeler([3, 0, 2, 1]);
  assert.deepEqual(vier.map((x) => x.slot), [0, 1, 2, 3]);
  assert.ok(vier.every((x) => x.rollen.length === 1), 'met vier spelers ieder precies één rol');
  assert.deepEqual(vier.map((x) => x.rollen[0]), ROLLEN);

  const drie = rollenPerSpeler([0, 1, 2]);
  assert.ok(drie.every((x) => x.rollen.length >= 1), 'ook met drie spelers heeft niemand niets');
  assert.equal(drie.flatMap((x) => x.rollen).length, ROLLEN.length);

  assert.deepEqual(rollenPerSpeler([0]), [{ slot: 0, rollen: ROLLEN }], 'alleen: alle rollen bij jou');
  assert.deepEqual(rollenVoor([]), []);
  assert.deepEqual(rollenPerSpeler([1, 1, 'x', null]), [{ slot: 1, rollen: ROLLEN }], 'rommel telt niet mee');
}

// --- wie doet welke stap -----------------------------------------------------------------
{
  const per = rollenVoor([0, 1]);
  assert.equal(wieDoet(per, 'crack'), 0);
  assert.equal(wieDoet(per, 'lock'), 1);
  assert.equal(wieDoet(per, 'getaway'), 1);
  assert.equal(wieDoet(per, 'onbekend'), null);
  assert.equal(wieDoet(null, 'crack'), null);
}

// --- de zin onder de bouwtekening --------------------------------------------------------
{
  assert.equal(rolNaam('kluis'), 'kluisspecialist');
  assert.equal(rolNaam('bestaat-niet'), 'helper');
  assert.equal(rolZin('Tammo', ['uitkijk', 'kluis']), 'Tammo is de uitkijk en de kluisspecialist.');
  assert.deepEqual(samenRegels(rollenPerSpeler([0, 1]).map((r) => ({ ...r, naam: r.slot ? 'Tessa' : 'Tammo' }))), [
    'Tammo is de uitkijk en de kluisspecialist.',
    'Tessa is de loper en de schipper.',
  ]);
  assert.deepEqual(samenRegels([{ naam: 'Tammo', rollen: [] }, null]), [], 'zonder rollen geen regel');
  assert.equal(samenRegels([{ slot: 2, rollen: ['loper'] }])[0], 'Speler 3 is de loper.');
  assert.equal(rolZin('Tammo', ['onzin']), 'Tammo is de .');
}

// --- de buit: samen delen of tegen elkaar ------------------------------------------------
{
  const samen = buitVerdelen('samen', [0, 1, 2], { 0: 5, 1: 3, 2: 1 }, 301);
  assert.equal(samen.modus, 'samen');
  assert.equal(samen.winnaar, null);
  assert.equal(Object.values(samen.geld).reduce((a, b) => a + b, 0), 301, 'de hele buit is verdeeld');
  assert.equal(samen.geld[0], 101, 'de rest naar wie het meest deed');

  const tegen = buitVerdelen('tegen', [0, 1], { 0: 7, 1: 3 }, 100);
  assert.equal(tegen.winnaar, 0);
  assert.ok(tegen.geld[0] > tegen.geld[1], 'de grootste buit wint');
  assert.equal(Object.values(tegen.geld).reduce((a, b) => a + b, 0), 100);

  const gelijk = buitVerdelen('tegen', [0, 1], {}, 101);
  assert.equal(gelijk.geld[0] + gelijk.geld[1], 101);
  assert.equal(gelijk.winnaar, 0, 'zonder punten wint de eerste plek de rest');

  const leeg = buitVerdelen('samen', [], {}, 100);
  assert.deepEqual(leeg.geld, {});
  assert.equal(leeg.winnaar, null);
  assert.deepEqual(buitVerdelen('samen', [0], {}, 0).geld, { 0: 0 });
  assert.deepEqual(buitVerdelen('onbekend', [0, 1], { 0: 1 }, 10).modus, 'samen', 'een onbekende stand is samen delen');
  assert.equal(buitVerdelen('tegen', [0, 1], { 0: -3, 1: 2 }, 10).winnaar, 1, 'negatieve punten tellen niet mee');
}

// --- de twee standen ---------------------------------------------------------------------
assert.ok(isModus('samen') && isModus('tegen') && !isModus('alleen'));
assert.match(MODI.samen.tekst, /gedeeld/);
assert.match(MODI.tegen.tekst, /wint/);

console.log('heistrollen_test ok');
