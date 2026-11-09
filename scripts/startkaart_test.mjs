// #678: één standaard startkaart voor alle activiteiten, met doel, medaille-eisen, beloning,
// samen-status en je record (en de kernbesturing van twee of drie toetsgroepen). De kaart komt uit
// één tabel (game/js/startkaart.js) die ook "Te doen" en de kaart-hover voedt.
//   node scripts/startkaart_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const S = await import(new URL('../game/js/startkaart.js', import.meta.url).href);
const { STARTKAART, startkaartSpec, startkaartRegels, startkaartRijen, startkaartRegel } = S;

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };
const woorden = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

// De 26 activiteiten uit activities.js, zonder de module te laden (die haalt THREE en de DOM).
const ACT = lees('game/js/activities.js');
const imports = {};
for (const m of ACT.matchAll(/import \{ ([^}]+) \} from '\.\/([^']+)\.js';/g)) for (const naam of m[1].split(',').map((x) => x.trim().split(' as ')[0])) imports[naam] = m[2];
const lijst = ACT.match(/const LIST = \[([^\]]+)\]/)[1].split(',').map((x) => x.trim());
const moduleBronnen = lijst.map((naam) => (imports[naam] ? lees(`game/js/${imports[naam]}.js`) : ACT));
const ids = S && Object.keys(STARTKAART).filter((id) => moduleBronnen.some((bron) => new RegExp(`id: '${id}'`).test(bron)));

t('elke activiteit heeft een kaart met titel, doel, beloning en kernbesturing', () => {
  assert.equal(lijst.length, 26, 'activities.js heeft 26 activiteiten');
  assert.equal(Object.keys(STARTKAART).length, 26, 'de startkaarttabel heeft 26 regels');
  assert.deepEqual([...ids].sort(), Object.keys(STARTKAART).sort(), 'elk id in de tabel is een echte activiteit');
  for (const id of ids) {
    const k = STARTKAART[id];
    assert.ok(k.titel && k.titel.length > 2, `${id}: titel`);
    assert.ok(k.doel && woorden(k.doel) <= 14, `${id}: doel van hoogstens 14 woorden`);
    assert.ok(k.beloning && woorden(k.beloning) <= 18, `${id}: beloning kort`);
    assert.ok(k.kern && k.kern.length > 2, `${id}: kernbesturing`);
    assert.ok(k.kern.split('·').length <= 3, `${id}: hooguit drie toetsgroepen in de kern`);
    if (k.medailles) assert.equal(k.medailles.length, 3, `${id}: brons, zilver en goud`);
  }
});

t('de kaart noemt doel, medailles, beloning en samen; het record komt erbij als je het meegeeft', () => {
  const spec = startkaartSpec('discgolf', { record: '2 onder par' });
  assert.equal(spec.kind, 'tip');
  assert.equal(spec.title, 'Discgolf');
  assert.match(spec.bodyHtml, /Doel: /);
  assert.match(spec.bodyHtml, /Medailles: brons /);
  assert.match(spec.bodyHtml, /Beloning: /);
  assert.match(spec.bodyHtml, /Samen: /);
  assert.match(spec.bodyHtml, /Record: 2 onder par/);
  assert.match(spec.bodyHtml, /<kbd class="hud-key">SPATIE<\/kbd>/, 'de toetsen staan als toetsplaatjes');
  assert.equal(spec.key, 'startkaart-discgolf');
  assert.equal(startkaartSpec('onbestaand'), null, 'een onbekende activiteit geeft geen kaart');
});

t('de samen-status komt uit het register van coopstatus.js', () => {
  assert.match(startkaartRegels('hoogvlieger').join(' | '), /Samen: nog niet samen/);
  assert.match(startkaartRegels('discgolf').join(' | '), /Samen: ja, met de groep/);
  assert.match(startkaartRegels('discgolf').join(' | '), /1\+1=3: elke extra speler geeft iedereen 50% meer loon, tot 3×/, 'de startkaart noemt de groepsbonus (#811)');
  for (const id of ['discgolf', 'pitchputt', 'kartbaan']) assert.match(startkaartRegels(id).join(' | '), /1\+1=3/, id + ': startkaart noemt 1+1=3');
  assert.match(startkaartRegels('wandeling').join(' | '), /Samen: deels/);
});

t('dezelfde gegevens gaan naar de kaart-hover en "Te doen"', () => {
  const rijen = startkaartRijen('hengelen');
  assert.deepEqual(rijen.map(([k]) => k), ['Doel', 'Medailles', 'Beloning']);
  assert.match(startkaartRegel('hengelen'), /^Doel: /);
  assert.match(ACT, /startkaartRegel\(a\.id\)/, 'de kaart-hover leest dezelfde regel');
  assert.match(ACT, /export const ACTIVITEIT_IDS = LIST\.map/, 'de activiteitenlijst heeft één id-bron');
});

t('de hoverregel noemt doel, brons en beloning binnen het budget', () => {
  const { MAX_HOVER_CHARS } = S;
  const regel = startkaartRegel('vaardienst');
  assert.match(regel, /^Doel: /);
  assert.match(regel, /brons gehaald/, 'de bronzen drempel staat erin');
  assert.match(regel, /je medaille op het bord/, 'de beloning staat erin');
  assert.ok(startkaartRegel('discgolf').length <= MAX_HOVER_CHARS, 'ook een lange regel blijft binnen het budget');
  for (const id of Object.keys(STARTKAART)) {
    const r = startkaartRegel(id);
    assert.ok(r.length <= MAX_HOVER_CHARS, `${id}: ${r.length} tekens`);
  }
});

// #815: de hoverregel noemt doel, de bronzen eis en de beloning, binnen het budget van de
// kaart-subregel. De volledige tabel blijft de bron; de regel is daarvan de compacte samenvatting.
t('de kaart-hover noemt doel, bronzen eis en beloning (#815)', () => {
  assert.equal(typeof S.MAX_HOVER_CHARS, 'number', 'er is een vast tekenbudget voor de hoverregel');
  assert.ok(S.MAX_HOVER_CHARS > 60 && S.MAX_HOVER_CHARS < 120, 'het budget past bij één hoverregel');
  const vol = startkaartRegel('vaardienst');
  assert.match(vol, /^Doel: Vaar de drie kades in volgorde langs · brons gehaald · je medaille op het bord$/, 'doel, brons en beloning staan er alle drie in');
  // een activiteit zonder medailles noemt het doel en de beloning
  assert.equal(startkaartRegel('snackketen'), 'Doel: Koop snackbars, verbouw ze en leeg de kassa · omzet per minuut; de kassa is van jou');
  // te lang? dan doel + brons, zonder de beloning erbij te proppen
  const disc = startkaartRegel('discgolf');
  assert.match(disc, /· brons 6 boven par$/, 'de beloning valt weg als de regel te lang wordt');
  assert.ok(!disc.includes('prijzengeld'), 'geen afgekapte beloning');
  // en de hoverregel komt uit dezelfde bron als "Te doen", niet uit een tweede tabel
  assert.deepEqual(startkaartRijen('vaardienst').map(([k, v]) => [k, v]), [['Doel', STARTKAART.vaardienst.doel], ['Medailles', 'brons gehaald · zilver op tijd · goud alles goed'], ['Beloning', 'je medaille op het bord']]);
});

t('de hoverregel blijft binnen het budget en breekt geen woorden af (#815)', () => {
  for (const id of Object.keys(STARTKAART)) {
    const regel = startkaartRegel(id);
    assert.ok(regel.length <= S.MAX_HOVER_CHARS, `${id}: ${regel.length} tekens is te lang`);
    assert.ok(regel.startsWith('Doel: '), `${id}: de regel begint met het doel`);
    assert.ok(!regel.endsWith(' …') && !regel.includes('  '), `${id}: geen losse spaties`);
    // alleen een afkapping op een woordgrens eindigt op een ellips
    if (regel.endsWith('…')) assert.ok(/[^\s]…$/.test(regel), `${id}: de ellips staat achter een woord`);
  }
  // een lang doel (buiten de tabel om) valt terug op een nette woordgrens
  const lang = { titel: 'Test', doel: 'een twee drie vier vijf zes zeven acht negen tien elf twaalf dertien veertien vijftien zestien zeventien achttien negentien twintig', medailles: ['tien', 'twintig', 'dertig'], beloning: 'heel veel prijzengeld en loopbaanpunten en nog een lange staart erachteraan' };
  STARTKAART.__lang = lang;
  try {
    const regel = startkaartRegel('__lang');
    assert.ok(regel.length <= S.MAX_HOVER_CHARS, 'ook een lang doel blijft binnen het budget');
    assert.ok(regel.endsWith('…'), 'een te lang doel wordt afgekapt');
    const laatste = regel.slice('Doel: '.length, -1).split(' ').pop();
    assert.ok(lang.doel.split(' ').includes(laatste), `geen half woord voor de ellips: ${laatste}`);
  } finally { delete STARTKAART.__lang; }
});

t('de kaart-hover gebruikt de hoverregel uit activities.js (#815)', () => {
  assert.match(ACT, /sub: \[a\.mapSub \? a\.mapSub\(s, w\) : a\.legend\.note, startkaartRegel\(a\.id\)\]\.filter\(Boolean\)\.join\(' · '\)/, 'de kaart-hoverregel komt uit startkaartRegel');
  const MV = lees('game/js/mapview.js');
  assert.match(MV, /sub = h\.tipSub \|\| h\.sub \|\| '';/, 'de tooltip toont die subregel');
  assert.match(MV, /hover\.push\(\{ sx: q\.sx, sy: q\.sy, name: q\.name, sub: q\.sub/, 'de hover van een pictogram bewaart de subregel');
  assert.match(MV, /white-space: normal; overflow-wrap: normal;/, 'lange hoverregels wikkelen op woordgrenzen');
});

t('elke start toont de kaart: standactivity, de losse spellen en de diensten', () => {
  assert.match(lees('game/js/standactivity.js'), /toonStartkaart\(w, c\.id, \{ record: c\.recText/, 'standactivity toont de kaart met het record');
  assert.match(lees('game/js/activities.js'), /toonStartkaart\(w, cfg\.id\)/, 'de vlucht- en vaardienst tonen de kaart');
  // alle losse spellen en attracties met een eigen bord tonen dezelfde kaart (#678 vervolg)
  for (const f of ['discgolf.js', 'pitchputt.js', 'kartbaan.js', 'skatepark.js', 'ringrace.js', 'carbid.js',
    'kermis.js', 'driftzone.js', 'wandeling.js', 'regatta.js', 'hengelen.js', 'reuzenrad.js']) {
    assert.match(lees('game/js/' + f), /toonStartkaart\(w, '/, `${f} toont de startkaart`);
  }
  // de oude losse startkaarten van deze spellen zijn weg (de verhaalvariant van de kermis blijft)
  for (const f of ['discgolf.js', 'pitchputt.js', 'kartbaan.js', 'skatepark.js', 'ringrace.js', 'carbid.js',
    'driftzone.js', 'wandeling.js', 'regatta.js', 'hengelen.js']) {
    assert.ok(!/key: '(discgolf|pitchputt|kart|skate|ringrace|carbid|kermis|drift|wandeling|regatta|hengelen)[^']*help/.test(lees('game/js/' + f)), `${f} heeft geen eigen startkaart meer`);
  }
});

// #800: de medaille-eisen op de startkaart komen uit dezelfde schaalbron als het spel, per stand.
const D = await import(new URL('../game/js/difficulty.js', import.meta.url).href);
const [RSki, RSwim, RClimb, RPan, RHengel, RCar] = await Promise.all(['skirules.js', 'swimrules.js', 'climbrules.js', 'pannenkoekrules.js', 'hengelrules.js', 'carillonrules.js'].map((f) => import(new URL('../game/js/' + f, import.meta.url).href)));
t('de medaille-eisen volgen de moeilijkheidsstand via difficulty.js (#800)', () => {
  // de standaardstand is exact de tabel: geen tekst verandert voor bestaande spelers
  for (const id of ['carbid', 'kermis', 'drift', 'klimtoren', 'zwembad', 'waterski', 'pannenkoek', 'hengelen', 'carillon']) {
    assert.deepEqual(S.medaillesVoorStand(id, 'standaard'), STARTKAART[id].medailles, id + ': standaard gelijk aan de tabel');
  }
  const verwacht = {
    carbid: { ontspannen: ['36 punten', '64 punten', '96 punten'], uitdagend: ['56 punten', '100 punten', '150 punten'] },
    kermis: { ontspannen: ['48 punten', '88 punten', '128 punten'], uitdagend: ['75 punten', '138 punten', '200 punten'] },
    drift: { ontspannen: ['2.000 punten', '4.000 punten', '7.200 punten'], uitdagend: ['3.125 punten', '6.250 punten', '11.250 punten'] },
    klimtoren: { ontspannen: ['binnen 1:40', 'binnen 1:00', 'binnen 0:38'], uitdagend: ['binnen 1:04', 'binnen 0:38', 'binnen 0:24'] },
    zwembad: { ontspannen: ['binnen 2:05', 'binnen 1:35', 'binnen 1:20'], uitdagend: ['binnen 1:20', 'binnen 1:01', 'binnen 0:51'] },
    waterski: { ontspannen: ['520 punten', '1.040 punten', '1.760 punten'], uitdagend: ['813 punten', '1.625 punten', '2.750 punten'] },
    pannenkoek: { ontspannen: ['320 punten', '560 punten', '800 punten'], uitdagend: ['500 punten', '875 punten', '1.250 punten'] },
    hengelen: { ontspannen: ['3,2 kg', '6 kg', '9,6 kg'], uitdagend: ['5 kg', '9,4 kg', '15 kg'] },
    carillon: { ontspannen: ['40% goed', '60% goed', '74% goed'], uitdagend: ['63% goed', '94% goed', '100% goed'] },
  };
  for (const [id, per] of Object.entries(verwacht)) {
    assert.deepEqual(S.medaillesVoorStand(id, 'ontspannen'), per.ontspannen, id + ': ontspannen');
    assert.deepEqual(S.medaillesVoorStand(id, 'uitdagend'), per.uitdagend, id + ': uitdagend');
  }
  // dezelfde afronding als de regels die de stand al toepassen
  assert.deepEqual(RSki.scaledMedalAt('ontspannen'), [520, 1040, 1760]);
  assert.deepEqual(RSwim.scaledMedalAt('ontspannen'), [125, 95, 80]);
  assert.deepEqual(RClimb.scaledMedalAt('uitdagend'), [64, 38, 24]);
  assert.deepEqual(RPan.scaledMedalAt('ontspannen'), [320, 560, 800]);
  assert.deepEqual(RHengel.scaledMedalAt('uitdagend'), [5, 9.4, 15]);
  assert.deepEqual(RCar.scaledMedalAt('ontspannen'), [0.4, 0.6, 0.736]);
  // en de kaart, de rijen en de hoverregel gebruiken dezelfde stand
  assert.match(startkaartRegels('carbid', { difficulty: 'ontspannen' }).join(' | '), /Stand: Ontspannen/);
  assert.match(startkaartRegels('carbid', { difficulty: 'ontspannen' }).join(' | '), /brons 36 punten/);
  assert.deepEqual(startkaartRijen('hengelen', { difficulty: 'uitdagend' })[1], ['Medailles', 'brons 5 kg · zilver 9,4 kg · goud 15 kg']);
  assert.match(startkaartRegel('zwembad', { difficulty: 'ontspannen' }), /brons binnen 2:05/);
  // niets geschaald? dan blijft de vaste tekst staan
  // golf is nu ook aangesloten: de par-drempels schuiven mee (#800)
  assert.deepEqual(S.medaillesVoorStand('discgolf', 'uitdagend'), ['5 boven par', '1 boven par', '3 onder par']);
  assert.equal(S.medaillesVoorStand('geheimen', 'uitdagend'), null);
  // en elke regel blijft binnen het hoverbudget, ook op de zwaarste stand
  for (const mode of D.DIFFICULTY_MODES) for (const id of Object.keys(STARTKAART)) {
    const regel = startkaartRegel(id, { difficulty: mode });
    assert.ok(regel.length <= S.MAX_HOVER_CHARS, `${id} (${mode}): ${regel.length} tekens`);
  }
});

console.log(`startkaart_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);


