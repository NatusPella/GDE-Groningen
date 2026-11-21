// Kleine statische server voor de kleding-mocks (alleen lokaal, poort 8123). Gebruik: node docs/beeld-21-11/kleding/serve.mjs
// Dan: chrome --headless --screenshot=uit.png --window-size=1300,900 "http://localhost:8123/docs/beeld-21-11/kleding/mock.html?s=shop"
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css' };
http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('niet gevonden'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8123, () => console.log('mock-server op http://localhost:8123'));
