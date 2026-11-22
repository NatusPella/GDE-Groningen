// De uitleg van de eerste minuten moet kloppen met het scherm en met de menu's:
// het doel staat bovenin (hud_panel.css .hud-zone-b, sinds 20-11), de uitleg gaat uit onder
// Instellingen > Hints & uitleg en elk kaartje past binnen het HUD-woordbudget (#92).
//   node scripts/onboarding_help_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_TOPICS } from '../game/js/helpoverview.js';
import { wordCount, WORD_BUDGET } from '../game/js/hudtext.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'game', 'js', f), 'utf8');
let n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { console.error('FAIL', name, extra); process.exitCode = 1; } };

const onboarding = read('onboarding.js');
const help = read('helpoverview.js');

// De HUD zet het doel bovenin (hud_panel.css, zone B), dus "onderin" is fout.
ok(!/doel[^.]{0,40}onderin/i.test(onboarding), 'onboarding zegt niet dat het doel onderin staat');
ok(!/doel[^.]{0,40}onderin/i.test(help), 'help zegt niet dat het doel onderin staat');

const skip = /const SKIP_NOTE = '([^']*)'/.exec(onboarding);
ok(!!skip, 'onboarding heeft een SKIP_NOTE');
const skipText = skip ? skip[1] : '';
ok(/Instellingen/.test(skipText) && !/Besturing/.test(skipText), 'de uitleg gaat uit onder Instellingen', skipText);

// Elk kaartje blijft binnen het HUD-budget; de eerste kaart telt de skip-noot mee.
const bodies = onboarding.split(/\r?\n/).filter((l) => l.includes('body:')).map((l) => {
  const m = /body:\s*(`[^`]*`|'[^']*')/.exec(l);
  return m ? m[1].slice(1, -1).replace(/\$\{SKIP_NOTE\}/g, skipText) : '';
}).filter(Boolean);
ok(bodies.length === 6, 'zes uitlegkaarten', String(bodies.length));
for (const [i, body] of bodies.entries()) {
  const words = wordCount(body);
  ok(words <= WORD_BUDGET.cardBody, `uitlegkaart ${i + 1} past binnen ${WORD_BUDGET.cardBody} woorden`, `${words}: ${body}`);
}
ok(/Je doel staat bovenin/.test(bodies[0]), 'de eerste kaart wijst naar de doelkaart bovenin');

// De Hulp-pagina noemt de echte paden van de menu's van nu.
const text = HELP_TOPICS.map((t) => [t.title, ...t.lines].join(' ')).join(' ');
ok(!/hoofdmenu/i.test(text), 'help noemt geen hoofdmenu dat de gewone start niet heeft');
ok(/Instellingen › Spel/.test(text), 'help noemt Instellingen › Spel voor shift+klik');
ok(/Instellingen › Hints & uitleg/.test(text), 'help noemt Instellingen › Hints & uitleg voor de uitleg');
ok(/Instellingen › Geluid & ondertitels/.test(text), 'help noemt Instellingen › Geluid & ondertitels voor de volumes');
ok(/Spel › Samen spelen/.test(text), 'help noemt Spel › Samen spelen');
const doel = HELP_TOPICS.find((t) => t.id === 'doel');
ok(doel && /^Bovenin/.test(doel.lines[0]), 'de hulplijn over het doel begint met Bovenin (het doel hangt in zone B, bovenin; 22-11)');
const eerste = HELP_TOPICS.find((t) => t.id === 'eerstedag');
ok(eerste && /Bovenin/.test(eerste.lines[0]), 'de hulplijn over de eerste klus wijst bovenin');

if (!process.exitCode) console.log(`onboarding_help_test: ${n}/${n} ok`);
