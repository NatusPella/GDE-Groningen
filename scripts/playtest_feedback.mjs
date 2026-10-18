// Zet speeltestfeedback (platte tekst) om in issue-concepten. Verstuurt niets:
// geen gh, geen netwerk. De coördinator controleert de concepten en maakt de issues.
//   node scripts/playtest_feedback.mjs <bestand|->            concepten als Markdown naar het scherm
//   node scripts/playtest_feedback.mjs <bestand> --json       dezelfde concepten als JSON
//   node scripts/playtest_feedback.mjs <bestand> --uit <map>  een .md per concept in <map>
//   --scenario=A --tester=T2                                  komt in de beschrijving (geen echte namen)
// Invoer: één opmerking per regel of alinea; bullets (-, *, 1.) mogen. Zie docs/PLAYTESTPLAN.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const BUG = /\b(bug|crash\w*|vastgelopen|loopt vast|liep vast|vastzitten|zat vast|kapot|werkt niet|werkte niet|doet niets|hapert|haperde|stotter\w*|zweeft|zwevend\w*|geen geluid|fout\w*|verdwijnt|verdween|klopt niet|onzichtbaar|camera (?:zit|staat) in)\b|door (?:de |een )?(?:muur|muren|grond|gebouw)/i;
const ZEER_HOOG = /\b(crash\w*|save (?:kwijt|weg|stuk)|voortgang (?:kwijt|weg)|kan niet verder|niet verder|loopt vast|vastgelopen|zwart scherm)\b/i;
const HOOG = /\b(onduidelijk|snapte niet|snap het niet|snap niet|weet niet (?:wat|waar|hoe)|verdwaald|afgehaakt|verwarrend|geen idee|te moeilijk|frustr\w*)\b/i;
const LAAG = /\b(typo|spelfout|kleurtje|detail|nice to have)\b/i;
const GROOT = /\b(nieuwe (?:systeem|modus|minigame|missie)|helemaal opnieuw|herbouw\w*|multiplayer|alle streken|overal)\b/i;
const MIDDEL = /\b(meer|variatie|verbeter\w*|uitleg|animatie|ondertitel\w*)\b/i;

// Persoonsgegevens eruit: e-mail, telefoonnummer, @naam en "naam: ...".
export function anonimiseer(t) {
  return t
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[verwijderd]')
    .replace(/(?<!\w)(?:\+31|0031|0)[\s-]?\d(?:[\s-]?\d){8}(?!\d)/g, '[verwijderd]')
    .replace(/(^|\s)@[\w-]+/g, '$1[verwijderd]')
    .replace(/\b(naam|tester|speler)\s*[:=]\s*[^\n,;]+/gi, '$1: [verwijderd]');
}

export function splits(tekst) {
  const uit = [];
  let cur = [];
  const klaar = () => { const s = cur.join(' ').replace(/\s+/g, ' ').trim(); if (s) uit.push(s); cur = []; };
  for (const r of tekst.split(/\r?\n/)) {
    if (!r.trim()) { klaar(); continue; }
    if (/^\s*(?:[-*•]|\d+[.)])\s+/.test(r)) { klaar(); cur.push(r.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')); continue; }
    if (/^#{1,6}\s/.test(r)) { klaar(); continue; } // kopjes zijn geen opmerking
    cur.push(r.trim());
  }
  klaar();
  return uit;
}

export function classificeer(s) {
  const type = BUG.test(s) ? 'bug' : 'wens';
  let impact = 'midden';
  if (ZEER_HOOG.test(s)) impact = 'zeer-hoog';
  else if (HOOG.test(s) || (type === 'bug' && /\b(altijd|elke keer|steeds)\b/i.test(s))) impact = 'hoog';
  else if (LAAG.test(s)) impact = 'laag';
  let kosten = 'S';
  if (GROOT.test(s) && type === 'wens') kosten = 'L';
  else if (MIDDEL.test(s) || s.length > 220) kosten = 'M';
  return { type, impact, kosten };
}

export function titel(s) {
  let t = s.replace(/^["'“”]+|["'“”]+$/g, '');
  const eerste = t.split(/(?<=[.!?])\s/)[0];
  if (eerste.length > 10) t = eerste;
  t = t.replace(/[.!?]+$/, '');
  if (t.length > 80) t = t.slice(0, 77).replace(/\s+\S*$/, '') + '...';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function maakConcepten(tekst, { scenario = '', tester = '' } = {}) {
  return splits(anonimiseer(tekst)).map((s) => {
    const c = classificeer(s);
    const wie = [tester && `tester ${tester}`, scenario && `scenario ${scenario}`].filter(Boolean).join(', ');
    return {
      titel: titel(s),
      labels: [c.type, 'impact-' + c.impact, 'kosten-' + c.kosten],
      body: `${s}\n\nBron: playtest${wie ? ` (${wie})` : ''}, zie docs/PLAYTESTPLAN.md.\n\nNog niet onderzocht in beeld; type, impact en kosten zijn een automatische gok, controleer ze.\nTijdstempel opname (indien aanwezig):`,
    };
  });
}

const md = (c) => `# ${c.titel}\n\nLabels: ${c.labels.join(', ')}\n\n${c.body}\n`;
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'concept';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
  const uitIdx = args.indexOf('--uit');
  const uitMap = uitIdx >= 0 ? args[uitIdx + 1] : '';
  const bestand = args.find((a, i) => (a === '-' || !a.startsWith('--')) && uitIdx < 0 || i !== uitIdx + 1);
  if (!bestand) { console.error('Gebruik: node scripts/playtest_feedback.mjs <bestand|-> [--json] [--uit <map>] [--scenario=A] [--tester=T1]'); process.exit(2); }
  const tekst = readFileSync(bestand === '-' ? 0 : bestand, 'utf8');
  const concepten = maakConcepten(tekst, { scenario: opt('scenario'), tester: opt('tester') });
  if (args.includes('--json')) console.log(JSON.stringify(concepten, null, 2));
  else if (uitMap) {
    mkdirSync(uitMap, { recursive: true });
    concepten.forEach((c, i) => writeFileSync(join(uitMap, `${String(i + 1).padStart(2, '0')}-${slug(c.titel)}.md`), md(c)));
    console.log(`${concepten.length} concepten in ${uitMap}`);
  } else console.log(concepten.map(md).join('\n---\n\n'));
}
