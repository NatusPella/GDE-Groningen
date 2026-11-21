// Serves web-dist/ like a static host would (Range requests, real MIME
// types, a sub path like itch.io and GitHub Pages): http://localhost:8790/gde/
//   node web/serve.mjs [port] [--log] [--prefix=/GDE-Groningen/]   (--log: one line per request;
//   --prefix: another sub path, e.g. the one GitHub Pages gives a project site)
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveRequest } from './servepath.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web-dist');
const PORT = +process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 8790;
const LOG = process.argv.includes('--log');
const PREFIX = ((process.argv.find((a) => a.startsWith('--prefix=')) || '').slice(9) || '/gde/').replace(/^\/?/, '/').replace(/\/?$/, '/');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.bin': 'application/octet-stream',
  '.pack': 'application/octet-stream', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.webm': 'audio/webm',
};

http.createServer((req, res) => {
  if (LOG) res.on('finish', () => console.log(`${res.statusCode} ${res.gdeBytes || 0} ${req.url}${req.headers.range ? ' ' + req.headers.range : ''}`));
  const r = resolveRequest(req.url, DIR, PREFIX);
  if (r.status) { res.writeHead(r.status, r.location ? { location: r.location } : {}); res.end(); return; }
  let file = r.file;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const size = fs.statSync(file).size;
  const head = { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'max-age=600' };
  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (m) {
    const start = +m[1], end = Math.min(size - 1, m[2] ? +m[2] : size - 1);
    res.gdeBytes = end - start + 1;
    res.writeHead(206, { ...head, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.gdeBytes = size;
  res.writeHead(200, { ...head, 'content-length': size });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`web-dist on http://localhost:${PORT}${PREFIX}`));
