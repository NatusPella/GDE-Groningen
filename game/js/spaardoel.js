// Een spaardoel in Te doen (audit speelbaarheid 23-11): vanaf akte 2 betaalt het verhaal ruim (tot ruim €20.000) en kent het maar
// één kost (Het Loket, €150), dus geld had geen bestemming. Geen nieuwe economie: het doel wijst naar wat er al te koop is zodra de
// boerderij open is (de machinecatalogus van percelen.js, gekocht via machines.js koopUitCatalogus en dus via de bestaande winkel).
// Het spaardoel is het goedkoopste stuk dat je nog niet hebt en nog niet kunt betalen: altijd iets binnen bereik, nooit iets wat je al
// kunt kopen (dan is het geen sparen). Wie alles heeft of alles kan betalen krijgt geen rij.
//
// Puur: geen DOM, geen wereld, geen opslag. Samen spelen: per speler en per apparaat; een gast spaart in zijn eigen spel voor zijn
// eigen boerderij (boerderijgast.js), er gaat niets over het net. Test: scripts/spaardoel_test.mjs.
import { MACHINE_CATALOGUS } from './percelen.js';
import { SPEC } from './machines.js';

// Te koop is: een werktuig, of een machine met een specificatie (zonder SPEC zegt machines.js "Dat is nog niet te koop").
export const teKoop = (id, catalogus = MACHINE_CATALOGUS, spec = SPEC) => {
  const c = catalogus[id];
  return !!c && Number.isFinite(c.koop) && c.koop > 0 && (c.soort !== 'machine' || !!spec[id]);
};

// { id, naam, prijs, nog, pct } of null. geld: het saldo; eigen: de typen die de speler al gekocht heeft (geen huur).
export function kiesSpaardoel({ geld, eigen = [], open = true, catalogus = MACHINE_CATALOGUS, spec = SPEC } = {}) {
  if (!open || !Number.isFinite(geld)) return null;
  const heb = new Set(eigen);
  const kandidaten = Object.keys(catalogus).filter((id) => teKoop(id, catalogus, spec) && !heb.has(id) && catalogus[id].koop > geld);
  if (!kandidaten.length) return null;
  kandidaten.sort((a, b) => catalogus[a].koop - catalogus[b].koop || (a < b ? -1 : 1));
  const id = kandidaten[0], c = catalogus[id];
  const nog = c.koop - Math.max(0, geld);
  return { id, naam: c.naam, prijs: c.koop, nog, pct: Math.max(0, Math.min(99, Math.floor((Math.max(0, geld) / c.koop) * 100))) };
}

// De gekochte typen uit een boerderijstand (machines.js: een gehuurde machine heeft bezit 'gehuurd').
export function eigenTypen(bd) {
  const mp = bd && bd.machinepark;
  if (!mp) return [];
  return [...(mp.machines || []), ...(mp.werktuigen || [])].filter((m) => m && m.bezit !== 'gehuurd').map((m) => m.type);
}
