// Laadscherm-hulp voor de shaderprogramma's (#985): hoeveel programma's van de renderer nog linken. De opening
// van een nieuw spel compileert de scène ook in de filmlichtstand (scene3d.js precompilePrograms({ filmLicht })) en
// het laadscherm wacht tot dat gelinkt is, zodat de cuts van de film niet synchroon linken (haperingen van 360 tot
// 1133 ms). Eigen module: scene3d.js blijft onder de omvangsgrens van #497.
import { getRenderer } from './scene3d.js';

let linkExt;

// Het aantal programma's dat nog niet gelinkt is (de niet-blokkerende COMPLETION_STATUS van KHR_parallel_shader_compile;
// zonder de extensie isReady()). Zonder de 25 ms-rem van scene3d.js programLinked: dit loopt alleen op het laadscherm,
// waar de vraag niets in beeld vertraagt. Een gelinkt programma krijgt `_linked`, zoals scene3d.js het onthoudt.
export function programsPending() {
  try {
    const renderer = getRenderer();
    const list = renderer && renderer.info.programs ? renderer.info.programs : [];
    const gl = renderer.getContext();
    if (linkExt === undefined) { try { linkExt = gl.getExtension('KHR_parallel_shader_compile'); } catch (e) { linkExt = null; } }
    let n = 0;
    for (const p of list) {
      if (p._linked) continue;
      let ready;
      try { ready = linkExt ? !!gl.getProgramParameter(p.program, linkExt.COMPLETION_STATUS_KHR) : p.isReady(); } catch (e) { ready = true; }
      if (ready) p._linked = true; else n++;
    }
    return n;
  } catch (e) { return 0; }
}

// Het aantal programma's dat de renderer nu kent (de noemer van programsPending() voor de voortgang van het laadscherm).
export function programsTotal() {
  try {
    const renderer = getRenderer();
    return renderer && renderer.info.programs ? renderer.info.programs.length : 0;
  } catch (e) { return 0; }
}
