// Geen voetbaltip in akte 1 (24-11): de uitnodiging van de club ('De club hier in de buurt zoekt spelers. Ik heb jou opgegeven. Niet zeuren.')
// verscheen in een nieuw spel en bij Samen spelen al direct bij de start. Oorzaak: voetbalcarrierelive.js vroeg de poort met w.gate, en dat veld
// bestaat niet; zonder poort geldt 'oude save, alles open'. Nu vraagt hij de poort van het verhaal (storyquery.storyGateProgress), en een
// verhaal waar nog niets in gedaan is (akte 1) telt als nieuw spel: alles dicht tot het verhaal het opent (besluit eigenaar).
// Eigen opslag, nooit de echte gde-*-sleutels.
//   node scripts/voetbal_akte1_test.mjs
import fs from 'node:fs';
import PARKDATA from '../game/js/voetbalparkendata.js';
import * as V from '../game/js/voetbalcarrierelive.js';
import * as L from '../game/js/loopbaanlive.js';
import { registerStoryQueries } from '../game/js/storyquery.js';
import { progressFrom, newGate } from '../game/js/unlockgate.js';
import { STEPS } from '../game/js/storyarc.js';

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (character = 'tammo') => ({ money: 0, clock: 12, time: 100, msgs: [], addMessage(t) { this.msgs.push(t); }, player: { character } });
L.zetProfielVoorTest(null, mem());
V.useParkData(PARKDATA);
V.zetBezigProbe(() => false);

// de stand die story.js geeft (storyGateProgress), hier met de hand: een verse save in akte 1 heeft de poort van een nieuw spel
let stand = null;
registerStoryQueries({ storyGateProgress: () => stand });
const akte1 = STEPS.filter((s) => s.part === 'kop').map((s) => s.id);
ok(akte1.includes('M01') && akte1.includes('M06'), 'akte 1 loopt van de opening tot M06');

// 1. een verse save: elke stap van akte 1, beide personages, een hele speldag lang elke twee seconden gevraagd: geen tip
let tips = 0;
for (const id of akte1) {
  for (const ch of ['tammo', 'anita']) {
    V.useStorage(mem());
    stand = progressFrom({ stepId: id, ended: false, gate: newGate(), begun: () => false });
    const w = wereld(ch);
    for (let i = 0; i < 40; i++) { w.time += 60; V.updateBeats(3, w); }
    tips += w.msgs.length;
    if (w.msgs.length) console.log('  tip bij', id, ch, w.msgs[0]);
  }
}
ok(tips === 0, 'een verse save in akte 1: geen voetbaltip', `${tips} tips`);
ok(!V.isUnlockedNow(wereld()), 'de voetbalcarrière is in akte 1 dicht');

// 2. zonder poort in de save (zoals een nieuw spel in de eerste seconden, of een gast zonder eigen opening) zegt story.js nu: nieuw spel, dicht
const story = fs.readFileSync(new URL('../game/js/story.js', import.meta.url), 'utf8');
ok(/const gate = state\.gate \|\| \(state\.done\.size === 0 && \(!c \|\| c\.part === 'kop'\) \? newGate\(\) : undefined\);/.test(story), 'story.js: een verhaal zonder poort en zonder voortgang in akte 1 krijgt de poort van een nieuw spel');
ok(/registerStoryQueries\(\{[^}]*storyGateProgress/.test(story), 'story.js geeft zijn poortstand aan storyquery');
const live = fs.readFileSync(new URL('../game/js/voetbalcarrierelive.js', import.meta.url), 'utf8');
ok(/storyGateProgress\(\)/.test(live) && !/gate: w \? w\.gate : undefined\), dev/.test(live.split('let sv = { end: false };')[0]), 'voetbalcarrierelive.js vraagt eerst de poort van het verhaal, niet w.gate');

// 3. het verhaal opent hem: in akte 4 ('zuid') komt de uitnodiging wel
V.useStorage(mem());
const zuid = STEPS.find((s) => s.part === 'zuid');
stand = progressFrom({ stepId: zuid.id, ended: false, gate: newGate(), begun: () => false });
const w4 = wereld('tammo');
V.updateBeats(3, w4);
ok(w4.msgs.length === 1 && /Tessa: De club hier in de buurt zoekt spelers/.test(w4.msgs[0]), 'in akte 4 komt de uitnodiging', w4.msgs.join(' | '));

// 4. wie de carrière al begon (een oude save), houdt hem open, ook in akte 1
V.useStorage(mem());
stand = progressFrom({ stepId: 'M02', ended: false, gate: newGate(), begun: () => false });
const w5 = wereld('anita');
V.createNew(w5, 'anita');
ok(V.isUnlockedNow(w5), 'een begonnen carrière blijft open');

registerStoryQueries({ storyGateProgress: () => null });
console.log(`voetbal_akte1_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
