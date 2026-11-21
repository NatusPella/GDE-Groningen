// Gedeelde onderdelen van de twee testrunners (scripts/run_tests.mjs en scripts/test_all.mjs), zodat CI en de
// lichte fase dezelfde regels volgen (testinfrastructuur 21-11):
//   - runProces: een proces met tijdslimiet dat bij de limiet als boom wordt gestopt (op PID, nooit op naam)
//   - hartslag: elke 30 s een regel over wat nog draait, zodat een lange test geen tien minuten stilte geeft
//   - herkansing: alleen tests uit KNOWN_FLAKES mogen opnieuw, en elke herkansing staat in het rapport
//   - behoeften: scripts/test_behoeften.json zegt welke tests de wereld nodig hebben; zonder wereld een nette SKIP
// Pure logica waar het kan; geen testinhoud wordt hier verzwakt: een test die na herkansing nog faalt blijft FAIL.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Tests die tijd of pakketverlies in een eigen simulatie meten: ze halen hun eigen aannames niet als er drie
// tegelijk draaien en draaien dus na de pool, één voor één (#519).
export const SERIE = new Set(['coop_tcp_test.mjs', 'coopduur_test.mjs']);

// Bekende flakes: een test die soms zonder codefout valt. Eén herkansing is genoeg om te weten of het een
// toevalstreffer was; het rapport noemt elke herkansing met issuenummer, zodat de flake zichtbaar blijft tot hij echt is opgelost.
// Alleen toevoegen met een issue en een reden; nooit een test die structureel faalt.
export const KNOWN_FLAKES = {
  'country_vehicles_test.mjs': { issue: 1094, retries: 1, reden: 'plaatsing van landvoertuigen: een enkele run valt soms op een steekproef (#1094)' },
};

export const flakeInfo = (naam, tabel = KNOWN_FLAKES) => (Object.prototype.hasOwnProperty.call(tabel, naam) ? tabel[naam] : null);

// ---------------------------------------------------------------- processen

export function killTree(child) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  } catch { /* al weg */ }
}

// -> { code, timedOut, out, secs }; sluit het hele proces af bij de tijdslimiet.
export function runProces(cmd, args, { ms, env = {}, cwd, shell = false } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let out = '', timedOut = false, done = false;
    let child;
    try { child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, shell }); } catch (e) { resolve({ code: -1, timedOut: false, out: 'starten mislukt: ' + e.message, secs: 0 }); return; }
    const add = (d) => { out += d; if (out.length > 8e6) out = out.slice(-4e6); };
    child.stdout.on('data', add); child.stderr.on('data', add);
    const fin = (code) => { if (done) return; done = true; clearTimeout(timer); resolve({ code, timedOut, out, secs: (Date.now() - t0) / 1000 }); };
    const timer = setTimeout(() => { timedOut = true; killTree(child); setTimeout(() => fin(null), 2000); }, ms);
    child.on('error', (e) => { out += '\nstarten mislukt: ' + e.message; fin(-1); });
    child.on('close', (code) => fin(code));
  });
}

export async function pool(taken, n) {
  const res = new Array(taken.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, taken.length) }, async () => {
    while (i < taken.length) { const k = i++; res[k] = await taken[k](); }
  }));
  return res;
}

// ---------------------------------------------------------------- hartslag

// Houdt bij wat draait en meldt elke `elkMs` welke tests er al lang over doen. De timer is unref'd, dus hij houdt
// het proces nooit open. `nu` en `log` zijn injecteerbaar voor de test.
export function maakHartslag({ log = console.log, elkMs = 30e3, nu = Date.now, drempelMs = 30e3 } = {}) {
  const lopend = new Map();
  const regel = () => {
    const t = nu();
    const lang = [...lopend].filter(([, s]) => t - s.start >= drempelMs).map(([n, s]) => `${n} (${Math.round((t - s.start) / 1000)}s${s.poging > 1 ? `, poging ${s.poging}` : ''}, limiet ${Math.round(s.ms / 1000)}s)`);
    return lang.length ? `...     nog bezig: ${lang.join(', ')}` : '';
  };
  const timer = setInterval(() => { const r = regel(); if (r) log(r); }, elkMs);
  if (timer.unref) timer.unref();
  return {
    start(naam, ms, poging = 1) { lopend.set(naam, { start: nu(), ms, poging }); },
    stop(naam) { lopend.delete(naam); },
    regel,
    sluit() { clearInterval(timer); },
  };
}

// ---------------------------------------------------------------- herkansing

// Draait `eenmaal(poging)` en herkanst alleen een bekende flake die faalt. -> { res, pogingen, flaky, fouten, info }
//   flaky: er was minstens één mislukte poging en de laatste slaagde (dan is res de geslaagde poging)
//   fouten: de uitvoer van de mislukte pogingen, voor het rapport
// Een SKIP of een geslaagde eerste poging wordt nooit herkanst. isFout(res) bepaalt wat als mislukt telt.
export async function runMetHerkansing(naam, eenmaal, { tabel = KNOWN_FLAKES, isFout = (r) => r.timedOut || r.code !== 0 } = {}) {
  const info = flakeInfo(naam, tabel);
  const max = 1 + (info ? Math.max(0, Number(info.retries) || 0) : 0);
  const fouten = [];
  let res;
  for (let poging = 1; poging <= max; poging++) {
    res = await eenmaal(poging);
    if (!isFout(res)) return { res, pogingen: poging, flaky: poging > 1, fouten, info };
    fouten.push(res.out);
  }
  return { res, pogingen: max, flaky: false, fouten, info };
}

// De regel voor het rapport bij een herkansing ('' als er geen was).
export function flakeMelding(r) {
  if (!r.info || r.pogingen < 2) return '';
  const issue = r.info.issue ? ` (#${r.info.issue})` : '';
  const eerste = (r.fouten[0] || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).find((l) => /FAIL|Error|fout|mislukt/i.test(l)) || '';
  return r.flaky
    ? `FLAKY${issue}: slaagde pas bij poging ${r.pogingen}; eerste fout: ${eerste.slice(0, 160) || 'onbekend'}`
    : `bekende flake${issue} faalde alle ${r.pogingen} pogingen: dit is geen toeval meer`;
}

// ---------------------------------------------------------------- behoeften (wereld, three)

export const BEHOEFTEN_FILE = 'test_behoeften.json';

// scripts/test_behoeften.json: { tests: { '<naam>_test.mjs': { wereld: true, reden: '...' } } }. Ontbrekend = geen bijzondere behoefte.
// GDE_TEST_BEHOEFTEN=0 negeert het bestand: zo meet je opnieuw welke tests de wereld echt nodig hebben (scripts/test_behoeften.mjs).
export function laadBehoeften(root) {
  if (process.env.GDE_TEST_BEHOEFTEN === '0') return {};
  try {
    const d = JSON.parse(fs.readFileSync(path.join(root, 'scripts', BEHOEFTEN_FILE), 'utf8'));
    return d && d.tests && typeof d.tests === 'object' ? d.tests : {};
  } catch { return {}; }
}

export const wereldAanwezig = (root) => fs.existsSync(path.join(root, 'game', 'world', 'index-provincie.json'));
export const dataCacheAanwezig = (root) => fs.existsSync(path.join(root, 'data', 'cache', 'province'));

// -> '' (draaien) of de SKIP-reden. `omgeving`: { wereld: bool, three: bool, data?: bool }.
// Een test die om data/cache/province vraagt (b.data) draait ook zonder game/world als die map er is.
export function skipReden(naam, behoeften, omgeving) {
  const b = behoeften && Object.prototype.hasOwnProperty.call(behoeften, naam) ? behoeften[naam] : null;
  if (!b) return '';
  if (b.wereld && !omgeving.wereld && !(b.data && omgeving.data)) return `needs-world: game/world ontbreekt (cd desktop && npm run stage)${b.reden ? '; ' + b.reden : ''}`;
  if (b.three && !omgeving.three) return 'needs-three: three.js niet gevonden (cd desktop && npm run stage, of zet GDE_VENDOR_CACHE)';
  return '';
}
