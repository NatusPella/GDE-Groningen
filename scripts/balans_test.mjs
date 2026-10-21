// Balans en tempo (scripts/bot/balans.mjs, #147): stappen uit synthetische gebeurtenissen, afwijkingen en de akte-tabel.
//   node scripts/balans_test.mjs
import { stepsOf, afwijkingen, rapport } from './bot/balans.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const ev = [];
const step = (id, t0, t1, extra = {}, inside = []) => {
  ev.push({ t: t0, type: 'step', event: 'begin', id, label: 'Titel ' + id });
  for (const e of inside) ev.push({ t: t0 + 1, ...e });
  ev.push({ t: t1, type: 'step', event: 'end', id, outcome: 'klaar', wall: (t1 - t0) / 2, dist: 400, cine: 30, cineN: 2, talk: 10, goals: 4, maxQuiet: 20, ...extra });
};
step('M01', 0, 200);
step('M02', 200, 400);
step('M03', 400, 640);
step('M04', 640, 1500, { dist: 2400, maxQuiet: 130 }, [{ type: 'mission', event: 'fail' }, { type: 'mission', event: 'fail' }, { type: 'cine', dur: 12 }, { type: 'doel', afstand: 1500, veh: 'auto', eerste: true }, { type: 'doel', afstand: 900, veh: 'te voet' }]);
step('M06', 1560, 1800, { limiet: 300, restMin: 12, actief: 288 });
step('M07', 1800, 2000, { limiet: 600, restMin: 480, actief: 60 });
step('M05', 1500, 1560, {}, [{ type: 'cheat', rung: 'objective' }, { type: 'cheat', rung: 'nudge' }, { type: 'stuck' }]);

const steps = stepsOf(ev);
ok(steps.length === 7, 'zeven stappen');
const m4 = steps.find((s) => s.id === 'M04');
const nom = (await import('./bot/balans.mjs')).nominaal(m4);
ok(nom.meter === 2400 && nom.sec === Math.round(1500 / 14 + 900 / 5.5), 'M04: de nominale route is de som van de doelafstanden', JSON.stringify(nom));
ok(m4.speel === 860 && m4.fails === 2 && m4.dist === 2400 && m4.cineDur.length === 1, 'M04: speeltijd, mislukt, afstand, cutscene', JSON.stringify(m4));
const m5 = steps.find((s) => s.id === 'M05');
ok(m5.cheats.length === 1 && m5.stuck === 1, 'M05: een cheat (de nudge telt niet) en een keer vast', JSON.stringify(m5));

const { med, out } = afwijkingen(steps);
ok(med === 220, 'mediaan van de stappen zonder cheat is 220 s', String(med));
const soorten = out.filter((o) => o.id === 'M04').map((o) => o.soort).sort();
ok(JSON.stringify(soorten) === JSON.stringify(['lang', 'opnieuw', 'rit', 'stilte']), 'M04 valt op door lang, opnieuw, rit en stilte', JSON.stringify(soorten));
ok(!out.some((o) => o.id === 'M01' || o.id === 'M02'), 'gewone stappen vallen niet op');
ok(out.some((o) => o.id === 'M06' && o.soort === 'krap'), 'een tijdlimiet die bijna op is valt op (krap)');
ok(out.some((o) => o.id === 'M07' && o.soort === 'ruim'), 'een tijdlimiet die nauwelijks gebruikt wordt valt op (ruim)');
ok(!out.some((o) => o.id === 'M05' && o.soort === 'lang'), 'een stap met een cheat telt niet als te lang');

// variatie: een stap met maar twee soorten stap (alleen rijden naar een punt) valt op, zonder doel-gebeurtenissen niet
{
  const e2 = [{ t: 0, type: 'step', event: 'begin', id: 'M08', label: 'x' }, { t: 1, type: 'doel', stage: 'goto', afstand: 100, veh: 'auto' }, { t: 100, type: 'doel', stage: 'goto', afstand: 300, veh: 'auto' }, { t: 101, type: 'doel', stage: 'chase', afstand: 50, veh: 'auto' }, { t: 300, type: 'step', event: 'end', id: 'M08', outcome: 'klaar' }];
  const v = afwijkingen(stepsOf(e2));
  ok(v.out.some((o) => o.id === 'M08' && o.soort === 'variatie'), 'twee soorten stap valt op als variatie');
  const e3 = e2.filter((e) => e.type !== 'doel');
  ok(!afwijkingen(stepsOf(e3)).out.some((o) => o.soort === 'variatie'), 'zonder doelgebeurtenissen geen oordeel over de variatie');
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'balans-'));
fs.writeFileSync(path.join(dir, 'events.jsonl'), ev.map((e) => JSON.stringify(e)).join('\n'));
fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ result: 'KLAAR', gameSeconds: 1560, wallSeconds: 800 }));
const { text } = rapport([['kop', dir]]);
ok(/## Akte 1/.test(text) && /\| M04 \|/.test(text) && /## Akten onderling/.test(text), 'het rapport heeft een tabel per akte en een vergelijking');
ok(/M04: 2 keer opnieuw/.test(text), 'het rapport noemt de afwijking');
fs.rmSync(dir, { recursive: true, force: true });

console.log(`balans_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
