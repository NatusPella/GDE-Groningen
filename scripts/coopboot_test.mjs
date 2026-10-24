// Samen spelen (#434): de boot bij de gast (coopboot.js), puur en zonder three.js:
//   node scripts/coopboot_test.mjs
// De eigen boot van de gast, de koers van een lang binnenvaartschip of containerschip, de deining in de maat van de romp,
// en hoe lang een groot schip buiten de snapshot mag doorvaren (LOD).
import assert from 'node:assert/strict';
import { gladBoot, eigenBoot, kiesEigenBoot, deiningBoot, bootBlijft, bootDraaiTau, BOOT_GHOST_S, BOOT_GHOST_MIN_LEN } from '../game/js/coopboot.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok  ' + naam); };
const DT = 1 / 60;

t('de eigen boot van de gast: bij world.coopBoot, ook als er een andere boot langszij ligt', () => {
  const boten = [{ id: 1, soort: 'boot', x: 100, y: 50, angle: 0, len: 6, wid: 2 }, { id: 2, soort: 'boot', x: 100.2, y: 50, angle: 0, len: 5, wid: 2 }];
  assert.equal(kiesEigenBoot({ x: 100.1, y: 50 }, boten, { x: 100.1, y: 50 }), 1, 'de gemelde boot wint van de buurboot');
  assert.equal(kiesEigenBoot(null, boten, { x: 100.2, y: 50 }), 2, 'zonder coopBoot: de boot waar hij op staat');
  assert.equal(kiesEigenBoot(null, boten, { x: 100.2, y: 53, inVehicle: null }), null, 'naast de boot (3 m opzij): niet zijn boot');
  assert.equal(kiesEigenBoot(null, [], { x: 0, y: 0 }), null, 'geen boten');
});

t('de eigen boot: het midden van een schip van 92 m is geen plek om aan boord te zijn', () => {
  const schip = [{ id: 7, soort: 'boot', x: 0, y: 0, angle: 0, len: 92, wid: 14.4 }];
  assert.equal(kiesEigenBoot(null, schip, { x: 40, y: 0 }), 7, 'op het dek, 40 m voor het midden: aan boord');
  assert.equal(kiesEigenBoot(null, schip, { x: 40, y: 20 }), null, '20 m naast de romp: niet aan boord');
  assert.equal(kiesEigenBoot({ x: NaN, y: 0 }, schip, { x: 60, y: 0 }), null, 'voorbij de boeg: niet aan boord');
});

t('een lange romp slingert niet meer op de koersstappen van de snapshot', () => {
  const bereik = (len) => {
    const st = {};
    let g = gladBoot(st, 0, 0, 1, 4, DT, len);
    let min = 9, max = -9;
    for (let k = 0; k < 300; k++) { // 10 Hz-meldingen die telkens een tikje anders staan
      g = gladBoot(st, k * 0.4, 0, 1 + (k % 12 < 6 ? 0.08 : -0.08), 4, DT, len);
      if (k > 150) { min = Math.min(min, g.angle); max = Math.max(max, g.angle); }
    }
    return max - min;
  };
  assert.ok(bereik(5.5) < 0.05, 'sloep: ' + bereik(5.5));
  assert.ok(bereik(50) < 0.05, 'binnenvaartschip van 50 m: ' + bereik(50));
  assert.ok(bereik(92) < 0.05, 'containerschip van 92 m: ' + bereik(92));
  assert.ok(bootDraaiTau(92) > bootDraaiTau(5.5), 'een schip dempt meer dan een sloep');
});

t('een gestage draai volgt zonder zichtbare achterstand, ook voor een schip', () => {
  const draai = (len, rate) => {
    const st = {};
    let g = gladBoot(st, 0, 0, 0, 5, DT, len), hoek = 0;
    for (let k = 1; k <= 600; k++) {
      if (k % 6 === 0) hoek += rate * 0.1; // de host draait rustig door, 10 meldingen per seconde
      g = gladBoot(st, 0, 0, hoek, 5, DT, len);
    }
    return Math.abs(hoek - g.angle);
  };
  assert.ok(draai(5.5, 0.2) < 0.06, 'sloep: ' + draai(5.5, 0.2));
  assert.ok(draai(50, 0.1) < 0.06, 'binnenvaartschip: ' + draai(50, 0.1));
  assert.ok(draai(92, 0.09) < 0.06, 'containerschip: ' + draai(92, 0.09));
});

t('een koerssprong of teleport zet de boot meteen goed, een kleine stap volgt vlot', () => {
  const st = {};
  gladBoot(st, 0, 0, 0, 0, DT);
  const sprong = gladBoot(st, 500, 0, Math.PI, 0, DT); // verplaatsing en koers in een keer
  assert.equal(sprong.x, 500, 'teleport: meteen op de nieuwe plek');
  assert.equal(sprong.angle, Math.PI, 'en met de nieuwe koers');
  const pose = gladBoot(st, 500, 0, -2, 0, DT); // 5,14 rad zonder verplaatsing: een nieuwe pose, geen draai
  assert.ok(Math.abs(pose.angle - -2) < 1e-9, 'meteen goed: ' + pose.angle);
  let g = gladBoot(st, 500, 0, -1.8, 0, DT); // 0,2 rad: een echte koersstap
  for (let k = 0; k < 60; k++) g = gladBoot(st, 500, 0, -1.8, 0, DT);
  assert.ok(Math.abs(g.angle - -1.8) < 0.02, 'na een seconde bijgetrokken: ' + g.angle);
});

t('deining in de maat van de romp: een sloep wiegt, een schip van 50 of 92 m bijna niet', () => {
  const hoogte = (len) => {
    let p = 0, r = 0, h = 0;
    for (let i = 0; i < 240; i++) {
      const d = deiningBoot(len, i / 60, 3);
      assert.ok([d.pitch, d.roll, d.heave].every(Number.isFinite), 'eindige deining');
      p = Math.max(p, Math.abs(d.pitch)); r = Math.max(r, Math.abs(d.roll)); h = Math.max(h, Math.abs(d.heave));
    }
    return { p, r, h };
  };
  const sloep = hoogte(5.5), barge = hoogte(50), zee = hoogte(92);
  assert.ok(sloep.p > 0.006 && sloep.h > 0.015, 'sloep deint: ' + JSON.stringify(sloep));
  assert.ok(barge.p < sloep.p * 0.5 && barge.r < sloep.r * 0.5 && barge.h < sloep.h * 0.5, 'binnenvaart rustiger: ' + JSON.stringify(barge));
  assert.ok(zee.p < 0.003 && zee.r < 0.004 && zee.h < 0.008, 'containerschip ligt stil: ' + JSON.stringify(zee));
  assert.deepEqual(deiningBoot(5.5, 10, 1), deiningBoot(5.5, 10, 1), 'zelfde tijd, zelfde deining');
});

t('LOD: alleen een groot, varend schip vaart buiten de snapshot nog even door', () => {
  assert.equal(bootBlijft(92, 0, 6), true, 'containerschip net uit beeld');
  assert.equal(bootBlijft(50, BOOT_GHOST_S, 3), true, 'binnenvaart aan het eind van de tijd');
  assert.equal(bootBlijft(92, BOOT_GHOST_S + 0.1, 6), false, 'daarna weg');
  assert.equal(bootBlijft(BOOT_GHOST_MIN_LEN - 0.1, 1, 6), false, 'een kleine boot gaat meteen weg');
  assert.equal(bootBlijft(92, 1, 0), false, 'een stilliggend schip vaart niet door');
  assert.equal(bootBlijft(92, 1, -6), true, 'achteruit varend telt ook');
  assert.equal(bootBlijft(92, -1, 6), false, 'geen onzin-tijd');
  assert.equal(bootBlijft(NaN, 1, 6), false, 'geen onzin-lengte');
});

t('een boot die terugkomt in de snapshot springt niet', () => {
  const st = {};
  let g = gladBoot(st, 0, 0, 0, 6, DT, 92); // vaart weg
  for (let k = 0; k < 60; k++) g = gladBoot(st, 6 * k / 60, 0, 0, 6, DT, 92);
  const voor = g.x;
  g = gladBoot(st, voor + 0.6, 0, 0, 6, DT, 92); // weer in beeld, een tiende verder
  assert.ok(Math.abs(g.x - (voor + 0.6)) < 0.5, 'geen sprong bij terugkomst: ' + (g.x - voor));
});

console.log(`coopboot_test: ${n} tests ok`);
