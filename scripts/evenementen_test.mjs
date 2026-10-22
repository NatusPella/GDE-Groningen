// Agenda van zomerevenementen (evenementen.js, #203). Puur, geen browser.
//   node scripts/evenementen_test.mjs
import fs from 'node:fs';
import * as V from '../game/js/evenementen.js';
import { KINDS, AGENDA } from '../game/js/evenementen.js';
import { REGIO_EVENTS } from '../game/js/regioleven.js';
import { day, LAST_SUMMER_DAY, ONTZET_DAY, weekdayOf } from '../game/js/calendar.js';
import { BASE_KEYS } from '../game/js/storagekeys.js';
import { edgeRule } from '../game/js/worldedge.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

check('agenda heeft dertien evenementen met unieke id\'s', AGENDA.length === 13 && new Set(AGENDA.map((e) => e.id)).size === 13);
for (const ev of AGENDA) {
  check(`${ev.id}: bekende soort`, !!KINDS[ev.kind]);
  check(`${ev.id}: in de zomer`, ev.from >= 1 && ev.to <= LAST_SUMMER_DAY && ev.from <= ev.to, `${ev.from}-${ev.to}`);
  check(`${ev.id}: uren kloppen`, ev.hours[0] >= 0 && ev.hours[1] <= 24 && ev.hours[0] !== ev.hours[1]);
  check(`${ev.id}: coordinaten in Noord-Nederland`, ev.at[0] > 52.9 && ev.at[0] < 53.5 && ev.at[1] > 6.2 && ev.at[1] < 7.3);
  check(`${ev.id}: tekst en naam`, ev.naam.length > 5 && ev.tekst.length > 20);
  check(`${ev.id}: geen winter`, !/sneeuw|winter|vorst|ijs\b|kerst|oud en nieuw/i.test(ev.naam + ev.tekst));
  check(`${ev.id}: geen echte merken/personen (hoofdletterwoorden uit de tekst zijn plaatsen)`, !/Coca|Heineken|Albert|AH\b|Jumbo|Gazprom/.test(ev.tekst));
}
// optocht en wielerronde op een weekend, niet op Ontzetdag, niet samen met een regio-dagkaart in dezelfde plaats
for (const ev of AGENDA.filter((e) => ['optocht', 'wielerronde', 'vuurwerk'].includes(e.kind))) {
  const wd = weekdayOf(ev.from);
  check(`${ev.id}: weekend`, wd === 6 || wd === 0, wd);
  check(`${ev.id}: niet op Ontzetdag`, ev.from !== ONTZET_DAY);
}
for (const ev of AGENDA) {
  for (const r of REGIO_EVENTS) {
    const rd = day(r.month, r.date);
    const same = ev.plaats && r.name.toLowerCase().includes(ev.plaats.toLowerCase()) && rd >= ev.from && rd <= ev.to;
    check(`${ev.id} botst niet met ${r.id}`, !same);
  }
}

const zl = AGENDA.find((e) => e.id === 'ev-kermis-zuidbroek');
const c = V.centreOf(zl);
check('hart is eindig', Number.isFinite(c.x) && Number.isFinite(c.y));
check('actief tijdens de kermis', V.isActive(zl, zl.from, 15) && V.isActive(zl, zl.to, 23));
check('niet voor of na', !V.isActive(zl, zl.from, 10) && !V.isActive(zl, zl.from - 1, 15) && !V.isActive(zl, zl.to + 1, 15));
check('24:00 is einde, geen nachtlus', !V.isActive(zl, zl.from, 0) && !V.isActive(zl, zl.to + 1, 0.5));
const night = { id: 'x', kind: 'concert', from: 5, to: 5, hours: [20, 2], at: [53.2, 6.5] };
check('nachtvenster hoort bij de dag van begin', V.isActive(night, 5, 21) && !V.isActive(night, 5, 1) && V.isActive({ ...night, to: 6 }, 6, 1));

// verkeer en afsluitingen
const dayK = zl.from, h = 18;
check('midden van de kermis: bijna dicht', V.trafficFactor(c.x, c.y, dayK, h) <= KINDS.kermis.traffic + 1e-9);
check('ver weg: vrij', V.trafficFactor(c.x + 5000, c.y, dayK, h) === 1);
check('buiten de uren vrij', V.trafficFactor(c.x, c.y, dayK, 9) === 1);
let prev = -1, mono = true;
for (let d = 0; d <= KINDS.kermis.closure; d += 5) { const f = V.trafficFactor(c.x + d, c.y, dayK, h); if (f < prev - 1e-9) mono = false; prev = f; }
check('verkeer loopt zacht op naar de rand', mono);
const ap = AGENDA.find((e) => e.id === 'ev-ronde-appingedam'), ac = V.centreOf(ap);
check('wielerronde sluit helemaal af', V.roadClosed(ac.x, ac.y, ap.from, 14) && V.avoidPoint(ac.x, ac.y, ap.from, 14));
check('routeplanner mijdt niets buiten het evenement', !V.avoidPoint(ac.x + 3000, ac.y, ap.from, 14));
check('closures leeg buiten evenementen', V.closures(1, 12).length === 0);
check('closures gevuld tijdens ronde', V.closures(ap.from, 14).some((x) => x.id === ap.id && x.traffic === 0));

// menigte en geluid
check('menigte in het hart', Math.abs(V.crowdAt(c.x, c.y, dayK, h) - KINDS.kermis.crowd) < 1e-9);
check('menigte neemt af en is 0 ver weg', V.crowdAt(c.x + 60, c.y, dayK, h) < V.crowdAt(c.x, c.y, dayK, h) && V.crowdAt(c.x + 9999, c.y, dayK, h) === 0);
check('geen menigte als er niets is', V.crowdAt(c.x, c.y, 1, 3) === 0);
const s0 = V.soundAt(c.x, c.y, dayK, h), s1 = V.soundAt(c.x + 150, c.y, dayK, h);
check('geluid: kermis hard in het hart', s0 && s0.sound === 'kermis' && Math.abs(s0.gain - 1) < 1e-9);
check('geluid zachter op afstand en weg buiten bereik', s1 && s1.gain < s0.gain && V.soundAt(c.x + 400, c.y, dayK, h) === null);
const vw = AGENDA.find((e) => e.kind === 'vuurwerk'), vc = V.centreOf(vw);
check('vuurwerk is ver te horen', V.soundAt(vc.x + 400, vc.y, vw.from, 22.5)?.sound === 'vuurwerk');

// activiteit en kaart
check('eventHere: live in het hart', V.eventHere(c.x, c.y, dayK, h)?.live === true);
check('eventHere: niet buiten de afsluiting', V.eventHere(c.x + 500, c.y, dayK, h) === null);
check('eventHere: kort van tevoren aankondigen', V.eventHere(c.x, c.y, dayK, 13, 2)?.live === false && V.eventHere(c.x, c.y, dayK, 10, 2) === null);
const mm = V.mapMarkers(zl.from, 18);
check('kaartmarkers: kermis live', mm.some((m) => m.id === zl.id && m.live && m.icon === 'kraam'));
check('kaartmarkers: andere dag leeg', V.mapMarkers(1, 12).length === 0);

// agenda-teksten
check('agendaOn sorteert op begintijd', (() => { const a = V.agendaOn(zl.from); return a.every((e, i) => i === 0 || a[i - 1].hours[0] <= e.hours[0]); })());
const up = V.upcoming(1, 3);
check('upcoming: drie, op datum', up.length === 3 && up[0].ev.from <= up[1].ev.from && up[1].ev.from <= up[2].ev.from);
check('upcoming na de zomer leeg', V.upcoming(LAST_SUMMER_DAY + 1).length === 0);
check('dateLabel: vandaag/nu/morgen', V.dateLabel(zl, zl.to) === 'vandaag' && V.dateLabel(zl, zl.from).startsWith('nu') && V.dateLabel(zl, zl.from - 1).startsWith('morgen'));
check('timeLabel', V.timeLabel(zl) === '14:00 - 24:00' && V.timeLabel(vw) === '22:00 - 23:30');

// gezien
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };
const st = mem();
let seen = V.loadSeen(st);
seen = V.markSeen(st, seen, zl.id);
seen = V.markSeen(st, seen, zl.id);
check('gezien: één keer bewaard', seen.length === 1 && V.loadSeen(st).length === 1);
st.setItem(V.SEEN_KEY, '[1,"onbekend"');
check('kapotte opslag geeft leeg', V.loadSeen(st).length === 0);
check('onbekende id\'s weggefilterd', (st.setItem(V.SEEN_KEY, JSON.stringify(['onbekend', zl.id])), V.loadSeen(st).length === 1));
check('volle opslag crasht niet', V.markSeen({ setItem() { throw new Error('vol'); } }, [], zl.id).length === 1);
check('opslagsleutel geregistreerd', BASE_KEYS.eventsSeen === V.SEEN_KEY);

// vuurwerk gaat echt omhoog en klinkt (#131): showFor voedt de schoten van worldevents.js
{
  const f0 = V.showFor(vw.from, 22.0), f1 = V.showFor(vw.from, 23.0), fN = V.showFor(vw.from, 12);
  check('showFor: aan tijdens het vuurwerk met het hart van de plaats', f0.on && f0.id === vw.id && f0.at.x === vc.x && f0.at.y === vc.y);
  check('showFor: voortgang loopt op tussen begin en eind', f0.progress === 0 && f1.progress > 0.5 && f1.progress < 1);
  check('showFor: uit buiten het venster of op een andere dag', !fN.on && !V.showFor(vw.from + 1, 22.5).on && !V.showFor(1, 22.5).on);
  const we = fs.readFileSync(new URL('../game/js/worldevents.js', import.meta.url), 'utf8');
  const fx = fs.readFileSync(new URL('../game/js/fx3d.js', import.meta.url), 'utf8');
  check('burstpuffs gloeien (geen nachtlichten: aGlow) en de burst heeft een flits (#347)', fx.includes('aGlow') && fx.includes('vGlow > 0.5') && we.includes('-1.6, 1)') && we.includes('flash of the burst'));
  check('worldevents laat de agenda-show op en knallen (sub firework)', /showFor\(today\(w\)/.test(we) && /sub: 'firework'/.test(we) && /makeShell\(Math\.random, where/.test(we));
}

// activiteitenkind: plekken voor de kaart
{
  const ev = AGENDA[0], all = V.activitySpotsFor(0, 12, true);
  check('activiteitsplekken: hele agenda met all', all.length === AGENDA.length && all.every((s) => Number.isFinite(s.x) && s.name && s.sub));
  const mid = (ev.hours[0] + ev.hours[1]) / 2;
  const today = V.activitySpotsFor(ev.from, mid);
  check('activiteitsplekken: vandaag bevat het evenement, live', today.some((s) => s.id === ev.id && s.live));
  check('activiteitsplekken: zonder all alleen vandaag', today.length < AGENDA.length || AGENDA.every((e) => e.from <= ev.from && e.to >= ev.from));
  check('activiteitsplekken: nette tekst', today.every((s) => !/[A-Z]{4,}/.test(s.sub.replace(/[A-Z]./g, ''))));
}

// routeplanner: extra meters in een dichte afsluiting, niets daarbuiten
{
  const ev = AGENDA.find((e) => KINDS[e.kind].traffic === 0), c = V.centreOf(ev), mid = (ev.hours[0] + ev.hours[1]) / 2;
  check('routestraf: midden maximaal', V.routePenalty(c.x, c.y, ev.from, mid) === V.ROUTE_PENALTY_M);
  check('routestraf: ver weg nul', V.routePenalty(c.x + 9000, c.y, ev.from, mid) === 0);
  check('routestraf: buiten de uren nul', V.routePenalty(c.x, c.y, ev.from, (ev.hours[1] + 1) % 24) === 0 || ev.hours[1] >= 24);
}

// elk middelpunt ligt binnen de rand van de wereld (#345: de kermis lag 2,6 km buiten de Drentse grens)
{
  const idx = new URL('../game/world/index-provincie.json', import.meta.url);
  if (!fs.existsSync(idx)) console.log('SKIP randcheck: geen game/world');
  else {
    const edge = JSON.parse(fs.readFileSync(idx, 'utf8')).global?.edge;
    for (const ev of AGENDA) {
      const p = V.centreOf(ev), r = edgeRule(p.x, p.y, edge, { mode: 'foot' });
      check(`${ev.id}: middelpunt binnen de rand van de wereld`, !r, r ? `${r.action} ${r.edge} ${Math.round(r.d)} m` : '');
    }
  }
}

console.log(bad ? `${bad} van ${n} mislukt` : `evenementen_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
