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
ok(ids.length === 26, 'activiteitenlijst (evenementen, regatta, de vliegschool, safehouses, de PvP-arena, de vlucht- en vaardienst en het boerenwerk van een gast erbij): ' + ids.length);
// hoogvlieger: een echte plek, niet []
ok(!/spots: \(\) => \[\],/.test(read('reuzenrad.js')), 'hoogvlieger heeft een startplek');
// snackketen: spots(true) geeft elke snackbar
ok(/spots: \(all = false\) => spots\.filter\(\(s\) => all \|\|/.test(read('snackketen.js')), 'snackketen spots(all)');
// pitchputt: echte banen gaan door holesFromWorld (heading) voor de startplek
ok(/layout\(holesFromWorld\(v\.holes\)\)/.test(read('pitchputt.js')), 'pitchputt echte holes via holesFromWorld');
// de spotcheck loopt over spots(true) van elke activiteit
ok(/for \(const s of a\.spots\(true\)\)/.test(act), 'activitySpots gebruikt spots(true)');
// #453: elke minigame haalt titel, kleur en icoon voor het bord uit de ene tabel in minigamekit.js
ok(/export const MG_THEMA = \{/.test(read('minigamekit.js')), 'één HUD-thematabel in minigamekit.js');
for (const id of ['discgolf', 'pitchputt', 'skatepark', 'kartbaan']) {
  ok(new RegExp(`createBoard\\('${id}'\\)`).test(read(id + '.js')), `${id} haalt zijn bord uit het thema`);
}
ok(/export function activityThema/.test(act) && /mgThema\(id\)/.test(act), 'activities.js geeft het thema van een activiteit');
// #436: het reuzenrad staat op de kaart en de minimap (eigen laag, legenda en icoon) en onder Activiteiten
const rad = read('reuzenrad.js');
ok(/layer: 'hoogvlieger'/.test(rad) && /legend: \{ kind: 'act-hoogvlieger'/.test(rad), 'hoogvlieger heeft een eigen kaartlaag en legenda');
ok(/icon: drawIcon/.test(rad) && /mapSub:/.test(rad), 'hoogvlieger heeft een kaarticoon en een subregel op de kaart');
ok(/todo: TODO/.test(rad) && /key: 'mg:hoogvlieger'/.test(rad), 'hoogvlieger levert een regel voor Activiteiten');
ok(/export function activityTodoItems/.test(act) && /activityTodoItems\(world\)/.test(read('todoui.js')), 'todoui.js zet die regel in de lijst');
console.log(`activiteitenspots_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
