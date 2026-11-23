// Test van stepdoel.js: elke verhaalstap met een plek heeft een kort, werkwoordelijk doel (audit speelbaarheid 23-11).
//   node scripts/stepdoel_test.mjs
import fs from 'node:fs';
import { STEPS } from '../game/js/storyarc.js';
import { STEP_DOEL, MAX_DOEL, stepDoel, doelInZin } from '../game/js/stepdoel.js';
import { destinationTitle } from '../game/js/goaltext.js';
import { remindText } from '../game/js/storyremind.js';

let fout = 0;
const ok = (c, m) => { if (!c) { fout++; console.log('FOUT: ' + m); } };

// stappen zonder plek (de opening en de epiloog) tonen geen doel in de balk
const ZONDER_PLEK = new Set(['M00', 'E']);
const ids = new Set(STEPS.map((s) => s.id));

for (const id of Object.keys(STEP_DOEL)) ok(ids.has(id), `${id} staat in STEP_DOEL maar is geen verhaalstap`);

for (const s of STEPS) {
  if (ZONDER_PLEK.has(s.id)) continue;
  const d = STEP_DOEL[s.id];
  ok(typeof d === 'string' && d.length > 0, `${s.id} (${s.title}) heeft geen kort doel`);
  if (!d) continue;
  ok(d.length <= MAX_DOEL, `${s.id}: doel is ${d.length} tekens (max ${MAX_DOEL}): ${d}`);
  ok(!/[.!?]$/.test(d), `${s.id}: een doel eindigt niet op een leesteken: ${d}`);
  ok(d !== s.title, `${s.id}: het doel is gewoon de titel`);
  // het doel begint met een werkwoord: de doelbalk zet er dan geen "Ga naar:" voor
  ok(destinationTitle(d) === d, `${s.id}: begint niet met een herkend werkwoord, de balk zou er "Ga naar:" voor zetten: ${d}`);
  ok(stepDoel(s) === d, `${s.id}: stepDoel geeft niet het doel`);
}

ok(stepDoel({ id: 'ONBEKEND', title: 'Een titel' }) === 'Een titel', 'een stap zonder regel valt terug op de titel');
ok(stepDoel(null) === '', 'geen stap geeft een lege tekst');
ok(doelInZin('Praat met Berend') === 'praat met Berend', 'doelInZin zet een kleine beginletter');
ok(remindText(0, doelInZin(STEP_DOEL.M01)) === 'Nog even dit: praat met Berend bij het Martinikerkhof. Staat op je kaart, als je zin hebt.', 'de herinnering noemt het korte doel');

// bedrading: de balk zegt hoe ver de volgende stap is, en de OV-hint kijkt ook naar de start van de volgende verhaalmissie
const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
ok(/const subAfst = !near && !inside && afst >= STORY_AFSTAND_M \? `\$\{sub\} · \$\{formatDistance\(afst\)\}` : sub;/.test(hud), 'de verhaalbalk toont de afstand');
ok(/kind: 'story'[^\n]*sub: subAfst/.test(hud), 'de verhaalbalk gebruikt de regel met afstand');
ok(/hintDoel\(getGoal\(\), sg, stap \? stap\.kind : ''/.test(fs.readFileSync(new URL('../game/js/ovhintlive.js', import.meta.url), 'utf8')), 'de OV-hint kijkt ook naar de verhaalmissie');

if (fout) { console.log(`stepdoel_test: ${fout} fout(en)`); process.exit(1); }
console.log(`stepdoel_test: ok (${Object.keys(STEP_DOEL).length} doelen voor ${STEPS.length} stappen)`);
