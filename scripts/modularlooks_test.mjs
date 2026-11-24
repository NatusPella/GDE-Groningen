// De kledingcatalogus op de modulaire mensen (ADR 0052): elk stuk uit clothingdata.js, elk kapsel en elk lichaam geeft voor Tammo en
// Tessa een geldige modulaire look (bestaande delen, de kleur van het stuk), en de kledingcodes en saves blijven precies wat ze waren:
// de vertaling naar delen gebeurt bij het bouwen, er wordt niets anders opgeslagen of over het netwerk gestuurd.
//   node scripts/modularlooks_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const M = await import('../game/js/modularpeople.js');
const L = await import('../game/js/modularlooks.js');
const C = await import('../game/js/clothing.js');
const D = await import('../game/js/clothingdata.js');
const H = await import('../game/js/clothinghair.js');
const P = await import('../game/js/models3d_people.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
const ids = M.modularPartIds();
const BASES = { tammo: P.TAMMO_APPEARANCE, anita: P.ANITA_APPEARANCE };
const lookOf = (ch, worn) => { const base = BASES[ch]; const o = C.outfitToLook(worn, base); return L.lookFromAppearance({ ...base, ...o, look: { ...(base.look || {}), ...o.look } }, ids); };
const valid = (look, rig) => look && look.rig === rig && ['hoofd', 'romp', 'benen', 'voeten'].every((s) => ids[rig].has(look.parts[s]));

// elk stuk uit de catalogus, voor beide personages
let pieces = 0;
for (const it of D.ITEMS) {
  for (const color of it.colors.slice(0, 2)) {
    const piece = D.pieceId(it.id, color);
    for (const ch of ['tammo', 'anita']) {
      const look = lookOf(ch, { [it.slot]: piece });
      ok(valid(look, ch === 'anita' ? 'vrouw' : 'man'), `${ch}: ${piece} (${it.slot}/${it.kind}) geeft een geldige look`);
      pieces++;
      // de kleur van het stuk komt terug: bovenstuk als shirt, broek als broek
      const hex = D.parsePiece(piece).hex;
      if (it.slot === 'top' && it.kind !== 'dress') ok(look.shirt === hex, `${ch}: ${piece} kleurt het bovenstuk`);
      if (it.slot === 'bottom') ok(look.pants === hex, `${ch}: ${piece} kleurt de broek`);
    }
  }
}
// kapsels en kleuren
for (const style of H.HAIR_STYLE_IDS) for (const ch of ['tammo', 'anita']) {
  const look = lookOf(ch, { hair: `${style}.bruin` });
  ok(valid(look, ch === 'anita' ? 'vrouw' : 'man') && look.hair === 0x5a3d26, `${ch}: kapsel ${style} met kleur`);
}
ok(lookOf('tammo', { hair: 'mohawk.groen' }).parts.hoofd === 'Punk_Head', 'een hanenkam uit de kapper is een hanenkam');
// pet: Tammo's eigen pet en een gewone pet
ok(lookOf('tammo', {}).cap === 'tammo', 'Tammo zonder hoed in de kast: toch zijn pet (de basislook)');
// lichaam: lengte binnen de norm, breder postuur
for (const body of H.BODY_IDS) {
  const a = { ...P.TAMMO_APPEARANCE, body };
  const m = M.buildModularFromAppearance(a);
  ok(m && m.scale.y > 0.9 && m.scale.y < 1.1, `lichaam ${body}: schaal ${m && m.scale.y.toFixed(3)}`);
}
// saves en codes: de vertaling verandert niets aan wat bewaard of verstuurd wordt
{
  C.resetClothing();
  const before = JSON.stringify(C.getClothingSave());
  const code = C.encodeOutfit({ top: D.ITEMS.find((i) => i.slot === 'top' && !i.npc).id + '.' + D.ITEMS.find((i) => i.slot === 'top' && !i.npc).colors[0], hair: 'short.naturel' });
  M.buildModularFromAppearance({ ...P.TAMMO_APPEARANCE, ...C.outfitToLook(C.decodeOutfit(code), P.TAMMO_APPEARANCE) });
  ok(JSON.stringify(C.getClothingSave()) === before, 'bouwen verandert de kledingsave niet');
  ok(C.decodeOutfit(code) && C.encodeOutfit(C.decodeOutfit(code)) === code, 'kledingcode heen en terug gelijk (Samen spelen)');
}
// buildPersonMesh in de spelerfase: de speelbare personages worden modulair (kledingkast, pashokje, medespelers), anderen niet
{
  P.setModularPlayerLooks(true);
  const t = P.buildPersonMesh(P.TAMMO_APPEARANCE.shirt, P.TAMMO_APPEARANCE.skin, P.TAMMO_APPEARANCE);
  const npc = P.buildPersonMesh(0x3f6ea8, 0xd9a47a, { seed: 4 });
  ok(t.userData.qRig && npc.userData.qRig, 'spelerfase: Tammo en elke andere figuur via buildPersonMesh modulair');
  P.setModularPlayerLooks(false);
  ok(!P.buildPersonMesh(P.TAMMO_APPEARANCE.shirt, P.TAMMO_APPEARANCE.skin, P.TAMMO_APPEARANCE).userData.qRig, 'zonder spelerfase: het eigen model');
}

console.log(fails ? `${fails} van ${n} FAILED` : `modularlooks: alle ${n} checks groen (${pieces} stukken)`);
process.exit(fails ? 1 : 0);
