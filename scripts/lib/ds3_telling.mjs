// Telling voor "alle UI via het designsysteem" (zeefdruk, ADR 0040): per bestand het aantal harde kleuren,
// glas-op-donker-resten, oude componentklassen, losse lettertypen en te kleine lettergroottes in spelerzichtbare
// UI (game/**/*.{css,html,js}). Puur: leest bestanden, geen netwerk. Gebruikt door ds3_ratel_test.mjs en
// docs/DESIGN-AUDIT-UI-21-11.md (`node scripts/ds3_ratel_test.mjs --lijst`).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOORTEN, BEWUST, BEWUST_PATROON, bewustReden, telBestand } from './ds3_regels.mjs';
export { SOORTEN, BEWUST, BEWUST_PATROON, bewustReden, telBestand };

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');


const GEEN_UI = /^game\/(?:world|audio|models|img|storydata|fonts)\//;
const TEKST = /\.(?:js|css|html)$/;

export function bestanden() {
  const a = spawnSync('git', ['ls-files', '-z', 'game', 'desktop', 'web'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  const b = spawnSync('git', ['ls-files', '-z', '--others', '--exclude-standard', 'game', 'desktop', 'web'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  const set = new Set([...(a.stdout || '').split('\0'), ...(b.stdout || '').split('\0')].filter(Boolean));
  return [...set].filter((f) => TEKST.test(f) && !GEEN_UI.test(f) && fs.existsSync(path.join(ROOT, f))).sort();
}


/** { bestand: { n, regels, bewust } } voor alle spelerzichtbare UI-bestanden. */
export function telAlles() {
  const uit = {};
  for (const f of bestanden()) {
    let src; try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
    if (src.length > 4e6) continue;
    const t = telBestand(f, src);
    uit[f] = { ...t, bewust: bewustReden(f) };
  }
  return uit;
}

export function totalen(res, metBewust = false) {
  const t = Object.fromEntries(SOORTEN.map((s) => [s, 0]));
  for (const v of Object.values(res)) {
    if (v.bewust && !metBewust) continue;
    for (const s of SOORTEN) t[s] += v.n[s];
  }
  return t;
}
