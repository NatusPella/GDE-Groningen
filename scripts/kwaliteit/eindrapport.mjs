// Eindrapport van de kwaliteitsmachine (docs/KWALITEITSMACHINE.md): zet de beeldregressie, de video-QA en de runnerlogboeken
// in één webpagina voor de coördinator. Leest alleen wat de andere stappen al schreven; start niets en haalt niets van buiten.
//
//   node scripts/kwaliteit/eindrapport.mjs [--regressie=<uitvoer van beeldregressie.mjs>] [--videoqa=<uitvoer van videoqa/run.mjs>]
//        [--uit=<bestand.html>] [--top=12]
//
// Standaard --uit: ~/gde-qa/eindrapport-<JJJJMMDD-HHMM>.html. Beelden en contactvellen staan als relatieve links (het rapport
// hoort dus naast of boven de uitvoermappen te staan; elders werken de links als bestand-URL's ook, maar alleen op deze machine).
// Wat ontbreekt, staat er als "niet gedraaid" in: het rapport is nooit stil groen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { esc, rel, badge, pagina } from './html.mjs';

const lees = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const staart = (f, n = 8) => { try { return fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).slice(-n); } catch (e) { return []; } };
const hartslagen = (f) => { try { return (fs.readFileSync(f, 'utf8').match(/\] hartslag /g) || []).length; } catch (e) { return 0; } };

/** Puur: de kopregels (verdict per onderdeel) uit de ingelezen gegevens. */
export function kopregels({ regressie, videoqa }) {
  const r = [];
  if (!regressie) r.push({ soort: 'overgeslagen', tekst: 'Beeldregressie: niet gedraaid' });
  else {
    const v = regressie;
    const slecht = (v.afwijkend || 0) + (v.ontbreekt || 0) + (v.fouten || 0);
    r.push({ soort: slecht ? 'fout' : v.nieuw ? 'nieuw' : 'ok', tekst: `Beeldregressie: ${v.rijen.length} punten, ${v.afwijkend || 0} afwijkend, ${v.nieuw || 0} zonder referentie, ${v.ontbreekt || 0} zonder beeld, ${v.fouten || 0} fout` });
  }
  if (!videoqa) r.push({ soort: 'overgeslagen', tekst: 'Video-QA: niet gedraaid' });
  else {
    const s = videoqa.samenvatting || {};
    const kand = videoqa.delen.reduce((n, d) => n + (d.analyse ? d.analyse.kandidaten.length : 0), 0);
    const zonder = videoqa.delen.filter((d) => !d.analyse).length;
    r.push({ soort: s.doelGehaald && !zonder ? (kand ? 'let' : 'ok') : 'fout', tekst: `Video-QA: ${((s.opgenomenSeconden || 0) / 60).toFixed(1)} van ${((s.doelSeconden || 0) / 60).toFixed(1)} min, ${videoqa.delen.length} deel/delen, ${kand} kandidaten voor het oog${zonder ? `, ${zonder} deel/delen zonder analyse` : ''}` });
  }
  return r;
}

export function leesVideoqa(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  const samenvatting = lees(path.join(dir, 'samenvatting.json')) || lees(path.join(dir, 'run-state.json'));
  const namen = fs.readdirSync(dir).filter((f) => /^deel-\d+$/.test(f) && fs.statSync(path.join(dir, f)).isDirectory()).sort();
  // een losse opnamemap (opname.mjs zonder run.mjs) is ook goed: dan is de map zelf het enige deel
  if (!namen.length && fs.existsSync(path.join(dir, 'analyse.json'))) namen.push('.');
  const delen = namen.map((n) => {
    const d = path.join(dir, n);
    const vellen = fs.existsSync(path.join(d, 'sheets')) ? fs.readdirSync(path.join(d, 'sheets')).filter((f) => f.endsWith('.jpg')).sort().map((f) => path.join(d, 'sheets', f)) : [];
    return { naam: n === '.' ? path.basename(dir) : n, dir: d, analyse: lees(path.join(d, 'analyse.json')), opname: lees(path.join(d, 'opname.json')), vellen, log: path.join(d, 'run.log') };
  });
  return { dir, samenvatting: samenvatting && samenvatting.delen ? { ...samenvatting, opgenomenSeconden: samenvatting.opgenomenSeconden ?? samenvatting.delen.reduce((s, x) => s + (x.seconden || 0), 0) } : samenvatting, delen };
}

function regressieDeel(regDir, uitDir, regressie) {
  if (!regressie) return `<h2>Beeldregressie</h2><p>${badge('overgeslagen', 'niet gedraaid')} Draai <code>node scripts/kwaliteit/beeldregressie.mjs --run --out=&lt;map&gt;</code> en geef de map mee met <code>--regressie=</code>.</p>`;
  const img = (sub, id) => { const f = path.join(regDir, sub, `${id}.png`); return fs.existsSync(f) ? `<a href="${rel(uitDir, f)}"><img loading="lazy" src="${rel(uitDir, f)}" alt="${esc(sub)} ${esc(id)}"></a>` : '<span class="meta">geen beeld</span>'; };
  const kleur = { gelijk: 'ok', afwijking: 'fout', 'geen-referentie': 'nieuw', ontbreekt: 'fout', fout: 'fout' };
  const opvallend = regressie.rijen.filter((r) => r.staat !== 'gelijk');
  return `<h2>Beeldregressie</h2>
<p class="meta">Volledig rapport: <a href="${rel(uitDir, path.join(regDir, 'rapport.html'))}">rapport.html</a> &middot; referentie <code>${esc(regressie.refDir || '?')}</code> &middot; commit ${esc(regressie.commit || '?')}</p>
<table><tr><th>punt</th><th>staat</th><th>SSIM</th><th>slecht</th><th>waarom</th></tr>
${regressie.rijen.map((r) => `<tr><td>${esc(r.id)}</td><td>${badge(kleur[r.staat] || 'let', r.staat)}</td><td>${r.ssim ?? ''}</td><td>${r.aandeelSlecht !== undefined ? (r.aandeelSlecht * 100).toFixed(1) + '%' : ''}</td><td class="klein">${esc((r.redenen || []).join('; '))}</td></tr>`).join('\n')}</table>
${opvallend.length ? '<h3>Wat afwijkt of nieuw is (voor, na, diff)</h3>' + opvallend.map((r) => `<p><b>${esc(r.titel || r.id)}</b> ${badge(kleur[r.staat] || 'let', r.staat)}</p><div class="drie"><figure>${img('ref', r.id)}<figcaption>referentie</figcaption></figure><figure>${img('nieuw', r.id)}<figcaption>nieuw</figcaption></figure><figure>${img('diff', r.id)}<figcaption>diff</figcaption></figure></div>`).join('\n') : '<p>Alle punten binnen hun drempel.</p>'}`;
}

function videoqaDeel(vq, uitDir, top) {
  if (!vq) return `<h2>Video-QA</h2><p>${badge('overgeslagen', 'niet gedraaid')} Draai <code>node scripts/videoqa/run.mjs --minuten=30</code> en geef de map mee met <code>--videoqa=</code>.</p>`;
  const delen = vq.delen.map((d) => {
    if (!d.analyse) return `<h3>${esc(d.naam)}</h3><p>${badge('fout', 'geen analyse')} <span class="meta">${esc(staart(d.log, 3).join(' | '))}</span></p>`;
    const s = d.analyse.stat, k = d.analyse.kandidaten;
    const perSoort = {};
    for (const c of k) (perSoort[c.kind] = perSoort[c.kind] || []).push(c);
    const tabel = Object.entries(perSoort).sort((a, b) => b[1].length - a[1].length).map(([soort, l]) => `<tr><td>${esc(soort)}</td><td>${l.length}</td><td class="klein">${[...l].sort((a, b) => b.score - a.score).slice(0, top).map((c) => `${esc(c.tstr)} ${esc(c.note)}`).join('<br>')}</td></tr>`).join('\n');
    return `<h3>${esc(d.naam)} ${badge(k.length ? 'let' : 'ok', `${k.length} kandidaten`)}</h3>
<p class="meta">${s.seconds} s, ${s.frames} beelden, ${s.segments} segment(en) &middot; rekentijd mediaan ${s.rekentijdMs.mediaan} ms, p99 ${s.rekentijdMs.p99} ms &middot; streamwacht ${(s.streamWacht.aandeel * 100).toFixed(1)}% van de beelden &middot; NaN-regels ${s.nanRegels} &middot; tekst-overlap ${s.tekstOverlap ? s.tekstOverlap.kandidaten + ' uit ' + s.tekstOverlap.metingen + ' metingen' : 'niet gemeten'} &middot; hartslagen in run.log: ${hartslagen(d.log)}</p>
<table><tr><th>soort</th><th>aantal</th><th>hoogste scores (tijd in de opname)</th></tr>${tabel || '<tr><td colspan="3">geen</td></tr>'}</table>
${d.vellen.length ? `<details><summary>${d.vellen.length} contactvellen</summary><div class="vel">${d.vellen.map((f) => `<figure><a href="${rel(uitDir, f)}"><img loading="lazy" src="${rel(uitDir, f)}" alt="${esc(path.basename(f))}"></a><figcaption>${esc(path.basename(f))}</figcaption></figure>`).join('')}</div></details>` : '<p class="meta">geen contactvellen</p>'}`;
  }).join('\n');
  return `<h2>Video-QA</h2><p class="meta">Map <code>${esc(vq.dir)}</code>. Kandidaten zijn plekken die het oog moet zien, geen bevestigde fouten (een snede in een filmpje of een stilstand in een gesprek kan bedoeld zijn).</p>\n${delen}`;
}

export function eindrapportHtml({ regressie, regDir, videoqa, uitDir, top = 12, runs = [] }) {
  const kop = kopregels({ regressie, videoqa });
  const logs = runs.filter((f) => fs.existsSync(f)).map((f) => `<tr><td><a href="${rel(uitDir, f)}">${esc(path.relative(uitDir, f))}</a></td><td>${hartslagen(f)}</td><td class="klein">${staart(f, 4).map(esc).join('<br>')}</td></tr>`).join('\n');
  const body = `<h1>Kwaliteitsmachine: eindrapport</h1>
<p class="meta">${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} &middot; voor de coördinator: eerst de kopregels, dan wat afwijkt; volledig per onderdeel hieronder.</p>
<ul>${kop.map((k) => `<li>${badge(k.soort, k.soort === 'ok' ? 'ok' : k.soort === 'overgeslagen' ? 'niet gedraaid' : k.soort === 'let' ? 'bekijken' : k.soort === 'nieuw' ? 'nieuw' : 'actie')} ${esc(k.tekst)}</li>`).join('')}</ul>
<p class="meta">Na het bekijken van de beeldregressie: <code>release/beeldregressie-bekeken.json</code> schrijven (zie docs/KWALITEITSMACHINE.md en docs/RELEASEGATE.md).</p>
${regressieDeel(regDir, uitDir, regressie)}
${videoqaDeel(videoqa, uitDir, top)}
<h2>Runnerlogboeken</h2>${logs ? `<table><tr><th>logboek</th><th>hartslagen</th><th>laatste regels</th></tr>${logs}</table>` : '<p class="meta">geen logboeken gevonden</p>'}`;
  return pagina('Kwaliteitsmachine: eindrapport', body);
}

async function main(argv) {
  const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const stempel = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const uit = path.resolve(opt('uit', path.join(os.homedir(), 'gde-qa', `eindrapport-${stempel}.html`)));
  const uitDir = path.dirname(uit);
  fs.mkdirSync(uitDir, { recursive: true });
  const regDir = opt('regressie') ? path.resolve(opt('regressie')) : null;
  const regressie = regDir ? lees(path.join(regDir, 'vergelijking.json')) : null;
  if (regDir && !regressie) console.log(`let op: geen vergelijking.json in ${regDir}; beeldregressie staat als niet gedraaid`);
  const videoqa = opt('videoqa') ? leesVideoqa(path.resolve(opt('videoqa'))) : null;
  const runs = [];
  if (regDir) runs.push(path.join(regDir, 'run.log'));
  if (videoqa) { runs.push(path.join(videoqa.dir, 'pijplijn.log')); for (const d of videoqa.delen) runs.push(d.log); }
  fs.writeFileSync(uit, eindrapportHtml({ regressie, regDir, videoqa, uitDir, top: Number(opt('top', 12)), runs }));
  for (const k of kopregels({ regressie, videoqa })) console.log(`${k.soort.padEnd(12)} ${k.tekst}`);
  console.log(`eindrapport: ${uit}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e && e.stack || e); process.exit(1); });
