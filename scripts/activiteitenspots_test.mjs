// Elke activiteit in activities.js heeft een startplek die de spotcheck en de bot vinden (#242):
// spots() mag leeg zijn (kaart, alleen eigen vestigingen, kalender), maar dan geeft spots(true) of een
// debughaak de plek. De modules laden three, dus dit controleert de bron (regels), geen runtime.
import fs from 'node:fs';
const root = new URL('../game/js/', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, root), 'utf8');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const act = read('activities.js');
const ids = (act.match(/const LIST = \[([^\]]+)\]/) || [, ''])[1].split(',').map((s) => s.trim()).filter(Boolean);
ok(ids.length === 22, 'activiteitenlijst (evenementen, regatta, de vliegschool, safehouses en de PvP-arena erbij): ' + ids.length);
// hoogvlieger: een echte plek, niet []
ok(!/spots: \(\) => \[\],/.test(read('reuzenrad.js')), 'hoogvlieger heeft een startplek');
// snackketen: spots(true) geeft elke snackbar
ok(/spots: \(all = false\) => spots\.filter\(\(s\) => all \|\|/.test(read('snackketen.js')), 'snackketen spots(all)');
// pitchputt: echte banen gaan door holesFromWorld (heading) voor de startplek
ok(/layout\(holesFromWorld\(v\.holes\)\)/.test(read('pitchputt.js')), 'pitchputt echte holes via holesFromWorld');
// de spotcheck loopt over spots(true) van elke activiteit
ok(/for \(const s of a\.spots\(true\)\)/.test(act), 'activitySpots gebruikt spots(true)');
console.log(`activiteitenspots_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
