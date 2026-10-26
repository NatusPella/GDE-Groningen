// De pure regels van de conducteursronde in de trein (#492): een vaste uitkomst per reiziger, vijf reizigers per
// ronde, één beloning per ronde en een teller die niet dubbel telt. Geen THREE, geen DOM, geen klok.
//   node scripts/treincontrole_test.mjs
const T = await import('../game/js/treincontrole.js');

let fails = 0, n = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i !== '' ? ' (' + i + ')' : ''}`); } };

// --- een nieuwe ronde begint leeg
const st = T.beginControle(42);
ok(st.seed === 42 && st.n === 0 && st.doel === T.CONTROLE_DOEL && !T.klaar(st), 'een nieuwe ronde begint leeg');
ok(st.gedaan.size === 0 && st.rondes === 0 && T.beloning(st) === null, 'en zonder beloning');
ok(T.beginControle(0).seed === 1 && T.beginControle(-4).seed === 1, 'een ongeldig zaadje valt terug op 1');

// --- de uitkomst is deterministisch: dezelfde reiziger, hetzelfde antwoord
for (let k = 0; k < 20; k++) {
  ok(T.uitkomst(7, 0, k) === T.uitkomst(7, 0, k), `reiziger ${k}: hetzelfde antwoord bij hetzelfde zaadje`);
}
ok(T.uitkomst(7, 0, 3) !== T.uitkomst(8, 0, 3) || T.uitkomst(7, 0, 4) !== T.uitkomst(8, 0, 4), 'een ander zaadje geeft een andere reeks');
// alle drie de uitkomsten komen voor, en alleen die drie
const soorten = new Set();
for (let s = 1; s <= 40; s++) for (let c = 0; c < 3; c++) for (let i = 0; i < 12; i++) soorten.add(T.uitkomst(s, c, i));
ok(soorten.size === 3 && soorten.has('ok') && soorten.has('zoeken') && soorten.has('automaat'), 'ok, zoeken en automaat komen voor', [...soorten].join(','));
ok(Object.keys(T.ANTWOORDEN).every((k) => typeof T.ANTWOORDEN[k] === 'string' && T.ANTWOORDEN[k].length > 5), 'elke uitkomst heeft een antwoord');

// --- vijf reizigers: de teller loopt en na de vijfde volgt één beloning
const ronde = T.beginControle(11);
let laatste = null;
for (let i = 0; i < T.CONTROLE_DOEL; i++) {
  laatste = T.controleer(ronde, 0, i);
  ok(laatste.ok === true, `reiziger ${i + 1} telt mee`);
  if (i < T.CONTROLE_DOEL - 1) ok(!laatste.klaar && laatste.beloning === null, `reiziger ${i + 1}: de ronde is nog niet klaar`);
}
ok(laatste.klaar === true && T.klaar(ronde), 'na vijf reizigers is de ronde klaar');
ok(laatste.n === T.CONTROLE_DOEL && laatste.doel === T.CONTROLE_DOEL, 'de teller staat op vijf');
ok(laatste.beloning && laatste.beloning.euro === T.CONTROLE_LOON && laatste.beloning.xp === T.CONTROLE_XP, 'met loon en punten');
ok(ronde.rondes === 1 && ronde.n === 0 && ronde.gedaan.size === 0, 'de volgende ronde begint meteen, leeg');
ok(T.beloning(ronde) === null, 'de beloning is eenmalig per ronde');

// --- de volgende vijf betalen pas na de rust; binnen de rust gebeurt er niets
let betaald = 0;
const teVroeg = T.controleer(ronde, 0, 10, 0);
ok(teVroeg.ok === false && teVroeg.rust === true, 'binnen de rust begint geen nieuwe ronde');
for (let i = 0; i < T.CONTROLE_DOEL; i++) {
  const r = T.controleer(ronde, 0, i + 10, T.CONTROLE_RUST_S + 1);
  if (r.beloning) betaald++;
}
ok(betaald === 1 && ronde.rondes === 2, 'na de rust betaalt een tweede ronde weer één keer');
const na = ronde.rondes;
const zesde = T.controleer(ronde, 0, 99, T.CONTROLE_RUST_S * 2 + 3);
ok(zesde.ok === true && zesde.beloning === null && ronde.rondes === na, 'losse controle na een ronde betaalt niet');

// --- dezelfde reiziger twee keer telt niet dubbel
const dubbel = T.beginControle(3);
ok(T.controleer(dubbel, 1, 2).ok === true && dubbel.n === 1, 'de eerste keer telt');
const her = T.controleer(dubbel, 1, 2);
ok(her.ok === false && her.herhaald === true && dubbel.n === 1, 'dezelfde reiziger telt niet nog eens');
ok(T.controleer(dubbel, 1, 3).ok === true && dubbel.n === 2, 'een andere reiziger telt wel');

// --- grenzen: een ongeldige wagen of plek doet niets
for (const [car, i] of [[-1, 0], [0, -1], [1.5, 0], [0, 2.5], [null, 0], [0, null], ['a', 0]]) {
  const r = T.controleer(dubbel, car, i);
  ok(r.ok === false && dubbel.n === 2, `ongeldige plek ${String(car)}:${String(i)} telt niet`);
}
ok(T.controleer(null, 0, 0).ok === false, 'zonder stand gebeurt er niets');
ok(T.klaar(null) === false && T.beloning(null) === null, 'zonder stand is er geen ronde en geen beloning');

// --- reset: dezelfde stand, leeg; met een nieuw zaadje
const vers = T.reset(dubbel, 99);
ok(vers === dubbel && dubbel.seed === 99 && dubbel.n === 0 && dubbel.gedaan.size === 0 && !T.klaar(dubbel), 'reset maakt de stand leeg');
ok(T.reset(dubbel).seed === 99, 'zonder zaadje houdt reset het oude');
ok(T.reset(null, 5).seed === 5, 'reset zonder stand geeft een nieuwe');

console.log(`${n - fails}/${n} treincontrole ok`);
process.exit(fails ? 1 : 0);
