// Canonbewaker (#1119, #1062): Tammo en Tessa zijn 24, net afgestudeerd en werkloos, vijf jaar vrienden sinds de eerste studieweek;
// Tessa komt van het platteland. Geen speltekst mag de oude canon (34 jaar, twaalf of twintig jaar kennen, een vaste baan) terugbrengen.
//   node scripts/verhaalcanon_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n').slice(0, 6).join(' ')); } };

// Alles wat de speler ziet of hoort komt uit game/js en game/storydata.
const bestanden = [];
for (const d of ['game/js', 'game/storydata']) for (const f of fs.readdirSync(path.join(root, d))) if (/\.(js|json)$/.test(f)) bestanden.push(`${d}/${f}`);
const tekst = new Map(bestanden.map((f) => [f, lees(f)]));

// Oude canon: nergens meer in speltekst.
const VERBODEN = [
  [/ik ben vierendertig|vierendertig jaar/i, 'Tammo is 24, niet 34'],
  [/twaalf jaar (verliefd|gezwegen|niks|lang)/i, 'verliefd en zwijgen duurde vijf jaar'],
  [/twintig jaar (geloofd|verliefd|vrienden|bevriend)/i, 'ze kennen elkaar vijf jaar'],
  [/(treinreis|trein) (naar Delfzijl )?als kinderen/i, 'de treinreis hoort bij de studie'],
  [/kennen elkaar al twintig/i, 'ze kennen elkaar vijf jaar'],
  [/(mijn|zijn|haar|hun) (vaste )?(kantoorbaan|boerderijbaan)/i, 'werkloos: klusjes uit het spel, geen vaste baan'],
  [/naast (mijn|zijn|haar|hun) (werk|baan|baantjes)(?![a-z])/i, 'werkloos: naast hun klusjes'],
];
t('geen oude canon in speltekst', () => {
  const treffers = [];
  for (const [f, s] of tekst) for (const [re, waarom] of VERBODEN) { const m = s.match(re); if (m) treffers.push(`${f}: "${m[0]}" (${waarom})`); }
  assert.equal(treffers.join(" | "), "");
});

t('de nieuwe canon staat er: vierentwintig, vijf jaar', () => {
  const script = tekst.get('game/storydata/script.json');
  assert.ok(script.includes('Ik ben vierentwintig, oma'), 'Tammo zegt vierentwintig');
  assert.ok(script.includes('vijf jaar geloofd'), 'Tessa geloofde het vijf jaar');
  assert.ok(script.includes('Dat duurde vijf jaar'), 'M26.7');
});

t('Tessa komt van het platteland: dossier, karakterbonus en opening-bijbel zeggen hetzelfde', () => {
  const d = tekst.get('game/js/characterdossiers_leads.js');
  assert.ok(d.includes('boerendochter van het platteland'), 'dossier origin');
  assert.ok(d.includes('vanaf haar achttiende in Stad'), 'naar Stad voor de studie');
  assert.ok(d.includes('dorpsteam'), 'dorpsteam');
  const kb = tekst.get('game/js/karakterbonus.js');
  assert.ok(kb.includes('platteland'), 'karakterbonus-lore');
  assert.ok(lees('docs/verhaal/OPENING-BIJBEL.md').includes('platteland'), 'bijbel');
});

t('het canonblad noemt de besluiten', () => {
  const c = lees('docs/VERHAALCANON-21-11.md');
  for (const w of ['vierentwintig', 'Kiezelweek', 'vijf jaar', 'werkloos', 'klusjes', 'platteland']) assert.ok(c.includes(w), w);
});

console.log(fails ? `verhaalcanon_test: ${fails} van ${n} groepen gefaald` : `verhaalcanon_test ok (${n} groepen)`);
process.exit(fails ? 1 : 0);
