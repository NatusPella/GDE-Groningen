// Debug harness of the desktop shell (benchmark, smoke test, perf script, story
// test, trailer recording). main.js loads this only when the app is not
// packaged or GDE_DEV=1, so a player's install never runs --bench-eval,
// --smoke-eval or --perf-script through executeJavaScript (constitution 9).
const { app, ipcMain } = require('electron');
const path = require('path');
const fsSync = require('fs');
const { argValue, hasFlag, findArg } = require('./args.cjs');

// --trailer[=WxH] plays the trailer for recordings (js/trailer.js), also on a
// throwaway profile; --trailer-shot=N one shot, --trailer-cut=kort the short
// cut (teaser = 40 s, hoofd = 90 s: the script cuts), --trailer-preview plays
// the cut in real time with sound (hold Space to skip), --trailer-frames=<dir> saves every frame as a png,
// --trailer-video[=<file.mp4>] encodes the run straight to an MP4 with sound
// (trailervideo.js; default ~/Downloads, 1920x1080 unless --trailer=WxH)
const VIDEO = findArg('--trailer-video');
const TRAILER = findArg('--trailer') || (VIDEO && '--trailer');
// --clip=<map>: de trailerclips (scripts/trailer/): het spel zelf met een vaste tijdstap, elk beeld naar <map>/<clip>.mp4 (clipvideo.js);
// --clip-size=WxH (standaard 1920x1080). Altijd schaalfactor 1, zodat de pagina precies W x H CSS-pixels is
const CLIP = findArg('--clip');
const TRAILER_SIZE = TRAILER && TRAILER.includes('=') ? TRAILER.split('=')[1] : VIDEO ? '1920x1080' : CLIP ? (argValue('--clip-size') || '1920x1080') : null;
if (CLIP) {
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  // een venster dat achter een ander staat mag niet stoppen met tekenen (anders hangt de opname)
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
}
let video = null;
if (VIDEO) {
  const tv = require('./trailervideo.js');
  const ffmpeg = tv.findFfmpeg();
  if (!ffmpeg) { console.error('[video] ffmpeg not found (looked in /opt/homebrew/bin, /usr/local/bin and PATH); install it, e.g. brew install ffmpeg'); process.exit(1); }
  try {
    video = { tv, ffmpeg, out: tv.resolveOutput(VIDEO.includes('=') ? VIDEO.slice(VIDEO.indexOf('=') + 1) : null, __dirname) };
  } catch (e) { console.error('[video]', e.message); process.exit(1); }
}
// --benchmark[=N] runs the benchmark N times from the title screen, logs every
// shot's fps / draw calls / GPU memory and quits (throwaway profile)
const BENCH = findArg('--benchmark');

// test runs (--stil / --smoke-test) get a throwaway profile, so they never
// touch the player's saves, settings or achievements
const isTestRun = !!(TRAILER || CLIP || hasFlag('--autoplay') || BENCH || hasFlag('--stil') || hasFlag('--smoke-test') || hasFlag('--story-test') || hasFlag('--validate-spots'));

// --story-test[=<dir>] runs the automated story test (screenshots per step and
// report.json in <dir>); --validate-spots[=<dir>]: its spot check only
const spotsOnly = findArg('--validate-spots');
const storyTest = findArg('--story-test') || spotsOnly;
// --smoke-test=<png> logs the renderer's errors, saves a screenshot after a
// few seconds and quits
const smoke = argValue('--smoke-test');

// the page's query parameters for the test switches
function queryParts() {
  const silent = hasFlag('--stil');
  const trailerShot = argValue('--trailer-shot'), trailerCut = argValue('--trailer-cut'), trailerFrames = argValue('--trailer-frames');
  return [(silent || storyTest) && 'stil', hasFlag('--audio-graph') && 'audiograf', hasFlag('--coop') && 'coop', hasFlag('--hitch') && 'hitch', hasFlag('--zwartcheck') && 'zwartcheck', hasFlag('--dev') && 'dev', hasFlag('--reizen') && 'reizen', findArg('--autoplay') && (argValue('--autoplay') ? `autoplay=${encodeURIComponent(argValue('--autoplay'))}` : 'autoplay'), storyTest && 'storytest', spotsOnly && 'spotsonly',
    // automated runs never get the first-launch attract intro
    (smoke !== null || storyTest || hasFlag('--perf-test') || findArg('--autoplay')) && !TRAILER && 'noattract',
    TRAILER && 'trailer', TRAILER && trailerShot && `shot=${encodeURIComponent(trailerShot)}`, (TRAILER || hasFlag('--trailer-preview')) && trailerCut && `cut=${encodeURIComponent(trailerCut)}`,
    TRAILER && (trailerFrames || video) && 'frames', video && 'video', video && 'stil', hasFlag('--attract') && 'attract', hasFlag('--trailer-preview') && 'preview',
    !TRAILER && BENCH && `benchmark=${argValue('--benchmark') || 1}`,
    // --preset=laag: that graphics preset for this run only (not saved)
    argValue('--preset') && `preset=${encodeURIComponent(argValue('--preset'))}`,
    // --gfx-advice[=<gpu string>]: the first-run graphics advice also in a test run
    hasFlag('--gfx-advice') && 'gfxadvies',
    // --nobatch: city buildings drawn one by one (A/B of buildingbatch3d.js)
    hasFlag('--nobatch') && 'nobatch',
    hasFlag('--touch') && 'touch=1',
    // --url-flags=simauto,zonderworker: extra ?-switches of devflags.js for this run (A/B metingen, scripts/perf/run.mjs)
    ...(argValue('--url-flags') || '').split(',').filter(Boolean),
    // --vlakbruggen: the bridges and viaducts of streamed tiles flat on the street, as before #300
    hasFlag('--vlakbruggen') && 'vlakbruggen',
    argValue('--gfx-advice') && `gpu=${encodeURIComponent(argValue('--gfx-advice'))}`].filter(Boolean);
}

// hooks on the window; main.js calls this right before win.loadURL
function attach(win, { gameDir }) {
  const trailerFrames = argValue('--trailer-frames');
  // --profile-load[=ms]: a CPU profile of the page load (default 20 s from navigation)
  if (hasFlag('--profile-load')) {
    win.webContents.once('did-navigate', () => runProfile(win, Number(argValue('--profile-load')) || 20000).catch((err) => console.log('[profile]', err.message)));
  }
  // --benchmark --profile: a CPU profile of 30 s of the first run
  if (BENCH && hasFlag('--profile')) win.webContents.once('did-finish-load', () => setTimeout(() => runProfile(win, 30000), 25000));
  if (BENCH || TRAILER || argValue('--bench-eval')) {
    win.webContents.on('console-message', (e, legacyLevel, legacyMessage) => {
      const message = String(e.message !== undefined ? e.message : legacyMessage);
      if (message.startsWith('[trailer]') || message.startsWith('[mem]') || message.startsWith('[load]')) console.log(message);
    });
  }
  // --bench-eval=<file>: debug script run in the page as soon as it loads
  // (e.g. a GPU-memory tracker for --benchmark or --perf-script runs)
  // --cpu-throttle=4: slows the page's CPU like DevTools does (perf runs on a
  // weak machine stand-in, scripts/perf/run.sh)
  const throttle = Number(argValue('--cpu-throttle'));
  if (throttle > 1) win.webContents.once('did-finish-load', async () => {
    const dbg = win.webContents.debugger;
    try { if (!dbg.isAttached()) dbg.attach('1.3'); await dbg.sendCommand('Emulation.setCPUThrottlingRate', { rate: throttle }); } catch (e) { console.log('[cpu-throttle]', e.message); }
  });
  const evalFile = argValue('--bench-eval');
  if (evalFile) win.webContents.on('dom-ready', () => win.webContents.executeJavaScript(fsSync.readFileSync(evalFile, 'utf8')).catch((e) => console.log('[bench-eval]', e.message)));
  // --boot-capture=<dir>: the page's console.log('[bootcap] name') saves a screenshot to <dir>/boot-<name>.png
  // (QA: the first loading screen, scripts/qa/boot_shots.mjs)
  const bootCap = argValue('--boot-capture');
  if (bootCap) {
    fsSync.mkdirSync(bootCap, { recursive: true });
    win.webContents.on('console-message', async (e, legacyLevel, legacyMessage) => {
      const message = String(e.message !== undefined ? e.message : legacyMessage);
      if (!message.startsWith('[bootcap] ')) return;
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(bootCap, `boot-${message.slice(10).trim()}.png`), img.toPNG());
    });
  }
  if (CLIP) {
    const clipv = require('./clipvideo.js');
    const ffmpeg = clipv.findFfmpeg();
    if (!ffmpeg) { console.error('[clip] ffmpeg niet gevonden (PATH of GDE_FFMPEG)'); process.exit(1); }
    const clipDir = path.resolve(CLIP.includes('=') ? CLIP.slice(CLIP.indexOf('=') + 1) : 'clips');
    clipv.setupClips({ ipcMain, win, dir: clipDir, ffmpeg });
    if (hasFlag('--clip-repl')) clipv.setupRepl({ win, dir: clipDir, app });
    win.webContents.on('console-message', (e, legacyLevel, legacyMessage) => {
      const message = String(e.message !== undefined ? e.message : legacyMessage);
      if (message.startsWith('[clip]')) console.log(message);
    });
  }
  if (video) {
    const [W, H] = TRAILER_SIZE.split('x').map(Number);
    video.run = video.tv.setupTrailerVideo({ ipcMain, win, out: video.out, size: [W - (W % 2), H - (H % 2)], gameDir, ffmpeg: video.ffmpeg });
    // the page quits after its last frame: let ffmpeg finish the file first
    app.on('before-quit', (e) => {
      if (video.closed) return;
      e.preventDefault();
      video.run.finish().then((code) => { video.closed = true; app.exit(code ? 1 : 0); });
    });
  } else if (TRAILER && trailerFrames) {
    fsSync.mkdirSync(trailerFrames, { recursive: true });
    ipcMain.removeHandler('gde:capture-frame');
    ipcMain.handle('gde:capture-frame', async (e, n) => {
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(trailerFrames, `frame-${String(n).padStart(5, '0')}.png`), img.toPNG());
      return true;
    });
  }
  // --emulate-mobile with it: a phone (touch events, viewport meta, like Chrome's device mode);
  // --touch forces the touch controls on (?touch=1)
  // --emulate-view=WxH[@scale]: the page lays out in a WxH viewport (a 4K layout on a smaller screen),
  // shown at `scale` (default 0.5) in the window; for the screenshot script (scripts/ui_shots.mjs)
  const emu = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(argValue('--emulate-view') || '');
  if (emu) {
    const apply = () => win.webContents.enableDeviceEmulation({ screenPosition: hasFlag('--emulate-mobile') ? 'mobile' : 'desktop', screenSize: { width: +emu[1], height: +emu[2] }, viewPosition: { x: 0, y: 0 }, viewSize: { width: +emu[1], height: +emu[2] }, deviceScaleFactor: 1, scale: Number(emu[3]) || 0.5 });
    win.webContents.on('did-finish-load', apply);
  }
  // GDE_BOOT_PROFILE=<ms>: a CPU profile of the first ms of the page (from dom-ready), for what the boot and the menu gate wait for (#247)
  if (process.env.GDE_BOOT_PROFILE) win.webContents.once('dom-ready', () => runProfile(win, Number(process.env.GDE_BOOT_PROFILE)).catch((err) => console.log('[profile]', err.message)));
  if (storyTest) runStoryTest(win, storyTest.includes('=') ? storyTest.slice(storyTest.indexOf('=') + 1) : path.join(require('os').tmpdir(), 'gde-story-test'));
  if (smoke !== null) {
    win.webContents.on('console-message', function (e, legacyLevel, legacyMessage) {
      const level = e.level !== undefined ? e.level : legacyLevel;
      const message = e.message !== undefined ? e.message : legacyMessage;
      if (level === 'error' || level === 3 || /error|fail/i.test(String(message))) console.log('[renderer]', message, e.sourceId ? `(${String(e.sourceId).split('/').slice(-2).join('/')}:${e.lineNumber})` : '');
    });
    win.webContents.on('did-fail-load', (e, code, desc, url) => console.log('[load failed]', code, desc, url));
    setTimeout(async () => {
      try {
        // a loaded machine (other test runs) needs longer than the fixed delay: wait up to 90 s for the game (GDE_SMOKE_WAIT_S: longer; with three
        // other Electron runs and 400 MB of free memory the game took more than 90 s to come up and every test script failed on its first import)
        const waitS = Number(process.env.GDE_SMOKE_WAIT_S) || 90;
        for (let i = 0; i < waitS && !(await win.webContents.executeJavaScript('!!window.__debug')); i++) await new Promise((r) => setTimeout(r, 1000));
        // --smoke-eval=<js> runs in the page first (e.g. open a menu), so the
        // screenshot shows that state
        const evalArg = argValue('--smoke-eval');
        if (evalArg !== null) {
          await win.webContents.executeJavaScript(evalArg);
          await new Promise((r) => setTimeout(r, 1500));
        }
        const img = await win.webContents.capturePage();
        fsSync.writeFileSync(smoke, img.toPNG());
        const info = await win.webContents.executeJavaScript(`JSON.stringify({
          ready: !!window.__debug, canvas: !!document.querySelector('canvas'),
          version: (document.querySelector('.ss-ver') || {}).textContent || '',
          font: document.fonts.check('40px Bebas Neue'),
          desktop: !!window.gdeDesktop, fullscreen: window.gdeDesktop ? window.gdeDesktop.isFullscreen() : null,
          menu: [...document.querySelectorAll('#start-screen .ss-item')].map((e) => e.firstChild && e.firstChild.textContent).join(' | '),
          pauseButtons: [...document.querySelectorAll('#pause-menu .pm-game [data-action]')].map((b) => b.dataset.action).join(','),
          fullscreenToggle: !!document.querySelector('[data-desktop="fullscreen"]'),
        })`);
        console.log('[smoke]', info);
        // --perf-script=<file>: after starting a game, run the file's body as an
        // async function in the page and log what it returns
        const scriptArg = argValue('--perf-script');
        // --bot-events=<file>: where the Spelbot's events go (see above)
        const botEvents = argValue('--bot-events');
        if (scriptArg !== null) {
          // console.log('[capture] name') from the script saves a screenshot
          // next to the smoke-test png: <smoke>-<name>.png
          win.webContents.on('console-message', async (e, legacyLevel, legacyMessage) => {
            const message = String(e.message !== undefined ? e.message : legacyMessage);
            // Spelbot (#186): console.log('[bot-log] <json>') lines and the page's warnings and errors go to the run's events file
            if (botEvents) {
              const lvl = e.level !== undefined ? e.level : legacyLevel;
              if (message.startsWith('[bot-log] ')) fsSync.appendFileSync(botEvents, message.slice(10) + '\n');
              else if (lvl === 'warning' || lvl === 'error' || lvl === 2 || lvl === 3) fsSync.appendFileSync(botEvents, JSON.stringify({ type: 'console', level: lvl === 2 ? 'warning' : lvl === 3 ? 'error' : lvl, msg: message.slice(0, 600), wall: Date.now() }) + '\n');
            }
            // console.log('[profile] 8000') from the script: a CPU profile of that many ms
            if (message.startsWith('[profile] ')) { runProfile(win, Number(message.slice(10)) || 6000).catch((err) => console.log('[profile]', err.message)); return; }
            // console.log('[heapprof] 6000') from the script: sampled allocations (also those collected by now) of that many ms, top call sites by bytes
            if (message.startsWith('[heapprof] ')) { runHeapProfile(win, parseInt(message.slice(11), 10) || 6000, /live/.test(message)).catch((err) => console.log('[heapprof]', err.message)); return; }
            // console.log('[trace] 6000') from the script: a Chromium trace (all processes, main thread and GPU tracks) of that many ms to GDE_TRACE_OUT (scripts/perf/trace.mjs)
            if (message.startsWith('[trace] ')) { runTrace(Number(message.slice(8)) || 6000).catch((err) => console.log('[trace]', err.message)); return; }
            // testharnas (#95, tekstvelden): echte toetsen en een klembord, zoals een speler ze heeft
            if (message.startsWith('[sendinput] ')) { try { win.webContents.sendInputEvent(JSON.parse(message.slice(12))); } catch (er) { /* geen geldig invoerbericht */ } return; }
            if (message.startsWith('[clipboard-set] ')) { try { require('electron').clipboard.writeText(message.slice(16)); } catch (er) { /* geen klembord */ } return; }
            if (!message.startsWith('[capture] ')) return;
            const img = await win.webContents.capturePage();
            fsSync.writeFileSync(smoke.replace(/\.png$/, `-${message.slice(10).trim()}.png`), img.toPNG());
          });
          const body = fsSync.readFileSync(scriptArg, 'utf8');
          await win.webContents.executeJavaScript(`(async () => {
            const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
            if (!${JSON.stringify(!!process.env.GDE_MENU_TEST)}) { // GDE_MENU_TEST=1: het script krijgt het hoofdmenu zelf (coöp-testbank --menu)
            // the menu waits for its gate (world drawn, streaming quiet) and ignores keys before: press Enter until the title screen is gone
            // (on a loaded machine the game ran under a menu that stayed)
            const ss = document.getElementById('start-screen');
            let seen = false;
            for (let i = 0; i < 60; i++) {
              const up = !!ss && ss.classList.contains('visible');
              if (up) { seen = true; key('Enter', 'Enter'); }
              await new Promise((r) => setTimeout(r, up ? 2500 : 1000));
              if (seen && !ss.classList.contains('visible')) break;
            }
            const w = window.__debug && window.__debug.world;
            for (let i = 0; i < 25 && w && w.paused; i++) { key(' ', 'Space'); await new Promise((r) => setTimeout(r, 700)); }
            }
          })()`);
          const out = await win.webContents.executeJavaScript(`(async () => { ${body}\n })()`);
          console.log('[perf-script]', typeof out === 'string' ? out : JSON.stringify(out));
        }
        if (hasFlag('--perf-test')) {
          // --perf-at=x,y,heading[;x,y,heading...] teleports the player to fixed
          // spots so runs are comparable (the new-game spawn is a random landmark)
          const atArg = argValue('--perf-at');
          const spots = atArg ? atArg.split(';').map((s) => s.split(',').map(Number)) : [null];
          const expArg = argValue('--perf-exp');
          const expFiles = expArg ? expArg.split('+').map((f) => fsSync.readFileSync(f, 'utf8')) : ['null'];
          const expSrc = expFiles.pop(), expPre = expFiles.join(';\n');
          await win.webContents.executeJavaScript(`(async () => {
            const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
            key('Enter', 'Enter');
            await new Promise((r) => setTimeout(r, 2500));
            const w = window.__debug && window.__debug.world;
            for (let i = 0; i < 25 && w && w.paused; i++) { key(' ', 'Space'); await new Promise((r) => setTimeout(r, 700)); }
            await new Promise((r) => setTimeout(r, 3000));
          })()`);
          for (const spot of spots) {
          const perf = await win.webContents.executeJavaScript(`(async () => {
            const spot = ${JSON.stringify(spot)};
            const w = window.__debug && window.__debug.world;
            // cutscenes (e.g. the new-wijk flyover a teleport triggers) are skipped
            // so every spot is measured from the street-level follow camera
            const cine = await import('/js/cinematics.js').catch(() => null);
            clearInterval(window.__perfSkip);
            window.__perfSkip = cine && setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
            if (spot && w) {
              const p = w.player;
              const s = (w.map.findOpenSpawn && w.map.findOpenSpawn(spot[0], spot[1], 80)) || { x: spot[0], y: spot[1] };
              p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
              if (Number.isFinite(spot[2])) { p.angle = spot[2]; w.camYaw = spot[2]; }
              await new Promise((r) => setTimeout(r, 6000));
            }
            const measure = async (ms) => {
              const t = []; let last = performance.now(); const t0 = last;
              await new Promise((res) => { const f = () => { const n = performance.now(); t.push(n - last); last = n; if (n - t0 < ms) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
              t.sort((a, b) => a - b);
              const avg = t.reduce((a, b) => a + b, 0) / t.length;
              return { fps: +(1000 / avg).toFixed(1), p50: +t[Math.floor(t.length * 0.5)].toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1) };
            };
            const r = window.__scene3d && window.__scene3d.renderer;
            // draw calls / triangles per frame, main view vs shadow map
            const sc = window.__scene3d;
            let calls = 0, tris = 0, shadowCalls = 0, frames = 0;
            const orig = r.render.bind(r);
            r.render = function (scene, camera) { const c0 = r.info.render.calls, t0 = r.info.render.triangles; orig(scene, camera); calls += r.info.render.calls; tris += r.info.render.triangles; };
            const sm = r.shadowMap; const origSm = sm.render.bind(sm);
            sm.render = function (...a) { const before = r.info.render.calls; origSm(...a); shadowCalls += r.info.render.calls - before; };
            r.info.autoReset = true;
            const tc = performance.now();
            await new Promise((res) => { const f = () => { frames++; if (performance.now() - tc < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
            r.render = orig; sm.render = origSm;
            const counts = { callsPerFrame: Math.round(calls / frames), trisPerFrame: Math.round(tris / frames), shadowCallsPerFrame: Math.round(shadowCalls / frames), geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs.length };
            let meshes = 0, visibleMeshes = 0, instanced = 0; sc.scene.traverse((o) => { if (o.isMesh) { meshes++; if (o.visible) visibleMeshes++; if (o.isInstancedMesh) instanced++; } });
            counts.meshes = meshes; counts.visibleMeshes = visibleMeshes; counts.instanced = instanced;
            // which kinds of meshes are drawn: group by the first named ancestor / userData kind
            const groups = new Map();
            sc.scene.traverseVisible((o) => {
              if (!o.isMesh) return;
              let a = o, label = '';
              while (a && !label) { label = a.userData && (a.userData.kind || a.userData.type || a.userData.propKind) || a.name || ''; a = a.parent; }
              const key = (label || 'unnamed') + (o.castShadow ? ' [shadow]' : '');
              groups.set(key, (groups.get(key) || 0) + 1);
            });
            counts.topGroups = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
            const out = { at: w ? [Math.round(w.player.x), Math.round(w.player.y)] : null, counts, dpr: window.devicePixelRatio, css: [innerWidth, innerHeight], vehicles: w ? w.vehicles.length : 0, peds: w ? w.pedestrians.length : 0 };
            const pr0 = window.__perfPr0 || (window.__perfPr0 = r ? r.getPixelRatio() : 0);
            const prs = spot ? [pr0] : [pr0, 1.5, 1];
            for (const pr of prs) {
              if (r && pr) { r.setPixelRatio(pr); window.dispatchEvent(new Event('resize')); if (sc.postfx) sc.postfx.rebuild(); await new Promise((res) => setTimeout(res, 800)); }
              out['pr' + pr] = await measure(5000);
            }
            // --perf-exp=<file>: [[name, () => undoFn], ...] toggled one at a time
            ${expPre}
            const exps = ${expSrc};
            if (exps) {
              out.exp = {}; if (window.__perfInfo) out.info = window.__perfInfo;
              for (const [name, apply] of exps) {
                let undo = null;
                try { undo = apply(); } catch (e) { out.exp[name] = 'ERR ' + e.message; continue; }
                await new Promise((res) => setTimeout(res, 1000));
                const m = await measure(4000);
                let c = 0, sc2 = 0, fr = 0; const o2 = r.render.bind(r), os2 = sm.render.bind(sm);
                r.render = function (a, b) { o2(a, b); c += r.info.render.calls; };
                sm.render = function (...a) { const b0 = r.info.render.calls; os2(...a); sc2 += r.info.render.calls - b0; };
                const t1 = performance.now();
                await new Promise((res) => { const f = () => { fr++; if (performance.now() - t1 < 1000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
                r.render = o2; sm.render = os2;
                out.exp[name] = { fps: m.fps, p50: m.p50, calls: Math.round(c / fr), shadow: Math.round(sc2 / fr) };
                try { if (undo) undo(); } catch (e) { /* ignore */ }
                await new Promise((res) => setTimeout(res, 500));
              }
            }
            if (window.__perfInfo2) out.info2 = window.__perfInfo2;
            return JSON.stringify(out);
          })()`);
          console.log('[perf]', perf);
          if (spot) fsSync.writeFileSync(smoke.replace(/\.png$/, `-at${spots.indexOf(spot)}.png`), (await win.webContents.capturePage()).toPNG());
          }
          if (hasFlag('--profile')) await runProfile(win);
        }
      } catch (err) {
        console.log('[smoke error]', err && err.message);
      }
      app.quit();
    }, 14000);
  }
}

// Allocation profile of the page: where the JS heap grows between two GCs (HeapProfiler sampling, 32 KB interval, with the objects the GCs collected);
// the top call sites by bytes go to the log, the raw profile to GDE_PROFILE_OUT
// live (the message '[heapprof] <ms> live'): only the objects still alive when the sampling stops, i.e. what the heap holds at the end (#379)
async function runHeapProfile(win, ms, live = false) {
  const dbg = win.webContents.debugger;
  if (!dbg.isAttached()) dbg.attach('1.3');
  await dbg.sendCommand('HeapProfiler.enable');
  await dbg.sendCommand('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: !live, includeObjectsCollectedByMinorGC: !live });
  await new Promise((r) => setTimeout(r, ms));
  if (live) await dbg.sendCommand('HeapProfiler.collectGarbage');
  const { profile } = await dbg.sendCommand('HeapProfiler.stopSampling');
  if (process.env.GDE_PROFILE_OUT) {
    fsSync.mkdirSync(process.env.GDE_PROFILE_OUT, { recursive: true });
    fsSync.writeFileSync(path.join(process.env.GDE_PROFILE_OUT, `${Date.now()}.heapprofile`), JSON.stringify(profile));
  }
  const per = new Map(); let all = 0;
  const walk = (n) => { const cf = n.callFrame; const self = n.selfSize || 0; if (self) { const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`; per.set(k, (per.get(k) || 0) + self); all += self; } for (const c of n.children || []) walk(c); };
  walk(profile.head);
  console.log('[heapprof] total MB', (all / 1048576).toFixed(0), 'in', ms, 'ms');
  for (const [k, b] of [...per.entries()].sort((a, c) => c[1] - a[1]).slice(0, 40)) console.log('[heapprof]', (b / all * 100).toFixed(1).padStart(5) + '%', (b / 1048576).toFixed(1).padStart(7) + ' MB', k);
  await dbg.sendCommand('HeapProfiler.disable');
  dbg.detach();
}

// Chromium trace of every process for ms milliseconds (contentTracing): the task slices of the renderer's main thread, the GPU process and the compositor,
// to see what the main thread waits for. GDE_TRACE_CATEGORIES overrides the categories; the file lands in GDE_TRACE_OUT (default the temp folder).
async function runTrace(ms) {
  const { contentTracing } = require('electron');
  const cats = (process.env.GDE_TRACE_CATEGORIES || 'toplevel,disabled-by-default-toplevel.flow,gpu,viz,cc,blink,v8,devtools.timeline,benchmark').split(',');
  await contentTracing.startRecording({ included_categories: cats, recording_mode: 'record-until-full' });
  await new Promise((r) => setTimeout(r, ms));
  const dir = process.env.GDE_TRACE_OUT || require('os').tmpdir();
  fsSync.mkdirSync(dir, { recursive: true });
  const file = await contentTracing.stopRecording(path.join(dir, `trace-${Date.now()}.json`));
  console.log('[trace] saved', file);
}

// CPU profile of the page for ms milliseconds: top functions by self and
// inclusive time, and time per file
async function runProfile(win, ms = 6000) {
  const dbg = win.webContents.debugger;
  if (!dbg.isAttached()) dbg.attach('1.3');
  await dbg.sendCommand('Profiler.enable');
  // GDE_PROFILE_INTERVAL (µs): coarser sampling keeps --cpu-throttle runs near their real speed
  await dbg.sendCommand('Profiler.setSamplingInterval', { interval: Number(process.env.GDE_PROFILE_INTERVAL) || 200 });
  await dbg.sendCommand('Profiler.start');
  await new Promise((r) => setTimeout(r, ms));
  const { profile } = await dbg.sendCommand('Profiler.stop');
  // GDE_PROFILE_OUT=<dir>: also keep the raw profile (scripts/perf/categories.mjs)
  if (process.env.GDE_PROFILE_OUT) {
    fsSync.mkdirSync(process.env.GDE_PROFILE_OUT, { recursive: true });
    fsSync.writeFileSync(path.join(process.env.GDE_PROFILE_OUT, `${Date.now()}.cpuprofile`), JSON.stringify(profile));
  }
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dtSum = profile.timeDeltas.reduce((a, b) => a + b, 0);
  const per = new Map();
  profile.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  for (const [id, us] of per) {
    const n = byId.get(id); const cf = n.callFrame;
    const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + us);
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  console.log('[profile] total ms', (dtSum / 1000).toFixed(0));
  for (const [k, us] of top) console.log('[profile]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', k);
  // inclusive time per function (self + callees)
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  for (const [id, us] of per) {
    const seen = new Set();
    for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
      const cf = byId.get(cur).callFrame;
      const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
      if (seen.has(key)) continue; seen.add(key);
      incl.set(key, (incl.get(key) || 0) + us);
    }
  }
  for (const [k, us] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log('[profile-incl]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', k);
  // per file
  const byFile = new Map();
  for (const [k, us] of self) { const f = k.split(' ').pop().split(':')[0] || '(native)'; byFile.set(f, (byFile.get(f) || 0) + us); }
  for (const [f, us] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log('[profile-file]', (us / dtSum * 100).toFixed(1).padStart(5) + '%', f);
  // detaching would also drop --cpu-throttle for the routes after this one
  if (!(Number(argValue('--cpu-throttle')) > 1)) dbg.detach();
}

function runStoryTest(win, dir) {
  fsSync.mkdirSync(dir, { recursive: true });
  const done = (code) => setTimeout(() => app.exit(code), 300);
  let nanWarnings = 0;
  win.webContents.on('console-message', async (e, legacyLevel, legacyMessage) => {
    const level = e.level !== undefined ? e.level : legacyLevel;
    const message = String(e.message !== undefined ? e.message : legacyMessage);
    if (/Computed radius is NaN/.test(message)) nanWarnings++;
    if (message.startsWith('[storytest-capture] ')) {
      const name = message.slice(20).trim().replace(/[^\w.-]/g, '_');
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(dir, name + '.png'), img.toPNG());
    } else if (message.startsWith('[storytest-done] ')) {
      const report = JSON.parse(message.slice(17));
      fsSync.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(dir, 'report.png'), img.toPNG());
      console.log(`[story-test] ${report.result}: ${report.steps.length} steps, ${report.checks.filter((c) => !c.ok).length} failed checks, report in ${dir}`);
      for (const c of report.checks) if (!c.ok) console.log('[story-test] FAIL', c.name, c.info || '');
      for (const err of report.errors) console.log('[story-test] error', err);
      // three.js logs this once per geometry with a NaN position (a generator bug)
      if (nanWarnings) console.log(`[story-test] FAIL ${nanWarnings} NaN geometry warnings (computeBoundingSphere)`);
      done(report.result === 'PASS' && !nanWarnings ? 0 : 1);
    } else if (level === 'error' || level === 3) console.log('[renderer]', message);
  });
  setTimeout(() => { console.log('[story-test] timeout'); done(2); }, (+process.env.GDE_STORY_TIMEOUT_MIN || 15) * 60 * 1000);
}

module.exports = { isTestRun, clipMode: !!CLIP, trailerSize: TRAILER_SIZE, queryParts, attach };
