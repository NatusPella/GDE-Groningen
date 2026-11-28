// Het model achter het overzicht van de eigen boerderij (menu-ronde 21-11, #1013): per veld één kaart met de stand in het
// woord van de speler (kaal, bewerkt, gezaaid, groeit, rijp, geoogst), het gewas, de volgende stap en een verwachting van de
// opbrengst; de machines met hun status; en de toegang tot huren en kopen van percelen. Puur: geen DOM, geen three. Het scherm
// (farmcards.js, boerderijui.js) tekent alleen wat dit geeft; test: scripts/farmmodel_test.mjs.
// Samen spelen: de boerderij is per speler (#429), dit model leest dus alleen de eigen boerderij van wie het menu opent.
import * as B from './boerderij.js';
import * as PC from './percelen.js';
import { veldStatus, veldenStatus, watNu } from './farmstatus.js';
import { SPECIES, herdsOf } from './livestock.js';

// De zes standen van de speler (een veld heeft er altijd precies één) naast de zeven van de kaart (farmstatus.js).
export const STAND = {
  kaal: { naam: 'Kaal', icoon: 'veld_braak', rang: 2 },
  geoogst: { naam: 'Geoogst', icoon: 'veld_stoppel', rang: 2 },
  bewerkt: { naam: 'Bewerkt', icoon: 'veld_geploegd', rang: 1 },
  gezaaid: { naam: 'Gezaaid', icoon: 'veld_zaailing', rang: 3 },
  groeit: { naam: 'Groeit', icoon: 'veld_groeiend', rang: 3 },
  rijp: { naam: 'Rijp', icoon: 'veld_rijp', rang: 0 },
};
export const STAND_IDS = Object.keys(STAND);
const VAN_STATUS = { braak: 'kaal', stoppel: 'geoogst', geploegd: 'bewerkt', zaailing: 'gezaaid', groeiend: 'groeit', bijna: 'groeit', rijp: 'rijp' };
export const standVan = (statusId) => VAN_STATUS[statusId] || 'kaal';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Wat het veld oplevert als het nu zijn gewas draagt tot het rijp is: dezelfde factoren als boerderij.opbrengstKg, maar zonder
// de lopende groei (de verwachting is de eindstand) en voor elk veld, niet alleen het actieve. Rond af op tientallen: het is een schatting.
export function verwachtingKg(b, id) {
  const v = B.veldStand(b, id);
  const def = PC.perceelDef(id);
  const gewasId = v.fase === 'gezaaid' ? v.gewas : B.planVoor(b, id);
  const g = B.GEWASSEN[gewasId];
  if (!g || !def) return { kg: 0, euro: 0, gewas: null };
  const gezaaid = v.fase === 'gezaaid';
  const bodem = 0.6 + 0.4 * (gezaaid ? v.bodem : 0.75);
  const zaai = 0.5 + 0.5 * (gezaaid ? v.zaai : 0.75);
  const mest = 1 + B.MEST_BONUS * (gezaaid ? v.mest : 0);
  const ha = clamp(def.ha / B.HA_REF, 0.5, 4);
  const uitput = b.bodemlog && b.bodemlog[id] ? b.bodemlog[id].u : 0;
  const kg = g.kgBasis * bodem * zaai * mest * (1 + B.CULT_BONUS * (gezaaid ? v.cult || 0 : 0)) * (1 + B.SPUIT_BONUS * (gezaaid ? v.spuit || 0 : 0)) * PC.bodemFactor(def.bodem) * ha * (1 - uitput) * (1 + B.rotatieBonus(b, id, gewasId));
  const rond = Math.max(0, Math.round(kg / 10) * 10);
  return { kg: rond, euro: Math.round(rond * g.prijsKg), gewas: gewasId, gezaaid };
}

// Eén veld als kaart: de kaartstatus uit farmstatus.js plus de stand van de speler, de verwachting en de acties die erbij horen.
export function veldKaart(b, id, schuurKg = 0) {
  const s = veldStatus(b, id);
  const v = verwachtingKg(b, id);
  const stand = standVan(s.statusId);
  return {
    id, naam: s.naam, soort: s.soort, ha: s.ha, actief: s.actief,
    stand, standNaam: STAND[stand].naam, statusId: s.statusId, icoon: STAND[stand].icoon,
    gewasNaam: s.gewasNaam || '', planNaam: s.planNaam, gewasId: s.gewas || s.plan || '', groei: s.groei, groeit: s.stadium >= 0,
    volgende: watNu(s, schuurKg), klaar: s.klaar, aandacht: s.aandacht,
    verwachting: v, rang: STAND[stand].rang,
    vruchtbaar: B.vruchtbaarheid(b, id), advies: B.bodemAdvies(b, id), bodem: PC.bodemNaam((PC.perceelDef(id) || {}).bodem),
  };
}

// De velden van jou, eerst wat rijp is, dan wat een klus vraagt, dan wat groeit. De volgorde van farmstatus.veldenStatus bepaalt dit.
export function veldKaarten(b, schuurKg = 0) {
  return veldenStatus(b).map((s) => veldKaart(b, s.id, schuurKg));
}

// Machines en werktuigen met hun status in een paar woorden: brandstof, slijtage, waar ze staan, gehuurd of gekocht.
export const BRANDSTOF_LAAG = 10;
export const SLIJTAGE_HOOG = 70;
export function machineStatus(m, def) {
  const delen = [];
  let stand = 'klaar';
  if (m.achterstand > 0) { stand = 'achterstand'; delen.push('huur achter'); }
  if (def && def.soort === 'machine' && Number.isFinite(m.brandstof) && m.brandstof < BRANDSTOF_LAAG) { if (stand === 'klaar') stand = 'brandstof'; delen.push('bijna leeg'); }
  if (Number.isFinite(m.slijtage) && m.slijtage >= SLIJTAGE_HOOG) { if (stand === 'klaar') stand = 'slijtage'; delen.push('versleten'); }
  return { stand, tekst: delen.length ? delen.join(', ') : 'klaar voor gebruik' };
}
export function machineLijst(b) {
  const mp = b.bedrijf.machinepark;
  const uit = [];
  for (const soort of ['machines', 'werktuigen']) {
    for (const m of mp[soort] || []) {
      const def = PC.MACHINE_CATALOGUS[m.type] || null;
      const naam = def ? def.naam : m.type;
      const erf = m.erf ? (PC.erfDef(m.erf) || {}).naam || '' : '';
      uit.push({ uid: m.uid, naam, soort, fp: def ? (def.soort === 'machine' ? `m:${m.type}` : `w:${def.type}`) : '', bezit: m.bezit, plek: erf || 'onderweg', ...machineStatus(m, def) });
    }
  }
  return uit;
}

// De toegang tot meer land: hoeveel percelen je hebt, hoeveel er te huur of te koop zijn en welke je het eerst zou bekijken.
export function toegang(b) {
  const mijn = new Set(Object.keys(b.bedrijf.percelen));
  const aanbod = PC.overzichtPercelen(b.bedrijf).filter((p) => !mijn.has(p.id));
  const koop = aanbod.filter((p) => p.kunKopen).length;
  const huur = aanbod.filter((p) => p.kunHuren).length;
  return { eigen: mijn.size, aanbod: aanbod.length, koop, huur, tekst: aanbod.length ? `${aanbod.length} percelen in de buurt: ${huur} te huur, ${koop} te koop` : 'Alle percelen in de buurt zijn van jou.' };
}

// De kuddes op je weilanden voor het overzicht (#1101): per kudde de soort, het aantal, of ze ziek zijn en wat ze per speldag geven (een gezonde kudde).
// Zonder bezit (een gast zonder eigen bezit, een test) is er geen lijst. Het bezit is per speler (#429).
export function dierenLijst(bezit) {
  if (!bezit || !bezit.parcels) return [];
  const herds = herdsOf(bezit);
  return Object.keys(herds).filter((id) => bezit.parcels[id] && SPECIES[herds[id].sp]).sort().map((id) => {
    const h = herds[id], sp = SPECIES[h.sp], def = PC.perceelDef(id);
    const perDag = Math.round(h.n * sp.perDag * (sp.product === 'wol' ? 100 : 1)) / (sp.product === 'wol' ? 100 : 1);
    return { id, naam: def ? def.naam : id, sp: h.sp, soort: sp.naam, n: h.n, ziek: h.sick > 0, product: sp.product, perDag, eenheid: sp.eenheid };
  });
}

// Het hele overzicht. De hoofdknop is wat nu het meest oplevert: oogsten als er een veld rijp is, anders de volgende klus
// op het eerste veld dat er een heeft, anders de percelen (meer land) of de kaart. Eén gele knop per scherm.
export function overzicht(b, bezit = null) {
  const schuurKg = (b.schuur && b.schuur.kg) || 0;
  const velden = veldKaarten(b, schuurKg);
  const rijp = velden.filter((v) => v.klaar).length;
  const eerste = velden.find((v) => v.klaar || v.aandacht) || velden[0] || null;
  const hoofd = eerste
    ? { veld: eerste.id, label: eerste.klaar ? 'Naar het rijpe veld' : eerste.aandacht ? `Naar ${eerste.naam}` : 'Zet het veld op de kaart', tekst: `${eerste.naam}: ${eerste.volgende}` }
    : null;
  const totaalKg = velden.reduce((n, v) => n + (v.groeit || v.klaar ? v.verwachting.kg : 0), 0);
  return {
    velden, rijp, hoofd, schuurKg,
    machines: machineLijst(b),
    dieren: dierenLijst(bezit),
    toegang: toegang(b),
    verwachtKg: totaalKg,
    leeg: !velden.length,
  };
}
