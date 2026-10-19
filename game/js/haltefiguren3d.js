// Tekent de reizigers van haltefiguren.js (#225): losse mensfiguurtjes die alleen beeld zijn.
import { planHaltefiguren, figuurNu } from './haltefiguren.js';
import { animatePersonWalk } from './models3d_people.js';

const SHIRTS = [0xb5483a, 0x3f7a5a, 0xcaa46a, 0x5a62a8, 0x8a5aa0, 0x2f6f8f];
const SKINS = [0xe0b48a, 0xc68c63, 0x8d5a3b, 0xf0c8a0];

const groepen = [];

// Eén keer per frame. bouw(shirt, skin) maakt een persoonsmesh; scene krijgt ze erbij en eraf.
export function syncHaltefiguren(world, scene, bouw, dt, rng = Math.random) {
  const q = world && world.haltefx;
  if (q && q.length) {
    for (const e of q.splice(0)) {
      if (groepen.length >= 4) break;
      const figuren = planHaltefiguren(e.v, e, rng).map((f, i) => ({
        f, mesh: null, i,
        shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)], skin: SKINS[Math.floor(rng() * SKINS.length)],
      }));
      if (figuren.length) groepen.push({ v: e.v, t: 0, figuren });
    }
  }
  for (let g = groepen.length - 1; g >= 0; g--) {
    const gr = groepen[g];
    gr.t += dt;
    let allesKlaar = true;
    for (const fg of gr.figuren) {
      const st = figuurNu(fg.f, gr.t);
      if (!st.klaar) allesKlaar = false;
      const toon = st.zichtbaar && !st.klaar;
      if (toon && !fg.mesh) { fg.mesh = bouw(fg.shirt, fg.skin); scene.add(fg.mesh); }
      if (!fg.mesh) continue;
      fg.mesh.visible = toon;
      if (!toon) continue;
      const dx = fg.f.to.x - fg.f.from.x, dy = fg.f.to.y - fg.f.from.y;
      fg.mesh.position.set(st.x, gr.v.z || 0, st.y);
      fg.mesh.rotation.y = -Math.atan2(dy, dx); // kijkt naar waar hij heen loopt
      animatePersonWalk(fg.mesh, st.lopen ? 1.4 : 0, dt);
    }
    if (allesKlaar) {
      for (const fg of gr.figuren) if (fg.mesh) { scene.remove(fg.mesh); }
      groepen.splice(g, 1);
    }
  }
}

export function wisHaltefiguren(scene) {
  for (const gr of groepen) for (const fg of gr.figuren) if (fg.mesh) scene.remove(fg.mesh);
  groepen.length = 0;
}
