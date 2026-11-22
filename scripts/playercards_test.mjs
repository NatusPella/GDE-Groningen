// De spelerskaartjes van Spel > Samen spelen > Spelers (#1011), zonder DOM en zonder coopnet.js.
//   node scripts/playercards_test.mjs
import assert from 'node:assert/strict';
import { cardHtml, kopHtml, pvpHtml, roepHtml, muteHtml, CARD_KEYS } from '../game/js/playercards.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };
const rij = (slot, o = {}) => ({ slot, naam: 'Speler ' + slot, kleur: '#4fb3ff', vorm: 'cirkel', doet: 'loopt', verbinding: 'ok', ms: 40, jij: false, passief: true, x: 1, y: 1, ...o });

t('wie het spel opende ziet Eruit zetten en Overdragen bij de anderen, nooit bij zichzelf', () => {
  const ander = cardHtml(rij(2), { acties: true, rol: 'host' });
  assert.match(ander, /data-eruit="2"/); assert.match(ander, /data-geef="2"/);
  const zelf = cardHtml(rij(0, { jij: true }), { acties: true, rol: 'host' });
  assert.doesNotMatch(zelf, /data-eruit|data-geef|data-stand/, 'bij jezelf geen acties');
});
t('een gast ziet geen Eruit zetten en geen Overdragen, wel Dempen en Blokkeren', () => {
  const h = cardHtml(rij(2), { acties: true, rol: 'gast' });
  assert.doesNotMatch(h, /data-eruit|data-geef/);
  assert.match(h, /data-stand="gedempt"/); assert.match(h, /data-stand="geblokkeerd"/);
});
t('Dempen en Blokkeren zijn pictogrammen met een tooltip en een toets, zonder zichtbare tekst', () => {
  const h = muteHtml(3, 'gedempt');
  const knoppen = h.match(/<button[\s\S]*?<\/button>/g);
  assert.equal(knoppen.length, 2);
  for (const k of knoppen) {
    assert.match(k, /title="/); assert.match(k, /aria-keyshortcuts="[MB]"/); assert.match(k, /aria-label="/);
    assert.equal(k.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim(), '', 'geen tekst in de knop');
  }
  assert.match(h, /aria-pressed="true"[^>]*aria-keyshortcuts="M"|data-stand="gedempt"[^>]*aria-pressed="true"/, 'de gedempte stand staat aan');
  assert.deepEqual(CARD_KEYS, { gedempt: 'M', geblokkeerd: 'B', eruit: 'X' });
});
t('Eruit zetten vraagt eerst om bevestiging in gewone taal', () => {
  const vraag = cardHtml(rij(2, { naam: 'Rik' }), { acties: true, rol: 'host', bevestig: 2 });
  assert.match(vraag, /Rik eruit zetten\?/); assert.match(vraag, /Ja, eruit zetten/); assert.match(vraag, /Annuleren/);
  assert.doesNotMatch(vraag, /data-geef/, 'tijdens de vraag geen andere acties');
});
t('een kaartje heeft avatar, naam, status en wat de speler doet; kleur is nooit het enige signaal', () => {
  const h = cardHtml(rij(1, { verbinding: 'lost', doet: 'weg' }), { acties: false });
  assert.match(h, /cs-avatar/); assert.match(h, /cs-vorm/); assert.match(h, /cs-naam/); assert.match(h, /cs-status/); assert.match(h, /cs-doet/);
  assert.match(h, /cs-rij-weg/, 'een weggevallen speler staat gestippeld');
  assert.match(h, /tabindex="0"/, 'het kaartje is te bereiken met het toetsenbord (M, B en X)');
  assert.match(h, /●/, 'de vorm staat naast de kleur');
});
t('geen tekstmuur: de kop is één regel, de uitleg staat achter Meer info', () => {
  const h = kopHtml({ aantal: 3, rol: 'host', versie: 'Versie 0.64.0.' });
  const open = h.replace(/<details[\s\S]*?<\/details>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(open.length <= 80, `zichtbare kop: ${open.length} tekens`);
  assert.match(h, /<details class="cs-info"><summary>Meer info/);
  assert.match(h, /Alleen de speler bij wie de sessie draait, kan iemand eruit zetten\./);
  assert.match(kopHtml({ aantal: 2, rol: 'gast', opener: 'Sem' }), /Sem opende het spel\./);
  assert.match(kopHtml({ aantal: 0 }), /Je speelt nu alleen/);
  const pvp = pvpHtml({ passief: true, tekst: { knopAan: 'Aan', knopUit: 'Uit', uitleg: 'Lange uitleg.' } });
  assert.match(pvp, /<details class="cs-info">/); assert.doesNotMatch(pvp.replace(/<details[\s\S]*?<\/details>/, ''), /Lange uitleg/);
  assert.doesNotMatch(roepHtml([{ soort: 'hier', tekst: 'Kom hier', toets: 'Z' }]), /<p>/, 'Roepen heeft geen alinea meer');
});
t('een IP-adres staat nooit op een kaartje', () => {
  const h = cardHtml(rij(1, { naam: 'Iris' }), { acties: true, rol: 'host' }) + kopHtml({ aantal: 2, rol: 'host' });
  assert.doesNotMatch(h, /\b\d{1,3}(\.\d{1,3}){3}\b|GDE2-/i);
});
console.log(`playercards_test: ${n} controles ok`);
