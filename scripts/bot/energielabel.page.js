// Page half voor `scripts/bot/run.mjs --page=scripts/bot/energielabel.page.js` (#408): de bot speelt de zijmissie "Aan de deur: het label" uit.
// Hij loopt naar de deur (een test-setup: teleport, gelogd als 'setup'), start de baan met E zoals een speler, leest elke vraag uit het paneel
// (window.__bot.status().blocking.dialog), zoekt het praatje in keuzewerk.js en drukt het antwoord dat de truc ontmaskert. Drie rondes, dus negen
// vragen; elke ronde moet foutloos zijn en het loon van een foutloze ronde opleveren. Resultaat: { rondes, goed, geld, verwacht }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt (?autoplay niet aan?)' });
const world = B.world, player = B.player;
const K = await imp('keuzewerk');
const SJ = await imp('sidejobs');
const job = K.KEUZE_JOBS.energielabel;
B.speed(4);   // on a loaded machine the game ran at a few frames a second: more steps per frame, the waits below are in real time
world.devInvuln = true;

const spot = SJ.getSideJobSpotsForRender().find((s) => s.job.id === 'energielabel');
if (!spot) return JSON.stringify({ result: 'FOUT', reason: 'geen startplek voor energielabel op de kaart' });
if (player.inVehicle) player.exitVehicle(world.map, world);
player.x = spot.x; player.y = spot.y; player.vx = player.vy = 0;
B.log('setup', { what: 'teleport', id: 'energielabel', x: Math.round(spot.x), y: Math.round(spot.y) });
await sleep(6000);
for (let i = 0; i < 40 && B.status().blocking.cinematic; i++) { B.down(' '); await sleep(1300); B.up(' '); }

const act = world.sideJobActions;
const money0 = world.money;
for (let k = 0; k < 6 && !act.active(); k++) { await B.press('e', 160); await sleep(2000); }
if (!act.active()) return JSON.stringify({ result: 'FOUT', reason: 'de baan startte niet na zes keer E' });
B.log('bijbaan', { id: 'energielabel', gestart: true });

const byQ = new Map(job.cases.map((c) => [c.q, c]));
// one answer per question: the panel keeps showing a question while its reply runs (1.4 s), so a question counts by its place (round, 'VRAAG n VAN 3')
const rondes = [];
let goed = 0, vragen = 0, fout = 0, ronde = 0, prevN = 0, cur = [];
const gedaan = new Set();
const t0 = performance.now();
let lastT = -1, stilT = 0, lastLog = 0;
while (act.active() && rondes.length < 3 && performance.now() - t0 < 600000) {
  const st = B.status();
  // the game clock stands still (the pause menu opened by itself, or the window lost focus): Escape closes the menu, Space starts a paused game again
  if (st.t === lastT) stilT += 200; else { stilT = 0; lastT = st.t; }
  if (st.blocking.pauseMenu) { await B.press('escape'); await sleep(400); continue; }
  if (stilT >= 3000 && st.blocking.paused) { await B.press(' '); stilT = 0; }
  if (performance.now() - lastLog > 20000) { lastLog = performance.now(); B.log('stil', { t: st.t, blocking: Object.keys(st.blocking).filter((k) => st.blocking[k]) }); }
  const d = st.blocking.dialog;
  const m = d && /VRAAG ([0-9]) VAN 3/.exec(d.kicker || '');
  if (!d || !d.options || !d.options.length || !m) { await sleep(200); continue; }
  const n = Number(m[1]);
  if (n < prevN) ronde++;
  prevN = n;
  const key = ronde + ':' + n;
  if (gedaan.has(key)) { await sleep(200); continue; }
  gedaan.add(key);
  const c = byQ.get(d.text);
  const i = c ? d.options.findIndex((o) => o.label === c.right) : -1;
  if (i < 0) { fout++; B.log('antwoord-niet-gevonden', { vraag: d.text, opties: d.options.map((o) => o.label) }); }
  vragen++; cur.push(i + 1);
  B.log('antwoord', { ronde, n, vraag: d.text.slice(0, 60), toets: i + 1 });
  await B.press(String(i < 0 ? 1 : i + 1), 120);
  if (i >= 0) goed++;
  if (n === 3) { rondes.push(cur); cur = []; await sleep(300); }
}
// the result card (3 s of game time) and the pay: until the last round is paid, at most 60 s
const p0 = K.keuzePay('energielabel', 3);
for (let i = 0; i < 240 && world.money - money0 < rondes.length * (p0.base + p0.tip); i++) await sleep(250);
const geld = Math.round(world.money - money0);
const p = K.keuzePay('energielabel', 3);
const verwacht = rondes.length * (p.base + p.tip);
B.log('einde-baan', { rondes: rondes.length, goed, vragen, geld, verwacht });
if (act.active()) { act.stop(); await sleep(1500); }
const ok = rondes.length === 3 && goed === vragen && fout === 0 && geld >= verwacht;
return JSON.stringify({ result: ok ? 'KLAAR' : 'MISLUKT', reason: ok ? 'drie foutloze rondes' : `rondes ${rondes.length}, goed ${goed}/${vragen}, fout ${fout}, geld ${geld} van ${verwacht}`, rondes, goed, vragen, geld, verwacht });
