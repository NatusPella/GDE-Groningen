// Kleine statische server voor QA-pagina's (alleen localhost): node scripts/qa/serve_static.mjs <map> [poort]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8765);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const out = path.resolve(process.argv[4] || path.join(root, '..', 'beeld-uit'));
http.createServer((req, res) => {
  // POST /save?name=x.png met een data-URL als body: schrijft naar de uitvoermap (alleen een bestandsnaam, geen pad)
  if (req.method === 'POST' && req.url.startsWith('/save?name=')) {
    const name = path.basename(decodeURIComponent(req.url.slice(11)));
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, name), Buffer.from(Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, ''), 'base64')); res.writeHead(200); res.end('ok'); });
    return;
  }
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nee'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('serve ' + root + ' op http://127.0.0.1:' + port));
