// Romantiek als kleine keuzes (#1137): vier keuzes na een overgangsscène, elk met twee opties, een stille vlag, geen
// gevolgen voor voortgang of einde; de stagechoice-regels draaien er zonder mislukking doorheen.
// node scripts/storyromance_test.mjs
import fs from 'node:fs';
import { ROMANCE_CHOICES, ROMANCE_FLAGS, romanceFor, romanceStage, romanceFlagFor, extraLines } from '../game/js/storyromance.js';
import { BRIDGES, STEPS } from '../game/js/storyarc.js';
import { enterChoice, stepChoice } from '../game/js/stagechoice.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

ok(ROMANCE_CHOICES.length >= 3 && ROMANCE_CHOICES.length <= 5, 'drie tot vijf keuzes', ROMANCE_CHOICES.length);
ok(new Set(ROMANCE_FLAGS).size === ROMANCE_FLAGS.length && ROMANCE_FLAGS.every((f) => /^romantiek:[a-z-]+$/.test(f)), 'de vlaggen zijn uniek en heten romantiek:*');
for (const c of ROMANCE_CHOICES) {
  ok(BRIDGES.some((b) => b.id === c.bridge), `${c.id}: hangt aan een overgangsscène`);
  ok(c.round.options.length === 2 && c.flags.length === 2, `${c.id}: twee opties, twee vlaggen`);
  ok(c.round.options.every((o) => o.label.length <= 24 && o.reply.length > 10 && o.reply.length <= 120), `${c.id}: korte labels en antwoorden`);
  ok(c.round.options.every((o) => !o.ok && !o.fail), `${c.id}: geen optie is fout en geen optie laat iets mislukken`);
  ok(c.round.time >= 10 && [1, 2].includes(c.round.timeoutPick), `${c.id}: een eigen tijdslimiet met een standaardkeuze`);
  ok(romanceFor(c.bridge) === c, `${c.id}: romanceFor vindt hem`);
  // de regels draaien door: kies, wacht het antwoord af, klaar
  for (const pick of ['1', '2']) {
    const S = {}; const st = romanceStage(c);
    enterChoice(S);
    let r = stepChoice(st, S, pick, 0.016);
    ok(r === null && S.cphase === 'reply' && S.reply.text.length > 0, `${c.id}/${pick}: het antwoord verschijnt`);
    r = stepChoice(st, S, null, 10);
    ok(r === 'done' && S.picks[0] === Number(pick) - 1, `${c.id}/${pick}: klaar na het antwoord`);
    ok(romanceFlagFor(c, S.picks[0]) === c.flags[Number(pick) - 1], `${c.id}/${pick}: de juiste vlag`);
  }
  // de tijd loopt af: de standaardkeuze
  { const S = {}; const st = romanceStage(c); enterChoice(S); stepChoice(st, S, null, c.round.time + 1); ok(S.picks[0] === c.round.timeoutPick - 1, `${c.id}: zonder keuze geldt de standaardkeuze`); }
}
ok(romanceFor('O2') === null, 'een scène zonder keuze geeft null');

// extra regels: alleen kleur
const O12 = BRIDGES.find((b) => b.id === 'O12');
ok(extraLines(O12.extra, new Set()).length === 0, 'zonder eerdere keuze geen extra regel');
ok(extraLines(O12.extra, new Set(['romantiek:kaartje-hangt']))[0][1] === 'Het kaartje hangt er nog.', 'het kaartje dat hing, wordt genoemd');
ok(extraLines(O12.extra, ['romantiek:kaartje-zak'])[0][0] === 'Tammo', 'het kaartje in zijn zak ook');
ok(O12.extra.every((e) => ROMANCE_FLAGS.includes(e.if)), 'extra regels leunen alleen op romantiekvlaggen');

// nooit voortgang: de keuze raakt geen stap, geld of einde
const run = read('game/js/storybridgerun.js');
const rom = read('game/js/storyromance.js');
ok(!/state\.done|markDone|reward|addMoney|world\.money|credits/.test(run + rom), 'geen voortgang, geen geld, geen einde');
ok(!STEPS.some((s) => /romantiek:/.test(JSON.stringify(s.goal || {}) + (s.unlocks || ''))), 'geen enkele stap hangt aan een romantiekvlag');
ok(!/localStorage|fetch\(|WebSocket/.test(rom), 'geen opslag en geen netwerk');

console.log(`storyromance_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
