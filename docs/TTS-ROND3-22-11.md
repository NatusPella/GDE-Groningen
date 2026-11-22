# TTS-ronde 3 (22-11): wat er klaarstaat

Gegenereerd met `node scripts/tts_lines_list.mjs` en `node scripts/voice_wacht.mjs --write`; de aantallen hieronder komen uit `scripts/tts_lines.json`. **Er is niets opgenomen en niets beluisterd.** De opname zelf volgt in de TTS-ronde (draaiboek: [OPNAMERONDE-735.md](verhaal/OPNAMERONDE-735.md)).

## Samenvatting

- **608 opdrachten** (26061 tekens) staan op `scripts/voice_wacht.json`; dat waren er 207.
- **401 opdrachten erbij**: 375 verschillende verhaalregels kregen een Groningse spreektekst in `scripts/gronings_spoken.json`, en de 26 regels van vijf sprekers (Veldkamp, Daan, Anneke, Stien, Lieke) kregen een stem en een spreektekst.
- `tts_waiting.json` is nu leeg: geen verhaalregel wacht meer op een spreektekst of een stem.
- De spreektekst is licht Gronings (klankverschuiving en bekende woorden, geen karikatuur, "Grunn"). Waar geen betrouwbare Groningse vorm bekend was, bleef het Nederlandse woord staan (bijvoorbeeld "genomen", "zandplaat", "spijker", "luchtruim").
- 32 nieuwe woorden staan als `afgeleid` in `scripts/dialect_woorden.json`: regelmatig afgeleid van het Nederlandse woord, **niet opgezocht in een woordenboek** (geen netwerk gebruikt). Die lijst is wat een Groninger als eerste moet nalopen.

## Aantallen per spreker

| Spreker | Stem | Nieuw in deze ronde | Wachtte al | Tekens |
|---|---|---:|---:|---:|
| Tammo | Orus | 197 | 1 | 4900 |
| Roelie | Achird | 0 | 53 | 3251 |
| ~m | Iapetus | 0 | 40 | 1496 |
| ~f | Sulafat | 0 | 40 | 1496 |
| Anita | Callirrhoe | 0 | 29 | 910 |
| Rikus | Schedar | 29 | 0 | 1915 |
| Hilbrand | Sadachbia | 0 | 29 | 1757 |
| Berend Bos | Charon | 25 | 1 | 1204 |
| Oma Trijntje | Sulafat | 20 | 0 | 963 |
| Sjabbe | Rasalgethi | 16 | 1 | 964 |
| Kapitein Klaas | Enceladus | 12 | 1 | 858 |
| Lammert | Iapetus | 13 | 0 | 1016 |
| Geesje | Pulcherrima | 12 | 0 | 551 |
| Anneke | Achernar | 11 | 0 | 472 |
| Wubbo | Sadaltager | 9 | 0 | 493 |
| Jelle Terpstra | Fenrir | 0 | 7 | 388 |
| Willemien | Aoede | 7 | 0 | 378 |
| Meneer Veldkamp | Alnilam | 6 | 0 | 277 |
| Mevrouw Hoving | Gacrux | 5 | 0 | 423 |
| Femke | Leda | 5 | 0 | 147 |
| Mem Terpstra | Gacrux | 0 | 5 | 298 |
| Stien | Vindemiatrix | 4 | 0 | 185 |
| Duivenmelker Bert | Iapetus | 3 | 0 | 160 |
| Roelfien | Laomedeia | 3 | 0 | 290 |
| Daan | Puck | 3 | 0 | 203 |
| Geert | Zubenelgenubi | 3 | 0 | 220 |
| Henk | Sadaltager | 3 | 0 | 124 |
| Loketbediende | Autonoe | 2 | 0 | 75 |
| Terrasgast | Erinome | 2 | 0 | 45 |
| Dokter Dijkstra | Sadachbia | 2 | 0 | 180 |
| Rotor Roelf | Achird | 2 | 0 | 130 |
| Tinus | Enceladus | 2 | 0 | 124 |
| Lieke | Leda | 2 | 0 | 72 |
| Buschauffeur | Alnilam | 1 | 0 | 47 |
| Deurwaarder | Rasalgethi | 1 | 0 | 39 |
| Jurylid | Umbriel | 1 | 0 | 10 |

`~m` en `~f` zijn de anonieme voorbijgangers (man en vrouw), een oud, apart pad: die opdrachten waren er al.

## De 26 regels die een stemkeuze nodig hadden

Op eigen gezag gekozen (geen vragen aan de eigenaar), uit bestaande stemmen van de cast. De keuze staat in `CAST` in `scripts/tts_lines_list.mjs`. Een andere stem later is een regel in `CAST` en een nieuwe opname.

| Spreker | Aantal regels | Stem | Waarom |
|---|---:|---|---|
| Meneer Veldkamp | 6 | Alnilam | oude buurman met duiven; droog en kortaf, stiekem vriendelijk. De stem is gedeeld met Harm en Schipper Wiebe (Gemini "Firm"); Duivenmelker Bert (Iapetus) is bewust vermeden, want beide zijn duivenmannen. |
| Daan | 3 | Puck | jonge straatmuzikant, uitbundig en bewonderend ("Upbeat"). Gedeeld met Jelmer, Student en de verdwaalde Fries, die in andere scenes spelen. |
| Anneke | 11 | Achernar | moeder van Tessa, nuchter en warm ("Soft"). Gedeeld met de Kiekdoar-redactie, die alleen in sms-berichten klinkt. |
| Stien | 4 | Vindemiatrix | vrouw van zeventig achter de frituurwagen, droog en vakkundig. Gedeeld met Oma Geessien (Ommeland, ander gebied). |
| Lieke | 2 | Leda | zusje van Tessa, tien jaar, helder en brutaal ("Youthful"). Gedeeld met Femke en de kinderen. |

Totaal 26 verhaalregels.

### De regels

| Spreker | Scene | Ondertitel |
|---|---|---|
| Meneer Veldkamp | N2 | Die zat hier al. Hij wacht op jou. |
| Meneer Veldkamp | N2 | Zes jaar zit ik hier. Dat is de eerste die niet wegvliegt. |
| Meneer Veldkamp | N2 | Ik eet liever alleen. Maar de duiven hebben al ja gezegd. |
| Meneer Veldkamp | M06.0 | Jullie lamp brandt. Het is bijna twaalf. |
| Meneer Veldkamp | M06.0 | Mijn duiven doen dat bij niemand. Hij wil naar Tammo. |
| Daan | M15.6 | Jij bent van het spandoek. Dat ik dat mocht meemaken. |
| Daan | M15.6 | Dan heb je veel ongelukken nodig. Vanavond sta ik achter de bar bij Geert. Mag ik dan een liedje zingen? |
| Daan | M15.6 | Eén couplet. Over een meisje met een spandoek. |
| Anneke | J3 | Dus jij bent Tammo. Ze belt nooit, maar als ze belt gaat het over jou. |
| Anneke | J3 | Jullie zitten ver uit elkaar. |
| Anneke | J3 | Een bank voor drie. Jullie gebruiken anderhalf. |
| Anneke | J3 | Dit kwam gisteren, voor jullie allebei. Hij belde ook. Hij vroeg naar een vergunning voor de kippen. |
| Anneke | J3 | Wij hebben kippen sinds 1987. Hij moet eerst de kippen vragen. |
| Anneke | J3 | Ja? |
| Anneke | J3 | Dat dacht ik al. |
| Stien | M17.5 | Wubbo zei dat jullie kwamen. Eén friet, op mijn kosten. |
| Stien | M17.5 | Eerst het vet warm, dan de mensen. |
| Stien | M17.5 | Die komen op de geur. Dat is het hele vak. |
| Stien | M17.5 | Nee. Maar het is een begin. Kom terug als je hem hebt. |
| Anneke | M25.6 | We waren in de buurt. Met een mand eieren. |
| Anneke | M25.6 | Jij belt nooit. Dan komen wij. |
| Anneke | M25.6 | Bij ons gaan eieren niet in het vet. |
| Lieke | M25.6 | Zijn jullie al samen? |
| Lieke | M25.6 | Jullie zijn al samen. Jullie weten het alleen niet. |
| Anneke | M25.6 | Dat zag ik al. Dat is een goed teken. |
| Meneer Veldkamp | O12 | De duiven vragen of jullie blijven. |

## Wat nog niet is gedaan

- Niemand heeft de spreekteksten of de nieuwe stemkeuzes beluisterd of door een Groninger laten nalopen. Het paneel van drie reviewers per veertig regels is niet gedraaid (geen subagent beschikbaar in deze run); de twijfel is vastgelegd als lijst van afgeleide woorden en als open punt in `docs/verhaal/PERFECT-STAND-22-11-spreektekst.md`.
- Het manifest en `textOnly` in `game/storydata/script.json` veranderen pas na de opname (`build_story_data`).
