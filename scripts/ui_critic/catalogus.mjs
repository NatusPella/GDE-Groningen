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
  const PM = await ctx.imp('pausemenu');
  const w = makeWorld();
  PM.initPauseMenu(w);
  PM.openPauseMenu(${JSON.stringify(tab)}, ${opts});
  await ctx.wait(900);
`;

export const SCREENS = [
  { id: 'pauze-spel', module: 'pausemenu.js', categorie: 'menu', titel: 'Pauzemenu: Spel (overzicht)', root: '#pause-menu', setup: pm('spel') },
];
