// Het spelersmenu (docs/SPELERSMENU-UX-21-11.md): status per speler, Spel starten, foutmeldingen, de Tab-regel.
//   node scripts/playerstatus_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { statusVan, startKnop, magStarten, foutUitleg, tabRegel, richtingVan, versieRegel, LATER_ACTIES, START_LANG_NA_S, hintTekst, hintStand, volgHint, HINT } from '../game/js/playerstatus.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const ids = (r, ctx) => statusVan(r, ctx).map((s) => s.id);

t('status: wie het spel opende, verbinding met ping en passive mode', () => {
  const s = statusVan({ slot: 0, verbinding: 'ok', ms: 34, passief: true });
  assert.deepEqual(s.map((x) => x.id), ['opent', 'verbinding', 'passief']);
  assert.equal(s[1].tekst, 'Verbonden · 34 ms');
  assert.equal(s[2].tekst, 'Passief');
  assert.equal(statusVan({ slot: 2, verbinding: 'ok', passief: false })[0].tekst, 'Verbonden');
  assert.equal(statusVan({ slot: 2, verbinding: 'ok', passief: false }).pop().tekst, 'Actief');
});

t('status: haperen en wegvallen zijn een woord en een soort, niet alleen kleur', () => {
  assert.deepEqual(statusVan({ slot: 1, verbinding: 'lag', ms: 180 })[0], { id: 'verbinding', tekst: 'Haperd · 180 ms', soort: 'let-op', icoon: 'wifi' });
  const weg = statusVan({ slot: 1, verbinding: 'lost' }, { wachtkamer: true });
  assert.equal(weg[0].tekst, 'Verbinding weg');
  assert.equal(weg.find((x) => x.id === 'klaar').tekst, 'Niet bereikbaar');
  for (const x of [...weg, ...statusVan({ slot: 0, verbinding: 'ok' })]) assert.ok(x.tekst && x.icoon, 'woord en icoon');
});

t('status: klaar alleen in de wachtkamer; geen passive-stand als die onbekend is', () => {
  assert.ok(!ids({ slot: 1, verbinding: 'ok' }).includes('klaar'));
  assert.ok(ids({ slot: 1, verbinding: 'ok' }, { wachtkamer: true }).includes('klaar'));
  assert.ok(!ids({ slot: 1, verbinding: 'ok' }).includes('passief'));
  assert.equal(statusVan(null).length, 0);
});

t('versie: één zin, leeg zonder versie', () => {
  assert.equal(versieRegel('0.64.0'), 'Versie 0.64.0, bij elke speler gelijk.');
  assert.equal(versieRegel(''), '');
});

t('Spel starten: pas actief met minstens twee spelers en niemand weg', () => {
  const ok = { naam: 'A', verbinding: 'ok' };
  assert.equal(startKnop({ spelers: [ok] }).disabled, true);
  assert.match(startKnop({ spelers: [ok] }).hint, /medespeler/);
  assert.equal(startKnop({ spelers: [ok, { naam: 'B', verbinding: 'lag' }] }).disabled, false, 'haperen is nog bereikbaar');
  const weg = startKnop({ spelers: [ok, ok, { naam: 'Bram', verbinding: 'lost' }] });
  assert.equal(weg.disabled, true);
  assert.match(weg.hint, /Bram is niet bereikbaar/);
  assert.equal(startKnop({ spelers: [ok, ok] }).label, 'Spel starten');
});

t('Spel starten: voortgang en geen dubbele klik', () => {
  const ok = { naam: 'A', verbinding: 'ok' };
  const kort = startKnop({ spelers: [ok, ok], bezig: true, bezigS: 2 });
  assert.equal(kort.label, 'Spel wordt gestart…');
  assert.ok(kort.disabled && kort.busy);
  assert.doesNotMatch(kort.hint, /langer/);
  assert.match(startKnop({ spelers: [ok, ok], bezig: true, bezigS: START_LANG_NA_S }).hint, /langer dan normaal/);
  assert.equal(magStarten(startKnop({ spelers: [ok, ok] }), false), true);
  assert.equal(magStarten(startKnop({ spelers: [ok, ok] }), true), false, 'tijdens het starten niet nog eens');
  assert.equal(magStarten(startKnop({ spelers: [ok] }), false), false);
});

t('Spel starten: een gast vraagt de start aan wie het spel opende', () => {
  const ok = { naam: 'A', verbinding: 'ok' };
  assert.equal(startKnop({ rol: 'gast', spelers: [ok, ok], opener: 'Tammo' }).label, 'Vraag om te starten');
  const g = startKnop({ rol: 'gast', spelers: [ok, ok], opener: 'Tammo', gevraagd: true });
  assert.equal(g.disabled, true);
  assert.match(g.hint, /Tammo/);
});

t('fouten: gewone taal met wat te doen, voor elke reden van het protocol', () => {
  for (const reden of Object.keys(REASON_TEXT)) {
    const f = foutUitleg(reden);
    assert.ok(f.titel && f.tekst && f.doe && f.knop, `reden ${reden}`);
  }
  assert.equal(foutUitleg('vol').titel, 'Kamer vol');
  assert.equal(foutUitleg('weg').knop, 'Opnieuw verbinden');
  assert.equal(foutUitleg('versie', { versie: '0.64.0', andereVersie: '0.63.1' }).tekst, 'Jij speelt versie 0.64.0, de ander versie 0.63.1.');
  assert.equal(foutUitleg('onbekend').titel, 'Verbinden mislukt');
});

t('fouten: geen host of iedereen in speltekst', () => {
  for (const reden of [...Object.keys(REASON_TEXT), 'weg', 'onbekend']) {
    const f = foutUitleg(reden); const alles = `${f.titel} ${f.tekst} ${f.doe} ${f.knop}`;
    assert.doesNotMatch(alles, /\bhost\b|\biedereen\b/i, reden);
  }
  assert.doesNotMatch(statusVan({ slot: 0, verbinding: 'ok', passief: true }).map((x) => x.tekst).join(' '), /\bhost\b/i);
});

t('Tab-regel: afstand, richting en ping; jezelf zonder afstand', () => {
  const r = tabRegel({ slot: 1, naam: 'Rik', kleur: '#f2b134', vorm: 'vierkant', jij: false, verbinding: 'ok', ms: 34, afstandTekst: '40 m', richting: richtingVan({ x: 0, y: 0 }, { x: 40, y: -40 }), passief: true });
  assert.equal(r.ping, '34 ms');
  assert.equal(r.afstand, '40 m ↗');
  assert.equal(r.afstandWoord, 'noordoost');
  assert.equal(tabRegel({ slot: 0, naam: 'Tammo', jij: true, verbinding: 'ok' }).afstand, '');
  assert.equal(tabRegel({ slot: 3, naam: 'Bram', verbinding: 'lost' }).ping, 'weg');
  assert.equal(tabRegel({ slot: 3, verbinding: 'lost' }, { wachtkamer: true }).klaar, false);
  assert.equal(tabRegel({ slot: 3, verbinding: 'ok' }).klaar, null);
});

t('richting: y wijst naar het zuiden; onbekende plek geeft null', () => {
  assert.equal(richtingVan({ x: 0, y: 0 }, { x: 0, y: -10 }).woord, 'noord');
  assert.equal(richtingVan({ x: 0, y: 0 }, { x: 0, y: 10 }).woord, 'zuid');
  assert.equal(richtingVan({ x: 0, y: 0 }, { x: -10, y: 0 }).pijl, '←');
  assert.equal(richtingVan({ x: 0, y: 0 }, { x: NaN, y: 0 }), null);
  assert.equal(richtingVan(null, { x: 1, y: 1 }), null);
});

t('later: dempen en blokkeren staan klaar met uitleg', () => {
  assert.deepEqual(LATER_ACTIES.map((a) => a.id), ['dempen', 'blokkeren']);
  for (const a of LATER_ACTIES) assert.match(a.uitleg, /later/);
});

t('hint: Spelers · n, alleen met een sessie', () => {
  assert.equal(hintTekst(2), 'Spelers · 2');
  assert.equal(hintTekst(0), 'Spelers');
  assert.equal(hintTekst(NaN), 'Spelers');
  assert.equal(hintStand({ aantal: 0 }).stand, 'weg');
});

t('hint: eerst volledig, daarna een minimale indicator, en weer vol bij een verandering', () => {
  const nu0 = 1000;
  let v = volgHint(null, 2, nu0);
  assert.equal(hintStand({ aantal: 2, sinds: v.sinds, nu: nu0 + 1000 }).stand, 'vol', 'net aangesloten');
  assert.equal(hintStand({ aantal: 2, sinds: v.sinds, nu: nu0 + HINT.volMs + 1 }).stand, 'dim', 'daarna gedimd');
  assert.equal(volgHint(v, 2, nu0 + 50000), v, 'zelfde aantal: de teller loopt door');
  v = volgHint(v, 3, nu0 + 60000); // iemand sloot aan
  assert.equal(hintStand({ aantal: 3, sinds: v.sinds, nu: nu0 + 61000 }).stand, 'vol');
  v = volgHint(v, 2, nu0 + 90000); // iemand viel weg
  assert.equal(hintStand({ aantal: 2, sinds: v.sinds, nu: nu0 + 91000 }).stand, 'vol');
});

t('hint: klikbaar alleen als de muis vrij is of de lijst open staat', () => {
  assert.equal(hintStand({ aantal: 2, vergrendeld: true }).klikbaar, false, 'pointer lock: een hint, geen knop');
  assert.equal(hintStand({ aantal: 2, vergrendeld: false }).klikbaar, true);
  assert.equal(hintStand({ aantal: 2, vergrendeld: true, open: true }).klikbaar, true);
  assert.equal(hintStand({ aantal: 2, sinds: 0, nu: 9e9, vergrendeld: false }).stand, 'vol', 'klikbaar is nooit gedimd');
});

t('hint: weergave is geen knop, staat links boven de minimap en heeft een controllerroute', () => {
  const ui = fs.readFileSync(new URL('../game/js/coopspelersui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /createElement\('button'\)[^;]*coop-spelers-knop/);
  assert.match(ui, /\.cs-hint \{[^}]*pointer-events: none/, 'niet klikbaar zolang de muis vergrendeld is');
  const inHud = /\.cs-hint\.cs-in-hud \{([^}]*)\}/.exec(ui)[1];
  assert.match(inHud, /left: var\(--hud-edge/);
  assert.doesNotMatch(inHud, /right: var\(--hud-edge/, 'niet rechtsonder bij de snelheidsmeter, de voertuignaam en de toetshints');
  assert.match(inHud, /--mm-size/, 'boven de minimap, niet erover');
  assert.match(ui, /keyTextHtml\('\{TAB\}'\)/, 'het Tab-toetsicoon (keycap.js schakelt naar de controllerknop)');
  const controls = fs.readFileSync(new URL('../game/js/controls.js', import.meta.url), 'utf8');
  assert.match(controls, /\['tab', '[^']*spelerslijst/, 'de Besturing-lijst noemt de spelerslijst');
});

console.log(`\n${n} tests, alles groen`);
