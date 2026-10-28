// Eten in Spullen (#502): een gevangen vis belandt in de voorraad, opeten geeft gezondheid
// tot maximaal 100 (dezelfde regel als de toonbank), Enter op een kaart voert de actie uit
// en de melding staat in het detailpaneel in plaats van in de verborgen HUD.
//   node scripts/spullen_eten_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// node3d.mjs zet een nep-opslag in het geheugen neer: de spelmodules lezen op hun eerste
// vraag uit de opslag, en in Node is er geen echte.

const S = await import('../game/js/spullen.js');
const H = await import('../game/js/hengelen.js');
const D = await import('../game/js/visdata.js');

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, fn) => {
  n++;
  try { fn(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', e.message.split('\n').slice(0, 4).join(' | ')); }
};

// Een wereld met alleen wat Spullen nodig heeft, en een teller op de HUD-meldingen: die
// mogen hier juist niet gebruikt worden (het pauzemenu staat ervoor).
function wereld(health = 96) {
  const w = {
    money: 100, health, armor: 0, ammo: {}, weapon: 'fists', stats: {}, vehicles: [], eten: {},
    player: { character: 'tammo' }, meldingen: 0,
    addMessage() { w.meldingen++; },
  };
  return w;
}

// Een paneel dat genoeg doet voor renderSpullen en spullenFocus: de lijst en het detail
// bewaren hun HTML, de knoppen boven de lijst en het zoekveld zijn er niet.
function paneel() {
  const lijst = { innerHTML: '' };
  const detail = { innerHTML: '' };
  const p = {
    lijst, detail,
    contains: () => true,
    querySelector: (sel) => (sel === '.td-list' ? lijst : sel === '.td-detail' ? detail : null),
    querySelectorAll: () => [],
  };
  return p;
}

const api = (p) => ({ rerender: () => S.renderSpullen(p, apiWereld) });
let apiWereld = null;

// ------------------------------------------------------------------ de vis in de voorraad
t('een gevangen vis gaat de voorraad in, naast de bestaande uitbetaling', () => {
  const w = wereld();
  assert.equal(H.visNaarVoorraad(w, 'karper'), 1, 'de eerste karper');
  assert.equal(H.visNaarVoorraad(w, 'karper'), 2, 'en de tweede erbij');
  assert.equal(w.eten['vis:karper'], 2);
  const vis = S.eetVoorraad(w).find((e) => e.id === 'vis:karper');
  assert.ok(vis, 'de karper staat in de voorraad van Spullen');
  assert.equal(vis.label, D.soort('karper').naam, 'met de naam uit visdata.js');
  assert.ok(vis.hp > 0, 'en een gezondheid per stuk');
  // de vangst zelf roept dit aan: geen tweede, stille weg ernaast
  const bron = lees('hengelen.js');
  assert.match(bron, /visNaarVoorraad\(w, s\.id\)/, 'verwerkVangst zet de vis in de voorraad');
  assert.match(bron, /g\.kas \+= vangstWaarde/, 'de uitbetaling aan de visboer blijft staan');
});

t('de toonbank en de vissen zitten in dezelfde categorie eten, met aantallen', () => {
  const w = wereld();
  S.voegEtenToe(w, 'kroket', 2);
  S.voegEtenToe(w, 'onbekend-eten', 5);
  H.visNaarVoorraad(w, 'snoekbaars');
  const heb = S.eetVoorraad(w);
  assert.deepEqual(heb.map((e) => e.id).sort(), ['kroket', 'vis:snoekbaars'], 'alleen wat echt bestaat');
  assert.equal(heb.find((e) => e.id === 'kroket').aantal, 2, 'aantallen, geen vinkjes');
  assert.equal(S.eetWaar('kroket').how, 'Snackbar', 'de toonbank is de herkomst');
  assert.equal(S.eetWaar('vis:snoekbaars').how, 'Zelf gevangen');
});

// ------------------------------------------------------------------ opeten
t('opeten geeft gezondheid, tot maximaal 100, met de regel van de toonbank', () => {
  const w = wereld(96);
  S.voegEtenToe(w, 'kroket');
  assert.equal(S.eet(w, 'kroket'), 'Kroket: lekker! Gezondheid 100');
  assert.equal(w.health, 100, 'niet boven de 100');
  assert.equal(S.eetVoorraad(w).length, 0, 'opgegeten is op');

  const vol = wereld(100);
  S.voegEtenToe(vol, 'kroket');
  assert.match(S.eet(vol, 'kroket'), /je zit vol/, 'op volle gezondheid blijft het liggen');
  assert.equal(vol.health, 100);
  assert.equal(S.eetVoorraad(vol)[0].aantal, 1, 'en het eten is niet weg');

  const half = wereld(50);
  S.voegEtenToe(half, 'krentenbol', 2);
  S.eet(half, 'krentenbol');
  assert.equal(half.health, 53, 'de gezondheid per stuk telt');
  assert.equal(S.eetVoorraad(half)[0].aantal, 1);
  assert.equal(S.eet(half, 'krentenbol'), 'Krentenbol: lekker! Gezondheid 56', 'de tweede ook');
  assert.equal(S.eet(half, 'krentenbol'), 'Dat heb je niet bij je.', 'zonder voorraad geen hap');
});

// ------------------------------------------------------------------ Enter op een kaart
t('Enter op een kaart voert de actie uit; een klik op de knop ook', () => {
  const w = wereld(96);
  apiWereld = w;
  H.visNaarVoorraad(w, 'karper');
  const p = paneel();
  S.renderSpullen(p, w);
  assert.match(p.lijst.innerHTML, /data-spul="e:vis:karper"/, 'de vis staat als kaart in de lijst');
  S.spullenFocus(p, { closest: () => ({ dataset: { spul: 'e:vis:karper' } }) });
  assert.match(p.detail.innerHTML, /Opeten/, 'de kaart heeft de actie Opeten');

  // Enter: dezelfde weg als de toets in pausemenu.js
  assert.equal(S.spullenEnter(p, 'e:vis:karper', api(p)), true, 'de actie loopt');
  assert.equal(w.health, 100, 'en de gezondheid gaat omhoog');
  assert.equal(S.eetVoorraad(w).length, 0, 'de vis is op');

  const pm = lees('pausemenu.js');
  assert.match(pm, /k === 'Enter' && t\.dataset && t\.dataset\.spul && tab === 'spullen'/, 'Enter op een kaart is een eigen tak');
  assert.match(pm, /spullenEnter\(activePanel\(\), t\.dataset\.spul, spullenApi\)/, 'en voert de actie uit, niet alleen de focus');
  assert.ok(pm.indexOf("t.dataset.spul && tab === 'spullen'") < pm.indexOf('t.tagName === \'BUTTON\''), 'de kaart gaat voor de gewone knop');

  // Tab naar de knop blijft werken: de klik op de actieknop doet hetzelfde.
  const w2 = wereld(40);
  apiWereld = w2;
  H.visNaarVoorraad(w2, 'karper');
  const p2 = paneel();
  S.renderSpullen(p2, w2);
  S.spullenFocus(p2, { closest: () => ({ dataset: { spul: 'e:vis:karper' } }) });
  const ev = { target: { closest: (sel) => (sel === '[data-spul-act]' ? { dataset: { spulAct: 'e:vis:karper' } } : null) } };
  apiWereld = w2;
  assert.equal(S.spullenClick(ev, w2, p2, api(p2)), true);
  assert.equal(w2.health, 55, 'de knop doet hetzelfde als Enter');
});

// ------------------------------------------------------------------ de melding in het paneel
t('de melding staat in het detailpaneel, niet in de HUD', () => {
  const w = wereld(96);
  apiWereld = w;
  H.visNaarVoorraad(w, 'karper');
  const p = paneel();
  S.renderSpullen(p, w);
  S.spullenFocus(p, { closest: () => ({ dataset: { spul: 'e:vis:karper' } }) });
  S.spullenEnter(p, 'e:vis:karper', api(p));
  assert.match(p.detail.innerHTML, /data-spul-melding/, 'de melding heeft een eigen plek in het paneel');
  assert.match(p.detail.innerHTML, /Karper: lekker! Gezondheid 100/, 'met de tekst van de actie');
  assert.equal(w.meldingen, 0, 'de HUD krijgt niets: die zit achter het pauzemenu');
  const bron = lees('spullen.js');
  assert.ok(!/w\.addMessage\s*\(/.test(bron), 'Spullen meldt niets meer via de HUD');
  assert.match(bron, /data-spul-melding role="status"/, 'en de melding is voor de voorlezer');
});

console.log(`spullen_eten_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
