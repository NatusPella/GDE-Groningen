// Watersport: zeilen, roeien, zwemmen en regatta (zeilrules.js, #197). Puur, geen browser.
//   node scripts/zeilrules_test.mjs
import * as Z from '../game/js/zeilrules.js';
import { BOAT_KINDS } from '../game/js/boattypes.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const deg = (d) => (d * Math.PI) / 180;

// bootsoorten
for (const [id, k] of Object.entries(Z.BOOT_SOORTEN)) {
  check(`${id}: velden aanwezig`, k.kind === id && k.len > 0 && k.wid > 0 && k.maxSpeed > 0 && k.accel > 0 && k.turnRate > 0 && ['zeil', 'riemen', 'motor'].includes(k.aandrijving));
  check(`${id}: in boattypes alleen voor roei- en zeilboot (speedboot staat in de winkel)`, id === 'speedboot' ? !BOAT_KINDS[id] : !!BOAT_KINDS[id] && BOAT_KINDS[id].soort === id);
}
check('speedboot is het snelst, roeiboot het traagst', Z.BOOT_SOORTEN.speedboot.maxSpeed > Z.BOOT_SOORTEN.zeilboot.maxSpeed && Z.BOOT_SOORTEN.zeilboot.maxSpeed > Z.BOOT_SOORTEN.roeiboot.maxSpeed);

// wind
let min = 99, max = 0, sprong = 0, prev = null;
for (let dag = 1; dag <= 40; dag++) for (let u = 0; u < 24; u += 0.5) {
  const w = Z.windOp(dag, u);
  min = Math.min(min, w.speed); max = Math.max(max, w.speed);
  if (prev && Math.abs(Z.wrap(w.dir - prev.dir)) > 1.2) sprong++;
  prev = w;
}
check('wind blijft zomerbries (2-9 m/s)', min >= Z.WIND.min - 1e-9 && max <= Z.WIND.max + 1e-9, `${min} ${max}`);
check('wind draait zacht', sprong === 0, sprong);
check('wind deterministisch', JSON.stringify(Z.windOp(5, 10)) === JSON.stringify(Z.windOp(5, 10)));
check('wrap', Math.abs(Z.wrap(7) - (7 - 2 * Math.PI)) < 1e-9 && Math.abs(Z.wrap(-4) - (-4 + 2 * Math.PI)) < 1e-9);

// poolcurve
check('dode hoek geeft niets', Z.polair(0) === 0 && Z.polair(deg(30)) === 0 && Z.polair(deg(-20)) === 0);
check('halve wind is het beste', Z.polair(deg(100)) === 1 && Z.polair(deg(100)) > Z.polair(deg(50)) && Z.polair(deg(100)) > Z.polair(deg(170)));
check('curve is symmetrisch', Z.polair(deg(70)) === Z.polair(deg(-70)));
check('voor de wind nog steeds vooruit', Z.polair(deg(180)) > 0.5);
let ok = true; for (let a = -180; a <= 180; a += 5) { const p = Z.polair(deg(a)); if (!(p >= 0 && p <= 1)) ok = false; }
check('curve binnen 0..1', ok);
check('trim: aan de wind strak, voor de wind los', Z.besteTrim(deg(40)) > Z.besteTrim(deg(170)) && Z.besteTrim(deg(30)) <= 1 && Z.besteTrim(deg(180)) >= 0.15);
check('juiste trim geeft hoogste rendement', Z.trimRendement(Z.besteTrim(deg(90)), deg(90)) === 1 && Z.trimRendement(0, deg(40)) < 1);

// varen: wind uit +x (dir 0), 6 m/s
const wind = { dir: 0, speed: 6 };
const vaar = (heading, sec, trim = null) => {
  const z = Z.createZeiler(0, 0, heading);
  if (trim !== null) z.trim = trim;
  for (let t = 0; t < sec; t += 0.05) { z.trim = trim ?? Z.besteTrim(Z.windHoek(z.heading, wind)); Z.stepZeil(z, {}, wind, 0.05); }
  return z;
};
const halve = vaar(Math.PI / 2, 20), dode = vaar(0, 20), voor = vaar(Math.PI, 20);
check('halve wind komt op snelheid', halve.speed > 3, halve.speed);
check('in de dode hoek komt de boot niet vooruit', dode.speed < 0.3, dode.speed);
check('voor de wind sneller dan in de dode hoek, trager dan halve wind', voor.speed > dode.speed + 2 && voor.speed < halve.speed);
check('sneller met meer wind', (() => { const z = Z.createZeiler(0, 0, Math.PI / 2); const w2 = { dir: 0, speed: 8 }; for (let t = 0; t < 20; t += 0.05) { z.trim = Z.besteTrim(Z.windHoek(z.heading, w2)); Z.stepZeil(z, {}, w2, 0.05); } return z.speed > halve.speed; })());
check('slechte trim kost snelheid', vaar(Math.PI / 2, 20, 0).speed < halve.speed);
check('snelheid nooit boven het maximum', halve.speed <= Z.BOOT_SOORTEN.zeilboot.maxSpeed + 1e-9);
check('positie verandert in de vaarrichting', halve.y > 20 && Math.abs(halve.x) < 1);
const draai = Z.createZeiler(0, 0, Math.PI / 2); draai.speed = 4;
Z.stepZeil(draai, { roer: 1 }, wind, 1);
check('roer draait de boot', Math.abs(Z.wrap(draai.heading - Math.PI / 2)) > 0.3);
const stil = Z.createZeiler(0, 0, 0);
check('stilstaand sturen draait nauwelijks', (() => { Z.stepZeil(stil, { roer: 1 }, { dir: 0, speed: 0.1 }, 1); return Math.abs(stil.heading) < 0.5; })());
check('standtekst', Z.standTekst(dode, wind).includes('wind') && Z.standTekst(halve, wind) === 'Halve wind' && Z.standTekst(voor, wind) === 'Voor de wind');

// omslaan = nat, geen leed, en je gaat daarna verder
const storm = Z.createZeiler(0, 0, Math.PI / 2); storm.trim = 1; storm.speed = 6; storm.helling = -0.7;
Z.stepZeil(storm, {}, { dir: 0, speed: 9 }, 0.05);
check('te veel wind en strakke schoot: omgeslagen', storm.omgeslagen > 0 && storm.apart === 1);
check('omgeslagen: ruimte om te herstellen', (() => { for (let t = 0; t < 4; t++) Z.stepZeil(storm, {}, { dir: 0, speed: 3 }, 1); return storm.omgeslagen === 0 && storm.speed < 1; })());
check('standtekst omgeslagen', Z.standTekst({ ...storm, omgeslagen: 2 }, wind).startsWith('Omgeslagen'));
check('rustige wind slaat niet om', (() => { const z = Z.createZeiler(0, 0, Math.PI / 2); z.trim = 1; for (let t = 0; t < 60; t += 0.05) Z.stepZeil(z, {}, { dir: 0, speed: 5 }, 0.05); return z.apart === 0; })());

// roeien
const rs = {};
const e1 = Z.roeiSlag(rs, 10), e2 = Z.roeiSlag(rs, 11.2), e3 = Z.roeiSlag(rs, 12.4), e4 = Z.roeiSlag(rs, 12.5);
check('ritme: goede slagen bouwen kracht op', e2.goed && e3.goed && e3.kracht > e2.kracht);
check('te snelle slag telt niet en reset reeks', !e4.goed && e4.kracht < 1 && rs.reeks === 0);
const bt = { speed: 0 }; for (let i = 0; i < 100; i++) Z.stepRoei(bt, 1.3, 0.1);
check('roeien begrenst op maximum', bt.speed === Z.BOOT_SOORTEN.roeiboot.maxSpeed);
check('demping remt af', Z.roeiDemping(3, 1) < 3 && Z.roeiDemping(3, 100) === 0);

// zwemmen
const zw = Z.createZwemmer();
let snelTijd = 0; while (!zw.moe && snelTijd < 200) { Z.stepZwem(zw, { snel: true }, 0.5); snelTijd += 0.5; }
check('snel zwemmen put uit', zw.moe && snelTijd >= 40 && snelTijd < 120, snelTijd);
check('moe zwemt rustiger', Z.stepZwem(zw, { snel: true }, 0.1).speed === Z.ZWEM.rustig);
for (let i = 0; i < 100; i++) Z.stepZwem(zw, {}, 0.5);
check('uitrusten herstelt', !zw.moe && zw.uithouding > Z.ZWEM.uithouding * 0.5);
const dz = Z.createZwemmer(); let maxD = 0, t = 0;
while (t < 60) { Z.stepZwem(dz, { duik: true }, 0.1); maxD = Math.max(maxD, dz.diepte); t += 0.1; if (dz.snakt) break; }
for (let i = 0; i < 60; i++) Z.stepZwem(dz, { duik: true }, 0.1);
check('duiken: diepte begrensd en lucht raakt op, dan omhoog', maxD <= Z.ZWEM.duikMax && dz.diepte === 0 && dz.snakt, String(maxD));
check('duikend trager', Z.stepZwem(Z.createZwemmer(), { duik: true }, 1).speed < Z.ZWEM.rustig);
check('lucht komt terug aan de oppervlakte', (() => { for (let i = 0; i < 100; i++) Z.stepZwem(dz, {}, 0.1); return dz.lucht === Z.ZWEM.duikLucht; })());

// regatta
const baan = Z.rondBaan(0, 0, 100, 4);
check('baan met vier tonnen op de cirkel', baan.length === 4 && baan.every((b) => Math.abs(Math.hypot(b.x, b.y) - 100) < 1e-6));
const r = Z.createRegatta(baan, { rondes: 2, richttijd: 100 });
check('tonnen in volgorde: overslaan telt niet', (() => { Z.stepRegatta(r, baan[2].x, baan[2].y, 1); return r.volgend === 0 && r.gerond === 0; })());
for (let k = 0; k < 7; k++) { const b = baan[k % 4]; Z.stepRegatta(r, b.x, b.y, 10); }
check('na zeven tonnen nog niet klaar', !r.klaar && r.gerond === 7 && r.ronde === 1);
check('voortgang loopt op', Z.regattaVoortgang(r) > 0.8 && Z.regattaVoortgang(r) < 1);
Z.stepRegatta(r, baan[3].x, baan[3].y, 10);
check('twee rondes: klaar met tijd', r.klaar && r.tijd === r.t && Z.regattaVoortgang(r) === 1);
check('na afloop tikt de klok niet door', (() => { const t0 = r.t; Z.stepRegatta(r, 0, 0, 50); return r.t === t0; })());
check('medaille: snelle tijd goud, trage tijd geen', Z.regattaMedaille({ klaar: true, tijd: 90, richttijd: 100 }) === 1 && Z.regattaMedaille({ klaar: true, tijd: 120, richttijd: 100 }) === 2 && Z.regattaMedaille({ klaar: true, tijd: 150, richttijd: 100 }) === 3 && Z.regattaMedaille({ klaar: true, tijd: 400, richttijd: 100 }) === 0 && Z.regattaMedaille({ klaar: false }) === 0);

// bot rondt een baan in redelijke tijd
const bot = Z.createZeiler(100, -50, Math.PI / 2);
const bb = Z.createRegatta(baan, { rondes: 1, richttijd: 400 });
const bw = { dir: Math.PI / 2 + 0.4, speed: 6 };
for (let t = 0; t < 900 && !bb.klaar; t += 0.1) { Z.stepBot(bot, baan[bb.volgend], bw, 0.1, 0.8); Z.stepRegatta(bb, bot.x, bot.y, 0.1); }
check('bot haalt de baan binnen 15 minuten', bb.klaar && bb.tijd < 900, bb.tijd);
check('bot blijft eindig', [bot.x, bot.y, bot.heading, bot.speed].every(Number.isFinite));

console.log(bad ? `${bad} van ${n} mislukt` : `zeilrules_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
