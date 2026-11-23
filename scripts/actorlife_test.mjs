// Pure tests voor actorlife.js (epic 'Personages die leven'): twee-bot-IK, voeten op de grond, armen naar een punt, kijkrichting
// met grenzen, lipsync, overgangen en het stuur. Daarnaast de koppeling in models3d_people.js (plantFeet, reachHand, steerHands,
// mondbot) en actoranim.js (kaak tijdens praten, kijkhoogte) met het echte rig.
//   node scripts/actorlife_test.mjs
import './node3d.mjs';
import * as L from '../game/js/actorlife.js';
const P = await import('../game/js/models3d_people.js');
const A = await import('../game/js/actoranim.js');

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;
const { THIGH_LEN: T, SHIN_LEN: S, UPPER_ARM, FOREARM, HIP_Y, ANKLE_Y } = P.PERSON_RIG;

// ---- twee-bot-IK ------------------------------------------------------------------
{
  const out = { a: 0, b: 0, reach: true }, fk = { x: 0, y: 0 };
  let worst = 0;
  for (let i = 0; i < 200; i++) {
    const fx = -0.3 + 0.6 * ((i * 37) % 100) / 100, fy = -0.3 - 0.5 * ((i * 53) % 100) / 100;
    if (Math.hypot(fx, fy) > T + S - 0.01 || Math.hypot(fx, fy) < 0.2) continue;
    L.twoBoneIK(fx, fy, T, S, -1, out);
    L.twoBoneFK(out.a, out.b, T, S, fk);
    worst = Math.max(worst, Math.hypot(fk.x - fx, fk.y - fy));
    ok(out.b <= -L.JOINT_MIN + 1e-9 && out.b >= -L.JOINT_MAX - 1e-9, 'knie blijft binnen zijn grenzen');
  }
  ok(worst < 1e-6, `IK haalt elk punt binnen bereik (grootste fout ${worst})`);
  L.twoBoneIK(0, -5, T, S, -1, out);
  ok(!out.reach && out.b <= -L.JOINT_MIN && Number.isFinite(out.a), 'buiten bereik: gestrekt, niet overstrekt, eindig');
  L.twoBoneIK(0, -0.01, T, S, -1, out);
  ok(out.b >= -L.JOINT_MAX - 1e-9 && Number.isFinite(out.a), 'te dichtbij: de knie vouwt niet verder dan de grens');
  L.twoBoneIK(0.1, -0.6, UPPER_ARM, FOREARM, 1, out);
  ok(out.b > 0, 'een elleboog buigt naar voren (positief)');
  L.twoBoneIK(NaN, Infinity, T, S, -1, out);
  ok(Number.isFinite(out.a) && Number.isFinite(out.b), 'rare invoer geeft eindige hoeken');
}

// ---- arm naar een punt ---------------------------------------------------------------
{
  const out = { x: 0, z: 0, e: 0, reach: true }, h = { x: 0, y: 0, z: 0 };
  let worst = 0;
  for (const t of [[0.3, -0.2, 0.05], [0.4, -0.15, -0.08], [0.2, -0.4, 0.15], [0.35, 0.1, 0.05], [0.1, -0.45, -0.2]]) {
    L.armIK(t[0], t[1], t[2], UPPER_ARM, FOREARM, out);
    L.armFK(out.x, out.z, out.e, UPPER_ARM, FOREARM, h);
    worst = Math.max(worst, Math.hypot(h.x - t[0], h.y - t[1], h.z - t[2]));
    ok(Math.abs(out.x) <= L.SPLAY_MAX + 1e-9, 'arm kantelt niet verder dan SPLAY_MAX');
  }
  ok(worst < 1e-6, `armIK legt de hand op het punt (grootste fout ${worst})`);
  L.armIK(0.05, -0.05, 2, UPPER_ARM, FOREARM, out);
  ok(Math.abs(out.x) <= L.SPLAY_MAX + 1e-9 && !out.reach, 'een punt ver opzij: grens gehouden, niet bereikt');
}

// ---- voeten op de grond: heupcompensatie --------------------------------------------------
{
  const o = { drop: 0, liftL: 0, liftR: 0 };
  L.footPlant(0, 0, o); ok(o.drop === 0 && o.liftL === 0 && o.liftR === 0, 'vlak: niets');
  L.footPlant(0.15, -0.1, o); ok(near(o.drop, 0.1) && near(o.liftL, 0.25) && near(o.liftR, 0), 'trap: heup zakt naar de lage voet, hoge voet komt 0,25 op');
  L.footPlant(0.1, 0.05, o); ok(o.drop === 0 && near(o.liftL, 0.1) && near(o.liftR, 0.05), 'beide voeten hoger: geen zak, beide omhoog');
  L.footPlant(-2, 0, o); ok(o.drop <= L.HIP_DROP_MAX && o.liftL >= -1e-9, 'een rand: de diepte wordt afgekapt');
}

// ---- kijkrichting: grenzen ------------------------------------------------------------------
{
  const g = { chestY: 0, headY: 0, headZ: 0, w: 0 };
  L.gazeSplit(0.5, 0, g); ok(near(-(g.chestY + g.headY), 0.5) && g.w === 1, 'binnen bereik: romp en hoofd samen precies naar het doel');
  ok(near(g.chestY, -0.15), 'de romp draait 30% mee');
  L.gazeSplit(1.8, 0, g); ok(Math.abs(g.headY) <= L.HEAD_YAW_MAX + 1e-9, 'ver opzij: het hoofd stopt bij HEAD_YAW_MAX');
  L.gazeSplit(3, 0, g); ok(g.w === 0 && g.headY === 0, 'achter de rug: geen blik (niemand draait 180 graden)');
  L.gazeSplit(0, 2, g); ok(near(g.headZ, L.PITCH_UP), 'omhoog: begrensd op PITCH_UP (rotation.z positief = neus omhoog)');
  L.gazeSplit(0, -2, g); ok(near(g.headZ, -L.PITCH_DOWN), 'omlaag: begrensd op PITCH_DOWN');
  ok(L.pitchTo(0, 5) === 0 && L.pitchTo(1, 1) > 0.7 && L.pitchTo(1, 0) <= Math.atan2(1, 0.3) + 1e-9, 'pitchTo: vlak 0, omhoog positief, geen deling door nul');
}

// ---- lipsync ---------------------------------------------------------------------------------
{
  ok(L.jawFromLevel(0) === 0 && L.jawFromLevel(L.LIP_GATE * 0.9) === 0, 'onder de drempel blijft de mond dicht');
  ok(L.jawFromLevel(L.LIP_FULL) === 1 && L.jawFromLevel(5) === 1, 'vol niveau: helemaal open, nooit meer dan 1');
  let mono = true, prev = -1;
  for (let v = 0; v <= 0.3; v += 0.005) { const j = L.jawFromLevel(v); if (j < prev - 1e-12) mono = false; prev = j; }
  ok(mono, 'meer stem = verder open (monotoon)');
  let j = 0; for (let i = 0; i < 3; i++) j = L.lipsyncStep(j, 1, 1 / 60);
  ok(j > 0.6, `open gaat snel (3 frames: ${j.toFixed(2)})`);
  let c = 1; for (let i = 0; i < 3; i++) c = L.lipsyncStep(c, 0, 1 / 60);
  ok(c > 1 - j + 0.05, 'dicht gaat trager dan open');
  ok(L.lipsyncStep(0.5, 0.5, 1) === 0.5 && Number.isFinite(L.lipsyncStep(NaN, NaN, NaN)), 'stabiel en eindig');
  let open = 0, shut = 0, max = 0;
  for (let t = 0.01; t < 4; t += 1 / 60) { const v = L.babbleEnvelope(t, 0.37); max = Math.max(max, v); if (v > 0.2) open++; else shut++; }
  ok(max <= 1 && open > 50 && shut > 50, 'de lettergreepcurve gaat open en dicht');
  ok(L.babbleEnvelope(1.234, 0.5) === L.babbleEnvelope(1.234, 0.5), 'deterministisch');
  const m = { open: 0, wide: 1 };
  L.mouthShape(0, 'lach', m); ok(m.open > 0.3 && m.wide > 1, 'een lach: mond open en breed');
  L.mouthShape(0, null, m); ok(m.open === 0 && m.wide === 1, 'neutraal en stil: dicht');
}

// ---- overgangen ---------------------------------------------------------------------------------
{
  const w = { idle: 0, walk: 0, run: 0 };
  for (const s of [0, 0.4, 1, 2, 3.5, 6, 9]) { L.gaitWeights(s, w); ok(near(w.idle + w.walk + w.run, 1, 1e-9) && w.idle >= 0 && w.walk >= 0 && w.run >= 0, `gewichten tellen op tot 1 bij ${s} m/s`); }
  L.gaitWeights(0, w); ok(w.idle === 1, 'stil = idle');
  L.gaitWeights(1.4, w); ok(w.walk === 1, 'wandelen = lopen');
  L.gaitWeights(7, w); ok(w.run === 1, 'hard = rennen');
  let k = 0, frames = 0; while (k < 1 && frames < 100) { k = L.crossfade(k, 1, 1 / 60, 0.3); frames++; }
  ok(frames === 18, `een volle overgang duurt 0,3 s (${frames} frames)`);
}

// ---- afstandstrap --------------------------------------------------------------------------------
ok(L.lifeTier(0) === 0 && L.lifeTier(13.9 ** 2) === 0 && L.lifeTier(20 ** 2) === 1 && L.lifeTier(40 ** 2) === 2 && L.lifeTier(NaN) === 2, 'afstandstrap: dichtbij, middel, ver');

// ---- stuur ---------------------------------------------------------------------------------------
{
  const g = { x: 0, y: 0, z: 0 };
  L.wheelGrip(0.4, 0.2, 0.18, 0.3, 0, 1, g); ok(near(g.x, 0.4) && near(g.y, 0.2) && near(g.z, 0.18), 'recht: hand op kwart over (de zijkant van het wiel)');
  L.wheelGrip(0.4, 0.2, 0.18, 0.3, 0.6, 1, g); const d = Math.hypot(g.x - 0.4, g.y - 0.2, g.z); ok(near(d, 0.18), 'gedraaid: de hand blijft op de rand');
  const g2 = { x: 0, y: 0, z: 0 }; L.wheelGrip(0.4, 0.2, 0.18, 0.3, 0.6, -1, g2); ok(g.y > 0.2 && g2.y < 0.2, 'de ene hand gaat omhoog, de andere omlaag');
}

// ---- het echte rig: mondbot, voeten, handen ---------------------------------------------------------
{
  const m = P.buildPersonMesh(0x3f6ea8, 0xd9a47a, { seed: 4242 });
  const ud = m.userData;
  const sk = ud.body.skeleton;
  ok(sk.bones.length === 13 && ud.mouth && ud.mouth.scale.y === 0, 'dertien botten, de mond is dicht bij het bouwen');
  P.setMouth(ud, 0.7, 1.2); ok(ud.mouth.scale.y === 0.7 && ud.mouth.scale.z === 1.2, 'setMouth opent en verbreedt');
  P.setMouth(ud, 0); ok(ud.mouth.scale.y === 0 && ud.mouth.scale.z === 1, 'setMouth sluit');

  // voeten op een trap: een tree van 15 cm voor de mens (+X), de mens staat erop met één voet naar voren
  m.position.set(10, 0, 5); m.rotation.y = -0.3;
  for (let f = 0; f < 30; f++) P.animatePersonWalk(m, 1.2, 1 / 60);
  const h = -m.rotation.y;
  const stepAt = (x, y) => (((x - 10) * Math.cos(h) + (y - 5) * Math.sin(h)) > 0 ? 0.15 : 0);
  const ankleWorld = (k) => {
    const thigh = k === 0 ? ud.legL : ud.legR, knee = k === 0 ? ud.kneeL : ud.kneeR, fk = { x: 0, y: 0 };
    L.twoBoneFK(thigh.rotation.z, knee.rotation.z, T, S, fk);
    const lx = ud.pelvis.position.x + fk.x, lz = ud.pelvis.position.z + thigh.position.z, ly = ud.pelvis.position.y + fk.y;
    return { x: m.position.x + Math.cos(h) * lx - Math.sin(h) * lz, y: m.position.z + Math.sin(h) * lx + Math.cos(h) * lz, h: m.position.y + ly };
  };
  const before = [ankleWorld(0), ankleWorld(1)];
  const changed = P.plantFeet(m, stepAt, 1);
  const after = [ankleWorld(0), ankleWorld(1)];
  const front = before[0].x * Math.cos(h) + before[0].y * Math.sin(h) > before[1].x * Math.cos(h) + before[1].y * Math.sin(h) ? 0 : 1;
  const g0 = stepAt(before[front].x, before[front].y);
  ok(changed, 'plantFeet doet iets op een trap');
  ok(near(after[front].h - before[front].h, g0, 0.01), `voorste voet stijgt mee met de tree (${(after[front].h - before[front].h).toFixed(3)} m)`);
  ok(near(after[1 - front].h, before[1 - front].h, 0.01), 'achterste voet blijft op de grond');
  ok(near(Math.hypot(after[front].x - before[front].x, after[front].y - before[front].y), 0, 0.01), 'de voet schuift niet over de grond');
  // helling omlaag: de heup zakt
  const m2 = P.buildPersonMesh(0x9e3027, 0xa8754f, { seed: 77 });
  for (let f = 0; f < 10; f++) P.animatePersonWalk(m2, 0, 1 / 60);
  const hip0 = m2.userData.pelvis.position.y;
  P.plantFeet(m2, (x, y) => (y > 0 ? -0.08 : 0), 1);
  ok(m2.userData.pelvis.position.y < hip0 - 0.07, 'een voet lager: de heup zakt mee (heupcompensatie)');
  const m3 = P.buildPersonMesh(0x4a7a4a, 0xf1c9a5, { seed: 78 });
  for (let f = 0; f < 10; f++) P.animatePersonWalk(m3, 0, 1 / 60);
  const pose0 = JSON.stringify([m3.userData.legL.rotation.z, m3.userData.pelvis.position.y]);
  ok(!P.plantFeet(m3, () => 0, 1) && JSON.stringify([m3.userData.legL.rotation.z, m3.userData.pelvis.position.y]) === pose0, 'vlakke grond: niets verandert');

  // handen aan het stuur
  const d = P.buildPersonMesh(0x5a6470, 0xd9aa82, { seed: 31 });
  P.seatPose(d, { ...P.SEAT_CAR, arms: 'wheel' });
  const rest = [d.userData.armL.rotation.z, d.userData.elbowL.rotation.z, d.userData.armL.rotation.x];
  P.steerHands(d, 0);
  ok(near(d.userData.armL.rotation.z, rest[0], 0.01) && near(d.userData.elbowL.rotation.z, rest[1], 0.01) && near(d.userData.armL.rotation.x, rest[2], 0.01), 'stuur recht: dezelfde houding als de rusthouding');
  P.steerHands(d, 1);
  const zL = d.userData.armL.rotation.z, zR = d.userData.armR.rotation.z;
  ok(Math.abs(zL - zR) > 0.1, 'stuur om: de handen staan niet meer gelijk');
  for (const b of ['armL', 'armR', 'elbowL', 'elbowR']) ok(Number.isFinite(d.userData[b].rotation.z) && Number.isFinite(d.userData[b].rotation.x), `${b} eindig`);
  ok(d.userData.elbowL.rotation.z >= L.JOINT_MIN - 1e-9 && d.userData.elbowL.rotation.z <= L.JOINT_MAX + 1e-9, 'elleboog binnen de grenzen');
}

// ---- actoranim: kaak tijdens praten, dicht daarna; kijkhoogte ---------------------------------------
{
  const st = A.createStage({ seed: 3 });
  st.add('a', { x: 0, z: 0 }); st.add('b', { x: 2, z: 0, heading: Math.PI });
  st.cue('a', 'praat', { duur: 2, tekst: 'Zeg, hoe zit dat nou?', tot: 'b' });
  let maxJ = 0, minJ = 1;
  for (let i = 0; i < 100; i++) { st.update(1 / 60); const p = st.pose('a'); maxJ = Math.max(maxJ, p.mouth); if (i > 20) minJ = Math.min(minJ, p.mouth); }
  ok(maxJ > 0.4 && minJ < 0.15, `praten: de kaak gaat open en dicht (max ${maxJ.toFixed(2)}, min ${minJ.toFixed(2)})`);
  ok(st.pose('b').mouth === 0, 'de luisteraar houdt zijn mond');
  for (let i = 0; i < 150; i++) st.update(1 / 60);
  ok(st.pose('a').mouth < 0.02, 'na de regel is de mond dicht');
  // met een stembron: stil signaal = dicht
  A.setVoiceLevelSource(() => 0.001);
  st.cue('a', 'praat', { duur: 1, tekst: 'Hm.' });
  for (let i = 0; i < 20; i++) st.update(1 / 60);
  ok(st.pose('a').mouth < 0.02, 'stembron stil: mond dicht');
  A.setVoiceLevelSource(() => 0.2);
  for (let i = 0; i < 10; i++) st.update(1 / 60);
  ok(st.pose('a').mouth > 0.8, 'stembron luid: mond open');
  A.setVoiceLevelSource(null);
  // kijkhoogte: een zittende acteur kijkt omhoog naar wie staat
  const s2 = A.createStage({ seed: 5 });
  s2.add('z', { x: 0, z: 0 }); s2.add('s', { x: 1.2, z: 0 });
  s2.cue('z', 'zit', { x: 0, z: 0, heading: 0, zithoogte: 0.45 });
  s2.cue('z', 'kijk', { naar: 's' });
  for (let i = 0; i < 120; i++) s2.update(1 / 60);
  ok(s2.pose('z').head.z > 0.1, `zittend kijkt omhoog naar wie staat (rotation.z ${s2.pose('z').head.z.toFixed(2)}, + = neus omhoog)`);
  // rennen: verder helling en gebogen ellebogen dan lopen
  const s3 = A.createStage({ seed: 9 });
  s3.add('r', { x: 0, z: 0 }); s3.add('w', { x: 0, z: 5 });
  s3.cue('r', 'loop', { pad: [{ x: 100, z: 0 }], snelheid: 5.5 }); s3.cue('w', 'loop', { pad: [{ x: 100, z: 5 }], snelheid: 1.4 });
  let er = 0, ew = 0; for (let i = 0; i < 120; i++) { s3.update(1 / 60); er = Math.max(er, s3.pose('r').armL.e); ew = Math.max(ew, s3.pose('w').armL.e); }
  ok(er > ew + 0.5 && s3.get('r').runBlend > 0.8, 'een rennende acteur buigt zijn armen (overgang naar rennen)');
}

console.log(fails ? `${fails} van ${n} FAILED` : `actorlife: alle ${n} checks groen`);
process.exit(fails ? 1 : 0);
