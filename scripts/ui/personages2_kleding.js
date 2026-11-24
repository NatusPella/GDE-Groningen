// Personages 2 (24-11): kleding en verhaalfiguren op de modulaire mensen. Met de vlag mensen=oud is het hetzelfde blad op de procedurele
// mensen (het voor-beeld). Per rij: figuren van voren, dan dezelfde van achteren. Draait als --scenes van scripts/qa/personages2_run.mjs.
//   node scripts/qa/personages2_run.mjs --scenes=scripts/ui/personages2_kleding.js --out=<map in de worktree> [--flags=mensen=oud]
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] p2k-' + name); await sleep(700); };
const note = (k, v) => console.error('[p2] ' + k + ' ' + JSON.stringify(v));
const S3 = () => window.__scene3d;

await (async () => {
  try {
    const cine = await imp('cinematics');
    for (let i = 0; i < 240 && !ready() && !cine.isCinematicActive(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
    for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
    for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
    clearInterval(skipper);
    await sleep(3000);
    const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
    w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
    const { P } = await imp('worldframe'); const FP = await imp('firstperson');
    const MP = await imp('models3d_people');
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; };
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    let pose = null;
    const cam = (x, y, z, lx, ly, lz, fov = 40) => {
      pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'p2-view', duration: 900, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => (typeof pose === 'function' ? pose() : pose) });
    };
    const camOff = () => { pose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
    const jump = async (x, y, settle = 6000) => {
      camOff(); if (p.inVehicle) p.exitVehicle(map, w);
      p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
      for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
      for (let i = 0; i < 400 && loading(); i++) await sleep(100);
      await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
    };
    const fout = []; window.addEventListener('error', (e) => fout.push(String(e.message).slice(0, 160)));
    const CL = await imp('clothing'); const CD = await imp('clothingdata'); const MS = await imp('missionstory'); const SC = await imp('storycast');
    const FK = await imp('footballkit'); const PG = await imp('pedgeom');
    const stad = P(100, 77);
    await jump(stad[0], stad[1], 4000);
    let spot = null;
    outer: for (let ring = 0; ring <= 12; ring++) for (let a = 0; a < 16; a++) {
      const ox = p.x + Math.cos(a / 16 * 6.283) * ring * 12, oy = p.y + Math.sin(a / 16 * 6.283) * ring * 12;
      for (let h = 0; h < 8; h++) {
        const dx = Math.cos(h * Math.PI / 4), dy = Math.sin(h * Math.PI / 4); let free = true;
        for (let f = -2; f <= 14 && free; f += 3) for (let l = -9; l <= 9 && free; l += 3) { const x = ox + dx * f - dy * l, y = oy + dy * f + dx * l; if (PG.isInsideBuilding(map, x, y) || PG.isOnRoad(map, x, y, 1, ['major', 'normal'])) free = false; }
        if (free) { spot = { x: ox, y: oy, dx, dy }; break outer; }
      }
    }
    if (!spot) throw new Error('geen open plek');
    await jump(spot.x, spot.y, 4000);
    p.x = spot.x; p.y = spot.y;
    FP.setFirstPerson(w, false);
    const group = new THREE.Group(); S3().scene.add(group);
    const rig = [];
    let last = performance.now();
    const loop = setInterval(() => { const n = performance.now(), dt = Math.min(0.05, (n - last) / 1000); last = n; for (const m of rig) MP.animatePersonWalk(m, 0, dt); }, 16);
    const clear = () => { for (const m of rig) group.remove(m); rig.length = 0; };
    const hash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
    // een rij van n figuren op afstand dist, kijkend naar de camera; twee beelden: voor en (optioneel) achter
    const row = async (naam, builds, back = true, dist = 4.2) => {
      clear();
      const n = builds.length, gap = 1.25;
      builds.forEach((b, i) => {
        let m; try { m = b(); } catch (e) { note('fout-' + naam + '-' + i, String(e && e.message || e).slice(0, 120)); return; }
        const lat = (i - (n - 1) / 2) * gap, x = spot.x + spot.dx * dist - spot.dy * lat, y = spot.y + spot.dy * dist + spot.dx * lat;
        m.position.set(x, gh(x, y), y); m.rotation.y = -Math.atan2(-spot.dy, -spot.dx);
        group.add(m); rig.push(m);
      });
      await sleep(900);
      const cx = spot.x + spot.dx * dist, cy = spot.y + spot.dy * dist, gz = gh(cx, cy);
      cam(spot.x, spot.y, gz + 1.3, cx, cy, gz + 0.95, Math.min(62, 24 + n * 5));
      await shot(naam + '-voor', 700);
      if (back) {
        for (const m of rig) m.rotation.y += Math.PI;
        await sleep(300);
        await shot(naam + '-achter', 500);
      }
      camOff();
    };
    const app = (ch) => (ch === 'anita' ? MP.ANITA_APPEARANCE : MP.TAMMO_APPEARANCE);
    const items = (slot) => CD.ITEMS.filter((it) => it.slot === slot);
    const piece = (slot, r1, r2) => { const l = items(slot); const it = l[Math.floor(r1 * l.length)]; return it.id + '.' + it.colors[Math.floor(r2 * it.colors.length)]; };
    // 1. de kledingkast: 24 combinaties per personage (top, onderlijf, schoenen, vaak een jas, hoed, tas, bril, sjaal), in rijen van 6
    for (const ch of ['tammo', 'anita']) {
      for (let r = 0; r < 4; r++) {
        const builds = [];
        for (let i = 0; i < 6; i++) {
          const k = r * 6 + i, h = (j) => hash(k * 7 + (ch === 'anita' ? 3 : 1), j);
          const worn = { top: piece('top', h(1), h(2)), bottom: piece('bottom', h(3), h(4)), shoes: piece('shoes', h(5), h(6)) };
          if (h(7) < 0.45) worn.outer = piece('outer', h(8), h(9));
          if (h(10) < 0.35) worn.hat = piece('hat', h(11), h(12));
          if (h(13) < 0.25) worn.back = piece('back', h(14), h(15));
          if (h(16) < 0.2) worn.neck = piece('neck', h(17), h(18));
          if (h(19) < 0.2) worn.glasses = piece('glasses', h(20), h(21));
          builds.push(() => { const a = app(ch); const o = { ...a, ...CL.outfitToLook(worn, a) }; return MP.buildPersonMesh(o.shirt, o.skin, o); });
        }
        await row('kast-' + ch + '-' + (r + 1), builds, r < 2);
      }
    }
    // 2. verhaalfiguren: Tammo, Tessa, Jelle, Femke, Gerda, Rikus, Berend en de bijrollen
    note('npc', Object.keys(MS.NPC));
    const star = ['berend', 'rikus', 'jelle', 'femke', 'gerda', 'mem', 'beppe', 'lieke', 'kind'].filter((k) => MS.NPC[k]);
    const cast = [() => MP.buildPersonMesh(MP.TAMMO_APPEARANCE.shirt, MP.TAMMO_APPEARANCE.skin, MP.TAMMO_APPEARANCE), () => MP.buildPersonMesh(MP.ANITA_APPEARANCE.shirt, MP.ANITA_APPEARANCE.skin, MP.ANITA_APPEARANCE),
      ...star.map((k) => () => MP.buildPersonMesh(MS.NPC[k].shirt, MS.NPC[k].skin, MS.NPC[k])),
      ...[SC.JELLE_LOOK, SC.DURK_LOOK, SC.DOUWE_LOOK, SC.RIKUS_LOOK, SC.MEM_LOOK, SC.BEPPE_LOOK, SC.ROTOR_LOOK, SC.ROELF_LOOK, SC.HILJE_LOOK].map((L) => () => MP.buildPersonMesh(L.shirt, L.skin, L))];
    // en alle andere figuren uit missionstory.js NPC (Femke, Gerda-achtigen, de bijrollen), in rijen van negen
    const rest = Object.keys(MS.NPC).filter((k) => !star.includes(k)).map((k) => () => MP.buildPersonMesh(MS.NPC[k].shirt, MS.NPC[k].skin, MS.NPC[k]));
    const all = [...cast, ...rest];
    for (let i = 0; i < all.length; i += 9) await row('cast-' + (i / 9 + 1), all.slice(i, i + 9), false, 5.2);
    // 2b. accessoires van dichtbij: bril, zonnebril, sjaal, rugzak, schoudertas, pet en platte pet
    const acc = [{ glasses: true }, { glasses: true, shades: true }, { scarf: true, scarfColor: 0xc9a227 }, { bag: 'backpack', bagColor: 0x2f3b52 }, { bag: 'shoulder', bagColor: 0x6b2a24 }, { hat: 'cap', hatColor: 0x3a4d6e }, { hat: 'flatcap', hatColor: 0x7a6a4a }];
    await row('accessoires', acc.flatMap((lk, i) => [0, 1].map((v) => () => MP.buildPersonMesh(0x6a8a9a, 0xd9a47a, { seed: 120 + i * 3 + v, variant: v ? 'female' : 'male', look: { top: 'tee', bottom: 'jeans', ...lk } }))), true, 4.8);
    // 3. rolkleding (loopbaan) en uniformen
    const roles = ['voetganger', 'chauffeur', 'ambulance', 'voetballer', 'toerist', 'feestganger', 'boer', 'student'];
    for (let r = 0; r < 2; r++) await row('rollen-' + (r + 1), roles.slice(r * 4, r * 4 + 4).flatMap((role, j) => [0, 1].map((v) => () => MP.buildPersonMesh(0x6a6a6a, 0xd9a47a, { seed: 40 + j * 5 + v, variant: v ? 'female' : 'male', role }))), false);
    await row('uniformen', [() => MP.buildPersonMesh(0x1f3f8f, 0xd9a47a, { seed: 3, cop: true, variant: 'male' }), () => MP.buildPersonMesh(0x1f3f8f, 0xd9a47a, { seed: 9, cop: true, variant: 'female' }), () => MP.buildPersonMesh(0x1c3fae, 0xd9a47a, { seed: 4, variant: 'male' })], true);
    // 4. voetbalkleding: shirt met patroon, rugnummer, naamstrook en sponsor; veldspelers en keeper
    const teams = [{ id: 'a', kleur: 0xc8261e, accent: 0xffffff, patroon: 'brede-streep', naam: 'A' }, { id: 'b', kleur: 0x1f4fa8, accent: 0xf2c200, patroon: 'helften', naam: 'B' }, { id: 'c', kleur: 0x2f8a4a, accent: 0xffffff, patroon: 'hoepels', naam: 'C' }, { id: 'd', kleur: 0xffffff, accent: 0x111111, patroon: 'smalle-streep', naam: 'D' }];
    const kit = (t, o, seed) => { const al = FK.actorLook(t, { ...o, seed, name: true }); return MP.buildPersonMesh(al.shirt, 0xd9b48f, { variant: 'male', seed, pants: al.pants, shoes: al.shoes, shirtBands: al.shirtBands, look: { ...al.look, age: 'adult', umbrella: null } }); };
    const kitBuilds = teams.map((t, i) => () => kit(t, { level: i % 2 ? 'prof' : 'amateur', role: 'veld', number: 7 + i * 4 }, 9811 + i));
    kitBuilds.push(() => kit(teams[0], { level: 'prof', role: 'keeper', number: 1 }, 5));
    await row('voetbal', kitBuilds, true);
    clearInterval(loop); clear(); S3().scene.remove(group); camOff();
    note('procedureel-bij-bouw', MP.proceduralStats ? MP.proceduralStats() : null);
    note('fouten', fout.slice(0, 8));
  } catch (er) { note('fout', String(er && er.stack || er).slice(0, 500)); }
})();
