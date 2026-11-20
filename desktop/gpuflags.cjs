// Chromium switches for the best default GPU path (#1039). Pure: main.js applies the result with
// app.commandLine.appendSwitch before the app is ready.
//
// What we do NOT touch: the ANGLE backend (Windows already uses D3D11, the path every AMD, NVIDIA and
// Intel driver is best tested on; d3d11on12 and Vulkan are slower or younger), vsync (frame pacing
// depends on it: --disable-gpu-vsync and --disable-frame-rate-limit would give tearing and uneven
// frames) and the sandbox. What we do:
//   ignore-gpu-blocklist       a new GPU or driver (a brand new Radeon) is not yet on Chromium's allow list and would
//                              otherwise fall back to software GL (SwiftShader), the "13 to 24 fps even on Laag" case
//   disable-features=CalculateNativeWinOcclusion
//                              Windows: Chromium tracks which windows cover ours (a CPU cost per window event) and
//                              stops drawing a window it thinks is hidden; a game window under an overlay or a
//                              second monitor window should keep rendering at full pace
// GDE_GPU_FLAGS=0 turns this off (to compare, or if a driver objects); the player can also try
// --use-angle=d3d11 or --use-angle=vulkan on the command line, Chromium takes those itself.

function gpuSwitches(argv = process.argv, env = process.env, platform = process.platform) {
  if (env.GDE_GPU_FLAGS === '0') return [];
  // a software renderer on purpose (CI, headless tests): the blocklist is no concern there
  if (argv.some((a) => /^--(disable-gpu|use-gl=swiftshader|use-angle=swiftshader)/.test(a))) return [];
  const out = [['ignore-gpu-blocklist']];
  if (platform === 'win32') out.push(['disable-features', 'CalculateNativeWinOcclusion']);
  return out;
}

module.exports = { gpuSwitches };
