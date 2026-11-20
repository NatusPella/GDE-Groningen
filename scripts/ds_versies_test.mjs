// Geen verwijzingen naar "designsysteem v1/v2/v3" (#1006): het designsysteem heet gewoon het designsysteem, de
// tokens en klassen horen bij één set (ds-*). De test telt ruwe versieverwijzingen in code, CSS, docs, tests en
// bestandsnamen; doel is nul buiten een gedocumenteerde allowlist. Niet geteld: opslagsleutels (gde-*-v1),
// het netwerkprotocol, audiobestanden (_v1.wav) en vectorvariabelen (v1, v2 in 3D-code).
//   node scripts/ds_versies_test.mjs [--lijst]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = 'scripts/ds_versies_test.mjs';

// Gedocumenteerde allowlist: plekken waar versies historie zijn of de opruiming zelf beschrijven.
export const ALLOW = [
  'CHANGELOG.md',                                        // geschiedenis per release
  '.specs-fire/standards/adr/',                          // ADR-geschiedenis (0040 heet nog "(v3)": het besluit van toen)
  '.specs-fire/runs/', '.specs-fire/intents/',           // oude runlogboeken
  'docs/archief/',                                       // archief
  'docs/beeld', 'docs/img/',                             // beelden en hun begeleidende json
  'docs/DESIGN-STAND-21-11.md',                          // beschrijft de opruiming (#1006) en noemt dus de oude namen
  SELF,
];
const TEKST = /\.(js|mjs|cjs|css|html|md|json|yml|yaml|sh|txt)$/;
// een versie hoort bij het designsysteem als ze naast een van deze woorden of voorvoegsels staat
const V = '(?:v[123])';
const PATRONEN = [
  new RegExp(`(?:ds|zeef|kop|tekst|design|systeem|hud|menu|glas|kassabon)[-_ ]${V}\\b`, 'i'),                 // ds-v2, kop-v3, designsysteem v3
  new RegExp(`\\b${V}[-_ ](?:ds|design|component|token|kaart|paneel|stijl|glas|menu|hud|zeef|kassabon)`, 'i'), // v2-component, v3 kaart
  new RegExp(`\\b(?:design|ds|zeef|hud|ui)\\w*[-_ ]?${V}\\b`, 'i'),
];
// uitzonderingen op een regel: opslag, protocol, audio
const UIT = /gde-[a-z0-9-]*-v[123]|gte-[a-z0-9-]*-v[123]|serverlijst-v1|coop-signal-v1|_v[123]\.wav/i;

function bestanden() {
  const r = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  const lijst = (r.stdout || '').split('\0').filter(Boolean);
  const werk = spawnSync('git', ['ls-files', '-z', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  return [...new Set([...lijst, ...(werk.stdout || '').split('\0').filter(Boolean)])];
}
const toegestaan = (f) => ALLOW.some((a) => f === a || f.startsWith(a));

export function tel() {
  const hits = [];
  for (const f of bestanden()) {
    if (toegestaan(f) || !fs.existsSync(path.join(ROOT, f))) continue;
    // bestandsnaam
    if (/(?:design|ds)[-_]v[123](?![a-z0-9])/i.test(path.basename(f))) hits.push({ f, r: 0, t: 'bestandsnaam' });
    if (!TEKST.test(f)) continue;
    let src; try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
    if (src.length > 3e6) continue;
    const regels = src.split('\n');
    for (let i = 0; i < regels.length; i++) {
      const l = regels[i].replace(UIT, '');
      if (PATRONEN.some((p) => p.test(l))) hits.push({ f, r: i + 1, t: regels[i].trim().slice(0, 140) });
    }
  }
  return hits;
}

const hits = tel();
if (process.argv.includes('--lijst')) for (const h of hits) console.log(`${h.f}:${h.r}  ${h.t}`);
if (hits.length) {
  for (const h of hits.slice(0, 25)) console.error(`${h.f}:${h.r}  ${h.t}`);
  console.error(`ds_versies_test: ${hits.length} verwijzingen naar designsysteem v1/v2/v3 buiten de allowlist`);
  process.exit(1);
}
console.log(`ds_versies_test: 0 verwijzingen naar designsysteem v1/v2/v3 buiten de allowlist (${ALLOW.length} allowlist-plekken)`);

// Tweede teller (ratel): de oudere componentenset (.ds-kaart, .ds-knop, .ds-chip, .ds-papier, .ds-glas) mag alleen nog
// in de bestanden hieronder voorkomen; een nieuw bestand ermee faalt. Elke omzetting naar de .ds-z-set haalt een
// bestand uit deze lijst (en uit ds-components.css zodra er geen gebruiker meer is). Zie docs/DESIGN-STAND-21-11.md.
export const OUDE_SET_TOEGESTAAN = {
  'game/js/ds-components.css': 'de definitie zelf (ds_tokens_test toetst ze; weg met de hernoeming .ds-z-* naar .ds-*, aparte stap)',
  'game/js/ds-tokens.css': 'de rolvariabelen van papier en glas (het glas hoort bij .gm, zie docs/DESIGN-SCHULD.md)',
  'game/js/ds-galerij.js': 'de galerij toont ze (als referentie naast de zeefdruk)',
  'game/ds-galerij.html': 'de galerij toont ze',
  'game/js/a11y.css': 'focusring op papier en glas',
};
{
  const OUD = /\bds-(?:kaart|knop|chip|papier|glas)\b/;
  const gevonden = bestanden().filter((f) => /^game\/.*\.(js|css|html)$/.test(f) && fs.existsSync(path.join(ROOT, f)) && OUD.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  const nieuw = gevonden.filter((f) => !OUDE_SET_TOEGESTAAN[f]);
  if (nieuw.length) { console.error('ds_versies_test: de oude componentenset staat in ' + nieuw.join(', ') + ' (gebruik de .ds-z-set)'); process.exit(1); }
  const klaar = Object.keys(OUDE_SET_TOEGESTAAN).filter((f) => !gevonden.includes(f));
  if (klaar.length) { console.error('ds_versies_test: omgezet, haal uit OUDE_SET_TOEGESTAAN: ' + klaar.join(', ')); process.exit(1); }
  console.log(`ds_versies_test: de oude componentenset staat nog in ${gevonden.length} bestanden (allowlist ${Object.keys(OUDE_SET_TOEGESTAAN).length}, krimpt per omzetting)`);
}
