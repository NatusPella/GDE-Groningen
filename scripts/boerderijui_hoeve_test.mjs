// De schermen van de boer met de hoeve (#1373): de rang en de reden bij een dichte machine of perceel, de hofwinkel en de kudde in het Erf-tabblad, en dat wie de hoeve
// niet kreeg niets van dit alles ziet.   node scripts/boerderijui_hoeve_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const Live = await import('../game/js/boerderijlive.js');
const L = await import('../game/js/bezitlive.js');
const LB = await import('../game/js/loopbaanlive.js');
const Lp = await import('../game/js/loopbaan.js');
const PC = await import('../game/js/percelen.js');
const { renderBoerderijPanel } = await import('../game/js/boerderijui.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const handlers = {};
const el = { innerHTML: '', dataset: {}, addEventListener: (k, f) => { handlers[k] = f; }, querySelector: () => null, querySelectorAll: () => [] };
const msgs = [];
const world = { money: 50000, clock: 8, addMessage(x) { msgs.push(x); } };
const klik = (data) => handlers.click({ target: { closest: (sel) => (sel === '[data-pc]' && data.pc ? { dataset: data } : sel === '[data-bd]' && data.bd ? { dataset: data } : sel === '[data-bd-gewas]' && data.bdGewas ? { dataset: data } : null) } });
const reset = () => { const st = nepOpslag(); L.initBezit({ opslag: st }); Live.initBoerderij({ opslag: st }); Live.zetBoerderijVoorTest(null, st); L.zetBezitVoorTest(null, st); LB.zetProfielVoorTest(Lp.nieuwProfiel(), nepOpslag()); el.innerHTML = ''; };
const open = (bd) => { renderBoerderijPanel(el, world); klik({ bd }); };

t('zonder de hoeve ziet de speler niets van de rang, de winkel of de kudde', () => {
  reset();
  open('percelen');
  assert.doesNotMatch(el.innerHTML, /Je bent Veldhulp/); assert.doesNotMatch(el.innerHTML, /Vanaf Zaaier/);
  assert.match(el.innerHTML, /data-pc="koop" data-soort="perceel" data-id="wierdeakker"/);
  open('machines');
  assert.match(el.innerHTML, /data-mc="koop-cat" data-type="maaidorser"/); assert.doesNotMatch(el.innerHTML, /Vanaf Loonwerker/);
  open('erf');
  assert.doesNotMatch(el.innerHTML, /Hofwinkel/); assert.doesNotMatch(el.innerHTML, /Kudde van de hoeve/);
});

t('met de hoeve: de rang staat erbij en een dichte koop zegt waarom (geen kale knop)', () => {
  reset(); L.schenkHoeveCompleet();
  open('percelen');
  assert.match(el.innerHTML, /Je bent Veldhulp \(Landbouw niveau 1\)\. Volgende rang: Zaaier/);
  assert.match(el.innerHTML, /Vanaf Zaaier \(Landbouw niveau 2\)/);
  assert.doesNotMatch(el.innerHTML, /data-pc="koop" data-soort="perceel" data-id="wierdeakker"/);
  assert.match(el.innerHTML, /data-pc="slot"[^>]*disabled/);
  open('machines');
  assert.match(el.innerHTML, /Vanaf Loonwerker \(Landbouw niveau 4\)/);
  assert.match(el.innerHTML, /data-mc="koop-cat" data-type="maaidorser"[^>]*disabled/);
  assert.doesNotMatch(el.innerHTML, /data-mc="koop-cat" data-type="trekker-klein"[^>]*disabled/, 'de eerste trekker staat open');
});

t('de hofwinkel is dicht onder Trekkerrijder met de reden en open erboven; verkopen geeft een melding en geld', () => {
  reset(); L.schenkHoeveCompleet();
  open('erf');
  assert.match(el.innerHTML, /Hofwinkel Hoeve Zeldenrust/); assert.match(el.innerHTML, /vanaf Trekkerrijder/);
  LB.loopbaanTel(world, 'landbouw', { xp: Lp.XP_DREMPELS[2] + 1, n: 0 });
  PC.bergOp(Live.getBedrijf(), PC.SCHENK_ERF, 'uien', 100);
  open('erf');
  assert.match(el.innerHTML, /data-pc="hofwinkel" data-gewas="uien" data-kg="50"/);
  assert.match(el.innerHTML, /data-pc="hofwinkel" data-gewas="fruit"[^>]*disabled/);
  const voor = world.money;
  klik({ pc: 'hofwinkel', gewas: 'uien', kg: '50' });
  assert.match(el.innerHTML, /50 kg uien verkocht in de hofwinkel voor/);
  assert.ok(world.money > voor);
});

t('de kudde van de hoeve: voeren en melken als klus, een keer per dag, en de knop zegt dat het gedaan is', () => {
  reset(); L.schenkHoeveCompleet();
  open('erf');
  assert.match(el.innerHTML, /Kudde van de hoeve/); assert.match(el.innerHTML, /12 melkvee op Weide Zeldenrust/);
  assert.match(el.innerHTML, /data-pc="dierklus" data-id="zeldenrust-wei" data-klus="melken">Melken</);
  klik({ pc: 'dierklus', id: 'zeldenrust-wei', klus: 'melken' });
  assert.match(el.innerHTML, /Je molk de koeien zelf/);
  assert.match(el.innerHTML, /data-klus="melken" disabled>Melken: gedaan/);
  klik({ pc: 'dierklus', id: 'zeldenrust-wei', klus: 'melken' });
  assert.match(el.innerHTML, /Dat heb je vandaag al gedaan/);
  assert.match(el.innerHTML, /data-klus="voeren">Voeren</, 'voeren kan nog');
});

console.log(`boerderijui_hoeve_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
