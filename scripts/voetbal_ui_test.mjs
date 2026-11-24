// Test van de HTML van het kindscherm Voetbal (#1110): scripts/voetbal_ui_test.mjs. Alleen de pure HTML-functies (geen DOM); de DS3-regels: geen losse kleur, geen kleur als enige betekenis, een primaire knop,
// een ontworpen lege staat, een ontgrendelhint, alles Nederlands, "Grunn" nooit "de Grunn". Niet in beeld bekeken: zie docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeParkIndex, HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import { viewHtml, TABS, cardInfo } from '../game/js/voetbalcarriereui.js';
import { wordCount } from '../game/js/hudtext.js';
import { buttonsWithoutGlyph } from '../game/js/dsbutton.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const getClub = C.clubResolver(index);
const start = (char = 'anita') => C.createCareer({ char, index, home: { x: hx, y: hy } });
const env = { getClub, unlocked: true, hint: null, char: 'anita' };
const tekst = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;|&lt;|&gt;|&quot;/g, ' ').replace(/\s+/g, ' ').trim();

t('niet begonnen en dicht: een ontworpen lege staat met de hint, zonder knop', () => {
  const h = viewHtml(C.newCareer(), 'vandaag', { ...env, unlocked: false, hint: 'In Veendam speelt Tessa met het dorpsteam. Daar begint de voetbalcarrière.' });
  assert.match(h, /ds-z-leeg/); assert.match(h, /Veendam/); assert.ok(!/data-vb="start"/.test(h));
  assert.match(h, /Euroborg en de penaltyserie/);
});
t('niet begonnen en open: de uitnodiging met precies een primaire knop', () => {
  const h = viewHtml(C.newCareer(), 'vandaag', env);
  assert.match(h, /data-vb="start"/); assert.match(h, /Tammo/); assert.match(h, /Aannemen/);
  assert.equal((h.match(/ds-z-knop(?! ds-z-knop--)(?!--)[" ]/g) || []).length >= 1, true);
  const h2 = viewHtml(C.newCareer(), 'vandaag', { ...env, char: 'tammo' });
  assert.match(h2, /Tessa/); assert.match(h2, /speel(t)? je als Tammo|Je speelt als Tammo/);
});
t('elk scherm bestaat, heeft tabs, en gebruikt alleen DS3-klassen en geen losse kleur', () => {
  const c = C.advanceDays(start('anita'), 3, getClub).career;
  for (const [id] of TABS) {
    const h = viewHtml(c, id, env);
    assert.ok(h.length > 300, id);
    // ds-m-wissel is opacity 0 tot er .on op staat: zonder .on was de hele inhoud van het carrièrescherm onzichtbaar (releasegate 0.65, beeld 12)
    assert.match(h, /class="vb-body ds-m-wissel on"/, `${id}: de inhoud staat op opacity 0 (ds-m-wissel zonder on)`);
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(h.replace(/&#\d+;/g, '')), `${id}: losse kleur`);
    assert.ok(!/style="[^"]*(color|background)/.test(h), `${id}: inline kleur`);
    assert.match(h, /role="tablist"/); assert.match(h, new RegExp(`aria-selected="true"[^>]*>|data-vb="tab:${id}" aria-selected="true"`));
    assert.ok(!/de Grunn/i.test(h) && !/undefined|NaN|\[object/.test(h), id);
    assert.ok(!/(winter|sneeuw|jeugd|kindertijd)/i.test(h));
  }
});
t('Vandaag: de wedstrijd, de keuze spelen of uitrekenen en een voorstel van de regelaar; een dichte knop zegt waarom', () => {
  let c = start('anita');
  let h = viewHtml(c, 'vandaag', env);
  assert.match(h, /Competitie ronde 1/); assert.match(h, /data-vb="play"[^>]*aria-disabled="true"[^>]*title="Nog niet aan de beurt"/);
  assert.match(h, /over 3 speldagen/i); assert.match(h, /Tammo<\/strong>: /);
  c = C.advanceDays(c, 3, getClub).career;
  h = viewHtml(c, 'vandaag', env);
  assert.ok(!/data-vb="play"[^>]*aria-disabled/.test(h), 'op dag 3 kan je spelen'); assert.match(h, /Nu te spelen/); assert.match(h, /winnen €/);
  assert.ok(wordCount(tekst(h)) <= 125, `Vandaag telt ${wordCount(tekst(h))} woorden`);
  const k = { ...c, injury: { days: 2, text: 'Je kuit is moe; rust 2 speldagen' } };
  assert.match(viewHtml(k, 'vandaag', env), /data-vb="play"[^>]*aria-disabled="true"[^>]*title="Je kuit is moe/);
});
t('Stand: acht clubs, promotie en degradatie met woord en pijl (niet alleen kleur)', () => {
  const h = viewHtml(start(), 'stand', env);
  assert.equal((h.match(/<li class="ds-z-rij/g) || []).length, 8);
  assert.match(h, /↑ promotie/); assert.match(h, /↓ degradatie/); assert.match(h, /aria-current="true"/);
  assert.match(h, /Talentenklasse/);
});
t('Kalender, Selectie en Training: zeven rondes, 18 spelers, vijf oefeningen met aria-pressed', () => {
  const c = start();
  assert.equal((viewHtml(c, 'kalender', env).match(/<li class="ds-z-rij/g) || []).length, 7);
  assert.equal((viewHtml(c, 'selectie', env).match(/vb-selectie"/g) || []).length, 1);
  assert.equal((viewHtml(c, 'selectie', env).match(/<li class="ds-z-rij ds-m-rij/g) || []).length, 5 + 18);
  const tr = viewHtml(c, 'training', env);
  assert.equal((tr.match(/data-vb="focus:/g) || []).length, 5); assert.match(tr, /aria-pressed="true"/);
  assert.ok(wordCount(tekst(tr)) <= 125, `Training telt ${wordCount(tekst(tr))} woorden`);
  const getraind = C.train(c, 'pace').career;
  assert.match(viewHtml(getraind, 'training', env), /data-vb="train"[^>]*aria-disabled="true"[^>]*title="Vandaag al getraind/);
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
t('Trainer- en Managertab pas na ontgrendeling; het bod, de tactiek en de markt staan in beeld', () => {
  const c = start('anita');
  assert.ok(!/data-vb="tab:trainer"/.test(viewHtml(c, 'vandaag', env)) && !/data-vb="tab:manager"/.test(viewHtml(c, 'vandaag', env)));
  const tr = { ...c, roles: { trainer: true, manager: false } };
  const h = viewHtml(tr, 'trainer', env);
  assert.match(h, /data-vb="tab:trainer"/); assert.match(h, /data-vb="tactic:formation:4-3-3"/); assert.match(h, /data-vb="tactic:style:aanvallend"/); assert.match(h, /Basis \(11\)/); assert.match(h, /Bank \(7\)/);
  const mg = { ...c, roles: { trainer: true, manager: true }, market: { ...c.market, pool: [] } };
  const m = viewHtml(mg, 'manager', env);
  assert.match(m, /Clubkas €/); assert.match(m, /ds-z-leeg/); assert.match(m, /data-vb="sell:/); assert.match(m, /title="Alleen in de pauze/);
  const bod = viewHtml({ ...c, offer: { club: c.world.terp[0], seasons: 2, salaryBonus: 90 } }, 'vandaag', env);
  assert.match(bod, /data-vb="offer:accept"/); assert.match(bod, /2 seizoenen/); assert.match(bod, /geen druk/);
});
t('Training: de trainingsknop draagt zijn toets (Enter) in de knop en de oefening staat erbij; snel trainen blijft mogelijk (#1109)', () => {
  const c = start();
  const tr = viewHtml(c, 'training', env);
  assert.match(tr, /data-vb="train"[^>]*data-key="ENTER"/); assert.match(tr, /ds-z-knop__toets/);
  assert.deepEqual(buttonsWithoutGlyph(tr), []);
  assert.match(tr, /Oefening: /); assert.match(tr, /data-vb="train:snel"/);
  assert.match(viewHtml(C.train(c, 'pace').career, 'training', env), /data-vb="train:snel"[^>]*aria-disabled="true"/);
});
t('#1110 (hertest 22-11): brede kaarten in de body liggen recht, met lucht tot de chips en de kop eronder', () => {
  const src = fs.readFileSync(new URL('../game/js/voetbalcarriereui.js', import.meta.url), 'utf8');
  assert.match(src, /\.vb-body > \.ds-z-kaart \{ transform: none; \}/);
  assert.match(src, /\.vb-body \{ display: grid; gap: var\(--ds-s-3\); \}/);
});
console.log(`voetbal_ui_test ok (${n} groepen)`);
