// Het tabblad Spelers als tabel met detail (samenspelers.js): wie wat ziet, verbinding in woorden, geen milliseconden en geen IP-adres.
//   node scripts/samenspelers_test.mjs
import assert from 'node:assert/strict';
import { tabelHtml, detailHtml, jijStrookHtml, aandachtRegels, aandachtHtml, signaalHtml } from '../game/js/samenspelers.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };
const rij = (slot, o = {}) => ({ slot, naam: 'Speler' + slot, kleur: '#4fb3ff', vorm: 'cirkel', doet: 'loopt', verbinding: 'ok', niveau: 'goed', ms: 420, jij: false, passief: true, groep: '', afstandTekst: slot ? '120 m' : '', richting: slot ? { pijl: '→', woord: 'oost' } : null, x: 1, y: 1, ...o });
const RIJEN = [rij(0, { jij: true, naam: 'Sem' }), rij(1, { naam: 'Iris' }), rij(2, { naam: 'Tijn', niveau: 'matig' }), rij(3, { naam: 'Liv', verbinding: 'lost', niveau: 'weg' }), rij(4, { naam: 'Gijs', passief: false })];

t('de tabel heeft één rij per speler, markeert jou en de gekozen rij en toont de verbinding als woord', () => {
  const h = tabelHtml(RIJEN, { sel: 2 });
  assert.equal((h.match(/<tr data-kies/g) || []).length, 5);
  assert.match(h, /aria-selected="true"/); assert.match(h, /JIJ/); assert.match(h, /Opende het spel/);
  for (const w of ['Goed', 'Matig', 'Weg']) assert.match(h, new RegExp(w));
  assert.match(h, /Passief/); assert.match(h, /Actief/);
});
t('nooit milliseconden of een IP-adres in beeld, ook niet in het detail', () => {
  const alles = tabelHtml(RIJEN, { sel: 2 }) + RIJEN.map((r) => detailHtml(r, { rol: 'host' })).join('');
  assert.doesNotMatch(alles, /\bms\b|\b420\b|ping/i); assert.doesNotMatch(alles, /\b\d{1,3}(\.\d{1,3}){3}\b|GDE2-/);
});
t('wie het spel opende ziet Spel overdragen en Uit het spel zetten bij een ander, nooit bij zichzelf; een gast ziet ze niet', () => {
  const host = detailHtml(RIJEN[2], { rol: 'host' });
  assert.match(host, /data-geef="2"/); assert.match(host, /data-eruit="2"/); assert.match(host, /Uit het spel zetten/);
  const gast = detailHtml(RIJEN[2], { rol: 'gast', openerNaam: 'Sem' });
  assert.doesNotMatch(gast, /data-geef|data-eruit/); assert.match(gast, /kan alleen wie het spel opende \(Sem\)/);
  const zelf = detailHtml(RIJEN[0], { rol: 'host' });
  assert.doesNotMatch(zelf, /data-geef|data-eruit|data-stand/);
});
t('dempen en blokkeren zijn één segment met de huidige keuze, voor iedereen behalve jezelf', () => {
  const h = detailHtml(RIJEN[1], { rol: 'gast', muteStaat: () => 'gedempt' });
  assert.match(h, /data-stand="gewoon"/); assert.match(h, /data-stand="gedempt"/); assert.match(h, /data-stand="geblokkeerd"/);
  assert.match(h, /aria-checked="true" data-stand="gedempt"/);
});
t('Matig, Slecht en Weg krijgen een uitleg, Goed niet', () => {
  assert.doesNotMatch(detailHtml(RIJEN[1], { rol: 'gast' }), /ss-uitleg/);
  assert.match(detailHtml(RIJEN[2], { rol: 'gast' }), /ss-uitleg--matig/); assert.match(detailHtml(RIJEN[3], { rol: 'gast' }), /ss-uitleg--weg/);
  assert.match(detailHtml(rij(5, { niveau: 'matig', jij: true }), { rol: 'gast' }), /Anderen zien je soms schokken/);
});
t('uit het spel zetten vraagt eerst wat je verliest en wat blijft, met de veilige keuze eerst', () => {
  const h = detailHtml(RIJEN[2], { rol: 'host', bevestig: 2 });
  assert.match(h, /Hij verliest/); assert.match(h, /Blijft/); assert.match(h, /data-eruit-nee/);
  assert.ok(h.indexOf('data-eruit-nee') < h.indexOf('data-eruit="2"'), 'Nee staat vóór Ja');
  assert.doesNotMatch(detailHtml(RIJEN[2], { rol: 'gast', bevestig: 2 }), /data-eruit/, 'een gast krijgt de bevestiging nooit');
});
t('de aandacht noemt wie weg is, jouw eigen verbinding en wie op Actief staat, hoogstens drie', () => {
  const a = aandachtRegels(RIJEN);
  assert.deepEqual(a.map((x) => x.kop), ['Liv is weg', 'Gijs staat op Actief']);
  const eigen = aandachtRegels([rij(0, { jij: true, niveau: 'slecht' }), ...RIJEN.slice(1)]);
  assert.match(eigen[0].kop, /Jouw verbinding is slecht/); assert.ok(eigen.length <= 3);
  assert.equal(aandachtHtml([]), '');
});
t('jouw stand is een segment, alleen als de stand te kiezen is, en roepen staat erbij', () => {
  const h = jijStrookHtml({ passief: true, kan: true, tekstUitleg: 'Uitleg.', roep: [{ toets: '7', soort: 'hier', tekst: 'Kom hier' }] });
  assert.match(h, /data-passief="1"/); assert.match(h, /data-passief="0"/); assert.match(h, /data-ping="hier"/);
  assert.doesNotMatch(jijStrookHtml({ kan: false }), /data-passief/);
});
t('een speler die weg is heeft een eigen vorm zonder kleur-alleen: het woord Weg staat er', () => {
  assert.match(signaalHtml('weg'), /Weg/);
});
console.log(`samenspelers_test: ${n} tests ok`);
