// Hengelen overal in de provincie (#412): de vissoorten per watertype, het water herkennen, het visboek en zijn opslag, de
// loopbaan Hengelen en de balans van het geld. Puur, geen browser: een nep-kaart voor het water, een nep-opslag voor het boek en
// een spelbot die urenlang hengelt.
//   node scripts/vis_test.mjs
import assert from 'node:assert/strict';
import * as D from '../game/js/visdata.js';
import * as B from '../game/js/visboek.js';
import * as P from '../game/js/hengelplek.js';
import * as LV from '../game/js/visboeklive.js';
import * as L from '../game/js/loopbaan.js';
import { createHengel, stepHengel, botHengel, FISH, pickFish, HENGEL } from '../game/js/hengelrules.js';
import { KEYS } from '../game/js/storagekeys.js';
import { makeRng } from '../game/js/minigamekit.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 3).join(' | ')); } };

// ------------------------------------------------------------------ de gegevens
t('29 soorten, unieke ids, elke soort is in minstens één watertype te vangen en alleen echte tabelverwijzingen', () => {
  assert.equal(D.SOORTEN.length, 29);
  assert.equal(new Set(D.SOORT_IDS).size, 29);
  for (const s of D.SOORTEN) {
    assert.ok(s.naam && s.wat && s.kg > 0 && s.venster > 0.3 && s.venster < 1.5, s.id);
    assert.ok([1, 2, 3, 4].includes(s.zeldzaam), s.id + ': zeldzaamheid');
    assert.ok(D.typenVan(s.id).length > 0, s.id + ' zit nergens');
    assert.ok(D.zeldzaamheid(s).waarde >= 1, s.id);
  }
  for (const [type, tabel] of Object.entries(D.TABELLEN)) {
    assert.ok(D.watertype(type), type);
    for (const [id, g] of Object.entries(tabel)) { assert.ok(D.soort(id), `${type}: onbekende soort ${id}`); assert.ok(g > 0, `${type}/${id}`); }
  }
  assert.deepEqual(Object.keys(D.TABELLEN).sort(), D.WATERTYPE_IDS.slice().sort());
});

t('de lijst past bij het water: zee heeft platvis, een sloot stekelbaars, een gracht geen schol, een meer geen bot', () => {
  const ids = (type) => D.soortenVan(type).map((x) => x.id);
  for (const id of ['bot', 'schol', 'kabeljauw', 'zeebaars']) assert.ok(ids('wad').includes(id), 'wad: ' + id);
  for (const id of ['stekelbaars', 'giebel', 'kroeskarper', 'bittervoorn']) assert.ok(ids('sloot').includes(id), 'sloot: ' + id);
  for (const id of ['schol', 'kabeljauw', 'tong']) assert.ok(!ids('gracht').includes(id) && !ids('meer').includes(id), 'zout in zoet: ' + id);
  assert.ok(!ids('meer').includes('bot') && !ids('plas').includes('bot'));
  assert.ok(ids('kanaal').includes('snoekbaars') && ids('meer').includes('snoekbaars'));
  assert.ok(D.typenVan('meerval').length >= 3 && D.soort('meerval').zeldzaam === 4);
  // elk watertype heeft minstens acht soorten en een mix van gewoon tot zeldzaam
  for (const type of D.WATERTYPE_IDS) {
    const l = D.soortenVan(type);
    assert.ok(l.length >= 8, type + ' heeft te weinig soorten: ' + l.length);
    assert.ok(l.some((x) => D.soort(x.id).zeldzaam === 1) && l.some((x) => D.soort(x.id).zeldzaam >= 3), type + ': geen mix van zeldzaamheden');
  }
});

t('deel van de dag, nachtvis en regen: paling bijt \'s nachts vaker, snoekbaars in de schemer, regen helpt de zeeforel', () => {
  assert.equal(D.deelVanDag(12), 'dag'); assert.equal(D.deelVanDag(7), 'schemer'); assert.equal(D.deelVanDag(19), 'schemer');
  assert.equal(D.deelVanDag(23), 'nacht'); assert.equal(D.deelVanDag(3), 'nacht'); assert.equal(D.deelVanDag(-1), 'nacht'); assert.equal(D.deelVanDag(25), 'nacht');
  const paling = D.soort('paling'), baars = D.soort('baars'), zeeforel = D.soort('zeeforel'), snoekbaars = D.soort('snoekbaars');
  assert.ok(D.gewichtNu(10, paling, { uur: 2 }) > 4 * D.gewichtNu(10, paling, { uur: 13 }));
  assert.equal(D.gewichtNu(10, baars, { uur: 2 }), D.gewichtNu(10, baars, { uur: 13 }));
  assert.ok(D.gewichtNu(10, snoekbaars, { uur: 19 }) > D.gewichtNu(10, snoekbaars, { uur: 12 }));
  assert.ok(D.gewichtNu(10, zeeforel, { regen: true }) > D.gewichtNu(10, zeeforel, { regen: false }));
});

t('kiesVis volgt de gewichten: de gewone soort is vaak, de legendarische bijna nooit, en alles wat in de tabel staat komt voor', () => {
  const rand = makeRng(11);
  const telling = {};
  const N = 40000;
  for (let i = 0; i < N; i++) { const s = D.kiesVis('rivier', rand, { uur: 13 }); telling[s.id] = (telling[s.id] || 0) + 1; }
  assert.ok(telling.voorn > telling.baars * 1.3, 'voorn vaker dan baars');
  assert.ok(telling.voorn / N > 0.12 && telling.voorn / N < 0.26);
  for (const x of D.soortenVan('rivier')) assert.ok(telling[x.id] > 0, x.id + ' komt nooit voor');
  assert.ok(!telling.schol && !telling.karper, 'geen soorten uit andere wateren');
  // nooit een soort buiten het type, ook bij een onbekend type
  assert.ok(D.soort(D.kiesVis('onbekend', rand).id));
  const gew = [0.1, 0.5, 0.9].map((r) => D.vangstGewicht(D.soort('snoek'), () => r));
  assert.ok(gew[0] < gew[1] && gew[1] < gew[2] && gew[0] >= 1.7 && gew[2] <= 3.1, JSON.stringify(gew));
});

t('de waarde van een vangst groeit met het aantal soorten en wateren, met een plafond', () => {
  const s = D.soort('voorn');
  const nul = D.vangstWaarde(s, 0.3, 0, 0), tien = D.vangstWaarde(s, 0.3, 10, 5), alles = D.vangstWaarde(s, 0.3, 29, 60);
  assert.ok(nul > 0 && tien > nul && alles > tien);
  assert.ok(alles / nul <= D.GROEI_MAX + 1e-9, 'plafond ' + (alles / nul));
  assert.ok(D.vangstWaarde(D.soort('meerval'), 12, 0, 0) > 10 * nul, 'de reus is veel waard');
  assert.ok(D.vangstWaarde(D.soort('houting'), 1.5, 0, 0) > D.vangstWaarde(D.soort('brasem'), 1.5, 0, 0) * 2.5, 'zeldzaam is meer waard dan gewoon');
  assert.ok(D.vangstXp(D.soort('meerval')) > D.vangstXp(D.soort('voorn')));
});

// ------------------------------------------------------------------ het water herkennen
const rechthoek = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const poly = (kind, name, pts) => ({ kind, name, pts, bounds: [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))] });
const smal = (kind, name) => poly(kind, name, rechthoek(0, 0, 300, 6));
const groot = (kind, name) => poly(kind, name, rechthoek(0, 0, 2000, 900));
const klein = (kind, name) => poly(kind, name, rechthoek(0, 0, 90, 70));

t('het watertype volgt de naam: de Dollard is wad, het Reitdiep een rivier, het Boterdiep een kanaal', () => {
  const eis = [
    [groot('zee', 'Waddenzee'), 'wad'], [groot('zee', null), 'wad'], [groot('meer', 'Dollard'), 'wad'], [groot('kanaal', 'Eems'), 'wad'],
    [groot('meer', 'Zuidlaardermeer'), 'meer'], [groot('meer', 'Lauwersmeer'), 'meer'], [groot('vijver', 'Paterswoldsemeer'), 'meer'],
    [klein('vijver', 'Hoornse Plas'), 'plas'], [klein('vijver', 'Stadsparkvijver'), 'plas'], [klein('vijver', null), 'plas'], [klein('meer', 'Kleine plas'), 'plas'],
    [smal('diep', 'Reitdiep'), 'rivier'], [smal('diep', 'Hunze'), 'rivier'], [smal('vaart', 'Drentse Aa'), 'rivier'],
    [smal('kanaal', 'Boterdiep'), 'kanaal'], [smal('kanaal', 'Eemskanaal'), 'kanaal'], [smal('kanaal', 'Van Starkenborghkanaal'), 'kanaal'], [smal('vaart', null), 'kanaal'], [poly('kanaal', null, rechthoek(0, 0, 300, 30)), 'kanaal'], [poly('kanaal', 'Winschoterdiep', rechthoek(0, 0, 400, 40)), 'kanaal'],
    // de stadsgrachten staan in de kaart als smalle kanaalstroken
    [smal('kanaal', 'Turfsingel'), 'gracht'], [smal('kanaal', 'Schuitendiep'), 'gracht'], [smal('kanaal', null), 'gracht'],
    [smal('diep', 'Noorderhaven'), 'gracht'], [klein('vijver', 'Scholtengraft'), 'gracht'], [smal('diep', 'Zuiderdiep'), 'gracht'], [smal('diep', 'Oosterhaven'), 'gracht'], [smal('diep', 'Diepenring'), 'gracht'], [smal('diep', 'Reitdiepshaven'), 'gracht'],
    [smal('sloot', null), 'sloot'], [smal('vaart', 'Wetering van Noord'), 'sloot'], [smal('diep', 'Leidijk'), 'sloot'], [smal('sloot', 'Hoofdsloot'), 'sloot'],
  ];
  for (const [p, type] of eis) assert.equal(P.typeVanWater(p), type, `${p.kind} ${p.name || '(naamloos)'}`);
  assert.equal(P.typeVanWater(null), null);
  // zonder naam beslist de grootte: een groot naamloos diep is een kanaal, een klein een gracht
  assert.equal(P.typeVanWater(poly('diep', null, rechthoek(0, 0, 1200, 20))), 'kanaal');
  assert.equal(P.typeVanWater(poly('diep', null, rechthoek(0, 0, 200, 8))), 'gracht');
  // een grote plas is een meer, een kleine meer-polygoon een plas
  assert.equal(P.typeVanWater(poly('vijver', 'Recreatieplas', rechthoek(0, 0, 3000, 2500))), 'meer');
  assert.ok(P.MEER_MIN_OPPERVLAK > 0 && P.PLAS_MAX_OPPERVLAK > P.MEER_MIN_OPPERVLAK);
});

t('de plek in het visboek: de naam van het water, of een vak van 300 m voor naamloos water; en hoe ze heet', () => {
  assert.equal(P.plekSleutel('meer', 'Zuidlaardermeer', 5, 5), 'meer:Zuidlaardermeer');
  assert.equal(P.plekSleutel('sloot', null, 610, -290), 'sloot:2_-1');
  assert.equal(P.plekSleutel('sloot', null, 640, -290), 'sloot:2_-1');
  assert.notEqual(P.plekSleutel('sloot', null, 1000, 0), P.plekSleutel('sloot', null, 100, 0));
  assert.equal(P.plekNaam('meer', 'Zuidlaardermeer'), 'Zuidlaardermeer');
  assert.equal(P.plekNaam('sloot', null), 'de sloot');
  assert.equal(P.plekNaam('wad', null), 'de Waddenzee');
});

// een nep-kaart met waterpolygonen: waterNear geeft wat in het vak ligt
function kaart(polys) {
  return {
    waterNear: (x, y, r) => polys.filter((w) => !(x + r < w.bounds[0] || x - r > w.bounds[2] || y + r < w.bounds[1] || y - r > w.bounds[3])),
    coveredAt: () => false,
  };
}

t('vindHengelplek: aan de kant binnen 3,2 m, in een boot de polygoon eronder, op droog land niets, de dichtstbijzijnde wint', () => {
  const plas = poly('vijver', 'Hoornse Plas', rechthoek(0, 0, 100, 100));
  const sloot = poly('sloot', null, rechthoek(110, 0, 114, 100));
  const k = kaart([plas, sloot]);
  // twee meter buiten de plas
  let r = P.vindHengelplek(k, -2, 50);
  assert.ok(r && r.type === 'plas' && r.naam === 'Hoornse Plas' && !r.opWater, JSON.stringify(r && { t: r.type, n: r.naam }));
  assert.ok(Math.abs(r.x) < 1e-9 && r.y === 50 && Math.abs(r.afstand - 2) < 1e-9, 'het punt aan het water');
  assert.equal(r.plek, 'plas:Hoornse Plas');
  // 5 m van het water: niets
  assert.equal(P.vindHengelplek(k, -5, 50), null);
  // net binnen de reik
  assert.ok(P.vindHengelplek(k, -(P.HENGEL_REIK - 0.1), 50));
  assert.equal(P.vindHengelplek(k, -(P.HENGEL_REIK + 0.1), 50), null);
  // in een boot op het water
  r = P.vindHengelplek(k, 40, 40, { opWater: true });
  assert.ok(r && r.opWater && r.type === 'plas' && r.afstand === 0);
  // een boot op het droge heeft niets
  assert.equal(P.vindHengelplek(k, -2, 50, { opWater: true }), null);
  // tussen twee wateren: de dichtstbijzijnde (de plas, 2 m, tegen de sloot 8 m)
  r = P.vindHengelplek(k, 102, 50);
  assert.equal(r.type, 'plas');
  r = P.vindHengelplek(k, 109, 50);
  assert.equal(r.type, 'sloot');
  // een naamloze strook neemt de naam van het water: dezelfde body, de dichtstbijzijnde benoemde polygoon
  const strook = poly('kanaal', null, rechthoek(0, 200, 100, 220)); strook.body = 7;
  const bron = poly('kanaal', 'Reitdiep', rechthoek(120, 200, 220, 210)); bron.body = 7;
  const ander = poly('kanaal', 'Eemskanaal', rechthoek(0, 400, 100, 410)); ander.body = 8;
  const k2 = kaart([strook, bron, ander]);
  r = P.vindHengelplek(k2, 50, 198);
  assert.ok(r && r.type === 'rivier' && r.naam === 'Reitdiep' && r.plek === 'rivier:Reitdiep', JSON.stringify(r && { t: r.type, n: r.naam }));
  assert.equal(strook._hengelNaam, 'Reitdiep');
  // zonder body en ver weg blijft het naamloos (en dus een gracht of kanaal naar breedte); vlak ernaast van dezelfde soort neemt het de naam over
  const buur = poly('kanaal', null, rechthoek(130, 215, 230, 230));
  r = P.vindHengelplek(kaart([buur, bron]), 180, 213);
  assert.ok(r && r.naam === 'Reitdiep', 'een buurstrook van dezelfde soort');
  const los = poly('kanaal', null, rechthoek(0, 600, 100, 620));
  r = P.vindHengelplek(kaart([los, bron]), 50, 598);
  assert.ok(r && r.naam === null && r.type === 'kanaal', JSON.stringify(r && { t: r.type, n: r.naam }));
  assert.equal(P.vindHengelplek(null, 0, 0), null);
  assert.equal(P.vindHengelplek({}, 0, 0), null);
});

// ------------------------------------------------------------------ het visboek
t('een leeg, kapot of verzonnen boek wordt een geldig boek; getallen worden begrensd, onbekende soorten gaan weg', () => {
  for (const raw of [null, undefined, '', 'rommel', '{"v":9}', 42, [], { v: 1 }]) {
    const b = B.normaliseer(raw);
    assert.equal(b.v, 1); assert.deepEqual(b.soorten, {}); assert.deepEqual(b.plekken, []); assert.equal(b.totaal.n, 0);
  }
  const b = B.normaliseer(JSON.stringify({
    v: 1, soorten: { voorn: { n: 3, kg: 0.5, typen: ['plas', 'ruimte'], eerste: 'plas' }, draak: { n: 5 }, baars: { n: -4 }, snoek: { n: 'veel' }, karper: { n: 1e12, kg: 5000 } },
    plekken: ['plas:A', 'plas:A', 5, 'x'.repeat(200)], types: { plas: 3, zee: 9 }, totaal: { n: 1, kg: -3 },
  }));
  assert.deepEqual(Object.keys(b.soorten).sort(), ['karper', 'voorn']);
  assert.deepEqual(b.soorten.voorn.typen, ['plas']);
  assert.ok(b.soorten.karper.n <= 1e7 && b.soorten.karper.kg <= 1000);
  assert.deepEqual(b.plekken, ['plas:A']);
  assert.equal(b.types.plas, 3); assert.equal(b.types.zee, undefined);
  assert.ok(b.totaal.n >= 1e7 + 3 - 1 || b.totaal.n >= 3, 'het totaal is niet minder dan de soorten');
  assert.equal(b.totaal.kg, 0);
});

t('noteerVangst: nieuwe soort, nieuwe plek, record, nieuw water voor een bekende soort; onbekend type of soort doet niets', () => {
  const b = B.nieuwBoek();
  assert.equal(B.noteerVangst(b, 'draak', 1, 'plas:A', 'plas'), null);
  assert.equal(B.noteerVangst(b, 'voorn', 1, 'plas:A', 'oceaan'), null);
  let r = B.noteerVangst(b, 'voorn', 0.3, 'plas:Hoornse Plas', 'plas');
  assert.ok(r.nieuweSoort && r.nieuwePlek && !r.nieuwRecord && !r.nieuwTypeBijSoort && !r.alles);
  r = B.noteerVangst(b, 'voorn', 0.4, 'plas:Hoornse Plas', 'plas');
  assert.ok(!r.nieuweSoort && !r.nieuwePlek && r.nieuwRecord, 'zwaarder dan ooit');
  r = B.noteerVangst(b, 'voorn', 0.2, 'plas:Hoornse Plas', 'plas');
  assert.ok(!r.nieuwRecord);
  r = B.noteerVangst(b, 'voorn', 0.3, 'gracht:Noorderhaven', 'gracht');
  assert.ok(!r.nieuweSoort && r.nieuwePlek && r.nieuwTypeBijSoort);
  assert.equal(b.soorten.voorn.n, 4); assert.equal(b.soorten.voorn.kg, 0.4);
  assert.deepEqual(b.soorten.voorn.typen.sort(), ['gracht', 'plas']);
  assert.equal(b.totaal.n, 4); assert.equal(b.totaal.kg, 1.2);
  assert.equal(b.plekken.length, 2);
  assert.equal(b.types.plas, 3); assert.equal(b.types.gracht, 1);
  // de soortenlimiet van het boek en de plekken blijft binnen de grenzen
  for (let i = 0; i < 400; i++) B.noteerVangst(b, 'voorn', 0.3, 'sloot:' + i, 'sloot');
  assert.ok(b.plekken.length <= 200);
});

t('voortgang, watertype compleet en het hele boek: de prestaties horen er precies op te volgen', () => {
  const b = B.nieuwBoek();
  assert.deepEqual(B.voortgang(b).gevangen, 0);
  const slootSoorten = D.soortenVan('sloot').map((x) => x.id);
  let compleet = null, alles = false;
  slootSoorten.forEach((id, i) => {
    const r = B.noteerVangst(b, id, 0.2, 'sloot:a', 'sloot');
    if (r.typeCompleet) compleet = { na: i + 1, type: r.typeCompleet };
  });
  assert.deepEqual(compleet, { na: slootSoorten.length, type: 'sloot' });
  assert.ok(B.typeCompleet(b, 'sloot') && !B.typeCompleet(b, 'wad'));
  assert.equal(B.voortgang(b).perType.sloot.gevangen, slootSoorten.length);
  assert.deepEqual(B.ontbrekend(b, 'sloot'), []);
  assert.ok(B.ontbrekend(b, 'wad').length === D.soortenVan('wad').length);
  // soorten die al elders gevangen zijn tellen pas voor sloot als ze ook in de sloot gevangen zijn
  const b2 = B.nieuwBoek();
  B.noteerVangst(b2, 'giebel', 0.4, 'plas:a', 'plas');
  assert.equal(B.voortgang(b2).perType.sloot.gevangen, 0);
  const r = B.noteerVangst(b2, 'giebel', 0.4, 'sloot:a', 'sloot');
  assert.ok(r.nieuwTypeBijSoort && B.voortgang(b2).perType.sloot.gevangen === 1);
  // alles vangen: elke soort in het eerste water waar hij zit
  const b3 = B.nieuwBoek();
  let laatste = null;
  for (const id of D.SOORT_IDS) laatste = B.noteerVangst(b3, id, 1, 'x:' + id, D.typenVan(id)[0]);
  assert.ok(laatste.alles && B.alleSoorten(b3) && B.voortgang(b3).gevangen === 29);
  assert.ok(!B.noteerVangst(b3, 'voorn', 1, 'x', 'gracht').alles, 'alles gaat maar één keer af');
  alles = true; assert.ok(alles);
});

t('twee boeken samenvoegen: per soort het grootste, alle wateren en plekken', () => {
  const a = B.nieuwBoek(), c = B.nieuwBoek();
  B.noteerVangst(a, 'voorn', 0.3, 'plas:A', 'plas'); B.noteerVangst(a, 'voorn', 0.5, 'plas:A', 'plas');
  B.noteerVangst(c, 'voorn', 0.9, 'gracht:G', 'gracht'); B.noteerVangst(c, 'snoek', 3, 'gracht:G', 'gracht');
  const m = B.voegSamen(a, c);
  assert.equal(m.soorten.voorn.kg, 0.9); assert.equal(m.soorten.voorn.n, 2);
  assert.deepEqual(m.soorten.voorn.typen.sort(), ['gracht', 'plas']);
  assert.ok(m.soorten.snoek && m.plekken.length === 2);
  assert.deepEqual(B.voegSamen(a, 'rommel').soorten.voorn.n, 2);
});

// ------------------------------------------------------------------ de opslag
function nepOpslag() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k), _m: m };
}

t('opslag: een eigen sleutel buiten elke savegame, een eerste keer gezaaid uit de prestaties, daarna wat je schreef', () => {
  assert.equal(KEYS.visboek, 'gde-visboek-v1');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'visboek') assert.notEqual(v, KEYS.visboek);
  // een speler die al in Meerstad hengelde begint niet leeg
  const z = LV.zaaiUitPrestaties({ hengelSessions: 4 });
  assert.equal(z.soorten.voorn.n, 12); assert.deepEqual(z.plekken, ['meer:Meerstad']); assert.equal(B.voortgang(z).gevangen, 1);
  assert.equal(B.voortgang(LV.zaaiUitPrestaties({})).gevangen, 0);
  assert.equal(LV.zaaiUitPrestaties({ hengelSessions: 1e6 }).soorten.voorn.n, 40);
  const st = nepOpslag();
  LV.initVisboek({ snapshot: () => ({ stats: { hengelSessions: 2 } }), opslag: st });
  assert.ok(st.getItem(KEYS.visboek), 'de eerste keer schrijft meteen');
  assert.equal(LV.boekVoortgang().gevangen, 1);
  const r = LV.boekVangst('snoek', 2.5, 'meer:Zuidlaardermeer', 'meer');
  assert.ok(r.nieuweSoort && r.nieuwePlek);
  assert.equal(LV.boekVangst('draak', 1, 'x', 'meer'), null);
  LV.schrijfNu();
  const opgeslagen = JSON.parse(st.getItem(KEYS.visboek));
  assert.equal(opgeslagen.soorten.snoek.n, 1); assert.equal(opgeslagen.v, 1);
  // een nieuwe start leest het boek terug, zonder te zaaien
  LV.initVisboek({ snapshot: () => ({ stats: { hengelSessions: 99 } }), opslag: st });
  assert.equal(LV.boekVoortgang().gevangen, 2);
  assert.equal(LV.getBoek().soorten.voorn.n, 6);
  // een tweede tabblad schreef ook: het schrijven voegt samen en verliest niets
  const ander = B.nieuwBoek(); B.noteerVangst(ander, 'bot', 0.5, 'wad:Dollard', 'wad'); B.noteerVangst(ander, 'snoek', 9, 'x', 'meer');
  st.setItem(KEYS.visboek, JSON.stringify(ander));
  LV.boekVangst('baars', 0.6, 'meer:Zuidlaardermeer', 'meer');
  LV.schrijfNu();
  const samen = JSON.parse(st.getItem(KEYS.visboek));
  assert.ok(samen.soorten.bot && samen.soorten.baars && samen.soorten.snoek.kg === 9, 'niets kwijt');
  // kapotte opslag geeft een leeg boek, geen fout
  st.setItem(KEYS.visboek, '{kapot');
  LV.initVisboek({ opslag: st });
  assert.equal(LV.boekVoortgang().gevangen, 0);
  // een opslag die gooit laat het spel doorlopen
  const stuk = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } };
  LV.zetBoekVoorTest(null, stuk);
  assert.doesNotThrow(() => { LV.boekVangst('voorn', 0.3, 'plas:A', 'plas'); LV.schrijfNu(); });
  assert.equal(LV.getBoek().soorten.voorn.n, 1);
  LV.zetBoekVoorTest(null, nepOpslag());
});

// ------------------------------------------------------------------ de loopbaan
t('loopbaan: het vak Hengelen bestaat met zes titels, hengelSessions en de zaai lopen erheen, Buiten behoudt de rest', () => {
  const v = L.vakInfo('hengelen');
  assert.ok(v && v.groep === 'spel' && v.titels.length === 6 && v.eenheid === 'vangsten' && v.uniek === 'plekken');
  assert.equal(L.STAT_VAK.hengelSessions.vak, 'hengelen');
  assert.ok(L.nieuwProfiel().vakken.hengelen);
  const p = L.nieuwProfiel();
  L.tel(p, 'hengelen', { n: 1, xp: 60, uniek: 'meer:Zuidlaardermeer' });
  assert.equal(L.niveauVoorVak(p, 'hengelen'), 2);
  assert.equal(L.tellerTekst(p, 'hengelen'), '1 vangst');
  assert.ok(L.loon(p, 'hengelen', 10) > 10);
  assert.equal(L.zaaiUitPrestaties({ hengelSessions: 5 }, {}).vakken.hengelen.xp, 20);
  assert.equal(L.vakInfo('buiten').titels.length, 6);
  assert.ok(!L.vakInfo('buiten').wat.includes('Hengelen'));
});

// ------------------------------------------------------------------ de regels en de balans
t('hengelrules: de Meerstad-wedstrijd blijft zoals hij was (negentig seconden, vaste vissen), vrij hengelen heeft geen klok', () => {
  const rand = makeRng(5);
  const st = createHengel(rand);
  assert.equal(st.left, HENGEL.duration);
  assert.ok(FISH.map((f) => f.id).includes(pickFish(rand).id));
  for (const f of FISH) assert.ok(D.soort(f.id), 'de Meerstad-vis staat in het visboek: ' + f.id);
  const vrij = createHengel(rand, { kies: (r) => { const s = D.kiesVis('sloot', r); return { id: s.id, name: s.naam, kg: D.vangstGewicht(s, r), window: s.venster }; }, duur: Infinity, wacht: [4.5, 11] });
  assert.equal(vrij.left, Infinity);
  let gevangen = 0, soortIds = new Set();
  for (let i = 0; i < 200000 && gevangen < 30; i++) {
    const inp = botHengel(vrij, 0.3, rand);
    for (const e of stepHengel(vrij, inp, 0.05)) if (e.type === 'catch') { gevangen++; soortIds.add(e.fish); assert.ok(D.typenVan(e.fish).includes('sloot'), 'slootvis: ' + e.fish); }
    assert.notEqual(vrij.phase, 'done', 'vrij hengelen eindigt niet vanzelf');
  }
  assert.equal(gevangen, 30);
  assert.ok(soortIds.size >= 4);
  assert.equal(vrij.vangsten.length, 30);
});

// Een uur hengelen met een bot (reactietijd 0,3 s): hoeveel vissen, euro's en punten, op het eerste niveau en met alles gevonden.
function speelUur(startSoorten, startPlekken, type = 'meer', uren = 1) {
  const rand = makeRng(77 + startSoorten);
  const kies = (r) => { const s = D.kiesVis(type, r, { uur: 13 }); return { id: s.id, name: s.naam, kg: D.vangstGewicht(s, r), window: s.venster }; };
  const st = createHengel(rand, { kies, duur: Infinity, wacht: [4.5, 11] });
  let euro = 0, xp = 0, vangsten = 0;
  const gezien = new Set();
  const soorten = () => Math.min(D.SOORT_IDS.length, startSoorten + gezien.size);
  for (let tijd = 0; tijd < uren * 3600; tijd += 0.05) {
    for (const e of stepHengel(st, botHengel(st, 0.3, rand), 0.05)) {
      if (e.type !== 'catch') continue;
      const s = D.soort(e.fish);
      euro += D.vangstWaarde(s, e.kg, soorten(), startPlekken);
      xp += D.vangstXp(s);
      gezien.add(s.id);
      vangsten++;
    }
  }
  return { euro: euro / uren, xp: xp / uren, vangsten: vangsten / uren, perVis: euro / vangsten, xpPerVis: xp / vangsten, soorten: gezien.size };
}

t('balans: vrij hengelen levert op het eerste niveau tussen 100 en 300 euro per uur en met alles gevonden tussen 150 en 450', () => {
  const nieuw = speelUur(0, 0);
  const rijk = speelUur(29, 60);
  assert.ok(nieuw.vangsten > 150 && nieuw.vangsten < 450, 'vissen per uur ' + Math.round(nieuw.vangsten));
  assert.ok(nieuw.euro > 100 && nieuw.euro < 300, 'eerste niveau: ' + Math.round(nieuw.euro) + ' euro per uur');
  assert.ok(rijk.euro > nieuw.euro * 1.4 && rijk.euro < 450, 'alles gevonden: ' + Math.round(rijk.euro) + ' euro per uur');
  // en een uur meer op het hoogste niveau van het vak blijft binnen +30%
  assert.ok(rijk.euro * L.LOON_FACTOR[L.MAX_NIVEAU - 1] < 600, 'met de loonfactor: ' + Math.round(rijk.euro * 1.3));
  // het geld per minuut blijft ver onder een bijbaan (loopbaan_balans_test.mjs: de bijbaan is de grootste bron)
  assert.ok(rijk.euro / 60 < 8, 'per minuut ' + (rijk.euro / 60).toFixed(1));
  // het model van loopbaan_balans_test.mjs: een vis per ~11 s, 1,9 punt en 0,6 euro per vis
  assert.ok(nieuw.perVis > 0.5 && nieuw.perVis < 0.85, 'euro per vis ' + nieuw.perVis.toFixed(2));
  assert.ok(nieuw.xpPerVis > 1.2 && nieuw.xpPerVis < 2.4, 'punten per vis ' + nieuw.xpPerVis.toFixed(2));
  const min = 60 / nieuw.vangsten;
  assert.ok(min > 0.1 && min < 0.3, 'minuten per vis ' + min.toFixed(2));
});

t('balans: het hoogste niveau van het vak Hengelen kost uren en de eerste soorten en wateren geven snel punten', () => {
  const nieuw = speelUur(0, 0, 'meer', 2);
  const xpPerMin = nieuw.xp / 60;
  const naarTop = L.XP_DREMPELS[L.MAX_NIVEAU - 1] / xpPerMin;
  assert.ok(naarTop >= 60 && naarTop <= 24 * 60, 'niveau 6 na ' + Math.round(naarTop) + ' minuten');
  assert.ok(L.XP_DREMPELS[1] / xpPerMin <= 20, 'niveau 2 komt snel');
  // een nieuwe soort telt zwaar: alle 29 soorten en 15 plekken geven samen ruim een derde van de weg naar de top
  const ontdekking = D.SOORT_IDS.length * D.NIEUWE_SOORT_XP + 15 * L.UNIEK_XP;
  assert.ok(ontdekking > L.XP_DREMPELS[L.MAX_NIVEAU - 1] * 0.3, 'ontdekken ' + ontdekking);
});

console.log(`vis_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
