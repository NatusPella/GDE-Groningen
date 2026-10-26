// Samen spelen (#438): de pure kern van de openbare sessielijst (game/js/net/serverlijst.js) en de stappen in lobby.js.
// Geen netwerk: de aankondigingen zijn gewone teksten, de klok is een getal.
import assert from 'node:assert/strict';
import { LIJST, STANDAARD_NAAM, schoonNaam, verboden, codeer, decodeer, maakId, Serverlijst, maakAankondiger, filterEnSorteer, leeftijdTekst, leeftijdLang, SORTERINGEN } from '../game/js/net/serverlijst.js';
import { crc16 } from '../game/js/net/pairing.js';
import { makeRoom } from '../game/js/net/sigcrypto.js';
import { PROTO } from '../game/js/net/protocol.js';
import { createLobby, reduce, view, ROLES, ROUTES, OPENBAAR_TEXT, LIJST_TEXT } from '../game/js/lobby.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const T0 = 1_700_000_000_000;
const ROOM = 'K3J9D8F2MN';
const info = (o = {}) => ({ naam: 'Zomeravond', spelers: 2, max: 4, versie: '0.46.0', proto: PROTO, room: ROOM, id: 'abcd1234ef', nu: T0, ...o });

t('naam: leeg wordt de standaardnaam, spaties worden netjes, te lang en vreemde tekens niet', () => {
  assert.deepEqual(schoonNaam(''), { ok: true, naam: STANDAARD_NAAM });
  assert.deepEqual(schoonNaam('  Zomer   in Grunn '), { ok: true, naam: 'Zomer in Grunn' });
  assert.equal(schoonNaam('a'.repeat(24)).ok, true);
  assert.equal(schoonNaam('a'.repeat(25)).ok, false);
  assert.match(schoonNaam('a'.repeat(25)).reason, /24/);
  for (const slecht of ['<b>x</b>', 'naam\u0000', 'iemand@mail', 'a/b', 'a:b', '😀 spel']) assert.equal(schoonNaam(slecht).ok, false, slecht);
  assert.equal(schoonNaam('Café Zuid & Co (2)!').ok, true);
});
t('naam: geen adres, nummer of internetadres', () => {
  for (const slecht of ['84.12.34.56', '1.2.3.4 spel', 'bel 0612345678', 'www spel', 'http spel', 'spel.nl', 'mijnspel.com']) assert.equal(schoonNaam(slecht).ok, false, slecht);
  assert.equal(schoonNaam('Ronde 2024').ok, true, 'een jaartal mag');
});
t('naam: scheldwoorden, merken en namen van echte mensen vallen af, ook met cijfers, leestekens, accenten en letters dubbel', () => {
  for (const slecht of ['Kanker spel', 'k4nk3r', 'k.a.n.k.e.r', 'KAAANKER', 'fück', 'f u c k', 'Klootzak', 'Googlespel', 'Mc Donalds', 'MCDONALDS', 'Coca-Cola', 'Albert Heijn', 'Nazi', 'het Lidl-team', 'Pokémon', 'Trump', 'Rutte-fans', 'k u t', 'Kutjes', 'Lul']) {
    const r = schoonNaam(slecht); assert.equal(r.ok, false, slecht); assert.match(r.reason, /kan niet/);
  }
});
t('naam: gewone woorden die toevallig lijken blijven mogelijk (kutter, hoeve, assen, appel)', () => {
  for (const goed of ['Kutter Zoutkamp', 'Hoeve Noord', 'Assen centraal', 'Appeltaart', 'Eendracht', 'Zomer in Grunn', 'Tammo en Tessa', 'Zwarte Hoer Hoeve']) {
    // 'Zwarte Hoer Hoeve' bevat bewust het losse woord hoer: dat valt af
    assert.equal(schoonNaam(goed).ok, !/Hoer /.test(goed), goed);
  }
  assert.equal(verboden('Kutter'), false); assert.equal(verboden('Kut'), true); assert.equal(verboden('Kuttel'), false);
});

t('codeer en decodeer: rondreis zonder verlies', () => {
  const tekst = codeer(info());
  assert.equal(typeof tekst, 'string'); assert.ok(tekst.length < LIJST.maxBytes);
  const r = decodeer(tekst, T0);
  assert.equal(r.ok, true);
  assert.deepEqual(r.a, { naam: 'Zomeravond', spelers: 2, max: 4, versie: '0.46.0', proto: PROTO, room: ROOM, id: 'abcd1234ef', t: T0 });
});
t('de aankondiging bevat geen IP-adres, wachtwoord of persoonsgegeven: alleen de vaste velden', () => {
  const o = JSON.parse(codeer(info()));
  assert.deepEqual(Object.keys(o).sort(), ['c', 'g', 'i', 'k', 'm', 'n', 'p', 's', 't', 'v']);
  assert.ok(!/\d+\.\d+\.\d+\.\d+/.test(JSON.stringify(o)), 'geen IP-adres');
  assert.ok(!/GDE2|password|wachtwoord/i.test(JSON.stringify(o)));
});
t('codeer weigert slechte gegevens in plaats van iets half te sturen', () => {
  assert.equal(codeer(info({ naam: 'Kanker' })), null);
  assert.equal(codeer(info({ spelers: 0 })), null); assert.equal(codeer(info({ spelers: 5, max: 4 })), null); assert.equal(codeer(info({ max: 17 })), null);
  assert.equal(codeer(info({ room: 'GDE2-84.12.34.56:41000-AAAAAAAA-0000' })), null, 'de koppelcode van de IP-route hoort er nooit in');
  assert.equal(codeer(info({ room: 'abc' })), null); assert.equal(codeer(info({ id: 'X!' })), null); assert.equal(codeer(info({ versie: 'a b' })), null);
  assert.equal(codeer(info({ nu: NaN })), null);
});
t('decodeer: rommel, andere formaten, kapotte som, te groot, te oud of te nieuw', () => {
  const goed = codeer(info()), o = JSON.parse(goed);
  const mis = (x, reden) => { const r = decodeer(typeof x === 'string' ? x : JSON.stringify(x), T0); assert.equal(r.ok, false); assert.equal(r.reason, reden, JSON.stringify(x).slice(0, 60)); };
  mis('geen json', 'json'); mis('[]', 'json'); mis('null', 'json'); mis('12', 'json');
  mis({ ...o, v: 2 }, 'formaat');
  mis({ ...o, s: '2' }, 'velden'); mis({ ...o, s: 5 }, 'velden'); mis({ ...o, m: 1 }, 'velden'); mis({ ...o, p: -1 }, 'velden'); mis({ ...o, k: 'abc' }, 'velden'); mis({ ...o, i: 'ab' }, 'velden'); mis({ ...o, t: 'nu' }, 'velden');
  mis({ ...o, n: 'Andere naam' }, 'som'); mis({ ...o, s: 3 }, 'som'); mis({ ...o, k: 'K3J9D8F2MM' }, 'som');
  mis('x'.repeat(LIJST.maxBytes + 1), 'groot');
  assert.equal(decodeer(goed, T0 + LIJST.scheef + 1).reason, 'tijd'); assert.equal(decodeer(goed, T0 - LIJST.scheef - 1).reason, 'tijd');
  assert.equal(decodeer(goed, T0 + LIJST.scheef).ok, true);
  assert.equal(decodeer(undefined, T0).ok, false); assert.equal(decodeer(5, T0).ok, false);
});
t('decodeer: een niet-gefilterde naam met een goede som komt er niet doorheen (de host heeft zijn eigen filter overgeslagen)', () => {
  const o = { v: 1, n: 'Kanker', s: 1, m: 4, g: '0.46.0', p: PROTO, k: ROOM, i: 'abcd1234ef', t: T0 };
  o.c = crc16(`${o.v}|${o.n}|${o.s}|${o.m}|${o.g}|${o.p}|${o.k}|${o.i}|${o.t}`);
  assert.equal(decodeer(JSON.stringify(o), T0).reason, 'naam');
  const p = { ...o, n: ' Zomer' }; p.c = crc16(`${p.v}|${p.n}|${p.s}|${p.m}|${p.g}|${p.p}|${p.k}|${p.i}|${p.t}`);
  assert.equal(decodeer(JSON.stringify(p), T0).reason, 'naam', 'niet schoon genoeg: spatie voor de naam');
});

// ----- de lijst
const lijst = (o = {}) => { const k = { now: T0 }; const l = new Serverlijst({ nu: () => k.now, proto: PROTO, versie: '0.46.0', ...o }); l.klok = k; return l; };
const zend = (l, o, nu) => l.ontvang(codeer(info({ nu: nu ?? l.klok.now, ...o })), l.klok.now);

t('lijst: een aankondiging verschijnt, met aantal, max en versie; andere versie of vol is niet aan te sluiten', () => {
  const l = lijst();
  assert.deepEqual(zend(l, {}), { ok: true });
  zend(l, { id: 'anderversie', room: 'A2B3C4D5E6', versie: '0.45.0', naam: 'Oud' });
  zend(l, { id: 'andereproto', room: 'B2B3C4D5E6', proto: PROTO + 1, naam: 'Nieuw' });
  zend(l, { id: 'volvolvol1', room: 'C2B3C4D5E6', spelers: 4, naam: 'Vol' });
  const v = l.lijst();
  assert.equal(v.length, 4);
  const per = Object.fromEntries(v.map((x) => [x.naam, x]));
  assert.deepEqual([per.Zomeravond.kan, per.Zomeravond.anders, per.Zomeravond.vol], [true, false, false]);
  assert.deepEqual([per.Oud.kan, per.Oud.anders], [false, true]); assert.deepEqual([per.Nieuw.kan, per.Nieuw.anders], [false, true]);
  assert.deepEqual([per.Vol.kan, per.Vol.vol, per.Vol.anders], [false, true, false]);
  assert.equal(v[0].naam, 'Zomeravond', 'wat je kunt joinen staat bovenaan');
  assert.equal(per.Zomeravond.room, ROOM); assert.equal(per.Zomeravond.spelers, 2); assert.equal(per.Zomeravond.max, 4);
});
t('lijst: verloop na 45 s zonder nieuwe aankondiging; een nieuwe aankondiging verlengt', () => {
  const l = lijst(); zend(l, {});
  l.klok.now = T0 + 30000; assert.equal(l.lijst().length, 1);
  zend(l, {}, T0 + 15000); // de host kondigt na 15 s opnieuw aan (nieuwe tijdstempel); bij ons aangekomen op T0+30000
  l.klok.now = T0 + 30000 + 44000; assert.equal(l.lijst().length, 1, 'verlengd tot 45 s na de laatste');
  l.klok.now = T0 + 30000 + 45001; assert.equal(l.lijst().length, 0, 'weg');
  assert.equal(l.items.size, 0, 'ook uit het geheugen');
});
t('lijst: dezelfde aankondiging van meer brokers telt één keer en is geen misbruik', () => {
  const l = lijst(); const tekst = codeer(info());
  assert.equal(l.ontvang(tekst, T0).ok, true);
  for (let i = 0; i < 5; i++) { const r = l.ontvang(tekst, T0 + 20 * i); assert.deepEqual(r, { ok: false, reason: 'dubbel' }); }
  assert.deepEqual(l.afgewezen, {}); assert.equal(l.lijst().length, 1);
});
t('misbruik: een afzender die vaker dan om de 5 s aankondigt wordt genegeerd', () => {
  const l = lijst(); zend(l, { naam: 'Eerst' });
  const r = l.ontvang(codeer(info({ naam: 'Tweede', nu: T0 + 1000 })), T0 + 1000);
  assert.deepEqual(r, { ok: false, reason: 'te-snel' });
  assert.equal(l.lijst()[0].naam, 'Eerst');
  assert.equal(l.ontvang(codeer(info({ naam: 'Derde', nu: T0 + 5000 })), T0 + 5000).ok, true);
  assert.equal(l.lijst()[0].naam, 'Derde');
});
t('misbruik: een oudere tijdstempel (herhaling van een oud bericht) wordt genegeerd', () => {
  const l = lijst(); const oud = codeer(info({ nu: T0 })); const nieuw = codeer(info({ nu: T0 + 15000 }));
  l.ontvang(nieuw, T0 + 15000);
  assert.deepEqual(l.ontvang(oud, T0 + 16000), { ok: false, reason: 'oud' });
});
t('misbruik: dezelfde kamer onder steeds een ander id telt één keer', () => {
  const l = lijst();
  for (let i = 0; i < 30; i++) zend(l, { id: 'vervalser' + String(i).padStart(2, '0'), naam: 'Gratis spel' + i });
  assert.equal(l.lijst().length, 1);
});
t('misbruik: een vloed van nieuwe afzenders wordt afgekapt (60 per minuut); de lijst bewaart alles en de pagina toont 20', () => {
  const l = lijst(); let toe = 0, af = 0;
  for (let i = 0; i < 100; i++) {
    const r = zend(l, { id: 'vloed' + String(i).padStart(5, '0'), room: makeRoom((() => { let s = i + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; })()), naam: 'Spel ' + i });
    if (r.ok) toe++; else af++;
  }
  assert.equal(toe, 60); assert.equal(af, 40); assert.equal(l.afgewezen.vloed, 40);
  assert.equal(l.lijst().length, 60, 'de lijst zelf levert alles wat niet verlopen is');
  assert.equal(l.zoek().rijen.length, LIJST.maxGetoond, 'standaard één pagina');
  assert.equal(l.zoek(l.klok.now, { aantal: 40 }).rijen.length, 40);
  assert.equal(l.zoek(l.klok.now, { aantal: LIJST.maxVolgen }).rijen.length, 60);
  l.klok.now += 61000; assert.equal(l.items.size > 0, true);
  const r = zend(l, { id: 'laterlater1', room: 'Z2B3C4D5E6', naam: 'Later' }); assert.equal(r.ok, true, 'na een minuut kan er weer iemand bij');
});
t('misbruik: het aantal gevolgde afzenders is begrensd', () => {
  const l = lijst({ nieuwPerMinuut: 10000, maxVolgen: 50 });
  let vol = 0;
  for (let i = 0; i < 80; i++) { const r = zend(l, { id: 'x' + String(i).padStart(7, '0'), room: 'ABCDE' + String(23456 + i).slice(0, 5).replace(/[01]/g, '2'), naam: 'S' + i }); if (!r.ok) vol++; }
  assert.ok(l.items.size <= 50);
});
t('misbruik: rommel telt per reden mee en komt niet in de lijst', () => {
  const l = lijst();
  l.ontvang('rommel', T0); l.ontvang('{"v":1}', T0); l.ontvang(codeer(info({ id: 'toekomst001', nu: T0 + 10 * LIJST.scheef })), T0);
  assert.deepEqual(l.afgewezen, { json: 1, velden: 1, tijd: 1 }); assert.equal(l.lijst().length, 0);
});
t('melden: de sessie verdwijnt uit jouw lijst en komt niet terug bij de volgende aankondiging', () => {
  const l = lijst(); zend(l, {}); zend(l, { id: 'tweedetweede', room: 'D2B3C4D5E6', naam: 'Andere' });
  assert.deepEqual(l.meld('abcd1234ef'), ['abcd1234ef']);
  assert.deepEqual(l.lijst().map((x) => x.naam), ['Andere']);
  l.klok.now += 15000; zend(l, {}); assert.deepEqual(l.lijst().map((x) => x.naam), ['Andere'], 'blijft verborgen');
  assert.deepEqual(lijst({ verborgen: ['abcd1234ef'] }).lijst(), []);
});
// ----- de query (#464): leeftijd, zoeken, filters, sorteren en de pagina
const rij = (o = {}) => ({ id: 'aaaaaaaaaa', naam: 'Zomeravond', spelers: 2, max: 4, versie: '0.46.0', room: ROOM, anders: false, vol: false, kan: true, gezien: T0, ouderdom: 0, dim: false, ...o });
const rijen = () => [
  rij({ id: 'aaaaaaaaaa', naam: 'Zomeravond', spelers: 2, max: 4, ouderdom: 1000, gezien: T0 - 1000 }),
  rij({ id: 'bbbbbbbbbb', naam: 'Groningen Groen', spelers: 4, max: 4, vol: true, kan: false, ouderdom: 25000, gezien: T0 - 25000 }),
  rij({ id: 'cccccccccc', naam: 'Oud spel', spelers: 1, max: 4, anders: true, kan: false, ouderdom: 40000, gezien: T0 - 40000 }),
  rij({ id: 'dddddddddd', naam: 'Nachtrit', spelers: 3, max: 4, ouderdom: 10000, gezien: T0 - 10000 }),
];
t('leeftijd: net, seconden, minuten en uren, ook in gewone taal voor de schermlezer', () => {
  assert.deepEqual([0, 4999, 5000, 59000, 60000, 120000, 3600000].map(leeftijdTekst), ['net', 'net', '5 s', '59 s', '1 min', '2 min', '1 uur']);
  assert.deepEqual([0, 1000, 5000, 12000, 60000, 7200000].map(leeftijdLang), ['net gezien', 'net gezien', '5 seconden geleden', '12 seconden geleden', '1 minuut geleden', '2 uur geleden']);
  assert.equal(leeftijdTekst(undefined), ''); assert.equal(leeftijdLang(NaN), '');
});
t('lijst: elke regel heeft een leeftijd; de laatste 10 s voor verloop is gedimd', () => {
  const l = lijst(); zend(l, {});
  assert.equal(l.lijst(T0 + 12000)[0].ouderdom, 12000); assert.equal(l.lijst(T0 + 12000)[0].dim, false);
  assert.equal(l.lijst(T0 + 34999)[0].dim, false); assert.equal(l.lijst(T0 + 35000)[0].dim, true, 'de laatste 10 s');
  assert.equal(l.lijst(T0 + 45000).length, 1); assert.equal(l.lijst(T0 + 45001).length, 0);
});
t('zoeken: hoofdletterongevoelig, elk woord moet in de naam staan, leeg toont alles', () => {
  const q = (zoek) => filterEnSorteer(rijen(), { zoek }).rijen.map((x) => x.naam);
  assert.deepEqual(q(''), ['Zomeravond', 'Nachtrit', 'Groningen Groen', 'Oud spel'], 'standaard: aansluitbaar eerst, dan nieuwste');
  assert.deepEqual(q('ZOMER'), ['Zomeravond']);
  assert.deepEqual(q('gro'), ['Groningen Groen'], 'een stuk van een woord telt');
  assert.deepEqual(q('zomer avond'), ['Zomeravond'], 'beide woorden in dezelfde naam');
  assert.deepEqual(q('zomer gron'), [], 'elk woord moet in dezelfde regel staan');
  assert.deepEqual(q('  '), q(''), 'spaties alleen is leeg');
});
t('filters: aansluitbaar, favorieten, vers, verberg onbruikbaar, vrij en vol', () => {
  const namen = (o) => filterEnSorteer(rijen(), o).rijen.map((x) => x.naam);
  assert.deepEqual(namen({ alleenAansluitbaar: true }), ['Zomeravond', 'Nachtrit']);
  assert.deepEqual(namen({ favorieten: ['cccccccccc'], alleenFavorieten: true }), ['Oud spel']);
  assert.deepEqual(namen({ alleenVers: true }), ['Zomeravond', 'Nachtrit'], 'jonger dan 20 s');
  assert.deepEqual(namen({ verbergOnbruikbaar: true }), ['Zomeravond', 'Nachtrit']);
  assert.deepEqual(namen({ plek: 'vrij' }), ['Zomeravond', 'Nachtrit', 'Oud spel']);
  assert.deepEqual(namen({ plek: 'vol' }), ['Groningen Groen']);
  assert.deepEqual(namen({ alleenAansluitbaar: true, alleenVers: true }), ['Zomeravond', 'Nachtrit'], 'filters werken samen');
  assert.equal(filterEnSorteer(rijen(), { alleenAansluitbaar: true, plek: 'vol' }).totaal, 0);
});
t('sorteren: standaard, spelers, naam en laatst gezien; favorieten staan bovenaan', () => {
  const namen = (sortering, favorieten = []) => filterEnSorteer(rijen(), { sortering, favorieten }).rijen.map((x) => x.naam);
  assert.deepEqual(namen('standaard'), ['Zomeravond', 'Nachtrit', 'Groningen Groen', 'Oud spel']);
  assert.deepEqual(namen('spelers'), ['Groningen Groen', 'Nachtrit', 'Zomeravond', 'Oud spel']);
  assert.deepEqual(namen('naam'), ['Groningen Groen', 'Nachtrit', 'Oud spel', 'Zomeravond']);
  assert.deepEqual(namen('gezien'), ['Zomeravond', 'Nachtrit', 'Groningen Groen', 'Oud spel']);
  assert.deepEqual(namen('spelers', ['cccccccccc']), ['Oud spel', 'Groningen Groen', 'Nachtrit', 'Zomeravond']);
  assert.equal(filterEnSorteer(rijen(), { favorieten: ['cccccccccc'] }).rijen[0].naam, 'Oud spel', 'favoriet bovenaan');
  assert.equal(filterEnSorteer(rijen(), { sortering: 'onbekend' }).rijen[0].naam, 'Zomeravond', 'een onbekende sortering valt terug op standaard');
  assert.deepEqual(SORTERINGEN, ['standaard', 'spelers', 'naam', 'gezien']);
});
t('de pagina: meer dan 20 regels blijven bereikbaar, in stappen en met een eigen begin', () => {
  const veel = Array.from({ length: 57 }, (_, i) => rij({ id: 'x' + String(i).padStart(9, '0'), naam: 'Spel ' + String(i).padStart(2, '0'), ouderdom: i * 1000, gezien: T0 - i * 1000 }));
  const q = (o) => filterEnSorteer(veel, o);
  assert.deepEqual([q({}).rijen.length, q({}).totaal, q({}).alles], [57, 57, 57], 'de pure stap levert alles; de pagina kiest de UI');
  assert.equal(q({ aantal: LIJST.maxGetoond }).rijen.length, 20);
  assert.equal(q({ aantal: 40 }).rijen.length, 40);
  assert.equal(q({ aantal: LIJST.maxVolgen }).rijen.length, 57, 'alles wat er is');
  assert.deepEqual(q({ aantal: 20, vanaf: 40 }).rijen.map((x) => x.naam), ['Spel 40', 'Spel 41', 'Spel 42', 'Spel 43', 'Spel 44', 'Spel 45', 'Spel 46', 'Spel 47', 'Spel 48', 'Spel 49', 'Spel 50', 'Spel 51', 'Spel 52', 'Spel 53', 'Spel 54', 'Spel 55', 'Spel 56']);
  const leeg = filterEnSorteer([], {});
  assert.deepEqual([leeg.rijen, leeg.totaal, leeg.alles], [[], 0, 0], 'een lege lijst is geen fout');
  assert.equal(filterEnSorteer(veel, { alleenVers: true }).totaal, 21, 'de leeftijd telt per regel');
});
t('de host: maakAankondiger levert een nieuwe tekst met de stand van dat moment, en niets zonder kamer of spelers', () => {
  let sp = { spelers: 1, max: 4 }, room = ROOM, nu = T0;
  const maak = maakAankondiger({ naam: 'Zomeravond', versie: '0.46.0', proto: PROTO, hub: () => sp, room: () => room, id: maakId(() => 0.5), nu: () => nu });
  assert.equal(decodeer(maak(), T0).a.spelers, 1);
  sp = { spelers: 3, max: 8 }; nu += 15000;
  const a = decodeer(maak(), nu).a; assert.deepEqual([a.spelers, a.max, a.t], [3, 8, T0 + 15000]);
  room = null; assert.equal(maak(), null);
  room = ROOM; sp = null; assert.equal(maak(), null);
  assert.match(maakId(() => 0.5), /^[a-z0-9]{10}$/);
});

// ----- lobby.js: de stappen
const host = () => { let s = createLobby({ rtc: true, versie: '0.46.0' }); s = reduce(s, { t: 'kies', rol: ROLES.HOST }); s = reduce(s, { t: 'route', route: ROUTES.KAMER }); s = reduce(s, { t: 'akkoord' }); return reduce(s, { t: 'code', code: 'K3J9D-8F2MN' }); };
t('lobby: sessies zijn standaard privé en de lobby zelf maakt niets openbaar', () => {
  const s = host(); assert.equal(s.step, 'host-wacht'); assert.equal(s.openbaar, false);
  assert.ok(view(s).buttons.some((b) => b.act === 'openbaar'), 'er is een knop om openbaar te maken');
  assert.ok(!view(s).buttons.some((b) => b.act === 'privaat'));
});
t('lobby: Maak deze sessie openbaar vraagt eerst toestemming en zegt wat er openbaar wordt en hoe je het uitzet', () => {
  let s = reduce(host(), { t: 'openbaar-vraag' });
  assert.equal(s.step, 'openbaar-vraag'); assert.equal(s.openbaar, false, 'nog niet openbaar');
  const v = view(s); const tekst = v.lines.join(' ');
  for (const w of ['naam', 'aantal spelers', 'versie', 'kamercode', 'IP-adres', 'privé']) assert.match(tekst, new RegExp(w, 'i'), w);
  assert.ok(v.input, 'een tekstvak voor de naam'); assert.deepEqual(v.buttons.map((b) => b.act), ['openbaar-ja', 'openbaar-terug']);
  assert.equal(OPENBAAR_TEXT.length > 0, true);
});
t('lobby: akkoord met een geldige naam zet de sessie openbaar en gaat terug naar waar je was', () => {
  const s = reduce(reduce(host(), { t: 'openbaar-vraag' }), { t: 'openbaar-ja', naam: 'Zomeravond' });
  assert.equal(s.openbaar, true); assert.equal(s.openbaarNaam, 'Zomeravond'); assert.equal(s.step, 'host-wacht'); assert.equal(s.error, '');
  const v = view(s); assert.ok(v.buttons.some((b) => b.act === 'privaat') && !v.buttons.some((b) => b.act === 'openbaar'));
  assert.match(v.lines.join(' '), /openbaar/i);
  assert.equal(reduce(reduce(host(), { t: 'openbaar-vraag' }), { t: 'openbaar-ja', naam: '' }).openbaarNaam, STANDAARD_NAAM, 'leeg: standaardnaam');
});
t('lobby: een verboden naam blijft in de vraag, met een melding, en maakt niets openbaar', () => {
  const s = reduce(reduce(host(), { t: 'openbaar-vraag' }), { t: 'openbaar-ja', naam: 'Kanker' });
  assert.equal(s.openbaar, false); assert.equal(s.step, 'openbaar-vraag'); assert.match(s.error, /kan niet/);
});
t('lobby: Annuleren in de vraag laat de sessie privé; Weer privé maken zet het uit', () => {
  assert.equal(reduce(reduce(host(), { t: 'openbaar-vraag' }), { t: 'openbaar-terug' }).openbaar, false);
  const aan = reduce(reduce(host(), { t: 'openbaar-vraag' }), { t: 'openbaar-ja', naam: 'X spel' });
  const uit = reduce(aan, { t: 'privaat' }); assert.equal(uit.openbaar, false); assert.equal(uit.step, 'host-wacht');
});
t('lobby: openbaar geldt alleen voor deze sessie: Stoppen of een nieuwe lobby is weer privé', () => {
  const aan = reduce(reduce(host(), { t: 'openbaar-vraag' }), { t: 'openbaar-ja', naam: 'X spel' });
  assert.equal(reduce(aan, { t: 'terug' }).openbaar, false); assert.equal(reduce(aan, { t: 'verbreek' }).openbaar, false);
});
t('lobby: de IP-route kent de knop niet (daar staat een IP-adres in de code) en een gast ook niet', () => {
  let s = createLobby({ rtc: true, direct: true }); s = reduce(s, { t: 'kies', rol: ROLES.HOST }); s = reduce(s, { t: 'route', route: ROUTES.DIRECT }); s = reduce(s, { t: 'akkoord' }); s = reduce(s, { t: 'code', code: 'GDE2-84.12.34.56:41000-AAAAAAAA-0000' });
  assert.ok(!view(s).buttons.some((b) => b.act === 'openbaar'));
  assert.equal(reduce(s, { t: 'openbaar-vraag' }).step, 'host-wacht', 'ook als er toch om gevraagd wordt');
  const g = reduce(createLobby({ rtc: true }), { t: 'kies', rol: ROLES.GAST });
  assert.ok(!view(g).buttons.some((b) => b.act === 'openbaar')); assert.equal(reduce(g, { t: 'openbaar-vraag' }).step, 'gast-typt');
});
t('lobby: ook in de verbonden stand (er is nog plek) kan een host de sessie openbaar of privé maken', () => {
  let s = host(); s = reduce(s, { t: 'spelers', lijst: [{ slot: 0, naam: 'Tammo' }, { slot: 1, naam: 'Tessa' }], max: 4 });
  assert.equal(s.step, 'verbonden'); assert.ok(view(s).buttons.some((b) => b.act === 'openbaar'));
  const a = reduce(reduce(s, { t: 'openbaar-vraag' }), { t: 'openbaar-ja', naam: 'Met z\'n tweeën' });
  assert.equal(a.step, 'verbonden'); assert.equal(a.openbaar, true);
});
t('lobby: Openbare sessies: eerst toestemming (geen verbinding), dan de lijst, dan aansluiten via de gewone toestemming', () => {
  let s = createLobby({ rtc: true });
  assert.ok(view(s).buttons.some((b) => b.act === 'lijst'), 'in het beginscherm');
  s = reduce(s, { t: 'lijst-vraag' }); assert.equal(s.step, 'lijst-vraag');
  const tekst = view(s).lines.join(' '); for (const w of ['openbare servers', 'naam', 'kamercode', 'Melden']) assert.match(tekst, new RegExp(w), w);
  assert.deepEqual(view(s).buttons.map((b) => b.act), ['lijst-go', 'lijst-terug']);
  s = reduce(s, { t: 'lijst-go' }); assert.equal(s.step, 'lijst');
  assert.match(view(s).lines.join(' '), /Er zijn nu geen openbare sessies|zoeken/i);
  s = reduce(s, { t: 'lijst-data', lijst: [{ id: 'a', naam: 'Zomeravond', spelers: 2, max: 4, versie: '0.46.0', room: ROOM, anders: false, vol: false, kan: true }, { id: 'b', naam: 'Oud', spelers: 1, max: 4, versie: '0.45.0', room: 'A2B3C4D5E6', anders: true, vol: false, kan: false }] });
  const v = view(s); assert.equal(v.sessies.length, 2);
  assert.match(v.sessies[0].tekst, /Zomeravond.*2 van 4.*0\.46\.0/); assert.equal(v.sessies[0].act, 'sluit-0'); assert.equal(v.sessies[0].meld, 'meld-0'); assert.equal(v.sessies[0].kan, true);
  assert.match(v.sessies[1].tekst, /Andere versie/); assert.equal(v.sessies[1].kan, false);
  const k = reduce(s, { t: 'lijst-kies', i: 0 });
  assert.equal(k.step, 'toestemming'); assert.equal(k.rol, ROLES.GAST); assert.equal(k.route, ROUTES.KAMER); assert.equal(k.invoer.room, ROOM);
  assert.equal(reduce(s, { t: 'lijst-kies', i: 1 }).step, 'lijst', 'een andere versie sluit niet aan');
  assert.equal(reduce(s, { t: 'lijst-kies', i: 9 }).step, 'lijst');
  assert.equal(reduce(s, { t: 'lijst-terug' }).step, 'start');
  assert.equal(reduce(createLobby({ rtc: false }), { t: 'lijst-vraag' }).step, 'start', 'zonder directe verbinding kan het niet');
});
t('lobby: de query in de stand (#464): zoeken, filters, sorteren, sterren, Meer laden tot 200 en filters wissen', () => {
  let s = reduce(createLobby({ rtc: true, favorieten: ['aaaaaaaaaa'] }), { t: 'lijst-vraag' }); s = reduce(s, { t: 'lijst-go' });
  assert.equal(s.lijstFavorieten[0], 'aaaaaaaaaa', 'favorieten komen mee uit de opslag');
  s = reduce(s, { t: 'lijst-zoek', tekst: '  Zomer  ' }); assert.equal(s.lijstZoek, '  Zomer  ');
  s = reduce(s, { t: 'lijst-filter', filter: 'alleenAansluitbaar' }); assert.equal(s.lijstFilters.alleenAansluitbaar, true);
  s = reduce(s, { t: 'lijst-sorteer', sortering: 'naam' }); assert.equal(s.lijstSortering, 'naam');
  assert.equal(reduce(s, { t: 'lijst-sorteer', sortering: 'onzin' }).lijstSortering, 'naam', 'een onbekende sortering verandert niets');
  s = reduce(s, { t: 'lijst-plek', plek: 'vol' }); assert.equal(s.lijstFilters.plek, 'vol');
  s = reduce(s, { t: 'lijst-plek', plek: 'vol' }); assert.equal(s.lijstFilters.plek, 'alle', 'nog een keer drukken wist de keuze');
  s = reduce(s, { t: 'lijst-meer' }); assert.equal(s.lijstAantal, 40);
  for (let i = 0; i < 12; i++) s = reduce(s, { t: 'lijst-meer' }); assert.equal(s.lijstAantal, LIJST.maxVolgen, 'tot 200, niet verder');
  s = reduce(s, { t: 'lijst-ster', id: 'bbbbbbbbbb' }); s = reduce(s, { t: 'lijst-ster', id: 'aaaaaaaaaa' });
  assert.deepEqual(s.lijstFavorieten, ['bbbbbbbbbb'], 'een ster aan en weer uit');
  s = reduce(s, { t: 'lijst-filters-wissen' });
  assert.deepEqual([s.lijstZoek, s.lijstAantal, s.lijstFilters.alleenAansluitbaar, s.lijstFilters.plek], ['', LIJST.maxGetoond, false, 'alle']);
  // de gast die je was: de teller en de leeftijd staan op de regel, niet meer in één string gepropt
  s = reduce(s, { t: 'lijst-data', lijst: [{ id: 'bbbbbbbbbb', naam: 'Zomeravond', spelers: 2, max: 4, versie: '0.46.0', room: ROOM, anders: false, vol: false, kan: true, gezien: T0, ouderdom: 9000 }] });
  const v = view(s); assert.equal(v.lijstInfo.telling, '1 sessie'); assert.equal(v.sessies[0].leeftijd, '9 s');
  assert.equal(v.lijstInfo.sorteringen.length, SORTERINGEN.length); assert.equal(v.lijstInfo.filters.alleenAansluitbaar, false);
});
t('lobby: met keuze gast uit het hoofdmenu en lijst begint de lobby bij de toestemming voor de lijst en gaat terug naar Aansluiten', () => {
  let s = createLobby({ rtc: true, keuze: ROLES.GAST, lijst: true });
  assert.equal(s.step, 'lijst-vraag'); s = reduce(s, { t: 'lijst-terug' }); assert.equal(s.step, 'gast-typt');
  assert.ok(view(s).buttons.some((b) => b.act === 'lijst'), 'ook bij Aansluiten');
});
t('lobby: de kamercode invoeren werkt nog (geen bestaande stap veranderd)', () => {
  let s = reduce(createLobby({ rtc: true }), { t: 'kies', rol: ROLES.GAST });
  s = reduce(s, { t: 'invoer', text: 'K3J9D-8F2MN' }); assert.equal(s.step, 'toestemming'); assert.equal(s.invoer.room, ROOM);
  assert.equal(reduce(s, { t: 'akkoord' }).step, 'verbinden');
});
t('teksten: Nederlands, zonder "gastheer", en de lijst noemt wat openbaar is', () => {
  for (const x of [...OPENBAAR_TEXT, ...LIJST_TEXT]) { assert.ok(!/gastheer|\bhost\b/i.test(x), x); assert.ok(x.length > 20); }
  assert.match(OPENBAAR_TEXT.join(' '), /uitzetten|weer privé/i);
});

console.log(`net_serverlijst_test: ${n}/${n} ok`);
