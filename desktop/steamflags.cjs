// Chromium switches for a game started from Steam (#64). Pure: main.js applies the result with
// app.commandLine.appendSwitch before the app is ready. There is no Steamworks library in the game; the
// Steam overlay hooks the window's graphics output from outside, and for that Chromium's GPU work has to
// run in the process Steam started. Off unless the Steam launch option holds --steam-overlay (or the
// environment has GDE_STEAM_OVERLAY=1), because this has not been tried with a real Steam client yet
// (docs/STEAM-CHECKLIST.md).
//
//   --steam-overlay   the overlay switches below
//   --no-sandbox      not handled here: Chromium reads it itself (Linux, when the Steam runtime refuses the sandbox)

// the switches for this start: [name, value?] pairs
function steamSwitches(argv = process.argv, env = process.env, platform = process.platform) {
  const wanted = argv.includes('--steam-overlay') || env.GDE_STEAM_OVERLAY === '1';
  if (!wanted) return [];
  const out = [['in-process-gpu']];
  // Windows composes the window through DirectComposition, which the overlay cannot draw over
  if (platform === 'win32') out.push(['disable-direct-composition']);
  return out;
}

module.exports = { steamSwitches };
