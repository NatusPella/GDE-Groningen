// #986: de openingsscène van een nieuw spel speelt als eerste film na het laadscherm.
// node scripts/openingstart_test.mjs
import fs from 'node:fs';
import { openingBlockers, openingReady, openingIsNext } from '../game/js/openingstart.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const calm = { started: true, client: false, gate: false, missionActive: false, cinematicActive: false, startActive: false, sinceCinematicS: 1e9, narrativeBusy: false, pigeon: false, respawn: false, dataReady: true };
const met = (o) => ({ ...calm, ...o });

ok(openingReady(calm), 'een rustig nieuw spel start de opening meteen (geen film is ooit gespeeld)');
ok(openingReady(met({ cinematicActive: true, startActive: true })), 'de vlucht-in van de spelstart houdt de opening niet tegen (die neemt hem over)');
ok(!openingReady(met({ cinematicActive: true, startActive: false })), 'een andere film houdt de opening wel tegen');
ok(!openingReady(met({ sinceCinematicS: 0.4 })), 'een film die net klaar is, geeft eerst een korte adempauze');
ok(openingReady(met({ sinceCinematicS: 1.2 })), 'na een seconde mag de opening');
for (const [k, v, naam] of [['started', false, 'spel nog niet gestart'], ['client', true, 'meespeler'], ['gate', true, 'wachtkamer'], ['missionActive', true, 'missie'], ['narrativeBusy', true, 'vertelling'], ['pigeon', true, 'duif'], ['respawn', true, 'terugzetten'], ['dataReady', false, 'verhaaldata']]) {
  const b = openingBlockers(met({ [k]: v }));
  ok(b.length === 1 && b[0].includes(naam), `blokkeerder ${k} wordt bij naam genoemd`, b.join('|'));
}
ok(openingBlockers(met({ missionActive: true, pigeon: true })).length === 2, 'alle redenen worden genoemd');

ok(openingIsNext({ stepIsOpening: true, client: false, dataReady: true }), 'de spelstart slaat zijn vlucht-in over als de opening aan de beurt is');
ok(!openingIsNext({ stepIsOpening: false, client: false, dataReady: true }), 'een ander verhaalstap: de vlucht-in speelt gewoon');
ok(!openingIsNext({ stepIsOpening: true, client: true, dataReady: true }), 'een gast ziet de opening niet: zijn vlucht-in speelt');
ok(!openingIsNext({ stepIsOpening: true, client: false, dataReady: false }), 'zonder verhaaldata speelt de vlucht-in als terugval');

// de verbinding in de bron: de spelstart vraagt het aan het verhaal, en het verhaal gebruikt dezelfde regels
const cine = fs.readFileSync(new URL('../game/js/cinematics.js', import.meta.url), 'utf8');
const story = fs.readFileSync(new URL('../game/js/story.js', import.meta.url), 'utf8');
ok(/function playGameStart[\s\S]{0,1500}!w\.loadedFromSave && openingDue\(\)[\s\S]{0,200}if \(opening\) return;[\s\S]{0,400}playCinematic\(\{\s*id: 'start'/.test(cine), 'playGameStart slaat de vlucht-in over voor een nieuw spel waarin de opening volgt');
ok(/setOpeningDueProbe\(/.test(story) && /openingBlockers\(\{/.test(story), 'story.js meldt de opening aan cinematics.js en gebruikt openingBlockers');
ok(/blockers\.join\(', '\)/.test(story), 'de waarschuwing noemt de reden van het wachten');
ok(!/else if \(ready && world\.time - rt\.enteredAt > 40\)/.test(story), 'de wachtwaarschuwing hangt niet meer aan "ready"');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
