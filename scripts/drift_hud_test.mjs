// De drift-HUD (driftzone.js, #drift-chip) is een zeefdrukkaart (opdracht eigenaar 21-11, #1064): groot multipliercijfer, score met
// tabelcijfers, balk tot de volgende multiplier, rand per niveau, geen harde kleuren, geen glas, vaste zone zonder overlap, korte pop
// die uit staat bij Rustig drukwerk en Beweging beperken. Puur: leest bronnen, geen Electron.
//   node scripts/drift_hud_test.mjs
import fs from 'node:fs';
import { createDrift, stepDrift, driftVoortgang, DRIFT } from '../game/js/drift.js';
import { duivenZones, driftZone, zoneOverlap, DRIFT_BODEM, DRIFT_BREED } from '../game/js/hudstapel.js';
import { telBestand } from './lib/ds3_regels.mjs';

const lees = (f) => fs.readFileSync(f, 'utf8');
let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.error('FOUT: ' + w); } };

const dz = lees('game/js/driftzone.js');
const css = lees('game/js/ds-schermen.css');
const hud = lees('game/js/hud_panel.css');
const blok = css.slice(css.indexOf('Drift-kaart (driftzone.js)'));

// ---- de voortgang tot de volgende multiplier ----
const d = createDrift();
ok(driftVoortgang(d).mult === 1 && driftVoortgang(d).p === 0, 'zonder keten: x1, geen voortgang');
let hoogste = 0;
for (let i = 0; i < 120; i++) { stepDrift(d, { slip: 0.6, speed: 20, dt: 0.1 }); const v = driftVoortgang(d); ok(v.p >= 0 && v.p <= 1, 'p blijft binnen 0..1'); hoogste = Math.max(hoogste, v.mult); }
ok(hoogste === DRIFT.maxMult, 'na lang driften is de multiplier het maximum');
ok(driftVoortgang(d).max === true && driftVoortgang(d).p === 1, 'op het maximum is de balk vol');
const h = createDrift(); stepDrift(h, { slip: 0.6, speed: 20, dt: DRIFT.step / 2 });
ok(Math.abs(driftVoortgang(h).p - 0.5) < 0.05, 'halverwege een tijdstap is de balk halfvol');

// ---- de kaart zelf ----
ok(/ds-z-kaart/.test(dz) && /ds-z-feit__n/.test(dz) && /ds-z-balk/.test(dz), 'de drift-HUD gebruikt .ds-z-kaart, .ds-z-feit en .ds-z-balk');
ok(/dc-niv/.test(dz) && /driftVoortgang/.test(dz), 'het niveau en de voortgang komen uit drift.js');
ok(/animationend/.test(dz) && /dc-pop/.test(dz), 'de pop is eenmalig (animationend haalt de klasse weg)');
ok(!/showChip\(`/.test(dz), 'het DOM blijft staan (geen sjabloon per frame)');
ok(telBestand('game/js/drift.js', lees('game/js/drift.js')).n.kleur === 0, 'drift.js heeft geen harde kleur');
const t = telBestand('game/js/ds-schermen.css', blok).n;
ok(t.kleur === 0 && t.glas === 0 && t.font === 0 && t.klein === 0, 'de drift-regels in ds-schermen.css zijn tokens (geen hex, glas, los lettertype)');
ok(!/#drift-chip/.test(hud), 'hud_panel.css heeft geen glasregels meer voor #drift-chip');
ok(/tabular-nums/.test(blok) && /--ds-t-cijfer/.test(blok), 'score met tabelcijfers en het grote cijfer uit het token');
ok(/dc-niv2[^}]*ds-c-ink-bord/.test(blok) && /dc-niv3[^}]*schaduw-hard-bord/.test(blok), 'de rand loopt per niveau op in bordgroen (tokens)');
const maten = [...blok.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
ok(maten.every((v) => v >= 13), 'tekst minstens 13 px');
const tokens = lees('game/js/ds-tokens.css');
const px = (naam) => Number((tokens.match(new RegExp(`${naam}:\\s*(?:max\\()?(\\d+(?:\\.\\d+)?)px`)) || [])[1]);
ok(px('--ds-t-hulp') >= 13 && px('--ds-t-label') >= 13 && px('--ds-t-subkop') >= 13, 'de tokens die de kaart gebruikt zijn minstens 13 px');

// ---- beweging ----
ok(/@media \(prefers-reduced-motion: reduce\)[^\n]*dc-pop/.test(blok) && /html\.reduce-motion #drift-chip \.dc-pop/.test(blok) && /html\.rustig-drukwerk #drift-chip \.dc-pop/.test(blok), 'de pop staat uit bij OS-instelling, Beweging beperken en Rustig drukwerk');
ok(/ds-z-puls var\(--ds-m-max\)/.test(blok) && !/infinite/.test(blok), 'de pop duurt hooguit 250 ms (token) en loopt niet in een lus');

// ---- de zone ----
ok(/bottom:\s*214px/.test(blok) && DRIFT_BODEM === 214 && /width:\s*340px/.test(blok) && DRIFT_BREED === 340, 'de CSS gebruikt de zone uit hudstapel.js');
for (const [vw, vh] of [[1024, 600], [1280, 720], [1920, 1080]]) {
  const z = driftZone(vw, vh);
  const { zones } = duivenZones(vw, vh);
  const raakt = zones.filter((r) => !['pijl', 'stapel', 'bovenbalk'].includes(r.id)).filter((r) => zoneOverlap([z, r]).length).map((r) => r.id);
  ok(raakt.length === 0, `${vw}x${vh}: de drift-kaart raakt ${raakt.join(', ')}`);
  ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= vw, `${vw}x${vh}: de drift-kaart staat in beeld`);
}

console.log(`drift_hud_test: ${n - fout}/${n} controles`);
process.exit(fout ? 1 : 0);
