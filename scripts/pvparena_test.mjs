// Samen spelen (#454): de PvP-minigame (turf shooter) — de pure regels in game/js/pvparena.js. Punten per treffer, zones,
// respawn, de rondeklok, de winnaar, de beloning per team en de gastenkant (team, stand en uitslag uit de gewone meldingen).
// Pure Node, geen netwerk.
import assert from 'node:assert/strict';
import * as A from '../game/js/pvparena.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('een nieuwe arena: drie zones, twee opstelplaatsen per team, nog niemand mee', () => {
  const ar = A.maakArena({ x: 100, y: 200 });
  assert.equal(ar.fase, 'wacht');
  assert.deepEqual(ar.zones.map((z) => z.id), ['midden', 'west', 'oost'], 'drie zones');
  assert.equal(ar.zones[0].x, 100); assert.equal(ar.zones[0].y, 200);
  assert.equal(ar.spawns.length, 2); assert.ok(ar.spawns[0].length >= 2 && ar.spawns[1].length >= 2);
  assert.deepEqual(ar.score, [0, 0]); assert.deepEqual(ar.deeln, []);
  assert.equal(A.arenaStand(ar).rest, A.ARENA.rondeS);
  // het veld is rond de startplek
  assert.equal(A.arenaInVeld(ar, 110, 200), true);
  assert.equal(A.arenaInVeld(ar, 100 + A.ARENA.straal + 1, 200), false);
  assert.equal(A.arenaInVeld(ar, NaN, 200), false);
});

t('meedoen: alleen buiten de passieve stand, geen dubbele plek, niet te vol, en niet na de start', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  assert.deepEqual(A.arenaMeld(ar, 1, 'Tessa', true), { ok: false, reden: 'passief' });
  assert.equal(ar.deeln.length, 0);
  assert.equal(A.arenaMeld(ar, 1, 'Tessa', false).ok, true);
  assert.equal(A.arenaMeld(ar, 1, 'Tessa', false).reden, 'al');
  assert.equal(A.arenaMeld(ar, -1, 'X', false).reden, 'onbekend');
  assert.equal(A.arenaMeld(ar, 1.5, 'X', false).reden, 'onbekend');
  assert.equal(A.arenaMeld(ar, 40, 'X', false).reden, 'onbekend');
  for (let s = 2; s <= 8; s++) assert.equal(A.arenaMeld(ar, s, 'Speler', false).ok, true);
  assert.equal(ar.deeln.length, A.ARENA.maxSpelers);
  assert.equal(A.arenaMeld(ar, 9, 'Speler', false).reden, 'vol', 'hoogstens acht spelers');
  assert.equal(A.arenaStart(ar, 5).ok, true);
  assert.equal(A.arenaMeld(ar, 10, 'Laat', false).reden, 'bezig', 'geen late instap');
});

t('de start: minstens twee spelers, teams om en om, en de stand begint op nul', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  assert.equal(A.arenaStart(ar, 0).reden, 'min', 'eén speler is geen wedstrijd');
  A.arenaMeld(ar, 3, 'Roos', false);
  assert.equal(A.arenaStart(ar, 0).reden, 'min');
  A.arenaMeld(ar, 1, 'Tessa', false); A.arenaMeld(ar, 2, 'Tammo', false);
  assert.equal(A.arenaStart(ar, 10).ok, true);
  assert.equal(ar.fase, 'bezig');
  assert.deepEqual(ar.deeln.map((d) => [d.slot, d.team]), [[1, 0], [2, 1], [3, 0]]);
  assert.equal(A.arenaStart(ar, 11).ok, false, 'een ronde die loopt start niet nog eens');
  assert.equal(A.arenaStand(ar).rijen.length, 3);
  assert.equal(A.arenaDeelnemer(ar, 2).naam, 'Tammo');
});

t('punten per treffer: alleen tussen deelnemers van verschillende teams, en niet op iemand die neer is', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false); A.arenaMeld(ar, 2, 'Roos', false);
  assert.equal(A.arenaTreffer(ar, 0, 1, 15, 0).reden, 'fase', 'nog niet begonnen');
  A.arenaStart(ar, 0);
  assert.equal(A.arenaTreffer(ar, 0, 0, 15, 1).reden, 'onbekend', 'jezelf');
  assert.equal(A.arenaTreffer(ar, 0, 2, 15, 1).reden, 'eigen team', 'teamgenoten tellen niet');
  assert.equal(A.arenaTreffer(ar, 0, 1, 0, 1).reden, 'geen', 'een treffer zonder schade telt niet');
  const r = A.arenaTreffer(ar, 0, 1, 15, 1);
  assert.deepEqual([r.ok, r.punten], [true, A.ARENA.puntenTreffer]);
  A.arenaTreffer(ar, 0, 1, 15, 2);
  assert.equal(A.arenaDeelnemer(ar, 0).punten, 2 * A.ARENA.puntenTreffer);
  assert.equal(A.arenaDeelnemer(ar, 0).treffers, 2);
  // een neergeschoten speler is even uit het spel
  A.arenaNeer(ar, 0, 1, 3);
  assert.equal(A.arenaTreffer(ar, 0, 1, 15, 4).reden, 'neer', 'geen punten op iemand die nog niet terug is');
  assert.equal(A.levend(ar, 1, 3 + A.ARENA.respawnS + 0.1), true, 'na de respawn weer levend');
});

t('neergaan: de dader krijgt de punten, het doel staat weer op bij het eigen team', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false); A.arenaMeld(ar, 2, 'Roos', false);
  A.arenaStart(ar, 0);
  const r = A.arenaNeer(ar, 0, 1, 10);
  assert.equal(r.ok, true);
  assert.equal(A.arenaDeelnemer(ar, 0).uitschakelingen, 1);
  assert.equal(A.arenaDeelnemer(ar, 0).punten, A.ARENA.puntenNeer);
  assert.equal(A.arenaDeelnemer(ar, 1).neer, 1);
  assert.equal(r.tot, 10 + A.ARENA.respawnS);
  assert.equal(A.levend(ar, 1, 11), false); assert.equal(A.levend(ar, 1, 14), true);
  const spawn = ar.spawns[A.arenaDeelnemer(ar, 1).team];
  assert.ok(spawn.some((s) => s.x === r.spawn.x && s.y === r.spawn.y), 'op de opstelplaats van het eigen team');
  // een teamgenoot die een teamgenoot raakt levert niets op; de wereld (geen dader) kost geen punten
  assert.equal(A.arenaNeer(ar, 2, 0, 20).ok, true);
  assert.equal(A.arenaDeelnemer(ar, 2).punten, 0, 'eigen team: geen punten');
  assert.equal(A.arenaNeer(ar, null, 2, 21).ok, true); assert.equal(A.arenaDeelnemer(ar, 0).punten, A.ARENA.puntenNeer);
  assert.equal(A.arenaSpawn(ar, 99), null);
});

t('de zones: het team met de meeste spelers erin is de eigenaar; een gelijke stand verandert niets', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false);
  A.arenaStart(ar, 0);
  const z = ar.zones.find((q) => q.id === 'midden');
  const inZone = (slot, dx = 0) => ({ slot, x: z.x + dx, y: z.y });
  let geb = A.arenaTik(ar, 0.5, [inZone(0), { slot: 1, x: 500, y: 500 }], 1);
  assert.deepEqual(geb.filter((e) => e.type === 'zone').map((e) => [e.zone, e.team]), [['midden', 0]]);
  // de tweede speler komt erbij: gelijk, dus de eigenaar blijft
  A.arenaTik(ar, 0.5, [inZone(0), inZone(1)], 1.5);
  assert.equal(ar.zones.find((q) => q.id === 'midden').eigenaar, 0);
  // de eerste loopt weg: nu is het de beurt aan de ander
  A.arenaTik(ar, 0.5, [{ slot: 0, x: 500, y: 500 }, inZone(1)], 2);
  assert.equal(ar.zones.find((q) => q.id === 'midden').eigenaar, 1);
  assert.deepEqual(ar.score, [0, 0], 'nog geen vol tijdvak');
});

t('de zones leveren een punt per zoneS seconden, ook als er niemand meer in staat', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false);
  A.arenaStart(ar, 0);
  const z = ar.zones.find((q) => q.id === 'west');
  const lich = [{ slot: 0, x: z.x, y: z.y }, { slot: 1, x: 400, y: 400 }];
  const geb0 = A.arenaTik(ar, 1, lich, 0);
  assert.deepEqual(geb0.filter((e) => e.type === 'punt'), [], 'de eerste seconde is nog geen punt');
  assert.deepEqual(ar.score, [0, 0]);
  const geb = A.arenaTik(ar, 1, lich, 1);
  assert.deepEqual(geb.filter((e) => e.type === 'punt').map((e) => e.team), [0], 'na twee seconden een punt');
  assert.deepEqual(ar.score, [A.ARENA.zonePunt, 0]);
  // de eigenaar loopt weg: de zone blijft van het team zolang de ander er niet staat, en telt door
  A.arenaTik(ar, 1, [{ slot: 0, x: 900, y: 900 }, { slot: 1, x: 900, y: 900 }], 2);
  assert.equal(ar.zones.find((q) => q.id === 'west').eigenaar, 0, 'niemand in de zone: de eigenaar blijft');
  A.arenaTik(ar, 1, [{ slot: 0, x: 900, y: 900 }, { slot: 1, x: 900, y: 900 }], 3);
  assert.deepEqual(ar.score, [2 * A.ARENA.zonePunt, 0], 'de zone telt door');
  // een enorme hapering telt als één stap, niet als verloren tijd
  const voor = ar.t; A.arenaTik(ar, 30, lich, 3); assert.equal(ar.t, voor + 1);
});

t('de klok: na de ronde is het klaar, met de uitslag en de winnaar', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false);
  A.arenaStart(ar, 0);
  ar.t = A.ARENA.rondeS - 0.5;
  const geb = A.arenaTik(ar, 1, [], A.ARENA.rondeS);
  assert.equal(ar.fase, 'klaar');
  assert.equal(ar.reden, 'tijd');
  assert.deepEqual(geb.filter((e) => e.type === 'eind'), [{ type: 'eind', reden: 'tijd' }]);
  assert.equal(A.arenaTik(ar, 1, [], 200).length, 0, 'na het einde tikt niets meer');
  assert.equal(A.arenaStand(ar).rest, 0);
  ar.klaarTot > A.ARENA.rondeS;
  assert.ok(ar.klaarTot > A.ARENA.rondeS);
});

t('de winnaar: de zones beslissen; bij een gelijke stand de uitschakelingen, daarna is het gelijk', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false);
  A.arenaStart(ar, 0);
  assert.equal(A.arenaWinnaar(ar), null, '0-0 is gelijk');
  ar.score = [7, 3];
  assert.equal(A.arenaWinnaar(ar), 0);
  let u = A.arenaUitslag(ar);
  assert.equal(u.winnaar, 0); assert.equal(u.tekst, A.ARENA_TEKST.uitslag(7, 3));
  assert.ok(u.tekst.includes('7') && u.tekst.includes('3'));
  ar.score = [4, 4];
  assert.equal(A.arenaWinnaar(ar), null);
  ar.deeln.find((d) => d.slot === 1).uitschakelingen = 2;
  assert.equal(A.arenaWinnaar(ar), 1, 'gelijke stand: de uitschakelingen beslissen');
  u = A.arenaUitslag(ar);
  assert.equal(u.winnaar, 1);
  assert.equal(A.arenaUitslag(null).winnaar, null);
});

t('de korte regel voor de meldingen past in negentig tekens en noemt beide teams', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false);
  A.arenaStart(ar, 0);
  ar.score = [12, 9]; ar.t = 42;
  const regel = A.arenaRegel(ar);
  assert.ok(regel.length <= 90, regel);
  assert.ok(regel.includes('Noord 12') && regel.includes('9 Zuid') && regel.includes('1:48'), regel);
});

t('wegvallen: de speler telt niet meer mee, en met minder dan twee spelers stopt de ronde', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false); A.arenaMeld(ar, 2, 'Roos', false);
  A.arenaStart(ar, 0);
  ar.zones.forEach((z) => { z.eigenaar = 0; });
  assert.equal(A.arenaVerlaat(ar, 2, 5), true);
  assert.equal(ar.deeln.length, 2);
  assert.equal(ar.zones[0].eigenaar, 0, 'team 0 heeft nog spelers');
  assert.equal(A.arenaVerlaat(ar, 9, 5), false);
  const r = A.arenaVerlaat(ar, 1, 6);
  assert.equal(r, true);
  assert.equal(ar.fase, 'klaar', 'één speler is geen wedstrijd meer');
  assert.equal(ar.reden, 'te weinig spelers');
  // stoppen kan ook van buitenaf
  const ar2 = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar2, 0, 'Tammo', false); A.arenaMeld(ar2, 1, 'Tessa', false); A.arenaStart(ar2, 0);
  assert.equal(A.arenaStop(ar2, 4), true); assert.equal(ar2.reden, 'gestopt'); assert.equal(A.arenaStop(ar2, 5), false);
});

t('dood kost niets: de arena kent geen geld, geen buit en geen blijvend verlies', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false); A.arenaStart(ar, 0);
  A.arenaNeer(ar, 0, 1, 3);
  const d = A.arenaDeelnemer(ar, 1);
  assert.deepEqual(Object.keys(d).sort(), ['doodTot', 'naam', 'neer', 'punten', 'slot', 'team', 'treffers', 'uitschakelingen']);
  const stand = A.arenaStand(ar);
  assert.equal('geld' in stand, false); assert.equal('xp' in stand, false);
  assert.ok(!JSON.stringify(stand).includes('money'));
});

// ---------------------------------------------------------------- de gastenkant (#454)
t('de opstelplaats van een team is ook zonder deelnemerslijst te bepalen: elke plek een eigen hoekje', () => {
  const ar = A.maakArena({ x: 100, y: 200, rot: 0.4 });
  assert.equal(A.arenaSpawnVoor(null, 0, 1), null);
  const a = A.arenaSpawnVoor(ar, 0, 1), b = A.arenaSpawnVoor(ar, 0, 2), c = A.arenaSpawnVoor(ar, 1, 1);
  assert.deepEqual(a, ar.spawns[0][1]);
  assert.notDeepEqual(a, b, 'twee spelers staan niet op dezelfde plek');
  assert.ok(ar.spawns[1].some((s) => s.x === c.x && s.y === c.y), 'het eigen team');
  A.arenaMeld(ar, 0, 'Tammo', false);
  assert.deepEqual(A.arenaSpawn(ar, 0), A.arenaSpawnVoor(ar, 0, 0), 'dezelfde regel als bij de host');
  assert.equal(A.arenaSpawnVoor(ar, 7, 0).x, ar.x, 'een onbekend team staat in het midden');
});

t('de beloning per team: gelijk per team, een kleine bonus voor de winnaar, en dood kost niets', () => {
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false); A.arenaMeld(ar, 2, 'Roos', false);
  A.arenaStart(ar, 0);
  const gelijk = A.arenaBeloningPerTeam(ar);
  assert.equal(gelijk.length, 2);
  assert.ok(gelijk.every((b) => b.geld === A.ARENA_BELONING.geld && b.winnaar === false), 'een gelijke stand geeft geen bonus');
  ar.score = [9, 4];
  const [noord, zuid] = A.arenaBeloningPerTeam(ar);
  assert.deepEqual([noord.winnaar, noord.geld], [true, A.ARENA_BELONING.geld + A.ARENA_BELONING.winst]);
  assert.deepEqual([zuid.winnaar, zuid.geld], [false, A.ARENA_BELONING.geld], 'het verliezende team krijgt ook het gewone bedrag');
  const d = A.arenaDeelnemer(ar, 0);
  assert.deepEqual(A.arenaBeloning(ar, 0), { ...noord, slot: 0 });
  assert.equal(A.arenaBeloning(ar, 0).team, d.team);
  assert.equal(A.arenaBeloning(ar, 9), null, 'wie niet meedeed krijgt niets');
  assert.ok(A.ARENA_BELONING.winst > 0 && A.ARENA_BELONING.winst < A.ARENA_BELONING.geld, 'een kleine bonus');
});

t('de gast leest zijn team, de stand en de uitslag uit de gewone meldingen (geen nieuw bericht)', () => {
  assert.equal(A.arenaTeamUitMelding(A.ARENA_TEKST.startJij('Noord')), 0);
  assert.equal(A.arenaTeamUitMelding(A.ARENA_TEKST.startJij('Zuid')), 1);
  assert.equal(A.arenaTeamUitMelding('De PvP-arena begint.'), null);
  assert.equal(A.arenaTeamUitMelding(null), null);
  // de standregel komt terug zoals hij ging, en de gast telt de klok zelf door
  const ar = A.maakArena({ x: 0, y: 0 });
  A.arenaMeld(ar, 0, 'Tammo', false); A.arenaMeld(ar, 1, 'Tessa', false); A.arenaStart(ar, 0);
  ar.score = [12, 9]; ar.t = 11.4;
  const regel = A.arenaRegel(ar);
  assert.deepEqual(A.arenaLeesRegel(regel), { score: [12, 9], rest: 138 });
  assert.deepEqual(A.arenaLeesRegel(A.arenaRegelVan([3, 0], 0)), { score: [3, 0], rest: 0 });
  assert.equal(A.arenaLeesRegel('Noord 1 - 2 Oost · 0:10'), null, 'een onbekend team');
  assert.equal(A.arenaLeesRegel('iets anders'), null);
  // wat voor melding het is
  assert.deepEqual(A.arenaMelding(A.ARENA_TEKST.startJij('Zuid')), { soort: 'start', team: 1 });
  assert.deepEqual(A.arenaMelding(regel), { soort: 'stand', score: [12, 9], rest: 138 });
  assert.deepEqual(A.arenaMelding('Midden is van Noord'), { soort: 'zone', zone: 'Midden', team: 0 });
  assert.deepEqual(A.arenaMelding(A.ARENA_TEKST.neer('Roos', 'Tammo')), { soort: 'neer', tekst: A.ARENA_TEKST.neer('Roos', 'Tammo') });
  const eind = A.ARENA_TEKST.einde(A.ARENA_TEKST.uitslag(12, 9), 40, 'Zuid');
  assert.deepEqual(A.arenaMelding(eind), { soort: 'eind', tekst: eind });
  assert.equal(A.arenaMelding('Je doet mee: zorg dat je in het veld staat.'), null);
  assert.equal(A.arenaMelding(''), null);
  // alles wat een gast hoort past in de negentig tekens van een melding
  for (const tekst of [A.ARENA_TEKST.startJij('Noord'), A.ARENA_TEKST.startJij('Zuid'), A.ARENA_TEKST.vraagt, A.ARENA_TEKST.hostVraag('Een speler'),
    A.ARENA_TEKST.verstuurd(A.ARENA.uitnS), A.ARENA_TEKST.meedoen, A.ARENA_TEKST.nee, A.ARENA_TEKST.niemand, A.ARENA_TEKST.opstaan, A.ARENA_TEKST.wacht, A.ARENA_TEKST.nietInVeld,
    eind, A.ARENA_TEKST.kreeg(999999, 'Zuid'), A.arenaRegel(ar)]) {
    assert.ok(typeof tekst === 'string' && tekst.length <= 90, tekst);
  }
});

console.log(`pvparena_test: ${n}/${n} ok`);
