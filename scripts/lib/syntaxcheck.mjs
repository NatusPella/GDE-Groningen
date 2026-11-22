// Syntaxcontrole die moduleerrors niet mist. `node --check bestand.js` leest een .js zonder
// "type":"module" als CommonJS en meldt dan soms exit 0 terwijl het als ES-module een
// SyntaxError heeft (bv. ongeëscapete quotes in game/js/story.js). Daarom gaan modules
// (.mjs, of .js met import/export) via stdin met --input-type=module --check; de rest
// (CommonJS in desktop/) blijft gewoon --check.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export function isModuleSource(file, src) {
  if (file.endsWith('.mjs')) return true;
  if (file.endsWith('.cjs')) return false;
  return /^\s*(import\s*[\w{*'"]|export\s)/m.test(src);
}

// -> { ok, module, out }
// CDP-snippets (scripts/perf, scripts/ui, scripts/weer) worden in de browser als
// async-functielichaam uitgevoerd: ze hebben top-level await en soms return en zijn dus
// geen geldige Node-modules, maar we kunnen ze wel op syntax controleren door ze als
// functielichaam te compileren (zelfde truc als bij scripts/bot/bot.page.js).
export function isCdpSnippet(file) {
  return /(?:^|[\\\\/])scripts[\\\\/](perf|ui|weer)[\\\\/][^\\\\/]+\.(js|mjs|cjs)$/.test(String(file)) || /\.page\.js$/.test(String(file));
}

export function checkSyntax(file, srcOverride) {
  const src = srcOverride ?? readFileSync(file, 'utf8');
  const module = isModuleSource(file, src);
  if (!module && isCdpSnippet(file)) {
    try { new Function('return (async () => {' + src + '\n})'); return { ok: true, module: false, snippet: true, out: '' }; }
    catch (e) { return { ok: false, module: false, snippet: true, out: 'snippet: ' + (e && e.message ? e.message : e) }; }
  }
  const r = module
    ? spawnSync(process.execPath, ['--input-type=module', '--check'], { input: src, encoding: 'utf8', timeout: 30000 })
    : spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 30000 });
  return { ok: r.status === 0, module, out: (r.stdout || '') + (r.stderr || '') };
}

// Dezelfde controle zonder de lus te blokkeren, zodat de lichte fase er meerdere tegelijk kan draaien
// (kwaliteit 22-11: 3654 bestanden na elkaar kostte ruim tien minuten, de meeste tijd gaat in het starten van node).
export function checkSyntaxAsync(file, srcOverride) {
  const src = srcOverride ?? readFileSync(file, 'utf8');
  const module = isModuleSource(file, src);
  if (!module && isCdpSnippet(file)) return Promise.resolve(checkSyntax(file, src));
  return new Promise((resolve) => {
    let out = '', klaar = false;
    const fin = (ok, extra = '') => { if (klaar) return; klaar = true; clearTimeout(timer); resolve({ ok, module, out: out + extra }); };
    const p = spawn(process.execPath, module ? ['--input-type=module', '--check'] : ['--check', file], { stdio: [module ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { try { p.kill(); } catch (e) { /* al weg */ } fin(false, 'time-out na 30 s'); }, 30000);
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('error', (e) => fin(false, String(e && e.message)));
    p.on('close', (code) => fin(code === 0));
    if (module) { p.stdin.on('error', () => {}); p.stdin.end(src); }
  });
}
