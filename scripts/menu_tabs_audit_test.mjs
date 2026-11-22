// Test van de pure regels achter scripts/menu_tabs_audit.mjs (#1010, #980): proefregels in, bevindingen uit, plus de audit zelf op de echte bronnen.
//   node scripts/menu_tabs_audit_test.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { duurChecks, kleineLetters, klikbaarZonderFocus, langeAlinea, dubbeleZin, blad, vasteBreedtes } from './lib/menu_tabs_regels.mjs';

let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.error('FOUT: ' + w); } };
const tokens = { '--ds-m-lang': 250, '--ds-m-midden': 150 };

// motion: tokens worden opgelost, seconden omgerekend, een verblijf en een lus tellen niet
ok(duurChecks('a { transition: opacity 0.3s; }', tokens).length === 1, 'motion: 0,3 s is te lang');
ok(duurChecks('a { transition: opacity 250ms; }', tokens).length === 0, 'motion: 250 ms mag');
ok(duurChecks('a { animation: x var(--ds-m-lang) ease; }', tokens).length === 0, 'motion: het token --ds-m-lang is 250 ms');
ok(duurChecks('a { animation: x var(--dur-slow, 320ms) ease; }', tokens).length === 1, 'motion: een terugvalwaarde van 320 ms telt');
ok(duurChecks('a { animation: pm-flash 1.8s ease both; } /* ds3-dwell: verblijf */', tokens).length === 0, 'motion: een verblijf telt niet');
ok(duurChecks('a { animation: spin 2s linear infinite; }', tokens).length === 0, 'motion: een lus telt hier niet');
ok(duurChecks('a { transition: none; }', tokens).length === 0, 'motion: none telt niet');

// lettergrootte
ok(kleineLetters('a { font-size: 12px; }').length === 1, 'letters: 12 px is te klein');
ok(kleineLetters('a { font-size: max(12px, var(--menu-min)); }').length === 1, 'letters: max(12px) is te klein');
ok(kleineLetters('a { font-size: 13px; } b { font-size: max(18px, var(--menu-min)); }').length === 0, 'letters: 13 px en groter mag');

// listnav: een aanklikbaar element zonder tabindex valt buiten de focusvolgorde
ok(klikbaarZonderFocus('<div class="x" data-action="a">').length === 1, 'listnav: div met data-action zonder tabindex');
ok(klikbaarZonderFocus('<div class="x" data-action="a" tabindex="0">').length === 0, 'listnav: met tabindex mag');
ok(klikbaarZonderFocus('<button data-action="a">').length === 0, 'listnav: een knop is al focusbaar');
ok(klikbaarZonderFocus('<span role="button">').length === 1, 'listnav: role=button zonder tabindex');

// tekstdieet
ok(langeAlinea('<p>' + 'a'.repeat(151) + '</p>').length === 1, 'dieet: alinea van 151 tekens');
ok(langeAlinea('<p>' + 'a'.repeat(150) + '</p>').length === 0, 'dieet: alinea van 150 tekens mag');
const zin = 'Dit is een zin van meer dan vierendertig tekens lang.';
ok(dubbeleZin(`<p>${zin}</p><p>${zin}</p>`).length === 1, 'dieet: dezelfde zin twee keer');
ok(dubbeleZin(`<p>${zin}</p>`).length === 0, 'dieet: een zin één keer');

// schaal: het blad is het venster gedeeld door de zoom (uiscale.js: --mz-fit), min 416 links en 80 rechts
const b1 = blad(1280, 720, 1.5);
ok(Math.round(b1.stage.w) === 1280 && Math.round(b1.stage.h) === 720, 'schaal: 1280x720 met ui-schaal 1,5 is een blad van 1280x720');
ok(Math.round(b1.breed) === 784, 'schaal: het blad is dan 784 px breed');
const b2 = blad(1920, 1080, 1);
ok(Math.round(b2.stage.w) === 1920 && Math.round(b2.breed) === 1424, 'schaal: 1920x1080 is het ontwerpformaat');
const css = '.a { width: 700px; } .a { width: clamp(440px, 50%, 700px); } .b { width: 600px; } @media (max-width: 1400px) { .b { width: 470px; } } .c { position: absolute; width: 900px; } .d { min-width: 300px; }';
const v = vasteBreedtes(css);
ok(!v.some((x) => x.sel === '.a'), 'schaal: een vaste breedte die later relatief wordt telt niet');
ok(v.some((x) => x.sel === '.b' && x.px === 600), 'schaal: een vaste breedte op basisniveau telt (ook als een @media hem verandert)');
ok(!v.some((x) => x.sel === '.c'), 'schaal: een overlay met position:absolute telt niet');
ok(v.some((x) => x.sel === '.d' && x.prop === 'min-width'), 'schaal: min-width telt ook');

// de audit zelf op de echte bronnen
const dir = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(dir, 'menu_tabs_audit.mjs')], { encoding: 'utf8' });
ok(r.status === 0, 'de audit is schoon op de echte bronnen: ' + (r.stdout || '').split('\n').slice(0, 5).join(' | '));

console.log(`menu_tabs_audit_test: ${n - fout}/${n} ok`);
process.exit(fout ? 1 : 0);
