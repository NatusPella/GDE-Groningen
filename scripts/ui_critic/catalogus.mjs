// UI-kritiekharnas: de catalogus van alle spelersschermen en HUD-toestanden. Elk scherm is een entry met een
// bronmodule (game/js), een categorie en een setup: JS die IN de pagina draait (zie pagina.mjs) en de echte UI-module
// met nepdata opbouwt. De pagina laadt de echte CSS-bundels uit game/ (index.html-volgorde plus alle game/js/*.css).
// Een scherm dat niet te bouwen is, komt met de reden in index.json (render.mjs); dat is een bevinding, geen fout.
//
// Beschikbaar in een setup: ctx.imp('module') (dynamic import uit game/js), ctx.stage, ctx.hud, ctx.body, ctx.wait(ms),
// en uit PRELUDE: makeWorld() (nepwereld), el(html) (HTML naar element), mount(fn).

export const RESOLUTIONS = [
  { id: '720p', w: 1280, h: 720, uiScale: 1 },
  { id: '1080p', w: 1920, h: 1080, uiScale: 1 },
  { id: 'ui15', w: 1920, h: 1080, uiScale: 1.5 },
];

export const CATEGORIES = ['menu', 'kaarten', 'hud', 'winkels'];

// Nepdata voor alle schermen: een wereld met genoeg velden om een paneel te laten tekenen. Alles verzonnen.
export const PRELUDE = `
  localStorage.setItem('gde-settings', '{}');
  document.body.classList.add('game-started');
  const el = (html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstElementChild; };
  const noop = () => {};
  const makeWorld = () => {
    const w = {
      health: 80, money: 1840, player: { x: 120, y: 0, z: -340, heading: 0.4, hp: 100, stamina: 80, inVehicle: null, vehicle: null, speed: 0 },
      input: new Proxy({ reset: noop, keys: {}, canLock: () => false }, { get: (o, k) => (k in o ? o[k] : () => false) }),
      time: 13.5, day: 14, weather: 'zon', paused: false, wanted: 0, heat: 0, hp: 100,
      missions: { active: null, done: [], list: [] }, flags: {}, stats: {}, inventory: {}, items: {},
      addMessage: noop, say: noop, notify: noop, toast: noop,
      pigeonActions: null, pigeonMode: false, safetyActions: null, sideJobActions: null, homeActions: null,
      coopNet: null, coopSpelers: [], coopRole: 'solo', menuMuffle: false, ammo: {}, weapon: null, weapons: [], owned: {}, uiPaused: false, kissUnlocked: false,
      map: new Proxy({ meta: { landmarks: [], districts: [] }, size: 4000, buildings: [], roads: [], places: [], landmarks: [], water: [], parks: [], rails: [], paths: [], bridges: [], districts: [], trees: [] }, { get: (o, k) => (k in o ? o[k] : typeof k === 'symbol' ? undefined : () => null) }), vehicles: [], npcs: [], garage: [],
    };
    w.player.vehicle = null;
    return w;
  };
  const mount = (fn) => { ctx.stage.innerHTML = ''; return fn(ctx.stage); };
`;

const pm = (tab, opts = '{}') => `
  window.__stap = 'import pausemenu';
  const PM = await ctx.imp('pausemenu');
  window.__stap = 'initPauseMenu';
  const w = makeWorld();
  PM.initPauseMenu(w);
  window.__stap = 'openPauseMenu';
  PM.openPauseMenu(${JSON.stringify(tab)}, ${opts});
  window.__stap = 'wacht';
  await ctx.wait(900);
`;

const TITLES = {
  spel: 'Spel', verhaal: 'Verhaal', todo: 'Activiteiten', loopbaan: 'Loopbanen', map: 'Kaart', spullen: 'Spullen', garage: 'Garage', veroverd: 'Veroverd',
  prestaties: 'Prestaties', fotos: "Foto's", settings: 'Instellingen', over: 'Over', visboek: 'Visboek', boerderij: 'Land en bedrijf', voetbal: 'Voetbal',
  controls: 'Besturing', streken: 'Cheats', samen: 'Samen spelen',
};
// [tab, sub of null]: elk blad van het pauzemenu, met de subtabbladen die er echt zijn (SUBTABS in pausemenu.js).
const PAUSE_TABS = [
  ['spel', null], ['spel', 'samen'], ['spel', 'acties'], ['samen', 'spelers'],
  ['verhaal', null], ['verhaal', 'personages'], ['todo', null], ['loopbaan', null], ['map', null], ['spullen', null], ['garage', null],
  ['veroverd', null], ['prestaties', null], ['fotos', null], ['over', null], ['visboek', null], ['voetbal', null], ['streken', null],
  ...['video', 'sound', 'spel', 'moeilijkheid', 'besturing', 'camera', 'display', 'hints', 'online'].map((s) => ['settings', s]),
  ...['overzicht', 'boerderij', 'bedrijven', 'tekoop', 'snack', 'club'].map((s) => ['boerderij', s]),
  ...['toetsen', 'knoppen', 'overzicht', 'aanraken', 'hulp'].map((s) => ['controls', s]),
];
const pauseScreens = PAUSE_TABS.map(([tab, sub]) => ({
  id: 'pauze-' + tab + (sub ? '-' + sub : ''), module: 'pausemenu.js', categorie: 'menu', titel: 'Pauzemenu: ' + (TITLES[tab] || tab) + (sub ? ' > ' + sub : ''),
  root: '#pause-menu', wait: 1200, setup: pm(tab, sub ? JSON.stringify({ sub }) : '{}'),
}));

// Kleine schermen: elk een eigen kaart of paneel. Opener-functies geven een belofte die op de speler wacht; die wachten we niet af.
const sc = (id, module, categorie, titel, setup, extra = {}) => ({ id, module, categorie, titel, setup, ...extra });
const fromIndex = (sel) => `
  const idx = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
  const nodeEl = idx.querySelector(${JSON.stringify(sel)});
  ctx.body.appendChild(document.importNode(nodeEl, true));`;

const cardSpecs = (kinds) => `
  const HC = await ctx.imp('hudcards');
  const w = makeWorld();
  HC.initCards(w, ctx.hud);
  for (const spec of ${JSON.stringify(kinds)}) HC.showCard(w, spec);
  for (let i = 0; i < 30; i++) { HC.updateCards(0.1, w); await ctx.wait(30); }`;

const smallScreens = [
  sc('laadscherm-boot', 'startscreen.js', 'menu', 'Laadscherm bij het opstarten', `${fromIndex('#loading')}
    const SS = await ctx.imp('startscreen'); SS.initLoading(); SS.setLoadingStatus('Grunn wordt wakker');`, { root: '#loading' }),
  sc('startscherm', 'startscreen.js', 'menu', 'Startscherm (hoofdmenu)', `${fromIndex('#start-screen')}
    const root = document.getElementById('start-screen'); root.classList.add('on', 'visible');
    const nav = root.querySelector('.ss-menu');
    nav.innerHTML = ['Doorgaan', 'Nieuw spel', 'Samen spelen', 'Instellingen', 'Over GDE'].map((t, i) => '<button type="button" class="m-bp ss-item' + (i ? '' : ' primary') + '" role="menuitem">' + t + '</button>').join('');`, { root: '#start-screen' }),
  sc('quit-bevestigen', 'quitconfirmui.js', 'menu', 'Afsluiten bevestigen', `(await ctx.imp('quitconfirmui')).askQuitConfirm({});`, { root: '#quit-confirm' }),
  sc('legacy-save-kaart', 'legacysavecardui.js', 'menu', 'Oude save: doorgaan of nieuw', `(await ctx.imp('legacysavecardui')).askLegacyCard({});`, { root: '#legacy-save-card' }),
  sc('moeilijkheid-kaart', 'difficultyui.js', 'menu', 'Moeilijkheid kiezen', `(await ctx.imp('difficultyui')).openDifficultyCard({});`, { root: '#online-start' }),
  sc('startkeuze', 'launchchoiceui.js', 'menu', 'Alleen of samen spelen', `(await ctx.imp('launchchoiceui')).openLaunchChoice({});`, { root: '#online-start' }),
  sc('toestemming-samen', 'launchchoiceui.js', 'menu', 'Toestemming voor Samen spelen', `(await ctx.imp('launchchoiceui')).openToestemming({});`, { root: '#online-start' }),
  sc('online-start', 'onlineconsentui.js', 'menu', 'Samen spelen starten (naam en toestemming)', `(await ctx.imp('onlineconsentui')).openOnlineStart({ naam: 'Tammo' });`, { root: '#online-start' }),
  sc('saveslots-start', 'saveslotsui.js', 'menu', 'Savevakken (startscherm)', `(await ctx.imp('saveslotsui')).openSaveSlots({ mode: 'start' });`, { root: '#saveslots' }),
  sc('saveslots-game', 'saveslotsui.js', 'menu', 'Savevakken (in het spel)', `(await ctx.imp('saveslotsui')).openSaveSlots({ mode: 'game', world: makeWorld() });`, { root: '#saveslots' }),
  sc('benchmark-keuze', 'benchmarkui.js', 'menu', 'Prestatietest: keuze', `(await ctx.imp('benchmarkui')).showBenchmarkChoice({ preset: 'hoog', presetLabel: 'Hoog' });`),
  sc('samenhub', 'samenhubui.js', 'menu', 'Samen spelen: hub (waar, hoe)', `const h = await ctx.imp('samenhubui'); h.mountSamenHub(ctx.stage, {});`),
  sc('lobby', 'lobbyui.js', 'menu', 'Samen spelen: lobby', `const L = await ctx.imp('lobbyui'); L.mountLobby(ctx.stage, {}, {});`),
  sc('onlineinstelling', 'onlineconsentui.js', 'menu', 'Online-instelling (toestemming)', `(await ctx.imp('onlineconsentui')).mountOnlineInstelling(ctx.stage, { world: makeWorld() });`),
  sc('reis-vraag', 'reispanel.js', 'menu', 'Reisvraag (trein of bus)', `const R = await ctx.imp('reispanel'); R.askTravel({ from: 'Groningen', to: 'Leeuwarden', kind: 'trein' });`),
  sc('coop-overlay', 'coopoverlay.js', 'menu', 'Samen spelen: melding met knoppen', `(await ctx.imp('coopoverlay')).mountOverlay({ title: 'Verbinding weg', text: 'De host is weggevallen. Wil je het spel overnemen?', buttons: [{ id: 'ja', label: 'Ja, overnemen' }, { id: 'nee', label: 'Nee' }], label: 'Melding' });`),

  sc('kaart-naamkaart', 'namecard.js', 'kaarten', 'Naamkaart bij een ontmoeting', `const N = await ctx.imp('namecard'); const keys = Object.keys((await ctx.imp('characters')).CHARACTERS || {}); N.showNameCard(keys[0], { force: true });`),
  sc('kaart-pitch', 'pitchcard.js', 'kaarten', 'Standplaatskaart (vergunning)', `const P = await ctx.imp('pitchcard'); ctx.stage.innerHTML = '<div class="m-pane">' + P.spotCardHtml({ id: 1, status: 'vrij', price: 450, place: 'Vismarkt', foot: 1.2, ask: 900, renew: 200, daysLeft: 12, claim: null }, { money: 1840 }) + '</div>';`),
  sc('kaart-tekoop', 'forsalecard.js', 'kaarten', 'Te-koopkaart (land)', `const F = await ctx.imp('forsalecard'); ctx.stage.innerHTML = '<div class="m-pane">' + F.offerCardHtml({ id: 1, parcel: { kind: 'w' }, kindName: 'Weiland', soilWord: 'goed', ha: 12.4, price: 98000, sellValue: 73500, soil: 0.7, access: 'weg', place: 'Haren', seller: 'Familie Wiersma', mine: false, claim: null }, { money: 1840 }) + '</div>';`),
  sc('kaart-meldingen', 'hudcards.js', 'kaarten', 'Meldingskaarten (missie, tip, nieuws)', cardSpecs([
    { kind: 'missie', title: 'Verhuisdag', body: 'Breng de bank naar de derde verdieping.', duration: 30 },
    { kind: 'tip', title: 'Tip', body: 'Druk op E om in te stappen.', duration: 30 },
    { kind: 'bijbaan', title: 'Bijbaantje', body: 'Bezorg drie pakketten voor 18:00.', duration: 30 },
    { kind: 'geld', title: 'Geld', body: 'Je kreeg 120 euro fooi.', duration: 30 },
  ]), { root: '#hud' }),
  sc('kaart-meldingen-gevaar', 'hudcards.js', 'kaarten', 'Meldingskaarten (politie, gevaar, prestatie)', cardSpecs([
    { kind: 'politie', title: 'Politie', body: 'Een agent heeft je gezien.', duration: 30 },
    { kind: 'gevaar', title: 'Let op', body: 'Het water staat hoog bij de brug.', duration: 30 },
    { kind: 'prestatie', title: 'Prestatie', body: 'Eerste snackwagen gekocht.', duration: 30 },
  ]), { root: '#hud' }),
  sc('kaart-meldingen-lang', 'hudcards.js', 'kaarten', 'Meldingskaart met lange tekst', cardSpecs([
    { kind: 'missie', title: 'Een heel lange missietitel die over meerdere regels moet lopen zonder af te kappen', body: 'Een lange uitleg van de opdracht, met veel woorden, zodat te zien is hoe de kaart omgaat met tekstmassa in een smalle kolom aan de rand van het scherm.', duration: 30 },
  ]), { root: '#hud' }),
  sc('kaart-bigmoment', 'bigmoment.js', 'kaarten', 'Groot moment (missie geslaagd)', `const B = await ctx.imp('bigmoment'); B.showBigMoment({ soort: 'geslaagd', titel: 'Opdracht geslaagd', regel: 'Verhuisdag', beloning: 450 });`),
  sc('kaart-bigmoment-mislukt', 'bigmoment.js', 'kaarten', 'Groot moment (mislukt)', `(await ctx.imp('bigmoment')).showBigMoment({ soort: 'mislukt', titel: 'Opdracht mislukt', regelNl: 'Probeer het nog eens.' });`),
  sc('kaart-bigmoment-opgepakt', 'bigmoment.js', 'kaarten', 'Groot moment (opgepakt)', `(await ctx.imp('bigmoment')).showBigMoment({ soort: 'opgepakt', beloning: 250 });`),
  sc('kaart-bigmoment-gebied', 'bigmoment.js', 'kaarten', 'Groot moment (nieuw gebied)', `(await ctx.imp('bigmoment')).showBigMoment({ soort: 'gebied', titel: 'Vismarkt' });`),
  sc('kaart-kaartuitleg', 'kaartactieui.js', 'kaarten', 'Kaart: zo werkt de kaart', `const K = await ctx.imp('kaartactieui'); ctx.stage.innerHTML = K.uitlegHtml({ gast: false });`),
  sc('kaart-kaartuitleg-gast', 'kaartactieui.js', 'kaarten', 'Kaart: uitleg voor een gast', `const K = await ctx.imp('kaartactieui'); ctx.stage.innerHTML = K.uitlegHtml({ gast: true });`),
  sc('kaart-reispopup', 'kaartactieui.js', 'kaarten', 'Kaart: reis erheen', `const K = await ctx.imp('kaartactieui'); ctx.stage.innerHTML = K.reisPopupHtml({ naam: 'Station Groningen', afstand: '3,2 km', gekozen: 'trein', rijen: [{ id: 'trein', label: 'Trein', kosten: 12, duur: '6 min', toets: '1' }, { id: 'bus', label: 'Bus', kosten: 4, duur: '14 min', toets: '2' }], reis: { label: 'Reis nu' } });`),
  sc('kaart-foutmelding', 'fouttoast.js', 'kaarten', 'Foutmelding (kopieer foutrapport)', `(await ctx.imp('fouttoast')).showFrameError(new Error('Voorbeeldfout voor het harnas'));`),
  sc('kaart-heist-plan', 'heistui.js', 'kaarten', 'Heistplan', `const H = await ctx.imp('heistui'); H.showPlan({ title: 'De Zilvervloot', steps: ['Kijk rond', 'Open het slot', 'Pak de buit'], text: 'Eerst verkennen.' });`),
  sc('kaart-heist-notitie', 'heistui.js', 'kaarten', 'Heist: notitie', `(await ctx.imp('heistui')).showNote('Het kussen is leeg.');`),

  sc('hud-hoofd', 'hud_panel.js', 'hud', 'Hoofd-HUD (rijden, geld, tijd)', `const H = await ctx.imp('hud_panel'); const w = makeWorld(); H.initHud(w); w.money = 1840; w.player.vehicle = null; for (let i = 0; i < 5; i++) { try { H.updateHud(0.016, w); } catch (e) { window.__hudNoot = String(e.message); /* de minikaart heeft een echte kaart nodig; de rest van het HUD is dan al bijgewerkt */ } await ctx.wait(60); }`, { root: '#hud' }),
  sc('hud-prompts', 'prompts.js', 'hud', 'Contextuele hints (toetsen)', `const P = await ctx.imp('prompts'); const w = makeWorld(); P.initPrompts(ctx.hud); for (let i = 0; i < 5; i++) { P.updatePrompts(0.05, w); await ctx.wait(40); }`, { root: '#hud' }),
  sc('hud-sim', 'simhud.js', 'hud', 'Simulatie-HUD (stappen en cijfers)', `const S = await ctx.imp('simhud'); ctx.stage.innerHTML = '<div class="sim-hud">' + S.simHudHtml({ titel: 'Brood bakken', primair: { icoon: 'klok', waarde: '02:15', naam: 'Tijd' }, cijfers: [{ label: 'Geld', waarde: 'EUR 40' }], stappen: [{ tekst: 'Deeg', stand: 'klaar' }, { tekst: 'Oven', stand: 'nu' }, { tekst: 'Verkopen', stand: 'straks' }] }) + '</div>';`),
  sc('hud-golf', 'golfhud.js', 'hud', 'Golf: scoretabel', `const G = await ctx.imp('golfhud'); ctx.stage.innerHTML = '<div class="golf-hud">' + G.scoreTabel({ spelers: [{ naam: 'Tammo', cellen: [{ t: '3', cls: 'good' }, { t: '4', cls: 'bad' }], totaal: '7', aanDeBeurt: true }, { naam: 'Tessa', cellen: [{ t: '4', cls: 'bad' }, { t: '-', cls: 'leeg' }], totaal: '4' }], nummers: [1, 2], huidigeBaan: 1 }) + '</div>';`),

  sc('winkel-snackbar', 'shopui.js', 'winkels', 'Winkel: snackbar', `const S = await ctx.imp('shopui'); const SH = await ctx.imp('shops'); const w = makeWorld(); S.initShopUi(w); SH.openShopFromInterior(w, { id: 's1', name: 'Frituur De Gouden Friet', type: 'snack', tagline: 'Altijd vers', x: 0, z: 0 });`, { root: '#shop-menu' }),
  sc('winkel-kleding', 'shopui.js', 'winkels', 'Winkel: kleding', `const S = await ctx.imp('shopui'); const SH = await ctx.imp('shops'); const w = makeWorld(); S.initShopUi(w); SH.openShopFromInterior(w, { id: 's2', name: 'Mode aan de Diepenring', type: 'kleding', tagline: '', x: 0, z: 0 });`, { root: '#shop-menu' }),
  sc('winkel-wapens', 'shopui.js', 'winkels', 'Winkel: wapens', `const S = await ctx.imp('shopui'); const SH = await ctx.imp('shops'); const w = makeWorld(); S.initShopUi(w); SH.openShopFromInterior(w, { id: 's3', name: 'Jachtwinkel Noord', type: 'wapens', tagline: '', x: 0, z: 0 });`, { root: '#shop-menu' }),
  sc('winkel-voertuigen', 'shopui.js', 'winkels', 'Winkel: voertuigen', `const S = await ctx.imp('shopui'); const SH = await ctx.imp('shops'); const w = makeWorld(); S.initShopUi(w); SH.openShopFromInterior(w, { id: 's4', name: 'Autohandel Hoogkerk', type: 'auto', tagline: '', x: 0, z: 0 });`, { root: '#shop-menu' }),
];

export const SCREENS = [
  ...pauseScreens,
  ...smallScreens,
];
