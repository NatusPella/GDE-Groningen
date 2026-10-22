// De rit naar Tjalke (#411, drachtenrit.js): de regels zonder wereld.
//   node scripts/drachtenrit_test.mjs
import { VRIEND, RIT, TEKST, PRIJS, nieuweRit, stapRit, ritResultaat, langsAfzetting, slalomPionnen } from '../game/js/drachtenrit.js';
import { wordCount, WORD_BUDGET } from '../game/js/hudtext.js';
import { readFileSync } from 'node:fs';

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

// de vriend staat in één constante en niet in de tekst vastgeklonken
ok(VRIEND === 'Tjalke Rumsma', 'de vriend heet Tjalke Rumsma');
ok(Object.values(TEKST).flat().filter((t) => typeof t === 'string').some((t) => t.includes(VRIEND)), 'de tekst gebruikt de constante');
const src = readFileSync(new URL('../game/js/drachtenrit.js', import.meta.url), 'utf8');
ok((src.match(/Tjalke Rumsma/g) || []).length === 1, 'de naam staat precies één keer als letterlijke tekst (de constante)');

// teksten: Nederlands, kaartlengte, geen merken, geen winter
const teksten = Object.values(TEKST).flat().filter((t) => typeof t === 'string');
ok(teksten.every((t) => wordCount(t) <= 30 && t.length < 260), 'teksten zijn kaartlengte');
ok(!/bacardi|heineken|grolsch|amstel|jupiler|bavaria|corona|budweiser|brand/i.test(teksten.join(' ')), 'geen biermerk of ander merk');
ok(!/sneeuw|winter|ijs\b/i.test(teksten.join(' ')), 'altijd zomer');
ok(!/dood|lijk|gewond|slachtoffer|bloed/i.test(teksten.join(' ')), 'geen slachtoffers');
ok(teksten.some((t) => /taxi/.test(t)), 'de droge afsluiting: had je een taxi kunnen nemen');

// de wereld: de rit eindigt aan de provinciegrens (de A7 verlaat de wereld rond x -25,5 km; Drachten ligt buiten de tegels)
ok(RIT.einde.x > -28670 && RIT.einde.x < -20000, 'het einde ligt binnen de wereld, aan de westkant', String(RIT.einde.x));
ok(Math.hypot(RIT.slalom.x - RIT.einde.x, RIT.slalom.y - RIT.einde.y) > 5000, 'de afzetting ligt ver voor het einde');

// de afzetting
{
  const p = slalomPionnen(RIT.slalom, RIT.slalom.heading, 10.5);
  ok(p.length === 19, 'drie taperpionnen en vier blokken van vier', String(p.length));
  ok(p.every((q) => Math.abs(q.across) <= 5.25), 'alle pionnen staan op de rijbaan');
  const blokken = [0, 1, 2, 3].map((b) => p.slice(3 + b * 4, 7 + b * 4));
  ok(blokken.every((b, i) => b.every((q) => (i % 2 === 0 ? q.across < 0 : q.across > 0))), 'de blokken sluiten om en om links en rechts');
  ok(blokken.every((b) => Math.max(...b.map((q) => Math.abs(q.across))) <= 5.0 && Math.min(...b.map((q) => Math.abs(q.across))) >= 0.7), 'de andere helft blijft open (minstens 0,7 m van de middenstreep vrij)');
  const lengte = Math.max(...p.map((q) => q.along)) - Math.min(...p.map((q) => q.along));
  ok(lengte > RIT.slalomLengte * 0.9 && lengte < RIT.slalomLengte + 40, 'de afzetting heeft de bedoelde lengte', String(lengte));
  // langs/across zijn elkaars omgekeerde
  const q = p[7], terug = langsAfzetting({ x: q.x, y: q.y });
  ok(Math.abs(terug.along - q.along) < 1e-6 && Math.abs(terug.across - q.across) < 1e-6, 'langsAfzetting is de omgekeerde van de plaatsing');
}

// het verloop: stad, snelweg, slalom, politie, kwijt, grens, klaar
function speel(pionnen, verloop = []) {
  const s = nieuweRit(), ev = [];
  const stap = (inp) => ev.push(...stapRit(s, { afstandSlalom: 99999, along: -999, afstandEinde: 99999, wanted: 0, tikken: s.pionnen, opWeg: false, ...inp }, 0.1));
  stap({});
  ok(s.fase === 'stad', 'begint in de stad');
  stap({ opWeg: true });
  ok(s.fase === 'snelweg' && ev.some((e) => e.type === 'snelweg'), 'op de A7: snelweg');
  stap({ opWeg: true, afstandSlalom: 400, along: -400 });
  ok(s.fase === 'slalom' && ev.some((e) => e.type === 'slalom-op'), 'dichtbij de afzetting: slalom');
  stap({ tikken: pionnen, along: 0 });
  stap({ along: RIT.slalomLengte / 2 + 20 });
  ok(s.fase === 'politie' && ev.some((e) => e.type === 'slalom-klaar'), 'voorbij de afzetting: de politie volgt');
  stap({ along: RIT.slalomLengte / 2 + 100 });
  ok(!s.politie, 'de politie komt pas een stuk verder');
  stap({ along: RIT.slalomLengte / 2 + RIT.slalomNa + 5 });
  stap({ along: RIT.slalomLengte / 2 + RIT.slalomNa + 6, wanted: s.alsterren });
  ok(s.politie && ev.some((e) => e.type === 'politie'), 'de politie zit erachter');
  return { s, ev, stap };
}
{
  const { s, ev, stap } = speel(1);
  ok(ev.find((e) => e.type === 'tik') && ev.filter((e) => e.type === 'tik').length === 1, 'één omgetikte pion: één tik-gebeurtenis');
  ok(ev.find((e) => e.type === 'politie').sterren === RIT.sterren && !ev.find((e) => e.type === 'politie').ruw, 'een nette slalom: twee sterren, de zachte tekst');
  stap({ along: 3000, afstandEinde: 300, wanted: 2 });
  ok(s.fase === 'politie' && !s.klaar, 'met de politie achter je ben je nog niet aangekomen');
  stap({ along: 4000, afstandEinde: 200, wanted: 2 });
  ok(ev.filter((e) => e.type === 'nog-politie').length === 1, 'een waarschuwing, één keer');
  stap({ along: 4100, afstandEinde: 900, wanted: 0 });
  ok(s.fase === 'grens' && ev.some((e) => e.type === 'kwijt'), 'de politie kwijt: door naar de grens');
  stap({ along: 9000, afstandEinde: 100, wanted: 0 });
  ok(s.klaar && ev.some((e) => e.type === 'klaar' && e.schoon), 'aangekomen zonder politie: klaar, netjes');
  const r = ritResultaat(s);
  ok(r.base === PRIJS.basis && r.tip === PRIJS.fooi && r.flawless && r.text === TEKST.klaarSchoon, 'netjes: de fooi en de nette afsluiting');
  ok(stapRit(s, { afstandSlalom: 0, along: 0, afstandEinde: 0, wanted: 0, tikken: 0, opWeg: true }, 1).length === 0, 'na de aankomst gebeurt er niets meer');
}
{
  const { s, ev, stap } = speel(RIT.pionnenRuw);
  ok(ev.find((e) => e.type === 'politie').sterren === RIT.sterrenRuw && ev.find((e) => e.type === 'politie').ruw, 'veel pionnen omgetikt: drie sterren, de harde tekst');
  stap({ along: 5000, afstandEinde: 5000, wanted: 0 });
  stap({ along: 9000, afstandEinde: 100, wanted: 0 });
  const r = ritResultaat(s);
  ok(r.tip === 0 && !r.flawless && r.text === TEKST.klaarRuw && r.base === PRIJS.basis, 'ruw: geen fooi, wel het basisloon en de droge afsluiting');
}
// een slalom zonder één tik is ook nette
{ const { s } = speel(0); ok(s.pionnen === 0 && ritResultaat(s).flawless, 'zonder tik is het ook netjes'); }

// de aanmelding bij het sidejob-contract: lijst, loon, pictogram, eenmalig
const sj = readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
ok(/SIDE_JOBS = \[[^\]]*bernard, tjalke/.test(sj), 'de rit staat in de lijst met zijmissies');
ok(sj.includes('tjalke: [300, 400]'), 'de telefoon kent het loon');
ok(sj.includes("case 'tjalke':"), 'er is een kaartpictogram');
ok(sj.includes('c.job.once'), 'het contract kent een baan van één keer');
const job = readFileSync(new URL('../game/js/sidejob_tjalke.js', import.meta.url), 'utf8');
ok(/once: true/.test(job) && /allowWanted: true/.test(job), 'eenmalig en met de politie toegestaan');
ok(/hasUnique\('sjJobs', 'tjalke'\)/.test(job), 'een tweede keer is niet mogelijk');

console.log(`drachtenrit_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
