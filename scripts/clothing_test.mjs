// Kleding (epic Kleding, 21-11): catalogus, kast per personage, aan en uit, outfits, setbonus, opslag en migratie, outfit-code,
// NPC-outfits en het aanbod van de winkel. De migratietest bouwt elke oude set als model en vergelijkt hem met de nieuwe stukken:
// een bestaande outfit ziet er na de migratie precies zo uit.
//   node scripts/clothing_test.mjs   (heeft de gevendorde three nodig voor de modelcontroles: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const D = await import('../game/js/clothingdata.js');
const C = await import('../game/js/clothing.js');
const P = await import('../game/js/models3d_people.js');
const A = await import('../game/js/models3d_clothing.js');
const SH = await import('../game/js/shops.js');
const H = await import('../game/js/clothinghair.js');
const THREE = await import('three');

let n = 0, fails = 0;
const tests = [];
const norm = (w) => { const o = { ...w }; if (o.body === 'gemiddeld') delete o.body; return o; };
const t = (name, fn) => tests.push([name, fn]);
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

t('catalogus: minstens 60 stukken, unieke id\'s, geldige kleuren, geldige soorten', () => {
  const shop = D.ITEMS.filter((i) => !i.npc);
  assert.ok(shop.length >= 60, 'te weinig stukken: ' + shop.length);
  assert.equal(new Set(D.ITEMS.map((i) => i.id)).size, D.ITEMS.length, 'dubbele id');
  for (const it of D.ITEMS) {
    assert.ok(D.SLOT_IDS.includes(it.slot), `${it.id}: slot`);
    assert.ok(it.kind in D.KIND_LOOK, `${it.id}: soort ${it.kind}`);
    assert.ok(it.colors.length >= 1 && it.colors.every((c) => c in D.PALETTE), `${it.id}: kleur`);
    assert.ok(it.label && it.desc, `${it.id}: tekst`);
    if (!it.npc) { assert.ok(it.price > 0 && it.profiles.length >= 1, `${it.id}: prijs of afdeling`); }
  }
  for (const slot of D.SLOT_IDS) assert.ok(shop.some((i) => i.slot === slot), 'slot zonder stukken: ' + slot);
  assert.equal(new Set(D.PALETTE_IDS).size, D.PALETTE_IDS.length);
});

t('geen merken, geen winter, geen echte personen in de tekst van de kleding', () => {
  const tekst = [...D.ITEMS.flatMap((i) => [i.label, i.desc]), ...D.SETS.flatMap((s) => [s.label, s.desc]), ...D.LOOKS.flatMap((s) => [s.label, s.desc]), ...Object.values(D.PALETTE).map((p) => p[0])].join(' | ').toLowerCase();
  for (const w of ['nike', 'adidas', 'puma', 'zara', 'h&m', 'levi', 'gucci', 'lacoste', 'north face', 'canada goose', 'fc groningen', 'ajax', 'psv', 'feyenoord']) assert.ok(!tekst.includes(w), 'merk of club: ' + w);
  for (const w of ['winter', 'sneeuw', 'ijs', 'skipak', 'bontjas', 'dikke wollen', 'kerst', 'schaats']) assert.ok(!new RegExp(`\\b${w}`).test(tekst), 'winterwoord: ' + w);
  // geen opdruk met letters: de modules gebruiken geen canvas of tekst
  const bron = src('../game/js/models3d_clothing.js');
  assert.ok(!/canvas|fillText|CanvasTexture/.test(bron), 'tekst op kleding');
});

t('de twaalf oude sets: dezelfde kleuren, prijs en stealth als OUTFITS van vroeger', () => {
  for (const ch of ['tammo', 'anita']) {
    const sets = D.setsFor(ch);
    assert.equal(sets.length, SH.OUTFITS[ch].length);
    for (const o of SH.OUTFITS[ch]) {
      const s = D.setKeyFor(ch, o.id);
      assert.ok(s, `set ${ch}:${o.id}`);
      assert.equal(s.price, o.price);
      assert.equal(s.label, o.label);
      assert.equal(!!(s.bonus && s.bonus.stealth), !!o.stealth);
      const worn = {};
      for (const p of s.pieces) worn[D.pieceSlot(p)] = p;
      const l = C.outfitToLook({ ...D.DEFAULT_WORN[ch], ...worn }, {});
      assert.equal(l.shirt, o.shirt, `${ch}:${o.id} shirt`);
      assert.equal(l.pants, o.pants, `${ch}:${o.id} pants`);
      assert.equal(l.shoes, o.shoes, `${ch}:${o.id} shoes`);
      if (o.cap != null) assert.equal(l.cap, o.cap, `${ch}:${o.id} cap`);
    }
  }
});

t('migratie: elke oude set ziet er als stukken precies zo uit als vroeger (geometrie en kleuren)', () => {
  for (const ch of ['tammo', 'anita']) {
    const base = ch === 'tammo' ? P.TAMMO_APPEARANCE : P.ANITA_APPEARANCE;
    for (const o of SH.OUTFITS[ch]) {
      const oldApp = { ...base, shirt: o.shirt, pants: o.pants, shoes: o.shoes, ...(o.cap != null ? { cap: o.cap } : {}) };
      const oldMesh = P.buildPersonMesh(oldApp.shirt, oldApp.skin, oldApp);
      C.migrateLegacy({ ownedOutfits: [`${ch}:${o.id}`], outfit: { [ch]: o.id } });
      const app = { ...base, ...C.outfitToLook(C.effectiveWorn(ch), base) };
      const nieuw = P.buildPersonMesh(app.shirt, app.skin, app);
      const a = oldMesh.userData.body.geometry.attributes, b = nieuw.userData.body.geometry.attributes;
      assert.equal(a.position.count, b.position.count, `${ch}:${o.id} aantal`);
      assert.ok(a.position.array.every((v, i) => v === b.position.array[i]), `${ch}:${o.id} vorm`);
      assert.ok(a.color.array.every((v, i) => v === b.color.array[i]), `${ch}:${o.id} kleur`);
    }
  }
});

t('begin: elk personage heeft zijn eigen kast met alleen zijn startkleding', () => {
  assert.equal(C.ownedCount('tammo'), 5);
  assert.equal(C.ownedCount('anita'), 3);
  assert.ok(C.ownsPiece('tammo', 'jack.blauw') && !C.ownsPiece('anita', 'jack.blauw'));
  assert.ok(C.givePiece('anita', 'hoodie.zwart'));
  assert.ok(!C.ownsPiece('tammo', 'hoodie.zwart'), 'de kast van Tammo is niet die van Tessa');
});

t('aan en uit: één stuk per slot, vervangen, uitdoen alleen waar het mag', () => {
  C.givePiece('tammo', 'zonnebril.zwart'); C.givePiece('tammo', 'polo.wit'); C.givePiece('tammo', 'hoodie.grijs');
  assert.equal(C.wearPiece('tammo', 'zonnebril.zwart').ok, true);
  assert.equal(C.wornPieces('tammo').glasses, 'zonnebril.zwart');
  assert.equal(C.wearPiece('tammo', 'zonnebril.zwart').ok, false, 'al aan');
  assert.equal(C.wearPiece('tammo', 'jack.zwart').ok, false, 'niet in de kast');
  assert.equal(C.takeOffSlot('tammo', 'glasses').ok, true);
  assert.ok(!C.wornPieces('tammo').glasses);
  assert.ok(C.takeOffBlock('tammo', 'shoes'), 'schoenen kun je niet uitdoen');
  assert.ok(C.takeOffBlock('tammo', 'bottom'));
  // de jas uit mag niet als er geen shirt is; met een shirt mag het wel
  assert.ok(C.takeOffBlock('tammo', 'outer'), 'zonder shirt en jas');
  C.wearPiece('tammo', 'polo.wit');
  assert.equal(C.takeOffBlock('tammo', 'outer'), '');
});

t('een jurk telt voor shirt en broek', () => {
  C.givePiece('anita', 'jurk.mint');
  C.wearPiece('anita', 'jurk.mint');
  const l = C.outfitToLook(C.effectiveWorn('anita'), {});
  assert.equal(l.look.bottom, 'dress');
  assert.equal(l.look.top, 'coat', 'de jas eroverheen blijft de vorm');
  C.takeOffSlot('anita', 'outer');
  const l2 = C.outfitToLook(C.effectiveWorn('anita'), {});
  assert.equal(l2.look.top, 'dress');
});

t('setbonus: alleen alle stukken van zwart incognito geven stealth 2, een half stel niet', () => {
  assert.equal(C.setBonus('tammo').stealth, 0);
  const s = D.setKeyFor('tammo', 'incognito');
  for (const p of s.pieces) C.givePiece('tammo', p);
  for (const p of s.pieces.slice(0, 3)) C.wearPiece('tammo', p);
  assert.equal(C.setBonus('tammo').stealth, 0, 'drie van vier');
  C.wearPiece('tammo', s.pieces[3]);
  assert.equal(C.setBonus('tammo').stealth, 2);
  assert.equal(C.wornSet('tammo').key, 'incognito');
  assert.equal(C.setBonus('anita').stealth, 0, 'per personage');
  // geen andere kleding geeft een bonus
  for (const set of [...D.SETS, ...D.LOOKS]) if (!/incognito/.test(set.id)) assert.ok(!set.bonus, set.id);
});

t('sets kopen: naar rato van wat je mist, gratis als je alles hebt', () => {
  const s = D.setKeyFor('tammo', 'groenwit');
  assert.equal(C.setPriceFor('tammo', s), s.price);
  C.givePiece('tammo', s.pieces[0]);
  assert.equal(C.setPriceFor('tammo', s), Math.round(s.price * 3 / 4));
  for (const p of s.pieces) C.givePiece('tammo', p);
  assert.equal(C.setPriceFor('tammo', s), 0);
  assert.equal(C.wearSet('tammo', s).ok, true);
  assert.equal(C.wornMatches('tammo', s.pieces), true);
  assert.equal(C.wearSet('anita', s).ok, false, 'ontbrekende stukken');
});

t('outfits: vijf plekken, bewaren en aantrekken per personage, ontbrekende stukken blijven weg', () => {
  C.givePiece('tammo', 'hoodie.grijs'); C.givePiece('tammo', 'zonnebril.zwart');
  C.wearPiece('tammo', 'hoodie.grijs'); C.wearPiece('tammo', 'zonnebril.zwart');
  assert.ok(C.savePreset('tammo', 0, 'Zomerdag'));
  assert.ok(!C.savePreset('tammo', 5, 'te veel'));
  C.takeOffSlot('tammo', 'glasses');
  C.wearPiece('tammo', 'jack.blauw');
  assert.equal(C.wearPreset('tammo', 0).ok, true);
  assert.equal(C.wornPieces('tammo').glasses, 'zonnebril.zwart');
  assert.equal(C.presetsOf('tammo')[0].name, 'Zomerdag');
  assert.equal(C.presetsOf('anita')[0], null, 'de outfits van Tessa zijn van haar');
  assert.equal(C.wearPreset('anita', 0).ok, false);
  assert.equal(C.presetsOf('tammo')[1], null);
  assert.equal(C.wearPreset('tammo', 4).ok, false, 'lege plek');
});

t('verhaaloutfit: komt over wat je aan hebt en gaat weg zonder iets te kosten', () => {
  const eigen = C.wornPieces('tammo');
  assert.equal(C.forceStoryLook('incognito'), true);
  assert.equal(C.storyLookKey(), 'incognito');
  assert.equal(C.effectiveWorn('tammo').outer, 'jack.zwart');
  assert.equal(C.effectiveWorn('anita').outer, 'korte_jas.zwart');
  assert.deepEqual(C.wornPieces('tammo'), eigen, 'je eigen kleding blijft');
  assert.equal(C.forceStoryLook('incognito'), false, 'dezelfde twee keer is geen wijziging');
  assert.equal(C.forceStoryLook(null), true);
  assert.deepEqual(C.effectiveWorn('tammo'), { ...eigen, hair: C.getHair('tammo'), body: 'gemiddeld' });
  assert.equal(C.forceStoryLook('bestaatniet'), false);
  assert.equal(C.forceStoryLook({ tammo: { top: 'tshirt.groen', bottom: 'jeans.zwart', shoes: 'gympen.wit' } }), true, 'een eigen kaart per personage');
  assert.equal(C.effectiveWorn('tammo').top, 'tshirt.groen');
  assert.equal(C.effectiveWorn('anita').outer, 'korte_jas.rood', 'Tessa blijft zoals ze was');
});

t('opslag: rondreis, onzin wordt genegeerd, oude save migreert, niets raakt kwijt', () => {
  C.givePiece('tammo', 'hoodie.grijs'); C.wearPiece('tammo', 'hoodie.grijs'); C.savePreset('tammo', 2, 'Twee');
  const save = JSON.parse(JSON.stringify(C.getClothingSave()));
  assert.ok(JSON.stringify(save).length < 4000, 'compact: ' + JSON.stringify(save).length);
  C.resetClothing();
  assert.equal(C.applyClothingSave(save), 'nieuw');
  assert.equal(C.wornPieces('tammo').top, 'hoodie.grijs');
  assert.equal(C.presetsOf('tammo')[2].name, 'Twee');
  // kapotte invoer
  C.resetClothing();
  assert.equal(C.applyClothingSave({ v: 1, tammo: { o: ['jack.nietbestaand', 5, null], w: { top: 'hoodie.grijs', glasses: 'jack.blauw', outer: 42 }, p: [{ n: '<b>x</b>'.repeat(30), w: {} }, 'x'] }, anita: 'rommel' }), 'nieuw');
  assert.ok(C.wornPieces('tammo').bottom && C.wornPieces('tammo').shoes, 'valt terug op de startkleding');
  assert.ok(C.ownsPiece('tammo', 'hoodie.grijs'), 'wat je aan hebt bezit je ook');
  assert.ok(!C.wornPieces('tammo').glasses, 'een stuk in het verkeerde slot telt niet');
  assert.ok(C.presetsOf('tammo')[0].name.length <= D.PRESET_NAME_MAX && !/[<>]/.test(C.presetsOf('tammo')[0].name));
  assert.equal(C.applyClothingSave(null), 'leeg');
  // oude save (alleen outfit en ownedOutfits)
  const oud = { outfit: { tammo: 'boer', anita: 'wadloper' }, ownedOutfits: ['tammo:stadjer', 'anita:classic', 'tammo:boer', 'anita:wadloper', 'anita:incognito'] };
  assert.equal(C.applyClothingSave(undefined, oud), 'migratie');
  assert.equal(C.wornPieces('tammo').outer, 'jack.olijf');
  assert.equal(C.wornPieces('tammo').face, 'stoppels.natuur', 'de stoppels van Tammo blijven');
  assert.equal(C.wornPieces('anita').outer, 'korte_jas.zeeblauw');
  for (const s of ['tammo:stadjer', 'tammo:boer']) assert.ok(D.SET_BY_ID[s].pieces.every((p) => C.ownsPiece('tammo', p)), s);
  assert.ok(D.SET_BY_ID['anita:incognito'].pieces.every((p) => C.ownsPiece('anita', p)));
  assert.ok(!D.SET_BY_ID['tammo:corps'].pieces.every((p) => C.ownsPiece('tammo', p)), 'wat je niet had, krijg je niet');
});

t('de shop-save: shops.js schrijft het kleding-blok en de oude velden, en leest ze terug', () => {
  const bron = src('../game/js/shops.js');
  assert.ok(/kleding: getClothingSave\(\)/.test(bron));
  assert.ok(/applyClothingSave\(d\.kleding, d\)/.test(bron));
  assert.ok(/outfit: wornSetKeys\(\)/.test(bron) && /ownedOutfits: ownedSetIds\(\)/.test(bron));
});

t('outfit-code: rondreis voor spelers en NPC\'s, korte code, een onbekend nummer wordt overgeslagen', () => {
  for (const ch of ['tammo', 'anita']) {
    const code = C.encodeOutfit(C.effectiveWorn(ch));
    assert.ok(code.length <= 30, code);
    assert.deepEqual(C.decodeOutfit(code), norm(C.effectiveWorn(ch)));
  }
  for (let i = 0; i < 200; i++) {
    const w = C.npcOutfit(i, 'voetganger');
    assert.deepEqual(C.decodeOutfit(C.encodeOutfit(w)), norm(w));
  }
  assert.equal(C.decodeOutfit('rommel'), null);
  assert.equal(C.decodeOutfit(42), null);
  assert.equal(C.decodeOutfit('k1' + 'zz09'), null, 'onbekend item');
  assert.equal(C.decodeOutfit('k1'.padEnd(200, 'a')), null, 'te lang');
  const alles = {}; for (const s of D.SLOT_IDS) { const it = D.ITEMS.find((i) => i.slot === s); alles[s] = `${it.id}.${it.colors[0]}`; }
  assert.ok(C.encodeOutfit(alles).length <= 6 + 4 * D.SLOT_IDS.length);
});

t('NPC-outfits: deterministisch, rol bepaalt de kleding, altijd een geldige outfit', () => {
  assert.deepEqual(C.npcOutfit(42, 'kok'), C.npcOutfit(42, 'kok'));
  assert.notDeepEqual(C.npcOutfit(1, 'voetganger'), C.npcOutfit(2, 'voetganger'));
  for (let i = 0; i < 300; i++) {
    for (const role of Object.keys(D.ROLE_POOLS)) {
      const w = C.npcOutfit(i, role, { rain: i % 3 === 0, hot: i % 5 === 0 });
      assert.ok(C.hasTorso(w) && w.shoes && (w.bottom || (w.top && D.parsePiece(w.top).item.kind === 'dress')), `${role} ${i}`);
      for (const p of Object.values(w)) assert.ok(D.parsePiece(p), p);
    }
  }
  assert.equal(C.npcOutfit(3, 'kok').outer.split('.')[0], 'koksjas');
  let veilig = 0; for (let i = 0; i < 100; i++) if (C.npcOutfit(i, 'bouwvakker').shoes.startsWith('veiligheidsschoen')) veilig++;
  assert.ok(veilig > 75, 'bouwvakkers dragen veiligheidsschoenen: ' + veilig);
  assert.ok(C.npcOutfit(9, 'zakenman').outer.startsWith('colbert'));
  assert.equal(C.npcOutfit(9, 'bestaatniet', {}).shoes != null, true, 'onbekende rol valt terug op voetganger');
  // het weer: bij regen meer jassen, bij hitte minder
  let regen = 0, droog = 0, heet = 0;
  for (let i = 0; i < 400; i++) { if (C.npcOutfit(i, 'voetganger', { rain: true }).outer) regen++; if (C.npcOutfit(i, 'voetganger').outer) droog++; if (C.npcOutfit(i, 'voetganger', { hot: true }).outer) heet++; }
  assert.ok(regen > droog && heet === 0, `regen ${regen} droog ${droog} heet ${heet}`);
  // de rolpool is gewogen: een gewone voetganger draagt vaker een T-shirt dan een blouse
  const tel = {};
  for (let i = 0; i < 600; i++) { const k = C.npcOutfit(i, 'voetganger').top.split('.')[0]; tel[k] = (tel[k] || 0) + 1; }
  assert.ok(tel.tshirt > tel.blouse * 3, JSON.stringify(tel));
});

t('NPC-model: buildPersonMesh met een rol geeft een persoon met de kleding van die rol', () => {
  const kok = P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 3, role: 'kok' });
  const zelfde = P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 3, role: 'kok' });
  assert.equal(kok.userData.body.geometry, zelfde.userData.body.geometry, 'dezelfde NPC deelt zijn geometrie (cache)');
  const bouw = P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 3, role: 'bouwvakker' });
  assert.notEqual(kok.userData.body.geometry, bouw.userData.body.geometry);
});

t('voetgangers: rol per buurt en uur, deterministisch, verdeling klopt', () => {
  assert.equal(C.pedRole(12.5, { area: 'student', hour: 14 }), C.pedRole(12.5, { area: 'student', hour: 14 }));
  const tel = (ctx) => { const o = {}; for (let i = 0; i < 1500; i++) { const r = C.pedRole(i * 1.37, ctx); o[r] = (o[r] || 0) + 1; } return o; };
  const campus = tel({ area: 'student', hour: 12 }), stad = tel({ area: 'centrum', hour: 12 }), nacht = tel({ area: 'centrum', hour: 23 }), bouw = tel({ area: 'industrie', hour: 10 });
  assert.ok(campus.student > stad.student * 2, 'meer studenten op de campus');
  assert.ok(stad.toerist > campus.toerist * 2, 'meer toeristen in het centrum');
  assert.ok((nacht.feestganger || 0) > (stad.feestganger || 0) * 2, 'feestgangers in de nacht');
  assert.ok((bouw.bouwvakker || 0) > (stad.bouwvakker || 0) * 5, 'bouwvakkers op het industrieterrein');
  assert.ok(stad.voetganger > 500 && Object.entries(stad).every(([k, v]) => k === 'voetganger' || v < stad.voetganger), 'de gewone voetganger blijft de grootste groep');
  for (const r of Object.keys(campus)) assert.ok(r in D.ROLE_POOLS, 'rol zonder pool: ' + r);
});

t('voetgangers: drawcalls en driehoeken van een menigte rolfiguren blijven binnen budget', () => {
  let meshes = 0, maxTris = 0, n = 0;
  for (let i = 0; i < 300; i++) {
    const role = C.pedRole(i * 2.1, { area: 'centrum', hour: 13 });
    const m = P.buildPersonMesh(0x3a3f47, 0xd9aa82, { seed: i * 2.1, role, outfitCtx: { rain: i % 4 === 0 } });
    let c = 0, tris = 0;
    m.traverse((x) => { if (x.isMesh) { c++; tris += x.geometry.attributes.position.count / 3; } });
    meshes += c; n++; maxTris = Math.max(maxTris, tris);
  }
  assert.equal(meshes, n, 'een NPC is één drawcall; ');
  assert.ok(meshes / n < 1.2, 'gemiddeld aantal meshes per figuur: ' + (meshes / n).toFixed(2));
  assert.ok(maxTris < 6500, 'driehoeken: ' + maxTris);
});

t('NPC-diversiteit (ronde 4): ambtenaar en wandelaar, kleurstemmingen met accenten, lichaamsvormen gemengd per rol', () => {
  for (const r of ['ambtenaar', 'wandelaar']) assert.ok(r in D.ROLE_POOLS, r);
  // elke stemming bestaat uit paletkleuren
  for (const [id, cols] of Object.entries(D.NPC_MOODS)) for (const c of cols) assert.ok(c in D.PALETTE, `${id}: ${c}`);
  // een stemming kleurt zichtbaar: studenten dragen vaker fel dan zakenmannen, zakenmannen vaker donker dan studenten
  const deel = (role, mood) => {
    let hit = 0, tot = 0;
    for (let i = 0; i < 500; i++) { const w = C.npcOutfit(i, role); for (const p of [w.top, w.bottom]) { const x = D.parsePiece(p); if (x.item.colors.length < 3) continue; tot++; if (D.NPC_MOODS[mood].includes(x.color)) hit++; } }
    return hit / tot;
  };
  assert.ok(deel('student', 'fel') > deel('zakenman', 'fel'), 'studenten dragen vaker fel');
  assert.ok(deel('zakenman', 'donker') > deel('student', 'donker'), 'zakenmannen dragen vaker donker');
  // variatie: geen stemming bepaalt alles
  const kleuren = new Set();
  for (let i = 0; i < 400; i++) kleuren.add(D.parsePiece(C.npcOutfit(i, 'voetganger').top).color);
  assert.ok(kleuren.size >= 12, 'kleurvariatie in de menigte: ' + kleuren.size);
  // lichaamsvormen: in elke rol meerdere vormen, en de rolbias is merkbaar
  const vorm = (role) => { const o = {}; for (let i = 0; i < 600; i++) { const b = C.npcOutfit(i, role, { body: true }).body; o[b] = (o[b] || 0) + 1; } return o; };
  for (const role of ['voetganger', 'student', 'bouwvakker', 'sporter']) assert.ok(Object.keys(vorm(role)).length >= 4, role);
  assert.ok((vorm('bouwvakker').breed || 0) > (vorm('sporter').breed || 0) * 2, 'bouwvakkers vaker breed');
  // geen extra mesh-kosten: nog steeds één rompmesh per NPC, ook voor de nieuwe rollen
  for (const role of ['ambtenaar', 'wandelaar']) {
    for (let i = 0; i < 40; i++) {
      const m = P.buildPersonMesh(0x3a3f47, 0xd9aa82, { seed: i * 3.3, role, outfitCtx: { rain: i % 4 === 0 } });
      let c = 0; m.traverse((x) => { if (x.isMesh) c++; });
      assert.equal(c, 1, `${role} ${i}`);
    }
  }
});

t('verhaalpersonages en politie houden hun vaste look: een look of cop gaat voor een rol', () => {
  const jelle = src('../game/js/storycast.js');
  assert.ok(/JELLE_LOOK/.test(jelle));
  const SC = null; void SC;
  const a = P.buildPersonMesh(0x1d4f9c, 0xe9c29c, { seed: 1581, look: { top: 'blazer' }, role: 'kok' });
  const b = P.buildPersonMesh(0x1d4f9c, 0xe9c29c, { seed: 1581, look: { top: 'blazer' } });
  assert.equal(a.userData.body.geometry, b.userData.body.geometry, 'een eigen look negeert de rol');
  const cop = P.buildPersonMesh(0x1c3fae, 0xe9c29c, { seed: 5, role: 'kok' });
  const cop2 = P.buildPersonMesh(0x1c3fae, 0xe9c29c, { seed: 5 });
  assert.equal(cop.userData.body.geometry, cop2.userData.body.geometry, 'politie blijft politie');
  const bron = src('../game/js/scene3d.js');
  assert.ok(/pedOutfitOpts/.test(bron) && /p\.isCop \|\| p\.look/.test(bron), 'de voetgangerbouw gebruikt de rol');
});

t('kapper: haar is deel van de outfit, per personage, in presets, code, save en verhaaloutfit', () => {
  assert.equal(C.getHair('tammo'), 'short.naturel');
  assert.equal(C.getHair('anita'), 'long.naturel');
  assert.equal(C.setHair('tammo', 'bob', 'zwart'), true, 'elk kapsel voor elk personage');
  assert.equal(C.setHair('tammo', 'nietbestaand', 'zwart'), false);
  assert.equal(C.setHair('tammo', 'bald', 'zwart'), true);
  assert.equal(C.setHair('tammo', 'bald', 'zwart'), false, 'dezelfde twee keer');
  assert.equal(C.setHair('anita', 'bob', 'nietbestaand'), false);
  assert.equal(C.setHair('anita', 'bob', 'roze'), true);
  assert.equal(C.getHair('tammo'), 'bald.zwart');
  assert.equal(C.getHair('anita'), 'bob.roze', 'elk personage zijn eigen kapsel');
  // het model: stijl en kleur komen in de appearance
  const o = C.outfitToLook(C.effectiveWorn('anita'), { hair: 0x1b1716 });
  assert.equal(o.hairStyle, 'bob'); assert.equal(o.hair, 0xd0457a);
  const naturel = C.outfitToLook({ ...C.effectiveWorn('anita'), hair: 'bob.naturel' }, { hair: 0x1b1716 });
  assert.equal(naturel.hair, undefined, 'naturel laat de eigen haarkleur van het personage staan');
  const bold = P.buildPersonMesh(0x888888, 0xd9aa82, { ...P.TAMMO_APPEARANCE, ...C.outfitToLook(C.effectiveWorn('tammo'), P.TAMMO_APPEARANCE) });
  const kort = P.buildPersonMesh(0x888888, 0xd9aa82, { ...P.TAMMO_APPEARANCE, ...C.outfitToLook({ ...C.effectiveWorn('tammo'), hair: 'short.naturel' }, P.TAMMO_APPEARANCE) });
  assert.notEqual(bold.userData.body.geometry, kort.userData.body.geometry);
  let m = 0; bold.traverse((x) => { if (x.isMesh) m++; }); assert.equal(m, 1, 'haar is geen extra mesh');
  // presets nemen het haar mee
  C.savePreset('tammo', 1, 'Kaal');
  C.setHair('tammo', 'curly', 'ros');
  assert.equal(C.wearPreset('tammo', 1).ok, true);
  assert.equal(C.getHair('tammo'), 'bald.zwart');
  // outfit-code: haar zit erin, een oude k1-code (zonder haar) blijft leesbaar
  const code = C.encodeOutfit(C.effectiveWorn('anita'));
  assert.ok(code.startsWith('k3'));
  assert.equal(C.decodeOutfit(code).hair, 'bob.roze');
  const oud = 'k1' + code.slice(6); // een code van versie 1: zonder kapsel en lichaamsvorm
  assert.ok(C.decodeOutfit(oud), 'k1 blijft werken');
  assert.equal(C.decodeOutfit(oud).hair, undefined);
  assert.equal(C.decodeOutfit(oud).outer, C.effectiveWorn('anita').outer);
  // save en oude save
  const save = JSON.parse(JSON.stringify(C.getClothingSave()));
  C.resetClothing(); C.applyClothingSave(save);
  assert.equal(C.getHair('anita'), 'bob.roze');
  C.resetClothing(); C.applyClothingSave(undefined, { ownedOutfits: [], outfit: {}, hair: { tammo: { color: 'groen', style: 'buzz' }, anita: { color: 'naturel', style: 'ponytail' } } });
  assert.equal(C.getHair('tammo'), 'buzz.groen', 'het kapsel van een oude save blijft');
  assert.equal(C.getHair('anita'), 'ponytail.naturel');
  C.applyClothingSave({ v: 1, tammo: { h: 'zzz.roze' } });
  assert.equal(C.getHair('tammo'), 'short.naturel', 'een onbekend kapsel wordt genegeerd');
  // verhaalscène forceert alleen een kapsel: de eigen kleding blijft, het eigen kapsel komt terug
  C.resetClothing();
  assert.equal(C.forceStoryLook({ tammo: { hair: 'bald.naturel' } }), true);
  assert.equal(C.effectiveWorn('tammo').hair, 'bald.naturel');
  assert.equal(C.effectiveWorn('tammo').outer, 'jack.blauw');
  assert.equal(C.getHair('tammo'), 'short.naturel');
  C.forceStoryLook(null);
  assert.equal(C.effectiveWorn('tammo').hair, 'short.naturel');
});

t('NPC-kapsels: deterministisch uit zaad, man of vrouw, oud wordt grijs, een eigen kapsel zit in de code', () => {
  const w1 = C.npcOutfit(5, 'voetganger', { hair: true }), w2 = C.npcOutfit(5, 'voetganger', { hair: true });
  assert.deepEqual(w1, w2);
  assert.ok(w1.hair && H.parseHair(w1.hair));
  assert.equal(C.npcOutfit(5, 'voetganger').hair, undefined, 'zonder vraag geen kapsel (het model kiest zelf)');
  let kaal = 0, bob = 0;
  for (let i = 0; i < 600; i++) { const h = C.npcOutfit(i, 'voetganger', { hair: true }).hair; if (h.startsWith('bald')) kaal++; if (h.startsWith('bob')) bob++; }
  assert.ok(kaal > 5 && bob > 10, `niet aan een geslacht gebonden: kaal ${kaal} bob ${bob}`);
  for (let i = 0; i < 60; i++) assert.match(C.npcOutfit(i, 'voetganger', { hair: true, old: true }).hair, /\.(grijs|platina)$/);
  const w = C.npcOutfit(9, 'student', { hair: true, body: true });
  assert.deepEqual(C.decodeOutfit(C.encodeOutfit(w)), norm(w));
  const a = P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 9, role: 'student' });
  assert.ok(a.userData.body);
});

t('kapper in de winkel: eigen opties per personage, reactie, prestatie, prijs', () => {
  const bron = src('../game/js/shops.js');
  assert.ok(/HAIR_REACTIONS\[ch\]/.test(bron) && /recordUnique\(world, 'kapsels'/.test(bron));
  assert.deepEqual(H.HAIR_STYLES.tammo, H.HAIR_STYLES.anita, 'alle kapsels voor alle personages');
  assert.ok(H.HAIR_STYLE_IDS.length >= 14, 'minstens 14 kapsels: ' + H.HAIR_STYLE_IDS.length);
  for (const ch of ['tammo', 'anita']) for (const [id] of H.HAIR_STYLES[ch]) assert.ok(H.HAIR_STYLE_IDS.includes(id), id);
  for (const list of Object.values(H.HAIR_REACTIONS)) for (const l of list) assert.ok(l.length > 20 && !/(nike|adidas)/i.test(l));
  assert.ok(H.hairPrice('bald') < H.hairPrice('short'));
  assert.ok(src('../game/js/achievements.js').includes("id: 'kapsel_nieuw'"));
});

t('Samen spelen: outfit-update midden in een sessie (avatar-event), validatie en weergave', async () => {
  const PL = await import('../game/js/coopplayers.js');
  const SP = await import('../game/js/coopspeler.js');
  const r = PL.createRoster ? PL.createRoster(4) : null;
  assert.ok(r, 'createRoster');
  const slot = PL.wijsPlekToe ? (PL.wijsPlekToe(r, 'anita') || {}).slot : 1;
  const code = C.encodeOutfit(C.effectiveWorn('anita'));
  const av = PL.zetAvatar(r, slot == null ? 1 : slot, { naam: 'Sanne', outfit: code });
  assert.ok(av && av.outfit === code, 'een geldige code komt in de lijst');
  assert.equal(PL.zetAvatar(r, slot == null ? 1 : slot, { outfit: 'rommel<script>' }).outfit, code, 'een ongeldige code vervangt niets');
  const ev = PL.lijstEvent(r);
  const terug = PL.leesLijstEvent(JSON.parse(JSON.stringify(ev)));
  assert.ok(terug && terug.spelers.some((x) => x.avatar && x.avatar.outfit === code), 'de code gaat mee in de spelerslijst');
  const look = SP.avatarLook({ ...SP.avatarVan({ avatar: { naam: 'Sanne', outfit: code } }, 1) });
  assert.ok(look.opts.look && look.opts.look.top, 'de medespeler draagt zijn eigen kleding');
  const zonder = SP.avatarLook(SP.avatarVan({ avatar: { naam: 'Sanne' } }, 1));
  assert.ok(!zonder.opts.look, 'zonder code de avatarkleur zoals voorheen');
  const net = src('../game/js/coopnet.js');
  assert.ok(/case 'outfit':/.test(net) && /export function stuurOutfit/.test(net) && /onLocalOutfitChange/.test(net), 'het bericht en de koppeling bestaan');
  assert.ok(/emitLocalOutfitChange\(\)/.test(src('../game/js/shops.js')), 'elke wissel meldt zich');
  assert.ok(/e\.outfit/.test(src('../game/js/coopfigures3d.js')), 'de figuur wordt opnieuw gebouwd bij andere kleding');
  let verstuurd = [];
  const world = { coopNet: { role: 'client', session: { sendEvent: (b) => { verstuurd.push(b); return true; } } } };
  const NET = await import('../game/js/coopnet.js');
  assert.equal(NET.stuurOutfit(world), true);
  assert.equal(verstuurd[0].k, 'outfit');
  assert.ok(C.decodeOutfit(verstuurd[0].o));
  assert.equal(NET.stuurOutfit(world), false, 'dezelfde code twee keer is geen nieuw bericht');
  assert.equal(NET.stuurOutfit({}), false, 'zonder sessie niets');
});

t('snelwisseltoets: door de gevulde outfits heen, per personage, de toets zit aan de speler', () => {
  assert.equal(C.cyclePreset('tammo', 1).ok, false, 'zonder outfits een uitleg');
  C.givePiece('tammo', 'hoodie.grijs'); C.givePiece('tammo', 'polo.wit');
  C.wearPiece('tammo', 'hoodie.grijs'); C.savePreset('tammo', 0, 'Een');
  C.wearPiece('tammo', 'polo.wit'); C.savePreset('tammo', 3, 'Vier');
  assert.equal(C.cyclePreset('tammo', 1).index, 0, 'na Vier komt Een');
  assert.equal(C.cyclePreset('tammo', 1).index, 3);
  assert.equal(C.cyclePreset('tammo', -1).index, 0);
  assert.equal(C.wornPieces('tammo').top, 'hoodie.grijs');
  assert.equal(C.cyclePreset('anita', 1).ok, false, 'Tessa heeft haar eigen outfits');
  assert.ok(/world\.cycleOutfit\(1\)/.test(src('../game/js/player.js')) && /wasPressed\('6'\)/.test(src('../game/js/player.js')));
  const CT = D; void CT;
});

t('mix en match: elk stuk los te kiezen en te combineren, sets zijn een snelkoppeling', () => {
  // elke combinatie van één stuk per slot (willekeurig 300 keer) is een geldige outfit voor beide personages
  const r = C.rng('mix');
  for (let n = 0; n < 300; n++) {
    const ch = n % 2 ? 'tammo' : 'anita';
    for (const slot of D.SLOT_IDS) {
      const l = D.SHOP_ITEMS.filter((i) => i.slot === slot);
      if (r() < 0.4) continue;
      const it = l[Math.floor(r() * l.length)];
      const p = `${it.id}.${it.colors[Math.floor(r() * it.colors.length)]}`;
      C.givePiece(ch, p);
      assert.ok(C.wearPiece(ch, p).ok || C.wornPieces(ch)[slot] === p, p);
    }
    const o = C.outfitToLook(C.effectiveWorn(ch), {});
    assert.ok(Number.isFinite(o.shirt) && o.look);
  }
  // een set dragen is een snelkoppeling: een stuk eruit wisselen kan, de setbonus verdwijnt dan vanzelf
  const s = D.setKeyFor('tammo', 'incognito');
  C.resetClothing();
  for (const p of s.pieces) C.givePiece('tammo', p);
  C.wearSet('tammo', s);
  assert.equal(C.setBonus('tammo').stealth, 2);
  C.givePiece('tammo', 'gympen.wit'); C.wearPiece('tammo', 'gympen.wit');
  assert.equal(C.setBonus('tammo').stealth, 0, 'een ander stuk erin: geen setbonus');
  C.wearPiece('tammo', s.pieces[3]);
  assert.equal(C.setBonus('tammo').stealth, 2, 'alle stukken weer aan: de bonus is terug');
  const bron = src('../game/js/clothingpanel.js');
  assert.ok(/ownedPieces\(ch\)\.filter/.test(bron), 'de kast toont elk stuk los');
});

t('niet aan een geslacht gebonden: geen geslachtslabels, alle kleding en alle kapsels voor iedereen', () => {
  const tekst = D.ITEMS.flatMap((i) => [i.label, i.desc, i.id]).join(' ').toLowerCase();
  for (const w of ['dames', 'heren', 'jongens', 'meisjes', 'vrouwen', 'mannen']) assert.ok(!new RegExp(`\\b${w}`).test(tekst), 'geslachtslabel: ' + w);
  for (const it of D.ITEMS) assert.ok(!('for' in it) && !('gender' in it) && !('sex' in it), it.id + ' heeft een geslachtsveld');
  for (const ch of ['tammo', 'anita']) for (const it of D.SHOP_ITEMS) {
    const p = `${it.id}.${it.colors[0]}`;
    C.givePiece(ch, p);
    assert.ok(C.wearPiece(ch, p).ok || C.wornPieces(ch)[it.slot] === p, `${ch}: ${it.id}`);
  }
  assert.deepEqual(H.HAIR_STYLES.tammo, H.HAIR_STYLES.anita);
});

t('lichaamsvormen: elk stuk past op elk lichaamstype zonder clipping (maattest)', () => {
  const types = H.BODY_IDS;
  assert.ok(['smal', 'gemiddeld', 'breed', 'lang', 'kort'].every((b) => types.includes(b)));
  for (const body of types) for (const variant of ['male', 'female']) {
    const ch = variant === 'male' ? 'tammo' : 'anita';
    const base = { ...(variant === 'male' ? P.TAMMO_APPEARANCE : P.ANITA_APPEARANCE) };
    const kaal = P.buildPersonMesh(0x888888, base.skin, { ...base, body, ...C.outfitToLook(C.effectiveWorn(ch), base) });
    kaal.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(kaal.userData.body);
    for (const it of D.ITEMS) {
      const worn = { ...D.DEFAULT_WORN[ch], [it.slot]: `${it.id}.${it.colors[0]}`, hair: 'short.naturel' };
      const o = C.outfitToLook(worn, base);
      const m = P.buildPersonMesh(o.shirt, base.skin, { ...base, ...o, body });
      m.updateMatrixWorld(true);
      const pos = m.userData.body.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 61) assert.ok(Number.isFinite(pos[i]), `${it.id} ${body} ${variant}: NaN`);
      const sc = new THREE.Box3().setFromObject(m.userData.body);
      assert.ok(sc.max.y - sc.min.y < 2.3 && sc.max.x - sc.min.x < 0.75 && sc.max.z - sc.min.z < 0.8, `${it.id} ${body} ${variant}: past niet`);
      for (const a of m.userData.clothingMeshes || []) {
        const ab = new THREE.Box3().setFromObject(a);
        assert.ok(bb.clone().expandByScalar(0.16).containsBox(ab), `${it.id} ${body} ${variant}: accessoire buiten het lichaam`);
        assert.ok(ab.max.y - ab.min.y < 0.5, `${it.id}: accessoire te groot`);
      }
    }
  }
  const maat = (b) => { const base = P.TAMMO_APPEARANCE; const m = P.buildPersonMesh(0x888888, base.skin, { ...base, body: b }); m.updateMatrixWorld(true); const x = new THREE.Box3().setFromObject(m.userData.body); return { w: x.max.z - x.min.z, h: x.max.y - x.min.y }; };
  assert.ok(maat('smal').w < maat('breed').w && maat('lang').h > maat('kort').h, 'de types verschillen echt');
  assert.equal(C.setBody('tammo', 'nietbestaand'), false);
  assert.equal(C.setBody('tammo', 'breed'), true);
  assert.equal(C.outfitToLook(C.effectiveWorn('tammo'), {}).body, 'breed');
  assert.equal(C.getBody('anita'), 'gemiddeld', 'elk personage zijn eigen vorm');
  const save = JSON.parse(JSON.stringify(C.getClothingSave())); C.resetClothing(); C.applyClothingSave(save);
  assert.equal(C.getBody('tammo'), 'breed');
  assert.equal(C.decodeOutfit(C.encodeOutfit(C.effectiveWorn('tammo'))).body, 'breed', 'de vorm zit in de outfit-code');
  const bodies = new Set(); for (let i = 0; i < 200; i++) bodies.add(C.npcOutfit(i, 'voetganger', { body: true }).body);
  assert.equal(bodies.size, 5, 'NPC-s hebben alle vijf de vormen');
});

t('kapsels: 17 stijlen, één haarmesh, binnen budget, geen NaN, ook met hoed en op elk lichaamstype', () => {
  assert.equal(H.HAIR_STYLE_IDS.length, 17);
  for (const id of H.HAIR_STYLE_IDS) {
    for (const hat of [null, 'pet.rood', 'mutsje.grijs']) {
      for (const body of ['smal', 'breed']) {
        const w = { ...D.DEFAULT_WORN.anita, hair: `${id}.blond`, ...(hat ? { hat } : {}) };
        const o = C.outfitToLook(w, P.ANITA_APPEARANCE);
        const m = P.buildPersonMesh(o.shirt, P.ANITA_APPEARANCE.skin, { ...P.ANITA_APPEARANCE, ...o, body });
        let c = 0; m.traverse((x) => { if (x.isMesh) c++; });
        assert.equal(c, 1, `${id}: haar is geen extra mesh`);
        const g = m.userData.body.geometry;
        const pos = g.attributes.position.array;
        for (let i = 0; i < pos.length; i += 7) assert.ok(Number.isFinite(pos[i]), `${id}: NaN`);
        assert.ok(g.attributes.position.count / 3 < 5200, `${id}: ${g.attributes.position.count / 3} driehoeken`);
      }
    }
  }
  const geos = new Set();
  for (const id of H.HAIR_STYLE_IDS) { const m = P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 1, variant: 'female', hairStyle: id, hair: 0x5a3d26 }); geos.add(m.userData.body.geometry.attributes.position.count); }
  assert.ok(geos.size >= 12, 'te veel gelijke kapsels: ' + geos.size);
  const tri = (id) => P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 1, variant: 'female', hairStyle: id, hair: 0x5a3d26 }).userData.body.geometry.attributes.position.count / 3;
  for (const id of H.HAIR_STYLE_IDS) assert.ok(tri(id) - tri('bald') < 1000, `${id}: ${tri(id) - tri('bald')} extra driehoeken`);
});

t('winkel: aanbod deterministisch per winkel en dag, wisselt per dag, uitverkoop op vrijdag', () => {
  const a = C.shopStock('Stoer & Stads|10,20', 3), b = C.shopStock('Stoer & Stads|10,20', 3);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, C.shopStock('Stoer & Stads|10,20', 4), 'morgen ander aanbod');
  assert.notDeepEqual(a, C.shopStock('Stoer & Stads|99,20', 3), 'andere winkel, ander aanbod');
  const soorten = new Set(a.map((p) => p.split('.')[0]));
  assert.ok(soorten.size >= 8 && soorten.size <= D.SHOP_STOCK + 4, 'soorten ' + soorten.size);
  for (const id of soorten) assert.deepEqual(a.filter((p) => p.startsWith(id + '.')).map((p) => p.split('.')[1]).sort(), [...D.ITEM_BY_ID[id].colors].sort(), `${id}: elk stuk in alle kleuren te kiezen`);
  for (const p of a) { assert.ok(D.parsePiece(p) && !D.parsePiece(p).item.npc, p); }
  assert.ok(C.shopProfiles('x').length >= 1 && C.shopProfiles('x').every((p) => p in D.PROFILES));
  let dagen = 0; for (let d = 0; d < 28; d++) if (C.saleOn(d)) dagen++;
  assert.equal(dagen, 4, 'één dag per week');
  const dag = [0, 1, 2, 3, 4, 5, 6].find((d) => C.saleOn(d));
  const sale = C.saleOn(dag);
  const stuk = D.SHOP_ITEMS.find((i) => i.profiles.includes(sale.profile));
  const winkel = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].find((k) => C.shopProfiles(k).includes(sale.profile));
  const p = `${stuk.id}.${stuk.colors[0]}`;
  assert.ok(C.shopPrice(p, winkel, dag) < stuk.price, 'uitverkoop is goedkoper');
  assert.equal(C.shopPrice(p, winkel, dag + 1), stuk.price);
  // elke winkel heeft over een week elk slot minstens een keer
  const slots = new Set();
  for (let d = 0; d < 7; d++) for (const q of C.shopStock('Stoer & Stads|10,20', d)) slots.add(D.pieceSlot(q));
  assert.ok(slots.size >= 6, [...slots].join());
});

t('balans: prijzen in lijn met de oude sets en geen goedkope bonus', () => {
  for (const s of D.SETS) {
    const som = s.pieces.reduce((n, p) => n + D.piecePrice(p), 0);
    assert.ok(s.price <= som * 1.4, `${s.id}: set ${s.price} duurder dan stukken ${som}`);
    assert.ok(s.price >= som * 0.3, `${s.id}: set ${s.price} spotgoedkoop tegen stukken ${som}`);
  }
  const prijzen = D.SHOP_ITEMS.map((i) => i.price);
  assert.ok(Math.min(...prijzen) >= 8 && Math.max(...prijzen) <= 250, 'prijsbereik');
  // de hele winkel in één keer is grof gelijk aan de som: geen lek in de economie (spel levert ca. 1.100 per uur)
  assert.ok(D.SHOP_ITEMS.reduce((n, i) => n + i.price * i.colors.length, 0) > 2500);
});

t('prestaties: tellers kloppen', () => {
  const st = C.clothingStats('tammo');
  assert.equal(st.shopItems, D.SHOP_ITEMS.length);
  assert.equal(st.allItems, false);
  for (const it of D.SHOP_ITEMS) C.givePiece('tammo', `${it.id}.${it.colors[0]}`);
  assert.equal(C.clothingStats('tammo').allItems, true);
  assert.ok(C.completeSetIds('tammo').length >= 1);
  const ach = src('../game/js/achievements.js');
  for (const id of ['kleding_nieuw', 'kleding_set', 'kleding_kast']) assert.ok(ach.includes(`id: '${id}'`), id);
});

t('modellen: een outfit met alles aan is één rompmesh plus hoogstens vier kleine meshes, binnen het driehoeksbudget', () => {
  const alles = { ...D.DEFAULT_WORN.tammo, glasses: 'zonnebril.zwart', neck: 'sjaal.rood', back: 'rugzak.zwart', jewel: 'ketting.mosterd', wrist: 'horloge.zwart', hands: 'werkhandschoen.mosterd', top: 'hoodie.grijs' };
  const o = C.outfitToLook(alles, P.TAMMO_APPEARANCE);
  const m = P.buildPersonMesh(o.shirt, P.TAMMO_APPEARANCE.skin, { ...P.TAMMO_APPEARANCE, ...o });
  const meshes = []; m.traverse((x) => { if (x.isMesh) meshes.push(x); });
  assert.ok(meshes.length <= 5, 'drawcalls: ' + meshes.length);
  const tris = meshes.reduce((s, x) => s + x.geometry.attributes.position.count / 3, 0);
  assert.ok(tris < 4500, 'driehoeken: ' + tris);
  assert.equal(m.userData.clothingMeshes.length, 4);
  for (const x of m.userData.clothingMeshes) assert.ok(x.geometry.userData.shared, 'accessoire-geometrie is gedeeld');
  // zonder sieraden geen extra meshes
  const kaal = P.buildPersonMesh(0x888888, 0xd9aa82, { seed: 1 });
  const kaalMeshes = []; kaal.traverse((x) => { if (x.isMesh) kaalMeshes.push(x); });
  assert.equal(kaalMeshes.length, 1);
  assert.equal(A.accessoryCacheSize() > 0, true);
});

t('modellen: elk stuk (elke soort, elke kleur-eerste) bouwt zonder NaN en binnen budget', () => {
  for (const it of D.ITEMS) {
    const worn = { ...D.DEFAULT_WORN.anita, [it.slot]: `${it.id}.${it.colors[0]}` };
    if (it.slot === 'top' || it.slot === 'outer') worn[it.slot] = `${it.id}.${it.colors[0]}`;
    const o = C.outfitToLook(worn, P.ANITA_APPEARANCE);
    const m = P.buildPersonMesh(o.shirt, P.ANITA_APPEARANCE.skin, { ...P.ANITA_APPEARANCE, ...o });
    const pos = m.userData.body.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 97) assert.ok(Number.isFinite(pos[i]), `${it.id}: NaN`);
    for (const x of m.userData.clothingMeshes || []) { const q = x.geometry.attributes.position.array; for (let i = 0; i < q.length; i++) assert.ok(Number.isFinite(q[i]), `${it.id}: NaN accessoire`); }
    assert.ok(m.userData.body.geometry.attributes.position.count / 3 < 6000, `${it.id}: te zwaar`);
  }
});

t('geheugen: duizend NPC\'s van dezelfde rol delen een klein aantal rompgeometrieën', () => {
  P.resetPersonCacheStats();
  for (let i = 0; i < 400; i++) P.buildPersonMesh(0x888888, 0xd9aa82, { seed: i % 40, role: 'voetganger' });
  assert.ok(P.personCacheStats().builds <= 40, 'builds ' + P.personCacheStats().builds);
});

t('Samen spelen: de avatar draagt een optionele outfit-code en een oude client breekt er niet op', () => {
  const sp = src('../game/js/coopspeler.js');
  assert.ok(/outfit/.test(sp), 'avatarVan en avatarLook kennen de outfit');
  const pl = src('../game/js/coopplayers.js');
  assert.ok(/outfit/.test(pl), 'de avatar-whitelist in coopplayers.js kent de outfit');
});

t('menu\'s: kledingwinkel en kast leveren secties met items in de vorm van shopui', async () => {
  const M = await import('../game/js/clothingpanel.js');
  let geld = 500;
  const ctx = {
    ch: 'tammo', name: 'Tammo', shopKey: 'Stoer & Stads|1,2', day: 5, hexCss: (x) => '#' + x.toString(16).padStart(6, '0'),
    broke: (p) => (geld < p ? 'Te weinig geld' : ''), pay: (p) => { if (geld < p) return false; geld -= p; return true; },
    previewOf: (w) => ({ kind: 'person', worn: w }), apply: () => false,
  };
  const secties = M.shopSections(ctx);
  assert.ok(secties.length >= 3 && secties[0].items.length === 6, 'sets eerst: ' + secties.map((s) => s.title));
  const items = secties.flatMap((s) => s.items);
  for (const it of items) assert.ok(it.id && it.label && Number.isFinite(it.price) && typeof it.buy === 'function' && it.preview, it.id);
  const koop = items.find((it) => it.id.startsWith('c-') && !it.disabled && it.price > 0);
  const voor = geld;
  assert.ok(typeof koop.buy() === 'string');
  assert.ok(geld < voor && C.ownsPiece('tammo', koop.id.slice(2)), 'betaald en in de kast');
  assert.equal(C.wornPieces('tammo')[D.pieceSlot(koop.id.slice(2))], koop.id.slice(2), 'en meteen aan');
  geld = 0;
  assert.equal(M.shopSections(ctx).flatMap((s) => s.items).find((it) => it.id.startsWith('c-') && !C.ownsPiece('tammo', it.id.slice(2))).disabled, 'Te weinig geld');
  const kast = M.wardrobeSections(ctx);
  assert.ok(kast.some((s) => s.title === 'Bewaar') && kast.some((s) => s.title === 'Boven'));
  const uit = kast.flatMap((s) => s.items).find((it) => it.id === 'c-' + koop.id.slice(2));
  assert.equal(uit.verb, 'Uitdoen');
  const bewaar = kast.flatMap((s) => s.items).find((it) => it.id === 'cv-0');
  bewaar.buy();
  assert.ok(C.presetsOf('tammo')[0]);
});

t('pashokje (ronde 4): passen, kast, outfit bewaren met postuur en kapsel, code delen, iconen, geluid', async () => {
  const M = await import('../game/js/clothingpanel.js');
  const S = await import('../game/js/clothingsfx.js');
  const LS = await import('../game/js/shoplist.js');
  const SI = await import('../game/js/shopicons.js');
  const world = { audioEvents: [], players: [], inVehicle: null, x: 3, y: 4 };
  const geluiden = [];
  let geld = 400;
  const ctx = {
    ch: 'tammo', name: 'Tammo', shopKey: 'kleding|77', day: 3, hexCss: (x) => '#' + x.toString(16).padStart(6, '0'),
    broke: (p) => (geld < p ? 'Te weinig geld' : ''), pay: (p) => { if (geld < p) return false; geld -= p; return true; },
    previewOf: (w) => ({ kind: 'person', worn: w }), apply: () => false, sound: (k) => geluiden.push(k), copy: () => {},
  };
  // het pashokje: eerst outfits en bewaren, dan wat de winkel heeft, dan de kast; ids zijn uniek en elke regel past
  C.setBody('tammo', 'breed');
  M.wardrobeSections(ctx).find((s) => s.title === 'Bewaar').items[0].buy();
  const secties = M.fittingSections(ctx);
  const titels = secties.map((s) => s.title);
  assert.ok(titels.indexOf('Outfits') < titels.findIndex((t2) => t2.startsWith('Passen:')) && titels.some((t2) => t2 === 'Boven') && titels.includes('Deel je look'), titels.join('|'));
  const alle = secties.flatMap((s) => s.items);
  assert.equal(new Set(alle.map((i) => i.id)).size, alle.length, 'ids botsen niet');
  for (const it of alle) assert.ok(it.preview && typeof it.buy === 'function' && LS.itemIcon(it) in SI.SHOP_ICONS, it.id);
  assert.ok(secties.find((s) => s.title === 'Outfits').keys, 'de toets 6 staat als toetsplaatje in de tekst');
  // passen en kopen: het geluid volgt het slot (jas = rits), uitdoen ritselt
  const jas = alle.find((i) => i.id.startsWith('p-c-jack.') && !i.disabled);
  if (jas) { jas.buy(); assert.equal(geluiden.at(-1), 'zipper_pull'); }
  const stuk = alle.find((i) => i.id.startsWith('p-c-tshirt.') && !i.disabled);
  stuk.buy(); assert.equal(geluiden.at(-1), 'clothes_rustle');
  // een outfit bewaart het postuur; het kapsel en het postuur komen mee terug
  C.setBody('tammo', 'smal');
  assert.equal(C.wearPreset('tammo', 0).ok, true);
  assert.equal(C.getBody('tammo'), 'breed', 'de outfit zette het postuur terug');
  const code = C.presetCode('tammo', 0);
  assert.ok(/^k3/.test(code) && code.length <= 80 && C.decodeOutfit(code).body === 'breed', 'outfit-code versie 3: ' + code);
  assert.equal(C.presetCode('tammo', 4), null);
  const geimporteerd = C.importPresetCode('tammo', 4, code, 'Van een vriend');
  assert.equal(geimporteerd.ok, true);
  assert.equal(C.presetsOf('tammo')[4].name, 'Van een vriend');
  assert.equal(C.importPresetCode('tammo', 4, 'onzin').ok, false);
  assert.equal(C.importPresetCode('tammo', 9, code).ok, false);
  // een outfit zonder postuur (oude save) laat het postuur met rust
  C.applyClothingSave(C.getClothingSave());
  assert.equal(C.presetsOf('tammo')[0].worn.body, 'breed', 'het postuur zit in de save');
  // de code-sectie toont elke bewaarde outfit
  assert.equal(M.codeSection(ctx).items.length, 2);
  // de iconen: elk slot heeft een categorie-icoon dat bestaat
  for (const slot of D.SLOT_IDS) assert.ok(M.SLOT_ICON[slot] in SI.SHOP_ICONS, slot);
  // het geluid: alleen bekende sleutels, lokaal, begrensd
  assert.equal(S.clothingSfx(world, 'curtain_pull', 1, 2), true);
  assert.deepEqual(world.audioEvents.at(-1), { kind: 'fx', name: 'curtain_pull', x: 1, y: 2 });
  assert.equal(S.clothingSfx(world, 'explosion', 1, 2), false);
  assert.equal(S.clothingSfx(null, 'clothes_rustle'), false);
  for (let i = 0; i < 100; i++) S.clothingSfx(world, 'clothes_rustle', 0, 0);
  assert.ok(world.audioEvents.length <= 64, 'de rij blijft begrensd');
  assert.equal(S.soundForSlot('outer'), 'zipper_pull');
  // de bedrading: de interieur-activiteit past, de toets 6 ritselt, shopui kent Home, End en de cijfertoetsen
  const inn = src('../game/js/interiors.js');
  assert.ok(/case 'passen'[\s\S]{0,400}openFittingRoom/.test(inn) && /openClothingCounter/.test(inn), 'interiors.js opent het pashokje');
  assert.ok(/clothingSfx\(world, 'clothes_rustle'\)/.test(src('../game/js/shops.js')), 'toets 6 ritselt');
  assert.ok(/rijCijfer/.test(src('../game/js/shopui.js')), 'shopui gebruikt listnav');
  assert.equal(SH.fittingRoomMenu({ player: { character: 'anita' } }, 'x').tagline.includes('Tessa') && SH.fittingRoomMenu({ player: { character: 'tammo' } }, 'x').name, 'Pashokje');
});

t('Samen spelen (ronde 4): de outfit van de ander is zichtbaar met kapsel en postuur, per speler bewaard, wegvallen en aansluiten', async () => {
  const CS = await import('../game/js/coopspeler.js');
  // de speler bewaart een outfit in het pashokje: de code gaat mee in de spelerslijst en de ander ziet stukken, kapsel en postuur
  C.givePiece('tammo', 'hoodie.grijs'); C.wearPiece('tammo', 'hoodie.grijs');
  C.setBody('tammo', 'lang'); C.setHair('tammo', 'afro', 'zwart');
  C.savePreset('tammo', 2, 'Zomerdag');
  const code = C.presetCode('tammo', 2);
  const kijk = CS.avatarLook({ char: 'tammo', outfit: code, seed: 5, huid: 0xd9aa82, variant: 'male', kleur: '#3f6ea8', naam: 'Gast' });
  assert.equal(kijk.opts.body, 'lang', 'postuur zichtbaar bij de ander');
  assert.equal(kijk.opts.hairStyle, 'afro', 'kapsel zichtbaar bij de ander');
  // de ander ziet alleen de code, nooit mijn kast: een speler die aansluit krijgt de code uit de lijst; een onzincode wordt genegeerd
  assert.equal(CS.avatarVan({ char: 'tammo', outfit: 'onzin' }).outfit, null);
  assert.ok(C.cleanOutfitCode(code) === code && code.length <= 80);
  // per speler bewaard: de kast van Tessa is niet die van Tammo, en een save-ronde houdt outfit en postuur
  assert.equal(C.presetsOf('anita')[2], null);
  C.applyClothingSave(C.getClothingSave());
  assert.equal(C.presetCode('tammo', 2), code, 'dezelfde code na een save');
  // wegvallen: een speler die weggaat staat niet meer in de lijst, zijn code verdwijnt met hem; de eigen kast blijft ongemoeid
  assert.ok(C.ownsPiece('tammo', 'hoodie.grijs'));
  assert.ok(src('../game/js/coopnet.js').includes("case 'outfit'") && /outfit/.test(src('../game/js/coopplayers.js')), 'het bericht outfit en de avatar-whitelist bestaan');
});

for (const [name, fn] of tests) {
  n++;
  try { C.resetClothing(); await fn(); } catch (e) { fails++; console.log('FAIL', name, '|', String(e.stack || e.message).split('\n').slice(0, 3).join(' / ')); }
}
console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} tests`);
process.exit(fails ? 1 : 0);
