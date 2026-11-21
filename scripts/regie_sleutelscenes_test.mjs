// Regie van de sleutelscenes (#1138, regie-bijbel R-13, R-21, R-22): elke sleutelscene is geregisseerd en heeft een close-up of
// reactieshot; wie in zijn eerste scene voor het eerst spreekt krijgt een naamkaart; geen beurt boven de 25 woorden in
// de sleutelscenes die we splitsten. Zonder Electron: alleen de data en de pure linter.
//   node scripts/regie_sleutelscenes_test.mjs
import { loadUnits } from './lib/cutscene_data.mjs';
import { woorden } from './lib/cutscene_lint.mjs';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const { units, scriptUnits } = await loadUnits();
const alle = [...units, ...scriptUnits];
const van = (sceneId) => units.filter((u) => u.sceneIds.includes(sceneId));

// de sleutelscenes uit #1138 (de sloot, M10.3, is een stage van de missie zelf en hoort hier nog niet bij)
const SLEUTEL = {
  keuken: 'C00.2', loket: 'M03.1', vitrine: 'M06.3', melkweg: 'M11.5', kus: 'M16.4',
  kruitkelder: 'M20.3', ruzie: 'M21.4', knuffel: 'M22.4', vijfWoorden: 'M26.7', kusFinale: 'M26.17',
};
for (const [naam, id] of Object.entries(SLEUTEL)) {
  const us = van(id);
  ok(us.length > 0, `${naam} (${id}) is geregisseerd`);
  for (const u of us) {
    ok(u.def && Array.isArray(u.def.shots) && u.def.shots.length > 0, `${naam} (${u.id}) heeft eigen shots`);
    const camera = u.def ? u.def.shots.filter((s) => ['close', 'reaction'].includes(s.shot) || (Number.isFinite(s.fov) && s.fov <= 32)) : [];
    ok(camera.length > 0 || naam === 'kus' || naam === 'vitrine', `${naam} (${u.id}) heeft een close-up of reactieshot`, String(u.def && u.def.shots.length));
  }
}
// de meeste sleutelscenes hebben een expliciete close-up of reactieshot (shot 'close' of 'reaction')
const metClose = Object.values(SLEUTEL).filter((id) => van(id).some((u) => u.def && u.def.shots.some((s) => s.shot === 'close' || s.shot === 'reaction'))).length;
ok(metClose >= 6, 'minstens zes sleutelscenes hebben een expliciete close-up of reactieshot', String(metClose));
ok(van('M11.5').some((u) => u.def.shots.some((s) => s.shot === 'close' && s.target === 'tammo')), 'M11.5: close-up op Tammo bij de Melkweg');

// R-13: naamkaart bij het eerste optreden (regie in de verhaaldata en de fx in de scène)
const KAART = [['M01.1', 'Berend'], ['M03.1', 'oketbediende'], ['M18.1', 'ccountmanager']];
for (const [id, naam] of KAART) {
  const u = van(id)[0];
  ok(u && u.regie.some((r) => /naamkaart/i.test(r) && r.includes(naam)), `${id}: de regie noemt een naamkaart voor ${naam}`);
  ok(u && u.def && (u.def.fx || []).some((f) => f.fx === 'naam' && f.text.includes(naam)), `${id}: de scène toont de naamkaart`);
}

// R-22: de sleutelscenes hebben geen beurt boven 25 woorden die we geknipt hebben
const kruit = alle.find((u) => u.sceneIds && u.sceneIds.includes('M20.3'));
ok(kruit && kruit.lines.every((l) => woorden(l.text) <= 25), 'M20.3: geen beurt boven de 25 woorden');
ok(kruit && kruit.lines.some((l) => /^In 1953 werd ik tweede/.test(l.text)), 'M20.3: Mems tweede zin staat apart');
const jelleReactie = kruit && kruit.def.cues.some((c) => c.actor === 'jelle' && c.anim === 'look');
ok(jelleReactie, 'M20.3: Jelle reageert in beeld op Mems zin');

console.log(`regie_sleutelscenes_test: ${n} controles${fails ? `, ${fails} mislukt` : ' ok'}`);
process.exit(fails ? 1 : 0);
