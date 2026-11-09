// Samen spelen: wat werkt al samen? Eén register `samenStatus` per onderdeel (missie of verhaalstap, bijbaan, activiteit, minigame, voertuig),
// met de status 'werkt' | 'deels' | 'nee'. Zodra er twee of meer spelers in de sessie zijn, grijst de kaart een 'nee'-onderdeel uit, krijgt een
// 'deels'-onderdeel een kleine markering en waarschuwt het spel vóór de start (de speler blijft vrij om toch te beginnen).
// Met één speler (eenspeler, of een sessie van één) doet niets hiervan iets.
// Puur: alleen spelersregister.js (zelf zonder imports), geen DOM, geen three.js, zodat missions.js en mapview.js het zonder cirkel kunnen laden. De gegevens staan hier als data;
// scripts/coopstatus_test.mjs controleert dat elke bekende bijbaan, activiteit, minigame en wedstrijd een status heeft en dat 'werkt'
// overeenkomt met wat in coopgast.js (GAST_ACTIVITEITEN), coopbijbaan.js (BIJBAAN_REGELS) en registreerWedstrijd staat (docs/COOP-GAST.md).

import { meerdereSpelers } from './spelersregister.js';
export { meerdereSpelers };

export const WERKT = 'werkt', DEELS = 'deels', NEE = 'nee';
export const STATUSSEN = [WERKT, DEELS, NEE];

// De meldingen (meldingenbudget: 14 woorden). Sinds #684 noemt een 'nee' ook wat wél kan, in plaats
// van alleen "dit werkt niet": een gast die alleen "kan niet" leest, weet niet wat hij zelf kan doen.
export const SAMEN_TEKST = {
  [NEE]: 'Dit kan alleen in je eigen spel; samen kan hengelen en boeren.',
  [DEELS]: 'Dit werkt nog maar deels samen.',
};
// Vóór de start: de speler mag toch doorgaan
export const START_TEKST = {
  [NEE]: 'Dit kan alleen in je eigen spel; samen kan hengelen, boeren of pannenkoeken bakken.',
  [DEELS]: 'Dit werkt nog maar deels samen. Je kunt het toch proberen.',
};

// De stappen van een missie (missions.js, stage.kind). Wat alleen bij wie het spel opende staat (rekwisieten, voertuigen, kluis) is 'deels';
// vliegen, de trein en de duivenmodus doen gasten nog niet ('nee').
// choice staat op 'werkt' sinds #525 en is sinds #686 een keuze van de groep: een gast leest de vraag en de
// opties mee (coopscene.js, "Jullie kiezen samen"), zijn cijfertoets gaat als 'paneel'-bericht naar de
// gastheer en telt daar als stem (coopgast.js paneelIndrukken). De host telt de stemmen (coopgroep.js
// stemKeuze): de meerderheid wint, gelijkspel beslist de stem van de opener, en wie niet antwoordt telt
// niet mee. De host beslist dus niet alleen; hij telt alleen.
// timing staat op 'werkt' sinds #525: de gast ziet de balk en drukt mee, en zijn druk gaat met de ronde en de
// naaldstand mee die hij zag (paneelEvent). De gastheer beoordeelt hem op die stand (stagetiming.js updateTiming,
// neemTimingDruk), dus netwerklatentie maakt van een goede druk geen mis meer; een druk uit een ronde die al voorbij
// is valt weg en kan de opdracht dus niet meer laten mislukken (failAt).
const STAP = {
  goto: WERKT, hold: WERKT, board: WERKT, escape: WERKT, chase: WERKT, scene: WERKT,
  choice: WERKT, timing: WERKT,
  rit: WERKT, convoy: DEELS, fuse: WERKT, blast: DEELS, plan: WERKT, lock: WERKT, pickpocket: WERKT,
  laser: WERKT, crack: WERKT, getaway: WERKT, shot: WERKT, vault: WERKT,
  // De museumrollen (fuse, lock, pickpocket, laser, crack) staan op 'werkt' sinds #525: elke meespeler`n  // krijgt een eigen rol (heistrollen.js rolVerdeling) en de rolhouder doet de stap; plan en shot zijn`n  // scènes die de groep samen ziet (coopcut), getaway is een checkpoint dat de groep leest.`n  // boatchase staat op 'werkt' sinds #525: de dichtstbijzijnde meespeler bepaalt de afstand en elke boot
  // van de groep telt langszij (teamActor, groepsActeurs), dus een gast kan het skûtsje ook inhalen.
  boatchase: WERKT,
  // convoy staat op 'werkt' sinds #525: de motor volgt de meespeler die in de missieauto zit (teamActor),
  // dus een gast kan de colonne leiden en de teller telt zijn afstand.
  convoy: WERKT,
  // garage staat op 'werkt' sinds #525: de motor kiest uit de groep de meespeler met een stilstaande auto
  // in de bay (garages.js garageInside met een actor), dus een gast kan de politie ook afschudden.
  garage: WERKT,
  // bake staat op 'werkt' sinds #525: een gast bij het fornuis of de kraam telt mee (doelStand), ziet de
  // ingrediënten en de voortgang van de bakronde en zijn toets 1-6 gaat als de zijne naar de gastheer.
  bake: WERKT,
  train: NEE, plane: WERKT, airgates: WERKT, landplane: WERKT, heli: WERKT, pigeon: WERKT,
};
// Een missie zonder stappen (missions.js, def.type): de soort zelf telt
// checkpoint staat op 'werkt' sinds #525: de motor leest de groep, dus elke meespeler haalt zelf de
// controlepunten (op zijn eigen fiets) en wie als eerste de finish haalt, telt voor de groep — net
// als bij de stappen goto en hold. deliver staat op 'werkt' sinds #525: de motor leest teamActor en een gast mag de
// opdrachtauto nu besturen; fatbike staat op 'werkt' sinds #525 (elke fiets kiest de dichtstbijzijnde
// meespeler te voet en elke meespeler houdt zijn eigen gezondheid), boat 'nee'.
const MISSIE_SOORT = { checkpoint: WERKT, deliver: WERKT, fatbike: WERKT, stunt: DEELS, boat: NEE };

// Bijbanen (sidejobs.js, job.id): taxi, bezorger, krantenwijk en vracht (coopbijbaan.js) en de bus (buscoop.js) zijn samen te doen
const BIJBAAN = {
  taxi: WERKT, bezorger: WERKT, krantenwijk: WERKT, vracht: WERKT, bus: WERKT,
  // #683: drie herhaalbare banen met een helper-rol (passagier op de boot, tweede jurylid in de rechtbank).
  rondvaart: WERKT, veerdienst: WERKT, rechtbank: WERKT,
  // #683: de vijf banen uit het groeipad, elk met een eigen E-hulp (mede-optreder, tweede balie, handhaver, bemanning, helper).
  cabaret: WERKT, loket: WERKT, snackoverlast: WERKT, tjalke: WERKT, bietenoogst: WERKT,
  boerderij: NEE, // de trekker
  rondvaarttour: WERKT, // #819: de ontspannen tour is een passagiersrol; de fooi wordt gedeeld
  boa: NEE, fietsdepot: NEE, lijn: NEE, verhuizing: NEE,
};

// Activiteiten (activities.js, LIST): coöp-wedstrijden (registreerWedstrijd) en de lokale activiteiten van een gast (GAST_ACTIVITEITEN)
const ACTIVITEIT = {
  discgolf: WERKT, pitchputt: WERKT, kartbaan: WERKT, klimtoren: WERKT, hengelen: WERKT, pannenkoek: WERKT, carillon: WERKT, boeren: WERKT, regatta: WERKT, bruggenrace: WERKT, ringrace: WERKT,
  dijkrace: WERKT, // de straatrace van M14 (De dijk): iedereen dezelfde auto, één gezamenlijke start (#443)
  vluchtdienst: DEELS, // de rondvlucht is host-only; als passagier meerijden mag (#492)
  safehuis: DEELS, geheimen: DEELS, wandeling: DEELS, snackketen: DEELS, evenementen: DEELS,
  pvparena: DEELS, // de PvP-minigame: de host rekent en ziet het bord, de gastenkant van het bord is nog open (#454)
  carbid: NEE, kermis: NEE, hoogvlieger: NEE, drift: NEE, skatepark: WERKT, zwembad: NEE, waterski: NEE, vliegschool: NEE,
};

// Minigames (cooproles.js, registerCoop('minigame')) en wat verder een eigen plek op de kaart heeft (de heli, de duif)
const MINIGAME = {
  padel: WERKT, kartrace: WERKT,
  racers: NEE, pg_bruggenrace: WERKT, carbid: NEE, kermis: NEE, pg_fierljep: NEE, pg_foodtruck: DEELS, pg_koe: NEE, pg_skutsje: NEE, // #675: de Fjord is lokaal (eigen wagen/omzet)
  heli: NEE, duif: NEE,
};

// Voertuigen en loopbanen (cooproles.js, registerCoop('voertuig')): wat een meespeler als bestuurder of bijrijder nog niet kan
const VOERTUIG = {
  auto: WERKT, bakkie: WERKT, bus: WERKT, vrachtwagen: WERKT, politie: WERKT, taxi: WERKT, motor: WERKT, scooter: WERKT, boot: WERKT, fiets: WERKT, step: WERKT, skutsje: WERKT,
  trekker: NEE, trein: DEELS, heli: NEE,
};

export const REGISTER = {
  stap: STAP, missie: MISSIE_SOORT, bijbaan: BIJBAAN, activiteit: ACTIVITEIT, minigame: MINIGAME, voertuig: VOERTUIG,
};

// Een toelichting bij een onderdeel waar de status strenger is dan het meerijden (#492): de lessen van de vliegschool
// zijn voor wie het spel opende, maar in het lesvliegtuig of de leshelikopter mag een gast als passagier mee.
// De sleutel is `soort/id`; zonder toelichting blijft het bij de gewone tekst.
export const TOELICHTING = {
  'activiteit/vliegschool': 'De lessen zijn voor wie het spel opende; meerijden mag, besturen niet.',
  'activiteit/vluchtdienst': 'De rondvlucht is voor wie het spel opende; als passagier meerijden mag, besturen niet.',
  'voertuig/trein': 'Als passagier meerijden in de trein van de ander mag; zelf de trein besturen niet.',
};
export const toelichtingVan = (soort, id) => (typeof id === 'string' && TOELICHTING[soort + '/' + id]) || null;

// #683: de "deels"-activiteiten krijgen een bewuste keuze in plaats van een vaag "deels". Vandaag is elke
// keuze bewust host-only (met de reden erbij) en staat erbij wat een volgende stap zou zijn: een gast doet
// het lokaal op zijn eigen scherm, of het wordt een gedeelde wedstrijd. Zo liegt "deels" niet en weet de
// volgende sessie wat er nog moet gebeuren.
export const DEELS_ROUTES = ['lokaal', 'wedstrijd', 'host-only'];
export const DEELS_KEUZE = {
  vluchtdienst: { route: 'host-only', rol: 'passagier', reden: 'De rondvlucht is van wie het spel opende; als passagier meerijden mag, besturen niet.', kandidaat: 'wedstrijd', nodig: 'Een gedeelde rondvlucht met een eigen toestel per speler.' },
  safehuis: { route: 'host-only', rol: 'eigen deur', reden: 'Het huisje staat in de wereld van wie het spel opende en de deur gaat alleen voor de eigenaar open.', kandidaat: 'lokaal', nodig: 'Een eigen huisje per speler, ook voor een gast, met eigen inrichting.' },
  geheimen: { route: 'host-only', rol: 'vinder', reden: 'De vondsten en geheimen zijn voorwerpen in de wereld van wie het spel opende.', kandidaat: 'lokaal', nodig: 'Eigen vondsten per speler laten tellen, zonder de wereldstaat te delen.' },
  wandeling: { route: 'host-only', rol: 'wandelaar', reden: 'De wandeling zet je lichaam en de camera in de wereld van wie het spel opende.', kandidaat: 'lokaal', nodig: 'Een eigen wandeling op het eigen scherm, zoals hengelen.' },
  snackketen: { route: 'host-only', rol: 'klant', reden: 'De snackketen draait op de voorraad en de keten van wie het spel opende.', kandidaat: 'lokaal', nodig: 'Een eigen ketenstand per speler in de eigen opslag.' },
  evenementen: { route: 'host-only', rol: 'bezoeker', reden: 'De evenementen hangen aan de kalender en de wereld van wie het spel opende.', kandidaat: 'lokaal', nodig: 'Per speler bijhouden welke evenementen hij meemaakte.' },
  pvparena: { route: 'host-only', rol: 'deelnemer', reden: 'Wie het spel opende rekent en zet het bord; de kant van de meespeler is nog niet af.', kandidaat: 'wedstrijd', nodig: 'Het bord en de uitslag per speler over de netlaag (#454).' },
  // #675: de Fjord Frituur is van de speler, niet van de wereld. Een gast opent zijn eigen wagen in
  // zijn eigen spel; de dagomzet en de upgrades horen bij zijn eigen save, dus er is geen gedeelde pot.
  fjord: { route: 'lokaal', rol: 'eigen wagen', reden: 'De Fjord Frituur en zijn dagomzet zijn van jouw eigen opgeslagen spel; een gast opent zijn eigen wagen in zijn eigen spel.', kandidaat: 'lokaal', nodig: 'Een eigen Fjord per speler in de eigen opslag.' },
};
export const deelsKeuzeVan = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(DEELS_KEUZE, id) ? DEELS_KEUZE[id] : null);

// #683: het groeipad voor de herhaalbare inhoud. Deze banen zijn nog host-only (geen regel in BIJBAAN_REGELS);
// per baan staan de helper-rol die we willen en de haak die in de baan zelf nog moet komen. Zo is de keuze
// vastgelegd zonder te doen alsof het al samen werkt. Rondvaart, veerdienst en rechtbank zijn inmiddels
// gebouwd en staan in BIJBAAN_REGELS; wat hier staat is het restant.
// #683: het groeipad voor de herhaalbare inhoud is leeg: alle acht banen die erin stonden zijn gebouwd en
// hebben een regel in BIJBAAN_REGELS. De lijst blijft bestaan zodat een volgende baan er weer in kan.
export const BIJBAAN_GROEIPAD = [];

// De status van één onderdeel, of null als het onderdeel onbekend is (dan waarschuwt niets).
// Uitzondering: een bijbaan die hier niet staat blijft bij wie het spel opende (docs/COOP-GAST.md), dus 'nee'; dat zijn er veel (paneel-, stad- en keuzebanen).
export function samenStatus(soort, id) {
  const t = REGISTER[soort];
  if (t && typeof id === 'string' && Object.prototype.hasOwnProperty.call(t, id)) return t[id];
  return soort === 'bijbaan' && typeof id === 'string' && id ? NEE : null;
}

// De positieve kant (#684): wat samen wél kan, uit hetzelfde register. De volledige lijst staat in de
// wachtkamer en op het Samen-scherm; een kortere regel past in een melding of een kaart. Alleen wat
// 'werkt' is komt erin, zodat de lijst niet kan liegen over een onderdeel dat nog niet samen werkt.
const SAMEN_KAN = [
  ['bijbaan', 'taxi', 'taxi'], ['bijbaan', 'bezorger', 'bezorgen'], ['bijbaan', 'krantenwijk', 'de krantenwijk'],
  ['bijbaan', 'vracht', 'vracht'], ['bijbaan', 'bus', 'de bus'],
  // #683: de drie banen met een passagiers- of juryrol, en de vijf met een eigen E-hulp
  ['bijbaan', 'rondvaart', 'de rondvaart'], ['bijbaan', 'rondvaarttour', 'de ontspannen rondvaart'], ['bijbaan', 'veerdienst', 'de veerdienst'], ['bijbaan', 'rechtbank', 'de rechtbank'],
  ['bijbaan', 'cabaret', 'het cabaret'], ['bijbaan', 'loket', 'het loket'], ['bijbaan', 'snackoverlast', 'de snackoverlast'],
  ['bijbaan', 'tjalke', 'de tjalke'], ['bijbaan', 'bietenoogst', 'de bietenoogst'],
  ['activiteit', 'hengelen', 'hengelen'], ['activiteit', 'pannenkoek', 'pannenkoeken bakken'],
  ['activiteit', 'carillon', 'de beiaard'], ['activiteit', 'boeren', 'boeren'],
  ['minigame', 'padel', 'padel'], ['activiteit', 'kartbaan', 'karten'], ['activiteit', 'pitchputt', 'golf'],
  ['activiteit', 'discgolf', 'discgolf'], ['activiteit', 'klimtoren', 'klimmen'],
  ['activiteit', 'skatepark', 'skaten'], ['activiteit', 'ringrace', 'de ringrace'],
];
export const samenKan = () => SAMEN_KAN.filter(([soort, id]) => samenStatus(soort, id) === WERKT).map(([, , label]) => label);
export const SAMEN_KAN_REGEL = 'Samen kan nu: ' + samenKan().join(', ') + '.';
// Voor een kaart of een korte tip: de vier dingen die een gast het makkelijkst zelf doet (#429, #434).
export const SAMEN_KAN_KORT = 'Samen kan ook: hengelen, boeren, pannenkoeken bakken en de beiaard.';
export const SAMEN_KAN_TITEL = 'Wat kan samen';

// De "eigen plan"-kaart (#684): als de opener iets doet dat alleen de opener kan, hoeft de gast niet
// werkloos toe te kijken. Naam en waar, zodat hij weet waar hij moet zijn; de kaart zelf staat in
// samenplan.js (hudcards).
export const EIGEN_PLAN_TITEL = 'Doe intussen je eigen ding';
export const EIGEN_PLAN = [
  ['hengelen', 'aan elk water met I'],
  ['pannenkoeken bakken', 'op het pannenkoekenschip'],
  ['de beiaard', 'bij de Martinitoren'],
  ['boeren', 'op je eigen akker bij Hoogkerk'],
];
export const EIGEN_PLAN_TEKST = 'Doe intussen je eigen ding: ' + EIGEN_PLAN.map(([naam, waar]) => `${naam} ${waar}`).join(', ') + '.';

const SLECHTST = { [WERKT]: 0, [DEELS]: 1, [NEE]: 2 };
export function slechtste(lijst) {
  let best = null;
  for (const s of lijst) if (s && (best === null || SLECHTST[s] > SLECHTST[best])) best = s;
  return best;
}

// Een missie: de slechtste status van zijn stappen. Een stap die we niet kennen telt als 'deels' (alleen-host rekwisieten zijn de regel).
export function missieStatus(def) {
  if (!def) return null;
  const stappen = Array.isArray(def.stages) ? def.stages : null;
  if (stappen && stappen.length) return slechtste(stappen.map((s) => (s && STAP[s.kind]) || DEELS));
  return MISSIE_SOORT[def.type] || (def.type === 'stages' ? WERKT : DEELS);
}

// De uitkomst voor de kaart en de start: { status, tekst, start } voor 'deels' en 'nee' bij twee of meer spelers; anders null.
// status mag ook al bekend zijn (missieStatus); toelichting is de extra regel uit TOELICHTING (of null).
export function samenWaarschuwing(world, soort, id, status = undefined) {
  const s = status === undefined ? samenStatus(soort, id) : status;
  if (!s || s === WERKT || !meerdereSpelers(world)) return null;
  const extra = toelichtingVan(soort, id);
  const tekst = extra ? `${SAMEN_TEKST[s]} ${extra}` : SAMEN_TEKST[s];
  const start = extra ? `${START_TEKST[s]} ${extra}` : START_TEKST[s];
  return { status: s, tekst, start, grijs: s === NEE, deels: s === DEELS, toelichting: extra };
}

// De waarschuwing vóór de start: één melding per start, zonder de speler te blokkeren. Geeft de waarschuwing terug (of null).
export function waarschuwVoorStart(world, soort, id, status = undefined) {
  const w = samenWaarschuwing(world, soort, id, status);
  if (w && world && typeof world.addMessage === 'function') world.addMessage(w.start, 4);
  return w;
}









