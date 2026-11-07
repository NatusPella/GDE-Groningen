// #625: het machinisten-HUD — één bord voor de dienst, de cabine voor het rijden, tokens,
// reduce-motion en een korte intro. Bronchecks (geen DOM/wereld nodig):
//   node scripts/machinist_hud_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', naam, extra); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const m = lees('machinist.js'), cab = lees('treincabine.js'), kit = lees('minigamekit.js');

// Het thema: één accent en het perron-icoon (geen finishvlag meer).
ok(/machinist: \{ titel: 'MACHINIST', accent: '#b3b3a2', icoon: 'beurt' \}/.test(kit), 'MG_THEMA: machinist met accent en perron-icoon');
ok(/const ACCENT = mgThema\('machinist'\)\.accent/.test(m), 'machinist: accent uit MG_THEMA');
ok(/var\(--mk-mission|var\(--mk-danger|var\(--mk-ok/.test(m), 'machinist: status via --mk-*');

// Twee borden: de dienstbalk toont de dienst, de cabine het rijden (snelheid, hendel, volgend station, deuren).
ok(/row: `<b>Dienst \$\{svc\.i \+ 1\}\/\$\{svc\.plan\.length\}<\/b>`/.test(m), 'dienstbalk: toont de dienst, niet het volgende station');
ok(!/Deuren open/.test(m), 'dienstbalk: geen tweede deurenregel');
ok(/class="tc-next"/.test(cab) && /VOLGEND STATION/.test(cab) && /tc-door/.test(cab), 'cabine: volgend station en deuren staan daar');
ok(/tc-speed/.test(cab) && /tc-lever/.test(cab), 'cabine: snelheid en tractiehendel');

// Intro ≤14 woorden; de volledige bediening staat in Besturing > Hulp.
{
  const blok = /const INTRO = `([\s\S]*?)`;/.exec(m);
  ok(!!blok, 'machinist: intro gevonden');
  const tekst = (blok ? blok[1] : '').replace(/\$\{key\('([^']+)'\)\}/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const woorden = tekst.split(' ').filter(Boolean).length;
  ok(woorden <= 14, 'intro: hoogstens 14 woorden', `${woorden}: ${tekst}`);
  ok(/Besturing > Hulp/.test(m), 'de volledige bediening staat in Besturing > Hulp');
}

// Tokens en geen eigen keycapstijl in de cabine; reduce-motion en reduce-flash stoppen de waarschuwing.
ok(/--mk-/.test(cab) && /--gron-green/.test(cab), 'cabine: kleuren uit de tokens');
ok(/class="hud-key"/.test(cab) || /\.hud-key/.test(cab), 'cabine: de canonieke keycap');
ok(/html\.reduce-motion #hud \.tc-cab \.tc-alert, html\.reduce-flash #hud \.tc-cab \.tc-alert \{ animation: none !important/.test(cab), 'cabine: beweging en flitsen beperken stopt het knipperen');
ok(/@media \(prefers-reduced-motion: reduce\) \{ #hud \.tc-cab \.tc-alert \{ animation: none/.test(cab), 'cabine: prefers-reduced-motion stopt het knipperen');
ok(!/#3a7bd5|#7fb2ff|#ffd23f|#d94a3a|#46a35e|#5dff7a/.test(cab.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()')), 'cabine: geen losse blauwe/rode/groene hexen meer');

console.log(fails ? `${fails} of ${n} machinist-HUD checks failed` : `machinist_hud_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
