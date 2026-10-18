// The new story arc's missions (storyarc_nieuw.js, docs/verhaal/nieuw): its own defs, appended after the
// old ones in the order of MISSION_IDS (append-only: indices live in saves), and how the arc stages the
// defs it shares with the old one. Only used with the feature flag `nieuwverhaal` (storyflag.js).
// Kept out of missions.js so the old arc's voice coverage (scripts/voicelines_collect.mjs reads that
// file) does not see their hint texts, which are text only.

import { buildDeel4Defs, applyDeel4 } from './missions_deel4.js';

// The def pieces: walk(x, y) / drive(x, y) are missions.js's road spots.
export function buildNieuwDefs({ map, walk, drive }) {
  const list = [];
  const lm = (map.meta.landmarks || []).find((l) => l.name === 'Goudkantoor') || { x: 86.5, y: 111.7 };
  const loketAt = (dx, dy) => walk(lm.x + dx, lm.y + dy);
  list.push(
    {
      // M03 Het Loket: a queue puzzle on foot. Jelle bought the queue, so from his scene on the clock runs faster.
      type: 'stages',
      label: 'Het Loket',
      intro: ['Het Loket bij de Grote Markt: om twaalf uur sluit de inschrijving voor de Noordelijke Snackprijs, en het loket neemt alleen contant.', 'Trek een wachtnummer, haal formulier 7B en de stempel, en schrijf in. Voor twaalf uur.'],
      outro: 'Ingeschreven voor de Noordelijke Snackprijs. De Fjord Frituur doet mee.',
      timeLimit: 170,
      reward: 0,
      onFoot: true,
      start: loketAt(8, 14),
      stages: [
        { kind: 'goto', target: { landmark: 'Goudkantoor', off: [3, 7], snap: 'walk', label: 'Het Loket: wachtnummer' }, mode: 'foot', radius: 5, stop: 0.8, label: 'Trek een wachtnummer', say: 'Nummer 4117. Op het scherm staat 4093.' },
        {
          kind: 'scene', label: 'Jelle', kicker: 'Het Loket', script: { ids: ['M03.2'] }, clock: 3,
          cast: [{ key: 'jelle', pose: 'hold', at: [2.6, 0.8] }, { key: 'bewaarder', pose: 'hips', at: [3.6, -1.2] }],
        },
        {
          kind: 'goto', target: { landmark: 'Goudkantoor', off: [-9, 4], snap: 'walk', label: 'Loket A: formulier 7B' }, mode: 'foot', radius: 5, stop: 0.8,
          label: 'Haal formulier 7B bij loket A', say: 'Formulier 7B, in drievoud. Niet vouwen.', talk: { ids: ['M03.3'], from: 0, to: 4, delay: 1.2 },
        },
        {
          kind: 'goto', target: { landmark: 'Goudkantoor', off: [11, -9], snap: 'walk', label: 'Loket C: de zijdeur bij de kopieermachine' }, mode: 'foot', radius: 5, stop: 0.8,
          label: 'Haal de stempel bij loket C', say: 'Loket C heeft een zijdeur bij de kopieermachine.', talk: { ids: ['M03.3'], from: 4, to: 7, delay: 1.2 },
        },
        {
          kind: 'goto', target: { landmark: 'Goudkantoor', off: [3, 7], snap: 'walk', label: 'Het Loket: inschrijven' }, mode: 'foot', radius: 5, stop: 0.8,
          label: 'Schrijf in bij de balie', say: 'Alles bij elkaar: nu inschrijven, honderdvijftig euro contant.', pay: 150, paid: 'Inschrijving Noordelijke Snackprijs', payShort: ' Tessa legt de rest bij.',
        },
      ],
    },
    {
      // M01 Nul krassen, vijftienhonderd punten: the stunt on the Grote Markt in Berend's bakkie, then the delivery (scratches count over both parts)
      type: 'deliver',
      label: 'Nul krassen, vijftienhonderd punten',
      intro: ['Berend Bos wil zijn bakkie bij zijn zus aan het Boterdiep. Eerst een klus voor Jelmer op de Grote Markt: vijftienhonderd stuntpunten.', 'Stunt zonder krassen: parasols en kliko\'s mogen, mensen niet. Daarna het bakkie heel naar het Boterdiep.'],
      outro: 'Berend zei goud. En moi. Tegen Tessa.',
      timeLimit: 240,
      reward: 200,
      scratchFine: 0.5,
      vehicleName: 'Berends bakkie',
      destName: 'het Boterdiep',
      stunt: { center: { x: 168.69, y: 70.04 }, radius: 46, target: 1500 },
      handBack: { how: 'drive', say: 'Berend pakt zijn sleutels terug en rijdt weg. Wij lopen, Tessa.' },
      start: drive(223.17, -30.52),
      dest: drive(-22.92, -491.56),
      say: 'Eerst de Grote Markt: vijftienhonderd stuntpunten, zonder krassen. Daarna het Boterdiep.',
    },
  );
  // akte 2 to 5: the provincial missions (missions_deel4.js), in the order of NEW_MISSION_IDS
  list.push(...buildDeel4Defs({ walk }));
  return list;
}

// How the new arc stages the defs it shares with the old one: which script scene is said where,
// the hints that named people who are not in this story, and what the story has dropped.
// Stage fields: script { ids, from, to } = the lines of a stage scene; talk { ids, from, to, delay } =
// subtitle talk while the stage runs (storytalk.js); radioScript = a radio fragment (storytext.js).
export function applyNieuw(list, ctx) {
  const by = (label) => list.find((d) => d.label === label);
  const stageOf = (def, kind, n = 0) => def.stages.filter((q) => q.kind === kind)[n];
  const pin = by('Even pinnen');
  if (pin) pin.stages[1].talk = { ids: ['M02.2'], delay: 1.5 };
  const duif = by('Kieken van boven');
  if (duif) duif.stages[0].talk = { ids: ['M04.2'], delay: 6 };
  const kei = by('Wind tegen, beide kanten op');
  if (kei) kei.moment = { at: 3, text: kei.moment.text, talk: { ids: ['M05.2'] } };
  const vet = by('Al het vet van Grunn');
  if (vet) {
    vet.stages = vet.stages.filter((q) => q.kind !== 'vault');
    vet.stages[0].say = 'Instappen. De tankwagen staat bij de groothandel.';
    vet.stages[1].go = 'Ze zien ons! Daar gaat hij. Erin springen, of de banden plat. Schieten mag, rammen mag.';
    vet.stages[1].stopped = 'Pang! Banden plat. De bewakers rennen weg, Durk en Douwe fietsen achter hun baas aan.';
    vet.stages[1].hijack = 'Gekaapt! De bewakers rennen weg. Het vet is van ons.';
    const to = stageOf(vet, 'goto', 0);
    to.talk = { ids: ['M07.2'], delay: 3 };
    vet.outro = 'Het vet is terug in Grunn. Plakje twee is gered.';
  }
  const mus = by('Het museum stond er al zo');
  if (mus) {
    // the black clothes and the boat are in the intro now (08 §2): only the dark is needed, and the call from home
    mus.requires = ['night'];
    stageOf(mus, 'scene').script = { ids: ['M06.3'], from: 0, to: 4 };
    stageOf(mus, 'scene').lines = [];
    const esc = stageOf(mus, 'escape');
    esc.radio = undefined;
    esc.radioScript = { ids: ['M06.3'], from: 4, to: 9, caller: 'Een beller uit Ljouwert' };
    esc.talk = { ids: ['M06.3'], from: 9, to: 17, delay: 5 };
  }
  applyDeel4(list, ctx);
}

