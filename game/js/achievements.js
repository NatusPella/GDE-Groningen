// Prestaties: declarative list, lifetime stats and the unlock toast.
// Imports only modules without further imports (subtitles.js, and players.js
// above the import-free spelersregister.js), so any module can call the
// hooks (recordStat, recordUnique, unlockAchievement) without creating
// import cycles; the polling detectors live in achievementtracker.js.
//
// Storage: everything the player earns for good (unlocks, lifetime counters,
// best mission times/medals) sits in its own key so it survives "Nieuw spel".
// Per-playthrough bits (found eierballen, geheimpjes) travel inside the savegame, which
// also carries a copy of the unlocked ids so a save restores them if the
// lifetime key was ever cleared.
import { dualHtml } from './subtitles.js';
import { mayStart, noteToast } from './narrative.js';
import { MISSION_IDS, RETIRED_MISSIONS } from './storyarc_basis.js';
import { HOUSE_ARRIVAL } from './beppe_texts.js';
import { KEYS } from './storagekeys.js';
import { iconSvg } from './achievementicons.js';
import { isOverlayHeld } from './overlayhold.js';
import { noticeHeld, enqueueNotice, noticeQueue } from './notifyqueue.js'; // een prestatie wacht in de ene meldingenwachtrij tot niets het scherm heeft, en gaat niet verloren (22-11)
import { zones, P3 } from './hudrules.js';
import { hoofdspeler } from './players.js'; // de speler van dit apparaat (#500)
import { getSettings } from './settings.js';
import { SHOP_ITEMS } from './clothingdata.js';
import { planPrestatie, queueStep, verblijfS, samenvattingTekst, balkTekst } from './achievementunlock.js'; // de prestatie als moment (wens 21-11)
import { calmState, tikGetal } from './dsmicro.js';
import { runNoticeTimer } from './melding.js'; // het gedeelde aflopende balkje van alle meldingen
import { toClass } from './noticetiming.js';
import { cleanDifficulty, DIFFICULTY_MODES } from './difficulty.js'; // #800: missierecords per stand
import { escapeHtml as escHtml } from './htmlescape.js';

const KEY = KEYS.achievements;
const WRITE_DELAY_MS = 2500;
const TOAST_S = 4.2;
export const EIERBAL_TOTAL = 30;
// De buurten van de stad (stad.json meta.neighbourhoodPoints): één bron voor de prestatie en
// de teller in Prestaties, zodat het cijfer niet stil gaat liegen als de kaart groeit.
export const WIJKEN_TOTAL = 66;
const KLEDING_SOORTEN = SHOP_ITEMS.length; // de kledingsoorten in de winkel (clothingdata.js)

export const CATEGORIES = [
  ['missies', 'Missies'],
  ['rijden', 'Rijden'],
  ['tevoet', 'Te voet'],
  ['politie', 'Politie'],
  ['verkennen', 'Verkennen'],
  ['spoor', 'Spoor & weer'],
  ['sociaal', 'Sociaal & geld'],
  ['verzamelen', 'Verzamelen'],
  ['duif', 'Duif-modus'],
  ['bijbaan', 'Bijbaantjes'],
  ['nahetverhaal', 'Na het verhaal'],
];

// Per mission (index order of missions.js): medal times in seconds, the
// damage budget for gold/silver (health + armour lost) and the optional
// challenge. wanted: highest star count still allowed for gold.
export const MISSION_GOALS = [
  { name: 'Berend telt de krassen', gold: 55, silver: 77, wanted: 1, extra: ['Geen schampje', 'Lever Berends bakkie af zonder ook maar één tikje'] },
  { name: 'Iets met de Grote Markt', gold: 28, silver: 39, wanted: 5, extra: ['Kijkcijferrecord', 'Haal de uitzending binnen 20 seconden: Jelmer breekt alle records'] },
  { name: 'Wind tegen, beide kanten op', gold: 248, silver: 297, wanted: 1, extra: ['Achterlichten', 'Win de KEI-weekrace met minstens een minuut voorsprong op de klok'] },
  { name: 'Heel aankomen is ook een kunst', gold: 115, silver: 137, wanted: 1, extra: ['Decor in één stuk', 'Bezorg het Noorderzon-decor zonder één harde klap'] },
  { name: 'Ring Zuid, laatste fase', gold: 150, silver: 190, wanted: 5, byPlace: true, extra: ['Netjes ingehaald', 'Win de ringweg-race zonder een rivaal te raken'] },
  { name: 'Nog eentje dan', gold: 110, silver: 138, wanted: 0, extra: ['Laatste ronde', 'Haal alle vier de kroegen met nog een volle minuut op de klok'] },
  { name: 'Fatbikes tellen niet als fiets', gold: 110, silver: 138, wanted: 0, extra: ['Geen bandafdruk', 'Kom van de Grote Markt tot de Noorderhaven zonder één keer geschept te worden'] },
  { name: 'Alles klopt, behalve de papieren', gold: 660, silver: 800, wanted: 0, happy: [80, 50], extra: ['Glad water', 'Vaar de hele Diepenring rond zonder één tik: geen kade, geen woonboot, en ontwijk elke ramkoers van Wiebe'] },
];
export const GOLD_DAMAGE = 25;
export const SILVER_DAMAGE = 60;
export const MEDALS = ['', 'Brons', 'Zilver', 'Goud'];

const mdefs = [];
// goals of missions the story no longer plays (#187): `retired` hides them unless already earned
export const isRetiredMission = (i) => RETIRED_MISSIONS.includes(MISSION_IDS[i]);
MISSION_GOALS.forEach((g, i) => {
  const n = i + 1;
  const before = mdefs.length;
  mdefs.push({ id: `m${n}_klaar`, cat: 'missies', title: `${g.name}`, desc: `Klaar missie ${n}` });
  const goldDesc = g.byPlace ? 'Goud: win de race als eerste' : `Goud: binnen ${fmtTime(g.gold)}, ${g.happy ? `toeristen minstens ${g.happy[0]}% tevreden` : 'weinig schade'}${g.wanted < 5 ? g.wanted ? ', hooguit 1 ster' : ', zonder politie' : ''}`;
  mdefs.push({ id: `m${n}_goud`, cat: 'missies', title: `${g.name}: goud`, desc: goldDesc, medal: true });
  mdefs.push({ id: `m${n}_extra`, cat: 'missies', title: g.extra[0], desc: g.extra[1] });
  if (isRetiredMission(i)) for (let k = before; k < mdefs.length; k++) mdefs[k].retired = true;
});

export const ACHIEVEMENTS = [
  ...mdefs,
  { id: 'alle_missies', cat: 'missies', title: 'Grunn is van jou', desc: 'Klaar alle acht missies', count: 'missionsDone', goal: 8 },
  { id: 'alle_zilver', cat: 'missies', title: 'Zilveren Stadjer', desc: 'Minstens zilver op elke missie', count: 'silverPlus', goal: 8 },
  { id: 'alle_goud', cat: 'missies', title: 'Gouden Eierbal', desc: 'Goud op alle acht missies', count: 'goldCount', goal: 8 },
  { id: 'alle_uitdagend', cat: 'missies', title: 'Geen genade', desc: 'Speel alle acht missies uit op het niveau Uitdagend', count: 'uitdagendKlaar', goal: 8 }, // #1169

  { id: 'snel_100', cat: 'rijden', title: 'Honderd op de teller', desc: 'Rij 100 km/u', stat: 'topSpeed', goal: 100, unit: 'km/u' },
  { id: 'snel_140', cat: 'rijden', title: 'Harder dan de flitspaal kan tellen', desc: 'Rij 140 km/u', stat: 'topSpeed', goal: 140, unit: 'km/u' },
  { id: 'rijden_25', cat: 'rijden', title: 'Rondje Grunn', desc: 'Rij in totaal 25 km', stat: 'driven', goal: 25000, unit: 'm' },
  { id: 'bijna_10', cat: 'rijden', title: 'Scheer-rijder', desc: '10 keer rakelings langs een ander voertuig', stat: 'nearMiss', goal: 10 },
  { id: 'bijna_50', cat: 'rijden', title: 'Zijspiegels ingeklapt', desc: '50 keer rakelings langs een ander voertuig', stat: 'nearMiss', goal: 50 },
  { id: 'bijna_reeks', cat: 'rijden', title: 'Op een haar, vijf keer', desc: 'Haal vijf keer rakelings achter elkaar, binnen negen seconden per keer', stat: 'nearMissReeks', goal: 5 },
  { id: 'wrakken_25', cat: 'rijden', title: 'Sloopkampioen', desc: 'Schrijf 25 voertuigen af', stat: 'wrecks', goal: 25 },
  { id: 'gejat_10', cat: 'rijden', title: 'Even lenen', desc: 'Jat 10 voertuigen', stat: 'stolen', goal: 10 },
  { id: 'gejat_50', cat: 'rijden', title: 'Autohandel Ome Stadjer', desc: 'Jat 50 voertuigen', stat: 'stolen', goal: 50 },
  { id: 'bus', cat: 'rijden', title: 'Lijn 5 rijdt vandaag anders', desc: 'Jat een stadsbus' },
  { id: 'alle_typen', cat: 'rijden', title: 'Van fiets tot rondvaartboot', desc: 'Rij in elk soort voertuig: auto, bus, fiets, fatbike, scooter, boot en politieauto', set: 'vehicleTypes', goal: 7 },
  { id: 'politieauto', cat: 'rijden', title: 'Zwaailicht erop', desc: 'Kaap een politieauto', hidden: true },
  { id: 'drift_1', cat: 'rijden', title: 'Eerste slip', desc: 'Rond een driftrun af op een rotonde', stat: 'driftRuns', goal: 1 },
  { id: 'drift_10', cat: 'rijden', title: 'Rubber op de rotonde', desc: 'Rond 10 driftruns af', stat: 'driftRuns', goal: 10 },
  { id: 'drift_goud', cat: 'rijden', title: 'Koning van de rotonde', desc: 'Haal goud in een driftzone', medal: true },
  { id: 'geflitst', cat: 'rijden', title: 'Even lachen', desc: 'Word geflitst', hidden: true },

  { id: 'lopen_5', cat: 'tevoet', title: 'Wandelen op de Diepenring', desc: 'Loop in totaal 5 km', stat: 'walked', goal: 5000, unit: 'm' },
  { id: 'zwemmen', cat: 'tevoet', title: 'Kanaalzwemmer', desc: 'Zwem in totaal 250 meter', stat: 'swum', goal: 250, unit: 'm' },
  { id: 'kade_klim', cat: 'tevoet', title: 'Kadeklimmer', desc: 'Klim uit de Diepenring de kade op' },

  { id: 'ster_3', cat: 'politie', title: 'Bekend bij de politie', desc: 'Haal drie sterren', stat: 'maxWanted', goal: 3 },
  { id: 'ster_5', cat: 'politie', title: 'Heel Grunn zoekt je', desc: 'Haal vijf sterren', stat: 'maxWanted', goal: 5 },
  { id: 'ontsnapt_5', cat: 'politie', title: 'Foetsie', desc: 'Raak de politie kwijt na vijf sterren' },
  { id: 'gezocht_3m', cat: 'politie', title: 'Kat en muis', desc: 'Blijf drie minuten achter elkaar gezocht', stat: 'wantedStreak', goal: 180, unit: 's' },
  { id: 'opgepakt', cat: 'politie', title: 'Even brommen', desc: 'Word opgepakt', hidden: true },
  { id: 'wasted', cat: 'politie', title: 'Even plat', desc: 'Ga een keer neer', hidden: true },

  { id: 'wijken_10', cat: 'verkennen', title: 'Stadjer in wording', desc: 'Ontdek 10 buurten', set: 'wijken', goal: 10 },
  { id: 'wijken_33', cat: 'verkennen', title: 'Halve Stadjer', desc: 'Ontdek 33 buurten', set: 'wijken', goal: 33 },
  { id: 'wijken_alle', cat: 'verkennen', title: 'Kenner van Grunn', desc: `Ontdek alle ${WIJKEN_TOTAL} buurten`, set: 'wijken', goal: WIJKEN_TOTAL },
  // De stad heeft er 18 (stad.json meta.landmarks), met Eemshaven en Vesting Bourtange erbij: die
  // twee horen niet bij "in eigen stad", dus de prestatie telt de eerste veertien. Zeg geen "alle"
  // als het er meer zijn (de QoL-review zag de teller te vroeg vol lopen).
  { id: 'landmarks', cat: 'verkennen', title: 'Toerist in eigen stad', desc: 'Bezoek 14 bezienswaardigheden in en om de stad', set: 'landmarks', goal: 14 },
  { id: 'kaart_25', cat: 'verkennen', title: 'Kaartlezer', desc: 'Bezoek een kwart van alle buurten van de provincie', stat: 'kaartVerkend', goal: 25, unit: '%' },
  { id: 'kaart_50', cat: 'verkennen', title: 'Halve kaart gezien', desc: 'Bezoek de helft van alle buurten van de provincie', stat: 'kaartVerkend', goal: 50, unit: '%' },
  { id: 'kaart_alle', cat: 'verkennen', title: 'De hele kaart verkend', desc: 'Bezoek elke buurt van de provincie, tot in de uiterste hoek', stat: 'kaartVerkend', goal: 100, unit: '%' },
  { id: 'gebied_buurt', cat: 'verkennen', title: 'Deelgebied-held', desc: 'Verover een deelgebied: doe alles wat er te doen is (Veroverd, op de kaart)', stat: 'gebied_buurt', goal: 1 },
  { id: 'gebied_wijk', cat: 'verkennen', title: 'Wijkheld', desc: 'Verover een hele wijk', stat: 'gebied_wijk', goal: 1 },
  { id: 'gebied_wijk_5', cat: 'verkennen', title: 'Wijk voor wijk', desc: 'Verover vijf wijken', stat: 'gebied_wijk', goal: 5 },
  { id: 'gebied_woonplaats', cat: 'verkennen', title: 'Burgemeester', desc: 'Verover een hele woonplaats', stat: 'gebied_woonplaats', goal: 1 },
  { id: 'gebied_gemeente', cat: 'verkennen', title: 'Gemeentebaas', desc: 'Verover een hele gemeente', stat: 'gebied_gemeente', goal: 1 },
  { id: 'gebied_provincie', cat: 'verkennen', title: 'Provinciebaas van Grunn', desc: 'Verover de hele provincie', stat: 'gebied_provincie', goal: 1 },
  { id: 'ommelanden', cat: 'verkennen', title: 'Ommelander', desc: 'Trek de stad uit, De Ommelanden in' },
  { id: 'umcg_heli', cat: 'verkennen', title: 'Traumaduif', desc: 'Land op het helidek van het UMCG', hidden: true },
  { id: 'ballonjacht', cat: 'verkennen', title: 'Ballonjacht', desc: 'Haal met de traumaheli een heteluchtballon in' },
  { id: 'ballonjacht_goud', cat: 'verkennen', title: 'Gouden rotor', desc: 'Haal goud bij de ballonjacht' },
  { id: 'eigen_vleugels', cat: 'verkennen', title: 'Eigen vleugels', desc: 'Stijg op met je eigen helikopter' },
  { id: 'helidak', cat: 'verkennen', title: 'Thuis op het dak', desc: 'Parkeer je heli op het helidek van jullie flat' },
  { id: 'weiland', cat: 'verkennen', title: 'Boer zoekt landing', desc: 'Land je heli in een weiland in De Ommelanden' },
  { id: 'padel_klaar', cat: 'verkennen', title: 'Glazen kooi', desc: 'Speel een potje padel' },
  { id: 'padel_winst', cat: 'verkennen', title: 'Tegen het glas', desc: 'Win een potje padel' },
  { id: 'padel_goud', cat: 'verkennen', title: 'Padelkoning van Grunn', desc: 'Win een potje padel met 2-0' },
  { id: 'carbid_klaar', cat: 'verkennen', title: 'Knal in de polder', desc: 'Schiet carbid bij boer Roelf' },
  { id: 'carbid_goud', cat: 'verkennen', title: 'Carbidknaller', desc: 'Haal goud bij het carbid schieten', medal: true },
  { id: 'botsauto_klaar', cat: 'verkennen', title: 'Kermisklant', desc: "Rij een ritje in de botsauto's op de Grote Markt" },
  { id: 'botsauto_goud', cat: 'verkennen', title: 'Koning van de kermis', desc: "Haal goud in de botsauto's", medal: true },
  { id: 'discgolf_klaar', cat: 'verkennen', title: 'Disc in de mand', desc: 'Speel een ronde discgolf in het Stadspark' },
  { id: 'discgolf_goud', cat: 'verkennen', title: 'Onder par in het park', desc: 'Haal goud bij discgolf', medal: true },
  { id: 'discgolf_ace', cat: 'verkennen', title: 'Ace in het Stadspark', desc: 'Gooi de disc in één worp in de mand bij discgolf', hidden: true },
  { id: 'putt_klaar', cat: 'verkennen', title: 'Korte gras', desc: 'Speel zes banen pitch & putt' },
  { id: 'putt_goud', cat: 'verkennen', title: 'Groene vingers', desc: 'Haal goud bij pitch & putt', medal: true },
  { id: 'skate_klaar', cat: 'verkennen', title: 'Vier wielen en een plank', desc: 'Skate een ronde in het Stadspark' },
  { id: 'skate_goud', cat: 'verkennen', title: 'Koning van het skatepark', desc: 'Haal goud in het skatepark', medal: true },
  { id: 'skate_combo', cat: 'verkennen', title: 'Keten van toeren', desc: 'Sla een keten van 2.000 punten op in het skatepark' },
  { id: 'kart_klaar', cat: 'verkennen', title: 'Ronde na ronde', desc: 'Rij drie ronden op de kartbaan in Ulrum' },
  { id: 'kart_goud', cat: 'verkennen', title: 'Eerst over de streep', desc: 'Win de race op de kartbaan', medal: true },
  { id: 'kart_snel', cat: 'verkennen', title: 'Snelle ronde', desc: 'Rijd een ronde van 31,5 seconden of sneller' },
  { id: 'zwem_klaar', cat: 'verkennen', title: 'Baantjes trekken', desc: 'Zwem honderd meter in Zwembad Het Natte Papier' },
  { id: 'zwem_goud', cat: 'verkennen', title: 'Snelste van het bad', desc: 'Haal goud in het zwembad', medal: true },
  { id: 'zwem_keer', cat: 'verkennen', title: 'Keerpunt als een profi', desc: 'Draai drie keer perfect om aan de muur' },
  { id: 'klim_klaar', cat: 'verkennen', title: 'Naar de top', desc: 'Klim naar de top van de klimtoren op Zernike' },
  { id: 'klim_goud', cat: 'verkennen', title: 'Koning van de klimtoren', desc: 'Haal goud op de klimtoren', medal: true },
  { id: 'voetbal_winst', cat: 'verkennen', title: 'Winst in de Euroborg', desc: 'Win een voetbalwedstrijd vijf tegen vijf in de Euroborg' },
  { id: 'voetbal_hattrick', cat: 'verkennen', title: 'Hattrick op het Euroborggras', desc: 'Scoor drie keer in één voetbalwedstrijd', medal: true },
  { id: 'voetbal_kampioen', cat: 'verkennen', title: 'Kampioen van de Euroborg', desc: 'Word kampioen in de voetbalcompetitie van de Euroborg', medal: true },
  { id: 'vc_debuut', cat: 'verkennen', title: 'Debuut op het sportpark', desc: 'Speel je eerste wedstrijd in de voetbalcarrière' },
  { id: 'vc_doelpunt_terp', cat: 'verkennen', title: 'Eerste doelpunt in de Terpklasse', desc: 'Scoor in de Terpklasse voor je club' },
  { id: 'vc_basis', cat: 'verkennen', title: 'Basisspeler', desc: 'Word basisspeler van je club' },
  { id: 'vc_promotie', cat: 'verkennen', title: 'Promotie', desc: 'Promoveer met je club naar een hogere klasse' },
  { id: 'vc_kampioen_terp', cat: 'verkennen', title: 'Kampioen van de Terpklasse', desc: 'Word kampioen van de Terpklasse' },
  { id: 'vc_beker', cat: 'verkennen', title: 'Bekerwinnaar', desc: 'Win de Dijkbeker' },
  { id: 'vc_kroon', cat: 'verkennen', title: 'Kroonklasse bereikt', desc: 'Speel met je club in de Kroonklasse' },
  { id: 'vc_kapitein', cat: 'verkennen', title: 'Kapitein', desc: 'Draag de aanvoerdersband van je club' },
  { id: 'vc_waddenbeker', cat: 'verkennen', title: 'Waddenbeker', desc: 'Win de Waddenbeker met je club' },
  { id: 'vc_trainer', cat: 'verkennen', title: 'Trainer', desc: 'Word trainer van je club' },
  { id: 'vc_manager', cat: 'verkennen', title: 'Manager', desc: 'Word manager van je club' },
  { id: 'klim_foutloos', cat: 'verkennen', title: 'Niet één keer gevallen', desc: 'Klim de toren zonder te vallen' },
  { id: 'ski_klaar', cat: 'verkennen', title: 'Achter de boot', desc: 'Skie een ronde bij het Grunopark' },
  { id: 'ski_goud', cat: 'verkennen', title: 'Koning van het meer', desc: 'Haal goud bij het waterskiën', medal: true },
  { id: 'vlieg_geslaagd', cat: 'verkennen', title: 'Eerste vlieglesje', desc: 'Haal een les bij Vliegschool De Windwijzer op Eelde' },
  { id: 'vlieg_goud', cat: 'verkennen', title: 'Goud in de lucht', desc: 'Haal goud bij een vliegles', medal: true },
  { id: 'vlieg_brevet', cat: 'verkennen', title: 'Vliegbrevet', desc: 'Haal alle lessen van de vliegschool, met vliegtuig en helikopter' },
  { id: 'carillon_klaar', cat: 'verkennen', title: 'Klokkenspeler', desc: 'Speel een deuntje op de klokken van de Martinitoren' },
  { id: 'carillon_goud', cat: 'verkennen', title: 'Stadsbeiaardier', desc: 'Haal goud op het klokkenspel', medal: true },
  { id: 'snackketen_eerste', cat: 'verkennen', title: 'Eigen snackbar', desc: 'Koop je eerste Kroketkoning-snackbar' },
  { id: 'snackketen_keten', cat: 'verkennen', title: 'Een keten', desc: 'Bezit drie snackbars van Kroketkoning' },
  { id: 'snackketen_rijk', cat: 'verkennen', title: 'Kroketkoning-rijk', desc: 'Twaalf vestigingen, drie vlaggenschepen' },
  { id: 'pannenkoek_klaar', cat: 'verkennen', title: 'Kok aan boord', desc: 'Bak een dienst op het pannenkoekenschip' },
  { id: 'pannenkoek_goud', cat: 'verkennen', title: 'Kok van het schip', desc: 'Haal goud op het pannenkoekenschip', medal: true },
  { id: 'hengel_klaar', cat: 'verkennen', title: 'Aan de waterkant', desc: 'Hengel een ronde aan het meer in Meerstad' },
  { id: 'hengel_karper', cat: 'verkennen', title: 'De dikke karper', desc: 'Vang een karper', hidden: true },
  { id: 'wandel_klaar', cat: 'tevoet', title: 'Pieterpadganger', desc: 'Loop alle stempelposten bij Winsum af' },
  { id: 'wandel_goud', cat: 'tevoet', title: 'Snelste wandelaar', desc: 'Haal goud op de wandeling bij Winsum', medal: true },
  { id: 'discgolf_achterkant', cat: 'verkennen', title: 'Andersom', desc: 'Speel de achterkant van de discgolfbaan' },
  { id: 'discgolf_achttien', cat: 'verkennen', title: 'Heen en terug', desc: 'Speel alle achttien banen discgolf' },
  { id: 'discgolf_dichtbij_goud', cat: 'verkennen', title: 'Recht op de mand', desc: 'Haal goud bij discgolf dichtbij', medal: true },
  { id: 'ski_sprong', cat: 'verkennen', title: 'Hoog en schoon', desc: 'Land een sprong met een draai en een grab', hidden: true },
  { id: 'geheimen_alle', cat: 'verkennen', title: 'Stadjer met geheimen', desc: 'Vind alle 8 geheimpjes van Grunn in één spel', save: 'geheimen', goal: 8, hidden: true },
  { id: 'streek_verzameld', cat: 'verzamelen', title: 'Streekverzamelaar', desc: 'Vind alle vierentwintig streekvondsten van de provincie', set: 'streekverzamel', goal: 24 },
  { id: 'onderdelen_5', cat: 'verzamelen', title: 'Eigen Maaksel', desc: 'Vind alle vijf onderdelen voor de Knutselwagen', set: 'autodelen', goal: 5 },
  { id: 'wrakduiken_3', cat: 'verzamelen', title: 'Waddengeheimen', desc: 'Duik bij alle drie de wrakken in de Wadden en het Lauwersmeer', set: 'wrakvondsten', goal: 3 },
  { id: 'dierenboek', cat: 'verzamelen', title: 'Dierenvriend', desc: 'Zie alle twintig dieren van de provincie en schrijf ze op in je dierenboek', set: 'dierenboek', goal: 20 },
  { id: 'aaien_5', cat: 'verzamelen', title: 'Zachte hand', desc: 'Aai 5 keer een kat of een hond', stat: 'aaien', goal: 5 },
  { id: 'aaien_25', cat: 'verzamelen', title: 'Poezenpraatje', desc: 'Aai 25 keer een kat of een hond', stat: 'aaien', goal: 25 },
  { id: 'aaien_100', cat: 'verzamelen', title: 'Knuffelkampioen', desc: 'Aai 100 keer een kat of een hond', stat: 'aaien', goal: 100 },
  { id: 'streek_geheimen', cat: 'verkennen', title: 'Kenner van de streek', desc: 'Vind het geheim van elke streek in de provincie', set: 'streekgeheimen', goal: 8, hidden: true },
  { id: 'zonsopgang', cat: 'verkennen', title: 'Vroege vogel', desc: 'Zie de zon opkomen boven Grunn' },
  // the Ommeland extras (worldends.js, dorpsuitjes.js): progress only, never where
  { id: 'wereldeinde_1', cat: 'verkennen', title: 'Rand van de kaart', desc: 'Vind een plek waar een weg van het Ommeland ophoudt', set: 'wereldeinden', goal: 1 },
  { id: 'wereldeinde_alle', cat: 'verkennen', title: 'Einde van de wereld', desc: 'Vind alle 12 plekken waar de wegen van het Ommeland ophouden', set: 'wereldeinden', goal: 12 },
  { id: 'dorpen_alle', cat: 'verkennen', title: 'Ommelander in hart en nieren', desc: 'Doe in elk van de 8 dorpen langs het spoor waar je daar voor komt', set: 'dorpsuitjes', goal: 8 },
  // the Beppe tribute (#832): a hidden place card at the western border; the
  // description is the arrival line of the place (beppe_texts.js)
  { id: 'goed_eten', cat: 'verkennen', title: 'Goed eten', desc: HOUSE_ARRIVAL.body, hidden: true },

  // post-game (postgame.js): Jelle's challenges and the snackwagen
  { id: 'bruggen_klaar', cat: 'nahetverhaal', title: 'Elf bruggen', desc: 'Vaar de Elf Bruggenrace tegen Jelle uit' },
  { id: 'bruggen_goud', cat: 'nahetverhaal', title: 'Brêgekening', desc: 'Goud bij de Elf Bruggenrace', medal: true },
  { id: 'fierljep_klaar', cat: 'nahetverhaal', title: 'Polsstokhoogte', desc: 'Land een sprong bij het fierljep-duel' },
  { id: 'fierljep_goud', cat: 'nahetverhaal', title: 'Fierljepkening', desc: 'Goud bij het fierljep-duel', medal: true },
  { id: 'skutsje_klaar', cat: 'nahetverhaal', title: 'Wind in de zeilen', desc: 'Zeil de skûtsje-sprint tegen Jelle uit' },
  { id: 'skutsje_goud', cat: 'nahetverhaal', title: 'Skûtsjekening', desc: 'Goud bij de skûtsje-sprint', medal: true },
  { id: 'jelle_alles', cat: 'nahetverhaal', title: 'Better as ús', desc: 'Versla Jelle in alle drie de uitdagingen' },
  { id: 'fjord_klaar', cat: 'nahetverhaal', title: 'Luik open', desc: 'Draai een dienst met de snackwagen' },
  { id: 'fjord_goud', cat: 'nahetverhaal', title: 'Kon minder', desc: 'Goud in een dienst van de snackwagen', medal: true },
  { id: 'koe_klaar', cat: 'nahetverhaal', title: 'Geertje is thuis', desc: 'Breng de prijskoe van Ome Jan terug naar zijn boerderij' },
  { id: 'koe_goud', cat: 'nahetverhaal', title: 'Koeienfluisteraar', desc: 'Goud bij De Koe van Ome Jan', medal: true },
  { id: 'fjord_1000', cat: 'nahetverhaal', title: 'Frituurbaron', desc: 'Verdien €1.000 met de snackwagen', stat: 'fjordEarned', goal: 1000, unit: '€' },

  { id: 'trein_stations', cat: 'spoor', title: 'Alle haltes af', desc: 'Stap uit op 5 verschillende stations of haltes', set: 'trainStations', goal: 5 },
  { id: 'trein_dorp', cat: 'spoor', title: 'Dorpsstation', desc: 'Reis met de trein naar een dorpshalte', hidden: true },
  { id: 'treinen', cat: 'spoor', title: 'Treinspotter', desc: 'Zie alle soorten treinen: stoptrein, sprinter en intercity', set: 'trains', goal: 3 },
  { id: 'trein_race', cat: 'spoor', title: 'Sneller dan de sprinter', desc: 'Rij een rijdende trein voorbij', hidden: true },
  { id: 'trein_1', cat: 'spoor', title: 'Instappen, deuren sluiten', desc: 'Reis met de trein naar een ander station', stat: 'trainTrips', goal: 1 },
  { id: 'forens', cat: 'spoor', title: 'Forens', desc: 'Reis 10 keer met de trein', stat: 'trainTrips', goal: 10 },
  { id: 'overweg', cat: 'spoor', title: 'Netjes gewacht', desc: 'Wacht keurig voor een dichte overweg tot de trein voorbij is', hidden: true },
  { id: 'storm', cat: 'spoor', title: 'Code Rood', desc: 'Rij een halve minuut door een storm' },
  { id: 'onweer', cat: 'spoor', title: 'Donder en bliksem', desc: 'Maak een onweersbui mee' },

  { id: 'kusje_1', cat: 'sociaal', title: 'Moi schat', desc: 'Geef Tammo of Tessa een kusje', stat: 'kisses', goal: 1, hidden: true },
  { id: 'kusje_25', cat: 'sociaal', title: 'Tortelduifjes', desc: 'Geef 25 kusjes', stat: 'kisses', goal: 25, hidden: true },
  { id: 'horeca_5', cat: 'sociaal', title: 'Kroegtijger', desc: 'Eet of drink iets bij 5 verschillende zaken', set: 'horeca', goal: 5 },
  { id: 'horeca_25', cat: 'sociaal', title: 'Bitterbal-sommelier', desc: 'Eet of drink iets bij 25 verschillende zaken', set: 'horeca', goal: 25 },
  { id: 'rijk', cat: 'sociaal', title: 'Groninger koopman', desc: 'Heb €10.000 op zak', stat: 'maxMoney', goal: 10000, unit: '€' },
  { id: 'koop_1', cat: 'sociaal', title: 'Klant is koning', desc: 'Koop iets in een winkel', stat: 'purchases', goal: 1 },
  { id: 'koop_10', cat: 'sociaal', title: 'Winkelverslaafde', desc: 'Doe 10 aankopen', stat: 'purchases', goal: 10 },
  { id: 'pimp_1', cat: 'sociaal', title: 'Opgepimpt', desc: 'Laat je eerste wijziging installeren in een pimp-werkplaats', stat: 'tuneInstalls', goal: 1 },
  { id: 'garagebaas', cat: 'sociaal', title: 'Garagebaas', desc: 'Laat 10 keer iets installeren in een pimp-werkplaats', stat: 'tuneInstalls', goal: 10 },
  { id: 'hele_show', cat: 'sociaal', title: 'Hele show', desc: 'Pimp een voertuig met minstens 12 onderdelen tegelijk', stat: 'tuneFullBuild', goal: 1 },
  { id: 'ingericht', cat: 'sociaal', title: 'Helemaal ingericht', desc: 'Zet alle EIKEA-meubels in jullie flat' },
  { id: 'schroefje', cat: 'sociaal', title: 'Eén schroefje te weinig', desc: 'Zet de Buukenkaas zelf in elkaar', hidden: true },
  { id: 'spaarkaart', cat: 'sociaal', title: 'Stempeltje erbij', desc: 'Lever een volle spaarkaart in bij Rook & Geluk', stat: 'stampCards', goal: 1 },
  { id: 'uitgaven', cat: 'sociaal', title: 'Geld moet rollen', desc: 'Geef in winkels in totaal €2.500 uit', stat: 'spent', goal: 2500, unit: '€' },
  { id: 'kleding_nieuw', cat: 'sociaal', title: 'Nieuwe look', desc: 'Koop een kledingstuk en doe het meteen aan', set: 'kledingStukken', goal: 1 },
  { id: 'kleding_set', cat: 'sociaal', title: 'Past als gegoten', desc: 'Heb alle stukken van een kledingset in je kast', set: 'kledingSets', goal: 1 },
  { id: 'kapsel_nieuw', cat: 'sociaal', title: 'Nieuw kapsel', desc: 'Ga naar de kapper en kom er anders uit', set: 'kapsels', goal: 1 },
  { id: 'kleding_kast', cat: 'sociaal', title: 'Hele kast', desc: `Heb van alle ${KLEDING_SOORTEN} soorten kledingstukken er minstens één`, set: 'kledingItems', goal: KLEDING_SOORTEN },

  { id: 'eierbal_1', cat: 'verzamelen', title: 'Eerste eierbal', desc: 'Vind een verstopte eierbal', save: 'eierballen', goal: 1 },
  { id: 'eierbal_15', cat: 'verzamelen', title: 'Halve portie', desc: `Vind 15 van de ${EIERBAL_TOTAL} eierballen`, save: 'eierballen', goal: 15 },
  { id: 'eierbal_alle', cat: 'verzamelen', title: 'Eierbalkoning', desc: `Vind alle ${EIERBAL_TOTAL} eierballen in één spel`, save: 'eierballen', goal: EIERBAL_TOTAL },
  { id: 'dorpseierbal_alle', cat: 'verzamelen', title: 'Eierballen van het Ommeland', desc: 'Vind de verstopte eierbal in elk van de 8 dorpen langs het spoor', set: 'dorpseierballen', goal: 8 },

  { id: 'duif_martini', cat: 'duif', title: 'Hoogste duif van Grunn', desc: 'Land boven op de Martinitoren' },
  { id: 'duif_forum', cat: 'duif', title: 'Uitzicht vanaf het Forum', desc: 'Land op het dak van het Forum' },
  { id: 'duif_station', cat: 'duif', title: 'Stationsduif', desc: 'Land op het Hoofdstation' },
  { id: 'duif_aakerk', cat: 'duif', title: 'Kerkduif', desc: 'Land op de Der Aa-kerk' },
  { id: 'duif_bus', cat: 'duif', title: 'Zwartrijder', desc: 'Lift mee op een bus' },
  { id: 'duif_boot', cat: 'duif', title: 'Grachtenduif', desc: 'Vaar mee op een boot' },
  { id: 'duif_auto', cat: 'duif', title: 'Liftduif', desc: 'Rij mee op een auto' },
  { id: 'duif_loft', cat: 'duif', title: 'Thuis bij de duivenmelker', desc: 'Vind het hok van duivenmelker Harm', hidden: true },
  { id: 'duif_meeuw', cat: 'duif', title: 'Meeuw te slim af', desc: 'Laat een meeuw met lege snavel achter', hidden: true },

  { id: 'sj_eerste', cat: 'bijbaan', title: 'Eerste loonstrookje', desc: 'Rond een klus af bij een bijbaantje', stat: 'sjRounds', goal: 1 },
  { id: 'sj_50', cat: 'bijbaan', title: 'Harde werker', desc: 'Rond 50 klussen af bij bijbaantjes', stat: 'sjRounds', goal: 50 },
  { id: 'boerendochter', cat: 'bijbaan', title: 'Boerendochter', desc: 'Oogst als Tessa een veld op je eigen akker' },
  { id: 'bz_perceel', cat: 'bijbaan', title: 'Eerste akte', desc: 'Koop je eerste perceel in de provincie' },
  { id: 'bz_tien', cat: 'bijbaan', title: 'Grondbezitter', desc: 'Bezit tien percelen tegelijk', stat: 'bzPercelen', goal: 10 },
  { id: 'bz_winkel', cat: 'bijbaan', title: 'Eigen zaak', desc: 'Koop een pand en laat het draaien' },
  { id: 'bz_keten', cat: 'bijbaan', title: 'Van akker tot toonbank', desc: 'Sluit een hele keten: eigen grondstof, verwerker en winkel' },
  { id: 'bz_streken', cat: 'bijbaan', title: 'Heel Grunn', desc: 'Bezit land in alle acht de streken van de provincie', stat: 'bzStreken', goal: 8 },
  { id: 'bz_snack_eerste', cat: 'bijbaan', title: 'Eerste standplaats', desc: 'Zet je snackwagen op een standplaats met een eigen vergunning' },
  { id: 'bz_snack_tien', cat: 'bijbaan', title: 'Tien standplaatsen', desc: 'Bezit tien standplaatsen tegelijk', stat: 'bzStandplaatsen', goal: 10 },
  { id: 'bz_usmem', cat: 'bijbaan', title: 'Us Mem overtroefd', desc: 'Neem acht standplaatsen en driekwart van alle plekken: Us Mem Snacks is klein' },
  { id: 'sj_alle', cat: 'bijbaan', title: 'Duizendpoot', desc: 'Rond bij alle zes bijbaantjes een klus af', set: 'sjJobs', goal: 6 },
  { id: 'sj_geld', cat: 'bijbaan', title: 'Eerlijk verdiend', desc: 'Verdien in totaal €5.000 met bijbaantjes', stat: 'sjEarned', goal: 5000, unit: '€' },
  { id: 'sj_bezorger', cat: 'bijbaan', title: 'Nog warm!', desc: 'Bezorg 8 bestellingen op rij in één dienst', stat: 'sj_bezorger_streak', goal: 8 },
  { id: 'sj_krantenwijk', cat: 'bijbaan', title: 'Elke bus raak', desc: 'Bezorg 4 wijken op rij in één dienst', stat: 'sj_krantenwijk_streak', goal: 4 },
  { id: 'sj_taxi', cat: 'bijbaan', title: 'Moi, waar mag het heen?', desc: 'Rijd 6 taxiritten op rij in één dienst', stat: 'sj_taxi_streak', goal: 6 },
  { id: 'sj_bus', cat: 'bijbaan', title: 'Keurig op tijd', desc: 'Rijd een hele buslijn zonder één keer te laat te zijn' },
  { id: 'sj_rondvaart', cat: 'bijbaan', title: 'Links ziet u…', desc: 'Vaar een rondvaart zonder één stukje uitleg te missen' },
  { id: 'sj_fietsdepot', cat: 'bijbaan', title: 'Stationsplein leeg', desc: 'Ruim 5 rondes foutgeparkeerde fietsen op in één dienst', stat: 'sj_fietsdepot_streak', goal: 5 },
  { id: 'sj_verhuizing', cat: 'bijbaan', title: 'Niks gebroken', desc: 'Verhuis een student zonder dat er iets sneuvelt' },
  { id: 'sj_legende', cat: 'bijbaan', title: 'Legende van Grunn', desc: 'Haal niveau 5 bij een bijbaantje' },
  { id: 'sj_kots', cat: 'bijbaan', title: 'Kotszakje vergeten', desc: 'Een student kotst je taxi onder', hidden: true },
  // #846: alle negentien loopbanen echt beginnen (de eerste klus gedaan, niet de menuknop). De teller
  // (careerFirstJobs) komt uit loopbaanlive.js; de titel en de eenmalige €2.000 staan in loopbaan.js.
  // (De bestaande prestatie 'Duizendpoot' (sj_alle) gaat over de zes bijbaantjes; deze heet daarom bewust anders.)
  { id: 'duizendpoot', cat: 'bijbaan', title: 'Van alle markten thuis', desc: 'Begin alle 19 loopbanen met een echte eerste klus: de titel De Duizendpoot en eenmalig €2.000', stat: 'careerFirstJobs', goal: 19 },

  // nieuwe functies (#191): meest op bestaande tellers, dus zonder extra haken
  { id: 'coop_uur', cat: 'sociaal', title: 'Samen is beter', desc: 'Speel een uur online samen met een tweede speler', stat: 'coopTime', goal: 3600, unit: 's' },
  { id: 'reuzenrad_1', cat: 'verkennen', title: 'Boven de kermis', desc: 'Draai een ronde mee in het reuzenrad', stat: 'reuzenradRides', goal: 1 },
  { id: 'reuzenrad_5', cat: 'verkennen', title: 'Rad van avontuur', desc: 'Draai vijf keer mee in het reuzenrad', stat: 'reuzenradRides', goal: 5 },
  { id: 'botsauto_10', cat: 'verkennen', title: 'Kermisvaste', desc: "Rij tien ritjes in de botsauto's", stat: 'botsautoRides', goal: 10 },
  { id: 'kart_5', cat: 'verkennen', title: 'Kartvaste', desc: 'Rij vijf kartraces op de baan in Ulrum', stat: 'kartRaces', goal: 5 },
  { id: 'drift_5', cat: 'rijden', title: 'Dwars door de bocht', desc: 'Rond vijf driftruns af', stat: 'driftRuns', goal: 5 },
  { id: 'padel_10', cat: 'verkennen', title: 'Padelvaste', desc: 'Speel tien potjes padel', stat: 'padelMatches', goal: 10 },
  { id: 'varen_5', cat: 'rijden', title: 'Zeebenen', desc: 'Vaar in totaal 5 km over het water', stat: 'sailed', goal: 5000, unit: 'm' },
  { id: 'varen_25', cat: 'rijden', title: 'Kapitein van de Diepenring', desc: 'Vaar in totaal 25 km over het water', stat: 'sailed', goal: 25000, unit: 'm' },
  { id: 'ster_5_lang', cat: 'politie', title: 'Op de vlucht', desc: 'Blijf tien minuten achter elkaar gezocht', stat: 'wantedStreak', goal: 600, unit: 's', hidden: true },
  { id: 'reizen_25', cat: 'spoor', title: 'Vaste klant op het spoor', desc: 'Reis 25 keer met de trein', stat: 'trainTrips', goal: 25 },
  { id: 'slapen_5', cat: 'sociaal', title: 'Goed uitgerust', desc: 'Slaap vijf keer in je eigen bed', stat: 'slept', goal: 5 },
  { id: 'hengel_5', cat: 'verkennen', title: 'Geduldige visser', desc: 'Hengel vijf rondes in Meerstad', stat: 'hengelSessions', goal: 5 },
  { id: 'vis_10', cat: 'verkennen', title: 'Tien soorten', desc: 'Vang tien verschillende vissoorten voor je visboek', set: 'vissoorten', goal: 10 },
  { id: 'vis_20', cat: 'verkennen', title: 'Twintig soorten', desc: 'Vang twintig verschillende vissoorten voor je visboek', set: 'vissoorten', goal: 20 },
  { id: 'vis_alles', cat: 'verkennen', title: 'Alle vis van het Noorden', desc: 'Vang alle 29 vissoorten uit het visboek' },
  { id: 'vis_plekken_5', cat: 'verkennen', title: 'Vijf viswateren', desc: 'Hengel op vijf verschillende wateren', set: 'visplekken', goal: 5 },
  { id: 'vis_plekken_15', cat: 'verkennen', title: 'Vaste bezoeker van het water', desc: 'Hengel op vijftien verschillende wateren', set: 'visplekken', goal: 15 },
  { id: 'vis_100', cat: 'verkennen', title: 'Honderd vissen', desc: 'Vang honderd vissen', stat: 'visVangsten', goal: 100 },
  { id: 'vis_gracht', cat: 'verkennen', title: 'Grachtenvisser', desc: 'Vang alle soorten van de stadsgrachten' },
  { id: 'vis_plas', cat: 'verkennen', title: 'Plasvisser', desc: 'Vang alle soorten van de plassen en vijvers' },
  { id: 'vis_meer', cat: 'verkennen', title: 'Heer van het meer', desc: 'Vang alle soorten van de meren' },
  { id: 'vis_kanaal', cat: 'verkennen', title: 'Kanaaljager', desc: 'Vang alle soorten van de kanalen en vaarten' },
  { id: 'vis_rivier', cat: 'verkennen', title: 'Riviermeester', desc: 'Vang alle soorten van de rivieren en diepen' },
  { id: 'vis_sloot', cat: 'verkennen', title: 'Slootjesspringer', desc: 'Vang alle soorten van de sloten' },
  { id: 'vis_wad', cat: 'verkennen', title: 'Waddenvisser', desc: 'Vang alle soorten van de Waddenzee en de Dollard' },
  { id: 'vis_meerval', cat: 'verkennen', title: 'De reus van het Noorden', desc: 'Vang een meerval', hidden: true },
  { id: 'skate_10', cat: 'verkennen', title: 'Skatepark-vaste', desc: 'Skate tien rondes in het Stadspark', stat: 'skateRuns', goal: 10 },
  { id: 'drift_5000', cat: 'rijden', title: 'Rookwolk', desc: 'Haal 5.000 punten in één driftronde', hidden: true },
  { id: 'trein_meerijden_5', cat: 'spoor', title: 'Raampje open', desc: 'Kijk vijf treinritten helemaal uit zonder over te slaan', stat: 'trainRidesWatched', goal: 5 },
  { id: 'oefenronde_klaar', cat: 'verkennen', title: 'Eerst oefenen', desc: 'Rond de oefenronde in het menu af' },
  { id: 'opnieuw_3', cat: 'missies', title: 'Nog een keertje', desc: 'Begin na een mislukte missie drie keer opnieuw met {ENTER}', stat: 'missionRetries', goal: 3 },
  { id: 'heli_10', cat: 'verkennen', title: 'Piloot van Grunn', desc: 'Maak tien helikoptervluchten', stat: 'heliRuns', goal: 10 },
];
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

let life = blankLife();
let perSave = { eierballen: new Set(), beppe: new Set() };
let world = null;
let writeTimer = 0;
let toastEl = null;
let toastQueue = [];
let toastUntil = 0;
let toastTimer = 0;
let toastMeld = null; // melding.js: het balkje en de timer van de kaart die nu staat
let toastBurst = 0;      // hoeveelste prestatiekaart van deze reeks (0 = de eerste: een volle kaart; queueStep)
let momentTimers = [];   // geluid, balk, teller en glans van de kaart die nu staat

function blankLife() {
  return { v: 1, unlocked: {}, stats: {}, sets: {}, missions: {}, missionModes: {}, challenges: {}, fresh: [] };
}

function fmtTime(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
export { fmtTime as formatMissionTime };

function loadLife() {
  life = blankLife();
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || d.v !== 1) return;
    if (d.unlocked && typeof d.unlocked === 'object') for (const [id, t] of Object.entries(d.unlocked)) if (BY_ID.has(id)) life.unlocked[id] = Number(t) || 1;
    if (d.stats && typeof d.stats === 'object') for (const [k, v] of Object.entries(d.stats)) if (Number.isFinite(v)) life.stats[k] = v;
    if (d.sets && typeof d.sets === 'object') for (const [k, v] of Object.entries(d.sets)) if (Array.isArray(v)) life.sets[k] = v.filter((s) => typeof s === 'string');
    if (d.missions && typeof d.missions === 'object') {
      for (const [i, r] of Object.entries(d.missions)) {
        if (!MISSION_GOALS[i] || !r) continue;
        life.missions[i] = { best: Number.isFinite(r.best) ? r.best : null, medal: Math.max(0, Math.min(3, r.medal | 0)), runs: r.runs | 0 };
      }
    }
    // #800: de records van de andere moeilijkheidsstanden; de standaardstand blijft in life.missions
    if (d.missionModes && typeof d.missionModes === 'object') {
      for (const mode of DIFFICULTY_MODES) {
        if (mode === 'standaard') continue;
        const bron = d.missionModes[mode];
        if (!bron || typeof bron !== 'object') continue;
        const uit = {};
        for (const [i, r] of Object.entries(bron)) {
          if (!MISSION_GOALS[i] || !r) continue;
          uit[i] = { best: Number.isFinite(r.best) ? r.best : null, medal: Math.max(0, Math.min(3, r.medal | 0)), runs: r.runs | 0 };
        }
        life.missionModes[mode] = uit;
      }
    }
    if (Array.isArray(d.fresh)) life.fresh = d.fresh.filter((id) => life.unlocked[id]);
    if (d.challenges && typeof d.challenges === 'object') {
      for (const [id, r] of Object.entries(d.challenges)) {
        if (!r || typeof r !== 'object') continue;
        life.challenges[id] = { best: Number.isFinite(r.best) ? r.best : null, medal: Math.max(0, Math.min(3, r.medal | 0)), runs: r.runs | 0, lower: !!r.lower };
      }
    }
  } catch (e) { /* ignore */ }
}

// A second tab may have written since we loaded: fold its progress in so
// neither tab erases the other's unlocks.
function mergeStored() {
  const mine = life;
  loadLife();
  const other = life;
  life = mine;
  for (const [id, t] of Object.entries(other.unlocked)) if (!life.unlocked[id]) life.unlocked[id] = t;
  for (const [k, v] of Object.entries(other.stats)) if (!(life.stats[k] >= v)) life.stats[k] = v;
  for (const [k, list] of Object.entries(other.sets)) {
    const cur = life.sets[k] || (life.sets[k] = []);
    for (const s of list) if (!cur.includes(s)) cur.push(s);
  }
  for (const [i, r] of Object.entries(other.missions)) {
    const cur = life.missions[i];
    if (!cur) { life.missions[i] = r; continue; }
    if (r.best != null && (cur.best == null || r.best < cur.best)) cur.best = r.best;
    cur.medal = Math.max(cur.medal, r.medal);
    cur.runs = Math.max(cur.runs, r.runs);
  }
  for (const [mode, map] of Object.entries(other.missionModes || {})) {
    const cur = life.missionModes[mode] || (life.missionModes[mode] = {});
    for (const [i, r] of Object.entries(map || {})) {
      const oud = cur[i];
      if (!oud) { cur[i] = r; continue; }
      if (r.best != null && (oud.best == null || r.best < oud.best)) oud.best = r.best;
      oud.medal = Math.max(oud.medal, r.medal);
      oud.runs = Math.max(oud.runs, r.runs);
    }
  }
  for (const [id, r] of Object.entries(other.challenges || {})) {
    const cur = life.challenges[id];
    if (!cur) { life.challenges[id] = r; continue; }
    if (r.best != null && (cur.best == null || (r.lower ? r.best < cur.best : r.best > cur.best))) cur.best = r.best;
    cur.medal = Math.max(cur.medal, r.medal);
    cur.runs = Math.max(cur.runs, r.runs);
  }
}

function writeNow() {
  writeTimer = 0;
  try {
    mergeStored();
    localStorage.setItem(KEY, JSON.stringify(life));
  } catch (e) { /* ignore */ }
}

function markDirty(now = false) {
  if (now) {
    if (writeTimer) clearTimeout(writeTimer);
    writeNow();
    return;
  }
  if (!writeTimer) writeTimer = setTimeout(writeNow, WRITE_DELAY_MS);
}

loadLife();
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (writeTimer) { clearTimeout(writeTimer); writeNow(); } });
}

export function initAchievements(w) {
  world = w;
}

// cheats.js: while it returns true nothing unlocks and no lifetime stat moves.
let gate = null;
export function setAchievementGate(fn) {
  gate = fn;
}
const gated = () => !!(gate && gate());
export const achievementsGated = gated;

// loopbaanlive.js (#381) hears every counted stat, and reads what was counted before there was a career.
let statListener = null;
export function setStatListener(fn) {
  statListener = typeof fn === 'function' ? fn : null;
}
// gebiedenlive.js (#414) hears every new unique (a find, a secret) too.
let uniekListener = null;
export function setUniekListener(fn) {
  uniekListener = typeof fn === 'function' ? fn : null;
}
export function lifetimeSnapshot() {
  return { stats: { ...life.stats }, sets: Object.fromEntries(Object.entries(life.sets).map(([k, v]) => [k, v.slice()])) };
}

// gebieden (#435): de prestaties voor een buurt, wijk, woonplaats, gemeente of provincie tonen hun voortgang als een
// ring met het aantal gebieden van die laag. achievementtracker.js levert de stand uit gebiedenlive.js (getOverzicht):
// { buurt: { klaar, totaal }, ..., kaart: { klaar, totaal } }.
let gebiedStand = null;
export function setGebiedStand(fn) {
  gebiedStand = typeof fn === 'function' ? fn : null;
}
const laagVan = (a) => (!a.stat ? null : a.stat === 'kaartVerkend' ? 'kaart' : a.stat.startsWith('gebied_') ? a.stat.slice(7) : null);
function leesGebiedStand() {
  if (!gebiedStand) return null;
  try { return gebiedStand(); } catch (e) { return null; }
}

// --- progress --------------------------------------------------------------

// De beste medaille per missie over álle moeilijkheidsstanden (#800 schrijft een andere stand in
// life.missionModes). Zonder dit telde een goud op Ontspannen wel in de missielijst maar niet in
// de medaille-prestaties, en bleef "Gouden Eierbal" op 0/8 staan.
function bestPerMission() {
  const uit = {};
  for (const [i, r] of Object.entries(life.missions)) uit[i] = Math.max(0, r.medal | 0);
  for (const map of Object.values(life.missionModes)) {
    for (const [i, r] of Object.entries(map || {})) uit[i] = Math.max(uit[i] || 0, r.medal | 0);
  }
  return uit;
}

function derived(key) {
  if (key === 'missionsDone') return MISSION_GOALS.filter((g, i) => life.unlocked[`m${i + 1}_klaar`]).length;
  // een missie telt één keer, met zijn beste medaille, niet één keer per stand
  const recs = Object.values(bestPerMission());
  if (key === 'silverPlus') return recs.filter((m) => m >= 2).length;
  if (key === 'goldCount') return recs.filter((m) => m >= 3).length;
  // #1169: een missie telt als uitgespeeld op Uitdagend zodra hij op dat niveau is afgerond (het record van die stand heeft een run)
  if (key === 'uitdagendKlaar') return Object.values(life.missionModes.uitdagend || {}).filter((r) => r && (r.runs | 0) >= 1).length;
  return 0;
}

function progressOf(a) {
  if (a.stat) return life.stats[a.stat] || 0;
  if (a.set) return (life.sets[a.set] || []).length;
  if (a.save) return perSave[a.save] ? perSave[a.save].size : 0;
  if (a.count) return derived(a.count);
  return null;
}

function checkGoals(filter) {
  for (const a of ACHIEVEMENTS) {
    if (!a.goal || life.unlocked[a.id] || !filter(a)) continue;
    if (progressOf(a) >= a.goal) unlockAchievement(world, a.id);
  }
}

export function isUnlocked(id) {
  return !!life.unlocked[id];
}

export function getStat(key) {
  return life.stats[key] || 0;
}

export function recordStat(w, key, n = 1) {
  if (!Number.isFinite(n) || !n || gated()) return;
  if (w) world = w;
  life.stats[key] = (life.stats[key] || 0) + n;
  markDirty();
  checkGoals((a) => a.stat === key);
  if (statListener) statListener(world, key, n);
}

export function setStatMax(w, key, value) {
  if (!Number.isFinite(value) || value <= (life.stats[key] || 0) || gated()) return;
  if (w) world = w;
  life.stats[key] = value;
  markDirty();
  checkGoals((a) => a.stat === key);
}

export function recordUnique(w, key, value) {
  if (typeof value !== 'string' || !value || gated()) return false;
  if (w) world = w;
  const list = life.sets[key] || (life.sets[key] = []);
  if (list.includes(value)) return false;
  list.push(value);
  markDirty();
  checkGoals((a) => a.set === key);
  if (uniekListener) uniekListener(world, key, value);
  return true;
}

// A lifetime mark outside the prestaties (the streken a player has
// unlocked, cheats.js): no goal checks, never gated.
export function markLifetime(key, value) {
  const list = life.sets[key] || (life.sets[key] = []);
  if (list.includes(value)) return false;
  list.push(value);
  markDirty();
  return true;
}

export function hasUnique(key, value) {
  return (life.sets[key] || []).includes(value);
}

export function uniqueCount(key) {
  return (life.sets[key] || []).length;
}

export function getSaveSet(key) {
  return perSave[key] || (perSave[key] = new Set());
}

export function addToSaveSet(w, key, value) {
  const s = getSaveSet(key);
  if (s.has(value)) return false;
  s.add(value);
  if (w) world = w;
  checkGoals((a) => a.save === key);
  return true;
}

export function unlockAchievement(w, id, { silent = false } = {}) {
  const a = BY_ID.get(id);
  if (!a || life.unlocked[id] || gated()) return false;
  if (w) world = w;
  life.unlocked[id] = Date.now();
  markDirty(true);
  if (!silent) { queueToast(a); life.fresh.push(id); }
  checkGoals((x) => !!x.count);
  return true;
}

// Unlocked since the player last opened Prestaties (the HUD chip).
export function unseenAchievementCount() {
  return life.fresh.length;
}

export function markAchievementsSeen() {
  if (!life.fresh.length) return;
  life.fresh = [];
  markDirty();
}

export function isAchievementFresh(id) {
  return life.fresh.includes(id);
}

// --- missions ---------------------------------------------------------------

export function getMissionRecord(i, mode = cleanDifficulty(getSettings().difficulty)) {
  if (mode !== 'standaard') return (life.missionModes[mode] && life.missionModes[mode][i]) || null;
  return life.missions[i] || null;
}

// De prestatie van een opdracht die je meespeelde in de wereld van iemand anders (#429): alleen "klaar", zonder tijd,
// medaille of record — die zijn van de wereld waar de opdracht liep. savegame.js zet hem in de save van de gast;
// bij het terugkeren naar zijn eigen spel leest applyAchievementSaveData hem weer in.
export const missieKlaarId = (i) => (MISSION_GOALS[i] ? `m${i + 1}_klaar` : null);

// result: { time, medal, extra } - returns what changed for the HUD message.
export function recordMissionResult(w, i, result) {
  if (!MISSION_GOALS[i]) return null;
  // #800: een missie in een andere stand schrijft in zijn eigen record en laat de standaardstand staan.
  const mode = cleanDifficulty(getSettings().difficulty);
  const map = mode === 'standaard' ? life.missions : (life.missionModes[mode] || (life.missionModes[mode] = {}));
  const prev = map[i] || { best: null, medal: 0, runs: 0 };
  const rec = { ...prev, runs: prev.runs + 1 };
  const newBest = rec.best == null || result.time < rec.best;
  if (newBest) rec.best = Math.round(result.time * 10) / 10;
  const newMedal = result.medal > rec.medal;
  if (newMedal) rec.medal = result.medal;
  map[i] = rec;
  markDirty(true);
  const n = i + 1;
  unlockAchievement(w, `m${n}_klaar`);
  if (result.medal >= 3) unlockAchievement(w, `m${n}_goud`);
  if (result.extra) unlockAchievement(w, `m${n}_extra`);
  checkGoals((a) => !!a.count);
  return { newBest: newBest && prev.best != null, newMedal, prevBest: prev.best, medal: result.medal };
}

// --- post-game challenges (postgame.js) -------------------------------------
// Lifetime best per challenge id: a time (lower: true) or a score/distance.

export function getChallengeRecord(id) {
  return life.challenges[id] || null;
}

export function recordChallengeResult(w, id, { value, medal = 0, lower = false }) {
  if (!Number.isFinite(value)) return null;
  const prev = life.challenges[id] || { best: null, medal: 0, runs: 0, lower };
  const rec = { ...prev, runs: prev.runs + 1, lower };
  const newBest = rec.best == null || (lower ? value < rec.best : value > rec.best);
  if (newBest) rec.best = Math.round(value * 10) / 10;
  if (medal > rec.medal) rec.medal = medal;
  life.challenges[id] = rec;
  if (w) world = w;
  markDirty(true);
  // the end of a minigame has a cue: a medal gets its sting, a plain finish a soft ping (the UI tones of audio.js)
  if (w && Array.isArray(w.audioEvents) && w.audioEvents.length < 32) w.audioEvents.push({ kind: medal >= 2 ? 'achievement' : medal > 0 ? 'prestatie' : 'notify', medal });
  return { newBest: newBest && prev.best != null, prevBest: prev.best, medal: rec.medal };
}

// --- savegame ---------------------------------------------------------------

export function getAchievementSaveData() {
  return { eierballen: [...getSaveSet('eierballen')], geheimen: [...getSaveSet('geheimen')], knutselwagen: [...getSaveSet('knutselwagen')], beppe: [...getSaveSet('beppe')], unlocked: Object.keys(life.unlocked) };
}

export function applyAchievementSaveData(d) {
  perSave = { eierballen: new Set(), geheimen: new Set(), knutselwagen: new Set(), beppe: new Set() };
  if (!d || typeof d !== 'object') return;
  if (Array.isArray(d.eierballen)) for (const id of d.eierballen) if (typeof id === 'string') perSave.eierballen.add(id);
  if (Array.isArray(d.geheimen)) for (const id of d.geheimen) if (typeof id === 'string') perSave.geheimen.add(id);
  if (Array.isArray(d.knutselwagen)) for (const id of d.knutselwagen) if (typeof id === 'string') perSave.knutselwagen.add(id);
  if (Array.isArray(d.beppe)) for (const id of d.beppe) if (typeof id === 'string') perSave.beppe.add(id); // het Beppe-verhaal (#1063): per save
  let merged = false;
  if (Array.isArray(d.unlocked)) {
    for (const id of d.unlocked) if (BY_ID.has(id) && !life.unlocked[id]) { life.unlocked[id] = 1; merged = true; }
  }
  if (merged) markDirty(true);
}

// --- views ------------------------------------------------------------------

// retired prestaties (missions the story no longer plays) show only when earned in an older save
const visibleAch = (a) => !a.retired || !!life.unlocked[a.id];

export function getAchievementSummary() {
  const list = ACHIEVEMENTS.filter(visibleAch);
  const total = list.length;
  const done = list.filter((a) => life.unlocked[a.id]).length;
  return { done, total, pct: total ? Math.floor((done / total) * 100) : 0 };
}

export function getAchievementView() {
  const stand = leesGebiedStand(); // één keer per overzicht: het opbouwen van de indeling is niet gratis
  return CATEGORIES.map(([cat, label]) => {
    const items = ACHIEVEMENTS.filter((a) => a.cat === cat && visibleAch(a)).map((a) => {
      const unlocked = !!life.unlocked[a.id];
      let cur = progressOf(a);
      let goal = a.goal;
      // een prestatie voor een hele laag (doel 1) laat de ring van die laag zien: 3 van 123 wijken. Een mijlpaal houdt
      // zijn eigen doel (vijf wijken, een kwart van de kaart).
      const laag = a.goal ? laagVan(a) : null;
      const s = stand && laag && stand[laag] && stand[laag].totaal > 0 ? stand[laag] : null;
      if (s && a.goal === 1) { cur = s.klaar; goal = s.totaal; }
      return {
        id: a.id, cat: a.cat, unlocked, hidden: !!a.hidden && !unlocked, medal: !!a.medal,
        title: a.title, desc: a.desc, at: unlocked && life.unlocked[a.id] > 1 ? life.unlocked[a.id] : 0,
        progress: goal && goal > 1 && cur != null ? { cur: Math.min(cur, goal), goal, unit: a.unit || '' } : null,
      };
    });
    return { cat, label, items, done: items.filter((x) => x.unlocked).length };
  });
}

export function getLifetimeStats() {
  const s = life.stats;
  return {
    driven: s.driven || 0, walked: s.walked || 0, swum: s.swum || 0, topSpeed: s.topSpeed || 0,
    nearMiss: s.nearMiss || 0, stolen: s.stolen || 0, kisses: s.kisses || 0, wrecks: s.wrecks || 0,
    trainTrips: s.trainTrips || 0,
    wijken: (life.sets.wijken || []).length, eierballen: getSaveSet('eierballen').size,
  };
}

// --- toast ------------------------------------------------------------------

const CSS = `
/* #1175 (eigenaar 21-11: "past visueel niet meer in het design system v3"): de prestatietoast als DS3-zeefdruk, net als de andere meldingen:
   een papieren kaart met inktrand en harde schaduw, het icoon in een vak in de inkt van de zeldzaamheid of categorie (--ds-m-accent,
   ds-micro.css: goud geel, geheim roze, anders bord of inkt), een eyebrow, een titel in Barlow, een regel in Atkinson, de voortgangsbalk
   "x/y prestaties" en onderaan het aflopende balkje van de melding (ds-melding.css, bordgroen). Alleen tokens, geen glas, gloed, stralen of vonken. */
#hud .ach-toast { position: absolute; top: auto; bottom: calc(var(--mm-bottom, 46px) + var(--mm-size, 250px) + 14px); left: var(--hud-edge, 46px); z-index: 6; display: flex; align-items: center; gap: var(--ds-s-3);
  --ach-rand: var(--ds-m-accent, var(--ds-c-ink-bord)); --ach-vul: var(--ds-m-accent, var(--ds-c-ink-bord));
  min-width: 340px; max-width: calc(100vw / var(--ui, 1) - 32px); box-sizing: border-box; padding: var(--ds-s-3) var(--ds-s-5) calc(var(--ds-s-3) + var(--ds-melding-balk-h, 4px)) var(--ds-s-3);
  background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); text-shadow: none; border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-left: 10px solid var(--ach-rand); border-radius: var(--ds-r);
  box-shadow: var(--ds-schaduw-hard); overflow: hidden; transform-origin: left center;
  opacity: 0; --ds-mi-x: -8px; pointer-events: none; } /* ds-motion.css (.ds-mi-in): 8 px vanaf de linkerrand, 200 ms in en uit */
#hud .ach-toast.on { opacity: 1; }
#hud .ach-toast.ds-m-inkt--inkt { --ach-rand: var(--ds-c-ink-inkt); --ach-vul: var(--ds-c-ink-inkt); }
/* Tijdens een minigame staat het bord met de toetshulp bovenaan rechts: de prestatiekaart zakt dan naar
   de onderkant in plaats van eroverheen te vallen (#504). */
body.mg-on #hud .ach-toast { top: auto; bottom: max(calc(13vh / var(--ui, 1)), 104px); }
/* het icoon in een vak: papier met inktrand, gevuld in de inkt van de zeldzaamheid */
#hud .ach-toast .ach-badge { flex: none; width: 56px; height: 56px; display: grid; place-items: center; box-sizing: border-box; background: var(--ds-m-accent, var(--ds-c-ink-bord)); color: var(--ds-c-ink-inkt); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); }
#hud .ach-toast.ds-m-inkt--bord .ach-badge { color: var(--ds-c-wit); }
#hud .ach-toast .ach-ico { display: grid; place-items: center; width: 32px; height: 32px; }
#hud .ach-toast .ach-pic, #hud .ach-toast .ach-ico svg { width: 32px; height: 32px; }
#hud .ach-toast .ach-txt { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
#hud .ach-toast .ach-kicker { display: flex; flex-wrap: wrap; align-items: center; gap: var(--ds-s-1) var(--ds-s-2); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-kaart-eyebrow); letter-spacing: var(--ds-ls-kaart-eyebrow); text-transform: uppercase; color: var(--ds-c-inkt-zacht); }
#hud .ach-toast .ach-title { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-kaart-titel); line-height: var(--ds-lh-kaart-kop); letter-spacing: var(--ds-ls-label); color: var(--ds-c-ink-inkt); text-shadow: none; }
#hud .ach-toast .ach-title .nl-sub { font-size: 0.55em; letter-spacing: 0.5px; text-transform: none; }
#hud .ach-toast .ach-desc { font: 400 var(--ds-t-kaart-body)/var(--ds-lh-kaart-tekst) var(--ds-font-zeef-tekst); letter-spacing: 0; color: var(--ds-c-inkt-zacht); }
#hud .ach-toast .ach-pct { font-family: var(--ds-font-zeef-tekst); font-weight: 400; font-size: var(--ds-t-kaart-hulp); letter-spacing: 0; text-transform: none; }
#hud .ach-toast .ach-zeld { display: inline-block; padding: 0 var(--ds-s-2); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil, 999px); background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); font-size: var(--ds-t-kaart-hulp); letter-spacing: 0.06em; }
#hud .ach-toast.gold .ach-zeld { background: var(--ds-c-ink-geel); }
#hud .ach-toast .ach-prog { display: flex; align-items: center; gap: var(--ds-s-2); margin-top: var(--ds-s-1); }
#hud .ach-toast .ach-prog-baan { flex: 1 1 auto; min-width: 96px; height: 10px; box-sizing: border-box; background: var(--ds-c-ink-papier); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil, 999px); overflow: hidden; }
#hud .ach-toast .ach-prog-vul { display: block; width: 100%; height: 100%; background: var(--ach-vul); }
#hud .ach-toast .ach-prog-tx { font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-kaart-hulp); letter-spacing: 0.02em; color: var(--ds-c-inkt-zacht); white-space: nowrap; }
#hud .ach-toast.ach-kort .ach-desc { display: none; }
@media (max-width: 480px) { #hud .ach-toast { left: 50%; min-width: 0; width: calc(100vw / var(--ui, 1) - 32px); } }
`;

// De beweging van het DS3-moment (achievementunlock.js, ds-micro.css): de inslag, het icoon dat ploft, de gestaffelde tekst, de balk en de glans
// gebruiken de moment-klassen met de tokens uit ds-tokens.css. Bij Beweging beperken (html.reduce-motion) of prefers-reduced-motion staat
// alle beweging stil en blijft de eindstand staan.
const CSS_EXTRA = `
html.reduce-motion #hud .ach-toast, html.reduce-motion #hud .ach-toast .ach-title { animation: none !important; transition: none !important; transform: none; }
html.reduce-motion #hud .ach-toast.on { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  #hud .ach-toast, #hud .ach-toast .ach-title { animation: none !important; transition: none !important; transform: none; }
  #hud .ach-toast.on { opacity: 1; transform: none; }
}
`;

export const TROPHY_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z"/></svg>';

function ensureToast() {
  if (toastEl || typeof document === 'undefined') return toastEl;
  const hud = document.getElementById('hud');
  if (!hud) return null;
  const style = document.createElement('style');
  style.textContent = CSS + CSS_EXTRA;
  document.head.appendChild(style);
  toastEl = document.createElement('div');
  toastEl.className = 'ach-toast ds-mi-in ds-melding';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  hud.appendChild(toastEl);
  return toastEl;
}


// De hele reeks prestaties van dit moment is een melding in de wachtrij (notifyqueue.js): de toasts volgen elkaar zelf op
// (queueStep, samenvatting), de wachtrij geeft ze het slot zolang de reeks loopt en houdt andere meldingen dan tegen.
let toastSlot = false;
function queueToast(a) {
  toastQueue.push(a);
  if (toastSlot && noticeQueue.hasSurface('toast')) return;
  toastSlot = true;
  enqueueNotice('achievement', {
    key: 'achievement-burst',
    surface: 'toast',
    duration: TOAST_S,
    maxHold: 180,
    keep: true,
    show: () => { if (!toastUntil) showNextToast(); },
    until: () => { const klaar = !toastUntil && !toastQueue.length; if (klaar) toastSlot = false; return klaar; },
    cut: () => { toastQueue.splice(0); if (toastMeld) { toastMeld.timer.sluit(); toastMeld.tik(); } },
  });
}

// Waits out cutscenes and menus so an unlock is never shown where nobody sees it.
function toastBlocked() {
  const b = document.body;
  if (!b.classList.contains('game-started') || b.classList.contains('cine-hide-hud')) return true;
  // narrative.js: held during cutscenes and story calls, a beat apart from other toasts
  if (noticeHeld(['dialogue', 'mission'])) return true;
  if (!mayStart('award')) return true;
  // de resultaatkaart, een keuzepaneel of een duelbalk gaat voor (#239): de prestatie staat in de wachtrij
  if (isOverlayHeld('prestatie')) return true;
  const pm = document.getElementById('pause-menu');
  return !!(pm && pm.classList.contains('visible'));
}

export function toastDuur(title, desc) {
  return Math.max(TOAST_S, 1.2 + 0.06 * (String(title || '').length + String(desc || '').length));
}

function showNextToast() {
  const el = ensureToast();
  if (el && toastQueue.length && toastBlocked()) {
    toastUntil = 1;
    toastTimer = setTimeout(showNextToast, 500);
    return;
  }
  const a = toastQueue[0];
  if (!el || !a) { toastUntil = 0; toastBurst = 0; return; }
  // De wachtrij (achievementunlock.js, queueStep): de eerste van een reeks is een volle kaart, de volgende zijn kort, en
  // wachten er na drie nog meer, dan komen ze samen in één samenvatting (de prestaties zelf staan in het menu).
  const stap = queueStep({ index: toastBurst, resterend: toastQueue.length });
  const samen = stap.variant === 'samenvatting' ? samenvattingTekst(stap.aantal) : null;
  // #643: de toast bezet zone E via het zonebord, net als een kaart van hudcards.js; is de zone bezet,
  // dan wacht hij even in plaats van over de plaatsnaam of het activiteitenbord te vallen (de prestatie blijft in de wachtrij).
  if (!zones.occupy('E', 'ach', P3)) {
    toastUntil = 1;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(showNextToast, 500);
    return;
  }
  if (samen) toastQueue.splice(0); else toastQueue.shift();
  toastBurst++;
  noteToast();
  wisMomentTimers();
  const gold = !samen && (a.medal || a.id === 'alle_goud');
  const rustig = calmState();
  const { done, total, pct } = getAchievementSummary();
  const plan = planPrestatie({ id: a.id, cat: a.cat, medal: a.medal, hidden: a.hidden, behaald: done, totaal: total, kort: stap.variant !== 'vol', rustig });
  const inkt = samen ? 'bord' : plan.inkt;
  const zeld = samen ? 'gewoon' : plan.zeldzaam;
  el.classList.toggle('gold', !!gold);
  el.classList.toggle('ach-kort', stap.variant !== 'vol');
  for (const k of ['bord', 'roze', 'geel', 'inkt']) el.classList.toggle('ds-m-inkt--' + k, k === inkt);
  const m = (x, kl) => (plan.impact && x ? ` ${kl}" style="--ds-moment-n:${x.eenh}` : '');
  const titel = samen ? escHtml(samen.titel) : dualHtml(a.title);
  const tekst = samen ? samen.tekst : a.desc;
  const nog = !samen && stap.nog > 0 ? `<span class="ach-zeld">nog ${stap.nog}</span>` : '';
  const chip = zeld === 'goud' ? '<span class="ach-zeld">Goud</span>' : zeld === 'zeldzaam' ? '<span class="ach-zeld">Geheim</span>' : '';
  const balkP = plan.balk ? (plan.impact ? plan.balk.pctVan : plan.balk.pctNaar) / 100 : 0;
  const balk = plan.balk && !samen
    ? `<span class="ach-prog${m(plan.balk, 'ds-moment-binnen')}"><span class="ach-prog-baan ds-m-glans"><span class="ach-prog-vul ds-m-vul" style="--ds-m-p:${balkP}"></span></span>` +
      `<span class="ach-prog-tx ds-m-tik">${balkTekst(plan.impact ? plan.balk.van : plan.balk.naar, plan.balk.totaal)}</span></span>`
    : '';
  // #1175: het icoon in een vak (aria-hidden); de tekst is de Nederlandse kicker/titel/beschrijving voor de schermlezer.
  el.innerHTML = `<span class="ach-badge" aria-hidden="true"><span class="ach-ico${m(plan.icoon, 'ds-moment-ploft')}">${samen || a.hidden ? TROPHY_SVG : iconSvg(a, 'ach-pic')}</span></span>` +
    `<span class="ach-txt">` +
    `<span class="ach-kicker${m(plan.icoon, 'ds-moment-binnen')}">${samen ? 'PRESTATIES ONTGRENDELD' : 'PRESTATIE ONTGRENDELD'}${chip}${nog}${samen ? '' : `<span class="ach-pct">${pct >= 1 ? pct : '&lt;1'}% totaal</span>`}</span>` +
    `<span class="ach-title${m(plan.titel, 'ds-moment-binnen')}">${titel}</span><span class="ach-desc${m(plan.beschrijving, 'ds-moment-binnen')}">${escHtml(tekst)}</span>${balk}</span>` +
    (plan.impact && plan.glans ? `<span class="ds-moment-glans ds-moment-veeg" style="--ds-moment-n:${plan.glans.eenh}" aria-hidden="true"></span>` : '');
  // ds-motion.css: eerst zonder overgang terug naar de startplek (de vorige toast faadde uit zonder te bewegen), dan inschuiven
  el.style.transition = 'none';
  el.classList.remove('out', 'ds-moment-stempel');
  void el.offsetWidth;
  el.style.transition = '';
  el.classList.add('on');
  if (plan.impact) el.classList.add('ds-moment-stempel'); // de inslag van de kaart (overshoot, 250 ms); bij het vertrek eraf, anders houdt de animatie de dekking vast
  momentGeluid(plan, !!gold, stap.variant === 'vol');
  if (plan.impact) momentTimers.push(...momentStappen(el, plan));
  toastUntil = 1;
  if (toastTimer) clearTimeout(toastTimer);
  if (toastMeld) toastMeld.stop();
  // De kaart houdt zijn eigen moment (ds-micro.css) en krijgt het gedeelde aflopende balkje (melding.js): de tijd staat stil bij
  // pauze, menu, film en als de muis erboven staat. De duur is een gedeelde klas (4 / 6 / 9 / 10 s).
  toastMeld = runNoticeTimer(el, {
    duur: toClass(verblijfS(toastDuur(samen ? samen.titel : a.title, tekst), stap.variant)),
    hover: true,
    staat: () => !!(world && (world.paused || world.uiPaused)),
    onKlaar: () => {
      wisMomentTimers();
      el.classList.remove('on', 'ds-moment-stempel');
      el.classList.add('out');
      zones.vacate('E', 'ach');
      toastTimer = setTimeout(() => { if (!toastQueue.length) toastBurst = 0; showNextToast(); }, 450);
    },
  });
}

// De timers van het moment (geluid, balk, teller, glans): bij een nieuwe kaart of het vertrek allemaal weg.
function wisMomentTimers() { for (const t of momentTimers) clearTimeout(t); momentTimers = []; }

// Het geluid van het moment, alleen lokaal (de audioEvents zijn van dit apparaat; er gaat niets over het net, #429): de bestaande
// prestatie-sting (alleen bij een volle kaart) plus de slag, de tikjes van de teller en de glans uit het plan. Het geluid komt van
// de plek waar de speler staat; die plek vragen we via de leesbare ingang (#500), want dit is geen eigendom van deze module.
function momentGeluid(plan, gold, vol) {
  if (!world) return;
  const q = world.audioEvents || (world.audioEvents = []);
  const p = hoofdspeler(world);
  const x = p ? p.x : 0, y = p ? p.y : 0;
  if (vol && q.length < 64) q.push({ kind: 'prestatie', x, y, goud: !!gold });
  for (const g of plan.geluid) {
    const speel = () => { if (q.length < 64) q.push({ kind: 'prestatiemoment', x, y, naam: g.naam, i: g.i || 0, goud: !!gold }); };
    if (g.at <= 0) speel(); else momentTimers.push(setTimeout(speel, g.at));
  }
}

// De balk vult op zijn tijd, de teller tikt mee en de glans loopt over de baan (ds-micro.css: .ds-m-vul, .ds-m-tik, .ds-m-glanst).
function momentStappen(el, plan) {
  const uit = [];
  const vul = el.querySelector('.ach-prog-vul'), tx = el.querySelector('.ach-prog-tx'), baan = el.querySelector('.ach-prog-baan');
  if (plan.balk && vul) uit.push(setTimeout(() => vul.style.setProperty('--ds-m-p', String(plan.balk.p)), plan.balk.at));
  if (plan.teller && tx) for (const s of plan.teller.stappen) uit.push(setTimeout(() => { tx.textContent = balkTekst(s.waarde, plan.balk.totaal); tikGetal(tx); }, plan.teller.at + s.t));
  if (plan.glans && baan) uit.push(setTimeout(() => baan.classList.add('ds-m-glanst'), plan.glans.at));
  return uit;
}
