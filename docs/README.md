# Documentatie: begin hier

Welkom in de documentatie van GDE Groningen. Deze pagina is de ingang: per map één regel en
daaronder een alfabetische lijst van alle losse documenten. **De regels staan in de specs, niet
in de losse docs** (`.specs-fire/standards/`); een doc hier is uitleg, naslag of geschiedenis en
verwijst bovenaan naar zijn spec. Wijkt een doc af van de code, dan is de doc de fout.

## Begin hier

| Wil je... | Lees |
|---|---|
| weten hoe je het spel bouwt en draait | [ONTWIKKELEN.md](ONTWIKKELEN.md) |
| weten hoe je test | [TESTEN.md](TESTEN.md) en [AGENTS.md](../AGENTS.md#testen) |
| een release maken | [RELEASEN.md](RELEASEN.md), [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md) |
| de publicatie of 1.0 voorbereiden | [1.0-TRACK.md](1.0-TRACK.md) |
| de canonieke regels van een systeem | [.specs-fire/standards/](../.specs-fire/standards/) (wereld, mechanica, verhaal, multiplayer, ui-taal, publicatie) |
| het verhaal, de personages en de scripts | [verhaal/README.md](verhaal/README.md) |
| de architectuur in één kaart | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| iets uit het verleden terugzoeken | [archief/](archief/) (met archiefkop en "vervangen door") |

De werkafspraken en de constitutie staan in [../AGENTS.md](../AGENTS.md); die wint bij twijfel.

## Mappen

| Map | Wat erin staat |
|---|---|
| [verhaal/](verhaal/) | het verhaal, de scripts, de stijlgids, de TTS- en vertaaldocumenten (zie de eigen ingang) |
| [missies/](missies/) | het AAA-upgradeplan voor alle missies: rubriek, scores, bouwstenen en uitvoeringsplan ([AAA-UPGRADEPLAN.md](missies/AAA-UPGRADEPLAN.md)) en de bouwstenen voor de missie-agents ([BOUWSTENEN.md](missies/BOUWSTENEN.md)) |
| [steam/](steam/) | winkelpagina, trailer-cut en beelden voor Steam |
| [youtube/](youtube/) | kanaalteksten, trailerscripts, thumbnails en beelden |
| [showcase/](showcase/) | beelden en tekst voor presentatie en portfolio |
| [screenshots/](screenshots/) | schermafbeeldingen (geen documentatie) |
| [archief/](archief/) | oude plannen en reviewverslagen, met datum en "vervangen door …" |

## Alle losse documenten

| Document | Waar het over gaat |
|---|---|
| [1.0-TRACK.md](<1.0-TRACK.md>) | Deze pagina bundelt wat er voor de publicatie en 1.0 lokaal is gedaan en wat alleen de eigenaar |
| [3d-model-prompts.md](<3d-model-prompts.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [ANDROID.md](<ANDROID.md>) | Lokaal bouwbare debug-APK van het spel (Capacitor-WebView rond de webversie). Alleen voor testen: niets upl… |
| [ARCHITECTUUR-STAD-NAAR-TEGELS.md](<ARCHITECTUUR-STAD-NAAR-TEGELS.md>) | *Migratieplan voor issue #90, 17 oktober 2026 (stand 0.34 + Unreleased). Historisch: de migratie is |
| [BAG-LOD22.md](<BAG-LOD22.md>) | Besluit van de eigenaar: de 3D BAG-modellen (LoD 2.2: echte daken met dakkapellen, overstekken en schoorste… |
| [BOERDERIJ.md](<BOERDERIJ.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [COOP-GAST.md](<COOP-GAST.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [COOP-OPSLAAN.md](<COOP-OPSLAAN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/multiplayer.md`](../.specs-fire/standa… |
| [COOP-OVERDRAGEN.md](<COOP-OVERDRAGEN.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [COOP-TESTBANK.md](<COOP-TESTBANK.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [CREDITS.md](<CREDITS.md>) | Iedereen die meehielp, op volgorde van bijdrage, met de meetmethode en wat de eigenaar nog moet goedkeuren. |
| [DESIGN-AUDIT-CSS.md](<DESIGN-AUDIT-CSS.md>) | Naslag (#980, fase 1). Telling van wat de acht UI-CSS-bestanden feitelijk gebruiken (kleuren, radii, lettergroottes, ruimte) tegen [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)… |
| [DESIGN-BEDIENING.md](<DESIGN-BEDIENING.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [DESIGN-COMPONENTEN.md](<DESIGN-COMPONENTEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [DESIGN-SAMEN-SPELEN.md](<DESIGN-SAMEN-SPELEN.md>) | How the UI of Samen spelen (multiplayer) looks and behaves, and what every new screen has to answer about i… |
| [DESIGN-SCHULD.md](<DESIGN-SCHULD.md>) | Where the code differs from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) and its detail pages, found by reading… |
| [DIALECT-CONTROLE.md](<DIALECT-CONTROLE.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [EIGENAAR-ACTIELIJST.md](<EIGENAAR-ACTIELIJST.md>) | Eén blok per eigenaar-issue: wat de eigenaar doet, wat er in de repo klaarstaat en wat een agent niet mag of kan. |
| [FARMING-AUDIT-20-11.md](<FARMING-AUDIT-20-11.md>) | Werkdocument bij de feedback van de eigenaar: audit van de boerderij (schermen, HUD, kaart, wereld), het ontwerp van de lus en de veldstanden, wat er is gebouwd en wat niet (#985, #980). |
| [GEBIEDEN.md](<GEBIEDEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/wereld.md`](../.specs-fire/standards/w… |
| [GELUID.md](<GELUID.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [IARC-ANTWOORDEN.md](<IARC-ANTWOORDEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [INPUT-LATENTIE.md](<INPUT-LATENTIE.md>) | Meetmethode en budget voor input-latentie (toets tot eerste frame met positieverandering), met de gemeten p50/p95. |
| [INCLUSIEVE-TAAL.md](<INCLUSIEVE-TAAL.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [INVULBLAD-EIGENAAR.md](<INVULBLAD-EIGENAAR.md>) | Stand: 19 oktober 2026. Niets is verstuurd, geüpload of ingesteld. Dit blad |
| [INTOCHT.md](<INTOCHT.md>) | De intocht na een verovering: wachtrij, acht scènes, terugkijken en de host-only-regel (#704). |
| [KANALEN.md](<KANALEN.md>) | Input voor #92 (minder ruis, meer visuele communicatie), uit #104 (één planner). Dit bestand wordt gemaakt… |
| [LEEFTIJD.md](<LEEFTIJD.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [LEGAL-AI-ASSETS.md](<LEGAL-AI-ASSETS.md>) | Dit is geen juridisch advies. Het is een leesverslag door een AI-assistent |
| [LICENTIES.md](<LICENTIES.md>) | Stand van 3 oktober 2026. Dit is een inventaris en een advies, geen |
| [LOOPBAAN.md](<LOOPBAAN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [MERKENCHECK.md](<MERKENCHECK.md>) | Datum: 17 oktober 2026. Geen juridisch advies. |
| [MERKENREGISTER.md](<MERKENREGISTER.md>) | Stand: 18 oktober 2026. Dit register hoort bij de constitution in |
| [MOBIEL-RAPPORT.md](<MOBIEL-RAPPORT.md>) | Gemeten en bekeken in Electron met Chromium-apparaatemulatie (`--emulate-mobile`, touchbediening geforceerd… |
| [MISSIEBALANS.md](<MISSIEBALANS.md>) | Branch-aware missiecurve, uitschieters en de ontwerpregel voor lange/korte missies (#829). |
| [MULTIPLAYER-VISIE.md](<MULTIPLAYER-VISIE.md>) | De visie van de eigenaar (besluiten van 23-10, 24-10 en 6-11), op één plek. In gesprekken zeggen we multipl… |
| [MUZIEK.md](<MUZIEK.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [MUZIEK-TE-VRAGEN.md](<MUZIEK-TE-VRAGEN.md>) | Wat aan muziek gekoppeld is (alles) en wat de eigenaar nog moet leveren; uitkomst van de audiograafcontrole (#986, #988). |
| [MUZIEK-OPDRACHT-GEMINI.md](<MUZIEK-OPDRACHT-GEMINI.md>) | Negen missiesferen met een kant-en-klare Gemini-prompt, de missies waarvoor ze zijn en hoe je een bestand toevoegt (#988). |
| [ONBOARDING.md](<ONBOARDING.md>) | Doel: zien of iemand die de game niet kent in de eerste dertig minuten begrijpt wie hij is, |
| [ONTWIKKELEN.md](<ONTWIKKELEN.md>) | Developer notes (in English, like ARCHITECTURE.md): test switches, |
| [PERF-LAADHANG-0.56.1.md](<PERF-LAADHANG-0.56.1.md>) | Onderzoek naar de melding dat 0.56.1 op sommige machines in het laadscherm bleef |
| [LAAD-STREAMING-LOD.md](<LAAD-STREAMING-LOD.md>) | Wat er tijdens laadschermen en daarbuiten gebeurt: fasen, streaming, LOD-ringen, vergelijking met 0.54.0 en bevindingen. |
| [PERF-TREND-0.54-NAAR-NU.md](<PERF-TREND-0.54-NAAR-NU.md>) | Prestatietrend sinds 0.54.0: tijdlijn per tag, statische maten en vaste opwarmbudgetten. |
| [ZFIGHT-METING.md](<ZFIGHT-METING.md>) | Meting van z-fighting (#917, #919): dieptestap per afstand en near, positieve controle, wisselpixels per plek bij near 0,5, 1,5 en 2,5, en het besluit over het dynamische near. |
| [PERF-PLEISTERS.md](<PERF-PLEISTERS.md>) | Inventaris van prestatie-pleisters sinds 0.54.0 (schadelijk, maskerend, legitiem) met oorzaken en een schrapvolgorde. |
| [PERF-METING-2026-10-19.md](<PERF-METING-2026-10-19.md>) | Dit is de actuele meetbron voor prestaties (zie `.specs-fire/standards/mechanica.md`, |
| [PERF-BESLUITEN.md](<PERF-BESLUITEN.md>) | Bewuste prestatiebesluiten en de onderbouwing per punt. |
| [PERF-METING-2026-11-05.md](<PERF-METING-2026-11-05.md>) | Dit is een nieuwe, gedateerde meetbron naast `docs/PERF-METING-2026-10-19.md`. |
| [PERF-METING-2026-11-09.md](<PERF-METING-2026-11-09.md>) | Prestatiemeting 9-11-2026: verificatie na de merge (#804/#806), top-5 hitchbronnen en de eerlijke norm-uitslag. |
| [PERF-RONDE-20-11.md](<PERF-RONDE-20-11.md>) | Prestatieronde 20-11 (#985, #937, #921): statische audit van de per-frame-paden, microbenchmarks, kleine fixes, Samen-spelen-kosten per speler en wat open staat. |
| [PERSKIT.md](<PERSKIT.md>) | Perskit voor de openbare playtest: pitch, quote-waardige regels, feiten, beeld en een concept-persbericht (nog niet verstuurd). |
| [PLAYTESTPLAN.md](<PLAYTESTPLAN.md>) | Doel: zien of een speler die de game niet kent het verhaal volgt, steeds weet wat het doel is en tot het ei… |
| [PROEFSPELER.md](<PROEFSPELER.md>) | De proefspeler: de Spelbot met een menselijk profiel (`--mens`) en een playtestbundel per missie (beelden, samenvatting, reviewbrief) voor een vision-reviewer. |
| [PROEFSPELER-DOORLOOP-20-11.md](<PROEFSPELER-DOORLOOP-20-11.md>) | Doorloop van het hele verhaal (M01 t/m M30) door de proefspeler op 20-11: per missie gehaald, geskipt of niet bereikt, de gefixte blokkades (M20, M18, M30, M13) en wat een mens handmatig moet controleren. |
| [PRIVACY-EN-CREDITS.md](<PRIVACY-EN-CREDITS.md>) | Stand: 18 oktober 2026; bijgewerkt op 7 november 2026 voor de altijd-online start (#554, #583, #395, #690).… |
| [PROVINCIE-PLAN.md](<PROVINCIE-PLAN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/wereld.md`](../.specs-fire/standards/w… |
| [PROVINCIE-VERHAAL.md](<PROVINCIE-VERHAAL.md>) | Ontwerpdocument, oktober 2026, bij [PROVINCIE-PLAN.md](PROVINCIE-PLAN.md). |
| [PUBLICATIECHECKLIST.md](<PUBLICATIECHECKLIST.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [PUBLICEREN.md](<PUBLICEREN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [QA-AUDIT-2026-11-16.md](<QA-AUDIT-2026-11-16.md>) | Onafhankelijke QA-audit van 0.65.0: scorekaart, de bevindingen en hun fixes, de open risico's (Samen spelen, M02, TTS) en wat niet is getest. De bewijsbeelden staan in een worktree en niet in git. |
| [QA-START-VAN-MENU-AF.md](<QA-START-VAN-MENU-AF.md>) | Het oude startscherm (`runMenuScreen`, `#start-screen`) is alleen nog de |
| [RELEASE-CHECKLIST-VANMIDDAG.md](<RELEASE-CHECKLIST-VANMIDDAG.md>) | Naslag. Releasechecklist van 20-11 voor de speeltest met vier: de commando's in volgorde (releasegate, release.sh, Actions-builds, installatie- en Samen-spelen-rooktest) met de valkuilen uit eerdere releases. |
| [RELEASEGATE.md](<RELEASEGATE.md>) | Het releasegate-rapport en draaiboek: elke release bewijsbaar zonder regressie (ADR 0034). |
| [QA-SAVES-20-11.md](<QA-SAVES-20-11.md>) | QA van opslaan en laden voor de release van 20-11 (#983, #429): oude en beschadigde saves, opslag per speler, ritten en instellingen; de compat-suite. |
| [REVIEW-20-11.md](<REVIEW-20-11.md>) | AI-codereview van de wijzigingen van 20-11 voor de releasegate (ADR 0034): bevindingen op ernst en testgaten. |
| [RELEASEN.md](<RELEASEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [QA-SWEEP-20-11.md](<QA-SWEEP-20-11.md>) | Meetronde van de schermen op vijf vensterformaten zonder menselijk oog (buiten beeld, afgekapte tekst, bedekte doelen, contrast, focus), met bevindingen en wat niet gemeten is. |
| [QA-CONTROLLER-20-11.md](<QA-CONTROLLER-20-11.md>) | Meetronde van het bedienen met een controller (nagebootste gamepad): bereik, A/B, bumpers, scroll, hints per scherm, de fix voor de kaartknoppen (L3), de focusvolgorde per vlak en wat nog niet gezien is. |
| [OV-MISSIES-20-11.md](<OV-MISSIES-20-11.md>) | Een bus- of treindienst starten bij elke halte en elk station: wat er was, wat er nu is (haltepalen, kaartpictogram, menu, regelkaart), de Samen-spelen-regel en wat nog niet gezien is. |
| [SAMEN-SPELEN-HANDLEIDING.md](<SAMEN-SPELEN-HANDLEIDING.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [SFX-GAPS.md](<SFX-GAPS.md>) | Inventaris van spelgebeurtenissen zonder eigen geluid of met een te algemeen geluid (UI, beloning, wereld-foley, omgeving per streek), met wat is gebouwd en wat nog open staat. |
| [SFX-LUISTERLIJST.md](<SFX-LUISTERLIJST.md>) | Wat een mens moet beluisteren van de nieuwe geluiden: waar je ze in het spel hoort, wat er niet goed mag klinken en hoe je het meldt. |
| [AUDIO-LICENTIES.md](<AUDIO-LICENTIES.md>) | Alle geluidsopnames met bron-URL, Freesound-id, titel, auteurshandle, licentie (CC0 of CC BY), bewerking, sha256 en datum; gegenereerd uit het manifest (ADR 0039). |
| [ICONEN-LICENTIE.md](<ICONEN-LICENTIE.md>) | De Phosphor-iconenset (MIT): licentietekst, naamsvermelding en hoe je een icoon toevoegt (ADR 0041). |
| [ICONEN-INVENTARIS-20-11.md](<ICONEN-INVENTARIS-20-11.md>) | Waar het spel iconen tekent (inline SVG, emoji, unicode) en wat al naar de Phosphor-iconenmodule is overgezet. |
| [AUDIO-STAPPEN-WEER.md](<AUDIO-STAPPEN-WEER.md>) | Voetstappen, regen, wind, onweer, zomerambiance en de auto-lussen (drift en motor) met opnames: de koppeling, de ondergronden, de afstandsregels, het meten en wat niet is gelukt. |
| [AUDIO-VOERTUIGEN.md](<AUDIO-VOERTUIGEN.md>) | Helikopter, vliegtuig en motorboot met CC0-opnames: de bronnenlijst (Freesound-id, auteur, licentie), de koppeling van toeren, gas en snelheid aan toonhoogte en niveau en wat niet is beluisterd. |
| [SERVER-HOSTING.md](<SERVER-HOSTING.md>) | Dedicated server (#450): beheerdersrunbook, CLI en de bewuste eigenaarsbeslissingen. |
| [TESTGATEN-799.md](<TESTGATEN-799.md>) | Welke boot-/streamingpaden nu gedragstests hebben en welke een browser of Electron vragen. |
| [SOCIAL-EN-WEBSITE.md](<SOCIAL-EN-WEBSITE.md>) | Stand: 20 oktober 2026. Het plaatje is gemaakt (`docs/social-preview.png`, hieronder) en de About-tekst en… |
| [SOLO-SESSIE-AUDIT.md](<SOLO-SESSIE-AUDIT.md>) | Stand: worktree `w77-coop-bake-vault`, commit `78db7781` (de werkboom bevatte bij deze audit |
| [SPECS-FIRE.md](<SPECS-FIRE.md>) | Twee systemen die elkaar aanvullen, zolang de rolverdeling vastligt. Dit bestand |
| [SPEELGIDS-4-SPELERS.md](<SPEELGIDS-4-SPELERS.md>) | Naslag. Speelgids voor de eigenaar en drie vrienden (18+): installeren, Samen spelen, passive mode en PvP, opnieuw verbinden, overslaan, bugs melden en bekende beperkingen. Verwijst voor de verbinding naar SPEELGIDS-VIER-SPELERS.md. |
| [SPEELGIDS-VIER-SPELERS.md](<SPEELGIDS-VIER-SPELERS.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/multiplayer.md`](../.specs-fire/standards/multiplayer.md). Korte gids voor vier spelers over internet: hosten, meedoen, wat is getest (#983) en wat niet (NAT, STUN), met de eerste stappen als het niet lukt. |
| [SPEELTEST.md](<SPEELTEST.md>) | Voor mensen die de game nog niet kennen. Speel ongeveer 45 tot 60 minuten; zonder save begint het verhaal m… |
| [STEAM-CHECKLIST.md](<STEAM-CHECKLIST.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [STEAM-KLAAR.md](<STEAM-KLAAR.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [TESSA-CIJFERS.md](<TESSA-CIJFERS.md>) | Gecontroleerd op 17 oktober 2026 met publieke CBS-pagina's. Het feitenblok |
| [TAAL-VAN-DOCUMENTATIE.md](<TAAL-VAN-DOCUMENTATIE.md>) | Besluit voor de eigenaar: Nederlands of Engels in de docs, met de meting en twee opties. |
| [UITLEG-MET-ICONEN.md](<UITLEG-MET-ICONEN.md>) | De regelwidget: uitleg met iconen en animaties in plaats van tekst, naar het voorbeeld van de eierrit, en de lijst van plekken waar de speler nu iets moet raden. |
| [TESTEN.md](<TESTEN.md>) | `node scripts/test_all.mjs` draait de tests in fasen en schrijft een rapport met een korte Nederlandse same… |
| [TRAILER-CONTROLE.md](<TRAILER-CONTROLE.md>) | Drie trailers uit het echte spel (geen nagebouwde beelden): een gameplaytrailer (78,0 s), een verhaaltraile… |
| [VLIEGSCHOOL.md](<VLIEGSCHOOL.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [WOORDENLIJST.md](<WOORDENLIJST.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [groningen-memes-onderzoek.md](<groningen-memes-onderzoek.md>) | Aanvulling op `docs/groningen-memes.md`. Webonderzoek van oktober 2026 (RTV Noord, |
| [groningen-memes.md](<groningen-memes.md>) | Gebaseerd op een onderzoek (via Copilot, september 2026), samengevat en gefilterd |
| [markt-gebouwen.md](<markt-gebouwen.md>) | Research notes behind `game/js/marktgebouwen.js` and the Stadhuis and |
| [personages.md](<personages.md>) | Deze personagebijbel houdt de personages consistent: in dialogen, telefoontjes, gesprekjes in de auto, TTS-… |

## Een document toevoegen

1. Hoort de regel in een spec? Zet hem daar (en houd de doc kort als uitleg).
2. Zet bovenaan de doc een "Naslag"-blok met de spec waarnaar hij verwijst.
3. Zet de doc in de tabel hierboven (alfabetisch) met één regel uitleg.
4. Is het een verslag of plan dat niet meer actueel is? Zet het in `archief/<jaar-maand>/`
   met een kop "Gearchiveerd op …; vervangen door …" en relatieve links die blijven werken.


| [ACTIVITEITEN-TWEEDE-LAAG.md](<ACTIVITEITEN-TWEEDE-LAAG.md>) | Per activiteit wat er na de medaille nog te halen is, met de bewuste uitzonderingen (#800, punt 14). |
| [HERKENNINGSPUNTEN.md](<HERKENNINGSPUNTEN.md>) | Album van de kerken, molens en borgen in de provincie: data, telling en de route naar het dichtstbijzijnde open punt (#820). |
| [BUGS-OPEN-20-11.md](<BUGS-OPEN-20-11.md>) | Stand van de open bugs en wensen op 20-11 voor 0.64.0 (Samen spelen, Bourtange, bruggen, missies): wat in code zit, wat niemand zag en wat te groot is, met schatting. |
| [HERTEST-TRIAGE.md](<HERTEST-TRIAGE.md>) | Triage van de 485 issues met label hertest: per categorie wat in code bewezen is, wat beeldbewijs nodig heeft en een werklijst van 30. |
| [ONDERZOEK-REFERENTIEGAMES.md](<ONDERZOEK-REFERENTIEGAMES.md>) | Onderzoek naar wat bekende open-wereldgames leuk maakt, en wat GDE daarvan heeft overgenomen (#811–#821). |
| [VERKENNING-PROVINCIE.md](<VERKENNING-PROVINCIE.md>) | Klein plan voor de verkenlaag buiten de stad (A15-A20) op bestaande infrastructuur. |