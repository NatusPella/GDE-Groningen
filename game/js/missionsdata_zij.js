// Losse zijmissies naast het verhaal (#400): Overlast bij de snackbar in de Herenstraat. Een groepje verzonnen
// jongeren ("de Dikke Banden") hangt met fatbikes voor de deur van de Kroketkoning; snackbarhouder Rinus belt en
// jij zet de klassieke zender van de muziekkar aan tot ze lachend wegfietsen. Drie stappen: kijken, muziek aan,
// wachten. De keten, de groep en de snackbarhouder zijn verzonnen; niemand raakt gewond en er is geen echte winkel.
//
// Data-only in een eigen bestand, zoals missions_nieuw.js: de teksten staan hier en niet in missions.js, zodat de
// voice-coverage (scripts/voicelines_collect.mjs leest missions.js en missionstory.js) ze niet als ontbrekende
// opname telt. Alles is tekst (ondertitel, kaart en HUD-hint): geen opname, geen nieuwe muziek, geen TTS.
// De def krijgt `side: true` en een eigen `mid`: missions.js zet hem achter de verhaalmissies in de missielijst,
// zonder de volgorde of de indices van het verhaal te raken. Tests: scripts/missionsdata_zij_test.mjs.
//
// Samen spelen: dit is een missie van de wereld die het spel opende. De drie stappen zijn goto en hold (wat de
// gaststatus als 'werkt' telt, zie coopstatus.js) en de beloning gaat via succeed() door world.coopDeel naar de
// gasten. Een gast ziet het doel van de gastheer op de kaart; valt de gastheer weg, dan loopt de opdracht door
// zoals bij elke missie met losse stappen. Geen eigen voertuig, rekwisiet of scherm dat alleen de gastheer heeft.
import { nearestOnRoads } from './tileplace.js';
import { SNACKBAR } from './missie_snackbar.js';

// De defs die missions.js aan het eind van buildDefs toevoegt, in deze volgorde (missionicons.js gebruikt dezelfde
// volgorde voor het kaart-icoon).
export const ZIJ_DEFS = ['snackbaroverlast'];

const STRAAT = SNACKBAR.straat;              // 'Herenstraat'
const ZAAK = SNACKBAR.zaak;                  // 'Kroketkoning Herenstraat' (verzonnen keten)
const BAAS = SNACKBAR.baas;                  // 'Snackbarhouder Rinus'
const GROEP = SNACKBAR.groep;                // 'de Dikke Banden'
const Groep = GROEP[0].toUpperCase() + GROEP.slice(1);

// Waar in de Herenstraat: het midden van de straat bij de binnenstad (de snackbar staat eraan), met de muziekkar
// en de groep een paar meter verderop langs de straat. Zonder kaart (een test, een kale wereld) valt hij terug op
// de weg bij de Grote Markt. De echte plek is nog niet met de kaart gecontroleerd (data/cache ontbreekt in de
// worktree), net als bij de bijbaan van #400.
function straatPunt(map) {
  if (!map || typeof map.roadsNear !== 'function') return null;
  return nearestOnRoads(map, 100, 76, 900, (r) => r.name === STRAAT);
}

export function snackbarSpots(map, walk) {
  const hit = straatPunt(map);
  if (hit) {
    const l = Math.hypot(hit.dx, hit.dy) || 1;
    const ux = hit.dx / l, uy = hit.dy / l;
    const at = (o) => walk(hit.x + ux * o, hit.y + uy * o);
    return { start: at(0), kar: at(-7), groep: at(7) };
  }
  return { start: walk(100, 76), kar: walk(94, 76), groep: walk(106, 76) };
}

export function buildZijDefs({ map, walk }) {
  const s = snackbarSpots(map, walk);
  return [
    {
      type: 'stages',
      mid: 'snackbaroverlast',
      side: true,
      label: 'Klassiek in de Herenstraat',
      intro: [
        `${BAAS} van ${ZAAK} belt: ${GROEP} hangen met drie fatbikes voor de deur, en de klanten durven er niet meer langs.`,
        'Doel: kijk wat er staat, zet de klassieke zender van de muziekkar aan en wacht tot ze wegfietsen. Het zijn lieve gasten; ze houden alleen niet van een wals.',
      ],
      outro: `${Groep} zijn weg. ${BAAS} zwaait met een zak patat.`,
      timeLimit: 300,
      timeUp: 'de snackbar gaat dicht en de Dikke Banden hangen er nog',
      costRow: ['Geregeld', 'De stoep van de snackbar is weer vrij'],
      reward: 120,
      onFoot: true,
      start: s.start,
      say: 'Naar de Herenstraat: eerst kijken wie er staan, dan de muziekkar, dan geduld.',
      stages: [
        {
          kind: 'goto', target: { ...s.start, label: 'De snackbar in de Herenstraat' }, mode: 'foot', radius: 8, stop: 1,
          label: 'Kijk bij de snackbar wie er voor de deur staan',
          say: 'Drie fatbikes, drie petten, één muziekkar. Kijk eerst rustig wat er staat.',
        },
        {
          kind: 'hold', target: { ...s.kar, label: 'De muziekkar bij de snackbar' }, radius: 6, time: 3, mode: 'foot',
          ticks: ['De speaker kraakt. Iemand roept: doe eens normaal.', 'Een wals vult de Herenstraat.'],
          label: 'Zet de klassieke zender van de muziekkar aan',
          say: 'De speaker staat naast de muziekkar. Klassiek, hard, en vooral heel beschaafd.',
        },
        {
          kind: 'hold', target: { ...s.groep, label: 'De fatbikes voor de snackbar' }, radius: 9, time: 7, mode: 'foot',
          ticks: ['De eerste fatbike start.', 'Nog twee, met een lach. De stoep is weer vrij.'],
          label: 'Wacht tot de fatbikes wegrijden',
          say: 'Niet zwaaien, niet duwen. Gewoon heel mooi blijven spelen.',
        },
      ],
    },
  ];
}
