// Which scene renderer.compile(obj, camera, target) takes its lights from.
// three r160 gathers the lights of the target scene AND of obj when they differ (Renderer.compile: "from both the
// target scene and the new object"). A compile of the whole scene against a light-only helper scene therefore counted
// every light twice: 2 directional + 2 hemisphere lights, so the ~108 programs it made did not match any real draw
// (1 + 1) and were linked again at the first frame (docs/PERF-PLEISTERS.md, programs.mjs). The whole scene is its own target.
export function compileTarget(obj, scene, lightScene) {
  return obj === scene ? scene : lightScene;
}
