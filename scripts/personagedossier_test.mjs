// Het dossier van Verhaal > Personages (personages-ui 22-11): de opbouw (vaste kop, geen lege elementen), het tekstdieet (korte alinea's, de rest achter
// "Meer"), "Samen in" per akte, toets in de knop, Overig met een envelop en geen "…", en de DS3-scrollbalk in de CSS. Puur: geen DOM, geen browser.
// De echte weergave (overlap, lege vlakken, schaal 1,5) meet scripts/ui/personages_render.mjs --meet met headless Chrome (personages_render_test.mjs).
//   node scripts/personagedossier_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './node3d.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, 'game', 'js', f), 'utf8');
const D = await import('../game/js/personagedossier.js');
const { CHARACTERS } = await import('../game/js/characters.js');
const { cardFacts } = await import('../game/js/characterdossiers.js');
const { buttonsWithoutGlyph, looseHintBesideButton } = await import('../game/js/dsbutton.js');
const { partNumber } = await import('../game/js/storyarc.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };
const plain = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// de zichtbare delen: zonder het blok achter "Meer"
const zichtbaar = (html) => html.replace(/<div class="vh-meer"[\s\S]*?<\/div>(?=<\/div><section)/, '');

const steps = [
  { id: 'M01', part: 'kop', title: 'Nul krassen', done: true, current: false },
  { id: 'M04', part: 'kop', title: 'Kieken van boven', done: true, current: false },
  { id: 'M05', part: 'kop', title: 'Wind tegen', done: false, current: true },
  { id: 'M09', part: 'romp', title: 'Heel aankomen', done: false, current: false },
  { id: 'M11', part: 'staart', title: 'Gelend', done: false, current: false },
  { id: 'M99', part: 'staart', title: 'Niet van hem', done: false, current: false },
];

// 1. splitBio en splitFeiten
{
  const lang = 'Eerste zin hier. Tweede zin ook nog wel. ' + 'Derde zin die veel te lang is en daarom achter Meer hoort te staan, want de alinea blijft kort voor de speler. '.repeat(2);
  const s = D.splitBio(lang);
  ok(s.kort.length <= D.BIO_MAX, 'bio: kort deel ≤ BIO_MAX', s.kort.length);
  ok(s.kort.startsWith('Eerste zin hier. Tweede zin ook nog wel.') && s.rest.startsWith('Derde'), 'bio: splitst op zinsgrens');
  ok(D.splitBio('Eén hele lange zin zonder punt of iets anders ' + 'x'.repeat(300)).kort.length > D.BIO_MAX, 'bio: een enkele lange zin blijft heel (geen tekst afknippen)');
  ok(D.splitBio('').kort === '' && D.splitBio(null).rest === '', 'bio: leeg is leeg');
  const f = D.splitFeiten([{ label: 'Woont', text: 'Paddepoel' }, { label: 'Werk', text: 'x'.repeat(D.FEIT_MAX + 1) }]);
  ok(f.kort.length === 1 && f.lang.length === 1 && f.lang[0].label === 'Werk', 'feiten: lang gaat achter Meer');
}

// 2. "Samen in" per akte
{
  const g = D.actGroups(steps, ['M01', 'M04', 'M05', 'M09', 'M11'], partNumber);
  ok(g.length === 3 && g[0].akte === 'Akte 1' && g[0].stappen.length === 3, 'akten: gegroepeerd per akte', g.map((x) => x.akte));
  ok(g[0].stappen.map((s) => s.st).join() === 'klaar,klaar,nu', 'akten: gedaan, gedaan, nu', g[0].stappen);
  ok(!g.flatMap((x) => x.stappen).some((s) => s.id === 'M99'), 'akten: alleen de stappen van dit personage');
  const html = D.togetherInHtml(g);
  ok((html.match(/data-st="nu"/g) || []).length === 1 && /ds-z-chip--primair/.test(html), 'akten: één gele "nu"-chip');
  ok(/ds-z-chip--succes/.test(html) && /ds-z-chip--uit/.test(html), 'akten: gedaan en nog niet gespeeld hebben een eigen vorm');
  ok(/gedaan\)/.test(html) && /nog niet gespeeld\)/.test(html), 'akten: de stand staat ook als woord (schermlezer en kleurenblind)');
  ok(D.togetherInHtml([]) === '', 'akten: zonder stappen geen kopje');
}

// 3. het dossier van elk personage
const iedereen = CHARACTERS.map((c) => c);
ok(iedereen.length > 10, 'cast: er zijn personages om na te lopen', iedereen.length);
let alleenKortGezien = 0;
for (const c of iedereen) {
  const feiten = cardFacts(c.id, { met: true, done: new Set(['M01', 'M04', 'M05']) });
  const html = D.dossierHtml(c, { feiten, groups: D.actGroups(steps, c.missions, partNumber), stage: '<canvas aria-hidden="true"></canvas>', nieuw: c.id === 'tammo', quoteNl: '' });
  const naam = `dossier ${c.id}`;
  ok(/^<article class="vh-dossier"[^>]*><header class="vh-kop /.test(html), `${naam}: de kop is het eerste blok`);
  ok(new RegExp(`<h3>${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h3>`).test(html) && html.includes('vh-rol') && html.includes('Ontmoet'), `${naam}: kop met naam, rol en status`);
  ok(c.id !== 'tammo' || html.includes('vh-nieuw'), `${naam}: Nieuw-chip alleen als het nieuw is`);
  ok(c.id === 'tammo' || !html.includes('vh-nieuw'), `${naam}: geen Nieuw-chip als het niet nieuw is`);
  // geen lege elementen (behalve het portretvlak en het telefoonblok, die de code vult)
  const leeg = [...html.matchAll(/<(span|p|li|h3|h4|b|small|div)\b([^>]*)><\/\1>/g)].filter((m) => !/class="vh-stage|data-vh-phone|class="vh-meer"/.test(m[0]));
  ok(leeg.length === 0, `${naam}: geen lege elementen`, leeg.map((m) => m[0]).slice(0, 3));
  // tekstdieet: elke zichtbare alinea en elk zichtbaar feit blijft kort
  const z = zichtbaar(html);
  for (const p of z.matchAll(/<p class="vh-bio">([\s\S]*?)<\/p>/g)) {
    const t = plain(p[1]);
    const eenZin = D.splitBio(c.bio).kort === t && !/[.!?]\s+\S/.test(t);
    ok(t.length <= D.BIO_MAX || eenZin, `${naam}: alinea onder de kop ≤ ${D.BIO_MAX} tekens`, t.length);
  }
  const zichtFeiten = [...z.matchAll(/<span class="vh-feit-k">([^<]*)<\/span><span class="vh-feit-t">([^<]*)<\/span>/g)];
  for (const f of zichtFeiten) {
    const lim = f[1] === 'In het duo' || f[1] === 'Voor het duo' ? D.DUO_MAX : D.FEIT_MAX;
    ok(plain(f[2]).length <= lim, `${naam}: zichtbaar feit ${f[1]} ≤ ${lim} tekens`, plain(f[2]).length);
  }
  // wat je weglaat staat achter Meer, niets gaat verloren
  const all = plain(html);
  for (const f of feiten) ok(all.includes(plain(f.text)), `${naam}: feit ${f.label} staat nog ergens`);
  ok(all.includes(plain(c.bio.split(/(?<=[.!?])\s+/).pop())), `${naam}: de hele bio staat er nog (kort of achter Meer)`);
  if (/data-vh-meer/.test(html)) {
    ok(/aria-expanded="false"/.test(html) && /<div class="vh-meer" hidden>/.test(html), `${naam}: Meer staat standaard dicht`);
    ok(/data-key="ENTER"/.test(html) && buttonsWithoutGlyph(html).length === 0, `${naam}: Meer heeft zijn toets (ENTER) in de knop`);
  } else alleenKortGezien++;
  ok(looseHintBesideButton(html) === 0, `${naam}: geen losse toetshint naast een knop`);
  ok(html.includes('data-vh-phone') && html.includes('vh-klets'), `${naam}: de kaart "Klets maar" heeft zijn plek`);
}
ok(alleenKortGezien < iedereen.length, 'cast: de uitklapper komt voor');

// Meer open: de knop zegt Minder en het blok staat open
{
  const t = CHARACTERS.find((c) => c.id === 'tammo');
  const html = D.dossierHtml(t, { feiten: cardFacts('tammo', { met: true, done: new Set() }), meerOpen: true });
  ok(/aria-expanded="true"/.test(html) && />Minder</.test(html) && !/<div class="vh-meer" hidden>/.test(html), 'Meer: open toont Minder');
}

// 4. onbekend en Overig
{
  const h = D.unknownHtml('<span class="vh-mono">?</span>');
  ok(h.includes('data-locked') && h.includes('ontmoet je nog') && !h.includes('vh-feit'), 'onbekend: één mededeling, geen feiten');
  const o = D.otherHtml();
  ok(/<h3>Nieuws &amp; meldingen<\/h3>/.test(o) && /<svg/.test(o) && !/Overig/.test(plain(o)), 'Overig: kop "Nieuws & meldingen" met een envelop');
  const k = D.otherCardHtml({ nieuw: true });
  ok(/<svg/.test(k) && /Nieuws &amp; meldingen/.test(k) && !/…|\.\.\./.test(k) && !/<b>Overig<\/b>/.test(k) && /data-new/.test(k), 'Overig-kaart: envelop en duidelijke naam, geen "…"');
}

// 5. de bron: phone.js, verhaalui.js en de scrollbalk
{
  const ph = read('phone.js');
  ok(/dsButtonKey\(\{ label: id === OVERIG \? `Praat met \$\{c\.name\}` : 'Praat', toets: KNOP_TOETSEN\.bevestig/.test(ph) && ph.includes('data-ph-contact'), 'phone: de knop heet Praat en heeft zijn toets erin');
  const vu = read('verhaalui.js');
  ok(!/\.vh-held\b/.test(vu) && !/\bvh-hero-t\b.*vh-held/.test(vu), 'verhaalui: de oude, krimpende held-kaart is weg');
  ok(/#pause-menu \.vh-viewer > \*, #pause-menu \.vh-dossier > \* \{ flex: none; \}/.test(vu), 'verhaalui: kinderen van het paneel krimpen niet (flex: none)');
  ok(/\.vh-viewer, #pause-menu \.vh-left \{ scrollbar-width: auto; scrollbar-color: auto; \}/.test(vu) && /::-webkit-scrollbar-button[^}]*display: none/.test(vu), 'verhaalui: DS3-scrollbalk zonder pijltjes');
  ok(!/scrollbar-color: var\(--ds-scroll-duim\)/.test(vu.slice(vu.indexOf('.vh-viewer, #pause-menu .vh-left'))), 'verhaalui: geen scrollbar-color die de webkit-balk uitschakelt');
  ok(vu.includes('verbergLegeKlets') && vu.includes('data-vh-meer') && vu.includes('otherHtml()'), 'verhaalui: lege Klets-kaart weg, Meer werkt, Overig via de module');
  const css = read('pausemenu.css');
  const blok = css.slice(css.indexOf('#pause-menu .m-list, #pause-menu .m-pane, #pause-menu .td-list, #pause-menu .pm-samen-inner'), css.indexOf('::-webkit-scrollbar-button'));
  ok(/scrollbar-color: auto/.test(blok) && !/scrollbar-color: var/.test(blok), 'pausemenu.css: de lijsten en panelen houden de DS3-balk (scrollbar-color: auto)');
}

// 6. Cheats in het menu: alleen in een dev- of testrun, of nadat het verhaal ze heeft vrijgespeeld (22-11)
{
  const pm = read('pausemenu.js'), st = read('settings.js');
  ok(/export const cheatsInMenu = \(\) => cheatsVisible\(\{ dev: DEV \|\| !!FLAGS\.dev, actief: anyCheatOn\(\) \}\) \|\| cheatsOpen\(\);/.test(pm), 'cheats: zichtbaar in dev, bij een actieve cheat of na het vrijspelen in het verhaal');
  ok(pm.includes("filter((id) => id !== 'streken' || cheatsInMenu())"), 'cheats: de rail laat Cheats weg zonder dev of vrijspelen');
  ok(!/toonCheats/.test(st) && !pm.includes("toggle('toonCheats'"), 'cheats: de instelling en de schakelaar zijn weg (het verhaal speelt ze vrij)');
}

console.log(fails ? `${fails} van ${n} FOUT` : `personagedossier_test: ${n} controles ok`);
process.exitCode = fails ? 1 : 0;
