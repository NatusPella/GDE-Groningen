De radio - muziek voor G-Music (overdag en Nachtstreek)

Zet hier de nummers neer (.mp3 of .ogg) en noem ze in manifest.json onder
"tracks". Een regel is een bestandsnaam of een object:

{
  "tracks": [
    "nummer1.mp3",
    { "file": "nummer2.mp3", "stations": ["gmusic", "nachtstreek"], "time": "night", "weight": 1.5 }
  ]
}

- stations: in welke pool het nummer zit: "gmusic" (de dagpool, voor
  Proat in de ochtend, De hits en Avondproat) en/of "nachtstreek" (de
  nachtpool: Rikus' streekmuziek van 22:00 tot 06:00, door een oude radio).
  Weglaten = alleen de dagpool. Een pool met minder dan 6 eigen nummers
  leent de rest van de andere, maar draait die minder vaak.
- time: "night" (vaker van 22:00 tot 06:00 in het spel, minder overdag),
  "day" (andersom) of weglaten.
- weight: hoe vaak, 1 is normaal, 2 is twee keer zo vaak.
Ideeën voor nieuwe nummers en genres: docs/MUZIEK.md.

Afspelen (js/audio.js, keuze in js/musicpick.js):
- Er is één zender, G-Music. Hij speelt te voet en in elk voertuig; N (LB
  in een voertuig, of Instellingen > Geluid) zet hem aan of uit. Bij de
  start "stem je in" halverwege een nummer (of soms een jingle), met een
  fade-in.
- Het programma volgt de klok in het spel (PROGRAMMES in js/musicpick.js):
  06-10 Proat in de ochtend, 10-18 De hits, 18-22 Avondproat, 22-06
  Nachtstreek. Om de 2 of 3 nummers is er een praatje van bestaande
  opnames: Geesje (Radio Proat), Kiekdoar-nieuws (ook audio/nieuws), het
  verkeer, het weer, de koeien of Rikus. Een telefoontje van Rikus of een
  andere stem onderbreekt het praatje.
- Er is één geschiedenis voor beide pools, die ook bewaard blijft tussen
  sessies. Een nummer dat bij de laatste ~60% van de pool zat komt niet
  terug; van de rest weegt een nummer dat langer niet speelde zwaarder, en
  een nummer van dezelfde act als het vorige lichter.
- Tussen twee nummers zit overdag meestal (60%) een jingle, nooit twee
  keer dezelfde achter elkaar; hoge_wanted vervangt de eerstvolgende
  jingle zodra je gezocht wordt. Nachtstreek heeft geen jingles.
- Er speelt altijd maar één ding tegelijk; een volgend item start pas als
  het vorige is afgelopen.
- Zodra een nieuw nummer echt begint te spelen verschijnt "Nu op G-Music"
  met het programma (bijvoorbeeld "Nu op G-Music · Nachtstreek"), titel
  en act (titel = bestandsnaam zonder extensie, met _ als spatie). Bij
  jingles komt er geen melding; bij een nieuw programma wel.
- Muziek pauzeert als het tabblad verborgen is en gaat daarna verder.

Leeg laten ("tracks": []) betekent: de radio blijft stil tot er nummers zijn
toegevoegd.
