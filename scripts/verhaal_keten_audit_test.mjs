// Test van de ketenaudit (scripts/verhaal_keten_audit.mjs): de echte keten is groen zonder wereld, en elke soort vastloper wordt
// gevonden in een bewust kapotte kopie. Zo kan de audit niet stilletjes verslappen (geen testverzwakking).
//   node scripts/verhaal_keten_audit_test.mjs
import { leesGegevens, ketenInvoer, ketenControles } from './verhaal_keten_audit.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const G = await leesGegevens();
const base = ketenInvoer(G, null, null);
const clone = (o) => JSON.parse(JSON.stringify(o));
const blok = (r) => r.findings.filter((f) => f.sev === 'blokkerend');
const codes = (r) => new Set(blok(r).map((f) => f.code));

// de echte keten
const echt = ketenControles(base);
ok(blok(echt).length === 0, 'de echte keten heeft geen blokkerende vondst', JSON.stringify(blok(echt).slice(0, 3)));
ok(echt.walk.length === G.A.STEPS.length + 1 && echt.walk.at(-1) === 'FINALE', 'de wandeling bezoekt alle stappen en eindigt op de finale', String(echt.walk.length));
ok(echt.walk[0] === 'M00' && G.A.STEPS.at(-1).id === 'F6', 'de keten begint bij de opening (M00) en eindigt bij F6');
ok(G.A.STEPS.some((s) => s.goal && s.goal.type === 'epilogue'), 'de epiloog (E) zit in de keten');
ok(echt.sceneRows.get('E') && echt.sceneRows.get('E').length > 0, 'de epiloog heeft scenes met regels');
ok(G.A.STEPS.length >= 70, 'alle stappen zijn gezien', String(G.A.STEPS.length));

// kapotte kopieen: elk wordt gevonden
const stepsCopy = () => G.A.STEPS.map((s) => ({ ...s }));
{
  const steps = stepsCopy(); steps[10].built = false;
  ok(codes(ketenControles({ ...base, steps })).has('K1'), 'een niet gebouwde stap stopt het verhaal (K1)');
}
{
  const steps = stepsCopy(); const a = steps.findIndex((s) => s.kind === 'activity' && s.id !== 'M00'); steps[a].goal = { type: 'bestaatniet' };
  ok(codes(ketenControles({ ...base, steps })).has('K2'), 'een onbekend doeltype is geen uitgang (K2)');
}
{
  const steps = stepsCopy(); const a = steps.findIndex((s) => s.kind === 'activity' && s.id !== 'M00'); steps[a] = { ...steps[a], goal: { type: 'reis', to: 'x', at: [NaN, 6], r: 250 } };
  ok(codes(ketenControles({ ...base, steps })).has('K2'), 'een reisdoel zonder coordinaten is geen uitgang (K2)');
}
{
  const bridges = clone(G.A.BRIDGES); bridges.push({ id: 'OX', after: 'Z99', via: 'car', scene: 'OX' });
  ok(codes(ketenControles({ ...base, bridges })).has('K3'), 'een brug na een stap die niet bestaat valt op (K3)');
}
{
  const stepDay = new Map(base.stepDay); stepDay.set('M05', 1);
  ok(codes(ketenControles({ ...base, stepDay })).has('K3'), 'een kalenderdag die terugloopt valt op (K3)');
}
{
  const flagReads = new Set([...base.flagReads, 'onbekende-vlag']);
  ok(codes(ketenControles({ ...base, flagReads })).has('K4'), 'een gelezen vlag die niemand zet valt op (K4)');
}
{
  const bridges = clone(G.A.BRIDGES); bridges.find((b) => b.id === 'O1').extra = [{ if: 'romantiek:weg-hand', line: ['Tessa', 'x'] }];
  ok(codes(ketenControles({ ...base, bridges })).has('K4'), 'een brug die een latere vlag leest valt op (K4)');
}
{
  const scenesById = new Map(base.scenesById); scenesById.delete('N1');
  ok(codes(ketenControles({ ...base, scenesById })).has('K8'), 'een scene die ontbreekt valt op (K8)');
}
{
  const scenesById = new Map(base.scenesById); scenesById.set('N1', { ...base.scenesById.get('N1'), lines: [{ speaker: 'Tammo', text: '' }] });
  ok(codes(ketenControles({ ...base, scenesById })).has('K8'), 'een regel zonder tekst valt op (K8)');
}
{
  const steps = stepsCopy(); const m = steps.findIndex((s) => s.kind === 'mission' && s.id !== 'M03'); steps[m].reward = -5;
  ok(codes(ketenControles({ ...base, steps })).has('K9'), 'een negatieve beloning valt op (K9)');
}
{
  const steps = stepsCopy(); const a = steps.findIndex((s) => s.kind === 'activity'); steps[a].reward = 50;
  ok(codes(ketenControles({ ...base, steps })).has('K9'), 'een activiteit die betaalt valt op (K9)');
}
{
  // een cyclus zonder voortgang: een stap die niet af kan omdat nextStep hem steeds teruggeeft
  const nextStep = (doneId, passed, seen, skip) => { const r = base.nextStep(doneId, passed, seen, skip); return r && r.id === 'M04' ? G.A.STEPS[0] : r; };
  ok(codes(ketenControles({ ...base, nextStep })).has('K1'), 'een stap die terugverwijst naar de eerste (cyclus) valt op (K1)');
}
{
  const nextStep = (doneId, passed, seen, skip) => base.nextStep(doneId, passed, undefined, skip);
  ok(codes(ketenControles({ ...base, nextStep })).has('K1'), 'zonder poort bij Deel 4 valt op (K1)');
}
{
  // met een def: timeLimit en eis
  const defs = new Map(); for (const s of G.A.STEPS.filter((q) => q.kind === 'mission')) defs.set(s.mission, { reward: s.reward, type: 'x', stages: [{ kind: 'goto' }] });
  ok(blok(ketenControles({ ...base, defs })).length === 0, 'met nette definities blijft de keten groen');
  const d2 = new Map(defs); d2.set('loket', { reward: 0, type: 'x', stages: [{ kind: 'goto' }], timeLimit: Infinity });
  ok(codes(ketenControles({ ...base, defs: d2 })).has('K6'), 'een oneindige tijdlimiet valt op (K6)');
  const d3 = new Map(defs); d3.set('bakkiestunt', { reward: G.A.STEPS.find((s) => s.id === 'M01').reward, type: 'x', stages: [{ kind: 'goto' }], requires: 'ufo' });
  ok(codes(ketenControles({ ...base, defs: d3 })).has('K5'), 'een eis die niet te halen is valt op (K5)');
}

console.log(`verhaal_keten_audit_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
