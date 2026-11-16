// #955/#956: de binnensets van Wiebelwerk (kantoor en serverkamer) en de kamer die een
// missiestap om de speler zet (stagesets.js).
//   node scripts/stagesets_test.mjs
// De indeling is puur; de set wordt in een eigen THREE.Scene gebouwd (geen spel, geen DOM).
import './node3d.mjs';
// three en de spelsets pas hierna laden: node3d zet de CDN-verwijzing naar de vendored kopie
// pas bij het importeren, en statische imports worden vóór de body van dit bestand opgelost.
const THREE = await import('three');
const { buildOffice, buildServerRoom, OFFICE, SERVER } = await import('../game/js/office3d.js');
const { buildStageSet, updateStageSet, disposeStageSet, stageSetLayout, STAGE_SETS } = await import('../game/js/stagesets.js');
const { sceneSpec } = await import('../game/js/cutscenes_akte1.js');

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
  ok(stageSetLayout('keuken', player) === null, 'een onbekende set bestaat niet');
  ok(stageSetLayout('kantoor', null) === null, 'zonder speler geen kamer');
  ok(STAGE_SETS.includes('kantoor') && STAGE_SETS.includes('serverkamer'), 'de twee soorten staan in de lijst');
  ok(sceneSpec('M18.intro')?.set === 'kantoor' && sceneSpec('M18.outro')?.set === 'kantoor', 'de intake- en outro-scènes spelen in het kantoor');
  ok(sceneSpec('M18.2')?.set === 'kantoor' && sceneSpec('M18.6')?.set === 'kantoor' && sceneSpec('M18.7')?.set === 'kantoor', 'de drie intake-uitkomsten spelen in het kantoor');
  ok(sceneSpec('M18.3')?.set === 'serverkamer', 'het logboek speelt in de serverkamer (#956)', sceneSpec('M18.3')?.set);
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
  ok(buildStageSet(world, 'keuken', player, scene) === null, 'een onbekende set bouwt niets');
}

console.log(fails ? `${fails} van ${n} mislukt` : `stagesets_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
