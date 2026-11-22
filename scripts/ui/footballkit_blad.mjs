// Contactblad van de voetbalkleding (22-11): de vijf niveaus (straat, amateur, semi-prof, prof, topniveau) van voren en van achteren, en de uitvoeringen (uit, derde, keeper,
// training, trainingspak). Softwarerenderer zonder Electron (scripts/lib/stuk_png.mjs); alleen om zelf naar de modellen te kijken, niet pixelexact.
//   node scripts/ui/footballkit_blad.mjs [--uit=docs/beeld-22-11/voetbalkleding]
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pngVan, teken, plak, tekst } from '../lib/stuk_png.mjs';

const arg = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const THREE = await import('three');
const P = await import('../../game/js/models3d_people.js');
const C = await import('../../game/js/clothing.js');
const K = await import('../../game/js/clothingkit.js');
const VK = await import('../../game/js/footballkit.js');
const { CLUBS, EUROPE_CLUBS } = await import('../../game/js/voetbalclubs.js');
const uit = String(arg.uit || 'docs/beeld-22-11/voetbalkleding');

const TW = 170, TH = 300;
const club = CLUBS.find((c) => c.id === 'stadjers'), europa = EUROPE_CLUBS.find((c) => c.id === 'blauwgranaten');

// Alle driehoeken van een figuur in modelruimte (romp met vertexkleuren, losse meshes: handschoenen en de shirtlagen met hun materiaalkleur), na een draai om y.
function figuurTris(group, yaw) {
  group.rotation.y = yaw;
  group.updateMatrixWorld(true);
  const Pp = [], Cc = [], v = new THREE.Vector3();
  group.traverse((m) => {
    if (!m.isMesh || !m.geometry.attributes.position) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = g.attributes.position, c = g.attributes.color, col = m.material && m.material.color ? m.material.color : null;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      Pp.push(v.x, v.y, v.z);
      if (c) Cc.push(c.getX(i), c.getY(i), c.getZ(i)); else if (col) Cc.push(col.r, col.g, col.b); else Cc.push(0.6, 0.6, 0.6);
    }
  });
  return { P: Float32Array.from(Pp), C: Float32Array.from(Cc) };
}
const tegel = (group, yaw) => teken(figuurTris(group, yaw), TW, TH, { c: [0, 0.97, 0], r: 1.02 }, { bg: [34, 40, 52], elev: Math.atan(0.12) });

function figuur(kit, hair = 'short.naturel', body = 'gemiddeld', variant = 'male') {
  const o = C.outfitToLook({ ...kit.worn, hair, body }, {}, kit.extras);
  return P.buildPersonMesh(o.shirt, 0xd9b08c, { variant, seed: 4, look: o.look, pants: o.pants, shoes: o.shoes, shirtBands: o.shirtBands, body: o.body, hairStyle: o.hairStyle, hair: o.hair });
}
const maak = (cl, level, extra = {}) => K.kitWorn({ ...VK.clubColors(cl), level, number: 9, name: true, captain: level !== 'amateur' && level !== 'straat', sponsors: ['Wiebelwerk'], clubId: cl.id, ...extra });

fs.mkdirSync(uit, { recursive: true });
// blad 1: vijf niveaus, voor en achter
{
  const lijst = [['straat', club], ['amateur', club], ['semipro', club], ['pro', club], ['top', europa]];
  const GW = TW * lijst.length, GH = TH * 2, img = Buffer.alloc(GW * GH * 3, 20);
  lijst.forEach(([level, cl], i) => {
    const k = maak(cl, level, level === 'straat' ? { level: 'straat' } : {});
    const g = figuur(k, i % 2 ? 'curly.naturel' : 'short.naturel', 'gemiddeld', i % 2 ? 'female' : 'male');
    plak(img, GW, tegel(g, -Math.PI / 2), TW, TH, i * TW, 0);
    plak(img, GW, tegel(g, Math.PI / 2), TW, TH, i * TW, TH);
    tekst(img, GW, i * TW + 5, 5, String(i + 1));
  });
  fs.writeFileSync(path.join(uit, 'niveaus.png'), pngVan(GW, GH, img));
}
// blad 2: uitvoeringen op prof- en topniveau: thuis, uit, derde, keeper, training, trainingspak
{
  const lijst = [['pro', club, {}], ['pro', club, { variant: 'uit' }], ['top', europa, { variant: 'derde' }], ['pro', club, { role: 'keeper', keeperColor: 'oranje' }], ['pro', club, { mode: 'training' }], ['pro', club, { mode: 'intro' }]];
  const GW = TW * lijst.length, GH = TH, img = Buffer.alloc(GW * GH * 3, 20);
  lijst.forEach(([level, cl, extra], i) => {
    const g = figuur(maak(cl, level, extra), i % 2 ? 'long.naturel' : 'short.naturel', ['gemiddeld', 'lang', 'breed', 'smal', 'kort', 'gemiddeld'][i], i % 2 ? 'female' : 'male');
    plak(img, GW, tegel(g, -Math.PI / 2), TW, TH, i * TW, 0);
    tekst(img, GW, i * TW + 5, 5, String(i + 1));
  });
  fs.writeFileSync(path.join(uit, 'uitvoeringen.png'), pngVan(GW, GH, img));
}
console.log('contactbladen in ' + uit);
