// De rangmomenten van de snackwagen (#1378, taak S1): één kort gesprek per rang (2 tot 6) via de gedeelde haak (rankmoments.js, docs/RANKMOMENTS.md).
// De haak kent loopbanen; de snackwagen meldt zich aan onder het vak 'horeca' (de loopbaan Horeca is het dichtst bij: pannen en frituur) en elk moment kijkt met een voorwaarde naar de
// EIGEN rang van de snackwagen (snackrang.js): een niveau omhoog in de loopbaan Horeca speelt dus nooit een snackmoment dat je rang nog niet heeft. De haak wordt gevoed door
// snacklive.checkRank bij een rang omhoog. Ids staan vast (opgeslagen als 'gezien'): nooit hernoemen.
// Teksten zonder opname: tot de opnameronde ondertitel (docs/verhaal/TTS-NIEUW-28-11.md). Alleen namen die de speler op dit punt kent (Tammo, Tessa, Oma Trijntje uit het recept, Jelle).
// Samen spelen: lokaal per speler (eigen rang, eigen scherm); een gast die meewerkt krijgt zijn moment bij zijn eigen rang.
import { registerRankMoment } from './rankmoments.js';
import * as L from './bezitlive.js';

export const SNACK_VAK = 'horeca';
const rangNu = () => { try { return Number(L.snackState().rang) || 1; } catch (e) { return 1; } };

export const SNACK_MOMENTS = [
  { id: 'snack-rang2-standplaats', rang: 2, regels: [
    ['T', 'Een vergunning. Met een stempel en alles.'],
    ['A', 'Nu mag het echt. Het moet alleen nog iets worden.'],
  ] },
  { id: 'snack-rang3-wagenbaas', rang: 3, regels: [
    ['A', 'De eerste klant betaalde gepast. Ik wil dat briefje inlijsten.'],
    ['T', 'Hij nam er twee. Die twee gaan niet in een lijstje.'],
  ] },
  { id: 'snack-rang4-eierbalmeester', rang: 4, regels: [
    ['Oma Trijntje', 'Driehonderd stuks, hoor ik. Niet slecht voor een recept uit 1953.'],
    ['A', 'Het is jouw recept, Oma.'],
    ['Oma Trijntje', 'Het is van vijf mensen. Ik hield alleen de pan vast.'],
  ] },
  { id: 'snack-rang5-teambaas', rang: 5, regels: [
    ['T', 'Iemand anders doet jouw luik open. Dat voelt vreemd.'],
    ['A', 'Het voelt als een bedrijf.'],
    ['T', 'Valt mie nait of.'],
  ] },
  { id: 'snack-rang6-imperium', rang: 6, regels: [
    ['Jelle Terpstra', 'Vijf wagens. Dat is bijna een formulier.'],
    ['A', 'Het is een imperium, Jelle.'],
    ['Jelle Terpstra', 'Dat zeg ik ook. Maar dan met een stempel.'],
  ] },
];

// Aanmelden bij de haak; geeft de uitkomst per moment terug (voor de test). Een tweede aanroep meldt niets dubbel aan (het register weigert een bestaand id).
export function registerSnackMoments() {
  return SNACK_MOMENTS.map((m) => registerRankMoment({ id: m.id, vak: SNACK_VAK, rang: m.rang, voorwaarde: () => rangNu() >= m.rang, scene: { soort: 'talk', regels: m.regels } }));
}
registerSnackMoments();
