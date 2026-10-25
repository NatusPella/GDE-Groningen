// Samen spelen (#452 punt 4, #492): een ander opgeslagen spel laden vraagt eerst om de sessie te
// beëindigen. De volgorde is de afspraak: stop de sessie, bewaar de huidige voortgang, laad dan pas.
// Nieuw spel en het verwijderen van het actieve slot blijven geblokkeerd zolang world.coopNet bestaat.
//   node scripts/coopladen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCoopLoad, coopLoadTekst, COOP_LOAD_FAIL } from '../game/js/cooploadrules.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };
const sg = src('savegame.js'), ui = src('saveslotsui.js'), pm = src('pausemenu.js'), css = src('saveslots.css');

// --- de volgorde en elke fouttak van runCoopLoad (cooploadrules.js) ---
ok(() => {
  const world = { coopNet: { role: 'host' }, coopRole: 'host' };
  const seen = [];
  const res = runCoopLoad(world, 4, {
    stop: (w) => { seen.push('stop'); w.coopNet = null; },
    save: (w, opts) => { seen.push(`save:${w.coopNet ? 'sessie' : 'vrij'}`); assert.deepEqual(opts, { toast: false }); return true; },
    load: (w, slot) => { seen.push(`load:${slot}`); return true; },
  });
  assert.deepEqual(res, { ok: true });
  assert.deepEqual(seen, ['stop', 'save:vrij', 'load:4'], 'stop, dan bewaren zonder sessie, dan laden');
}, 'volgorde: sessie stopt, dan bewaren, dan laden');

ok(() => {
  const world = { coopNet: {}, coopRole: 'client' };
  let saved = 0, loaded = 0;
  const res = runCoopLoad(world, 2, {
    stop: () => { throw new Error('kabel stuk'); },
    save: () => { saved++; return true; },
    load: () => { loaded++; return true; },
  });
  assert.deepEqual(res, { ok: false, reason: 'stop' });
  assert.equal(saved + loaded, 0, 'na een mislukte stop wordt er niets bewaard of geladen');
}, 'stop mislukt: niets bewaren, niets laden');

ok(() => {
  const world = { coopNet: {}, coopRole: 'host' };
  let loaded = 0;
  const res = runCoopLoad(world, 2, {
    stop: (w) => { w.coopNet = null; },
    save: () => false,
    load: () => { loaded++; return true; },
  });
  assert.deepEqual(res, { ok: false, reason: 'save' });
  assert.equal(loaded, 0, 'zonder bewaarde voortgang wordt er niet geladen');
}, 'bewaren mislukt: niets laden');

ok(() => {
  const res = runCoopLoad({ coopNet: {}, coopRole: 'host' }, 3, {
    stop: (w) => { w.coopNet = null; },
    save: () => true,
    load: () => false,
  });
  assert.deepEqual(res, { ok: false, reason: 'load' });
}, 'laden mislukt: eigen melding');

ok(() => {
  let called = 0;
  const deps = { stop: () => called++, save: () => { called++; return true; }, load: () => { called++; return true; } };
  assert.deepEqual(runCoopLoad({}, 1, deps), { ok: false, reason: 'geen-sessie' });
  assert.deepEqual(runCoopLoad(null, 1, deps), { ok: false, reason: 'geen-sessie' });
  assert.equal(called, 0, 'zonder sessie gebeurt er niets');
}, 'geen sessie: niets doen');

ok(() => {
  assert.match(coopLoadTekst({ coopRole: 'host' }), /beëindigt de sessie voor iedereen/);
  assert.match(coopLoadTekst({ coopRole: 'client' }), /verlaat de sessie/);
  assert.match(coopLoadTekst(null), /verlaat de sessie/);
}, 'uitleg verschilt voor host en gast');

ok(() => {
  for (const [reason, text] of Object.entries(COOP_LOAD_FAIL)) {
    assert.ok(text && !/\bsave\b/i.test(text), `${reason}: ${text}`);
  }
  for (const t of [coopLoadTekst({ coopRole: 'host' }), coopLoadTekst({ coopRole: 'client' })]) {
    assert.ok(!/\bsave\b/i.test(t), t);
  }
}, 'meldingen zijn Nederlands zonder het woord save');

// --- de opslagkant blijft weigeren zolang de sessie loopt ---
ok(() => assert.match(sg, /export const coopSessieLoopt = \(w\) => !!\(w && w\.coopNet\)/), 'coopSessieLoopt kijkt naar world.coopNet');
ok(() => assert.match(sg, /export function applySave\(w, d\) \{\s*if \(!w \|\| !d\) return false;\s*if \(coopSessieLoopt\(w\)\) return false;/), 'applySave weigert tijdens een sessie');
ok(() => assert.match(sg, /export function loadSlot\(w, n\) \{\s*if \(coopSessieLoopt\(w\)\) return false;/), 'loadSlot weigert voor het slot te wisselen');
for (const t of ['COOP_NIEUW_TEKST', 'COOP_WISSEN_TEKST']) {
  const m = sg.match(new RegExp(t + " = '([^']+)'"));
  ok(() => assert.ok(m && /^Samen spelen loopt nog\. Stop eerst de sessie/.test(m[1]), t), t + ' is Nederlands en wijst naar stoppen');
}

// --- het savepaneel: bevestigen, annuleren, en de gast die zijn eigen spel kiest ---
ok(() => assert.match(ui, /act === 'load' && cur\) \{[\s\S]{0,500}if \(inSessie\) \{ sel = cur\.n; over = \{ n: cur\.n, kind: 'coop-load' \}; render\(\); return; \}/), 'slotpaneel: laden vraagt eerst om de sessie te beëindigen');
ok(() => assert.match(ui, /runCoopLoad\(world, cur\.n, \{ stop: stopCoopNet, save: saveGame, load: loadSlot \}\)/), 'slotpaneel: de bevestiging gebruikt de vaste volgorde');
ok(() => assert.match(ui, /data-do="coop-load-ok"/), 'slotpaneel: de bevestigingsknop bestaat');
ok(() => assert.match(ui, /if \(act === 'back'\) \{[^}]*over = null; render\(/), 'slotpaneel: annuleren sluit de vraag zonder de sessie te stoppen');
ok(() => assert.ok(!/if \(act === 'back'\) \{[^}]*runCoopLoad/.test(ui), 'slotpaneel: annuleren raakt de sessie niet aan'));
ok(() => assert.match(ui, /message = COOP_LOAD_FAIL\[res\.reason\][\s\S]{0,80}render\(\{ slot: cur\.n \}\)/), 'slotpaneel: na een mislukte stap wordt de kaart opnieuw getekend');
ok(() => assert.match(ui, /currentBlocked = isCurrent && !\(inSessie && world\.coopRole !== 'host'\)/), 'slotpaneel: een gast mag zijn eigen opgeslagen spel kiezen');
ok(() => assert.match(ui, /over\.n === s\.n && over\.kind !== 'coop-load'/), 'slotpaneel: de lange vraag hangt niet in het kaartje');
ok(() => assert.match(ui, /class="ssl-over ssl-modal"/), 'slotpaneel: de vraag staat over het hele paneel');
ok(() => assert.match(css, /#saveslots \.ssl-modal \{[^}]*inset: 0;/), 'css: het vraagscherm vult het paneel');
ok(() => assert.match(css, /#saveslots \.ssl-modal \.ssl-box \{[^}]*overflow-y: auto;/), 'css: het vak scrolt als het niet past');
ok(() => assert.match(ui, /act === 'delete' && cur\) \{\s*if \(cur\.active && coopSessieLoopt\(world\)\)/), 'slotpaneel: verwijderen van het actieve slot geblokkeerd');
ok(() => assert.match(ui, /act === 'delete-ok' && cur\) \{\s*over = null;\s*if \(cur\.active && coopSessieLoopt\(world\)\)/), 'slotpaneel: bevestiging van verwijderen ook geblokkeerd');
ok(() => assert.match(ui, /act === 'newfull-ok'/) && assert.match(ui, /coopSessieLoopt\(world\)\) \{ say\(COOP_NIEUW_TEKST\)/), 'slotpaneel: nieuw spel geblokkeerd');

// --- de pauzemenu: "Laatste spel laden" vraagt hetzelfde, in plaats van de oude blokkade ---
ok(() => assert.match(pm, /a === 'load'\) \{\s*if \(coopSessieLoopt\(world\)\) \{[\s\S]{0,400}coopLoadTekst\(world[,)]/), 'pauzemenu: laden tijdens een sessie vraagt eerst om bevestiging');
ok(() => assert.match(pm, /data-coop-load-confirm/), 'pauzemenu: de bevestiging bestaat');
ok(() => assert.match(pm, /a === 'coop-load-go'\) \{[\s\S]{0,300}runCoopLoad\(world, currentSlot\(\), \{ stop: stopCoopNet, save: saveGame, load: loadSlot \}\)/), 'pauzemenu: bevestigen gebruikt de vaste volgorde');
ok(() => assert.match(pm, /a === 'coop-load-cancel'\) \{[^}]*hidden = true;[^}]*confirmEl\.hidden = false/), 'pauzemenu: annuleren gaat terug naar de vraag');
ok(() => assert.match(pm, /a === 'new'\) \{\s*if \(coopSessieLoopt\(world\)\)/), 'pauzemenu: nieuw spel geblokkeerd');
ok(() => assert.match(pm, /coopLoadTekst\(world, 'Het laatste opgeslagen spel'\)/), 'pauzemenu: de uitleg past bij het laatste spel');
ok(() => assert.match(pm, /data-action="coop-load-cancel"\]'\)\.focus\(\)/), 'pauzemenu: de veilige keuze krijgt de focus');
ok(() => assert.match(pm, /a === 'cancel'\) \{\s*root\.querySelector\('\[data-coop-load-confirm\]'\)\.hidden = true;/), 'pauzemenu: annuleren ruimt de coop-vraag op');
ok(() => assert.ok(!/COOP_LADEN_TEKST/.test(sg + ui + pm)), 'de oude blokkade is weg');

console.log(`coopladen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
