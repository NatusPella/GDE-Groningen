// De lancering in de wereld (#398, werflive.js) met een nepwereld: de aankondiging, de sirene, de plons, de golf die spelers,
// auto's, voetgangers en boten op de kade en in de basin verplaatst (nooit het water in), het schip dat daarna een echt schip
// wordt dat naar de Waddenzee vaart, en de randgevallen (te laat, speler weg, gepauzeerd, tweede keer dezelfde dag).
//   node scripts/werflive_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { updateWerf, afstandTotHelling, WEG_AFSTAND } from '../game/js/werflive.js';
import * as W from '../game/js/werf.js';
import { AGENDA } from '../game/js/evenementen.js';
import { createVaarNet, planVaarRoute } from '../game/js/vaarnet.js';

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const vaarFile = new URL('../game/vaarnet.json', import.meta.url);
const net = fs.existsSync(vaarFile) ? createVaarNet(JSON.parse(fs.readFileSync(vaarFile, 'utf8'))) : null;
class Vehicle { constructor(x, y, angle, model) { this.x = x; this.y = y; this.angle = angle; this.model = model; this.speed = 0; this.id = 900 + Math.floor(Math.abs(x)); } }
const env = {
  Vehicle,
  getVaarNet: () => net,
  planVaarRoute,
  // de basin is alles voorbij de kade (q < 0)
  waterAt: (map, x, y) => (W.naarWerf(x, y).q < 0 ? { depth: 3 } : null),
  buildingAt: () => false,
  waterPolyAt: () => ({ kind: 'kanaal' }),
};
const ev = AGENDA.find((e) => e.id === 'ev-werf-1');
const dag = ev.from;
const maak = (clock, spelerQ = 6, spelerL = 0) => {
  const p = W.naarWereld(spelerL, spelerQ);
  const msgs = [];
  return { clock, paused: false, msgs, addMessage: (t) => msgs.push(t), map: {}, vehicles: [], pedestrians: [], player: { x: p.x, y: p.y, inVehicle: null, shoveX: 0, shoveY: 0 } };
};
const loop = (world, sec, dt = 0.05, n0 = dag, hook = null) => { for (let t = 0; t < sec; t += dt) { updateWerf(dt, world, n0, env); if (hook) hook(t); } };

// 1 de speler is ver weg
{
  const w = maak(15.05, 6);
  const ver = W.naarWereld(3000, 6); w.player.x = ver.x; w.player.y = ver.y;
  loop(w, 3);
  check('ver weg gebeurt er niets', !w.werf.zichtbaar && w.werf.u == null && w.msgs.length === 0);
}
// 2 de aankondiging en de helling in beeld, maar nog niet om drie uur
{
  const w = maak(14.5, 6);
  const p = W.naarWereld(0, 6); const aan = W.naarWereld(480, 6);
  w.player.x = aan.x; w.player.y = aan.y;
  loop(w, 3);
  check('op een halve kilometer komt de aankondiging, eenmaal', w.msgs.filter((m) => /te water/.test(m)).length === 1, JSON.stringify(w.msgs));
  check('het schip staat dan in beeld op de helling', w.werf.zichtbaar && w.werf.u == null);
  check('de aankondiging noemt de werf en de tijd', /Scheepswerf De Kielhaal/.test(w.msgs[0]) && /15:00/.test(w.msgs[0]));
  loop(w, 3);
  check('niet nog een keer', w.msgs.filter((m) => /te water/.test(m)).length === 1);
  const w2 = maak(14.5, 6); const v2 = W.naarWereld(900, 6); w2.player.x = v2.x; w2.player.y = v2.y;
  loop(w2, 2);
  check('op 900 m zie je het schip nog niet', !w2.werf.zichtbaar);
  const w3 = maak(14.5, 6); w3.player.x = p.x; w3.player.y = p.y;
  loop(w3, 3, 0.05, dag + 1);
  check('op een andere dag is er niets', !w3.werf.zichtbaar);
}
// 3 de hele lancering
{
  const w = maak(15.05, 6, 0);
  const op = (l, q, extra) => { const c = W.naarWereld(l, q); return { x: c.x, y: c.y, ...extra }; };
  const auto = op(4, 9, { angle: 0.3, speed: 6, id: 5 });
  const ver = op(0, 100, { angle: 0, speed: 0, id: 6 });
  const voet = op(-20, 5, {});
  const boot = op(10, -12, { angle: 0, isBoat: true, speed: 0, id: 7 });
  const eigenBoot = op(-12, -15, { angle: 0, isBoat: true, speed: 0, id: 8, driver: 'player' });
  w.vehicles.push(auto, ver, boot, eigenBoot); w.pedestrians.push(voet);
  const start = { auto: W.naarWerf(auto.x, auto.y), ver: W.naarWerf(ver.x, ver.y), voet: W.naarWerf(voet.x, voet.y) };
  let gestart = false, nooitInWater = true, maxShove = 0, bootUit = null;
  loop(w, 40, 0.05, dag, () => {
    if (w.werf.u != null) gestart = true;
    for (const o of [auto, voet]) if (W.naarWerf(o.x, o.y).q < 0) nooitInWater = false;
    maxShove = Math.max(maxShove, Math.hypot(w.player.shoveX, w.player.shoveY));
    if (w.werf.u != null && w.werf.u > W.T_PLONS - 0.1 && bootUit === null) bootUit = { boot: W.naarWerf(boot.x, boot.y), eigen: W.naarWerf(eigenBoot.x, eigenBoot.y) };
  });
  check('om drie uur gaat de sirene en begint de lancering', gestart && w.msgs.some((m) => /sirene/i.test(m)));
  check('de speler is gewaarschuwd en niet gewond (er is geen schade in de wereld)', w.msgs.some((m) => /niet gewond/i.test(m)) && w.player.health === undefined);
  check('de golf duwt de speler landinwaarts (de terugstoot van player.js)', maxShove > 4 && maxShove <= W.GOLF.duwMax + 1e-9, maxShove.toFixed(1));
  const e = { auto: W.naarWerf(auto.x, auto.y), ver: W.naarWerf(ver.x, ver.y), voet: W.naarWerf(voet.x, voet.y) };
  check('de auto op de kade is landinwaarts geschoven', e.auto.q > start.auto.q + 5, `${start.auto.q.toFixed(1)} -> ${e.auto.q.toFixed(1)}`);
  check('de auto is nergens in het water gekomen', nooitInWater);
  check('de voetganger is geduwd', e.voet.q > start.voet.q + 4);
  check('een auto ver van de kade blijft staan', Math.abs(e.ver.q - start.ver.q) < 1e-6);
  check('de boten in de basin zijn voor de plons weggevaren', bootUit && bootUit.boot.q < -29 && bootUit.eigen.q < -29, JSON.stringify(bootUit));
  check('de speler in zijn eigen boot is gewaarschuwd', w.msgs.some((m) => /Weg uit de basin/.test(m)));
  const schip = w.vehicles.find((v) => v.werfSchip);
  check('daarna ligt er een echt schip in het water', !!schip && W.naarWerf(schip.x, schip.y).q < -10, schip && W.naarWerf(schip.x, schip.y).q.toFixed(1));
  check('het is het nieuwe zeeschip, een boot', schip && schip.isBoat && schip.model.kind === 'zeeschip' && schip.model.len === W.SCHIP.lengte);
  check('met de koers van de tijdlijn', schip && Math.abs(schip.angle - W.KOERS) < 1e-9);
  check('het vaart een route van het vaarnet', schip && ((schip._vaar && schip._vaar.pts.length > 5) || !net), schip && schip._vaar ? String(schip._vaar.pts.length) : 'geen route');
  check('en de werf onthoudt het schip om het later op te ruimen', w.werf.schip === schip);
  check('de lancering is klaar en de helling is leeg', w.werf.u == null && !w.werf.zichtbaar);
  check('het vertrek is gemeld', w.msgs.some((m) => /vaart uit naar de Waddenzee/.test(m)));
  // dezelfde dag niet nog een keer
  loop(w, 20, 0.05, dag);
  check('dezelfde dag komt er geen tweede schip', w.vehicles.filter((v) => v.werfSchip).length === 1 && w.werf.u == null);
  // het schip wordt opgeruimd als de speler ver weg is
  const dicht = W.naarWereld(0, 5);
  w.player.x = dicht.x + WEG_AFSTAND + 100; w.player.y = dicht.y;
  loop(w, 1, 0.05, dag);
  check('een vertrokken schip dat ver uit beeld is wordt opgeruimd', !w.vehicles.some((v) => v.werfSchip) && w.werf.schip === null);
}
// 4 te laat
{
  const w = maak(15.9, 6);
  loop(w, 4);
  check('wie te laat is ziet niets meer', !w.werf.zichtbaar && w.werf.u == null && !w.vehicles.length);
  w.clock = 15.1;
  loop(w, 4);
  check('en het schip komt niet meer terug die dag', w.werf.u == null);
}
// 5 de speler loopt weg midden in de lancering; pauze
{
  const w = maak(15.05, 6);
  loop(w, 8);
  check('de lancering loopt', w.werf.u != null && w.werf.u > 7);
  w.paused = true; const u0 = w.werf.u; loop(w, 3);
  check('in de pauze staat ze stil', w.werf.u === u0);
  w.paused = false;
  const ver = W.naarWereld(2000, 6); w.player.x = ver.x; w.player.y = ver.y;
  loop(w, 1);
  check('als de speler weg is wordt ze zonder hem afgemaakt, zonder schip', w.werf.u == null && !w.vehicles.some((v) => v.werfSchip));
}
// 6 de speler zit in een auto op de kade
{
  const w = maak(15.05, 8);
  const auto = { x: w.player.x, y: w.player.y, angle: 0, speed: 8, id: 11 };
  w.vehicles.push(auto); w.player.inVehicle = auto;
  const q0 = W.naarWerf(auto.x, auto.y).q;
  loop(w, 30);
  check('een speler in een auto wordt mee geduwd en krijgt een melding', W.naarWerf(auto.x, auto.y).q > q0 + 4 && w.msgs.some((m) => /voertuig/.test(m)));
  check('hij raakt niet gewond en zijn auto blijft heel', auto.wrecked === undefined && w.player.health === undefined);
  check('en de speler zelf wordt niet extra geschoven', w.player.shoveX === 0 && w.player.shoveY === 0);
}
// 7 een gebouw in de weg: de duw stopt ervoor
{
  const w = maak(15.05, 20);
  const auto = { x: w.player.x, y: w.player.y, angle: 0, speed: 0, id: 12 };
  w.vehicles.push(auto);
  const q0 = W.naarWerf(auto.x, auto.y).q;
  const wand = { ...env, buildingAt: (m, x, y) => W.naarWerf(x, y).q > q0 + 1.5 };
  for (let t = 0; t < 30; t += 0.05) updateWerf(0.05, w, dag, wand);
  const q1 = W.naarWerf(auto.x, auto.y).q;
  check('een gebouw houdt de golf tegen: niemand wordt erdoorheen geduwd', q1 <= q0 + 1.5 + 1e-6, `${q0.toFixed(1)} -> ${q1.toFixed(1)}`);
}
check('de afstand tot de helling is nul in het midden', afstandTotHelling(...Object.values(W.naarWereld(0, W.HART_Q))) < 1e-6);

console.log(bad ? `${bad} van ${n} mislukt` : `werflive_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
