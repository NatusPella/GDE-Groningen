// "Nieuws van het land" (epic #1095, #1103; ontwerp docs/BEZIT-21-11.md 5.8): zet de gebeurtenissen van bezitevents.js om in wat er met jouw bezit gebeurt:
// opbrengstverlies per perceel (droogte, stortbui, mieren, wespen), een machine die stilvalt, ziek vee, de Inspectiedienst Noordrand, een storing in de
// koeling, buren-kibbelen met een keuze en de trekkertrek bij een dorpsfeest. Het nieuws is een lijst van hoogstens vijf regels per speler, in
// bezit.x.news (begrensd). Puur: geen DOM, geen THREE, geen klok, geen opslag, geen Math.random (scripts/bezitnews_test.mjs).
// Alles Nederlands, altijd zomer, geen geweld; de trekkertrek is een aanbod met een beloning (de minigame zelf volgt).

import * as EV from './bezitevents.js';
import { clamp, finite } from './bezithash.js';

export const MAX_LINES = 5;
export const SANDY_DISTRICTS = ['veenkolonien', 'westerwolde', 'westerkwartier'];     // zandgrond: de droogte slaat daar harder toe
export const DISTRICT_NAME = { eemsdelta: 'Eemsdelta', veenkolonien: 'Veenkoloniën', oldambt: 'Oldambt', westerkwartier: 'Westerkwartier', hogeland: 'Hogeland', westerwolde: 'Westerwolde', lauwerskust: 'Lauwerskust', hunsingo: 'Hunsingo', overig: 'de provincie' };
export const districtName = (r) => DISTRICT_NAME[r] || 'de streek';

export const newNews = () => ({ lines: [], scene: null, goodwill: 0, last: 0, seed: '' });
export function normalizeNews(raw) {
  const n = newNews();
  if (!raw || typeof raw !== 'object') return n;
  n.lines = (Array.isArray(raw.lines) ? raw.lines : []).slice(0, MAX_LINES).filter((l) => l && typeof l.t === 'string').map((l) => ({ d: Math.round(clamp(finite(l.d, 0), 0, 1e7)), t: l.t.slice(0, 200), k: typeof l.k === 'string' ? l.k.slice(0, 12) : 'nieuws' }));
  const s = raw.scene;
  if (s && typeof s === 'object' && EV.NEIGHBOR_SCENES.some((x) => x.id === s.id)) n.scene = { id: s.id, start: Math.round(clamp(finite(s.start, 0), 0, 1e7)) };
  n.goodwill = Math.round(clamp(finite(raw.goodwill, 0), -50, 500));
  n.last = Math.round(clamp(finite(raw.last, 0), 0, 1e7));
  n.seed = typeof raw.seed === 'string' ? raw.seed.replace(/[^a-z0-9-]/g, '').slice(0, 16) : '';
  return n;
}

// De scène van een buurman met zijn tekst en keuzes (de opslag bewaart alleen id en dag).
export function sceneView(news) {
  const s = news && news.scene && EV.NEIGHBOR_SCENES.find((x) => x.id === news.scene.id);
  return s ? { id: s.id, text: s.text, start: news.scene.start, choices: s.choices.map((c) => ({ id: c.id, label: c.label, cost: c.cost })) } : null;
}
// Een keuze kiezen: { ok, cost, goodwill, text }; de aanroeper trekt het bedrag af. Zonder geld voor de keuze: { ok: false, why }.
export function chooseNeighbor(news, choiceId, money = Infinity) {
  const s = news && news.scene;
  if (!s) return { ok: false, why: 'geen-scene', text: '' };
  const r = EV.resolveNeighbor(s.id, choiceId);
  if (!r.ok) return { ok: false, why: 'onbekende-keuze', text: '' };
  if (!(money >= r.cost)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(r.cost - money), text: '' };
  news.scene = null; news.goodwill = Math.round(clamp(news.goodwill + r.goodwill, -50, 500));
  return { ok: true, cost: r.cost, goodwill: r.goodwill, text: r.text };
}

const push = (news, d, t, k) => { if (!news.lines.some((l) => l.t === t && l.d === d)) news.lines.unshift({ d, t, k }); if (news.lines.length > MAX_LINES) news.lines.length = MAX_LINES; };

// ---- opbrengstverlies van een perceel ----
// parcel: { id, kind ('w'|'a'|'b'), region }; geeft { mult (0,4..1), text } met de oorzaken in een zin. Zonder oorzaak { mult: 1, text: '' }.
const lossCache = new Map();                                            // het verlies hangt alleen van streek, soort en dag af: duizend percelen rekenen één keer
export function lossOfParcel(parcel, calDay, opts = {}) {
  const key = `${parcel.region}|${parcel.kind}|${Math.floor(calDay)}|${opts.insured ? 1 : 0}|${opts.treated ? 1 : 0}`;
  let v = lossCache.get(key);
  if (!v) {
    const p = { id: parcel.id, kind: parcel.kind, region: parcel.region, sandy: SANDY_DISTRICTS.includes(parcel.region), sown: true, treated: opts.treated };
    const r = EV.parcelLoss(p, calDay, { insured: !!opts.insured });
    v = { mult: Math.round((1 - r.loss) * 1000) / 1000, text: r.causes.map((c) => c.text).join(' '), causes: r.causes };
    if (lossCache.size > 4000) lossCache.clear();
    lossCache.set(key, v);
  }
  return v;
}

// ---- één dag ----
// ctx: { regions, seed, machines, herds, buildings, audit } (zie EV.eventsOn). Geeft wat de aanroeper moet toepassen:
// { money (som, negatief is kosten), infect: [kudde-id], breakdown: [machine-id], cooling: [{ asset, lost }], lines (de nieuwe regels van deze dag) }.
// Het nieuws (news) wordt bijgewerkt. Een gebeurtenis meldt zich alleen op zijn eerste dag (first).
export function processDay(news, cd, ctx = {}) {
  const out = { money: 0, infect: [], breakdown: [], cooling: [], lines: [] };
  const before = news.lines.length;
  const districts = (ctx.regions || []).filter((r) => r && r !== 'overig');
  const list = EV.eventsOn(cd, { ...ctx, regions: districts });
  const add = (t, k) => { push(news, cd, t, k); out.lines.push(t); };
  for (const e of list) {
    if (!e.first) continue;
    if (e.id === 'machine') { out.breakdown.push(e.asset); add(`${e.text} ${e.days > 1 ? `Het duurt ${e.days} dagen.` : 'Het is zo gemaakt.'}`, 'pech'); }
    else if (e.id === 'vee') { out.infect.push(e.asset); out.money -= e.cost || 0; add(`${e.text} De dierenarts kost €${e.cost || 0}.`, 'pech'); }
    else if (e.id === 'inspectie') { out.money += e.amount || 0; add(e.text, e.amount < 0 ? 'pech' : 'kans'); }
    else if (e.id === 'koeling') { out.cooling.push({ asset: e.asset, lost: e.lost }); add(e.text, 'pech'); }
    else if (e.id === 'buren') { news.scene = { id: e.scene, start: cd }; add(e.text, 'buren'); }
    else if (e.id === 'veiling') add(e.text, 'kans');
    else if (e.id === 'veilingdag' || e.id === 'landbouwbeurs') add(e.text, 'kans');
    else add(`${districtName(e.region)}: ${e.text}`, e.kind === 'weer' || e.kind === 'natuur' ? 'weer' : 'nieuws');
  }
  for (const r of new Set(districts)) {                                  // een dorpsfeest of kermis begint: een regel met de trekkertrek
    const f = EV.festivalOn(r, cd);
    if (f && !EV.festivalOn(r, cd - 1)) add(`${f.name} in ${districtName(r)}${f.kermis ? '' : ': de trekkertrek is begonnen'}. Je winkels draaien extra.`, 'feest');
  }
  // een scène die drie dagen blijft liggen, lost zichzelf op (de buurman gromt, niets kost iets)
  if (news.scene && cd > news.scene.start + 2) news.scene = null;
  news.last = Math.max(news.last, cd);
  out.fresh = news.lines.length !== before || out.lines.length > 0;
  return out;
}

// De trekkertrek-aanbiedingen van vandaag: per streek met een dorpsfeest of kermis, de klassen met inleg en prijzen (EV.TRACTOR_PULL). De minigame volgt nog.
export function pullOffers(regions, cd) {
  const out = [];
  for (const r of new Set((regions || []).filter((x) => x && x !== 'overig'))) {
    if (!EV.trekkertrekAvailable(r, cd)) continue;
    const f = EV.festivalOn(r, cd);
    out.push({ region: r, name: f.name, label: EV.TRACTOR_PULL.label, classes: EV.TRACTOR_PULL.classes.map((c) => ({ id: c.id, label: c.label, fee: c.fee, top: c.prizes[0] })), rules: EV.TRACTOR_PULL.rules });
  }
  return out;
}

// De staat van je zaken voor de Inspectiedienst: gemiddeld onderhoud van je panden, personeel en het aandeel verzorgde percelen.
export function auditState({ businesses = [], rows = [], hasStaff = false, dailyRevenue = 0 } = {}) {
  const q = businesses.length ? businesses.reduce((s, b) => s + finite(b.q, 100), 0) / businesses.length : 100;
  const tidy = rows.length ? 1 - rows.filter((r) => r.attention && (r.attention.includes('braak') || r.attention.includes('grond-moe'))).length / rows.length : 1;
  return { qAvg: q, staffed: hasStaff, tidyFields: tidy, dailyRevenue };
}
