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

// kit = { scene, compile(obj), withLightRig(on, fn), lightRigOn(), filmOff } uit scene3d.js precompileKit().
// Prioriteit 0: de huidige lichtstand, eerst de groepen dichtbij het begin van de lijst; prioriteit 1: de andere lichtstand (film).
// Geeft de planner terug; niets is nog gecompileerd.
export function planPrecompile(kit, { filmLicht = false } = {}) {
  const planner = new CompilePlanner();
  const groups = kit.scene.children.slice();
  const film = filmLicht && !kit.filmOff;
  const rigNu = kit.lightRigOn();
  groups.forEach((g, i) => {
    planner.add('nu:' + g.uuid, () => withParkedMaterials(g, () => kit.compile(g)), 0);
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

// Rest van een afgekapte laadscherm-compilatie: een kleine portie per frame in het spel zelf, tot hij leeg is.
let idle = null;
export function stepIdleCompile(budgetMs = 2) {
  if (!idle) return 0;
  const n = idle.step(budgetMs);
  if (!idle.pending) idle = null;
  return n;
}
export const idleCompilePending = () => (idle ? idle.pending : 0);
