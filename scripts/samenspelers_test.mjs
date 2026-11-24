// Het tabblad Spelers als tabel met detail (samenspelers.js): wie wat ziet, verbinding in woorden, geen milliseconden en geen IP-adres.
//   node scripts/samenspelers_test.mjs
import assert from 'node:assert/strict';
import { uitnodigenHtml, sessieHtml, wachtkamerVoetHtml, tabelHtml, detailHtml, jijStrookHtml, aandachtRegels, aandachtHtml, signaalHtml } from '../game/js/samenspelers.js';

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
t('Uit het spel zetten is een link bij wie het spel opende; de bevestiging (verliest, blijft, vasthouden) komt van spelbevestig.js', () => {
  assert.match(detailHtml(RIJEN[2], { rol: 'host' }), /class="ds-z-link ss-eruit" data-eruit="2"/);
  assert.doesNotMatch(detailHtml(RIJEN[2], { rol: 'gast' }), /data-eruit/);
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
t('Uitnodigen: de code groot met Kopieer, een openbare sessie heeft geen code, een gast kent hem dan niet', () => {
  const R2 = RIJEN.slice(0, 3);
  const prive = uitnodigenHtml({ code: 'K3J9D-8F2MN', rol: 'host', spelers: R2 });
  assert.match(prive, /K3J9D-8F2MN/); assert.match(prive, /data-kopieer/); assert.match(prive, /Kopieer de code/);
  const open = uitnodigenHtml({ openbaar: true, openbaarNaam: 'Zomeravond', code: 'K3J9D-8F2MN', rol: 'gast', openerNaam: 'Sem', spelers: R2 });
  assert.doesNotMatch(open, /K3J9D|data-kopieer/); assert.match(open, /Openbare sessies/); assert.match(open, /alleen Sem kent de kamercode/);
  assert.match(uitnodigenHtml({ openbaar: true, openbaarNaam: 'Z', rol: 'host', spelers: R2 }), /data-privaat/);
  assert.doesNotMatch(prive + open, /d{1,3}(.d{1,3}){3}/, 'geen IP-adres');
});
t('Sessie: instellingen zijn van wie het spel draait, de keuzes zijn van iedereen, stoppen is een voorstel', () => {
  const host = sessieHtml({ naam: 'Zomeravond', rol: 'host', logboek: [{ titel: 'Race', namen: ['Sem', 'Iris'], tijd: '19:52' }] });
  assert.match(host, /Dit kun alleen jij instellen/); assert.match(host, /Race/); assert.match(host, /data-stop-voorstel/); assert.doesNotMatch(host, /data-verlaat/);
  const gast = sessieHtml({ naam: 'Zomeravond', rol: 'gast', openerNaam: 'Sem' });
  assert.match(gast, /Dit stelt Sem in/); assert.match(gast, /data-verlaat/); assert.match(gast, /Cheats aan/); assert.match(gast, /Nog niets samen gedaan/);
});
t('de wachtkamervoet: de gele start met zijn reden, uitgeschakeld als het niet kan', () => {
  assert.match(wachtkamerVoetHtml({ label: 'Spel starten', disabled: false, hint: 'Alle 3 spelers zijn er.' }), /data-start-spel>Spel starten/);
  assert.match(wachtkamerVoetHtml({ label: 'Spel starten', disabled: true, hint: 'Wacht op een medespeler.' }), /disabled/);
});
console.log(`samenspelers_test: ${n} tests ok`);
