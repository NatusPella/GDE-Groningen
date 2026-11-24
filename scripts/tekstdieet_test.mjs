// Tekstdieet van de startkaarten (eigenaar 21-11, #1169 en de startkeuze): een maximum aan tekens per element, zodat de kaarten niet
// weer volstromen. Zichtbare tekst = de markup zonder tags en zonder de inhoud van de uitklapper (details) "Meer info".
//   node scripts/tekstdieet_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.window = globalThis;
globalThis.navigator ??= {};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, body: null, head: null, activeElement: null };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, 'game', 'js', f), 'utf8');
const L = await import('../game/js/launchchoice.js');
const UI = await import('../game/js/launchchoiceui.js');
const O = await import('../game/js/onlineconsent.js');
const OUI = await import('../game/js/onlineconsentui.js');
const C = await import('../game/js/difficultycard.js');
const G = await import('../game/js/loadgate.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };
const zichtbaar = (html) => html.replace(/<p[^>]*\bhidden\b[^>]*>[\s\S]*?<\/p>/g, ' ').replace(/<details[\s\S]*?<\/details>/g, ' Meer info ').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const woorden = (s) => s.split(/\s+/).filter(Boolean).length;

// 1. keuzekaart "Hoe wil je spelen?": titel, twee knoppen met een ondertitel van hooguit 6 woorden, één hintregel
ok(L.LAUNCH_TEXT.titel.length <= 30, 'keuzekaart: titel ≤ 30 tekens', L.LAUNCH_TEXT.titel.length);
for (const k of L.KEUZES) {
  ok(k.label.length <= 20, `keuzekaart: label ${k.id} ≤ 20 tekens`, k.label);
  ok(woorden(k.uitleg) <= 6 && k.uitleg.length <= 40, `keuzekaart: ondertitel ${k.id} ≤ 6 woorden en ≤ 40 tekens`, k.uitleg);
}
ok(!('uitleg' in L.LAUNCH_TEXT), 'keuzekaart: geen inleidende alinea');
ok(L.LAUNCH_TEXT.hulp.length <= 3 && L.LAUNCH_TEXT.hulp.join(' ').length <= 40, 'keuzekaart: één korte hintregel');
{
  const t = zichtbaar(UI.launchChoiceHtml({}));
  ok(t.length <= 160, 'keuzekaart: alle zichtbare tekst ≤ 160 tekens', t.length);
}

// 2. naamscherm: titel, naamveld, vinkje met één korte zin, "Meer info" (dicht), Doorgaan
ok(O.EERSTE_START.titel.length <= 30, 'naamscherm: titel ≤ 30 tekens', O.EERSTE_START.titel.length);
ok(O.EERSTE_START.consent.length <= 70, 'naamscherm: de vinkzin ≤ 70 tekens', O.EERSTE_START.consent.length);
ok(!('uitleg' in O.EERSTE_START) && !('naamHint' in O.EERSTE_START), 'naamscherm: geen inleiding en geen hint');
{
  const h = OUI.onlineStartHtml({ terug: true });
  const t = zichtbaar(h);
  ok(t.length <= 150, 'naamscherm: alle zichtbare tekst ≤ 150 tekens', [t.length, t]);
  ok(/<details class="os-info">/.test(h) && !/<details[^>]*\bopen\b/.test(h), 'naamscherm: de uitleg zit in een uitklapper die dicht staat');
  ok(/IP-adres/.test(O.EERSTE_START.consent + O.EERSTE_START.info) && /STUN/.test(O.EERSTE_START.info), 'naamscherm: de privacy-uitleg staat er nog wel (achter Meer info)');
  ok(!/class="os-uitleg"|class="os-hint"/.test(h), 'naamscherm: geen losse uitlegalinea');
}

// 3. toestemmingskaart idem
ok(L.TOESTEMMING_TEKST.titel.length <= 40 && L.TOESTEMMING_TEKST.consent.length <= 70, 'toestemming: titel ≤ 40 en vinkzin ≤ 70 tekens');
{
  const h = UI.toestemmingHtml();
  const t = zichtbaar(h);
  ok(t.length <= 170, 'toestemming: alle zichtbare tekst ≤ 170 tekens', [t.length, t]);
  ok(/<details class="os-info">/.test(h) && /STUN-server en openbare brokers/.test(h) && /class="m-sw os-consent-vink"/.test(h), 'toestemming: vinkje blijft, uitleg achter Meer info');
}

// 4. moeilijkheidskaart: korte niveau-omschrijvingen
ok(C.CARD_TEXT.titel.length <= 30 && C.CARD_TEXT.uitleg.length <= 60, 'moeilijkheid: titel ≤ 30 en inleiding ≤ 60 tekens');
for (const c of C.levelCards()) ok(c.uitleg.length <= 50 && woorden(c.uitleg) <= 8, `moeilijkheid: omschrijving ${c.id} ≤ 50 tekens en ≤ 8 woorden`, c.uitleg);
ok(C.CARD_TEXT.optiesUitleg.length <= 60, 'moeilijkheid: inleiding van de opties ≤ 60 tekens');

// 5. laadscherm: precies één statusregel, geen "Stap n van m", geen tipregel, korte zinnen
{
  const ls = read('loadscreen.js') + read('loadscene.js');
  ok((ls.match(/class="ls-step[" ]/g) || []).length === 1 && !/ls-tip/.test(ls), 'laadscherm: één statusregel, geen tipregel');
  ok(!/Stap \$\{|Stap \d|van \$\{/.test(ls + read('loadlogic.js') + read('startscreen.js')), 'laadscherm: geen "Stap n van m"');
  for (const s of ['laadt', 'hangt', 'wacht-host', 'klaar']) {
    const t = G.statusLine(s, 'Gebouwen en straten komen binnen', 'Tammo');
    ok(t.length <= 70 && !/\n/.test(t), `laadscherm: statusregel ${s} ≤ 70 tekens`, t);
  }
}

// 6. opgeslagen spellen: ruime rij met naam, speeltijd, plek, datum; geen verhaaldeel, balk of tip per rij
{
  const ui = read('saveslotsui.js'), css = read('saveslots.css');
  const kaart = ui.slice(ui.indexOf('const card = (s)'), ui.indexOf('const emptyCard'));
  ok(!/ssl-part|ssl-prog|Volgende stap|storySummary/.test(kaart), 'opgeslagen spellen: geen verhaaldeel, balk of tip per rij');
  ok(/sp-slot__naam[\s\S]*sp-slot__meta[\s\S]*sp-slot__acties/.test(kaart), 'opgeslagen spellen: naam, één regel, acties (Spel-UI 24-11)');
  ok(/\.ssl-grid \{[^}]*repeat\(2,/.test(css) && /\.ssl-go \{[^}]*display: inline-flex/.test(css), 'opgeslagen spellen: twee brede kolommen en de actie altijd zichtbaar');
}

console.log(`${n - fails}/${n} tekstdieet`);
process.exit(fails ? 1 : 0);
