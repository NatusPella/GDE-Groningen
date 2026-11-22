// De stapmachine van de Samen-spelen-wizard (multiplayerwizard.js) (#1011): volgorde, terug, validatie, foutpaden en de privacyregels, zonder browser en zonder netwerk.
// De lobby (lobby.js) is de bron van wat er verbindt; multiplayerwizard.js zegt in welke stap een lobbyscherm valt. Deze test loopt de flow door met
// de echte reducers van beide. De DOM-kant (geen overlap, geen scrollbalk, tekstlengte per stap) meet scripts/ui/multiplayerflow_meet.mjs.
//   node scripts/multiplayerwizard_test.mjs
import assert from 'node:assert/strict';
import { createLobby, reduce, view, ROLES } from '../game/js/lobby.js';
import {
  WSTEP, createWizard, reduceWizard, wizStep, indicator, wizTerug, kanVerder, magOpenbaar, codeForField, bevatIp, kort, splitHint,
  footerOrder, progressLine, playerCard, isStatusCard, WIZ_TEKST, SHORT_PER_SCREEN, HINT_MAX, SESSION_NAME_MAX,
} from '../game/js/multiplayerwizard.js';
import { wizardHtml } from '../game/js/multiplayerwizardui.js';
import { icoon } from '../game/js/icons.js';
import { keyTextHtml } from '../game/js/keycap.js';
import { PROFIEL_KLEUREN } from '../game/js/lobby.js';
import { EXTRA_CHARS } from '../game/js/coopplayers.js';
import { VORM_TEKEN } from '../game/js/coopspelers.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };
const caps = (o = {}) => ({ rtc: true, direct: false, consentSaved: true, versie: '0.64.0', ...o });
const nieuw = (o = {}) => ({ lobby: createLobby(caps(o)), wz: createWizard({ rtc: o.rtc !== false, favorieten: (o.favorieten || []).length, direct: !!o.direct }) });
const stap = (m) => wizStep(m.lobby, m.wz);
const lob = (m, ev) => { m.lobby = reduce(m.lobby, ev); return m; };
const wiz = (m, ev) => { m.wz = reduceWizard(m.wz, ev); return m; };

t('de stappen: keuze 0, wie 1, kiezen 2, verbinden 3', () => {
  assert.deepEqual(WSTEP, { CHOICE: 0, WHO: 1, PICK: 2, CONNECT: 3 });
  const m = nieuw();
  assert.equal(stap(m), WSTEP.CHOICE, 'een nieuw scherm begint bij de keuze Meedoen of Open je spel');
  assert.deepEqual(indicator(m.lobby, m.wz), [], 'bij de keuze staat er geen indicator');
});

t('volgorde voor wie meedoet: keuze, wie, kiezen, (toestemming), verbinden', () => {
  const m = nieuw({ consentSaved: false });
  lob(m, { t: 'kies', rol: ROLES.GAST });
  assert.equal(m.lobby.step, 'gast-typt');
  assert.equal(stap(m), WSTEP.WHO, 'eerst Wie ben jij');
  wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  assert.equal(m.wz.wieKlaar, true);
  assert.equal(stap(m), WSTEP.PICK, 'daarna kiezen');
  lob(m, { t: 'invoer', text: 'K3J9D-8F2MN' });
  assert.equal(m.lobby.step, 'toestemming');
  assert.equal(stap(m), WSTEP.PICK, 'de toestemming hoort bij stap 2: er is nog niets verbonden');
  lob(m, { t: 'akkoord' });
  assert.equal(m.lobby.step, 'verbinden');
  assert.equal(stap(m), WSTEP.CONNECT);
  assert.deepEqual(indicator(m.lobby, m.wz).map((i) => i.staat), ['klaar', 'klaar', 'nu']);
});

t('volgorde voor wie het spel opent: keuze, wie, kiezen (privé of openbaar), verbinden, wachtkamer', () => {
  const m = nieuw();
  lob(m, { t: 'kies', rol: ROLES.HOST });
  assert.equal(m.lobby.step, 'methode');
  assert.equal(stap(m), WSTEP.WHO);
  wiz(m, { t: 'wie-klaar', naam: '' });
  assert.equal(stap(m), WSTEP.PICK);
  lob(m, { t: 'route', route: 'kamer' });
  assert.equal(m.lobby.step, 'host-maakt-code');
  assert.equal(stap(m), WSTEP.CONNECT);
  lob(m, { t: 'code', code: 'K3J9D-8F2MN' });
  assert.equal(m.lobby.step, 'host-wacht');
  assert.equal(stap(m), WSTEP.CONNECT);
  lob(m, { t: 'spelers', lijst: [{ slot: 0, naam: 'Sem' }, { slot: 1, naam: 'Iris' }], max: 4 });
  assert.equal(m.lobby.step, 'verbonden');
  assert.equal(stap(m), WSTEP.CHOICE, 'zonder wachtkamer is "verbonden" een statuskaart, geen stap');
  const m2 = nieuw({ startGate: true });
  lob(m2, { t: 'kies', rol: ROLES.HOST }); lob(m2, { t: 'route', route: 'kamer' }); lob(m2, { t: 'code', code: 'K3J9D-8F2MN' });
  lob(m2, { t: 'spelers', lijst: [{ slot: 0 }, { slot: 1 }], max: 4 });
  assert.equal(m2.lobby.step, 'verbonden');
  assert.equal(stap(m2), WSTEP.CONNECT, 'de wachtkamer van een nieuw spel is stap 3');
  assert.equal(isStatusCard(m2.lobby), false);
});

t('een lopende sessie is een statuskaart zonder indicator', () => {
  const m = nieuw();
  m.lobby = reduce(m.lobby, { t: 'adopteer', rol: ROLES.GAST, route: 'kamer', code: '', lijst: [{ slot: 0, naam: 'Sem' }], max: 4, slot: 1 });
  assert.equal(m.lobby.step, 'verbonden');
  assert.equal(isStatusCard(m.lobby), true);
  assert.deepEqual(indicator(m.lobby, { wieKlaar: true }), []);
  const v = view(m.lobby);
  assert.ok(v.buttons.some((b) => b.act === 'verbreek'), 'Spel verlaten (verbreek) staat op de kaart');
});

t('Terug gaat één stap terug: nooit twee, nooit de sessie uit', () => {
  const m = nieuw();
  assert.deepEqual(wizTerug(m.lobby, m.wz), { soort: 'niets' }, 'bij de keuze beslist het menu');
  lob(m, { t: 'kies', rol: ROLES.GAST });
  assert.deepEqual(wizTerug(m.lobby, m.wz), { soort: 'lobby', act: 'terug' }, 'van Wie ben jij naar de keuze');
  wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  assert.deepEqual(wizTerug(m.lobby, m.wz), { soort: 'wie-terug' }, 'van kiezen naar Wie ben jij (de wizard zelf)');
  wiz(m, { t: 'wie-terug' });
  assert.equal(stap(m), WSTEP.WHO);
  assert.equal(m.wz.wijze, null, 'wie je terugkomt begint niet met een oude keuze');
  wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  lob(m, { t: 'lijst-vraag' });
  assert.equal(m.lobby.step, 'lijst');
  assert.equal(wizTerug(m.lobby, m.wz).act, 'lijst-terug', 'van de lijst naar kiezen');
  lob(m, { t: 'lijst-terug' });
  assert.equal(m.lobby.step, 'gast-typt');
  assert.equal(stap(m), WSTEP.PICK);
  lob(m, { t: 'invoer', text: 'K3J9D-8F2MN' });
  assert.equal(m.lobby.step, 'verbinden');
  const terug = wizTerug(m.lobby, m.wz);
  assert.equal(terug.act, 'terug'); assert.equal(terug.naTerug, true, 'van verbinden terug naar stap 2 (lobbyui kiest dan de rol opnieuw)');
});

t('validatie van Wie ben jij: een naam door het filter, leeg mag, Tammo en Tessa niet', () => {
  let w = createWizard();
  assert.equal(reduceWizard(w, { t: 'wie-klaar', naam: 'Sem' }).wieKlaar, true);
  assert.equal(reduceWizard(w, { t: 'wie-klaar', naam: '' }).wieKlaar, true, 'leeg: dan zien de anderen de naam van je figuur');
  for (const slecht of ['Tammo', 'Tessa', 'kut', 'Albert Heijn', 'x'.repeat(17)]) {
    const r = reduceWizard(w, { t: 'wie-klaar', naam: slecht });
    assert.equal(r.wieKlaar, false, slecht + ' komt er niet door');
    assert.ok(r.fout.length > 5, 'met een reden');
  }
});

t('validatie van stap 2 voor de gast: een code, of de lijst; nooit een IP-adres in een regel', () => {
  const m = nieuw();
  lob(m, { t: 'kies', rol: ROLES.GAST }); wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  assert.equal(kanVerder(m.lobby, m.wz, '').ok, false, 'zonder code kom je niet verder');
  assert.match(kanVerder(m.lobby, m.wz, 'abc').fout, /kamercode/i);
  assert.deepEqual(kanVerder(m.lobby, m.wz, 'K3J9D-8F2MN'), { ok: true, route: 'kamer' });
  assert.equal(kanVerder(m.lobby, reduceWizard(m.wz, { t: 'wijze', wijze: 'lijst' }), '').ok, true, 'de lijst vraagt geen code');
  assert.equal(reduceWizard(createWizard({ rtc: false }), { t: 'wijze', wijze: 'lijst' }).wijze, null, 'zonder WebRTC geen lijst');
  assert.equal(reduceWizard(createWizard({ favorieten: 0 }), { t: 'wijze', wijze: 'vrienden' }).wijze, null, 'zonder favorieten geen Vrienden');
  assert.equal(reduceWizard(createWizard({ favorieten: 2 }), { t: 'wijze', wijze: 'vrienden' }).wijze, 'vrienden');
  assert.equal(reduceWizard(createWizard(), { t: 'wijze', wijze: 'onzin' }).fout, 'Onbekende keuze.');
});

t('privacy: een sessie is standaard privé; openbaar alleen na het vinkje en een nette naam', () => {
  const m = nieuw();
  lob(m, { t: 'kies', rol: ROLES.HOST }); wiz(m, { t: 'wie-klaar', naam: '' });
  assert.equal(m.wz.openbaar, false, 'standaard privé');
  assert.equal(m.wz.bevestigd, false);
  assert.deepEqual(kanVerder(m.lobby, m.wz), { ok: true, openbaar: false });
  wiz(m, { t: 'wijze', wijze: 'openbaar' });
  assert.equal(m.wz.openbaar, true);
  assert.match(kanVerder(m.lobby, m.wz).fout, /vinkje/, 'zonder vinkje niet');
  wiz(m, { t: 'sessienaam', tekst: 'Zomeravond' });
  assert.match(kanVerder(m.lobby, m.wz).fout, /vinkje/, 'ook niet met een naam');
  wiz(m, { t: 'bevestig', aan: true });
  assert.deepEqual(kanVerder(m.lobby, m.wz), { ok: true, naam: 'Zomeravond', openbaar: true }, 'met vinkje en naam wel');
  wiz(m, { t: 'sessienaam', tekst: '' });
  assert.match(kanVerder(m.lobby, m.wz).fout, /naam/, 'een openbare sessie heeft een naam');
  for (const slecht of ['Coca Cola', 'kut', 'Albert Heijn']) {
    wiz(m, { t: 'sessienaam', tekst: slecht });
    const r = kanVerder(m.lobby, m.wz);
    assert.equal(r.ok, false, slecht + ' kan niet als sessienaam');
    assert.match(r.fout, /kan niet/, 'met de uitleg van het filter');
  }
  wiz(m, { t: 'sessienaam', tekst: 'x'.repeat(40) });
  assert.equal(m.wz.sessienaam.length, SESSION_NAME_MAX, 'de naam past in 24 tekens');
  wiz(m, { t: 'wijze', wijze: 'prive' });
  assert.equal(m.wz.openbaar, false, 'terug naar privé');
  assert.equal(m.wz.bevestigd, false, 'en het vinkje is weer weg: een tweede keer openbaar vraagt opnieuw om bevestiging');
  assert.equal(kanVerder(m.lobby, m.wz).openbaar, false);
  assert.equal(reduceWizard(createWizard({ rtc: false }), { t: 'wijze', wijze: 'openbaar' }).openbaar, false, 'zonder WebRTC niet openbaar');
  assert.equal(magOpenbaar('direct'), false, 'de IP-route (met een adres in de code) is nooit openbaar');
  assert.equal(magOpenbaar('kamer'), true);
});

t('privacy: een IP-adres of directe code staat nooit in een veld of regel', () => {
  assert.equal(codeForField('GDE2-ABCDEF'), '');
  assert.equal(codeForField('gde2 abcdef'), '');
  assert.equal(codeForField('K3J9D-8F2MN'), 'K3J9D-8F2MN');
  assert.equal(bevatIp('192.168.1.5'), true);
  assert.equal(bevatIp('GDE2-XYZ'), true);
  assert.equal(bevatIp('Je IP-adres gaat naar je medespeler.'), false);
  // het kamercodeveld in de lobby begint leeg als de laatste code een directe code is
  const l = createLobby(caps({ laatsteCode: 'GDE2-ABCDEFGH' }));
  const v = view(reduce(l, { t: 'kies', rol: ROLES.GAST }));
  assert.equal(v.input.value, '', 'geen IP-code in het veld');
  const l2 = createLobby(caps({ laatsteCode: 'K3J9D-8F2MN' }));
  assert.equal(view(reduce(l2, { t: 'kies', rol: ROLES.GAST })).input.value, 'K3J9D-8F2MN');
});

t('foutpaden: een mislukte verbinding komt terug in stap 2 met één korte melding', () => {
  const m = nieuw();
  lob(m, { t: 'kies', rol: ROLES.GAST }); wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  lob(m, { t: 'invoer', text: 'K3J9D-8F2MN' });
  assert.equal(stap(m), WSTEP.CONNECT);
  // lobbyui.js doet bij een fout: kies gast, dan fout (zie guestStart)
  lob(m, { t: 'kies', rol: ROLES.GAST }); lob(m, { t: 'fout', msg: 'Deze sessie antwoordt niet.' });
  assert.equal(m.lobby.step, 'gast-typt');
  assert.equal(stap(m), WSTEP.PICK, 'terug bij kiezen, de naam hoeft niet opnieuw');
  assert.equal(view(m.lobby).error, 'Deze sessie antwoordt niet.');
  // een volle sessie: een eigen scherm in stap 3 met Terug
  lob(m, { t: 'invoer', text: 'K3J9D-8F2MN' });
  lob(m, { t: 'status', status: 'geweigerd', reason: 'vol' });
  assert.equal(m.lobby.step, 'geweigerd');
  assert.equal(stap(m), WSTEP.CONNECT);
  assert.ok(view(m.lobby).buttons.some((b) => b.act === 'terug'), 'altijd een weg terug');
  // een fout van de wizard zelf verdwijnt bij de volgende stap
  const w = reduceWizard(createWizard(), { t: 'fout', msg: 'kort' });
  assert.equal(w.fout, 'kort');
  assert.equal(reduceWizard(w, { t: 'bevestig', aan: true }).fout, '', 'elke volgende gebeurtenis wist hem');
});

t('foutpad: een verkeerd wachtwoord laat het veld pas zien als de sessie er om vraagt', () => {
  const m = nieuw();
  lob(m, { t: 'kies', rol: ROLES.GAST }); wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  assert.equal(m.wz.wwOpen, false, 'het wachtwoordveld is dicht tot de speler het opent');
  lob(m, { t: 'invoer', text: 'K3J9D-8F2MN' });
  lob(m, { t: 'status', status: 'geweigerd', reason: 'wachtwoord' });
  const v = view(m.lobby);
  assert.ok(v.wachtwoord, 'bij "wachtwoord nodig" staat het veld er wel');
  assert.ok(v.buttons.some((b) => b.act === 'probeer'));
  lob(m, { t: 'probeer' });
  assert.equal(m.lobby.step, 'gast-typt');
  assert.equal(wiz(m, { t: 'ww', open: true }).wz.wwOpen, true);
});

t('tekstdieet: de korte regel per stap is hoogstens 70 tekens', () => {
  assert.equal(HINT_MAX, 70);
  for (const [k, w] of Object.entries(WIZ_TEKST)) assert.ok(w.kort.length <= HINT_MAX, `${k}: ${w.kort.length} tekens`);
  for (const [k, w] of Object.entries(SHORT_PER_SCREEN)) assert.ok(w.length <= HINT_MAX, `${k}: ${w.length} tekens`);
  assert.equal(kort('x'.repeat(71)), '', 'een regel die te lang is, staat niet in beeld');
  assert.equal(kort('Korte regel.'), 'Korte regel.');
  const s = splitHint(['Kort.', 'x'.repeat(200), 'nog een']);
  assert.equal(s.kort, 'Kort.'); assert.equal(s.meer.length, 2);
  const lang = splitHint(['x'.repeat(200), 'rest']);
  assert.equal(lang.kort, ''); assert.equal(lang.meer.length, 2, 'is de eerste regel te lang, dan staat alles achter Meer info');
});

t('de voet: Terug links, de hoofdactie (geel, Enter) als laatste; Verbinding testen is nooit de hoofdactie', () => {
  const v = footerOrder([{ act: 'diag', label: 'Verbinding testen' }, { act: 'koppel', label: 'Verder', primary: true }, { act: 'lijst', label: 'Openbare sessies' }, { act: 'terug', label: 'Terug' }]);
  assert.deepEqual(v.map((b) => b.act), ['terug', 'lijst', 'diag', 'koppel']);
  assert.equal(v[v.length - 1].primary, true);
  assert.deepEqual(footerOrder(null), []);
});

t('stap 3: één voortgangsregel per scherm', () => {
  assert.equal(progressLine({ step: 'verbinden', wachtTik: 0 }).tekst, 'Verbinden…');
  assert.equal(progressLine({ step: 'verbinden', wachtTik: 3 }).tekst, 'Wachten op wie het spel opende…');
  const lang = progressLine({ step: 'verbinden', wachtTik: 6 });
  assert.match(lang.tekst, /geen antwoord/i); assert.equal(lang.bezig, false); assert.equal(lang.actie, 'Terug');
  assert.equal(progressLine({ step: 'host-wacht' }).tekst, 'Wachten op spelers…');
  assert.equal(progressLine({ step: 'verbonden' }).tekst, 'Verbonden');
  for (const s of ['verbinden', 'host-maakt-code', 'host-wacht', 'verbonden', 'verbroken', 'geweigerd']) assert.ok(progressLine({ step: s }).tekst.length <= HINT_MAX, s);
  for (const w of [0, 3, 6]) assert.doesNotMatch(progressLine({ step: 'verbinden', wachtTik: w }).tekst, /\bhost\b/i, 'geen woord host in spelertekst');
});

t('spelerskaartjes: Verwijderen alleen voor wie het spel opende, nooit voor jezelf; Dempen en Blokkeren voor anderen', () => {
  const ander = { slot: 2, naam: 'Iris' };
  const asHost = playerCard(ander, { ik: 0, isHost: true });
  assert.deepEqual(asHost.acties.map((a) => a.id), ['dempen', 'blokkeren', 'verwijderen']);
  assert.ok(asHost.acties.find((a) => a.id === 'verwijderen').gevaar);
  const asGast = playerCard(ander, { ik: 1, isHost: false });
  assert.deepEqual(asGast.acties.map((a) => a.id), ['dempen', 'blokkeren'], 'een gast kan niemand verwijderen');
  const zelf = playerCard({ slot: 1 }, { ik: 1, isHost: true });
  assert.equal(zelf.jij, true); assert.deepEqual(zelf.acties, [], 'jezelf dempen, blokkeren of verwijderen kan niet');
  assert.equal(playerCard({ slot: 0 }, { ik: 1 }).opent, true);
});

// ---- de HTML van elk scherm (zonder DOM): knoppen, indicator en privacy
const render = (m, extra = {}) => {
  const v = view(m.lobby);
  return wizardHtml({
    v, state: m.lobby, wz: m.wz, icoon, keyTextHtml, kleurKlasse: () => 'coop-kleur-0', VORM_TEKEN, EXTRA_CHARS, PROFIEL_KLEUREN,
    uitlegOpen: false, meerOpen: false, stukken: { code: v.code ? `<pre class="coop-code">${v.code}</pre>` : '', chips: '', startHint: '', sessies: '', ww: '', toestemming: '', invoer: '', profielFout: '', uitleg: v.lines }, ...extra,
  });
};
t('HTML: stap 0 heeft twee kaarten, stap 1 een voorbeeld, stap 2 drie opties, en altijd een voet met de hoofdactie rechts', () => {
  const m = nieuw({ favorieten: ['abcdefgh'] });
  let h = render(m);
  assert.match(h, /data-sw-stap="0"/); assert.equal((h.match(/class="ds-z-kaart[^"]*sw-kaart"/g) || []).length, 2);
  assert.match(h, /data-act="kies-gast"/); assert.match(h, /data-act="kies-host"/); assert.doesNotMatch(h, /sw-stappen/, 'geen indicator bij de keuze');
  lob(m, { t: 'kies', rol: ROLES.GAST });
  h = render(m);
  assert.match(h, /data-sw-stap="1"/); assert.match(h, /sw-voorbeeld/); assert.match(h, /data-act="wie-verder" data-primary="1"/);
  wiz(m, { t: 'wie-klaar', naam: 'Sem' });
  h = render(m);
  assert.match(h, /data-sw-stap="2"/); assert.equal((h.match(/class="ds-z-kaart[^"]*sw-kaart"/g) || []).length, 3, 'Kamercode, Openbare sessies en Vrienden');
  assert.match(h, /data-act="koppel" data-primary="1"/);
  const voet = h.slice(h.indexOf('sw-voet'));
  assert.ok(voet.lastIndexOf('data-primary="1"') > voet.lastIndexOf('data-act="wie-terug"'), 'de hoofdactie staat na Terug');
  assert.match(h, /coop-toets/, 'met de toets in de knop');
  const zonderFav = render(nieuw()); // geen favorieten: geen Vrienden
  lob(m, {}); void zonderFav;
  const m2 = nieuw(); lob(m2, { t: 'kies', rol: ROLES.GAST }); wiz(m2, { t: 'wie-klaar', naam: 'Sem' });
  assert.equal((render(m2).match(/class="ds-z-kaart[^"]*sw-kaart"/g) || []).length, 2, 'zonder favorieten geen Vrienden');
});
t('HTML: stap 2 voor wie het spel opent toont Privé gekozen; Openbaar vraagt naam en vinkje', () => {
  const m = nieuw(); lob(m, { t: 'kies', rol: ROLES.HOST }); wiz(m, { t: 'wie-klaar', naam: '' });
  let h = render(m);
  assert.match(h, /data-act="wijze-prive" aria-pressed="true"/); assert.match(h, /data-act="wijze-openbaar" aria-pressed="false"/);
  assert.doesNotMatch(h, /coop-sessienaam/); assert.doesNotMatch(h, /coop-openbaar-vink/);
  wiz(m, { t: 'wijze', wijze: 'openbaar' });
  h = render(m);
  assert.match(h, /coop-sessienaam/); assert.match(h, /coop-openbaar-vink/); assert.doesNotMatch(h, /coop-openbaar-vink" checked/);
  assert.match(h, /data-act="host-open" data-primary="1"/);
  wiz(m, { t: 'bevestig', aan: true }); assert.match(render(m), /coop-openbaar-vink" checked/);
});
t('HTML: de statuskaart heeft geen indicator; een directe code staat nergens in de invoer', () => {
  const m = nieuw();
  m.lobby = reduce(m.lobby, { t: 'adopteer', rol: ROLES.GAST, route: 'kamer', code: '', lijst: [{ slot: 0, naam: 'Sem' }, { slot: 1, naam: 'Iris' }], max: 4, slot: 1 });
  const h = render(m);
  assert.match(h, /data-sw-status="1"/); assert.doesNotMatch(h, /sw-stappen/); assert.match(h, /Je speelt samen/);
  const g = nieuw({ laatsteCode: 'GDE2-ABCDEFGH' }); lob(g, { t: 'kies', rol: ROLES.GAST }); wiz(g, { t: 'wie-klaar', naam: '' });
  assert.equal(bevatIp(render(g)), false, 'geen directe code of IP-adres in het scherm');
});

t('HTML: de wachtkamer van wie het spel opende toont altijd of de sessie privé of openbaar is', () => {
  const m = nieuw({ startGate: true }); lob(m, { t: 'kies', rol: ROLES.HOST }); lob(m, { t: 'route', route: 'kamer' }); lob(m, { t: 'code', code: 'K3J9D-8F2MN' });
  assert.match(render(m), /sw-staat">[^]*?Privé/, 'standaard privé');
  lob(m, { t: 'openbaar-vraag' }); lob(m, { t: 'openbaar-ja', naam: 'Zomeravond', id: 'abcdefgh' });
  assert.match(render(m), /Openbaar: Zomeravond/);
  assert.doesNotMatch(render(m), /sw-staat">(?:(?!<\/p>)[^])*Privé/, 'openbaar: niet meer als privé gemarkeerd');
});

console.log(`multiplayerwizard_test: ${n} controles ok`);
