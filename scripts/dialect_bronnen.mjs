// Verwerkt het bewijs uit scripts/dialect_bronnen.json (opzoekingen in woordenboeken, #13) in het register
// scripts/dialect_woorden.json. Werkt offline; het bewijs zelf is op 20 oktober 2026 verzameld (zie
// docs/DIALECT-CONTROLE.md, "Hoe het bewijs is verzameld"). Handmatig toegevoegde opmerkingen en de status
// 'twijfel' blijven staan; alleen woorden zonder oordeel of met status 'afgeleid' worden bijgewerkt.
//   node scripts/dialect_bronnen.mjs            toont wat er zou veranderen
//   node scripts/dialect_bronnen.mjs --toepassen  schrijft het register
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REG = path.join(REPO, 'scripts', 'dialect_woorden.json');
const EV = path.join(REPO, 'scripts', 'dialect_bronnen.json');
const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (s) => plain(s).split(/[^a-z]+/).filter((w) => w.length > 1);

// Past de betekenis die wij gebruiken bij een glos uit het woordenboek? (overlap in de stam)
export function matches(nl, glosses) {
  const ours = words(nl);
  return glosses.some((g) => words(g).some((w) => ours.some((o) => o === w || (o.length > 3 && w.length > 3 && (o.startsWith(w.slice(0, 4)) || w.startsWith(o.slice(0, 4)))))));
}

export function toepassen(reg, ev) {
  const log = { bron: 0, anderBetekenis: [], nietGevonden: 0, zonderVertaling: 0 };
  for (const [w, v] of Object.entries(reg.gronings)) {
    const e = ev.gronings[w];
    if (e === undefined) continue;
    if (e === null) { log.nietGevonden++; continue; }
    if (v.status === 'twijfel' || v.status === 'bron' && v.handmatig) continue;
    const bronnen = e.b.join(', ');
    if (!e.n.length) {
      v.status = 'bron'; v.opm = `Woordwaark (${bronnen}): komt voor als trefwoord; vertaling niet uitgelezen`; log.zonderVertaling++;
    } else if (v.nl === '?' || matches(v.nl, e.n)) {
      v.status = 'bron'; v.opm = `Woordwaark (${bronnen}): ${e.n.slice(0, 4).join('; ')}`; log.bron++;
    } else {
      v.status = 'afgeleid';
      v.opm = `Woordwaark (${bronnen}) kent het trefwoord als "${e.n.slice(0, 3).join('; ')}"; de gebruikte betekenis "${v.nl}" is een andere vorm of een homoniem en niet apart bevestigd`;
      log.anderBetekenis.push([w, v.nl, e.n.join('; ')]);
    }
  }
  for (const [w, e] of Object.entries(ev.fries || {})) {
    const v = reg.fries[w]; if (!v) continue;
    const t = [];
    if (e.woordenboek) t.push(`woordenboek: ${e.woordenboek}`);
    if (typeof e.fyp === 'number') t.push(`fy.wikipedia: ${e.fyp} artikelen`);
    v.bewijs = t.join('; ');
    if (e.woordenboek && v.status === 'kennis') v.status = 'bron';
  }
  return log;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
  const ev = JSON.parse(fs.readFileSync(EV, 'utf8'));
  const log = toepassen(reg, ev);
  console.log(`bevestigd: ${log.bron}, trefwoord zonder vertaling: ${log.zonderVertaling}, andere betekenis of vorm: ${log.anderBetekenis.length}, niet als trefwoord gevonden: ${log.nietGevonden}`);
  for (const a of log.anderBetekenis) console.log('  ander:', a.join(' | '));
  if (process.argv.includes('--toepassen')) fs.writeFileSync(REG, JSON.stringify(reg, null, 1) + '\n');
}
