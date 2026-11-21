// Ratel voor "alle UI via het designsysteem" (zeefdruk, ADR 0040; opdracht van de eigenaar 21-11: "Alle UI moet via Design System 3,
// dus ook de benchmark-UI"). Telt per bestand in game/, desktop/ en web/ de harde kleuren, het glas-op-donker, de oude
// componentklassen, de losse lettertypen en de te kleine lettergroottes (scripts/lib/ds3_telling.mjs) en laat de aantallen
// alleen dalen: een bestand dat boven zijn stand uitkomt, faalt; een bestand dat eronder komt, vraagt om een nieuwe stand.
// Wat bewust blijft (3D-materialen, kaartstijl, definitie van het palet) staat met een reden in BEWUST (ds3_telling.mjs).
//   node scripts/ds3_ratel_test.mjs            de ratel
//   node scripts/ds3_ratel_test.mjs --lijst    alle regels die nog meetellen, per bestand
//   node scripts/ds3_ratel_test.mjs --write    de stand (scripts/ds3_dekking_basis.json) gelijkzetten aan de bron (alleen om te dalen)
import fs from 'node:fs';
import path from 'node:path';
import { scopeTokens, resolveToken, contrastRatio } from './release/ds_tokens_lib.mjs';
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
    if (hoger.length) { console.error('ds3_ratel_test --write: een ratel stijgt niet; eerst terug naar de stand in ' + hoger.join(', ')); process.exit(1); }
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
ok(lager.length === 0, `de stand daalt: draai node scripts/ds3_ratel_test.mjs --write om de ratel aan te scherpen (${lager.slice(0, 6).join('; ')}${lager.length > 6 ? ' ...' : ''})`);

// ---- de nieuwe schermen blijven schoon (nul in elke soort) ----
for (const f of ['game/js/ds-schermen.css', 'game/js/fouttoast.js', 'game/js/ds-components.css']) {
  const v = res[f];
  ok(!!v, `${f} wordt geteld`);
  if (v) for (const s of SOORTEN) if (s !== 'oud' || f !== 'game/js/ds-components.css') ok(v.n[s] === 0, `${f} heeft geen ${s} (${v.n[s]})`);
}

// ---- ds3-vervolg 21-11: de bevindingen F1, F3, F5, F8, F19, F26 blijven opgelost (de nieuwe tellingen lus, lang, emoji en svg staan in de ratel hierboven) ----
{
  const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const uiBestanden = Object.keys(res).filter((f) => /\.(?:css|js)$/.test(f) && !res[f].bewust);
  // F1: één bron voor "Beweging beperken": html.reduce-motion én de OS-instelling, voor alle UI (ook ingespoten stijlen)
  const beweging = lees('game/js/ds-beweging.css');
  ok(/html\.reduce-motion \*/.test(beweging) && /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*/.test(beweging), 'F1: ds-beweging.css kent html.reduce-motion en prefers-reduced-motion (beide takken)');
  ok(/animation-iteration-count:\s*1 !important/.test(beweging) && /transition-duration:\s*0\.01ms !important/.test(beweging), 'F1: de gedeelde regel zet lussen en transities uit');
  ok(/href="js\/ds-beweging\.css"/.test(lees('game/index.html')), 'F1: index.html laadt ds-beweging.css');
  ok(/classList\.toggle\('reduce-motion'/.test(lees('game/js/motion.js')), 'F1: motion.js zet html.reduce-motion bij de instelling én de OS-voorkeur');
  // F3: geen crème of alfa als scrollbalk; de duim haalt 3:1 tegen de baan en het papier
  const alfaBalk = [];
  for (const f of uiBestanden) lees(f).split('\n').forEach((l, i) => {
    const delen = [...l.matchAll(/scrollbar-color:[^;}]*|::-webkit-scrollbar-(?:thumb|track)[^{]*\{[^}]*/g)].map((m) => m[0]);
    if (delen.some((d) => /creme|rgba\(|color-mix\(|var\(--ink\)/.test(d))) alfaBalk.push(`${f}:${i + 1}`);
  });
  ok(alfaBalk.length === 0, `F3: scrollbalken gebruiken --ds-scroll-duim en --ds-scroll-spoor (geen crème of alfa): ${alfaBalk.slice(0, 5).join(', ')}`);
  const tokens = lees('game/js/ds-tokens.css');
  const tk = scopeTokens(tokens, 'papier');
  for (const [duim, baan, norm] of [['--ds-scroll-duim', '--ds-scroll-spoor', 3], ['--ds-scroll-duim', '--ds-c-ink-papier', 3]]) {
    const r = contrastRatio(resolveToken(tk, duim), resolveToken(tk, baan));
    ok(r >= norm, `F3: ${duim} tegen ${baan} is ${r.toFixed(2)}:1 (norm ${norm}:1)`);
  }
  // F8: roze alleen als vlak of misdruk, nooit als tekst op papier; Rustig drukwerk haalt 7:1 voor het roze
  const rozeTekst = [];
  for (const f of uiBestanden) lees(f).split('\n').forEach((l, i) => { if (/(?:^|[^-a-z])color:\s*var\(--ds-c-ink-roze\)/.test(l) && /pause-menu|pm-|vh-|ds-z-|m-/.test(l) && !/intromontage|trailer/.test(f)) rozeTekst.push(`${f}:${i + 1}`); });
  ok(rozeTekst.length === 0, `F8: geen roze tekst op papier in menu's (gebruik --ds-c-rood-tx): ${rozeTekst.join(', ')}`);
  const rustigRoze = (tokens.match(/html\.rustig-drukwerk, \.ds-rustig \{[^}]*--ds-c-ink-roze:\s*(#[0-9a-fA-F]{6})/) || [])[1];
  ok(!!rustigRoze && contrastRatio(rustigRoze, resolveToken(tk, '--ds-c-ink-papier')) >= 7, `F8: Rustig drukwerk-roze ${rustigRoze} haalt 7:1 tegen papier`);
  // F19: de regelaudit staat alleen de zeefdruk-lettertypen toe en kent de 13 px-vloer
  const regels = await import('./release/design_rules.mjs');
  ok(!regels.ALLOWED_FONTS.has('bebas neue') && !regels.ALLOWED_FONTS.has('arial narrow') && !regels.ALLOWED_FONTS.has('arial'), 'F19: Bebas Neue, Arial Narrow en Arial staan niet meer voorop in ALLOWED_FONTS');
  ok(regels.TEXT_FLOOR_PX === 13 && regels.TEXT_KEY_FLOOR_PX === 12, 'F19: de vloer is 13 px, een toetsplaatje 12 px');
  // F18: de sfeerpaletten zijn tokens (geen eigen rgba of hex); de samenvoeging met ctxidentiteit.js staat als schuld in docs/DESIGN-AUDIT-UI-21-11.md
  for (const f of ['game/js/carrieresfeer.js', 'game/js/activiteitensfeer.js']) {
    const src = lees(f).replace(/\/\/.*$/gm, '').split('\n').filter((r) => !/^\s*\w+: S\(/.test(r)).join('\n'); // de accenttabel (S(...)) is data
    ok(!/rgba?\(\s*\d/.test(src) && !/#[0-9a-fA-F]{6}\b/.test(src), `F18: ${f} heeft geen eigen rgba of hex buiten de accenttabel`);
  }
  // F26: de toetsfonts worden één keer voorgeladen
  const pre = [...lees('game/index.html').matchAll(/rel="preload" href="(fonts\/input\/[^"]+)"/g)].map((m) => m[1]);
  ok(new Set(pre).size === pre.length, `F26: geen dubbele font-preload (${pre.length} regels, ${new Set(pre).size} uniek)`);
}

const t = totalen(res);
console.log(`ds3_ratel_test: ${n - fout}/${n} controles; nog te doen: ${SOORTEN.map((s) => `${s} ${t[s]}`).join(', ')} in ${Object.keys(stand).length} bestanden (bewust buiten de telling: ${Object.values(res).filter((v) => v.bewust).length})`);
process.exit(fout ? 1 : 0);
