// Verfijnronde kleding, kapper, tuning en interieurs (22-11): de kleine verbeteringen en de regressies die erbij horen.
//   node scripts/verfijn_kleding_tuning_test.mjs   (zet GDE_VENDOR_CACHE of draai eerst: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const D = await import('../game/js/clothingdata.js');
const C = await import('../game/js/clothing.js');
const M = await import('../game/js/clothingpanel.js');
const K = await import('../game/js/kapperkeuze.js');
const T = await import('../game/js/interiortexts.js');
const { rng } = C;
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

let n = 0, fails = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const shop = D.ITEMS.filter((i) => !i.npc);
const pieceOf = (slot, k = 0) => { const l = shop.filter((i) => i.slot === slot); const it = l[k % l.length]; return `${it.id}.${it.colors[k % it.colors.length]}`; };
const ctxOf = (extra = {}) => ({
  ch: 'tammo', name: 'Tammo', shopKey: 'Stoer & Stads|1,2', day: 5, hexCss: (x) => '#' + x.toString(16).padStart(6, '0'),
  broke: () => '', pay: () => true, previewOf: (w) => ({ worn: w }), apply: () => false, ...extra,
});

t('melding bij te weinig geld noemt het tekort en gebruikt duizendtallen', () => {
  assert.equal(T.TOO_POOR('een jas', 40, 15), 'Te weinig geld voor een jas (€40): je mist nog €25.');
  assert.equal(T.TOO_POOR('een jas', 1250, 0), 'Te weinig geld voor een jas (€1.250): je mist nog €1.250.');
  assert.equal(T.TOO_POOR('een jas', 40), 'Te weinig geld voor een jas (€40).', 'zonder saldo blijft de oude vorm');
  assert.equal(T.BOUGHT('Koffie', 3), 'Koffie gekocht voor €3.');
  assert.ok(/TOO_POOR\(prod\.item, prod\.price, w\.money\)/.test(src('../game/js/interiors.js')), 'de kassa geeft het saldo mee');
});

t('kapper: kleur verven kan niet bij een kaal hoofd', () => {
  assert.ok(K.colorBlock('bald') && /kaal/i.test(K.colorBlock('bald')));
  for (const s of ['short', 'buzz', 'long', 'mohawk', undefined]) assert.equal(K.colorBlock(s), '');
  assert.ok(/colorBlock\(cur\.style\)/.test(src('../game/js/shops.js')), 'het kappersmenu gebruikt hem');
});

t('outfit "aan": een ander kapsel of postuur telt als niet aan, en de toets-6-melding vervoegt goed', () => {
  C.wearPiece('tammo', pieceOf('top')); C.setHair('tammo', 'short', 'naturel'); C.setBody('tammo', 'gemiddeld');
  C.savePreset('tammo', 0, 'Eén');
  assert.ok(C.presetIsWorn('tammo', 0));
  C.setHair('tammo', 'buzz', 'naturel');
  assert.ok(!C.presetIsWorn('tammo', 0), 'alleen het kapsel verschilt: niet aan');
  const item = M.wardrobeSections(ctxOf()).find((s) => s.title === 'Outfits').items[0];
  assert.equal(item.disabled, '', 'dus aan te trekken (het kapsel wisselt mee)');
  item.buy();
  assert.equal(C.getHair('tammo'), 'short.naturel');
  C.setBody('tammo', 'breed');
  assert.ok(!C.presetIsWorn('tammo', 0), 'postuur verschilt');
  const sh = src('../game/js/shops.js');
  assert.ok(/outfitMessage\(r\.name/.test(sh) && !/ontbreken\)`/.test(sh), 'één meldingsregel voor kast en toets 6');
});

t('wisseltoets 6 slaat niets over dat kan, wikkelt en maakt geen onzinwissel', () => {
  const a = pieceOf('top', 0), b = pieceOf('top', 3);
  for (const p of [a, b]) C.givePiece('tammo', p);
  C.wearPiece('tammo', a); C.savePreset('tammo', 0, 'A');
  C.wearPiece('tammo', b); C.savePreset('tammo', 1, 'B');
  C.importPresetCode('tammo', 2, C.presetCode('tammo', 1), 'Kopie');
  const seq = [];
  for (let i = 0; i < 4; i++) { const r = C.cyclePreset('tammo', 1); assert.ok(r.ok, r.reason); seq.push(r.index); }
  // outfit 2 (B) en 3 (kopie van B) zijn één stop: de rij wisselt tussen A en B, ook als ze dubbel staan
  assert.ok(seq[0] === 0 && seq[1] !== 0 && seq[2] === 0 && seq[3] !== 0, 'A en B wisselen af zonder haken: ' + seq);
  C.clearPreset('tammo', 1); C.clearPreset('tammo', 2);
  C.wearPreset('tammo', 0);
  const r = C.cyclePreset('tammo', 1);
  assert.equal(r.ok, false);
  assert.ok(/enige/.test(r.reason));
  C.wearPiece('tammo', b); C.savePreset('tammo', 3, 'D');
  C.wearPreset('tammo', 0);
  assert.equal(C.cyclePreset('tammo', -1).index, 3);
});

t('overschrijven van een outfit kan ongedaan; een look die al bewaard is wordt niet nog eens bewaard', () => {
  const tops = shop.filter((i) => i.slot === 'top');
  const top = (k) => `${tops[k].id}.${tops[k].colors[0]}`;
  C.givePiece('tammo', top(0)); C.givePiece('tammo', top(1));
  C.wearPiece('tammo', top(0));
  C.savePreset('tammo', 0, 'Mijn look');
  assert.ok(!C.canUndoPreset('tammo'), 'een lege plek vullen is niets om terug te zetten');
  const was = C.presetsOf('tammo')[0];
  C.wearPiece('tammo', top(1));
  const s = M.wardrobeSections(ctxOf()).find((x) => x.title === 'Bewaar');
  assert.ok(!s.items.some((i) => i.id === 'cu'));
  s.items[0].buy();
  assert.ok(C.canUndoPreset('tammo'));
  assert.notDeepEqual(C.presetsOf('tammo')[0].worn, was.worn);
  const s2 = M.wardrobeSections(ctxOf()).find((x) => x.title === 'Bewaar');
  const cu = s2.items.find((i) => i.id === 'cu');
  assert.ok(cu && /Mijn look/.test(cu.buy()), 'de terugzetknop meldt de naam');
  assert.deepEqual(C.presetsOf('tammo')[0], was, 'precies zoals het was');
  assert.ok(!C.canUndoPreset('tammo'));
  assert.equal(C.undoPreset('tammo').ok, false);
  C.wearPreset('tammo', 0);
  C.savePreset('tammo', 1, 'Dubbel');
  const s4 = M.wardrobeSections(ctxOf()).find((x) => x.title === 'Bewaar');
  assert.ok(s4.items[0].disabled === 'Staat al in Dubbel' || s4.items[0].disabled === 'Staat hier al', s4.items[0].disabled);
  assert.ok(/Staat (hier al|al in)/.test(s4.items[1].disabled), s4.items[1].disabled);
  assert.equal(s4.items[2].disabled, 'Staat al in Mijn look', 'een lege plek bewaart dezelfde look niet nog eens');
  C.savePreset('tammo', 0, 'x');
  C.applyClothingSave(C.getClothingSave());
  assert.ok(!C.canUndoPreset('tammo'), 'een lading wist de ongedaan-stand (alleen geheugen)');
});

t('een lege plek krijgt de naam van de set die je aanhebt, en de lege staat zegt wat je doet', () => {
  C.takeOffSlot('tammo', 'hat'); // de standaardset valt uit elkaar
  assert.equal(C.suggestPresetName('tammo', 2), 'Outfit 3');
  const first = M.wardrobeSections(ctxOf()).find((s) => s.title === 'Bewaar');
  assert.ok(first.note.includes('Nog geen outfits'), 'lege staat: wat je hier doet');
  const set = D.SETS.find((s) => s.char === 'tammo');
  for (const p of set.pieces) C.givePiece('tammo', p);
  C.wearSet('tammo', set);
  assert.equal(C.suggestPresetName('tammo', 2), set.label.slice(0, D.PRESET_NAME_MAX));
});

t('winkel vergelijken: wat eruit gaat, de gewone prijs bij uitverkoop, en wat een set scheelt', () => {
  const worn = C.wornPieces('tammo');
  const cur = worn.shoes;
  const nieuwItem = shop.find((i) => i.slot === 'shoes' && !i.colors.some((c) => `${i.id}.${c}` === cur));
  const nieuw = `${nieuwItem.id}.${nieuwItem.colors[0]}`;
  const x = D.parsePiece(nieuw);
  assert.ok(/^ · Vervangt /.test(M.compareNote(worn, nieuw, x)), 'vervangt');
  assert.equal(M.compareNote(worn, cur, D.parsePiece(cur)), '', 'het stuk dat je aanhebt vervangt zichzelf niet');
  assert.ok(M.compareNote({}, nieuw, x, 25).endsWith('Gewoon €25') && !/Vervangt/.test(M.compareNote({}, nieuw, x, 25)));
  assert.equal(M.setSaving(['a.b'], 5), '', 'één stuk: geen vergelijking');
  const pcs = [pieceOf('top', 0), pieceOf('bottom', 0), pieceOf('shoes', 0)];
  const loose = pcs.reduce((a, p) => a + D.parsePiece(p).item.price, 0);
  assert.ok(M.setSaving(pcs, loose - 10).includes('scheelt €10'));
  assert.equal(M.setSaving(pcs, loose), '');
  let seen = false;
  for (let day = 0; day < 14 && !seen; day++) for (const key of ['Stoer & Stads|1,2', 'kleding|9']) {
    const items = M.shopSections(ctxOf({ day, shopKey: key })).flatMap((s) => s.items);
    if (items.some((i) => /Gewoon €/.test(i.desc))) seen = true;
  }
  assert.ok(seen, 'uitverkoop laat de gewone prijs zien');
});

t('een set aantrekken zonder alle stukken zegt hoeveel er mist', () => {
  const set = D.SETS.find((s) => s.char === 'tammo' && C.missingOf('tammo', s.pieces).length > 1);
  assert.ok(set, 'een set die je niet bezit');
  const un = C.wearSet('tammo', set);
  assert.ok(!un.ok && /^Nog \d+ (stuk|stukken) niet in je kast$/.test(un.reason), 'een set die je niet bezit: ' + un.reason);
});

t('fuzz: kapotte saves breken niets en geven altijd een draagbare kast', () => {
  const r = rng('verfijn-fuzz');
  const junk = () => { const k = Math.floor(r() * 9); return [null, undefined, 5, 'x', [], {}, true, NaN, { o: 3 }][k]; };
  for (let i = 0; i < 400; i++) {
    const save = C.getClothingSave();
    for (const ch of C.CHARS) {
      const s = save[ch];
      for (const key of Object.keys(s)) if (r() < 0.35) s[key] = junk();
      if (r() < 0.3) save[ch] = junk();
      if (Array.isArray(s.o) && r() < 0.5) s.o.push(junk(), 'bestaat.niet', '', 'a.b.c');
      if (Array.isArray(s.p) && r() < 0.5) s.p[Math.floor(r() * 7)] = junk();
    }
    if (r() < 0.2) save.bought = junk();
    let res;
    assert.doesNotThrow(() => { res = C.applyClothingSave(save); }, 'applyClothingSave gooit niet');
    assert.ok(['nieuw', 'leeg', 'migratie'].includes(res));
    for (const ch of C.CHARS) {
      const w = C.wornPieces(ch);
      assert.ok(C.hasTorso(w), `${ch}: shirt of jas`);
      assert.ok(w.bottom && w.shoes, `${ch}: broek en schoenen`);
      for (const p of Object.values(w)) assert.ok(C.ownsPiece(ch, p), `${ch}: wat je aanhebt bezit je`);
      assert.equal(C.presetsOf(ch).length, D.PRESET_COUNT);
      assert.ok(C.getHair(ch) && C.getBody(ch));
    }
    for (const x of C.presetsOf('tammo')) if (x) assert.ok(x.name.length >= 1 && x.name.length <= D.PRESET_NAME_MAX);
  }
});

t('simulatie: 3000 willekeurige handelingen houden de kast heel, en opslaan en laden is een kringloop', () => {
  const r = rng('verfijn-sim');
  const slots = D.SLOT_IDS;
  for (let i = 0; i < 3000; i++) {
    const ch = r() < 0.5 ? 'tammo' : 'anita';
    const op = Math.floor(r() * 9), slot = slots[Math.floor(r() * slots.length)], k = Math.floor(r() * 40);
    const piece = pieceOf(slot, k);
    switch (op) {
      case 0: C.givePiece(ch, piece); break;
      case 1: C.wearPiece(ch, piece); break;
      case 2: C.takeOffSlot(ch, slot); break;
      case 3: C.savePreset(ch, Math.floor(r() * 5), r() < 0.3 ? '<b>zeer lange naam die veel te lang is</b>' : undefined); break;
      case 4: C.wearPreset(ch, Math.floor(r() * 5)); break;
      case 5: C.cyclePreset(ch, r() < 0.5 ? 1 : -1); break;
      case 6: C.undoPreset(ch); break;
      case 7: C.setHair(ch, 'short', ['naturel', 'zwart', 'groen'][k % 3]); break;
      default: C.clearPreset(ch, Math.floor(r() * 5));
    }
    const w = C.wornPieces(ch);
    assert.ok(C.hasTorso(w) && w.bottom && w.shoes, `stap ${i} op ${op}: draagbaar`);
    for (const p of Object.values(w)) assert.ok(C.ownsPiece(ch, p), `stap ${i}: bezit wat je draagt`);
    if (i % 250 === 249) {
      const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v));
      const a = canon(C.getClothingSave());
      C.applyClothingSave(JSON.parse(a));
      assert.equal(canon(C.getClothingSave()), a, `stap ${i}: opslaan en laden is een kringloop`);
    }
  }
});

for (const [name, fn] of tests) {
  n++;
  try { C.resetClothing(); await fn(); } catch (e) { fails++; console.log('FAIL', name, '|', String(e.stack || e.message).split('\n').slice(0, 3).join(' / ')); }
}
console.log(fails ? `${fails} van ${n} mislukt` : `verfijn_kleding_tuning_test: ${n} tests ok`);
process.exit(fails ? 1 : 0);
