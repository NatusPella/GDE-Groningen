// Na een release (desktop/release.sh, met --world) de bouwwerk in GitHub Actions starten:
// macOS-dmg, Linux (AppImage + tar.gz) en Android-debug-APK, wachten tot ze klaar zijn en de
// releasenotities bijwerken met wat er is bijgekomen en hoe je het installeert.
//
//   node scripts/release_builds.mjs                 tag = v<versie in desktop/package.json>, alle drie
//   node scripts/release_builds.mjs v0.38.1         een bestaande release
//   node scripts/release_builds.mjs --only linux,android   alleen deze (mac|linux|android)
//   node scripts/release_builds.mjs --notes-only    geen builds, alleen de notities bijwerken
//   node scripts/release_builds.mjs --droog         toon de notities, wijzig niets
//   node scripts/release_builds.mjs --ref <branch>  workflows van een andere branch dan main (alleen als
//                                                   het bestand ook op de standaardbranch staat)
//
// De workflows (.github/workflows/{mac,linux,android}-release.yml) hebben alleen workflow_dispatch en
// halen de wereld uit het release-asset gde-world.tgz. Een run die door een capaciteitsprobleem van de
// runner wordt geannuleerd (kost niets) wordt één keer opnieuw gestart; een mislukte run niet.
// Het script gebruikt alleen gh en GITHUB_TOKEN-rechten van de ingelogde gebruiker; geen geheimen.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const BUILDS = {
  mac: { workflow: 'mac-release.yml', label: 'macOS-dmg', runner: 'macOS', factor: 10, asset: (v) => `GDE-Groningen-${v}-mac.dmg` },
  linux: { workflow: 'linux-release.yml', label: 'Linux', runner: 'Linux', factor: 1, asset: (v) => `GDE-Groningen-${v}-linux.AppImage` },
  android: { workflow: 'android-release.yml', label: 'Android-APK', runner: 'Linux', factor: 1, asset: (v) => `GDE-Groningen-${v}-android-debug.apk` },
};

export const BLOCK_START = '<!-- builds-na-release:begin -->';
export const BLOCK_END = '<!-- builds-na-release:end -->';

// De installatieregels per bijlage. Alleen wat er echt als asset op de release staat komt erin.
export function notesFor(version, assetNames) {
  const has = (n) => assetNames.includes(n);
  const out = [];
  const dmg = `GDE-Groningen-${version}-mac.dmg`;
  const appimage = `GDE-Groningen-${version}-linux.AppImage`;
  const targz = `GDE-Groningen-${version}-linux.tar.gz`;
  const apk = `GDE-Groningen-${version}-android-debug.apk`;
  if (has(dmg)) {
    out.push(`**macOS** (Apple Silicon en Intel): open \`${dmg}\` en sleep GDE Groningen naar Programma's.
De eerste keer: open de app, klik **Gereed** bij de melding, ga naar **Systeeminstellingen > Privacy en beveiliging**
en klik onderaan op **Open toch**. Daarna start hij gewoon. Niet ondertekend.`);
  }
  if (has(appimage) && has(targz)) {
    out.push(`**Linux en Steam Deck** (x64, niet ondertekend): download \`${appimage}\`,
maak hem uitvoerbaar (rechtsklik > Eigenschappen > Uitvoerbaar, of \`chmod +x\`) en start hem. Op de Steam Deck:
download hem in de bureaubladmodus en zet hem met **Aan Steam toevoegen** in de Gamemodus. Liever geen AppImage?
Pak \`${targz}\` uit en start \`gde-groningen\`.`);
  }
  if (has(apk)) {
    out.push(`**Android (alleen testen):** \`${apk}\` is een debug-versie die je zelf installeert (sideloaden): zet het bestand op je toestel,
sta **installeren uit onbekende bronnen** toe voor de app waarmee je het opent (Chrome, Bestanden) en tik op het bestand.
Alles zit in de app, dus hij werkt offline; samen spelen (coöp) werkt niet op Android. Draait liggend op een emulator
(Android 15) en met aanraking te spelen, maar **nog niet op een echt toestel getest**. Niet ondertekend met een eigen sleutel.`);
  }
  return out;
}

const NO_DMG_LINE = /\*\*macOS:\*\* voor deze versie is er nog geen dmg; die volgt later\.\n*/;

// Zet het beheerde blok onderaan de notities (vervangt een eerder blok) en haalt de regel "nog geen dmg" weg.
export function applyBlock(body, sections, hasDmg) {
  let b = String(body || '').replace(/\r\n/g, '\n');
  const re = new RegExp(`\\n*${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n*`);
  b = b.replace(re, '\n');
  if (hasDmg) b = b.replace(NO_DMG_LINE, '');
  b = b.replace(/\s+$/, '');
  // wat release.sh zelf al in de notities zette (lokale --linux of Mac-build) niet nog eens noemen
  const fresh = sections.filter((s) => !b.includes(s.match(/^\*\*[^*]+\*\*/)[0]));
  if (!fresh.length) return b + '\n';
  return `${b}\n\n${BLOCK_START}\n${fresh.join('\n\n')}\n${BLOCK_END}\n`;
}

// Gebruikte Actions-minuten: per job naar boven afgerond, vermenigvuldigd met de runnerfactor.
export function billable(jobs, factor) {
  const raw = jobs.reduce((a, j) => a + (j.startedAt && j.completedAt ? Math.max(0, (Date.parse(j.completedAt) - Date.parse(j.startedAt)) / 1000) : 0), 0);
  const minutes = jobs.reduce((a, j) => a + (j.startedAt && j.completedAt ? Math.ceil(Math.max(0, Date.parse(j.completedAt) - Date.parse(j.startedAt)) / 60000) : 0), 0);
  return { seconds: Math.round(raw), minutes, free: minutes * factor };
}

function findGh() {
  const cands = ['gh', 'C:/Program Files/GitHub CLI/gh.exe', 'C:/Program Files (x86)/GitHub CLI/gh.exe'];
  for (const c of cands) {
    try { execFileSync(c, ['--version'], { stdio: 'ignore' }); return c; } catch { /* volgende */ }
  }
  throw new Error('gh (GitHub CLI) niet gevonden: installeer hem of zet hem op PATH');
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n) => argv.includes(n);
  const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const valueArgs = new Set([val('--only'), val('--ref')].filter(Boolean));
  const tag = argv.find((a) => /^v\d+\.\d+\.\d+$/.test(a) && !valueArgs.has(a))
    || 'v' + JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8')).version;
  const version = tag.slice(1);
  const only = (val('--only') || 'mac,linux,android').split(',').map((s) => s.trim()).filter(Boolean);
  for (const o of only) if (!BUILDS[o]) throw new Error(`onbekende build "${o}": kies uit ${Object.keys(BUILDS).join(', ')}`);
  const ref = val('--ref');
  const dry = flag('--droog');
  const gh = findGh();
  const run = (args, opts = {}) => execFileSync(gh, args, { encoding: 'utf8', cwd: ROOT, env: { ...process.env, MSYS_NO_PATHCONV: '1' }, ...opts }).trim();
  const json = (args) => JSON.parse(run(args));

  const release = json(['release', 'view', tag, '--json', 'assets,body,isPrerelease']);
  const names = release.assets.map((a) => a.name);
  console.log(`Release ${tag}: ${names.join(', ') || '(geen assets)'}`);
  if (!names.includes('gde-world.tgz') && !flag('--notes-only')) {
    throw new Error(`${tag} heeft geen gde-world.tgz: release met --world maken, of: tar czf gde-world.tgz -C desktop/build/game world && gh release upload ${tag} gde-world.tgz`);
  }

  const results = {};
  if (!flag('--notes-only')) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dispatch = async (key) => {
      const b = BUILDS[key];
      const since = new Date(Date.now() - 5000).toISOString();
      const args = ['workflow', 'run', b.workflow, '-f', `tag=${tag}`];
      if (ref) args.push('--ref', ref);
      run(args);
      for (let i = 0; i < 30; i++) { // de run verschijnt binnen enkele seconden
        await sleep(4000);
        const runs = json(['run', 'list', '--workflow', b.workflow, '--event', 'workflow_dispatch', '--limit', '10', '--json', 'databaseId,createdAt,status']);
        const mine = runs.filter((r) => r.createdAt >= since).sort((a, c) => (a.createdAt < c.createdAt ? 1 : -1))[0];
        if (mine) return mine.databaseId;
      }
      throw new Error(`${b.workflow}: geen run gevonden na het starten`);
    };
    const wait = async (id) => {
      for (;;) {
        const r = json(['run', 'view', String(id), '--json', 'status,conclusion,jobs']);
        if (r.status === 'completed') return r;
        await new Promise((res) => setTimeout(res, 20000));
      }
    };
    await Promise.all(only.map(async (key) => {
      const b = BUILDS[key];
      let attempt = 0;
      for (;;) {
        attempt++;
        const id = await dispatch(key);
        console.log(`${b.label}: run ${id} gestart (poging ${attempt}) - https://github.com/${run(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'])}/actions/runs/${id}`);
        const r = await wait(id);
        const used = billable(r.jobs, b.factor);
        results[key] = { id, conclusion: r.conclusion, attempt, ...used };
        console.log(`${b.label}: ${r.conclusion} - ${Math.round(used.seconds / 60 * 10) / 10} min, ${used.minutes} ${b.runner}-min = ${used.free} gratis minuten`);
        if (r.conclusion === 'cancelled' && attempt < 2) { console.log(`${b.label}: geannuleerd (runner?), nog één keer`); continue; }
        break;
      }
    }));
  }

  const after = json(['release', 'view', tag, '--json', 'assets,body']);
  const assetNames = after.assets.map((a) => a.name);
  const sections = notesFor(version, assetNames);
  const body = applyBlock(after.body, sections, assetNames.includes(`GDE-Groningen-${version}-mac.dmg`));
  if (dry) {
    console.log('\n--- notities (droog, niet opgeslagen) ---\n' + body);
  } else if (body.replace(/\s+$/, '') !== String(after.body || '').replace(/\r\n/g, '\n').replace(/\s+$/, '')) {
    const tmp = path.join(fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'gde-notes-')), 'notes.md');
    fs.writeFileSync(tmp, body);
    run(['release', 'edit', tag, '--notes-file', tmp]);
    fs.rmSync(tmp, { force: true });
    console.log('Releasenotities bijgewerkt.');
  } else console.log('Releasenotities waren al bijgewerkt.');

  const total = Object.values(results).reduce((a, r) => a + r.free, 0);
  if (Object.keys(results).length) console.log(`Samen ${total} gratis minuten (van 2000 per maand).`);
  const failed = Object.entries(results).filter(([, r]) => r.conclusion !== 'success');
  if (failed.length) {
    console.error('Mislukt: ' + failed.map(([k, r]) => `${BUILDS[k].label} (${r.conclusion}, run ${r.id})`).join(', '));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
