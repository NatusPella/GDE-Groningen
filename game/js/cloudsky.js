// Wolkenlucht (AAA-wereld 23-11): echte, zachte wolken in de hemelshader, gedeeld met het water
// (die ze weerspiegelt). Een wolkenvlak op vaste hoogte wordt met een perspectiefdeling
// geprojecteerd (kleiner naar de horizon), de dichtheid komt uit twee bemonsteringen van een
// kleine ruistextuur (cloudnoise.js) en de belichting uit een derde, een stapje richting de zon:
// staat daar dikkere wolk, dan ligt dit stuk in de schaduw. Geen lus, geen marcheerstap:
// 2 tot 3 texturelezingen per beeldpunt, alleen boven de horizon.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { makeCloudNoise } from './cloudnoise.js';

let sharedTex = null;
function cloudTexture() {
  if (!sharedTex) {
    sharedTex = new THREE.DataTexture(makeCloudNoise(256), 256, 256, THREE.RGBAFormat);
    sharedTex.wrapS = sharedTex.wrapT = THREE.RepeatWrapping;
    sharedTex.magFilter = THREE.LinearFilter;
    sharedTex.minFilter = THREE.LinearMipmapLinearFilter;
    sharedTex.generateMipmaps = true;
    sharedTex.needsUpdate = true;
  }
  return sharedTex;
}

// Uniformen: een object per materiaal-set, gedeeld met de hemel en het water (dezelfde verwijzingen).
export function createCloudUniforms() {
  return {
    uCloudTex: { value: cloudTexture() },
    uCloudA: { value: new THREE.Vector4(0, 0, 0.35, 1) }, // x,y: windverschuiving; z: bedekking 0..1; w: 1 = schaduwtik
    uCloudLit: { value: new THREE.Color(1, 1, 1) },
    uCloudShade: { value: new THREE.Color(0.55, 0.62, 0.78) },
    uCloudAlpha: { value: 0.9 },
  };
}

export const CLOUD_SKY_GLSL = `
uniform sampler2D uCloudTex;
uniform vec4 uCloudA;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uCloudAlpha;

// x: dichtheid na de drempel, y: de ruwe ruis (geeft een gesloten wolkendek nog reliëf)
vec2 cloudDens(vec2 p) {
  vec4 a = texture2D(uCloudTex, p * 0.9 + uCloudA.xy);
  vec4 b = texture2D(uCloudTex, p * 2.4 + vec2(0.37, 0.11) - uCloudA.xy * 1.7);
  float n = a.r * 0.68 + b.g * 0.32;
  float thr = mix(0.80, -0.02, uCloudA.z * uCloudA.z * (3.0 - 2.0 * uCloudA.z) * 0.35 + uCloudA.z * 0.65);
  return vec2(smoothstep(thr, thr + 0.2, n), n);
}

// d: genormaliseerde kijkrichting (y omhoog), sd: richting van de zon, sc: kleur van het zonlicht.
// Geeft rgb in dezelfde ruimte als de hemel en alfa; (0) onder de horizon of zonder wolken.
vec4 cloudSky(vec3 d, vec3 sd, vec3 sc, float sunStr) {
  // geen vroege returns tussen de texturelezingen: de afgeleiden (mip-keuze) blijven zo overal geldig
  vec2 p = d.xz / (max(d.y, 0.012) + 0.16) * 0.46;
  vec2 cd = cloudDens(p);
  float c = cd.x;
  float ov = smoothstep(0.55, 1.0, uCloudA.z);         // een gesloten dek: de ruis zelf geeft het reliëf
  float f1 = mix(cd.x, cd.y * 1.25, ov);
  float lit = 0.62;
  if (uCloudA.w > 0.5) {
    vec2 toSun = normalize(sd.xz + vec2(1e-4)) * 0.05;
    vec2 d2 = cloudDens(p + toSun);
    lit = clamp(0.62 + (f1 - mix(d2.x, d2.y * 1.25, ov)) * 2.6, 0.0, 1.0);
  }
  lit *= 1.0 - 0.38 * c * c * (1.0 - 0.5 * ov);                         // dikke kernen houden schaduw vast
  vec3 col = mix(uCloudShade, uCloudLit, lit);
  float s = max(dot(d, sd), 0.0);
  col += sc * sunStr * pow(s, 7.0) * (1.0 - c) * 0.42; // zilveren randen richting de zon
  float fade = smoothstep(0.012, 0.2, d.y);            // aan de horizon vervaagt de laag in de dampkring
  return vec4(col, c * uCloudAlpha * fade);
}
`;
