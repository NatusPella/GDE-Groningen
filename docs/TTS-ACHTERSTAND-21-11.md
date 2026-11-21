# TTS-achterstand 21-11: stand van de opnameronde

## Ronde 1 (16:35 tot 17:00): mislukt

Gateway in cooldown: vier proeven met 320 s tussenpoos gaven steeds HTTP 429 ("All deployments for selected model are in cooldown"). Niets opgenomen, niets gekost.

## Ronde 2 (18:00 tot 19:00, branch tts-ronde2-21-11): afgerond

De eigenaar zette meer saldo op LiteLLM; de proefaanvraag gaf 200 (4,1 s).

- **Opgenomen:** 895 van de 896 opdrachten in een ronde, de laatste (Anita, "Een lamp.") in een tweede poging, dus **896 clips, 0 open**. De wachtlijst `scripts/voice_wacht.json` is leeg (`keys: []`).
- **Volgorde:** Tammo, Jelle, Mem, Beppe, Rikus, Oma Trijntje, Durk, Douwe, Berend, Loketbediende, Ubbo, Anita, Hilbrand, Roelie, daarna de hints (Tammo, Anita). Lang niet alle regels die de wachtlijst noemde kwamen uit het hoofdverhaal: Anita 308 regels + 80 hints, Hilbrand 143 en Roelie 134 (voetbalcommentaar), Tammo 58 + 80 hints, Jelle 46, Mem 16, Durk 9, Beppe 8, Douwe 6, Rikus 2, Berend 2, Loketbediende 2, Oma Trijntje 1, Ubbo 1 (sms).
- **Kosten:** gemeld door de gateway ca. 0,51 dollar voor 896 clips (budget 2,50); ca. 3500 s audio geschat.
- **Spreektekst:** 9 Tammo-regels hadden geen Groningse spreektekst; die staan nu in `scripts/gronings_spoken.json` (nog niet door een Groninger beluisterd).
- **Nabewerking en controle:** elke clip ging door `voice_tailfix` (in `tts_lines.py`). Daarna meten `eindBurst` (ruisachtig_scan) en `popBegin` de nieuwe clips: 9 van 846 hadden nog een ruis-einde of pop-begin; die zijn met `scripts/audio/staart_trimmer.mjs` in place gerepareerd (fade-in, ruis-einde weg) en daarna 0 fouten op alle 846. Het manifest-`dur` van die 9 is niet bijgewerkt (verschil ten hoogste 0,3 s).
- **Niet opgenomen (geen opdracht in de lijst):** 26 verhaalregels wachten op een stemkeuze (CAST: Meneer Veldkamp, Daan, Anneke, Stien, Lieke) en 319 op een Groningse spreektekst; die staan als "alleen tekst (vrijgesteld)" in `voice_coverage`.
- **Controles:** `voice_coverage --quiet` groen (3054/3054), `spec_check` 0 fouten, `cutscenes_voicedur_test` 78/78.
- **Luisterlijst:** `docs/TTS-LUISTER-NIEUW.html` (relatieve paden) en een variant met `file://`-paden in de tijdelijke map, gemaakt met `node scripts/tts_luister_nieuw.mjs --jobs=<gesorteerde lijst>`. Alles is door niemand beluisterd: nog niet gehoord.

## Voor de volgende keer

- De clips staan als mp3 in `game/audio/voicelines/` (nog niet in het formaat van `pakket-slank-21-11`; na een rebase de paden in `tts.json` en `manifest.json` controleren).
- `tts_lines_list.mjs` laat bij een hergeneratie alleen regels met bestaande clip staan; `voice_wacht.json` is daarom met de hand berekend (opdrachten zonder manifestregel of zonder bestand).
