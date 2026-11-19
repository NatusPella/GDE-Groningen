// De playtestbundel van de proefspeler (scripts/bot/proef.mjs): uit de events.jsonl van een run per missie een
// samenvatting.json, een index.md met de oogmomenten en een review-brief.md voor een vision-reviewer.
// Pure functies (tekst in, tekst of object uit) plus één schrijffunctie (bundelSchrijven) voor de bestanden.
// scripts/proefbundel_test.mjs test het met een gefabriceerde events.jsonl, zonder Electron.
import fs from 'node:fs';
import path from 'node:path';

export const parseEvents = (text) => String(text || '').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const r1 = (v) => Math.round(v * 10) / 10;
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

// De oogmomenten uit het logboek (type 'oog'), in volgorde, met hun nummer.
export function oogMomenten(events) {
  return events.filter((e) => e.type === 'oog').map((e, i) => ({ ...e, nr: i + 1 }));
}

// De samenvatting van één run van één missie (`id`). Geslaagd alleen als de stap 'klaar' eindigde, zonder cheat en zonder opgeven.
export function samenvatMissie(events, { id = '', seed = null } = {}) {
  const begin = events.find((e) => e.type === 'step' && e.event === 'begin' && (!id || e.id === id));
  const eind = [...events].reverse().find((e) => e.type === 'step' && e.event === 'end' && (!id || e.id === id));
  const starts = events.filter((e) => e.type === 'mission' && e.event === 'start' && (!id || e.id === id)).length;
  // het aantal mislukte pogingen komt uit de telling van het spel zelf (story.fails, in elk oogmoment): de fail-regel van de bot telt ook een geslaagde missie
  const oogEv = events.filter((e) => e.type === 'oog');
  const failRegels = events.filter((e) => e.type === 'mission' && e.event === 'fail' && (!id || e.id === id)).length;
  const fails = oogEv.some((e) => Number.isFinite(e.mislukt)) ? Math.max(...oogEv.map((e) => (Number.isFinite(e.mislukt) ? e.mislukt : 0))) : failRegels;
  const cheats = events.filter((e) => e.type === 'cheat' && e.ok !== false).length;
  const geweigerd = events.filter((e) => e.type === 'cheat-geweigerd').length;
  const opgegeven = events.find((e) => e.type === 'opgegeven') || null;
  const slotEv = [...events].reverse().find((e) => e.type === 'einde') || null;
  const tEind = eind && Number.isFinite(eind.t) ? eind.t : (slotEv && Number.isFinite(slotEv.gameS) ? slotEv.gameS : (events[events.length - 1] || {}).t);
  const oog = oogMomenten(events);
  const vast = events.filter((e) => e.type === 'stuck' || e.type === 'vast').map((e) => ({ t: e.t, stap: e.step || e.stap || '', x: Math.round(e.x ?? 0), y: Math.round(e.y ?? 0), stilS: e.idleFor ?? e.stilS ?? null, trede: e.rung || null, afstand: e.goalDist ?? null }));
  const zonderDoel = oog.filter((o) => o.zicht && o.zicht.bekend && o.zicht.zichtbaar === false && !o.filmpje && (o.afstand != null || o.doelNaam));
  const stillevens = [...oog.map((o) => o.stilS || 0), eind && Number.isFinite(eind.maxQuiet) ? eind.maxQuiet : 0];
  const frames = oog.map((o) => o.frameMs).filter((v) => Number.isFinite(v));
  const gez = oog.map((o) => o.gezondheid).filter((v) => Number.isFinite(v));
  const geslaagd = !!(eind && eind.outcome === 'klaar') && !opgegeven && cheats === 0;
  return {
    missie: id, seed, geslaagd, uitkomst: opgegeven ? 'opgegeven' : eind ? eind.outcome : slotEv ? slotEv.result.toLowerCase() : 'onbekend',
    reden: opgegeven ? opgegeven.reden || '' : slotEv ? slotEv.reason || '' : '',
    pogingen: geslaagd ? fails + 1 : opgegeven ? Math.max(fails, 1) : Math.max(fails + 1, starts, 1), mislukt: fails,
    duurS: begin && Number.isFinite(tEind) ? r1(tEind - begin.t) : null,
    cheats, cheatsGeweigerd: geweigerd,
    vastgezet: vast.length, vastgezetMomenten: vast,
    langsteStilstandS: r1(Math.max(0, ...stillevens)),
    schermenZonderZichtbaarDoel: zonderDoel.length, schermenZonderDoelNrs: zonderDoel.map((o) => o.nr),
    doelwissels: events.filter((e) => e.type === 'doel').length,
    oogmomenten: oog.length,
    frameMsP95: frames.length ? r1(pct(frames, 0.95)) : null, frameMsMax: frames.length ? r1(Math.max(...frames)) : null,
    minGezondheid: gez.length ? Math.min(...gez) : null,
    maxGezocht: Math.max(0, ...events.filter((e) => e.type === 'gezocht').map((e) => e.naar || 0), ...oog.map((o) => o.gezocht || 0)),
    timeouts: events.filter((e) => e.type === 'timeout').length,
  };
}

// Faalratio over meerdere seeds van dezelfde missie: wat kan een mens met deze missie?
export function faalratio(samenvattingen) {
  const n = samenvattingen.length;
  const goed = samenvattingen.filter((s) => s.geslaagd).length;
  const pog = samenvattingen.map((s) => s.pogingen);
  return {
    seeds: n, geslaagd: goed, mislukt: n - goed, faalratio: n ? Math.round(((n - goed) / n) * 100) / 100 : null,
    gemPogingen: n ? r1(pog.reduce((a, b) => a + b, 0) / n) : null, maxPogingen: n ? Math.max(...pog) : null,
    opgegeven: samenvattingen.filter((s) => s.uitkomst === 'opgegeven').length,
    perSeed: samenvattingen.map((s) => ({ seed: s.seed, geslaagd: s.geslaagd, pogingen: s.pogingen, uitkomst: s.uitkomst })),
  };
}

const tijd = (t) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '?');
const REDEN = { begin: 'stap begint', doel: 'nieuw doel', start: 'missie start', mislukt: 'missie mislukt', slagen: 'stap geslaagd', filmpje: 'filmpje', vast: 'vast', opgegeven: 'opgegeven', beeld: 'beeld' };

// Wat er gebeurde bij een oogmoment, in één regel Nederlands.
export function bijschrift(o) {
  const delen = [`${REDEN[o.reden] || o.reden}`];
  if (o.doelTekst || o.doelNaam) delen.push(`doel: ${o.doelTekst || o.doelNaam}${o.afstand != null ? ` (${Math.round(o.afstand)} m)` : ''}`);
  if (o.zicht && o.zicht.bekend && !o.filmpje) delen.push(`doelwaypoint: ${o.zicht.zichtbaar ? 'zichtbaar' : `NIET zichtbaar, ${o.zicht.reden}`}`);
  if (o.ondertitel) delen.push(`ondertitel: "${o.ondertitel}"`);
  if (o.dialoog) delen.push(`dialoog: "${o.dialoog.tekst}" [${o.dialoog.opties.join(' / ')}]`);
  if (o.kaart) delen.push(`kaart ${o.kaart.zichtbaarS} s: "${o.kaart.tekst}"`);
  if (o.stilS >= 5) delen.push(`stil ${o.stilS} s`);
  if (o.voertuig) delen.push(`${o.voertuig.soort} ${o.voertuig.snelheid} m/s, schade-stand ${o.voertuig.gezondheid}`);
  if (o.gezocht) delen.push(`gezocht ${o.gezocht}`);
  if (o.frameMs != null && o.frameMs > 40) delen.push(`frametijd ${o.frameMs} ms`);
  return delen.join('; ');
}

// De beelden van een run in volgorde: eerst de oogmomenten, dan de losse shots (filmpjes met --watch) die er niet bij horen.
export function beeldLijst(events) {
  const oog = oogMomenten(events);
  const metBeeld = new Set(oog.map((o) => o.shot).filter(Boolean));
  const lijst = oog.map((o) => ({ shot: o.shot || '', t: o.t, oog: o }));
  for (const e of events) if (e.type === 'shot' && !metBeeld.has(e.name)) lijst.push({ shot: e.name, t: e.t, oog: { reden: 'beeld', naam: e.name, tijd: e.t, t: e.t, zicht: { bekend: false } } });
  lijst.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  return lijst.map((b, i) => ({ ...b, nr: i + 1, bestand: `${String(i + 1).padStart(2, '0')}-${(b.oog.reden || 'beeld').replace(/[^\w-]/g, '_')}.png` }));
}

export function bouwIndexMd(sam, beelden) {
  const k = [`# Oogmomenten ${sam.missie}${sam.seed != null ? ` (seed ${sam.seed})` : ''}`, '',
    `Uitkomst: **${sam.geslaagd ? 'geslaagd' : 'niet geslaagd'}** (${sam.uitkomst}${sam.reden ? ', ' + sam.reden : ''}); ${sam.pogingen} poging(en); duur ${tijd(sam.duurS)}; cheats ${sam.cheats}.`, '',
    '| nr | tijd | beeld | wat er gebeurde |', '| --- | --- | --- | --- |'];
  for (const b of beelden) k.push(`| ${b.nr} | ${tijd(b.t)} | ${b.bestand ? `![${b.nr}](${b.bestand})` : 'geen beeld'} | ${bijschrift(b.oog).replace(/\|/g, '/')} |`);
  if (!beelden.length) k.push('| | | | geen oogmomenten in het logboek |');
  return k.join('\n') + '\n';
}

// De checklist voor een vision-reviewer: een agent leest dit bestand en de beelden met de Read-tool en schrijft issue-voorstellen.
export function bouwReviewBrief(sam, beelden, { map = '.' } = {}) {
  // de nummers in de samenvatting zijn oogmoment-nummers; de reviewer ziet de beeldnummers
  const zonderDoelBeelden = beelden.filter((b) => b.oog.nr && sam.schermenZonderDoelNrs.includes(b.oog.nr)).map((b) => b.nr);
  const k = [`# Reviewbrief ${sam.missie}${sam.seed != null ? ` (seed ${sam.seed})` : ''}`, '',
    'Je bent een speler die dit spel niet kent en kijkt mee met een bot die als een mens speelde (reactietijd, stuurruis, geen cheats). Open de beelden hieronder met de Read-tool, in volgorde, en lees `index.md` ernaast. Beoordeel wat een mens zou zien en voelen, niet de code.', '',
    '## Wat de bot meldt', '',
    `- uitkomst: ${sam.geslaagd ? 'geslaagd' : 'NIET geslaagd'} (${sam.uitkomst}${sam.reden ? ': ' + sam.reden : ''}); pogingen ${sam.pogingen}; duur ${tijd(sam.duurS)}`,
    `- vastgezet: ${sam.vastgezet}x; langste stilstand ${sam.langsteStilstandS} s; timeouts ${sam.timeouts}`,
    `- schermen zonder zichtbaar doelwaypoint: ${sam.schermenZonderZichtbaarDoel}${zonderDoelBeelden.length ? ` (beeld ${zonderDoelBeelden.join(', ')})` : ''}`,
    `- cheats: ${sam.cheats} (moet 0 zijn); geweigerde cheats: ${sam.cheatsGeweigerd}`,
    `- frametijd p95 ${sam.frameMsP95 ?? '?'} ms, max ${sam.frameMsMax ?? '?'} ms; laagste gezondheid ${sam.minGezondheid ?? '?'}; hoogste gezocht ${sam.maxGezocht}`, '',
    '## Vragen per beeld', '',
    '1. Weet ik als speler wat ik moet doen? Staat het doel in de HUD, en klopt de tekst met wat ik zie?',
    '2. Zie ik het doel? Is er een marker, pijl of minimapstip, en valt hij in beeld of staat er iets voor?',
    '3. Is alle tekst leesbaar (grootte, contrast, hoe lang hij blijft staan, niet over iets heen)?',
    '4. Is er iets zwevends, ontbrekends, door muren of flikkerends (rekwisieten, voertuigen, personen, water, licht)?',
    '5. Klopt de camera in filmpjes: staat het personage in beeld, zit de camera niet in een muur, is de ondertitel bij de juiste spreker?',
    '6. Voelt het ergens oneerlijk (tijdsdruk zonder uitleg, een mislukking zonder dat duidelijk is waarom, een onzichtbare vijand)?',
    '7. Wat zou een mens hier vragen ("waar moet ik heen?", "wat doet die knop?", "waarom ben ik dood?")?',
    '8. Past het bij de regels van het spel: alles Nederlands, geen echte merken, altijd zomer?', '',
    '## Beelden', ''];
  for (const b of beelden) k.push(`${b.nr}. ${b.bestand ? path.join(map, b.bestand).replace(/\\/g, '/') : '(geen beeld)'}: ${bijschrift(b.oog)}`);
  if (!beelden.length) k.push('Geen beelden: de run leverde geen oogmomenten op. Meld dat zelf als bevinding (de bot kwam niet in de missie, of het logboek is leeg).');
  k.push('', '## Opbrengst', '',
    'Geef per bevinding een issue-voorstel in het Nederlands: titel, label (`bug` of `wens`), impact (hoog/midden/laag), beeldnummer(s), wat je zag, wat een speler zou verwachten. Een bevinding zonder beeld of regel uit `index.md` telt niet. Zeg eerlijk wat je niet kon beoordelen (bijvoorbeeld geluid, of animatie in stilstaande beelden).', '');
  return k.join('\n');
}

// Schrijft de bundel van één run: leest <runDir>/events.jsonl en zet de bestanden in <doel> (dat mag runDir zelf zijn).
// Ruwe shots-*.png worden hernoemd naar genummerde beelden; wat er niet bij hoort blijft staan.
export function bundelSchrijven(runDir, doel, { id = '', seed = null, bewaarRuw = false } = {}) {
  const evPad = path.join(runDir, 'events.jsonl');
  const events = fs.existsSync(evPad) ? parseEvents(fs.readFileSync(evPad, 'utf8')) : [];
  const sam = samenvatMissie(events, { id, seed });
  const beelden = beeldLijst(events);
  fs.mkdirSync(doel, { recursive: true });
  for (const b of beelden) {
    const bron = path.join(runDir, `shots-${b.shot}.png`);
    if (b.shot && fs.existsSync(bron)) {
      fs.copyFileSync(bron, path.join(doel, b.bestand));
      if (!bewaarRuw && path.resolve(runDir) === path.resolve(doel)) fs.rmSync(bron, { force: true });
    } else { b.bestand = ''; }
  }
  if (path.resolve(runDir) !== path.resolve(doel) && fs.existsSync(evPad)) fs.copyFileSync(evPad, path.join(doel, 'events.jsonl'));
  fs.writeFileSync(path.join(doel, 'samenvatting.json'), JSON.stringify(sam, null, 1));
  fs.writeFileSync(path.join(doel, 'index.md'), bouwIndexMd(sam, beelden));
  fs.writeFileSync(path.join(doel, 'review-brief.md'), bouwReviewBrief(sam, beelden, { map: doel }));
  return { sam, beelden };
}

// Het overzicht van een hele proef (alle missies, alle seeds) als Markdown.
export function bouwOverzichtMd(perMissie) {
  const k = ['# Proefspeler: overzicht', '', '| missie | geslaagd | faalratio | pogingen (gem) | vast | langste stilstand | schermen zonder doel | cheats |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const m of perMissie) {
    const s = m.samenvattingen;
    k.push(`| ${m.missie} | ${m.ratio.geslaagd}/${m.ratio.seeds} | ${m.ratio.faalratio} | ${m.ratio.gemPogingen} | ${s.reduce((a, x) => a + x.vastgezet, 0)} | ${Math.max(0, ...s.map((x) => x.langsteStilstandS))} s | ${s.reduce((a, x) => a + x.schermenZonderZichtbaarDoel, 0)} | ${s.reduce((a, x) => a + x.cheats, 0)} |`);
  }
  k.push('', 'Per missie: `<missie>/review-brief.md` (voor een vision-reviewer), `index.md`, `samenvatting.json`, `events.jsonl`.', '');
  return k.join('\n');
}
