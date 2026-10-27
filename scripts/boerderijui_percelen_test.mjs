// Het scherm Percelen en Erf (boerderijui.js) zonder DOM: een nep-element vangt de HTML en de klikken op.   node scripts/boerderijui_percelen_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const Live = await import('../game/js/boerderijlive.js');
const PC = await import('../game/js/percelen.js');
const { renderBoerderijPanel } = await import('../game/js/boerderijui.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

Live.zetBoerderijVoorTest(null, nepOpslag());
const handlers = {};
const el = { innerHTML: '', dataset: {}, addEventListener: (k, f) => { handlers[k] = f; }, querySelector: () => null, querySelectorAll: () => [] };
const world = { money: 50000, clock: 8, addMessage() {} };
// een klik op een knop met deze data-attributen
const klik = (data) => handlers.click({ target: { closest: (sel) => (sel === '[data-pc]' && data.pc ? { dataset: data } : sel === '[data-bd]' && data.bd ? { dataset: data } : sel === '[data-bd-gewas]' && data.bdGewas ? { dataset: data } : null) } });

t('de onderdelen Percelen en Erf staan in het menu', () => {
  renderBoerderijPanel(el, world);
  assert.match(el.innerHTML, /data-bd="percelen"/);
  assert.match(el.innerHTML, /data-bd="erf"/);
});

t('Percelen toont het aanbod met kopen, huren en kaart', () => {
  klik({ bd: 'percelen' });
  assert.match(el.innerHTML, /Wierdeakker/);
  assert.match(el.innerHTML, /data-pc="koop" data-soort="perceel" data-id="wierdeakker"/);
  assert.match(el.innerHTML, /data-pc="huur-week" data-soort="perceel" data-id="dijkweide"/);
  assert.match(el.innerHTML, /data-pc="kaart"/);
  assert.match(el.innerHTML, /huur €0 per speldag/);
});

t('kopen en huren via het scherm: geld, melding en knoppen veranderen', () => {
  klik({ pc: 'koop', soort: 'perceel', id: 'wierdeakker' });
  assert.match(el.innerHTML, /Wierdeakker gekocht voor/);
  assert.match(el.innerHTML, /data-pc="verkoop" data-soort="perceel" data-id="wierdeakker"/);
  assert.ok(world.money < 50000);
  klik({ pc: 'huur-dag', soort: 'perceel', id: 'dijkweide' });
  assert.match(el.innerHTML, /Dijkweide gehuurd/);
  assert.match(el.innerHTML, /data-pc="zegop" data-soort="perceel" data-id="dijkweide"/);
  assert.match(el.innerHTML, /huur €\d+ per speldag/);
  klik({ pc: 'zegop', soort: 'perceel', id: 'dijkweide' });
  assert.match(el.innerHTML, /opgezegd/);
});

t('Erf: thuis kiezen en opslag van de oogst', () => {
  klik({ pc: 'koop', soort: 'erf', id: 'kleiplaats' });
  klik({ bd: 'erf' });
  klik({ pc: 'thuis', soort: 'erf', id: 'kleiplaats' });
  assert.match(el.innerHTML, /Je thuis is Kleiplaats/);
  Live.getBoerderij().schuur = { gewas: 'aardappelen', kg: 900, kwaliteit: 1 };
  klik({ bd: 'erf' });
  assert.match(el.innerHTML, /data-pc="inschuur"/);
  klik({ pc: 'inschuur' });
  assert.match(el.innerHTML, /900 kg opgeslagen/);
  assert.match(el.innerHTML, /data-pc="uitschuur" data-id="kleiplaats" data-gewas="aardappelen"/);
});

t('te weinig geld: de knop is uit en de reden komt als melding', () => {
  world.money = 10;
  klik({ bd: 'percelen' });
  assert.match(el.innerHTML, /data-pc="koop" data-soort="perceel" data-id="bedumer-klei" disabled/);
  klik({ pc: 'koop', soort: 'perceel', id: 'bedumer-klei' });
  assert.match(el.innerHTML, /Je hebt €\d+ nodig/);
  assert.ok(PC.PERCEEL_IDS.length > 5);
});

t('Gewas: per perceel een eigen teeltplan; wisselen laat het plan van het ander staan (#492)', () => {
  world.money = 50000;
  klik({ bd: 'percelen' });
  klik({ pc: 'actief', soort: 'perceel', id: 'wierdeakker' });
  klik({ bd: 'gewas' });
  assert.match(el.innerHTML, /data-bd-gewas="uien"/, 'het vijfde gewas staat in de lijst');
  assert.match(el.innerHTML, /Wierdeakker<\/b> · werkt hier<span class="mut"> · plan: Aardappelen · /);
  klik({ bdGewas: 'uien' });
  assert.match(el.innerHTML, /data-bd-gewas="uien"[^>]*aria-pressed="true">Gekozen</);
  assert.match(el.innerHTML, /Wierdeakker<\/b> · werkt hier<span class="mut"> · plan: Uien · €0,16 per kg vandaag/);
  // naar de Zonnehoek: die houdt zijn eigen plan
  klik({ pc: 'actief', soort: 'perceel', id: PC.START_PERCEEL });
  klik({ bd: 'gewas' });
  klik({ bdGewas: 'bieten' });
  assert.match(el.innerHTML, /Akker De Zonnehoek<\/b> · werkt hier<span class="mut"> · plan: Suikerbieten/);
  // terug naar de Wierdeakker: het plan van dat perceel staat er nog
  klik({ pc: 'actief', soort: 'perceel', id: 'wierdeakker' });
  klik({ bd: 'gewas' });
  assert.match(el.innerHTML, /plan: Uien/);
  assert.match(el.innerHTML, /data-bd-gewas="uien"[^>]*aria-pressed="true">Gekozen</);
});

console.log(`boerderijui_percelen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
