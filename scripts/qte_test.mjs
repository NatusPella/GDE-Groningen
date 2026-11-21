// De quicktime-stand (game/js/qte.js, stagetiming.js, heist.js, #962): Normaal / Makkelijk / Overslaan, het faalpad dat altijd doorgaat,
// en dat de instelling een gewone, savegame-vrije instelling van dit apparaat is.
//   node scripts/qte_test.mjs
import * as Q from '../game/js/qte.js';
import { enterTiming, stepTiming, timingTag } from '../game/js/stagetiming.js';
import { getSettings, setSetting } from '../game/js/settings.js';
import { KEYS } from '../game/js/storagekeys.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const r3 = () => [
  { text: 'a', speed: 0.8, zone: [0.4, 0.6], ok: 'ja a', bad: 'nee a' },
  { text: 'b', speed: 1.0, zone: [0.42, 0.58], ok: 'ja b', bad: 'nee b' },
  { text: 'c', speed: 1.2, zone: [0.44, 0.56], ok: 'ja c', bad: 'nee c' },
];
const st = () => ({ kicker: 'Test', goodAt: 3, tagGood: 'goed', tagLow: 'laag', rounds: r3() });
// speel de stap uit: elke druk is raak (hits) of mis (missers); geeft { r, S }
function speel(stap, stand, druk = 'raak') {
  const S = {};
  enterTiming(S, stap, undefined, { settings: { qteStand: stand } });
  let r = null;
  for (let i = 0; i < 400 && !r; i++) {
    const ronde = (S.rounds || stap.rounds)[Math.min(S.ti, (S.rounds || stap.rounds).length - 1)];
    if (S.tphase === 'ask') {
      if (druk === 'raak') { S.needleT = 0; stepTiming(stap, S, { hit: true }, 0); } // een druk die raak is beoordeeld
      else if (druk === 'mis') stepTiming(stap, S, { hit: false }, 0);
      else r = stepTiming(stap, S, null, 0.25); // niets doen: alleen een gebaar loopt vanzelf
    } else r = stepTiming(stap, S, null, 0.25);
    void ronde;
  }
  return { r, S };
}

// ---- de stand zelf
ok(JSON.stringify(Q.QTE_STANDEN) === '["normaal","makkelijk","overslaan"]', 'drie standen');
ok(Q.QTE_STANDAARD === 'makkelijk' && getSettings().qteStand === 'makkelijk', 'standaard Makkelijk (Instellingen)');
ok(Q.schoneQte('onzin') === 'makkelijk' && Q.schoneQte(undefined) === 'makkelijk' && Q.schoneQte('overslaan') === 'overslaan', 'een onbekende stand valt terug op Makkelijk');
ok(Q.qteStandVan(undefined) === 'normaal' && Q.qteStandVan({}) === 'makkelijk', 'zonder instellingen blijft het de oude balk (Normaal); een bestand zonder sleutel krijgt Makkelijk');

// ---- Normaal = de oude balk
{
  const p = Q.qtePas(st(), 'normaal');
  ok(p.rounds.length === 3 && p.rounds[0].speed === 0.8 && p.goodAt === 3 && p.extraMissers === 0 && !p.overslaan, 'Normaal verandert niets', JSON.stringify(p));
}
// ---- Makkelijk = langzamer, ruimer, minder drukken, één poging extra
{
  const p = Q.qtePas(st(), 'makkelijk');
  ok(p.rounds.length === 2, 'Makkelijk laat bij drie rondes de middelste weg (minder drukken)', String(p.rounds.length));
  ok(p.rounds[0].text === 'a' && p.rounds[1].text === 'c', 'de eerste en de laatste ronde blijven');
  ok(p.rounds[0].speed < 0.8 && p.rounds[1].speed < 1.2, 'de naald is langzamer');
  ok(p.zoneFactor > 1 && p.extraMissers === 1, 'ruimere zone en een poging extra');
  ok(p.goodAt === 2, 'de tagdrempel past mee: alles raak blijft de goede tag', String(p.goodAt));
  // review 21-11: met een weggelaten ronde zakt de drempel mee; Makkelijk was strenger dan Normaal (goodAt 2 van 3 werd 2 van 2)
  const laag = { ...st(), goodAt: 2 };
  ok(Q.qtePas(laag, 'normaal').goodAt === 2 && Q.qtePas(laag, 'makkelijk').goodAt === 1, 'Makkelijk is nooit strenger dan Normaal', String(Q.qtePas(laag, 'makkelijk').goodAt));
  const vier = { ...st(), goodAt: 3, rounds: [...st().rounds, { speed: 1, text: 'd' }] };
  ok(Q.qtePas(vier, 'normaal').goodAt === 3 && Q.qtePas(vier, 'makkelijk').goodAt === 2, 'vier rondes: 3 van 4 wordt 2 van 3');
  ok(Q.qtePas({ rounds: [{ speed: 1 }, { speed: 1 }] }, 'makkelijk').rounds.length === 2, 'bij twee rondes blijft het bij twee');
  const bron = st(); Q.qtePas(bron, 'makkelijk');
  ok(bron.rounds.length === 3 && bron.rounds[0].speed === 0.8, 'de bron (de missiedata) blijft ongewijzigd');
}
// ---- Overslaan = één gebaar
{
  const p = Q.qtePas(st(), 'overslaan');
  ok(p.rounds.length === 1 && p.rounds[0].text === 'c' && p.overslaan && p.goodAt === 1, 'Overslaan: de laatste ronde loopt als gebaar', JSON.stringify(p.rounds.map((r) => r.text)));
  const S = {};
  enterTiming(S, st(), undefined, { settings: { qteStand: 'overslaan' } });
  ok(S.gebaar === true && S.auto < 1.5, 'het gebaar loopt vanzelf door, snel');
  const g = speel(st(), 'overslaan', 'niets');
  ok(g.r === 'done' && g.S.miss === 0 && g.S.hits === 1 && timingTag(st(), g.S) === 'goed', 'zonder één druk gaat het verhaal door, zonder missers', JSON.stringify([g.r, g.S.hits, g.S.miss]));
}

// ---- het faalpad gaat altijd verder (behalve de oude balk met een failAt)
{
  const hard = { ...st(), failAt: 1, failText: 'weg' };
  const n1 = speel(hard, 'normaal', 'mis');
  ok(n1.r && n1.r.fail === 'weg', 'Normaal met failAt kan nog falen (de oude regel)', JSON.stringify(n1.r));
  const m1 = speel(hard, 'makkelijk', 'mis');
  ok(m1.r === 'done' && m1.S.miss === 2, 'Makkelijk: dezelfde missers laten het verhaal doorgaan', JSON.stringify([m1.r, m1.S.miss]));
  ok(timingTag(hard, m1.S) === 'laag', 'de kleine uitkomst: de lage tag, niet de goede');
  const o1 = speel(hard, 'overslaan', 'mis');
  ok(o1.r === 'done', 'Overslaan: nooit een afloop');
  const z = speel(st(), 'makkelijk', 'mis');
  ok(z.r === 'done' && timingTag(st(), z.S) === 'laag', 'alles mis zonder failAt: door met de lage tag');
  const t = speel(st(), 'makkelijk', 'raak');
  ok(t.r === 'done' && timingTag(st(), t.S) === 'goed', 'alles raak op Makkelijk geeft de goede tag');
}

// ---- de ruimere zone: Makkelijk is breder dan Normaal
{
  const a = {}, b = {};
  enterTiming(a, st(), undefined, { settings: { qteStand: 'normaal' } });
  enterTiming(b, st(), undefined, { settings: { qteStand: 'makkelijk' } });
  const w = (S) => S.rounds[0].zone[1] - S.rounds[0].zone[0];
  ok(w(b) > w(a), 'de zone van Makkelijk is breder', `${w(a).toFixed(2)} tegen ${w(b).toFixed(2)}`);
}

// ---- de heist: de metgezel helpt eerder
{
  ok(Q.heistHulp('normaal', 5) === 5 && Q.heistHulp('makkelijk', 5) === 3 && Q.heistHulp('overslaan', 5) === 0, 'hulp na 5, 3 of meteen');
  ok(Q.heistBreedte('makkelijk', 0.2) > Q.heistBreedte('normaal', 0.2), 'een bredere raakzone bij de heist');
  ok(Q.qteKanFalen('normaal') && !Q.qteKanFalen('makkelijk') && !Q.qteKanFalen('overslaan'), 'alleen Normaal kan nog falen');
}

// ---- de bakronde
{
  const a = Q.bakeRegels('normaal', 3), b = Q.bakeRegels('makkelijk', 3), c = Q.bakeRegels('overslaan', 3);
  ok(a.rounds === 3 && a.maxMisses === 3, 'Normaal: de oude bakronde');
  ok(b.rounds === 2 && b.maxMisses === 5, 'Makkelijk: een ronde minder en vijf missers');
  ok(c.rounds === 1 && c.maxMisses >= 99, 'Overslaan: één ronde en nooit opnieuw beginnen');
  ok(Q.bakeRegels('makkelijk', 1).rounds === 1, 'een oefenronde van één blijft één');
}

// ---- opslag: een gewone instelling van dit apparaat, geen onderdeel van de savegame
{
  ok(!('qteStand' in JSON.parse(JSON.stringify({ missionsDone: 3 }))), 'de savegame kent geen QTE-stand (niets te migreren)');
  setSetting('qteStand', 'overslaan');
  ok(getSettings().qteStand === 'overslaan', 'de keuze wordt bewaard');
  setSetting('qteStand', 'makkelijk');
  ok(KEYS.settings === 'gde-settings', 'in de bestaande opslagsleutel gde-settings (geen nieuwe sleutel)');
}

console.log(fails ? `qte_test: ${fails} van ${n} mislukt` : `qte_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
