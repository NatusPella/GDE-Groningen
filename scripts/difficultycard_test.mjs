// #1169: de kaart "Hoe pittig moet het zijn?" (difficultycard.js, difficultyui.js) en het tabblad Instellingen > Moeilijkheid (difficultypanel.js):
// de pure regels, de toetsen (ook die van de controller: input.js vertaalt knoppen naar dezelfde toetsen), de tekst en een nep-DOM-stroom.
//   node scripts/difficultycard_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.window = globalThis;
globalThis.navigator ??= {};
const luisteraars = [];
globalThis.addEventListener = (ev, f) => { if (ev === 'keydown') luisteraars.push(f); };
globalThis.removeEventListener = (ev, f) => { const i = luisteraars.indexOf(f); if (i >= 0) luisteraars.splice(i, 1); };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, body: null, head: null, activeElement: null };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const D = await import('../game/js/difficulty.js');
const C = await import('../game/js/difficultycard.js');
const UI = await import('../game/js/difficultyui.js');
const M = await import('../game/js/difficultypanel.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };

// --- de regels ---------------------------------------------------------------------------------------------------------------
ok(C.levelCards().map((c) => c.id).join() === 'ontspannen,standaard,uitdagend', 'drie niveaus, in vaste volgorde');
ok(C.levelCards().filter((c) => c.aanbevolen).map((c) => c.id).join() === 'standaard', 'Standaard is de aanbevolen voorselectie');
ok(C.levelCards().every((c) => c.uitleg.length > 20 && c.toets), 'elk niveau heeft een korte beschrijving en een toets');
ok(C.CARD_TEXT.titel === 'Hoe pittig moet het zijn?', 'de kaart heet "Hoe pittig moet het zijn?" (niet "Hoe wil je spelen?": die is van de keuzekaart)');
ok(!/Hoe wil je spelen/.test(JSON.stringify(C.CARD_TEXT)), 'geen naamconflict met de keuzekaart');

// het plan: wanneer vraagt het spel, en wanneer niet
ok(C.difficultyPlan().ask === true && C.difficultyPlan().level === 'standaard', 'een gewone start vraagt, met Standaard als voorselectie');
ok(C.difficultyPlan({ testmodus: true }).ask === false && C.difficultyPlan({ testmodus: true }).level === 'standaard', 'een testrun slaat de kaart over en speelt Standaard');
ok(C.difficultyPlan({ testmodus: true, vlag: 'vraag' }).ask === true, '?moeilijkheid=vraag toont de kaart ook in een testrun');
ok(C.difficultyPlan({ vlag: 'uitdagend' }).ask === false && C.difficultyPlan({ vlag: 'uitdagend' }).level === 'uitdagend', 'een niveau in de vlag zet dat niveau zonder kaart');
ok(C.difficultyPlan({ vlag: 'onzin' }).ask === true, 'een onbekende vlag verandert niets');
ok(C.needsDifficultyCard({ fresh: true, hasSave: true }) && C.needsDifficultyCard({ fresh: false, hasSave: false }) && !C.needsDifficultyCard({ fresh: false, hasSave: true }), 'de kaart komt bij een nieuw spel en de allereerste start, niet bij Doorgaan');

// de toetsen op de niveau-weergave
const L = C.levelKeyAction;
ok(L('ArrowRight', 0).focus === 1 && L('ArrowRight', 3).focus === 0 && L('ArrowLeft', 0).focus === 3, 'pijlen verplaatsen de focus en gaan rond (vier doelen: drie niveaus en Aanpassen)');
ok(L('d', 1).focus === 2 && L('a', 1).focus === 0 && L('s', 1).focus === 2 && L('w', 1).focus === 0, 'WASD doet hetzelfde');
ok(L('1').kies === 'ontspannen' && L('2').kies === 'standaard' && L('3').kies === 'uitdagend', '1, 2 en 3 kiezen meteen');
ok(L('4').aanpassen === true, '4 opent Aanpassen');
ok(L('Enter', 0).kies === 'ontspannen' && L('Enter', 2).kies === 'uitdagend' && L(' ', 1).kies === 'standaard' && L('Enter', 3).aanpassen === true, 'Enter en spatie kiezen de knop met focus');
ok(L('Escape', 0).kies === 'standaard' && L('Backspace', 2).kies === 'standaard', 'Escape en Backspace kiezen Standaard (het gewone spel)');
ok(L('Tab') === null && L('x') === null && L('F5') === null, 'Tab en andere toetsen blijven gewoon werken');

// de toetsen op de opties-weergave
const N = D.OPTION_DEFS.length;
const O = C.optionsKeyAction;
ok(O('ArrowDown', 0).focus === 1 && O('ArrowUp', 0).focus === N && O('ArrowDown', N).focus === 0, 'omhoog en omlaag verplaatsen de focus en gaan rond (de opties en Klaar)');
ok(O('ArrowRight', 2).stap === 1 && O('ArrowLeft', 2).stap === -1 && O('d', 2).stap === 1 && O('a', 2).stap === -1, 'links en rechts veranderen de waarde');
ok(O('Enter', 2).stap === 'rond' && O(' ', 2).stap === 'rond', 'Enter gaat naar de volgende waarde');
ok(O('Enter', N).klaar === true && O('ArrowRight', N) === null, 'Enter op Klaar sluit; pijlen doen daar niets');
ok(O('Escape', 3).terug === true && O('Backspace', N).terug === true, 'Escape gaat terug naar de niveaus');

// het concept (de draft)
{
  let p = { level: 'standaard', custom: {} };
  p = C.stepDraft(p, 'trafficDensity', 1);
  ok(p.custom.trafficDensity === 1.25 && C.draftValue(p, 'trafficDensity') === 1.25 && C.draftLabel(p, 'trafficDensity') === 'Drukker', 'een stap verder zet de optie');
  p = C.stepDraft(p, 'trafficDensity', 1);
  ok(p.custom.trafficDensity === 1.25, 'een stap voorbij de laatste blijft op de laatste (geen rondgaan met pijlen)');
  p = C.stepDraft(p, 'trafficDensity', 'rond');
  ok(p.custom.trafficDensity === 0.5, 'Enter gaat na de laatste stap rond');
  p = C.stepDraft({ level: 'uitdagend', custom: {} }, 'policeEscape', -1);
  ok(!('policeEscape' in p.custom) || p.custom.policeEscape === 1, 'een stap terug van de voorinstelling', p);
  ok(C.draftLevel({ level: 'standaard', custom: { income: 1.25 } }, 'uitdagend').custom.income === undefined && C.draftLevel({ level: 'standaard', custom: { income: 1.25 } }, 'standaard').custom.income === 1.25, 'een ander niveau wist de aanpassingen; hetzelfde niveau niet');
  ok(C.stepDraft({ level: 'standaard' }, 'bestaatniet', 1).level === 'standaard', 'een onbekende optie verandert niets');
}

// --- de tekst en de toets in de knop (DS3) -----------------------------------------------------------------------------------
{
  const html = UI.levelViewHtml({ level: 'standaard' });
  ok((html.match(/class="sk-keuze dk-keuze"/g) || []).length === 3, 'drie niveauknoppen');
  ok((html.match(/class="sk-toets"/g) || []).length === 3 && /aria-keyshortcuts="1"/.test(html) && /aria-keyshortcuts="3"/.test(html), 'de toets staat in de knop (toets-in-knop) en als aria-keyshortcuts');
  ok(/data-niveau="standaard"[^>]*data-voorkeur/.test(html) || /data-voorkeur[^>]*data-niveau="standaard"/.test(html) || /data-niveau="standaard" data-i="1" data-voorkeur/.test(html), 'Standaard is de voorselectie');
  ok(/Aanbevolen/.test(html) && /Hoe pittig moet het zijn\?/.test(html) && /data-aanpassen/.test(html), 'de kaart noemt de aanbeveling, de titel en Aanpassen');
  ok(/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="dk-titel"/.test(html) && /aria-describedby="dk-intro"/.test(html), 'een toegankelijke dialoog');
  ok(/Instellingen, Moeilijkheid/.test(html), 'de kaart zegt dat het later kan');
  const opt = UI.optionsViewHtml({ level: 'standaard', custom: { income: 1.25 } });
  ok(D.OPTION_DEFS.every((d) => opt.includes(`data-optie="${d.key}"`)), 'de opties-weergave toont elke optie');
  ok(/data-optie="income"[^>]*data-custom/.test(opt) && /Standaard · aangepast/.test(opt), 'een afwijkende optie en de samenvatting staan erin');
  ok(/data-klaar/.test(opt) && /Klaar, start het spel/.test(opt), 'onderaan staat Klaar');
  const alles = html + opt;
  ok(!/\b(Easy|Hard|Normal|difficulty|Save|Continue)\b/.test(alles), 'alleen Nederlands in wat de speler ziet');
  ok(!/winter|sneeuw/i.test(alles), 'altijd zomer');
}

// --- een nep-DOM voor de stroom ------------------------------------------------------------------------------------------------
function nepDom() {
  let items = [];
  let verwijderd = false;
  const el = {
    id: '', className: '', weg: false, remove() { el.weg = true; verwijderd = true; },
    set innerHTML(html) {
      items = [...html.matchAll(/<button[^>]*data-i="(\d+)"[^>]*>/g)].map((m) => {
        const tag = m[0];
        return { tag, dataset: { i: m[1], ...(/data-niveau="(\w+)"/.test(tag) ? { niveau: tag.match(/data-niveau="(\w+)"/)[1] } : {}), ...(/data-optie="(\w+)"/.test(tag) ? { optie: tag.match(/data-optie="(\w+)"/)[1] } : {}) },
          hasAttribute: (a) => tag.includes(a), focus() { document.activeElement = this; }, addEventListener() {} };
      });
      el.html = html;
    },
    get innerHTML() { return el.html || ''; },
    querySelectorAll: () => items,
    addEventListener(ev, f) { el['on' + ev] = f; },
  };
  document.createElement = () => el;
  document.body = { appendChild() {}, classList: { toggle() {}, contains: () => false, add() {}, remove() {} }, style: {} };
  document.activeElement = null;
  return {
    el, get items() { return items; }, get weg() { return verwijderd; },
    toets(key) { const e = { key, repeat: false, metaKey: false, ctrlKey: false, altKey: false, preventDefault() {}, stopPropagation() {} }; luisteraars.slice().forEach((f) => f(e)); },
    klik(item) { el.onclick({ target: { closest: () => item } }); },
  };
}
const next = () => new Promise((r) => setTimeout(r, 0));

{
  let d = nepDom();
  let b = UI.openDifficultyCard();
  ok(document.activeElement === d.items[1] && d.items[1].dataset.niveau === 'standaard', 'de focus start op Standaard');
  d.toets('Enter');
  ok(JSON.stringify(await b) === JSON.stringify({ level: 'standaard', custom: {} }) && d.weg && luisteraars.length === 0, 'Enter kiest Standaard, de kaart en de toetsluisteraar zijn weg');
  d = nepDom(); b = UI.openDifficultyCard(); d.toets('3');
  ok((await b).level === 'uitdagend', '3 kiest Uitdagend');
  d = nepDom(); b = UI.openDifficultyCard(); d.toets('ArrowLeft'); d.toets('Enter');
  ok((await b).level === 'ontspannen', 'pijl links en Enter kiest Ontspannen');
  d = nepDom(); b = UI.openDifficultyCard(); d.toets('Escape');
  ok((await b).level === 'standaard', 'Escape kiest Standaard');
  d = nepDom(); b = UI.openDifficultyCard(); d.klik(d.items[0]);
  ok((await b).level === 'ontspannen', 'een klik kiest het niveau');
  // Aanpassen: pijl rechts naar Aanpassen, Enter, dan opties veranderen en Klaar
  d = nepDom(); b = UI.openDifficultyCard();
  d.toets('4');
  ok(/dk-opties/.test(d.el.html) && d.items.length === N + 1, 'Aanpassen toont de opties en Klaar');
  ok(document.activeElement === d.items[0], 'de focus staat op de eerste optie');
  d.toets('ArrowRight'); // policeEscape: Gewoon -> Langer
  ok(/Standaard · aangepast/.test(d.el.html), 'na een wijziging staat er "aangepast"');
  d.toets('ArrowDown'); d.toets('Enter'); // policeUnits: volgende waarde
  d.toets('ArrowUp'); d.toets('ArrowUp'); // terug naar boven en rond naar Klaar
  ok(document.activeElement === d.items[N], 'omhoog vanaf de eerste optie gaat rond naar Klaar');
  d.toets('Enter');
  const r = await b;
  ok(r.level === 'standaard' && r.custom.policeEscape === 1.25 && r.custom.policeUnits === 1.25, 'Klaar levert het niveau met de eigen aanpassingen', r);
  // Escape in de opties gaat terug naar de niveaus, met de aanpassingen onthouden
  d = nepDom(); b = UI.openDifficultyCard();
  d.toets('4'); d.toets('ArrowRight'); d.toets('Escape');
  ok(/dk-knoppen/.test(d.el.html) && !/dk-opties/.test(d.el.html), 'Escape in de opties gaat terug naar de niveaus');
  ok(document.activeElement === d.items[3], 'de focus staat dan op Aanpassen');
  d.toets('3');
  const r2 = await b;
  ok(r2.level === 'uitdagend' && Object.keys(r2.custom).length === 0, 'een niveau kiezen na Terug wist de aanpassing (een niveau is een voorinstelling)', r2);
  // dubbel openen geeft dezelfde belofte
  d = nepDom(); b = UI.openDifficultyCard(); const b2 = UI.openDifficultyCard();
  ok(b === b2, 'de kaart opent maar één keer'); d.toets('Enter'); await b;
  await next();
}

// --- de hele vraag (askNewGameDifficulty) -------------------------------------------------------------------------------------
{
  D.setActiveDifficulty({ level: 'standaard' });
  let gevraagd = 0;
  const vraag = async () => { gevraagd++; return { level: 'uitdagend', custom: { income: 1.25 } }; };
  ok(await UI.askNewGameDifficulty({ plan: C.difficultyPlan(), fresh: true, open: vraag }) !== null && gevraagd === 1, 'een nieuw spel vraagt de kaart');
  ok(D.getDifficulty().level === 'uitdagend' && D.opt('income') === 1.25, 'het antwoord is de actieve moeilijkheid (en gaat zo in de eerste save)');
  D.setActiveDifficulty({ level: 'standaard' });
  gevraagd = 0;
  ok(await UI.askNewGameDifficulty({ plan: C.difficultyPlan(), fresh: false, hasSave: true, open: vraag }) === null && gevraagd === 0, 'Doorgaan met een save vraagt niets');
  ok(await UI.askNewGameDifficulty({ plan: C.difficultyPlan(), fresh: false, hasSave: false, open: vraag }) !== null && gevraagd === 1, 'de allereerste start (nog geen save) vraagt');
  D.setActiveDifficulty({ level: 'ontspannen' });
  gevraagd = 0;
  await UI.askNewGameDifficulty({ plan: C.difficultyPlan({ testmodus: true }), fresh: true, open: vraag });
  ok(gevraagd === 0 && D.getDifficulty().level === 'standaard' && !D.getDifficulty().aangepast, 'een testrun vraagt niets en speelt Standaard (testmodus/story-test/benchmark)');
  await UI.askNewGameDifficulty({ plan: C.difficultyPlan({ vlag: 'uitdagend' }), fresh: true, open: vraag });
  ok(gevraagd === 0 && D.getDifficulty().level === 'uitdagend', 'de vlag zet een niveau zonder kaart');
  D.setActiveDifficulty({ level: 'standaard' });
}

// --- de koppeling aan de start (startscreen.js) ---------------------------------------------------------------------------------
{
  const ss = read('game/js/startscreen.js');
  ok(/import \{ askNewGameDifficulty \} from '\.\/difficultyui\.js'/.test(ss) && /difficultyPlan\(\{ testmodus, vlag: FLAGS\.moeilijkheid \}\)/.test(ss), 'startscreen.js kent de kaart en het plan');
  ok((ss.match(/await chooseDifficulty\(\)/g) || []).length === 2, 'beide nieuwe-spel-paden (boot en bootsave) vragen de moeilijkheid');
  const i = ss.indexOf('await chooseDifficulty(); // #1169: de moeilijkheid van dit nieuwe spel');
  ok(i > 0 && i < ss.indexOf('if (fresh) finishFreshStart(); else startNewSlot();'), 'de vraag komt voor de eerste save en voor het begin van het spel');
  ok(/testmodus = !!\(AUTO \|\| FLAGS\.autoplay \|\| FLAGS\.menutest\)/.test(ss), 'dezelfde testvlaggen als de startkeuze');
  const lc = read('game/js/launchchoice.js');
  ok(/askLaunchChoice/.test(lc), 'de keuzekaart Alleen of Samen blijft de eerste vraag (main.js), de moeilijkheid volgt in de start');
  const dt = read('desktop/devtools.js');
  ok(/GDE_MOEILIJKHEID === 'vraag' \? 'moeilijkheid=vraag' : isTestRun && 'moeilijkheid=standaard'/.test(dt), 'devtools.js: elke testrun speelt Standaard zonder kaart');
}

// --- Instellingen > Moeilijkheid (difficultypanel.js) ---------------------------------------------------------------------------------
{
  const html = M.difficultyTabHtml();
  ok(D.OPTION_DEFS.every((d) => html.includes(`data-diffopt="${d.key}"`)), 'het tabblad toont elke optie als kiezer');
  ok(D.OPTION_GROUPS.every(([, naam]) => html.includes(`<span>${naam}</span>`)), 'met een kop per groep');
  ok(/data-setting="difficulty"/.test(html) && /data-diff-reset/.test(html), 'het niveau en "Terug naar het niveau" staan erbij');
  ok(/pas in bij de volgende missie/.test(html) && /kies je samen/.test(html) && /Nooit weg uit het verhaal/.test(html), 'uitleg: later ingaan, de Samen-regel en dat het verhaal nooit blokkeert');
  ok(/Gaat in bij de volgende start/.test(html), 'opties die later ingaan zeggen dat');
  ok(/aria-label="Politie kwijtraken: vorige"/.test(html) && /aria-label="Politie kwijtraken: volgende"/.test(html), 'elke kiezer heeft toegankelijke knoppen');
  // een kiezer bedienen zoals het pauzemenu dat doet
  D.setActiveDifficulty({ level: 'standaard' });
  const pk = { dataset: { diffopt: 'trafficDensity', options: JSON.stringify(D.optionDef('trafficDensity').stappen.map((s) => [String(s.v), s.label])) }, getAttribute: () => 'false' };
  ok(M.stepDifficultyPicker(pk, 1) && D.opt('trafficDensity') === 1.25, 'een stap voorwaarts zet de optie in de save');
  ok(!M.stepDifficultyPicker(pk, 1) && D.opt('trafficDensity') === 1.25, 'aan het einde gebeurt niets');
  ok(M.stepDifficultyPicker(pk, -1) && D.opt('trafficDensity') === 1 && !D.getDifficulty().aangepast, 'terug op de waarde van het niveau haalt "aangepast" weg');
  D.setActiveOption('income', 1.25);
  ok(M.handleDifficultyClick({ closest: (s) => (s === '[data-diff-reset]' ? {} : null) }) && !D.getDifficulty().aangepast, '"Terug naar het niveau" zet de aanpassingen terug');
  ok(!M.handleDifficultyClick({ closest: () => null }), 'een andere klik wordt niet afgehandeld');
  const pm = read('game/js/pausemenu.js');
  ok(/pk\.dataset\.diffopt\) \{ changeWithGroup\(world, \{ type: 'option'.*stepDifficultyPicker\(pk, dir\)/.test(pm) && /syncDifficultyTab\(root\)/.test(pm) && /handleDifficultyClick\(t\)/.test(pm), 'pausemenu.js bedient de kiezers, de reset en de weergave');
  ok(/data-goto-sub="settings:moeilijkheid"/.test(pm), 'Instellingen > Spelregels verwijst naar het tabblad');
}

// #1227: de hulpregel zegt wat Esc doet: Standaard kiezen (de kaart heeft geen stap terug)
{
  const esc = C.CARD_TEXT.hulp.find((h) => /ESC/.test(h));
  ok(/Standaard/.test(esc) && !/starten/.test(C.CARD_TEXT.hulp.join(' ')), 'Esc op de moeilijkheidskaart heet Standaard kiezen', esc);
  ok(C.levelKeyAction("Escape").kies === "standaard", 'en doet dat ook');
}

console.log(fails ? `${fails}/${n} FAIL` : `difficultycard_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
