// Test van Samen spelen bij de voetbalcarrière (#1114): scripts/voetbal_samen_test.mjs. Puur; bewaakt ook dat het netwerkprotocol niets over voetbal zegt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clampGuestFactors, encodeRatings, decodeRatings, assignFigures, planTeams, dropOut, guestReward, capFactor, LEVEL_CAP, MAX_PER_TEAM, guestXpFactor } from '../game/js/voetbalsamen.js';
import { makeProtagonist, simFactors } from '../game/js/voetbalplayers.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };

t('een opgevoerde rating telt niet: de host klemt op het niveau van de klasse', () => {
  const fake = { sprint: 9, schot: 99, aanname: 5, verd: 1.3, uit: -4 };
  const c = clampGuestFactors(fake, 'talent');
  assert.ok(Object.values(c).every((v) => v <= capFactor('talent') + 1e-9 && v >= 0.6));
  assert.ok(capFactor('talent') < capFactor('terp') && capFactor('terp') < capFactor('kroon'));
  assert.equal(clampGuestFactors(null).sprint, 1);
  const echt = simFactors(makeProtagonist('anita'));
  const klem = clampGuestFactors(echt, 'talent');
  for (const k of Object.keys(echt)) assert.ok(klem[k] <= echt[k] + 1e-9 || klem[k] <= capFactor('talent') + 1e-9);
});
t('het ratingblok: heen en terug, geklemd aan de hostkant, kapotte delen worden overgeslagen', () => {
  const blok = encodeRatings([{ slot: 1, f: { sprint: 1.1, schot: 1.2, aanname: 1.0, verd: 0.9, uit: 1.05 } }, { slot: 2, f: { sprint: 5, schot: 5, aanname: 5, verd: 5, uit: 5 } }]);
  assert.ok(blok.length < 60);
  const d = decodeRatings(blok, 'kroon');
  assert.equal(d.length, 2); assert.equal(d[0].slot, 1); assert.ok(Math.abs(d[0].f.schot - 1.2) < 0.01);
  assert.ok(d[1].f.sprint <= capFactor('kroon') + 1e-9, 'een nep-waarde wordt geklemd');
  assert.ok(decodeRatings(blok, 'talent').every((x) => Object.values(x.f).every((v) => v <= capFactor('talent') + 1e-9)));
  assert.deepEqual(decodeRatings('x~1.zz~~2.0011', 'talent'), []);
  assert.deepEqual(decodeRatings(null), []);
  assert.equal(decodeRatings(Array(9).fill('1.0000000000').join('~')).length, MAX_PER_TEAM);
});
t('Tammo en Tessa: elke mens zijn eigen figuur, de ander is een computerteamgenoot', () => {
  const een = assignFigures([{ slot: 0, char: 'anita' }]);
  assert.deepEqual(een.figures, [{ slot: 0, figure: 'anita' }]); assert.deepEqual(een.computerMates, ['tammo']);
  const twee = assignFigures([{ slot: 0, char: 'anita' }, { slot: 1, char: 'tammo' }]);
  assert.deepEqual(twee.computerMates, []); assert.deepEqual(twee.figures.map((f) => f.figure), ['anita', 'tammo']);
  const dubbel = assignFigures([{ slot: 0, char: 'anita' }, { slot: 1, char: 'anita' }]);
  assert.deepEqual(dubbel.figures.map((f) => f.figure), ['anita', 'tammo'], 'de tweede krijgt de andere figuur');
  const drie = assignFigures([{ slot: 0, char: 'anita' }, { slot: 1, char: 'tammo' }, { slot: 2, char: 'anita' }]);
  assert.equal(drie.figures[2].figure, null, 'een derde mens speelt als iemand van het team');
  assert.deepEqual(assignFigures([{ slot: 0 }]).figures[0].figure, 'anita');
});
t('de derby-indeling: hooguit vier per team, nooit een leeg team, wegvallen laat de computer overnemen', () => {
  const p = planTeams([{ slot: 0, team: 0 }, { slot: 1, team: 1 }, { slot: 2, team: 1 }]);
  assert.deepEqual(p.team0, [0]); assert.deepEqual(p.team1, [1, 2]); assert.ok(p.derby);
  const alle0 = planTeams([{ slot: 0, team: 0 }, { slot: 1, team: 0 }, { slot: 2, team: 0 }]);
  assert.ok(alle0.team1.length >= 1 && alle0.derby, 'een derby heeft twee teams');
  const zes = planTeams(Array.from({ length: 8 }, (_, i) => ({ slot: i, team: 0 })));
  assert.ok(zes.team0.length <= MAX_PER_TEAM && zes.team1.length <= MAX_PER_TEAM && zes.team0.length + zes.team1.length === 8);
  const een = planTeams([{ slot: 0, team: 1 }]);
  assert.equal(een.team0.length + een.team1.length, 1);
  assert.ok(!een.derby);
  assert.deepEqual(dropOut(p, 1).team1, [2]);
});
t('de beloning van een gast: geld en ervaring, nooit competitiepunten of een contractbonus; wie wegviel krijgt niets', () => {
  const w = guestReward({ outcome: 'winst', goals: 2 }, 'terp');
  assert.ok(w.geld > guestReward({ outcome: 'verlies' }, 'terp').geld);
  assert.equal(w.competitiepunten, 0); assert.equal(w.contract, 0);
  assert.deepEqual(guestReward({ weg: true }), { geld: 0, xp: 0, competitiepunten: 0, contract: 0 });
  assert.ok(guestReward({ outcome: 'winst', goals: 99 }, 'talent').geld <= 30 + 15 + 1);
  assert.ok(guestXpFactor <= 0.6);
  assert.ok(LEVEL_CAP.talent < LEVEL_CAP.kroon);
});
t('het netwerkprotocol blijft ongewijzigd: geen woord voetbal in net/protocol.js en geen nieuwe berichtsoort', () => {
  const p = fs.readFileSync(new URL('../game/js/net/protocol.js', import.meta.url), 'utf8');
  assert.ok(!/voetbal|carri[eè]re/i.test(p));
});
console.log(`voetbal_samen_test ok (${n} groepen)`);
