// Borden met tekst lezen nooit in spiegelschrift (hertest 24-11: 'Fietsroute' stond in cutscenes achterstevoren).
// Oorzaak: één vlak met een tekstcanvas op een DoubleSide-materiaal. Van achteren toont three.js dezelfde textuur, dus gespiegeld.
// Geen negatieve schaal en geen omgekeerde UV: het was de achterkant van een dubbelzijdig vlak. De structurele regel (canvastex.js):
//   - plainBack(materiaal): de achterkant is een effen bordrug (verkeersbord, portaalbord, atlas, muurbord);
//   - signBothSides(w, h, materiaal): twee vlakken rug aan rug, de tekst leest van beide kanten (FrontSide, ook als de beller DoubleSide gaf).
// Deze test: (1) de shaderregel van plainBack en signBothSides puur, (2) een scan: in elk bestand dat tekst op een canvas tekent, is elk
// materiaal met een map en DoubleSide óf in plainBack gewikkeld óf staat het in de lijst hieronder met de reden (geen tekst).
//   node scripts/bord_spiegel_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const THREE = await import('three');
const C = await import('../game/js/canvastex.js');

// 1. plainBack: de achterkant krijgt een effen kleur, de voorkant blijft; een emissiveMap gloeit niet aan de achterkant
{
  const basic = THREE.ShaderLib.basic.fragmentShader;
  const f = C.patchSignBackShader(basic);
  ok(f && f.includes('uniform vec3 uSignBack;') && /#include <map_fragment>\s*if \( ! gl_FrontFacing \) diffuseColor\.rgb = uSignBack;/.test(f), 'plainBack: na de textuur een effen achterkant');
  const std = C.patchSignBackShader(THREE.ShaderLib.standard.fragmentShader);
  ok(std && /#include <emissivemap_fragment>\s*if \( ! gl_FrontFacing \) totalEmissiveRadiance = vec3\( 0\.0 \);/.test(std), 'plainBack: geen gloed aan de achterkant (paddepoel bij nacht)');
  ok(C.patchSignBackShader('void main() {}') === null, 'zonder textuur verandert de shader niet');
  const m = C.plainBack(new THREE.MeshBasicMaterial({ map: new THREE.Texture() }));
  ok(m.side === THREE.DoubleSide && m.userData.plainBack === true, 'plainBack: het vlak blijft van twee kanten zichtbaar');
  const sh = { fragmentShader: basic, uniforms: {} };
  m.onBeforeCompile(sh);
  ok(sh.uniforms.uSignBack && sh.uniforms.uSignBack.value.isColor && sh.fragmentShader.includes('gl_FrontFacing'), 'plainBack zet de uniform en de regel');
  ok(/^signback\|/.test(m.customProgramCacheKey()), 'een eigen programmasleutel (geen gedeeld programma met een gewoon materiaal)');
  ok(C.plainBack(m) === m && m.customProgramCacheKey() === 'signback|' + m.customProgramCacheKey().slice(9), 'twee keer plainBack wikkelt niet dubbel');
  // samen met een andere shaderhaak (applyInteriorCut): beide lopen
  let eerder = false;
  const m2 = new THREE.MeshBasicMaterial({ map: new THREE.Texture() });
  m2.onBeforeCompile = () => { eerder = true; };
  C.plainBack(m2);
  const sh2 = { fragmentShader: basic, uniforms: {} };
  m2.onBeforeCompile(sh2);
  ok(eerder && sh2.uniforms.uSignBack, 'een bestaande shaderhaak blijft lopen');
}

// 2. signBothSides: twee vlakken rug aan rug, beide FrontSide (ook als de beller DoubleSide gaf: dat gaf z-fighting met spiegelschrift)
{
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.Texture(), side: THREE.DoubleSide });
  const g = C.signBothSides(1, 0.5, mat);
  ok(g.children.length === 2 && mat.side === THREE.FrontSide, 'signBothSides zet het materiaal op FrontSide');
  ok(Math.abs(g.children[1].rotation.y - Math.PI) < 1e-9, 'de achterkant is het tweede vlak, omgedraaid');
  const rug = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const g2 = C.signBothSides(1, 0.5, new THREE.MeshBasicMaterial({ map: new THREE.Texture() }), { back: rug });
  ok(g2.children[1].material === rug, 'een effen rug kan ook');
}

// 3. de scan
// Bestanden met een tekstcanvas waar een DoubleSide-materiaal met een map geen tekst draagt (de reden staat erbij).
const GEEN_TEKST = {
  'beppe_garden.js': 'signBothSides zet het bord zelf op FrontSide',
  'canopies3d.js': 'zonnepanelen (geen tekst)',
  'fierljep.js': 'pompebledenvlag',
  'geheimen.js': 'vlag zonder tekst',
  'gunfx3d.js': 'mondingsvuur',
  'kermis.js': 'dak en luifels (strepen)',
  'landmarkmaterials.js': 'baksteen en dakpannen',
  'missiedecor.js': 'gestreept doek',
  'models3d_buildings.js': 'baksteen en dakpannen',
  'models3d_vehicles.js': 'pompebledenvlag',
  'padel.js': 'gaas',
  'penalty.js': 'doelnet',
  'storyprops3d.js': 'een vlag van doek: van achteren is spiegelbeeld echt',
  'trailerprops.js': 'pompebledenvlag',
  'voetbal.js': 'doelnet',
  'waymarkers3d.js': 'billboard: draait altijd naar de camera',
};
const dir = path.join(root, 'game', 'js');
const fouten = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!s.includes('fillText')) continue;
  for (const m of s.matchAll(/new THREE\.Mesh\w*Material\(\{[^}]*\}\)/g)) {
    const lit = m[0];
    if (!/\bmap:/.test(lit) || !/side:\s*THREE\.DoubleSide/.test(lit)) continue;
    const voor = s.slice(Math.max(0, m.index - 40), m.index);
    if (/plainBack\(\s*(applyInteriorCut\()?$/.test(voor)) continue;
    if (GEEN_TEKST[f]) continue;
    fouten.push(`${f}: ${lit.slice(0, 90)}`);
  }
}
ok(fouten.length === 0, 'elk tekstbord op een dubbelzijdig vlak heeft een effen rug (plainBack) of twee vlakken (signBothSides)', fouten.join(' | '));
for (const f of Object.keys(GEEN_TEKST)) ok(fs.existsSync(path.join(dir, f)), `de uitzondering ${f} bestaat nog`);
const mf = fs.readFileSync(path.join(dir, 'marktfiets.js'), 'utf8');
ok(/plainBack\(new THREE\.MeshBasicMaterial\(\{ map: tex \}\)\)/.test(mf), "het bord 'Fietsroute' heeft een effen rug");

console.log(`bord_spiegel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
