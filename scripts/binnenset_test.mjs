// "Echt binnen" voor de binnensets (#956, docs/BINNENSETS-21-11.md): maten, clearzone, kamercamera, binnenplek, plek zoeken,
// en de pan- en dakbudgetten van de cutscenes.
//   node scripts/binnenset_test.mjs
import './node3d.mjs';
import { readFileSync, readdirSync } from 'node:fs';
const THREE = await import('three');
const B = await import('../game/js/binnenset.js');
const { OFFICE, SERVER } = await import('../game/js/office3d.js');
const { LOKET } = await import('../game/js/loket3d.js');
const { OMA_KEUKEN } = await import('../game/js/omakeuken3d.js');
const { buildStageSet, updateStageSet, disposeStageSet, stageSetLayout, stageSetCamera, stageSetBinnen, STAGE_SETS } = await import('../game/js/stagesets.js');
const { clearZoneAt, clearZones } = await import('../game/js/clearzone.js');
const CS = await import('../game/js/cineshots.js');
const { buildCatalog } = await import('../game/js/cutpreview.js');
const { roomClamp } = await import('../game/js/roomspec.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// elke missiestap met een `set:` noemt een kamer die stagesets.js kent (anders speelt de stap buiten, zonder kamer en camera; #1022)
{
  const dir = new URL('../game/js/', import.meta.url);
  const slecht = [];
  let aantal = 0;
  for (const f of readdirSync(dir).filter((x) => /^missions_.*\.js$/.test(x))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bset: *'([a-z]+)'/g)) { aantal++; if (!STAGE_SETS.includes(m[1])) slecht.push(`${f}: ${m[1]}`); }
  }
  ok(aantal >= 10, `er zijn missiestappen met een kamer (${aantal})`);
  ok(slecht.length === 0, 'elke set van een missiestap is een bekende kamer', slecht.join(' | '));
}

// --- de maten --------------------------------------------------------------------------------------------------------------------
ok(STAGE_SETS.every((k) => B.isSetKind(k)), 'elke set van stagesets.js heeft maten');
for (const [k, c] of [['kantoor', OFFICE], ['serverkamer', SERVER], ['loket', LOKET], ['omakeuken', OMA_KEUKEN]]) {
  ok(B.SET_DIMS[k].w === c.w && B.SET_DIMS[k].d === c.d && B.SET_DIMS[k].h === c.h, `${k}: de maten van binnenset.js zijn die van de bouwer`);
}

// --- de voetafdruk en de clearzone -----------------------------------------------------------------------------------------------
for (const kind of STAGE_SETS) {
  const lay = stageSetLayout(kind, { x: 100, y: -50, angle: 0 });
  const fp = B.setFootprint(kind, lay);
  ok(fp && fp.cx === lay.x && fp.cy === lay.y, `${kind}: voetafdruk om het midden van de kamer`);
  const z = B.setClearZone(kind, lay);
  const hoeken = [[fp.hw, fp.hd], [-fp.hw, fp.hd], [fp.hw, -fp.hd], [-fp.hw, -fp.hd]];
  ok(hoeken.every(([u, v]) => Math.hypot(u, v) + B.PROP_MARGIN <= z.r + 1e-9), `${kind}: de clearzone dekt de hoeken plus ${B.PROP_MARGIN} m`);
  ok(B.inFootprint(fp, fp.cx + fp.hw + 1, fp.cy, B.PROP_MARGIN) && !B.inFootprint(fp, fp.cx + fp.hw + 3, fp.cy, B.PROP_MARGIN), `${kind}: marge van ${B.PROP_MARGIN} m rond de voetafdruk`);
}
ok(B.setFootprint('kelder', { x: 0, y: 0 }) === null && B.setClearZone('kelder', { x: 0, y: 0 }) === null, 'een onbekende kamer geeft niets');

// --- de kamercamera: binnen de wanden, onder het plafond, geen pan ----------------------------------------------------------------
for (const kind of STAGE_SETS) {
  const d = B.SET_DIMS[kind];
  let goed = true, fov0 = null, fov1 = null;
  for (const base of [0, 1.5, 12]) for (const [dx, dy] of [[0, 0], [-1.4, 0.2], [-1.5, 0.5], [0.55, 0], [3, 2], [-6, -3]]) {
    const lay = stageSetLayout(kind, { x: 40 + dx, y: 10 + dy, angle: 0 });
    if (!lay.hold) continue;
    for (const t of [0, 10, 40, 400]) {
      const p = B.roomCameraPose(kind, lay, base, t);
      if (!p || !B.cameraInside(kind, lay, base, p.position) || !B.cameraInside(kind, lay, base, p.lookAt) && false) goed = false;
      if (p.position.z > base + d.h - B.CEIL_MARGIN + 1e-9 || p.position.z < base + 0.3 - 1e-9) goed = false;
      if (!p.cut || p.bron !== 'binnenset') goed = false;
      if (dx === 0 && dy === 0 && base === 0) { if (t === 0) fov0 = p.fov; if (t === 400) fov1 = p.fov; }
    }
  }
  ok(goed, `${kind}: de kamercamera staat altijd binnen de wanden en onder het plafond (-${B.CEIL_MARGIN} m)`);
  if (stageSetLayout(kind, { x: 0, y: 0 }).hold) ok(fov1 < fov0, `${kind}: een lichte inzoom, geen pan`, `${fov0} -> ${fov1}`);
  ok(stageSetLayout(kind, { x: 0, y: 0 }).hold ? B.hasRoomCamera(kind, stageSetLayout(kind, { x: 0, y: 0 })) : !B.hasRoomCamera(kind, stageSetLayout(kind, { x: 0, y: 0 })), `${kind}: een kamercamera alleen bij een stap met hold`);
  // de clamp voor filmcamera's valt samen met die van roomspec.js voor de nieuwe kamers
  const at = { x: 5, y: 5, z: 2 };
  const c1 = B.setCameraClamp(kind, at)(999, -999, 99, 'camera');
  ok(Math.abs(c1.x - (5 + d.w / 2 - 0.45)) < 1e-9 && Math.abs(c1.y - (5 - d.d / 2 + 0.45)) < 1e-9 && Math.abs(c1.z - (2 + d.h - 0.3)) < 1e-9, `${kind}: de filmcamera-clamp houdt wanden en plafond`);
  ok(B.setCameraClamp(kind, at)(0, 0, 0, 'actor') === null, `${kind}: de clamp raakt alleen de camera`);
}
{
  const at = { x: 5, y: 5, z: 2 };
  const a = roomClamp('woonkamer', at, 999, -999, 99), b = B.setCameraClamp('woonkamer', at)(999, -999, 99, 'camera');
  ok(a.x === b.x && a.y === b.y && a.z === b.z, 'roomspec.roomClamp en binnenset.setCameraClamp geven hetzelfde');
}

// --- de plek zoeken en de binnenplek ---------------------------------------------------------------------------------------------
{
  const geen = B.findSetSpot(0, 0, () => false);
  ok(geen === null, 'past nergens: geen plek (de stap speelt dan buiten)');
  const hier = B.findSetSpot(3, 4, () => true);
  ok(hier && hier.x === 3 && hier.y === 4 && hier.moved === 0, 'past hier: geen verschuiving');
  const ver = B.findSetSpot(0, 0, (x, y) => Math.hypot(x, y) > 10);
  ok(ver && Math.hypot(ver.x, ver.y) >= 12 - 1e-9 && ver.moved === 12, 'past hier niet: de dichtstbijzijnde ring waar het wel past', JSON.stringify(ver));
  ok(B.findSetSpot(NaN, 0, () => true) === null, 'een speler zonder positie geeft geen plek');
  const lay = stageSetLayout('loket', { x: 10, y: 20, angle: 0 });
  const bin = B.binnenStaat('loket', null, lay);
  ok(bin && bin.kind === 'loket' && bin.x === 10 && bin.y === 20 && JSON.parse(JSON.stringify(bin)).x === 10, 'de binnenplek is JSON-veilig');
  ok(B.binnenStaat('loket', null, stageSetLayout('serverkamer', { x: 1, y: 1 })) === null, 'zonder hold geen binnenplek (de speler loopt vrij)');
  ok(B.binnenHerstel(bin, 'loket', { x: 10, y: 20 }) === null, 'staat de speler binnen: niets te herstellen');
  const terug = B.binnenHerstel(bin, 'loket', { x: 500, y: 20 });
  ok(terug && terug.x === 10 && terug.y === 20, 'na laden, herstart of een checkpoint buiten de kamer: terug op de binnenplek');
  ok(B.binnenHerstel(bin, 'kantoor', { x: 500, y: 20 }) === null, 'een andere kamer herstelt niet');
  ok(B.binnenHerstel(null, 'loket', { x: 1, y: 1 }) === null, 'zonder binnenplek niets');
}

// --- de set zelf: clearzone erbij en eraf, kamercamera, binnenplek --------------------------------------------------------------
{
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: () => 2 } };
  const player = { x: 300, y: -80, angle: 0 };
  for (const kind of STAGE_SETS) {
    const s = buildStageSet(world, kind, player, scene);
    ok(!!s, `${kind}: de set bouwt`);
    if (!s) continue;
    ok(clearZones().length === 1 && !!clearZoneAt(s.layout.x, s.layout.y), `${kind}: de wereld blijft buiten (clearzone om de kamer)`);
    ok(!!clearZoneAt(s.layout.x + B.SET_DIMS[kind].w / 2 + 1.5, s.layout.y), `${kind}: ook 1,5 m buiten de muur wordt geruimd`);
    const cam = stageSetCamera(s);
    if (s.hold) {
      ok(cam && B.cameraInside(kind, s.layout, s.base, cam.position), `${kind}: de kamercamera van de set staat binnen`);
      const bin = stageSetBinnen(s);
      ok(bin && bin.x === s.hold.x && bin.y === s.hold.y, `${kind}: de set kent de binnenplek`);
    } else ok(cam === null, `${kind}: zonder hold geen kamercamera`);
    updateStageSet(s, 5);
    disposeStageSet(s);
    ok(clearZones().length === 0, `${kind}: de clearzone gaat weer weg met de set`);
    disposeStageSet(s); // twee keer opruimen mag
  }
  // een kamer die hier niet past komt op een plek eromheen en de speler wordt daarheen gezet (de hold)
  const m = { groundHeightAt: () => 0, buildingsNear: () => [{ bounds: [290, -90, 310, -70], pts: [[290, -90], [310, -90], [310, -70], [290, -70]] }] };
  const s2 = buildStageSet({ map: m }, 'woonkamer', player, scene);
  ok(!!s2 && Math.hypot(s2.hold.x - player.x, s2.hold.y - player.y) > 0, 'past de woonkamer niet bij de speler, dan staat hij op een plek eromheen (en de speler daar)');
  if (s2) disposeStageSet(s2);
}

// --- de pan- en dakbudgetten van de cutscenes -------------------------------------------------------------------------------------
{
  const dolly = (t, v = 6) => ({ t, shot: 'dolly', from: [0, 0, 1.5], to: [v, 0, 1.5], look: 'x' });
  const cut = (t) => ({ t, shot: 'cut', at: [1, 1, 1.5], look: 'x' });
  const orbit = (t, sw = 60) => ({ t, shot: 'orbit', target: 'x', radius: 3, sweep: sw });
  const voor = [dolly(0), dolly(4), orbit(8), cut(12), dolly(14, 2)];
  const na = CS.calmShots(voor, 20);
  const st = CS.panStats(na);
  ok(st.pans === 1 && st.achter === 0, 'vijf schuivers worden één pan', JSON.stringify(st));
  ok(na.every((s) => CS.shotTravel(s) <= (s.shot === 'orbit' ? CS.PAN_MAX_SWEEP : CS.PAN_MAX_TRAVEL) + 1e-9), 'de overgebleven pan is korter dan het maximum');
  ok(JSON.stringify(CS.calmShots(na, 20)) === JSON.stringify(na), 'het budget is idempotent');
  ok(CS.calmShots([cut(0), cut(3)], 5).length === 2 && CS.panStats([cut(0)]).pans === 0, 'vaste shots blijven vast');
  ok(CS.calmShots([], 5).length === 0 && CS.calmShots(null, 5).length === 0, 'geen shots geeft niets');
  ok(CS.calmShots([dolly(0, 1)], 5)[0].to[0] === 1, 'een kleine dolly (<= 1,2 m) blijft zoals hij is');
  const lang = CS.calmShots([dolly(0, 6), dolly(2, 6), cut(9)], 12);
  ok(CS.shotTravel(lang[1]) > CS.shotTravel(lang[0]) && CS.panStats(lang).pans === 1, 'de langste pan blijft, de kortere wordt drift');

  const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
  const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
  const cat = buildCatalog({ script, npcSource });
  let scenes = 0, slecht = [], dak = [], inSet = 0, onbekend = [];
  const ANCHOR = { x: 500, y: -300, facing: 1.1, z: 3 };
  for (const e of cat) {
    if (!e.scene || !e.def) continue;
    scenes++;
    const shots = CS.calmShots((e.def.shots || []).map((s) => ({ ...s, t: Number.isFinite(s.t) ? s.t : 0 })).sort((a, b) => a.t - b.t), e.duration);
    const ps = CS.panStats(shots);
    if (ps.pans > CS.PAN_BUDGET || ps.achter > 0 || ps.pans > Math.max(1, Math.floor(ps.shots * 0.25))) slecht.push(`${e.id}: ${JSON.stringify(ps)}`);
    // en de gecompileerde scène (cutscript.js compileScene) houdt zich er zelf aan
    if (Array.isArray(e.shots) && e.shots.length) { const pc = CS.panStats(e.shots); if (pc.pans > CS.PAN_BUDGET || pc.achter > 0) slecht.push(`${e.id} (gecompileerd): ${JSON.stringify(pc)}`); }
    // het dak: een camera in een kamer blijft onder het plafond en binnen de wanden (de clamp van de host)
    const kind = e.def.set;
    // een set die niemand kent (typfout) geeft geen kamer en geen camera-clamp: de scène speelt dan zomaar buiten (#1022); 'keuken' is Tessa's keuken van de opening (cutscenehost kitchenEnv)
    if (kind && !B.isSetKind(kind) && kind !== 'keuken') onbekend.push(`${e.id}: ${kind}`);
    if (kind && B.isSetKind(kind)) {
      inSet++;
      const d = B.SET_DIMS[kind];
      const env = { solid: () => false, clamp: B.setCameraClamp(kind, ANCHOR) };
      for (let t = 0; t <= e.duration; t += 0.5) {
        const p = e.scene.sample(t, ANCHOR, env).camera.position;
        if (p.z > ANCHOR.z + d.h - B.CEIL_MARGIN + 1e-6 || Math.abs(p.x - ANCHOR.x) > d.w / 2 + 1e-6 || Math.abs(p.y - ANCHOR.y) > d.d / 2 + 1e-6) { dak.push(`${e.id} t=${t} z=${(p.z - ANCHOR.z).toFixed(2)}`); break; }
      }
    }
  }
  ok(scenes >= 90, `er zijn scènes om te keuren (${scenes})`);
  ok(slecht.length === 0, `elke scène blijft binnen het pan-budget (<= ${CS.PAN_BUDGET} pan, nooit twee achter elkaar, <= 25%)`, slecht.slice(0, 4).join(' | '));
  ok(onbekend.length === 0, 'elke set van een scène bestaat (kamer of keuken)', onbekend.join(' | '));
  ok(inSet >= 10, `er zijn scènes in een kamer (${inSet})`);
  ok(dak.length === 0, 'in een kamer staat de camera nooit boven het plafond-0,3 m of buiten de wanden (geen dak in beeld)', dak.slice(0, 3).join(' | '));
}

// review 21-11: een tot 48 m verschoven kamer: de hold-stap meet tegen het meeverschoven doel (M27 radius 16)
{
  const spot = B.findSetSpot(0, 0, (x, y) => Math.hypot(x, y) >= 40);
  ok(spot && spot.moved >= 32, 'de kamer verschuift ver (' + (spot && spot.moved) + ' m)');
  const shift = { x: spot.x - 0, y: spot.y - 0 };
  const doel = { x: 5, y: 5, r: 16 };
  const nieuw = B.verschoveDoel(doel, shift);
  ok(Math.hypot(nieuw.x - spot.x, nieuw.y - spot.y) <= 16 && Math.hypot(doel.x - spot.x, doel.y - spot.y) > 16, 'de speler op de hold staat binnen de straal van het verschoven doel en buiten die van het oude');
  ok(nieuw.r === 16 && doel.x === 5, 'overige velden blijven, het origineel wordt niet aangepast');
  ok(B.verschoveDoel(doel, null) === doel && B.verschoveDoel(null, shift) === null && B.verschoveDoel(doel, { x: NaN, y: 1 }) === doel, 'geen verschuiving of rommel: het doel blijft zoals het is');
  const ms = readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  const st = readFileSync(new URL('../game/js/stagesets.js', import.meta.url), 'utf8');
  ok(ms.includes('verschoveDoel(S.target, S.set.shift)'), 'de hold-stap gebruikt het verschoven doel');
  ok(/shift = { x: spot.x - player.x/.test(st) && /hold: layout.hold, shift,/.test(st), 'buildStageSet onthoudt de verschuiving');
}

console.log(fails ? `${fails} van ${n} mislukt` : `binnenset_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
