// Samen spelen (#871, #873, #874, #875): de layout op kleine schermen.
// De CSS-regels worden in de bron gecontroleerd (er is geen browser in deze test); de
// lobby wordt met een nep-DOM getekend zodat de volgorde, de chips en het uitgeklapte
// avatarblok echt uit draw() komen. Er wordt niets verbonden en niets bewaard.
//   node scripts/multiplayer_layout_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
globalThis.navigator ??= {};
globalThis.WebSocket = class { constructor() { throw new Error('geen netwerk in deze test'); } };
globalThis.RTCPeerConnection = class { constructor() { throw new Error('geen netwerk in deze test'); } };
const geheugen = new Map();
globalThis.localStorage = { getItem: (k) => (geheugen.has(k) ? geheugen.get(k) : null), setItem: (k, v) => geheugen.set(k, String(v)), removeItem: (k) => geheugen.delete(k) };
globalThis.document = { activeElement: null, addEventListener() {} };

const { mountLobby } = await import('../game/js/lobbyui.js');

let n = 0;
const t = (naam, f) => { f(); n++; };
const lees = (pad) => fs.readFileSync(new URL(pad, import.meta.url), 'utf8');
const regel = (css, selector) => {
  const veilig = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alle = [...css.matchAll(new RegExp(veilig + '\\s*\\{([^}]*)\\}', 'g'))].map((m) => m[1]);
  return alle.length ? alle[0] : '';
};
const regelMet = (css, selector, kenmerk) => {
  const veilig = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(veilig + '\\s*\\{([^}]*)\\}', 'g'))].map((m) => m[1]).find((r) => kenmerk.test(r)) || '';
};

// ----- de CSS van de drie schermen
const pauseCss = lees('../game/js/pausemenu.css');
const spelersUi = lees('../game/js/coopspelersui.js');
const wedstrijd = lees('../game/js/coopwedstrijd3d.js');

t('#871: de Samen-hub en wachtkamer scrollen met een zichtbare scrollbalk', () => {
  const buiten = regel(pauseCss, '#pause-menu .pm-samen');
  assert.doesNotMatch(buiten, /scrollbar-width:\s*none/, 'de buitenste laag verbergt geen scrollbalk meer');
  assert.match(buiten, /overflow:\s*visible/);
  const binnen = regelMet(pauseCss, '#pause-menu .pm-samen-inner', /overflow-y:\s*auto/);
  assert.match(binnen, /overflow-y:\s*auto/, 'de inhoud scrolt');
  assert.match(binnen, /scrollbar-width:\s*thin/);
  assert.match(binnen, /scrollbar-gutter:\s*stable/);
  // de hub zet zichzelf in datzelfde vak; zonder flex:1 werd hij zo hoog als zijn
  // inhoud en scrollde de verborgen buitenlaag in plaats van deze zichtbare lijst.
  const hub = regelMet(pauseCss, '#pause-menu .pm-hub', /min-height:\s*0/);
  assert.doesNotMatch(hub, /flex:\s*none/); assert.match(hub, /min-height:\s*0/);
  assert.match(pauseCss, /#pause-menu \.pm-samen-inner::-webkit-scrollbar-thumb/);
});

t('#871: de acties plakken onderaan en de kamercode bovenaan', () => {
  const knoppen = regel(pauseCss, '#pause-menu .pm-samen .coop-btns');
  assert.match(knoppen, /position:\s*sticky/); assert.match(knoppen, /bottom:\s*0/);
  const code = regel(pauseCss, '#pause-menu .pm-samen .coop-code');
  assert.match(code, /position:\s*sticky/); assert.match(code, /top:\s*0/);
});

t('#871: op een laag venster zijn er één compacte tabrij, een verborgen bladkop en hubkeuzes naast elkaar', () => {
  assert.match(pauseCss, /@media \(max-height: 560px\) \{[\s\S]*?\.pm-sheet:has\(\[data-panel="spel"\]:not\(\[hidden\]\) \.pm-samen:not\(\[hidden\]\)\) \.pm-sheet-head \{ display: none; \}/);
  assert.match(pauseCss, /@media \(max-height: 560px\) \{[\s\S]*?\.pm-hub-keuzes \{ flex-direction: row; gap: 8px; \}/);
  assert.match(pauseCss, /@media \(max-width: 760px\) and \(orientation: portrait\) \{[\s\S]*?\.pm-samen > \.m-tabs \.m-tablist, #pause-menu \[data-panel="spel"\] > \.pm-inner > \.m-tabs \.m-tablist \{ flex-wrap: nowrap; overflow-x: auto;/);
});

t('#873: de spelerslijst bij Tab heeft een eigen scroller en een netstatus op een tweede regel', () => {
  const lijst = regel(spelersUi, '#coop-spelers .cs-lijst');
  assert.match(lijst, /max-height:\s*calc\(100vh - 204px\)/);
  assert.match(lijst, /overflow-y:\s*auto/);
  assert.match(lijst, /pointer-events:\s*auto/, 'de lijst zelf vangt de muis, de rest van de overlay blijft doorklikbaar');
  assert.match(spelersUi, /#coop-spelers \{[^}]*box-sizing: border-box;/, 'de overlay valt op 360 px niet buiten het scherm');
  // spelersmenu 21-11: de netstatus is een eigen tabelkolom (cs-tab-ping); op een smal scherm krimpt de rij naar drie kolommen
  assert.match(spelersUi, /@media \(max-width: 520px\) \{[\s\S]*?#coop-spelers \.cs-rij \{ grid-template-columns: var\(--ds-s-6\) minmax\(0, 1fr\) auto;/);
  assert.match(spelersUi, /@media \(max-height: 460px\) \{[\s\S]*?#coop-spelers \.cs-voet \{ display: none; \}/);
});

t('#873: ook de Spelers-lijst in het pauzemenu scrolt met een dunne balk', () => {
  const menu = regelMet(spelersUi, '.pm-spelers', /overflow-y:\s*auto/);
  assert.match(menu, /overflow-y:\s*auto/); assert.match(menu, /scrollbar-width:\s*thin/);
  assert.doesNotMatch(menu, /scrollbar-width:\s*none/);
  assert.match(pauseCss, /#pause-menu \.pm-samen \.pm-samen-spelers \{[^}]*overflow-y: auto/);
});

t('#875: de wedstrijdkaart hangt onder de HUD-strook in plaats van op 18%', () => {
  assert.doesNotMatch(wedstrijd, /top:18%/, 'geen vaste hoogte meer');
  assert.match(wedstrijd, /top:max\(calc\(var\(--hud-top, 34px\) \+ 64px\), calc\(var\(--hud-a-bottom, 0px\) \+ 8px\)\)/);
  assert.match(wedstrijd, /z-index:55;box-sizing:border-box;/, 'de kaart valt met padding op 360 px niet buiten het scherm');
  assert.match(wedstrijd, /@media \(max-height:560px\)\{\.wed-kaart\{top:max\(calc\(var\(--hud-top, 18px\) \+ 62px\), calc\(var\(--hud-a-bottom, 0px\) \+ 6px\)\)/);
  assert.match(wedstrijd, /font-size:14px;line-height:1\.35/);
});

// ----- de lobby getekend: klein scherm en groot scherm
function fakeRoot() {
  const r = { innerHTML: '', listeners: {} };
  r.querySelector = () => null;
  r.querySelectorAll = () => [];
  r.contains = () => true;
  r.closest = (sel) => (sel === '#pause-menu' ? {} : null);
  r.addEventListener = (ev, f) => { (r.listeners[ev] || (r.listeners[ev] = [])).push(f); };
  r.click = (act) => (r.listeners.click || []).forEach((h) => h({ target: { closest: (sel) => (sel === '[data-act]' ? { dataset: { act } } : null) } }));
  return r;
}
const hooks = (extra = {}) => ({ startHost: () => ({ roster: { max: 16, spelers: [] } }), addGuest() {}, startClient() {}, setMax: (m) => m, disconnect() {}, ...extra });
const gast = (root) => { const l = mountLobby(root, hooks()); l.event({ t: 'kies', rol: 'gast' }); return l; };

t('#871: op 360x800 staat het kamercodeveld bovenaan, is het avatarblok ingeklapt en komen de figuurkeuzes na de knoppen', () => {
  globalThis.innerWidth = 360; globalThis.innerHeight = 800;
  const root = fakeRoot(); const lobby = gast(root);
  assert.match(root.innerHTML, /<details class="coop-profiel-vouw"><summary>Je online-avatar<\/summary>/);
  assert.ok(root.innerHTML.indexOf('class="coop-input"') < root.innerHTML.indexOf('<p>'), 'het kamercodeveld staat vóór de lange uitleg');
  assert.ok(root.innerHTML.indexOf('class="coop-btns"') < root.innerHTML.indexOf('class="coop-wensen"'), 'de knoppen staan vóór de optionele figuurkeuzes');
  assert.match(root.innerHTML, /data-act="koppel"/);
  lobby.close();
});

t('#871: op een groot scherm blijft het avatarformulier open en staan de figuurkeuzes vóór de knoppen', () => {
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  const root = fakeRoot(); const lobby = gast(root);
  assert.doesNotMatch(root.innerHTML, /coop-profiel-vouw/);
  assert.ok(root.innerHTML.indexOf('class="coop-wensen"') < root.innerHTML.indexOf('class="coop-btns"'));
  lobby.close();
});

t('#874: de wachtkamer met 16 spelers toont chips, een korte telling en geen kick-knoppen', () => {
  globalThis.innerWidth = 800; globalThis.innerHeight = 360;
  const chars = ['rik', 'bram', 'lotte', 'sanne'];
  const spelers = Array.from({ length: 16 }, (_, i) => ({ slot: i, char: chars[i % chars.length], rol: i === 0 ? 'host' : 'gast', verbinding: i === 5 ? 'lost' : i === 7 ? 'lag' : 'ok', avatar: { naam: i === 0 ? 'Tammo' : `Speler ${i}` } }));
  const hub = { roster: { max: 16, spelers }, publiek: () => null };
  const root = fakeRoot();
  const lobby = mountLobby(root, hooks(), { adopt: { code: 'ABCDE-FGHJK', route: 'kamer' }, rol: 'host', hub });
  assert.match(root.innerHTML, /Spelers \(16 van 16\)\./);
  assert.equal((root.innerHTML.match(/<li class="coop-speler/g) || []).length, 16, 'alle namen staan als chip');
  assert.equal((root.innerHTML.match(/data-host="1"/g) || []).length, 1, 'de host is herkenbaar');
  assert.match(root.innerHTML, /coop-speler-weg/, 'een weggevallen speler is herkenbaar');
  assert.match(root.innerHTML, /coop-speler-lag/, 'een haperende speler is herkenbaar');
  assert.match(root.innerHTML, /coop-beheer-hint/);
  assert.match(root.innerHTML, /tabblad Spelers/);
  assert.doesNotMatch(root.innerHTML, /data-act="kick-/, 'geen vijftien knoppen onder de wachtkamer');
  assert.ok(!/Spelers \(16 van 16\): .*Speler 15/.test(root.innerHTML), 'geen lange namenzin');
  lobby.close();
});

console.log(`multiplayer_layout_test: ${n}/${n} ok`);
