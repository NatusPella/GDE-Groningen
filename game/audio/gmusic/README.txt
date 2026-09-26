G-Music - radiozender in de stad

Zet hier de nummers neer (.mp3 of .ogg), en noem hun bestandsnamen in
manifest.json onder "tracks", bijvoorbeeld:

{
  "tracks": ["nummer1.mp3", "nummer2.mp3"]
}

Afspelen (js/audio.js):
- G-Music speelt altijd, te voet en in een voertuig. Bij de start "stem je
  in" halverwege een willekeurig nummer (of soms een jingle), met een fade-in.
- Daarna steeds: jingle, nummer, jingle, nummer, ...
- Nummers worden geshuffeld (shuffle-bag): elk nummer komt één keer langs
  voordat de lijst opnieuw wordt geschud, en nooit twee keer direct achter
  elkaar. De volgorde in manifest.json maakt dus niet uit.
- Er speelt altijd maar één ding tegelijk; een volgend item start pas als
  het vorige is afgelopen.
- Zodra een nieuw nummer echt begint te spelen verschijnt de melding
  "🎵 Nu op G-Music: <titel>" (titel = bestandsnaam zonder extensie, met _
  als spatie). Bij jingles komt er geen melding.
- Jingles staan in jingles/. station_id, nummerovergang en rij_knipoog
  worden willekeurig tussen de nummers gezet; hoge_wanted vervangt de
  eerstvolgende jingle zodra je gezocht wordt.
- Muziek pauzeert als het tabblad verborgen is en gaat daarna verder.

Leeg laten ("tracks": []) betekent: G-Music blijft stil tot er nummers zijn
toegevoegd.
