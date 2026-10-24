// De schermen Machines, Perceel (loonwerker), Kasboek en Bank van het onderdeel Boerderij (boerderijui.js, #415 stap 2) zonder DOM.   node scripts/boerderijui_machines_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const Live = await import('../game/js/boerderijlive.js');
const PC = await import('../game/js/percelen.js');
const B = await import('../game/js/boerderij.js');
const { renderBoerderijPanel } = await import('../game/js/boerderijui.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

Live.zetBoerderijVoorTest(null, nepOpslag());
const handlers = {};
const el = { innerHTML: '', dataset: {}, addEventListener: (k, f) => { handlers[k] = f; }, querySelector: () => null, querySelectorAll: () => [] };
const world = { money: 100000, clock: 8, addMessage() {} };
const klik = (data) => handlers.click({ target: { closest: (sel) => { const k = sel.replace(/^\[data-/, '').replace(/\]$/, ''); const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); return camel in data ? { dataset: data } : null; } } });

t('Machines toont het machinepark, de catalogus met kopen en huren, en de machines voor de bijbaan', () => {
  renderBoerderijPanel(el, world);
  assert.match(el.innerHTML, /data-bd="machines"/); assert.match(el.innerHTML, /data-bd="bank"/);
  klik({ bd: 'machines' });
  assert.match(el.innerHTML, /Wierdetrekker W60/); assert.match(el.innerHTML, /Korenwolf M3/); assert.match(el.innerHTML, /Laadkabouter L45/);
  assert.match(el.innerHTML, /data-mc="koop-cat" data-type="trekker-klein"/); assert.match(el.innerHTML, /data-mc="huur-cat" data-type="ploeg-3"/);
  assert.match(el.innerHTML, /Voor het loonwerk van de bijbaan/); assert.match(el.innerHTML, /data-bd-koop="ploeg"/);
  assert.match(el.innerHTML, /nog 10 plekken vrij/);
  assert.match(el.innerHTML, /E koppelt/); assert.match(el.innerHTML, /G zet de aftakas/);
  assert.ok(!/Balenpers/.test(el.innerHTML), 'wat nog geen gedrag heeft staat niet te koop');
});

t('kopen en huren: geld, plek, melding en de rij in het machinepark; verkopen en terugbrengen', () => {
  klik({ mc: 'koop-cat', type: 'trekker-klein' });
  assert.match(el.innerHTML, /Wierdetrekker W60 gekocht voor €9\.000/);
  assert.equal(world.money, 91000);
  assert.match(el.innerHTML, /diesel 100% · goed \(slijtage 0%\) · van jou · op Boerderij De Zonnehoek/);
  klik({ mc: 'huur-cat', type: 'ploeg-3' });
  assert.match(el.innerHTML, /gehuurd, €20 per dag/);
  assert.equal(world.money, 90980);
  const bd = Live.getBedrijf();
  assert.equal(bd.machinepark.machines.length, 1); assert.equal(bd.machinepark.werktuigen.length, 1);
  const uid = bd.machinepark.werktuigen[0].uid;
  klik({ mc: 'terug', uid });
  assert.match(el.innerHTML, /teruggebracht/); assert.equal(bd.machinepark.werktuigen.length, 0);
  const tr = bd.machinepark.machines[0];
  tr.slijtage = 50;
  klik({ bd: 'machines' });
  assert.match(el.innerHTML, /data-mc="onderhoud"/);
  const geld = world.money;
  klik({ mc: 'onderhoud', uid: tr.uid });
  assert.match(el.innerHTML, /Onderhoudsbeurt klaar/); assert.ok(world.money < geld); assert.equal(tr.slijtage, 0);
  klik({ mc: 'verkoop', uid: tr.uid });
  assert.match(el.innerHTML, /verkocht voor/); assert.equal(bd.machinepark.machines.length, 0);
  world.money = 10;
  klik({ mc: 'koop-cat', type: 'maaidorser' });
  assert.match(el.innerHTML, /Je hebt €38000 nodig/);
});

t('de loonwerker bij Perceel: knoppen met de prijs, de klus wordt gedaan, een lege schuur heeft geen aflever-knop', () => {
  world.money = 5000;
  klik({ bd: 'perceel' });
  assert.match(el.innerHTML, /Loonwerker/); assert.match(el.innerHTML, /Loonbedrijf De Ploegschaar/);
  assert.match(el.innerHTML, /data-mc="loon" data-taak="ploegen"/);
  assert.ok(!/data-mc="loon-lever"/.test(el.innerHTML));
  klik({ mc: 'loon', taak: 'ploegen' });
  assert.match(el.innerHTML, /ploegen gedaan \(85%\)/);
  assert.match(el.innerHTML, /data-mc="loon" data-taak="cultiveren"/); assert.match(el.innerHTML, /data-mc="loon" data-taak="zaaien"/);
  assert.match(el.innerHTML, /Je percelen/); assert.match(el.innerHTML, /Akker De Zonnehoek/);
  klik({ mc: 'loon', taak: 'zaaien' });
  assert.equal(B.fase(Live.getBoerderij()), 'groeit');
  B.tikUren(Live.getBoerderij(), 100);
  klik({ mc: 'loon', taak: 'oogsten' });
  assert.match(el.innerHTML, /data-mc="loon-lever"/);
  klik({ mc: 'loon-lever' });
  assert.match(el.innerHTML, /kg afgeleverd/);
});

t('het kasboek toont per veld en per boekjaar met posten; de bank leent en lost af en toont de schuur', () => {
  klik({ bd: 'kas' });
  assert.match(el.innerHTML, /Per veld/); assert.match(el.innerHTML, /Akker De Zonnehoek/); assert.match(el.innerHTML, /Boekjaar 1 \(loopt\)/); assert.match(el.innerHTML, /Loonwerker/);
  world.money = 1000;
  klik({ bd: 'bank' });
  assert.match(el.innerHTML, /Boerenbank Noordhoek/); assert.match(el.innerHTML, /0,08% per speldag/);
  assert.match(el.innerHTML, /data-mc="leen" data-bedrag="1000"/);
  assert.match(el.innerHTML, /data-mc="los" data-bedrag="1000" disabled/, 'geen schuld, niets af te lossen');
  klik({ mc: 'leen', bedrag: '5000' });
  assert.match(el.innerHTML, /Je leende €5\.000/); assert.equal(world.money, 6000);
  assert.match(el.innerHTML, /<span>Schuld<\/span><span>€5\.000/);
  klik({ mc: 'los', bedrag: '2000' });
  assert.match(el.innerHTML, /Je loste €2\.000 af/); assert.equal(Live.getBoerderij().boek.lening.schuld, 3000);
  klik({ mc: 'leen', bedrag: '10000' }); klik({ mc: 'leen', bedrag: '10000' }); klik({ mc: 'leen', bedrag: '10000' });
  assert.match(el.innerHTML, /Je kunt nog €/);
  world.money = 0;
  klik({ mc: 'los', bedrag: '1000' });
  assert.match(el.innerHTML, /te weinig geld/);
  renderBoerderijPanel(el, world);
  assert.match(el.innerHTML, /schuld €/);
});

t('Gewas noemt graan en gras met hun soort', () => {
  klik({ bd: 'gewas' });
  assert.match(el.innerHTML, /Graan/); assert.match(el.innerHTML, /Graanzolder Noorderveld/); assert.match(el.innerHTML, /alleen op weiland/);
  assert.match(el.innerHTML, /Op een weiland teel je gras/);
  void PC;
});

console.log(`boerderijui_machines_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
