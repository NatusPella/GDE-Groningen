// De onthulregel van het menu (featurereveal.js): een nieuw spel toont niets van boerderij, panden, snackwagen, voetbal en visboek; het verhaal opent ze
// per akte; wie al iets heeft ziet het meteen; een oude save verliest niets en krijgt geen melding; elke speler volgt zijn eigen stand.
// node scripts/featurereveal_test.mjs
import fs from 'node:fs';
import {
  setRevealSource, resetRevealSource, revealOpen, sectionVisible, subVisible, markerVisible, activityVisible, nextReveals, migrateTold, ITEMS, ITEM_IDS, WORLD,
} from '../game/js/featurereveal.js';
import { STEPS } from '../game/js/storyarc.js';
import { worldOpen, newGate, progressFrom, gateWorld } from '../game/js/unlockgate.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const stapKop = STEPS.find((x) => x.part === 'kop').id;
// de bron zoals main.js hem zet: de poort van het verhaal, plus wat de speler al heeft
const bron = (stepId, { gate = newGate(), has = [] } = {}) => setRevealSource({
  open: (id) => worldOpen(id, progressFrom({ stepId, gate })),
  owns: (id) => has.includes(id),
});

// zonder bron staat alles open (andere contexten)
resetRevealSource();
ok(sectionVisible('boerderij') && sectionVisible('voetbal') && subVisible('boerderij', 'tekoop') && markerVisible('percelen'), 'zonder bron staat alles open');

// een nieuw spel: kaal menu
bron(stapKop);
ok(!sectionVisible('boerderij'), 'M01: Land en bedrijf is er niet');
ok(!sectionVisible('voetbal') && !sectionVisible('visboek'), 'M01: voetbal en visboek zijn er niet');
ok(['overzicht', 'boerderij', 'bedrijven', 'tekoop', 'snack', 'club'].every((s) => !subVisible('boerderij', s)), 'M01: geen tabblad van Land en bedrijf');
ok(!markerVisible('percelen') && !markerVisible('tekoop') && !markerVisible('standplaats'), 'M01: geen percelen, te koop of standplaatsen op de kaart');
ok(!activityVisible('voetbaltraining') && !activityVisible('snackketen'), 'M01: geen voetbaltraining of snackketen in de lijst');
ok(activityVisible('carbid') && activityVisible('hengelen') && sectionVisible('spel') && sectionVisible('garage') && sectionVisible('settings'), 'wat niets met het verhaal te maken heeft staat er altijd');
ok(nextReveals([]).notes.length === 0 && nextReveals([]).told.length === 0, 'M01: niets te melden');

// per akte opent precies zijn onderdeel (de poort van unlockgate.js bepaalt de akte)
const part = (w) => gateWorld(w).part;
ok(part('farm') === 'romp' && part('bezit') === 'staart' && part('voetbal') === 'zuid' && part('snackwagen') === 'ontzet', 'de aktes van de werelden zijn zoals het besluit van 21-11');
const eerste = (p) => { const st = STEPS.find((x) => x.part === p); return st && st.id; };
const stapRomp = eerste('romp'), stapStaart = eerste('staart'), stapZuid = eerste('zuid'), stapOntzet = eerste('ontzet');
ok(stapRomp && stapStaart && stapZuid && stapOntzet, 'elke akte heeft een eerste stap', [stapRomp, stapStaart, stapZuid, stapOntzet].join());
bron(stapRomp);
ok(sectionVisible('boerderij') && subVisible('boerderij', 'boerderij') && subVisible('boerderij', 'overzicht'), 'akte 2: Land en bedrijf met het tabblad Boerderij');
ok(!subVisible('boerderij', 'bedrijven') && !subVisible('boerderij', 'tekoop') && !subVisible('boerderij', 'club') && !subVisible('boerderij', 'snack'), 'akte 2: bedrijven, te koop, club en snackwagen nog niet');
ok(markerVisible('percelen') && !markerVisible('standplaats'), 'akte 2: percelen op de kaart, standplaatsen niet');
bron(stapStaart);
ok(subVisible('boerderij', 'bedrijven') && subVisible('boerderij', 'tekoop') && !subVisible('boerderij', 'club'), 'akte 3: panden en ondernemen, de club nog niet');
bron(stapZuid);
ok(sectionVisible('voetbal') && subVisible('boerderij', 'club') && activityVisible('voetbaltraining'), 'akte 4: voetbal');
ok(!subVisible('boerderij', 'snack') && !activityVisible('snackketen'), 'akte 4: de snackwagen nog niet');
bron(stapOntzet);
ok(subVisible('boerderij', 'snack') && activityVisible('snackketen') && markerVisible('standplaats'), 'akte 5: de snackwagen');

// wie er al iets van heeft ziet het meteen, ook in een nieuw spel zonder de akte (de begincutscene zet de vlag, een perceel is gekocht)
bron(stapKop, { has: ['farm'] });
ok(sectionVisible('boerderij') && subVisible('boerderij', 'boerderij') && !subVisible('boerderij', 'club'), 'een eigen akker toont Land en bedrijf, de rest niet');
bron(stapKop, { has: ['voetbal'] });
ok(sectionVisible('voetbal') && subVisible('boerderij', 'club') && sectionVisible('boerderij'), 'een gestarte club toont Voetbal en het tabblad Club');
// een kapotte bron sluit niets (liever te veel dan een kapot menu)
setRevealSource({ open: () => { throw new Error('nog niet klaar'); }, owns: () => { throw new Error('nog niet klaar'); } });
ok(sectionVisible('boerderij') && revealOpen('farm'), 'een falende bron laat alles open');

// een oude save (poort "alles open"): alles te zien, zonder melding
setRevealSource({ open: (id) => worldOpen(id, progressFrom({ stepId: 'M01', gate: undefined })), owns: () => false });
ok(sectionVisible('boerderij') && sectionVisible('voetbal') && sectionVisible('visboek') && markerVisible('percelen') && activityVisible('snackketen'), 'een oude save houdt alles');
const m = migrateTold(undefined, true);
ok(m.silent && ITEM_IDS.every((i) => m.told.includes(i)), 'migratie: een oude save krijgt alle onderdelen als gemeld, stil');
ok(nextReveals(m.told).notes.length === 0, 'migratie: daarna geen melding');
const nm = migrateTold(undefined, false);
ok(!nm.silent && nm.told.length === 0, 'een nieuw spel begint met een lege lijst');
ok(migrateTold(['land'], false).told.length === 1 && !migrateTold(['land'], true).silent, 'een bestaande lijst blijft zoals hij is');

// de melding: eenmaal, rustig, per onderdeel
bron(stapRomp);
let r = nextReveals([]);
ok(r.notes[0] === 'Nieuw in je menu: Land en bedrijf' && r.told.includes('land') && r.notes.every((t) => /Land en bedrijf|Visboek/.test(t)), 'akte 2: een melding "Nieuw in je menu: Land en bedrijf" (het visboek van Hengelen komt in dezelfde akte)', r.notes.join('|'));
ok(nextReveals(r.told).notes.length === 0, 'dezelfde melding komt niet nog eens');
bron(stapStaart);
r = nextReveals(r.told);
ok(r.notes.length === 1 && /Bedrijven en Te koop/.test(r.notes[0]), 'akte 3: een tak erbij noemt de tak', r.notes.join('|'));
bron(stapZuid);
r = nextReveals(r.told);
ok(r.notes.length === 1 && /Voetbal/.test(r.notes[0]) && /Loopbanen/.test(r.notes[0]), 'akte 4: Voetbal bij Loopbanen (de tak Club staat al onder Land en bedrijf)', r.notes.join('|'));
// alles op een keer (een speler die springt): een melding per sectie, geen stapel
bron(stapOntzet);
r = nextReveals([]);
ok(r.notes.length <= 3 && r.notes.every((t) => /^Nieuw in je menu: /.test(t)), 'alles tegelijk: hooguit een melding per sectie', r.notes.join('|'));
ok(r.told.length === ITEMS.length, 'alles tegelijk: alles geteld als gemeld');

// Samen spelen: twee spelers, elk hun eigen stand (#429); de gast ziet wat hij zelf ontgrendelde
bron(stapRomp);
const host = [sectionVisible('boerderij'), subVisible('boerderij', 'club')];
bron(stapKop);
const gast = [sectionVisible('boerderij'), subVisible('boerderij', 'club')];
ok(host[0] && !gast[0] && !host[1] && !gast[1], 'twee spelers hebben elk hun eigen menu');

// de tabel en de tekst
ok(ITEMS.every((i) => Object.values(WORLD).includes(i.world) && gateWorld(i.world)), 'elk onderdeel wijst naar een wereld van de poort');
const doc = fs.readFileSync(new URL('../docs/MENU-ONTHULLING-22-11.md', import.meta.url), 'utf8');
ok(['Land en bedrijf', 'Voetbal', 'Visboek', 'Snackwagen', 'Te koop', 'Percelen'].every((t) => doc.includes(t)), 'het document noemt alle onderdelen');
ok(!/\bwinter\b|sneeuw/i.test(doc), 'altijd zomer');
// gate 0.65: boerderijBegonnen telt speluren (elke verstreken spelklok), dus "heeft al een akker" mag er niet van afhangen: in een nieuw spel stond Land en bedrijf anders na een paar seconden open
const run = fs.readFileSync(new URL('../game/js/featurerevealrun.js', import.meta.url), 'utf8');
ok(!/boerderijBegonnen/.test(run) && /getBoerderij\(\)\.perceel/.test(run), 'owns(farm) hangt aan een echt perceel, niet aan speluren');

console.log(fails ? `featurereveal: ${fails} van ${n} mislukt` : `featurereveal: ${n} controles OK`);
process.exit(fails ? 1 : 0);
