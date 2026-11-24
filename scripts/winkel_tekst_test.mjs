// Winkeltekst (UI-kritiek 22-11, #1252 #1253 #1255): geen ruwe {ACCOLADES} in een omschrijving, statuschips alleen bij een uitzondering,
// geen gezondheid in tekst naast de balk.
//   node scripts/winkel_tekst_test.mjs
import './node3d.mjs';
import { readFileSync } from 'node:fs';
const { WEAPON_STOCK } = await import('../game/js/shops.js');
import { plainKeyText, keyTextHtml } from '../game/js/keycap.js';
import { itemStatus, toonStatus, shortPerk } from '../game/js/shoplist.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// {RMB} in de omschrijving van het jachtgeweer wordt een toetsplaatje (detail) of een woord (rij), nooit letterlijk
const jacht = WEAPON_STOCK.find((w) => w.key === 'jachtgeweer');
ok(/\{RMB\}/.test(jacht.desc), 'bron bevat de placeholder');
ok(!/[{}]/.test(plainKeyText(shortPerk({ desc: jacht.desc }, 70))), 'rij zonder accolades', plainKeyText(shortPerk({ desc: jacht.desc }, 70)));
ok(!/\{RMB\}/.test(keyTextHtml(jacht.desc)), 'detail zonder letterlijke {RMB}');
for (const w of WEAPON_STOCK) ok(!/[{}]/.test(plainKeyText(w.desc)), 'omschrijving zonder accolades: ' + w.key);

// de shopui rendert de omschrijving via keyTextHtml en de rij via plainKeyText
const ui = readFileSync(new URL('../game/js/shopui.js', import.meta.url), 'utf8');
ok(/dd\.innerHTML = it\.desc \? keyTextHtml\(esc\(it\.desc\)\)/.test(ui), 'detail via keyTextHtml');
ok(/plainKeyText\(shortPerk/.test(ui), 'rij via plainKeyText');
ok(!/sm-pricebig/.test(ui), 'geen tweede prijs groot naast de knop');

// de status
const rijk = 1000;
ok(!toonStatus(itemStatus({ price: 120 }, rijk)), 'kan ik kopen: geen chip');
ok(!toonStatus(itemStatus({ price: 0 }, rijk)), 'gratis: geen chip');
ok(!toonStatus(itemStatus({ income: 50 }, rijk)), 'verkopen: geen chip');
ok(toonStatus(itemStatus({ price: 2400 }, rijk)), 'te duur: chip');
ok(toonStatus(itemStatus({ price: 10, disabled: 'Heb je al' }, rijk)), 'heb ik al: chip');
ok(toonStatus(itemStatus({ price: 10, disabled: 'Op slot' }, rijk)), 'op slot: chip');

// eten: de winst staat in de balk, niet nog eens in de tekst
const shops = readFileSync(new URL('../game/js/shops.js', import.meta.url), 'utf8');
ok(!/\+\$\{hp\} gezondheid/.test(shops), 'geen "+N gezondheid" in tekst');
ok(!/Gezondheid nu \$\{/.test(shops), 'geen losse "Gezondheid nu"-regel');

// #1258 (hertest 24-11): de koopknop draagt zijn toets in de knop, zonder een kleine hint "om te kopen" eronder
ok(!/om te kopen'/.test(ui) && !/ds-z-knop__sub/.test(ui), 'geen kleine hint in de koopknop');
ok(/<span class="ds-z-knop__toets" aria-hidden="true">\$\{toetsHint\(\)\}<\/span>/.test(ui) && /classList\.toggle\('ds-z-knop--toets'/.test(ui), 'de toets staat in de knop');

console.log(fails ? `${fails} van ${n} mislukt` : `winkel_tekst_test: ${n} gecontroleerd, alles goed`);
process.exit(fails ? 1 : 0);
