// Samen spelen (#530, ADR 0022): the first-start screen (a name and the question whether to
// play with others) and the switch in the players panel. Both write the same gde-settings key
// onlineMeedoen, and neither may connect before the player answered. The WebSocket and the
// RTCPeerConnection are doubles that only count, like lobbyui_consent_test.mjs, so "nothing
// goes out" is a fact and not a promise.
//   node scripts/onlinestart_test.mjs
import assert from 'node:assert/strict';

const log = { ws: [], pc: [] };
globalThis.WebSocket = class {
  constructor(url) { log.ws.push(url); this.url = url; setTimeout(() => this.onerror && this.onerror(new Error('nep')), 0); }
  send() {} close() {}
};
globalThis.RTCPeerConnection = class {
  constructor(cfg) { log.pc.push(cfg); this.localDescription = null; }
  createDataChannel() { return { close() {} }; }
  async createOffer() { return { type: 'offer', sdp: 'v=0' }; }
  async setLocalDescription() {} addEventListener() {} removeEventListener() {} close() {}
};
globalThis.window = globalThis;
globalThis.navigator ??= {};

// The repo rule: a test never writes to the real save or settings. Only gde-settings is allowed.
const KEY = 'gde-settings';
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error(`test schreef naar ${k}`); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, body: null, head: null };

// One settings module for the whole test, the same instance the game modules import: the card
// and the switch must read and write exactly the key that settings.js keeps.
const S = await import('../game/js/settings.js');
const { EERSTE_START, SCHAKELAAR, moetVragen, kiesToestemming, zetMeedoen } = await import('../game/js/onlineconsent.js');
const { onlineStartHtml, meedoenSchakelaarHtml, mountOnlineStart, openOnlineStart, maybeOpenOnlineStart, closeOnlineStart } = await import('../game/js/onlineconsentui.js');

let n = 0;
const t = async (naam, f) => { await f(); n++; };
const bewaard = () => { const s = opslag.get(KEY); return s ? JSON.parse(s) : null; };
const naar = (waarde) => S.setSetting('onlineMeedoen', waarde);

// --- 1. the screen only exists for a player who was never asked ------------------
await t('de vraag komt alleen bij onlineMeedoen === null, niet bij true of false', async () => {
  assert.equal(S.getSettings().onlineMeedoen, null, 'een verse installatie begint als "nog nooit gevraagd"');
  assert.equal(moetVragen(), true);
  for (const [waarde, verwacht] of [[null, true], [undefined, true], [true, false], [false, false]]) {
    assert.equal(moetVragen({ onlineMeedoen: waarde }), verwacht, `waarde ${JSON.stringify(waarde)}`);
  }
  naar(true); assert.equal(moetVragen(), false);
  naar(false); assert.equal(moetVragen(), false);
  naar(null); assert.equal(moetVragen(), true);
});

await t('geen WebSocket en geen RTCPeerConnection zolang de vraag op het scherm staat', async () => {
  naar(null);
  const root = nepRoot('');
  mountOnlineStart(root, {});
  assert.match(root.innerHTML, /Meedoen met andere spelers\?/);
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'het scherm verbindt niets');
  assert.equal(S.getSettings().onlineMeedoen, null, 'en er is nog niets geantwoord');
});

// --- 2. the screen's content -----------------------------------------------------
await t('het scherm noemt de naam, de eerlijke uitleg en precies de knoppen meedoen, alleen en later', async () => {
  const html = onlineStartHtml({ naam: '', fout: '' });
  assert.match(html, /Je naam/);
  assert.match(html, /gaat naar je medespeler en naar de openbare servers/);
  assert.match(html, /niet naar een server van ons/);
  assert.match(html, new RegExp(`>${EERSTE_START.meedoen}<`));
  assert.match(html, new RegExp(`>${EERSTE_START.alleen}<`));
  assert.match(html, new RegExp(`>${EERSTE_START.later}<`));
  assert.equal((html.match(/<button\b/g) || []).length, 3, 'drie knoppen: meedoen, alleen en later (#751)');
  assert.ok(!/href=/.test(html), 'geen link naar de instellingen');
  assert.match(html, /class="os-naam"[^>]*maxlength="16"/, 'het naamveld houdt dezelfde grens als het profielveld');
  assert.ok(html.indexOf('class="os-naam"') < html.indexOf('data-keuze'), 'het naamveld staat boven de knoppen');
});

// --- 3. "Alleen spelen" writes false and stays silent -----------------------------
await t('Alleen spelen: onlineMeedoen wordt false en er gaat niets naar buiten', async () => {
  naar(null);
  let gekozen = null;
  const root = nepRoot('');
  mountOnlineStart(root, { onKies: (r) => { gekozen = r; } });
  root.klik('nee');
  assert.equal(S.getSettings().onlineMeedoen, false);
  assert.equal(bewaard().onlineMeedoen, false, 'de nee staat echt in gde-settings');
  assert.equal(gekozen.keuze, 'alleen');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'alleen spelen zoekt geen contact');
  assert.equal(root.innerHTML, '', 'het scherm is weg; het spel gaat verder');
  assert.equal(moetVragen(), false, 'en de vraag komt niet terug');
});

// --- 4. "Meedoen" writes true (and still nothing connects by itself) ---------------
await t('Meedoen: onlineMeedoen wordt true, met de naam erbij', async () => {
  naar(null);
  let gekozen = null;
  const root = nepRoot('Bouwer');
  mountOnlineStart(root, { onKies: (r) => { gekozen = r; } });
  root.klik('ja');
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.equal(bewaard().onlineMeedoen, true);
  assert.equal(bewaard().onlineNaam, 'Bouwer', 'de naam gaat mee in hetzelfde bestand als het profielveld');
  assert.equal(S.getSettings().onlineNaam, 'Bouwer');
  assert.equal(gekozen.keuze, 'meedoen');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'de ja is een toestemming, geen verbinding');
  assert.equal(moetVragen(), false);
});

// --- 4b. Enter in the name field is not consent (#556) --------------------------------
await t('Enter in het naamveld is geen toestemming: het zet de focus op Meedoen', async () => {
  naar(null);
  S.setSetting('onlineNaam', '');
  let gekozen = 0;
  const root = nepRoot('Bouwer');
  mountOnlineStart(root, { onKies: () => { gekozen++; } });
  root.toets('Enter', root.veld());
  assert.equal(gekozen, 0, 'geen ja zonder knop of keuze');
  assert.equal(S.getSettings().onlineMeedoen, null, 'er is niets bewaard');
  assert.equal(S.getSettings().onlineNaam, '', 'de getypte naam is nog niet bewaard');
  assert.equal(root.focus, 'ja', 'de focus staat op Meedoen, klaar voor een bewuste Enter');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'en er ging niets naar buiten');
  root.klik('ja');
  assert.equal(gekozen, 1, 'de knop is de keuze');
  assert.equal(S.getSettings().onlineMeedoen, true);
  naar(null);
});

// --- 4c. #751: uitstellen zonder antwoord -------------------------------------------
await t('#751: Later en Escape sluiten de vraag zonder een voorkeur op te slaan', async () => {
  naar(null);
  S.setSetting('onlineNaam', '');
  let gekozen = null;
  const root = nepRoot('');
  mountOnlineStart(root, { onKies: (r) => { gekozen = r; } });
  root.klik('later');
  assert.equal(gekozen.keuze, 'later', 'Later stelt de vraag uit');
  assert.equal(S.getSettings().onlineMeedoen, null, 'en er is geen voorkeur opgeslagen');
  assert.equal(S.getSettings().onlineNaam, '', 'de naam is ook niet bewaard');
  assert.equal(moetVragen(), true, 'de vraag komt de volgende start terug');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'en er ging niets naar buiten');
  gekozen = null;
  const root2 = nepRoot('');
  mountOnlineStart(root2, { onKies: (r) => { gekozen = r; } });
  root2.toets('Escape', root2.veld());
  assert.equal(gekozen && gekozen.keuze, 'later', 'Escape stelt de vraag uit');
  assert.equal(S.getSettings().onlineMeedoen, null, 'ook Escape bewaart niets');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'en er ging niets naar buiten');
});

// --- 5. a refused name shows a fault and writes nothing --------------------------
await t('een ongeldige naam geeft een fout en zet niets', async () => {
  naar(null);
  S.setSetting('onlineNaam', '');
  let gekozen = false;
  const root = nepRoot('Tessa');
  mountOnlineStart(root, { onKies: () => { gekozen = true; } });
  root.klik('ja');
  assert.equal(gekozen, false, 'het scherm sluit niet met een ongeldige naam');
  assert.equal(S.getSettings().onlineMeedoen, null, 'en de toestemming staat nog open');
  assert.equal(S.getSettings().onlineNaam, '', 'de naam is niet bewaard');
  assert.match(root.innerHTML, /role="alert"/);
  assert.match(root.innerHTML, /Tammo en Tessa horen bij het verhaal/, 'dezelfde foutmelding als het profielveld');
  assert.match(root.innerHTML, /value="Tessa"/, 'de geweigerde naam blijft in het veld staan, zodat je hem kunt verbeteren');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0]);
  // too long is refused the same way, and an empty name is allowed (the name of your figure)
  assert.equal(kiesToestemming(true, 'x'.repeat(17)).ok, false);
  assert.equal(S.getSettings().onlineMeedoen, null);
  assert.equal(kiesToestemming(true, '').ok, true);
  assert.equal(S.getSettings().onlineMeedoen, true);
});

// --- 6. the switch in the players panel ------------------------------------------
await t('de schakelaar leest en schrijft dezelfde sleutel', async () => {
  naar(false);
  assert.ok(!/checked/.test(meedoenSchakelaarHtml(S.getSettings())), 'uit staat uit');
  naar(true);
  const html = meedoenSchakelaarHtml(S.getSettings());
  assert.match(html, /data-meedoen checked/);
  assert.match(html, new RegExp(SCHAKELAAR.label));
  assert.match(html, /Je IP-adres gaat naar je medespeler/, 'met een regel uitleg');
  const r = zetMeedoen(false);
  assert.equal(r.meedoen, false);
  assert.equal(S.getSettings().onlineMeedoen, false);
  assert.equal(bewaard().onlineMeedoen, false);
  assert.ok(!/checked/.test(meedoenSchakelaarHtml(S.getSettings())), 'en de schakelaar toont meteen de nieuwe stand');
  // the key is the one settings.js loads: a reloaded module reads what the switch wrote
  const gelezen = await import(`../game/js/settings.js?herlaad=${Math.random()}`);
  assert.equal(gelezen.getSettings().onlineMeedoen, false);
});

await t('de schakelaar uitzetten sluit een openbare sessie en laat de gasten zitten', async () => {
  naar(true);
  const hub = { openbaar: { naam: 'Grunn' }, roster: { spelers: [{ slot: 0 }, { slot: 1 }] }, sluit: 0, zetOpenbaar(aan) { if (!aan) { this.sluit++; this.openbaar = null; } return { ok: true, openbaar: false }; } };
  const r = zetMeedoen(false, { world: { coopNet: { role: 'host', hub } } });
  assert.equal(r.openbaarGesloten, true);
  assert.equal(hub.sluit, 1, 'de sessie verdwijnt uit de openbare lijst');
  assert.equal(hub.roster.spelers.length, 2, 'bestaande gasten blijven');
  assert.match(r.tekst, /niet meer in de openbare lijst/);
  naar(true);
  const g = zetMeedoen(false, { world: { coopNet: { role: 'client' } } });
  assert.equal(g.openbaarGesloten, false, 'een gast heeft geen sessie om te sluiten');
  assert.match(g.tekst, /Deze sessie loopt nog/, 'en zegt eerlijk dat de sessie van een ander doorloopt');
  // een gastheer met een besloten sessie: geen regel om weg te halen, de gasten blijven
  naar(true);
  const besloten = zetMeedoen(false, { world: { coopNet: { role: 'host', hub: { openbaar: null, roster: { spelers: [{ slot: 0 }, { slot: 1 }] } } } } });
  assert.equal(besloten.openbaarGesloten, false);
  assert.match(besloten.tekst, /blijft besloten/);
  naar(true);
  const alleen = zetMeedoen(false, {});
  assert.match(alleen.tekst, /Je speelt alleen/, 'zonder sessie is er niets dat doorloopt');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'de schakelaar verbindt zelf niets');
  const zelfde = zetMeedoen(false);
  assert.equal(zelfde.veranderd, false, 'twee keer uitzetten doet niets');
});

// --- 7. the panel really shows the switch, and the menu hands in the way to the lobby -------
await t('het profiel in het pauzemenu toont de schakelaar en de weg naar Samen spelen', async () => {
  const fs = await import('node:fs');
  const ui = fs.readFileSync(new URL('../game/js/coopspelersui.js', import.meta.url), 'utf8');
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  assert.match(ui, /meedoenSchakelaarHtml\(s\)/, 'de schakelaar staat bij je naam en kleur');
  assert.match(ui, /matches\('\[data-meedoen\]'\)/, 'en de klik wordt afgehandeld');
  assert.match(ui, /zetMeedoen\(/, 'via dezelfde regel als het eerste-startscherm');
  assert.match(pm, /openSamen: \(\) => \{ closePauseMenu\(\); stopSoloHost\(world\); requestOpenSamen\(\); \}/, 'aanzetten opent het bestaande tabblad Samen spelen, geen nieuwe netwerklaag');
  assert.ok(!/id === 'spelers' && !\(world && world\.coopNet\)/.test(pm), 'het tabblad Spelers is er ook zonder sessie, anders is alleen spelen een doodlopende weg');
});

await t('het scherm komt echt in beeld: focus op het naamveld en na het antwoord weer weg', async () => {
  naar(null);
  const ouders = [];
  let focus = 0;
  const maak = () => {
    const el = {
      id: '', className: '', innerHTML: '', listeners: {},
      appendChild() {}, setAttribute() {},
      querySelector(sel) { return sel === '.os-naam' ? { value: 'Bouwer', focus() { focus++; }, closest: () => null } : null; },
      addEventListener(ev, f) { (el.listeners[ev] || (el.listeners[ev] = [])).push(f); },
      remove() { el.weg = true; },
    };
    ouders.push(el);
    return el;
  };
  document.createElement = maak;
  const klassen = new Set();
  document.body = { appendChild() {}, classList: { toggle: (c, aan) => (aan === false || (aan === undefined && klassen.has(c)) ? klassen.delete(c) : klassen.add(c)), contains: (c) => klassen.has(c) } };
  const belofte = openOnlineStart();
  const kaart = ouders[0];
  assert.equal(kaart.className, 'os-overlay');
  assert.match(kaart.innerHTML, /Meedoen met andere spelers\?/, 'de vraag staat in beeld');
  assert.ok(focus > 0, 'de focus staat meteen op het naamveld');
  const knop = { getAttribute: () => 'ja' };
  kaart.listeners.click.forEach((h) => h({ target: { closest: (s) => (s === '[data-keuze]' ? knop : null) } }));
  const antwoord = await belofte;
  assert.equal(kaart.weg, true, 'het scherm verdwijnt');
  assert.equal(antwoord.keuze, 'meedoen');
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'en er ging niets naar buiten');
});

// --- 7b. #751: de boot kan de vraag sluiten zonder antwoord ---------------------
await t('#751: closeOnlineStart ruimt het scherm en de module-state op, zonder iets op te slaan', async () => {
  naar(null);
  const ouders = [];
  const maak = () => {
    const el = {
      id: '', className: '', innerHTML: '', listeners: {},
      appendChild() {}, setAttribute() {},
      querySelector(sel) { return sel === '.os-naam' ? { value: '', focus() {}, closest: () => null } : null; },
      addEventListener(ev, f) { (el.listeners[ev] || (el.listeners[ev] = [])).push(f); },
      remove() { el.weg = true; },
    };
    ouders.push(el);
    return el;
  };
  document.createElement = maak;
  document.body = { appendChild() {}, classList: { toggle() {}, contains: () => false } };
  const eerste = openOnlineStart();
  assert.equal(ouders.length, 1, 'de vraag staat open');
  closeOnlineStart();
  assert.equal(await eerste, null, 'zonder antwoord resolvet de vraag met null');
  assert.equal(ouders[0].weg, true, 'het scherm is weg');
  const tweede = openOnlineStart();
  assert.equal(ouders.length, 2, 'de module-state is leeg: een volgende vraag bouwt een nieuw scherm');
  closeOnlineStart();
  await tweede;
  assert.equal(S.getSettings().onlineMeedoen, null, 'er is niets opgeslagen');
  assert.equal(moetVragen(), true, 'de vraag komt dus terug');
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'en er ging niets naar buiten');
});

// --- 8. the boot only asks the question when there is one ------------------------
await t('de boot vraagt het alleen als er nog geen antwoord is', async () => {
  naar(true);
  assert.equal(await maybeOpenOnlineStart({ settings: S.getSettings() }), null, 'een speler die al antwoordde ziet niets');
  naar(false);
  assert.equal(await maybeOpenOnlineStart({ settings: S.getSettings() }), null);
  naar(true);
  assert.equal(S.magOnline(), true, 'en de ene lezer van settings.js zegt ja');
  naar(null);
  assert.equal(S.magOnline(), false, 'null leest nooit als ja');
  assert.equal(moetVragen(), true, 'en zonder antwoord komt de vraag');
  assert.equal(typeof openOnlineStart, 'function');
});

// A DOM element for the card, as small as the card needs. A key gets its keyup too (AGENTS.md).
function nepRoot(startWaarde) {
  const knoppen = {
    ja: { keuze: 'ja', getAttribute: () => 'ja', focus() { r.focus = 'ja'; } },
    nee: { keuze: 'nee', getAttribute: () => 'nee', focus() { r.focus = 'nee'; } },
  };
  const r = {
    innerHTML: '', waarde: startWaarde, listeners: {}, focus: null,
    veld() { return { value: r.waarde, classList: { contains: (c) => c === 'os-naam' }, focus() { r.focus = 'naam'; }, closest: () => null }; },
    querySelector(sel) {
      if (sel === '.os-naam') return r.veld();
      if (sel === '[data-keuze="ja"]') return knoppen.ja;
      if (sel === '[data-keuze="nee"]') return knoppen.nee;
      return null;
    },
    addEventListener(ev, f) { (r.listeners[ev] || (r.listeners[ev] = [])).push(f); },
    toets(key, target) { (r.listeners.keydown || []).forEach((h) => h({ key, target, shiftKey: false, preventDefault() {} })); },
    klik(keuze) {
      const knop = { getAttribute: () => keuze };
      const target = { closest: (s) => (s === '[data-keuze]' ? knop : null) };
      (r.listeners.click || []).forEach((h) => h({ target, preventDefault() {} }));
    },
  };
  return r;
}

await t('meedoen uitzetten in een sessie van één noemt geen kamercode (#580)', async () => {
  naar(true);
  const solo = zetMeedoen(false, { world: { coopSolo: true, coopNet: { role: 'host', hub: {} } } });
  assert.equal(solo.tekst, SCHAKELAAR.uit, 'solo: gewone uitleg');
  naar(true);
  const host = zetMeedoen(false, { world: { coopNet: { role: 'host', hub: {} } } });
  assert.equal(host.tekst, SCHAKELAAR.uitSessie, 'echte host: sessie-uitleg');
});

console.log(`onlinestart_test: ${n}/${n} ok`);
process.exit(0);


