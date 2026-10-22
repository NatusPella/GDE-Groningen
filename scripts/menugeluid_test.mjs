// De navigatiegeluiden van het hoofdmenu in alle menu's (#413): de regels van sfx/menunav.js (welke toets, klik of focus welk geluid geeft en
// wanneer het stil blijft: nooit twee geluiden voor één handeling, ook niet bij muis-hover of de controller) en de koppeling in de menu's.
//   node scripts/menugeluid_test.mjs      (puur: geen DOM, geen audio)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOTS, ITEMS, BACKS, GAP, newNav, decide, infoOf, rootOf } from '../game/js/sfx/menunav.js';
import { menuSound, setMenuSoundSink } from '../game/js/menusound.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// een element als verzameling selectors waar het onder valt (de closest() van de DOM-adapter)
const el = (...sels) => (sel) => sel.split(',').map((q) => q.trim()).some((q) => sels.includes(q));
const startBtn = infoOf(el('#start-screen', '.ss-item', 'button'));
const pauseBtn = infoOf(el('#pause-menu', '.gm', 'button'));
const pauseBack = infoOf(el('#pause-menu', '.gm', 'button', '[data-back]'));
const shopBtn = infoOf(el('.gm', 'button'));
const slotsBtn = infoOf(el('.gm', 'button'));
const phoneBtn = infoOf(el('.phone', 'button'));
const sliderI = infoOf(el('#pause-menu', '.gm', 'input[type="range"]'), 'range');
const boxI = infoOf(el('#pause-menu', '.gm', 'input[type="checkbox"]'), 'checkbox');
const textI = infoOf(el('.gm', 'input:not([type="checkbox"]):not([type="range"]):not([type="button"]):not([type="radio"])'));
const losse = infoOf(el());

// ---- de menu's ----
ok(rootOf(el('#pause-menu', '.gm')) === 'pause' && rootOf(el('#start-screen')) === 'start' && rootOf(el('.phone')) === 'phone' && rootOf(el('.gm')) === 'gm' && rootOf(el()) === null, 'de menu\'s worden herkend (pauze, start, telefoon, gm, geen)');
ok(startBtn.root === 'start' && startBtn.item && pauseBtn.root === 'pause' && shopBtn.root === 'gm' && phoneBtn.root === 'phone' && !losse.root && !losse.item, 'info per element');
ok(pauseBack.back && !pauseBtn.back && sliderI.ownSound && sliderI.range && boxI.ownSound && boxI.checkbox && textI.editable, 'terug, eigen geluid en tekstvelden');

// elke menuwortel in de code is een van de ROOTS: het pauzemenu, het startscherm, de telefoon of een gm
{
  const gm = ['pausemenu.js', 'samenkeuze.js', 'saveslotsui.js', 'shopui.js', 'padtest.js'];
  for (const f of gm) ok(/className = 'gm'/.test(read('game/js/' + f)), `${f} is een gm-menu`);
  ok(/\.gm \{/.test(read('game/js/menu.css')), 'menu.css kent .gm');
  ok(ROOTS.split(',').map((x) => x.trim()).join() === '#start-screen,#pause-menu,.phone,.gm', 'de wortels staan op één plek', ROOTS);
  ok(/data-back|cancel|resume/.test(BACKS) && /button/.test(ITEMS) && /\.ss-item/.test(ITEMS), 'items en terugknoppen');
}

// ---- één handeling, één geluid ----
const gesture = (name, steps, want, setup) => {
  const st = newNav();
  decide(st, { kind: 'visible', t: 0, visible: true });
  if (setup) setup(st);
  const got = [];
  for (const [t, kind, extra] of steps) { const r = decide(st, { kind, t, ...extra }); if (r.sound) got.push(r.sound); }
  ok(got.join() === want.join(), name, `kreeg ${got.join() || 'niets'}, wilde ${want.join() || 'niets'}`);
};
const T0 = 10;
for (const [naam, info] of [['startscherm', startBtn], ['pauzemenu', pauseBtn], ['winkel', shopBtn], ['opgeslagen spellen', slotsBtn], ['telefoon', phoneBtn]]) {
  // toetsenbord of controller: pijl naar een andere knop (focus), Enter of A (toets, daarna de klik van de knop)
  gesture(`${naam}: een pijl geeft een tikje`, [[T0, 'focus', { info }]], ['tick']);
  gesture(`${naam}: Enter geeft één keuzegeluid (toets en klik)`, [[T0, 'key', { key: 'Enter', repeat: false, info }], [T0 + 0.01, 'click', { info, detail: 0 }]], ['select']);
  gesture(`${naam}: Spatie of A geeft één keuzegeluid`, [[T0, 'key', { key: ' ', repeat: false, info }], [T0 + 0.3, 'click', { info, detail: 0 }]], ['select']);
  // muis: eroverheen (focus), erop drukken (pointer, dan focus, dan klik): één tikje bij het erover, één keuze bij de klik
  gesture(`${naam}: de muis erover geeft hooguit één tikje`, [[T0, 'focus', { info }], [T0 + 0.01, 'focus', { info }]], ['tick']);
  gesture(`${naam}: een muisklik geeft één keuzegeluid (geen tikje van de focus)`, [[T0, 'pointer', {}], [T0 + 0.005, 'focus', { info }], [T0 + 0.08, 'click', { info, detail: 1 }]], ['select']);
  gesture(`${naam}: Escape of B geeft terug (behalve de pauze: die vouwt met zijn eigen geluid dicht)`, [[T0, 'key', { key: 'Escape', repeat: false, info }]], info.root === 'pause' ? [] : ['back']);
  gesture(`${naam}: Backspace geeft terug`, [[T0, 'key', { key: 'Backspace', repeat: false, info }]], ['back']);
}
gesture('Enter op een terugknop geeft één terug-geluid (toets en klik)', [[T0, 'key', { key: 'Enter', repeat: false, info: pauseBack }], [T0 + 0.02, 'click', { info: pauseBack, detail: 0 }]], ['back']);
gesture('een muisklik op een terugknop geeft terug', [[T0, 'pointer', {}], [T0 + 0.1, 'click', { info: pauseBack, detail: 1 }]], ['back']);
gesture('een toets die blijft hangen (herhaling) geeft niets', [[T0, 'key', { key: 'Enter', repeat: true, info: pauseBtn }], [T0 + 0.05, 'key', { key: 'Escape', repeat: true, info: shopBtn }]], []);
gesture('de klik van een toets lang daarna is een nieuwe handeling', [[T0, 'key', { key: ' ', repeat: false, info: shopBtn }], [T0 + 1.5, 'click', { info: shopBtn, detail: 0 }]], ['select', 'select']);
// schuiven en vinkjes: het eigen geluid, geen keuzegeluid van toets of klik
gesture('een schuifregelaar tikt hoogstens elke 45 ms', [[T0, 'input', { info: sliderI, u: 0.2 }], [T0 + 0.01, 'input', { info: sliderI, u: 0.21 }], [T0 + 0.06, 'input', { info: sliderI, u: 0.3 }]], ['slider', 'slider']);
gesture('een vinkje geeft zijn eigen geluid en geen keuzegeluid', [[T0, 'key', { key: ' ', repeat: false, info: boxI }], [T0 + 0.02, 'input', { info: boxI, checked: true }], [T0 + 0.03, 'click', { info: boxI, detail: 0 }]], ['toggle']);
gesture('Enter op een schuifregelaar geeft niets', [[T0, 'key', { key: 'Enter', repeat: false, info: sliderI }]], []);
// tekstvelden: typen is typen
gesture('typen in een tekstveld geeft niets, ook geen Enter, Spatie of Backspace', [[T0, 'key', { key: 'a', repeat: false, info: textI }], [T0 + 0.1, 'key', { key: ' ', repeat: false, info: textI }], [T0 + 0.2, 'key', { key: 'Backspace', repeat: false, info: textI }], [T0 + 0.3, 'key', { key: 'Enter', repeat: false, info: textI }]], []);
gesture('pijltjes en letters als toets geven niets (de focus geeft het tikje)', [[T0, 'key', { key: 'ArrowDown', repeat: false, info: shopBtn }], [T0 + 0.1, 'key', { key: 'w', repeat: false, info: shopBtn }]], []);
// buiten een menu: stil
gesture('buiten een menu: geen tikje en geen keuze', [[T0, 'focus', { info: losse }], [T0 + 0.1, 'click', { info: losse, detail: 1 }]], []);
{
  const st = newNav();
  ok(decide(st, { kind: 'key', t: 1, key: 'Enter', repeat: false, info: shopBtn }).sound === null, 'zonder menu op het scherm geeft een toets niets');
  decide(st, { kind: 'visible', t: 2, visible: true });
  ok(decide(st, { kind: 'key', t: 2.1, key: 'Enter', repeat: false, info: shopBtn }).sound === 'select', 'met een menu op het scherm wel');
  decide(st, { kind: 'visible', t: 5, visible: false });
  ok(decide(st, { kind: 'key', t: 5.1, key: 'Enter', repeat: false, info: shopBtn }).sound === null, 'na het sluiten weer niets');
}
// een menu dat opengaat en de focus pakt: dat eerste focus is geen tikje (ook al heeft de pol het nog niet gezien)
{
  const st = newNav();
  ok(decide(st, { kind: 'focus', t: 3, info: shopBtn }).sound === null, 'het focus bij het openen (nog niet gezien door de pol) is geen tikje');
  ok(decide(st, { kind: 'focus', t: 3.3, info: shopBtn }).sound === 'tick', 'de volgende wel');
  const s2 = newNav();
  decide(s2, { kind: 'visible', t: 0, visible: true });
  ok(decide(s2, { kind: 'focus', t: 0.05, info: shopBtn }).sound === null && decide(s2, { kind: 'focus', t: 0.3, info: shopBtn }).sound === 'tick', 'binnen 0,15 s na het openen geen tikje, daarna wel');
  const s3 = newNav();
  decide(s3, { kind: 'visible', t: 0, visible: true });
  decide(s3, { kind: 'api', t: 5, which: 'open' });
  ok(decide(s3, { kind: 'focus', t: 5.05, info: shopBtn }).sound === null, 'een menu dat zelf meldt dat het opengaat (menuSound open) onderdrukt het eerste focus');
}
// het tikje van het startscherm is hoger dan dat van de andere menu's (zoals het was)
{
  const a = newNav(), b = newNav();
  decide(a, { kind: 'visible', t: 0, visible: true }); decide(b, { kind: 'visible', t: 0, visible: true });
  ok(decide(a, { kind: 'focus', t: 1, info: startBtn }).f === 1500 && decide(b, { kind: 'focus', t: 1, info: pauseBtn }).f === 1800, 'het tikje van het startscherm 1500 Hz, van de rest 1800 Hz');
  ok(decide(b, { kind: 'input', t: 2, info: pauseBtn, u: 0 }).f === 1400, 'een ander invoerveld in het pauzemenu 1400 Hz');
  ok(decide(b, { kind: 'input', t: 3, info: shopBtn }).sound === null, 'typen in een gm-menu buiten het pauzemenu geeft niets');
  const r = decide(b, { kind: 'input', t: 4, info: sliderI, u: 5 });
  ok(r.sound === 'slider' && r.u === 1, 'de schuif geeft de stand (0 tot 1)');
}

// ---- menu's zonder focus (menuSound) ----
{
  const st = newNav();
  decide(st, { kind: 'visible', t: 0, visible: true });
  const w = (which, t, on) => decide(st, { kind: 'api', t, which, on }).sound;
  ok(w('move', 1) === 'tick' && w('move', 1.01) === null && w('move', 1.1) === 'tick', 'move: een tikje, twee dicht bij elkaar zijn er één');
  ok(w('select', 2) === 'select' && w('back', 3) === 'back' && w('toggle', 4, true) === 'toggle' && w('open', 5) === null && w('niets', 6) === null, 'select, back, toggle, open en onbekend');
  const heard = [];
  setMenuSoundSink((k, on) => heard.push([k, on]));
  menuSound('select'); menuSound('toggle', false);
  ok(JSON.stringify(heard) === '[["select",null],["toggle",false]]'.replace('null', 'null') || heard.length === 2, 'menuSound geeft door aan de sink', JSON.stringify(heard));
  setMenuSoundSink(null);
  menuSound('select');
  ok(heard.length === 2, 'zonder sink doet menuSound niets en gooit niet');
}

// ---- 20000 willekeurige handelingen: nooit twee geluiden voor één handeling ----
{
  const r = rng(413);
  const infos = [startBtn, pauseBtn, shopBtn, slotsBtn, phoneBtn];
  let t = 100, dubbel = 0, handelingen = 0;
  const st = newNav();
  decide(st, { kind: 'visible', t: 90, visible: true });
  for (let i = 0; i < 20000; i++) {
    t += 0.5 + r() * 2; // een handeling per seconde of twee, ruim na de vorige
    const info = infos[Math.floor(r() * infos.length)];
    const soort = Math.floor(r() * 4);
    const ev = [];
    if (soort === 0) ev.push({ kind: 'key', t, key: r() < 0.5 ? 'Enter' : ' ', repeat: false, info }, { kind: 'click', t: t + r() * 0.3, info, detail: 0 });
    else if (soort === 1) ev.push({ kind: 'pointer', t }, { kind: 'focus', t: t + 0.002 + r() * 0.01, info }, { kind: 'click', t: t + 0.06 + r() * 0.2, info, detail: 1 });
    else if (soort === 2) ev.push({ kind: 'focus', t, info });
    else ev.push({ kind: 'key', t, key: 'Enter', repeat: false, info: { ...info, back: true } }, { kind: 'click', t: t + 0.01, info: { ...info, back: true }, detail: 0 }); // Enter op een terugknop
    let got = 0;
    for (const e of ev.sort((a, b) => a.t - b.t)) { if (decide(st, e).sound) got++; }
    handelingen++;
    if (got > 1) dubbel++;
  }
  ok(dubbel === 0, `${handelingen} handelingen: nooit twee geluiden (${dubbel} keer wel)`);
}

// ---- de koppeling in de code ----
{
  const ui = read('game/js/sfx/ui.js');
  ok(/from '\.\/menunav\.js'/.test(ui) && /decide\(nav, ev\)/.test(ui), 'sfx/ui.js speelt wat menunav.js beslist');
  ok(!/#pause-menu, #start-screen, \.phone/.test(ui.replace(/\/\/[^\n]*/g, '')), 'de menu-selectors staan alleen in menunav.js');
  ok(/setMenuSoundSink\(menuApi\)/.test(ui), 'de audio meldt zich aan bij menuSound');
  ok(/uiDomEvent\('?\w*/.test(ui) || /export function uiDomEvent/.test(ui), 'uiDomEvent bestaat nog (audio.js roept hem aan)');
  const audio = read('game/js/audio.js');
  ok(/focusin/.test(audio) && /'click'/.test(audio) && /'keydown'/.test(audio) && /'input'/.test(audio), 'audio.js luistert naar focus, klik, toets en invoer');
  ok(/menuSound\('select'\)/.test(read('game/js/stagechoice.js')) && /from '\.\/menusound\.js'/.test(read('game/js/stagechoice.js')), 'de missiekeuze (stagechoice.js) geeft zijn keuze door met één regel');
  const leaf = read('game/js/menusound.js').replace(/\/\/[^\n]*/g, '');
  ok(!/import /.test(leaf), 'menusound.js importeert niets (een blad, zoals pausestate.js)');
  // het volume: dezelfde UI-bus als de rest, geen eigen volume
  ok(!/gain: 0\.[2-9]/.test(ui.slice(ui.indexOf('function play(r)'), ui.indexOf('// --- stingers'))), 'de menugeluiden blijven zacht en gaan over dezelfde UI-bus');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
