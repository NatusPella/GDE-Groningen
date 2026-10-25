# 0018 - Spraak op Gemini Flash-Lite TTS, en nooit meer Flash

- **Status:** besloten
- **Datum:** 2026-10-25
- **Spec:** `.specs-fire/standards/publicatie.md` (herkomst van stemmen), `.specs-fire/standards/verhaal.md`

## Context

De stemmen van het spel zijn op 2 oktober 2026 opnieuw ingesproken met
`gemini-3.8-flash-tts` via OpenRouter (`scripts/gemini_tts.py`, 3011 clips). Sinds
17 oktober lag er een verbod op nieuwe TTS-uitgaven, en de 1074 gesproken regels
van het nieuwe verhaal (`game/storydata/script.json`) bleven daarom `textOnly`:
ondertitel, geen stem (#326).

Op 25 oktober kwam daar een tweede route bij: de Gemini API van Google AI Studio,
betaald uit een klein tegoed, met `gemini-3.8-flash-lite-tts` als het goedkopere
model. Een proef van twaalf regels uit de opening (Tessa en drie korte Groningse
regels) kostte $0,0088 op lite en $0,0135 op Flash, en de eigenaar hoorde geen
verschil dat opweegt tegen de prijs. Het hele nieuwe verhaal op lite zou ongeveer
$0,55 kosten.

## Besluit

1. Nieuwe opnames gaan met `gemini-3.8-flash-lite-tts`, rechtstreeks bij de
   Gemini API (`PROVIDER = 'google'` in `scripts/gemini_tts.py`), betaald uit het
   tegoed van de eigenaar.
2. **Flash wordt niet meer gebruikt**, ook niet voor een vergelijking of een
   heropname, tot de eigenaar daar opnieuw over beslist. `configure()` weigert het
   model met een melding die naar deze ADR verwijst.
3. Bestaande clips van de Flash-era blijven staan en gelden als ingesproken
   (`ACCEPTED`): een run neemt ze niet opnieuw op. Er komen dus twee modellen in
   de voicebank naast elkaar, met per clip het model in `tts.json`.
4. OpenRouter blijft als route bestaan (`--provider openrouter`) voor het geval
   het tegoed daar weer gebruikt mag worden, maar is niet de standaard.

## Afgewezen

- **Alles op Flash opnieuw inspreken voor één consistent model.** Kost ongeveer
  $1,20 en levert geen hoorbaar verschil op volgens de eigenaar.
- **De bestaande Flash-clips ook op lite overdoen.** Zelfde reden, en het maakt
  de 3011 clips onnodig opnieuw verdacht (elke heropname is een kans op een
  slechtere take).
- **De gratis tier van AI Studio gebruiken.** Dan mag Google de audio gebruiken om
  zijn producten te verbeteren, en de limieten zijn alleen in AI Studio te zien.
  Voor eigen stemmen van een spel dat verkocht gaat worden is dat geen goede ruil
  voor een halve euro.
- **De Batch API (50% goedkoper).** Scheelt bij de resterende 455 regels ongeveer
  een kwart dollar, en de pijplijn is er niet op gebouwd (aparte indiening, geen
  directe clip per regel).

## Gevolgen

- Elke nieuwe opname kost ongeveer $0,009 per minuut audio in plaats van $0,0135.
- Een run met 10 requests per minuut (Tier 1) duurt ongeveer 50 minuten voor 455
  regels; de runner spreidt de aanvragen zelf (`throttle()`).
- De tarieven ($6 per 1M audiotokens) gelden tot 31-12-2026 en verdubbelen daarna.
- Wie een clip wel wil vervangen, gooit de mp3 weg en draait
  `scripts/tts_lines_list.mjs`: de regel komt dan als heropname in de lijst.
