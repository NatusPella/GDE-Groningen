// #955/#956: de binnensets (kantoor, serverkamer, het Loket en Oma's keuken) en de
// kamer die een missiestap om de speler zet (stagesets.js).
//   node scripts/stagesets_test.mjs
// De indeling is puur; de set wordt in een eigen THREE.Scene gebouwd (geen spel, geen DOM).
import './node3d.mjs';
// three en de spelsets pas hierna laden: node3d zet de CDN-verwijzing naar de vendored kopie
// pas bij het importeren, en statische imports worden vóór de body van dit bestand opgelost.
const THREE = await import('three');
const { buildOffice, buildServerRoom, OFFICE, SERVER } = await import('../game/js/office3d.js');
const { buildLoket, LOKET } = await import('../game/js/loket3d.js');
const { buildOmaKitchen, OMA_KEUKEN } = await import('../game/js/omakeuken3d.js');
const { buildStageSet, updateStageSet, disposeStageSet, stageSetLayout, STAGE_SETS } = await import('../game/js/stagesets.js');
const { sceneSpec } = await import('../game/js/cutscenes_akte1.js');
const { buildAkte5Defs, applyAkte5 } = await import('../game/js/missions_akte5.js');
const { buildNieuwDefs } = await import('../game/js/missions_nieuw.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// --- de indeling -------------------------------------------------------------
{
  const player = { x: 10, y: 20, angle: 1.2 };
  const kantoor = stageSetLayout('kantoor', player);
  ok(kantoor && Math.abs(kantoor.x - 10.55) < 1e-9 && kantoor.y === 20, 'het kantoor staat met de speler 0,55 m voor het midden');
  ok(kantoor.hold && kantoor.hold.x === 10 && kantoor.hold.y === 20 && kantoor.hold.angle === 0, 'de speler blijft bij zijn stoel staan');
  const server = stageSetLayout('serverkamer', player);
  ok(server && server.x === 10 && server.y === 20 && server.hold === null, 'de serverkamer staat om de speler heen');
  const loket = stageSetLayout('loket', player);
  ok(loket && Math.abs(loket.x - 10.8) < 1e-9 && loket.y === 20, 'het Loket staat met de speler 0,8 m voor het midden');
  ok(loket.hold && loket.hold.x === 10 && loket.hold.y === 20 && loket.hold.angle === 0, 'de speler blijft bij de balie staan');
  const keuken = stageSetLayout('omakeuken', player);
  ok(keuken && Math.abs(keuken.x - 10.6) < 1e-9 && keuken.y === 20, 'Oma\'s keuken staat met de speler 0,6 m voor het midden');
  ok(keuken.hold && keuken.hold.x === 10 && keuken.hold.y === 20, 'de speler blijft bij het fornuis staan');
  ok(stageSetLayout('kelder', player) === null, 'een onbekende set bestaat niet');
  ok(stageSetLayout('kantoor', null) === null, 'zonder speler geen kamer');
  ok(STAGE_SETS.includes('kantoor') && STAGE_SETS.includes('serverkamer') && STAGE_SETS.includes('loket') && STAGE_SETS.includes('omakeuken'), 'de vier soorten staan in de lijst');
  ok(sceneSpec('M18.intro')?.set === 'kantoor' && sceneSpec('M18.outro')?.set === 'kantoor', 'de intake- en outro-scènes spelen in het kantoor');
  ok(sceneSpec('M18.2')?.set === 'kantoor' && sceneSpec('M18.6')?.set === 'kantoor' && sceneSpec('M18.7')?.set === 'kantoor', 'de drie intake-uitkomsten spelen in het kantoor');
  ok(sceneSpec('M18.3')?.set === 'serverkamer', 'het logboek speelt in de serverkamer (#956)', sceneSpec('M18.3')?.set);
  ok(sceneSpec('M03.intro')?.set === 'loket' && sceneSpec('M03.outro')?.set === 'loket' && sceneSpec('M03.2')?.set === 'loket', 'de drie M03-scènes spelen in het Loket (#956)');
  ok(sceneSpec('M25.intro')?.set === 'omakeuken' && sceneSpec('M25.outro')?.set === 'omakeuken' && sceneSpec('M25.3')?.set === 'omakeuken', 'de drie M25-scènes spelen in Oma\'s keuken (#956)');
}

// --- het kantoorset ----------------------------------------------------------
function collect(group, pred) {
  const out = [];
  group.traverse((o) => { if (pred(o)) out.push(o); });
  return out;
}
function lights(group) { return collect(group, (o) => o.isLight).length; }
function badPositions(group) {
  let bad = 0;
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      if (!Number.isFinite(a.getX(i)) || !Number.isFinite(a.getY(i)) || !Number.isFinite(a.getZ(i))) { bad++; break; }
    }
    const p = o.getWorldPosition(new THREE.Vector3());
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) bad++;
  });
  return bad;
}
{
  const kit = buildOffice(0, 0, 0);
  ok(kit && kit.group && kit.group.children.length > 20, 'het kantoor heeft een kamer vol spullen');
  ok(lights(kit.group) >= 3, 'het kantoor is verlicht (puntlichten en omgevingslicht)', String(lights(kit.group)));
  ok(badPositions(kit.group) === 0, 'geen NaN in het kantoor');
  ok(OFFICE.w >= 7 && OFFICE.h >= 2.5, 'de kantoormaten kloppen');
  kit.dispose();
  ok(true, 'het kantoor ruimt zijn eigen geometrie op');
}

// --- de serverkamer ----------------------------------------------------------
{
  const kit = buildServerRoom(0, 0, 0);
  ok(kit && kit.group && kit.group.children.length > 30, 'de serverkamer heeft rekken, kabelbaan en terminal');
  ok(lights(kit.group) >= 3, 'de serverkamer heeft koel licht en schermgloed', String(lights(kit.group)));
  ok(badPositions(kit.group) === 0, 'geen NaN in de serverkamer');
  ok(typeof kit.frame === 'function', 'de serverkamer heeft een eigen frame (ledjes)');
  ok(SERVER.w >= 10 && SERVER.d >= 6, 'de hal is groot genoeg voor de scène van M18.3');
  // de ledjes knipperen: de kleuren op t=0 en t=1 verschillen
  const ledColors = () => {
    const set = [];
    kit.group.traverse((o) => {
      if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.geometry && o.geometry.parameters && o.geometry.parameters.width === 0.05) set.push(o.material.color.getHex());
    });
    return set.join(',');
  };
  const a = ledColors();
  kit.frame(0);
  const b = ledColors();
  kit.frame(1);
  const c = ledColors();
  ok(a.length > 0 && b !== c, 'de ledjes knipperen in de tijd', `${b.length} vs ${c.length}`);
  kit.dispose();
}

// --- het Loket ---------------------------------------------------------------
{
  const kit = buildLoket(0, 0, 0);
  ok(kit && kit.group && kit.group.children.length > 30, 'het Loket heeft een balie, drie loketten en een wachtrij');
  ok(lights(kit.group) >= 3, 'het Loket is verlicht', String(lights(kit.group)));
  ok(badPositions(kit.group) === 0, 'geen NaN in het Loket');
  ok(typeof kit.frame === 'function', 'het Loket heeft een eigen frame (nummerscherm)');
  ok(LOKET.w >= 10 && LOKET.d >= 6, 'de hal is groot genoeg voor de wachtrij en de balie');
  kit.dispose();
}

// --- Oma's keuken ------------------------------------------------------------
{
  const kit = buildOmaKitchen(0, 0, 0);
  ok(kit && kit.group && kit.group.children.length > 30, 'Oma\'s keuken heeft een fornuis, een tafel en de ingrediënten');
  ok(lights(kit.group) >= 3, 'Oma\'s keuken is warm verlicht', String(lights(kit.group)));
  ok(badPositions(kit.group) === 0, 'geen NaN in Oma\'s keuken');
  ok(typeof kit.frame === 'function', 'de keuken heeft een eigen frame (stoom en ovenlicht)');
  ok(OMA_KEUKEN.w >= 7 && OMA_KEUKEN.d >= 5, 'de keuken is groot genoeg voor de tafel en het fornuis');
  kit.dispose();
}

// --- de kamer van een missiestap --------------------------------------------
{
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: () => 0 } };
  const player = { x: 4, y: -2, angle: 0.5 };
  const kantoor = buildStageSet(world, 'kantoor', player, scene);
  ok(kantoor && kantoor.kind === 'kantoor', 'de keuzestap bouwt het kantoor');
  ok(kantoor.group.parent === scene, 'de kamer hangt in de scène');
  ok(kantoor.people.length === 2, 'de accountmanager en een collega staan in de kamer', String(kantoor.people.length));
  ok(kantoor.hold && kantoor.hold.x === 4 && kantoor.hold.y === -2, 'de speler wordt bij de stoel gehouden');
  if (kantoor) {
    for (let t = 0; t < 1.2; t += 0.1) updateStageSet(kantoor, 0.1);
    ok(kantoor.t > 1, 'de kamertijd loopt');
    disposeStageSet(kantoor);
    ok(kantoor.group.parent === null, 'de kamer gaat weer weg');
    ok(scene.children.length === 0, 'er blijft niets in de scène achter');
  }

  const server = buildStageSet(world, 'serverkamer', player, scene);
  ok(server && server.kind === 'serverkamer', 'de wachtstap bouwt de serverkamer');
  ok(server && server.hold === null, 'in de serverkamer staat de speler vrij');
  if (server) {
    updateStageSet(server, 0.1);
    disposeStageSet(server);
    ok(server.group.parent === null, 'de serverkamer gaat weer weg');
  }

  const loket = buildStageSet(world, 'loket', player, scene);
  ok(loket && loket.kind === 'loket', 'de Loket-stap bouwt de hal');
  ok(loket && loket.people.length === 8, 'de loketbediende, een wachtende en de rij van zes staan in de hal (AAA akte 1)', String(loket && loket.people.length));
  ok(loket && loket.hold && loket.hold.x === 4 && loket.hold.y === -2, 'de speler blijft bij de balie');
  if (loket) {
    updateStageSet(loket, 0.1);
    disposeStageSet(loket);
    ok(loket.group.parent === null, 'het Loket gaat weer weg');
  }

  const keuken = buildStageSet(world, 'omakeuken', player, scene);
  ok(keuken && keuken.kind === 'omakeuken', 'de keukenstap bouwt Oma\'s keuken');
  ok(keuken && keuken.people.length === 2, 'Oma en Mem staan in de keuken', String(keuken && keuken.people.length));
  ok(keuken && keuken.hold, 'de speler blijft bij het fornuis');
  if (keuken) {
    updateStageSet(keuken, 0.1);
    disposeStageSet(keuken);
    ok(keuken.group.parent === null, 'de keuken gaat weer weg');
  }
  ok(buildStageSet(world, 'kelder', player, scene) === null, 'een onbekende set bouwt niets');
}

// --- de kroeg van een toast mag in een gebouw staan (M16), een gewone kamer niet -------
{
  const scene = new THREE.Scene();
  const huis = { pts: [[-50, -50], [50, -50], [50, 50], [-50, 50]], bounds: [-50, -50, 50, 50] };
  const world = { map: { groundHeightAt: () => 0, buildingsNear: () => [huis] } };
  const player = { x: 0, y: 0, angle: 0 };
  ok(buildStageSet(world, 'kroeg', player, scene) === null, 'een kroegkamer in een gebouw valt terug op de open lucht');
  const kroeg = buildStageSet(world, 'kroeg', player, scene, { gebouwOk: true });
  ok(!!kroeg, 'een kroegtoast mag in het gebouw van de kroeg staan (gebouwOk)');
  if (kroeg) disposeStageSet(kroeg);
  const water = { map: { groundHeightAt: () => 0, buildingsNear: () => [], isWater: () => true } };
  ok(buildStageSet(water, 'kroeg', player, scene, { gebouwOk: true }) !== undefined, 'water blijft een reden om geen kamer te bouwen (geen crash)');
}

// --- de missies die de sets gebruiken ---------------------------------------
{
  const spot = (x, y) => ({ x, y, road: null });
  const all = buildNieuwDefs({ map: { meta: { landmarks: [] } }, walk: spot, drive: spot });
  const loketDef = all.find((d) => d.label === 'Het Loket');
  ok(!!loketDef && loketDef.stages.some((q) => q.set === 'loket'), 'M03 speelt in het Loket (#956)', loketDef && loketDef.stages.map((q) => q.set).join());
  ok(!!loketDef && !loketDef.stages.some((q) => q.kind === 'goto' && /Loket A|Loket C/.test(q.label || '')), 'M03 loopt niet meer over het plein naar de loketten');
  const keuzes = loketDef ? loketDef.stages.filter((q) => q.kind === 'choice') : [];
  ok(keuzes.length === 2 && keuzes.every((q) => q.wrongFails === undefined && q.wrongText === undefined && q.rounds.every((r) => r.options.every((o) => o.ok !== false))), 'M03: twee milde keuzes aan de balie, geen afloop (#962)');
  const list = [{ label: 'Het bod viel tegen', start: { x: 1, y: 2 }, stages: [{ kind: 'goto' }] }];
  applyAkte5(list);
  ok(list[0].stages.some((q) => q.kind === 'bake' && q.set === 'omakeuken'), 'M25 bakt in Oma\'s keuken (#956)', list[0].stages.map((q) => q.set).join());
  const col = buildAkte5Defs({ map: { nearestRoadPoint: () => null }, walk: spot, drive: spot });
  ok(col.length === 2 && col.some((d) => d.label === 'Een luik erin'), 'de akte 5-defs blijven heel');
}

console.log(fails ? `${fails} van ${n} mislukt` : `stagesets_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
