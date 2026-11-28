// De verhaalmomenten van de rangen van de boer (#1373, audit B3): bij elk niveau omhoog van Landbouw een korte praat met een buur van de hoeve, die zegt wat de rang opent.
// Ypie Boekema (de buurboer, ingeleid door Tante Aaltje in N5.2) wijst de grenzen en leent een trekker, Lutje de melkrijder brengt de prijzen en het nieuws, mevrouw Hofstra van
// Coöperatie Noorderveld heeft de formulieren, Jorrit Tilma uit Oldambt is de rivaal met de grote machines. Elke naam wordt in het moment zelf ingeleid door wie er al is.
// Wat elke rang opent staat in boerrang.js (RANG_OPENT, de eisen); de haak is rankmoments.js (docs/RANKMOMENTS.md).
//
// Een moment speelt alleen voor wie de hoeve kreeg (het verhaal): wie via het menu boert, krijgt het gewone kaartje van de rang. Samen spelen: lokaal per speler (een gast
// speelt zijn eigen moment op zijn eigen apparaat; niets gaat over het net). Elke regel hoogstens 25 woorden.
import { registerRankMoment } from './rankmoments.js';
import { heeftHoeve } from './boerderijlive.js';
import { VAK } from './boerrang.js';

const alleenMetHoeve = () => { try { return heeftHoeve(); } catch (e) { return false; } };

export const BOER_MOMENTEN = [
  { id: 'landbouw-rang2-ypie', rang: 2, regels: [
    ['Ypie', 'Ypie Boekema, van hiernaast. Je zaait nu zelf: dat is een akker, geen tuin. Tot aan de witte paal is van jullie.'],
    ['Tessa', 'Aardappelen en uien, Tammo. Op onze eigen akker.'],
    ['Tammo', 'Is dat goed of slecht?'],
    ['Ypie', 'Dat wordt wat.'],
  ] },
  { id: 'landbouw-rang3-lutje', rang: 3, regels: [
    ['Lutje', 'Lutje, de melkrijder! Ik rijd elke dag langs elk erf. Mooie dagprijs vandaag, hè?'],
    ['Ypie', 'Lutje weet alles voordat het gebeurd is.'],
    ['Lutje', 'Jullie staan wel heel veel samen op het land, zeg.'],
    ['Tessa', 'Het is ons land, Lutje.'],
    ['Ypie', 'Mijn trekker is te klein voor jullie. Koop een eigen: een grote.'],
  ] },
  { id: 'landbouw-rang4-hofstra', rang: 4, regels: [
    ['Lutje', 'Mevrouw Hofstra van Coöperatie Noorderveld wil je spreken. Ze heeft een formulier.'],
    ['Mevrouw Hofstra', 'Dag. Ik koop in voor de coöperatie. Dit formulier is heel simpel.'],
    ['Tammo', 'Het zijn er zeven.'],
    ['Mevrouw Hofstra', 'Eén per contract. Je maaidorser mag nu ook voor de buren werken.'],
  ] },
  { id: 'landbouw-rang5-tilma', rang: 5, regels: [
    ['Ypie', 'Daar staat Jorrit Tilma uit Oldambt. Jonge loonwerker, de grootste machines van de streek.'],
    ['Jorrit', 'Mooie akker. Te klein. Ik pak er twee, jij pakt er één.'],
    ['Tessa', 'Wij kopen gewoon meer grond.'],
    ['Ypie', 'Dat wordt wat.'],
  ] },
  { id: 'landbouw-rang6-campagne', rang: 6, regels: [
    ['Lutje', 'De Bietencampagne begint! De hele provincie kijkt naar jouw velden.'],
    ['Mevrouw Hofstra', 'De Suikerhal wil de eerste vracht van de Bietenbaron. Hier is het formulier.'],
    ['Jorrit', 'Mijn rooier is sneller.'],
    ['Tessa', 'Maar onze bieten zijn zoeter.'],
    ['Tammo', 'Bietenbaron van Oldambt. Klinkt als iemand die nooit slaapt.'],
  ] },
];

export const registratie = BOER_MOMENTEN.map((m) => registerRankMoment({ id: m.id, vak: VAK, rang: m.rang, scene: { soort: 'talk', regels: m.regels }, voorwaarde: alleenMetHoeve }));
