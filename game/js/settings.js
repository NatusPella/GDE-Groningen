import { normalizeKeyBinds, normalizePadBinds } from './controls.js';
import { migrateSettings, SETTINGS_VERSION } from './savemigrate.js';
import { VIEW_DISTANCES } from './viewdist.js';
import { KEYS } from './storagekeys.js';
import { WORLD_COLOR_MODES } from './worldcolormode.js';
import { FLAGS } from './devflags.js';
import { RAGE_CHOICES } from './roadragerules.js';
import { SUBTITLE_CONTRASTS, TEXT_SIZES, SHAKE_STANDEN, SUBTITLE_VLAKKEN } from './a11ylogic.js';
import { TAP_MODES } from './holdlatch.js';
import { cleanHelpSetting } from './assist.js';
import { cleanDifficulty, setActiveDifficulty, setActiveLevel, onDifficultyChange, toggleChoice } from './difficulty.js';
import { READING_TIME_CHOICES } from './cardtime.js';
import { deckDefaults, isSteamDeck } from './deck.js';
import { cleanRemembered } from './radiovehicle.js';
import { VOLUME_KEYS, normalizeVolumes, volumeValue } from './sfx/volume.js';
import { DRUNK_FX_CHOICES, RUMBLE_STRENGTH_RANGE } from './settingsrules.js';

// Player settings, persisted per browser. Modules read getSettings() and
// subscribe with onSettingsChange() to apply changes live.

const STORAGE_KEY = KEYS.settings;

export const QUALITY_PRESETS = {
  laag: { pixelRatio: 1, shadows: true, shadowMapSize: 1024 },
  middel: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024 },
  // #804: op een Retina-scherm (dpr 2) rendert hoog anders op 2x de volle
  // schermresolutie; de M1 haalde dat niet. 1,5x scheelt 44% pixels en is op
  // dpr 1 (min met dpr) gelijk aan eerst.
  hoog: { pixelRatio: 1.5, shadows: true, shadowMapSize: 2048 },
};

const BASE_DEFAULTS = {
  // de radiozender die de speler per voertuigsoort koos (radiovehicle.js, #988): { boer: 'wierde', ... }; hoort bij dit apparaat en niet bij de save
  radioVehicle: {},
  ritCamera: 'cabine', // de camera van de taxi- en treinrit (C of Y tijdens de rit): cabine, achter, zij of boven; lokaal per speler (ritpad.js)
  masterVolume: 1,
  musicVolume: 1,
  footballMusic: true,       // de fasemuziek tijdens voetbal (footballmusic.js); lokaal per speler
  footballMusicVolume: 0.8,
  sfxVolume: 0.75,
  voiceVolume: 1,
  brightness: 1,
  uiScale: 1,
  quality: 'hoog',
  shadows: true,
  fov: 64,
  cameraDistance: 1,
  showMinimap: true,
  // shift+klik op de kaart verplaatst je naar die plek (kaartteleport.js)
  mapShiftTeleport: true,
  showHints: true,
  // live bussen (livebussen.js + buslive.js, #395): standaard aan, zoals de andere opties; de speler
  // zet het uit onder Instellingen, Spel. Alleen publieke buslocaties ophalen, niets van de speler
  // versturen; zonder bron of met de optie uit rijden de bussen hun eigen dienst.
  liveBussen: true,
  // live treinen (livetrains.js + trainlive.js, #1085): een eigen schakelaar naast de bussen (de feed is ca. 1 MB per
  // minuut op de lijn); standaard aan. Alleen publieke vertragingen ophalen, niets van de speler versturen; uit of zonder
  // bron toont het bord het rooster zonder vertraging.
  liveTreinen: true,
  // Start binnen (thuis) (spawnbinnen.js, 22-11): verschijn je bij je thuis (laden van een save bij het huis, Naar huis), dan sta je binnen in de woning
  // in plaats van voor de deur; uit = zoals voorheen voor de deur. Lokaal per speler. Een oud bestand zonder de sleutel valt op deze standaard terug.
  startBinnen: true,
  // which glyphs every hint shows: 'auto' (what you used last), 'keys' or 'pad'
  hintSource: 'auto',
  // touch buttons: 'auto' (on a touch device), 'aan' or 'uit' (touchlogic.js)
  touchControls: 'auto',
  // HUD: 'slim' (default: only what matters now), 'alles', 'minimaal' (hudrules.js)
  hudMode: 'slim',
  // minimap: zoom factor and north-up ('nooit', 'lucht' only flying, 'altijd')
  minimapZoom: 1,
  minimapNorth: 'lucht',
  // short tip cards for new players (onboarding.js)
  onboardingTips: true,
  // uitleg met iconen en animatie (uitleg.js, #989): uit = de oude tekstregels; per uitleg een 'niet meer tonen'-vlag in gde-uitleg-niet-meer
  uitlegIconen: true,
  // quicktime-events (qte.js, #962): 'normaal', 'makkelijk' (standaard: langere tijd, minder drukken, een poging extra) of 'overslaan'; per speler, dus per apparaat
  qteStand: 'makkelijk',
  // leestijd van tip- en uitlegkaarten (#801): 'normaal', 'ruim' of 'geen'
  // (bij 'geen' wacht een belangrijke kaart op een klik of Enter; zie cardtime.js)
  readingTime: 'normaal',
  reduceMotion: false,
  // Rustig drukwerk (#992, ADR 0040): geen misdruk, schuinte, raster of stempelbeweging, tekst minstens 7:1;
  // zet html.rustig-drukwerk (motion.js). Standaard aan op de Steam Deck (deck.js). Een oud bestand zonder
  // de sleutel valt op deze standaard terug, dus een versiesprong in savemigrate.js is niet nodig.
  rustigDrukwerk: false,
  // Wereldkleur (worldgrade.js, 21-11): 'uit', 'subtiel' of 'drukwerk'; lokaal per speler (bij Samen spelen niet gesynchroniseerd). De materiaalkleuren
  // gaan in na een herstart, licht en nabewerking meteen. Een oud bestand zonder de sleutel valt op de standaard terug.
  worldColor: 'subtiel',
  // instap- en uitstapanimatie (#459): uit = meteen op je stoel, zonder deur open en
  // dicht en zonder de loop- en zitbeweging (Instellingen, Toegankelijkheid)
  stapAnimatie: true,
  showFog: true,
  cinematicMoments: true,
  // terugkeerscène (#986 #987): na Doorgaan een korte flatscène van Tammo en Tessa (terugkeerrun.js); standaard aan
  terugkeerScene: true,
  gore: true,
  // Cheats in het menu (settingsrules.js cheatsVisible, 22-11): uit tot de speler het zelf aanzet (Spelregels); in dev altijd. Lokaal per speler.
  // Zichtafstand (viewdist.js): 'normaal' (350 m, met de goedkope verre laag en zachte mist) hoort bij de voorinstelling die de speler
  // als Hoog ziet (de sleutel heet nog 'vlot'). De adaptieve kwaliteit zakt op een zwakke machine zelf terug (viewDistanceFor);
  // de speler kan in de instellingen naar 'heelver' (Ultra) of terug naar 'kort'.
  drawDistance: 'normaal',
  // Automatisch gekozen stand (gfxprofile.js measureAutoPreset, besluit eigenaar 23-11): '<versie>:<preset>' na de meting bij de eerste
  // start of na Opnieuw meten; '' voor wie nooit automatisch gekozen kreeg (bestaande spelers houden zo hun eigen keuze)
  gfxAuto: '',
  // render scale (1 = full); autoResolution lowers it and some detail while
  // frames are slow (gfxprofile.js)
  resolution: 1,
  autoResolution: true,
  // zuinige modus (framecap.js): 30 beelden per seconde, voor batterij en warmte
  zuinig: false,
  mouseSensitivity: 1,
  // stuurgevoeligheid van voertuigen (#801): 0.5 (zacht) tot 1.5 (fel)
  steerSensitivity: 1,
  invertY: false,
  // eerste persoon (#833): de speelcamera op de ogen van het eigen figuur in plaats van de
  // volgcam (C in de app, G in de browser; ook onder Instellingen > Camera in het pauzemenu)
  firstPersoon: false,
  autoAim: true,
  drunkFx: 'aan',
  // verkeersruzie (roadrage.js): hoe vaak boze bestuurders uitstappen; 'uit', 'weinig', 'normaal' of 'veel'
  ruzie: 'normaal',
  // driving (gearbox.js, drift.js): 'auto' | 'manual' | 'clutch'; the arcade helps are on by default
  shiftMode: 'auto',
  // game feel (gamefeel.js, #216): the speed FOV and the short hit-stop; also off with reduceMotion
  speedFeel: true,
  driftAssist: true,
  bikeAssist: true,
  // controls (controls.js): rebound keyboard keys and controller buttons,
  // only the changed ones; the rest of the controller and accessibility
  keyBinds: {},
  padBinds: {},
  padLayout: 'auto',
  padLookSensitivity: 1,
  rumble: true,
  // sterkte van het trillen (haptics.js): 0.5 zacht, 1 normaal, 1.4 sterk
  rumbleStrength: 1,
  subtitleSize: 'normaal',
  subtitleBox: false,
  // #985: gesproken ondertitels aan of uit. De geluidscaptions ([sirene], [claxon]) hebben hun
  // eigen schakelaar eronder: dit gaat over wat er gezegd wordt, niet over wat je hoort.
  showSubtitles: true,
  // [sirene], [claxon]...: korte tekst bij belangrijke geluiden (soundcaptions.js)
  soundCaptions: false,
  // schermnarratie (#802): statuswijzigingen (doel, gezondheid, politie, plaats) in een aria-live-regio
  screenNarration: false,
  // ondertitels op wit-op-zwart met een zwaardere letter ('normaal' | 'hoog'), kaart- en meldingstekst ('normaal' | 'groot' | 'extragroot') en geen schermflitsen (a11y.js)
  subtitleContrast: 'normaal',
  textSize: 'normaal',
  reduceFlash: false,
  // 21-11, toegankelijkheid; alles lokaal per speler en nooit over het net (Samen spelen). Een oud bestand zonder deze sleutels valt op de
  // standaard terug, dus een versiesprong in savemigrate.js is niet nodig (settings_toegankelijk_test.mjs).
  // schermschudden: 'aan', 'minder' of 'uit' (a11ylogic.js SHAKE_STANDEN); Beweging beperken zet het ook uit
  screenShake: 'aan',
  // het vak achter de ondertitels: 'vol', 'zacht' of 'licht' (a11ylogic.js SUBTITLE_VLAKKEN); alleen met "Donker vlak erachter"
  subtitleVlak: 'vol',
  // vormen bij kleur: wantedsterren met cijfer en een duidelijker vorm, ook zonder kleurenblindmodus (a11ylogic.js vormenAan)
  markerVormen: false,
  // tik in plaats van ingedrukt houden: 'uit', 'rennen', 'richten' of 'beide' (holdlatch.js)
  tikStand: 'uit',
  // hulp (assist.js, #215): meer tijd, minder voertuigschade, ruimere vliegpoorten, en het aanbod na twee mislukkingen
  helpTime: 'uit',
  helpDamage: 'normaal',
  helpGates: 'normaal',
  helpOffer: true,
  // moeilijkheid (#800): 'ontspannen', 'standaard' of 'uitdagend'; Standaard is exact het huidige
  // gedrag. De factoren staan in difficulty.js, de startkaart en de activiteiten lezen deze stand.
  difficulty: 'standaard',
  colorBlind: 'uit',
  // online-avatar voor Samen spelen (#455): de naam en kleur die anderen van
  // jou zien. Per apparaat bewaard, in de gewone instellingen; leeg = de naam
  // van je figuur.
  onlineNaam: '',
  onlineKleur: '#4fb3ff',
  // Consent for Samen spelen (#528, ADR 0022): null = never asked, true = wants to
  // play with others, false = a private session for one. Null must never read as
  // "yes": it means the game still has to ask, and asks before any contact.
  onlineMeedoen: null,
  // Samen spelen (#1159): snelle zinnen, emotes en gedeelde doelen versturen en zien. Opt-in: alleen een echte true telt (coopzinnen.js).
  samenZinnen: false,
  // Alleen of Samen bij de start (launchchoice.js): alleen de voorselectie van de keuzekaart, nooit een reden om de kaart over te slaan.
  startKeuze: null,
  // De laatste rol bij Samen spelen (samenkeuze.js): alleen de voorselectie van Een spel openen / Meedoen / Openbare sessies.
  samenRol: null,
  // Samen spelen (#526): dit apparaat koos "Niet meer vragen" op het
  // toestemmingsscherm. Alleen de keuze van het scherm; zonder dit vinkje komt
  // de vraag één keer per sessie en gaat er niets naar buiten voor het akkoord.
  multiplayerConsentRemembered: false,
  // unused since the attract intro plays at every launch; kept so old
  // settings files load unchanged
  attractSeen: false,
};
// on the Steam Deck the first start has bigger text and controller hints (deck.js); the player's own choices win
const DEFAULTS = { ...BASE_DEFAULTS, ...deckDefaults(isSteamDeck()) };
// the Besturing screen has its own "Standaard herstellen" for the bindings; the
// consent for Samen spelen survives too, because resetting preferences is not
// withdrawing a permission (#528, ADR 0022)
// Wat "Standaard herstellen" niet mag wissen: de identity van de speler in Samen spelen hoort
// bij elkaar. `onlineMeedoen` en `onlineNaam` stonden er al, maar `onlineKleur` en
// `multiplayerConsentRemembered` niet: na een herstel vroeg het spel opnieuw om toestemming
// terwijl het antwoord bewaard bleef, en je kleur sprong terug (#985 punt 6).
// #1169: de moeilijkheid hoort bij de save, niet bij de voorkeuren van het apparaat: herstellen zet hem niet terug.
const KEEP_ON_RESET = new Set(['difficulty', 'attractSeen', 'keyBinds', 'padBinds', 'onlineMeedoen', 'samenZinnen', 'onlineNaam', 'onlineKleur', 'multiplayerConsentRemembered']);
const SHIFT_CHOICES = ['auto', 'manual', 'clutch'];
// eigen sleutels, geen in-operator: "toString" of "constructor" uit een met de hand bewerkt bestand is geen keuze (review 22-11)
const hasKey = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
export const SUBTITLE_SIZES = { klein: 0.85, normaal: 1, groot: 1.25, extragroot: 1.5 };
export const COLOR_BLIND_MODES = ['uit', 'deuteranopie', 'protanopie', 'tritanopie'];
const PAD_LAYOUT_CHOICES = ['auto', 'xbox', 'ps', 'switch', 'deck'];
const HINT_SOURCE_CHOICES = ['auto', 'keys', 'pad'];
const TOUCH_CONTROLS_CHOICES = ['auto', 'aan', 'uit'];

// #578: een instellingenbestand uit een nieuwere versie blijft van die versie. Onbekende sleutels en een
// hogere `v` worden bewaard, zodat een downgrade niets van de nieuwere build weggooit en die build niet
// opnieuw vanaf de oude versie hoeft te migreren.
let storedVersion = SETTINGS_VERSION;
const newerExtras = {};

// 22-11: de naam die anderen van je zien: geen stuurtekens of haakjes, spaties samengevoegd, hoogstens 16 tekens
export const cleanOnlineNaam = (v) => String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 16).trim();

function load() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // older files run through the migrations (savemigrate.js) and are written
    // back once; a file from a newer game is read as it is
    const parsed = JSON.parse(stored || '{}');
    const mig = migrateSettings(parsed);
    const raw = mig ? mig.data : parsed;
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (typeof raw[k] === typeof DEFAULTS[k]) out[k] = raw[k];
    }
    // the four volumes always land in 0..1, a numeric string counts as its
    // number (#461: a saved 10% must not fall back to 100% or play above it)
    Object.assign(out, normalizeVolumes(raw, DEFAULTS));
    if (!hasKey(QUALITY_PRESETS, out.quality)) out.quality = DEFAULTS.quality;
    if (!hasKey(VIEW_DISTANCES, out.drawDistance)) out.drawDistance = DEFAULTS.drawDistance;
    if (!isValidSetting('gfxAuto', out.gfxAuto)) out.gfxAuto = DEFAULTS.gfxAuto;
    if (!(out.resolution >= 0.5 && out.resolution <= 1)) out.resolution = DEFAULTS.resolution;
    out.keyBinds = normalizeKeyBinds(out.keyBinds);
    out.padBinds = normalizePadBinds(out.padBinds);
    if (!SUBTITLE_CONTRASTS.includes(out.subtitleContrast)) out.subtitleContrast = DEFAULTS.subtitleContrast;
    if (!hasKey(TEXT_SIZES, out.textSize)) out.textSize = DEFAULTS.textSize;
    if (!hasKey(SHAKE_STANDEN, out.screenShake)) out.screenShake = DEFAULTS.screenShake;
    if (!hasKey(SUBTITLE_VLAKKEN, out.subtitleVlak)) out.subtitleVlak = DEFAULTS.subtitleVlak;
    if (!TAP_MODES.includes(out.tikStand)) out.tikStand = DEFAULTS.tikStand;
    if (!hasKey(SUBTITLE_SIZES, out.subtitleSize)) out.subtitleSize = DEFAULTS.subtitleSize;
    if (typeof out.showSubtitles !== 'boolean') out.showSubtitles = DEFAULTS.showSubtitles;
    if (!['slim', 'alles', 'minimaal'].includes(out.hudMode)) out.hudMode = DEFAULTS.hudMode;
    if (!['nooit', 'lucht', 'altijd'].includes(out.minimapNorth)) out.minimapNorth = DEFAULTS.minimapNorth;
    if (!(out.minimapZoom >= 0.6 && out.minimapZoom <= 1.6)) out.minimapZoom = DEFAULTS.minimapZoom;
    if (!SHIFT_CHOICES.includes(out.shiftMode)) out.shiftMode = DEFAULTS.shiftMode;
    if (!RAGE_CHOICES.includes(out.ruzie)) out.ruzie = DEFAULTS.ruzie;
    for (const k of ['helpTime', 'helpDamage', 'helpGates']) out[k] = cleanHelpSetting(k, out[k]);
    out.difficulty = cleanDifficulty(out.difficulty); // #800: onbekend of kapot valt terug op standaard
    if (!['cabine', 'achter', 'zij', 'boven'].includes(out.ritCamera)) out.ritCamera = DEFAULTS.ritCamera;
    out.radioVehicle = cleanRemembered(raw.radioVehicle); // een ontbrekende of kapotte waarde wordt leeg: elke soort valt dan terug op zijn eigen zender
    if (!COLOR_BLIND_MODES.includes(out.colorBlind)) out.colorBlind = DEFAULTS.colorBlind;
    if (!WORLD_COLOR_MODES.includes(out.worldColor)) out.worldColor = DEFAULTS.worldColor;
    if (!PAD_LAYOUT_CHOICES.includes(out.padLayout)) out.padLayout = DEFAULTS.padLayout;
    if (!HINT_SOURCE_CHOICES.includes(out.hintSource)) out.hintSource = DEFAULTS.hintSource;
    if (!TOUCH_CONTROLS_CHOICES.includes(out.touchControls)) out.touchControls = DEFAULTS.touchControls;
    if (!READING_TIME_CHOICES.includes(out.readingTime)) out.readingTime = DEFAULTS.readingTime;
    if (!['normaal', 'makkelijk', 'overslaan'].includes(out.qteStand)) out.qteStand = DEFAULTS.qteStand;
    if (!(out.steerSensitivity >= 0.5 && out.steerSensitivity <= 1.5)) out.steerSensitivity = DEFAULTS.steerSensitivity;
    // de schuiven in het pauzemenu (pausemenu.js): een getal ver daarbuiten (een handmatig aangepast bestand) valt terug op de standaard
    for (const [k, lo, hi] of [['brightness', 0.6, 1.6], ['uiScale', 0.8, 1.5], ['fov', 50, 90], ['cameraDistance', 0.8, 1.6], ['mouseSensitivity', 0.3, 2.5]]) {
      if (!(out[k] >= lo && out[k] <= hi)) out[k] = DEFAULTS[k];
    }
    // de online-avatar (#455): een kleur blijft een kleur, anders de standaard
    if (!/^#[0-9a-f]{6}$/i.test(out.onlineKleur)) out.onlineKleur = DEFAULTS.onlineKleur;
    out.onlineNaam = cleanOnlineNaam(out.onlineNaam);
    // toestemming voor Samen spelen (#528, ADR 0022): alleen een echte ja of nee telt.
    // De lus hierboven kopieert geen null (typeof null is 'object'), dus dit moet apart:
    // ontbrekend, null, "true", 1 of wat dan ook wordt null en dus "nog nooit gevraagd".
    out.onlineMeedoen = raw.onlineMeedoen === true ? true : raw.onlineMeedoen === false ? false : null;
    out.samenZinnen = raw.samenZinnen === true;
    out.startKeuze = raw.startKeuze === 'alleen' || raw.startKeuze === 'samen' ? raw.startKeuze : null; // alleen de voorselectie van de startkaart
    out.samenRol = raw.samenRol === 'host' || raw.samenRol === 'gast' || raw.samenRol === 'lijst' ? raw.samenRol : null; // alleen de voorselectie van de sessiekeuze
    if (!(out.padLookSensitivity >= 0.3 && out.padLookSensitivity <= 2.5)) out.padLookSensitivity = DEFAULTS.padLookSensitivity;
    // 22-11: ook deze twee werden niet gecontroleerd; een handmatig bestand met drunkFx "zzz" of rumbleStrength 1e9 bleef gewoon staan
    delete out.cheatsTonen; // 22-11: Cheats is vrijspeelbaar in het verhaal, geen instelling meer; een oud bestand met deze sleutel wordt opgeschoond en laat niets zien
    if (!DRUNK_FX_CHOICES.includes(out.drunkFx)) out.drunkFx = DEFAULTS.drunkFx;
    if (!(out.rumbleStrength >= RUMBLE_STRENGTH_RANGE[0] && out.rumbleStrength <= RUMBLE_STRENGTH_RANGE[1])) out.rumbleStrength = DEFAULTS.rumbleStrength;
    if (stored && mig && mig.from < SETTINGS_VERSION) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...out, v: SETTINGS_VERSION })); } catch (e) { /* ignore */ }
    }
    // #578: een nieuwer bestand wordt niet teruggezet: bewaar de hogere versie en de sleutels die deze
    // build niet kent, zodat de eerste wijziging ze niet weggooit.
    // #781: hetzelfde geldt voor een sleutel die deze build wél kent maar die in de nieuwere versie van
    // type is veranderd: die kan deze build niet gebruiken (hij valt terug op zijn oude default), maar
    // die default mag de nieuwere waarde niet overschrijven, anders vindt de nieuwere build zijn eigen
    // stand niet terug terwijl `v` al hoog staat.
    if (!mig && parsed && Number.isInteger(parsed.v) && parsed.v > SETTINGS_VERSION) {
      storedVersion = parsed.v;
      for (const [k, v] of Object.entries(parsed)) {
        if (k === 'v') continue;
        const bekend = k in DEFAULTS;
        // #781: een bekende sleutel met hetzelfde type maar een onbekende toekomstige waarde
        // (quality:'ultra', een nieuwe hudMode/subtitleSize of drawDistance-bucket) is van een nieuwere
        // build. Deze build valt voor het spel terug op zijn default, maar die default mag de waarde in
        // het bestand niet overschrijven: de eerste setSetting schrijft anders de oude stand terug terwijl
        // `v` al hoog staat. Alleen primitieve waarden; binds en andere objecten blijven validatie.
        const toekomst = bekend && v !== null && v !== undefined && typeof v !== 'object' && typeof v === typeof DEFAULTS[k] && out[k] !== v;
        if (!bekend || (v !== undefined && typeof v !== typeof DEFAULTS[k]) || toekomst) newerExtras[k] = v;
      }
    }
    return out;
  } catch (e) {
    return { ...DEFAULTS };
  }
}

// ?preset=quality:laag,drawDistance:kort (desktop --preset=...): settings for
// this run only, for perf runs on a throwaway profile
function urlOverrides(out) {
  if (!FLAGS.preset) return out;
  for (const pair of FLAGS.preset.split(',')) {
    const [k, v] = pair.split(':');
    if (!hasKey(DEFAULTS, k) || v === undefined) continue;
    const t = typeof DEFAULTS[k];
    if (t === 'object') continue;
    if (t === 'number' && !Number.isFinite(Number(v))) continue; // 22-11: "resolution:abc" is geen getal
    out[k] = t === 'number' ? Number(v) : t === 'boolean' ? v === 'true' : v;
  }
  return out;
}

const settings = urlOverrides(load());
const listeners = new Set();

// #1169: de moeilijkheid hoort bij de SAVE (difficulty.js houdt de actieve stand, savegame.js zet hem bij laden en bij een
// nieuw spel). `settings.difficulty` blijft bestaan als spiegel van het actieve niveau: alle lezers (activiteiten, missies,
// medailles) lezen hem zoals eerst, en een oude save zonder veld erft hier het niveau dat dit apparaat had.
setActiveDifficulty({ level: settings.difficulty, custom: {} });
// het niveau dat dit apparaat vóór het per-save-systeem had: een save zonder veld `moeilijkheid` erft dat oneShot (savegame.js)
export const legacyDifficultyLevel = settings.difficulty;
onDifficultyChange((d) => { if (settings.difficulty !== d.level) setSetting('difficulty', d.level); applyHudClasses(); });

export function getSettings() {
  return settings;
}

// De hele stand in één keer wegschrijven; een lopende uitgestelde schrijfbeurt vervalt.
const SETTINGS_WRITE_DELAY_MS = 200;
let writeTimer = null;
let writePending = false;
let schrijfFoutGemeld = false;
function writeSettingsNow() {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  writePending = false;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, ...newerExtras, v: Math.max(storedVersion, SETTINGS_VERSION) })); schrijfFoutGemeld = false; } catch (e) {
    // 22-11: een volle of geblokkeerde opslag mag niet stil zijn: één waarschuwing in het Foutrapport, de stand blijft in het geheugen
    if (!schrijfFoutGemeld) { schrijfFoutGemeld = true; console.warn("Instellingen: bewaren mislukt (" + ((e && e.name) || "fout") + ")"); }
  }
}
function scheduleSettingsWrite() {
  writePending = true;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(writeSettingsNow, SETTINGS_WRITE_DELAY_MS);
}
// Schrijft een uitgestelde stand direct weg (sluiten, verbergen van de pagina, tests).
export function flushSettings() { if (writePending) writeSettingsNow(); }
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', flushSettings);
  window.addEventListener('beforeunload', flushSettings);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSettings(); });
}

// 22-11: één luisteraar die struikelt mag de rest en de aanroeper niet meenemen: de andere luisteraars krijgen de
// wijziging gewoon, de fout gaat naar het Foutrapport.
function notify(key) {
  for (const cb of [...listeners]) {
    try { cb(settings, key); } catch (e) { console.error('Instellingen: luisteraar faalde bij ' + key + ': ' + (e && e.message ? e.message : e)); }
  }
}

// Mag deze waarde voor deze sleutel? Alleen de sleutels met een vaste keuzelijst of een bereik worden getoetst; de rest blijft zoals het was
// (het type controleert de lader). Dezelfde lijsten als bij het laden, zodat een bestand en een aanroep niet verschillen.
const CHOICES = {
  subtitleContrast: SUBTITLE_CONTRASTS, colorBlind: COLOR_BLIND_MODES, padLayout: PAD_LAYOUT_CHOICES, hintSource: HINT_SOURCE_CHOICES,
  touchControls: TOUCH_CONTROLS_CHOICES, drunkFx: DRUNK_FX_CHOICES, shiftMode: SHIFT_CHOICES, readingTime: READING_TIME_CHOICES,
  hudMode: ['slim', 'alles', 'minimaal'], minimapNorth: ['nooit', 'lucht', 'altijd'], qteStand: ['normaal', 'makkelijk', 'overslaan'],
  ritCamera: ['cabine', 'achter', 'zij', 'boven'], ruzie: RAGE_CHOICES, tikStand: TAP_MODES, worldColor: WORLD_COLOR_MODES,
};
const KEYED = { textSize: TEXT_SIZES, screenShake: SHAKE_STANDEN, subtitleVlak: SUBTITLE_VLAKKEN, subtitleSize: SUBTITLE_SIZES, quality: QUALITY_PRESETS, drawDistance: VIEW_DISTANCES };
const RANGES = {
  brightness: [0.6, 1.6], uiScale: [0.8, 1.5], fov: [50, 90], cameraDistance: [0.8, 1.6], mouseSensitivity: [0.3, 2.5], padLookSensitivity: [0.3, 2.5],
  steerSensitivity: [0.5, 1.5], minimapZoom: [0.6, 1.6], resolution: [0.5, 1], rumbleStrength: RUMBLE_STRENGTH_RANGE,
};
export function isValidSetting(key, value) {
  if (key === 'helpTime' || key === 'helpDamage' || key === 'helpGates') return cleanHelpSetting(key, value) === value;
  if (key === 'gfxAuto') return typeof value === 'string' && (value === '' || /^\d+:[a-z]+$/.test(value));
  // een instelling met een object als standaard (radioVehicle: de zender per soort voertuig) blijft een gewoon object (22-11, na het samenvoegen met de radio per voertuig)
  if (hasKey(DEFAULTS, key) && DEFAULTS[key] && typeof DEFAULTS[key] === 'object' && !Array.isArray(DEFAULTS[key])) return !!value && typeof value === 'object' && !Array.isArray(value);
  if (hasKey(CHOICES, key)) return CHOICES[key].includes(value);
  if (hasKey(KEYED, key)) return typeof value === 'string' && hasKey(KEYED[key], value);
  if (hasKey(RANGES, key)) return typeof value === 'number' && value >= RANGES[key][0] && value <= RANGES[key][1];
  return true;
}

export function setSetting(key, value) {
  if (typeof DEFAULTS[key] === 'number' && typeof value === 'string') value = Number(value);
  // 22-11: een getalinstelling krijgt nooit NaN of oneindig (een lege invoer of een kapotte schuif)
  if (typeof DEFAULTS[key] === 'number' && !Number.isFinite(value)) return;
  // a volume always stays in 0..1, whatever a caller or a keyboard shortcut sends
  if (VOLUME_KEYS.includes(key)) value = volumeValue(value, DEFAULTS[key]);
  if (key === 'onlineNaam') value = cleanOnlineNaam(value);
  if (!hasKey(DEFAULTS, key) || settings[key] === value) return;
  // 22-11: een keuze of getal buiten zijn bereik (een voorinstelling, een sneltoets, een verkeerde aanroep) wordt niet bewaard
  if (!isValidSetting(key, value)) return;
  settings[key] = value;
  // #781: de speler koos in deze build zelf deze stand; een bewaarde waarde van een toekomstige
  // typewijziging gaat er dan uit, anders zou die de keuze bij de volgende start weer overschrijven.
  if (key in newerExtras) delete newerExtras[key];
  // #578: nooit onder de versie van het geladen bestand schrijven en de onbekende sleutels van een
  // nieuwere build bewaren; anders verliest een downgrade de stand van de nieuwere versie. De
  // bewaarde nieuwere waarden staan achter de eigen instellingen, zodat een onbruikbaar type niet
  // door deze build wordt overschreven (#781).
  // Efficiëntie: een slider geeft tientallen input-events per seconde; de opslag volgt dan 200 ms na
  // de laatste beweging (en bij sluiten of verbergen van de pagina). Een schakelaar of keuze schrijft meteen.
  if (typeof value === 'number') scheduleSettingsWrite(); else writeSettingsNow();
  if (key === 'difficulty') setActiveLevel(value); // #1169: een niveau kiezen wist de eigen aanpassingen van de save
  applyHudClasses();
  notify(key);
}

// Values for a moment (the benchmark tries the presets), not saved; the
// returned function puts the previous values back.
export function withTempSettings(values) {
  const prev = {};
  const put = (vals) => {
    for (const [k, v] of Object.entries(vals)) {
      if (!hasKey(DEFAULTS, k) || settings[k] === v) continue;
      settings[k] = v;
      notify(k);
    }
  };
  for (const k of Object.keys(values)) prev[k] = settings[k];
  put(values);
  return () => put(prev);
}

// De standaardwaarden, voor "Dit tabblad herstellen" en de tellers op de tabbladen (settingsrules.js)
export const defaultSettings = () => ({ ...DEFAULTS });

// Zet alleen deze sleutels terug naar de standaard (een tabblad van Instellingen); wat bij KEEP_ON_RESET hoort blijft staan.
// Geeft de oude waarden terug (om ongedaan te maken) van alleen de sleutels die echt veranderden.
export function resetSettingsKeys(keys) {
  const oud = {};
  for (const k of keys) {
    if (!hasKey(DEFAULTS, k) || KEEP_ON_RESET.has(k)) continue;
    const nu = settings[k];
    const gelijk = nu === DEFAULTS[k] || (nu && typeof nu === 'object' && JSON.stringify(nu) === JSON.stringify(DEFAULTS[k]));
    if (gelijk) continue;
    oud[k] = nu;
    setSetting(k, DEFAULTS[k]);
  }
  flushSettings();
  return oud;
}

export function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) if (!KEEP_ON_RESET.has(k)) setSetting(k, DEFAULTS[k]);
  flushSettings();
}

// Mag dit spel contact zoeken met andere spelers? Alleen bij een uitdrukkelijke ja;
// null ("nog nooit gevraagd") en false geven allebei nee (#528, ADR 0022). Elke lezer
// gebruikt deze vraag, zodat er niet op drie plekken een eigen waarheid ontstaat.
export function magOnline() {
  return settings.onlineMeedoen === true;
}

export function onSettingsChange(cb) {
  listeners.add(cb);
  try { cb(settings, null); } catch (e) { console.error('Instellingen: luisteraar faalde bij aanmelden: ' + (e && e.message ? e.message : e)); }
  return () => listeners.delete(cb);
}

function applyHudClasses() {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('hide-minimap', !settings.showMinimap);
  document.body.classList.toggle('hide-hints', !toggleChoice('hints', settings.showHints)); // #1169: het niveau van de save kan hints aan of uit zetten
}

if (typeof document !== 'undefined') {
  if (document.body) applyHudClasses();
  else document.addEventListener('DOMContentLoaded', applyHudClasses, { once: true });
}
