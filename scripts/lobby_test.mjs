// Samen spelen (#95): uitnodigscherm als toestandsmachine (game/js/lobby.js).
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import * as G from '../game/js/coopgate.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';
import { makeCode } from '../game/js/net/pairing.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));
const APP = { direct: true, rtc: true };
const WEB = { direct: false, rtc: true };
const DIRECT_CODE = makeCode({ ip: '84.12.34.56', port: 41000, key: 'ABCDEFGH' });

t('start: twee keuzes, geen keuze per save of bij het starten', () => {
  const v = L.view(L.createLobby(APP));
  assert.deepEqual(v.buttons.map((b) => b.act), ['kies-host', 'kies-gast', 'diag']);
  assert.deepEqual(v.buttons.map((b) => b.label), ['Iemand uitnodigen', 'Code of adres invoeren', 'Verbinding testen']);
  assert.match(v.lines[0], /eigen voortgang/); assert.match(v.lines[0], /Tammo/);
});
t('methode: kamercode altijd, IP-adres alleen in de desktop-app', () => {
  assert.deepEqual(L.view(run(APP, { t: 'kies', rol: 'host' })).buttons.map((b) => b.act), ['route-kamer', 'route-direct', 'diag', 'terug']);
  assert.deepEqual(L.view(run(WEB, { t: 'kies', rol: 'host' })).buttons.map((b) => b.act), ['route-kamer', 'diag', 'terug']);
  const s = run(WEB, { t: 'kies', rol: 'host' }, { t: 'route', route: 'direct' });
  assert.equal(s.step, 'methode'); assert.match(s.error, /desktop-app/);
});
t('nooit stilzwijgend verbinden: de toestemming komt eerst, met de vaste tekst', () => {
  const s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' });
  assert.equal(s.step, 'toestemming');
  const v = L.view(s);
  assert.equal(v.lines[0], 'Voor samen spelen wordt je IP-adres gedeeld met je medespeler en worden openbare servers gebruikt om elkaar te vinden.');
  assert.deepEqual(v.buttons.map((b) => b.label), ['Akkoord en verbinden', 'Annuleren']);
  assert.match(L.view(run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'direct' })).lines[0], /geen servers van anderen/);
  assert.equal(L.reduce(s, { t: 'code', code: 'x' }).step, 'host-wacht', 'code zonder akkoord komt niet voor in de UI: akkoord vooraf');
  assert.equal(L.reduce(run(APP, { t: 'kies', rol: 'host' }), { t: 'akkoord' }).step, 'methode', 'akkoord werkt alleen op het toestemmingsscherm');
});
t('host-pad (kamercode): akkoord, code tonen, gast verbindt, Tessa naast je', () => {
  let s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' });
  assert.equal(s.step, 'host-maakt-code');
  s = L.reduce(s, { t: 'code', code: 'K3J9D-8F2MN' });
  const v = L.view(s); assert.equal(v.code, 'K3J9D-8F2MN'); assert.match(v.lines[0], /Tessa naast je/);
  s = L.reduce(s, { t: 'status', status: 'ok' });
  assert.equal(s.step, 'verbonden'); assert.match(L.view(s).lines[0], /Tessa/);
  assert.equal(L.view(s).buttons.at(-1).label, 'Iedereen stoppen');
});
t('host-pad (IP-adres): zonder UPnP de melding en de lokale code in beeld, niet dubbel', () => {
  const s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'direct' }, { t: 'akkoord' },
    { t: 'code', code: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', lanCode: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', note: 'Je router antwoordt niet op automatisch poorten openen.' });
  const lines = L.view(s).lines.join(' ');
  assert.match(lines, /router antwoordt niet/); assert.doesNotMatch(lines, /lokale code:/);
});
t('gast typt: kamercode of koppelcode wordt herkend, rommel krijgt een Nederlandse melding', () => {
  assert.deepEqual(L.classifyInput('k3j9d-8f2mn'), { ok: true, route: 'kamer', room: 'K3J9D8F2MN' });
  assert.equal(L.classifyInput(DIRECT_CODE).route, 'direct');
  assert.match(L.classifyInput('').reason, /niets/);
  assert.match(L.classifyInput('hallo wereld').reason, /geen kamercode/);
  assert.match(L.classifyInput('GDE2-1.2.3.4:41000-ABCDEFGH-0000').reason, /klopt niet/);
});
t('gast-pad: invoer, toestemming, akkoord, verbinden, verbonden', () => {
  let s = run(WEB, { t: 'kies', rol: 'gast' });
  assert.ok(L.view(s).input);
  s = L.reduce(s, { t: 'invoer', text: 'K3J9D-8F2MN' });
  assert.equal(s.step, 'toestemming'); assert.equal(s.invoer.room, 'K3J9D8F2MN');
  s = L.reduce(s, { t: 'akkoord' }); assert.equal(s.step, 'verbinden');
  s = L.reduce(s, { t: 'status', status: 'ok' });
  assert.equal(s.step, 'verbonden'); assert.equal(L.view(s).buttons[0].label, 'Spel verlaten');
  assert.match(L.view(s).lines.join(' '), /terug waar je was/);
});
t('gast in de browser kan geen adres van de directe route gebruiken', () => {
  const s = run(WEB, { t: 'kies', rol: 'gast' }, { t: 'invoer', text: DIRECT_CODE });
  assert.equal(s.step, 'gast-typt'); assert.match(s.error, /desktop-app/);
});
t('de laatste code staat alvast ingevuld; geweigerd toont de reden en terug gaat naar start', () => {
  let s = run({ ...APP, laatsteCode: 'K3J9D-8F2MN' }, { t: 'kies', rol: 'gast' });
  assert.equal(L.view(s).input.value, 'K3J9D-8F2MN');
  s = L.reduce(L.reduce(s, { t: 'verbinden' }), { t: 'status', status: 'geweigerd', reason: 'versie' });
  assert.equal(L.view(s).lines[0], REASON_TEXT.versie);
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'start');
});
t('wegvallen: spel pauzeert en wacht; host kan Alleen verder, gast Stoppen; hervatten per rol', () => {
  let h = run(APP, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' }, { t: 'status', status: 'lag' });
  assert.match(L.view(h).lines.join(' '), /haperde/);
  h = L.reduce(h, { t: 'status', status: 'lost' });
  assert.match(L.view(h).lines[0], /staat stil/);
  assert.deepEqual(L.view(h).buttons.map((b) => b.label), ['Opnieuw verbinden', 'Niet wachten', 'Verbinding testen']);
  assert.equal(L.reduce(h, { t: 'hervat' }).step, 'host-maakt-code');
  const g = run(APP, { t: 'kies', rol: 'gast' }, { t: 'status', status: 'lost' });
  assert.deepEqual(L.view(g).buttons.map((b) => b.label), ['Opnieuw verbinden', 'Stoppen', 'Verbinding testen']);
  assert.equal(L.reduce(g, { t: 'hervat' }).step, 'gast-typt');
});
t('het wacht-scherm tijdens het spel start direct op "verbroken"', () => {
  const s = L.createLobby({ direct: true, start: 'verbroken', rol: 'host' });
  assert.equal(L.view(s).buttons[1].label, 'Niet wachten');
});
t('uit een lopende sessie ga je alleen met verbreken; de ander weg zet alles terug', () => {
  const s = run(APP, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' });
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'verbonden');
  assert.equal(L.reduce(s, { t: 'verbreek' }).step, 'start');
  assert.equal(L.reduce(s, { t: 'status', status: 'weg' }).step, 'start');
});
t('elke stap heeft een weergave met Nederlandse knoppen', () => {
  for (const step of ['start', 'methode', 'toestemming', 'host-maakt-code', 'host-wacht', 'gast-typt', 'verbinden', 'verbonden', 'verbroken', 'geweigerd']) {
    const v = L.view({ ...L.createLobby(APP), step, route: 'kamer', rol: 'host', reason: 'tegels' });
    assert.ok(v.title && v.buttons.length >= 1, step);
    for (const b of v.buttons) assert.ok(/^[A-Z]/.test(b.label), b.label);
  }
});
t('statusbadge en lagbeleid (na 5 s wacht het spel)', () => {
  assert.deepEqual(L.statusBadge('ok', 0.05), { level: 'goed', text: 'Verbonden' });
  assert.equal(L.statusBadge('ok', 0.4).level, 'traag'); assert.equal(L.statusBadge('lost').text, 'Verbinding weg');
  assert.deepEqual(L.lagPolicy(0.1), { freezeRemote: false, badge: false, hold: false });
  assert.equal(L.lagPolicy(6).hold, true);
});
const LIJST = (n, extra = {}) => [{ slot: 0, char: 'tammo', naam: 'Tammo' }, { slot: 1, char: 'anita', naam: 'Tessa' }, { slot: 2, char: 'bram', naam: 'Bram' }, { slot: 3, char: 'lotte', naam: 'Lotte', ...extra }].slice(0, n);
t('N spelers: de host ziet de lijst, kan iedereen apart verwijderen en het maximum verhogen', () => {
  let s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' }, { t: 'code', code: 'K3J9D-8F2MN' });
  s = L.reduce(s, { t: 'spelers', lijst: LIJST(4), max: 4 });
  assert.equal(s.step, 'verbonden');
  const v = L.view(s);
  assert.match(v.lines[0], /Spelers \(4 van 4\): Tammo, Tessa, Bram, Lotte/);
  assert.deepEqual(v.buttons.filter((b) => b.act.startsWith('kick-')).map((b) => b.act), ['kick-1', 'kick-2', 'kick-3']);
  assert.deepEqual(v.buttons.filter((b) => b.act.startsWith('max-')).map((b) => b.act), ['max-8'], 'één limietknop, geen rij van vier (#434)');
  assert.equal(L.volgendeMax(4, 4), 8); assert.equal(L.volgendeMax(16, 3), 4); assert.equal(L.volgendeMax(8, 9), 12); assert.equal(L.volgendeMax(16, 16), 16);
  assert.ok(v.buttons.filter((b) => b.act.startsWith('kick-')).every((b) => /eruit zetten$/.test(b.label)));
  assert.equal(v.code, null, 'vol: de code hoeft niet meer getoond');
  const s6 = L.reduce(s, { t: 'spelers', lijst: LIJST(4), max: 8 });
  assert.equal(L.view(s6).code, 'K3J9D-8F2MN', 'er is weer plek: de code blijft zichtbaar');
  assert.match(L.view(s6).lines.join(' '), /nog plek/);
});
t('N spelers: iedereen weg terwijl de uitnodiging openstaat: terug naar wachten op de code', () => {
  let s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' }, { t: 'code', code: 'K3J9D-8F2MN' });
  s = L.reduce(s, { t: 'spelers', lijst: LIJST(3), max: 4 }); assert.equal(s.step, 'verbonden');
  s = L.reduce(s, { t: 'spelers', lijst: LIJST(1), max: 4 }); assert.equal(s.step, 'host-wacht');
});
t('N spelers: een verbroken speler staat in de lijst; de pauze noemt de naam', () => {
  const s = L.reduce(run(APP, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: LIJST(3, {}).map((p) => (p.slot === 2 ? { ...p, verbinding: 'lost' } : p)), max: 4 });
  assert.match(L.view(s).lines[0], /Bram · verbinding weg/);
  const h = L.reduce(L.reduce(s, { t: 'hold', slot: 2, naam: 'Bram' }), { t: 'status', status: 'lost' });
  assert.match(L.view(h).lines[0], /Bram is niet meer bereikbaar/); assert.match(L.view(h).lines[1], /verwijder je Bram/);
});
t('N spelers: de gast ziet de lijst en kiest een figuur voor plek 2 en hoger; alleen figuren uit de lijst', () => {
  let s = run(APP, { t: 'kies', rol: 'gast' });
  assert.equal(L.view(s).wensen.length, 14);
  assert.ok(!L.view(s).wensen.some((w) => w.id === 'tammo' || w.id === 'anita'), 'Tammo en Tessa zijn niet te kiezen');
  s = L.reduce(s, { t: 'wens', char: 'bram' }); assert.equal(s.wens, 'bram'); assert.equal(L.view(s).wensen.find((w) => w.id === 'bram').gekozen, true);
  assert.equal(L.reduce(s, { t: 'wens', char: 'tammo' }).wens, null);
  const v = L.reduce(L.reduce(s, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: LIJST(3), max: 4 });
  assert.match(L.view(v).lines[0], /Spelers \(3 van 4\)/); assert.equal(L.view(v).buttons.length, 1);
});
t('advies bij meer dan 4 spelers: prestaties, en voor de host uploadbandbreedte; niet bij 4 of minder', () => {
  const lijst = (n) => Array.from({ length: n }, (_, i) => ({ slot: i, char: i ? 'rik' : 'tammo', naam: i ? 'Rik' : 'Tammo' }));
  const host = (n) => L.view(L.reduce(run(APP, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: lijst(n), max: 16 })).lines.join(' ');
  assert.doesNotMatch(host(4), /trager/);
  assert.match(host(5), /Met 5 spelers kan het spel trager worden/); assert.match(host(5), /uploaden/);
  const gast = L.view(L.reduce(run(APP, { t: 'kies', rol: 'gast' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: lijst(9), max: 16 })).lines.join(' ');
  assert.match(gast, /Met 9 spelers/); assert.doesNotMatch(gast, /uploaden/);
});
t('het maximum is standaard 8 en blijft tussen 4 en 16', () => {
  assert.equal(L.createLobby(APP).max, 8);
  const s = L.reduce(L.createLobby(APP), { t: 'spelers', lijst: [], max: 99 }); assert.equal(s.max, 16);
  assert.equal(L.reduce(L.createLobby(APP), { t: 'spelers', lijst: [], max: 2 }).max, 4);
});
t('Spel starten: uit zolang je alleen bent, aan met minstens twee spelers; een gast leest dat hij wacht', () => {
  const lijst = (n) => Array.from({ length: n }, (_, i) => ({ slot: i, char: i ? 'rik' : 'tammo', naam: i ? 'Rik' : 'Tammo', verbinding: 'ok' }));
  const GATE = { ...APP, startGate: true };
  const wacht = L.view(run(GATE, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' }, { t: 'code', code: 'ABC' }));
  const startWacht = wacht.buttons.find((b) => b.act === 'start-spel');
  assert.ok(startWacht && startWacht.disabled, 'alleen jij: Spel starten staat uit'); assert.match(wacht.lines.join(' '), /minstens twee spelers/);
  const host = (n) => L.view(L.reduce(run(GATE, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: lijst(n), max: 8 }));
  assert.equal(host(1).buttons.find((b) => b.act === 'start-spel').disabled, true);
  assert.equal(host(2).buttons.find((b) => b.act === 'start-spel').disabled, false);
  const verloren = L.view(L.reduce(run(GATE, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: lijst(2).map((p) => ({ ...p, verbinding: p.slot ? 'lost' : 'ok' })), max: 8 }));
  assert.equal(verloren.buttons.find((b) => b.act === 'start-spel').disabled, true, 'een weggevallen speler telt niet mee');
  const gast = L.view(L.reduce(run(GATE, { t: 'kies', rol: 'gast' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: lijst(2), max: 8 }));
  assert.match(gast.lines.join(' '), /Wacht tot Tammo het spel start/); assert.match(gast.lines.join(' '), /Tammo heeft het spel geopend/); assert.doesNotMatch(gast.lines.join(' '), /gastheer|gastgever/i); assert.equal(gast.buttons.some((b) => b.act === 'start-spel'), false, 'een gast heeft geen Spel starten');
  const open = L.view(L.reduce(L.reduce(run(GATE, { t: 'kies', rol: 'gast' }, { t: 'status', status: 'ok' }), { t: 'spelers', lijst: lijst(2), max: 8 }), { t: 'gate', aan: false }));
  assert.doesNotMatch(open.lines.join(' '), /Wacht tot/, 'na het starten staat de wachttekst er niet meer');
});
t('jouw figuur: plek 1 is Tessa (uitleg als je iets anders koos), plek 2 en hoger krijgt de gewenste figuur', () => {
  const lijst = (chars) => chars.map((c, i) => ({ slot: i, char: c, naam: { tammo: 'Tammo', anita: 'Tessa', bram: 'Bram', rik: 'Rik' }[c] }));
  const gast = (wens, chars, slot) => L.view(L.reduce(L.reduce(run(APP, { t: 'kies', rol: 'gast' }, ...(wens ? [{ t: 'wens', char: wens }] : []), { t: 'status', status: 'ok', partner: { slot } }), { t: 'spelers', lijst: lijst(chars), max: 8 }), { t: 'status', status: 'ok', partner: { slot } })).lines.join(' ');
  assert.match(gast(null, ['tammo', 'anita'], 1), /Jij speelt Tessa\./);
  const misleid = gast('bram', ['tammo', 'anita'], 1);
  assert.match(misleid, /Je koos Bram, maar als eerste gast speel je Tessa/); assert.match(misleid, /derde of later/);
  assert.match(gast('bram', ['tammo', 'anita', 'bram'], 2), /Jij speelt Bram\./); assert.doesNotMatch(gast('bram', ['tammo', 'anita', 'bram'], 2), /Je koos/);
  assert.match(gast('bram', ['tammo', 'anita', 'bram', 'rik'], 3), /Je koos Bram, maar die was al bezet\. Jij speelt Rik/);
  assert.match(L.view(run(APP, { t: 'kies', rol: 'gast' })).lines.join(' '), /eerste gast speelt altijd Tessa/);
});
t('hekBericht: een gast die midden in een spel aansluit bij een gastheer in de wachtkamer wacht ook (en gaat mee open)', () => {
  const w = {};
  G.setGate(false);
  assert.equal(G.hekBericht(w, true), true); assert.equal(G.gateOn(), true); assert.equal(w.coopHekMenu, true, 'main.js opent het menu');
  w.coopHekMenu = false; assert.equal(G.hekBericht(w, true), true); assert.equal(w.coopHekMenu, false, 'al in de wachtkamer: niet nogmaals openen');
  assert.equal(G.hekBericht(w, false), false); assert.equal(G.gateOn(), false); assert.equal(w.coopHek, false);
  assert.equal(G.hekBericht(w, false), false, 'geen hek meer: er verandert niets');
});
console.log(`lobby_test: ${n}/${n} ok`);
