// Zet de Electron-beelden (scripts/qa/akte1_sets_beeld.mjs: shots-<naam>.png, 1600x900, ruim 1,5 MB) om naar kleine JPEG's voor de
// voor/na-pagina (960 breed, kwaliteit 0,85) met headless Chrome; geen beeldbibliotheek nodig.
//   node scripts/akte1/png_naar_jpg.mjs --in=<map met shots-*.png> --out=docs/beeld-23-11/akte1 [--voorvoegsel=wereld-]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const IN = path.resolve(ROOT, arg('in', '.tmp-akte1/electron'));
const OUT = path.resolve(ROOT, arg('out', 'docs/beeld-23-11/akte1'));
const PRE = arg('voorvoegsel', 'wereld-');
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.log('SKIP geen Chrome'); process.exit(0); }
const files = fs.readdirSync(IN).filter((f) => /^shots-.+\.png$/.test(f));
fs.mkdirSync(OUT, { recursive: true });
const PAGE = `<!doctype html><script type="module">
const files = ${JSON.stringify(files)};
for (const f of files) {
  const img = new Image(); img.src = '/in/' + f; await img.decode();
  const c = document.createElement('canvas'); c.width = 960; c.height = Math.round(img.height * 960 / img.width);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  await fetch('/jpg?name=' + encodeURIComponent(f), { method: 'POST', body: c.toDataURL('image/jpeg', 0.85).split(',')[1] });
}
await fetch('/done', { method: 'POST', body: 'ok' });
</script>`;
let chrome = null, n = 0;
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (u.pathname === '/jpg') {
        const naam = PRE + u.searchParams.get('name').replace(/^shots-/, '').replace(/\.png$/, '.jpg');
        fs.writeFileSync(path.join(OUT, naam), Buffer.from(Buffer.concat(chunks).toString(), 'base64')); n++;
      } else if (u.pathname === '/done') { console.log(`${n} beelden omgezet naar ${path.relative(ROOT, OUT)}`); setTimeout(() => { try { chrome.kill(); } catch (e) { /* weg */ } srv.close(); process.exit(0); }, 200); }
      res.end('ok');
    });
    return;
  }
  if (u.pathname === '/') { res.setHeader('content-type', 'text/html'); res.end(PAGE); return; }
  const f = path.join(IN, decodeURIComponent(u.pathname.replace(/^\/in\//, '')));
  if (!f.startsWith(IN) || !fs.existsSync(f)) { res.statusCode = 404; res.end(); return; }
  res.setHeader('content-type', 'image/png'); res.end(fs.readFileSync(f));
});
srv.listen(0, '127.0.0.1', () => {
  const profile = path.join(ROOT, '.tmp-akte1', 'chrome-profiel-jpg');
  fs.mkdirSync(profile, { recursive: true });
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', `--user-data-dir=${profile}`, `http://127.0.0.1:${srv.address().port}/`], { stdio: 'ignore' });
  setTimeout(() => { console.log('TIMEOUT'); try { chrome.kill(); } catch (e) { /* weg */ } process.exit(1); }, 120000);
});
