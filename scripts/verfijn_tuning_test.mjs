// Verfijnronde tuning (22-11): fuzz en simulatie op de pimp-werkplaats zonder DOM. Willekeurige wijzigingen, installaties en terugdraaien
// over lange tijd: de kosten kloppen altijd met de regels, er ontstaat nooit geld uit tuning (geen inruil-exploit) en een build blijft heel.
//   node scripts/verfijn_tuning_test.mjs
import { makeState, changeField, changePart, resetToStock, quote, canInstall, sameState, tabsFor, groupsFor, tabChanges } from '../game/js/tuningdraft.js';
import { OPTIONS, fieldsFor, PALETTES, ACCENT_COLORS, lookCode, parseLook } from '../game/js/vehiclelook.js';
import { PARTS, optionsFor } from '../game/js/tuningplan.js';
import { garageLevel } from '../game/js/tuningoffer.js';
import { rng } from '../game/js/clothing.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

const sites = Array.from({ length: 12 }, (_, i) => ({ id: 'fz' + i, kind: i % 3 === 0 ? 'pomp' : 'garage' }));
const r = rng('verfijn-tuning');
const pick = (l) => l[Math.floor(r() * l.length)];

for (const kind of ['auto', 'tweewieler', 'snackwagen']) {
  const partsKind = kind === 'tweewieler' ? 'tweewieler' : 'auto';
  let inst = makeState({}, kind, partsKind);
  let money = 3000, spent = 0;
  for (let step = 0; step < 1500; step++) {
    const site = pick(sites), dayIndex = Math.floor(r() * 40);
    const ctx = { site, dayIndex, kind, partsKind };
    let st = inst;
    const edits = 1 + Math.floor(r() * 5);
    for (let e = 0; e < edits; e++) {
      const o = r();
      if (o < 0.55) {
        const f = pick(fieldsFor(kind));
        if (OPTIONS[f]) st = changeField(st, f, r() < 0.15 ? null : pick(OPTIONS[f]).id, kind);
        else if (f === 'plate') st = changeField(st, f, r() < 0.5 ? null : 'GRN-' + Math.floor(r() * 99), kind);
        else st = changeField(st, f, r() < 0.15 ? null : pick(PALETTES[f] || ACCENT_COLORS).color, kind);
      } else if (o < 0.75) {
        const p = pick(PARTS), l = optionsFor(p, partsKind);
        if (l.length) st = changePart(st, p, r() < 0.2 ? null : pick(l).id, partsKind);
      } else if (o < 0.85) st = changeField(st, 'body', pick(PALETTES.body).color, kind);
      else if (o < 0.9) st = resetToStock(st);
    }
    const q = quote(st, inst, ctx);
    ok(q.total >= 0 && Number.isFinite(q.total), 'kosten zijn nooit negatief', String(q.total));
    ok(q.total === q.lines.reduce((a, l) => a + l.price, 0) && q.changed === q.lines.length, 'totaal is de som van de regels');
    ok(q.lines.every((l) => Number.isInteger(l.price) && l.price >= 0), 'elke regel is een heel bedrag zonder min');
    const same = sameState(st, inst);
    ok(!same || q.changed === 0, 'een gelijke stand kost niets', `${q.changed} regels`);
    if (q.changed === 0) ok(!canInstall(st, inst, ctx, money).ok && canInstall(st, inst, ctx, money).reason === 'Niets veranderd', 'niets veranderd weigert');
    const chk = canInstall(st, inst, ctx, money);
    if (chk.ok) {
      ok(money >= q.total && !q.locked.length, 'installeren mag alleen met geld en zonder slot');
      money -= q.total; spent += q.total; inst = st;
      const back = quote(inst, inst, ctx);
      ok(back.changed === 0 && back.total === 0, 'na installeren is er niets meer te betalen');
    } else if (q.changed) {
      ok(q.locked.length > 0 || money < q.total, 'een geweigerde installatie heeft een reden', chk.reason);
      if (q.locked.length === 0) ok(/^Te weinig geld: je mist nog €/.test(chk.reason), 'te weinig geld noemt het tekort', chk.reason);
    }
    // de lijsten van elk tabblad blijven te tekenen
    if (step % 50 === 0) for (const tab of tabsFor(kind, partsKind)) { groupsFor(tab, st, inst, ctx, money); ok(tabChanges(tab, st, inst, kind) >= 0, 'tabbladen tellen wijzigingen'); }
    // bijverdienen: soms geld erbij, zodat de lange loop niet vastloopt
    if (money < 150) money += 500;
  }
  ok(spent > 0, `${kind}: er is echt geld uitgegeven in de simulatie`, String(spent));
  // een build (code) is heel na elke stand
  const code = lookCode(inst.look, kind);
  const back = parseLook(code, kind);
  ok(back && lookCode(back, kind) === code, `${kind}: de buildcode is een kringloop`);
}

// geen inruil-exploit: installeren en direct weer terug naar standaard levert nooit geld op (de som van alle betalingen is positief)
{
  const kind = 'auto', ctx = { site: { id: 'exploit', kind: 'garage' }, dayIndex: 3, kind, partsKind: 'auto' };
  let st = makeState({}, kind), paid = 0;
  for (const f of fieldsFor(kind).filter((x) => OPTIONS[x])) {
    for (const o of OPTIONS[f].slice(0, 4)) {
      const next = changeField(st, f, o.id, kind);
      paid += quote(next, st, ctx).total; st = next;
      const rev = changeField(st, f, null, kind);
      paid += quote(rev, st, ctx).total; st = rev;
    }
  }
  ok(paid >= 0, 'wisselen en terugdraaien verdient nooit geld', String(paid));
  ok(garageLevel(ctx.site) >= 1, 'niveau bestaat');
}

console.log(fails ? `${fails} van ${n} mislukt` : `verfijn_tuning_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
