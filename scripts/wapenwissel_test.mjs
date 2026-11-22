// Wapenwissel in combat.js (verfijnronde 22-11): cijfertoets op een leeg slot zegt het, een leeg wapen kiezen waarschuwt, het
// muiswiel slaat lege wapens over, het laatste stuk gooien geeft een ander wapen, een wissel klinkt, en een verkoop in het
// pandjeshuis klinkt als biljetten.
//   node scripts/wapenwissel_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const C = await import('../game/js/combat.js');
const S = await import('../game/js/shops.js');
const { sfxLinks } = await import('../game/js/latehooks.js');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack).split('\n').slice(0, 4).join(' | ')); } };

function wereld({ weapon = 'fists', ammo = {}, druk = [], wheel = 0, down = false } = {}) {
  const meldingen = [];
  const p = { x: 0, y: 0, angle: 0, inVehicle: null, swimming: false };
  const input = { mouse: { down, wheel, rightDown: false }, wasPressed: (k) => druk.includes(k), consume() {}, reset() {} };
  return { weapon, ammo, input, time: 10, paused: false, pedestrians: [], vehicles: [], audioEvents: [], bullets: [], meldingen,
    addMessage: (t2) => meldingen.push(t2), player: p, players: [p], minigameUntil: 0, camYaw: 0, money: 0, armor: 0 };
}
// combat.js houdt de afkoeltijd van wiel en vuur in de module: laat die eerst leeglopen
const rust = () => { for (let i = 0; i < 200; i++) C.updateCombat(0.05, wereld()); };
const tik = (w) => { rust(); C.updateCombat(0.016, w); };

t('een cijfertoets op een leeg slot zegt het in plaats van stil niets te doen', () => {
  const w = wereld({ druk: ['4'] });
  tik(w);
  assert.equal(w.weapon, 'fists');
  assert.deepEqual(w.meldingen, ['Niets in slot 4']);
});
t('een leeg wapen kiezen waarschuwt eenmalig en wisselt wel; een gewone wissel zegt niets', () => {
  const w = wereld({ druk: ['2'], ammo: { pistol: 0 } });
  tik(w);
  assert.equal(w.weapon, 'pistol');
  assert.equal(w.meldingen.length, 1);
  assert.match(w.meldingen[0], /leeg/);
  assert.match(w.meldingen[0], /Pang & Zo/);
  const w2 = wereld({ druk: ['2'], ammo: { pistol: 7 } });
  tik(w2);
  assert.equal(w2.weapon, 'pistol');
  assert.deepEqual(w2.meldingen, []);
});
t('het muiswiel slaat een leeg wapen over', () => {
  const w = wereld({ weapon: 'fists', ammo: { knuppel: 1, pistol: 0 }, wheel: 100 });
  tik(w);
  assert.equal(w.weapon, 'knuppel', 'eerst het slagwapen');
  const w2 = wereld({ weapon: 'knuppel', ammo: { knuppel: 1, pistol: 0 }, wheel: 100 });
  tik(w2);
  assert.equal(w2.weapon, 'fists', 'het lege pistool wordt overgeslagen en het wiel sluit rond');
  const w3 = wereld({ weapon: 'pistol', ammo: { knuppel: 1, pistol: 0 }, wheel: 100 });
  tik(w3);
  assert.notEqual(w3.weapon, 'pistol', 'vanuit een leeg wapen kom je er met het wiel uit');
});
t('het laatste stuk gooien geeft een ander wapen in de hand', () => {
  const w = wereld({ weapon: 'carbidbus', ammo: { carbidbus: 1, knuppel: 1 }, down: true });
  tik(w);
  assert.equal(w.ammo.carbidbus, 0, 'er is gegooid');
  assert.equal(w.weapon, 'knuppel');
  const w2 = wereld({ weapon: 'carbidbus', ammo: { carbidbus: 1 }, down: true });
  tik(w2);
  assert.equal(w2.weapon, 'fists');
});
t('een pistool blijft na het laatste schot in je hand (leeg maar van jou)', () => {
  const w = wereld({ weapon: 'pistol', ammo: { pistol: 1 }, down: true });
  tik(w);
  assert.equal(w.ammo.pistol, 0, 'er is geschoten');
  assert.equal(w.weapon, 'pistol');
});
t('een wissel klinkt, dezelfde keuze niet', () => {
  const gehoord = [];
  const oud = sfxLinks.uiFx;
  sfxLinks.uiFx = (naam) => { gehoord.push(naam); return true; };
  try {
    tik(wereld({ druk: ['2'], ammo: { pistol: 7 } }));
    assert.deepEqual(gehoord, ['ui_item_equip'], 'cijfertoets');
    gehoord.length = 0;
    tik(wereld({ weapon: 'pistol', druk: ['2'], ammo: { pistol: 7 } }));
    assert.deepEqual(gehoord, [], 'hetzelfde wapen kiezen klinkt niet');
    tik(wereld({ weapon: 'fists', ammo: { knuppel: 1 }, wheel: 100 }));
    assert.deepEqual(gehoord, ['ui_item_equip'], 'muiswiel');
  } finally { sfxLinks.uiFx = oud; }
});
t('pandjeshuis: elke verkoop klinkt als biljetten, ook onder de 40 euro', () => {
  const w = { money: 0, armor: 40, ammo: { bezem: 1 }, weapon: 'fists', vehicles: [], audioEvents: [], player: { x: 1, y: 2 }, addMessage() {} };
  const items = S.pandSections(w, { x: 0, y: 0 }).flatMap((s) => s.items).filter((x) => x.income > 0);
  assert.equal(items.length, 2, 'een vest en een bezem te koop');
  for (const it of items) {
    const voor = w.audioEvents.filter((e) => e.name === 'shop_sell_bills').length;
    assert.ok(it.buy());
    assert.equal(w.audioEvents.filter((e) => e.name === 'shop_sell_bills').length, voor + 1, it.id);
  }
});
console.log(`wapenwissel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
