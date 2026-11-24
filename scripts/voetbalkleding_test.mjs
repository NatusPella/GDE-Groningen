// Voetbalkleding (22-11, docs/VOETBALKLEDING-22-11.md): bewaakt de stukken, de niveau-tabel, het clubtenue als tijdelijke override (met herstel), de outfit-code,
// de NPC-rolpool, de koppeling met de carrière (promotie en degradatie) en de modellen (three in node, geen Electron). De clipping-steekproef voor de nieuwe stukken
// zit hier ook; de volledige audit is `node scripts/kleding_clipping_audit.mjs --sets=sport`.   node scripts/voetbalkleding_test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { P, C, D, K, combos, run, buildCase, measureCase, limitFor, BODIES, SUBJECT_IDS } from './lib/kleding_clipping.mjs';
import * as VK from '../game/js/footballkit.js';
import * as CL from '../game/js/clubui.js';
import * as CAR from '../game/js/voetbalcarriere.js';
import { CLUBS, EUROPE_CLUBS, DIVISIONS } from '../game/js/voetbalclubs.js';
import { awayKit } from '../game/js/voetbalworld.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';
import { runCareer, loadIndex } from './voetbal_carriere_sim.mjs';

let n = 0, fails = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const KIT_IDS = [...D.SPORT_IDS];

t('de catalogus: 25 voetbalstukken achteraan, de oude 67 en het palet onaangeroerd, elk stuk geldig', () => {
  assert.equal(KIT_IDS.length, 25);
  assert.equal(D.ITEMS.length, 92);
  assert.equal(sha(D.ITEMS.slice(0, 67).map((i) => i.id).join(',')), '49830dbafc854dd1', 'de volgorde van de oude stukken is vast (outfit-code)');
  assert.equal(sha(D.PALETTE_IDS.slice(0, 39).join(',')), 'ce0c86d255c618c9', 'het palet is append-only');
  for (const id of KIT_IDS) assert.ok(D.ITEM_INDEX[id] >= 67, `${id} staat achteraan`);
  for (const it of D.ITEMS.filter((i) => D.SPORT_IDS.has(i.id))) {
    assert.ok(D.SLOT_IDS.includes(it.slot), it.id);
    assert.ok(it.colors.length && it.colors.every((c) => D.PALETTE[c]), `${it.id}: kleuren`);
    assert.ok(it.profiles.includes('sport') && !it.npc, `${it.id}: winkelstuk in de afdeling Sport`);
    assert.ok(it.price >= 8 && it.price <= 250, `${it.id}: prijs ${it.price}`);
  }
  assert.deepEqual(D.SLOT_IDS.slice(12), ['legs', 'guard'], 'de sportslots staan achteraan');
  const slots = new Set(D.ITEMS.filter((i) => D.SPORT_IDS.has(i.id)).map((i) => i.slot));
  for (const s of ['top', 'outer', 'bottom', 'legs', 'guard', 'shoes', 'hands', 'wrist']) assert.ok(slots.has(s), 'sportstuk in slot ' + s);
  // shirt: 6 patronen, korte en lange mouw
  for (const lang of ['', '_lang']) for (const p of Object.keys(D.KIT_PATTERNS)) assert.ok(D.ITEM_BY_ID[`voetbalshirt${lang}_${p}`], `voetbalshirt${lang}_${p}`);
  assert.deepEqual(Object.keys(D.KIT_PAIR).sort(), [...D.KIT_COLORS].sort(), 'elke shirtkleur heeft een tweede kleur');
  for (const c of Object.values(D.KIT_PAIR)) assert.ok(D.KIT_COLORS.includes(c), 'tweede kleur ' + c);
});

t('geen echte merken, clubs of winter in de teksten; alle sponsornamen zijn verzonnen', () => {
  const tekst = [...D.ITEMS.filter((i) => D.SPORT_IDS.has(i.id)).flatMap((i) => [i.label, i.desc]), ...K.LOCAL_SPONSORS, ...Object.values(K.KIT_LEVELS).flatMap((l) => [l.naam, l.fabric])];
  for (const x of tekst) assert.ok(!hasForbiddenWord(x), 'echt clubwoord in: ' + x);
  const alles = tekst.join(' | ').toLowerCase();
  for (const w of ['nike', 'adidas', 'puma', 'umbro', 'kappa', 'joma', 'macron', 'hummel', 'jako', 'diadora', 'asics', 'mizuno', 'new balance', 'under armour', 'reebok', 'heineken', 'gazprom', 'coca', 'emirates']) assert.ok(!alles.includes(w), 'merk: ' + w);
  for (const w of ['winter', 'sneeuw', 'schaats', 'kerst']) assert.ok(!new RegExp(`\\b${w}`).test(alles), 'winterwoord: ' + w);
  assert.equal(K.LOCAL_SPONSORS.length, new Set(K.LOCAL_SPONSORS).size);
});

t('outfit-code v3: oude codes blijven kloppen, nieuwe stukken ronden af, de lengte blijft binnen 80 tekens', () => {
  const tammo = C.encodeOutfit({ hair: 'short.naturel', body: 'breed', ...D.DEFAULT_WORN.tammo });
  assert.equal(tammo, 'k30002000k0a12120d190b1g02', 'de code zoals de bouw van voor de voetbalkleding hem maakte');
  assert.equal(C.encodeOutfit({ ...D.DEFAULT_WORN.anita, hair: 'long.naturel' }), 'k30500130g19071k0x');
  const w = C.decodeOutfit(tammo);
  assert.equal(w.outer, 'jack.blauw'); assert.equal(w.hat, 'stadjerspet.roest'); assert.equal(w.body, 'breed');
  for (const level of K.LEVEL_IDS) for (const variant of ['thuis', 'uit', 'derde']) for (const role of ['veld', 'keeper']) for (const mode of ['wedstrijd', 'training', 'intro']) {
    const k = K.kitWorn({ color: 'groen', pattern: 'brede-streep', level, variant, role, mode, captain: true, number: 9 });
    const worn = { ...k.worn, hair: 'short.naturel', body: 'lang' };
    const code = C.encodeOutfit(worn);
    assert.ok(code.length <= 80, `${level}/${variant}/${role}/${mode}: ${code.length} tekens`);
    assert.ok(C.cleanOutfitCode(code), 'geldige code');
    const back = C.decodeOutfit(code);
    for (const [slot, piece] of Object.entries(k.worn)) assert.equal(back[slot], piece, `${slot} komt terug (${level}/${variant}/${role}/${mode})`);
  }
  // een code van een nieuwere build met een stuk dat deze build niet kent: dat stuk valt weg, de rest blijft
  const toekomst = tammo + '2z00';
  assert.equal(C.decodeOutfit(toekomst).outer, 'jack.blauw');
});

t('de niveau-tabel: elke klasse heeft een niveau en elk niveau een volledige set', () => {
  for (const d of [...DIVISIONS, 'europa', 'pool']) assert.ok(K.LEVEL_IDS.includes(K.levelOfDivision(d)), 'klasse ' + d);
  assert.deepEqual([K.levelOfDivision('talent'), K.levelOfDivision('terp'), K.levelOfDivision('kroon'), K.levelOfDivision('europa'), K.levelOfDivision('pool')], ['amateur', 'semipro', 'pro', 'top', 'amateur']);
  assert.deepEqual(K.LEVEL_IDS, ['straat', 'amateur', 'semipro', 'pro', 'top']);
  let vorigeSchoen = -1;
  for (const id of K.LEVEL_IDS) {
    const L = K.KIT_LEVELS[id];
    for (const veld of ['naam', 'shoe', 'patterns', 'number', 'sponsor', 'fabric']) assert.ok(L[veld] != null, `${id}.${veld}`);
    for (const k of ['thuis', 'uit', 'derde']) {
      const kit = K.kitWorn({ color: 'rood', pattern: 'helften', level: id, variant: k, captain: true, name: true, number: 7, clubId: 'x', sponsors: ['Wiebelwerk'] });
      for (const slot of ['top', 'bottom', 'legs', 'shoes']) assert.ok(kit.worn[slot] && D.parsePiece(kit.worn[slot]), `${id}/${k}: ${slot}`);
      for (const [slot, piece] of Object.entries(kit.worn)) assert.equal(D.pieceSlot(piece), slot, `${id}: ${piece} in slot ${slot}`);
      assert.equal(kit.worn.shoes.split('.')[0], L.shoe[0], `${id}: de schoen van het niveau`);
    }
    const keeper = K.kitWorn({ color: 'rood', level: id, role: 'keeper', keeperColor: 'oranje' });
    assert.match(keeper.worn.top, /^keepersshirt\./);
    if (L.keeper && id !== 'straat') assert.equal(keeper.worn.hands, 'keepershandschoenen.geel');
    const idx = D.ITEM_INDEX[L.shoe[0]];
    assert.ok(idx >= vorigeSchoen, 'schoenen worden per niveau beter (volgorde in de catalogus)'); vorigeSchoen = idx;
  }
  const amateur = K.kitWorn({ color: 'groen', pattern: 'brede-streep', level: 'amateur', number: 4, name: true, captain: true, clubId: 'a' });
  assert.match(amateur.worn.top, /voetbalshirt_effen/, 'amateur: effen shirt, ook als de club een streep heeft');
  assert.equal(amateur.extras.numberStyle, 'hand'); assert.ok(!amateur.worn.guard, 'amateur: geen scheenbeschermers'); assert.ok(!amateur.worn.wrist, 'amateur: geen aanvoerdersband'); assert.equal(amateur.extras.nameBar, false);
  const semi = K.kitWorn({ color: 'groen', pattern: 'brede-streep', level: 'semipro', number: 4, name: true, captain: true, clubId: 'a' });
  assert.match(semi.worn.top, /voetbalshirt_streep/); assert.equal(semi.extras.nameBar, true); assert.ok(semi.worn.guard && semi.worn.wrist); assert.equal(semi.extras.sponsor.lokaal, true);
  const pro = K.kitWorn({ color: 'groen', pattern: 'hoepels', level: 'pro', number: 4, name: true, sponsors: ['Wiebelwerk'], clubId: 'a' });
  assert.match(pro.worn.top, /voetbalshirt_hoepels/); assert.equal(pro.extras.sponsor.name, 'Wiebelwerk'); assert.equal(pro.extras.numberStyle, 'techniek');
  const top = K.kitWorn({ color: 'groen', level: 'top', variant: 'derde', number: 10, sponsors: ['Wiebelwerk'] });
  assert.match(top.worn.top, /voetbalshirt_kruis/, 'topniveau: derde tenue als speciale editie'); assert.equal(top.extras.sponsor.size, 'groot');
  assert.equal(K.kitWorn({ color: 'groen', level: 'amateur', variant: 'derde' }).variant, 'uit', 'een derde tenue bestaat alleen op topniveau');
  const straat = K.kitWorn({ level: 'straat', mode: 'wedstrijd' });
  assert.equal(straat.worn.top, 'voetbalshirt_effen.grijs'); assert.equal(straat.extras.number, 0); assert.equal(straat.extras.sponsor, null);
  const intro = K.kitWorn({ color: 'groen', level: 'pro', mode: 'intro' });
  assert.match(intro.worn.outer, /^trainingsjack\./); assert.match(intro.worn.bottom, /^trainingsbroek\./);
  const training = K.kitWorn({ color: 'groen', level: 'pro', mode: 'training' });
  assert.match(training.worn.outer, /^opwarmhesje\./); assert.ok(training.worn.outer.split('.')[1] !== training.worn.top.split('.')[1]);
});

t('de clubs: elke club heeft op zijn niveau een geldig tenue, thuis en uit verschillen, en tegenstanders hebben andere kleuren', () => {
  for (const club of [...CLUBS, ...EUROPE_CLUBS]) {
    const level = K.levelOfDivision(club.division);
    const cc = VK.clubColors(club);
    assert.ok(D.KIT_COLORS.includes(cc.color) && D.KIT_COLORS.includes(cc.shorts) && D.KIT_COLORS.includes(cc.keeperColor), club.id);
    const thuis = K.kitWorn({ ...cc, level, variant: 'thuis' }), uit = K.kitWorn({ ...cc, level, variant: 'uit' });
    assert.notEqual(thuis.worn.top, uit.worn.top, `${club.id}: thuis en uit zijn verschillend`);
    for (const k of [thuis, uit]) for (const p of Object.values(k.worn)) assert.ok(D.parsePiece(p), `${club.id}: ${p}`);
  }
  // twee teams die op elkaar lijken: de uitploeg krijgt een ander shirt, ook op amateurniveau waar alles effen is
  let verschil = 0;
  for (const a of CLUBS) for (const b of CLUBS) {
    if (a === b || a.division !== b.division) continue;
    const level = K.levelOfDivision(a.division), adj = (x) => ({ ...x, patroon: K.levelPattern(x.patroon, level) });
    const away = awayKit(adj(a), adj(b));
    const ka = K.kitWorn({ ...VK.clubColors(a), level }), kb = K.kitWorn({ ...VK.clubColors({ ...away, keeper: away.keeperShirt }), level });
    assert.ok(ka.worn.top !== kb.worn.top || ka.worn.bottom !== kb.worn.bottom, `${a.id} - ${b.id}: te veel hetzelfde`);
    verschil++;
  }
  assert.ok(verschil > 100);
});

t('de override: het clubtenue komt over de outfit, de eigen outfit blijft bewaard en komt exact terug, ook na onderbreking en laden', () => {
  C.resetClothing();
  const eerst = JSON.stringify(C.getClothingSave());
  const eigen = C.ownWorn('tammo');
  const k = K.kitWorn({ color: 'groen', pattern: 'brede-streep', level: 'pro', number: 9, name: true, captain: true, clubId: 'a' });
  const events = [];
  const off = C.onKitChange(() => events.push(1));
  assert.equal(C.setKit('tammo', k), true);
  assert.equal(C.setKit('tammo', k), false, 'dezelfde override twee keer is geen wissel');
  assert.equal(events.length, 1);
  const nu = C.effectiveWorn('tammo');
  assert.equal(nu.top, k.worn.top); assert.equal(nu.hair, eigen.hair, 'het kapsel blijft van het personage'); assert.equal(nu.body, eigen.body);
  assert.equal(C.effectiveWorn('anita').top, undefined, 'het andere personage wordt niet omgekleed');
  assert.deepEqual(C.ownWorn('tammo'), eigen, 'de eigen outfit is onaangeraakt');
  assert.equal(JSON.stringify(C.getClothingSave()), eerst, 'het tenue staat niet in de save');
  assert.equal(C.kitActive('tammo'), true);
  // Samen spelen: de gewone outfit-code reist mee, zonder nieuw protocol; de ander ziet het tenue
  C.setLocalCharProvider(() => 'tammo');
  const code = C.localOutfitCode();
  assert.equal(C.decodeOutfit(code).top, k.worn.top);
  const remote = C.outfitToLook(C.decodeOutfit(code), {});
  assert.ok(remote.shirtBands && remote.shirtBands.bands.length, 'het patroon is ook bij een medespeler te zien');
  assert.equal(remote.look.socks != null, true);
  // onderbreking midden in een wedstrijd (crash, afsluiten): de save heeft het tenue nooit gezien; laden geeft de eigen outfit terug
  const save = JSON.parse(JSON.stringify(C.getClothingSave()));
  C.applyClothingSave(save);
  assert.equal(C.kitActive('tammo'), false, 'laden haalt het tenue weg');
  assert.deepEqual(C.ownWorn('tammo'), eigen, 'exact dezelfde outfit');
  // en een gewoon einde
  C.setKit('tammo', k);
  assert.equal(C.setKit('tammo', null), true);
  assert.equal(C.setKit('tammo', null), false);
  assert.deepEqual(C.effectiveWorn('tammo'), C.ownWorn('tammo'));
  assert.equal(events.length >= 3, true);
  off();
  // het verhaaloutfit blijft werken: het tenue gaat er tijdelijk voor, daarna weer het verhaaloutfit
  C.forceStoryLook('incognito');
  const verhaal = C.effectiveWorn('tammo').jack || C.effectiveWorn('tammo').outer;
  C.setKit('tammo', k);
  assert.equal(C.effectiveWorn('tammo').top, k.worn.top);
  C.setKit('tammo', null);
  assert.equal(C.effectiveWorn('tammo').outer, verhaal, 'het verhaaloutfit is terug');
  C.forceStoryLook(null);
});

t('de override overleeft geen onbekend stuk: ongeldige stukken komen er niet doorheen', () => {
  C.resetClothing();
  assert.equal(C.setKit('tammo', { worn: { top: 'bestaat_niet.rood', shoes: 'noppen_basis.paars' } }), false, 'alleen ongeldige stukken geeft niets');
  assert.equal(C.setKit('tammo', { worn: { top: 'voetbalshirt_effen.groen', shoes: 'noppen_basis.paars', bottom: 'voetbalsokken.groen' } }), true);
  const w = C.effectiveWorn('tammo');
  assert.equal(w.top, 'voetbalshirt_effen.groen'); assert.equal(w.shoes, undefined, 'een kleur die het stuk niet heeft telt niet'); assert.equal(w.bottom, undefined, 'een stuk in het verkeerde slot telt niet');
  C.setKit('tammo', null);
});

t('de NPC-rolpool voetballer: deterministisch, geldige stukken, een tenue uit hetzelfde systeem', () => {
  assert.ok(D.ROLE_POOLS.voetballer);
  for (const lijst of Object.values(D.ROLE_POOLS.voetballer)) for (const [id] of lijst) assert.ok(id == null || D.ITEM_BY_ID[id], 'pool: ' + id);
  const a = C.npcOutfit(42, 'voetballer', { level: 'semipro', hair: true, body: true }), b = C.npcOutfit(42, 'voetballer', { level: 'semipro', hair: true, body: true });
  assert.deepEqual(a, b, 'zelfde zaad, zelfde voetballer');
  for (let seed = 1; seed <= 60; seed++) {
    const w = C.npcOutfit(seed, 'voetballer', { level: K.LEVEL_IDS[seed % 5], hair: true, body: true });
    for (const [slot, p] of Object.entries(w)) if (D.SLOT_IDS.includes(slot)) { assert.ok(D.parsePiece(p), p); assert.equal(D.pieceSlot(p), slot); }
    assert.ok(w.top && w.bottom && w.shoes && w.legs, `seed ${seed}: een volledig tenue`);
  }
  const rood = C.npcOutfit(7, 'voetballer', { level: 'pro', color: 'rood' }), blauw = C.npcOutfit(7, 'voetballer', { level: 'pro', color: 'blauw' });
  assert.notEqual(rood.top, blauw.top, 'tegenstanders in andere clubkleuren');
  const kleuren = new Set(Array.from({ length: 40 }, (_, i) => C.npcOutfit(i, 'voetballer', { level: 'amateur' }).top.split('.')[1]));
  assert.ok(kleuren.size >= 6, 'de menigte is gevarieerd: ' + kleuren.size);
});

t('actorLook: de spelers van een wedstrijd komen uit het kledingsysteem op het niveau van de klasse', () => {
  const club = CLUBS[0];
  const team = { id: club.id, shirt: club.shirt, broek: club.broek, keeperShirt: club.keeper, patroon: club.patroon };
  const nrs = new Set();
  for (const level of K.LEVEL_IDS) for (let i = 0; i < 11; i++) {
    const role = i === 0 ? 'keeper' : 'veld';
    const al = VK.actorLook(team, { level, role, number: i === 0 ? 1 : 2 + i, seed: 9811 + i * 13, clubId: club.id, name: true, sponsors: ['Wiebelwerk'] });
    assert.ok(Number.isFinite(al.shirt) && al.pants != null && al.shoes != null, 'kleuren');
    assert.equal(al.look.top === 'tee' || al.look.top === 'longsleeve', true);
    assert.ok(al.look.socks != null, 'kousen');
    if (role === 'keeper') assert.equal(al.kit.worn.top.split('.')[0], 'keepersshirt');
    else nrs.add(al.kit.extras.number);
    if (level === 'pro' || level === 'top') assert.ok(role === 'keeper' || (al.shirtBands && al.shirtBands.sponsor), 'sponsorpaneel op pro en top');
  }
  assert.ok(nrs.size >= 8);
});

t('de carrière: het niveau volgt de klasse, promotie en degradatie geven een nieuw tenue met melding en de stukken in de kast', () => {
  const index = loadIndex();
  const getClub = CAR.clubResolver(index);
  const c = CAR.createCareer({ char: 'anita', index });
  assert.equal(VK.careerLevel(c), 'amateur', 'de carrière begint in de Talentenklasse');
  assert.equal(VK.careerLevel(c, { kind: 'europe' }), 'top', 'de Waddenbeker is topniveau');
  const club = getClub(c.club);
  C.resetClothing();
  const eerste = VK.levelSync(c, club);
  assert.equal(eerste.changed, true); assert.equal(eerste.to, 'amateur'); assert.ok(eerste.given > 0);
  assert.equal(C.ownsPiece('anita', K.kitWorn({ ...VK.clubColors(club), level: 'amateur' }).worn.top), true, 'het shirt zit in de kast van Tessa');
  assert.equal(C.ownsPiece('tammo', K.kitWorn({ ...VK.clubColors(club), level: 'amateur' }).worn.shoes), true, 'en in die van Tammo');
  const flag = { ...c, flags: { ...c.flags, kitLvl: eerste.flag } };
  assert.equal(VK.levelSync(flag, club).changed, false, 'zelfde niveau: geen melding');
  // promotie naar de Terpklasse
  const omhoog = { ...flag, world: { ...flag.world, talent: flag.world.talent.filter((x) => x !== c.club), terp: [...flag.world.terp.slice(0, 7), c.club] } };
  assert.equal(VK.careerLevel(omhoog), 'semipro');
  const promo = VK.levelSync(omhoog, club);
  assert.equal(promo.changed, true); assert.equal(promo.from, 'amateur'); assert.equal(promo.to, 'semipro'); assert.equal(VK.levelMessage(promo.to), 'Nieuw tenue: Semi-prof');
  assert.ok(C.ownsPiece('anita', 'noppen_semi.zwart'), 'de betere schoenen zitten in de kast');
  // degradatie
  const omlaag = { ...omhoog, flags: { ...omhoog.flags, kitLvl: promo.flag }, world: { ...omhoog.world, terp: omhoog.world.terp.filter((x) => x !== c.club), talent: [...omhoog.world.talent.slice(0, 7), c.club] } };
  const af = VK.levelSync(omlaag, club);
  assert.equal(af.changed, true); assert.equal(af.to, 'amateur'); assert.equal(VK.levelMessage('top'), 'Nieuw tenue: Topniveau');
  // de keuze van de speler
  assert.deepEqual(VK.kitChoice(c), { variant: 'thuis', number: 10 });
  const gekozen = VK.withKitChoice(c, { variant: 'uit', number: 23 });
  assert.deepEqual(VK.kitChoice(gekozen), { variant: 'uit', number: 23 });
  assert.equal(CAR.normalize(CAR.serialize(gekozen)).flags.kitNum, 23, 'de keuze overleeft de opslag');
  assert.equal(VK.withKitChoice(c, { number: 500 }).flags.kitNum, 99);
  const view = VK.kitView(gekozen, getClub);
  assert.equal(view.variant, 'uit'); assert.equal(view.number, 23); assert.deepEqual(view.variants, ['thuis', 'uit']); assert.equal(view.naam, 'Amateur'); assert.match(view.shirt, /^voetbalshirt_effen\./);
  const html = CL.kitHtml(view);
  assert.match(html, /Niveau: Amateur/); assert.match(html, /data-cl="kitvar"/); assert.match(html, /data-cl="kitnum"/); assert.match(html, /<kbd class="ds-z-toets">1<[/]kbd>/); assert.match(html, /data-kit-shirt="voetbalshirt_effen\./);
  assert.equal(CL.kitHtml(null), '', 'zonder carrière geen tenue');
  // zonder club: een neutrale trainingsset voor beide personages
  C.resetClothing();
  const neutraal = VK.applyKit(null, null, {});
  assert.equal(neutraal.tammo.worn.top, 'voetbalshirt_effen.grijs'); assert.equal(C.effectiveWorn('anita').top, 'voetbalshirt_effen.grijs');
  assert.equal(VK.kitIsOn(), true); assert.equal(VK.clearKit(), true); assert.equal(VK.kitIsOn(), false);
  // met een carrière: elk personage zijn eigen nummer, het eigen nummer is de keuze
  VK.applyKit(gekozen, club, { mode: 'wedstrijd' });
  assert.equal(C.kitExtrasOf('anita').number, 23); assert.equal(C.kitExtrasOf('tammo').number, 11);
  VK.clearKit();
  C.resetClothing();
});

t('de modellen (three in node): elk niveau en elke uitvoering bouwt, zonder NaN, binnen het driehoekenbudget, met hoogstens twee losse shirtlagen', () => {
  const tris = (g) => g.userData.body.geometry.attributes.position.count / 3;
  let max = 0;
  const per = {};
  for (const level of K.LEVEL_IDS) for (const variant of ['thuis', 'uit', 'derde']) for (const role of ['veld', 'keeper']) {
    const k = K.kitWorn({ color: 'groen', pattern: level === 'top' ? 'kruis' : 'brede-streep', level, variant, role, captain: true, number: 88, name: true, sponsors: ['Wiebelwerk'], clubId: 'a' });
    const o = C.outfitToLook({ ...k.worn, hair: 'short.naturel', body: 'gemiddeld' }, {}, k.extras);
    const g = P.buildPersonMesh(o.shirt, 0xd9b08c, { variant: 'male', seed: 4, look: o.look, pants: o.pants, shoes: o.shoes, shirtBands: o.shirtBands, body: o.body, hairStyle: o.hairStyle, hair: o.hair });
    const bands = g.userData.chest.children.filter((m) => m.userData.kit);
    assert.ok(bands.length <= 2, 'hoogstens twee shirtlagen');
    let meshes = 0, nan = 0;
    g.traverse((m) => { if (m.isMesh) meshes++; });
    for (const v of g.userData.body.geometry.attributes.position.array) if (!Number.isFinite(v)) nan++;
    for (const b of bands) for (const v of b.geometry.attributes.position.array) if (!Number.isFinite(v)) nan++;
    assert.equal(nan, 0, `NaN in ${level}/${variant}/${role}`);
    assert.ok(meshes <= 5, `${level}: ${meshes} meshes (romp, twee shirtlagen en bij een keeper twee handschoenen)`);
    const n3 = tris(g) + bands.reduce((s, b) => s + (b.geometry.index ? b.geometry.index.count : b.geometry.attributes.position.count) / 3, 0);
    max = Math.max(max, n3); per[level] = Math.max(per[level] || 0, n3);
    assert.ok(n3 < 9000, `${level}: ${n3} driehoeken`);
    // opruimen: het geheugen van de romp gaat terug
    const geo = g.userData.body.geometry, refs = geo.userData.personRefs;
    P.releasePersonGeometry(g);
    assert.equal(geo.userData.personRefs, refs - 1, 'de rompgeometrie geeft zijn plek terug');
  }
  assert.ok(max < 9000);
  // de vier schoenen verschillen echt (meer onderdelen bij een hoger niveau)
  const shoeTris = (item) => {
    const c = buildCase({ who: 'tammo', body: 'gemiddeld', worn: { top: 'tshirt.wit', bottom: 'voetbalbroekje.groen', shoes: `${item}.${D.ITEM_BY_ID[item].colors[0]}` } });
    return c.layers.shoe.length / 9;
  };
  const s = ['noppen_basis', 'noppen_semi', 'noppen_pro', 'noppen_top'].map(shoeTris);
  assert.ok(s[0] < s[1] && s[1] < s[2] && s[2] < s[3], 'schoendetails per niveau: ' + s.join(' < '));
  // de kousen en scheenbeschermers zijn er alleen bij een broekje (onder een lange broek zouden ze door de stof steken)
  const lang = buildCase({ who: 'tammo', body: 'gemiddeld', worn: { top: 'tshirt.wit', bottom: 'jeans.jeans', shoes: 'gympen.wit', legs: 'voetbalsokken.groen', guard: 'scheenbeschermers.zwart' } });
  assert.ok(!lang.layers.sock && !lang.layers.guard, 'geen kousen onder een lange broek');
  const kort = buildCase({ who: 'tammo', body: 'gemiddeld', worn: { top: 'tshirt.wit', bottom: 'voetbalbroekje.groen', shoes: 'noppen_basis.zwart', legs: 'voetbalsokken.groen', guard: 'scheenbeschermers.zwart' } });
  assert.ok(kort.layers.sock && kort.layers.guard, 'kousen en scheenbeschermers onder een broekje');
  // het patroon: elke vorm heeft vakken, effen niets
  for (const [pat, soort] of [['brede-streep', 'bands'], ['smalle-streep', 'bands'], ['helften', 'bands'], ['hoepels', 'cells'], ['kruis', 'cells']]) {
    const geo = K.patternGeometry(pat);
    assert.ok(geo[soort].length > 0, pat);
  }
  assert.equal(K.patternGeometry('effen'), null);
});

t('clipping: de nieuwe stukken en de kits hebben 0 overtredingen (steekproef; volledig: kleding_clipping_audit --sets=sport)', () => {
  const lijst = combos(['sport'], 9);
  assert.ok(lijst.length > 150, 'steekproef: ' + lijst.length);
  const slecht = [];
  for (const c of lijst) { const r = run(c); if (r.found.length) slecht.push(`${r.key}: ${r.found.map((f) => f.check + ' ' + (f.depth * 1000).toFixed(1)).join(', ')}`); }
  assert.deepEqual(slecht.slice(0, 5), []);
  // en elk nieuw stuk op alle vijf de lichaamsvormen
  for (const id of KIT_IDS) for (const body of BODIES) {
    const it = D.ITEM_BY_ID[id];
    const worn = { top: 'tshirt.wit', bottom: it.slot === 'legs' || it.slot === 'guard' ? 'voetbalbroekje.groen' : 'jeans.jeans', shoes: 'gympen.wit', [it.slot]: `${id}.${it.colors[0]}` };
    const f = measureCase(buildCase({ who: 'tessa', body, worn })).filter((x) => x.depth > limitFor(x.check));
    assert.deepEqual(f, [], `${id} op ${body}`);
  }
});

t('de clipping-meting vindt de nieuwe fouten: een kous die te klein is, een plaat die zweeft, een nummer dat erin of erboven zit, een band in de mouw', () => {
  const worn = { top: 'voetbalshirt_effen.groen', bottom: 'voetbalbroekje.groen', legs: 'voetbalsokken.groen', guard: 'scheenbeschermers.zwart', shoes: 'noppen_basis.zwart', wrist: 'aanvoerdersband.geel' };
  const extras = { number: 10, numberStyle: 'rug', nameBar: true, sponsor: { color: 0xe0701e, size: 'normaal' } };
  const c = buildCase({ who: 'tammo', body: 'gemiddeld', worn, extras });
  assert.deepEqual(measureCase(c).filter((f) => f.depth > limitFor(f.check)), [], 'de ongeschonden kit is schoon');
  const schaal = (arr, f, as = [0, 2]) => Float64Array.from(arr, (v, i) => (as.includes(i % 3) ? v * f : v));
  // kous: het been steekt erdoor (kous 20 procent smaller om de as van het been; de as ligt bij z = hipZ, dus schaal relatief daaraan)
  const hip = 0.088;
  const smal = Float64Array.from(c.layers.sock, (v, i) => (i % 3 === 2 ? Math.sign(v) * hip + (v - Math.sign(v) * hip) * 0.7 : i % 3 === 0 ? v * 0.7 : v));
  assert.ok(measureCase({ ...c, layers: { ...c.layers, sock: smal } }).some((f) => f.check === 'kous-door-been' && f.depth > 0.004), 'kous door het been');
  // scheenbeschermer 3 cm naar voren: zweeft
  const voor = Float64Array.from(c.layers.guard, (v, i) => (i % 3 === 0 ? v + 0.03 : v));
  assert.ok(measureCase({ ...c, layers: { ...c.layers, guard: voor } }).some((f) => f.check === 'scheenbeschermer-zweeft'), 'plaat zweeft');
  const achter = Float64Array.from(c.layers.guard, (v, i) => (i % 3 === 0 ? v - 0.02 : v));
  assert.ok(measureCase({ ...c, layers: { ...c.layers, guard: achter } }).some((f) => f.check === 'scheenbeschermer-begraven'), 'plaat in de kous');
  // rugnummer: de dozen op de rug 3 cm naar achteren en 3 cm naar voren
  const naar = (dx) => c.kit.map((k) => ({ ...k, tris: Float64Array.from(k.tris, (v, i) => (i % 3 === 0 ? v + dx : v)) }));
  const meet = (kit) => measureCase({ ...c, kit }).map((f) => f.check);
  assert.ok(meet(naar(-0.03)).some((x) => /^rugnummer-zweeft$/.test(x)), 'nummer en sponsor zweven achter de romp');
  assert.ok(meet(naar(0.03)).some((x) => /-begraven$/.test(x)), 'nummer en sponsor zitten in de romp');
  // aanvoerdersband in de mouw
  const band = Float64Array.from(c.layers.captainband, (v, i) => (i % 3 === 2 ? v - Math.sign(v) * 0.03 : v));
  assert.ok(measureCase({ ...c, layers: { ...c.layers, captainband: band } }).some((f) => f.check === 'aanvoerdersband-in-mouw'), 'band in de mouw');
  assert.ok(c.layers.sock && c.layers.guard && c.layers.captainband && c.kit.length === 2);
});

t('de sportslots: kast en winkel tonen de categorie Sport met de nieuwe slots en pictogrammen', () => {
  assert.deepEqual(Object.keys(D.PROFILES), ['straat', 'sport', 'werk', 'chic', 'buiten', 'feest', 'strand']);
  let sleutel = null;
  for (let i = 0; i < 200 && !sleutel; i++) if (C.shopProfiles(`sportwinkel|${i}`).includes('sport')) sleutel = `sportwinkel|${i}`;
  assert.ok(sleutel, 'er is een winkel met de afdeling Sport');
  const gezien = new Set();
  for (let d = 0; d < 40; d++) for (const p of C.shopStock(sleutel, d)) if (D.SPORT_IDS.has(D.parsePiece(p).item.id)) gezien.add(D.pieceSlot(p));
  assert.ok(gezien.size >= 5, 'de sportwinkel toont voetbalkleding in meerdere slots: ' + [...gezien].join());
  const l = D.ITEMS.filter((i) => D.SPORT_IDS.has(i.id)), prijzen = l.map((i) => i.price * i.colors.length);
  assert.ok(prijzen.every((x) => x > 0));
});

for (const [name, fn] of tests) {
  try { fn(); n++; } catch (e) { fails++; console.error('FAIL', name, '\n  ', e && e.message ? e.message.split('\n').slice(0, 3).join(' / ') : e); }
}
if (fails) { console.error(`${fails} van ${tests.length} mislukt`); process.exit(1); }
console.log(`voetbalkleding_test: ${n} tests ok`);
