// Serves web-dist/ like a static host would (Range requests, real MIME
// types, a sub path like itch.io and GitHub Pages): http://localhost:8790/gde/
//   node web/serve.mjs [port] [--log]   (--log: one line per request)
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web-dist');
const PORT = +process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 8790;
const LOG = process.argv.includes('--log');
const PREFIX = '/gde/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.bin': 'application/octet-stream',
  '.pack': 'application/octet-stream', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webm': 'audio/webm',
};

http.createServer((req, res) => {
  if (LOG) res.on('finish', () => console.log(`${res.statusCode} ${res.gdeBytes || 0} ${req.url}${req.headers.range ? ' ' + req.headers.range : ''}`));
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === '/gde') { res.writeHead(302, { location: PREFIX }); res.end(); return; }
  if (!url.startsWith(PREFIX)) { res.writeHead(404); res.end(); return; }
  let file = path.join(DIR, url.slice(PREFIX.length));
  if (!file.startsWith(DIR)) { res.writeHead(403); res.end(); return; }
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
