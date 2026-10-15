// desktop --trailer-video[=<file.mp4>]: the trailer (js/trailer.js) on its
// fixed 1/60 s step, every captured frame piped straight into ffmpeg (no
// frame files on disk), with the theme song and the voice lines mixed in at
// the times the page reports (soundSheet in trailer.js). H.264 yuv420p,
// CRF 18, AAC 192k, +faststart, plus a PNG thumbnail of the aerial shot.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const DEFAULT_NAME = 'GDE-Groningen-Een-zomer-in-Grunn.mp4';

function findFfmpeg() {
  for (const p of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']) if (fs.existsSync(p)) return p;
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  const hit = r.status === 0 && r.stdout.split(/\r?\n/).find(Boolean);
  return hit || null;
}

// The real path of a file that may not exist yet: its nearest existing parent resolved.
function realTarget(p) {
  let dir = path.dirname(p);
  const rest = [path.basename(p)];
  while (!fs.existsSync(dir) && path.dirname(dir) !== dir) { rest.unshift(path.basename(dir)); dir = path.dirname(dir); }
  return path.join(fs.realpathSync(dir), ...rest);
}

// Every checkout this app could live in: this repo, and the main repo
// around a git worktree (.claude/worktrees/...).
function repoRoots(appDir) {
  const roots = [];
  for (let d = fs.realpathSync(path.resolve(appDir, '..')); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) roots.push(d);
    if (path.dirname(d) === d) break;
  }
  return roots;
}

const inside = (file, dir) => { const rel = path.relative(dir, file); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };

// Resolves the output path or throws with a message for the console.
function resolveOutput(arg, appDir) {
  let p = arg && arg !== true ? String(arg) : path.join(os.homedir(), 'Downloads', DEFAULT_NAME);
  if (p === '~' || p.startsWith('~/')) p = path.join(os.homedir(), p.slice(1));
  p = path.resolve(p);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, DEFAULT_NAME);
  if (!/\.(mp4|mov|m4v)$/i.test(p)) p += '.mp4';
  const real = realTarget(p);
  for (const root of repoRoots(appDir)) {
    if (inside(real, root)) throw new Error(`refusing to write the video inside the repository (${root}); pick a path outside it, e.g. ~/Downloads`);
  }
  fs.mkdirSync(path.dirname(real), { recursive: true });
  return real;
}

const ms = (s) => Math.max(0, Math.round(s * 1000));

// ffmpeg arguments for frames of w x h BGRA on stdin, to out (W x H).
function ffmpegArgs({ w, h, W, H, out, sheet, gameDir }) {
  const fps = sheet.fps || 60;
  const total = sheet.total;
  const args = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'bgra', '-video_size', `${w}x${h}`, '-framerate', String(fps), '-i', 'pipe:0'];
  const filters = [];
  const mix = [];
  let n = 1;
  const file = (rel) => { const f = path.join(gameDir, rel); return fs.existsSync(f) ? f : null; };
  const theme = sheet.theme && file(sheet.theme);
  if (theme) {
    args.push('-i', theme);
    // ducked under the boat shot (down to a fifth) and the story lines, with short ramps
    const duck = (sheet.duck || []).map(([a, b, depth = 0.8]) => `${depth}*clip((t-${a.toFixed(3)})/0.4,0,1)*clip((${b.toFixed(3)}-t)/0.4,0,1)`).join('+') || '0';
    filters.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms(sheet.themeAt)}:all=1,volume='0.75*(1-min(0.85,${duck}))':eval=frame[a${n}]`);
    mix.push(`[a${n}]`);
    n++;
  }
  for (const v of sheet.voices || []) {
    const f = v.src && file(v.src);
    if (!f) { console.log(`[video] missing voice clip ${v.src}`); continue; }
    args.push('-i', f);
    filters.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.6,adelay=${ms(v.at)}:all=1[a${n}]`);
    mix.push(`[a${n}]`);
    n++;
  }
  for (const s of sheet.sfx || []) {
    if (s.kind !== 'knal') continue;
    // the carbid bang: a short burst of low noise
    args.push('-f', 'lavfi', '-t', '0.9', '-i', 'anoisesrc=c=brown:a=0.9:r=48000');
    filters.push(`[${n}:a]lowpass=f=700,afade=t=out:st=0.02:d=0.85:curve=exp,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.4,adelay=${ms(s.at)}:all=1[a${n}]`);
    mix.push(`[a${n}]`);
    n++;
  }
  const vf = `[0:v]${w !== W || h !== H ? `scale=${W}:${H}:flags=lanczos,` : ''}format=yuv420p[v]`;
  filters.push(vf);
  if (mix.length) {
    filters.push(`${mix.join('')}amix=inputs=${mix.length}:duration=longest:normalize=0,alimiter=limit=0.89:level=false,atrim=0:${total.toFixed(3)},afade=t=out:st=${Math.max(0, total - 1.5).toFixed(3)}:d=1.5[a]`);
  }
  args.push('-filter_complex', filters.join(';'), '-map', '[v]');
  if (mix.length) args.push('-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', '-t', total.toFixed(3), out);
  return args;
}

// Sets up the IPC for one export; returns { finish } for app quit.
function setupTrailerVideo({ ipcMain, win, out, size, gameDir, ffmpeg }) {
  const [W, H] = size;
  let sheet = null, proc = null, done = null, frames = 0, t0 = 0, failed = false;
  const thumb = out.replace(/\.(mp4|mov|m4v)$/i, '') + '.png';
  ipcMain.removeHandler('gde:video-begin');
  ipcMain.handle('gde:video-begin', (e, s) => {
    sheet = s;
    console.log(`[video] ${s.frames} frames (${s.total.toFixed(1)} s), theme from ${s.themeAt.toFixed(2)} s, ${(s.voices || []).length} voice lines -> ${out}`);
    return true;
  });
  const start = (w, h) => {
    const args = ffmpegArgs({ w, h, W, H, out, sheet, gameDir });
    proc = spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });
    done = new Promise((res) => proc.on('close', (code) => res(code)));
    proc.stdin.on('error', (err) => { failed = true; console.log('[video] ffmpeg pipe:', err.message); });
    t0 = Date.now();
  };
  ipcMain.removeHandler('gde:capture-frame');
  ipcMain.handle('gde:capture-frame', async () => {
    if (!sheet || failed) return false;
    const img = await win.webContents.capturePage();
    const { width, height } = img.getSize();
    if (!proc) start(width, height);
    frames++;
    if (sheet.thumbAt != null && frames - 1 === Math.round(sheet.thumbAt * (sheet.fps || 60))) {
      fs.writeFile(thumb, img.toPNG(), (err) => console.log(err ? `[video] thumbnail: ${err.message}` : `[video] thumbnail ${thumb}`));
    }
    const buf = img.toBitmap();
    if (buf.length !== width * height * 4) { console.log(`[video] frame ${frames}: size changed, skipped`); return true; }
    if (!proc.stdin.write(buf)) await new Promise((res) => proc.stdin.once('drain', res));
    if (frames % 60 === 0 || frames === sheet.frames) {
      const el = (Date.now() - t0) / 1000, left = el / frames * Math.max(0, sheet.frames - frames);
      console.log(`[video] frame ${frames}/${sheet.frames} (${Math.round(frames / sheet.frames * 100)}%), ${el.toFixed(0)} s, ~${Math.ceil(left / 60)} min left`);
    }
    return true;
  });
  let finishing = null;
  const finish = () => {
    if (finishing) return finishing;
    finishing = (async () => {
      if (!proc) { console.log('[video] no frames captured'); return 1; }
      proc.stdin.end();
      const code = await done;
      if (code === 0 && fs.existsSync(out)) {
        const mb = fs.statSync(out).size / 1e6;
        console.log(`[video] done: ${out} (${mb.toFixed(1)} MB, ${frames} frames)`);
      } else console.log(`[video] ffmpeg failed (exit ${code})`);
      return code;
    })();
    return finishing;
  };
  return { finish };
}

module.exports = { findFfmpeg, resolveOutput, setupTrailerVideo, ffmpegArgs };
