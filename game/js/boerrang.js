// De rangen van de boer (#1373, audit B3): wat elk niveau van het vak Landbouw opent. De ladder zelf blijft die van loopbaan.js (zes niveaus, besluit 2 van de audit):
// Veldhulp, Zaaier, Trekkerrijder, Loonwerker, Akkerbouwer, Bietenbaron van Oldambt. Hier staat alleen wat erbij hoort: welke machine of welk perceel pas vanaf welke rang te koop
// of te huur is (rangSlot) en een zin per rang voor het scherm (RANG_OPENT). Puur: geen DOM, geen wereld, geen opslag (scripts/boerrang_test.mjs).
//
// Migratieregel ("altijd beschikbaar", acceptatie #1373): de rangeis geldt alleen voor wie de hoeve van Oom Hindrik kreeg (het verhaal), en alleen voor wat je koopt of huurt.
// Wie al een machine heeft houdt hem; een boerderij zonder schenking (menu, oude save, gast) koopt alles zoals voorheen. De verhaalmomenten per rang staan in
// farmrankmoments.js (registerRankMoment, docs/RANKMOMENTS.md).
// Samen spelen: de rang is per speler (gde-loopbaan-v1); een gast die op de akker van de host werkt, krijgt geen eis van zijn eigen rang opgelegd (alleen kopen is gebonden).
import { vakInfo, MAX_NIVEAU } from './loopbaan.js';

export const VAK = 'landbouw';

// Machines en werktuigen uit percelen.MACHINE_CATALOGUS: vanaf welk niveau je ze koopt of huurt. Wat ontbreekt is vanaf niveau 1.
export const EIS_MACHINE = {
  'trekker-klein': 1, 'ploeg-3': 1, cultivator: 1, zaaimachine: 1, mestwaaier: 1, aanhanger: 1,
  spuit: 2, maaier: 2,
  'trekker-groot': 3, balenpers: 3, laadmachine: 3,
  maaidorser: 4,
};
// De twaalf vaste percelen en de erven (percelen.js). Wat ontbreekt (de percelen van Bezit, de geschonken hoeve) is vanaf niveau 1.
export const EIS_PERCEEL = {
  wierdeakker: 2, zuiderzijde: 2, 'sauwerd-weide': 2, dijkweide: 2, zandkamp: 2,
  'kleistuk-noord': 3, 'winsumer-wei': 3, 'reitdiep-weide': 3,
  'bedumer-klei': 4, 'hoge-akker': 4,
  'leekster-veld': 5,
};
export const EIS_ERF = { weidehof: 4, kleiplaats: 5, wierdehoeve: 5 };

export const RANG_OPENT = {
  1: 'De hoeve, de Wierdetrekker en de gewone werktuigen.',
  2: 'Je eerste eigen akker: kleine percelen kopen of huren, de spuit en de maaier.',
  3: 'Je eerste eigen grote machine: de Kleibijter, de balenpers en de laadmachine, en meer percelen.',
  4: 'Je werkt voor de buren: de maaidorser, grotere percelen en het weidehof.',
  5: 'Grond in het Hogeland en de Veenkoloniën: de Leekster akker en de grote erven.',
  6: 'De Bietencampagne: het hele jaar bietencontracten voor de hele provincie.',
};

export const rangTitel = (niveau) => { const v = vakInfo(VAK); return v ? v.titels[Math.min(Math.max(1, niveau | 0), MAX_NIVEAU) - 1] : ''; };

// Welk niveau is nodig voor een machine ('machine'), perceel ('perceel') of erf ('erf')?
export function rangEis(soort, id) {
  const tabel = soort === 'machine' ? EIS_MACHINE : soort === 'erf' ? EIS_ERF : EIS_PERCEEL;
  return tabel[id] || 1;
}

// Is het dicht? { niveau, hoeve }: het niveau van Landbouw van deze speler en of hij de hoeve kreeg. Geeft null (open) of { eis, titel, nu, tekst }.
export function rangSlot({ niveau = 1, hoeve = false } = {}, soort, id) {
  if (!hoeve) return null;
  const eis = rangEis(soort, id);
  if (niveau >= eis) return null;
  const titel = rangTitel(eis), nu = rangTitel(niveau);
  return { eis, titel, nu, tekst: `Vanaf ${titel} (Landbouw niveau ${eis}). Je bent nu ${nu}: oogst en lever af om hoger te komen.` };
}

// Wat opent het volgende niveau? Voor een regel in het scherm: { niveau, titel, opent } of null op het hoogste niveau.
export function volgendeRang(niveau) {
  const n = Math.min(Math.max(1, niveau | 0), MAX_NIVEAU);
  if (n >= MAX_NIVEAU) return null;
  return { niveau: n + 1, titel: rangTitel(n + 1), opent: RANG_OPENT[n + 1] };
}
