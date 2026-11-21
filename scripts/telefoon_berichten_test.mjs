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
  assert.equal(appForNote({ from: 'snackwagen', app: 'geld', text: 'Gisteren €120 omzet' }), 'geld', 'wat de melder meegeeft telt');
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

t('een personage toont alleen zijn laatste bericht, niet de hele geschiedenis', () => {
  const m = ph.slice(ph.indexOf('function messagesHtml'), ph.indexOf('// Het blok onder een personage'));
  assert.match(m, /const laatste = items\[0\]/, 'het nieuwste bericht staat bovenaan de geschiedenis');
  assert.ok(!/reverse\(\)/.test(m), 'de volledige geschiedenis wordt niet meer teruggelezen');
  assert.match(m, /return ''/, 'zonder berichten blijft het blok leeg in plaats van een lege regel');
});

t('de ongelezen-teller staat in de hero, niet in een tweede berichtenlijst', () => {
  assert.ok(ph.includes('export function unreadInbox('), 'phone.js geeft de ongelezen lijst');
  assert.ok(vu.includes('unreadInbox'), 'Verhaal > Personages gebruikt hem voor de teller');
  assert.ok(!vu.includes('inboxHtml'), 'de losse BERICHTEN-lijst is weg');
  assert.match(vu, /ongelezen \? ` · <b>\$\{ongelezen\}<\/b> ongelezen`/, 'de hero noemt het aantal ongelezen');
  assert.match(vu, /if \(met\) \{ renderCharacterPhone\([\s\S]*?refreshInbox\(panel, id\); \}/, 'de teller wordt bijgewerkt zodra het personage opengaat');
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

t('een melding zonder tekst komt niet in de rij (geen globale foutmelding)', () => {
  const f = pf.slice(pf.indexOf('export function notifyPhone'), pf.indexOf('// History entries'));
  assert.match(f, /typeof spec\.text !== 'string' \|\| !spec\.text\.trim\(\)\) return;/, 'notifyPhone slaat een melding zonder tekst over');
  assert.ok(f.indexOf('return;') < f.indexOf('phoneNotifications.push'), 'het overslaan komt voor het toevoegen');
});

t('de naam staat niet dubbel op een telefoonkaart (20-11)', () => {
  assert.match(pf, /const meerdere = new Set\(c\.lines\.map\(\(x\) => x\.speaker \|\| c\.from\)\)\.size > 1;\s*paintSpeaker\(sp, meerdere \?/, 'het sprekerlabel vóór een regel komt er alleen bij als er meer sprekers zijn');
  assert.match(pf, /naamGelijk\(p\) \? '' : `<small class="pf-appnaam">/, 'afzender gelijk aan de app: alleen de naam, geen tweede kopregel');
  assert.match(pf, /export const naamGelijk = \(p\) =>/, 'naamGelijk is één plek voor die vraag');
});

console.log(`OK telefoon_berichten_test: ${n} controles`);
