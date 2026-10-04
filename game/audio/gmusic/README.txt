De radio - muziek voor G-Music en Radio Nachtstreek

Zet hier de nummers neer (.mp3 of .ogg) en noem ze in manifest.json onder
"tracks". Een regel is een bestandsnaam of een object:

{
  "tracks": [
    "nummer1.mp3",
    { "file": "nummer2.mp3", "stations": ["gmusic", "nachtstreek"], "time": "night", "weight": 1.5 }
  ]
}

- stations: op welke zenders het nummer draait: "gmusic" (de hits) en/of
  "nachtstreek" (Rikus' late-night streekmuziek, door een oude radio).
  Weglaten = alleen G-Music. Een zender met minder dan 6 eigen nummers
  leent de rest van de andere, maar draait die minder vaak.
- time: "night" (vaker van 22:00 tot 06:00 in het spel, minder overdag),
  "day" (andersom) of weglaten.
- weight: hoe vaak, 1 is normaal, 2 is twee keer zo vaak.
Ideeën voor nieuwe nummers en genres: docs/MUZIEK.md.

Afspelen (js/audio.js, keuze in js/musicpick.js):
- De radio speelt altijd, te voet en in een voertuig; N en B kiezen de
  zender (G-Music, Nachtstreek, Radio Proat, uit). Bij de start "stem je
  in" halverwege een nummer (of soms een jingle), met een fade-in.
- Er is één geschiedenis voor alle zenders, die ook bewaard blijft tussen
  sessies. Een nummer dat bij de laatste ~60% van de pool zat komt niet
  terug; van de rest weegt een nummer dat langer niet speelde zwaarder, en
  een nummer van dezelfde act als het vorige lichter.
- Tussen twee nummers op G-Music zit meestal (60%) een jingle, nooit twee
  keer dezelfde achter elkaar; hoge_wanted vervangt de eerstvolgende
  jingle zodra je gezocht wordt. Nachtstreek heeft geen jingles.
- Er speelt altijd maar één ding tegelijk; een volgend item start pas als
  het vorige is afgelopen.
- Zodra een nieuw nummer echt begint te spelen verschijnt "Nu op G-Music"
  (of "Nu op Radio Nachtstreek") met titel en act (titel = bestandsnaam
  zonder extensie, met _ als spatie). Bij jingles komt er geen melding.
- Muziek pauzeert als het tabblad verborgen is en gaat daarna verder.

Leeg laten ("tracks": []) betekent: de radio blijft stil tot er nummers zijn
toegevoegd.
