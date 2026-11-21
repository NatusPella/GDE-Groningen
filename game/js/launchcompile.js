// Voorcompileren van de scène in porties (#1046). scene3d.js precompilePrograms() compileerde de hele scène in één blokkerende
// aanroep, twee keer voor een nieuw spel (gewone lichtstand en filmlicht): op het laadscherm één lange stilstand zonder voortgang.
// Hier wordt dat een CompilePlanner met één item per groep van de scène (en per lichtstand), met een tijdbudget per portie; main.js
// draait de porties met een yield naar het beeld ertussen, zodat de voortgangsbalk echt loopt. Eigen module: scene3d.js blijft onder #497.
import { CompilePlanner, COMPILE_BUDGET_MS } from './compileplanner.js';

// Een object met een `material` maar zonder geometry (zoals een Group met een handmatig gezet materiaal) laat renderer.compile()
// crashen (#804): zulke velden zijn geen draw-objecten en gaan even opzij terwijl `fn` draait. Geeft het aantal geparkeerde terug.
export function withParkedMaterials(root, fn) {
  const parked = [];
  root.traverse((o) => { if (o.material && !o.geometry) { parked.push([o, o.material]); o.material = null; } });
  try { fn(); } finally { for (const [o, m] of parked) o.material = m; }
  return parked.length;
}

// renderer.compile loopt alleen over zichtbare objecten (traverseVisible): wat nu verborgen is (de hemelkit, pools, afstandsgroepen) en straks
// in beeld komt, werd nooit gecompileerd en linkte bij de eerste draw. Verborgen objecten gaan er daarom even voor aan; `fn` draait zonder te tekenen.
export function withAllVisible(root, fn) {
  const hidden = [];
  root.traverse((o) => { if (o.visible === false) { hidden.push(o); o.visible = true; } });
  try { fn(); } finally { for (const o of hidden) o.visible = false; }
}
// three r160 renderer.compile loopt met scene.traverse over ALLE materialen (ook van verborgen objecten); alleen de lichten gaan via
// traverseVisible. withAllVisible was hier dus niet nodig en maakte verborgen lichten in de groep (de geleende setlichten, de nachtrig)
// zichtbaar: het lichtaantal van de compile week dan af van dat van de draw. Het blijft bestaan voor wie echt zichtbare objecten wil.
const compileGroup = (kit, g) => withParkedMaterials(g, () => kit.compile(g));

// kit = { scene, compile(obj), withLightRig(on, fn), lightRigOn(), filmOff } uit scene3d.js precompileKit().
// Prioriteit 0: de huidige lichtstand, eerst de groepen dichtbij het begin van de lijst; prioriteit 1: de andere lichtstand (film).
// Geeft de planner terug; niets is nog gecompileerd.
// Groepen van de scène die al in een plan zitten (laadscherm of laat): een nieuwe groep krijgt zijn eigen portie (scanLate).
const known = new WeakSet();
export function planPrecompile(kit, { filmLicht = false } = {}) {
  const planner = new CompilePlanner();
  const groups = kit.scene.children.slice();
  const film = filmLicht && !kit.filmOff;
  const rigNu = kit.lightRigOn();
  groups.forEach((g) => {
    known.add(g); groupLen.set(g, g.children.length);
    planner.add('nu:' + g.uuid, () => compileGroup(kit, g), 0);
    if (film) planner.add('film:' + g.uuid, () => withParkedMaterials(g, () => kit.withLightRig(!rigNu, () => kit.compile(g))), 1);
  });
  return planner;
}

// Draait de planner op het laadscherm: porties van `budgetMs`, daartussen `yieldFn()` (naar het beeld), tot hij leeg is of `maxMs`
// voorbij is. `onProgress(0..1)` na elke portie. Geeft { ms, rest } terug; wat overblijft draait later via stepIdleCompile().
export async function runPlanner(planner, { budgetMs = COMPILE_BUDGET_MS, maxMs = Infinity, yieldFn = async () => {}, onProgress = () => {}, now = () => performance.now() } = {}) {
  const t0 = now();
  while (planner.pending && now() - t0 < maxMs) {
    planner.step(budgetMs, now);
    onProgress(planner.progress);
    await yieldFn();
  }
  idle = planner.pending ? planner : null;
  return { ms: now() - t0, rest: planner.pending };
}

// Rest van een afgekapte laadscherm-compilatie, plus groepen die later in de scène komen (het huis van de speler, het kaartwerk, de
// opening-props): hun programma's linken zo op de achtergrond (KHR_parallel_shader_compile) voordat ze in beeld komen, in plaats van
// bij de eerste draw (een stilstaand beeld van een halve tot anderhalve seconde, #1046). Een kleine portie per frame in het spel.
let idle = null;
const late = new CompilePlanner({ forget: true });
const groupLen = new WeakMap(); // aantal kinderen per groep bij de vorige scan: een groep die groeit (kaartwerk, hemelkit) levert zijn nieuwe kinderen
let lateLen = -1, lateTick = 0;
export function scanLate(kit) {
  const kids = kit.scene.children;
  if (kids.length === lateLen && ++lateTick % 10) return;
  lateLen = kids.length;
  for (const g of kids) {
    if (g.isLight) continue;
    if (!known.has(g)) { known.add(g); groupLen.set(g, g.children.length); late.add('late:' + g.uuid, () => compileGroup(kit, g), 0); continue; }
    const n = g.children.length;
    if (n === groupLen.get(g)) continue;
    groupLen.set(g, n);
    for (const c of g.children) {
      if (known.has(c)) continue;
      known.add(c);
      late.add('late:' + c.uuid, () => compileGroup(kit, c), 0);
    }
  }
}
export function stepIdleCompile(budgetMs = 2, kitFn = null) {
  if (kitFn) { try { scanLate(kitFn()); } catch (e) { /* een scanfout is geen reden om te haperen */ } }
  let n = 0;
  if (idle) { n += idle.step(budgetMs); if (!idle.pending) idle = null; }
  else if (late.pending) n += late.step(budgetMs);
  return n;
}
export const idleCompilePending = () => (idle ? idle.pending : 0) + late.pending;
