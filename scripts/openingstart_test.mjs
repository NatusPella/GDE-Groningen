// #986: de openingsscène van een nieuw spel speelt als eerste film na het laadscherm.
// node scripts/openingstart_test.mjs
import fs from 'node:fs';
import { OPENING_REDEN, openingBlockers, openingReady, openingIsNext, openingActEnd, openingFinish, openingReplayBlockers, openingReplayGate, OPENING_END_HOUR } from '../game/js/openingstart.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';

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

// --- een nieuw spel begint met de opening; Doorgaan niet; overslaan zet de normale startstand ---
ok(STEPS[0].id === 'M00' && STEPS[0].goal.type === 'opening', 'de eerste stap van het verhaal is de opening (een nieuw spel begint er altijd mee)');
ok(STEPS.filter((x) => x.goal && x.goal.type === 'opening').length === 1, 'er is precies één openingsstap (geen dubbele start)');
ok(cine.includes('!w.loadedFromSave && openingDue()'), 'bij Doorgaan (geladen save) speelt de spelstart zijn eigen vlucht-in: de opening hoort bij een nieuw spel');

// bedrijven: normaal volgen ze elkaar op, overslaan of vervangen sluit de hele opening (geen half bedrijf)
ok(openingActEnd({ index: 0, count: 3 }) === 'volgende' && openingActEnd({ index: 1, count: 3 }) === 'volgende', 'bedrijf 1 en 2 gaan door naar het volgende');
ok(openingActEnd({ index: 2, count: 3 }) === 'klaar', 'het laatste bedrijf sluit de opening');
for (const i of [0, 1, 2]) {
  ok(openingActEnd({ index: i, count: 3, skipped: true }) === 'klaar', 'overslaan in bedrijf ' + (i + 1) + ' sluit de hele opening');
  ok(openingActEnd({ index: i, count: 3, replaced: true }) === 'klaar', 'een vervangende film in bedrijf ' + (i + 1) + ' sluit de opening');
}
// einde: de stap meldt zich één keer klaar, de klok krijgt de ochtend van de verhuisdag, een tweede einde doet niets
{
  const b = { phase: 'play' };
  const a = openingFinish(b);
  ok(a.changed && a.hour === OPENING_END_HOUR && b.phase === 'done', 'het einde zet de stap klaar en de klok op de ochtend');
  const c = openingFinish(b);
  ok(!c.changed && c.hour === null && b.phase === 'done', 'een tweede einde (montage en bedrijf allebei) verandert niets: geen dubbele missiestart');
  ok(!openingFinish(null).changed, 'zonder stand doet het einde niets');
}
// herbekijken via Verhaal: alleen in een rustig eigen spel
const rustig = { started: true, client: false, session: false, openingDue: false, missionActive: false, cinematicActive: false, narrativeBusy: false, pigeon: false, respawn: false, inVehicle: false, dataReady: true };
ok(openingReplayBlockers(rustig).length === 0, 'herbekijken mag in een rustig eigen spel');
for (const [k, naam] of [['started', 'gestart'], ['client', 'meespeler'], ['session', 'Samen spelen'], ['openingDue', 'opening komt nog'], ['missionActive', 'missie'], ['cinematicActive', 'film'], ['narrativeBusy', 'vertelling'], ['pigeon', 'duif'], ['respawn', 'terugzetten'], ['inVehicle', 'voertuig'], ['dataReady', 'verhaaldata']]) {
  const v = k === 'started' || k === 'dataReady' ? false : true;
  const b = openingReplayBlockers({ ...rustig, [k]: v });
  ok(b.length === 1 && b[0].includes(naam), 'herbekijken geblokkeerd door ' + k, b.join('|'));
}
ok(['export function replayOpening(', 'openingReplayBlockers({', 'openingActEnd({', 'openingFinish(b)'].every((t) => story.includes(t)), 'story.js gebruikt de zuivere regels voor einde en herbekijken');
const vui = fs.readFileSync(new URL('../game/js/verhaalui.js', import.meta.url), 'utf8');
ok(vui.includes('data-replay-opening') && vui.includes('replayOpening(hooks.close)'), 'Verhaal > Personages heeft de knop Opening opnieuw bekijken');
ok(/<span class="hud-key">SPATIE<\/span> ?<span>om over te slaan<\/span>/.test(cine), 'de overslaan-hint noemt de toets (glyphs.js zet er de knop van de controller voor in)');

// review 20-11 #5: het menu sluit pas als de opening kan starten
{
  let dicht = 0;
  const sluit = () => { dicht++; };
  const reden = openingReplayGate(['in een voertuig'], sluit);
  ok(dicht === 0 && /in een voertuig/.test(reden), 'geblokkeerd: het menu blijft open en de reden komt terug', reden);
  ok(openingReplayGate([], sluit) === '' && dicht === 1, 'vrij: het menu sluit en er is geen reden');
  ok(openingReplayGate([], undefined) === '', 'zonder sluit-haak geen fout');
}

// de reden is gewoon Nederlands: elke blokkade van het herbekijken heeft een speler-tekst
{
  const alle = ['started', 'client', 'session', 'openingDue', 'missionActive', 'cinematicActive', 'narrativeBusy', 'pigeon', 'respawn', 'inVehicle', 'dataReady'];
  for (const k of alle) {
    const v = k === 'started' || k === 'dataReady' ? false : true;
    const [b] = openingReplayBlockers({ ...rustig, [k]: v });
    ok(!!OPENING_REDEN[b] && !/^[A-Z]/.test(OPENING_REDEN[b]), 'speler-tekst voor blokkade ' + k, b);
    ok(openingReplayGate([b], null).startsWith('De opening kan nu niet: ' + OPENING_REDEN[b]), 'de gate gebruikt de speler-tekst voor ' + k);
  }
  ok(openingReplayGate(['onbekend'], null) === 'De opening kan nu niet: onbekend.', 'een onbekende reden blijft staan');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
