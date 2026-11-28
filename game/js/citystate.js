// De stadsstand per speler (#1371, bijbel 03 2.1) en de thuisstanden die daarop meegroeien (#1372, bijbel 03 2.2): het zuivere
// datamodel (geen DOM, geen wereld, geen THREE): scripts/citystate_test.mjs loopt het in node.
//
// Regel: elke verandering wordt EERST aangekondigd (krantje, telefoon, kaartje of bord) en pas bij de volgende dagwissel of reis
// zichtbaar. Een verandering is dressing of bevolking (bord, kraam, poster, bankje, een zin), geen geometrie, en neemt nooit iets
// weg wat de speler opbouwde. De stand wordt alleen groter: aangekondigd en doorgevoerd gaan nooit terug.
//
// Opslag: veld `stad` in de save ({ v, aangekondigd: { id: dag }, doorgevoerd: { id: dag } }). Een save zonder veld, met een
// vreemd veld of met ids van een nieuwere versie leest tolerant (onbekende ids blijven staan, niets breekt): geen migratie nodig.
// Samen spelen: de stand is van de speler zelf (zoals zijn loopbaan en zijn thuis). De wereld blijft van de host; een gast krijgt
// zijn eigen aankondigingen en toont zijn verandering lokaal als herinnering (dagboek), nooit als wereldwijziging. Een gast die
// wegvalt en later aansluit houdt zijn eigen stand in zijn eigen save: geen dubbele aankondiging, want `aangekondigd` is de boekhouding.
import { STEPS } from './storyarc.js';

export const STAD_VERSIE = 1;
export const MAX_AANKONDIGING_PER_KEER = 2; // nooit een stortvloed aan berichten tegelijk; de rest volgt bij de volgende check
const MAX_IDS = 200;

// trigger: { naStap: stapId } (het verhaal is voorbij die stap) of { loopbaan: { vak, niveau } } (die rang of hoger); { alle: [...] } of { een: [...] }.
// kanaal: krant | telefoon | kaartje | bord. soort: bord | kraam | poster | bankje | bevolking | zin | thuis.
// dressing: wat de wereld laat zien als hij zichtbaar is (alleen data; de bouwer plaatst het op een vrije plek, geen pop-in in beeld).
// dagboek: de regel die de speler later terugvindt ("omdat jij ...").
export const VERANDERINGEN = [
  { id: 'bankje_flatplein', soort: 'bankje', trigger: { naStap: 'M00' }, kanaal: 'kaartje', van: 'Auke Veldkamp, de buur',
    aankondiging: 'Een kaartje onder je deur: "Het bestuur zet binnenkort een bankje op het plein bij de flat. Zodat je eens zit, jongen."',
    dressing: { prop: 'bankje', plek: 'flatplein' }, dagboek: 'Er staat een bankje bij de flat, omdat de buur vond dat je moest zitten.' },
  { id: 'poster_bakkiestunt', soort: 'poster', trigger: { naStap: 'M01' }, kanaal: 'krant', van: 'het buurtkrantje',
    aankondiging: 'In het buurtkrantje: "Bakkiestunt in Paddepoel: volgende week hangt er een poster van."',
    dressing: { prop: 'poster', plek: 'kiosk_paddepoel', tekst: 'Bakkiestunt: gezien in Paddepoel' }, dagboek: 'Er hangt een poster van de bakkiestunt, omdat jij hem uitvoerde.' },
  { id: 'bordje_formulier_7b', soort: 'bord', trigger: { naStap: 'M02' }, kanaal: 'bord', van: 'de gemeente',
    aankondiging: 'Een bord bij de pinautomaat kondigt aan: "Vanaf morgen hangt hier een mededeling. Zie formulier 7B."',
    dressing: { prop: 'bord', plek: 'pinautomaat_paddepoel', tekst: 'Vergunning verplicht, zie formulier 7B' }, dagboek: 'Bij de pinautomaat hangt een bordje over formulier 7B, sinds jij daar was.' },
  { id: 'taxi_standplaats', soort: 'bord', trigger: { loopbaan: { vak: 'taxi', niveau: 2 } }, kanaal: 'telefoon', van: 'de taxicentrale',
    aankondiging: 'Berichtje: "Je rijdt zoveel dat we je een eigen standplaats geven. Morgen staat het bord er."',
    dressing: { prop: 'bord', plek: 'taxistandplaats', tekst: 'Reserve voor Tammo' }, dagboek: 'Er is een taxistandplaats met je naam, omdat je veel hebt gereden.' },
  // De thuisstanden (2 tot 4; stand 1 is de kale flat en altijd er). De voorwaarden zijn een voorstel: het stappenmodel (fase 1) bepaalt de echte.
  { id: 'thuis_2', soort: 'thuis', trigger: { een: [{ loopbaan: { vak: 'taxi', niveau: 2 } }, { loopbaan: { vak: 'bezorg', niveau: 2 } }, { loopbaan: { vak: 'landbouw', niveau: 2 } }, { naStap: 'N4' }] },
    kanaal: 'telefoon', van: 'Beppe',
    aankondiging: 'Beppe appt: "Jonge, ik kom zaterdag met verf en een kast. Je flat is nog zo kaal."',
    dressing: { thuis: 2 }, dagboek: 'De flat is opgeknapt, omdat je je eerste mijlpaal haalde.' },
  { id: 'thuis_3', soort: 'thuis', trigger: { naStap: 'M17' }, kanaal: 'krant', van: 'het buurtkrantje',
    aankondiging: 'In de krant: "Er komt een ander huis vrij. Je mag erin, maar het eerste huisje blijft altijd van jou."',
    dressing: { thuis: 3 }, dagboek: 'Je kreeg een tweede huis, het eerste blijft bezoekbaar.' },
  { id: 'thuis_4', soort: 'thuis', trigger: { naStap: 'M29' }, kanaal: 'kaartje', van: 'Tessa',
    aankondiging: "Een kaartje: \"Ik hang de foto's op. Kom maar kijken, het is een hele muur geworden.\"",
    dressing: { thuis: 4 }, dagboek: 'De muren thuis tonen wat jullie deden.' },
];
const BY_ID = new Map(VERANDERINGEN.map((v) => [v.id, v]));
export const verandering = (id) => BY_ID.get(id) || null;

// De vier thuisstanden als propset (data; de bouwer koppelt ze aan de bestaande flat-interieurs, zie docs/VERHAAL-THUIS-21-11.md).
// Stand 2 houdt alles van stand 1 (bestaand bezit blijft staan). Stand 3 is een ander huis: het eerste blijft bezoekbaar (eerstHuisBlijft).
export const THUISSTANDEN = [
  { stand: 1, id: 'flat_kaal', naam: 'De kale flat', props: ['bed', 'tafel', 'gele_fiets', 'raam_straat'], bezoekbaar: true },
  { stand: 2, id: 'flat_opgeknapt', naam: 'De opgeknapte flat', props: ['verf_muur', 'kast', 'foto_beppe', 'erfenis_voorwerp_1'], bezoekbaar: true },
  { stand: 3, id: 'nieuw_huis', naam: 'Een groter huis', props: ['woonkamer_ruim', 'eettafel', 'foto_beppe'], bezoekbaar: true, verplicht: false, eerstHuisBlijft: true, eigenPlek: true },
  { stand: 4, id: 'thuis_verzameling', naam: 'Thuis als verzameling', props: ['fotomuur', 'briefjes', 'voorwerpenplank', 'stoel_stille_scene'], bezoekbaar: true },
];

export const emptyStad = () => ({ v: STAD_VERSIE, aangekondigd: {}, doorgevoerd: {} });

const dagGetal = (x) => (Number.isFinite(x) ? Math.max(0, Math.min(9999, Math.floor(x))) : 0);
function leesMap(m) {
  const out = {};
  if (!m || typeof m !== 'object' || Array.isArray(m)) return out;
  for (const k of Object.keys(m).slice(0, MAX_IDS)) if (k.length <= 60 && Number.isFinite(m[k])) out[k] = dagGetal(m[k]);
  return out;
}
// Tolerante lader: alles wat niet klopt wordt een lege stand; een doorgevoerde verandering is ook altijd aangekondigd.
export function readStad(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  const st = emptyStad();
  if (!d || typeof d !== 'object') return st;
  st.aangekondigd = leesMap(d.aangekondigd);
  st.doorgevoerd = leesMap(d.doorgevoerd);
  for (const id of Object.keys(st.doorgevoerd)) if (!(id in st.aangekondigd)) st.aangekondigd[id] = st.doorgevoerd[id];
  return st;
}

const stepIdx = (id) => STEPS.findIndex((s) => s.id === id);
// ctx: { stapId (de huidige verhaalstap), niveaus: { vak: niveau }, dag, moment }
export function voorwaardeKlaar(trigger, ctx) {
  if (!trigger || !ctx) return false;
  if (trigger.alle) return trigger.alle.every((t) => voorwaardeKlaar(t, ctx));
  if (trigger.een) return trigger.een.some((t) => voorwaardeKlaar(t, ctx));
  if (trigger.naStap) {
    const t = stepIdx(trigger.naStap), nu = ctx.stapId ? stepIdx(ctx.stapId) : -1;
    return t >= 0 && nu > t;
  }
  if (trigger.loopbaan) return ((ctx.niveaus && ctx.niveaus[trigger.loopbaan.vak]) || 0) >= trigger.loopbaan.niveau;
  return false;
}

// Eén check (na een stap, een loopbaanniveau, een dagwissel of een reis). Geeft de nieuwe stand (de invoer verandert niet) en wat er te melden valt:
// - `aangekondigd`: nieuw aangekondigd (id, kanaal, van, tekst); nooit in dezelfde keer ook zichtbaar;
// - `zichtbaar`: ids die nu doorgevoerd zijn: alleen bij moment 'dagwissel' (en een latere dag dan de aankondiging) of 'reis'.
export function checkStad(raw, ctx = {}) {
  const st = readStad(raw);
  const aangekondigd = [], zichtbaar = [];
  const dag = dagGetal(ctx.dag);
  for (const v of VERANDERINGEN) {
    if (v.id in st.doorgevoerd || !(v.id in st.aangekondigd)) continue;
    const kan = ctx.moment === 'reis' || (ctx.moment === 'dagwissel' && dag > st.aangekondigd[v.id]);
    if (kan) { st.doorgevoerd[v.id] = dag; zichtbaar.push(v.id); }
  }
  for (const v of VERANDERINGEN) {
    if (aangekondigd.length >= MAX_AANKONDIGING_PER_KEER) break;
    if (v.id in st.aangekondigd || !voorwaardeKlaar(v.trigger, ctx)) continue;
    st.aangekondigd[v.id] = dag;
    aangekondigd.push({ id: v.id, kanaal: v.kanaal, van: v.van, tekst: v.aankondiging });
  }
  return { state: st, aangekondigd, zichtbaar };
}

export const isZichtbaar = (raw, id) => id in readStad(raw).doorgevoerd;
// Wat de wereld nu moet tonen: de dressing van alle doorgevoerde veranderingen (thuisstanden apart via thuisStand).
export function zichtbareDressing(raw) {
  const st = readStad(raw);
  return VERANDERINGEN.filter((v) => v.id in st.doorgevoerd && v.dressing && !v.dressing.thuis).map((v) => ({ id: v.id, soort: v.soort, ...v.dressing }));
}
// De regels voor het dagboek: wat is aangekondigd en wat al te zien is, in de volgorde van de lijst.
export function stadDagboek(raw) {
  const st = readStad(raw);
  return VERANDERINGEN.filter((v) => v.id in st.aangekondigd).map((v) => ({ id: v.id, zichtbaar: v.id in st.doorgevoerd, tekst: v.dagboek, aankondiging: v.aankondiging }));
}

// De thuisstand (1 tot 4): de hoogste doorgevoerde. Nooit lager dan 1; een stand is pas bij een doorgevoerde verandering te zien.
export function thuisStand(raw) {
  const st = readStad(raw);
  let s = 1;
  for (const v of VERANDERINGEN) if (v.dressing && v.dressing.thuis && v.id in st.doorgevoerd) s = Math.max(s, v.dressing.thuis);
  return s;
}
// De props van een stand, met alles van de lagere standen erbij (bestaand bezit blijft staan). Stand 3 is een ander huis: daar tellen alleen zijn eigen props.
export function thuisProps(stand) {
  const n = Math.max(1, Math.min(4, Math.floor(stand) || 1));
  const eigen = THUISSTANDEN.find((t) => t.stand === n);
  if (eigen && eigen.eigenPlek) return [...eigen.props];
  const set = new Set();
  for (const t of THUISSTANDEN) {
    if (t.stand > n) break;
    if (t.eigenPlek) continue;
    t.props.forEach((p) => set.add(p));
  }
  return [...set];
}

// ---- de lokale stand van deze speler (zoals loopbaan.js): de save leest en schrijft via deze functies ----
let huidig = emptyStad();
export const getStadSave = () => JSON.parse(JSON.stringify(huidig));
export function loadStadSave(raw) { huidig = readStad(raw); return huidig; }
export const stadNu = () => huidig;
// Voor de speler-eigen aanroep (na een stap, een reis of een dagwissel): werkt de lokale stand bij en geeft de meldingen.
export function runStadCheck(ctx) {
  const r = checkStad(huidig, ctx);
  huidig = r.state;
  return r;
}
