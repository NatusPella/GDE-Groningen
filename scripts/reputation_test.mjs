// Lichte reputatie (#1135): fame, kind en buurt blijven binnen hun bereik, een stand wordt nooit stuk gelezen, alleen kleur (prijs 5%,
// een andere zin, een langere rij), per speler opgeslagen onder een eigen sleutel, nooit in een savegame of over het net.
// node scripts/reputation_test.mjs
import fs from 'node:fs';
import {
  readReputation, reputationOf, noteReputation, loadReputation, saveReputation, priceFactor, reputationLine, queueLength, emptyReputation,
  validScope, REPUTATION_KEY, RANGES, PRICE_SWING,
} from '../game/js/reputation.js';
import { KEYS } from '../game/js/storagekeys.js';
import { noteService, noteHelp, jelleMirror, reputationView, BYSTANDER_LINES, JELLE_MIRROR } from '../game/js/reputation.js';
import { setReputationStorage, recordService, recordHelp, currentReputation, reputationNow } from '../game/js/reputationlive.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

// bereik
let s = emptyReputation();
for (let i = 0; i < 30; i++) s = noteReputation(s, 'fame', 10);
ok(s.fame === RANGES.fame[1], 'fame stopt op 100');
for (let i = 0; i < 30; i++) s = noteReputation(s, 'kind', -10);
ok(s.kind === RANGES.kind[0], 'kind stopt op -50');
for (let i = 0; i < 30; i++) s = noteReputation(s, 'buurt:vismarkt', 10);
ok(reputationOf(s, 'buurt:vismarkt') === 20 && reputationOf(s, 'buurt:onbekend') === 0, 'een buurt stopt op 20, een onbekende buurt is 0');
ok(noteReputation(emptyReputation(), 'fame', 500).fame === 10, 'één gebeurtenis is hoogstens 10');
ok(JSON.stringify(noteReputation(emptyReputation(), 'bestaat-niet', 5)) === JSON.stringify(emptyReputation()), 'een onbekende scope verandert niets');
ok(validScope('fame') && validScope('kind') && validScope('buurt:paddepoel') && !validScope('buurt:') && !validScope('x'), 'scopes');

// lezen overleeft rommel
ok(JSON.stringify(readReputation(null)) === JSON.stringify(emptyReputation()) && JSON.stringify(readReputation('x')) === JSON.stringify(emptyReputation()), 'een lege of vreemde stand is nul');
const rommel = readReputation({ fame: 'veel', kind: 9999, buurt: { 'goed': 5, ['x'.repeat(40)]: 5, slecht: 'nee' } });
ok(rommel.fame === 0 && rommel.kind === 50 && rommel.buurt.goed === 5 && Object.keys(rommel.buurt).length === 1, 'rommel wordt genegeerd, de rest blijft heel');
const oud = { v: 1, fame: 10, kind: 2, buurt: { a: 1 } };
const nieuw = noteReputation(oud, 'kind', 3);
ok(oud.kind === 2 && nieuw.kind === 5, 'de oude stand blijft heel (een nieuwe stand terug)');

// alleen kleur
ok(Math.abs(priceFactor(emptyReputation()) - 1) <= PRICE_SWING, 'de prijsfactor blijft binnen 5%');
const top = readReputation({ fame: 100, kind: 50, buurt: { vismarkt: 20 } });
const bodem = readReputation({ fame: 0, kind: -50, buurt: { vismarkt: -20 } });
ok(priceFactor(top, 'buurt:vismarkt') >= 1 - PRICE_SWING && priceFactor(top, 'buurt:vismarkt') < 1, 'veel bekendheid en vriendelijkheid: iets goedkoper (nooit meer dan 5%)');
ok(priceFactor(bodem, 'buurt:vismarkt') <= 1 + PRICE_SWING && priceFactor(bodem, 'buurt:vismarkt') > 1, 'het omgekeerde: iets duurder (nooit meer dan 5%)');
ok(reputationLine(top, ['De wagen? Nooit van gehoord.', 'Ik ken jullie van de Fjord.', 'Jij bent van de Fjord. Mijn buurman praat nergens anders over.']) === 'Jij bent van de Fjord. Mijn buurman praat nergens anders over.', 'een bekende wagen: een andere zin');
ok(reputationLine(emptyReputation(), ['laag', 'midden', 'hoog']) === 'midden' && reputationLine(bodem, ['laag', 'midden', 'hoog']) === 'laag', 'laag, midden, hoog');
ok(reputationLine(top, ['nee', 'ja'], 'fame') === 'ja' && reputationLine(emptyReputation(), []) === '', 'twee varianten en een lege lijst');
ok(queueLength(emptyReputation()) === 3 && queueLength(top) > 3 && queueLength(top) <= 12, 'de rij wordt langer met bekendheid, binnen reden');

// opslag per speler
const st = mem();
ok(saveReputation(st, noteReputation(emptyReputation(), 'fame', 8), 'speler-1') && saveReputation(st, noteReputation(emptyReputation(), 'kind', -4), 'speler-2'), 'opslaan per speler');
ok(loadReputation(st, 'speler-1').fame === 8 && loadReputation(st, 'speler-2').kind === -4 && loadReputation(st, 'speler-1').kind === 0, 'elke speler heeft zijn eigen reputatie (ook een gast)');
ok(loadReputation(st, 'niemand').fame === 0 && loadReputation(null).fame === 0, 'een onbekende speler of geen opslag: nul');
const kapot = mem(); kapot.setItem(REPUTATION_KEY, '{kapot');
ok(loadReputation(kapot, 'x').fame === 0 && saveReputation(kapot, emptyReputation(), 'x') === true, 'een kapotte opslag leest als nul en wordt overschreven');
ok(KEYS.reputatie === REPUTATION_KEY && REPUTATION_KEY === 'gde-reputatie-v1', 'de sleutel staat in storagekeys.js');

// nooit een slot, nooit een savegame of het net
const src = fs.readFileSync(new URL('../game/js/reputation.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
ok(!/gde-save|savegame\.|coopNet|fetch\(|WebSocket|markDone|mission/.test(src), 'geen savegame, geen net, geen voortgang');
ok(!/world\.player/.test(src), 'geen enkelspeler-aanname (geen world.player)');

// schrijven: klanten bedienen en de buurt helpen (de haken van het spel)
let d = noteService(emptyReputation(), { days: 1, served: false });
ok(d.fame === 0 && d.kind === 0, 'een dag zonder verkoop geeft niets');
d = noteService(emptyReputation(), { days: 9, served: true, sat: 80 });
ok(d.fame === 3 && d.kind === 1, 'bedienen: bekendheid hoogstens 3 per afrekening, tevreden klanten geven kind erbij', JSON.stringify(d));
ok(noteService(emptyReputation(), { days: 1, served: true, sat: 20 }).kind === -1, 'een ontevreden wagen laat kind iets zakken, nooit ver');
let h = noteHelp(emptyReputation(), 'markt', 3);
ok(h.kind === 6 && h.fame === 3 && reputationOf(h, 'buurt:markt') === 9, 'hulp: kind, fame en de buurt', JSON.stringify(h));
ok(JSON.stringify(noteHelp(emptyReputation(), 'rare/plek!', 1).buurt) === '{}', 'een ongeldige plek maakt geen buurt aan');
for (let i = 0; i < 40; i++) h = noteHelp(h, 'markt', 3);
ok(h.kind === 50 && h.fame === 100 && reputationOf(h, 'buurt:markt') === 20, 'veel hulp blijft binnen elk bereik');

// lezen: een andere zin, Jelle spiegelt, de rij; nooit een slot
const laag = { fame: 0, kind: -40 }, hoog = { fame: 90, kind: 40 };
ok(reputationView(laag).line === BYSTANDER_LINES[0] && reputationView(hoog).line === BYSTANDER_LINES[2] && reputationView(emptyReputation()).line === BYSTANDER_LINES[1], 'een bijpersoon zegt een andere zin bij een andere stand');
ok(jelleMirror(emptyReputation()) === '' && jelleMirror({ fame: 45, kind: 0 }) === JELLE_MIRROR[0] && jelleMirror(hoog) === JELLE_MIRROR[1], 'Jelle spiegelt pas bij een bekende wagen');
ok(reputationView(hoog).queue > reputationView(laag).queue && reputationView(hoog, 'markt').price < 1 && reputationView(laag).price > 1, 'een langere rij en een prijs die hoogstens 5% afwijkt');
ok(Math.abs(reputationView(hoog, 'markt').price - 1) <= PRICE_SWING && Math.abs(reputationView(laag).price - 1) <= PRICE_SWING, 'de prijs wijkt nooit meer dan 5% af');

// de haken schrijven per speler op de eigen opslag en overleven geen opslag
const live = mem(); setReputationStorage(live);
ok(recordHelp('markt', 2) === true && recordService({ days: 3, served: true, sat: 80 }) === true, 'de haken schrijven');
ok(currentReputation().kind === 5 && currentReputation().fame === 3 && reputationNow('markt').buurt === 6 && live.m.has(REPUTATION_KEY), 'en lezen terug via de eigen sleutel');
ok(live.m.size === 1, 'alleen de eigen sleutel, geen savegame');
setReputationStorage({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
ok(recordHelp('markt') === false && currentReputation().fame === 0, 'een kapotte opslag is geen fout');
setReputationStorage(null);

console.log(`reputation_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
