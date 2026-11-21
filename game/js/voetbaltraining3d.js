// De 3D-props van de trainingsminigames (#1109): kegels, hoepels, een doeltje met hoekdoeltjes, de bal en een aanvaller van een kegel. Eenvoudig low-poly en met een vast budget:
// één gedeelde geometrie en materiaal per soort, hooguit MAX_MESHES objecten, geen allocatie per frame. THREE komt als argument binnen zodat scripts/voetbal_training3d_test.mjs
// de props met een mock kan bouwen (budget en NaN) zonder browser. Het veld: x opzij, z vooruit; `origin` is de plek in de wereld en `heading` de richting (rad) van het veld.
export const MAX_MESHES = 48;
const COLORS = { kegel: 0xf08a2e, kegelOk: 0x46b36a, kegelFout: 0xe8523a, hoepel: 0xf2b82a, doel: 0xf4f1e4, hoek: 0xe8523a, bal: 0xffffff, aanvaller: 0x3b6fd1, gras: 0x4f9a4a };
const finite = (v) => (Number.isFinite(v) ? v : 0);

export function buildDrillProps(THREE, state, origin = { x: 0, y: 0 }, heading = 0, ground = 0) {
  heading = finite(heading); ground = finite(ground);
  const group = new THREE.Group();
  group.name = `voetbaltraining-${state.id}`;
  const geos = {}, mats = {}, meshes = [];
  const geo = (k, make) => geos[k] || (geos[k] = make());
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const add = (g, c, x, y, z, key) => {
    const m = new THREE.Mesh(g, mat(c));
    m.position.set(finite(x), finite(y), finite(z)); m.name = key || '';
    group.add(m); meshes.push(m); return m;
  };
  const kegel = () => geo('kegel', () => new THREE.ConeGeometry(0.28, 0.7, 8));
  const bal = () => geo('bal', () => new THREE.SphereGeometry(0.22, 10, 8));
  const ring = () => geo('ring', () => new THREE.TorusGeometry(1.6, 0.07, 6, 18));
  const paal = () => geo('paal', () => new THREE.BoxGeometry(0.12, 1, 0.12));
  // de wereldplek van een veldpunt: x opzij, z vooruit, gedraaid naar `heading`
  const at = (x, z) => { const c = Math.cos(heading), s = Math.sin(heading); return { x: finite(origin.x) + c * x - s * z, y: finite(origin.y) + s * x + c * z }; };
  const place = (m, x, z, up = 0) => { const q = at(x, z); m.position.set(q.x, ground + up, q.y); };   // scene: x, hoogte, y (de wereld-y wordt scene-z zoals elders in het spel)

  const live = {};                                             // wat per frame beweegt: bal, aanvaller, de kegel-staat
  if (state.id === 'slalom') {
    state.cones.forEach((c, i) => { live['k' + i] = add(kegel(), COLORS.kegel, 0, 0, 0, 'kegel'); place(live['k' + i], c.x, c.z, 0.35); });
    live.speler = add(bal(), COLORS.bal, 0, 0, 0, 'bal');
  } else if (state.id === 'schot') {
    // het doel op 11 m: twee palen en een lat, de vier hoekdoeltjes (kegels) en de bal
    const gz = 11, w = 7.32, h = 2.44;
    for (const sx of [-1, 1]) { const m = add(paal(), COLORS.doel, 0, 0, 0, 'paal'); m.scale.set(1, h, 1); place(m, sx * w / 2, gz, h / 2); }
    const lat = add(geo('lat', () => new THREE.BoxGeometry(w, 0.12, 0.12)), COLORS.doel, 0, 0, 0, 'lat'); place(lat, 0, gz, h);
    state.targets.forEach((t, i) => { live['t' + i] = add(kegel(), COLORS.hoek, 0, 0, 0, 'hoek'); place(live['t' + i], t.u * w / 2, gz, Math.max(0.35, t.v * h)); live['t' + i].visible = i === state.taken; });
    live.bal = add(bal(), COLORS.bal, 0, 0, 0, 'bal'); place(live.bal, 0, 0, 0.22);
    live.goal = { z: gz, w, h };
  } else if (state.id === 'pass') {
    state.hoops.forEach((hp, i) => {
      const m = add(ring(), COLORS.hoepel, 0, 0, 0, 'hoepel'); place(m, hp.x, hp.z, 0.08); m.rotation.x = Math.PI / 2; live['h' + i] = m;
    });
    live.bal = add(bal(), COLORS.bal, 0, 0, 0, 'bal'); place(live.bal, 0, 0, 0.22);
  } else if (state.id === 'conditie') {
    state.pts.forEach((pt, i) => { for (const sx of [-1, 1]) { const m = add(kegel(), COLORS.kegel, 0, 0, 0, 'kegel'); place(m, sx * 3.2, pt.z, 0.35); live['p' + i + (sx < 0 ? 'l' : 'r')] = m; } });
    live.speler = add(bal(), COLORS.bal, 0, 0, 0, 'bal');
  } else {
    // dekken: twee doelkegels op de doellijn en de aanvaller als hoge kegel
    for (const sx of [-1, 1]) { const m = add(kegel(), COLORS.kegel, 0, 0, 0, 'kegel'); place(m, sx * 4, state.goalZ, 0.35); }
    live.aanvaller = add(kegel(), COLORS.aanvaller, 0, 0, 0, 'aanvaller'); live.aanvaller.scale.set(1.2, 1.8, 1.2);
    live.speler = add(bal(), COLORS.bal, 0, 0, 0, 'bal');
  }
  if (meshes.length > MAX_MESHES) throw new Error(`te veel props: ${meshes.length}`);

  // één plek voor de speler in veldmaat: wordt door de uitvoerder gezet; de props volgen de staat
  const api = {
    group, meshes, live,
    stats: () => ({ meshes: meshes.length, geometries: Object.keys(geos).length, materials: Object.keys(mats).length }),
    // een kegel kleurt groen als hij goed gepasseerd is, rood als hij geraakt is; de bal en de aanvaller volgen de staat
    update(s) {
      if (s.id === 'slalom') s.cones.forEach((c, i) => { const m = live['k' + i]; if (m) m.material = mat(c.done ? COLORS.kegelOk : COLORS.kegel); });
      if (s.id === 'schot') s.targets.forEach((t, i) => { if (live['t' + i]) live['t' + i].visible = i === Math.min(s.taken, s.targets.length - 1) && !s.done; });
      if (s.id === 'pass') s.hoops.forEach((hp, i) => { const m = live['h' + i]; if (m) { m.material = mat(hp.hit === true ? COLORS.kegelOk : hp.hit === false ? COLORS.kegelFout : COLORS.hoepel); place(m, hp.x, hp.z, 0.08); } });
      if (s.id === 'pass' && live.bal) place(live.bal, s.ball.x, s.ball.z, 0.22);
      if (s.id === 'schot' && live.bal) place(live.bal, 0, 0, 0.22);
      if (s.id === 'conditie') s.pts.forEach((pt, i) => { for (const k of ['l', 'r']) { const m = live['p' + i + k]; if (m) m.material = mat(pt.done ? COLORS.kegelOk : COLORS.kegel); } });
      if ((s.id === 'slalom' || s.id === 'conditie' || s.id === 'dekken') && live.speler) place(live.speler, s.p.x, s.p.z, 0.22);
      if (s.id === 'dekken' && live.aanvaller) place(live.aanvaller, s.a.x, s.a.z, 0.63);
    },
    dispose() {
      for (const m of meshes) group.remove(m);
      for (const g of Object.values(geos)) if (g.dispose) g.dispose();
      for (const m of Object.values(mats)) if (m.dispose) m.dispose();
      meshes.length = 0;
    },
  };
  api.update(state);
  return api;
}
