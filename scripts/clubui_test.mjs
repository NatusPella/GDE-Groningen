// Het tabblad Club in Land en bedrijf (clubui.js, #1113): de HTML is een pure functie van de carrièrestand; zonder carrière of voor het eerste aandeel staat er een uitleg
// (nooit een leeg scherm), daarna de aandelen, het dividend, de koopknoppen en de sponsors. De knoppen vragen een tweede druk en lopen via de live-laag.   node scripts/clubui_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { runCareer, loadIndex } from './voetbal_carriere_sim.mjs';
import * as C from '../game/js/voetbalcarriere.js';
import * as V from '../game/js/voetbalcarrierelive.js';
import * as L from '../game/js/loopbaanlive.js';
import * as U from '../game/js/clubui.js';
import * as KIT from '../game/js/footballkit.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
L.zetProfielVoorTest(null, mem());
V.useStorage(mem()); V.useParkData(PARKDATA);
const getClub = C.clubResolver(loadIndex());
const wereld = (money = 50000) => ({ money, clock: 12, msgs: [], addMessage(x) { this.msgs.push(x); }, coopDeel: null });

t('zonder carrière en voor het eerste aandeel: een uitleg, geen leeg scherm', () => {
  const a = U.clubHtml({ career: C.newCareer(), money: 5000, getClub });
  assert.match(a, /Club/); assert.match(a, /[Nn]og geen voetbalcarrière/);
  const c = V.createNew(wereld(), 'anita');
  const b = U.clubHtml({ career: c, money: 5000, getClub });
  assert.match(b, /3\.000/); assert.ok(!/data-cl="(koop|verkoop)"/.test(b), "nog geen koopknoppen"); assert.match(b, /Aandeel kopen: nog dicht/);
});

t('na de ontgrendeling: koopknoppen voor de eigen club, uit als het geld er niet is; een tweede druk voor een koop', () => {
  const w = wereld(100000);
  const c = V.getCareer(); V.replaceCareer({ ...c, flags: { ...c.flags, shareReady: true } });
  let h = U.clubHtml({ career: V.getCareer(), money: 100000, getClub });
  assert.match(h, /data-cl="koop"/); assert.match(h, /Je koopt nooit je spaargeld leeg/);
  const arm = U.clubHtml({ career: V.getCareer(), money: 100, getClub });
  assert.ok(/data-cl="koop"[^>]* disabled/.test(arm), 'zonder geld staan de koopknoppen uit');
  const club = V.getCareer().club;
  const el = { innerHTML: '', ls: {}, addEventListener(ev, f) { this.ls[ev] = f; } };
  U.renderClubPanel(el, w);
  assert.ok(el.ls.click && /Club/.test(el.innerHTML));
  const klik = (data) => el.ls.click({ target: { closest: () => ({ dataset: data }) } });
  klik({ cl: 'koop', id: `${club}|0.1` });
  assert.equal(w.money, 100000, 'de eerste druk koopt niets');
  assert.match(el.innerHTML, /kopen voor/);
  klik({ cl: 'koop', id: `${club}|0.1`, ok: '1' });
  assert.ok(w.money < 100000, 'de tweede druk betaalt');
  assert.equal(C.clubSharesOf(V.getCareer()).length, 1);
  assert.match(el.innerHTML, /Aandeel gekocht/); assert.match(el.innerHTML, /10%/); assert.match(el.innerHTML, /Verkoop voor/);
});

t('verkopen: een tweede druk, 75% terug, en de lijst is weer leeg', () => {
  const w = wereld(0), club = V.getCareer().club;
  const el = { innerHTML: '', ls: {}, addEventListener(ev, f) { this.ls[ev] = f; } };
  U.renderClubPanel(el, w);
  const klik = (data) => el.ls.click({ target: { closest: () => ({ dataset: data }) } });
  const prijs = V.getCareer().bezit.clubs[club].prijs;
  klik({ cl: 'verkoop', id: club }); assert.equal(w.money, 0);
  klik({ cl: 'verkoop', id: club, ok: '1' });
  assert.equal(w.money, Math.round(prijs * 0.75));
  assert.equal(C.clubSharesOf(V.getCareer()).length, 0);
  klik({ cl: 'annuleer' }); assert.equal(U.cui.confirm, null);
});

t('sponsors en dividend staan in de weergave; verzonnen tekst wordt ontsmet', () => {
  const rep = runCareer({ char: 'anita', seizoenen: 2, strategie: 'speel' });
  const c = JSON.parse(JSON.stringify(rep.career)); c.flags.shareReady = true;
  const r = C.acceptSponsor(c, c.sponsors.slots[0].id);
  const club = c.leagues.talent.clubs.find((x) => x !== c.club) || c.club;
  const k = C.buyClubShare(r.career, club, 0.25, 1e6, getClub);
  assert.ok(k.ok);
  const h = U.clubHtml({ career: k.career, money: 1e6, getClub });
  assert.match(h, /data-sponsor=/); assert.match(h, /Dividend per ronde/);
  const geknutseld = { ...k.career, sponsors: { ...k.career.sponsors, slots: k.career.sponsors.slots.map((s) => ({ ...s, naam: '<img src=x onerror=alert(1)>' })) } };
  assert.ok(!/<img/.test(U.clubHtml({ career: geknutseld, money: 1, getClub })), 'tekst wordt ontsmet');
});

t('de menuregels: het tabblad staat in het pausemenu en de bezit-koppeling kent els.club', () => {
  const menu = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  assert.ok(menu.includes("['club', 'Club']") && menu.includes('data-of="boerderij" data-sub="club"'));
  assert.equal((menu.match(/club: q\('club'\)/g) || []).length, 2, 'beide renderplekken geven het paneel mee');
  assert.ok(fs.readFileSync(new URL('../game/js/bezitui.js', import.meta.url), 'utf8').includes('if (els.club) { renderClubPanel(els.club, world)'));
});


t('Club-UI: het tenue als eigen kaart, sponsors aannemen, en het stadion alleen uit echte data', () => {
  const c = V.getCareer();
  const kit = U.clubView(wereld(), { career: c }).kit;
  const h = U.clubHtml({ career: c, money: 100, getClub, kit });
  assert.match(h, /Tenue/); assert.match(h, /data-cl="kitvar" data-id="thuis" aria-checked="true"/); assert.match(h, /data-cl="kitnum"/); assert.match(h, /aria-disabled="true" title="Een derde tenue krijg je vanaf Prof"/);
  assert.match(h, /data-kit-shirt="/); assert.match(h, /Wapen en kleuren/);
  const club = getClub(c.club);
  assert.ok(!/Stadion en trainingsveld/.test(U.clubHtml({ career: c, money: 1, getClub: () => ({ ...club, park: null, trainingsvelden: [], stadion: null }) })), 'geen data, geen vlak');
  const metData = U.clubHtml({ career: c, money: 1, getClub: () => ({ ...club, park: { f: 3 }, trainingsvelden: [{}, {}], stadion: null, plaats: 'Haren' }) });
  assert.match(metData, /Stadion en trainingsveld/); assert.match(metData, />3<[^]*velden op het park in Haren/); assert.match(metData, />2<[^]*trainingsvelden erbij/);
  assert.ok(!/plaatsen|capaciteit|tribune/i.test(metData), 'geen verzonnen aantallen');
  const slot = c.sponsors.slots.find((x) => !x.accepted);
  assert.ok(slot && new RegExp('data-cl="sponsor" data-id="' + slot.id + '"').test(h));
  U.clubAct(wereld(), { cl: 'sponsor', id: slot.id });
  assert.ok(V.getCareer().sponsors.slots.find((x) => x.id === slot.id).accepted); assert.equal(U.cui.msg, 'Sponsor getekend.');
  U.clubAct(wereld(), { cl: 'kitvar', id: 'uit' }); assert.equal(KIT.kitChoice(V.getCareer()).variant, 'uit');
  U.clubAct(wereld(), { cl: 'kitnum', id: '1' }); assert.equal(KIT.kitChoice(V.getCareer()).number, KIT.kitChoice(c).number + 1);
  const gelukt = U.clubHtml({ career: V.getCareer(), money: 100, getClub });
  assert.match(gelukt, /vb-sponsor vb-sponsor--aan/); assert.match(gelukt, /✓ Aangenomen/);
});

t('het shirtvoorbeeld is robuust: een 2D-shirt in de clubkleuren staat er altijd, het 3D-plaatje is verborgen tot het er is (zonder WebGL blijft het 2D-shirt)', () => {
  const c = V.getCareer(), kit = KIT.kitView(c, getClub), club = getClub(c.club);
  const h = U.clubHtml({ career: c, money: 1, getClub, kit });
  assert.match(h, /class="vb-shirt2d"/); assert.ok(h.includes('fill="#' + (club.shirt & 0xffffff).toString(16).padStart(6, '0') + '"'), 'de clubkleur');
  assert.ok(h.includes('>' + kit.number + '</text>'), 'het rugnummer'); assert.match(h, /data-kit-shirt="[^"]+" hidden>/, 'het 3D-plaatje is verborgen tot het klaar is');
  assert.ok(U.shirt2dSvg(null, 7).includes('#888888'), 'zonder clubdata een neutraal shirt, geen fout');
  assert.ok(!/NaN|undefined/.test(U.shirt2dSvg(club, 10)));
  // zonder document (node) doet kitPhotos niets en gooit niets; plaatjeHeeftInhoud vertrouwt een plaatje dat hij niet meten kan
  U.kitPhotos({ querySelector: () => ({ getAttribute: () => 'x' }) });
  assert.equal(typeof U.plaatjeHeeftInhoud({}), 'boolean');
  const css = fs.readFileSync(new URL('../game/js/ds-voetbal.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.vb-shirt2d__rand') && css.includes('.vb-shirtvak img[hidden]'));
  // 24-11 (rooktest integratie-0.66): de wereld bouwt mensen modulair (ADR 0051); het stukvoorbeeld heeft de meetlagen van het procedurele model nodig, anders blijft het leeg
  assert.ok(fs.readFileSync(new URL('../game/js/clothingpreview.js', import.meta.url), 'utf8').includes('{ ...opts, procedural: true }'), 'buildProbe bouwt het procedurele model');
});

console.log(`clubui_test ok (${n} groepen)`);
