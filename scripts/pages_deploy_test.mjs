// Test van de Pages-workflow (#1090): geen YAML-parser nodig, de afspraken staan als tekst.
// Bewaakt: alleen handmatig starten, owner-guard op beide jobs, de rechten, het environment,
// de wereld uit de release (geen lokale cache), geen geheimen, en de controle van de webbuild.
//   node scripts/pages_deploy_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from './pages_site_check.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };

const wf = read('.github/workflows/pages-deploy.yml');
const jobs = wf.split(/^jobs:\n/m)[1] || '';
const jobBlock = (name) => (jobs.split(new RegExp(`^  ${name}:\\n`, 'm'))[1] || '').split(/^  \S+:\n/m)[0];

ok(/^on:\n  workflow_dispatch:/m.test(wf), 'start alleen met workflow_dispatch');
ok(!/^\s*(push|pull_request|schedule|workflow_run):/m.test(wf), 'geen andere triggers');
ok(/^      ref:/m.test(wf), 'input ref');
ok(/permissions:\n  contents: read\n  pages: write\n  id-token: write/.test(wf), 'rechten: contents read, pages write, id-token write');
ok(/concurrency:\n  group: pages\n  cancel-in-progress: false/.test(wf), 'concurrency pages zonder annuleren');
ok(read('.github/workflows/pages.yml').includes('group: pages\n'), 'de marketingworkflow deelt de concurrency-groep');
for (const j of ['build', 'deploy']) ok(/if: github\.actor == github\.repository_owner/.test(jobBlock(j)), `owner-guard op job ${j}`);
ok(/environment:\n      name: github-pages/.test(jobBlock('deploy')), 'deploy gebruikt environment github-pages');
ok(/actions\/upload-pages-artifact@v3/.test(wf) && /actions\/deploy-pages@v4/.test(wf), 'upload-pages-artifact en deploy-pages');
ok(/gh release (list|download)/.test(wf) && /gde-world\.tgz/.test(wf) && /GDE_PREBUILT_WORLD/.test(wf), 'de wereld komt uit het release-asset');
ok(!/data\/cache|extract_province|game\/world/.test(wf.replace(/^#.*$/gm, '')), 'geen lokale wereldcache of provinciebouw op de runner');
ok(!/secrets\.|LITELLM|OPENROUTER|\.env/.test(wf), 'geen geheimen');
ok(/GDE_WEB_OPUS_ONLY/.test(wf) && /ffmpeg/.test(wf) && /actions\/cache@v4/.test(wf) && /web\/\.cache\/opus/.test(wf), 'Opus: ffmpeg en cache');
ok(/pages_site_check\.mjs/.test(wf) && /web_shell_test\.mjs/.test(wf), 'controle van de webbuild');
ok(/play/.test(wf) && /website\/build\.mjs/.test(wf), 'spel onder /play/, marketing in de root');
ok(/timeout-minutes:/.test(jobBlock('build')) && /timeout-minutes:/.test(jobBlock('deploy')), 'time-outs');

// pages_site_check op een kleine nepmap
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-pagestest-'));
const put = (p, s) => { fs.mkdirSync(path.dirname(path.join(tmp, p)), { recursive: true }); fs.writeFileSync(path.join(tmp, p), s); };
try {
  put('index.html', '<script src="web.js"></script><link href="fonts/a.css">');
  put('sw.js', "const CACHE = 'gde-1';"); put('web.js', 'x'); put('stad.json', '{}'); put('world/index.json', '{}');
  put('audio/index.json', JSON.stringify({ packs: ['audio/packs/a.pack'], files: {}, music: {}, opusOnly: true })); put('audio/packs/a.pack', 'x');
  ok(checkSite(tmp, { opusOnly: true }).problems.length === 0, 'goede map: geen problemen');
  put('audio/x.mp3', 'x');
  ok(checkSite(tmp, { opusOnly: true }).problems.some((p) => /mp3/.test(p)), 'Opus-only met een mp3 wordt afgekeurd');
  ok(checkSite(tmp).problems.length === 0, 'zonder opus-only is een mp3 prima');
  fs.rmSync(path.join(tmp, 'audio', 'x.mp3'));
  put('index.html', '<script src="/js/main.js"></script><script src="web.js"></script>');
  ok(checkSite(tmp).problems.some((p) => /absolute/.test(p)), 'absoluut pad wordt afgekeurd');
  put('index.html', '<script src="web.js"></script>');
  put('sw.js', "const CACHE = '__GDE_CACHE__';");
  ok(checkSite(tmp).problems.some((p) => /plaatshouder/.test(p)), 'ongestempelde sw.js wordt afgekeurd');
  fs.rmSync(path.join(tmp, 'world'), { recursive: true });
  ok(checkSite(tmp).problems.some((p) => /world\/index\.json/.test(p)), 'ontbrekende wereld wordt afgekeurd');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`pages_deploy_test: ${fails ? fails + ' FAIL van ' + n : 'ok (' + n + ')'}`);
process.exit(fails ? 1 : 0);
