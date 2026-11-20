// De stand van elk veld als één klein, puur model (#985): wat staat er, hoe ver is het, wat is de volgende klus. Eén bron voor het paneel
// (farmcards.js), de HUD-strook (farmhud.js), de kaart (perceelmap.js) en de wereld (boerderijwereld.js, farmcrops3d.js),
// zodat een veld overal hetzelfde heet en hetzelfde eruitziet. Geen DOM, geen three; test: scripts/farmstatus_test.mjs.
// Altijd zomer: de stadia lopen van zaailing tot oogstklaar, er is geen winterstand.
import * as B from './boerderij.js';
import * as PC from './percelen.js';

// De statussen van een veld, in de volgorde van de lus: braak of stoppel, geploegd, zaailing, groeiend, bijna rijp, rijp.
// icoon: betekenisnaam uit iconmap.js (Phosphor, via icons.js). patroon: wat de kaart naast de kleur tekent (kleur is nooit de enige betekenis).
export const STATUS = {
  braak: { naam: 'Braak', kort: 'braak', volgende: 'ploegen', patroon: 'leeg', stap: 0, icoon: 'veld_braak' },
  stoppel: { naam: 'Stoppel', kort: 'gemaaid', volgende: 'ploegen', patroon: 'streep', stap: 0, icoon: 'veld_stoppel' },
  geploegd: { naam: 'Geploegd', kort: 'geploegd', volgende: 'zaaien', patroon: 'golf', stap: 1, icoon: 'veld_geploegd' },
  zaailing: { naam: 'Zaailing', kort: 'net gezaaid', volgende: null, patroon: 'stip', stap: 2, icoon: 'veld_zaailing' },
  groeiend: { naam: 'Groeit', kort: 'groeit', volgende: null, patroon: 'stip', stap: 3, icoon: 'veld_groeiend' },
  bijna: { naam: 'Bijna rijp', kort: 'bijna rijp', volgende: null, patroon: 'stip', stap: 4, icoon: 'veld_bijna' },
  rijp: { naam: 'Oogstklaar', kort: 'oogstklaar', volgende: 'oogsten', patroon: 'ster', stap: 5, icoon: 'veld_rijp' },
};
export const STATUS_IDS = Object.keys(STATUS);

// De grenzen van de groeistadia (aandeel van de groeitijd): zaailing tot 1/3, groeiend tot 2/3, bijna rijp tot rijp.
export const STADIUM_GRENS = [1 / 3, 2 / 3];
export const STADIA = ['zaailing', 'groeiend', 'bijna', 'rijp'];

// Het groeistadium (0 zaailing .. 3 rijp) bij een groei van 0 tot 1.
export function stadiumVan(groei) {
  const g = Number.isFinite(groei) ? Math.max(0, Math.min(1, groei)) : 0;
  if (g >= 1) return 3;
  return g < STADIUM_GRENS[0] ? 0 : g < STADIUM_GRENS[1] ? 1 : 2;
}

// De statusid van een veldstand (b.veld of b.velden[id]) op speltijd `uren`.
export function statusIdVan(v, uren) {
  if (!v || v.fase === 'braak') return v && v.stoppel ? 'stoppel' : 'braak';
  if (v.fase === 'geploegd') return 'geploegd';
  const g = B.GEWASSEN[v.gewas];
  const groei = g && Number.isFinite(v.gezaaidOp) ? Math.max(0, Math.min(1, (uren - v.gezaaidOp) / g.groeiUren)) : 0;
  return STADIA[stadiumVan(groei)];
}

// Het volledige model van één veld voor het scherm, de kaart en de wereld.
export function veldStatus(b, id) {
  const v = B.veldStand(b, id);
  const d = PC.perceelDef(id) || { naam: id, ha: 0, soort: 'akker' };
  const g = B.GEWASSEN[v.gewas] || null;
  const groei = v.fase === 'gezaaid' && g && Number.isFinite(v.gezaaidOp) ? Math.max(0, Math.min(1, (b.uren - v.gezaaidOp) / g.groeiUren)) : 0;
  const statusId = statusIdVan(v, b.uren);
  const st = STATUS[statusId];
  const urenRest = v.fase === 'gezaaid' && g ? Math.max(0, g.groeiUren - (b.uren - v.gezaaidOp)) : 0;
  const plan = B.planVoor(b, id);
  return {
    id, naam: d.naam, soort: d.soort, ha: d.ha, actief: id === b.bedrijf.actief,
    statusId, status: st.naam, kort: st.kort, patroon: st.patroon, stap: st.stap, icoon: st.icoon,
    gewas: v.fase === 'gezaaid' ? v.gewas : (v.stoppel || null), gewasNaam: g ? g.naam : (GEWAS_NAAM(v.stoppel) || null),
    plan, planNaam: B.GEWASSEN[plan] ? B.GEWASSEN[plan].naam : '',
    groei, stadium: v.fase === 'gezaaid' ? stadiumVan(groei) : -1, urenRest,
    volgende: st.volgende, volgendeNaam: st.volgende ? B.TAKEN[st.volgende].naam : null,
    // een veld vraagt je aandacht als er nu een klus is (alles behalve groeien)
    aandacht: !!st.volgende, klaar: statusId === 'rijp',
    cult: v.cult > 0, mest: v.mest > 0, spuit: v.spuit > 0,
  };
}
const GEWAS_NAAM = (id) => (B.GEWASSEN[id] ? B.GEWASSEN[id].naam : null);

// Alle velden van jou, met de volgorde: oogstklaar eerst, dan wat een klus vraagt, dan wat groeit.
export function veldenStatus(b) {
  const rang = (s) => (s.klaar ? 0 : s.aandacht ? 1 : 2);
  return Object.keys(b.bedrijf.percelen).map((id) => veldStatus(b, id)).sort((x, y) => rang(x) - rang(y) || x.naam.localeCompare(y.naam, 'nl'));
}

// De lus als stappen voor de regelwidget (type 'stappen') en het paneel: braak/stoppel, ploegen, zaaien, groeien, oogsten, afleveren.
export const LUS = [
  { id: 'ploegen', label: 'Ploegen', icoon: 'veld_geploegd', stap: 0 },
  { id: 'zaaien', label: 'Zaaien', icoon: 'veld_zaailing', stap: 1 },
  { id: 'groeien', label: 'Groeien', icoon: 'veld_groeiend', stap: 2 },
  { id: 'oogsten', label: 'Oogsten', icoon: 'oogst', stap: 4 },
  { id: 'afleveren', label: 'Afleveren', icoon: 'tractor', stap: 5 },
];
// Hoeveel stappen van de lus zijn gedaan voor dit veld (0 braak .. 4 geoogst, nog niet afgeleverd).
export function lusKlaar(s, schuurKg = 0) {
  if (s.statusId === 'braak' || s.statusId === 'stoppel') return schuurKg > 0 ? 4 : 0;
  if (s.statusId === 'geploegd') return 1;
  if (s.klaar) return 3;
  return 2;
}

// Wat nu? Eén korte zin voor het veld (paneel, HUD en kaartvoetnoot), in de bevelsvorm.
export function watNu(s, schuurKg = 0) {
  if (schuurKg > 0 && (s.statusId === 'braak' || s.statusId === 'stoppel')) return 'Lever de oogst af';
  if (s.klaar) return 'Oogsten';
  if (s.statusId === 'braak' || s.statusId === 'stoppel') return 'Ploegen';
  if (s.statusId === 'geploegd') return 'Zaaien';
  return s.urenRest > 0 ? `Wacht nog ${Math.max(1, Math.round(s.urenRest))} speluren` : 'Wacht';
}

// De kaartstijl van een status: een naam uit INK (mapstyle.js), een lijnpatroon en een letter, zodat kleur nooit de enige betekenis is.
// Dezelfde kleurtaal als de gebieden (eigenaar, 20-11): groen is klaar en in orde (oogstklaar, met een vlag), geel is bezig met een voortgang (het gewas groeit),
// dof grijs is leeg (braak, stoppel) en room is geploegd. Kleur is nooit de enige betekenis: elke stand heeft ook een letter, een lijnpatroon en een icoon.
export const KAART_STIJL = {
  braak: { vul: 'grey', rand: 'grey', letter: 'B', dash: [6, 5] },
  stoppel: { vul: 'grey', rand: 'grey', letter: 'S', dash: [2, 4] },
  geploegd: { vul: 'cream', rand: 'cream', letter: 'P', dash: [] },
  zaailing: { vul: 'yellow', rand: 'yellow', letter: 'Z', dash: [] },
  groeiend: { vul: 'yellow', rand: 'yellow', letter: 'G', dash: [] },
  bijna: { vul: 'yellow', rand: 'yellow', letter: 'G', dash: [] },
  rijp: { vul: 'green', rand: 'greenLight', letter: 'O', dash: [] },
};

// Welke standen een groeibalk of voortgangsring krijgen (kaart, wereldmarkering): het gewas staat er (zaailing tot oogstklaar).
export const GROEI_STANDEN = ['zaailing', 'groeiend', 'bijna', 'rijp'];

// De kleur van de wereldmarkering per status (hex), dezelfde taal als de kaart.
export const WERELD_KLEUR = { braak: 0x9a9488, stoppel: 0xb8ad8e, geploegd: 0xe6dcc2, zaailing: 0xf3e07a, groeiend: 0xe8c93a, bijna: 0xd2a72c, rijp: 0x2fb36a };

// Compact voor Samen spelen: één byte per veld (statusindex 0..6 in de bovenste drie bits, gewasindex in de onderste vijf) en de groei in 1/255.
export const GEWAS_INDEX = B.GEWAS_IDS;
export function codeerVeld(s) {
  const si = Math.max(0, STATUS_IDS.indexOf(s.statusId));
  const gi = s.gewas ? Math.max(0, GEWAS_INDEX.indexOf(s.gewas)) : 0;
  return { s: si, g: gi, f: Math.round(Math.max(0, Math.min(1, s.groei)) * 255) };
}
export function decodeerVeld(c) {
  if (!c || typeof c !== 'object') return null;
  const statusId = STATUS_IDS[c.s | 0];
  if (!statusId) return null;
  return { statusId, gewas: GEWAS_INDEX[c.g | 0] || null, groei: Math.max(0, Math.min(1, (Number(c.f) || 0) / 255)) };
}

// De plekken van je machines in de wereld voor de kaart: boerderijwereld.js meldt de bron aan (geen import van de wereld hier: geen kring).
let machineBron = null;
export function zetMachinePlekken(fn) { machineBron = typeof fn === 'function' ? fn : null; }
export function machinePlekken() { try { return machineBron ? machineBron() || [] : []; } catch (e) { return []; } }
// De afnemers (waar je de oogst aflevert) voor de kaart: ook voordat je de aanhanger laadt zie je waar je heen moet (#1005). Zelfde bron-patroon als de machines.
let afnemerBron = null;
export function zetAfnemerPlekken(fn) { afnemerBron = typeof fn === 'function' ? fn : null; }
export function afnemerPlekken() { try { return afnemerBron ? afnemerBron() || [] : []; } catch (e) { return []; } }
