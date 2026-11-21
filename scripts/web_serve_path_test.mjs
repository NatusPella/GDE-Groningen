// web/serve.mjs: mapgrens (geen buurmap met dezelfde prefix) en een kapotte %-code geeft 400 (security-review 22-11).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveRequest } from '../web/servepath.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-servepath-'));
const dir = path.join(root, 'web-dist');
fs.mkdirSync(dir);
const P = '/gde/';

assert.equal(resolveRequest('/gde/index.html', dir, P).file, path.join(dir, 'index.html'));
assert.equal(resolveRequest('/gde/', dir, P).file, dir);
assert.equal(resolveRequest('/gde/sub/../a.js', dir, P).file, path.join(dir, 'a.js'));
assert.equal(resolveRequest('/gde/../web-dist-oud/geheim.txt', dir, P).status, 403, 'buurmap met dezelfde prefix');
assert.equal(resolveRequest('/gde/../../etc/passwd', dir, P).status, 403);
assert.equal(resolveRequest('/gde/%2e%2e/web-dist-oud/x', dir, P).status, 403);
assert.equal(resolveRequest('/gde/%', dir, P).status, 400, 'URIError wordt een 400');
assert.equal(resolveRequest('/gde/%E0%A4%A', dir, P).status, 400);
assert.equal(resolveRequest('/', dir, P).status, 302);
assert.equal(resolveRequest('/elders', dir, P).status, 404);

// De echte server: een slecht verzoek mag hem niet stoppen.
const serve = fileURLToPath(new URL('../web/serve.mjs', import.meta.url));
const port = 20000 + Math.floor(Math.random() * 20000);
const child = spawn(process.execPath, [serve, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
const get = (p) => new Promise((resolve, reject) => {
  const r = http.request({ host: '127.0.0.1', port, path: p, method: 'GET' }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  r.on('error', reject); r.end();
});
try {
  await new Promise((resolve, reject) => { child.stdout.on('data', (d) => /web-dist on/.test(String(d)) && resolve()); child.on('exit', () => reject(new Error('server gestopt'))); setTimeout(() => reject(new Error('time-out')), 8000); });
  assert.equal(await get('/gde/%'), 400);
  assert.equal(await get('/gde/../web-dist-oud/x'), 403);
  assert.equal(await get('/gde/bestaat-niet.txt'), 404, 'server leeft nog na de %-fout');
} finally {
  child.kill();
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('web_serve_path_test: ok');
