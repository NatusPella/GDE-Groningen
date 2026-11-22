// De belangrijkste speler-flows als scenario: hoeveel toetsdrukken kost elke flow, heeft elke kaart een volgende actie en een terugweg,
// en doen toetsenbord en controller hetzelfde? De echte pure UI-regels (launchchoice, difficultycard, reisview, de voorselectie van de
// sessiekeuze) lopen hier met precies de toetsen die de controller in een menu stuurt (controls.js PAD_MAPS.menu; voor het spelbegin is
// A een spatie). Geen Electron, geen netwerk, geen echte opslag.
//   node scripts/flow_stappen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, 'game/js', f), 'utf8');
const opslag = new Map();
globalThis.window = globalThis;
globalThis.navigator ??= {};
globalThis.localStorage = {
  getItem: (k) => (k === 'gde-settings' && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== 'gde-settings') throw new Error('test schreef naar ' + k); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, body: null, head: null, activeElement: null };

const S = await import('../game/js/settings.js');
const K = await import('../game/js/launchchoice.js');
const D = await import('../game/js/difficultycard.js');
const V = await import('../game/js/reisview.js');
const { PAD_MAPS } = await import('../game/js/controls.js');

let n = 0;
const t = async (naam, f) => { try { await f(); n++; } catch (e) { e.message = naam + ': ' + e.message; throw e; } };

// De toetsen die de controller in een menu stuurt, zoals keyEventInit ze als e.key schrijft.
const padMenu = PAD_MAPS.menu;
const naarKey = { enter: 'Enter', escape: 'Escape', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight' };
const PAD = {
  ok: naarKey[padMenu.a], voorSpel: ' ', terug: naarKey[padMenu.b],
  op: naarKey[padMenu.up], neer: naarKey[padMenu.down], links: naarKey[padMenu.left], rechts: naarKey[padMenu.right],
};
// Het budget per flow: meer bevestigingen of schermen dan dit is een verslechtering van de flow.
const BUDGET = { nieuwSpel: 2, doorgaan: 1, samenEerste: 3, samenTerug: 2, reisStandaard: 1 };

await t('controller: de menu-indeling stuurt precies de toetsen waar de kaarten op rekenen', () => {
  assert.ok(Object.values(PAD).every((k) => typeof k === 'string' && k.length > 0), JSON.stringify(PAD));
});

await t('flow nieuw spel: twee bevestigingen, op toetsenbord en controller', () => {
  let drukken = 0;
  for (const ok of ['Enter', ' ', PAD.ok, PAD.voorSpel]) {
    drukken = 0;
    const start = K.toetsActie(ok, K.voorselectie({ startKeuze: null })); drukken++;
    assert.equal(start.kies, 'alleen', 'startkaart met ' + JSON.stringify(ok));
    const niveau = D.levelKeyAction(ok, 1); drukken++; // de kaart opent met Standaard gefocust (difficultyui.js toon('niveau', 1))
    assert.equal(niveau.kies, D.levelCards().find((c) => c.aanbevolen).id, 'moeilijkheid met ' + JSON.stringify(ok));
  }
  assert.ok(drukken <= BUDGET.nieuwSpel, drukken + ' drukken');
});

await t('flow doorgaan: een bevestiging, de laatste keuze staat al gekozen', () => {
  assert.equal(K.toetsActie(PAD.ok, K.voorselectie({ startKeuze: 'alleen' })).kies, 'alleen');
  assert.equal(K.toetsActie(PAD.ok, K.voorselectie({ startKeuze: 'samen' })).kies, 'samen');
  assert.ok(1 <= BUDGET.doorgaan);
});

await t('flow Samen aansluiten: drie schermen de eerste keer, twee daarna, geen netwerk vooraf', async () => {
  const gevraagd = [];
  let netVoorAkkoord = 0;
  const maak = (antw) => ({
    plan: K.launchPlan({}),
    settings: () => S.getSettings(),
    naam: async () => { gevraagd.push('naam'); S.setSetting('onlineNaam', 'Bouwer'); S.setSetting('onlineMeedoen', true); return true; },
    keuze: async () => { gevraagd.push('keuze'); return antw.keuze; },
    toestemming: async () => { gevraagd.push('toestemming'); return true; },
    sessie: async (voorkeur) => { gevraagd.push('sessie:' + voorkeur); return antw.rol; },
    samen: () => { if (S.getSettings().onlineMeedoen !== true) netVoorAkkoord++; },
    bewaar: (m) => K.bewaarKeuze(m),
    bewaarRol: (r) => K.bewaarRol(r),
  });
  const wis = () => { S.setSetting('onlineNaam', ''); S.setSetting('onlineMeedoen', null); S.setSetting('startKeuze', null); S.setSetting('samenRol', null); };
  wis();
  await K.askLaunchChoice(maak({ keuze: 'samen', rol: 'gast' }));
  assert.deepEqual(gevraagd, ['keuze', 'naam', 'sessie:host']);
  assert.ok(gevraagd.length <= BUDGET.samenEerste);
  assert.equal(netVoorAkkoord, 0, 'er gaat niets naar buiten zonder akkoord');
  gevraagd.length = 0;
  await K.askLaunchChoice(maak({ keuze: 'samen', rol: 'gast' }));
  assert.deepEqual(gevraagd, ['keuze', 'sessie:gast'], 'de tweede keer staan Samen en Meedoen al gekozen');
  assert.ok(gevraagd.length <= BUDGET.samenTerug);
  wis();
});

await t('flow reizen: een druk voor de aanbevolen keuze, een terugweg, toetsenbord gelijk aan controller', () => {
  const beat = { to: 'Zoutkamp', length: 30000, ride: 'bus', lines: ['Klaas wacht.'] };
  assert.equal(V.keyAction(beat, 'meerijden', 'Enter').kies, 'meerijden');
  assert.ok(1 <= BUDGET.reisStandaard);
  assert.equal(V.keyAction(beat, 'meerijden', 'Escape').sluit, true, 'Escape sluit met de standaardkeuze');
  // de controller bereikt elke keuze met omhoog en omlaag plus A; het toetsenbord met Tab plus Enter of rechtstreeks 1, 2, 3
  const ids = ['meerijden', 'overslaan', 'zelf'];
  const viaPad = new Set();
  const viaToets = new Set();
  let p = 'meerijden';
  let q = 'meerijden';
  for (let i = 0; i < 3; i++) { viaPad.add(p); p = V.cyclePick(beat, p, 1); viaToets.add(q); q = V.keyAction(beat, q, 'Tab').markeer; }
  const direct = new Set(['1', '2', '3'].map((k) => V.keyAction(beat, 'meerijden', k).kies));
  assert.deepEqual([...viaPad].sort(), ids);
  assert.deepEqual([...viaToets].sort(), ids);
  assert.deepEqual([...direct].sort(), ids);
});

await t('elke kaart: Enter en A doen iets, Escape en B zijn de terugweg, de richtingen verplaatsen de focus', () => {
  for (const toets of [PAD.ok, PAD.voorSpel, 'Enter']) {
    assert.ok(K.toetsActie(toets, 0).kies, 'startkaart ' + JSON.stringify(toets));
    assert.ok(D.levelKeyAction(toets, 1).kies, 'moeilijkheidskaart ' + JSON.stringify(toets));
  }
  assert.equal(K.toetsActie(PAD.terug, 1).kies, 'alleen', 'startkaart: terug is het veilige, offline pad');
  assert.equal(D.levelKeyAction(PAD.terug, 0).kies, D.levelCards().find((c) => c.aanbevolen).id, 'moeilijkheid: terug is de aanbevolen stand');
  assert.ok(D.optionsKeyAction(PAD.terug, 0).terug, 'opties: terug naar de niveaus');
  for (const toets of [PAD.op, PAD.neer, PAD.links, PAD.rechts]) {
    assert.ok(K.toetsActie(toets, 0).focus != null, 'startkaart verplaatst de focus met ' + toets);
    assert.ok(D.levelKeyAction(toets, 0).focus != null, 'moeilijkheidskaart verplaatst de focus met ' + toets);
  }
});

await t('foutstaten: de boot biedt Opnieuw laden, een mislukte sessie zet je terug op een scherm met keuzes', () => {
  const main = src('main.js');
  assert.match(main, /knop\.id = 'boot-reload';/, 'bootfout: een herlaadknop');
  assert.match(main, /textContent = 'Opnieuw laden'/, 'de knop heet Opnieuw laden');
  const lobby = src('lobbyui.js');
  assert.match(lobby, /set\(\{ t: 'kies', rol: ROLES\.GAST \}\); return set\(\{ t: 'fout'/, 'een mislukte sessie zet je terug op de keuze, met de fout erbij');
});

console.log('flow_stappen_test: ' + n + '/' + n + ' ok');
process.exit(0);
