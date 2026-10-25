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

// De meldingen (meldingenbudget: 14 woorden)
export const SAMEN_TEKST = {
  [NEE]: 'Dit werkt nog niet samen.',
  [DEELS]: 'Dit werkt nog maar deels samen.',
};
// Vóór de start: de speler mag toch doorgaan
export const START_TEKST = {
  [NEE]: 'Dit werkt nog niet samen. Je kunt het toch proberen.',
  [DEELS]: 'Dit werkt nog maar deels samen. Je kunt het toch proberen.',
};

// De stappen van een missie (missions.js, stage.kind). Wat alleen bij wie het spel opende staat (rekwisieten, voertuigen, kluis) is 'deels';
// vliegen, de trein en de duivenmodus doen gasten nog niet ('nee').
const STAP = {
  goto: WERKT, hold: WERKT, board: WERKT, escape: WERKT, chase: WERKT, scene: WERKT,
  choice: DEELS, timing: DEELS, rit: DEELS, bake: DEELS, convoy: DEELS, fuse: DEELS, blast: DEELS, plan: DEELS, lock: DEELS, pickpocket: DEELS,
  laser: DEELS, crack: DEELS, getaway: DEELS, shot: DEELS, garage: DEELS, boatchase: DEELS, vault: DEELS,
  train: NEE, plane: NEE, airgates: NEE, landplane: NEE, heli: NEE, pigeon: NEE,
};
// Een missie zonder stappen (missions.js, def.type): de soort zelf telt
const MISSIE_SOORT = { checkpoint: DEELS, deliver: DEELS, fatbike: DEELS, stunt: DEELS, boat: NEE };

// Bijbanen (sidejobs.js, job.id): taxi, bezorgen, krantenwijk (coopbijbaan.js) en de bus (buscoop.js) zijn samen te doen
const BIJBAAN = {
  taxi: WERKT, bezorger: WERKT, krantenwijk: WERKT, bus: WERKT,
  boerderij: NEE, // de trekker
  rondvaart: NEE, rondvaarttour: NEE, veerdienst: NEE, tjalke: NEE,
  bietenoogst: NEE, boa: NEE, cabaret: NEE, fietsdepot: NEE, lijn: NEE, rechtbank: NEE, snackoverlast: NEE, verhuizing: NEE, vracht: NEE,
};

// Activiteiten (activities.js, LIST): coöp-wedstrijden (registreerWedstrijd) en de lokale activiteiten van een gast (GAST_ACTIVITEITEN)
const ACTIVITEIT = {
  discgolf: WERKT, pitchputt: WERKT, kartbaan: WERKT, klimtoren: WERKT, hengelen: WERKT, pannenkoek: WERKT, carillon: WERKT, regatta: WERKT, bruggenrace: WERKT, ringrace: WERKT,
  safehuis: DEELS, geheimen: DEELS, wandeling: DEELS, snackketen: DEELS, evenementen: DEELS,
  pvparena: DEELS, // de PvP-minigame: de host rekent en ziet het bord, de gastenkant van het bord is nog open (#454)
  carbid: NEE, kermis: NEE, hoogvlieger: NEE, drift: NEE, skatepark: WERKT, zwembad: NEE, waterski: NEE, vliegschool: NEE,
};

// Minigames (cooproles.js, registerCoop('minigame')) en wat verder een eigen plek op de kaart heeft (de heli, de duif)
const MINIGAME = {
  padel: WERKT, kartrace: WERKT,
  racers: NEE, pg_bruggenrace: WERKT, carbid: NEE, kermis: NEE, pg_fierljep: NEE, pg_foodtruck: NEE, pg_koe: NEE, pg_skutsje: NEE,
  heli: NEE, duif: NEE,
};

// Voertuigen en loopbanen (cooproles.js, registerCoop('voertuig')): wat een meespeler als bestuurder of bijrijder nog niet kan
const VOERTUIG = {
  auto: WERKT, bakkie: WERKT, bus: WERKT, vrachtwagen: WERKT, politie: WERKT, taxi: WERKT, motor: WERKT, scooter: WERKT, boot: WERKT, fiets: WERKT, step: WERKT, skutsje: WERKT,
  trekker: NEE, trein: NEE, heli: NEE,
};

export const REGISTER = {
  stap: STAP, missie: MISSIE_SOORT, bijbaan: BIJBAAN, activiteit: ACTIVITEIT, minigame: MINIGAME, voertuig: VOERTUIG,
};

// De status van één onderdeel, of null als het onderdeel onbekend is (dan waarschuwt niets).
// Uitzondering: een bijbaan die hier niet staat blijft bij wie het spel opende (docs/COOP-GAST.md), dus 'nee'; dat zijn er veel (paneel-, stad- en keuzebanen).
export function samenStatus(soort, id) {
  const t = REGISTER[soort];
  if (t && typeof id === 'string' && Object.prototype.hasOwnProperty.call(t, id)) return t[id];
  return soort === 'bijbaan' && typeof id === 'string' && id ? NEE : null;
}

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
// status mag ook al bekend zijn (missieStatus).
export function samenWaarschuwing(world, soort, id, status = undefined) {
  const s = status === undefined ? samenStatus(soort, id) : status;
  if (!s || s === WERKT || !meerdereSpelers(world)) return null;
  return { status: s, tekst: SAMEN_TEKST[s], start: START_TEKST[s], grijs: s === NEE, deels: s === DEELS };
}

// De waarschuwing vóór de start: één melding per start, zonder de speler te blokkeren. Geeft de waarschuwing terug (of null).
export function waarschuwVoorStart(world, soort, id, status = undefined) {
  const w = samenWaarschuwing(world, soort, id, status);
  if (w && world && typeof world.addMessage === 'function') world.addMessage(w.start, 4);
  return w;
}
