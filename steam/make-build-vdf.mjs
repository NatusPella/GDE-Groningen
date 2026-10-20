// Fills the placeholders of steam/scripts/*.vdf with the real ids, once Steamworks has given them (#64).
// The templates in git keep APP_ID and DEPOT_ID_*; the filled copies go to steam/output/vdf/ (ignored by
// git), with the content root as an absolute path. Local only: nothing here contacts Steam.
//
//   node steam/make-build-vdf.mjs --app=<id> --windows=<id> --mac=<id> --linux=<id> [--live-upload] [--beta=<tak>]
//
// By default the copy is a dry run ("Preview" "1": steamcmd only writes the manifest) and nothing goes
// live. --live-upload does a real upload (still not live: SetLive stays empty unless --beta=<tak> is given;
// set it live by hand in Steamworks). A depot id you leave out is dropped from the build (an app that
// does not have that OS yet). Prints the steamcmd command to run; it does not run steamcmd itself.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEPOTS = { windows: 'DEPOT_ID_WINDOWS', mac: 'DEPOT_ID_MAC', linux: 'DEPOT_ID_LINUX' };

const isId = (v) => /^[1-9][0-9]{0,9}$/.test(String(v));

// the filled-in files: { 'app_build.vdf': text, 'depot_build_windows.vdf': text, ... }
// opts: { app, windows, mac, linux, preview (default true), beta, contentRoot, buildOutput }
export function fillVdfs(templates, opts) {
  if (!isId(opts.app)) throw new Error('--app=<app id> is nodig (cijfers)');
  const depots = Object.keys(DEPOTS).filter((os) => opts[os] !== undefined);
  if (!depots.length) throw new Error('minstens een van --windows, --mac, --linux is nodig');
  for (const os of depots) if (!isId(opts[os])) throw new Error(`--${os}=<depot id> moet een getal zijn`);
  const ids = depots.map((os) => String(opts[os]));
  if (new Set([String(opts.app), ...ids]).size !== ids.length + 1) throw new Error('app-id en depot-id\'s moeten verschillen');
  const out = {};
  let app = templates['app_build.vdf'];
  app = app.replace('"APP_ID"', `"${opts.app}"`);
  app = app.replace(/"ContentRoot" "[^"]*"/, `"ContentRoot" "${opts.contentRoot}"`).replace(/"BuildOutput" "[^"]*"/, `"BuildOutput" "${opts.buildOutput}"`);
  app = app.replace(/"SetLive" "[^"]*"/, `"SetLive" "${opts.beta || ''}"`).replace(/"Preview" "[01]"/, `"Preview" "${opts.preview === false ? 0 : 1}"`);
  for (const [os, placeholder] of Object.entries(DEPOTS)) {
    const line = new RegExp(`^[ \\t]*"${placeholder}"[^\\n]*\\n`, 'm');
    if (depots.includes(os)) app = app.replace(`"${placeholder}"`, `"${opts[os]}"`);
    else app = app.replace(line, '');
  }
  out['app_build.vdf'] = app;
  for (const os of depots) {
    const name = `depot_build_${os}.vdf`;
    out[name] = templates[name].replace(`"${DEPOTS[os]}"`, `"${opts[os]}"`);
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : undefined; };
  const has = (n) => process.argv.includes(`--${n}`);
  const SCRIPTS = path.join(HERE, 'scripts');
  const templates = {};
  for (const f of fs.readdirSync(SCRIPTS).filter((n) => n.endsWith('.vdf'))) templates[f] = fs.readFileSync(path.join(SCRIPTS, f), 'utf8').replace(/\r\n/g, '\n');
  const OUT = process.env.GDE_STEAM_OUT ? path.resolve(process.env.GDE_STEAM_OUT) : path.join(HERE, 'output');
  const CONTENT = process.env.GDE_STEAM_CONTENT ? path.resolve(process.env.GDE_STEAM_CONTENT) : path.join(HERE, 'content');
  const slash = (p) => p.split(path.sep).join('/') + '/';
  try {
    const filled = fillVdfs(templates, {
      app: arg('app'), windows: arg('windows'), mac: arg('mac'), linux: arg('linux'),
      preview: !has('live-upload'), beta: arg('beta'),
      contentRoot: slash(CONTENT), buildOutput: slash(OUT),
    });
    const dir = path.join(OUT, 'vdf');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, text] of Object.entries(filled)) fs.writeFileSync(path.join(dir, name), text, 'utf8');
    console.log(`geschreven in ${path.relative(process.cwd(), dir) || dir}: ${Object.keys(filled).join(', ')}`);
    console.log(has('live-upload') ? 'echte upload (niet live gezet).' : 'proefrun ("Preview" "1"): alleen het manifest.');
    console.log(`\nsteamcmd +login <bouw-account> +run_app_build "${slash(dir).slice(0, -1)}/app_build.vdf" +quit`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
