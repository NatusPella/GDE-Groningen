// Controller in het spel (22-11): de audit van alle spelacties, het acties-wiel en de documenten. Zonder Electron, met een nepbrowser en een
// nep-controller (zoals gamepad_live_test.mjs). Elke bekende uitzondering staat met reden in controller_ingame_audit.mjs.
//   node scripts/controller_ingame_test.mjs
let fails = 0, checks = 0;
const ok = (c, name, extra) => { checks++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// --- een nepbrowser, net genoeg voor gamepad.js, input.js en settings.js; geen echte opslag
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
class ClassList { constructor() { this.s = new Set(); } add(c) { this.s.add(c); } remove(c) { this.s.delete(c); } toggle(c, on) { (on === undefined ? !this.s.has(c) : on) ? this.s.add(c) : this.s.delete(c); } contains(c) { return this.s.has(c); } }
const el = () => ({ classList: new ClassList(), dataset: {}, querySelector: () => null, querySelectorAll: () => [], appendChild() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
class KeyboardEvent extends Event { constructor(type, init = {}) { super(type, init); Object.assign(this, { key: init.key, code: init.code, repeat: !!init.repeat }); } }
const win = new EventTarget();
globalThis.KeyboardEvent = KeyboardEvent;
globalThis.window = win;
globalThis.document = Object.assign(new EventTarget(), { documentElement: el(), body: el(), activeElement: null, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, pointerLockElement: null });
let rafCb = null;
globalThis.requestAnimationFrame = (f) => { rafCb = f; return 1; };
const pads = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads, userAgent: 'node' } });

const audit = await import('./controller_ingame_audit.mjs');
const doc = await import('./controller_ingame_doc.mjs');
const C = await import('../game/js/controls.js');
const W = await import('../game/js/actionradial.js');
const { Input } = await import('../game/js/input.js');
const { initGamepad } = await import('../game/js/gamepad.js');
const { setSetting } = await import('../game/js/settings.js');
const { radialHtml } = await import('../game/js/actionradialui.js');

// ---- 1. de audit ----
const r = audit.rapport();
ok(r.gaten.length === 0, 'elke actie heeft een plek op het pad (of een uitzondering met reden)', r.gaten.slice(0, 5));
ok(JSON.stringify(r.botsingen.map((b) => b.sleutel).sort()) === JSON.stringify(Object.keys(audit.BOTSINGEN).sort()), 'de botsende toetsen zijn precies de bekende', r.botsingen);
ok(r.dubbelen.every((d) => d.bekend), 'elke dubbele knop is een bewuste alias met reden', r.dubbelen.filter((d) => !d.bekend));
ok(r.toetsenZonderInventaris.length === 0, 'elke toets van het toetsenbord staat in de inventaris', r.toetsenZonderInventaris);
ok(r.glyphs.length === 0, 'elke actie krijgt in elke situatie een glyph op elk apparaat', r.glyphs.slice(0, 5));
// tekst met {B} noemt de D-pad zelf (controller: D-pad omhoog, coopnet.js); {U} is de geluidsknop, die bewust geen padknop heeft
const KENDE_TOKENS = { B: 'coopnet.js noemt de D-pad omhoog in dezelfde zin', U: 'geluid aan of uit staat in Instellingen (audit ZONDER_PAD.geluid)' };
ok(r.tokensZonderPad.every((t) => Object.hasOwn(KENDE_TOKENS, t.token)), 'elke toets in de speltekst heeft ergens een padplek', r.tokensZonderPad);
for (const [id, u] of Object.entries(audit.ZONDER_PAD)) {
  ok(u.reden && u.reden.length > 40, `uitzondering ${id} heeft een onderbouwing`);
  ok(audit.inventaris().some((x) => x.actie === id && !x.plek), `uitzondering ${id} is nog nodig (anders weghalen)`);
}
// Samen spelen: wat PAD_COOP afpakt komt terug op een knop, een alias of het wiel; behalve de bekende
const NIET_TERUG = new Set(['vehicle:rs', 'bus:rs', 'vehicleManual:rs']);
for (const v of r.verdringing) ok(v.terug || NIET_TERUG.has(`${v.ctx}:${v.slot}`), `Samen spelen: ${v.ctx} ${v.slot} (${v.was}) komt terug`, v);
ok(r.verdringing.some((v) => NIET_TERUG.has(`${v.ctx}:${v.slot}`)), 'de bekende uitzondering (achterom wijkt voor de spelerslijst) bestaat nog');
ok(r.acties >= 60 && r.situaties === 11, 'de inventaris is volledig (acties, situaties)', [r.acties, r.situaties]);

// ---- 2. het wiel: de lijst per situatie ----
const direct = (ctx, key, samen) => {
  const co = (samen && C.PAD_COOP[ctx]) || {};
  return C.PAD_BUTTONS.some((s) => (Object.hasOwn(co, s) ? co[s] : C.PAD_MAPS[ctx][s]) === key);
};
for (const ctx of C.WHEEL_CTX) for (const samen of [false, true]) for (const tap of [false, true]) {
  const pages = C.wheelItemsFor(ctx, { samen, tap });
  ok(pages.length > 0, `${ctx}: het wiel heeft onderdelen`, { samen, tap });
  for (const p of pages) {
    ok(p.items.length >= 1 && p.items.length <= 10, `${ctx}/${p.id}: een pagina heeft 1 tot 10 onderdelen`, p.items.length);
    for (const it of p.items) {
      ok(it.tapOnly || it.shift || !direct(ctx, it.key, samen), `${ctx}: ${it.id} staat niet dubbel (heeft al een eigen knop)`);
      ok(!it.samen || samen, `${ctx}: ${it.id} (Samen spelen) staat niet in een gewoon spel`);
    }
    const sleutels = p.items.map((it) => (it.shift ? 's+' : '') + it.key);
    ok(new Set(sleutels).size === sleutels.length, `${ctx}/${p.id}: geen twee onderdelen met dezelfde toets`, sleutels);
  }
}
ok(C.wheelItemsFor('menu').length === 0 && C.wheelItemsFor('minigame').length === 0 && C.wheelItemsFor('klokken').length === 0, 'in de menus en minigames is er geen wiel');
ok(C.wheelItemsFor('foot', { tap: true })[0].items[0].id === 'kaart' && !C.wheelItemsFor('foot')[0].items.some((i) => i.id === 'kaart'), 'de kaart staat alleen in het wiel van de tikstand');
ok(C.padSlotFor('6', 'foot') === null && C.padWheelFor('6', 'foot').id === 'kleren', 'toets 6 heeft geen knop maar staat in het wiel');
ok(C.padSlotFor('N', 'foot') === 'up' && C.padWheelFor('N', 'vehicle').id === 'radio', 'de radio: knop te voet, wiel in de auto');
ok(C.padWheelFor('G', 'bus').id === 'busdienst', 'de busdienst (G) staat in het wiel van de bus (was onbereikbaar)');
ok(C.wheelItemsFor('foot', { samen: true }).flatMap((p) => p.items).some((i) => i.id === 'radio'), 'Samen spelen: de radio (D-pad omhoog is dan bij de groep) staat in het wiel te voet');
ok(C.PAD_COOP.hengelen && C.PAD_COOP.hengelen.left === '7' && !C.PAD_COOP.hengelen.x, 'aan de waterkant zijn de roepjes er ook in een sessie en X blijft hengelen');

// ---- 3. de stand en de keuze (actionradial.js) ----
const sent = [];
W.setRadialRunner((it) => sent.push(it.id));
ok(W.openRadial('foot') && W.radialIsOpen(), 'het wiel opent te voet');
ok(W.openRadial('menu') === false, 'openen in het menu kan niet');
let m = W.radialModel();
const n0 = m.items.length;
ok(m.sel === -1 && n0 >= 4 && m.pages === 2, 'een nieuw wiel heeft nog geen keuze', [m.sel, n0, m.pages]);
ok(W.radialChoose() === null && W.radialIsOpen(), 'A zonder keuze doet niets en laat het wiel open');
ok(W.radialAim(0, -1) === 0, 'stick omhoog kiest het eerste onderdeel');
ok(W.radialAim(1, 0) === Math.round(n0 / 4) % n0, 'stick rechts kiest een kwart rond', W.radialModel().sel);
const sel = W.radialModel().sel;
ok(W.radialAim(0.1, 0.1) === sel, 'binnen de dode zone verandert er niets');
W.radialAim(0, -1);
ok(W.radialStep('left') === n0 - 1 && W.radialStep('right') === 0, 'de D-pad loopt rond');
ok(W.radialPage(1) === 1 && W.radialModel().sel === -1 && W.radialPage(1) === 0, 'LB en RB bladeren rond en wissen de keuze');
W.radialStep('down');
const gekozen = W.radialChoose();
ok(gekozen && !W.radialIsOpen() && sent.length === 1 && sent[0] === gekozen.id, 'A kiest, sluit het wiel en voert uit', [gekozen, sent]);
ok(JSON.stringify(W.itemKeys({ key: 'n', shift: true })) === JSON.stringify({ down: ['shift', 'n'], up: ['n', 'shift'] }), 'Shift + N: Shift eerst in en laatst uit');
ok(radialHtml({ open: true, title: 'Spelen', items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], sel: 1, page: 0, pages: 2 }).split('data-pw=').length === 4, 'de tekening heeft een knop per onderdeel');
ok(/pw-sel/.test(radialHtml({ open: true, title: 'x', items: [{ label: 'A' }, { label: 'B' }], sel: 1, page: 0, pages: 1 })), 'het gekozen onderdeel heeft de focusring');
W.setRadialRunner(null);

// ---- 4. gamepad.js met een nep-controller: lange druk, tik, kiezen, sluiten ----
const input = new Input(win);
const world = { player: { inVehicle: null }, coop: false };
const hooks = { open: false };
initGamepad(input, world, { menuOpen: () => hooks.open, phoneOpen: () => false, pauseOpen: () => false, mapOpen: () => false });
const seen = [];
win.addEventListener('keydown', (e) => seen.push(['down', String(e.key).toLowerCase()]));
win.addEventListener('keyup', (e) => seen.push(['up', String(e.key).toLowerCase()]));
let now = 1000;
let threw = null;
const frame = (n = 1) => { for (let i = 0; i < n; i++) { now += 16; try { rafCb(now); } catch (e) { threw = threw || e; } } };
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: C.PAD_BUTTONS.map(() => ({ pressed: false, value: 0 })) };
pads[0] = pad;
const press = (slot, on = true) => { const b = pad.buttons[C.PAD_BUTTONS.indexOf(slot)]; b.pressed = on; b.value = on ? 1 : 0; };
const rust = () => { for (const s of C.PAD_BUTTONS) press(s, false); pad.axes = [0, 0, 0, 0]; frame(2); seen.length = 0; };
const heeft = (t, k) => seen.some((e) => e[0] === t && e[1] === k);
document.body.classList.add('game-started');
frame(2);
press('down'); frame(2); press('down', false); frame(2);
rust();

// een tik: de kaart, bij het loslaten
press('view'); frame(5); press('view', false); frame(2);
ok(heeft('down', 'm') && heeft('up', 'm') && !W.radialIsOpen(), 'een tik op Overzicht is de kaart en opent geen wiel', seen);
rust();
// lang houden: het wiel
press('view'); frame(Math.ceil(C.WHEEL_HOLD_MS / 16) + 3);
ok(W.radialIsOpen(), 'Overzicht ingedrukt houden opent het wiel');
press('view', false); frame(2);
ok(W.radialIsOpen() && !heeft('down', 'm'), 'loslaten laat het wiel open en stuurt de kaart niet', seen);
// terwijl het wiel open staat gaat niets naar het spel
seen.length = 0;
press('a'); frame(2); press('a', false); frame(2);
ok(!heeft('down', ' ') && input.padKeys.size === 0, 'A in het wiel springt niet');
pad.axes = [0, -1, 0, 0]; frame(3);
ok(input.padAxis[0] === 0 && input.padAxis[1] === 0 && W.radialModel().sel === 0, 'de stick kiest in het wiel en loopt niet');
pad.axes = [0, 0, 0, 0]; frame(2);
// B sluit zonder Escape
press('b'); frame(2); press('b', false); frame(2);
ok(!W.radialIsOpen() && !heeft('down', 'escape'), 'B sluit het wiel zonder het pauzemenu te openen', seen);
// kiezen: Volgende zender is Shift + N
rust();
press('view'); frame(Math.ceil(C.WHEEL_HOLD_MS / 16) + 3); press('view', false); frame(2);
const namen = W.radialModel().items.map((i) => i.id);
const gaNaar = namen.indexOf('zender');
ok(gaNaar >= 0, 'te voet staat Volgende zender in het wiel', namen);
for (let i = 0; i <= gaNaar; i++) { press('right'); frame(2); press('right', false); frame(2); }
seen.length = 0;
press('a'); frame(2); press('a', false);
ok(heeft('down', 'shift') && heeft('down', 'n') && !W.radialIsOpen(), 'A op Volgende zender stuurt Shift + N en sluit het wiel', seen);
frame(8);
ok(heeft('up', 'n') && heeft('up', 'shift') && input.padKeys.size === 0, 'Shift en N komen daarna los', seen);
ok(threw === null, 'de pollronde gaat niet stuk', threw && String(threw));

// de situatie verandert terwijl het wiel open staat: het sluit; in een voertuig is de radio er wel
rust();
world.player.inVehicle = { speed: 0 };
press('view'); frame(Math.ceil(C.WHEEL_HOLD_MS / 16) + 3); press('view', false); frame(2);
ok(W.radialIsOpen() && W.radialModel().items.some((i) => i.id === 'radio'), 'in een auto staat de radio in het wiel');
world.player.inVehicle = null; frame(3);
ok(!W.radialIsOpen(), 'het wiel sluit als de situatie verandert (uitstappen)');
rust();
// in het menu opent Overzicht geen wiel
hooks.open = true; frame(2);
press('view'); frame(Math.ceil(C.WHEEL_HOLD_MS / 16) + 3); press('view', false); frame(2);
ok(!W.radialIsOpen(), 'in een menu opent Overzicht het wiel niet');
hooks.open = false; rust();
// de tikstand: een tik opent het wiel, de kaart staat erin
setSetting('tikStand', 'rennen');
press('view'); frame(2); press('view', false); frame(2);
ok(W.radialIsOpen() && W.radialModel().items[0].id === 'kaart' && !heeft('down', 'm'), 'met de tikstand opent een tik het wiel met de kaart vooraan', seen);
press('view'); frame(2); press('view', false); frame(2);
ok(!W.radialIsOpen(), 'Overzicht nog eens sluit het wiel');
setSetting('tikStand', 'uit');
rust();
// een Samen-spelen-sessie: de radio staat te voet in het wiel en D-pad omhoog is bij de groep
world.coopNet = { role: 'host' };
press('view'); frame(Math.ceil(C.WHEEL_HOLD_MS / 16) + 3); press('view', false); frame(2);
ok(W.radialIsOpen() && W.radialModel().items.some((i) => i.id === 'radio'), 'Samen spelen: de radio staat te voet in het wiel');
press('start'); frame(2); press('start', false); frame(2);
ok(!W.radialIsOpen() && !heeft('down', 'escape'), 'Menu sluit het wiel zonder het pauzemenu te openen', seen);
delete world.coopNet;

// ---- 5. de documenten kloppen met de bron ----
const x = doc.alles();
const { readFileSync } = await import('node:fs');
ok(readFileSync(doc.MD_PAD, 'utf8') === x.md, 'docs/CONTROLLER-INDELING-22-11.md klopt met de bron (node scripts/controller_ingame_doc.mjs --schrijf)');
ok(readFileSync(doc.HTML_PAD, 'utf8') === x.html, 'docs/CONTROLLER-CHEATSHEET-22-11.html klopt met de bron');
ok(!/<script|https?:/i.test(x.html), 'de cheatsheet heeft geen scripts en geen externe verwijzingen');
ok(x.html.split('<section class="kaart">').length === 12, 'de cheatsheet heeft een kaart per situatie (11)');

if (fails) { console.log(`controller_ingame_test: ${fails} van ${checks} mislukt`); process.exit(1); }
console.log(`controller_ingame_test: ${checks}/${checks} ok`);
process.exit(0);
