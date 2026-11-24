// #1169: het niveau van de wereld is zichtbaar in de lobby, de sessielijst en het sessiepaneel, en in Opgeslagen spellen als klein label.
// Protocol-compat: het veld is optioneel; een oud bericht zonder veld blijft geldig, een nieuw bericht met veld wordt door een oude lezer genegeerd.
//   node scripts/difficulty_lobby_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const L = await import('../game/js/net/serverlijst.js');
const D = await import('../game/js/difficulty.js');
const Lobby = await import('../game/js/lobby.js');
const SS = await import('../game/js/saveslots.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };

const KEY = 'A'.repeat(86);
const nu = 1_700_000_000_000;
const basis = { naam: 'Zomerrit', spelers: 2, max: 4, versie: '0.65.0', proto: 2, id: 'abcdefghij', hostKey: KEY, nu };

// labels gelijk aan difficulty.js
ok(Object.keys(L.NIVEAU_LABEL).join() === D.DIFFICULTY_MODES.join() && D.DIFFICULTY_MODES.every((m) => L.NIVEAU_LABEL[m] === D.DIFFICULTY[m].label), 'de labels van het net zijn die van difficulty.js');
ok(L.wereldTekst('standaard') === 'Wereld: Standaard' && L.wereldTekst('uitdagend') === 'Wereld: Uitdagend' && L.wereldTekst('onzin') === '' && L.wereldTekst(undefined) === '', 'wereldTekst: "Wereld: Standaard", onbekend of ontbrekend is leeg');

// codeer en decodeer
const nieuw = L.codeer({ ...basis, niveau: 'uitdagend' });
const oudTekst = L.codeer(basis);
ok(typeof nieuw === 'string' && JSON.parse(nieuw).d === 'uitdagend', 'een nieuw bericht draagt het niveau (veld d)');
ok(typeof oudTekst === 'string' && !('d' in JSON.parse(oudTekst)), 'zonder niveau blijft het bericht zoals vóór dit veld');
ok(L.decodeer(nieuw, nu).ok && L.decodeer(nieuw, nu).a.niveau === 'uitdagend', 'decodeer leest het niveau');
ok(L.decodeer(oudTekst, nu).ok && L.decodeer(oudTekst, nu).a.niveau === null, 'een oud bericht zonder veld is geldig en heeft geen niveau');
ok(L.codeer({ ...basis, niveau: 'zwaar' }) && !('d' in JSON.parse(L.codeer({ ...basis, niveau: 'zwaar' }))), 'een onbekend niveau wordt niet verstuurd');
{
  const o = JSON.parse(nieuw); o.d = '<script>';
  const r = L.decodeer(JSON.stringify(o), nu);
  ok(r.ok && r.a.niveau === null, 'een vreemde waarde van de lijn wordt genegeerd, het bericht blijft geldig');
  o.d = { x: 1 };
  ok(L.decodeer(JSON.stringify(o), nu).a.niveau === null, 'ook een object of getal telt niet');
}
// een oude lezer: dezelfde somformule over de oude velden; het veld d hoort er niet in
{
  const o = JSON.parse(nieuw);
  const oudeSom = (a) => `${a.v}|${a.n}|${a.s}|${a.m}|${a.g}|${a.p}|${a.i}|${a.h}|${a.t}`;
  const { d, ...zonder } = o;
  ok(oudeSom(o) === oudeSom(zonder), 'de somcontrole van een oude client kijkt niet naar d');
  ok(L.decodeer(JSON.stringify(zonder), nu).ok, 'het bericht zonder d (zoals een oude client het ziet) is geldig');
  ok(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(nieuw) && !/ip|wachtwoord|code/i.test(Object.keys(o).join()), 'geen IP-adres of persoonsgegeven in het bericht');
  ok(nieuw.length <= L.LIJST.maxBytes, 'het bericht blijft binnen de maximale lengte');
}
// aankondiger met een functie die het niveau leest
{
  let nivo = 'standaard';
  const maak = L.maakAankondiger({ naam: 'Zomerrit', versie: '0.65.0', proto: 2, id: 'abcdefghij', hub: () => ({ spelers: 1, max: 4, hostKey: KEY }), niveau: () => nivo, nu: () => nu });
  ok(JSON.parse(maak()).d === 'standaard', 'de aankondiger leest het niveau van dat moment');
  nivo = 'ontspannen';
  ok(JSON.parse(maak()).d === 'ontspannen', 'en volgt een wijziging');
  const zonderNiveau = L.maakAankondiger({ naam: 'Zomerrit', versie: '0.65.0', proto: 2, id: 'abcdefghij', hub: () => ({ spelers: 1, max: 4, hostKey: KEY }), nu: () => nu });
  ok(!('d' in JSON.parse(zonderNiveau())), 'zonder niveau (een oudere aanroeper) geen veld');
}
// de lijst bij de speler
{
  const lijst = new L.Serverlijst({ nu: () => nu, proto: 2, versie: '0.65.0' });
  ok(lijst.ontvang(nieuw, nu).ok, 'de lijst neemt het bericht aan');
  const o2 = L.codeer({ ...basis, id: 'zzzzzzzzzz', naam: 'Zonder veld' });
  ok(lijst.ontvang(o2, nu).ok, 'en een bericht van een oude host');
  const rijen = lijst.lijst(nu);
  const a = rijen.find((r) => r.id === 'abcdefghij'), b = rijen.find((r) => r.id === 'zzzzzzzzzz');
  ok(a && a.niveau === 'uitdagend' && b && b.niveau === null, 'de rijen hebben het niveau of null');
}

// de weergave: lobby en sessielijst
{
  const s0 = Lobby.createLobby({ direct: false, rtc: true, laatsteCode: '', versie: '0.65.0', lijst: true });
  const st = { ...s0, step: 'host-wacht', rol: Lobby.ROLES.HOST, route: Lobby.ROUTES.KAMER, code: 'ABC-DEF', wereld: 'standaard', lijst: [] };
  const v = Lobby.view(st);
  ok(v.lines.some((l) => /^Wereld: Standaard\./.test(l)), 'de wachtkamer zegt "Wereld: Standaard"', v.lines);
  const v2 = Lobby.view({ ...st, wereld: '' });
  ok(!v2.lines.some((l) => /^Wereld:/.test(l)), 'zonder niveau (een oude host) geen regel');
  const gast = Lobby.view({ ...st, step: 'verbonden', rol: Lobby.ROLES.GAST, wereld: 'uitdagend', spelers: [], max: 4 });
  ok(gast.lines.some((l) => /^Wereld: Uitdagend\./.test(l)), 'een gast ziet het niveau van de wereld na het meedoen');
  const lijstView = Lobby.view({ ...s0, step: 'lijst', rol: Lobby.ROLES.GAST, lijst: [
    { id: 'abcdefghij', naam: 'Zomerrit', spelers: 2, max: 4, versie: '0.65.0', anders: false, vol: false, kan: true, ouderdom: 1000, niveau: 'uitdagend', hostKey: KEY },
    { id: 'zzzzzzzzzz', naam: 'Oud', spelers: 1, max: 4, versie: '0.65.0', anders: false, vol: false, kan: true, ouderdom: 1000, niveau: null, hostKey: KEY },
  ] });
  const t = (lijstView.sessies || []).map((x) => x.tekst);
  ok(t.some((x) => /^Zomerrit · 2 van 4 spelers · versie 0\.65\.0$/.test(x)), 'de openbare sessielijst toont het niveau niet (constitution 4: alleen naam, aantal spelers en versie)', t);
  ok(t.some((x) => /^Oud · 1 van 4 spelers · versie 0\.65\.0$/.test(x)), 'een rij zonder niveau blijft zoals ze was', t);
}

// het welkom en de hub
{
  const hub = read('game/js/net/hub.js'), net = read('game/js/coopnet.js'), ui = read('game/js/lobbyui.js');
  ok(/lijst: lijstEvent\(hub\.roster, WELKOM_BUDGET\)\.lijst, \.\.\.\(typeof hub\.cfg\.niveau === 'function' \? \{ niveau: schoonNiveau\(hub\.cfg\.niveau\(\)\) \} : null\)/.test(hub), 'het welkom van de hub draagt het niveau, alleen als de hub het kent');
  ok(/niveau: \(\) => getDifficultyLevel\(\)/.test(net), 'coopnet.js geeft de hub het niveau van de wereld');
  ok(!/maakAankondiger\(\{[^\n]*\n?[^\n]*niveau: \(\) => getDifficultyLevel\(\)/.test(ui) && /session\.welcome\.niveau/.test(ui), 'lobbyui.js geeft het niveau niet mee in de openbare aankondiging (constitution 4) en leest het welkom');
  ok(!/niveau/.test(read('game/js/net/protocol.js')) && /export const PROTO = 2;/.test(read('game/js/net/protocol.js')), 'PROTO blijft 2: een oude en nieuwe client blijven elkaar accepteren');
}

// Opgeslagen spellen
{
  const base = { savedAt: 1, money: 5, missions: { completed: [] } };
  ok(SS.summarize({ ...base, moeilijkheid: { level: 'uitdagend', custom: {} } }).niveau === 'Uitdagend', 'Opgeslagen spellen: het niveau van de save');
  ok(SS.summarize({ ...base, moeilijkheid: { level: 'standaard', custom: { income: 1.25 } } }).niveau === 'Standaard · aangepast', 'met "aangepast" als er opties afwijken');
  ok(SS.summarize(base).niveau === '', 'een oude save zonder veld toont niets');
  ok(SS.summarize({ ...base, moeilijkheid: 'kapot' }).niveau === '', 'een kapot veld toont niets');
  ok(/sm\.niveau && !bad \? `<span class="sp-hulp"/.test(read('game/js/saveslotsui.js')), 'het niveau staat als klein label op de kaart (Spel-UI 24-11)');
}

console.log(fails ? `${fails}/${n} FAIL` : `difficulty_lobby_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
