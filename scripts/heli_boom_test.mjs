// Een heli vliegt niet meer door de kruin van een boom.
// De bomen staan als vaste prop in de ruimtelijke index van breakables.js
// (treeprops.js); heliflight.js vraagt die lijst één keer per frame rond de heli.
// Deze test zet één boomprop in een nep-map en vliegt er met de echte flyHeli
// doorheen: op kruinhoogte raakt hij hem, erboven niet, en zonder bomen gebeurt
// er niets. Zo weet je dat de botsing van de prop komt en niet van de map.
//   node scripts/heli_boom_test.mjs
import './node3d.mjs';
import assert from 'node:assert';

// Dynamisch: node3d.mjs zet de three.js-haak pas bij zijn eigen body op, en de
// statische imports van dit bestand zijn dan al opgelost (breakables.js haalt
// three van de CDN).
const { makeProp, addProp, removeProp } = await import('../game/js/breakables.js');
const H = await import('../game/js/heliflight.js');

// Een nep-map zonder gebouwen en zonder water: alles wat de heli aan de wereld
// vraagt is vlakke grond op 0.
const map = {
  buildingsNear: () => [],
  groundHeightAt: () => 0,
  meta: { bounds: [-2000, -2000, 2000, 2000] },
};

const TREE_H = 16;          // een volwassen linde (greenery.js)
const CROWN_BASE = TREE_H * 0.3;   // 4,8 m: daar begint de kruin
const TREE = { x: 0, y: 0 };

function maakWereld(keys) {
  const berichten = [];
  return {
    berichten,
    world: {
      map, time: 0, vehicles: [], particles: [], audioEvents: [],
      input: { isDown: (k) => keys.has(k), lookActive: () => false, mouse: { dx: 0, dy: 0 } },
      addMessage: (t) => berichten.push(t),
    },
  };
}

// Vliegt de echte heli vanaf (x0, 0, z) met de gegeven toetsen `seconden` lang.
// De boomprop staat er alleen als `boom` waar is; daarna gaat hij weer uit de
// index, zodat de vier vluchten elkaar niet beïnvloeden.
function vlieg({ z, seconden, keys = ['w'], boom = false, x0 = -40, speed = 25 }) {
  let prop = null;
  if (boom) {
    prop = makeProp('tree', TREE.x, TREE.y, { h: TREE_H });
    assert.ok(addProp(prop), 'de boomprop staat in de index');
  }
  try {
    const { world, berichten } = maakWereld(new Set(keys));
    const v = H.makeHeli(x0, 0, z, 0);
    v.driver = 'player';
    v.rotor = 1;
    v.onGround = false;
    v.groundZ = z;
    v.speed = speed;   // meteen op kruissnelheid: anders duurt de aanloop het halve testje
    world.vehicles.push(v);
    const dt = 1 / 60;
    for (let t = 0; t < seconden; t += dt) {
      H.flyHeli(v, dt, world);
      world.time += dt;
    }
    return { v, berichten, particles: world.particles, audio: world.audioEvents };
  } finally {
    if (prop) removeProp(prop);
  }
}

// 1. Op kruinhoogte: de heli komt niet voorbij de stam en houdt schade over.
{
  const z = (CROWN_BASE + TREE_H) / 2;   // 10,4 m: midden in de kruin
  const { v, berichten, particles, audio } = vlieg({ z, seconden: 3, boom: true });
  assert.ok(v.x < -2, `de heli stopt voor de boom (x=${v.x.toFixed(1)})`);
  assert.ok(v.health < 100, `een aanvaring doet schade (health=${Math.round(v.health)})`);
  assert.ok(particles.length > 0, 'de klap geeft een impact');
  assert.ok(audio.some((e) => e.kind === 'prop_hit' && e.material === 'foliage'),
    `de klap klinkt als bladeren: ${JSON.stringify(audio)}`);
  assert.ok(berichten.some((t) => /boom|kruin/i.test(t)), `er komt een waarschuwing: ${berichten.join(' | ')}`);
}

// 2. Erboven langs: geen schade, hij vliegt door.
{
  const { v, berichten } = vlieg({ z: TREE_H + 4, seconden: 3, boom: true });
  assert.ok(v.x > 20, `boven de boom vliegt hij door (x=${v.x.toFixed(1)})`);
  assert.strictEqual(v.health, 100, 'boven de kruin geen schade');
  assert.ok(!berichten.some((t) => /boom|kruin/i.test(t)), 'geen boomwaarschuwing');
}

// 3. Dezelfde vlucht zonder bomen: niets aan de hand (de botsing komt echt van
//    de prop, niet van de map of het vliegmodel).
{
  const z = (CROWN_BASE + TREE_H) / 2;
  const { v, berichten } = vlieg({ z, seconden: 3, boom: false });
  assert.ok(v.x > 20, `zonder boom vliegt hij gewoon door (x=${v.x.toFixed(1)})`);
  assert.strictEqual(v.health, 100, 'zonder boom geen schade');
  assert.strictEqual(berichten.length, 0, 'zonder boom geen meldingen');
}

// 4. Van boven in de kruin zakken: de kruin is geen landingsplek, dus de heli
//    stuitert terug in plaats van erdoorheen te zakken naar de grond.
{
  const { v } = vlieg({ z: TREE_H + 8, seconden: 3, keys: ['control'], boom: true, x0: 0, speed: 0 });
  assert.ok(v.z > CROWN_BASE, `de heli zakt niet door de kruin (z=${v.z.toFixed(1)})`);
  assert.ok(v.health < 100, `de kruinaanraking doet schade (health=${Math.round(v.health)})`);
}

console.log('heli_boom_test ok');
