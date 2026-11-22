// Kleding ronde 5 (#1152 tot #1156): rolpools op de laatste generieke figuren, outfit-bericht aan de host, snelwisseltoets in een
// voertuig en niet in een menu, de kapper met een reactie die bij het model past.
//   node scripts/kleding_r5_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const C = await import('../game/js/clothing.js');
const H = await import('../game/js/clothinghair.js');
const SH = await import('../game/js/shops.js');
const src = (p) => readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
const has = (p, s) => assert.ok(src(p).includes(s), `${p}: ${s}`);
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('#1152: publiek, kermisgasten en inzittenden hebben een rol, politie houdt zijn vaste look', () => {
  has('racedecor.js', "variant: i % 3 === 0 ? 'female' : null, role: 'voetganger' }");
  has('kermis.js', "seed: 6300 + i, role: 'feestganger' }");
  has('seating3d.js', "v.isPolice ? { seed } : { seed, role: 'voetganger' }");
  has('scene3d.js', "v.isPolice ? { seed } : { seed, role: v.isAmbulance ? 'ambulance' : v.isBus || v.isTaxi ? 'chauffeur' : 'voetganger' }"); // bestuurder: ambulance en bus of taxi een eigen pool (ronde 5b)
  has('scene3d.js', "* 7.1 + 3, role: 'voetganger' }"); // bijrijder
  has('scene3d.js', "seed: 77, role: 'voetganger'"); // opwarmfiguur deelt de rompgeometrie met de echte
  // winkeliers in een interieur kleden zich uit de rolpool (interiornpc.js), niet met een vaste kleur
  has('interiornpc.js', 'opts.role = clothingRole(role, sub)');
});

t('#1153: de host neemt een outfit-bericht van een gast aan, alleen geldig, en meldt het aan iedereen', async () => {
  const PL = await import('../game/js/coopplayers.js');
  const NET = await import('../game/js/coopnet.js');
  C.givePiece('tammo', 'hoodie.grijs'); C.wearPiece('tammo', 'hoodie.grijs');
  const code = C.localOutfitCode();
  const roster = PL.createRoster(4);
  const slot = PL.wijsPlekToe(roster, 'anita').slot;
  let aangekondigd = 0;
  const world = { coopNet: { role: 'host', hub: { roster, _announceList: () => { aangekondigd++; } } } };
  assert.equal(NET.handleEvent(world, { k: 'outfit', o: 'rommel' }, slot), false, 'onzin komt niet door');
  assert.equal(NET.handleEvent(world, { k: 'outfit', o: code }, 0), false, 'de host-slot zelf stuurt dit niet');
  assert.equal(NET.handleEvent(world, { k: 'outfit', o: code }, slot), true);
  assert.equal(roster.spelers.find((s) => s.slot === slot).avatar.outfit, code);
  assert.equal(aangekondigd, 1);
  assert.equal(NET.handleEvent(world, { k: 'outfit', o: code }, slot), false, 'dezelfde code opnieuw is geen nieuwe lijst');
  assert.equal(aangekondigd, 1);
  // een gast verwerkt het bericht niet (alleen de host beslist wat in de lijst komt)
  assert.equal(NET.handleEvent({ coopNet: { role: 'client' } }, { k: 'outfit', o: code }, 1), false);
  // een andere hoofdpersoon is een andere code: de wissel van Tammo naar Tessa meldt zich (shops.js)
  const s = src('shops.js');
  const i = s.indexOf('lastRiderChar = hoofdspeler(world).character;');
  assert.ok(i > 0 && s.slice(i, i + 300).includes('emitLocalOutfitChange()'));
});

t('#1154: snelwisseltoets ook in een voertuig, niet in een menu of minigame', () => {
  has('player.js', "input.wasPressed('6') && !this.water && world.cycleOutfit");
  assert.ok(!src('player.js').includes("wasPressed('6') && !this.inVehicle"));
  assert.equal(SH.outfitKeyBusy({}), false);
  for (const f of ['paused', 'uiPaused', 'padelGame', 'pigeonMode']) assert.equal(SH.outfitKeyBusy({ [f]: true }), true, f);
  assert.equal(SH.outfitKeyBusy({ activityGame: 'voetbal' }), true);
  // het bakpaneel leest 1 tot 6 als ingrediënten: de wisseltoets blijft dan van hem
  has('bakeround.js', 'export const bakeBezig');
  has('shops.js', 'bakeBezig()');
});

t('#1156: kapper-reactie past bij het model en de kleur, deterministisch met een vaste bron', () => {
  const vast = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  assert.equal(H.hairReaction('tammo', 'bald', 'zwart', vast(0.1, 0)), H.HAIR_STYLE_REACTIONS.bald.tammo);
  assert.equal(H.hairReaction('anita', 'mohawk', 'bruin', vast(0.1, 0)), H.HAIR_STYLE_REACTIONS.mohawk.anita);
  assert.equal(H.hairReaction('anita', 'short', 'roze', vast(0.1, 0)), H.HAIR_COLOR_REACTIONS.anita);
  // kaal en speels: twee eigen regels, de tweede trekking kiest
  assert.equal(H.hairReaction('tammo', 'bald', 'groen', vast(0.1, 0.9)), H.HAIR_COLOR_REACTIONS.tammo);
  // een gewoon kapsel krijgt altijd een algemene regel
  assert.ok(H.HAIR_REACTIONS.tammo.includes(H.hairReaction('tammo', 'short', 'zwart', vast(0.1, 0))));
  assert.ok(H.HAIR_REACTIONS.anita.includes(H.hairReaction('anita', 'long', 'bruin', vast(0.99, 0.99))));
  // elke combinatie geeft een Nederlandse tekst zonder merk of winterwoord
  for (const st of H.HAIR_STYLE_IDS) for (const c of H.HAIR_COLORS) for (const ch of ['tammo', 'anita']) {
    for (const r of [0, 0.5, 0.99]) {
      const s = H.hairReaction(ch, st, c.id, () => r);
      assert.ok(typeof s === 'string' && s.length > 20, `${ch} ${st} ${c.id}`);
      assert.ok(!/nike|adidas|winter|sneeuw/i.test(s));
    }
  }
  has('shops.js', 'hairReaction(ch, style, color)');
  // het kapsel zit in een outfit en in de outfit-code; de prestatie bleef
  C.setHair('tammo', 'mohawk', 'roze');
  C.savePreset('tammo', 0, 'Punk');
  assert.ok(C.decodeOutfit(C.presetCode('tammo', 0)));
  has('achievements.js', "id: 'kapsel_nieuw'");
});

t('ronde 5b: ambulancebroeder en chauffeur hebben een eigen rolpool, deterministisch en met geldige stukken', () => {
  for (const role of ['ambulance', 'chauffeur']) {
    const a = C.npcOutfit(11, role), b = C.npcOutfit(11, role);
    assert.deepEqual(a, b, role + ' deterministisch');
    assert.ok(a.top && a.bottom && a.shoes, role + ' heeft top, broek en schoenen');
  }
  let jas = 0, net = 0;
  for (let i = 0; i < 200; i++) { if ((C.npcOutfit(i, 'ambulance').outer || '').startsWith('veiligheidsjas')) jas++; if ((C.npcOutfit(i, 'chauffeur').shoes || '').match(/^(nette_schoenen|instappers)/)) net++; }
  assert.ok(jas > 80 && jas < 190, 'ambulance draagt meestal een opvallende jas: ' + jas);
  assert.equal(net, 200, 'een chauffeur draagt nette schoenen');
  has('scene3d.js', "v.isAmbulance ? 'ambulance'");
});

let fails = 0;
for (const [name, fn] of tests) {
  try { C.resetClothing(); await fn(); } catch (e) { fails++; console.log('FAIL', name, '|', String(e.stack || e.message).split('\n').slice(0, 3).join(' / ')); }
}
console.log(fails ? `${fails} van ${tests.length} mislukt` : `ok: ${tests.length} tests`);
process.exit(fails ? 1 : 0);
