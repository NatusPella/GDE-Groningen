// Lokale preview van website/_site, zonder npm of externe server.
//   node website/serve.mjs [poort]      (standaard http://127.0.0.1:8099/)
// Alleen bedoeld om de gebouwde pagina lokaal te bekijken. De workflow publiceert via GitHub Pages.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBSITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(WEBSITE, '_site');
const PORT = Number(process.argv[2] || process.env.PORT || 8099);
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function stuur(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('website/_site ontbreekt. Draai eerst: node website/build.mjs');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return stuur(res, 405, 'Alleen GET en HEAD.');
  let pad;
  try {
    pad = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
  } catch {
    return stuur(res, 400, 'Ongeldige URL.');
  }
  const bestand = path.resolve(ROOT, '.' + pad);
  if (bestand !== ROOT && !bestand.startsWith(ROOT + path.sep)) return stuur(res, 403, 'Buiten _site.');
  const doel = fs.existsSync(bestand) && fs.statSync(bestand).isDirectory()
    ? path.join(bestand, 'index.html')
    : bestand;
  if (!fs.existsSync(doel) || !fs.statSync(doel).isFile()) return stuur(res, 404, 'Niet gevonden: ' + pad);
  const type = TYPES[path.extname(doel).toLowerCase()] || 'application/octet-stream';
  if (req.method === 'HEAD') return stuur(res, 200, '', type);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(doel).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Marketingpagina lokaal: http://${HOST}:${PORT}/`);
  console.log('Stoppen met Ctrl+C.');
});
