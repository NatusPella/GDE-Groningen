import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// The one canvas-to-texture helper: a w x h canvas, drawn once by
// draw(ctx, w, h), as an sRGB texture. opts: anisotropy, repeat [u, v].
// Een bord met tekst aan twee kanten, zonder spiegelbeeld (#503): een dubbelzijdig vlak laat zijn
// achterkant gespiegeld zien. Dit zijn twee vlakken rug aan rug, elk met de voorkant naar buiten, dus
// de tekst leest van beide kanten goed. Gebruik dit voor elk vlak met tekst erop.
// Hertest 24-11 (het bord 'Fietsroute' in spiegelschrift in cutscenes): een dubbelzijdig materiaal op die twee vlakken liet elk vlak óók zijn
// gespiegelde achterkant zien, en die lag precies op de voorkant van het andere vlak. Daarom zet dit bord zijn materiaal op FrontSide.
// opts.back: een eigen materiaal voor de achterkant (een effen plaat, zoals een verkeersbord); anders leest de tekst aan beide kanten.
export function signBothSides(w, h, material, { back = null } = {}) {
  if (material && material.side !== THREE.FrontSide) { material.side = THREE.FrontSide; material.needsUpdate = true; }
  if (back && back.side !== THREE.FrontSide) { back.side = THREE.FrontSide; back.needsUpdate = true; }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), material));
  const achter = new THREE.Mesh(new THREE.PlaneGeometry(w, h), back || material);
  achter.rotation.y = Math.PI;
  g.add(achter);
  return g;
}

// Hertest 24-11: de structurele regel voor tekst op één vlak dat van twee kanten te zien is (een verkeersbord, een portaalbord, een bord
// in een atlas, een muurbord). Een DoubleSide-materiaal toont de achterkant gespiegeld: 'Fietsroute' werd 'etuorsteiF' als de camera
// erachter stond. plainBack laat de achterkant een effen plaat zijn (de kleur van een echt bordrug), zonder iets aan de geometrie te
// veranderen, dus het werkt ook voor samengevoegde vlakken en atlassen. De voorkant blijft precies zoals hij was.
export const SIGN_BACK_COLOR = 0x8a8e92;
const SIGN_BACK_FRAG = '\n  if ( ! gl_FrontFacing ) diffuseColor.rgb = uSignBack;';
const SIGN_BACK_EMIS = '\n  if ( ! gl_FrontFacing ) totalEmissiveRadiance = vec3( 0.0 );';
// Puur: zet de achterkantregel in een fragmentshader (na de textuur, en voor de gloed van een emissiveMap); null als de shader geen
// map_fragment heeft (dan is er ook geen tekst om te spiegelen).
export function patchSignBackShader(frag) {
  if (typeof frag !== 'string' || !frag.includes('#include <map_fragment>')) return null;
  let out = frag.replace('#include <map_fragment>', '#include <map_fragment>' + SIGN_BACK_FRAG);
  if (out.includes('#include <emissivemap_fragment>')) out = out.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + SIGN_BACK_EMIS);
  return 'uniform vec3 uSignBack;\n' + out;
}
export function plainBack(material, color = SIGN_BACK_COLOR) {
  if (!material || (material.userData && material.userData.plainBack)) return material;
  material.userData = material.userData || {};
  material.userData.plainBack = true;
  material.side = THREE.DoubleSide;
  const kleur = new THREE.Color(color);
  const prev = material.onBeforeCompile;
  const ownKey = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey') ? material.customProgramCacheKey : null;
  const prevSrc = prev ? prev.toString() : '';
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    const f = patchSignBackShader(shader.fragmentShader);
    if (!f) return;
    shader.fragmentShader = f;
    shader.uniforms.uSignBack = { value: kleur };
  };
  material.customProgramCacheKey = () => 'signback|' + (ownKey ? ownKey.call(material) : prevSrc);
  material.needsUpdate = true;
  return material;
}

// Zonder opgave krijgt elke canvastextuur anisotropie 4: een vlak textuur (grond, gevel, bord) die schuin
// in beeld staat blijft zo scherp in plaats van te vervagen (1 zet het uit).
export const DEFAULT_ANISOTROPY = 4;
export function canvasTex(w, h, draw, { anisotropy = DEFAULT_ANISOTROPY, repeat = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (anisotropy) t.anisotropy = anisotropy;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Sets g.font so that `text` fits maxW: starts at `size` px and steps down by 2
// until it fits or reaches `min`. Draw the text afterwards.
export function fitText(g, text, maxW, size, weight = 'bold', font = 'sans-serif', min = 10) {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 2; } while (g.measureText(text).width > maxW && s > min);
}
