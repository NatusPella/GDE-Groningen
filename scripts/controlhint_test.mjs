// #824: de compacte, altijd zichtbare bedieningsregel tijdens een missie (de eierrit is een
// gewone missie met een voertuigstap). De regel is puur te berekenen; de HUD zet hem in de
// bestaande doellijn (zone G), dus hij maakt geen eigen vak en kan de rest niet overlappen.
//   node scripts/controlhint_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { controlHint, hintActive, hintContext, hintText, HINT_MAX_GROUPS, HINT_TOKENS } from '../game/js/controlhint.js';

const ROOT = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };

const missie = (extra = {}) => ({ mission: { phase: 'active' }, ...extra });
const voetganger = { character: 'anita', inVehicle: null };

t('zonder missie, bijbaan of achtervolging is er geen regel', () => {
  assert.equal(hintActive(null), false);
  assert.equal(hintActive({}), false);
  assert.equal(hintActive({ mission: { phase: 'idle' } }), false);
  assert.equal(controlHint({}), null);
  assert.equal(controlHint(null), null);
  assert.equal(hintText(null), '');
});

t('tijdens een missie, bijbaan of achtervolging is er wel een regel', () => {
  assert.equal(hintActive(missie()), true);
  assert.equal(hintActive({ sideJob: { active: true } }), true);
  assert.equal(hintActive({ wanted: 2 }), true);
  for (const w of [missie(), { sideJob: { active: true } }, { wanted: 1 }]) assert.ok(controlHint(w, voetganger), JSON.stringify(w));
});

t('de context volgt het voertuig: lopen, auto/trekker, boot, vliegtuig, heli', () => {
  const gevallen = [
    [null, 'foot'], [{ isBoat: true }, 'boat'], [{ isPlane: true }, 'plane'], [{ isHeli: true }, 'heli'], [{ isTractor: true }, 'vehicle'], [undefined, 'foot'],
  ];
  for (const [v, verwacht] of gevallen) {
    const speler = { inVehicle: v };
    assert.equal(hintContext(speler), verwacht, `${verwacht}`);
    const hint = controlHint(missie(), speler);
    assert.ok(hint && hint.context === verwacht, `${verwacht}: hint`);
  }
});

t('de regel is compact: hooguit vier toetsgroepen, korte werkwoorden en alleen bekende toetsen', () => {
  for (const v of [null, { isBoat: true }, { isPlane: true }, { isHeli: true }, { isTractor: true }]) {
    const hint = controlHint(missie(), { inVehicle: v });
    assert.ok(hint.groepen.length >= 2 && hint.groepen.length <= HINT_MAX_GROUPS, `${hint.context}: ${hint.groepen.length} groepen`);
    for (const g of hint.groepen) {
      assert.ok(g.keys.length > 0 && g.keys.every((k) => HINT_TOKENS.includes(k)), `${hint.context}: toetsen ${g.keys.join('/')}`);
      assert.ok(g.werk && g.werk.split(/\s+/).length <= 3, `${hint.context}: "${g.werk}" is kort`);
    }
    const tekst = hintText(hint);
    assert.ok(tekst.length <= 80, `${hint.context}: ${tekst.length} tekens: ${tekst}`);
    assert.ok(tekst.split(/\s+/).length <= 14, `${hint.context}: ${tekst.split(/\s+/).length} woorden`);
  }
});

t('de eierrit is een missie met een voertuigstap: de rijregel komt daar ook', () => {
  // De missie "Heel aankomen is ook een kunst" is een gewone missie met een voertuigstap.
  const sleep = controlHint(missie(), { inVehicle: { isTractor: true } });
  assert.equal(sleep.context, 'vehicle');
  assert.match(hintText(sleep), /gas en rem/);
  assert.match(hintText(sleep), /sturen/);
  assert.ok(sleep.groepen.some((g) => g.werk === 'uitstappen'), 'uitstappen staat erbij');
});

t('de HUD zet de regel in de bestaande doellijn, zonder eigen vak of absolute positie', () => {
  const hud = lees('game/js/hud_panel.js');
  assert.match(hud, /<div class="hud-obj-text">.*hud-obj-keys.*<\/div>/s, 'de regel zit in de doellijn (zone G)');
  assert.match(hud, /objKeys: mission\.querySelector\('\.hud-obj-keys'\)/, 'de HUD heeft een verwijzing naar de regel');
  assert.match(hud, /updateObjectiveKeys\(world, o\.kind\)/, 'de doellijn werkt de regel bij');
  assert.match(hud, /kind === 'mission' \|\| kind === 'job' \|\| kind === 'police'/, 'alleen bij missie, bijbaan of achtervolging');
  assert.match(hud, /physicalKey\(getSettings\(\)\.keyBinds/, 'de toetsen volgen de toetsenbordbinding');
  const css = lees('game/js/hud_panel.css');
  const blok = /#hud \.hud-obj-keys \{([^}]*)\}/.exec(css);
  assert.ok(blok, 'de CSS voor de regel bestaat');
  assert.doesNotMatch(blok[1], /position:\s*absolute/, 'de regel is geen eigen vak op het scherm');
  assert.match(blok[1], /flex-wrap:\s*wrap/, 'hij wrapt binnen de doellijn');
  assert.match(blok[1], /font-size:\s*var\(--hud-min, 13px\)/, 'hij houdt de leesbare 13 px-vloer');
  assert.match(css, /#hud \.hud-obj-key \.hud-key \{/, 'de toetskappen zijn compacter binnen de regel');
});

console.log(bad ? `controlhint_test: ${n - bad}/${n} ok` : `controlhint_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
