// Samen spelen (#452 punt 4, #492): een ander opgeslagen spel laden vraagt eerst om de sessie te
// beëindigen. De volgorde is de afspraak: stop de sessie, bewaar de huidige voortgang, laad dan pas.
// Herstarten en afsluiten gebruiken dezelfde volgorde (eerst de sessie, dan bewaren, dan herladen of
// sluiten), zodat de anderen 'spel gestopt' horen in plaats van een weggevallen verbinding. Een nieuw
// spel en het verwijderen van het actieve slot vragen dezelfde bevestiging en volgen dezelfde
// volgorde (#492 slices 1-2). Alleen spelen is sinds #554 een sessie van één (world.coopSolo) en telt
// hier als geen sessie: dat blokkeert niets en vraagt geen bevestiging (solo-sessie-audit H2).
//   node scripts/coopladen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCoopLoad, runCoopStop, coopLoadTekst, coopActieTekst, COOP_LOAD_FAIL, COOP_ACTIE_FAIL } from '../game/js/cooploadrules.js';
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

// --- de opslagkant blijft weigeren zolang een echte sessie loopt, maar niet in een sessie van één ---
// savegame.js importeert Three.js en is in Node niet te laden; daarom halen we de pure poort uit de
// bron en voeren die uit. Zo toetst deze test het gedrag (solo blokkeert niet, een echte sessie wel)
// in plaats van alleen de vorm van de regel.
const poort = sg.match(/export const coopSessieLoopt = (\(w\) => [^;]+);/);
const coopSessieLoopt = poort ? new Function(`return (${poort[1]});`)() : null;
ok(() => assert.equal(typeof coopSessieLoopt, 'function', 'coopSessieLoopt staat in savegame.js'), 'coopSessieLoopt vindbaar');
ok(() => {
  assert.equal(coopSessieLoopt({ coopNet: { role: 'host' }, coopRole: 'host', coopSolo: true }), false, 'een solo-sessie blokkeert niet');
  assert.equal(coopSessieLoopt({ coopNet: { role: 'host' }, coopRole: 'host' }), true, 'een gastheer-sessie blokkeert');
  assert.equal(coopSessieLoopt({ coopNet: { role: 'client' }, coopRole: 'client' }), true, 'een gast blokkeert');
  assert.equal(coopSessieLoopt({ coopSolo: true }), false, 'zonder sessie blokkeert niets');
  assert.equal(coopSessieLoopt(null), false);
  assert.equal(coopSessieLoopt(undefined), false);
}, 'solo telt als geen sessie, een echte sessie blokkeert');
ok(() => assert.match(sg, /export function applySave\(w, d\) \{\s*if \(!w \|\| !d\) return false;\s*if \(coopSessieLoopt\(w\)\) return false;/), 'applySave weigert tijdens een echte sessie (en dus niet in solo)');
ok(() => assert.match(sg, /export function loadSlot\(w, n\) \{\s*if \(coopSessieLoopt\(w\)\) return false;/), 'loadSlot weigert voor het slot te wisselen tijdens een echte sessie (en dus niet in solo)');
ok(() => assert.ok(!/COOP_NIEUW_TEKST|COOP_WISSEN_TEKST/.test(sg + ui + pm), 'de oude blokkadeteksten zijn weg'), 'oude blokkade-teksten weg');
// #492 slices 1-2: de bevestiging voor een nieuw spel of verwijderen kent host en gast
ok(() => {
  assert.match(coopActieTekst({ coopRole: 'host' }, 'Een nieuw spel beginnen'), /beëindigt de sessie voor iedereen/);
  assert.match(coopActieTekst({ coopRole: 'host' }, 'Een nieuw spel beginnen'), /Een nieuw spel beginnen/);
  assert.match(coopActieTekst({ coopRole: 'host' }, 'Een nieuw spel beginnen'), /eerst bewaard/);
  assert.match(coopActieTekst({ coopRole: 'client' }, 'Dit opgeslagen spel verwijderen'), /verlaat de sessie/);
  assert.match(coopActieTekst({ coopRole: 'client' }, 'Dit opgeslagen spel verwijderen'), /Dit opgeslagen spel verwijderen/);
  assert.match(coopActieTekst(null, 'x'), /verlaat de sessie/);
}, 'bevestiging: host beëindigt de sessie, gast verlaat hem');
ok(() => {
  for (const [reason, text] of Object.entries(COOP_ACTIE_FAIL)) assert.ok(text && !/\bsave\b/i.test(text), `${reason}: ${text}`);
}, 'mislukte actie: Nederlandse melding zonder "save"');

// --- het savepaneel: bevestigen, annuleren, en de gast die zijn eigen spel kiest ---
ok(() => assert.match(ui, /act === 'load' && cur\) \{[\s\S]{0,500}if \(inSessie\) \{ sel = cur\.n; over = \{ n: cur\.n, kind: 'coop-load' \}; render\(\); return; \}/), 'slotpaneel: laden vraagt eerst om de sessie te beëindigen');
ok(() => assert.match(ui, /runCoopLoad\(world, cur\.n, \{ stop: stopCoopNet, save: saveGame, load: loadSlot \}\)/), 'slotpaneel: de bevestiging gebruikt de vaste volgorde');
ok(() => assert.match(ui, /const okDo = over\.kind === 'coop-load' \? 'coop-load-ok' : 'coop-actie-ok';/) && assert.match(ui, /data-do="\$\{okDo\}"/), 'slotpaneel: de bevestigingsknop bestaat');
ok(() => assert.match(ui, /if \(act === 'back'\) \{[^}]*over = null; render\(/), 'slotpaneel: annuleren sluit de vraag zonder de sessie te stoppen');
ok(() => assert.ok(!/if \(act === 'back'\) \{[^}]*runCoopLoad/.test(ui), 'slotpaneel: annuleren raakt de sessie niet aan'));
ok(() => assert.match(ui, /message = COOP_LOAD_FAIL\[res\.reason\][\s\S]{0,80}render\(\{ slot: cur\.n \}\)/), 'slotpaneel: na een mislukte stap wordt de kaart opnieuw getekend');
ok(() => assert.match(ui, /currentBlocked = isCurrent && !\(inSessie && world\.coopRole !== 'host'\)/), 'slotpaneel: een gast mag zijn eigen opgeslagen spel kiezen');
ok(() => assert.match(ui, /over\.n === s\.n && over\.kind !== 'coop-load'/), 'slotpaneel: de lange vraag hangt niet in het kaartje');
ok(() => assert.match(ui, /class="ssl-over ssl-modal"/), 'slotpaneel: de vraag staat over het hele paneel');
ok(() => assert.match(css, /#saveslots \.ssl-modal \{[^}]*inset: 0;/), 'css: het vraagscherm vult het paneel');
ok(() => assert.match(css, /#saveslots \.ssl-modal \.ssl-box \{[^}]*overflow-y: auto;/), 'css: het vak scrolt als het niet past');
ok(() => assert.match(ui, /act === 'delete' && cur\) \{[\s\S]{0,300}if \(spelDatNuLoopt\(cur\)\) \{ over = null; message = NU_SPEL_NIET_WEG; render\(\{ more: cur\.n \}\); return; \}/), 'slotpaneel: het spel dat nu loopt kan niet verwijderd worden (#564)');
ok(() => assert.match(ui, /act === 'delete' && cur\) \{[\s\S]{0,1200}act: 'delete', wat: 'Dit opgeslagen spel verwijderen'/), 'slotpaneel: verwijderen van het actieve slot vraagt tijdens een sessie om bevestiging');
ok(() => assert.match(ui, /act === 'delete-ok' && cur\) \{[\s\S]{0,400}act: 'delete', wat: 'Dit opgeslagen spel verwijderen'/), 'slotpaneel: bevestigen van verwijderen vraagt hetzelfde');
ok(() => assert.match(ui, /act === 'newfull-ok' && coopSessieLoopt\(world\)\) \{[\s\S]{0,300}act: 'new', wat: 'Een nieuw spel beginnen'/), 'slotpaneel: nieuw spel vraagt tijdens een sessie om bevestiging');
ok(() => {
  const actie = ui.slice(ui.indexOf("act === 'coop-actie-ok'"), ui.indexOf('file.addEventListener'));
  assert.match(actie, /runCoopStop\(world, \{/, 'slotpaneel: de bevestiging gebruikt de vaste volgorde');
  assert.match(actie, /stop: stopCoopNet,/, 'slotpaneel: eerst de sessie');
  assert.match(actie, /save: \(\) => saveGame\(world, \{ toast: false \}\)/, 'slotpaneel: dan bewaren');
  assert.match(actie, /S\.deleteSlot\(null, active\.n\)/, 'slotpaneel: daarna maakt nieuw spel de actieve plek vrij');
  assert.match(actie, /S\.deleteSlot\(null, doelSlot\.n\)/, 'slotpaneel: daarna wordt het gekozen opgeslagen spel verwijderd');
  assert.doesNotMatch(actie, /COOP_NIEUW_TEKST|COOP_WISSEN_TEKST/, 'slotpaneel: geen blokkade meer');
}, 'slotpaneel: de actie volgt na stop en bewaren');

// --- de pauzemenu: "Laatste spel laden" vraagt hetzelfde, in plaats van de oude blokkade ---
ok(() => assert.match(pm, /a === 'load'\) \{\s*if \(coopSessieLoopt\(world\)\) \{[\s\S]{0,400}coopLoadTekst\(world[,)]/), 'pauzemenu: laden tijdens een sessie vraagt eerst om bevestiging');
ok(() => assert.match(pm, /data-coop-load-confirm/), 'pauzemenu: de bevestiging bestaat');
ok(() => assert.match(pm, /a === 'coop-load-go'\) \{[\s\S]{0,300}runCoopLoad\(world, currentSlot\(\), \{ stop: stopCoopNet, save: saveGame, load: loadSlot \}\)/), 'pauzemenu: bevestigen gebruikt de vaste volgorde');
ok(() => assert.match(pm, /a === 'coop-load-cancel'\) \{[^}]*hidden = true;[^}]*confirmEl\.hidden = false/), 'pauzemenu: annuleren gaat terug naar de vraag');
ok(() => assert.match(pm, /a === 'new'\) \{\s*if \(coopSessieLoopt\(world\)\) \{[\s\S]{0,400}data-coop-new-confirm/), 'pauzemenu: nieuw spel vraagt tijdens een sessie eerst om bevestiging');
ok(() => assert.match(pm, /coopActieTekst\(world, 'Een nieuw spel beginnen'\)/), 'pauzemenu: de uitleg past bij een nieuw spel');
ok(() => assert.match(pm, /a === 'coop-new-go'\) \{[\s\S]{0,400}runCoopStop\(world, \{[\s\S]{0,200}stop: stopCoopNet,[\s\S]{0,200}save: \(\) => saveGame\(world\)/), 'pauzemenu: bevestigen stopt de sessie en bewaart daarna');
ok(() => assert.match(pm, /go: \(\) => \{[\s\S]{0,320}startNewSlot\(\)[\s\S]{0,160}preventCloseSave\(\)[\s\S]{0,120}location\.reload\(\)/), 'pauzemenu: daarna pas een nieuw spel en herladen');
ok(() => assert.match(pm, /a === 'coop-new-cancel'\) \{[^}]*hidden = true;[^}]*confirmEl\.hidden = false/), 'pauzemenu: annuleren gaat terug naar de vraag');
ok(() => assert.match(pm, /coopLoadTekst\(world, 'Het laatste opgeslagen spel'\)/), 'pauzemenu: de uitleg past bij het laatste spel');
ok(() => assert.match(pm, /data-action="coop-load-cancel"\]'\)\.focus\(\)/), 'pauzemenu: de veilige keuze krijgt de focus');
ok(() => assert.match(pm, /a === 'cancel'\) \{\s*root\.querySelector\('\[data-coop-load-confirm\]'\)\.hidden = true;/), 'pauzemenu: annuleren ruimt de coop-vraag op');
ok(() => assert.ok(!/COOP_LADEN_TEKST/.test(sg + ui + pm)), 'de oude blokkade is weg');

// --- stoppen, herstarten en afsluiten: dezelfde volgorde als laden (#492, wi-492-saves) ---
ok(() => {
  const seen = [];
  const world = { coopNet: { role: 'host' }, coopRole: 'host' };
  const res = runCoopStop(world, {
    stop: (w) => { seen.push('stop'); w.coopNet = null; },
    save: () => seen.push('save'),
    go: () => seen.push('go'),
  });
  assert.deepEqual(res, { ok: true });
  assert.deepEqual(seen, ['stop', 'save', 'go'], 'eerst de sessie, dan bewaren, dan pas herstarten of sluiten');
}, 'stoppen: de sessie stopt voor het bewaren');
ok(() => {
  const seen = [];
  runCoopStop({ coopRole: 'host' }, { stop: () => seen.push('stop'), save: () => seen.push('save'), go: () => seen.push('go') });
  assert.deepEqual(seen, ['save', 'go'], 'zonder sessie valt er niets te stoppen');
}, 'stoppen: geen sessie');
ok(() => {
  const seen = [];
  runCoopStop({ coopNet: {} }, { stop: () => { throw new Error('kabel stuk'); }, save: () => seen.push('save'), go: () => seen.push('go') });
  assert.deepEqual(seen, ['save', 'go'], 'een mislukte stop houdt de herstart niet tegen');
}, 'stoppen: fout in de stop blokkeert niet');
ok(() => {
  const seen = [];
  runCoopStop({ coopNet: {} }, { stop: (w) => { delete w.coopNet; }, save: () => { throw new Error('schijf vol'); }, go: () => seen.push('go') });
  assert.deepEqual(seen, [], 'een mislukte save houdt het herladen of sluiten tegen (#563)');
}, 'stoppen: fout in de save houdt het spel open');
// #563: een save die false teruggeeft betekent "niet bewaard": het spel blijft open met de keuze, de
// herstart of sluiting gebeurt niet. undefined betekent "niets te bewaren" (een prestart-menu) en mag wel.
ok(() => {
  const seen = [];
  const res = runCoopStop({ coopNet: {}, coopRole: 'host' }, { stop: (w) => { w.coopNet = null; }, save: () => false, go: () => seen.push('go') });
  assert.deepEqual(res, { ok: false, reason: 'save' });
  assert.deepEqual(seen, [], 'de knop "Slaat op en sluit het spel" liegt niet: er wordt niets gesloten');
}, 'stoppen: een mislukte save geeft de fout terug');
ok(() => {
  const seen = [];
  const res = runCoopStop({ coopRole: 'host' }, { save: () => undefined, go: () => seen.push('go') });
  assert.deepEqual(res, { ok: true });
  assert.deepEqual(seen, ['go'], 'niets te bewaren is geen fout');
}, 'stoppen: niets te bewaren mag door');
ok(() => {
  const seen = [];
  runCoopStop({ coopNet: {} }, { stop: () => {}, save: () => true, go: () => seen.push('go') });
  assert.deepEqual(seen, ['go'], 'een geslaagde save gaat gewoon door naar herstarten of sluiten');
}, 'stoppen: een geslaagde save sluit of herstart');
ok(() => {
  const seen = [];
  runCoopStop({ coopNet: {} }, { stop: () => seen.push('stop'), go: () => seen.push('go') });
  assert.deepEqual(seen, ['stop', 'go'], 'zonder bewaarstap (prestart) blijft de volgorde kloppen');
}, 'stoppen: save mag ontbreken');
ok(() => {
  const exitBranch = pm.slice(pm.indexOf("a === 'menu' || a === 'exit'"), pm.indexOf("a === 'pigeon-stop'"));
  assert.match(exitBranch, /runCoopStop\(world, \{/, 'pauzemenu: herstarten en afsluiten gebruiken de vaste volgorde');
  assert.match(exitBranch, /stop: \(w\) => \{ if \(isSoloHost\(w\)\) stopSoloHost\(w\); else stopCoopNet\(w\); \}/,
    'pauzemenu: een solo-sessie stopt via stopSoloHost, een echte sessie via stopCoopNet');
  const stopAt = exitBranch.indexOf('runCoopStop('), stopCb = exitBranch.indexOf('stop: (w)');
  const saveCb = exitBranch.indexOf('save: () =>'), goCb = exitBranch.indexOf('go: () =>');
  assert.ok(stopAt >= 0 && stopCb > stopAt && saveCb > stopCb && goCb > saveCb, 'pauzemenu: stop, dan bewaren, dan herstarten of sluiten');
  assert.match(exitBranch, /save: \(\) => \(started\(\) && !prestart && world \? saveGame\(world\) : undefined\)/, 'pauzemenu: alleen een lopend spel bewaart (#435)');
  assert.match(exitBranch, /go: \(\) => \{ if \(a === 'exit' && DESKTOP\) DESKTOP\.quit\(\); else location\.reload\(\); \}/, 'pauzemenu: de herstart of sluiting is de laatste stap');
  assert.doesNotMatch(exitBranch, /if \(started\(\) && !prestart && world\) saveGame\(world\);\s*if \(a === 'exit'/, 'pauzemenu: geen bewaren-en-herladen meer buiten de vaste volgorde');
}, 'pauzemenu: de sessie stopt vóór het bewaren en herstarten');
// #563: bij een mislukte save blijft het spel open met de melding en een keuze (opnieuw proberen of toch sluiten)
ok(() => {
  const exitBranch = pm.slice(pm.indexOf("a === 'menu' || a === 'exit'"), pm.indexOf("a === 'pigeon-stop'"));
  assert.match(exitBranch, /if \(!res\.ok\) askClose\(a\);/);
  assert.match(pm, /function askClose\(a\) \{[\s\S]{0,1200}if \(!box\) return;/, 'de vraag wordt opgebouwd');
  assert.match(pm, /data-action="exit-retry">Opnieuw proberen<\/button><button type="button" class="m-bg danger" data-action="exit-anyway">Toch sluiten/, 'de keuze staat in de melding');
  assert.match(pm, /data-exit-confirm/, 'de bevestiging bestaat');
  assert.match(pm, /Opnieuw proberen/);
  assert.match(pm, /Toch sluiten/);
  assert.match(pm, /a === 'exit-retry'\) \{ const want = closeAction; closeAction = null; if \(want\) runAction\(want\); return; \}/, 'opnieuw proberen doet dezelfde stap nog eens');
  assert.match(pm, /Opslaan mislukt\. Je voortgang sinds je laatste savegame is niet bewaard\./, 'de melding is Nederlands en eerlijk');
  assert.match(pm, /const exitBox = root\.querySelector\('\[data-exit-confirm\]'\);[\s\S]{0,120}exitBox\.hidden = true;/, 'Escape ruimt de vraag op');
  assert.match(pm, /root\.querySelector\('\[data-exit-confirm\]'\)\.hidden = true;\s*closeAction = null;/, 'het menu opent weer schoon');
}, 'pauzemenu: een mislukte save bij Afsluiten of Herstarten blijft open met een keuze (#563)');

console.log(`coopladen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
