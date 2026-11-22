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
      money: 1840, player: { x: 120, y: 0, z: -340, heading: 0.4, hp: 100, stamina: 80, inVehicle: null, vehicle: null, speed: 0 },
      input: { reset: noop, keys: {}, pressed: () => false, canLock: () => false },
      time: 13.5, day: 14, weather: 'zon', paused: false, wanted: 0, heat: 0, hp: 100,
      missions: { active: null, done: [], list: [] }, flags: {}, stats: {}, inventory: {}, items: {},
      addMessage: noop, say: noop, notify: noop, toast: noop,
      pigeonActions: null, pigeonMode: false, safetyActions: null, sideJobActions: null, homeActions: null,
      coopNet: null, coopSpelers: [], coopRole: 'solo', menuMuffle: false, uiPaused: false, kissUnlocked: false,
      map: { size: 4000, buildings: [], roads: [], places: [] }, vehicles: [], npcs: [], garage: [],
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

export const SCREENS = [
  ...pauseScreens,
];
