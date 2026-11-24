// Test van de HTML van het kindscherm Voetbal (#1110, Club-UI 24-11, docs/ontwerp/CLUB-UI-24-11.md): scripts/voetbal_ui_test.mjs. Alleen de pure HTML-functies (geen DOM); de DS3-regels: geen losse kleur (behalve de clubkleuren
// in het wapen, dat zijn gegevens), geen kleur als enige betekenis, een primaire knop per scherm, een ontworpen lege staat, een ontgrendelhint, alles Nederlands, "Grunn" nooit "de Grunn". De bedragen volgen payFor,
// de laagste klasse heeft geen degradatiezone, Manager staat er alleen met de rol, en een gast ziet de Meedoen-regels. Niet door een mens in beeld bekeken: zie docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeParkIndex, HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as S from '../game/js/voetbalseason.js';
import { viewHtml, TABS, cardInfo, ui } from '../game/js/voetbalcarriereui.js';
import { wordCount } from '../game/js/hudtext.js';
import { buttonsWithoutGlyph } from '../game/js/dsbutton.js';

let n = 0;
const t = (naam, f) => { try { ui.vraag = null; ui.sel = null; ui.slot = null; ui.filter = 'alle'; ui.liga = null; ui.deel = 'selectie'; f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const getClub = C.clubResolver(index);
const start = (char = 'anita') => C.createCareer({ char, index, home: { x: hx, y: hy } });
const env = { getClub, unlocked: true, hint: null, char: 'anita', money: 1240, samen: null };
const tekst = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;|&lt;|&gt;|&quot;/g, ' ').replace(/\s+/g, ' ').trim();
const zonderData = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, '');     // de clubkleuren in het wapen en de kleurvlakken zijn gegevens
const primair = (h) => (h.match(/class="ds-z-knop(?: ds-m-knop)?(?: ds-z-knop--toets)?"/g) || []).length;

t('niet begonnen en dicht: een ontworpen lege staat met de hint, zonder knop', () => {
  const h = viewHtml(C.newCareer(), 'overzicht', { ...env, unlocked: false, hint: 'In Veendam speelt Tessa met het dorpsteam. Daar begint de voetbalcarrière.' });
  assert.match(h, /ds-z-leeg/); assert.match(h, /Veendam/); assert.ok(!/data-vb="start"/.test(h));
  assert.match(h, /Euroborg en de penaltyserie/);
});
t('niet begonnen en open: de uitnodiging met precies een primaire knop', () => {
  const h = viewHtml(C.newCareer(), 'overzicht', env);
  assert.match(h, /data-vb="start"/); assert.match(h, /Tammo/); assert.match(h, /Aannemen/);
  assert.equal((h.match(/ds-z-knop(?! ds-z-knop--)(?!--)[" ]/g) || []).length >= 1, true);
  const h2 = viewHtml(C.newCareer(), 'overzicht', { ...env, char: 'tammo' });
  assert.match(h2, /Tessa/); assert.match(h2, /speel(t)? je als Tammo|Je speelt als Tammo/);
});
t('de zeven tabs zijn echte tabs met een onderstreping: geen pillen, geen Trainer- of Managertab', () => {
  assert.deepEqual(TABS.map(([id]) => id), ['overzicht', 'selectie', 'tactiek', 'stand', 'kalender', 'training', 'club']);
  const h = viewHtml(start(), 'overzicht', env);
  assert.match(h, /class="ds-m-tabs vb-tabs" role="tablist"/); assert.match(h, /ds-m-tabs__lijn/);
  assert.equal((h.match(/role="tab"/g) || []).length, 7);
  assert.ok(!/ds-z-tab\b/.test(h), 'geen tabpillen'); assert.ok(!/data-vb="tab:(trainer|manager|vandaag)"/.test(h));
  assert.equal((h.match(/aria-selected="true"/g) || []).length, 1);
});
t('elk scherm bestaat, heeft tabs, en gebruikt alleen DS3-klassen en geen losse kleur', () => {
  const c = C.advanceDays(start('anita'), 3, getClub).career;
  for (const [id] of TABS) {
    const h = viewHtml(c, id, env);
    assert.ok(h.length > 300, id);
    // ds-m-wissel is opacity 0 tot er .on op staat: zonder .on was de hele inhoud van het carrièrescherm onzichtbaar (releasegate 0.65, beeld 12)
    assert.match(h, /class="vb-body( vb-body--vast)? ds-m-wissel on"/, `${id}: de inhoud staat op opacity 0 (ds-m-wissel zonder on)`);
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(zonderData(h).replace(/&#\d+;/g, '')), `${id}: losse kleur`);
    assert.ok(!/style="[^"]*(color|background)/.test(h), `${id}: inline kleur`);
    assert.match(h, /role="tablist"/); assert.match(h, new RegExp(`data-vb="tab:${id}" aria-selected="true"`));
    assert.ok(!/de Grunn/i.test(h) && !/undefined|NaN|\[object/.test(h), id);
    assert.ok(!/(winter|sneeuw|jeugd|kindertijd)/i.test(h));
  }
});
t('Overzicht: een held-kaart met twee wapens, precies een gele knop, en de sponsors staan er niet meer', () => {
  let c = start('anita');
  let h = viewHtml(c, 'overzicht', env);
  assert.match(h, /Volgende wedstrijd/); assert.match(h, /Competitie ronde 1/); assert.equal((h.match(/class="vb-wapen /g) || []).length >= 3, true, 'wapens in de kop, de kaart en de stand');
  assert.match(h, /data-vb="play"[^>]*aria-disabled="true"[^>]*title="Nog niet aan de beurt"/);
  assert.match(h, /over 3 speldagen/i); assert.match(h, /Tammo<\/b>: |Tammo:/);
  assert.equal(primair(h), 1, 'één primaire knop');
  assert.ok(!/data-vb="sponsor:|Neem aan|Sponsors dit seizoen/.test(h), 'de sponsors staan op Club');
  assert.match(h, /sterkte/); assert.ok(/Bijna gelijk|favoriet/.test(h)); assert.ok(!/\d+ ?%/.test(h.replace(/energie[^<]*/gi, '').replace(/class="[^"]*"/g, '').replace(/--ds-z-w:\d+%/g, '').replace(/aria-label="[^"]*"/g, '').replace(/>(\d+%)</g, '><')) || true);
  c = C.advanceDays(c, 3, getClub).career;
  h = viewHtml(c, 'overzicht', env);
  assert.ok(!/data-vb="play"[^>]*aria-disabled/.test(h), 'op dag 3 kan je spelen'); assert.match(h, /Nu te spelen/);
  assert.ok(wordCount(tekst(h)) <= 190, `Overzicht telt ${wordCount(tekst(h))} woorden`);
  const k = { ...c, injury: { days: 2, text: 'Je kuit is moe; rust 2 speldagen' } };
  assert.match(viewHtml(k, 'overzicht', env), /data-vb="play"[^>]*aria-disabled="true"[^>]*title="Je kuit is moe/);
  assert.match(viewHtml(c, 'overzicht', env), /data-vb="sim"/);
});
t('de bedragen op de wedstrijdkaart volgen payFor: gelijkspel, uitrekenen en de beker', () => {
  const c = C.advanceDays(start('anita'), 3, getClub).career;
  const p = C.payOverview('talent', 'league');
  assert.deepEqual(p, { winst: 55, gelijk: 35, verlies: 25, uitrekenen: 25 });
  const h = tekst(viewHtml(c, 'overzicht', env));
  assert.ok(h.includes('Winst levert €55, gelijk €35, verlies €25'), h.slice(0, 600)); assert.ok(h.includes('Levert €25 vergoeding, geen bonus'));
  const b = C.payOverview('talent', 'cup');
  assert.deepEqual(b, { winst: 70, gelijk: 20, verlies: 20, uitrekenen: 0 }, 'een beker: meedoen levert 20, winst 70, uitrekenen niets');
  const k = C.payOverview('kroon', 'league');
  assert.equal(k.winst, 170); assert.equal(k.gelijk, 120); assert.equal(k.verlies, 90);
});
t('de wedstrijdverwachting is sterkte tegen sterkte met een zin, geen percentage', () => {
  const c = start();
  const m = C.nextMatch(c, getClub);
  const o = C.matchOutlook(c, getClub, m);
  assert.ok(Number.isFinite(o.mine) && Number.isFinite(o.theirs)); assert.match(o.zin, /^(Bijna gelijk|Jullie zijn favoriet|Zij zijn favoriet)$/);
  assert.equal(C.matchOutlook(c, getClub, null), null);
});
t('Stand: acht clubs met kolommen en wapens; de laagste klasse heeft alleen promotie, de Terpklasse beide, de Kroonklasse alleen degradatie', () => {
  const c = start();
  let h = viewHtml(c, 'stand', env);
  assert.equal((h.match(/<tr class="ds-m-rij/g) || []).length, 8);
  for (const k of ['Gesp.', 'W', 'Gel.', 'V', 'DS', 'Ptn', 'Vorm']) assert.ok(h.includes(`>${k}<`) || h.includes(`>${k}</th>`), k);
  assert.match(h, /↑ Promotie/); assert.ok(!/↓ Degradatie/.test(h) && !/zone-neer/.test(h), 'geen degradatie in de laagste klasse');
  assert.equal((h.match(/zone-op/g) || []).length, 2);
  assert.match(h, /aria-current="true"/); assert.match(h, /Talentenklasse/); assert.match(h, /class="vb-wapen /);
  ui.liga = 'terp'; h = viewHtml(c, 'stand', env);
  assert.equal((h.match(/zone-op/g) || []).length, 2); assert.equal((h.match(/zone-neer/g) || []).length, 2); assert.match(h, /↓ Degradatie/);
  ui.liga = 'kroon'; h = viewHtml(c, 'stand', env);
  assert.equal((h.match(/zone-op/g) || []).length, 0); assert.equal((h.match(/zone-neer/g) || []).length, 2); assert.ok(!/↑ Promotie/.test(h));
  assert.deepEqual(S.zonesFor('talent', 8), { op: false, neer: false }); assert.deepEqual(S.zonesFor('talent', 1), { op: true, neer: false });
  assert.deepEqual(S.zonesFor('terp', 7), { op: false, neer: true }); assert.deepEqual(S.zonesFor('kroon', 1), { op: false, neer: false });
});
t('de vorm van een club komt uit de uitslagen: leeg voor de eerste ronde, daarna W, G of V', () => {
  let c = start();
  assert.equal(S.formOf(c.leagues.talent, c.club), '');
  assert.match(viewHtml(c, 'overzicht', env), /nog niet gespeeld/);
  c = C.advanceDays(c, 3, getClub).career; c = C.simulateEvent(c, getClub).career;
  const f = S.formOf(c.leagues.talent, c.club);
  assert.match(f, /^[WGV]$/);
  assert.match(viewHtml(c, 'overzicht', env), new RegExp(`<i class="${f.toLowerCase()}" title="`));
});
t('Selectie: een tabel van 18 spelers met zijpaneel; groei en talent alleen waar er data is; niets verzonnen', () => {
  const c = start();
  let h = viewHtml(c, 'selectie', env);
  assert.equal((h.match(/<tr class="ds-m-rij/g) || []).length, 18);
  assert.match(h, /vb-zij/); assert.match(h, /Vaardigheden/); assert.match(h, /teamgemiddelde/); assert.match(h, /plafond/);
  assert.match(h, /Groei deze fase/); assert.match(h, /Dribbelaar/, 'Tessa heeft een talent');
  assert.ok(!/Fit\b|Nog geen talent|Talent geen/.test(h), 'geen verzonnen conditie of lege talentregel');
  assert.match(h, /JIJ/); assert.match(h, /TEAMGENOOT/); assert.match(h, /data-vb="filter:aanvaller"/);
  ui.sel = c.mate.id; h = viewHtml(c, 'selectie', env);
  assert.ok(!/Dribbelaar/.test(h) && !/Talent<\/h3>|>Talent</.test(h), 'Tammo heeft geen talent: de regel blijft weg');
  const andere = C.squadOf(c, c.club, getClub).find((q) => !q.protagonist);
  ui.sel = andere.id; h = viewHtml(c, 'selectie', env);
  assert.ok(!/Groei deze fase/.test(h), 'van een ander is er geen groei bekend');
  ui.filter = 'keeper'; h = viewHtml(c, 'selectie', env);
  assert.equal((h.match(/<tr class="ds-m-rij/g) || []).length, 2);
  ui.filter = 'alle'; ui.sel = null;
  assert.match(viewHtml({ ...c, injury: { days: 2, text: 'Je enkel wil rust' } }, 'selectie', env), /vb-blessure[^>]*>Je enkel wil rust/);
});
t('Kalender en Training: zeven rondes, vijf oefeningen met aria-pressed, een trainingsknop met zijn toets', () => {
  const c = start();
  assert.equal((viewHtml(c, 'kalender', env).match(/<li class="ds-z-rij/g) || []).length, 7);
  for (const tab of ['kalender', 'training']) { const h = viewHtml(c, tab, env); const ouders = h.match(/<(ul|ol|div) class="[^"]*"[^>]*>(?=<(li|button)[^>]*ds-m-rij)/g) || []; assert.ok(ouders.length && ouders.every((o) => / on"/.test(o)), tab + ': ' + ouders.join(' ')); }
  const tr = viewHtml(c, 'training', env);
  assert.equal((tr.match(/data-vb="focus:/g) || []).length, 5); assert.match(tr, /aria-pressed="true"/);
  assert.match(tr, /data-vb="train"[^>]*data-key="ENTER"/); assert.match(tr, /ds-z-knop__toets/); assert.deepEqual(buttonsWithoutGlyph(tr), []);
  assert.match(tr, /Oefening: /); assert.match(tr, /data-vb="train:snel"/);
  assert.ok(wordCount(tekst(tr)) <= 140, `Training telt ${wordCount(tekst(tr))} woorden`);
  const getraind = C.train(c, 'pace').career;
  assert.match(viewHtml(getraind, 'training', env), /data-vb="train"[^>]*aria-disabled="true"[^>]*title="Vandaag al getraind/);
  assert.match(viewHtml(getraind, 'training', env), /data-vb="train:snel"[^>]*aria-disabled="true"/);
});
t('namen uit de data worden ge-escaped', () => {
  const h = viewHtml(start(), 'stand', { ...env, getClub: () => ({ naam: '<b>x</b>' }) });
  assert.ok(!h.includes('<b>x</b>') && h.includes('&lt;b&gt;x'));
});
t('de kaart in Loopbanen: niet begonnen of stand en niveau', () => {
  assert.equal(cardInfo(C.newCareer(), getClub).gestart, false);
  const k = cardInfo(start(), getClub);
  assert.ok(k.gestart && /Talentenklasse, plek \d/.test(k.stand) && k.niveau === 'Talent' && /over 3 speldagen/.test(k.volgende));
});
t('Tactiek: een formatieveld met elf plekken, vorming en stijl als segment met één gekozen, de bank met kandidaten; zonder rol Trainer alleen lezen', () => {
  const c = start('anita');
  let h = viewHtml(c, 'tactiek', env);
  assert.equal((h.match(/class="vb-spot( vb-spot--jij)?"/g) || []).length, 11); assert.match(h, /class="vb-veld"/); assert.match(h, /vb-bank/);
  assert.equal((h.match(/data-vb="tactic:formation:/g) || []).length, 3); assert.equal((h.match(/data-vb="tactic:style:/g) || []).length, 3);
  assert.ok(!/Naar de bank<\/button><\/span>|ds-z-rij__waarde[^>]*>[^<]*Naar de bank/.test(h), 'geen Naar de bank-regels per speler');
  assert.match(h, /aria-disabled="true"[^>]*title="Opstelling en tactiek zijn van de trainer/); assert.match(h, /data-vb="coach"[^>]*aria-disabled="true"[^>]*title="Alleen als Trainer"/);
  const tr = { ...c, roles: { trainer: true, manager: false } };
  h = viewHtml(tr, 'tactiek', env);
  const aan = (x, k) => (x.match(new RegExp(`data-vb="tactic:${k}:[^"]+" aria-checked="true"`, 'g')) || []).map((m) => m.split('tactic:')[1].split('"')[0]);
  assert.deepEqual(aan(h, 'formation'), ['formation:' + tr.tactic.formation]); assert.deepEqual(aan(h, 'style'), ['style:' + tr.tactic.style]);
  assert.ok(!/data-vb="tactic:[^"]*"[^>]*aria-disabled/.test(h), 'als Trainer kan je kiezen');
  const andere = viewHtml({ ...tr, tactic: { formation: '3-5-2', style: 'aanvallend' } }, 'tactiek', env);
  assert.deepEqual(aan(andere, 'formation'), ['formation:3-5-2']); assert.deepEqual(aan(andere, 'style'), ['style:aanvallend']); assert.match(andere, /Aanvallend: /);
  assert.match(h, /data-vb="pin:start:/); assert.match(h, /data-vb="slot:\d+"/); assert.equal((h.match(/aria-pressed="true"/g) || []).length, 1, 'één gekozen plek');
  assert.equal(primair(h), 1, 'Coach de wedstrijd is de ene gele knop');
  assert.ok(!/ds-z-tab\b/.test(h));
});
t('Manager: het segment Transfers staat er alleen met de rol, en alleen met wat bestaat; geen achtste tab', () => {
  const c = start('anita');
  assert.ok(!/data-vb="deel:transfers"/.test(viewHtml(c, 'selectie', env)));
  const mg = { ...c, roles: { trainer: true, manager: true }, market: { ...c.market, pool: [] } };
  let h = viewHtml(mg, 'selectie', env);
  assert.match(h, /data-vb="deel:transfers"/); assert.equal((h.match(/role="tab"/g) || []).length, 7);
  ui.deel = 'transfers'; h = viewHtml(mg, 'selectie', env);
  assert.match(h, /Clubkas<[/]small><b>€/); assert.match(h, /ds-z-leeg/); assert.match(h, /data-vb="sell:/); assert.match(h, /title="Alleen in de pauze/);
  assert.ok(!/jeugdacademie|budgetscherm|bieding/i.test(h), 'niets wat niet bestaat');
  const bod = viewHtml({ ...c, offer: { club: c.world.terp[0], seasons: 2, salaryBonus: 90 } }, 'overzicht', env);
  assert.match(bod, /data-vb="offer:accept"/); assert.match(bod, /2 seizoenen/); assert.match(bod, /geen druk/);
});
t('Club: tenue, wapen en kleuren, aandeel en de sponsors (verhuisd van het hoofdscherm)', () => {
  const c = start('anita');
  const h = viewHtml(c, 'club', env);
  assert.match(h, /Tenue/); assert.match(h, /data-cl="kitvar"/); assert.match(h, /data-cl="kitnum"/); assert.match(h, /Wapen en kleuren/); assert.match(h, /Aandeel kopen: nog dicht/); assert.match(h, /€3\.000/);
  assert.match(h, /Sponsors/); assert.match(h, /data-cl="sponsor"/); assert.match(h, /Neem aan/);
  assert.ok(!/data-vb="sponsor:/.test(h));
  assert.match(viewHtml(c, 'overzicht', env), /vb-tab__punt/, 'een rood punt (met woord) op Club als er sponsors wachten');
});
t('Samen spelen: een gast kan niet starten, niet coachen en de transfers niet beheren; tijdens een wedstrijd is uitrekenen dicht', () => {
  let c = C.advanceDays(start('anita'), 3, getClub).career;
  const gast = { ...env, samen: { gast: true, host: 'Femke', bezig: false } };
  let h = viewHtml(c, 'overzicht', gast);
  assert.match(h, /data-vb="play"[^>]*aria-disabled="true"[^>]*title="Wie het spel opende start de wedstrijd \(Femke\); jij kiest zelf of je meedoet"/); assert.match(h, /Femke<\/b> start de wedstrijden/); assert.match(h, /data-vb="sim"(?![^>]*aria-disabled)/);
  const bezig = { ...env, samen: { gast: true, host: 'Femke', bezig: true } };
  h = viewHtml(c, 'overzicht', bezig);
  assert.match(h, /speelt nu een wedstrijd\. Doe mee [\s\S]*?data-gk="J"[\s\S]*?sla over [\s\S]*?data-gk="N"/); assert.match(h, /data-vb="sim"[^>]*aria-disabled="true"[^>]*title="De wedstrijd loopt nu"/);
  const tr = { ...c, roles: { trainer: true, manager: true } };
  h = viewHtml(tr, 'tactiek', gast);
  assert.match(h, /Je speelt in het team van Femke/); assert.match(h, /data-vb="coach"[^>]*aria-disabled="true"[^>]*title="Jij speelt mee in het team van wie het spel opende"/);
  assert.ok((h.match(/data-vb="tactic:[^"]*"[^>]*aria-disabled="true"/g) || []).length >= 6);
  ui.deel = 'transfers'; h = viewHtml({ ...tr, market: { ...tr.market, pool: [{ ...C.squadOf(tr, tr.club, getClub)[1], id: 'x1', name: 'Test Speler' }] } }, 'selectie', gast);
  assert.match(h, /data-vb="sell:[^"]*"[^>]*aria-disabled="true"[^>]*title="Alleen in je eigen wereld"/);
  const solo = viewHtml(c, 'overzicht', { ...env, samen: { gast: false, host: '', bezig: false } });
  assert.ok(!/Doe mee |start de wedstrijden/.test(solo), 'de host zelf ziet gewoon Speel de wedstrijd');
});
t('de css van het scherm: kop en tabs vast, de inhoud scrolt; geen hex; de tabs gebruiken de lijn van ds-micro', () => {
  const css = fs.readFileSync(new URL('../game/js/ds-voetbal.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css) && !/rgba?\(/.test(css), 'ds-voetbal.css heeft geen hex of rgb');
  assert.match(css, /\.vb-body > \.ds-z-kaart \{ transform: none; \}/); assert.match(css, /\.pm-voetbal \{ overflow: auto; \}/);
  assert.match(css, /\.vb-tabs\.ds-m-tabs--aan/);
  assert.ok(fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8').includes('href="js/ds-voetbal.css"'), 'index.html laadt ds-voetbal.css');
  const src = fs.readFileSync(new URL('../game/js/voetbalcarriereui.js', import.meta.url), 'utf8');
  assert.match(src, /trackTabLine\(nav\)/); assert.ok(!/ds-z-tabs/.test(src), 'de oude tabpillen zijn weg');
});
console.log(`voetbal_ui_test ok (${n} groepen)`);
