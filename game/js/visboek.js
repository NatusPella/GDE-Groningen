// Het visboek van de speler (#412): welke soorten hij ving, hoe zwaar de zwaarste was, waar en op welk watertype. Pure regels,
// geen DOM, geen opslag en geen klok: visboeklive.js bewaart het in de eigen opslag (gde-visboek-v1, los van elke savegame, per
// speler ook bij samen spelen), visboekui.js tekent het scherm (scripts/vis_test.mjs). Een kapot of oud boek geeft een geldig boek.
import { SOORT_IDS, WATERTYPE_IDS, soort, typenVan, soortenVan } from './visdata.js';

export const BOEK_VERSIE = 1;
const MAX_PLEKKEN = 200;
const MAX_N = 1e7;
const MAX_KG = 1000;

export const nieuwBoek = () => ({ v: BOEK_VERSIE, soorten: {}, plekken: [], types: {}, totaal: { n: 0, kg: 0 } });

const geheel = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);
const kilo = (x) => (Number.isFinite(x) ? Math.max(0, Math.min(MAX_KG, Math.round(x * 100) / 100)) : 0);

export function normaliseer(raw) {
  const b = nieuwBoek();
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  if (!d || typeof d !== 'object' || d.v !== BOEK_VERSIE) return b;
  if (d.soorten && typeof d.soorten === 'object') {
    for (const id of SOORT_IDS) {
      const s = d.soorten[id];
      if (!s || typeof s !== 'object') continue;
      const n = geheel(s.n, MAX_N);
      if (n <= 0) continue;
      b.soorten[id] = {
        n, kg: kilo(s.kg),
        typen: Array.isArray(s.typen) ? [...new Set(s.typen.filter((t) => WATERTYPE_IDS.includes(t)))] : [],
        eerste: WATERTYPE_IDS.includes(s.eerste) ? s.eerste : null,
      };
    }
  }
  if (Array.isArray(d.plekken)) b.plekken = [...new Set(d.plekken.filter((x) => typeof x === 'string' && x && x.length <= 80))].slice(0, MAX_PLEKKEN);
  if (d.types && typeof d.types === 'object') for (const t of WATERTYPE_IDS) if (d.types[t] > 0) b.types[t] = geheel(d.types[t], MAX_N);
  if (d.totaal && typeof d.totaal === 'object') { b.totaal.n = geheel(d.totaal.n, MAX_N); b.totaal.kg = kilo(d.totaal.kg); }
  // het totaal klopt nooit minder dan de soorten zelf
  const som = Object.values(b.soorten).reduce((t, s) => t + s.n, 0);
  if (b.totaal.n < som) b.totaal.n = som;
  return b;
}

// Twee boeken samenvoegen (een tweede tabblad schreef ook): per soort het grootste.
export function voegSamen(a, b) {
  const p = normaliseer(a), o = normaliseer(b);
  for (const [id, y] of Object.entries(o.soorten)) {
    const x = p.soorten[id];
    if (!x) { p.soorten[id] = { ...y, typen: y.typen.slice() }; continue; }
    x.n = Math.max(x.n, y.n);
    x.kg = Math.max(x.kg, y.kg);
    for (const t of y.typen) if (!x.typen.includes(t)) x.typen.push(t);
    if (!x.eerste) x.eerste = y.eerste;
  }
  for (const pl of o.plekken) if (!p.plekken.includes(pl) && p.plekken.length < MAX_PLEKKEN) p.plekken.push(pl);
  for (const t of WATERTYPE_IDS) if (o.types[t] > (p.types[t] || 0)) p.types[t] = o.types[t];
  p.totaal.n = Math.max(p.totaal.n, o.totaal.n);
  p.totaal.kg = Math.max(p.totaal.kg, o.totaal.kg);
  return p;
}

// Hoeveel soorten er gevangen zijn, in totaal en per watertype.
export function voortgang(boek) {
  const gevangen = SOORT_IDS.filter((id) => boek.soorten[id]).length;
  const perType = {};
  for (const t of WATERTYPE_IDS) {
    const lijst = soortenVan(t);
    perType[t] = { gevangen: lijst.filter((x) => boek.soorten[x.id] && boek.soorten[x.id].typen.includes(t)).length, totaal: lijst.length };
  }
  return { gevangen, totaal: SOORT_IDS.length, perType, plekken: boek.plekken.length };
}
export const typeCompleet = (boek, t) => { const p = voortgang(boek).perType[t]; return !!p && p.totaal > 0 && p.gevangen >= p.totaal; };
export const alleSoorten = (boek) => SOORT_IDS.every((id) => boek.soorten[id]);

// Noteer een vangst: soort, gewicht, de plek (een korte sleutel als "meer:Zuidlaardermeer") en het watertype. Geeft terug wat
// er nieuw aan was, voor de melding en de prestaties: nieuweSoort, nieuwePlek, nieuwRecord (zwaarder dan ooit) en of er nu een
// watertype of het hele boek compleet is.
export function noteerVangst(boek, id, kg, plek, type) {
  const s = soort(id);
  if (!s || !WATERTYPE_IDS.includes(type)) return null;
  const gewicht = kilo(kg);
  const was = boek.soorten[id];
  const r = { soort: id, nieuweSoort: !was, nieuwePlek: false, nieuwRecord: false, nieuwTypeBijSoort: false, typeCompleet: null, alles: false };
  const x = was || (boek.soorten[id] = { n: 0, kg: 0, typen: [], eerste: type });
  x.n = Math.min(MAX_N, x.n + 1);
  if (gewicht > x.kg) { r.nieuwRecord = !!was; x.kg = gewicht; }
  if (!x.typen.includes(type)) { x.typen.push(type); r.nieuwTypeBijSoort = !!was; }
  if (typeof plek === 'string' && plek && plek.length <= 80 && !boek.plekken.includes(plek)) {
    if (boek.plekken.length < MAX_PLEKKEN) boek.plekken.push(plek);
    r.nieuwePlek = true;
  }
  boek.types[type] = Math.min(MAX_N, (boek.types[type] || 0) + 1);
  boek.totaal.n = Math.min(MAX_N, boek.totaal.n + 1);
  boek.totaal.kg = Math.min(MAX_N, Math.round((boek.totaal.kg + gewicht) * 100) / 100);
  if (r.nieuweSoort || r.nieuwTypeBijSoort) {
    // alleen een nieuwe soort of een nieuw water voor die soort kan een watertype compleet maken
    if (typenVan(id).includes(type) && typeCompleet(boek, type)) r.typeCompleet = type;
  }
  if (r.nieuweSoort && alleSoorten(boek)) r.alles = true;
  return r;
}

// De soorten die in dit watertype nog ontbreken (voor de aanwijzing in het scherm).
export const ontbrekend = (boek, type) => soortenVan(type).filter((x) => !(boek.soorten[x.id] && boek.soorten[x.id].typen.includes(type))).map((x) => x.id);
