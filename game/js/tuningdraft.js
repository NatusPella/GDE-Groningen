// Het model achter de pimp-werkplaats (epic Autotuning, #1155): een concept (draft) van de build, de kosten,
// wat hier te koop is en de lijsten per tabblad. Pure functies, Node-safe en zonder DOM of THREE, zodat
// tuningworkshopui.js alleen nog hoeft te tekenen en alles hier getest kan worden.
//
// Een stand heeft altijd dezelfde vorm: { look, parts, body } met
//   look  de uiterlijk-tuning (vehiclelook.js),
//   parts de onderdelen met prestatie-effect (tuningplan.js: { banden: 'b-race', ophanging: 'h-sport', ... }),
//   body  de carrosseriekleur ('#rrggbb', de lak van Spuit & Klaar).
// De 'installed'-stand is wat er nu op de auto zit; het concept begint als kopie en wijzigt tot de speler kiest.
import {
  OPTIONS, FIELD_LABELS, PALETTES, ACCENT_COLORS, CATEGORIES, categoriesFor, fieldsFor, sanitizeLook, withField, parseLook, lookCode,
  fieldPrice, cleanColor, cleanPlate, defaultOf, optionOf, looksEqual, isStock, flashiness,
} from './vehiclelook.js';
import { PARTS, PART_LABELS, optionsFor, optionById, withOption, withoutPart, sanitizeTuning, installPrice, tuningEffects } from './tuningplan.js';
import { offerPrice, offerState, orderedOptions, garageLevel } from './tuningoffer.js';

export const DEFAULT_PAINT_PRICE = 60;

export const makeState = ({ look = {}, parts = {}, body = null } = {}, kind = 'auto', partsKind = 'auto') => ({
  look: sanitizeLook(look, kind), parts: sanitizeTuning(parts, partsKind), body: cleanColor(body),
});
export const sameState = (a, b) => looksEqual(a.look, b.look) && JSON.stringify(a.parts) === JSON.stringify(b.parts) && (a.body || null) === (b.body || null);

// --- bewerken ---------------------------------------------------------------------------------------
// Alles geeft een nieuwe stand terug; een niet-passende keuze geeft dezelfde stand terug.
export function changeField(st, field, value, kind) {
  if (field === 'body') { const c = cleanColor(value); return c ? { ...st, body: c } : st; }
  const look = withField(st.look, field, value, kind);
  return look ? { ...st, look } : st;
}
export function changePart(st, part, optionId, partsKind) {
  if (optionId == null) return { ...st, parts: withoutPart(st.parts, part) };
  const o = optionById(optionId);
  if (!o || o.part !== part) return st;
  const parts = withOption(st.parts, optionId, partsKind);
  return parts ? { ...st, parts } : st;
}
export const applyBuild = (st, code, kind) => { const l = parseLook(code, kind); return l ? { ...st, look: l } : st; };
export const resetToStock = (st) => ({ ...st, look: {}, parts: {} });

// --- kosten --------------------------------------------------------------------------------------------
// ctx: { site, dayIndex, kind, partsKind, paintPrice }. Elke regel: { id, label, price, deal, locked? }.
export function quote(st, inst, ctx = {}) {
  const kind = ctx.kind || 'auto', partsKind = ctx.partsKind || (kind === 'tweewieler' ? 'tweewieler' : 'auto');
  const lines = [];
  const labelOf = (f, v) => (OPTIONS[f] ? (optionOf(f, String(v)) || { label: String(v) }).label : ((PALETTES[f] || ACCENT_COLORS).find((c) => c.color === v) || { label: f === 'plate' ? String(v) : 'eigen kleur' }).label);
  for (const f of fieldsFor(kind)) {
    const nu = st.look[f] ?? null, oud = inst.look[f] ?? null;
    if (nu === oud) continue;
    const full = nu == null ? 0 : offerPrice(ctx.site, ctx.dayIndex, kind, f, nu).price;
    const trade = oud == null ? 0 : Math.floor(fieldPrice(f, oud) / 2);
    const price = nu == null ? 0 : Math.max(0, full - trade);
    const stat = nu != null && OPTIONS[f] ? offerState(ctx.site, f, nu) : { ok: true };
    lines.push({ id: f, label: nu == null ? `${FIELD_LABELS[f]}: terug naar standaard` : `${FIELD_LABELS[f]}: ${labelOf(f, nu)}`, price, deal: nu != null && offerPrice(ctx.site, ctx.dayIndex, kind, f, nu).deal, locked: stat.ok ? '' : stat.reason });
  }
  for (const part of PARTS) {
    const nu = st.parts[part] || null, oud = inst.parts[part] || null;
    if (nu === oud) continue;
    const o = nu && optionById(nu);
    lines.push({ id: 'part:' + part, label: nu ? `${PART_LABELS[part]}: ${o.label}` : `${PART_LABELS[part]}: eraf`, price: nu ? installPrice(inst.parts, nu) ?? 0 : 0, deal: false, locked: '' });
  }
  if ((st.body || null) !== (inst.body || null) && st.body) lines.push({ id: 'body', label: 'Nieuwe lak', price: ctx.paintPrice ?? DEFAULT_PAINT_PRICE, deal: false, locked: '' });
  const total = lines.reduce((s, l) => s + l.price, 0);
  return { lines, total, changed: lines.length, locked: lines.filter((l) => l.locked) };
}

export function canInstall(st, inst, ctx, money) {
  const q = quote(st, inst, ctx);
  if (!q.changed) return { ok: false, reason: 'Niets veranderd', quote: q };
  if (q.locked.length) return { ok: false, reason: q.locked[0].locked, quote: q };
  if (money < q.total) return { ok: false, reason: 'Te weinig geld', quote: q };
  return { ok: true, reason: '', quote: q };
}

// --- de tabbladen en wat erin staat ------------------------------------------------------------------
export function tabsFor(kind, partsKind = 'auto') {
  const tabs = categoriesFor(kind).map((c) => ({ id: c.id, label: c.label, fields: c.fields }));
  if (PARTS.some((p) => optionsFor(p, partsKind).length)) tabs.push({ id: 'onderdelen', label: 'Onderdelen', fields: [] });
  tabs.push({ id: 'builds', label: 'Builds', fields: [] });
  return tabs;
}
// Hoeveel wijzigingen er in een tabblad zitten (voor het bolletje op het tabblad).
export function tabChanges(tab, st, inst, kind) {
  if (tab.id === 'builds') return 0;
  if (tab.id === 'onderdelen') return PARTS.filter((p) => (st.parts[p] || null) !== (inst.parts[p] || null)).length;
  let n = tab.fields.filter((f) => (st.look[f] ?? null) !== (inst.look[f] ?? null)).length;
  if (tab.id === 'lak' && (st.body || null) !== (inst.body || null)) n++;
  return n;
}

// De groepen van een tabblad: per veld de opties met hun stand, prijs en eventuele reden dat het niet kan.
export function groupsFor(tab, st, inst, ctx = {}, money = Infinity) {
  const kind = ctx.kind || 'auto', partsKind = ctx.partsKind || 'auto';
  if (tab.id === 'onderdelen') {
    return PARTS.filter((p) => optionsFor(p, partsKind).length).map((part) => ({
      field: part, label: PART_LABELS[part], type: 'part', value: st.parts[part] || null,
      options: [{ id: null, label: 'Standaard', price: 0, state: !st.parts[part] ? 'on' : '', desc: '' }, ...optionsFor(part, partsKind).map((o) => {
        const price = installPrice(inst.parts, o.id);
        return { id: o.id, label: o.label, desc: o.desc, price: price ?? 0, state: st.parts[part] === o.id ? 'on' : '', installed: inst.parts[part] === o.id, effects: o.fx };
      })],
    }));
  }
  const groups = [];
  const fields = tab.id === 'lak' ? ['body', ...tab.fields] : tab.fields;
  for (const f of fields) {
    if (f === 'body') { groups.push({ field: 'body', label: 'Carrosseriekleur', type: 'color', value: st.body, installed: inst.body, palette: PALETTES.body.map((c) => ({ ...c, state: st.body === c.color ? 'on' : '' })), price: ctx.paintPrice ?? DEFAULT_PAINT_PRICE, noneLabel: null }); continue; }
    const value = st.look[f] ?? null, was = inst.look[f] ?? null;
    if (f === 'plate') { groups.push({ field: f, label: FIELD_LABELS[f], type: 'text', value, installed: was, price: fieldPrice(f, 'x'), max: 8 }); continue; }
    if (OPTIONS[f]) {
      groups.push({
        field: f, label: FIELD_LABELS[f], type: 'enum', value: value ?? defaultOf(f),
        options: orderedOptions(ctx.site, f).map((o) => {
          const isDefault = o.id === defaultOf(f);
          const offer = isDefault ? { price: 0, deal: false } : offerPrice(ctx.site, ctx.dayIndex, kind, f, o.id);
          const st2 = offerState(ctx.site, f, o.id);
          const on = isDefault ? value == null : value === o.id;
          return { id: o.id, label: o.label, desc: o.desc, price: offer.price, base: offer.base, deal: offer.deal, state: on ? 'on' : '', installed: isDefault ? was == null : was === o.id, locked: st2.ok ? '' : st2.reason, tooExpensive: !st2.ok ? false : offer.price > money };
        }),
      });
    } else {
      const pal = PALETTES[f] || ACCENT_COLORS;
      groups.push({ field: f, label: FIELD_LABELS[f], type: 'color', value, installed: was, price: fieldPrice(f, '#000000'), palette: pal.map((c) => ({ ...c, state: value === c.color ? 'on' : '' })), noneLabel: 'Geen' });
    }
  }
  return groups;
}

// Wat het concept met de eigenschappen doet: voor en na, voor de balkjes in de UI (alleen dingen die echt veranderen).
const FX_ROWS = [
  { key: 'grip', label: 'Grip', unit: '%', note: 'op nat wegdek' },
  { key: 'draai', label: 'Bochten', unit: '%', note: 'hoe scherp je kunt sturen' },
  { key: 'comfort', label: 'Comfort', unit: '%', note: 'hoe zacht het rijdt' },
  { key: 'zicht', label: 'Zicht', unit: '%', note: "'s nachts" },
  { key: 'geluid', label: 'Geluid', unit: '%', note: 'van de uitlaat' },
  { key: 'opvallend', label: 'Opvallend', unit: 'pt', note: 'hoe graag de politie kijkt' },
];
export function effectRows(partsBefore, partsAfter) {
  const a = tuningEffects(partsBefore), b = tuningEffects(partsAfter);
  return FX_ROWS.map((r) => {
    const before = r.key === 'opvallend' ? Math.round(a[r.key] * 100) : Math.round(a[r.key] * 100), after = Math.round(b[r.key] * 100);
    return { ...r, before, after, delta: after - before };
  });
}
export const changedEffectRows = (a, b) => effectRows(a, b).filter((r) => r.delta !== 0);

// Hoe opvallend de stand is voor de chip (uiterlijk 0..1).
export const showiness = (st) => flashiness(st.look);

// Een korte regel voor de samenvatting: "3 wijzigingen, 245 euro".
export function summaryText(q) {
  if (!q.changed) return 'Niets veranderd';
  return `${q.changed} ${q.changed === 1 ? 'wijziging' : 'wijzigingen'}`;
}

// Stand van de garage voor de kop: "Niveau 2 van 3".
export const levelText = (site) => `Niveau ${garageLevel(site)} van 3`;

// De code van het concept (voor builds en Samen spelen).
export const stateCode = (st, kind) => lookCode(st.look, kind);
export { isStock, cleanPlate };
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
