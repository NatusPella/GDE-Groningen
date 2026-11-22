// Kledingvoorbeelden (22-11): elk kledingstuk toont ALLEEN dat stuk (op de neutrale vorm die het nodig heeft), een set een nette compositie, en
// de lijsten (Spullen, winkel, kast) gebruiken ze; alleen het pashokje en de samenstellingen tonen nog het personage.
//   node scripts/kledingvoorbeeld_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
// Dekt: de lagen per slot (geen huid, gezicht of haar van een personage, geen ander kledingstuk), geen NaN, het kader (het stuk vult het beeld),
// opruimen (cache van de wereld ongemoeid, geometrie vrij), sets, kapsels, de pure spechelpers en welke lijst welk voorbeeld kiest.
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const THREE = await import('three');
const CP = await import('../game/js/clothingpreview.js');
const D = await import('../game/js/clothingdata.js');
const SP = await import('../game/js/spullen3d.js');
const P = await import('../game/js/models3d_people.js');
const H = await import('../game/js/clothinghair.js');
const PANEL = await import('../game/js/clothingpanel.js');
const C = await import('../game/js/clothing.js');
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const alle = D.ITEMS.flatMap((it) => it.colors.map((c) => `${it.id}.${c}`));
const cacheVoor = P.personCacheStats().size;

// ---------------------------------------------------------------------------------------------------------------- de lagen per slot
t('elk stuk (elke kleur) heeft een voorbeeld met driehoeken en zonder NaN', () => {
  assert.equal(D.ITEMS.length, 92);
  assert.ok(alle.length >= 250, 'te weinig stukken: ' + alle.length);
  for (const piece of alle) {
    const p = CP.pieceParts(piece);
    assert.ok(p, 'geen voorbeeld voor ' + piece);
    assert.ok(p.garment.P.length >= 9, 'geen driehoeken voor ' + piece);
    for (const part of [p.garment, p.form]) if (part) assert.ok(part.P.every(Number.isFinite) && part.C.every(Number.isFinite), 'NaN in ' + piece);
  }
});

t('de lagen van een stuk zijn alleen die van zijn slot; nooit huid, gezicht of haar van een personage', () => {
  for (const it of D.ITEMS) {
    const p = CP.pieceParts(`${it.id}.${it.colors[0]}`);
    assert.deepEqual(p.pieceLayers, CP.planFor(it).layers || [], it.id);
    for (const l of p.pieceLayers) {
      // de enige uitzondering: 'facial' (baard) en 'glasses' zijn het stuk zelf; 'head', 'neck', 'face' en 'hair' horen nooit bij een stuk
      if (['facial', 'glasses'].includes(l)) assert.ok(['face', 'glasses'].includes(it.slot), `${it.id}: laag ${l} bij slot ${it.slot}`);
      else assert.ok(!CP.PERSON_LAYERS.includes(l), `${it.id}: persoonlaag ${l}`);
    }
    // de vorm (de etalagevorm) is alleen kop, buste of onderarm, nooit een andere laag
    for (const l of p.formLayers) assert.ok(['head', 'top', 'collar', 'armskin', 'hand'].includes(l), `${it.id}: vormlaag ${l}`);
    // de enige kop is de neutrale etalagekop van een bril of baard; nergens een kop bij een stuk dat er niet om vraagt
    assert.equal(p.formLayers.includes('head'), ['glasses', 'face'].includes(it.slot), `${it.id}: kop`);
  }
});

t('geen enkel voorbeeld bevat een personage (geen skin, geen botten) en de meetbouw is weer uit', () => {
  const kinds = ['jack.blauw', 'jeans.zand', 'stadjerspet.roest', 'stoppels.natuur', 'leesbril.zwart', 'horloge.zwart', 'fietshandschoen.zwart', 'rugzak.zwart', 'ketting.mosterd', 'jurk.mint', 'rok.zwart', 'gympen.wit'];
  for (const piece of kinds) {
    const o = CP.buildClothingPreview(SP.stukSpec(piece));
    let skinned = 0, meshes = 0;
    o.mesh.traverse((m) => { if (m.isSkinnedMesh || m.isBone) skinned++; if (m.isMesh) meshes++; });
    assert.equal(skinned, 0, piece);
    assert.ok(meshes >= 1 && meshes <= 2, `${piece}: ${meshes} meshes`);
    o.mesh.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }
  assert.equal(P.personProbe.layers, false);
});

t('de vorm is neutraal: elke driehoek van de vorm heeft de kleur van de etalagevorm (geen echte huid)', () => {
  for (const piece of ['jack.blauw', 'stoppels.natuur', 'leesbril.zwart', 'sjaal.rood', 'horloge.zwart', 'rugzak.zwart']) {
    const p = CP.pieceParts(piece);
    if (!p.form) continue;
    const kleuren = new Set();
    for (let i = 0; i < p.form.C.length; i += 3) kleuren.add(p.form.C.slice(i, i + 3).join(','));
    assert.ok(kleuren.size <= 3, `${piece}: de vorm heeft ${kleuren.size} kleuren`);
    for (const k of kleuren) {
      const c = k.split(',').map(Number);
      // dsWereld schuift een kleur zacht naar het palet: vergelijk met de bouwkleur van dezelfde route
      assert.ok(c.every((v) => v > 20), `${piece}: een donkere vormkleur ${k}`);
      assert.ok(Math.max(...c) - Math.min(...c) < 40, `${piece}: een gekleurde vorm ${k} (huid of haar?)`);
    }
  }
});

t('elk stuk ligt op de plek van zijn slot (de juiste lagen zijn gekozen)', () => {
  const HY = P.PERSON_RIG.HEAD_Y, bereik = (parts) => {
    let lo = 1e9, hi = -1e9;
    for (let i = 1; i < parts.P.length; i += 3) { lo = Math.min(lo, parts.P[i]); hi = Math.max(hi, parts.P[i]); }
    return [lo, hi];
  };
  const eis = {
    hat: ([lo]) => lo > HY - 0.3, glasses: ([lo, hi]) => lo > HY - 0.05 && hi < HY + 0.08, face: ([lo, hi]) => lo > HY - 0.14 && hi < HY + 0.06,
    neck: ([lo]) => lo > 1.1, jewel: ([lo]) => lo > 1.2, wrist: ([, hi]) => hi < P.PERSON_RIG.SHOULDER_Y - 0.05, hands: ([, hi]) => hi < P.PERSON_RIG.SHOULDER_Y - 0.2,
    top: ([lo, hi]) => hi > 1.3 && lo > 0.4, outer: ([lo, hi]) => hi > 1.3 && lo > 0.4, bottom: ([lo, hi]) => hi < 1.05 && lo < 0.6, shoes: ([, hi]) => hi < 0.25,
    back: ([lo, hi]) => lo > 0.7 && hi < 1.5,
    legs: ([lo, hi]) => lo > 0.05 && hi < 0.6, guard: ([lo, hi]) => lo > 0.1 && hi < 0.5,
  };
  for (const it of D.ITEMS) {
    const p = CP.pieceParts(`${it.id}.${it.colors[0]}`);
    assert.ok(eis[it.slot](bereik(p.garment)), `${it.id} (${it.slot}) ligt op de verkeerde hoogte: ${bereik(p.garment).map((v) => v.toFixed(2))}`);
  }
});

t('een korte broek toont geen blote onderbenen, een rok geen benen', () => {
  const kort = CP.pieceParts('korte_broek.marine'), lang = CP.pieceParts('jeans.jeans'), rok = CP.pieceParts('rok.zwart');
  const lo = (p) => Math.min(...p.garment.P.filter((_, i) => i % 3 === 1));
  assert.ok(lo(kort) > 0.55, 'korte broek reikt tot ' + lo(kort));
  assert.ok(lo(lang) < 0.2);
  assert.ok(lo(rok) > 0.45 && !rok.pieceLayers.includes('leg') === false, 'rok');
  // de skirt-bouw laat de benen weg
  assert.ok(lo(rok) > 0.45);
});

t('een jurk heeft zijn rok, een jas zijn revers en een hoodie zijn capuchon (details blijven bij het stuk)', () => {
  const tris = (piece) => CP.pieceParts(piece).garment.P.length / 9;
  assert.ok(tris('jurk.mint') > tris('tshirt.wit') + 20, 'de jurk mist zijn rok');
  assert.ok(tris('colbert.marine') > tris('tshirt.wit'), 'colbert');
  assert.ok(tris('hoodie.zwart') > tris('tshirt.wit'), 'hoodie');
});

// ---------------------------------------------------------------------------------------------------------------- het kader
t('het kader klopt: het stuk vult het beeld (niet te klein, niet buiten beeld) en geen NaN', () => {
  for (const it of D.ITEMS) {
    const piece = `${it.id}.${it.colors[0]}`;
    const o = CP.buildClothingPreview(SP.stukSpec(piece));
    assert.ok(o, piece);
    assert.ok(Number.isFinite(o.fit.r) && o.fit.r > 0.03 && o.fit.r < 2, `${piece}: r ${o.fit.r}`);
    const box = new THREE.Box3();
    o.mesh.updateMatrixWorld(true);
    o.mesh.traverse((m) => { if (m.isMesh && m.userData.role === 'garment') box.expandByObject(m); });
    const size = box.getSize(new THREE.Vector3());
    const dim = Math.max(size.x, size.y, size.z);
    const vul = dim / (2 * o.fit.r);
    if (it.slot === 'face') assert.ok(vul > 0.18 && vul < 2, `${piece}: vulling ${vul.toFixed(2)}`); // een close-up: de kop loopt door
    else assert.ok(vul > 0.4 && vul <= 1.3, `${piece}: vulling ${vul.toFixed(2)}`);
    // het midden van het stuk valt in het beeld: de camera kijkt naar fit.c
    const mid = box.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(mid.y - o.fit.c.y) < o.fit.r, `${piece}: het stuk ligt niet in het kader`);
    o.mesh.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }
});

t('draaien: een stuk draait als geheel, een set draait elk stuk om zijn eigen as', () => {
  const o = CP.buildClothingPreview(SP.stukSpec('jack.blauw'));
  CP.turnPreview(o.mesh, 0.7);
  assert.equal(o.mesh.rotation.y, 0.7);
  const s = CP.buildClothingPreview(SP.setSpec(D.SETS[0].pieces));
  CP.turnPreview(s.mesh, 0.7);
  assert.equal(s.mesh.rotation.y, 0);
  assert.ok(s.mesh.userData.cells.length === 4 && s.mesh.userData.cells.every((c) => c.rotation.y === 0.7));
  // een voertuig of ander voorwerp zonder vakjes: gewoon de draai van de groep
  const g = new THREE.Group(); CP.turnPreview(g, 0.3); assert.equal(g.rotation.y, 0.3);
});

// ---------------------------------------------------------------------------------------------------------------- sets en kapsels
t('een set is een raster van losse stukken, elk in een eigen vakje, zonder personage', () => {
  for (const s of [...D.SETS, ...D.LOOKS]) {
    const o = CP.buildClothingPreview(SP.setSpec(s.pieces));
    assert.ok(o, s.id);
    const cells = o.mesh.userData.cells;
    assert.equal(cells.length, s.pieces.length, s.id);
    let skinned = 0;
    o.mesh.traverse((m) => { if (m.isSkinnedMesh || m.isBone) skinned++; });
    assert.equal(skinned, 0, s.id);
    // de vakjes liggen niet op elkaar
    const posities = new Set(cells.map((c) => `${c.position.x.toFixed(2)},${c.position.y.toFixed(2)}`));
    assert.equal(posities.size, cells.length, s.id + ': vakjes vallen samen');
    // elk stuk past in zijn vakje (1 bij 1), het kader omvat het hele raster
    const box = new THREE.Box3().setFromObject(o.mesh);
    const size = box.getSize(new THREE.Vector3());
    assert.ok(size.x <= o.fit.r * 2.1 && size.y <= o.fit.r * 2.1, `${s.id}: raster buiten het kader`);
    for (const c of cells) {
      const cb = new THREE.Box3().setFromObject(c), cs = cb.getSize(new THREE.Vector3());
      assert.ok(Math.max(cs.x, cs.y, cs.z) <= 1.12, `${s.id}: een stuk past niet in zijn vakje (${Math.max(cs.x, cs.y, cs.z).toFixed(2)})`);
    }
    o.mesh.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }
  assert.equal(CP.buildClothingPreview(SP.setSpec(['onzin.stuk'])), null);
});

t('een kapsel staat op een neutrale kop zonder gezicht; elke stijl voor beide personages', () => {
  for (const ch of ['tammo', 'anita']) {
    for (const style of H.HAIR_STYLE_IDS) {
      const o = CP.buildClothingPreview(SP.haarSpec(style, ch, 0x5a3d26));
      assert.ok(o, style);
      let skinned = 0, meshes = 0;
      o.mesh.traverse((m) => { if (m.isSkinnedMesh || m.isBone) skinned++; if (m.isMesh) { meshes++; assert.ok(m.geometry.attributes.position.array.every(Number.isFinite), `NaN in ${style}`); } });
      assert.equal(skinned, 0);
      assert.ok(meshes >= 1);
      const p = CP.hairParts({ style, hex: 0x5a3d26, char: ch });
      assert.deepEqual(p.formLayers, ['head']);
      assert.deepEqual(p.pieceLayers, ['hair']);
      if (style !== 'bald') assert.ok(p.garment.P.length >= 9, `${ch}/${style} heeft geen haar`);
      o.mesh.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------- opruimen
t('opruimen: de cache van de wereld is ongemoeid en elke geometrie is vrij te geven', () => {
  assert.equal(P.personCacheStats().size, cacheVoor, 'de meetbouwen horen niet in de cache van de wereld');
  const o = CP.buildClothingPreview(SP.stukSpec('jack.blauw'));
  let nGeo = 0, shared = 0;
  o.mesh.traverse((m) => { if (m.geometry) { nGeo++; if (m.geometry.userData.shared) shared++; } });
  assert.ok(nGeo >= 1 && shared === 0, 'een voorbeeld bezit zijn geometrie zelf (dispose geeft hem vrij)');
  // de materiaal is gedeeld: nooit dispose op een gedeeld materiaal
  o.mesh.traverse((m) => { if (m.material) assert.ok(m.material.userData.shared, 'het materiaal hoort gedeeld te zijn'); });
});

t('de meetbouw laat de personen van de wereld ongemoeid: dezelfde look geeft nog steeds dezelfde gedeelde geometrie', () => {
  const a = P.buildPersonMesh(0x3f6ea8, 0xb8956a, { seed: 3, variant: 'male' });
  const b = P.buildPersonMesh(0x3f6ea8, 0xb8956a, { seed: 3, variant: 'male' });
  assert.equal(a.userData.body.geometry, b.userData.body.geometry);
  CP.pieceParts('jack.blauw');
  const c = P.buildPersonMesh(0x3f6ea8, 0xb8956a, { seed: 3, variant: 'male' });
  assert.equal(a.userData.body.geometry, c.userData.body.geometry);
  assert.equal(a.userData.body.geometry.userData.layers, undefined, 'een gewone persoon draagt geen meetlagen');
  for (const g of [a, b, c]) P.releasePersonGeometry(g);
});

// ---------------------------------------------------------------------------------------------------------------- de pure helpers
t('spec-helpers: stuk, set, kapsel en tint', () => {
  assert.deepEqual(SP.stukSpec('jack.blauw'), { kind: 'piece', piece: 'jack.blauw' });
  assert.equal(SP.stukSpec(''), null); assert.equal(SP.stukSpec(null), null); assert.equal(SP.stukSpec('Jack'), null);
  assert.deepEqual(SP.setSpec(['a.b', 'c.d']), { kind: 'pieceset', pieces: ['a.b', 'c.d'] });
  assert.equal(SP.setSpec([]), null); assert.equal(SP.setSpec(null), null);
  assert.deepEqual(SP.haarSpec('bob.zwart', 'anita', 0x111111), { kind: 'piece', hair: { style: 'bob', hex: 0x111111, char: 'anita' } });
  assert.equal(SP.haarSpec(''), null);
  assert.match(SP.tintVoor(0x1c1c1e), /^rgba\(226/); // donker: lichte tint
  assert.match(SP.tintVoor(0xe8e6e0), /^rgba\(20/);   // licht: donkere tint
  assert.match(SP.tintVoor(0x3f6ea8), /^rgba\(63,110,168,/); // gewoon: de eigen kleur
  // JSON-stabiel: de cache van de tegels gebruikt de spec als sleutel
  assert.equal(JSON.stringify(SP.stukSpec('jack.blauw')), JSON.stringify(SP.stukSpec('jack.blauw')));
  assert.notEqual(JSON.stringify(SP.stukSpec('jack.blauw')), JSON.stringify(SP.stukSpec('jack.groen')));
});

// ---------------------------------------------------------------------------------------------------------------- welke lijst welk voorbeeld kiest
const spec = (it) => (it.preview ? it.preview.kind : null);
function ctxVan(extra = {}) {
  return {
    ch: 'tammo', name: 'Tammo', shopKey: 'kleding-test', day: 1, hexCss: (h) => '#' + h.toString(16).padStart(6, '0'),
    broke: () => '', pay: () => true, apply: () => false, copy: () => {},
    previewOf: () => ({ kind: 'person', look: {} }), pieceOf: SP.stukSpec, setOf: SP.setSpec, ...extra,
  };
}
t('winkel: stukken en sets tonen het stuk of de set, niet het personage', () => {
  C.resetClothing();
  const secs = PANEL.shopSections(ctxVan());
  const items = secs.flatMap((s) => s.items);
  assert.ok(items.length >= 20);
  for (const it of items) assert.ok(['piece', 'pieceset'].includes(spec(it)), `${it.id} toont ${spec(it)}`);
  assert.ok(secs[0].items.every((it) => spec(it) === 'pieceset'), 'de sets staan als compositie');
  assert.ok(secs.slice(1).flatMap((s) => s.items).every((it) => spec(it) === 'piece'));
});

t('kast: stukken en complete sets tonen het stuk; outfits, bewaarplekken en postuur blijven een samenstelling op het personage', () => {
  C.resetClothing();
  C.givePiece('tammo', 'jack.blauw'); C.givePiece('tammo', 'jeans.nachtblauw');
  C.savePreset('tammo', 0, 'Proef');
  const secs = PANEL.wardrobeSections(ctxVan());
  const bij = (titel) => (secs.find((s) => s.title === titel) || { items: [] }).items;
  assert.ok(bij('Outfits').length >= 1 && bij('Outfits').every((it) => spec(it) === 'person'), 'outfits');
  assert.ok(bij('Bewaar').every((it) => spec(it) === 'person'), 'bewaar');
  assert.ok(bij('Postuur').length >= 3 && bij('Postuur').every((it) => spec(it) === 'person'), 'postuur');
  const stukken = secs.filter((s) => !['Outfits', 'Bewaar', 'Postuur', 'Sets'].includes(s.title)).flatMap((s) => s.items);
  assert.ok(stukken.length >= 3);
  for (const it of stukken) assert.equal(spec(it), 'piece', it.id);
  assert.deepEqual(stukken.map((it) => it.preview.piece).sort(), stukken.map((it) => it.id.slice(2)).sort(), 'elk stuk toont zichzelf');
  for (const it of bij('Sets')) assert.equal(spec(it), 'pieceset', it.id);
});

t('pashokje: passen blijft op het personage (daar draait het om), de code ook', () => {
  C.resetClothing();
  C.givePiece('tammo', 'jack.blauw');
  C.savePreset('tammo', 0, 'Proef');
  const secs = PANEL.fittingSections(ctxVan());
  const items = secs.flatMap((s) => s.items);
  assert.ok(items.length >= 20);
  for (const it of items) assert.equal(spec(it), 'person', `${it.id} toont ${spec(it)}`);
});

t('een ctx zonder pieceOf (oude aanroeper) valt terug op het personage', () => {
  C.resetClothing();
  const secs = PANEL.shopSections(ctxVan({ pieceOf: undefined, setOf: undefined }));
  assert.ok(secs.flatMap((s) => s.items).every((it) => spec(it) === 'person'));
});

t('bronnen: Spullen, winkel en kapper kiezen het stuk; de gedeelde renderer kent de nieuwe soorten', () => {
  const sp = src('../game/js/spullen.js');
  assert.ok(sp.includes('stukSpec(x.id)') && sp.includes('setSpec(set.pieces)'), 'Spullen toont stukken en sets');
  assert.ok(!/kledingSpec\(/.test(sp), 'Spullen toont geen personage meer');
  const sh = src('../game/js/shops.js');
  assert.ok(sh.includes('pieceOf: (piece) => stukSpec(piece)') && sh.includes('setOf: (pieces) => setSpec(pieces)'), 'de winkel geeft pieceOf en setOf');
  assert.ok(sh.includes('haarSpec(cur.style, ch') && sh.includes('haarSpec(id, ch'), 'de kapper toont het kapsel op een neutrale kop');
  const vp = src('../game/js/vehiclepreview.js');
  assert.ok(vp.includes("'piece', 'pieceset'") && vp.includes('buildClothingPreview') && vp.includes('turnPreview(p.mesh, p.angle)'), 'vehiclepreview kent stuk en stukken');
  assert.ok(!/\.rotation\.y = (p\.angle|angle);/.test(vp), 'draaien gaat overal via turnPreview');
});

t('de tegel en het detail krijgen de tint van het stuk', () => {
  const sp = src('../game/js/spullen.js');
  assert.ok(sp.includes('tint: x.color === \'natuur\' ? \'\' : tintVoor(x.hex)'));
  assert.ok(sp.includes('sp-pw.sp-tint') && sp.includes('sp-stage.sp-tint') && sp.includes('--sp-tint'));
});

// ---------------------------------------------------------------------------------------------------------------- winkel: stuk en personage naast elkaar (22-11)
const duoLook = (worn) => ({ ...P.TAMMO_APPEARANCE, ...C.outfitToLook(worn, P.TAMMO_APPEARANCE) });
t('winkel met duoOf: elk stuk en elke set staat als paar (stuk links, personage rechts) in de lijst; kast en pashokje blijven zoals ze waren', () => {
  C.resetClothing();
  const duoOf = (what, worn) => ({ kind: 'piecefig', ...what, look: duoLook(worn) });
  const secs = PANEL.shopSections(ctxVan({ duoOf }));
  const items = secs.flatMap((s) => s.items);
  assert.ok(items.length >= 20);
  for (const it of items) assert.equal(spec(it), 'piecefig', it.id);
  assert.ok(secs[0].items.every((it) => it.preview.pieces && !it.preview.piece), 'een set toont al zijn stukken');
  assert.ok(secs.slice(1).flatMap((s) => s.items).every((it) => it.preview.piece && it.preview.look), 'een stuk toont zichzelf en de look met het stuk aan');
  C.givePiece('tammo', 'jack.blauw');
  const kast = PANEL.wardrobeSections(ctxVan({ duoOf })).filter((s) => !['Outfits', 'Bewaar', 'Postuur', 'Sets'].includes(s.title)).flatMap((s) => s.items);
  for (const it of kast) assert.equal(spec(it), 'piece', 'de kast toont alleen het stuk: ' + it.id);
  for (const it of PANEL.fittingSections(ctxVan({ duoOf })).flatMap((s) => s.items)) assert.equal(spec(it), 'person', 'het pashokje toont het personage: ' + it.id);
});

t('het paar: stuk links, personage rechts, geen NaN, draaien draait beide', () => {
  for (const what of [{ piece: 'jack.blauw' }, { piece: 'stadjerspet.roest' }, { pieces: ['jack.blauw', 'jeans.nachtblauw'] }]) {
    const worn = what.piece ? { [D.parsePiece(what.piece).item.slot]: what.piece } : { top: 'jack.blauw', bottom: 'jeans.nachtblauw' };
    const o = CP.buildClothingPreview({ kind: 'piecefig', ...what, look: duoLook(worn) });
    assert.ok(o && o.mesh && o.body && o.fit, 'geen paar voor ' + JSON.stringify(what));
    assert.ok(Number.isFinite(o.fit.r) && o.fit.r > 0.5 && o.fit.c.toArray().every(Number.isFinite));
    o.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o.mesh);
    assert.ok([box.min, box.max].every((v) => v.toArray().every(Number.isFinite)), 'NaN in het paar');
    const [wrap, right] = o.mesh.children;
    assert.ok(wrap.position.x < 0 && right.position.x > 0, 'het stuk staat links, het personage rechts');
    CP.turnPreview(o.mesh, 1.2);
    assert.ok(Math.abs(right.rotation.y - 1.2) < 1e-9, 'het personage draait mee');
    assert.ok(wrap.children[0].rotation.y === 1.2 || wrap.children[0].userData.cells, 'het stuk draait mee');
    o.mesh.traverse((m) => { if (m.geometry && m.geometry.userData && typeof m.geometry.userData.personRefs === 'number') P.releasePersonGeometry(m); else if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); });
  }
  assert.equal(CP.buildClothingPreview({ kind: 'piecefig', piece: 'jack.blauw' }), null, 'zonder look geen paar');
});

t('bronnen: de winkel geeft duoOf, vehiclepreview kent piecefig en animeert het personage', () => {
  const sh = src('../game/js/shops.js');
  assert.ok(sh.includes("duoOf: (what, worn) => ({ kind: 'piecefig'"), 'de winkel geeft duoOf');
  const vp = src('../game/js/vehiclepreview.js');
  assert.ok(vp.includes("'piecefig'") && vp.split("animatePersonWalk(p.body, 0, dt)").length === 3, "vehiclepreview kent piecefig en animeert het personage");
});

console.log(fails ? `FAIL: ${fails} van ${n}` : `ok: ${n} tests`);
process.exit(fails ? 1 : 0);
