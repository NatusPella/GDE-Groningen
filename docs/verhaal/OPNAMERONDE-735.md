# Opnameronde #735: de definitieve lijst en het runbook

De TTS-techniek staat klaar (#689: alles via de LiteLLM-gateway). Dit is de **inhoud en
de planning** van de laatste opnameronde: welke regels nog moeten, in welke volgorde, met
welke commando's, en wat alleen de eigenaar kan doen. Er is in deze sessie **niets
opgenomen** en er is **geen sleutel gebruikt**.

## Stand, gecontroleerd na v0.60.1 (9-11-2026)

Na de release v0.60.1 zijn de bronnen opnieuw gecontroleerd; de stand is ongewijzigd:
`node scripts/tts_opnamelijst.mjs --check` zegt **actueel** (0 clips klaar, 20 wachtend: 0 stemkeuze,
20 spreektekst), `node scripts/gronings_open_test.mjs` is **4/4 groen** en
`node scripts/voice_coverage.mjs --quiet` staat op **2664/2664** (57 regels alleen tekst, vrijgesteld).
De 20 open regels zijn nog steeds M09 10 · M12 2 · M21 1 · M23 3 · M26 2 · M30 2, van Geesje (18) en
Rotor Roelf (2); geen daarvan heeft al een spreektekst in `gronings_spoken.json` of het concept.

| Meting | Uitkomst |
|---|---|
| Verhaalregels zonder stem | **57** (waarvan **37** stille appjes en **20** die nog op een Groningse spreektekst wachten) |
| Klaar in de wachtrij (`scripts/tts_lines.json`) | **0** jobs — de ronde is opgenomen (ca. $0,27) |
| Wacht op een stemkeuze (`scripts/tts_lines_list.mjs` CAST) | **0** regels — de zeventien sprekers hebben sinds 7-11 een stem (`docs/verhaal/STEMKEUZE-VOORSTEL.md`) |
| Wacht op Groningse spreektekst (`scripts/gronings_spoken.json`) | **20** regels |
| `node scripts/voice_coverage.mjs --quiet` | **2664/2664 ok**, 57 regels alleen tekst (vrijgesteld) |
| Stille appjes/sms'en | 37, bewust geen stem |
| Volledige lijst per scène | `docs/verhaal/OPNAMELIJST.md` (lokaal, gitignored; 20 regels zonder stem) |

> De cijfers in issue #735 (670 regels / 671 clips, 0 wachtend op een stemkeuze) zijn die
> van 6-11 vóór #689 en de nieuwe sprekers. De metingen hierboven zijn de actuele stand;
> deze pagina is de definitieve lijst en vervangt dat overzicht.

**Definitieve opnamelijst.** Genereer hem met `node scripts/opnamelijst.mjs`; het bestand
`docs/verhaal/OPNAMELIJST.md` staat bewust niet in git (het verandert elke ronde). Het
staat per stap en scène, met de stem waaronder de regel moet worden opgenomen; de eerste
speeluren (M00-M03) staan bovenaan. `node scripts/opnamelijst.mjs --check` faalt als het
bestand achterloopt op `game/storydata/script.json`.

**Per clip, met bron, stem, bestandsnaam en LiteLLM-commando.** Voor de uitvoering is er één
regel per clip, gegenereerd uit dezelfde bronnen:

- `docs/verhaal/TTS-OPNAMELIJST-735.md` — overzicht: de klaarstaande clips per scène, de
  wachtende regels per stap en de technische laadhint als aparte beslissing.
- `docs/verhaal/TTS-OPNAMELIJST-735.jsonl` — één regel per clip met `source`, `speaker`,
  `voice`, `file`, `endpoint`, `model` en (voor de klaarstaande clips) de exacte `curl` met
  `$LITELLM_API_KEY` uit de omgeving; wachtende regels hebben `reason` (`stemkeuze` of
  `spreektekst`) en nog geen commando.
- `node scripts/tts_opnamelijst.mjs --check` faalt als deze lijst achterloopt op de wachtrij
  of `script.json`.

## Runbook (in deze volgorde)

### 0. Eenmalig: de sleutel (eigenaar)

Zet in `.env` in de repo-root (staat in `.gitignore`; nooit committen, nooit printen):

```bash
LITELLM_API_KEY=sk-...            # de virtuele sleutel van de LiteLLM-gateway
# optioneel: LITELLM_BASE_URL=https://litellm.natuspella.nl
```

`python scripts/gemini_tts.py` toont daarna gateway, pad en of het model in de lijst staat
(zonder de sleutelwaarde te tonen). Zonder sleutel werkt alleen de droogloop.

### 1. Nu opnemen: de wachtrij (nu 0 jobs)

Eén commando voor de hele ronde (dezelfde stappen, stopt bij de eerste fout; leest geen sleutel
en print hem niet):

```powershell
node scripts/tts_opnameronde.mjs --budget 2.5
```

Droogloop zonder sleutel of netwerk: `node scripts/tts_opnameronde.mjs --dry`. Beperkte ronde:
`--max 8`. Losse stappen (hetzelfde, met de hand):

```bash
node scripts/tts_lines_list.mjs                 # toont de jobs en de wachtenden
python scripts/tts_lines.py --dry-run           # alleen tonen, geen sleutel nodig
python scripts/tts_lines.py --budget 0.5        # echt opnemen (±197 s audio, ±$0,03)
node scripts/build_story_data.mjs               # script.json/ manifesten bijwerken
node scripts/voice_coverage.mjs --quiet         # moet groen blijven
node scripts/tts_opnamelijst.mjs                # de lijst per clip verversen
```

Elke clip wordt gelogd in het `tts.json` van zijn map met `model`, `via: litellm` en de
kosten uit de gateway (`x-litellm-response-cost`, anders de audiolengte-terugval). De
clips worden getrimd en op -18 LUFS gezet; `ffmpeg`/`ffprobe` moeten in het pad staan.

### 2. Groningse spreekteksten: 20 regels (menselijke controle verplicht)

De twintig open regels staan per stap, spreker, stem en bestandsnaam in
[`GRONINGS-20-SPREEKTEKSTEN.md`](GRONINGS-20-SPREEKTEKSTEN.md) (gegenereerd met
`node scripts/gronings_open_doc.mjs`). Daarin staan ook de bestaande, goedgekeurde regels die als
voorbeeld van woordkeuze kunnen dienen en per regel het knooppunt dat een kenner moet beslissen.
**Er is geen Gronings gegenereerd of vertaald:** de open lijst bevat alleen de Nederlandse regel, citaten
uit `scripts/gronings_spoken.json` en de keuzes (aanspreekvorm, kerkelijke woorden, namen, grap).

De route blijft:

1. Een **kenner** schrijft of keurt per regel de Groningse spreektekst en vult die in
   `scripts/gronings_spoken_draft.json` (sleutel = de Nederlandse regel precies zoals het spel hem toont),
   of laat de regel bewust open.
2. `node scripts/gronings_merge_draft.mjs --write` voegt de goedgekeurde rijen samen; zonder `--write`
   toont het script alleen wat er nieuw is en welke rijen botsen.
3. `node scripts/tts_lines_list.mjs` zet de regels daarna in de wachtrij; `python scripts/tts_lines.py`
   neemt op in rondes.
4. Deze lijst en `docs/verhaal/TTS-OPNAMELIJST-735.md` opnieuw draaien met `node scripts/tts_opnamelijst.mjs`.

Verdeling van de 20: M09 10, M12 2, M21 1, M23 3, M26 2, M30 2; 18 van Geesje, 2 van Rotor Roelf.
Hun stem staat al vast (`CAST`: `Pulcherrima` en `Achird`), dus dit is geen stemkeuze.

### 3. Stemkeuze: 0 regels (alle sprekers hebben een stem)

De sprekers staan sinds 7-11-2026 in `CAST` van `scripts/tts_lines_list.mjs`. Kies per spreker een stem
(zie [`STEMKEUZE-VOORSTEL.md`](STEMKEUZE-VOORSTEL.md)), zet die in `CAST`, en draai
daarna stap 1 opnieuw: `node scripts/tts_lines_list.mjs` zet ze in de wachtrij.

### 4. Na elke ronde

```bash
node scripts/build_story_data.mjs
node scripts/voice_coverage.mjs --quiet
node scripts/audio_herkomst.mjs                 # elke clip gelogd, telling stemmen/muziek
node scripts/opnamelijst.mjs                    # de definitieve lijst bijwerken
node scripts/opnamelijst.mjs --check            # controle dat hij actueel is
```

Werk daarna #735 bij met de nieuwe stand (of laat het bijwerken). Eén proefclip beluisteren
en `ffprobe` (24 kHz mono, duur) is de laatste controle; de klank beoordeelt de eigenaar.

## Wat alleen de eigenaar kan

1. **De sleutel in `.env` zetten** (staat er volgens #689 inmiddels; buiten de repo).
2. **De knoop doorhakken over de 154 stemmen** (16 sprekers) als het voorstel niet bevalt.
3. **De opname starten** en de clips beluisteren; een agent neemt niets op zonder sleutel
   en zonder expliciete opdracht.
4. **De kosten bewaken**: de gateway meldt per clip de prijs; de campagneraming blijft
   enkele dollars voor het hele verhaal (zie `07-TTS-RAMING.md`).
