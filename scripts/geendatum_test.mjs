// De speler ziet geen datum meer (#1396): HUD-dagregel, agenda-labels, kaarten en kopjes bevatten geen dag of datum.
// De kalender blijft intern (dagtelling, zonnestand, evenementen). Puur: geen DOM, geen opslag.
// node scripts/geendatum_test.mjs
import './node3d.mjs';
import { periodLabel, upcomingSpecials, SPECIAL_DAYS, day, formatDay, ONTZET_DAY, LAST_SUMMER_DAY } from '../game/js/calendar.js';
import { dateLabel, AGENDA } from '../game/js/evenementen.js';
import { partNumber, PARTS } from '../game/js/storyarc.js';
import { agendaRegels } from '../game/js/agendaregels.js';
const { hudDate } = await import('../game/js/hudcalendar.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
// een datum of dagnummer: "28 aug", "Vr 28", "dag 15", "t/m", of een maandnaam
const DATUM = /\d{1,2}\s*(jan|feb|mrt|mei|apr|jun|jul|aug|sep|okt|nov|dec)|\b(augustus|september)\b|\bdag\s*\d|\bt\/m\b|\bover \d+ dag/i;

// 1. HUD: geen dagregel, geen aftelling; alleen de naam van een echte speciale dag
for (const d of [1, day(8, 14), day(8, 18), ONTZET_DAY - 3, ONTZET_DAY, LAST_SUMMER_DAY]) {
  const h = hudDate({ calendar: { day: d, seen: [] } });
  ok(h.short === '' && h.long === '' && h.countdown === '', `HUD dag ${d}: geen datum en geen aftelling`, JSON.stringify(h));
  ok(!DATUM.test(h.special), `HUD dag ${d}: de badge is geen datum`, h.special);
}
ok(hudDate({ calendar: { day: day(8, 18), seen: [] } }).special !== '', 'een echte speciale dag (de markt) blijft als badge');
ok(hudDate({ calendar: { day: day(8, 14), seen: [] } }).key !== hudDate({ calendar: { day: day(8, 15), seen: [] } }).key, 'de interne dagtelling blijft de sleutel van de badge');

// 2. de labels in de agenda zijn relatief
const woorden = new Set(['nu', 'vandaag', 'morgen', 'binnenkort']);
for (let d = 1; d <= LAST_SUMMER_DAY; d += 3) {
  for (const u of upcomingSpecials(d, 6)) ok(woorden.has(u.label), `speciale dag ${u.s.id} dag ${d}: label ${u.label}`);
  for (const ev of AGENDA.slice(0, 40)) ok(woorden.has(dateLabel(ev, d)), `evenement ${ev.id} dag ${d}: label ${dateLabel(ev, d)}`);
}
ok(periodLabel({ from: 5, to: 9 }, 5) === 'nu' && periodLabel({ from: 5, to: 5 }, 5) === 'vandaag' && periodLabel({ from: 6, to: 6 }, 5) === 'morgen' && periodLabel({ from: 9, to: 9 }, 5) === 'binnenkort', 'periodLabel: nu, vandaag, morgen, binnenkort');

// 3. de agendaregels van het menu
for (const d of [1, day(8, 20), ONTZET_DAY]) {
  const regels = agendaRegels(d, { count: 6, specials: upcomingSpecials(d, 6) });
  ok(regels.every((r) => !DATUM.test(r.when) && !DATUM.test(r.name)), `agendaregels dag ${d}: geen datum`, regels.map((r) => r.when).join(' | '));
}

// 4. de kaarten van de speciale dagen en de aktekop noemen geen datum
for (const s of SPECIAL_DAYS) ok(!DATUM.test([s.name, ...(s.card || [])].join(' ')), `kaart ${s.id}: geen datum`);
for (const p of Object.keys(PARTS)) ok(!DATUM.test(partNumber(p)), `deelkop ${p}: geen datum`, partNumber(p));

// 5. intern blijft de kalender gewoon werken (constitution 3: altijd zomer, kalenderdagen blijven)
ok(formatDay(ONTZET_DAY).short === 'Vr 28 aug' && ONTZET_DAY > 1 && LAST_SUMMER_DAY >= ONTZET_DAY, 'intern: formatDay en de dagtelling blijven zoals ze waren');

console.log(`geendatum_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
