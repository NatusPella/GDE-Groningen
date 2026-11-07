// #678: één standaard startkaart voor alle activiteiten, met doel, medaille-eisen, beloning,
// samen-status en je record (en de kernbesturing van twee of drie toetsgroepen). De kaart komt uit
// één tabel (game/js/startkaart.js) die ook "Te doen" en de kaart-hover voedt.
//   node scripts/startkaart_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const S = await import(new URL('../game/js/startkaart.js', import.meta.url).href);
const { STARTKAART, startkaartSpec, startkaartRegels, startkaartRijen, startkaartRegel } = S;

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };
const woorden = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

// De 26 activiteiten uit activities.js, zonder de module te laden (die haalt THREE en de DOM).
const ACT = lees('game/js/activities.js');
const imports = {};
for (const m of ACT.matchAll(/import \{ ([^}]+) \} from '\.\/([^']+)\.js';/g)) for (const naam of m[1].split(',').map((x) => x.trim().split(' as ')[0])) imports[naam] = m[2];
const lijst = ACT.match(/const LIST = \[([^\]]+)\]/)[1].split(',').map((x) => x.trim());
const moduleBronnen = lijst.map((naam) => (imports[naam] ? lees(`game/js/${imports[naam]}.js`) : ACT));
const ids = S && Object.keys(STARTKAART).filter((id) => moduleBronnen.some((bron) => new RegExp(`id: '${id}'`).test(bron)));

t('elke activiteit heeft een kaart met titel, doel, beloning en kernbesturing', () => {
  assert.equal(lijst.length, 26, 'activities.js heeft 26 activiteiten');
  assert.equal(Object.keys(STARTKAART).length, 26, 'de startkaarttabel heeft 26 regels');
  assert.deepEqual([...ids].sort(), Object.keys(STARTKAART).sort(), 'elk id in de tabel is een echte activiteit');
  for (const id of ids) {
    const k = STARTKAART[id];
    assert.ok(k.titel && k.titel.length > 2, `${id}: titel`);
    assert.ok(k.doel && woorden(k.doel) <= 14, `${id}: doel van hoogstens 14 woorden`);
    assert.ok(k.beloning && woorden(k.beloning) <= 18, `${id}: beloning kort`);
    assert.ok(k.kern && k.kern.length > 2, `${id}: kernbesturing`);
    assert.ok(k.kern.split('·').length <= 3, `${id}: hooguit drie toetsgroepen in de kern`);
    if (k.medailles) assert.equal(k.medailles.length, 3, `${id}: brons, zilver en goud`);
  }
});

t('de kaart noemt doel, medailles, beloning en samen; het record komt erbij als je het meegeeft', () => {
  const spec = startkaartSpec('discgolf', { record: '2 onder par' });
  assert.equal(spec.kind, 'tip');
  assert.equal(spec.title, 'Discgolf');
  assert.match(spec.bodyHtml, /Doel: /);
  assert.match(spec.bodyHtml, /Medailles: brons /);
  assert.match(spec.bodyHtml, /Beloning: /);
  assert.match(spec.bodyHtml, /Samen: /);
  assert.match(spec.bodyHtml, /Record: 2 onder par/);
  assert.match(spec.bodyHtml, /<kbd class="hud-key">SPATIE<\/kbd>/, 'de toetsen staan als toetsplaatjes');
  assert.equal(spec.key, 'startkaart-discgolf');
  assert.equal(startkaartSpec('onbestaand'), null, 'een onbekende activiteit geeft geen kaart');
});

t('de samen-status komt uit het register van coopstatus.js', () => {
  assert.match(startkaartRegels('hoogvlieger').join(' | '), /Samen: nog niet samen/);
  assert.match(startkaartRegels('discgolf').join(' | '), /Samen: ja, met de groep/);
  assert.match(startkaartRegels('wandeling').join(' | '), /Samen: deels/);
});

t('dezelfde gegevens gaan naar de kaart-hover en "Te doen"', () => {
  const rijen = startkaartRijen('hengelen');
  assert.deepEqual(rijen.map(([k]) => k), ['Doel', 'Medailles', 'Beloning']);
  assert.match(startkaartRegel('hengelen'), /^Doel: /);
  assert.match(ACT, /startkaartRegel\(a\.id\)/, 'de kaart-hover leest dezelfde regel');
  assert.match(ACT, /export const ACTIVITEIT_IDS = LIST\.map/, 'de activiteitenlijst heeft één id-bron');
});

t('elke start toont de kaart: standactivity, de losse spellen en de diensten', () => {
  assert.match(lees('game/js/standactivity.js'), /toonStartkaart\(w, c\.id, \{ record: c\.recText/, 'standactivity toont de kaart met het record');
  assert.match(lees('game/js/activities.js'), /toonStartkaart\(w, cfg\.id\)/, 'de vlucht- en vaardienst tonen de kaart');
  for (const f of ['discgolf.js', 'pitchputt.js']) assert.match(lees('game/js/' + f), /toonStartkaart\(w, '/, `${f} toont de kaart`);
  // de oude losse startkaart van deze twee spellen is weg
  for (const f of ['discgolf.js', 'pitchputt.js']) assert.ok(!/key: '(discgolf|pitchputt)-help'/.test(lees('game/js/' + f)), `${f} heeft geen eigen startkaart meer`);
});

console.log(`startkaart_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
