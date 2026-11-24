// Uitleg met iconen en animatie (game/js/uitleg.js, uitlegdata.js, #989): het component-model, de varianten uit de echte keymap,
// de woordgrens per stap, geen ruwe toetsen, de CSS (13 px, geen hex, uit bij verminderde beweging), de instelling en de 'niet meer tonen'-vlag.
//   node scripts/uitleg_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as U from '../game/js/uitleg.js';
import { UITLEG_DATA, HINT_UITLEG, ANIMATIES, MAX_WOORDEN } from '../game/js/uitlegdata.js';
import { HINTS } from '../game/js/hintkit.js';
import { iconBekend } from '../game/js/icons.js';
import { KEYS } from '../game/js/storagekeys.js';
import { UITLEG as KART } from '../game/js/kartstatus.js';
import { UITLEG as HENGEL } from '../game/js/hengelstatus.js';
import { UITLEG as SKATE } from '../game/js/skatestatus.js';
import { UITLEG as ZWEM } from '../game/js/zwemstatus.js';
import { UITLEG as KLIM } from '../game/js/klimstatus.js';
import { UITLEG as KRANT } from '../game/js/krantenstatus.js';
import { UITLEG as BEZORG } from '../game/js/bezorgstatus.js';
import { UITLEG as RONDVAART } from '../game/js/rondvaartstatus.js';
import { UITLEG as PADEL } from '../game/js/padelstatus.js';
import { UITLEG as DISC } from '../game/js/discgolfstatus.js';
import { UITLEG as REUS } from '../game/js/reuzenradstatus.js';
import { UITLEG as BOTS } from '../game/js/kermisstatus.js';
import { UITLEG as PITCH } from '../game/js/pitchstatus.js';
import { UITLEG as WANDEL } from '../game/js/wandelstatus.js';
import { UITLEG as TAXI } from '../game/js/taxistatus.js';
import { UITLEG as BUS } from '../game/js/busstatus.js';
import { simHudHtml, modelSleutel } from '../game/js/simhud.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// ---- de data: 2 tot 4 stappen, tekst hooguit acht woorden, bekende animatie en icoon, geen ruwe toets in de tekst
const alle = { ...UITLEG_DATA };
for (const [k, v] of Object.entries(HINT_UITLEG)) if (typeof v !== 'string') alle['hint:' + k] = v;
for (const [id, def] of Object.entries(alle)) {
  ok(def.stappen.length >= 2 && def.stappen.length <= 4, `${id}: 2 tot 4 stappen`, String(def.stappen.length));
  for (const s of def.stappen) {
    ok(U.woordenTelling(s.tekst) <= MAX_WOORDEN && s.tekst.length > 0, `${id}: stap hooguit ${MAX_WOORDEN} woorden`, s.tekst);
    ok(ANIMATIES.includes(s.animatie), `${id}: bekende animatie`, s.animatie);
    ok(!!s.toets !== !!s.icoon, `${id}: een stap heeft een toets of een icoon, niet beide`, s.tekst);
    if (s.icoon) ok(iconBekend(s.icoon), `${id}: icoon bestaat in iconmap`, s.icoon);
    // de kaart-uitleg (21-11, rijen) zet zijn toetsen als {TOKEN} in de zin; het toetsplaatje komt uit keycap.js
    ok((id === 'kaart-actie' || !/\{[A-Z0-9]+\}/.test(s.tekst)) && !/\b(druk|houd|tik) (op )?[A-Z]\b/.test(s.tekst), `${id}: geen ruwe toets in de tekst`, s.tekst);
  }
}
ok(Object.values(HINT_UITLEG).every((v) => typeof v !== 'string' || UITLEG_DATA[v]), 'elke verwijzing van een hint bestaat');
ok(Object.keys(HINT_UITLEG).every((id) => HINTS.some((h) => h.id === id)), 'elke uitleg hoort bij een echte hint');

// ---- de light sims: hun eigen lijstje { icoon, tekst } wordt het model, ook zonder eigen animatie
const sims = { KART, HENGEL, SKATE, ZWEM, KLIM, KRANT, BEZORG, RONDVAART, PADEL, DISC, REUS, BOTS, PITCH, WANDEL, TAXI, BUS };
for (const [id, lijst] of Object.entries(sims)) {
  const m = U.uitlegModel(lijst, { id: id.toLowerCase() });
  ok(m && m.stappen.length >= 2 && m.stappen.length <= 4, `sim ${id}: 2 tot 4 stappen`);
  for (const s of m.stappen) {
    ok(s.woorden <= MAX_WOORDEN + 2, `sim ${id}: korte regel`, s.tekst);
    ok(ANIMATIES.includes(s.animatie), `sim ${id}: animatie`, s.animatie);
  }
  ok(lijst.every((s) => !/\b(met|druk|houd) [A-Z]\b(?!\w)/.test(s.tekst)), `sim ${id}: geen ruwe toets ('met W')`, JSON.stringify(lijst.filter((s) => /\b(met|druk|houd) [A-Z]\b/.test(s.tekst))));
}

// ---- stapmodel: een token in de tekst wordt het grote beeld; de tekst blijft zonder token
{
  const s = U.stapModel({ icoon: 'vis', tekst: '{SPATIE}: gooi uit' });
  ok(s.tekst === 'gooi uit' && s.animatie === 'druk', 'tekst zonder token, animatie druk', JSON.stringify(s));
  ok(s.toetsen.length === 1 && s.toetsen[0] === 'SPATIE', 'een stap met icoon en token houdt de toets (geen verdwenen toets, beeldronde 21-11)', JSON.stringify(s.toetsen));
  ok(U.stapModel({ icoon: 'doel', tekst: 'Houd {SPATIE}, laat los bij het streepje' }).tekst === 'Houd, laat los bij het streepje', 'geen losse spatie voor de komma na het weghalen van het token');
  ok(/data-gk="SPATIE"/.test(U.uitlegHtml(U.uitlegModel([{ icoon: 'vis', tekst: 'Houd {SPATIE}, laat los bij het streepje' }]))), 'de penalty-regel "Houd {SPATIE}" toont het toetsplaatje');
  const k = U.stapModel({ icoon: 'vis', tekst: 'Houd {A} en {D} allebei vast' });
  ok(k.animatie === 'houd', 'houd leidt tot de houd-animatie');
  ok(U.stapModel({ icoon: 'doel', tekst: 'Wacht op het dobbertje' }).animatie === 'vul', 'wachten is een vullende balk');
  ok(U.stapModel({ icoon: 'doel', tekst: 'Kijk rond met de muis' }).animatie === 'stick', 'muis is stick');
  ok(U.stapModel({ icoon: 'onbekendicoon', tekst: 'x' }).icoon === null, 'een onbekend icoon valt weg');
  ok(U.uitlegModel([], {}) === null && U.uitlegModel(null) === null, 'lege uitleg is geen model');
  ok(U.uitlegModel(Array.from({ length: 7 }, () => ({ icoon: 'vis', tekst: 'a' }))).stappen.length === 4, 'meer dan vier stappen worden afgekapt');
}

// ---- varianten uit de echte keymap: de herbinding en de controllerknop
{
  const m = U.uitlegModel({ stappen: [{ toets: 'E', tekst: 'Gebruiken' }, { toets: 'WASD', tekst: 'Lopen' }], controller: 'foot' }, { binds: {} });
  ok(m.stappen[0].varianten[0].toetsenbord === 'E' && m.stappen[0].varianten[0].controller !== '', 'E: toets en controllerknop', JSON.stringify(m.stappen[0].varianten));
  ok(m.stappen[1].varianten[0].controller === 'lstick', 'WASD is op een controller de linkerstick', JSON.stringify(m.stappen[1].varianten));
  const her = U.uitlegModel({ stappen: [{ toets: 'E', tekst: 'Gebruiken' }, { toets: 'H', tekst: 'Toeteren' }] }, { binds: { e: 'f' } });
  ok(her.stappen[0].varianten[0].toetsenbord === 'F', 'een herbonden toets toont de nieuwe toets', JSON.stringify(her.stappen[0].varianten));
}

// ---- de markup
{
  const html = U.uitlegHtml(U.uitlegModel({ id: 'x', titel: 'Rijden', stappen: UITLEG_DATA['basis-rijden'].stappen, meer: 'Meer {Q} tekst' }), { nietMeer: true });
  ok(/class="ds-uitleg"/.test(html) && (html.match(/ds-uitleg__stap/g) || []).length === 4, 'vier stappen in de markup');
  ok(/data-gk="WASD"/.test(html) && /data-anim="houd"/.test(html), 'toetsplaatje met data-gk en een animatie');
  ok(/<details class="ds-uitleg__meer"><summary>Meer uitleg/.test(html) && /data-gk="Q"/.test(html), "'Meer uitleg' met een toetsplaatje in de details");
  ok(/data-uitleg-niet-meer="x"/.test(html), "knop 'Niet meer tonen'");
  ok(/role="group" aria-label="Rijden: stap 1/.test(html), 'schermlezer: een samenvatting in aria-label');
  ok(!/\{[A-Z0-9]+\}/.test(html), 'geen ruwe {TOKEN} in de uitvoer');
  ok(U.uitlegHtml(null) === '', 'geen model, geen markup');
  const sim = simHudHtml({ id: 'kart', titel: 'Kartbaan', uitleg: KART, nu: 'Start', hulp: 'x' });
  ok(/ds-uitleg__stap/.test(sim) && !/sh-uitleg/.test(sim), 'de light sim toont de uitleg als component');
}

// ---- opslag: 'niet meer tonen' per uitleg
{
  ok(KEYS.uitlegNietMeer === 'gde-uitleg-niet-meer', 'sleutel gde-*');
  ok(U.parseNietMeer('kapot').size === 0 && U.parseNietMeer('{"a":1}').size === 0 && U.parseNietMeer('["a",3,"b"]').size === 2, 'parseNietMeer is tolerant');
  const opslag = new Map();
  globalThis.localStorage = { getItem: (k) => (opslag.has(k) ? opslag.get(k) : null), setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };
  ok(!U.uitlegNietMeer('basis-lopen'), 'eerst niet weggeklikt');
  U.zetUitlegNietMeer('basis-lopen');
  ok(U.uitlegNietMeer('basis-lopen') && !U.uitlegNietMeer('basis-kaart'), 'alleen deze uitleg is weg');
  ok(U.uitlegBlok('basis-lopen', { nietMeer: true }) === '' && U.uitlegBlok('basis-lopen') !== '', 'weggeklikt is leeg, maar zonder nietMeer-vlag blijft het component bruikbaar');
  U.resetUitlegNietMeer();
  ok(!U.uitlegNietMeer('basis-lopen'), 'opnieuw tonen wist de vlaggen');
  ok(!opslag.has('gde-save-v1') && !opslag.has('gde-settings') && !opslag.has('gde-prestaties-v1'), 'schrijft nooit naar savegame of instellingen');
  delete globalThis.localStorage;
}

// ---- instelling: standaard aan, en uit = leeg component (de oude tekst blijft)
{
  const { getSettings, setSetting } = await import('../game/js/settings.js');
  ok(getSettings().uitlegIconen === true, 'Uitleg met iconen staat standaard aan');
  ok(U.uitlegBlok('basis-lopen') !== '', 'aan: er is markup');
  setSetting('uitlegIconen', false);
  ok(U.uitlegBlok('basis-lopen') === '' && !U.uitlegIconenAan(), 'uit: geen markup, de aanroeper valt terug op tekst');
  setSetting('uitlegIconen', true);
}

// ---- review 21-11: de strook van een light sim tekent opnieuw na een wissel van Uitleg met iconen of een herbonden toets
{
  const { setSetting } = await import('../game/js/settings.js');
  const m = { id: 'kart', titel: 'Kartbaan', uitleg: KART, nu: 'Start' };
  const a = modelSleutel(m);
  ok(a === modelSleutel(m), 'zelfde model en instellingen: dezelfde sleutel (geen hertekening per beeld)');
  setSetting('uitlegIconen', false);
  const b = modelSleutel(m);
  ok(a !== b, 'Uitleg met iconen uit: nieuwe sleutel');
  setSetting('uitlegIconen', true);
  setSetting('keyBinds', { jump: 'KeyB' });
  ok(modelSleutel(m) !== a, 'een herbonden toets: nieuwe sleutel');
  setSetting('keyBinds', {});
  ok(modelSleutel({ id: 'x', titel: 'Zonder uitleg' }) === modelSleutel({ id: 'x', titel: 'Zonder uitleg' }), 'zonder uitleg geen extra werk');
}

// ---- CSS: 13 px, geen hex, alleen tokens, uit bij verminderde beweging, lus van hooguit 1 s
{
  const css = fs.readFileSync(path.join(ROOT, 'game/js/ds-components.css'), 'utf8');
  // alleen het uitleg-blok: tot het volgende kopje (de blokken erna gebruiken andere maten, per eigen test)
  const kaal = css.slice(css.indexOf('/* ---- Uitleg met iconen en animatie'));
  const blok = kaal.slice(0, kaal.indexOf('/* ---- Gedeelde set van het club')).replace(/\/\*[\s\S]*?\*\//g, '');
  ok(blok.length > 500, 'het uitleg-blok staat in ds-components.css');
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(blok) && !/rgba?\(/.test(blok), 'geen hex of rgb: alleen tokens');
  const maten = [...blok.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1]);
  ok(maten.every((m) => /max\((13|15)px|var\(--ds-t-(label|hulp)\)/.test(m)), 'tekst nooit onder 13 px', maten.join(' | '));
  // de rijen-uitleg (21-11): tekst, nummer en uitklapper op 15 px of meer, geen vaste px-maat voor een toets
  const rij = blok.slice(blok.indexOf('.ds-uitleg--rij .ds-uitleg__lijst'));
  ok(/\.ds-uitleg--rij \.ds-uitleg__tekst \{[^}]*font-size: max\(15px/.test(rij) && /\.ds-uitleg:not\(\.ds-uitleg--compact\) \.ds-uitleg__meer \{ font-size: max\(15px/.test(rij), 'de rijen-uitleg en Meer uitleg staan op 15 px of meer');
  ok(/subgrid/.test(rij), 'de rijen delen één kolomindeling (subgrid): icoon en tekst staan onder elkaar op dezelfde plek');
  ok(!/\.hud-key[^{]*\{[^}]*(width|height|font-size):\s*\d+px/.test(rij), 'geen vaste px-maat voor toetsen in de rijen-uitleg');
  ok(/prefers-reduced-motion[^}]*\.ds-uitleg/.test(blok) && /html\.reduce-motion \.ds-uitleg/.test(blok) && /html\.rustig-drukwerk \.ds-uitleg/.test(blok), 'uit bij verminderde beweging en Rustig drukwerk');
  // de ronde is vier keer --ds-m-max (1 s, en 0 bij Beweging beperken); het designsysteem kent geen lus: de animatie speelt drie keer en stopt
  const duur = [...blok.matchAll(/animation:\s*ds-uitleg-\w+\s+calc\(var\(--ds-m-max\) \* (\d+)\)[^;]*? (\d+);/g)].map((m) => [Number(m[1]), Number(m[2])]);
  ok(duur.length >= 6 && duur.every(([k, n]) => k <= 4 && n === 3), 'elke ronde is hooguit vier keer --ds-m-max (1 s) en speelt drie keer', JSON.stringify(duur));
  ok(!/animation:[^;]*(infinite|forwards|both)/.test(blok), 'geen eindeloze lus en geen eindstand');
}

// #1212: de leestekst van een stap zegt "linkermuisknop" en nooit het Engelse "LMB" (alle uitleggen, ook de kaartuitleg)
{
  ok(U.leesTekst('{LMB} Klik een plek') === 'linkermuisknop Klik een plek', 'LMB heet in de leestekst linkermuisknop');
  ok(U.leesTekst('{M} of {ESC} sluit') === 'M of ESC sluit', 'andere toetsen houden hun naam');
  for (const [id, d] of Object.entries(UITLEG_DATA)) {
    const m = U.uitlegModel({ id, ...d }, {});
    ok(!/\b(LMB|RMB|MMB)\b/.test(m.alt), `${id}: de leestekst heeft geen LMB, RMB of MMB`, m.alt);
  }
}

console.log(`uitleg_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
