// #633: één gedeelde uitje-presentatie. De kaart leent sfeer, patroon, icoon en accent uit de
// bestaande tabellen (activiteitensfeer.js, carrieresfeer.js, minigamekit.js) en wordt gebruikt door
// de uitjes die eerst losse meldingen stuurden: snackketen, veilige huizen en evenementen (het
// reuzenrad gebruikt hetzelfde bord als de kermis). Puur + bronchecks:
//   node scripts/uitjepaneel_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { UITJES, uitjeSpec, uitjeHtml } from '../game/js/uitjepaneel.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };
const ok = (c, naam) => { n++; if (!c) { fails++; console.log('FAIL', naam); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const MG = lees('minigamekit.js');
const accenten = new Set([...MG.matchAll(/accent:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1].toLowerCase()));

// De vier uitjes uit het issue hebben elk een sfeer, een icoon, een accent uit de bestaande tabel
// en een patroon uit carrieresfeer.js; de kaart is Nederlands en gebruikt de canonieke keycaps.
for (const id of Object.keys(UITJES)) {
  t(`${id}: sfeer, icoon, accent en patroon uit de bestaande tabellen`, () => {
    const spec = uitjeSpec(id, { regel: 'Een regel voortgang', hint: '[E] meedoen' });
    assert.ok(spec, `${id}: geen sfeer`);
    assert.ok(spec.sfeer.naam && spec.sfeer.naam.length <= 34, `${id}: sfeernaam`);
    assert.ok(accenten.has(spec.accent.toLowerCase()), `${id}: accent ${spec.accent} staat in MG_THEMA`);
    assert.match(spec.icoon, /<svg class="mg-ic"/, `${id}: icoon uit minigamekit`);
    const html = uitjeHtml(spec);
    assert.match(html, new RegExp(`data-sfeer="${id}"`), `${id}: sfeer op de kaart`);
    assert.match(html, /class="uitje-vorm"/, `${id}: patroonvlak`);
    assert.match(html, /class="uitje-kicker"[\s\S]*Uitje/, `${id}: kicker "Uitje"`);
    assert.match(html, /class="uitje-titel"/, `${id}: titel`);
    assert.match(html, /class="uitje-regel"/, `${id}: één voortgangsregel`);
    assert.match(html, /class="hud-key"[^>]*>E</, `${id}: hint via .hud-key`);
    assert.doesNotMatch(html, /system-ui/, `${id}: geen eigen font`);
  });
}

t('de sfeer per uitje komt uit de bestaande tabel (naam en tint verschillen)', () => {
  const namen = Object.keys(UITJES).map((id) => uitjeSpec(id).sfeer.naam);
  assert.equal(new Set(namen).size, namen.length, 'elke kaart heeft een eigen sfeernaam');
  assert.ok(Object.keys(UITJES).includes('hoogvlieger') && Object.keys(UITJES).includes('snackketen') &&
    Object.keys(UITJES).includes('safehuis') && Object.keys(UITJES).includes('evenementen'), 'de vier uitjes van het issue');
});

// De uitjes sturen hun melding nu door dezelfde kaart.
for (const [file, id] of [['snackketen.js', 'snackketen'], ['safehuizen.js', 'safehuis'], ['evenementenlive.js', 'evenementen']]) {
  ok(lees(file).includes(`toonUitje(world, '${id}'`) || lees(file).includes(`toonUitje(w, '${id}'`), `${file}: gebruikt de gedeelde uitje-kaart (${id})`);
  ok(/from '\.\/uitjepaneel\.js'/.test(lees(file)), `${file}: importeert het paneel`);
}
const hb = lees('hudbus.js');
ok(/activiteit: \{ files: \[[^\]]*'uitjepaneel\.js'/.test(hb), 'hudbus: het paneel valt onder de activiteitensurface');

console.log(fails ? `${fails} of ${n} uitje-paneel checks failed` : `uitjepaneel_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
