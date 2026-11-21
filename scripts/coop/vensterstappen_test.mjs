// De venstertests van #1061 zonder Electron: de keuring (vensterstappen_check.mjs) krijgt gesimuleerde logboeken van een goede en een kapotte run, en de stappen in
// coop.page.js en de suites in testbank.mjs worden tegen de bron gecontroleerd (de haken waar de stappen op leunen bestaan echt).
//   node scripts/coop/vensterstappen_test.mjs
import fs from 'node:fs';
import { keurFatbikes, keurPenalty, keurDuif, keurBord, keurFilmpjeWissel, keurBesloten, keurVenster, VENSTER_SUITES } from './vensterstappen_check.mjs';

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const src = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const page = src('./coop.page.js'), bank = src('./testbank.mjs');
const game = (f) => src('../../game/js/' + f);

// ---- een goede run
const goed = {
  host: [
    { type: 'fatbikes-stand', opdracht: { actief: true, label: 'Fatbikes' }, hud: { ontweken: 3, geraakt: 0, grens: 2 } },
    { type: 'pen-uitnodiging', wed: true, gasten: 2 }, { type: 'pen-reeks', wie: 'host', genomen: 5, goals: 3 },
    { type: 'pen-uitslag', rijen: [{ naam: 'Tammo' }, { naam: 'Anita' }, { naam: 'Gast' }], jij: 1, geld: 10 },
    { type: 'duif-host', gestart: true, actief: true, gids: true }, { type: 'duif-host-na', actief: false },
    { type: 'bord-host', key: 'placesign@10,20', soort: 'placesign', gebroken: true, nu: true },
    { type: 'wissel-tijdens-filmpje', ok: true, actief: true, weiger: { ok: false, tekst: 'Wacht tot het filmpje voorbij is.' } },
    { type: 'wissel-na-filmpje', actief: false, ok: true, rol: 'host' },
    { type: 'besloten-hub', venster: [1280, 720], kaarten: [{ label: 'Meedoen', binnen: true }, { label: 'Zelf een sessie openen', binnen: true }, { label: 'Besloten spelen', binnen: true }] },
  ],
  gast: [
    { type: 'fatbikes-stand', opdracht: { actief: true }, hud: { ontweken: 1, geraakt: 1, grens: 2 } },
    { type: 'pen-uitnodiging-gast' }, { type: 'pen-reeks', wie: 'gast', genomen: 5, goals: 5 }, { type: 'pen-uitslag-gast', uitslag: { rijen: 3 }, geldErbij: 40 },
    { type: 'duif-gast', gids: false, pigeonMode: false },
    { type: 'bord-gast', borden: [['placesign@10,20', true]] },
    { type: 'wissel-j' },
  ],
  gast2: [
    { type: 'fatbikes-stand', opdracht: null, hud: { ontweken: 0, geraakt: 0, grens: 2 } },
    { type: 'pen-uitnodiging-gast' }, { type: 'pen-reeks', wie: 'gast2', genomen: 5, goals: 0 }, { type: 'pen-uitslag-gast', uitslag: { rijen: 3 }, geldErbij: 0 },
    { type: 'duif-gast', gids: false, pigeonMode: false },
    { type: 'bord-gast', borden: [['placesign@10,20', true]] },
  ],
};
const kloon = (o) => JSON.parse(JSON.stringify(o));
for (const [naam, k] of Object.entries(VENSTER_SUITES)) check(`goede run: ${naam} geeft nul fouten`, k(goed).length === 0, k(goed).join(' | '));
check('suite venster: nul fouten bij een goede run', keurVenster('venster', goed).length === 0);
check('onbekende suite: niets te keuren', keurVenster('basis', goed).length === 0);

// ---- kapotte runs: elke fout wordt gezien
const stuk = (mut, keur) => { const E = kloon(goed); mut(E); return keur(E); };
check('fatbikes: geen opdracht bij de host', stuk((E) => { E.host[0].opdracht = null; }, keurFatbikes).length > 0);
check('fatbikes: een gast die de groepsopdracht nooit ziet', stuk((E) => { E.gast[0].opdracht = null; E.gast[0].hud = null; }, keurFatbikes).length > 0);
check('fatbikes: treffers boven de grens', stuk((E) => { E.gast[0].hud.geraakt = 3; }, keurFatbikes).length > 0);
check('fatbikes: de spelbot faalde', stuk((E) => { E.host.push({ type: 'fatbikes-bot-fout', msg: 'x' }); }, keurFatbikes).length > 0);
check('penaltyserie: een gast schoot vier in plaats van vijf', stuk((E) => { E.gast.find((e) => e.type === 'pen-reeks').genomen = 4; }, keurPenalty).length > 0);
check('penaltyserie: de ranglijst mist een speler', stuk((E) => { E.host.find((e) => e.type === 'pen-uitslag').rijen.pop(); }, keurPenalty).length > 0);
check('penaltyserie: een gast krijgt geen uitslag', stuk((E) => { E.gast2.find((e) => e.type === 'pen-uitslag-gast').uitslag = null; }, keurPenalty).length > 0);
check('penaltyserie: een gast verliest geld', stuk((E) => { E.gast.find((e) => e.type === 'pen-uitslag-gast').geldErbij = -5; }, keurPenalty).length > 0);
check('penaltyserie: geen uitnodiging', stuk((E) => { E.host.find((e) => e.type === 'pen-uitnodiging').wed = false; }, keurPenalty).length > 0);
check('duivenspot: een gast ziet de gids', stuk((E) => { E.gast.find((e) => e.type === 'duif-gast').gids = true; }, keurDuif).length > 0);
check('duivenspot: de host komt niet in de duifmodus', stuk((E) => { E.host.find((e) => e.type === 'duif-host').actief = false; }, keurDuif).length > 0);
check('plaatsbord: een gast mist het bord', stuk((E) => { E.gast2.find((e) => e.type === 'bord-gast').borden = []; }, keurBord).length > 0);
check('plaatsbord: het bord staat in de lijst maar is niet weg', stuk((E) => { E.gast.find((e) => e.type === 'bord-gast').borden = [['placesign@10,20', false]]; }, keurBord).length > 0);
check('plaatsbord: een lamp is geen bord', stuk((E) => { E.host.find((e) => e.type === 'bord-host').soort = 'lamp'; }, keurBord).length > 0);
check('filmpjewissel: de overdracht werd niet geweigerd', stuk((E) => { E.host.find((e) => e.type === 'wissel-tijdens-filmpje').weiger = { ok: true }; }, keurFilmpjeWissel).length > 0);
check('filmpjewissel: andere weigertekst', stuk((E) => { E.host.find((e) => e.type === 'wissel-tijdens-filmpje').weiger.tekst = 'Nee.'; }, keurFilmpjeWissel).length > 0);
check('filmpjewissel: het filmpje liep niet (de test bewijst niets)', stuk((E) => { E.host.find((e) => e.type === 'wissel-tijdens-filmpje').actief = false; }, keurFilmpjeWissel).length > 0);
check('filmpjewissel: de overdracht na het filmpje mislukt', stuk((E) => { E.host.find((e) => e.type === 'wissel-na-filmpje').ok = false; }, keurFilmpjeWissel).length > 0);
check('filmpjewissel: de gast kreeg geen vraag', stuk((E) => { E.gast = []; E.gast.push({ type: 'x' }); }, keurFilmpjeWissel).length > 0);
check('besloten: een afgekapte titel', stuk((E) => { E.host.find((e) => e.type === 'besloten-hub').kaarten[2].titelAfgekapt = true; }, keurBesloten).length > 0);
check('besloten: een kaart buiten het scherm', stuk((E) => { E.host.find((e) => e.type === 'besloten-hub').kaarten[0].binnen = false; }, keurBesloten).length > 0);
check('besloten: nog in een sessie telt als niet in beeld', stuk((E) => { E.host.push({ type: 'besloten-in-sessie' }); }, keurBesloten).length > 0);
check('lege logboeken geven fouten (geen stil groen)', ['fatbikes', 'penaltyserie', 'duivenspot', 'plaatsbord', 'filmpjewissel', 'besloten'].every((k) => VENSTER_SUITES[k]({ host: [] }).length > 0));

// ---- de bron: stappen, suites en de haken waar ze op leunen
for (const f of ['fatbikes', 'penaltyserie', 'duivenspot', 'plaatsbord', 'filmpjewissel', 'besloten']) {
  check(`coop.page.js heeft de stap ${f}`, new RegExp(`async ${f}\\(`).test(page));
  check(`testbank.mjs heeft de suite ${f}`, new RegExp(`\\n  ${f}: `).test(bank));
}
check('testbank.mjs heeft de suite venster en keurt met vensterstappen_check', /\n  venster: /.test(bank) && /keurVenster\(SUITE, E\)/.test(bank));
check('filmpjewissel loopt over de route kamer (de overdracht heeft de nep-tracker nodig)', /SUITE === 'filmpjewissel'[^\n]*'kamer'/.test(bank));
check('de debug-handvatten van de penaltyserie bestaan', /window\.__penalty = \{[\s\S]*spot:[\s\S]*state:[\s\S]*aim:[\s\S]*shoot:/.test(game('penalty.js')));
check('startPigeonMode, isPigeonActive en stopPigeonMode worden geexporteerd', /export function startPigeonMode/.test(game('pigeonmode.js')) && /export function isPigeonActive/.test(game('pigeonmode.js')) && /export function stopPigeonMode/.test(game('pigeonmode.js')));
check('getPigeonSpotsForRender bestaat en de gids heeft id pigeon-guide', /export function getPigeonSpotsForRender/.test(game('pigeonspots.js')) && /root\.id = 'pigeon-guide'/.test(game('pigeonguide.js')));
check('biedOver weigert met de filmpje-tekst', /export function biedOver/.test(game('coophostwisselnet.js')) && /Wacht tot het filmpje voorbij is/.test(game('coophostwisselnet.js')));
check('breakPropByKey, propsInRadius en isPropBroken bestaan', ['breakPropByKey', 'propsInRadius', 'isPropBroken'].every((x) => new RegExp(`export function ${x}`).test(game('breakables.js'))));
check('de hub heeft de keuzekaarten waar de stap op selecteert', /pm-hub-keuze/.test(game('samenhubui.js')) && /pm-hub-kt/.test(game('samenhubui.js')) && /data-keuze="\$\{k\.act\}"/.test(game('samenhubui.js')));
check('de ontweek-regel van het HUD bestaat zoals de stap hem leest', /Ontweken: \$\{p\.dodged\} · Geraakt \$\{p\.hits\}\/\$\{DODGE\.hitLimit\}/.test(game('fatbikedodge.js')) && page.includes('Ontweken: (\\d+)[^\\n]*?Geraakt (\\d+)\\/(\\d+)'));
check('de stappen schrijven niet naar echte opslag', !/localStorage\.setItem/.test(page.slice(page.indexOf('async fatbikes('), page.indexOf('async opslagcheck('))));

console.log(`vensterstappen: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
