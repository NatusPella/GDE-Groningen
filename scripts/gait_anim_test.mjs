// De loopcyclus op een echt persoonsmodel (models3d_people.js animatePersonWalk, #985): hielcontacten links en rechts om en om, bochthelling,
// blik naar een doel, de wachtclips bij lang stilstaan, en dat alles eindig blijft (geen NaN). Pure logica staat in scripts/gait_test.mjs.
//   node scripts/gait_anim_test.mjs      (vereist `cd desktop && npm run stage` of de vendor-cache, zoals crowd_test.mjs)
import './node3d.mjs';
const { buildPersonMesh, animatePersonWalk } = await import('../game/js/models3d_people.js');
const G = await import('../game/js/gait.js');

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const mk = (seed = 1) => buildPersonMesh(0x3f6ea8, 0xf1c9a5, { seed });
const finite = (m) => { let bad = 0; m.traverse((o) => { for (const k of ['x', 'y', 'z']) { if (!Number.isFinite(o.position[k]) || !Number.isFinite(o.rotation[k])) bad++; } }); return bad === 0; };

// lopen: contacten om en om, twee per cyclus
{
  const m = mk(), ud = m.userData; const sides = []; let last = 0;
  for (let i = 0; i < 600; i++) { animatePersonWalk(m, 1.4, 1 / 60); if ((ud.footN || 0) !== last) { last = ud.footN; sides.push(ud.footSide); } }
  const expect = 2 * Math.min(2.1, 0.42 + 0.3 * 1.4) * 10;
  ok(Math.abs(sides.length - expect) <= 3, `10 s lopen: ${sides.length} contacten, verwacht ${expect.toFixed(1)}`);
  ok(sides.every((s, i) => i === 0 || s !== sides[i - 1]), 'links en rechts wisselen af');
  ok(finite(m), 'alle botten eindig tijdens lopen');
}
// stilstaan geeft geen contacten
{
  const m = mk(2), ud = m.userData;
  for (let i = 0; i < 300; i++) animatePersonWalk(m, 0, 1 / 60);
  ok(!ud.footN, 'stilstaan: geen contact');
}
// bocht: de romp helt naar de kant waarheen je draait, nooit meer dan 0,14 rad
{
  const mR = mk(3), mL = mk(4);
  for (let i = 0; i < 180; i++) { mR.rotation.y -= 1.5 / 60; mL.rotation.y += 1.5 / 60; animatePersonWalk(mR, 3, 1 / 60); animatePersonWalk(mL, 3, 1 / 60); }
  const r = mR.userData.chest.rotation.x, l = mL.userData.chest.rotation.x;
  ok(r > 0.02 && l < -0.02 && Math.abs(r) <= 0.2 && Math.abs(l) <= 0.2, `naar rechts ${r.toFixed(3)}, naar links ${l.toFixed(3)}`);
  ok(mR.userData.turnHead > 0 && mL.userData.turnHead < 0, 'de blik loopt de bocht vooruit');
  const mS = mk(5);
  for (let i = 0; i < 120; i++) { mS.rotation.y += 3 / 60; animatePersonWalk(mS, 0, 1 / 60); }
  ok(Math.abs(mS.userData.turnLean) < 1e-9, 'op de plek draaien helt niet');
  ok(finite(mR) && finite(mL) && finite(mS), 'eindig in bochten');
}
// blik: het hoofd draait naar het doel (positief = rechts), en terug als het doel weg is
{
  const m = mk(6), ud = m.userData;
  for (let i = 0; i < 20; i++) animatePersonWalk(m, 0, 1 / 60);
  const y0 = ud.head.rotation.y;
  ud.gazeT = 0.8;
  for (let i = 0; i < 90; i++) animatePersonWalk(m, 0, 1 / 60);
  ok(Math.abs(ud.gazeS - 0.8) < 1e-6 && ud.head.rotation.y < y0 - 0.5, `blik naar rechts: gazeS ${ud.gazeS.toFixed(2)}, hoofd ${ud.head.rotation.y.toFixed(2)} (was ${y0.toFixed(2)})`);
  ud.gazeT = NaN;
  for (let i = 0; i < 90; i++) animatePersonWalk(m, 0, 1 / 60);
  ok(ud.gazeS === 0, 'het hoofd draait terug');
}
// lang stilstaan: de wachtclips (horloge) komen als overlay; geen NaN, begin en eind zacht
{
  const m = mk(7), ud = m.userData;
  let moved = 0, prev = null, jump = 0;
  for (let i = 0; i < 60 * 24; i++) {
    animatePersonWalk(m, 0, 1 / 60);
    const v = ud.armL.rotation.z + ud.head.rotation.y * 0.3;
    if (prev !== null && Math.abs(v - prev) > 0.12) jump++;
    prev = v;
    if (ud.armL.rotation.z > 0.9) moved++;
  }
  ok(finite(m), 'eindig na 24 s stilstaan');
  ok(moved > 0 || ud.stillT > 20, 'bij lang stilstaan komt er een clip (arm omhoog) of ten minste een teller', `moved ${moved}, stillT ${ud.stillT}`);
  ok(jump === 0, 'de overgangen in en uit een clip zijn zacht', String(jump));
  animatePersonWalk(m, 2, 0.05);
  ok(ud.stillT === 0, 'lopen zet de teller terug');
}
// wie gebukt staat doet niets extra
{
  const m = mk(8), ud = m.userData; ud.crouch = true;
  for (let i = 0; i < 60 * 12; i++) animatePersonWalk(m, 0, 1 / 60);
  ok(!ud.stillT, 'een gebukte mens heeft geen stilstaanteller');
}
// knipperen (#personages-aaa): de oogleden zijn open (schaal 0), sluiten kort en blijven eindig; een dode mens houdt ze dicht
{
  ok(G.blinkAmount(0.5, 3) >= 0 && G.blinkAmount(0.5, 3) <= 1 && G.blinkAmount(NaN, 1) === 0, 'blinkAmount blijft in 0..1');
  const m = mk(9), ud = m.userData; let max = 0, open = 0, n2 = 0;
  ok(!!ud.lids && ud.lids.scale.y === 0, 'de oogleden beginnen open');
  for (let i = 0; i < 60 * 20; i++) { animatePersonWalk(m, 0, 1 / 60); const v = ud.lids.scale.y; max = Math.max(max, v); if (v === 0) open++; n2++; }
  ok(max > 0.95 && open / n2 > 0.85, `in 20 s knippert hij en is open ${(open / n2 * 100).toFixed(0)}% van de tijd (max ${max.toFixed(2)})`);
  const d = mk(10); d.rotation.z = Math.PI / 2; animatePersonWalk(d, 0, 1 / 60);
  ok(d.userData.lids.scale.y === 1, 'een dode mens heeft de ogen dicht');
}
// variatie: twee zaden in hetzelfde shirt hebben niet dezelfde kleuren (subtiele kleurvariatie per mens)
{
  const col = (seed) => { const g = buildPersonMesh(0x3f6ea8, 0xf1c9a5, { seed }).userData.body.geometry.attributes.color; return [g.getX(0), g.getY(0), g.getZ(0), g.count]; };
  const set = new Set(); for (let i = 1; i <= 12; i++) set.add(col(i * 31).slice(0, 3).map((v) => v.toFixed(3)).join());
  ok(set.size >= 6, `12 zaden geven ${set.size} verschillende huid- en kleurstanden`);
}
ok(G.FIDGET_CLIPS.length >= 3, 'er zijn minstens drie wachtclips');

console.log(fails ? `${fails} van ${n} mislukt` : `gait_anim_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
