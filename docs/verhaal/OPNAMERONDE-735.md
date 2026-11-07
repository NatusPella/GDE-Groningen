# Opnameronde #735: de definitieve lijst en het runbook

De TTS-techniek staat klaar (#689: alles via de LiteLLM-gateway). Dit is de **inhoud en
de planning** van de laatste opnameronde: welke regels nog moeten, in welke volgorde, met
welke commando's, en wat alleen de eigenaar kan doen. Er is in deze sessie **niets
opgenomen** en er is **geen sleutel gebruikt**.

## Stand, opnieuw gemeten (7-11-2026, na #689)

| Meting | Uitkomst |
|---|---|
| Verhaalregels zonder stem | **656** (waarvan **53** in de opening en M01-M03) |
| Klaar in de wachtrij (`scripts/tts_lines.json`) | **63** jobs (2.223 tekens, ca. 197 s audio, ca. $0,03) |
| Wacht op een stemkeuze (`scripts/tts_cast.mjs` CAST) | **154** regels, 16 sprekers |
| Wacht op Groningse spreektekst (`scripts/gronings_spoken.json`) | **439** regels |
| `node scripts/voice_coverage.mjs --quiet` | **2028/2028 ok**, 693 regels alleen tekst (vrijgesteld) |
| Stille appjes/sms'en | 37, bewust geen stem |
| Volledige lijst per scène | `docs/verhaal/OPNAMELIJST.md` (lokaal, gitignored; 1.605 regels bestand) |

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

### 1. Nu opnemen: de 63 klaarstaande jobs

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

### 2. Groningse spreekteksten: 439 regels

1. Lees de concepten in [`DIALECT-CONCEPT.md`](DIALECT-CONCEPT.md) na (eerst de
   twijfelgevallen bovenaan).
2. Voeg ze samen: `node scripts/gronings_merge_draft.mjs --write`.
3. Zet ze in de wachtrij: `node scripts/tts_lines_list.mjs`, dan opnieuw
   `python scripts/tts_lines.py --budget 0.5` in rondes.

### 3. Stemkeuze: 154 regels, 16 sprekers

De sprekers staan nog niet in `CAST` van `scripts/tts_cast.mjs`. Kies per spreker een stem
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
