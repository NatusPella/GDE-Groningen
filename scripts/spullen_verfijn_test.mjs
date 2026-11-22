// Verfijnronde 22-11, Spullen en wapens: leeg-badge op een wapen zonder patronen, EHBO-doos gebruik je (geen opeten),
// de keuze gaat naar de buurtegel als het laatste stuk eten op is, de HUD zegt "leeg", en de wapenwissel en terugval in combat.js.
//   node scripts/spullen_verfijn_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const S = await import('../game/js/spullen.js');
const M = await import('../game/js/spullenmodel.js');
const E = await import('../game/js/eten.js');
const HM = await import('../game/js/hudmoney.js');
const C = await import('../game/js/combat.js');
const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message).split('\n').slice(0, 3).join(' | ')); } };

function wereld(extra = {}) {
  const w = { money: 100, health: 50, armor: 0, ammo: {}, weapon: 'fists', stats: {}, vehicles: [], eten: {}, player: { character: 'tammo' }, addMessage() {}, ...extra };
  return w;
}
function paneel() {
  const lijst = { innerHTML: '' };
  const detail = { innerHTML: '', querySelector: () => null };
  return { lijst, detail, contains: () => true, querySelector: (s) => (s === '.td-list' ? lijst : s === '.td-detail' ? detail : null), querySelectorAll: () => [] };
}
const sleutels = (p) => [...p.lijst.innerHTML.matchAll(/data-spul="([^"]+)"/g)].map((m) => m[1]);

t('een wapen zonder patronen zegt Leeg op de tegel en in de naam voor de voorlezer', () => {
  assert.equal(M.badgeTekst({ leeg: true, aantal: 0 }), 'Leeg');
  assert.equal(M.badgeTekst({ leeg: false, aantal: 3 }), '×3');
  assert.equal(M.aantalZin({ leeg: true }), 'leeg');
  assert.equal(M.tegelNaam({ title: 'Pistool', leeg: true, side: 'In de hand' }), 'Pistool, leeg, In de hand');
  const w = wereld({ ammo: { pistol: 0, uzi: 30 } });
  const p = paneel();
  S.renderSpullen(p, w);
  assert.match(p.lijst.innerHTML, /data-spul="w:pistol"[^>]*aria-label="[^"]*leeg/, 'de lege pistool heet leeg');
  assert.match(p.lijst.innerHTML, />Leeg</, 'met een badge');
  assert.doesNotMatch(p.lijst.innerHTML.match(/data-spul="w:uzi".*?<\/button>/s)[0], /Leeg/, 'een volle uzi niet');
});

t('een leeg wapen in de hand nemen zegt waar nieuwe munitie is', () => {
  const w = wereld({ ammo: { pistol: 0 } });
  const p = paneel();
  S.renderSpullen(p, w);
  S.spullenFocus(p, { closest: () => ({ dataset: { spul: 'w:pistol' } }) });
  const gedaan = S.spullenEnter(p, 'w:pistol', { rerender: () => S.renderSpullen(p, w) });
  assert.ok(gedaan);
  assert.equal(w.weapon, 'pistol');
  assert.match(p.detail.innerHTML, /leeg/i);
  assert.match(p.detail.innerHTML, /Pang &amp; Zo/);
});

t('EHBO-doos: gebruiken in plaats van opeten, met een eigen melding', () => {
  assert.equal(E.etenWerkwoord('ehbo'), 'Gebruiken');
  assert.equal(E.etenWerkwoord('kroket'), 'Opeten');
  const w = wereld({ health: 40 });
  E.voegEtenToe(w, 'ehbo', 1);
  assert.match(E.eet(w, 'ehbo'), /netjes verbonden/);
  assert.equal(w.health, 85);
  E.voegEtenToe(w, 'ehbo', 1);
  w.health = 100;
  assert.match(E.eet(w, 'ehbo'), /mankeert niks/);
  assert.equal(w.eten.ehbo, 1, 'bij volle gezondheid blijft de doos liggen');
  const w2 = wereld(); E.voegEtenToe(w2, 'ehbo', 1);
  const p = paneel(); S.renderSpullen(p, w2);
  S.spullenFocus(p, { closest: () => ({ dataset: { spul: 'e:ehbo' } }) });
  assert.match(p.detail.innerHTML, /Gebruiken/);
  assert.doesNotMatch(p.detail.innerHTML, /Opeten kan overal/);
});

t('het laatste stuk eten op: de keuze gaat naar de buurtegel, niet naar de eerste tegel', () => {
  const w = wereld({ health: 50 });
  E.voegEtenToe(w, 'kroket', 1);
  E.voegEtenToe(w, 'koek', 1);
  E.voegEtenToe(w, 'krentenbol', 1);
  const p = paneel();
  S.renderSpullen(p, w);
  const k = sleutels(p);
  assert.ok(k.indexOf('e:koek') > 0 && k.indexOf('e:koek') < k.length - 1, 'koek staat midden in de lijst');
  S.spullenFocus(p, { closest: () => ({ dataset: { spul: 'e:koek' } }) });
  S.spullenEnter(p, 'e:koek', { rerender: () => S.renderSpullen(p, w) });
  const na = sleutels(p);
  assert.ok(!na.includes('e:koek'), 'de koek is op');
  const buur = k[k.indexOf('e:koek') + 1];
  assert.match(p.lijst.innerHTML, new RegExp(`data-spul="${buur.replace(/[:]/g, ':')}"[^>]*aria-current="true"`), 'de volgende tegel is gekozen: ' + buur);
  assert.notEqual(k[0], buur);
});

t('regressie: opnieuw tekenen houdt de gekozen tegel (stond: altijd terug naar de eerste)', () => {
  const w = wereld({ health: 20 });
  E.voegEtenToe(w, 'kroket', 3);
  E.voegEtenToe(w, 'koek', 1);
  const p = paneel();
  S.renderSpullen(p, w);
  S.spullenFocus(p, { closest: () => ({ dataset: { spul: 'e:kroket' } }) });
  S.spullenEnter(p, 'e:kroket', { rerender: () => S.renderSpullen(p, w) });
  assert.equal(w.eten.kroket, 2);
  assert.match(p.lijst.innerHTML, /data-spul="e:kroket"[^>]*aria-current="true"/, 'de kroket blijft gekozen na het opeten van een stuk');
  S.renderSpullen(p, w);
  assert.match(p.lijst.innerHTML, /data-spul="e:kroket"[^>]*aria-current="true"/, 'en na een gewone hertekening');
});

t('HUD: een leeg wapen zegt leeg; een volle teller en melee blijven zoals ze waren', () => {
  const geen = new Set(['knuppel']);
  assert.equal(HM.weaponAmmoText('pistol', 0, geen), 'leeg');
  assert.equal(HM.weaponAmmoText('pistol', 12, geen), '12');
  assert.equal(HM.weaponAmmoText('knuppel', 1, geen), 'slaan');
  assert.equal(HM.weaponAmmoText('fists', 0, geen), 'geen wapen');
  assert.match(lees('hud_panel.js'), /weaponAmmoText\(weaponKey, ammo, NO_COUNT\)/, 'de HUD gebruikt de pure regel');
});

// combat.js: updateCombat met een nep-wereld; het wiel slaat lege wapens over, het laatste stuk gooien geeft een ander wapen
function gevecht(weapon, ammo, wiel = 0) {
  let down = true;
  const input = { mouse: { down, wheel: wiel, rightDown: false }, wasPressed: () => false, consume() {}, reset() {} };
  const w = { ammo, weapon, time: 10, input, paused: false, pedestrians: [], vehicles: [], addMessage() {}, player: { x: 0, y: 0, angle: 0, inVehicle: null }, minigameUntil: 0, camYaw: 0 };
  return w;
}
t('hasWeapon/hasAmmo bepalen het wiel: leeg is van jou maar het wiel stopt er niet', () => {
  const w = gevecht('fists', { knuppel: 1, pistol: 0, carbidbus: 3 });
  const keys = ['fists', 'knuppel', 'pistol', 'carbidbus'];
  const M2 = C.WEAPON_KEYS;
  assert.ok(M2.includes('pistol'));
  assert.ok(C.hasWeapon(w, 'pistol') && !C.hasAmmo(w, 'pistol'));
  assert.ok(keys.every((k) => C.hasWeapon(w, k)));
  assert.match(lees('combat.js'), /wielWapens\(WEAPON_KEYS/, 'het wiel gebruikt wielWapens');
  assert.match(lees('combat.js'), /terugvalWapen\(WEAPON_KEYS/, 'het laatste stuk gooien kiest een terugvalwapen');
});

console.log(`spullen_verfijn_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
