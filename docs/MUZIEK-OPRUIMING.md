# Muziek-opruiming (#66): wat is van Gemini, wat van Claude

Besluit van de eigenaar, 18 oktober 2026: muziek die Claude zelf maakte
(gesynthetiseerd of in code gecomponeerd) is te slecht en gaat weg. De
muziek die Gemini maakte blijft. Nieuwe muziek maakt Claude niet meer: de
eigenaar laat die via Gemini maken (zie het issue "Muziek: lijst van
gewenste tracks voor Gemini" en `docs/MUZIEK.md`). Geluidseffecten (motoren,
banden, UI, omgeving, vuurwerk, bellen) zijn geen muziek en blijven.

## Tabel

| Onderdeel | Bron | Actie | Reden / bewijs |
|---|---|---|---|
| 20 G-Music-nummers `game/audio/gmusic/*.mp3` (dag- en nachtpool) | Gemini | behouden | `credits.js` ("muziek ... gemaakt met Google Gemini"), `NOTICE.md`, `docs/LICENTIES.md` §3/§4; mp3's in git sinds 26 sep 2026 |
| Titelnummer `game/audio/theme/miles_past_the_city_square.mp3` | Gemini | behouden | LICENTIES.md ("volgens de eigenaar"), credits |
| Scenario-loops `game/audio/scenario` (race, achtervolging) | Gemini | behouden | NOTICE.md, LICENTIES.md |
| G-Music-jingles `game/audio/gmusic/jingles/*.wav` | Gemini TTS | behouden | `tts.json` per map gelogd, LICENTIES.md §4 |
| Zeven synthnummers `game/js/synthmusic.js` (drill, post-punk, hardstyle, phonk, levenslied, R&B, zomerhit) met `scripts/synthmusic_test.mjs` en de renderplanning in `audio.js` | Claude | **verwijderd** | commit 317e0315, #66, CHANGELOG 0.36.0 ("helemaal door het spel zelf gemaakt"); niet in credits |
| Kermisorgel (walsje in 3/4, `kermis.js` `updateOrgan`) | Claude | **verwijderd** | oscillatoren met vaste melodie `MEL`/`BASS`; de kermis zelf (botsauto's, reuzenrad) blijft |
| Zendersignaaltje Radio Nachtstreek (`playRadioSting` in `audio.js`, aangeroepen door `story.js` en `storycontact.js`) | Claude | **verwijderd** | drie stijgende noten over een pad; recap en radiocontact starten nu zonder signaal, met Rikus' stem |
| Radiozenders / UI-opties | n.v.t. | niets te verwijderen | er is één zender (G-Music); de nachtpool bestaat uit Gemini-mp3's. `synth`-nummers kwamen alleen via `scheduleSynthRecords` in de pool; opgeslagen instellingen verwijzen er niet naar (alleen `radio: on/off`) |
| Carillon-minigame (`carillon.js`, `carillonrules.js`): deuntjes Broeder Jacob, Sterretje, Vreugdelied | speler speelt zelf; bekende volksliederen | behouden (**eigenaar beslist**) | instrument, geen compositie van Claude; de klokken zijn een sfx-sample. De deuntjes zijn publiek domein |
| Missie-, geld- en gezondheidsjingles (`playMissionJingle`, `playCashChime`, `healthChime`, `lostThem`, `wantedUp/Down`, `missionFail`, `roadblockSting`, `playClueSting`) | Claude (sfx) | behouden (**eigenaar beslist**) | korte UI-/gameplaygeluiden van 2 tot 5 noten, geen muziek; het zijn feedbackgeluiden zoals pickups |
| Trailer: `SFX_SYNTH` (knal, tik, stoot, riser) en `desktop/trailervideo.js` | Claude (sfx) | behouden | geluidseffecten, geen melodie |
| Motoren, foley, ambience, claxon, sirene (`game/js/sfx/*`) | Claude (sfx) | behouden | geen muziek |
| Cutscene-score (`cutaudio.js`) | n.v.t. | niets te verwijderen | alleen geluidseffecten (sirene, auto, bel), geen score |
| Trailers (`docs/youtube/trailers.md` zei "muziek zelfgemaakt") | n.v.t. | tekst aangepast | geen trailermuziek in de repo; als die komt, via Gemini |
| Kartbaan-motor (`kartbaan.js`) | Claude (sfx) | behouden | motorgeluid |

## Wat is aangepast

- `game/js/synthmusic.js` en `scripts/synthmusic_test.mjs` zijn verwijderd; `audio.js` rendert geen eigen records meer.
- `game/js/kermis.js` heeft geen orgel meer; `ambientOut` blijft voor de kartbaan.
- `playRadioSting` is weg uit `audio.js`, `story.js` en `storycontact.js`.
- `scripts/musicwatch_test.mjs` test de kiezer nu zonder synthnummers.
- `CHANGELOG.md` [Unreleased] meldt de verwijdering; de regel in 0.36.0 blijft als geschiedenis.
- `docs/MUZIEK.md`, `docs/youtube/trailers.md`, `ARCHITECTURE.md`, `docs/verhaal/D-definitief.md` zijn bijgewerkt.

## Niet getest

Geen Electron en geen volledige suite (de eigenaar speelt). Niet in het spel gehoord.
