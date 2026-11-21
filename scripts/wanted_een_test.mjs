// Eén wanted-systeem (#1080): sterren alleen rechtsboven, geen schild-chip of sterren op de minimap.
//   node scripts/wanted_een_test.mjs
import { readFileSync } from 'node:fs';
import { wantedPhase, wantedStatus, wantedAnnounce } from '../game/js/wantedstate.js';
import { decideHud } from '../game/js/hudrules.js';
import { momentVanWanted, bouwMoment } from '../game/js/bigmoment.js';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };
const lees = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// de status: leeg bij 0, anders achtervolging of zoeken
ok(wantedStatus(0, 'rustig') === '' && wantedStatus(3, 'achtervolging') === 'Ze zoeken je' && wantedStatus(2, 'zoeken') === 'Weg uit beeld', 'status per fase');
ok(wantedAnnounce(3, 'achtervolging') === 'Gezocht: 3 van 5 sterren, achtervolging' && wantedAnnounce(0, 'rustig') === 'Je bent niet meer gezocht', 'één schermlezertekst');
ok(wantedPhase({ wanted: 0 }) === 'rustig' && wantedPhase({ wanted: 2, police: { searching: true } }) === 'zoeken', 'fase blijft zoals ze was');

// de zichtbaarheid: nooit een lege rij, in geen enkele stand
for (const mode of ['minimaal', 'slim', 'alles']) {
  ok(!decideHud({ mode, wanted: 0, wantedAgo: 1 }).show.stars, `geen lege sterrenrij bij 0 (${mode})`);
  ok(decideHud({ mode, wanted: 1 }).show.stars, `sterren bij 1 ster (${mode})`);
}

// de kaart "Weg uit beeld / Vrij": kort statuskaartje zonder eigen sterren
for (const [a, b] of [[0, 2], [3, 0], [3, 1]]) {
  const m = bouwMoment(momentVanWanted(a, b));
  ok(m.sterren === null && !/sterren/.test(m.aria), `tag ${a}->${b} heeft geen sterren`);
}
ok(momentVanWanted(2, 0).titel === 'Vrij' && momentVanWanted(2, 0).klein === 'Weg uit beeld', 'Vrij blijft het statuskaartje');

// de bron: één plek met sterren, de minimap zonder chip, ring of stippen
const panel = lees('../game/js/hud_panel.js'), css = lees('../game/js/hud_panel.css');
ok(!/minimapheat|heatChip|policeBadge|mmHeat/.test(panel), 'hud_panel.js kent de oude chip niet meer');
ok(!/hud-mm-heat/.test(css), 'de chip-CSS is weg');
ok(/class="hud-wanted" role="img" hidden/.test(panel) && /els\.wanted\.hidden = ster === 0/.test(panel), 'de kaart is verborgen bij 0 sterren');
ok(/hw-status/.test(panel) && /class="hud-search" hidden/.test(panel) && /hw-sterren[\s\S]*hw-status/.test(panel), 'status en aftelbalk zitten in dezelfde kaart');
ok(/mmWrap\.classList\.toggle\('chase'/.test(panel) && /hud-minimap-wrap\.wanted\.chase \{ box-shadow/.test(css) && !/hud-mm-sirene/.test(css), 'de rand is rood bij een achtervolging, zonder beweging (ds3: geen lus)');
ok(!/ring om het (politie)?schild/i.test(lees('../game/js/mapview.js')) && !/ring om het (politie)?schild/i.test(panel), 'de legenda verwijst niet meer naar een ring');
console.log(`wanted_een_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
