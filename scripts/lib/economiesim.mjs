// Economiesim (#985 punt 45): een speelsessie van N uur, per bron inkomen en per post kosten, met de bestaande data.
// Puur en deterministisch (geen willekeur, geen klok, geen opslag): scripts/economie_sim_test.mjs bewaakt de uitkomst,
// docs/BALANS-21-11.md onderbouwt de keuzes. De tijden per gebeurtenis zijn schattingen uit de speeltesten (dezelfde als in
// scripts/loopbaan_balans_test.mjs); de test beschermt de verhoudingen, niet de seconden.
import { START_MONEY, SIDEJOB_PAY_MULT, PG_PRIZE, EIERBAL_FIND_PAY, bustFine, repairCost, SPEED_FINE } from '../../game/js/economy.js';
import { VEHICLE_STOCK } from '../../game/js/shopdata.js';
import { PERCELEN } from '../../game/js/percelen.js';
import * as L from '../../game/js/loopbaan.js';

// Het verhaal: 30 missies met samen 24.350 euro beloning (scripts/endgame_economie_test.mjs), in ongeveer 12 uur spelen.
export const VERHAAL = { beloning: 24350, missies: 30, uren: 12 };

// Inkomen per uur actief spelen per bron, op niveau 1 (factor 1,0). bezetting: het deel van de tijd dat je echt aan het
// verdienen bent (de rest is rijden naar de volgende klus). perUur is bruto, zonder bezetting.
export const BRONNEN = {
  missie: { naam: 'verhaalmissies', perUur: VERHAAL.beloning / VERHAAL.uren },
  bijbaan: { naam: 'bijbaantjes (bus, bezorger, balie)', perUur: ((90 + 40 + 60) / 3) * SIDEJOB_PAY_MULT * 60 / 1.8, bezetting: 0.6, loopbaan: 'bus' },
  boerderij: { naam: 'eigen boerderij', perUur: 330 * 60 / 10, bezetting: 0.8, loopbaan: 'landbouw' },
  padel: { naam: 'padel', perUur: 100 * 60 / 6, bezetting: 0.8, loopbaan: 'padel' },
  hengelen: { naam: 'hengelen (vrij)', perUur: 0.6 * 60 / (11 / 60), bezetting: 1, loopbaan: 'hengelen' },
  race: { naam: 'racen en driften', perUur: 17.5 * 60 / 4.2, bezetting: 0.8, loopbaan: 'race' },
  postgame: { naam: 'revanche-uitdaging (goud)', perUur: PG_PRIZE[3] * 60 / 20, bezetting: 0.9 },
  eierbal: { naam: 'eierballen zoeken', perUur: EIERBAL_FIND_PAY * 60 / 6, bezetting: 0.7 },
  // De voetbalcarrière (#1116): zelf elke ronde spelen, gemeten met scripts/voetbal_carriere_sim.mjs (ongeveer 420 euro per actief uur over drie seizoenen); scripts/voetbal_balans_test.mjs bewaakt dat de sim dit blijft opleveren.
  voetbal: { naam: 'voetbalcarrière (zelf spelen)', perUur: 420, bezetting: 1, loopbaan: 'buiten' },
};

// Hoe een speler van 10 uur zijn tijd verdeelt (de som is 1; de revanches horen bij het eindspel en tellen hier niet mee).
// voetbal staat op 0: de standaardsessie blijft zoals gemeten; economie_sim_test geeft een verdeling mee waarin een deel van de tijd naar het voetbal gaat.
export const VERDELING = { missie: 0.40, bijbaan: 0.25, boerderij: 0.08, padel: 0.04, hengelen: 0.03, race: 0.05, postgame: 0, eierbal: 0.05, voetbal: 0 };

// Eerste klus per loopbaan: minuten dat de klus zelf duurt; REISTIJD_MIN komt per loopbaan bovenop (naar de startplek).
export const EERSTE_KLUS = { trein: 1.5, bus: 1.7, taxi: 2, bezorg: 1.7, vracht: 2.5, water: 2.5, lucht: 3, handhaving: 2, kantoor: 2, podium: 2,
  horeca: 2, kermis: 2, landbouw: 3.5, klus: 2, padel: 6, golf: 12, hengelen: 7, race: 3.5, buiten: 3 };
export const REISTIJD_MIN = 3;
// Wat die eerste klus zelf al uitbetaalt (euro, geschat uit de bijbaan- en premietabellen): de bonus komt hier bovenop.
export const EERSTE_KLUS_LOON = { trein: 0, bus: 135, taxi: 60, bezorg: 60, vracht: 150, water: 100, lucht: 25, handhaving: 70, kantoor: 90, podium: 60,
  horeca: 20, kermis: 50, landbouw: 100, klus: 90, padel: 100, golf: 20, hengelen: 10, race: 15, buiten: 10 };

export function duizendpootInspanning() {
  const ids = Object.keys(EERSTE_KLUS);
  const minuten = ids.reduce((s, id) => s + EERSTE_KLUS[id] + REISTIJD_MIN, 0);
  const loon = ids.reduce((s, id) => s + EERSTE_KLUS_LOON[id], 0);
  return { vakken: ids.length, minuten, uren: minuten / 60, loon };
}

// Kosten per speeluur: reparaties, boetes, munitie en kleine uitgaven.
export const KOSTEN = {
  reparatie: { naam: 'reparaties', perUur: 2 * repairCost(40, 1, false) },        // twee schades van 40% en een deuk
  aanhouding: { naam: 'aanhoudingen', perUur: bustFine(2, 3000) },               // eens per uur, twee sterren
  snelheid: { naam: 'snelheidsboetes', perUur: 2 * SPEED_FINE[0] },
  winkel: { naam: 'winkel (munitie, eten, kleding)', perUur: 120 },
};

export const EERSTE_AUTO = 'mug';
export const EERSTE_PERCEEL = PERCELEN.filter((p) => p.koop > 0).reduce((m, p) => (p.koop < m.koop ? p : m));
const DUURSTE_AUTO = Math.max(...Object.values(VEHICLE_STOCK).filter((v) => v.kind === 'car' && !v.unlock).map((v) => v.price));

// Een sessie. opties: { uren, duizendpoot (euro), factor (loonfactor over de bronnen met een vak), verdeling (aandeel van de tijd per bron; standaard VERDELING) }.
export function simuleer({ uren = 10, duizendpoot = L.DUIZENDPOOT_EURO, factor = 1, verdeling = VERDELING } = {}) {
  const per = {};
  let bruto = 0;
  for (const [id, b] of Object.entries(BRONNEN)) {
    const uur = uren * (verdeling[id] || 0);
    const geld = uur * b.perUur * (b.bezetting ?? 1) * (b.loopbaan ? factor : 1);
    per[id] = { uur, geld, perUur: uur ? geld / uur : 0 };
    bruto += geld;
  }
  const kosten = Object.values(KOSTEN).reduce((s, k) => s + k.perUur * uren, 0);
  const inz = duizendpootInspanning();
  const bonus = uren >= inz.uren ? duizendpoot : 0;
  const netto = bruto - kosten + bonus;
  const netPerUur = (bruto - kosten) / uren;
  const tijdTot = (bedrag) => Math.max(0, (bedrag - START_MONEY) / netPerUur * 60); // minuten
  return {
    uren, per, bruto, kosten, bonus, netto, netPerUur, bonusUren: bonus / netPerUur,
    minutenEersteAuto: tijdTot(VEHICLE_STOCK[EERSTE_AUTO].price), minutenEerstePerceel: tijdTot(EERSTE_PERCEEL.koop),
    // inflatie: vermogen na afloop gedeeld door de prijs van de duurste vrij te koop staande auto
    inflatie: (START_MONEY + netto) / DUURSTE_AUTO,
  };
}
