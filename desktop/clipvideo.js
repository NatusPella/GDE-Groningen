// desktop --clip=<map>: opnamemodus voor de trailerclips (scripts/trailer/). De pagina bepaalt zelf wanneer
// een beeld klaar is (vaste tijdstap, trailer/clip.page.js) en vraagt per beeld om een opname; elk beeld gaat
// rechtstreeks naar ffmpeg (H.264, bijna verliesvrij) in <map>/<naam>.mp4. Geluid zit niet in de clips: dat
// wordt apart gemonteerd (scripts/trailer/audio). Schrijft nooit in de repo.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// De eerste ffmpeg uit het PATH (Windows: where), of GDE_FFMPEG.
function findFfmpeg() {
  if (process.env.GDE_FFMPEG && fs.existsSync(process.env.GDE_FFMPEG)) return process.env.GDE_FFMPEG;
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  return (r.status === 0 && r.stdout.split(/\r?\n/).find(Boolean)) || null;
}

// IPC: gde:clip met opdracht begin / frame / png / end (preload.js, clip)
function setupClips({ ipcMain, win, dir, ffmpeg, fps = 60 }) {
  fs.mkdirSync(dir, { recursive: true });
  let cur = null;
  const log = (...a) => console.log('[clip]', ...a);
  ipcMain.removeHandler('gde:clip');
  ipcMain.handle('gde:clip', async (e, cmd, arg = {}) => {
    if (cmd === 'begin') {
      if (cur) throw new Error('er loopt al een clip');
      const name = String(arg.name || 'clip').replace(/[^\w.-]/g, '_');
      const out = path.join(dir, name + '.mp4');
      cur = { name, out, frames: 0, w: 0, h: 0, proc: null, done: null, t0: Date.now(), crf: arg.crf ?? 10 };
      return { out };
    }
    if (cmd === 'frame') {
      if (!cur) throw new Error('geen clip actief');
      const img = await win.webContents.capturePage();
      const { width, height } = img.getSize();
      if (!cur.proc) {
        cur.w = width; cur.h = height;
        const a = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-video_size', `${width}x${height}`, '-framerate', String(fps), '-i', 'pipe:0',
          '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(cur.crf),
          '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(fps), '-movflags', '+faststart', cur.out];
        cur.proc = spawn(ffmpeg, a, { stdio: ['pipe', 'inherit', 'inherit'] });
        cur.done = new Promise((res) => cur.proc.on('close', res));
        cur.proc.stdin.on('error', (err) => log('ffmpeg-pijp:', err.message));
      }
      const buf = img.toBitmap();
      if (buf.length !== width * height * 4 || width !== cur.w || height !== cur.h) { log(`beeld ${cur.frames}: formaat ${width}x${height} wijkt af, overgeslagen`); return false; }
      if (!cur.proc.stdin.write(buf)) await new Promise((res) => cur.proc.stdin.once('drain', res));
      cur.frames++;
      return true;
    }
    if (cmd === 'png') {
      const img = await win.webContents.capturePage();
      const out = path.join(dir, String(arg.name || 'beeld').replace(/[^\w.-]/g, '_') + '.png');
      fs.writeFileSync(out, img.toPNG());
      return out;
    }
    if (cmd === 'json') {
      const out = path.join(dir, String(arg.name || 'data').replace(/[^\w.-]/g, '_') + '.json');
      fs.writeFileSync(out, JSON.stringify(arg.data, null, 1));
      return out;
    }
    if (cmd === 'end') {
      if (!cur) return null;
      const c = cur;
      cur = null;
      let code = 0;
      if (c.proc) { c.proc.stdin.end(); code = await c.done; }
      log(`${c.name}: ${c.frames} beelden, ${((Date.now() - c.t0) / 1000).toFixed(0)} s, ffmpeg ${code}`);
      return { out: c.out, frames: c.frames, code };
    }
    throw new Error(`onbekende opdracht ${cmd}`);
  });
}

// Ontwikkelhulp (scripts/trailer/repl.mjs): laat de draaiende app een script uit <map>/_repl/cmd-N.js uitvoeren in de
// pagina en schrijft het resultaat naar res-N.json; <map>/_repl/quit stopt de app. Zo hoeft niet elke proef opnieuw
// een slot en een opstart van een minuut te kosten.
function setupRepl({ win, dir, app }) {
  const rd = path.join(dir, '_repl');
  fs.mkdirSync(rd, { recursive: true });
  for (const f of fs.readdirSync(rd)) if (/^(cmd-d+.js|res-d+.json|quit)$/.test(f)) fs.unlinkSync(path.join(rd, f));
  let n = 1;
  const timer = setInterval(async () => {
    if (fs.existsSync(path.join(rd, 'quit'))) { clearInterval(timer); try { fs.unlinkSync(path.join(rd, 'quit')); } catch (e) { /* weg */ } app.quit(); return; }
    const f = path.join(rd, `cmd-${n}.js`);
    if (!fs.existsSync(f)) return;
    const i = n++;
    // opdrachten lopen naast elkaar: een opdracht die blijft hangen blokkeert de volgende niet
    (async () => {
      let res;
      try {
        const src = fs.readFileSync(f, 'utf8');
        res = { ok: true, value: await win.webContents.executeJavaScript(`(async () => { ${src}
 })()`) };
      } catch (e) { res = { ok: false, error: String(e && e.stack || e) }; }
      fs.writeFileSync(path.join(rd, `res-${i}.json`), JSON.stringify(res, null, 1));
    })();
  }, 250);
}

module.exports = { findFfmpeg, setupClips, setupRepl };
