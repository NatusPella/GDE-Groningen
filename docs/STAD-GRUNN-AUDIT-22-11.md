# Stad of Grunn: audit van 22-11

Gegenereerd door `node scripts/stad_grunn_audit.mjs --write`. De regel staat in [TAALREGEL-STAD-OMMELAND-22-11.md](TAALREGEL-STAD-OMMELAND-22-11.md).
A = hoort Stad, B = blijft Grunn (geheel, slogan, titel, eigennaam), C = twijfel (een mens beslist). Alleen het losse woord "Grunn" telt; Grunneger, Grunnegs en Grunnegers (mensen en taal van de provincie) blijven. Wat al is aangepast (zie DECISIONS in het script) telt hier niet meer mee.

| Soort | A (Stad) | B (Grunn) | C (twijfel) |
|---|---|---|---|
| bron | 0 | 199 | 139 |
| afgeleid | 21 | 208 | 322 |

bron = speltekst waar mensen in schrijven (game/js, docs/verhaal/nieuw, steam, website, humorbestanden). afgeleid = gegenereerd of bewaard (script.json, gronings_spoken.json met de oude invoer van al opgenomen clips, tts-lijsten, voice_wacht, tts.json per map); die volgen de bron. In gronings_spoken.json staat elke regel twee keer (Nederlands en gesproken vorm).

## A: hoort Stad (nog open)

Geen.


## C: twijfel, beslist op 22-11 (blijft Grunn)

Beslist op 22-11 door de regel zelf toe te passen (Stad = de stad Groningen zelf, Ommeland = de rest, Grunn = het geheel, een slogan of het gevoel; bij twijfel Grunn). Alle regels hieronder blijven Grunn: ze gaan over het geheel, de provincie, het gevoel of de naam van het spel (zomer, regen, eten, "Is Grunn ooit af?", "Grunn laden…"). Uitzonderingen die Stad werden: de verhuizer ("een kamer in de Stad", sidejob_verhuizing.js), de reklametaxi ("elke omweg van de Stad") en de slugregel van de openingsfilm ("EXT. DE STAD, VAN D’OLLE GRIEZE …"). Bewust Grunn gelaten, al lijkt het op een stadsplek: de toeristen bij de toren ("Is dit nou Grunn?"), de blauwalg in de plassen rond Grunn, het uitzicht van boven ("Van boven lijkt Grunn op een kaart") en de stadsbus ("in Grunn erger dan te laat"): daar spreekt de speler over het geheel, niet over de wijken.

- `desktop/main.js:305` copyright: '© 2026 NatusPella · Met liefde in Grunn gemaakt, met AI',
- `desktop/trailervideo.js:11` const DEFAULT_NAME = 'GDE-Groningen-Een-zomer-in-Grunn.
- `docs/verhaal/nieuw/09-script-akte1.md:8` RIKUS (radio): Grunn.
- `docs/verhaal/nieuw/09-script-akte1.md:15` Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is.
- `docs/verhaal/nieuw/09-script-akte1.md:537` TAMMO: Daar gaat Tessa, de wandelende encyclopedie van Grunn.
- `docs/verhaal/nieuw/09-script-akte1.md:538` Ik ken Grunn van de achterbank van jouw auto.
- `docs/verhaal/nieuw/09-script-akte1.md:599` De radio zegt zacht dat Grunn slaapt.
- `docs/verhaal/nieuw/09-script-akte2.md:98` Die bal is Grunn.
- `docs/verhaal/nieuw/09-script-akte2.md:216` Is dat nog Grunn?
- `docs/verhaal/nieuw/09-script-akte2.md:251` TAMMO: In Grunn kijkt niemand zo lang.
- `docs/verhaal/nieuw/09-script-akte2.md:252` TESSA: In Grunn kijkt niemand omhoog.
- `docs/verhaal/nieuw/09-script-akte2.md:279` JELLE: Die verdwijnen als u Grunn en de Snackprijs verlaat.
- `docs/verhaal/nieuw/09-script-akte4.md:20` Ik bied een klomp voor de mosterd van Grunn.
- `docs/verhaal/nieuw/09-script-akte4.md:337` Dat is ook Grunn.
- `docs/verhaal/nieuw/09-script-akte5.md:232` TAMMO: Van Grunn.
- `docs/verhaal/nieuw/09-script-akte5.md:283` BEREND (in de rol): Grunn!
- `docs/verhaal/nieuw/09-script-akte5.md:431` BEREND: De Snackprijs gaat naar Grunn.
- `docs/verhaal/nieuw/09-script-akte5.md:465` APP TAMMO→JELLE (stil): Wij tweeën vóór Grunn.
- `docs/verhaal/nieuw/09-script-akte5.md:478` TAMMO: Het is Grunn.
- `docs/verhaal/nieuw/09-script-akte6.md:183` RIKUS (radio): Grunn.
- `docs/verhaal/nieuw/TRAILER-SCRIPT.md:25` / 0-4 / Zonsopgang boven d'Olle Grieze, fietsers; een meeuw steelt een frikandel / muziek: stuwende bas, geen stem / **Grunn.
- `docs/verhaal/nieuw/TRAILER-SCRIPT.md:39` Die bal is Grunn.
- `game/js/achievementsui.js:227` Blijf rondkijken in Grunn.
- `game/js/achievementsui.js:231` Blijf rondkijken in Grunn.
- `game/js/banterlines.js:72` In Grunn.
- `game/js/banterlines.js:110` ['T', 'Wij tweeën vóór Grunn.
- `game/js/banterlines.js:290` ['A', 'Voor Grunn is dit gewoon dinsdag.
- `game/js/banterlines.js:327` ['A', 'Van hierboven is Grunn net een maquette.
- `game/js/banterlines.js:389` ['T', 'Is Grunn eigenlijk ooit af?
- `game/js/banterlines.js:390` ['A', 'Natuurlijk is Grunn af.
- `game/js/banterlines.js:465` ['A', 'In Grunn heet dat tropisch.
- `game/js/benchmarkmodel.js:39` lead: 'Meet hoe soepel Grunn op deze computer draait en welke stand daarbij past.
- `game/js/benchmarkmodel.js:80` sunrise: ['Tammo', 'Zo vroeg is Grunn het mooist.
- `game/js/benchmarkmodel.js:86` aerial: ['Tammo', 'Van boven lijkt Grunn op een kaart.
- `game/js/benchmarkmodel.js:92` night: ['Tammo', 'Grunn is ’s nachts ook mooi.
- `game/js/benchstats.js:175` hoog: 'Hoog laat Grunn zien zoals bedoeld: schaduwen aan en de grootste zichtafstand.
- `game/js/benchstats.js:209` hoog: 'Ultra laat Grunn zien zoals bedoeld, met de verste zichtafstand.
- `game/js/bigmoment.js:27` gebied: { vorm: 'plaats', schermvullend: false, klein: 'Moi!', kop: 'Grunn', regelNl: 'Je bent hier voor het eerst.
- `game/js/calendar.js:167` In Grunn houdt die aan.
- `game/js/cardlines.js:17` Elke eierbal van Grunn.
- `game/js/casework.js:163` { text: 'Yn Grunn is alles in bytsje tichterby.
- `game/js/cheatmods.js:32` groningen: 'Grunn', groninger: 'Grunneger', groningers: 'Grunnegers', heerlijk: 'lekker', mooi: 'mooi', jullie: 'joe', zeker: 'vast',
- `game/js/cinematics.js:957` Grunn op z’n best.
- `game/js/cinematics.js:1283` lines: [{ speaker: '', text: 'Weer een stukje Grunn dat je nu kent.
- `game/js/clothing.js:155` 'Op blote voeten door Grunn?
- `game/js/clothingdata.js:121` Het is zomer in Grunn'],
- `game/js/clothingdata.js:282` Het is zomer in Grunn', pieces: ['tshirt.
- `game/js/cutscenes_akte4.js:396` { on: 'Grunn!
- `game/js/echteplekken.js:48` const base = 'Padelbaan ' + (s.plaats // 'Grunn');
- `game/js/echteplekken.js:151` venues.push({ id: 'echt-' + course.id, plaats: course.plaats // 'Grunn', x: cx, y: cy, holes, real, kleinBaan: !
- `game/js/eventrules.js:172` export const ALGAE_NEWS = 'Blauwalg in de plassen rond Grunn: zwemmen wordt afgeraden.
- `game/js/fatbikedodge.js:156` Dat is een goede dag in Grunn.
- `game/js/flavour.js:101` return best // 'Grunn';
- `game/js/funlines.js:83` Je bent in Grunn, wat had je dan gedacht.
- `game/js/furniture.js:542` name: 'Kiekdoar TV', type: 'eikea', color: '#1e3a5a', tagline: 'De enige zender van Grunn.
- `game/js/furniture.js:562` In Grunn is dat geen voorspelling maar een belofte.
- `game/js/gebabbel.js:34` G('s-r2', 'stad', null, 'regen', ['Fietser', 'Dit is geen regen, dit is Grunn die nadenkt.
- `game/js/geheimen.js:149` c.font = 'italic 19px Georgia, serif'; c.fillText('Voor iedereen die Grunn kent,', w / 2, 204); c.
- `game/js/geheimen.js:508` if (!discover(w, 'bankje', 'Op het plaatje staat: "Kon minder." In Grunn is dat het hoogste compliment dat een bankje kan krijgen.
- `game/js/gfxprofile.js:239` Met ${presetLabel(pick)} loopt Grunn een stuk vloeiender.
- `game/js/gpuherstel.js:80` Een moment, Grunn komt terug.
- `game/js/helpoverview.js:20` { id: 'eerstedag', title: 'Je eerste dag in Grunn', lines: [
- `game/js/hud_panel.js:981` if (!best) { const a = areaNameAt(x, y); return { name: a.name // 'Grunn', country: false, district: a.
- `game/js/hud_panel.js:1026` if (Math.hypot(l.x - p.x, l.y - p.y) <= LANDMARK_R) return { key: 'lm:' + l.name, kick: locWhere.district // 'Grunn', name: l.
- `game/js/intromontage.js:602` card: '<div class="im-title">Grunn.
- `game/js/intromontage.js:1161` lower: '<div class="im-kicker">Welkom in</div><div class="im-title">Grunn</div>',
- `game/js/kiekdoarregels.js:18` 'KIEKDOAR MELDT: onrust in Grunn, politie massaal op pad',
- `game/js/loadlogic.js:65` { id: 'kaart', weight: 0.12, label: 'De kaart van Grunn komt binnen' },
- `game/js/loadscene.js:46` const plaats = String(name // 'Grunn');
- `game/js/missionbeats.js:44` Douwe: "Het is van Grunn!
- `game/js/missions_akte12.js:28` { kind: 'banner', along: 14, side: 0, a: 0, title: 'GROOTHANDEL DE VETPOT', sub: 'Frituurvet in bulk, ook voor Grunn' },
- `game/js/missions_defs.js:80` Grunn slaapt toch nooit.
- `game/js/missions_defs.js:169` outro: 'Het vet is terug in Grunn.
- `game/js/missions_defs.js:188` Van Grunn, bedoel ik.
- `game/js/missions_defs.js:215` ['V', 'Dertig meter Fries doek, aan de trots van Grunn.
- `game/js/missions_defs.js:360` De kippen bij Berts duiventil leggen de beste van Grunn.
- `game/js/missions_defs.js:369` outro: 'De Snackprijs gaat naar Grunn.
- `game/js/missions_nieuw.js:331` vet.outro = 'Het vet is terug in Grunn.
- `game/js/missions_nieuw.js:332` vet.costRow = ['Gered', 'Plakje twee: het vet blijft in Grunn'];
- `game/js/missionstory.js:203` Die bal is Grunn.
- `game/js/missionstory.js:396` Hij mist Grunn nu al.
- `game/js/missionstory.js:435` ['N', 'Grunn!
- `game/js/missionstory.js:455` ['N', 'De Snackprijs gaat naar Grunn.
- `game/js/openingfilm.js:40` DE STAD, VAN D’OLLE GRIEZE NAAR DE OOSTERPARKWIJK – ZONSOPGANG', grade: 'gouden-uur', place: 'Martinikerkhof / Oosterparkwijk', beat: 'Grunn is mooi en grappig; twee mensen op een stoep; hij heeft dui
- `game/js/openingfilm.js:49` In Grunn heet dat zomer.
- `game/js/openingfilm.js:72` Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is.
- `game/js/openingfilm.js:85` In Grunn heet dat zomer.
- `game/js/pausemenu.js:736` <div class="m-li pm-row">${rowName('Benchmark', 'Meet hoe soepel Grunn op deze computer draait en welke stand daarbij past (±1 min)')}<button type="button" class="m-bg" data-action="bench">Benchmark d
- `game/js/pedestrians.js:612` Kletsnat!', 'Mien jas!', 'Bist mal?', 'Hou op, joh!', 'Het regent al genoeg in Grunn!
- `game/js/pg_lines.js:74` Grunn heeft honger.
- `game/js/pigeonmode.js:39` [250, 'KIEKDOAR: stomerijen in Grunn draaien overuren'],
- `game/js/plakjes.js:14` { n: 7, name: 'Mosterd', step: 'M17', reveal: 'M12', result: 'gered', open: 'Jelle wil de mosterd van de Veenkoloniën.', ended: 'De mosterd blijft van Grunn.
- `game/js/playercards.js:55` return `<div class="cs-kop"><span class="ds-z-chip ds-z-chip--selectie">Samen in Grunn</span><b class="cs-kop-t">${aantal} ${aantal === 1 ?
- `game/js/prestige.js:7` uitleg: 'Alles wat Grunn te bieden heeft, in één bord: de missies, de buurten, de vissen en de eierballen.
- `game/js/radio.js:35` ['wanted_up_1', 'Onrust in Grunn, politie massaal op pad.
- `game/js/radiochannels.js:44` Grunn_is_nooit_klaar: ['volks'],
- `game/js/radiochannels.js:71` id: 'gmusic', name: 'G-Music', dj: 'Geesje', frequency: '98,3', sub: 'De hits van Grunn, met nieuws en verkeer',
- `game/js/sidejob_bezorger.js:26` { name: 'Snackbar De Vette Hap', street: 'Oosterstraat', at: [402.99, 360.13], menu: ['patatje oorlog', 'frikandel speciaal', 'kroket op brood', 'eierbal, want Grunn'] },
- `game/js/sidejob_bezorger.js:41` In Grunn is dat een wonder.
- `game/js/sidejob_bezorger.js:126` In Grunn heb je altijd tegenwind.
- `game/js/sidejob_bus.js:137` Te vroeg vertrekken is in Grunn erger dan te laat.
- `game/js/sidejobbeats.js:33` Altijd zomer in Grunn.
- `game/js/sidejobpack_rules.js:420` 'Een toerist: "En wat zit er aan de andere kant?" Gids: "Meer Grunn.
- `game/js/startscreen.js:53` 'Tip: regen in Grunn is geen weer, het is een levenshouding.
- `game/js/startscreen.js:692` st.part : 'Grunn');
- `game/js/story.js:805` `Het verhaal is uit, Grunn nog niet.
- `game/js/storyarc_basis.js:40` Die bal is Grunn.
- `game/js/storyarc_nieuw.js:377` Grunn houdt ons voor de dieven; Wiebelwerk in Veendam beheert de museumcamera's.
- `game/js/storyarc_nieuw.js:481` Hij chanteert met de museumbeelden van zijn bewaker: verlaat Grunn en de Snackprijs, dan verdwijnen ze.
- `game/js/storyarc_nieuw.js:502` { step: 'M18', kind: 'clue', title: 'Twee Stadjers in het zwart', text: 'In Grunn zeggen ze dat twee Stadjers in het zwart het museum leegroofden: Tammo en Tessa.
- `game/js/storyeikea.js:34` Die is nu van Grunn',
- `game/js/subtitles.js:298` Ook nait in Grunn.
- `game/js/todo.js:468` key: 'om:evenement', group: 'ommeland', icon: 'landmark', title: ev.naam // 'Evenement in Grunn', status: loopt ?
- `game/js/todo.js:530` detail: { kicker: 'Verzamelen', text: 'Overal in Grunn ligt een eierbal verstopt.
- `game/js/todo.js:532` meta: 'Ergens in Grunn · we verklappen niks', medal: null, record: `${secrets} van ${SECRETS_TOTAL} gevonden`, goal: null,
- `game/js/todo.js:598` detail: { kicker: 'Na het verhaal · alles van Grunn', text: stand.
- `game/js/todoui.js:470` 'ding' : 'dingen'} in en om Grunn</b>` +
- `game/js/todoui.js:503` chips.push(chip('', null, GROUP_LABEL[it.group] // it.where // 'In Grunn'));
- `game/js/todoui.js:543` return `<div class="ds-zeef ds-z-leeg td-leeg"><span class="ds-z-leeg__beeld">${svg(ICON.pin)}</span><div class="ds-z-leeg__kop">Nog niets te doen in de buurt</div><p class="ds-z-leeg__tekst">Loop of 
- `game/js/todoui.js:667` subTodo: `${items.filter(isActiviteit).length} dingen in en om Grunn · ${telDichtbij(items.
- `game/js/trailer.js:689` In Grunn heet dat zomer.
- `game/js/trailer.js:1349` Die bal is Grunn.
- `game/js/trailerplan.js:70` In Grunn heet dat zomer.
- `game/js/trailerplan.js:75` Die bal is Grunn.
- `game/js/trailerplan.js:100` In Grunn heet dat zomer.
- `game/js/trailerprops.js:70` c.font = '34px Arial, sans-serif'; c.fillText('Grunn, 1953 · 18 karaat goud', 30, 150);
- `game/js/vehiclelook.js:81` O('bike', 'Fietsendrager', 48, 'Je fiets mee op het dak, want dit is Grunn'),
- `game/js/verhaalui.js:243` De rest van Grunn leer je onderweg kennen.
- `game/js/voetbalcommentaardata.js:29` Het is zomer in Grunn en de bal ligt klaar op de stip.
- `game/js/voetbalcommentarycareer.js:32` Zo ver reikt het wad.', 'Een internationale avond in Grunn, en de zon schijnt gewoon mee.
- `game/js/winkelkit.js:87` etalage: 'mokken, klompen en molentjes', names: [['Grunn', 'Toren', 'Molen', 'Klomp'], ['Cadeautjes', 'Herinnering', 'Hoekje', 'Winkeltje']],
- `game/js/worldedge.js:34` friesland_water: { warn: 'In de verte ligt een boot dwars op de vaargeul: de Friese grens.', back: 'De Friese vaarwacht loodst je terug naar Grunn.
- `game/js/worldlifelines.js:32` mensen: ['Nog één foto, met de toren erbij!', 'Kun je me met de toren erop zetten?', 'Is dit nou Grunn?
- `web/web.js:139` `Grunn downloaden… ${fmt(got)} / ${fmt(total)} MB` : 'Grunn laden…';
- `web/web.js:139` `Grunn downloaden… ${fmt(got)} / ${fmt(total)} MB` : 'Grunn laden…';
- `web/web.js:186` if (s) s.textContent = 'Grunn laden…';
- `website/index.html:106` <h2 id="trailer-titel">Anderhalve minuut Grunn</h2>
- `website/slideshows.mjs:26` lead: 'Stadsbus, auto, fiets, boot, skûtsje en heli: de belangrijkste manieren om door Grunn te komen.
- `website/slideshows.mjs:68` title: 'Samen door Grunn',

