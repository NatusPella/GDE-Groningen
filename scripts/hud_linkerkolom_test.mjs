// De linkerkolom van de HUD (kartbaan 20-11, #985): zone A (kaarten van boven) en zone E (prestaties op de
// minimap) staan in dezelfde kolom. Een lange startkaart liep over de melding "Nieuwe streek" heen en kapte zijn
// tekst af. hudbus.js schat de hoogte van een kaart in regels (puur, zonder DOM) en hudcards.js laat een E-kaart
// wachten tot hij onder de A-kaart past; een A-kaart die erbij komt, duwt de E-kaart terug in de rij.
//   node scripts/hud_linkerkolom_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const lees = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const B = await import(new URL('../game/js/hudbus.js', import.meta.url).href);
const S = await import(new URL('../game/js/startkaart.js', import.meta.url).href);

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };

// De melding uit explorationlive.js, zoals hudcards.js hem splitst (titel tot de dubbele punt).
const streek = { kind: 'prestatie', kicker: 'Verkend', title: 'Nieuwe streek', body: 'Lauwerskust. De naam staat nu op je kaart.' };
const kart = S.startkaartSpec('kartbaan', { difficulty: 'standaard' });

t('de hoogteschatting telt kop, titel en elke <br>-regel met terugloop', () => {
  assert.equal(B.cardLines(null), 0);
  assert.equal(B.cardLines({ title: 'Kort', body: '' }), 2, 'kicker plus titel');
  assert.equal(B.cardLines({ title: 'Kort', body: 'een regel' }), 3);
  assert.equal(B.cardLines({ title: 'Kort', bodyHtml: 'een<br>twee<br>drie' }), 5, 'elke <br> is een regel');
  assert.equal(B.cardLines({ title: 'Kort', body: 'woord '.repeat(20) }), 2 + 4, 'twintig woorden van vijf letters: zes per regel van 40 tekens, dus vier regels');
  assert.equal(B.cardLines({ title: 'Kort', bodyHtml: '<kbd class="hud-key">W</kbd> gas' }), 3, 'markup telt niet als tekst');
  assert.equal(B.cardLines(streek), 4);
});

t('het geval uit het spel: de kartbaan-startkaart en "Nieuwe streek" passen niet samen', () => {
  assert.ok(kart, 'de kartbaan heeft een startkaart');
  assert.ok(B.cardLines(kart) >= 14, `de startkaart is lang (${B.cardLines(kart)} regels)`);
  assert.equal(B.leftColumnFits(kart, streek), false, 'de E-kaart moet wachten');
});

t('een korte A-kaart en een E-kaart staan wel samen in beeld', () => {
  assert.equal(B.leftColumnFits({ kind: 'geld', title: '+€45', body: 'Bijbaan klaar.' }, streek), true);
  assert.equal(B.leftColumnFits(null, streek), true, 'zonder A-kaart past alles');
  assert.equal(B.leftColumnFits(kart, null), true, 'zonder E-kaart past alles');
});

t('elke startkaart past alleen tussen de bovenrand en de minimap (ook met een record)', () => {
  const te = [];
  for (const id of Object.keys(S.STARTKAART)) {
    for (const difficulty of ['ontspannen', 'standaard', 'uitdagend']) {
      const r = B.cardLines(S.startkaartSpec(id, { difficulty, record: '1:02,34 met een lange toelichting' }));
      if (r > B.LEFT_COLUMN_LINES) te.push(`${id}/${difficulty}: ${r}`);
    }
  }
  assert.deepEqual(te, [], `langer dan ${B.LEFT_COLUMN_LINES} regels loopt onder de minimap door`);
});

t('hudcards.js vraagt de kolom voor elke E-kaart en duwt een E-kaart terug voor een A-kaart', () => {
  const src = lees('game/js/hudcards.js');
  assert.match(src, /import \{[^}]*leftColumnFits[^}]*\} from '\.\/hudbus\.js'/);
  assert.match(src, /queue\.findIndex\(\(q\) => isFree\(q\) && fitsColumn\(q\)/, 'een E-kaart wacht tot hij past');
  assert.match(src, /zoneOf\(next\) === 'A'\) for \(const e of up\) if \(zoneOf\(e\) === 'E' && !leftColumnFits\(next\.spec, e\.spec\)\)/, 'een A-kaart duwt een E-kaart die hij zou raken');
  assert.match(src, /noLog: true/, 'de teruggezette E-kaart komt niet twee keer in het tekstlog');
});

console.log(`${n - fails}/${n} geslaagd`);
if (fails) process.exit(1);
