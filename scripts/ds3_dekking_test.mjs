// Dekking van de DS3-regels voor microanimaties (DESIGN_SYSTEM.md en ui-taal.md, "Microanimaties (DS3)"):
// game/js/ds-micro.css houdt zich aan de regels (alleen transform en opacity, tijden uit tokens, elke klasse heeft een
// reduced-motion-tegenhanger), de tokens staan onder "Beweging beperken" op 0, de catalogus staat in de docs en de
// klassen die de code gebruikt bestaan. Alleen lezen, geen browser.
//   node scripts/ds3_dekking_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { controleerMicroCss, microKlassen, tokenMs, leesCss, controleerToetsInKnop, MAX_MICRO_MS, MAX_MOMENT_MS } from './lib/ds3_regels.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };

const micro = lees('game/js/ds-micro.css');
const tokens = lees('game/js/ds-tokens.css');
const ds = lees('DESIGN_SYSTEM.md');
const taal = lees('.specs-fire/standards/ui-taal.md');

// 1. de echte css is schoon
const fouten = controleerMicroCss(micro, { tokensCss: tokens });
ok(fouten.length === 0, 'ds-micro.css houdt zich aan alle DS3-regels', fouten.map((x) => `${x.regel}: ${x.bericht}`).slice(0, 4).join(' | '));

// 2. de controle zelf bijt: elke overtreding wordt gemeld
const basis = (extra) => micro + '\n' + extra;
const meldt = (extra, woord) => controleerMicroCss(basis(extra), { tokensCss: tokens }).some((x) => (x.regel + x.bericht).includes(woord));
ok(meldt('.ds-m-fout { transition: width var(--ds-m-lang) var(--ds-m-uit); }', 'width'), 'een overgang op width wordt geweigerd');
ok(meldt('.ds-m-fout { transition: all var(--ds-m-lang); }', 'all'), 'een overgang op all wordt geweigerd');
ok(meldt('.ds-m-fout { transition: box-shadow var(--ds-m-lang); }', 'box-shadow'), 'box-shadow buiten de knop wordt geweigerd');
ok(meldt('.ds-m-fout { transition: opacity 300ms; }', 'letterlijke tijd'), 'een letterlijke tijd wordt geweigerd');
ok(meldt('.ds-m-fout { animation: ds-m-x var(--ds-moment-duur) 1; }', 'ds-moment'), 'een moment-tijd in een .ds-m-regel wordt geweigerd');
ok(meldt('.ds-m-fout { animation: ds-m-x var(--ds-m-lang) infinite; }', 'infinite'), 'een lus buiten de live-stip wordt geweigerd');
ok(meldt('@keyframes ds-m-slecht { to { height: 10px; } }', 'height'), 'een keyframe op height wordt geweigerd');
ok(meldt('.ds-m-fout { color: #ff0000; }', 'kleur'), 'een losse kleur wordt geweigerd');
ok(meldt('.ds-m-zonder { transition: opacity var(--ds-m-lang); }', 'ds-m-zonder'), 'een klasse zonder reduced-motion-tegenhanger wordt gemeld');
ok(!controleerMicroCss(micro.replace(/@media \(prefers-reduced-motion: reduce\)/, '@media (min-width: 1px)'), { tokensCss: tokens }).every((x) => x.regel !== 'prefers-reduced-motion'), 'een ontbrekende prefers-reduced-motion-tak wordt gemeld');
ok(controleerMicroCss(micro, { tokensCss: tokens.replace('--ds-m-lang: 250ms', '--ds-m-lang: 300ms') }).some((x) => x.regel === '--ds-m-lang'), 'een --ds-m-token boven 250 ms wordt gemeld');

// 3. de tokens: de schaal, en alles op 0 in de drie takken
ok(tokenMs(tokens, '--ds-m-kort') === 80 && tokenMs(tokens, '--ds-m-midden') === 150 && tokenMs(tokens, '--ds-m-lang') === 250, 'de microtijden zijn 80, 150 en 250 ms');
ok(tokenMs(tokens, '--ds-m-lang') === tokenMs(tokens, '--ds-m-max'), '--ds-m-lang is gelijk aan --ds-m-max');
ok(tokenMs(tokens, '--ds-moment-stap') === tokenMs(tokens, '--ds-m-snel'), 'de staffel van een hoogtepunt is --ds-m-snel (120 ms)');
ok(tokenMs(tokens, '--ds-moment-max') === MAX_MOMENT_MS && MAX_MOMENT_MS === 1600, 'een hoogtepunt duurt hooguit 1,6 s');
ok(tokenMs(tokens, '--ds-moment-duur') <= MAX_MOMENT_MS && tokenMs(tokens, '--ds-m-staffel') > 0, 'de staffel- en onderdeelduur zijn gevuld');
ok(/--ds-m-uit:\s*cubic-bezier/.test(tokens) && /--ds-m-inuit:\s*cubic-bezier/.test(tokens) && /--ds-m-stempel:\s*cubic-bezier\([^)]*1\.\d+/.test(tokens), 'de drie easings staan er, de stempel met overshoot (y boven 1)');
const alleTijden = [...tokens.matchAll(/^\s*(--ds-(?:m|moment)-[a-z-]+):\s*\d+ms/gm)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
ok(alleTijden.length >= 10, 'de tijdtokens zijn gevonden', String(alleTijden.length));
const plat = tokens.replace(/\s+/g, ' ');
const takTekst = {
  'prefers-reduced-motion': (plat.match(/@media \(prefers-reduced-motion: reduce\) \{ :root \{([^}]*)\}/) || [])[1] || '',
  'html.reduce-motion': (plat.match(/html\.reduce-motion \{([^}]*)\}/) || [])[1] || '',
  'html.rustig-drukwerk': (plat.match(/html\.rustig-drukwerk, \.ds-rustig \{([^}]*)\}/) || [])[1] || '',
};
for (const [tak, tekst] of Object.entries(takTekst)) {
  const mist = alleTijden.filter((t) => !new RegExp(`${t}:\\s*0ms`).test(tekst));
  ok(mist.length === 0, `${tak}: elk tijdtoken staat op 0 ms`, mist.join(', '));
}
for (const m of tokens.matchAll(/^\s*--ds-m-([a-z-]+):\s*(\d+)ms/gm)) ok(Number(m[2]) <= MAX_MICRO_MS, `--ds-m-${m[1]} is hooguit ${MAX_MICRO_MS} ms`);

// 4. de catalogus: elke klasse staat in DESIGN_SYSTEM.md; de sectie en de tokens staan in beide documenten
const klassen = [...new Set([...micro.matchAll(/\.(ds-(?:m|moment)-[a-z0-9_-]+)/g)].map((m) => m[1]))].filter((k) => !/-(x|y)$/.test(k));
ok(klassen.length >= 30, 'de catalogus heeft minstens 30 klassen', String(klassen.length));
for (const k of klassen) ok(ds.includes(k), `${k} staat in DESIGN_SYSTEM.md`);
ok(/#{2,3} Microanimaties \(DS3\)/.test(ds), 'DESIGN_SYSTEM.md heeft de sectie Microanimaties (DS3)');
ok(/#{2,3} Microanimaties \(DS3\)/.test(taal), 'ui-taal.md heeft de sectie Microanimaties (DS3)');
for (const t of ['--ds-m-kort', '--ds-m-midden', '--ds-m-lang', '--ds-m-staffel', '--ds-m-uit', '--ds-m-inuit', '--ds-m-stempel', '--ds-moment-stap', '--ds-moment-max']) ok(ds.includes(t) && taal.includes(t.replace(/^--/, '--')), `${t} staat in beide documenten`);
ok(/moment/i.test(taal) && /1,6 s/.test(taal) && /Beweging beperken/.test(taal) && /Rustig drukwerk/.test(taal) && /Samen spelen/.test(taal), 'ui-taal.md noemt het moment (1,6 s), de twee rustige standen en Samen spelen');
ok(/<link rel="stylesheet" href="js\/ds-micro\.css">/.test(lees('game/index.html')), 'game/index.html laadt ds-micro.css');
ok(/ds-micro\.css/.test(lees('game/ds-galerij.html')), 'de galerij laadt ds-micro.css');

// 5. gebruik: elke .ds-m-* of .ds-moment-* klasse in de code of de css bestaat, en de toegepaste plekken dragen hem
const bestaand = new Set(klassen);
const bronnen = [];
const loop = (map) => { for (const f of fs.readdirSync(path.join(ROOT, map))) { const p = `${map}/${f}`; if (/\.(js|css|html)$/.test(f) && !/^ds-micro\.css$/.test(f)) bronnen.push(p); } };
loop('game/js'); loop('game');
let onbekend = [];
for (const p of bronnen) {
  const t = lees(p);
  for (const m of t.matchAll(/(?<![\w-])(ds-(?:m|moment)-[a-z0-9_]+(?:--[a-z0-9_]+)?)(?![\w-])/g)) if (!bestaand.has(m[1]) && !/^ds-m-(x|y|i|na|p|dx|dy|sx|accent|tab-x|tab-w|weg-x)$/.test(m[1]) && !/^ds-moment-(n|dx|dy)$/.test(m[1])) onbekend.push(`${p}:${m[1]}`);
}
ok(onbekend.length === 0, 'elke gebruikte .ds-m-* of .ds-moment-* klasse bestaat in ds-micro.css', onbekend.slice(0, 5).join(', '));

const geraakt = (bestand, ...woorden) => { const t = lees(bestand); return woorden.every((w) => t.includes(w)); };
ok(geraakt('game/js/achievements.js', 'ds-moment-', 'achievementunlock.js'), 'de prestatietoast gebruikt hoogtepunt-klassen en achievementunlock.js');
ok(geraakt('game/js/achievementsui.js', 'ds-m-rij', 'ds-m-glans'), 'het prestatiemenu gebruikt de rij- en glansklassen');
ok(geraakt("game/js/pausemenu.js", "ds-m-tabs", "trackTabLine", "ds-m-nieuw") && geraakt("game/js/hudcards.js", "ds-m-overshoot") && geraakt("game/js/hud_panel.js", "ds-m-tik", "tikGetal") && geraakt("game/js/hud_panel.css", "var(--ds-m-stempel)"), "de eerste set staat erin: pauzemenu-tabs en stippen, HUD-kaarten, geldteller en doelkaart");
ok(/\[unreleased\]/i.test(lees('CHANGELOG.md')) && /Microanimaties/.test(lees('CHANGELOG.md')), 'de changelog noemt de microanimaties');

// 6. de lezer van de css zelf
ok(leesCss('@media (a) { .x { color: red; } } .y { top: 0; } @keyframes k { from { opacity: 0; } }').regels.length === 2, 'de css-lezer leest regels in en buiten @media');
ok(microKlassen(micro).includes('ds-m-binnen') && microKlassen(micro).includes('ds-moment-stempel'), 'microKlassen vindt de klassen met beweging');

// 7. Toets in de knop (21-11): een knop met data-key heeft zijn glyph IN de knop, en er staat geen losse toetshint naast een knop in een kaartpopup
const { actiesHtml, reisPopupHtml, uitlegHtml, sluitHtml } = await import('../game/js/kaartactieui.js');
const K = await import('../game/js/kaartactie.js');
const { reisOpties } = await import('../game/js/ovopties.js');
const opts7 = reisOpties({ auto: { length: 3200, etaS: 260 }, trein: { length: 3500, etaS: 420, legs: [{ kind: 'train', length: 3500, line: 'Lijn 1' }] } }, { money: 50 });
const rijen7 = K.reisKeuzes(opts7, 3200);
const echt = [
  actiesHtml(K.actieModel({ spot: { x: 3000, y: 400, name: 'X' }, speler: { x: 0, y: 0 }, waypoint: null, opts: opts7 }), null), sluitHtml(),
  reisPopupHtml({ naam: 'X', afstand: '3 km', rijen: rijen7, gekozen: rijen7[0].id, kleur: {}, gast: false, melding: '', reis: { label: 'Reis nu', uitgeschakeld: false } }),
  uitlegHtml(), uitlegHtml({ gast: true }),
].join('\n');
const echteFouten = controleerToetsInKnop(echt);
ok(echteFouten.length === 0, 'de kaartpopups (plekkaart, reispopup, uitleg) zetten elke toets IN de knop', echteFouten.map((x) => `${x.regel}: ${x.bericht}`).join(' | '));
ok((echt.match(/data-key="/g) || []).length >= 10, 'er zijn knoppen met een toets om te controleren', String((echt.match(/data-key="/g) || []).length));
ok(controleerToetsInKnop('<button class="ds-z-knop" data-key="ENTER">Ok</button>').length === 1, 'een knop met data-key zonder glyph wordt gemeld');
ok(controleerToetsInKnop('<button class="x" data-card="a">Ok</button><span class="mv-help-toets ds-toetsregel">x</span>').some((x) => x.regel === 'toetshint'), 'een losse toetshint naast een knop wordt gemeld');
ok(controleerToetsInKnop('<button class="ds-z-knop" data-key="ENTER"><span class="ds-z-knop__label">Ok</span><span class="ds-z-knop__toets" aria-hidden="true"><span class="hud-key" data-gk="ENTER">E</span></span></button>').length === 0, 'een knop met zijn glyph erin is goed');
ok(/#{2,3} Key in the button/.test(ds) && /#{2,3} Navigation with controller and keyboard/.test(ds), 'DESIGN_SYSTEM.md heeft "Key in the button" en "Navigation with controller and keyboard"');
ok(/#{2,3} Toets in de knop/.test(taal) && /#{2,3} Navigatie met controller en toetsenbord/.test(taal), 'ui-taal.md heeft "Toets in de knop" en "Navigatie met controller en toetsenbord"');

console.log(`${n - fails}/${n} DS3-dekkingscontroles groen`);
process.exit(fails ? 1 : 0);
