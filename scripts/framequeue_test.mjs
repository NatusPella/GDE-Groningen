// FrameQueue (tilestore.js): volgorde op prioriteit, het budget per aanroep, en de tijd per soort werk (byKind, #247).
//   node scripts/framequeue_test.mjs
const { FrameQueue } = await import('../game/js/tilestore.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// een nagebootste klok: elk werkstuk kost zoveel ms als in cost staat
let t = 0;
const now = () => t;
const q = new FrameQueue();
const ran = [];
const job = (name, cost) => () => { ran.push(name); t += cost; };
q.add(job('drop1', 1), 0, 'drop:a');
q.add(job('add-groot', 60), 1, 'add:a');
q.add(job('add-klein', 2), 1, 'add:b');
q.add(job('add-midden', 8), 1, 'add:c');

// budget 3 ms: de drop (prioriteit 0) loopt eerst, dan de grote tegel; daarna is het budget op
const k = q.run(3, now);
ok(k === 2 && ran.join() === 'drop1,add-groot', 'prioriteit en budget: twee stukken, de tweede overschrijdt het budget', ran.join());
ok(q.size === 2, 'de rest blijft staan voor het volgende frame', String(q.size));
q.run(100, now);
ok(ran.join() === 'drop1,add-groot,add-klein,add-midden', 'daarna in volgorde van binnenkomst', ran.join());

const b = q.stats.byKind;
ok(b.add && b.add.n === 3 && b.add.ms === 70 && b.add.max === 60, 'byKind add: aantal, totaal en langste', JSON.stringify(b.add));
ok(b.add.over5 === 2 && b.add.over20 === 1 && b.add.over50 === 1, 'byKind add: tellers boven 5, 20 en 50 ms', JSON.stringify(b.add));
ok(b.drop && b.drop.n === 1 && b.drop.over5 === 0, 'byKind drop apart bijgehouden', JSON.stringify(b.drop));
ok(q.stats.maxMs === 60 && q.stats.ran === 4, 'de bestaande tellers blijven kloppen', JSON.stringify(q.stats));

// een stuk zonder label telt onder '-'
const q2 = new FrameQueue();
q2.add(() => { t += 1; });
q2.run(10, now);
ok(q2.stats.byKind['-'] && q2.stats.byKind['-'].n === 1, 'zonder label telt het onder -');

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
