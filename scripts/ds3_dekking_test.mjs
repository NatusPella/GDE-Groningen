// Ratel voor "alle UI via het designsysteem" (zeefdruk, ADR 0040; opdracht van de eigenaar 21-11: "Alle UI moet via Design System 3,
// dus ook de benchmark-UI"). Telt per bestand in game/, desktop/ en web/ de harde kleuren, het glas-op-donker, de oude
// componentklassen, de losse lettertypen en de te kleine lettergroottes (scripts/lib/ds3_telling.mjs) en laat de aantallen
// alleen dalen: een bestand dat boven zijn stand uitkomt, faalt; een bestand dat eronder komt, vraagt om een nieuwe stand.
// Wat bewust blijft (3D-materialen, kaartstijl, definitie van het palet) staat met een reden in BEWUST (ds3_telling.mjs).
//   node scripts/ds3_dekking_test.mjs            de ratel
//   node scripts/ds3_dekking_test.mjs --lijst    alle regels die nog meetellen, per bestand
//   node scripts/ds3_dekking_test.mjs --write    de stand (scripts/ds3_dekking_basis.json) gelijkzetten aan de bron (alleen om te dalen)
import fs from 'node:fs';
import path from 'node:path';
import { telAlles, totalen, SOORTEN, BEWUST, BEWUST_PATROON, ROOT } from './lib/ds3_telling.mjs';

const BASIS = path.join(ROOT, 'scripts', 'ds3_dekking_basis.json');
const res = telAlles();
const stand = {};
for (const [f, v] of Object.entries(res)) {
  if (v.bewust) continue;
  const n = Object.fromEntries(SOORTEN.map((s) => [s, v.n[s]]));
  if (SOORTEN.some((s) => n[s])) stand[f] = n;
}

if (process.argv.includes('--lijst')) {
  for (const [f, v] of Object.entries(res)) {
    if (v.bewust || !SOORTEN.some((s) => v.n[s])) continue;
    console.log(`${f}  ${SOORTEN.map((s) => `${s}:${v.n[s]}`).join(' ')}`);
    for (const x of v.regels) console.log(`  ${x.r}  [${SOORTEN.filter((s) => x[s]).join(',')}]  ${x.t}`);
  }
}
if (process.argv.includes('--write')) {
  const oud = fs.existsSync(BASIS) ? JSON.parse(fs.readFileSync(BASIS, 'utf8')) : null;
  if (oud) {
    const bekend = new Set(Object.values(oud).flatMap((o) => Object.keys(o))); // een nieuwe soort mag voor het eerst in de stand komen
    const hoger = Object.keys(stand).filter((f) => SOORTEN.some((s) => bekend.has(s) && stand[f][s] > ((oud[f] || {})[s] || 0)));
    if (hoger.length) { console.error('ds3_dekking_test --write: een ratel stijgt niet; eerst terug naar de stand in ' + hoger.join(', ')); process.exit(1); }
  }
  fs.writeFileSync(BASIS, JSON.stringify(stand, null, 1) + '\n');
  console.log('ds3_dekking_basis.json geschreven: ' + Object.keys(stand).length + ' bestanden');
  process.exit(0);
}

let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.error('FOUT: ' + w); } };

// ---- de allowlist zelf klopt: elk bestand bestaat, elke regel heeft een reden ----
for (const [f, reden] of Object.entries(BEWUST)) {
  ok(fs.existsSync(path.join(ROOT, f)), `BEWUST noemt ${f}, maar het bestand bestaat niet meer (haal de regel weg)`);
  ok(typeof reden === 'string' && reden.length > 12, `BEWUST ${f} heeft een reden`);
}
for (const [re, reden] of BEWUST_PATROON) if (reden) ok(reden.length > 12, `BEWUST_PATROON ${re} heeft een reden`);

// ---- de ratel ----
ok(fs.existsSync(BASIS), 'scripts/ds3_dekking_basis.json bestaat (maak hem met --write)');
const basis = fs.existsSync(BASIS) ? JSON.parse(fs.readFileSync(BASIS, 'utf8')) : {};
const lager = [];
for (const f of new Set([...Object.keys(basis), ...Object.keys(stand)])) {
  for (const s of SOORTEN) {
    const nu = (stand[f] || {})[s] || 0, was = (basis[f] || {})[s] || 0;
    if (nu > was) ok(false, `${f}: ${s} steeg van ${was} naar ${nu} (gebruik .ds-z-* en var(--ds-...); zie docs/DESIGN-AUDIT-UI-21-11.md)`);
    else if (nu < was) lager.push(`${f} ${s} ${was}->${nu}`);
  }
}
ok(lager.length === 0, `de stand daalt: draai node scripts/ds3_dekking_test.mjs --write om de ratel aan te scherpen (${lager.slice(0, 6).join('; ')}${lager.length > 6 ? ' ...' : ''})`);

// ---- de nieuwe schermen blijven schoon (nul in elke soort) ----
for (const f of ['game/js/ds-schermen.css', 'game/js/fouttoast.js', 'game/js/ds-components.css']) {
  const v = res[f];
  ok(!!v, `${f} wordt geteld`);
  if (v) for (const s of SOORTEN) if (s !== 'oud' || f !== 'game/js/ds-components.css') ok(v.n[s] === 0, `${f} heeft geen ${s} (${v.n[s]})`);
}

const t = totalen(res);
console.log(`ds3_dekking_test: ${n - fout}/${n} controles; nog te doen: ${SOORTEN.map((s) => `${s} ${t[s]}`).join(', ')} in ${Object.keys(stand).length} bestanden (bewust buiten de telling: ${Object.values(res).filter((v) => v.bewust).length})`);
process.exit(fout ? 1 : 0);
