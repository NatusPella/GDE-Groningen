// Inkomsten en uitgaven (#206): een kasboek dat naast world.money meekijkt.
// Pure regels, geen DOM en geen THREE (scripts/finance_test.mjs).
//
// Er zijn ruim tachtig plekken die world.money aanpassen; die laten we met rust.
// Eén keer per beeld vergelijkt syncLedger() het saldo met het vorige: het verschil
// is een boeking. Een plek die weet waar het geld voor was, roept vooraf
// noteMoney('Winkels') aan; zonder label wordt het "Overig". Het kasboek houdt
// per categorie de totalen bij en per dag de laatste DAYS dagen. Het gaat mee in
// het savegame als `financien` (dus via de saveslot-laag, geen eigen sleutel).

export const DAYS = 14;
const MAX_CAT = 24;

export const CATEGORIES = {
  in: ['Missies', 'Bijbaantjes', 'Verkoop', 'Gevonden', 'Overig inkomsten'],
  out: ['Winkels', 'Garage', 'Boetes', 'Reizen', 'Eten en drinken', 'Overige uitgaven'],
};
const OTHER_IN = 'Overig inkomsten';
const OTHER_OUT = 'Overige uitgaven';

let pending = null;
// De volgende boeking (dit beeld) hoort bij deze categorie.
export function noteMoney(cat) {
  pending = typeof cat === 'string' && cat ? cat.slice(0, 40) : null;
}

export function createLedger() {
  return { last: null, day: 0, hour: null, total: { in: {}, out: {} }, days: [] };
}

function today(l) {
  let d = l.days[l.days.length - 1];
  if (!d || d.day !== l.day) {
    d = { day: l.day, in: {}, out: {} };
    l.days.push(d);
    if (l.days.length > DAYS) l.days.splice(0, l.days.length - DAYS);
  }
  return d;
}

const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };

// Boek een bedrag (positief = inkomst, negatief = uitgave).
export function book(l, amount, cat) {
  if (!Number.isFinite(amount) || amount === 0) return;
  const side = amount > 0 ? 'in' : 'out';
  const name = cat || (amount > 0 ? OTHER_IN : OTHER_OUT);
  const v = Math.abs(Math.round(amount));
  if (!v) return;
  add(l.total[side], name, v);
  add(today(l)[side], name, v);
}

// Elk beeld: saldo en klokuur (0-24). De eerste aanroep (na een lading) boekt niets.
export function syncLedger(l, money, hour) {
  if (Number.isFinite(hour)) {
    const h = ((hour % 24) + 24) % 24;
    if (l.hour != null && h < l.hour - 12) l.day++;
    l.hour = h;
  }
  if (!Number.isFinite(money)) { pending = null; return; }
  if (l.last != null && money !== l.last) book(l, money - l.last, pending);
  l.last = money;
  pending = null;
}

// Na een lading of een cheat: het saldo is opeens anders, dat is geen boeking.
export function resetBalance(l, money) {
  l.last = Number.isFinite(money) ? money : null;
}

const sum = (o) => Object.values(o).reduce((s, v) => s + v, 0);
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

// Voor het menu: totalen, vandaag, de laatste 7 dagen en de grootste posten.
export function summary(l) {
  const t = today(l);
  const week = l.days.filter((d) => d.day > l.day - 7);
  const wk = (side) => week.reduce((s, d) => s + sum(d[side]), 0);
  const inTotal = sum(l.total.in), outTotal = sum(l.total.out);
  return {
    inTotal, outTotal, net: inTotal - outTotal,
    todayIn: sum(t.in), todayOut: sum(t.out),
    weekIn: wk('in'), weekOut: wk('out'),
    topIn: top(l.total.in, 3), topOut: top(l.total.out, 3),
  };
}

// --- opslag --------------------------------------------------------------------------

const cleanMap = (o) => {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  for (const [k, v] of Object.entries(o).slice(0, MAX_CAT)) if (typeof k === 'string' && Number.isFinite(v) && v > 0) out[k.slice(0, 40)] = Math.floor(v);
  return out;
};

export function ledgerSave(l) {
  return { day: l.day, total: { in: { ...l.total.in }, out: { ...l.total.out } }, days: l.days.map((d) => ({ day: d.day, in: { ...d.in }, out: { ...d.out } })) };
}

export function ledgerLoad(d) {
  const l = createLedger();
  if (!d || typeof d !== 'object') return l;
  l.day = Number.isFinite(d.day) ? Math.max(0, Math.floor(d.day)) : 0;
  l.total = { in: cleanMap(d.total && d.total.in), out: cleanMap(d.total && d.total.out) };
  if (Array.isArray(d.days)) {
    l.days = d.days.slice(-DAYS)
      .filter((x) => x && Number.isFinite(x.day))
      .map((x) => ({ day: Math.max(0, Math.floor(x.day)), in: cleanMap(x.in), out: cleanMap(x.out) }));
  }
  return l;
}

// Het kasboek van het lopende spel (savegame.js, main.js, spullen.js).
let current = createLedger();
export const getLedger = () => current;
export const getFinanceSave = () => ledgerSave(current);
export function applyFinanceSave(d, money) {
  current = ledgerLoad(d);
  resetBalance(current, money);
}
