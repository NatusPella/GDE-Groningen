// Telefoon (#603): één zichtbare plek voor ongelezen berichten (de inbox boven Verhaal >
// Personages, bereikbaar via Esc vanaf de HUD-kaart), een gesprek staat regel voor regel in de
// geschiedenis en is van oud naar nieuw te lezen, de app komt uit de afzender in plaats van uit
// een €-teken in de tekst, en de oude dode telefoonlijst is weg.
//   node scripts/telefoon_berichten_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { appForNote, senderForNote, senderOf, bodyOf } from '../game/js/phoneapp.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const ph = lees('phone.js');
const pf = lees('phonefeed.js');
const vu = lees('verhaalui.js');
const pm = lees('pausemenu.js');
let n = 0;
const t = (naam, f) => { f(); n++; };

t('de app komt uit de afzender of de opgave, nooit uit een bedrag in de tekst', () => {
  assert.equal(appForNote({ from: 'Kiekdoar' }), 'sikkom', 'Kiekdoar is de nieuwsapp');
  assert.equal(appForNote({ text: 'KIEKDOAR MELDT: onrust in Grunn' }), 'sikkom', 'de nieuwsregel herkent zijn eigen voorvoegsel');
  assert.equal(appForNote({ from: 'Fjord Frituur', app: 'geld', text: 'Gisteren €120 omzet' }), 'geld', 'wat de melder meegeeft telt');
  assert.equal(appForNote({ text: 'Je bestelling kost €12' }), 'bericht', 'een bedrag maakt van een bericht geen bankmelding');
  assert.equal(appForNote({ from: 'GDE' }), 'bericht', 'een afzender zonder app is een gewoon bericht');
  assert.equal(appForNote({ app: 'onbekend', from: 'Kiekdoar' }), 'sikkom', 'een onbekende app valt terug op de afzender');
});

t('de afzender valt niet stil terug op Kiekdoar', () => {
  assert.equal(senderForNote({ from: 'Bank' }), 'Bank');
  assert.equal(senderForNote({ app: 'sikkom', text: 'KIEKDOAR: nieuws' }), 'Kiekdoar');
  assert.equal(senderForNote({ text: 'KIEKDOAR: nieuws' }), 'Kiekdoar');
  assert.equal(senderForNote({ app: 'geld' }), 'Bank', 'een geldmelding zonder afzender heet Bank');
  assert.equal(senderForNote({ text: 'Los bericht' }), 'Bericht', 'een bericht zonder afzender heet Bericht');
});

t('oude geschiedenisregels dragen de afzender nog in de tekst', () => {
  assert.equal(senderOf({ text: 'Henk: Kom mor langs.' }), 'Henk');
  assert.equal(senderOf({ text: 'Gesprek · Berend: Ik bel je.' }), 'Berend');
  assert.equal(senderOf({ from: 'Tessa', text: 'x' }), 'Tessa');
  assert.equal(bodyOf({ text: 'Henk: Kom mor langs.' }), 'Kom mor langs.');
  assert.equal(bodyOf({ from: 'Tessa', body: 'Tot zo' }), 'Tot zo');
});

t('een gesprek staat regel voor regel in de geschiedenis, niet als één blok', () => {
  assert.match(pf, /for \(const l of said\) \{/, 'elke uitspraak wordt apart bewaard');
  assert.match(pf, /remember\(world, `\$\{c\.live \? 'Live' : 'Gesprek'\} · \$\{who\}: \$\{l\.text\}`/, 'met spreker en regel per bericht');
  assert.ok(!/said\.map\(\(l\) => l\.text\)\.join\(' '\)/.test(pf), 'geen samengevoegd blok meer');
  assert.match(pf, /read = false/, 'een nieuw bericht is ongelezen');
});

t('berichten bij een personage lezen van oud naar nieuw', () => {
  const m = ph.slice(ph.indexOf('function messagesHtml'), ph.indexOf('// Het blok onder een personage'));
  assert.match(m, /\[\.\.\.items\]\.reverse\(\)/, 'de oudste regel staat bovenaan');
});

t('er is één zichtbare plek met alle ongelezen berichten', () => {
  assert.ok(ph.includes('export function unreadInbox('), 'phone.js geeft de ongelezen lijst');
  assert.ok(vu.includes('unreadInbox'), 'Verhaal > Personages gebruikt hem');
  assert.match(vu, /function inboxHtml\(\)[\s\S]*?unreadInbox\(worldRef\)[\s\S]*?data-char="\$\{esc\(m\.id\)\}"/, 'elk bericht is een knop naar zijn personage');
  assert.match(vu, /ongelezen · nieuwste eerst/, 'de lijst zegt hoeveel er ongelezen is');
  assert.match(vu, /en \$\{items\.length - shown\.length\} meer bij de personages/, 'meer dan zes staat er als regel bij');
  assert.match(vu, /<div class="vh-left">\$\{inboxHtml\(\)\}/, 'de inbox staat bovenaan Personages');
  assert.match(vu, /function refreshInbox\(panel, id\)[\s\S]*?unreadInbox\(worldRef\)/, 'na het lezen verdwijnt het bericht uit de inbox');
  assert.match(vu, /if \(met\) \{ renderCharacterPhone\([\s\S]*?refreshInbox\(panel, id\); \}/, 'de inbox wordt bijgewerkt zodra het personage opengaat');
});

t('een gemist bericht blijft bereikbaar vanaf de HUD-kaart (Esc)', () => {
  assert.match(pf, /const NOTICE_LONG_MS = 30000;/, 'de afzender blijft een halve minuut onthouden');
  assert.match(pf, /function hasUnreadFrom\(from\) \{[\s\S]*?senderOf\(e\) === from/, 'alleen zolang het bericht ongelezen is');
  assert.match(pf, /if \(now < longNotice\.until && hasUnreadFrom\(longNotice\.from\)\)/, 'Esc opent die afzender als de kaart al weg is');
  assert.match(pf, /return from;\n  \}\n  return '';/, 'en verbruikt hem één keer, zodat een tweede Escape weer gewoon het menu opent');
  assert.match(pm, /takeNoticeThread\(\)[\s\S]*?openPauseMenu\('telefoon', \{ thread \}\)/, 'Esc opent daarmee Verhaal > Personages op dat bericht');
  assert.match(pm, /selectVerhaalCharacter\(characterForSender\(opts\.thread\)\)/, 'het menu opent het juiste personage');
});

t('de oude, dode telefoonlijst en zijn dode tekst zijn weg', () => {
  for (const weg of ['renderPhonePanel', 'contactCard', 'threadCard', 'phoneThreads', 'markRead(', 'selectPhoneThread', 'data-ph-thread', 'Nog geen berichten. Grunn is rustig', 'bel voor een rit, een klus of een praatje']) {
    assert.ok(!ph.includes(weg), `${weg} is weg uit phone.js`);
  }
  assert.ok(!pm.includes('selectPhoneThread'), 'pausemenu.js kent de oude thread-stand niet meer');
  assert.ok(pf.includes('takeNoticeThread') && !pf.includes('threadCard'), 'phonefeed.js heeft geen tweede lijst');
});

t('het telefoonblok krijgt de volle breedte; alleen het portret houdt zijn maat', () => {
  assert.ok(!/\.vh-viewer \{ width: 460px; flex: none; \}/.test(vu), 'de vaste 460 px-kolom is weg');
  assert.match(vu, /\.vh-viewer \{ flex: 1 1 54%; min-width: 0; \}/, 'de kijker groeit mee met het scherm');
  assert.match(vu, /\.vh-stage \{[^}]*max-width: 460px;/, 'het portret blijft 460 px');
  assert.match(vu, /\.vh-left \{ flex: 1 1 46%/, 'de lijst en het detail delen de breedte');
});

console.log(`OK telefoon_berichten_test: ${n} controles`);
