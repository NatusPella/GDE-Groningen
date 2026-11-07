// Test voor scripts/spec_check.mjs met synthetische fixtures in een tijdelijke map: een goede
// verwijzing en teller slagen, een ontbrekend bestand, een regel buiten het bestand, een lege regel,
// een verkeerde teller en een verdwenen teller falen, en een ontbrekende bron wordt overgeslagen.
//   node scripts/spec_check_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check, write } from './spec_check.mjs';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };

const CODE = 'export const A = 1;\n\nexport const B = 2;';
const VERHAAL = (n = {}) => `# Verhaal

Zie \`game/js/a.js:1\` voor de rest, en \`pausemenu.js:59\` is een verwijzing zonder pad.

De data: ${n.scenes ?? 3} scènes, ${n.regels ?? 3} regels in act 1 tot en met 6; ${n.stil ?? 0} zijn stille appjes en ${n.geen ?? 3} hebben geen opname.
De stappen: samen ${n.missies ?? 2} missies en ${n.beats ?? 1} reisbeats, en de kop noemt ${n.missies ?? 2} missies en ${n.beats ?? 1} reisbeats.
De code heeft er ${n.missies ?? 2} en ${n.beats ?? 1}, want \`game/storydata/script.json\` telt er ${n.scenes ?? 3} en ${n.regels ?? 3}.
`;
const MECHANICA = `# Mechanica

Negentien vakken in drie groepen.
Zeven watertypen en 29 soorten.
Vier gewassen met eigen zaaigoed.
Twintig lessen bij Eelde, en elf vliegtuig- en negen helikopterlessen.
Discgolf: negen holes. Pitch en putt: zes holes.
`;
const SCENES = (n = {}) => JSON.stringify({
  note: 'fixture',
  scenes: [
    { id: 'M01.1', step: 'M01', lines: [{ speaker: 'Tammo', text: 'Een.', textOnly: true }, { speaker: 'Tammo', text: 'Twee.', textOnly: true }] },
    { id: 'M02.1', step: 'M02', lines: [{ speaker: 'Tessa', text: 'Drie.', rec: 'story', textOnly: false }] },
    { id: 'T1.1', step: 'T1', lines: [] },
  ],
  ...n,
});

// Een fixture-repo met de twee specs, een codebestand en de verhaaldata (drie regels, één daarvan
// zonder opname: de manifests zijn leeg). De regelmodule van de mechanica-tellers ontbreekt expres.
function maak({ verhaal = VERHAAL(), mechanica = MECHANICA, code = CODE, scenes = SCENES(), manifests = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-spec-check-'));
  const put = (f, t) => { const p = path.join(root, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
  put('.specs-fire/standards/verhaal.md', verhaal);
  put('.specs-fire/standards/mechanica.md', mechanica);
  put('game/js/a.js', code);
  if (scenes !== null) put('game/storydata/script.json', scenes);
  if (manifests) for (const k of ['story', 'lines', 'banter']) put(`game/audio/voicelines/${k}/manifest.json`, '{}');
  return root;
}

const meldingen = (r) => r.problems.map((p) => `${p.where}: ${p.message}`).join(' | ');

// goede verwijzingen en tellers: alles klopt
{
  const r = await check({ repo: maak() });
  ok(r.problems.length === 0, 'goede fixture geeft geen fouten: ' + meldingen(r));
  ok(r.refs === 1, `een verwijzing met pad geteld, zonder pad overgeslagen (${r.refs})`);
  ok(r.counters === 12, `tellers geteld: ${r.counters}`);
  ok(r.skipped.length === 7 && r.skipped.every((s) => s.includes('mechanica')), 'ontbrekende regelmodule geeft SKIP: ' + r.skipped.join(' | '));
}

// ontbrekend bestand
{
  const r = await check({ repo: maak({ verhaal: VERHAAL().replace('game/js/a.js:1', 'game/js/weg.js:1') }) });
  ok(r.problems.length === 1 && /game\/js\/weg\.js bestaat niet/.test(meldingen(r)), 'ontbrekend bestand faalt: ' + meldingen(r));
}

// regel buiten het bestand (het bestand heeft drie regels)
{
  const r = await check({ repo: maak({ verhaal: VERHAAL().replace('game/js/a.js:1', 'game/js/a.js:9') }) });
  ok(r.problems.length === 1 && /valt buiten het bestand \(3 regels\)/.test(meldingen(r)), 'regel buiten bereik faalt: ' + meldingen(r));
  const q = await check({ repo: maak({ verhaal: VERHAAL().replace('game/js/a.js:1', 'game/js/a.js:1-9') }) });
  ok(/a\.js:1-9 valt buiten het bestand/.test(meldingen(q)), 'bereik buiten het bestand faalt: ' + meldingen(q));
}

// lege regel
{
  const r = await check({ repo: maak({ verhaal: VERHAAL().replace('game/js/a.js:1', 'game/js/a.js:2') }) });
  ok(r.problems.length === 1 && /wijst op een lege regel/.test(meldingen(r)), 'lege regel faalt: ' + meldingen(r));
}

// teller die niet klopt (de bron telt drie scènes, de spec zegt vier)
{
  const r = await check({ repo: maak({ verhaal: VERHAAL({ scenes: 4 }) }) });
  ok(r.problems.length === 2 && /spec zegt 4 scènes, de bron zegt 3/.test(meldingen(r)), 'verkeerde teller faalt: ' + meldingen(r));
}

// een teller die niet meer in de spec staat: de controle mag niet stil verdwijnen
{
  const r = await check({ repo: maak({ verhaal: VERHAAL().replace('De data: 3 scènes, 3 regels', 'De cijfers staan elders') }) });
  ok(r.problems.length === 1 && /staat niet meer in de spec/.test(meldingen(r)), 'verdwenen teller faalt: ' + meldingen(r));
}

// geen bron: alle tellers overgeslagen, geen fout (een verse worktree zonder verhaaldata)
{
  const r = await check({ repo: maak({ scenes: null }) });
  ok(r.problems.length === 0, 'zonder verhaaldata geen fouten: ' + meldingen(r));
  ok(r.skipped.length === 13, `zonder verhaaldata dertien tellers overgeslagen (${r.skipped.length})`);
  ok(r.skipped.some((s) => /script\.json ontbreekt/.test(s)), 'de SKIP-regel noemt de ontbrekende bron');
}

// geen specs: dat is een fout, niet een groene poort
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-spec-check-'));
  const r = await check({ repo: root });
  ok(r.problems.length === 1 && /de specs ontbreken/.test(meldingen(r)), 'zonder specs faalt de poort: ' + meldingen(r));
}

// --- --write haalt de getallen bij de bron
{
  const root = maak({ verhaal: VERHAAL({ scenes: 99, regels: 99, geen: 99 }) });
  const voor = await check({ repo: root });
  ok(voor.problems.length > 0, 'een verkeerde teller faalt eerst');

  const w = await write({ repo: root });
  ok(w.changed.length >= 3, `write meldt de wijzigingen (${w.changed.length})`);
  const na = await check({ repo: root });
  ok(na.problems.length === 0, 'na write klopt de spec met de bron: ' + meldingen(na));

  const nog = await write({ repo: root });
  ok(nog.changed.length === 0, `write is idempotent (${nog.changed.length} bij de tweede ronde)`);
}

// --- --write laat de notatie staan die de spec al gebruikt
{
  const metPunt = VERHAAL().replace('3 scènes, 3 regels', '3 scènes, 4.500 regels');
  const root = maak({
    verhaal: metPunt,
    scenes: SCENES({ scenes: [{ id: 'M01.1', step: 'M01', lines: Array.from({ length: 4500 }, (_, i) => ({ speaker: 'T', text: `r${i}`, rec: 'story', textOnly: false })) }] }),
  });
  await write({ repo: root });
  const tekst = fs.readFileSync(path.join(root, '.specs-fire/standards/verhaal.md'), 'utf8');
  ok(/4\.500 regels/.test(tekst), 'duizendpunt blijft duizendpunt: ' + (tekst.match(/[\d.]+ regels/) || ['?'])[0]);
}

// --- --write raakt een kloppende spec niet aan
{
  const root = maak();
  const p = path.join(root, '.specs-fire/standards/verhaal.md');
  const voor = fs.readFileSync(p, 'utf8');
  const w = await write({ repo: root });
  ok(w.changed.length === 0 && voor === fs.readFileSync(p, 'utf8'), 'een kloppende spec blijft byte voor byte gelijk');
}


// --- drift (#648): versie, spelersteller en CI-trigger komen uit de bron
{
  const maakDrift = (aan = {}) => {
    const root = maak();
    const put = (f, s) => { const q = path.join(root, f); fs.mkdirSync(path.dirname(q), { recursive: true }); fs.writeFileSync(q, s); };
    put('desktop/package.json', JSON.stringify({ version: '1.2.3' }));
    put('AGENTS.md', 'De 65 verwijzingen naar world.player zijn de reden.');
    put('scripts/player_singleton_baseline.json', JSON.stringify({ total: 65 }));
    put('.github/workflows/test.yml', 'on:\n  pull_request:\n  push:\n    branches: [main]\n  workflow_dispatch:\n');
    put('.specs-fire/standards/publicatie.md', '- **Versie:** `1.2.3` in `desktop/package.json`, met `## [1.2.3]`');
    put('.specs-fire/standards/testing-standards.md', 'CI draait op een pull request, op een push naar main en met de hand (workflow_dispatch).');
    if (aan.versie) put('.specs-fire/standards/publicatie.md', '- **Versie:** `1.2.4` in `desktop/package.json`, met `## [1.2.4]`');
    if (aan.speler) put('AGENTS.md', 'De 66 verwijzingen naar world.player zijn de reden.');
    if (aan.trigger) put('.specs-fire/standards/testing-standards.md', 'CI draait bij elke push.');
    return root;
  };
  const schoon = await check({ repo: maakDrift() });
  ok(schoon.problems.length === 0, 'drift: een kloppende fixture geeft geen fouten: ' + meldingen(schoon));
  const versie = await check({ repo: maakDrift({ versie: true }) });
  ok(versie.problems.some((q) => /versie 1\.2\.4/.test(q.message)), 'drift: een andere versie in de spec is een fout');
  const speler = await check({ repo: maakDrift({ speler: true }) });
  ok(speler.problems.some((q) => /verwijzingen naar world\.player/.test(q.message)), 'drift: een andere spelersteller is een fout');
  const trigger = await check({ repo: maakDrift({ trigger: true }) });
  ok(trigger.problems.some((q) => /pull_request/.test(q.message)), 'drift: een verkeerde CI-trigger is een fout');
}

console.log(failed ? `${failed} fouten` : 'spec_check_test: alles goed');
process.exit(failed ? 1 : 0);
