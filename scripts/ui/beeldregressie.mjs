// Beeldregressie per scherm in drie formaten (#994): goedkoop, zonder afhankelijkheden.
//   node scripts/ui/beeldregressie.mjs --lijst                      de schermen en formaten
//   node scripts/ui/beeldregressie.mjs --run [--groep=<id>] [--sizes=...] [--modi=vol,rustig]   maakt de beelden (een Electron per formaat en stand, via ui_shots.mjs)
//   node scripts/ui/beeldregressie.mjs --vergelijk [--uit=<map>]     vergelijkt een uitvoermap met docs/beeldreferentie/ (geen Electron)
//   node scripts/ui/beeldregressie.mjs --ververs [--only=a,b]        zet de beelden uit de uitvoermap als nieuwe referentie
// Opties: --uit=<map> (standaard .beeldregressie/uit), --tolerantie=<0..255 per kanaal, standaard 8>,
//   --drempel=<aandeel afwijkende pixels, standaard 0.005>, --streng (een ontbrekende referentie telt als fout).
// Referenties staan als docs/beeldreferentie/<formaat>-<scherm>.png (vol) en <formaat>-<scherm>--rustig.png (Rustig drukwerk)
// en worden alleen met --ververs aangemaakt of bijgewerkt. Formaten: 1280x800, 1920x1080 en 3840x2160 (4K); andere maten met --sizes.
// Draait in de releasegate (stage visual), niet bij elke agent; een Electron-run gaat via het slot:
//   node desktop/build/slots/slot.mjs run ds -- node scripts/ui/beeldregressie.mjs --run
// Zie docs/RELEASEGATE.md ("Beeldregressie") en docs/TESTEN.md.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng, encodePng, vergelijk } from '../lib/pngdiff.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const REFERENTIEMAP = path.join(ROOT, 'docs', 'beeldreferentie');
export const FORMATEN = ['1280x800', '1920x1080', '3840x2160'];
// De twee standen: vol (misdruk, schuinte, raster) en Rustig drukwerk (html.rustig-drukwerk; zelfde woorden, geen stempelbeweging).
export const MODI = ['vol', 'rustig'];
export const RUSTIG_ACHTERVOEGSEL = '--rustig';

// Elke groep is een scenebestand dat per scherm een [capture] <naam> maakt (ui_shots.mjs noemt het bestand <formaat>-<naam>.png).
// De eerste set is klein (vijf schermen); de rest staat klaar zodat de lijst met een vlag kan groeien.
export const GROEPEN = [
  { id: 'eerste-set', scenes: 'scripts/ui/beeldregressie_scenes.js', schermen: ['menu-garage', 'menu-todo', 'menu-verhaal', 'menu-telefoon', 'samen-hub'], eerste: true },
  { id: 'momenten', scenes: 'scripts/ui/beeldregressie_momenten_scenes.js', schermen: ['moment-geslaagd', 'moment-mislukt', 'moment-opgepakt', 'moment-gebied', 'moment-wanted'] },
  { id: 'afronding', scenes: 'scripts/ui/ds_afronding_scenes.js', schermen: ['spullen', 'loopbaan', 'veroverd', 'controls', 'samenkeuze', 'samen-starten-consent', 'telefoon-bericht', 'telefoon-nieuws', 'bord-discgolf', 'bord-kartbaan', 'bord-skatepark', 'bord-stopvenster', 'winkel', 'laadscherm'] },
  { id: 'hud', scenes: 'scripts/ui/shots_scenes.js', schermen: ['hud-voet', 'hud-gezocht', 'hud-trein'] },
  { id: 'kaart', scenes: 'scripts/ui/menukaart_scenes.js', schermen: ['kaart-uitleg', 'kaart-na'] },
  { id: 'samen-gast', scenes: 'scripts/ui/spelers_scenes.js', schermen: ['wachtkamer-host', 'wachtkamer-gast', 'spelers-tab-gast', 'tab-lijst'] },
];
export const SCHERMEN = GROEPEN.flatMap((g) => g.schermen.map((naam) => ({ naam, groep: g.id, scenes: g.scenes })));

export const bestandsnaam = (formaat, scherm, modus = 'vol') => `${formaat}-${scherm}${modus === 'rustig' ? RUSTIG_ACHTERVOEGSEL : ''}.png`;

/** Ontleedt <formaat>-<scherm>[--rustig].png; null als het geen beeld van de regressie is. */
export function ontleed(f) {
  const m = /^(\d+x\d+)-(.+?)(--rustig)?\.png$/.exec(f);
  return m ? { formaat: m[1], scherm: m[2], modus: m[3] ? 'rustig' : 'vol' } : null;
}

/** Vergelijkt alle bestanden <formaat>-<scherm>.png in `uit` met `ref`. Geeft { rijen, afwijkend, ontbreekt, nieuw }. */
export function vergelijkMappen(uit, ref, { tolerantie = 8, drempel = 0.005, diffMap = null, alleen = null } = {}) {
  const rijen = [];
  const namen = fs.existsSync(uit) ? fs.readdirSync(uit).filter((f) => ontleed(f)) : [];
  for (const f of namen.sort()) {
    const scherm = ontleed(f).scherm;
    if (alleen && !alleen.includes(scherm)) continue;
    const refPad = path.join(ref, f);
    if (!fs.existsSync(refPad)) { rijen.push({ bestand: f, staat: 'geen-referentie' }); continue; }
    const r = vergelijk(decodePng(fs.readFileSync(refPad)), decodePng(fs.readFileSync(path.join(uit, f))), { tolerantie, maakDiff: !!diffMap });
    const slecht = r.aandeel > drempel;
    if (slecht && r.diff && diffMap) { fs.mkdirSync(diffMap, { recursive: true }); fs.writeFileSync(path.join(diffMap, f), encodePng(r.diff)); }
    rijen.push({ bestand: f, staat: slecht ? 'afwijking' : 'gelijk', aandeel: r.aandeel, gelijkMaat: r.gelijkMaat });
  }
  // referenties zonder nieuw beeld: het scherm is niet gemaakt
  const ontbreekt = fs.existsSync(ref) ? fs.readdirSync(ref).filter((f) => ontleed(f) && !namen.includes(f) && (!alleen || alleen.includes(ontleed(f).scherm))) : [];
  return {
    rijen,
    afwijkend: rijen.filter((r) => r.staat === 'afwijking').length,
    nieuw: rijen.filter((r) => r.staat === 'geen-referentie').length,
    ontbreekt,
  };
}

/** Zet de beelden uit `uit` als referentie (alleen de gevraagde schermen, of alles). Geeft de lijst met bestanden terug. */
export function ververs(uit, ref, alleen = null) {
  fs.mkdirSync(ref, { recursive: true });
  const gezet = [];
  for (const f of fs.readdirSync(uit).filter((x) => ontleed(x))) {
    const scherm = ontleed(f).scherm;
    if (alleen && !alleen.includes(scherm)) continue;
    fs.copyFileSync(path.join(uit, f), path.join(ref, f)); gezet.push(f);
  }
  return gezet;
}

/** Verplaatst <formaat>-<scherm>.png uit `van` naar `naar` als <formaat>-<scherm>--rustig.png. */
export function zetRustigNaast(van, naar) {
  const gezet = [];
  for (const f of fs.existsSync(van) ? fs.readdirSync(van) : []) {
    const o = ontleed(f);
    if (!o || o.modus !== 'vol') continue;
    fs.copyFileSync(path.join(van, f), path.join(naar, bestandsnaam(o.formaat, o.scherm, 'rustig')));
    gezet.push(f);
  }
  fs.rmSync(van, { recursive: true, force: true });
  return gezet;
}

function main() {
  const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
  const vlag = (n) => process.argv.includes('--' + n);
  const uit = path.resolve(arg('uit', arg('out', path.join(ROOT, '.beeldregressie', 'uit')))); // --out: zo roept de releasegate het aan (visual-sets.json)
  const modi = arg('modi', MODI.join(',')).split(',').filter((m) => MODI.includes(m));
  const tolerantie = Number(arg('tolerantie', 8));
  const drempel = Number(arg('drempel', 0.005));
  const alleen = arg('only', '') ? arg('only', '').split(',') : null;
  const sizes = arg('sizes', FORMATEN.join(',')).split(',');
  if (vlag('lijst')) {
    for (const g of GROEPEN) console.log(`${g.id}${g.eerste ? ' (eerste set)' : ''}: ${g.schermen.join(', ')}`);
    console.log('formaten:', sizes.join(', '));
    console.log('standen:', modi.join(', '));
    return 0;
  }
  if (vlag('run')) {
    const gevraagd = arg('groep', '').split(',').filter(Boolean); // --groep=a,b of --groep=alle
    const groepen = GROEPEN.filter((g) => (gevraagd.length ? gevraagd.includes('alle') || gevraagd.includes(g.id) : g.eerste));
    fs.mkdirSync(uit, { recursive: true });
    for (const g of groepen) for (const modus of modi) {
      // Rustig drukwerk: eigen tijdelijke map, daarna met het achtervoegsel naast de volle beelden gezet
      const doel = modus === 'rustig' ? path.join(uit, '_rustig') : uit;
      fs.mkdirSync(doel, { recursive: true });
      const args = [path.join(ROOT, 'scripts', 'ui_shots.mjs'), '--out=' + doel, '--sizes=' + sizes.join(','), '--scenes=' + path.join(ROOT, g.scenes), '--args=--in-process-gpu', '--timeout=' + arg('timeout', 480), ...(modus === 'rustig' ? ['--rustig'] : [])];
      if (alleen) args.push('--only=' + alleen.join(','));
      console.log('== groep', g.id, '(' + modus + ')');
      const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: ROOT });
      if (r.status !== 0) { console.error('ui_shots eindigde met', r.status); return 2; }
      if (modus === 'rustig') zetRustigNaast(doel, uit);
    }
  }
  if (vlag('ververs')) {
    const gezet = ververs(uit, REFERENTIEMAP, alleen);
    console.log(`${gezet.length} referenties bijgewerkt in ${path.relative(ROOT, REFERENTIEMAP)}`);
    return 0;
  }
  if (vlag('vergelijk') || vlag('run')) {
    const res = vergelijkMappen(uit, REFERENTIEMAP, { tolerantie, drempel, diffMap: uit + '-diff', alleen });
    for (const r of res.rijen) console.log(`${r.staat === 'gelijk' ? 'ok      ' : r.staat === 'afwijking' ? 'AFWIJKT ' : 'nieuw    '} ${r.bestand}${r.aandeel !== undefined ? ` (${(r.aandeel * 100).toFixed(2)}% van de pixels${r.gelijkMaat === false ? ', ander formaat' : ''})` : ' (geen referentie; maak er een met --ververs)'}`);
    for (const f of res.ontbreekt) console.log('ONTBREEKT ' + f + ' (referentie zonder nieuw beeld)');
    console.log(`${res.rijen.length} beelden, ${res.afwijkend} afwijkend, ${res.nieuw} zonder referentie, ${res.ontbreekt.length} ontbrekend`);
    return res.afwijkend || res.ontbreekt.length || (vlag('streng') && res.nieuw) ? 1 : 0;
  }
  console.log('Gebruik: --lijst | --run | --vergelijk | --ververs (zie de kop van dit bestand)');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main());
