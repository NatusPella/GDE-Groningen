// De ringrace (#443): de poorten, de startgrid en de beloning van de ring
// (game/js/ringbaan.js) als pure regels, zonder wereld.
//   node scripts/ringrace_test.mjs
import * as B from '../game/js/ringbaan.js';
import { RING_ROUTE, RING_CHECKPOINTS, RING_LENGTH } from '../game/js/ringroute.js';
import { MAX_CP_BAAN } from '../game/js/coopwedstrijdbaan.js';

let bad = 0, n = 0;
const check = (naam, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', naam, info); } };

// --- de poorten: de oude ringrace reed de controlepunten na de start en finishte op de startlijn ---
const cpPunten = RING_CHECKPOINTS.map((i) => RING_ROUTE[i]);
check('de poorten zijn de controlepunten na de start, de finish is de startlijn', B.POORTEN.length === RING_CHECKPOINTS.length - 1 && B.FINISH_INDEX === RING_CHECKPOINTS[0], `${B.POORTEN.length}/${RING_CHECKPOINTS.length}`);
check('de wedstrijdlaag kan alle poorten in een stand-bericht dragen', B.CP_TOTAAL <= MAX_CP_BAAN, `${B.CP_TOTAAL} > ${MAX_CP_BAAN}`);
check('elke poort ligt op de ringbaan', B.POORTEN.every((i) => Number.isInteger(i) && i >= 0 && i < RING_ROUTE.length));
check('de finish ligt op de startlijn (en dus niet achter de eerste poort)', B.poortIndex(B.CP_TOTAAL - 1) === B.FINISH_INDEX && B.poortPunt(B.CP_TOTAAL - 1).x === cpPunten[0][0]);

// de poortpunten liggen in de volgorde van de route: de race gaat altijd vooruit
let oplopend = true;
for (let i = 1; i < B.POORTEN.length; i++) if (B.POORTEN[i] <= B.POORTEN[i - 1]) oplopend = false;
check('de poorten liggen in routevolgorde', oplopend, B.POORTEN.join());
check('de finish ligt na de laatste poort, op de startlijn', B.FINISH_INDEX === RING_CHECKPOINTS[0] && B.FINISH_INDEX < B.POORTEN[B.POORTEN.length - 1]);
check('de poorten zijn echte punten op de baan', B.POORTEN.every((i) => RING_ROUTE[i] && Number.isFinite(RING_ROUTE[i][0])));

// --- één stap per poort, in volgorde, en nooit achteruit ---
const p0 = B.poortPunt(0);
check('op de eerste poort telt hij', B.stapPoort(p0.x, p0.y, 0) === 1);
check('ver van de poort telt hij niet', B.stapPoort(p0.x + 200, p0.y, 0) === 0);
check('de tweede poort telt pas als de eerste gehaald is', B.stapPoort(B.poortPunt(1).x, B.poortPunt(1).y, 0) === 0);
check('op een gehaalde poort blijft de cp staan', B.poortGehaald(p0.x, p0.y, 1) === false);
check('de finish is de laatste poort', B.stapPoort(B.poortPunt(B.CP_TOTAAL - 1).x, B.poortPunt(B.CP_TOTAAL - 1).y, B.CP_TOTAAL - 1) === B.CP_TOTAAL);
check('na de finish telt niets meer', B.poortGehaald(p0.x, p0.y, B.CP_TOTAAL) === false);

// een hele ronde: elke poort in volgorde, en dan is de race klaar
let cp = 0, stappen = 0;
for (let i = 0; i < B.CP_TOTAAL + 3; i++) {
  const q = B.poortPunt(Math.min(i, B.CP_TOTAAL - 1));
  const nieuw = B.stapPoort(q.x, q.y, cp);
  if (nieuw !== cp) stappen++;
  cp = nieuw;
}
check('een hele ronde haalt alle poorten en is dan klaar', stappen === B.CP_TOTAAL && B.klaar(cp), `${stappen} stappen, cp ${cp}`);

// --- de meters voor de tussenstand lopen mee en blijven binnen een poort stijgen ---
const startM = B.meters(cpPunten[0][0], cpPunten[0][1], 0);
check('op de startlijn staat de teller binnen de eerste poort', startM >= 0 && startM < 1000, String(startM));
const ver = B.meters(p0.x + 500, p0.y, 0);
const dichtbij = B.meters(p0.x + 5, p0.y, 0);
check('dichter bij de volgende poort is verder op de baan', dichtbij > ver, `${dichtbij} > ${ver}`);
check('de meters lopen op per gehaalde poort', B.meters(p0.x + 5, p0.y, 1) > dichtbij);
check('meters zijn nooit negatief', B.meters(p0.x + 9000, p0.y, 3) >= 0);
check('aan het eind staat de teller op de finish', B.meters(0, 0, B.CP_TOTAAL) === B.CP_TOTAAL * 1000);

// --- de startgrid: iedereen even ver van de lijn, om en om naast de hartlijn ---
const rijen = [0, 1, 2, 3].map(B.gridRij);
check('de grid staat achter de startlijn', rijen.every((r) => r.terug >= B.START_TERUG));
check('twee naast elkaar in dezelfde rij, om en om', rijen[0].terug === rijen[1].terug && rijen[0].zij === -rijen[1].zij && rijen[2].terug === rijen[3].terug && rijen[2].terug > rijen[0].terug);
check('niemand staat op de hartlijn', rijen.every((r) => Math.abs(r.zij) > 1));
check('de rijen liggen niet op elkaar', Math.abs(rijen[2].terug - rijen[0].terug) >= 6);

// --- de beloning en de medaille van de solo-race ---
check('winnen is goud, daarna zilver en brons', [1, 2, 3].map(B.medailleVoorPlek).join() === '3,2,1');
check('buiten het podium geen medaille', [0, 4, 5].every((p) => B.medailleVoorPlek(p) === 0));
check('de beloning loopt af per plek', B.prijsVoorPlek(1) > B.prijsVoorPlek(2) && B.prijsVoorPlek(2) > B.prijsVoorPlek(3) && B.prijsVoorPlek(3) > B.prijsVoorPlek(4));
check('niemand op plek 0 of 5 krijgt geld', B.prijsVoorPlek(0) === 0 && B.prijsVoorPlek(5) === 0);
check('loopbaanpunten voor iedereen die finisht', [1, 2, 3, 4, 5].every((p) => B.xpVoorPlek(p) >= 4));

check('de baan is één ronde van 17,5 km', RING_LENGTH > 17000 && RING_LENGTH < 18000, String(RING_LENGTH));

if (bad) { console.log(`ringrace_test: ${bad} van ${n} controles FOUT`); process.exit(1); }
console.log(`ringrace_test: ${n} controles ok`);
