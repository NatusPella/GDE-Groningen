// Een kale statische server om een uitvoermap (contactvellen, rapporten) in een browser te bekijken: alleen lezen, alleen 127.0.0.1.
//   node scripts/lib/statische_server.mjs <map> [poort]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8771);
const TYPE = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const p = path.resolve(root, rel);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('niet gevonden'); return; }
  res.writeHead(200, { 'content-type': TYPE[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`statische server: ${root} op http://127.0.0.1:${port}/`));
