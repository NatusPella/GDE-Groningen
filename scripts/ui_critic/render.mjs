// UI-kritiekharnas: rendert elk scherm uit de catalogus headless (eigen Chrome/Edge) op 1280x720, 1920x1080 en
// ui-schaal 1,5 naar JPEG (kwaliteit 80), draait de tripwires en schrijft index.json.
// Gebruik: node scripts/ui_critic/render.mjs [--out=<map>] [--only=id,id] [--cat=menu|kaarten|hud|winkels] [--match=regex] [--skip=regex]
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCREENS, PRELUDE, RESOLUTIONS } from './catalogus.mjs';
import { startBrowser } from './chrome.mjs';
import { collect } from './collector.mjs';
import { analyseer, SOORTEN } from './tripwires.mjs';
import { pageHtml } from './pagina.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, '..', '..', 'game');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const outDir = resolve(arg('out', 'C:\\Users\\abuis\\gde-ui-critic-22-11'));
const only = arg('only', '') ? arg('only').split(',') : null;
const cat = arg('cat', '');
const match = arg('match', '') ? new RegExp(arg('match')) : null;
const skip = arg('skip', '') ? new RegExp(arg('skip')) : null;
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.html': 'text/html', '.webp': 'image/webp', '.ico': 'image/x-icon' };

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const m = url.pathname.match(/^\/__critic\/(.+)\.html$/);
    if (m) {
      const s = SCREENS.find((x) => x.id === m[1]);
      if (!s) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(pageHtml(s, { gameDir, prelude: PRELUDE }));
    }
    const p = normalize(join(gameDir, decodeURIComponent(url.pathname)));
    if (!p.startsWith(gameDir) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream', 'cache-control': 'max-age=600' });
    res.end(readFileSync(p));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function main() {
  mkdirSync(outDir, { recursive: true }); mkdirSync(join(outDir, 'pages'), { recursive: true });
  const server = await startServer();
  const port = server.address().port;
  const browser = await startBrowser();
  console.log(`browser pid ${browser.pid} (${browser.exe}), server :${port}, uit ${outDir}`);
  const collectSrc = `(${collect.toString()})`;
  const index = { gemaakt: new Date().toISOString(), uitMap: outDir, resoluties: RESOLUTIONS, schermen: [] };
  try {
    for (const s of SCREENS) {
      if ((only && !only.includes(s.id)) || (cat && s.categorie !== cat) || (match && !match.test(s.id)) || (skip && skip.test(s.id))) continue;
      const rec = { scherm: s.id, titel: s.titel, module: s.module, categorie: s.categorie, bestanden: [], tripwires: {} };
      writeFileSync(join(outDir, 'pages', s.id + '.html'), pageHtml(s, { gameDir, prelude: PRELUDE }).replace('<head>', `<head><base href="http://127.0.0.1:${port}/">`));
      for (const r of RESOLUTIONS) {
        try {
          browser.logs.length = 0;
          await browser.metrics(r.w, r.h);
          await browser.goto(`http://127.0.0.1:${port}/__critic/${s.id}.html?uiScale=${r.uiScale}`);
          const res = await browser.eval('Promise.race([window.__scherm, new Promise((r) => setTimeout(() => r({ ok: false, fout: "time-out: scherm klaar na 60 s niet" }), 60000))])');
          if (!res || !res.ok) throw new Error((res ? res.fout : 'scherm bouwde niet binnen de tijd') + ' [stap: ' + await browser.eval('window.__stap').catch(() => '?') + ']');
          const data = await browser.eval(`(${collectSrc})(${JSON.stringify(s.root || null)})`);
          const name = `${s.id}_${r.id}.jpg`;
          writeFileSync(join(outDir, name), await browser.jpeg(80));
          rec.bestanden.push(name);
          rec.tripwires[r.id] = analyseer(data.records, { vw: data.vw, vh: data.vh });
          if (browser.logs.length) rec.tripwires[r.id].console = browser.logs.slice(0, 5);
        } catch (e) {
          rec.mislukt = rec.mislukt || []; rec.mislukt.push({ resolutie: r.id, reden: String(e.message || e).slice(0, 500) });
          break;
        }
      }
      rec.status = rec.mislukt && !rec.bestanden.length ? 'mislukt' : rec.mislukt ? 'deels' : 'ok';
      console.log(`${rec.status.padEnd(8)} ${s.id}` + (rec.mislukt ? '  ' + rec.mislukt[0].reden.split('\n')[0].slice(0, 110) : ''));
      index.schermen.push(rec);
    }
  } finally { await browser.close(); server.close(); }
  // een deelrun (--only, --match, --cat) vervangt alleen zijn eigen schermen in een bestaande index.json
  const bestaand = join(outDir, 'index.json');
  if (existsSync(bestaand)) {
    try {
      const oud = JSON.parse(readFileSync(bestaand, 'utf8'));
      const nieuw = new Set(index.schermen.map((r) => r.scherm));
      const ids = SCREENS.map((s) => s.id);
      index.schermen = [...oud.schermen.filter((r) => !nieuw.has(r.scherm) && ids.includes(r.scherm)), ...index.schermen].sort((a, b) => ids.indexOf(a.scherm) - ids.indexOf(b.scherm));
    } catch (e) { /* kapotte index: opnieuw beginnen */ }
  }
  const tot = Object.fromEntries(SOORTEN.map((k) => [k, 0]));
  for (const r of index.schermen) for (const t of Object.values(r.tripwires)) for (const k of SOORTEN) tot[k] += t.soorten[k].aantal;
  index.totalen = { gerenderd: index.schermen.filter((r) => r.status !== 'mislukt').length, mislukt: index.schermen.filter((r) => r.status === 'mislukt').length, tripwires: tot };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 1));
  console.log(JSON.stringify(index.totalen));
}
main().catch((e) => { console.error(e); process.exit(1); });
