// Sluizen als mechaniek (#236): de deuren per fase, de seinen, boten die er doorheen schutten
// (in beide richtingen, achter elkaar, tegen elkaar in), geen deadlock, en elke sluis van
// game/sluizen.json is te passeren.  node scripts/sluizen_test.mjs
// Puur: alleen locks.js, sluizen.js en vaarnet.js, geen scène en geen wereld.
import fs from 'node:fs';
import * as S from '../game/js/sluizen.js';
import * as LK from '../game/js/locks.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info !== '' ? ' (' + info + ')' : ''}`); } };

const T = LK.LOCK_TIMING;
const row = (o = {}) => ({ id: 1, n: 'Proefsluis', x: 0, y: 0, a: 0, l: 40, w: 8, lv: [-1, -2.3], ...o });
const boat = (u, dir = 1, o = {}) => ({ isBoat: true, x: u, y: 0, angle: dir > 0 ? 0 : Math.PI, speed: 0, halfLen: 3, model: { len: 6 }, ...o });

// een boot die recht door de sluis wil, 3 m/s, en stilstaat als een deur hem tegenhoudt
function drive(b, goalX, dt, speed = 3) {
  const px = b.x, py = b.y, pa = b.angle;
  if (Math.abs(goalX - b.x) < 0.5) { b.speed = 0; return; }
  b.speed = speed;
  b.x += Math.sign(goalX - b.x) * Math.min(speed * dt, Math.abs(goalX - b.x));
  if (S.lockGateStop(b, px, py, pa)) { b.x = px; b.y = py; b.angle = pa; b.speed = 0; b.blocked = (b.blocked || 0) + dt; }
}

// loopt de sluis met de boten tot ze er zijn (of tot maxT); geeft de aankomsttijden
function run(lock, boats, maxT = 600, dt = 0.1, log = null) {
  S._setSluizenForTest([lock]);
  const world = { vehicles: boats.map((e) => e.b), player: null };
  const done = new Map();
  for (let t = 0; t < maxT; t += dt) {
    for (const e of boats) {
      if (t < (e.at || 0) || done.has(e.b)) continue;
      drive(e.b, e.goal, dt);
      if (Math.abs(e.b.x - e.goal) < 0.6) done.set(e.b, t);
    }
    S.stepSluis(lock, dt, world);
    if (log) log(t, lock);
    if (done.size === boats.length) break;
  }
  return done;
}

// ---------------------------------------------------------------- de sluis in rust
{
  const k = S.makeSluis(row());
  ok(k.half === 20 && Math.abs(k.width - 8) < 1e-9, 'kolk 40 x 8');
  ok(k.sig[0] === 'green' && k.sig[1] === 'red', 'in rust: groen aan zijde 0, rood aan zijde 1');
  ok(k.gate[0] === 1 && k.gate[1] === 0, 'deur 0 open, deur 1 dicht');
  const lang = S.makeSluis(row({ l: 300 })), kort = S.makeSluis(row({ l: 5 }));
  ok(lang.half * 2 === S.SLUIS.MAX_LEN && kort.half * 2 === S.SLUIS.MIN_LEN, 'kolklengte tussen de grenzen (OSM tekent soms een heel kanaalstuk)');
  const a = S.makeSluis(row({ x: 100, y: 50, a: Math.PI / 2 }));
  const f = S.frameOf(a, 100, 80);
  ok(Math.abs(f.u - 30) < 1e-9 && Math.abs(f.lat) < 1e-9, 'de as draait mee met de hoek van de sluis');
}

// ---------------------------------------------------------------- de deur is een muur
{
  const k = S.makeSluis(row());
  S._setSluizenForTest([k]);
  const b = boat(10);
  const px = b.x; b.x = 24;
  ok(S.lockGateStop(b, px, 0, 0), 'een dichte deur (1) houdt een boot tegen die erdoorheen wil');
  const d = boat(-30); d.x = -10;
  ok(!S.lockGateStop(d, -30, 0, 0), 'de open deur 0 laat een boot erdoor');
  const e = boat(15); e.y = 20;
  ok(!S.lockGateStop(e, 25, 20, 0), 'ver naast de kolk (dwars) is er geen deur');
  const g = boat(20.3, 1); const pg = g.x; g.x = 21;
  ok(!S.lockGateStop(g, pg, 0, 0), 'wie op een dichte deur ligt, mag van de deur af');
  const h = boat(18.5, 1); const ph = h.x; h.x = 20.2;
  ok(S.lockGateStop(h, ph, 0, 0), 'maar niet er dwars doorheen');
}

// ---------------------------------------------------------------- één boot door de sluis, beide kanten op
for (const [side, label] of [[0, 'zijde 0 naar zijde 1'], [1, 'zijde 1 naar zijde 0']]) {
  const k = S.makeSluis(row());
  const dir = side ? -1 : 1;
  const b = boat(side ? 90 : -90, dir);
  const seen = { bad: false, minLift: 0, maxLift: 0, phases: new Set() };
  const done = run(k, [{ b, goal: side ? -90 : 90 }], 400, 0.1, (t, l) => {
    seen.phases.add(l.state);
    const lift = S.liftOf(l);
    seen.minLift = Math.min(seen.minLift, lift); seen.maxLift = Math.max(seen.maxLift, lift);
    // tijdens het schutten zijn beide deuren dicht en ligt de boot in de kolk
    if (l.state === 'levelling' && (l.gate[0] !== 0 || l.gate[1] !== 0)) seen.bad = true;
    if (l.state === 'levelling' && l.queue.some((q) => q.inside) && !S.inChamber(l, b.x, b.y)) seen.bad = true;
  });
  ok(done.has(b), `boot vaart door de sluis van ${label}`, done.get(b));
  ok(!seen.bad, `${label}: tijdens het schutten beide deuren dicht en de boot in de kolk`);
  ok(['ready', 'closing', 'levelling', 'opening'].every((s) => seen.phases.has(s)), `${label}: alle vier de fasen doorlopen`, [...seen.phases].join());
  const verschil = k.levels[1] - k.levels[0];   // -1,3: zijde 0 -> 1 zakt het peil
  ok(Math.abs((side ? seen.maxLift : seen.minLift) - (side ? -verschil : verschil)) < 0.05, `${label}: de boot gaat ${side ? 'omhoog' : 'omlaag'} met het peil`, side ? seen.maxLift : seen.minLift);
  ok(S.liftOf(k) === 0 && k.state === 'ready', `${label}: na afloop in rust, geen lift`);
  ok(k.at === (side ? 0 : 1), `${label}: de kolk staat nu aan de andere kant`);
  ok(S.signalOf(k, k.at) === 'green' && S.signalOf(k, 1 - k.at) === 'red', `${label}: groen aan de kant waar hij nu open staat`);
  ok(done.get(b) < 40 + 4 + 2 * T.GATE_S + LK.levelTime(k) + 40, `${label}: doorvaart binnen de verwachte tijd`, done.get(b));
}

// ---------------------------------------------------------------- de seinen per fase
{
  const k = S.makeSluis(row());
  const b = boat(-90, 1);
  const sigs = [];
  run(k, [{ b, goal: 90 }], 300, 0.1, (t, l) => { sigs.push(l.state + ':' + l.sig.join('/')); });
  const has = (s) => sigs.includes(s);
  ok(has('ready:green/red'), 'sein: klaar aan zijde 0 = groen/rood');
  ok(has('closing:red/red') && has('levelling:red/red'), 'sein: tijdens sluiten en schutten overal rood');
  ok(has('opening:red/amber'), 'sein: de andere deur gaat open = geel aan die kant');
  ok(has('ready:red/green'), 'sein: klaar aan zijde 1 = rood/groen');
  ok(!sigs.some((x) => (x.startsWith('closing') || x.startsWith('levelling')) && x.includes('green')), 'nooit groen terwijl de sluis schut');
}

// ---------------------------------------------------------------- de wachtende boot en de dichte deur
{
  const k = S.makeSluis(row());
  const b = boat(55, -1);                 // voor de dichte deur 1, 35 m ervoor, naar de sluis toe
  S._setSluizenForTest([k]);
  S.stepSluis(k, 0.1, { vehicles: [b] });
  b.speed = 3;
  S.stepSluis(k, 0.1, { vehicles: [b] });
  ok(k.queue.some((q) => q.who === b && q.side === 1), 'een boot die op een dichte deur aanvaart vraagt de sluis');
  const done = run(k, [{ b, goal: -80 }], 300);
  ok(done.has(b) && (b.blocked || 0) > 0, 'hij moet wachten (de deur hield hem tegen) en vaart dan door', b.blocked);
}

// ---------------------------------------------------------------- vier boten, van twee kanten tegelijk
{
  const k = S.makeSluis(row());
  const A = boat(-100, 1), B = boat(-130, 1), C = boat(100, -1), D = boat(125, -1);
  const done = run(k, [{ b: A, goal: 110 }, { b: B, goal: 110, at: 3 }, { b: C, goal: -110 }, { b: D, goal: -110, at: 6 }], 900);
  ok(done.size === 4, 'vier boten uit twee richtingen komen allemaal door: geen deadlock', done.size);
  ok(k.queue.length === 0, 'de wachtrij is daarna leeg');
  let samen = false;
  const k2 = S.makeSluis(row());
  const A2 = boat(-100, 1), C2 = boat(100, -1);
  run(k2, [{ b: A2, goal: 110 }, { b: C2, goal: -110 }], 900, 0.1, (t, l) => {
    if (l.state === 'levelling' && S.inChamber(l, A2.x, A2.y) && S.inChamber(l, C2.x, C2.y)) samen = true;
  });
  ok(!samen, 'tijdens het schutten zitten niet twee boten van tegengestelde kant in de kolk');
}

// ---------------------------------------------------------------- een lange rij
{
  const k = S.makeSluis(row({ lv: [-2.3, -2.3] }));
  const boats = [];
  for (let i = 0; i < 6; i++) boats.push({ b: boat(-60 - i * 12, 1), goal: 130, at: i * 2 });
  for (let i = 0; i < 6; i++) boats.push({ b: boat(60 + i * 12, -1), goal: -130, at: i * 3 });
  const done = run(k, boats, 3000);
  ok(done.size === 12, 'twaalf boten, zes per kant, komen allemaal door (gelijke peilen)', done.size);
}

// ---------------------------------------------------------------- een deur sluit niet op een boot
{
  const k = S.makeSluis(row());
  S._setSluizenForTest([k]);
  const lig = boat(-19, 1), vraag = boat(60, -1);
  vraag.speed = 3;
  const world = { vehicles: [lig, vraag] };
  let closedAt = null;
  for (let t = 0; t < 60; t += 0.1) { S.stepSluis(k, 0.1, world); if (k.state === 'closing' && closedAt === null) closedAt = t; }
  ok(closedAt !== null && closedAt >= S.SLUIS.CLEAR_MAX_S - 0.5, 'de deur wacht op een boot in de deurzone', closedAt);
  ok(closedAt !== null && closedAt < S.SLUIS.CLEAR_MAX_S + 8, 'maar niet voor altijd: na CLEAR_MAX_S sluit hij toch', closedAt);
  const k2 = S.makeSluis(row());
  S._setSluizenForTest([k2]);
  const v2 = boat(60, -1);
  v2.speed = 3;
  let c2 = null;
  for (let u = 0; u < 20; u += 0.1) { S.stepSluis(k2, 0.1, { vehicles: [v2] }); if (k2.state === 'closing' && c2 === null) c2 = u; }
  ok(c2 !== null && c2 < 6, 'zonder boot in de zone sluit hij na ~4 s', c2);
}

// ---------------------------------------------------------------- aanvragen die vervallen
{
  const k = S.makeSluis(row());
  S._setSluizenForTest([k]);
  const weg = boat(-60, 1); weg.speed = 3;
  S.stepSluis(k, 0.1, { vehicles: [weg] });
  ok(k.queue.some((q) => q.who === weg), 'een naderende boot vraagt');
  weg.x = -400;
  S.stepSluis(k, 0.1, { vehicles: [weg] });
  ok(!k.queue.some((q) => q.who === weg), 'een boot die wegvaart laat de aanvraag vallen');
  const wrak = boat(-30, 1); wrak.speed = 2;
  S.stepSluis(k, 0.1, { vehicles: [wrak] });
  wrak.wrecked = true;
  S.stepSluis(k, 0.1, { vehicles: [wrak] });
  ok(!k.queue.some((q) => q.who === wrak), 'een wrak laat de aanvraag vallen');
  const na = boat(90, -1);
  const done = run(k, [{ b: na, goal: -90 }], 300);
  ok(done.has(na), 'na vervallen aanvragen kan de volgende boot gewoon door');
}

// ---------------------------------------------------------------- een boot in de kolk aan de dichte deur
{
  const k = S.makeSluis(row());
  const vast = boat(15, 1);                       // in de kolk bij deur 1, die dicht is (de sluis staat aan zijde 0)
  const done = run(k, [{ b: vast, goal: 90 }], 400);
  ok(done.has(vast), 'een boot die in de kolk bij een dichte deur ligt, wordt uitgeschut');
}

// ---------------------------------------------------------------- de toeter
{
  const k = S.makeSluis(row());
  S._setSluizenForTest([k]);
  const ver = boat(300, -1);
  ok(S.hornSluis(ver) === null, 'toeteren ver van elke sluis doet niets');
  const c = boat(70, -1);
  ok(S.hornSluis(c) === k && k.queue.some((q) => q.who === c && q.side === 1), 'toeteren voor de sluis vraagt hem');
}

// ---------------------------------------------------------------- wachttijd en lift
{
  const k = S.makeSluis(row());
  ok(S.waitEstimate(k, 0) === 0 && S.waitEstimate(k, 1) > 20, 'wachttijd: nul waar hij klaar staat, anders een cyclus');
  S._setSluizenForTest([k]);
  ok(S.sluisLiftAt(0, 0) === 0, 'sluisLiftAt in rust is 0');
}

// ---------------------------------------------------------------- de gegevens: elke sluis van de provincie
{
  const file = JSON.parse(fs.readFileSync(new URL('../game/sluizen.json', import.meta.url), 'utf8'));
  const plekken = JSON.parse(fs.readFileSync(new URL('../game/waterplekken.json', import.meta.url), 'utf8')).plekken.filter((p) => p.t === 'sluis');
  ok(file.sluizen.length === plekken.length && file.sluizen.length >= 60, 'sluizen.json heeft elke sluis van waterplekken.json', `${file.sluizen.length} / ${plekken.length}`);
  const ids = new Set(plekken.map((p) => p.id));
  ok(file.sluizen.every((r) => ids.has(r.id)), 'elke sluis in sluizen.json komt uit waterplekken.json');
  ok(file.sluizen.every((r) => Array.isArray(r.lv) && r.lv.length === 2 && r.lv.every(Number.isFinite)), 'elke sluis heeft twee peilen');
  const robbengat = file.sluizen.find((r) => /Robbengat/.test(r.n)), zee = file.sluizen.find((r) => r.n === 'Zeesluis');
  ok(robbengat && Math.abs(robbengat.lv[0] - robbengat.lv[1]) >= 0.4, 'de Robbengatsluis (Lauwersoog) schut een merkbaar peilverschil', robbengat && robbengat.lv.join('/'));
  ok(zee && Math.abs(zee.lv[0] - zee.lv[1]) >= 0.4, 'de Zeesluis (Delfzijl) ook', zee && zee.lv.join('/'));
  const nopassage = [];
  let tmax = 0;
  for (const r of file.sluizen) {
    for (const side of [0, 1]) {
      // lokale coördinaten: de sluis op de oorsprong, de as langs x
      const kl = S.makeSluis({ ...r, x: 0, y: 0, a: 0 });
      const h = kl.half + 40;
      const b = boat(side ? h : -h, side ? -1 : 1);
      const done = run(kl, [{ b, goal: side ? -h : h }], 900, 0.2);
      if (!done.has(b)) nopassage.push(`${r.n || r.id} zijde ${side}`); else tmax = Math.max(tmax, done.get(b));
    }
  }
  ok(!nopassage.length, `een boot komt bij elke sluis van zijde 0 naar 1 en terug (${file.sluizen.length * 2} passages)`, nopassage.slice(0, 5).join(', '));
  ok(tmax < 240, 'de langste doorvaart blijft onder de vier minuten', Math.round(tmax));
  console.log(`  ${file.sluizen.length} sluizen, langste doorvaart ${Math.round(tmax)} s`);
}

// ---------------------------------------------------------------- het vaarnet
{
  const V = await import('../game/js/vaarnet.js');
  const net = V.createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));
  const rob = net.nodes.find((q) => q.type === 'sluis' && /Robbengat/.test(q.name));
  ok(rob && rob.edges.length >= 2, 'de Robbengatsluis is een knoop met takken naar beide kanten', rob && rob.edges.length);
  const pass = V.lockPassage({ levels: [-1, -2.3] });
  const k = S.makeSluis(row());
  const mech = run(k, [{ b: boat(-20, 1), goal: 20 }], 300).values().next().value;
  ok(pass > 20 && mech > 10, 'de routeplanner en het mechaniek rekenen allebei met een cyclus van tientallen seconden', `${pass} s / ${mech && mech.toFixed(0)} s`);
}

console.log(`sluizen_test ${fails ? 'FAIL' : 'ok'} (${n} controles)`);
process.exit(fails ? 1 : 0);
