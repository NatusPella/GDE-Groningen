// Een heist samen (#438): rollen en de buit (game/js/heistrollen.js).
//   node scripts/heistrollen_test.mjs
import assert from 'node:assert/strict';
import {
  ROLLEN, ROL, isRol, rolVanFase, rollenVoor, rollenPerSpeler, wieDoet, rolNaam, rolZin, samenRegels, buitVerdelen, MODI, isModus,
  ROLSTAP, STAPPLEK, STAPTEKST, STAPKLAAR, ROLBEREIK, isRolstap, slotsVan, verdelingVoor, houderVan, lichaamVan,
  maakRolstand, rolStand, beginRolstap, rolKlaar, rolClaim, rolGate, rolRegel, heistRolGebruik,
  KLUISCODE, KLOKSCHIJF, maakDraai, draaiKluis, zetHeistHaken, heistGastTik,
} from '../game/js/heistrollen.js';

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

// --- de rolstap in Samen spelen (#438): iedereen zijn eigen stuk, de gastheer controleert ------
{
  // elke rolstap hoort bij de rol uit ROL
  for (const [fase, rol] of Object.entries(ROLSTAP)) {
    assert.equal(isRolstap(fase), true, `${fase}: is een rolstap`);
    assert.equal(rolVanFase(fase), rol, `${fase}: dezelfde rol als in ROL`);
    assert.ok(STAPPLEK[fase] && STAPTEKST[fase] && STAPKLAAR[fase], `${fase}: plek, taak en uitslag`);
    assert.ok(STAPTEKST[fase].length <= 60, `${fase}: de taak past in een melding`);
  }
  assert.equal(isRolstap('goto'), false);
  assert.equal(isRolstap('getaway'), false, 'de vlucht is van de groep');
  assert.equal(isRolstap('fase'), false);
  assert.ok(ROLBEREIK > 1 && ROLBEREIK < 6);

  // de plekken die meedoen
  assert.deepEqual(slotsVan({ coopRoster: [{ slot: 1 }, { slot: 2, verbinding: 'lost' }, { slot: 3 }] }), [0, 1, 3], 'de gastheer en de verbonden gasten; een weggevallen plek telt niet');
  assert.deepEqual(slotsVan({}), [0]);
  assert.deepEqual(slotsVan(null), [0]);
  assert.deepEqual(slotsVan({ coopRoster: [{ slot: 0 }, { slot: 1 }], players: [{ slot: 1 }, { slot: 4 }] }), [0, 1, 4], 'dubbel telt één keer');
  assert.deepEqual(verdelingVoor([0]), [], 'alleen: geen verdeling, de gastheer doet alles');
  assert.deepEqual(verdelingVoor([0, 0]), []);
  assert.deepEqual(verdelingVoor([0, 1]).map((x) => x.slot), [0, 1, 0, 1]);
  assert.deepEqual(verdelingVoor([0, 1, 2]).map((x) => x.slot), [0, 1, 2, 0]);
  assert.deepEqual(verdelingVoor(null), []);
  assert.deepEqual(verdelingVoor('geen lijst'), []);

  // wie houdt welke stap
  const v = verdelingVoor([0, 1]);
  assert.deepEqual(houderVan(v, 'crack'), { slot: 0, rol: 'kluis' });
  assert.deepEqual(houderVan(v, 'lock'), { slot: 1, rol: 'loper' });
  assert.equal(houderVan([], 'crack'), null);
  assert.equal(houderVan(v, 'goto'), null);
  assert.deepEqual(houderVan(verdelingVoor([0, 1, 2]), 'crack'), { slot: 2, rol: 'kluis' });

  // het lichaam van een plek
  const w = { player: { x: 1, y: 1 }, companion: { x: 2, y: 2 }, players: [{ slot: 2, entiteit: { x: 3, y: 3 } }] };
  assert.equal(lichaamVan(w, 0), w.player);
  assert.equal(lichaamVan(w, 1), w.companion);
  assert.deepEqual(lichaamVan(w, 2), { x: 3, y: 3 });
  assert.equal(lichaamVan(w, 9), null);
  assert.equal(lichaamVan(null, 0), null);

  // de claim: alleen de rolhouder, alleen bij de plek, en maar één keer
  const stand = maakRolstand();
  const doel = { x: 10, y: 10 };
  const verkeerd = rolClaim(stand, { verdeling: v, fase: 'lock', slot: 0, lichaam: { x: 10, y: 10 }, doel });
  assert.equal(verkeerd.ok, false);
  assert.match(verkeerd.tekst, /loper/, 'de kluis hoort niet aan de achterdeur');
  const teVer = rolClaim(stand, { verdeling: v, fase: 'lock', slot: 1, lichaam: { x: 30, y: 30 }, doel });
  assert.equal(teVer.ok, false);
  assert.match(teVer.tekst, /achterdeur/, 'eerst bij de deur staan');
  assert.equal(stand.vraag, null, 'een te verre E telt niet');
  const goed = rolClaim(stand, { verdeling: v, fase: 'lock', slot: 1, lichaam: { x: 11, y: 10 }, doel });
  assert.equal(goed.ok, true);
  assert.equal(stand.vraag, 1);
  assert.match(goed.tekst, /Jij bent de loper/);
  const zonderDoel = rolClaim(maakRolstand(), { verdeling: v, fase: 'lock', slot: 1, lichaam: { x: 1, y: 1 } });
  assert.equal(zonderDoel.ok, false);
  assert.equal(rolClaim(maakRolstand(), { verdeling: [], fase: 'lock', slot: 0, lichaam: { x: 1, y: 1 }, doel }), null, 'zonder rolstap geen claim');

  // de poort: wacht, dan klaar, en een nieuwe stap begint opnieuw
  const world = { coopRoster: [] };
  world.coopHeistRol = stand;
  assert.equal(rolGate(world, { kind: 'lock' }, v), 'klaar', 'de rolhouder vroeg het');
  assert.equal(stand.klaar, true);
  assert.equal(rolGate(world, { kind: 'lock' }, v), 'klaar', 'klaar blijft klaar');
  const v3 = verdelingVoor([0, 1, 2]); // de kluis is plek 2
  assert.equal(rolGate(world, { kind: 'crack' }, v3), 'wacht', 'de volgende stap begint opnieuw');
  assert.equal(rolGate(world, { kind: 'crack' }, v), null, 'is de gastheer zelf de rol, dan speelt hij de stap');
  assert.equal(rolGate(world, { kind: 'crack' }, verdelingVoor([0])), null, 'zonder verdeling speelt de gastheer zelf');
  assert.equal(rolGate(world, { kind: 'goto' }, v), null);
  const leeg = rolStand({});
  assert.equal(leeg.fase, null);
  assert.equal(beginRolstap(world, 'crack').fase, 'crack');
  assert.equal(rolKlaar(world).klaar, true);

  // wat iedereen hoort
  assert.match(rolRegel('crack', { slot: 1, rol: 'kluis' }, 1), /^Jij bent de kluisspecialist/);
  assert.match(rolRegel('crack', { slot: 1, rol: 'kluis' }, 0, 'Tessa'), /Tessa is de kluisspecialist/);
  assert.equal(rolRegel('goto', { slot: 1, rol: 'kluis' }, 1), '');
  assert.equal(rolRegel('crack', null, 1), '');
  assert.ok(rolRegel('crack', { slot: 1, rol: 'kluis' }, 1).length <= 90);

  // de E van een gast bij de gastheer (coopnet.js)
  const gw = {
    coopRoster: [{ slot: 1 }, { slot: 2 }], mission: { marker: { x: 5, y: 5 } },
    players: [{ slot: 0, entiteit: { x: 0, y: 0 } }, { slot: 1, entiteit: { x: 20, y: 20 } }, { slot: 2, entiteit: { x: 5, y: 5 } }],
    meldingen: [], coopMeld(slot, tekst) { this.meldingen.push([slot, tekst]); },
  };
  assert.equal(heistRolGebruik(gw, 1, { kind: 'crack' }), true, 'de E hoort bij de rolstap');
  assert.match(gw.meldingen[0][1], /kluisspecialist/, 'slot 1 is niet de kluis');
  assert.equal(gw.coopHeistRol.vraag, null);
  assert.equal(heistRolGebruik(gw, 2, { kind: 'crack' }), true);
  assert.equal(gw.coopHeistRol.vraag, 2, 'de kluis vroeg het');
  assert.match(gw.meldingen[1][1], /Jij bent de kluisspecialist/);
  assert.equal(heistRolGebruik(gw, 2, { kind: 'goto' }), false, 'een gewone stap is geen rolstap');
  assert.equal(heistRolGebruik({ coopRoster: [] }, 1, { kind: 'crack' }), false, 'zonder verdeling geen rolstap');
  assert.equal(heistRolGebruik(null, 1, { kind: 'crack' }), false);
  const zw = { coopRoster: [{ slot: 1 }, { slot: 2 }], mission: { marker: { x: 5, y: 5 } }, players: [{ slot: 2, entiteit: { x: 5, y: 5 } }], zon: [], addMessage(t) { this.zon.push(t); } };
  assert.equal(heistRolGebruik(zw, 2, { kind: 'crack' }), true);
  assert.ok(zw.zon.length, 'op de eigen machine in beeld');
  const inauto = { coopRoster: [{ slot: 1 }, { slot: 2 }], mission: { marker: { x: 5, y: 5 } }, players: [{ slot: 2, entiteit: { x: 5, y: 5, inVehicle: {} } }], meldingen: [], coopMeld(s, t) { this.meldingen.push([s, t]); } };
  assert.equal(heistRolGebruik(inauto, 2, { kind: 'crack' }), false, 'in een voertuig is E om uit te stappen');
}

// --- de draaischijf van de kluis: dezelfde op het scherm van de gastheer en van een gast ----------
{
  assert.deepEqual(KLUISCODE, [19, 5, 3]);
  assert.equal(KLOKSCHIJF, 40);
  const C = maakDraai();
  assert.equal(C.cur, 0);
  assert.deepEqual(C.code, KLUISCODE);
  assert.equal(C.hot, false);

  C.v = 19;
  let r = draaiKluis(C, 1 / 60, { vast: true });
  assert.equal(r.klik, true, '19 staat goed');
  assert.equal(C.cur, 1);
  assert.equal(r.klaar, false);

  C.v = 2;
  r = draaiKluis(C, 1 / 60, { vast: true });
  assert.equal(r.mis, true, 'naast is mis');
  assert.equal(C.cur, 1);
  assert.equal(C.misses, 1);

  C.v = 5; draaiKluis(C, 1 / 60, { vast: true });
  assert.equal(C.cur, 2);
  C.v = 3; r = draaiKluis(C, 1 / 60, { vast: true });
  assert.equal(r.klaar, true, 'negentien, vijf, drie');
  assert.equal(C.cur, 3);
  assert.equal(draaiKluis(C, 1 / 60, { vast: true }).klaar, true, 'klaar blijft klaar');
  assert.equal(draaiKluis(C, 1 / 60, {}).klik, false, 'na de laatste klik niets meer');

  // de hint na twee missers, en de tijd
  const D = maakDraai();
  D.misses = 2;
  assert.equal(draaiKluis(D, 1 / 60, {}).hint, true);
  assert.equal(D.showCode, true);
  assert.equal(draaiKluis(D, 1 / 60, {}).hint, false, 'de hint komt één keer');
  const T = maakDraai();
  T.t = 31.9;
  draaiKluis(T, 0.2, {});
  assert.equal(T.showMark, true, 'na 32 s staat het streepje');

  // draaien met de toetsen; loslaten valt terug naar het dichtstbijzijnde cijfer
  const F = maakDraai();
  draaiKluis(F, 0.1, { rechtsNu: true });
  assert.equal(F.v, 1, 'één tik is één cijfer');
  draaiKluis(F, 0.3, { rechts: true });
  assert.ok(F.v > 1, 'ingedrukt houden draait door');
  const v0 = F.v;
  for (let i = 0; i < 60; i++) draaiKluis(F, 1 / 60, {});
  assert.ok(Math.abs(F.v - Math.round(F.v)) < 0.05, `losgelaten valt de naald terug (${v0} -> ${F.v})`);
  assert.equal(draaiKluis(null, 1 / 60, {}).klaar, true, 'zonder schijf meteen klaar');

  // de gastkant loopt via de haken (heistui.js); zonder haken doet hij niets
  assert.equal(heistGastTik({}, 1 / 60, null), false);
  let gezien = 0;
  zetHeistHaken({ gastTik: () => { gezien++; return true; } });
  assert.equal(heistGastTik({}, 1 / 60, { kind: 'crack' }), true);
  assert.equal(gezien, 1);
  zetHeistHaken({ gastTik: null });
}

console.log('heistrollen_test ok');
