// Vaste camerapunten voor de wereldbugs van 24-11 (#919, #917, #1192, #1193, #1080, #1044, #1076): dezelfde punten voor en na
// een wijziging, zodat de beelden een op een te vergelijken zijn. Een scriptbody voor desktop --perf-script (via ui_shots.mjs):
//   node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/wereldbugs_scenes.js --out=<map> --timeout=900
// Uitvoer: '[capture] w<nr>-<naam>' (een beeld) en '[wereld] <json>' (sonde: wat de straal uit het midden van de camera raakt,
// met materiaal, kleur en doorzichtigheid; plus losse metingen). Samen spelen: alles draait lokaal in een spel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (nr) => !ONLY.length || ONLY.includes(String(nr));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
// console.error: gewone console.log komt niet in het Electron-logboek (alleen [capture])
const log = (o) => console.error('[wereld] ' + JSON.stringify(o));

for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive() && !cine.isCinematicActive('wb-view')) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const S3 = await imp('scene3d'); const THREE = await import('/vendor/npm/three@0.160.0/build/three.module.js');
const { P } = await imp('worldframe'); const DN = await imp('daynight');
const stad = P(100, 77);
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const deckZ = (x, y) => { try { return map.surfaceAt(x, y, { z: 60, ribbon: null }).z; } catch (e) { return gh(x, y); } };
const fix = (hour = 14) => { w.clock = hour; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
let curPose = null; let curNr = 0;
const camOff = () => { curPose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
const cam = (x, y, z, lx, ly, lz, fov = 60) => {
  curPose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
  if (!cine.isCinematicActive()) cine.playCinematic({ id: 'wb-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => curPose });
};
const shot = async (name, wait = 1800) => {
  await sleep(wait);
  // een ander filmpje (plaatskaart, ontdekking) kan het eigen beeld hebben vervangen: dan opnieuw zetten, anders is het beeld de volgcamera
  if (curPose && !cine.isCinematicActive('wb-view')) { log({ nr: curNr, beeld: name, opnieuw: true }); const q = curPose; curPose = null; cam(q.position.x, q.position.y, q.position.z, q.lookAt.x, q.lookAt.y, q.lookAt.z, q.fov); await sleep(900); }
  fix(); console.log('[capture] w' + curNr + '-' + name); await sleep(700); };
const jump = async (x, y, settle = 5000) => {
  camOff(); if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
  for (let i = 0; i < 400 && loading(); i++) await sleep(100);
  await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
};
// Sonde: een straal van de camera naar het kijkpunt; de eerste treffers met materiaal (welk vlak zie je daar echt?)
const matInfo = (m) => (m ? { type: m.type, name: m.name || '', color: m.color ? '#' + m.color.getHexString() : null, transparent: !!m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, side: m.side, map: !!m.map, vc: !!m.vertexColors, po: m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : null, emissive: m.emissive ? '#' + m.emissive.getHexString() : null } : null);
const probe = (tag, from, to, n = 4) => {
  try {
    const rc = new THREE.Raycaster(); rc.camera = S3.getCamera(); const o = new THREE.Vector3(from[0], from[2], from[1]); const t = new THREE.Vector3(to[0], to[2], to[1]);
    rc.set(o, t.clone().sub(o).normalize()); rc.far = 400;
    const hits = rc.intersectObjects(S3.getScene().children, true).filter((h) => h.object.visible !== false).slice(0, n);
    log({ nr: curNr, probe: tag, hits: hits.map((h) => ({ d: +h.distance.toFixed(2), name: h.object.name || '', parent: (h.object.parent && h.object.parent.name) || '', type: h.object.type, ro: h.object.renderOrder, nz: h.face ? +h.face.normal.y.toFixed(2) : null, mat: matInfo(Array.isArray(h.object.material) ? h.object.material[h.face ? h.face.materialIndex : 0] : h.object.material) })) });
  } catch (e) { log({ nr: curNr, probe: tag, fout: e.message }); }
};
const scene = async (nr, fn) => { if (!want(nr)) return; curNr = nr; console.error('[wereld] scene ' + nr); try { await fn(); } catch (e) { log({ nr, fout: e && e.message }); } camOff(); await sleep(400); };
// Bruggen uit de kaart: verhoogd (dek boven de grond) of over water, dichtbij een punt
const bridgesNear = (x, y, r, pred = () => true) => (map.roadsNear ? map.roadsNear(x, y, r) : map.roads || []).filter((rd) => rd.bridge && rd.pts && rd.pts.length >= 2 && pred(rd)).map((rd) => {
  const a = rd.pts[0], b = rd.pts[rd.pts.length - 1]; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  return { rd, mx, my, len: Math.hypot(b[0] - a[0], b[1] - a[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), d: Math.hypot(mx - x, my - y) };
}).filter((o) => o.d < r && o.len > 12).sort((u, v) => u.d - v.d);
const PTS = { visvlietBrug: [-20762, -5195], usquert: [2776, -20413], warffum: [-188, -18992], marum: [-19954, 8661], bourtange: [42473, 22807], martini: [213.81, 9.9] };

// #919 bruggen: Visvliet (schuin, dek, onder) en de dichtstbijzijnde stadsbrug over water
await scene(919, async () => {
  const [bx, by] = PTS.visvlietBrug; await jump(bx, by, 6000); const z = gh(bx, by);
  cam(bx + 40, by - 40, z + 30, bx, by, z, 60); await shot('visvliet-schuin'); probe('visvliet-schuin', [bx + 40, by - 40, z + 30], [bx, by, z]);
  cam(bx + 14, by, z + 5, bx - 4, by - 8, z + 1.5, 70); await shot('visvliet-dek');
  cam(bx - 6, by - 12, z - 0.5, bx, by, z + 1, 80); await shot('visvliet-onder');
  await jump(stad[0], stad[1], 5000);
  const br = bridgesNear(stad[0], stad[1], 900, (rd) => !rd.tunnel)[0];
  if (!br) { log({ nr: 919, fout: 'geen stadsbrug' }); return; }
  await jump(br.mx, br.my, 5000); // de speler erheen: een verre camera laat anders de buurt opnieuw laden
  const dz = deckZ(br.mx, br.my); const nx = -Math.sin(br.ang), ny = Math.cos(br.ang);
  log({ nr: 919, stadsbrug: { x: Math.round(br.mx), y: Math.round(br.my), len: Math.round(br.len), deck: +dz.toFixed(2), grond: +gh(br.mx, br.my).toFixed(2), naam: br.rd.name || '' } });
  cam(br.mx + nx * 35, br.my + ny * 35, dz + 14, br.mx, br.my, dz, 60); await shot('stad-schuin'); probe('stad-schuin', [br.mx + nx * 35, br.my + ny * 35, dz + 14], [br.mx, br.my, dz]);
  cam(br.mx + nx * 20, br.my + ny * 20, dz + 1.2, br.mx, br.my, dz + 0.5, 70); await shot('stad-zij');
});
// #1192 onderkant van een verhoogd dek (viaduct): de hoogste brug bij de stad, camera eronder omhoog
await scene(1192, async () => {
  await jump(stad[0], stad[1], 4000);
  const cand = bridgesNear(stad[0], stad[1], 2500, (rd) => !rd.tunnel).map((o) => ({ ...o, h: deckZ(o.mx, o.my) - gh(o.mx, o.my) })).filter((o) => o.h > 3.5).sort((u, v) => v.len - u.len);
  let br = cand[0];
  // terugval: een verhoogd dek uit de wereldaudit (Delleweg bij Appingedam, 5,4 m)
  if (!br) { await jump(7008, -12995, 5000); br = bridgesNear(7008, -12995, 200, (rd) => !rd.tunnel).map((o) => ({ ...o, h: deckZ(o.mx, o.my) - gh(o.mx, o.my) })).filter((o) => o.h > 3)[0]; }
  if (!br) { log({ nr: 1192, fout: 'geen viaduct' }); return; }
  await jump(br.mx, br.my, 5000);
  const g = gh(br.mx, br.my), dz = deckZ(br.mx, br.my); const nx = -Math.sin(br.ang), ny = Math.cos(br.ang); const ux = Math.cos(br.ang), uy = Math.sin(br.ang);
  log({ nr: 1192, viaduct: { x: Math.round(br.mx), y: Math.round(br.my), len: Math.round(br.len), hoogte: +(dz - g).toFixed(2), naam: br.rd.name || '' } });
  cam(br.mx + nx * 14, br.my + ny * 14, g + 1.7, br.mx - nx * 6, br.my - ny * 6, dz - 0.5, 75); await shot('onder'); probe('onder', [br.mx + nx * 14, br.my + ny * 14, g + 1.7], [br.mx, br.my, dz]);
  cam(br.mx + nx * 45 + ux * 20, br.my + ny * 45 + uy * 20, g + 3, br.mx, br.my, (g + dz) / 2, 60); await shot('zij');
  cam(br.mx + ux * 8, br.my + uy * 8, dz + 1.7, br.mx + ux * 40, br.my + uy * 40, dz + 1, 70); await shot('dek');
});
// #917 z-fighting: de drie plekken uit de vorige meting (school, Prinsenhof, hoofdstation) en het centrum; de camera staat op
// de dichtstbijzijnde straat en kijkt naar het dichtstbijzijnde pand (dichtbij en op 60 m, waar de dieptestap grover is)
const bCentre = (b) => { const q = b.pts || b.poly || []; let sx = 0, sy = 0; for (const t of q) { sx += t[0]; sy += t[1]; } return q.length ? [sx / q.length, sy / q.length] : [b.x, b.y]; };
const streetView = (x, y) => {
  const rp = map.nearestRoadPoint(x, y, 300, false, true); if (!rp) return null;
  const bs = map.buildingsNear(rp.x, rp.y, 45).map((bd) => ({ bd, c: bCentre(bd) })).filter((o) => Number.isFinite(o.c[0])).sort((u, v) => Math.hypot(u.c[0] - rp.x, u.c[1] - rp.y) - Math.hypot(v.c[0] - rp.x, v.c[1] - rp.y));
  return bs.length ? { sx: rp.x, sy: rp.y, bx: bs[0].c[0], by: bs[0].c[1] } : null;
};
await scene(917, async () => {
  for (const [naam, x, y] of [['centrum', stad[0], stad[1]], ['school', -114, -43], ['prinsenhof', 287, -154], ['station', -87, 966]]) {
    await jump(x, y, 3500); const v = streetView(x, y); if (!v) { log({ nr: 917, plek: naam, fout: 'geen straat of pand' }); continue; }
    const z = gh(v.sx, v.sy); const dx = v.sx - v.bx, dy = v.sy - v.by, L = Math.hypot(dx, dy) || 1;
    cam(v.sx, v.sy, z + 2.5, v.bx, v.by, z + 5, 60); await shot(naam + '-dicht');
    cam(v.bx + dx / L * 60, v.by + dy / L * 60, z + 8, v.bx, v.by, z + 6, 45); await shot(naam + '-60m');
  }
});
// #1193 dorpsgrond: Usquert bij de kerk (ooghoogte en luchtbeeld) en Warffum
await scene(1193, async () => {
  for (const [naam, [x, y]] of [['usquert', PTS.usquert], ['warffum', PTS.warffum], ['marum', PTS.marum]]) {
    await jump(x, y, 6000); const z = gh(x, y);
    cam(x - 14, y - 10, z + 1.7, x + 20, y + 14, z + 1, 70); await shot(naam + '-oog'); probe(naam + '-grond', [x - 14, y - 10, z + 1.7], [x - 4, y - 3, z]);
    cam(x - 40, y - 40, z + 45, x, y, z, 60); await shot(naam + '-lucht'); probe(naam + '-lucht', [x - 40, y - 40, z + 45], [x, y, z]);
  }
});
// #1080 luchtlijn boven de Martinitoren: het hoogteprofiel van de heli (airprofile.js) over de echte, geladen stad, west naar
// oost en noord naar zuid door de toren; per monster de vrije ruimte tussen de lijn en het hoogste dak (of boom) eronder
await scene(1080, async () => {
  const [mx, my] = PTS.martini; await jump(mx, my, 6000);
  const AP = await imp('airprofile');
  for (const [naam, a, b] of [['west-oost', { x: mx - 600, y: my }, { x: mx + 600, y: my }], ['noord-zuid', { x: mx, y: my - 600 }, { x: mx, y: my + 600 }]]) {
    const P = AP.buildAirProfile(map, a, b, {});
    let minVrij = Infinity, waar = null, toren = null;
    for (let i = 0; i < P.n; i++) {
      const sx = Math.min(P.total, P.s0 + i * P.ds); if (P.total - sx < AP.AIR_END_FREE_M) continue;
      const x = a.x + P.ux * sx, y = a.y + P.uy * sx; const t = AP.topAt(map, x, y, AP.AIR_HALF_W);
      const vrij = P.z[i] - t.top; if (vrij < minVrij) { minVrij = vrij; waar = { s: Math.round(sx), top: Math.round(t.top), lijn: Math.round(P.z[i]), naam: t.name }; }
      if (Math.hypot(x - mx, y - my) < 15) toren = { lijn: Math.round(P.z[i]), top: Math.round(t.top), naam: t.name };
    }
    log({ nr: 1080, lijn: naam, onvolledig: P.incomplete, minVrij: Math.round(minVrij), waar, toren });
  }
  const z = gh(mx, my); cam(mx - 260, my + 260, z + 90, mx, my, z + 60, 55); await shot('toren');
});
// #1044 kits op de kaart: M13-kade (kraan en containers) en een stationskit (Warffum)
await scene(1044, async () => {
  const CP = await imp('containerplan');
  const c = CP.M13_CRANE, k = CP.M13_CONTAINER;
  await jump(c.x, c.y, 6000); const z = gh(c.x, c.y);
  // de rekwisieten staan er pas als M13 loopt: zet ze zoals de missie dat doet (heist.js)
  try { const CT = await imp('containerterminal'); log({ nr: 1044, terminal: !!CT.placeContainerTerminal(w, THREE) }); } catch (e) { log({ nr: 1044, fout: 'terminal: ' + e.message }); }
  await sleep(800);
  cam(c.x + 60, c.y + 50, z + 40, (c.x + k.x) / 2, (c.y + k.y) / 2, z, 60); await shot('m13');
  const [sx, sy] = PTS.warffum; await jump(sx, sy, 5000); const zs = gh(sx, sy);
  cam(sx + 45, sy + 45, zs + 30, sx, sy, zs, 60); await shot('station');
});
// #1076 nepinterieurs in de eerste persoon: op straat (ooghoogte 1,7 m), de camera schuift langs de straat terug van het pand
// naar 6, 40, 90 en 140 m en kijkt steeds naar dezelfde gevel (grazende hoek op de lange afstanden)
await scene(1076, async () => {
  const FP = await imp('firstperson').catch(() => null);
  await jump(stad[0], stad[1], 5000); if (FP) { try { FP.setFirstPerson(w, true); } catch (e) { log({ nr: 1076, fout: e.message }); } }
  const v = streetView(stad[0], stad[1]); if (!v) { log({ nr: 1076, fout: 'geen straat of pand' }); return; }
  const rp = map.nearestRoadPoint(v.sx, v.sy, 50, false, true); const P2 = rp.road.pts;
  let ux = P2[P2.length - 1][0] - P2[0][0], uy = P2[P2.length - 1][1] - P2[0][1]; const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
  const z = gh(v.sx, v.sy);
  for (const [tag, d] of [['6m', 6], ['40m', 40], ['90m', 90], ['140m', 140]]) {
    const cx = v.sx + ux * d, cy = v.sy + uy * d; cam(cx, cy, gh(cx, cy) + 1.7, v.bx, v.by, z + 4, 70); await shot(tag);
  }
  if (FP) { try { FP.setFirstPerson(w, false); } catch (e) { /* weg */ } }
});
clearInterval(skipper);
console.log('[wereld-klaar]');
