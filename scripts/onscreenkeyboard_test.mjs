// Het schermtoetsenbord voor een controllerspeler (#1011, #495): model, tekening, inventaris van alle tekstvelden en de bedrading met een
// nagebootste pagina (geen Electron, geen browser).   node scripts/onscreenkeyboard_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, `${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------------------------------------------------------------- de pagina nabootsen
const venster = [];
const stuur = (items, ev) => { for (const l of [...items]) { if (ev.stopped) break; l.fn(ev); } };
const mkEvent = (type, extra = {}) => ({ type, stopped: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra });
const docLuist = { focusin: [], focusout: [], click: [], keydown: [] };
const klassen = (arr) => Object.assign(arr, { contains: (k) => arr.includes(k), add: (k) => { if (!arr.includes(k)) arr.push(k); }, remove: (k) => { const i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); }, toggle() {} });
const document_ = {
  activeElement: null,
  body: { appendChild(e) { e.isConnected = true; document_.overlay = e; }, classList: klassen([]) },
  documentElement: { classList: klassen([]), dataset: {}, style: { setProperty() {} } },
  addEventListener(t, fn) { (docLuist[t] ||= []).push({ fn }); },
  removeEventListener(t, fn) { const l = docLuist[t] || []; const i = l.findIndex((x) => x.fn === fn); if (i >= 0) l.splice(i, 1); },
  querySelectorAll: () => [],
  createElement() {
    const o = { isConnected: false, id: '', className: '', _luist: {}, _html: '', firstElementChild: null, children: [],
      addEventListener(t, fn) { (this._luist[t] ||= []).push(fn); }, removeEventListener(t, fn) { this._luist[t] = (this._luist[t] || []).filter((f) => f !== fn); },
      remove() { this.isConnected = false; document_.overlay = null; }, contains(e) { return e === this || e === this.firstElementChild; }, matches: () => false, dispatchEvent(ev) { (this._luist[ev.type] || []).forEach((f) => f(ev)); return true; },
      get innerHTML() { return this._html; },
      set innerHTML(h) { this._html = h; this.firstElementChild = { querySelector: () => null, focus() { document_.activeElement = this; }, matches: () => false }; this.draws = (this.draws || 0) + 1; } };
    return o;
  },
};
globalThis.document = document_;
globalThis.window = { addEventListener: (t, fn) => venster.push({ t, fn }), removeEventListener: (t, fn) => { const i = venster.findIndex((x) => x.t === t && x.fn === fn); if (i >= 0) venster.splice(i, 1); }, innerWidth: 1280, innerHeight: 720 };
globalThis.CustomEvent = class { constructor(t) { this.type = t; } };
globalThis.Event = class { constructor(t, o = {}) { this.type = t; Object.assign(this, o); } };
globalThis.CSS = { escape: (s) => s };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { readText: async () => 'KAMER-7K' } }, configurable: true });

const sendWin = (type, extra) => { const ev = mkEvent(type, extra); stuur(venster.filter((x) => x.t === type), ev); return ev; };
function mkVeld(dataset = {}, o = {}) {
  const v = {
    tagName: 'INPUT', type: 'text', value: '', maxLength: -1, required: false, disabled: false, readOnly: false, isConnected: true, dataset, events: [],
    classList: klassen(['coop-profiel-naam']), selectionStart: 0, selectionEnd: 0, ...o,
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; }, getAttribute: () => null, closest: () => null,
    dispatchEvent(ev) { this.events.push(ev.type); return true; },
    focus() { document_.activeElement = this; const ev = mkEvent('focusin', { target: this }); stuur(docLuist.focusin, ev); },
  };
  return v;
}

const M = await import('../game/js/oskmodel.js');
const V = await import('../game/js/oskview.js');
const { schoonNaam } = await import('../game/js/net/serverlijst.js');
const { profielNaam, ONLINE_NAAM_MAX } = await import('../game/js/lobby.js');
const { PAD_MAPS } = await import('../game/js/controls.js');
const { noteDevice, resetDevice } = await import('../game/js/inputdevice.js');
const { buttonsWithoutGlyph, looseHintBesideButton } = await import('../game/js/dsbutton.js');

// ---------------------------------------------------------------- inventaris: elk tekstveld heeft data-osk
const WEG = /(^|\/)(node_modules|sfx)\//;
function loop(dir, uit = []) {
  for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${f.name}`;
    if (f.isDirectory()) { if (!WEG.test(rel + '/') && !/world|fonts|audio|assets/.test(f.name)) loop(rel, uit); } else if (/\.(js|html)$/.test(f.name)) uit.push(rel);
  }
  return uit;
}
const bestanden = [...loop('game/js'), 'game/index.html'];
const GEEN_TEKST = new Set(['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'hidden', 'number']);
const velden = [];
for (const f of bestanden) {
  const s = lees(f);
  for (const m of s.matchAll(/<(input|textarea)\b([^>]*)>/g)) {
    const attrs = m[2];
    const tp = /\btype="([^"]*)"/.exec(attrs);
    const soort = m[1] === 'textarea' ? 'textarea' : tp ? tp[1] : 'text';
    if (GEEN_TEKST.has(soort)) continue;
    velden.push({ f, soort, osk: /\bdata-osk="/.test(attrs), attrs: attrs.slice(0, 60) });
  }
}
ok(velden.length >= 11, 'de inventaris vindt de tekstvelden', String(velden.length));
for (const v of velden) ok(v.osk, `tekstveld heeft data-osk: ${v.f} (${v.attrs})`);
const kinds = new Set(velden.map((v) => (/data-osk="([^"]*)"/.exec(lees(v.f).split(v.attrs)[1] ? '' : '') || [])[1]).filter(Boolean));
void kinds;
// elke waarde van data-osk is een bekend type (of een sjabloonexpressie met een bekende terugval)
for (const f of bestanden.filter((x) => !/onscreenkeyboard\.js$/.test(x))) for (const m of lees(f).matchAll(/data-osk="([^"$]+)"/g)) ok(M.OSK_KINDS.includes(m[1]), `data-osk="${m[1]}" is een bekend type`, f);
ok(/data-osk="\$\{esc\(v\.input\.osk \|\| 'tekst'\)\}"/.test(lees('game/js/lobbyui.js')), 'het kamercode- en sessienaamveld krijgen hun type uit lobby.js');
ok((lees('game/js/lobby.js').match(/input: \{ osk: '(code|naam)'/g) || []).length === 3, 'alle drie de invoervelden van de lobby dragen een type');
// de velden zonder tekst: een alternatief
ok(/type = 'file'|createElement\('input'\)/.test(lees('game/js/saveslotsui.js')), 'bestandskiezer (import) bestaat: geen tekstveld, het systeemvenster kiest het bestand');
ok(/data-osk-open/.test(lees('game/js/oskview.js')), 'de knop Toetsenbord staat in de sjablonen');
for (const f of ['game/js/lobbyui.js', 'game/js/onlineconsentui.js', 'game/js/coopspelersui.js', 'game/js/saveslotsui.js', 'game/js/pausemenu.js', 'game/js/mapview.js', 'game/js/tuningworkshopui.js']) ok(/oskKnop\(/.test(lees(f)), `${f} zet de knop Toetsenbord naast zijn veld`);

// ---------------------------------------------------------------- het raster
function sleutels(st) { const g = M.buildGrid(st); const l = []; g.forEach((row, r) => row.forEach((k, c) => l.push([r, c, k]))); return l; }
function bereikbaar(st) {
  const alle = sleutels(st);
  const slecht = [];
  for (const [r0, c0] of alle) {
    const gezien = new Set([`${r0},${c0}`]); const rij = [[r0, c0]];
    while (rij.length) { const [r, c] = rij.pop(); for (const nb of M.buren(st, r, c)) if (!gezien.has(nb)) { gezien.add(nb); rij.push(nb.split(',').map(Number)); } }
    if (gezien.size !== alle.length) slecht.push(`${r0},${c0}:${gezien.size}/${alle.length}`);
  }
  return slecht;
}
const rand0 = () => 0;
for (const kind of M.OSK_KINDS) {
  for (const layerId of ['letters', 'cijfers', 'accent']) for (const shift of ['off', 'once', 'lock']) for (const chips of [null, M.defaultChips('naam')]) {
    const st = { ...M.createState({ kind, chips, rand: rand0 }), layer: layerId, shift };
    const slecht = bereikbaar(st);
    ok(slecht.length === 0, `elke toets is bereikbaar vanuit elke plek (${kind}/${layerId}/${shift}/${chips ? 'chips' : 'zonder'})`, slecht.slice(0, 3).join(' '));
    for (const [r, c] of sleutels(st)) {
      const nb = M.buren(st, r, c);
      const rijLen = M.buildGrid(st)[r].length;
      ok(rijLen === 1 || nb[1] !== `${r},${c}`, `geen dood eind rechts (${kind}/${layerId} ${r},${c})`);
    }
  }
}
// elke plek is vanuit het midden van de rij ook met omhoog en omlaag te bereiken (de breedte telt mee)
{
  const st = M.createState({ kind: 'naam' });
  let s = M.focusAt(st, 0, 0); const rijen = M.buildGrid(s).length;
  const gezien = new Set();
  for (let i = 0; i < rijen * 2; i++) { gezien.add(s.r); s = M.moveFocus(s, 'down'); }
  ok(gezien.size === rijen, 'omlaag loopt langs alle rijen en rond');
  const links = M.moveFocus(M.focusAt(st, 0, 0), 'left');
  eq([links.r, links.c], [0, M.buildGrid(st)[0].length - 1], 'links van de eerste toets is de laatste');
}

// ---------------------------------------------------------------- invoer
{
  let st = M.createState({ kind: 'naam', max: ONLINE_NAAM_MAX });
  eq(st.shift, 'once', 'een naam begint met een hoofdletter');
  const typ = (s, ch) => M.pressKey(s, { t: 'char', ch, w: 1 });
  st = typ(st, 'W'); st = typ(st, 'a'); st = typ(st, 'd');
  eq(st.value, 'Wad', 'letters typen');
  eq(st.shift, 'off', 'na de eerste letter staan de kleine letters weer aan');
  st = M.backspace(st); eq(st.value, 'Wa', 'Wis haalt een teken weg');
  st = M.cursor(st, -1); st = typ(st, 'x'); eq([st.value, st.caret], ['Wxa', 2], 'de cursor staat tussen de tekens');
  st = M.cursor(st, -9); eq(st.caret, 0, 'de cursor blijft binnen de tekst');
  st = M.cursor(M.createState({ kind: 'naam', value: 'abc' }), 9); eq(st.caret, 3, 'de cursor stopt aan het eind');
  // lengte
  let lang = M.createState({ kind: 'naam', max: 4, value: 'abcd' });
  lang = typ(lang, 'e'); eq(lang.value, 'abcd', 'boven het maximum komt er niets bij');
  ok(/4 tekens/.test(lang.message), 'en de melding zegt het maximum', lang.message);
  eq(M.createState({ kind: 'tekst', max: 3, value: 'abcdef' }).value, 'abc', 'een te lange beginwaarde wordt afgekapt');
  eq(M.insertText(M.createState({ kind: 'tekst', max: 5 }), 'abcdefgh').value, 'abcde', 'plakken wordt afgekapt op het maximum');
  eq(M.status(lang).teller, '4/4', 'de tekenteller');
  // toegestane tekens
  let nm = M.createState({ kind: 'naam' });
  nm = M.insertText(nm, 'A<b>'); eq(nm.value, 'Ab', 'een naam laat < en > niet toe');
  ok(nm.message.includes('kan hier niet'), 'met een nette melding');
  nm = M.pressKey(M.createState({ kind: 'naam' }), { t: 'char', ch: '@', uit: true }); eq(nm.value, '', 'een gedimde toets typt niets');
  ok(M.buildGrid({ ...M.createState({ kind: 'naam' }), layer: 'cijfers' }).flat().some((k) => k.t === 'char' && k.ch === '@' && k.uit), 'de @ is bij een naam gedimd');
  ok(!M.buildGrid({ ...M.createState({ kind: 'tekst' }), layer: 'cijfers' }).flat().some((k) => k.uit), 'bij gewone tekst is niets gedimd');
  // hoofdletters en lagen
  let sh = M.createState({ kind: 'tekst', value: 'x' });
  eq(sh.shift, 'off', 'met tekst erin begint het met kleine letters');
  sh = M.wisselShift(sh); eq(sh.shift, 'once', 'Y: één hoofdletter'); sh = M.wisselShift(sh); eq(sh.shift, 'lock', 'Y nog eens: vast'); sh = M.wisselShift(sh); eq(sh.shift, 'off', 'en weer uit');
  ok(M.buildGrid({ ...sh, shift: 'lock' }).flat().filter((k) => k.t === 'char').every((k) => k.ch === k.ch.toLocaleUpperCase('nl-NL') || k.ch === 'ß'), 'vaste hoofdletters');
  let lg = M.createState({ kind: 'tekst' });
  eq(M.shiftLayer(lg, 1).layer, 'cijfers', 'RT: naar cijfers en leestekens'); eq(M.shiftLayer(M.shiftLayer(lg, 1), 1).layer, 'accent', 'RT nog eens: accenten'); eq(M.shiftLayer(lg, -1).layer, 'accent', 'LT: terug rond');
  ok(M.buildGrid({ ...lg, layer: 'cijfers' }).flat().some((k) => k.ch === '7'), 'de cijferlaag heeft cijfers');
  const acc = M.buildGrid({ ...lg, layer: 'accent', shift: 'lock' }).flat().filter((k) => k.t === 'char').map((k) => k.ch).join('');
  ok(acc.includes('É') && acc.includes('ß') && !acc.includes('SS'), 'accenten in hoofdletters, ß blijft ß');
  ok(['ë', 'ï', 'ö', 'ñ', 'ç'].every((c) => M.buildGrid({ ...lg, layer: 'accent', shift: 'off' }).flat().some((k) => k.ch === c)), 'de accentlaag heeft de gebruikelijke tekens');
  // code
  let cd = M.createState({ kind: 'code', max: 64 });
  eq(cd.shift, 'lock', 'een code begint met hoofdletters');
  const prefix = M.focusKey({ ...cd, r: M.buildGrid(cd).length - 2, c: 1 });
  eq(prefix.t, 'prefix', 'de code-indeling heeft een toets voor GDE2-');
  cd = M.pressKey(cd, prefix); eq(cd.value, 'GDE2-', 'GDE2- komt vooraan'); cd = M.pressKey(cd, prefix); eq(cd.value, 'GDE2-', 'maar niet dubbel');
  cd = typ(cd, 'K'); cd = typ(cd, '3'); eq(cd.value, 'GDE2-K3', 'een code typen');
  eq(M.insertText(M.createState({ kind: 'code' }), 'ab c!').value, 'abc', 'een code laat spaties en uitroeptekens weg');
  // cijfers
  const ci = M.createState({ kind: 'cijfers', max: 4 });
  eq(M.buildGrid(ci).flat().filter((k) => k.t === 'char').length, 10, 'het cijferpad heeft tien cijfers');
  eq(M.insertText(ci, '12a4').value, '124', 'alleen cijfers');
  // wachtwoord
  let pw = M.createState({ kind: 'wachtwoord', max: 32, value: 'geheim' });
  eq(M.displayText(pw), '••••••', 'een wachtwoord toont bolletjes');
  const toon = M.buildGrid(pw).flat().find((k) => k.t === 'toon'); ok(!!toon, 'er is een toets Toon');
  pw = M.pressKey(pw, toon); eq(M.displayText(pw), 'geheim', 'Toon laat het wachtwoord zien'); eq(M.pressKey(pw, M.buildGrid(pw).flat().find((k) => k.t === 'toon')).reveal, false, 'Verberg verbergt het weer');
  ok(!M.buildGrid(M.createState({ kind: 'naam' })).flat().some((k) => k.t === 'toon'), 'een naam heeft geen Toon');
  eq(M.insertText(M.createState({ kind: 'wachtwoord' }), 'a<b>é ').value, 'a<b>é ', 'een wachtwoord laat alle printbare tekens toe');
  // zoek
  const zk = M.createState({ kind: 'zoek', value: 'fie' });
  eq(M.buildGrid(zk).flat().find((k) => k.t === 'ok').label, 'Zoek', 'bij een zoekveld heet bevestigen Zoek');
  eq(M.buildGrid(M.createState({ kind: 'naam' })).flat().find((k) => k.t === 'ok').label, 'Klaar', 'anders Klaar');
}

// ---------------------------------------------------------------- controle, bevestigen en annuleren
{
  const verboden = [...'pmurt'].reverse().join('');
  const sessie = (t) => schoonNaam(t);
  let st = M.createState({ kind: 'naam', max: 24, check: sessie, value: 'Zomer in Grunn' });
  eq(M.status(st).ok, true, 'een nette sessienaam mag');
  const slecht = M.setValue(st, verboden);
  eq(M.status(slecht).ok, false, 'de woordenlijst keurt een echte persoonsnaam af');
  ok(M.status(slecht).reason.length > 10, 'met een nette reden', M.status(slecht).reason);
  const b = M.bevestig(slecht); eq(b.klaar, null, 'bevestigen sluit niet bij een afgekeurde naam'); ok(b.message === M.status(slecht).reason, 'maar zegt waarom');
  const goed = M.bevestig(st); eq(goed.klaar, 'ok', 'bevestigen met een geldige naam sluit');
  const on = M.createState({ kind: 'naam', check: (t) => profielNaam(t) });
  eq(M.status(M.setValue(on, 'Tammo')).ok, false, 'een online naam mag geen verhaalnaam zijn (profielNaam)');
  const verplicht = M.createState({ kind: 'naam', leegMag: false });
  eq(M.bevestig(verplicht).klaar, null, 'een verplicht veld kan niet leeg bevestigd worden');
  const an = M.annuleer(M.setValue(M.createState({ kind: 'naam', value: 'Oud' }), 'Nieuw'));
  eq([an.klaar, an.value], ['annuleer', 'Oud'], 'annuleren geeft de oude waarde terug');
  eq(M.pressKey(M.createState({ kind: 'tekst', value: 'Oud' }), { t: 'annuleer' }).value, 'Oud', 'de toets Annuleren doet hetzelfde');
}

// ---------------------------------------------------------------- suggesties
{
  for (const nm of M.BIJNAMEN) { ok(schoonNaam(nm).ok && profielNaam(nm).ok, `bijnaam "${nm}" is toegestaan`); ok([...nm].length <= ONLINE_NAAM_MAX, `bijnaam "${nm}" past in een online naam`); }
  for (const nm of M.SESSIENAMEN) ok(schoonNaam(nm).ok && [...nm].length <= 24, `sessienaam "${nm}" is toegestaan en past`);
  ok(new Set(M.BIJNAMEN).size === M.BIJNAMEN.length, 'geen dubbele bijnamen');
  ok(M.BIJNAMEN.every((nm) => !/\b(tammo|tessa|anita)\b/i.test(nm)), 'geen verhaalnamen onder de bijnamen');
  eq(M.saveNameSuggestion(new Date(2026, 10, 22)), 'Spel van 22 nov', 'voorgestelde opslagnaam');
  const nmChips = M.defaultChips('naam');
  eq(nmChips.length, 5, 'een naamveld heeft vier namen en Willekeurig'); eq(nmChips[4].act, 'willekeurig', 'en Willekeurig is de laatste');
  eq(M.defaultChips('naam', { sessie: true }).every((c) => c.tekst && !c.act), true, 'een sessienaam heeft alleen vaste namen');
  let st = M.createState({ kind: 'naam', max: 16, rand: () => 0.5 });
  const kies = M.pickChip(st, nmChips[1]); eq(kies.value, nmChips[1].tekst, 'A op een chip vult de naam');
  const rnd = M.pickChip(st, nmChips[4]); ok(M.BIJNAMEN.includes(rnd.value), 'Willekeurig kiest uit de eigen lijst');
  const rnd2 = M.pickChip(M.createState({ kind: 'naam', max: 16, rand: () => 0.5, value: M.BIJNAMEN[12] }), nmChips[4]); ok(rnd2.value !== M.BIJNAMEN[12], 'nooit twee keer dezelfde achter elkaar');
  const cc = M.defaultChips('code', { recent: ['A1', 'B2', 'C3', 'D4'] });
  eq(cc.map((c) => c.label), ['Plakken', 'A1', 'B2', 'C3'], 'een code: Plakken en de laatste drie');
  const ccSt = M.createState({ kind: 'code', chips: cc }); eq(M.pressKey(ccSt, M.buildGrid(ccSt)[0][0]).vraag, 'plakken', 'Plakken vraagt de aanroeper om het klembord');
  eq(M.createState({ kind: 'zoek', chips: [{ label: 'fiets', tekst: 'fiets' }] }).r, 1, 'het toetsenbord begint onder de chips');
  const opslag = M.pickChip(M.createState({ kind: 'tekst', max: 28 }), { label: 'x', tekst: M.saveNameSuggestion(new Date(2026, 10, 22)) }); eq(opslag.value, 'Spel van 22 nov', 'een voorgestelde opslagnaam past');
}

// ---------------------------------------------------------------- toetsen van het pad
{
  const st = M.createState({ kind: 'tekst', chips: null });
  const toets = { arrowright: 1, arrowleft: 1, arrowup: 1, arrowdown: 1, enter: 1, backspace: 1, ' ': 1, shift: 1, pageup: 1, pagedown: 1, '[': 1, ']': 1, f10: 1, escape: 1 };
  for (const k of Object.keys(toets)) ok(M.handleKey(st, k) !== null, `de toets ${JSON.stringify(k)} wordt begrepen`);
  eq(M.handleKey(st, 'q'), null, 'een gewone letter hoort niet bij het pad');
  const map = PAD_MAPS.osk;
  ok(!!map, 'controls.js heeft een indeling osk');
  for (const [slot, key] of Object.entries(map)) { if (slot === 'stick' || key == null) continue; ok(M.handleKey(st, key) !== null, `knop ${slot} (${key}) doet iets op het toetsenbord`); }
  eq([map.a, map.b, map.x, map.y, map.lb, map.rb, map.lt, map.rt, map.start, map.view], ['enter', 'backspace', ' ', 'shift', 'pageup', 'pagedown', '[', ']', 'f10', 'escape'], 'A typt, B wist, X spatie, Y hoofdletter, LB en RB cursor, LT en RT laag, Start klaar, Overzicht annuleert');
  const klaar = M.handleKey(M.createState({ kind: 'tekst', value: 'x' }), 'f10'); eq(klaar.klaar, 'ok', 'Start bevestigt');
  const uit = M.handleKey(M.createState({ kind: 'tekst', value: 'x' }), 'escape'); eq(uit.klaar, 'annuleer', 'Overzicht annuleert');
  const a = M.handleKey(M.focusAt(M.createState({ kind: 'tekst' }), 0, 0), 'enter'); eq(a.value, 'Q'.toLowerCase() === 'q' ? 'Q' : '', 'A typt de toets onder de focus (hoofdletter aan het begin van een naam)');
}
{
  const g = (kind) => M.buildGrid(M.createState({ kind }));
  const gamepadSrc = lees('game/js/gamepad.js');
  ok(/classList\.contains\('osk-open'\)\) return 'osk'/.test(gamepadSrc), 'gamepad.js kiest de indeling osk zolang het toetsenbord open staat');
  ok(/const menuLike = \(c = ctx\) => c === 'menu' \|\| c === 'osk'/.test(gamepadSrc), 'en behandelt hem als menu (herhaling, stick als pijlen)');
  ok(g('naam').length >= 5, 'een tekstindeling heeft rijen');
}

// ---------------------------------------------------------------- de tekening
{
  const st = M.createState({ kind: 'naam', value: 'Wadl', max: 16, label: 'Online naam', chips: M.defaultChips('naam') });
  const h = V.renderOsk(st);
  ok(/role="dialog"[^>]*aria-modal="true"/.test(h) && /aria-label="Schermtoetsenbord: Online naam"/.test(h), 'de kaart is een modale dialoog met een naam');
  ok(/data-pad-ctx="osk"/.test(h), 'de knoppen volgen de indeling osk');
  ok(/aria-activedescendant="osk-k-1-0"/.test(h) && /id="osk-k-1-0"/.test(h), 'de focus is aria-activedescendant op de toets onder de focus');
  ok(h.includes('4/16'), 'de tekenteller staat erin');
  ok(h.includes('osk-cursor'), 'het live voorbeeld heeft een cursor');
  eq(buttonsWithoutGlyph(h), [], 'elke knop met een toets heeft zijn glyph in de knop (toets-in-de-knop)');
  eq(looseHintBesideButton(h), 0, 'geen losse toetshint naast een knop');
  ok(['F10', 'BACKSPACE', 'SPACE', 'SHIFT', 'ESC'].every((t) => new RegExp('data-gk="' + t + '"').test(h)), 'Klaar, Wis, Spatie, Hoofdletter en Annuleren dragen hun controllerknop');
  ok(!/<button[^>]*tabindex="0"/.test(h), 'de toetsen staan niet in de tabvolgorde (de kaart houdt de focus)');
  const pw = V.renderOsk(M.createState({ kind: 'wachtwoord', value: 'abc' }));
  ok(pw.includes('•••') && !/>abc</.test(pw.split('osk-voorbeeld')[1].split('osk-melding')[0]), 'een wachtwoord staat als bolletjes in het voorbeeld');
  const fout = V.renderOsk(M.setValue(M.createState({ kind: 'naam', check: schoonNaam }), [...'pmurt'].reverse().join('')));
  ok(/osk-melding is-fout/.test(fout), 'een afgekeurde invoer krijgt een zichtbare melding');
  ok(/class="osk-knop [^"]*" data-osk-open aria-label="Toetsenbord voor online naam"/.test(V.oskKnop('online naam')), 'de knop Toetsenbord heeft een naam');
  const css = lees('game/js/ds-osk.css');
  ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(css.replace(/\/\*[^]*?\*\//g, '')), 'ds-osk.css gebruikt alleen tokens, geen losse kleuren');
  ok(/reduce-motion/.test(css) && /prefers-reduced-motion/.test(css), 'Minder beweging wordt gerespecteerd');
  ok(/\.osk-knop\.ds-z-knop \{/.test(css) && !/^\.osk-open/m.test(css) && !/\.osk-open \{ display/.test(css), 'de knop heet osk-knop: de staatsklasse osk-open op <html> verbergt nooit de pagina');
  ok(/ds-osk\.css/.test(lees('game/index.html')), 'index.html laadt ds-osk.css');
}

// ---------------------------------------------------------------- de bedrading
{
  const K = await import('../game/js/onscreenkeyboard.js');
  const fresh = () => { K._resetOsk(); venster.length = 0; for (const k of Object.keys(docLuist)) docLuist[k].length = 0; document_.activeElement = null; resetDevice('pad', document_); K.initOnscreenKeyboard(); };
  const pad = (key, extra = {}) => sendWin('keydown', { key, __gde: 'pad', target: document_.activeElement, ...extra });
  fresh();
  const field = mkVeld({ osk: 'naam', oskCheck: 'sessie-naam' }, { value: '', maxLength: 24 });
  field.focus();
  ok(K._oskState() !== null, 'focus op een veld terwijl het pad het laatst gebruikt is opent het toetsenbord');
  ok(document_.documentElement.classList.contains('osk-open'), 'html krijgt osk-open (gamepad.js schakelt naar de indeling osk)');
  ok(document_.overlay && /Schermtoetsenbord: /.test(document_.overlay.innerHTML), 'de kaart staat in de pagina');
  eq(K._oskState().kind, 'naam', 'het type komt van data-osk');
  eq(K._oskState().max, 24, 'het maximum komt van maxlength');
  ok(typeof K._oskState().check === 'function', 'de controle komt van data-osk-check');
  // de eerste toets na de chips is de q; A typt hem (met een hoofdletter: het begin van een naam)
  pad('enter'); eq(K._oskState().value, 'Q', 'A typt de toets onder de focus');
  eq(field.value, 'Q', 'het veld volgt de invoer live');
  ok(field.events.includes('input'), 'met een input-gebeurtenis (de rest van het scherm leest zo mee)');
  pad('backspace'); eq(K._oskState().value, '', 'B wist'); eq(field.value, '', 'ook in het veld');
  pad(' '); eq(K._oskState().value, ' ', 'X typt een spatie'); pad('backspace');
  pad('arrowup'); pad('enter'); // omhoog naar de chips: een sessienaam
  ok(M.SESSIENAMEN.includes(K._oskState().value), 'A op een chip vult de naam', K._oskState().value);
  const ev = pad('f10');
  ok(ev.stopped && ev.defaultPrevented, 'een toets van het pad gaat niet door naar de rest van het spel');
  ok(K._oskState() === null, 'Start bevestigt en sluit');
  ok(!document_.documentElement.classList.contains('osk-open'), 'osk-open gaat weer weg');
  ok(document_.activeElement === field, 'de focus keert terug naar het veld');
  ok(field.events.includes('change'), 'het veld kreeg een change-gebeurtenis');
  ok(M.SESSIENAMEN.includes(field.value), 'het veld heeft de gekozen naam', field.value);
  // de focus terug op het veld opent hem niet meteen weer; A erop wel
  const voor = field.value;
  pad('enter'); ok(K._oskState() !== null, 'A op het veld opent het toetsenbord opnieuw');
  pad('arrowdown'); pad('enter'); ok(field.value !== voor, 'de invoer volgt live');
  pad('escape');
  ok(K._oskState() === null && field.value === voor, 'annuleren (Overzicht) geeft de oude waarde terug', field.value);
  ok(document_.activeElement === field, 'ook na annuleren keert de focus terug');
  // een pijl van het pad vlak voor de focus (doorlopen met het D-pad) opent niets; A erop wel
  const zoek = mkVeld({ osk: 'zoek' });
  pad('arrowdown'); zoek.focus();
  ok(K._oskState() === null, 'focus vlak na een pijl van het pad (doorlopen) opent niets');
  pad('enter'); ok(K._oskState() !== null, '... maar A erop wel');
  // een echte toets van het toetsenbord klapt hem in en laat de tekst staan
  const echt = sendWin('keydown', { key: 'a', isTrusted: true, target: document_.activeElement });
  ok(K._oskState() === null, 'een echte toets van het toetsenbord sluit het schermtoetsenbord');
  ok(!echt.defaultPrevented, 'en wordt niet ingeslikt');
  // een wissel van apparaat sluit hem ook; met toetsenbord of muis opent focus niets
  zoek.focus(); pad('enter'); ok(K._oskState() !== null, 'weer open');
  noteDevice('kb');
  ok(K._oskState() === null, 'een wissel naar toetsenbord of muis sluit hem');
  const derde = mkVeld({ osk: 'tekst' }); derde.focus();
  ok(K._oskState() === null, 'met toetsenbord of muis opent focus niets');
  // een veld zonder data-osk, een uitgeschakeld en een alleen-lezen veld
  fresh();
  const kaal = mkVeld({}); kaal.focus(); ok(K._oskState() === null, 'een veld zonder data-osk krijgt niets');
  const uit = mkVeld({ osk: 'naam' }, { disabled: true }); uit.focus(); ok(K._oskState() === null, 'een uitgeschakeld veld krijgt niets');
  const card = mkVeld({ osk: 'naam' }, { type: 'checkbox' }); card.focus(); ok(K._oskState() === null, 'een selectievakje is geen tekstveld');
  // het scherm wordt opnieuw getekend terwijl het toetsenbord open staat: het nieuwe veld krijgt de tekst
  fresh();
  const a1 = mkVeld({ osk: 'naam' }, { value: 'Oud' }); a1.focus();
  eq(K._oskState().value, 'Oud', 'de beginwaarde komt uit het veld');
  eq(K._oskState().caret, 3, 'de cursor staat achter de tekst');
  pad('enter'); eq(a1.value, 'Oudq', 'een letter komt achter de tekst (kleine letter: er staat al iets)');
  K.closeOsk('keep');
  ok(K._oskState() === null, 'closeOsk sluit');
}
{
  // wachtwoord en code: eigen indelingen; recente invoer en klembord
  const K = await import('../game/js/onscreenkeyboard.js');
  K._resetOsk(); venster.length = 0; for (const k of Object.keys(docLuist)) docLuist[k].length = 0; document_.activeElement = null;
  resetDevice('pad', document_); K.initOnscreenKeyboard();
  K.noteRecent('code', 'GDE2-84.12.34.56:41000-K3J9D8F2-A1B2'); K.noteRecent('code', '84.12.34.56'); K.noteRecent('code', 'ABC12');
  eq(K.recentVan('code'), ['ABC12'], 'een directe code (met IP-adres) komt nooit in Recent (constitutie 10)');
  for (const c of ['a', 'b', 'c', 'd']) K.noteRecent('zoek', c);
  eq(K.recentVan('zoek'), ['d', 'c', 'b'], 'Recent houdt de laatste drie');
  const code = mkVeld({ osk: 'code' }, { value: '', maxLength: 64 });
  code.focus();
  const st = K._oskState();
  ok(st && st.kind === 'code' && st.shift === 'lock', 'een code opent met de code-indeling en hoofdletters');
  eq(M.buildGrid(st)[0].map((k) => k.label), ['Plakken', 'ABC12'], 'de chips: Plakken en de recente code');
  const pad = (key) => sendWin('keydown', { key, __gde: 'pad', target: document_.activeElement });
  pad('arrowup'); pad('enter'); // de eerste chip: Plakken
  await new Promise((r) => setTimeout(r, 20));
  eq(code.value, 'KAMER-7K', 'Plakken zet het klembord in het veld');
  K._resetOsk();
  const ww = mkVeld({ osk: 'wachtwoord' }, { type: 'password', maxLength: 32, value: 'abc' });
  resetDevice('pad', document_); K.initOnscreenKeyboard(); ww.focus();
  const ws = K._oskState();
  ok(ws && ws.kind === 'wachtwoord', 'een wachtwoordveld opent met de wachtwoord-indeling');
  ok(!/>abc</.test(document_.overlay.innerHTML.split('osk-voorbeeld')[1].split('osk-melding')[0]), 'het voorbeeld toont geen leesbaar wachtwoord');
  eq(ww.value, 'abc', 'het veld zelf houdt de echte tekst');
  K._resetOsk();
}

// ---------------------------------------------------------------- bestanden en tellingen
ok(!fs.existsSync(path.join(ROOT, 'game/js/padkeyboard.js')), 'het oude, kale schermtoetsenbord is vervangen (padkeyboard.js is weg)');
const dnaam = lees('game/js/oskmodel.js') + lees('game/js/onscreenkeyboard.js') + lees('game/js/oskview.js');
ok(!/\bcoop\b/i.test(dnaam.replace(/Samen spelen/g, '')), 'nieuwe code zegt multiplayer, geen coop');

console.log(fails ? `onscreenkeyboard_test: ${fails} van ${n} mislukt` : `onscreenkeyboard_test: ok (${n})`);
process.exit(fails ? 1 : 0);
