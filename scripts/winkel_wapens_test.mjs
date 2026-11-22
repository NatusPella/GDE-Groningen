// Winkel en pandjeshuis (verfijnronde 22-11): een bijna vol magazijn kost evenredig, verkopen van het wapen in je hand of een grote
// voorraad vraagt een tweede druk, en een leeg wapen blijft van jou. Pure wereld, geen DOM.
//   node scripts/winkel_wapens_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const S = await import('../game/js/shops.js');
const L = await import('../game/js/shoplist.js');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n').slice(0, 3).join(' | ')); } };
const wereld = (o = {}) => ({ money: 1000, armor: 0, ammo: {}, weapon: 'fists', vehicles: [], addMessage() {}, ...o });
const vind = (secs, id) => secs.flatMap((s) => s.items).find((x) => x.id === id);

t('munitie bijkopen: een pak dat niet past kost een evenredig deel en zegt wat het echt toevoegt', () => {
  const w = wereld({ ammo: { pistol: 240 } });
  const it = vind(S.weaponSections(w), 'w-pistol');
  assert.match(it.desc, /\+10 patronen \(past nog\) · nu 240/);
  assert.equal(it.price, 7, '10 van 36 patronen: 25 * 10 / 36 afgerond omhoog');
  assert.equal(it.effect, '240 → 250 patronen');
  const geld = w.money;
  assert.ok(it.buy());
  assert.equal(w.ammo.pistol, 250);
  assert.equal(geld - w.money, 7, 'je betaalt het deel');
});
t('munitie bijkopen: een heel pak blijft de volle prijs; vol is vol', () => {
  const w = wereld({ ammo: { pistol: 10 } });
  const it = vind(S.weaponSections(w), 'w-pistol');
  assert.equal(it.price, 25);
  assert.match(it.desc, /\+36 patronen · nu 10/);
  const vol = vind(S.weaponSections(wereld({ ammo: { pistol: 250 } })), 'w-pistol');
  assert.equal(vol.disabled, 'Zak zit vol');
  const oud = vind(S.weaponSections(wereld({ ammo: { pistol: 999 } })), 'w-pistol');
  assert.equal(oud.disabled, 'Zak zit vol', 'een oude save boven het plafond breekt niet');
});
t('een leeg wapen blijft van jou in de winkel: patronen erbij, geen tweede wapen kopen', () => {
  const w = wereld({ ammo: { pistol: 0 } });
  const it = vind(S.weaponSections(w), 'w-pistol');
  assert.match(it.label, /erbij/);
  assert.equal(it.price, 25);
});
t('pandjeshuis: het wapen in je hand verkopen vraagt een tweede druk met een eerlijke zin', () => {
  const w = wereld({ ammo: { pistol: 20, uzi: 20 }, weapon: 'pistol' });
  const secs = S.pandSections(w, { x: 0, y: 0 });
  const hand = vind(secs, 's-pistol');
  const ander = vind(secs, 's-uzi');
  assert.ok(hand.confirmText && /verkopen\? Druk nog een keer/.test(hand.confirmText), hand.confirmText);
  assert.ok(L.needsConfirm(hand, w.money));
  assert.equal(L.bevestigRegel(hand), hand.confirmText);
  assert.ok(!ander.confirmText, 'een ander wapen verkoopt in één keer');
  assert.ok(!L.needsConfirm(ander, w.money));
});
t('pandjeshuis: een grote voorraad vraagt een tweede druk, en verkopen zet het wapen weg uit je hand', () => {
  const w = wereld({ ammo: { uzi: 150 }, weapon: 'uzi' });
  const it = vind(S.pandSections(w, { x: 0, y: 0 }), 's-uzi');
  assert.match(it.confirmText, /met 150 patronen/);
  const geld = w.money;
  it.buy();
  assert.equal(w.weapon, 'fists');
  assert.equal('uzi' in w.ammo, false);
  assert.ok(w.money > geld);
});
t('pandjeshuis: een slagwapen zonder voorraad staat niet te koop, een leeg vuurwapen wel', () => {
  const w = wereld({ ammo: { knuppel: 0, pistol: 0 } });
  const ids = S.pandSections(w, { x: 0, y: 0 }).flatMap((s) => s.items).map((x) => x.id);
  assert.ok(!ids.includes('s-knuppel'));
  assert.ok(ids.includes('s-pistol'));
});
console.log(`winkel_wapens_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
